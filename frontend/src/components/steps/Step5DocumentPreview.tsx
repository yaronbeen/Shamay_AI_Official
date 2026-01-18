"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Maximize2, Minimize2, Loader2, RefreshCw } from "lucide-react";
import { ValuationData } from "@/types/valuation";
import { generateDocumentHTML } from "@/lib/document-template";
import { PageNavigator } from "@/components/EditableDocumentPreview/PageNavigator";

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
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [totalPageCount, setTotalPageCount] = useState(1);
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

  // Listen for pagination-complete event from iframe
  useEffect(() => {
    const handlePaginationComplete = (event: CustomEvent) => {
      const { pageCount } = event.detail || {};
      if (typeof pageCount === "number" && pageCount > 0) {
        setTotalPageCount(pageCount);
      }
    };

    window.addEventListener(
      "pagination-complete",
      handlePaginationComplete as EventListener,
    );
    return () => {
      window.removeEventListener(
        "pagination-complete",
        handlePaginationComplete as EventListener,
      );
    };
  }, []);

  // Navigate to specific page in iframe
  const navigateToPage = useCallback((pageIndex: number) => {
    setCurrentPageIndex(pageIndex);
    const iframe = iframeRef.current;
    if (!iframe) return;

    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;

      // Find all page containers
      const pages = doc.querySelectorAll(
        ".page-container, .a4-page, [data-page]",
      );
      if (pages.length > 0 && pages[pageIndex]) {
        pages[pageIndex].scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } catch (error) {
      // Cross-origin errors, ignore
    }
  }, []);

  // Update page count when iframe loads
  const handleIframeLoad = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        // Count pages
        const pages = doc.querySelectorAll(
          ".page-container, .a4-page, [data-page]",
        );
        if (pages.length > 0) {
          setTotalPageCount(pages.length);
        }

        // Adjust height
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
        <h3 className="font-semibold text-gray-800">תצוגה מקדימה של הדוח</h3>
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
              width === "full"
                ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            title={width === "half" ? "הרחב למסך מלא" : "צמצם"}
          >
            {width === "half" ? (
              <>
                <Maximize2 className="w-4 h-4" />
                <span className="text-sm font-medium">מסך מלא</span>
              </>
            ) : (
              <>
                <Minimize2 className="w-4 h-4" />
                <span className="text-sm font-medium">צמצם</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Page navigator */}
      <PageNavigator
        currentPage={currentPageIndex}
        totalPages={totalPageCount}
        onPageChange={navigateToPage}
      />

      {/* Preview iframe */}
      <div className="flex-1 overflow-auto bg-gray-100 p-2">
        {loading ? (
          <div className="flex items-center justify-center h-full min-h-[400px]">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500">טוען תצוגה מקדימה...</p>
            </div>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            srcDoc={html}
            className="w-full min-h-[800px] bg-white border-0 shadow-lg rounded"
            onLoad={handleIframeLoad}
            title="תצוגה מקדימה של המסמך"
          />
        )}
      </div>
    </div>
  );
}
