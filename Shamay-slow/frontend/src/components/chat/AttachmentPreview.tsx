/**
 * AttachmentPreview Component - Shows attached files before sending
 */

'use client';

interface FileAttachment {
  file: File;
  preview?: string;
  type: 'image' | 'pdf' | 'audio';
}

interface AttachmentPreviewProps {
  attachments: FileAttachment[];
  onRemove: (index: number) => void;
}

export function AttachmentPreview({
  attachments,
  onRemove,
}: AttachmentPreviewProps) {
  if (attachments.length === 0) return null;

  return (
    <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
      <p className="text-xs text-gray-500 mb-2">קבצים מצורפים:</p>
      <div className="flex flex-wrap gap-2">
        {attachments.map((attachment, index) => (
          <div
            key={index}
            className="relative group flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg"
          >
            {/* File Icon/Preview */}
            {attachment.type === 'image' && attachment.preview ? (
              <img
                src={attachment.preview}
                alt={attachment.file.name}
                className="w-8 h-8 object-cover rounded"
              />
            ) : attachment.type === 'pdf' ? (
              <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
            ) : attachment.type === 'audio' ? (
              <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-purple-600"
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
              </div>
            ) : (
              <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </div>
            )}

            {/* File Name */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-700 truncate max-w-[120px]">
                {attachment.file.name}
              </p>
              <p className="text-xs text-gray-400">
                {formatFileSize(attachment.file.size)}
              </p>
            </div>

            {/* Remove Button */}
            <button
              onClick={() => onRemove(index)}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              title="הסר קובץ"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
