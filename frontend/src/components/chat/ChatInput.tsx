/**
 * ChatInput Component - Auto-resizing textarea for chat input
 */

'use client';

import { forwardRef, useEffect, useRef, useImperativeHandle } from 'react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  isListening?: boolean;
  maxRows?: number;
}

export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(
  function ChatInput(
    {
      value,
      onChange,
      onKeyDown,
      placeholder = 'הקלד הודעה...',
      disabled = false,
      isListening = false,
      maxRows = 4,
    },
    ref
  ) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Expose ref
    useImperativeHandle(ref, () => textareaRef.current!);

    // Auto-resize textarea
    useEffect(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';

      // Calculate new height
      const lineHeight = 24; // Approximate line height in pixels
      const maxHeight = lineHeight * maxRows;
      const newHeight = Math.min(textarea.scrollHeight, maxHeight);

      textarea.style.height = `${newHeight}px`;
    }, [value, maxRows]);

    return (
      <div className="relative flex-1">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={`
            w-full px-3 py-2.5 rounded-lg border resize-none
            text-sm leading-6 text-gray-800 placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:bg-gray-100 disabled:cursor-not-allowed
            ${isListening ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-white'}
          `}
          style={{
            minHeight: '42px',
            maxHeight: `${24 * maxRows}px`,
          }}
        />

        {/* Listening pulse indicator */}
        {isListening && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
            </span>
          </div>
        )}
      </div>
    );
  }
);

