/**
 * ChatInterface Component - Main chat UI with voice input, file uploads, and tracing
 * Hebrew RTL layout with Claude Agent SDK integration
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from '@/hooks/useChat';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { SuggestedQuestions } from './SuggestedQuestions';
import { VoiceInputButton } from './VoiceInputButton';
import { FileUploadButton } from './FileUploadButton';
import { AttachmentPreview } from './AttachmentPreview';
import type { SuggestedQuestion } from '@/types/chat';

interface ChatInterfaceProps {
  sessionId: string;
  onClose?: () => void;
  mode?: 'sidebar' | 'modal' | 'embedded';
  className?: string;
}

export function ChatInterface({
  sessionId,
  onClose,
  mode = 'sidebar',
  className = '',
}: ChatInterfaceProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const {
    messages,
    isLoading,
    error,
    attachments,
    sendMessage,
    clearMessages,
    addAttachment,
    removeAttachment,
    transcribeAudio,
  } = useChat({
    sessionId,
    onError: (err) => console.error('Chat error:', err),
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => addAttachment(file));
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [addAttachment]);

  // Start voice recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());

        // Create audio blob
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        // Transcribe
        setIsTranscribing(true);
        const transcription = await transcribeAudio(audioBlob);
        setIsTranscribing(false);

        if (transcription) {
          setInputValue(prev => prev + (prev ? ' ' : '') + transcription);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  }, [transcribeAudio]);

  // Stop voice recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  // Toggle recording
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const handleSend = useCallback(async () => {
    if ((!inputValue.trim() && attachments.length === 0) || isLoading) return;

    const message = inputValue.trim();
    setInputValue('');
    await sendMessage(message);
  }, [inputValue, attachments, isLoading, sendMessage]);

  const handleSuggestedQuestion = useCallback(async (question: string) => {
    await sendMessage(question);
  }, [sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Suggested questions
  const suggestedQuestions: SuggestedQuestion[] = [
    { text: 'מה המשמעות של המשכנתא הרשומה?', category: 'documents' },
    { text: 'האם יש הערות אזהרה על הנכס?', category: 'documents' },
    { text: 'מה השטח הרשום בטאבו?', category: 'fields' },
    { text: 'עזור לי לנסח תיאור נכס', category: 'report' },
    { text: 'מה רמת הביטחון בנתונים שחולצו?', category: 'validation' },
    { text: 'הסבר לי את פרטי הגוש והחלקה', category: 'fields' },
  ];

  // Minimized state - floating button
  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-white shadow-lg hover:bg-blue-700 transition-colors"
        title="פתח עוזר AI"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span className="font-medium">עוזר AI</span>
      </button>
    );
  }

  // Container classes based on mode
  const containerClasses = {
    sidebar: 'h-full w-96 border-r border-gray-200 bg-white flex flex-col',
    modal: 'fixed inset-4 z-50 rounded-lg shadow-2xl bg-white flex flex-col max-w-2xl mx-auto',
    embedded: 'h-full bg-white flex flex-col rounded-lg border border-gray-200',
  };

  return (
    <div className={`${containerClasses[mode]} ${className}`} dir="rtl">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <h2 className="font-semibold text-gray-800">עוזר AI לשאלות ותשובות</h2>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title="נקה שיחה"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title="מזער"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title="סגור"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">שלום! אני כאן לעזור</h3>
            <p className="text-gray-500 text-sm max-w-xs mx-auto mb-4">
              שאל אותי שאלות על המסמכים שהועלו, או בקש עזרה בניסוח טקסט לדוח השומה
            </p>
            <div className="flex justify-center gap-2 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                קלט קולי
              </span>
              <span className="flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                העלאת קבצים
              </span>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))
        )}

        {/* Loading indicator */}
        {isLoading && messages[messages.length - 1]?.content === '' && (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>מעבד...</span>
          </div>
        )}

        {/* Transcribing indicator */}
        {isTranscribing && (
          <div className="flex items-center gap-2 text-blue-600 text-sm">
            <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
            <span>מתמלל הקלטה...</span>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions - show only when no messages */}
      {messages.length === 0 && (
        <SuggestedQuestions
          questions={suggestedQuestions}
          onSelect={handleSuggestedQuestion}
          disabled={isLoading}
        />
      )}

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <AttachmentPreview
          attachments={attachments}
          onRemove={removeAttachment}
        />
      )}

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="flex items-end gap-2">
          {/* File Upload Button */}
          <FileUploadButton
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          />

          <ChatInput
            ref={inputRef}
            value={inputValue}
            onChange={setInputValue}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? 'מקליט...' : isTranscribing ? 'מתמלל...' : 'שאל שאלה על המסמכים...'}
            disabled={isLoading || isTranscribing}
            isListening={isRecording}
          />

          {/* Voice Input Button (Whisper) */}
          <VoiceInputButton
            isListening={isRecording}
            onClick={toggleRecording}
            disabled={isLoading || isTranscribing}
          />

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={(!inputValue.trim() && attachments.length === 0) || isLoading}
            className="p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="שלח"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>

        {/* Recording indicator */}
        {isRecording && (
          <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <span>מקליט... לחץ שוב לעצירה</span>
          </div>
        )}
      </div>
    </div>
  );
}
