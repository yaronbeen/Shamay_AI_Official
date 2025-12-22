/**
 * Chat Tracer - File-based observability for chat interactions
 * Logs all chat messages, tool calls, and responses to JSON files
 */

import fs from 'fs';
import path from 'path';

// Trace types
export interface ChatTrace {
  traceId: string;
  sessionId: string;
  timestamp: string;
  type: 'user_message' | 'assistant_response' | 'tool_call' | 'tool_result' | 'error' | 'file_upload' | 'voice_transcription';
  data: Record<string, unknown>;
  metadata?: {
    model?: string;
    inputTokens?: number;
    outputTokens?: number;
    latencyMs?: number;
    toolName?: string;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
  };
}

export interface TraceSession {
  sessionId: string;
  startedAt: string;
  traces: ChatTrace[];
  summary?: {
    totalMessages: number;
    totalToolCalls: number;
    totalTokens: number;
    totalLatencyMs: number;
    errors: number;
  };
}

// Generate unique trace ID
function generateTraceId(): string {
  return `trace_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Get traces directory path
function getTracesDir(): string {
  // Use absolute path relative to project root
  const tracesDir = path.join(process.cwd(), 'traces');

  // Ensure directory exists
  if (!fs.existsSync(tracesDir)) {
    fs.mkdirSync(tracesDir, { recursive: true });
  }

  return tracesDir;
}

// Get trace file path for a session
function getTraceFilePath(sessionId: string): string {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return path.join(getTracesDir(), `chat_${sessionId}_${date}.json`);
}

// Load existing traces for a session
function loadSessionTraces(sessionId: string): TraceSession {
  const filePath = getTraceFilePath(sessionId);

  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to load traces:', error);
    }
  }

  return {
    sessionId,
    startedAt: new Date().toISOString(),
    traces: [],
  };
}

// Save traces to file
function saveSessionTraces(session: TraceSession): void {
  const filePath = getTraceFilePath(session.sessionId);

  // Update summary
  session.summary = {
    totalMessages: session.traces.filter(t =>
      t.type === 'user_message' || t.type === 'assistant_response'
    ).length,
    totalToolCalls: session.traces.filter(t => t.type === 'tool_call').length,
    totalTokens: session.traces.reduce((sum, t) =>
      sum + (t.metadata?.inputTokens || 0) + (t.metadata?.outputTokens || 0), 0
    ),
    totalLatencyMs: session.traces.reduce((sum, t) =>
      sum + (t.metadata?.latencyMs || 0), 0
    ),
    errors: session.traces.filter(t => t.type === 'error').length,
  };

  try {
    fs.writeFileSync(filePath, JSON.stringify(session, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save traces:', error);
  }
}

/**
 * ChatTracer class for logging chat interactions
 */
export class ChatTracer {
  private sessionId: string;
  private session: TraceSession;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.session = loadSessionTraces(sessionId);
  }

  /**
   * Log a user message
   */
  logUserMessage(message: string, attachments?: Array<{ name: string; type: string; size: number }>): string {
    const traceId = generateTraceId();

    this.session.traces.push({
      traceId,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      type: 'user_message',
      data: {
        message,
        attachments: attachments || [],
      },
    });

    saveSessionTraces(this.session);
    return traceId;
  }

  /**
   * Log an assistant response
   */
  logAssistantResponse(
    response: string,
    metadata?: {
      model?: string;
      inputTokens?: number;
      outputTokens?: number;
      latencyMs?: number;
    }
  ): string {
    const traceId = generateTraceId();

    this.session.traces.push({
      traceId,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      type: 'assistant_response',
      data: { response },
      metadata,
    });

    saveSessionTraces(this.session);
    return traceId;
  }

  /**
   * Log a tool call
   */
  logToolCall(toolName: string, input: Record<string, unknown>): string {
    const traceId = generateTraceId();

    this.session.traces.push({
      traceId,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      type: 'tool_call',
      data: { toolName, input },
      metadata: { toolName },
    });

    saveSessionTraces(this.session);
    return traceId;
  }

  /**
   * Log a tool result
   */
  logToolResult(toolName: string, result: unknown, latencyMs?: number): string {
    const traceId = generateTraceId();

    this.session.traces.push({
      traceId,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      type: 'tool_result',
      data: { toolName, result },
      metadata: { toolName, latencyMs },
    });

    saveSessionTraces(this.session);
    return traceId;
  }

  /**
   * Log a file upload
   */
  logFileUpload(fileName: string, fileType: string, fileSize: number): string {
    const traceId = generateTraceId();

    this.session.traces.push({
      traceId,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      type: 'file_upload',
      data: { fileName, fileType, fileSize },
      metadata: { fileName, fileType, fileSize },
    });

    saveSessionTraces(this.session);
    return traceId;
  }

  /**
   * Log a voice transcription
   */
  logVoiceTranscription(
    audioFileName: string,
    transcribedText: string,
    latencyMs?: number,
    confidence?: number
  ): string {
    const traceId = generateTraceId();

    this.session.traces.push({
      traceId,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      type: 'voice_transcription',
      data: { audioFileName, transcribedText, confidence },
      metadata: { fileName: audioFileName, latencyMs },
    });

    saveSessionTraces(this.session);
    return traceId;
  }

  /**
   * Log an error
   */
  logError(error: string, context?: Record<string, unknown>): string {
    const traceId = generateTraceId();

    this.session.traces.push({
      traceId,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      type: 'error',
      data: { error, context },
    });

    saveSessionTraces(this.session);
    return traceId;
  }

  /**
   * Get session summary
   */
  getSummary(): TraceSession['summary'] {
    return this.session.summary;
  }

  /**
   * Get all traces
   */
  getTraces(): ChatTrace[] {
    return this.session.traces;
  }
}

/**
 * Create a new tracer for a session
 */
export function createTracer(sessionId: string): ChatTracer {
  return new ChatTracer(sessionId);
}
