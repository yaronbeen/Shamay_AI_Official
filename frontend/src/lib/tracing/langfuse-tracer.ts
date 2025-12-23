/**
 * Langfuse Integration for LLM Observability
 * Provides cloud-based tracing, token tracking, and analytics
 */

import { Langfuse } from 'langfuse';

// Initialize Langfuse client (singleton)
let langfuseClient: Langfuse | null = null;

function getLangfuse(): Langfuse | null {
  if (!process.env.LANGFUSE_PUBLIC_KEY || !process.env.LANGFUSE_SECRET_KEY) {
    console.warn('[Langfuse] Missing API keys - observability disabled');
    return null;
  }

  if (!langfuseClient) {
    langfuseClient = new Langfuse({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      baseUrl: process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com',
    });
  }

  return langfuseClient;
}

/**
 * Langfuse Tracer for chat sessions
 */
export class LangfuseTracer {
  private langfuse: Langfuse | null;
  private sessionId: string;
  private traceId: string | null = null;
  private trace: ReturnType<Langfuse['trace']> | null = null;

  constructor(sessionId: string) {
    this.langfuse = getLangfuse();
    this.sessionId = sessionId;
  }

  /**
   * Start a new trace for a chat interaction
   */
  startTrace(userId?: string, metadata?: Record<string, unknown>): string | null {
    if (!this.langfuse) return null;

    try {
      this.trace = this.langfuse.trace({
        name: 'chat-interaction',
        sessionId: this.sessionId,
        userId,
        metadata: {
          ...metadata,
          app: 'shamay-ai',
          version: '1.0.0',
        },
      });
      this.traceId = this.trace.id;
      return this.traceId;
    } catch (error) {
      console.error('[Langfuse] Failed to start trace:', error);
      return null;
    }
  }

  /**
   * Log user input as a span
   */
  logUserInput(message: string, attachments?: Array<{ name: string; type: string; size: number }>): void {
    if (!this.trace) return;

    try {
      this.trace.span({
        name: 'user-input',
        input: {
          message,
          attachmentCount: attachments?.length || 0,
          attachments: attachments?.map(a => ({ name: a.name, type: a.type, size: a.size })),
        },
      });
    } catch (error) {
      console.error('[Langfuse] Failed to log user input:', error);
    }
  }

  /**
   * Log an LLM generation (Claude API call)
   */
  logGeneration(params: {
    name: string;
    model: string;
    input: unknown;
    output: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    metadata?: Record<string, unknown>;
  }): void {
    if (!this.trace) return;

    try {
      this.trace.generation({
        name: params.name,
        model: params.model,
        input: params.input,
        output: params.output,
        usage: {
          input: params.inputTokens,
          output: params.outputTokens,
          total: params.inputTokens + params.outputTokens,
        },
        metadata: {
          ...params.metadata,
          latencyMs: params.latencyMs,
        },
      });
    } catch (error) {
      console.error('[Langfuse] Failed to log generation:', error);
    }
  }

  /**
   * Log a tool call as a span
   */
  logToolCall(toolName: string, input: Record<string, unknown>): void {
    if (!this.trace) return;

    try {
      this.trace.span({
        name: `tool:${toolName}`,
        input,
        metadata: { toolName },
      });
    } catch (error) {
      console.error('[Langfuse] Failed to log tool call:', error);
    }
  }

  /**
   * Log tool result
   */
  logToolResult(toolName: string, result: unknown, latencyMs: number): void {
    if (!this.trace) return;

    try {
      this.trace.span({
        name: `tool-result:${toolName}`,
        output: result,
        metadata: { toolName, latencyMs },
      });
    } catch (error) {
      console.error('[Langfuse] Failed to log tool result:', error);
    }
  }

  /**
   * Log security event
   */
  logSecurityEvent(eventType: string, details: Record<string, unknown>): void {
    if (!this.trace) return;

    try {
      this.trace.event({
        name: `security:${eventType}`,
        metadata: details,
      });
    } catch (error) {
      console.error('[Langfuse] Failed to log security event:', error);
    }
  }

  /**
   * Log an error
   */
  logError(error: string, context?: Record<string, unknown>): void {
    if (!this.trace) return;

    try {
      this.trace.event({
        name: 'error',
        metadata: { error, ...context },
        level: 'ERROR',
      });
    } catch (error) {
      console.error('[Langfuse] Failed to log error:', error);
    }
  }

  /**
   * Add score/feedback to the trace
   */
  score(name: string, value: number, comment?: string): void {
    if (!this.trace) return;

    try {
      this.trace.score({
        name,
        value,
        comment,
      });
    } catch (error) {
      console.error('[Langfuse] Failed to add score:', error);
    }
  }

  /**
   * End the trace and flush to Langfuse
   */
  async endTrace(): Promise<void> {
    if (!this.langfuse) return;

    try {
      await this.langfuse.flushAsync();
    } catch (error) {
      console.error('[Langfuse] Failed to flush trace:', error);
    }
  }

  /**
   * Get the current trace ID
   */
  getTraceId(): string | null {
    return this.traceId;
  }
}

/**
 * Create a new Langfuse tracer for a session
 */
export function createLangfuseTracer(sessionId: string): LangfuseTracer {
  return new LangfuseTracer(sessionId);
}

/**
 * Shutdown Langfuse client (call on app shutdown)
 */
export async function shutdownLangfuse(): Promise<void> {
  if (langfuseClient) {
    await langfuseClient.shutdownAsync();
    langfuseClient = null;
  }
}

