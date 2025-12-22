/**
 * VoiceInputButton Component - Microphone button for voice input
 */

'use client';

interface VoiceInputButtonProps {
  isListening: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function VoiceInputButton({
  isListening,
  onClick,
  disabled = false,
}: VoiceInputButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        p-2.5 rounded-lg transition-all
        ${
          isListening
            ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
        }
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
      title={isListening ? 'עצור הקלטה' : 'הקלט קול'}
      aria-label={isListening ? 'עצור הקלטה' : 'הקלט קול'}
    >
      {isListening ? (
        // Stop icon
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
          />
        </svg>
      ) : (
        // Microphone icon
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
      )}
    </button>
  );
}
