"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Maximize2, Minimize2, Loader2, RefreshCw } from "lucide-react";
import { ValuationData } from "@/types/valuation";
import { generateDocumentHTML } from "@/lib/document-template";

interface Step5DocumentPreviewProps {
  data: ValuationData;
  width: "half" | "full";
  onWidthChange: () => void;
}

export function Step5DocumentPreview({
  data,
  width,
  onWidthChange,
}: Step5DocumentPreviewProps) {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const generatePreview = useCallback(() => {
    setLoading(true);
    try {
      const generated = generateDocumentHTML(data, true);
      setHtml(generated);
    } catch (error) {
      console.error("Error generating preview:", error);
    } finally {
      setLoading(false);
    }
  }, [data]);

  useEffect(() => {
    generatePreview();
  }, [generatePreview]);

  // Adjust iframe height when content loads
  const handleIframeLoad = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        const scrollHeight = Math.max(
          doc.documentElement?.scrollHeight || 0,
          doc.body?.scrollHeight || 0,
        );
        iframe.style.height = `${Math.max(scrollHeight, 800)}px`;
      }
    } catch (error) {
      // Cross-origin errors are expected, ignore
    }
  }, []);

  return (
    <div className="h-full flex flex-col bg-white rounded-lg border shadow-sm">
      {/* Header with controls */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
        <h3 className="font-semibold text-gray-800">תצוגה מקדימה</h3>
        <div className="flex items-center gap-2">
          {/* Refresh button */}
          <button
            onClick={generatePreview}
            disabled={loading}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="רענן תצוגה מקדימה"
          >
            <RefreshCw
              className={`w-4 h-4 text-gray-600 ${loading ? "animate-spin" : ""}`}
            />
          </button>
          {/* Width toggle button */}
          <button
            onClick={onWidthChange}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title={width === "half" ? "הרחב לרוחב מלא" : "צמצם לחצי רוחב"}
          >
            {width === "half" ? (
              <Maximize2 className="w-4 h-4 text-gray-600" />
            ) : (
              <Minimize2 className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* Preview iframe */}
      <div className="flex-1 overflow-auto bg-gray-100 p-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            srcDoc={html}
            className="w-full min-h-[800px] bg-white border-0 shadow-lg"
            onLoad={handleIframeLoad}
            title="תצוגה מקדימה של המסמך"
          />
        )}
      </div>
    </div>
  );
}
