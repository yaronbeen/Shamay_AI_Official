/**
 * Chat Types for Claude Agent SDK Integration
 */

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  isStreaming?: boolean;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  toolUseId: string;
  content: string;
  isError?: boolean;
}

export interface ChatSession {
  sessionId: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatRequest {
  message: string;
  conversationHistory: ChatMessage[];
  context?: ChatContext;
}

export interface ChatContext {
  extractedData?: Record<string, unknown>;
  documentTypes?: string[];
  validationStatus?: Record<string, unknown>;
  sessionStep?: number;
}

export interface ChatResponse {
  content: string;
  toolCalls?: ToolCall[];
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface StreamingChatResponse {
  type: 'text' | 'tool_use' | 'tool_result' | 'done' | 'error';
  content?: string;
  toolCall?: ToolCall;
  toolResult?: ToolResult;
  error?: string;
}

// Tool definitions for Claude Agent
export type ChatToolName =
  | 'get_extracted_data'
  | 'get_document_content'
  | 'explain_field'
  | 'search_documents'
  | 'get_validation_status'
  | 'generate_report_text'
  | 'get_comparable_analysis'
  | 'web_search';

export interface ChatTool {
  name: ChatToolName;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      items?: { type: string };
    }>;
    required?: string[];
  };
}

// Voice input types
export interface VoiceInputState {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  error: string | null;
  language: 'he-IL' | 'en-US';
}

export interface VoiceInputOptions {
  language?: 'he-IL' | 'en-US';
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

// Suggested questions
export interface SuggestedQuestion {
  text: string;
  category: 'documents' | 'fields' | 'validation' | 'report' | 'general';
  icon?: string;
}

