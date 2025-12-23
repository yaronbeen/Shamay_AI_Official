/**
 * FileUploadButton Component - Button to upload files in chat
 */

'use client';

interface FileUploadButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function FileUploadButton({
  onClick,
  disabled = false,
}: FileUploadButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="p-2.5 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      title="העלה קובץ (תמונה או PDF)"
      aria-label="העלה קובץ"
    >
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
          d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
        />
      </svg>
    </button>
  );
}

