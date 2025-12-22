/**
 * useVoiceInput Hook - Web Speech API integration for Hebrew voice input
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { VoiceInputState, VoiceInputOptions } from '@/types/chat';

// Type definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
}

interface SpeechRecognitionConstructor {
  new(): SpeechRecognition;
}

// Check for browser support
function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;

  const SpeechRecognition = (window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }).SpeechRecognition || (window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }).webkitSpeechRecognition;

  return SpeechRecognition || null;
}

export function useVoiceInput(options: VoiceInputOptions = {}) {
  const {
    language = 'he-IL',
    continuous = false,
    interimResults = true,
    onResult,
    onError,
    onEnd,
  } = options;

  const [state, setState] = useState<VoiceInputState>({
    isListening: false,
    isSupported: false,
    transcript: '',
    error: null,
    language,
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = getSpeechRecognition();

    if (SpeechRecognition) {
      setState(prev => ({ ...prev, isSupported: true }));
      isInitializedRef.current = true;
    } else {
      setState(prev => ({
        ...prev,
        isSupported: false,
        error: 'הדפדפן שלך לא תומך בקלט קולי',
      }));
    }

    // Cleanup on unmount
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  // Start listening
  const startListening = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();

    if (!SpeechRecognition) {
      const error = 'קלט קולי לא נתמך בדפדפן זה';
      setState(prev => ({ ...prev, error }));
      onError?.(error);
      return;
    }

    // Stop any existing recognition
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    // Create new recognition instance
    const recognition = new SpeechRecognition();
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = language;

    recognition.onstart = () => {
      setState(prev => ({
        ...prev,
        isListening: true,
        error: null,
        transcript: '',
      }));
    };

    recognition.onend = () => {
      setState(prev => ({ ...prev, isListening: false }));
      onEnd?.();
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      const transcript = finalTranscript || interimTranscript;
      setState(prev => ({ ...prev, transcript }));
      onResult?.(transcript, !!finalTranscript);

      // If we got a final result and not in continuous mode, stop
      if (finalTranscript && !continuous) {
        recognition.stop();
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      let errorMessage = 'שגיאה בזיהוי קולי';

      switch (event.error) {
        case 'no-speech':
          errorMessage = 'לא זוהה דיבור. אנא נסה שוב.';
          break;
        case 'audio-capture':
          errorMessage = 'לא נמצא מיקרופון. אנא בדוק את החיבור.';
          break;
        case 'not-allowed':
          errorMessage = 'גישה למיקרופון נדחתה. אנא אשר גישה בהגדרות הדפדפן.';
          break;
        case 'network':
          errorMessage = 'שגיאת רשת. אנא בדוק את החיבור לאינטרנט.';
          break;
        case 'aborted':
          // User aborted, not an error
          errorMessage = '';
          break;
        default:
          errorMessage = `שגיאה: ${event.error}`;
      }

      if (errorMessage) {
        setState(prev => ({ ...prev, error: errorMessage, isListening: false }));
        onError?.(errorMessage);
      } else {
        setState(prev => ({ ...prev, isListening: false }));
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (error) {
      const errorMessage = 'לא ניתן להפעיל זיהוי קולי';
      setState(prev => ({ ...prev, error: errorMessage }));
      onError?.(errorMessage);
    }
  }, [language, continuous, interimResults, onResult, onError, onEnd]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setState(prev => ({ ...prev, isListening: false }));
  }, []);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (state.isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [state.isListening, startListening, stopListening]);

  // Clear transcript
  const clearTranscript = useCallback(() => {
    setState(prev => ({ ...prev, transcript: '', error: null }));
  }, []);

  // Change language
  const setLanguage = useCallback((newLanguage: 'he-IL' | 'en-US') => {
    setState(prev => ({ ...prev, language: newLanguage }));
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
    setLanguage,
  };
}
