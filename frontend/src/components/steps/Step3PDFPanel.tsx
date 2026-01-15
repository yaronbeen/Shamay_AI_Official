"use client";

import React from "react";
import { FileText, Loader2, ExternalLink } from "lucide-react";

export type PDFFile = {
  type?: string;
  name?: string;
  preview?: string;
  url?: string;
  file?: File;
};

// Document type labels in Hebrew
export const getDocumentTypeLabel = (type: string): string => {
  const normalizedType = (type || "").toLowerCase();
  const labels: Record<string, string> = {
    tabu: "נסח טאבו",
    permit: "היתר בניה",
    building_permit: "היתר בניה",
    condo: "צו בית משותף",
    condominium_order: "צו בית משותף",
    planning: "מידע תכנוני",
    planning_sheet: "מידע תכנוני",
  };
  return labels[normalizedType] || type || "מסמך";
};

interface Step3PDFPanelProps {
  files: PDFFile[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  loading?: boolean;
  sessionId?: string;
}

export function Step3PDFPanel({
  files,
  currentIndex,
  onIndexChange,
  loading = false,
  sessionId,
}: Step3PDFPanelProps) {
  // Bounds check to prevent accessing beyond array length
  const safeIndex =
    files.length > 0 ? Math.min(currentIndex, files.length - 1) : 0;
  const currentFile = files[safeIndex];

  const openInNewTab = () => {
    if (sessionId && typeof window !== "undefined") {
      const opened = window.open(
        `/panel/step3-pdf?sessionId=${sessionId}`,
        "_blank",
        "noopener,noreferrer",
      );
      if (!opened) {
        console.warn("Popup blocked by browser");
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header with document tabs */}
      <div className="bg-white border-b border-gray-200 p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">מסמכים</h3>
          {sessionId && (
            <button
              onClick={openInNewTab}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
              title="פתח בלשונית חדשה"
              aria-label="פתח PDF בלשונית חדשה"
            >
              <ExternalLink className="w-4 h-4 text-gray-600" />
            </button>
          )}
        </div>

        {/* Document Tabs */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {files.map((file, index) => (
              <button
                key={index}
                onClick={() => onIndexChange(index)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  currentIndex === index
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {getDocumentTypeLabel(file.type || "")}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* PDF Viewer - Simple iframe */}
      <div className="flex-1 relative min-h-0">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-blue-600" />
              <p className="text-gray-600 text-sm">טוען מסמכים...</p>
            </div>
          </div>
        ) : currentFile?.url ? (
          <iframe
            key="pdf-viewer"
            src={currentFile.url}
            title={currentFile.name || "מסמך PDF"}
            className="w-full h-full bg-white"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-center text-gray-500">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">אין מסמכים להצגה</p>
              <p className="text-sm mt-1">העלה מסמכים בשלב הקודם</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer with instructions */}
      <div className="px-3 py-2 bg-blue-50 border-t text-xs text-blue-700 text-center">
        עיין במסמכים ועדכן את השדות בצד שמאל
      </div>
    </div>
  );
}
