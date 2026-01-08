/**
 * Chat API Route - Claude Agent SDK Integration
 * POST /api/session/[sessionId]/chat
 *
 * Provides streaming chat with tool use, file uploads, and observability
 * Includes security layer for input validation, output filtering, and PII protection
 */

import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { ShumaDB } from '@/lib/shumadb.js';
import { chatTools } from '@/lib/chat/tools';
import { executeToolCall } from '@/lib/chat/tool-handlers';
import { buildSystemPrompt, extractDocumentContext } from '@/lib/chat/system-prompt';
import { createTracer } from '@/lib/tracing/chat-tracer';
import { createLangfuseTracer } from '@/lib/tracing/langfuse-tracer';
import type { ChatMessage } from '@/types/chat';

// Security imports
import {
  securityCheckInput,
  securityCheckOutput,
  securityCheckFile,
  enhanceSystemPrompt,
  prepareSecureContext,
  getSessionSecurityStatus,
} from '@/lib/security';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Type definitions for Anthropic SDK
interface TextBlock {
  type: 'text';
  text: string;
}

interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
type DocumentMediaType = 'application/pdf';

interface ImageBlock {
  type: 'image';
  source: {
    type: 'base64';
    media_type: ImageMediaType;
    data: string;
  };
}

interface DocumentBlock {
  type: 'document';
  source: {
    type: 'base64';
    media_type: DocumentMediaType;
    data: string;
  };
}

type ContentBlock = TextBlock | ToolUseBlock | ImageBlock | DocumentBlock;

interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
}

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | ContentBlock[] | ToolResultBlock[];
}

