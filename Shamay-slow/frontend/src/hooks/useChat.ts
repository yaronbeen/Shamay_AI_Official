/**
 * useChat Hook - Manages chat state, file uploads, and API communication
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import type { ChatMessage } from '@/types/chat';

interface FileAttachment {
  file: File;
  preview?: string;
  type: 'image' | 'pdf' | 'audio';
}

interface UseChatOptions {
  sessionId: string;
  onError?: (error: string) => void;
}

interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  attachments: FileAttachment[];
  sendMessage: (content: string, files?: File[]) => Promise<void>;
  clearMessages: () => void;
  retryLastMessage: () => Promise<void>;
  addAttachment: (file: File) => void;
  removeAttachment: (index: number) => void;
  clearAttachments: () => void;
  transcribeAudio: (audioBlob: Blob) => Promise<string | null>;
}

// Supported file types
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const SUPPORTED_PDF_TYPES = ['application/pdf'];
const SUPPORTED_AUDIO_TYPES = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg'];

export function useChat({ sessionId, onError }: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const lastMessageRef = useRef<string>('');
  const lastFilesRef = useRef<File[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Add file attachment
  const addAttachment = useCallback((file: File) => {
    let type: 'image' | 'pdf' | 'audio';
    let preview: string | undefined;

    if (SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      type = 'image';
      preview = URL.createObjectURL(file);
    } else if (SUPPORTED_PDF_TYPES.includes(file.type)) {
      type = 'pdf';
    } else if (SUPPORTED_AUDIO_TYPES.includes(file.type)) {
      type = 'audio';
    } else {
      onError?.(`סוג קובץ לא נתמך: ${file.type}`);
      return;
    }

    // Check file size (max 10MB for images/PDFs, 25MB for audio)
    const maxSize = type === 'audio' ? 25 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      onError?.(`הקובץ גדול מדי. מקסימום ${maxSize / 1024 / 1024}MB`);
      return;
    }

    setAttachments(prev => [...prev, { file, preview, type }]);
  }, [onError]);

  // Remove attachment
  const removeAttachment = useCallback((index: number) => {
    setAttachments(prev => {
      const removed = prev[index];
      if (removed?.preview) {
        URL.revokeObjectURL(removed.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  // Clear all attachments
  const clearAttachments = useCallback(() => {
    setAttachments(prev => {
      prev.forEach(a => {
        if (a.preview) URL.revokeObjectURL(a.preview);
      });
      return [];
    });
  }, []);

  // Transcribe audio using Whisper API
  const transcribeAudio = useCallback(async (audioBlob: Blob): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('sessionId', sessionId);
      formData.append('language', 'he'); // Hebrew

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Transcription failed');
      }

      const result = await response.json();
      return result.text || null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'שגיאה בתמלול';
      onError?.(errorMessage);
      return null;
    }
  }, [sessionId, onError]);

  // Send message with optional file attachments
  const sendMessage = useCallback(async (content: string, files?: File[]) => {
    if ((!content.trim() && !files?.length && !attachments.length) || isLoading) return;

    // Store for retry
    lastMessageRef.current = content;
    lastFilesRef.current = files || attachments.map(a => a.file);

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Combine provided files with attachments
    const allFiles = files || attachments.map(a => a.file);

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim() + (allFiles.length > 0
        ? `\n\n📎 ${allFiles.length} קבצים מצורפים`
        : ''),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    // Add placeholder assistant message
    const assistantId = `assistant-${Date.now()}`;
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, assistantMessage]);

    // Clear attachments after sending
    clearAttachments();

    try {
      // Build request body
      let requestBody: FormData | string;
      let headers: HeadersInit = {};

      if (allFiles.length > 0) {
        // Use FormData for file uploads
        const formData = new FormData();
        formData.append('message', content);
        formData.append('conversationHistory', JSON.stringify(messages));

        for (const file of allFiles) {
          formData.append('files', file);
        }

        requestBody = formData;
        // Don't set Content-Type header - browser will set it with boundary
      } else {
        // Use JSON for text-only messages
        headers = { 'Content-Type': 'application/json' };
        requestBody = JSON.stringify({
          message: content,
          conversationHistory: messages,
        });
      }

      const response = await fetch(`/api/session/${sessionId}/chat`, {
        method: 'POST',
        headers,
        body: requestBody,
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Stream the response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantContent += chunk;

        // Update the assistant message with streaming content
        setMessages(prev => {
          const updated = [...prev];
          const lastIndex = updated.findIndex(m => m.id === assistantId);
          if (lastIndex !== -1) {
            updated[lastIndex] = {
              ...updated[lastIndex],
              content: assistantContent,
            };
          }
          return updated;
        });
      }

      // Mark streaming as complete
      setMessages(prev => {
        const updated = [...prev];
        const lastIndex = updated.findIndex(m => m.id === assistantId);
        if (lastIndex !== -1) {
          updated[lastIndex] = {
            ...updated[lastIndex],
            isStreaming: false,
          };
        }
        return updated;
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, ignore
        return;
      }

      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      onError?.(errorMessage);

      // Remove the placeholder assistant message on error
      setMessages(prev => prev.filter(m => m.id !== assistantId));
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [sessionId, messages, isLoading, attachments, clearAttachments, onError]);

  const clearMessages = useCallback(() => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setError(null);
    setIsLoading(false);
    clearAttachments();
  }, [clearAttachments]);

  const retryLastMessage = useCallback(async () => {
    if (lastMessageRef.current || lastFilesRef.current.length > 0) {
      // Remove the last failed exchange
      setMessages(prev => {
        const lastUserIndex = [...prev].reverse().findIndex(m => m.role === 'user');
        if (lastUserIndex !== -1) {
          return prev.slice(0, prev.length - lastUserIndex - 1);
        }
        return prev;
      });
      await sendMessage(lastMessageRef.current, lastFilesRef.current);
    }
  }, [sendMessage]);

  return {
    messages,
    isLoading,
    error,
    attachments,
    sendMessage,
    clearMessages,
    retryLastMessage,
    addAttachment,
    removeAttachment,
    clearAttachments,
    transcribeAudio,
  };
}
