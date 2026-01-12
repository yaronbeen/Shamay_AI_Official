/**
 * AI-Generated Field Component
 * Simple editable textarea with AI-generated content and debounced auto-save
 */

"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, RefreshCw } from "lucide-react";

interface AIGeneratedFieldProps {
  label: string;
  value: string;
  isLoading: boolean;
  onRegenerate?: () => void;
  onChange?: (newValue: string) => void;
  className?: string;
  rows?: number;
}

export function AIGeneratedField({
  label,
  value,
  isLoading,
  onRegenerate,
  onChange,
  className = "",
  rows = 6,
}: AIGeneratedFieldProps) {
  const [localValue, setLocalValue] = useState(value);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update local value when prop changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Debounced save - triggers onChange after 500ms of no typing
  const debouncedOnChange = useCallback(
    (newValue: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        onChange?.(newValue);
      }, 500);
    },
    [onChange],
  );

  const handleChange = (newValue: string) => {
    setLocalValue(newValue);
    debouncedOnChange(newValue);
  };

  // Immediate save on blur (flush any pending debounced save)
  const handleBlur = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    onChange?.(localValue);
  };

  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}
      dir="rtl"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-900">{label}</h3>

        {!isLoading && onRegenerate && localValue && (
          <button
            onClick={onRegenerate}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="צור מחדש"
          >
            <RefreshCw className="w-4 h-4" />
            <span>צור מחדש</span>
          </button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-gray-500 py-8 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>AI מייצר תוכן...</span>
        </div>
      ) : (
        <textarea
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          rows={rows}
          placeholder="התוכן ייווצר אוטומטית או שתוכל להקליד כאן..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
          dir="rtl"
        />
      )}
    </div>
  );
}