// File attachment interface
interface FileAttachment {
  name: string;
  type: string;
  size: number;
  data: string; // base64 encoded
}

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const encoder = new TextEncoder();
  const startTime = Date.now();
  const { sessionId } = params;

  // Initialize tracers (file-based + Langfuse)
  const tracer = createTracer(sessionId);
  const langfuse = createLangfuseTracer(sessionId);
  langfuse.startTrace(undefined, { sessionId });

  try {
    // Check content type for multipart form data
    const contentType = request.headers.get('content-type') || '';
    let message: string;
    let conversationHistory: ChatMessage[] = [];
    let attachments: FileAttachment[] = [];

    if (contentType.includes('multipart/form-data')) {
      // Handle form data with files
      const formData = await request.formData();
      message = formData.get('message') as string || '';
      const historyStr = formData.get('conversationHistory') as string;
      conversationHistory = historyStr ? JSON.parse(historyStr) : [];

      // Process file attachments with security scanning
      const files = formData.getAll('files') as File[];
      for (const file of files) {
        // === SECURITY CHECK: Scan file before processing ===
        const fileScanResult = await securityCheckFile(file, sessionId);
        if (!fileScanResult.isValid || !fileScanResult.isSafe) {
          tracer.logError('File blocked by security scan', {
            fileName: file.name,
            reason: fileScanResult.blockReason,
            threats: fileScanResult.threats,
          });
          return new Response(
            JSON.stringify({
              error: fileScanResult.blockReason || 'הקובץ נחסם מסיבות אבטחה',
              blocked: true,
              fileName: file.name,
            }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          );
        }

        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');

        attachments.push({
          name: fileScanResult.sanitizedName, // Use sanitized filename
          type: file.type,
          size: file.size,
          data: base64,
        });

        // Log file upload with sanitized name
        tracer.logFileUpload(fileScanResult.sanitizedName, file.type, file.size);
      }
    } else {
      // Handle JSON body
      const body = await request.json();
      message = body.message;
      conversationHistory = body.conversationHistory || [];
      attachments = body.attachments || [];
    }

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // === SECURITY CHECK: Input Validation ===
    const securityCheck = securityCheckInput(message, sessionId);

    if (securityCheck.blocked) {
      tracer.logError('Security blocked input', {
        reason: securityCheck.blockReason,
        riskScore: securityCheck.riskScore,
      });
      return new Response(
        JSON.stringify({
          error: securityCheck.blockReason || 'הבקשה נחסמה מסיבות אבטחה',
          blocked: true,
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Use sanitized message
    const sanitizedMessage = securityCheck.sanitizedMessage;

    // Log security warnings if any
    if (securityCheck.warnings.length > 0) {
      console.warn('[Security]', sessionId, securityCheck.warnings);
    }

    // Log user message
    tracer.logUserMessage(sanitizedMessage, attachments.map(a => ({
      name: a.name,
      type: a.type,
      size: a.size,
    })));
    langfuse.logUserInput(sanitizedMessage, attachments.map(a => ({
      name: a.name,
      type: a.type,
      size: a.size,
    })));

    // Load session data
    const sessionResult = await ShumaDB.loadShumaForWizard(sessionId);
    if (!sessionResult.success || !sessionResult.valuationData) {
      tracer.logError('Session not found', { sessionId });
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const session = sessionResult.valuationData;

    // Load AI extractions
    const extractionsResult = await ShumaDB.getAIExtractions(sessionId);
    const aiExtractions = extractionsResult.success ? extractionsResult.extractions : [];

    // Build context and system prompt with security enhancements
    const documentContext = extractDocumentContext(session, aiExtractions);
    const baseSystemPrompt = buildSystemPrompt(documentContext);
    const systemPrompt = enhanceSystemPrompt(baseSystemPrompt); // Add security sandwich

    // Build user content with attachments
    const userContent: ContentBlock[] = [];

    // Add file attachments first (images and PDFs)
    for (const attachment of attachments) {
      if (attachment.type.startsWith('image/')) {
        // Validate and cast media type
        const validImageTypes: ImageMediaType[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        const mediaType = validImageTypes.includes(attachment.type as ImageMediaType)
          ? (attachment.type as ImageMediaType)
          : 'image/jpeg'; // Default fallback

        userContent.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: attachment.data,
          },
        });
      } else if (attachment.type === 'application/pdf') {
        userContent.push({
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf' as DocumentMediaType,
            data: attachment.data,
          },
        });
      }
    }

    // Add text message (using sanitized message)
    userContent.push({
      type: 'text',
      text: sanitizedMessage + (attachments.length > 0
        ? `\n\n[צורפו ${attachments.length} קבצים: ${attachments.map(a => a.name).join(', ')}]`
        : ''),
    });

    // Build messages array for Anthropic
    const messages: AnthropicMessage[] = [
      // Include conversation history
      ...conversationHistory.map((msg: ChatMessage) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      // Add new user message with attachments (using sanitized message)
      {
        role: 'user' as const,
        content: attachments.length > 0 ? userContent : sanitizedMessage,
      },
    ];

    // Create streaming response
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Process chat in background
    (async () => {
      let fullResponse = '';
      let totalInputTokens = 0;
      let totalOutputTokens = 0;

      try {
        let currentMessages = messages;
        let continueLoop = true;
        let iterationCount = 0;
        const maxIterations = 10; // Prevent infinite loops

        while (continueLoop && iterationCount < maxIterations) {
          iterationCount++;

          // Call Claude API
          const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 4096,
            system: systemPrompt,
            tools: chatTools as Anthropic.Tool[],
            messages: currentMessages,
          });

          // Track token usage
          totalInputTokens += response.usage?.input_tokens || 0;
          totalOutputTokens += response.usage?.output_tokens || 0;

          // Check stop reason
          if (response.stop_reason === 'tool_use') {
            // Find tool use blocks
            const toolUseBlocks = response.content.filter(
              (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
            );

            // Execute tools
            const toolResults: ToolResultBlock[] = [];

            for (const toolUse of toolUseBlocks) {
              const toolStartTime = Date.now();

              // Log tool call
              tracer.logToolCall(toolUse.name, toolUse.input as Record<string, unknown>);
              langfuse.logToolCall(toolUse.name, toolUse.input as Record<string, unknown>);

              // Notify user about tool execution
              const toolNotification = `\n[מבצע: ${getToolHebrewName(toolUse.name)}...]\n`;
              await writer.write(encoder.encode(toolNotification));
              fullResponse += toolNotification;

              const result = await executeToolCall(
                toolUse.name,
                toolUse.input as Record<string, unknown>,
                { session, aiExtractions }
              );

              const toolLatency = Date.now() - toolStartTime;

              // Log tool result
              tracer.logToolResult(toolUse.name, result, toolLatency);
              langfuse.logToolResult(toolUse.name, result, toolLatency);

              toolResults.push({
                type: 'tool_result',
                tool_use_id: toolUse.id,
                content: result,
              });
            }

            // Add assistant response and tool results to messages
            currentMessages = [
              ...currentMessages,
              { role: 'assistant' as const, content: response.content as ContentBlock[] },
              { role: 'user' as const, content: toolResults },
            ];
          } else {
            // Final response - stream the text with security filtering
            continueLoop = false;

            for (const block of response.content) {
              if (block.type === 'text') {
                // === SECURITY CHECK: Output Filtering ===
                const outputCheck = securityCheckOutput(block.text, sessionId);

                if (outputCheck.blocked) {
                  // Output was blocked - send safe message
                  const blockedMsg = 'מצטער, לא ניתן להציג תשובה זו.';
                  await writer.write(encoder.encode(blockedMsg));
                  fullResponse += blockedMsg;
                  continue;
                }

                // Use filtered and sanitized text
                const text = outputCheck.strippedMarkdown;
                fullResponse += text;
                const chunkSize = 50;

                for (let i = 0; i < text.length; i += chunkSize) {
                  const chunk = text.slice(i, i + chunkSize);
                  await writer.write(encoder.encode(chunk));
                  // Small delay for streaming effect
                  await new Promise(resolve => setTimeout(resolve, 10));
                }
              }
            }
          }
        }

        if (iterationCount >= maxIterations) {
          const maxIterMsg = '\n\n[הגעתי למגבלת האיטרציות. אנא נסה שאלה פשוטה יותר.]';
          await writer.write(encoder.encode(maxIterMsg));
          fullResponse += maxIterMsg;
        }

        // Log assistant response
        const latencyMs = Date.now() - startTime;
        tracer.logAssistantResponse(fullResponse, {
          model: 'claude-sonnet-4-5-20250929',
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          latencyMs,
        });

        // Log to Langfuse
        langfuse.logGeneration({
          name: 'chat-response',
          model: 'claude-sonnet-4-5-20250929',
          input: sanitizedMessage,
          output: fullResponse,
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          latencyMs,
          metadata: {
            iterationCount,
            hasAttachments: attachments.length > 0,
          },
        });

      } catch (error) {
        console.error('Chat processing error:', error);
        // Don't expose internal error details to user
        const safeErrorMsg = '\n\nמצטער, אירעה שגיאה בעיבוד השאלה. אנא נסה שוב.';
        await writer.write(encoder.encode(safeErrorMsg));

        // Log full error internally
        tracer.logError(
          error instanceof Error ? error.message : 'Unknown error',
          { stack: error instanceof Error ? error.stack : undefined }
        );
        langfuse.logError(
          error instanceof Error ? error.message : 'Unknown error',
          { stack: error instanceof Error ? error.stack : undefined }
        );
      } finally {
        await writer.close();
        // Flush Langfuse traces
        await langfuse.endTrace();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);

    // Log error internally
    tracer.logError(
      error instanceof Error ? error.message : 'Unknown error',
      { phase: 'request_parsing' }
    );

    // Don't expose internal error details to user
    return new Response(
      JSON.stringify({
        error: 'אירעה שגיאה. אנא נסה שוב.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Get Hebrew name for tool
 */
function getToolHebrewName(toolName: string): string {
  const names: Record<string, string> = {
    get_extracted_data: 'שליפת נתונים',
    get_document_content: 'קריאת מסמך',
    explain_field: 'הסבר שדה',
    search_documents: 'חיפוש במסמכים',
    get_validation_status: 'בדיקת תקינות',
    generate_report_text: 'יצירת טקסט',
    get_comparable_analysis: 'ניתוח השוואתי',
    web_search: 'חיפוש באינטרנט',
  };
  return names[toolName] || toolName;
}

// GET endpoint to retrieve chat traces and security status
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    const tracer = createTracer(sessionId);
    const securityStatus = getSessionSecurityStatus(sessionId);

    return new Response(
      JSON.stringify({
        success: true,
        sessionId,
        traces: tracer.getTraces(),
        summary: tracer.getSummary(),
        security: securityStatus,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Get chat traces error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get chat traces' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

