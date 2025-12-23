/**
 * ChatMessage Component - Individual message display
 */

'use client';

import type { ChatMessage as ChatMessageType } from '@/types/chat';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isStreaming = message.isStreaming && message.content;

  return (
    <div className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-2.5 ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-none'
            : 'bg-gray-100 text-gray-800 rounded-bl-none'
        }`}
      >
        {/* Message content */}
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {message.content || (
            <span className="opacity-50">טוען...</span>
          )}
          {isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-current animate-pulse mr-0.5" />
          )}
        </div>

        {/* Tool execution indicator */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-300 text-xs opacity-70">
            <span>כלים: </span>
            {message.toolCalls.map((tool, i) => (
              <span key={tool.id}>
                {i > 0 && ', '}
                {getToolHebrewName(tool.name)}
              </span>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <div className={`text-xs mt-1 ${isUser ? 'text-blue-200' : 'text-gray-400'}`}>
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
}

function formatTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function getToolHebrewName(toolName: string): string {
  const names: Record<string, string> = {
    get_extracted_data: 'שליפת נתונים',
    get_document_content: 'קריאת מסמך',
    explain_field: 'הסבר שדה',
    search_documents: 'חיפוש',
    get_validation_status: 'בדיקת תקינות',
    generate_report_text: 'יצירת טקסט',
    get_comparable_analysis: 'ניתוח השוואתי',
  };
  return names[toolName] || toolName;
}

