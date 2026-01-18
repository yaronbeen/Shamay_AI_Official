"use client";

import React from "react";

// ============================================================================
// Types
// ============================================================================

export interface PageNavigatorProps {
  currentPage: number; // 0-indexed
  totalPages: number;
  onPageChange: (pageIndex: number) => void;
}

// ============================================================================
// Component
// ============================================================================

export function PageNavigator({
  currentPage,
  totalPages,
  onPageChange,
}: PageNavigatorProps) {
  const canGoPrev = currentPage > 0;
  const canGoNext = currentPage < totalPages - 1;

  const handlePrev = () => {
    if (canGoPrev) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onPageChange(Number(e.target.value));
  };

  if (totalPages === 0) {
    return null;
  }

  return (
    <div
      className="flex items-center justify-center gap-4 px-4 py-2 bg-gray-50 border-b"
      dir="rtl"
    >
      {/* Next page (left arrow in RTL) */}
      <button
        onClick={handleNext}
        disabled={!canGoNext}
        className={`h-8 w-8 flex items-center justify-center rounded-md border transition-all ${
          canGoNext
            ? "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
            : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
        }`}
        title="עמוד הבא"
      >
        ←
      </button>

      {/* Page indicator */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">עמוד</span>
        <select
          value={currentPage}
          onChange={handlePageSelect}
          className="h-8 px-2 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {Array.from({ length: totalPages }, (_, i) => (
            <option key={i} value={i}>
              {i + 1}
            </option>
          ))}
        </select>
        <span className="text-sm text-gray-600">מתוך {totalPages}</span>
      </div>

      {/* Previous page (right arrow in RTL) */}
      <button
        onClick={handlePrev}
        disabled={!canGoPrev}
        className={`h-8 w-8 flex items-center justify-center rounded-md border transition-all ${
          canGoPrev
            ? "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
            : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
        }`}
        title="עמוד קודם"
      >
        →
      </button>
    </div>
  );
}
