"use client";

import React, { useState } from "react";
import { Edit3, Save, XCircle, Info } from "lucide-react";

export interface ProvenanceInfo {
  documentName?: string;
  pageNumber?: number;
  confidence?: number;
  extractionMethod?: string;
}

export interface EditableFieldProps {
  field: string;
  label: string;
  value: string | number | undefined;
  editingField: string | null;
  tempValue: string;
  onEdit: (field: string, value: string) => void;
  onSave: (field: string) => void;
  onCancel: () => void;
  onValueChange: (value: string) => void;
  dataSource: string;
  provenanceInfo?: ProvenanceInfo | null;
  type?: "text" | "textarea" | "select";
  options?: string[];
}

export function EditableField({
  field,
  label,
  value,
  editingField,
  tempValue,
  onEdit,
  onSave,
  onCancel,
  onValueChange,
  dataSource,
  provenanceInfo,
  type = "text",
  options,
}: EditableFieldProps) {
  const displayValue = value || "לא נמצא";
  const isEditing = editingField === field;
  const [showTooltip, setShowTooltip] = useState(false);

  const tooltipContent = provenanceInfo ? (
    <div className="text-sm space-y-1">
      {provenanceInfo.documentName && (
        <p>
          <strong>מסמך:</strong> {provenanceInfo.documentName}
        </p>
      )}
      {provenanceInfo.pageNumber && (
        <p>
          <strong>עמוד:</strong> {provenanceInfo.pageNumber}
        </p>
      )}
      {provenanceInfo.confidence !== undefined && (
        <p>
          <strong>רמת ביטחון:</strong>{" "}
          {Math.round(provenanceInfo.confidence * 100)}%
        </p>
      )}
      {provenanceInfo.extractionMethod && (
        <p>
          <strong>שיטת חילוץ:</strong>{" "}
          {provenanceInfo.extractionMethod === "manual" ? "ידני" : "AI"}
        </p>
      )}
    </div>
  ) : null;

  return (
    <div className="p-3 rounded-lg bg-gray-50">
      <label className="block text-sm font-medium text-gray-700 mb-2 text-right flex items-center gap-2">
        <span className="flex-1">{label}</span>
        {provenanceInfo && (
          <span className="relative inline-block">
            <button
              type="button"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="text-blue-500 hover:text-blue-700 transition-colors cursor-help"
              title="מידע מקור"
            >
              <Info className="w-4 h-4" />
            </button>
            {showTooltip && (
              <div className="absolute right-0 bottom-full mb-2 w-64 bg-gray-900 text-white p-3 rounded-lg shadow-lg z-50 text-right">
                <div className="text-xs mb-1 font-semibold border-b border-gray-700 pb-1">
                  מידע מקור
                </div>
                {tooltipContent}
                <div className="absolute bottom-0 right-4 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
            )}
          </span>
        )}
      </label>

      <div className="flex items-center gap-2">
        {isEditing ? (
          <div className="flex-1 flex items-center gap-2">
            {type === "textarea" ? (
              <textarea
                value={tempValue}
                onChange={(e) => onValueChange(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-right min-h-[60px] text-sm"
                dir="rtl"
              />
            ) : type === "select" && options ? (
              <select
                value={tempValue}
                onChange={(e) => onValueChange(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-right text-sm"
                dir="rtl"
              >
                {options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={type}
                value={tempValue}
                onChange={(e) => onValueChange(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-right text-sm"
                dir="rtl"
              />
            )}
            <button
              onClick={() => onSave(field)}
              className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors"
              title="שמור"
            >
              <Save className="w-4 h-4" />
            </button>
            <button
              onClick={onCancel}
              className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
              title="בטל"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <span className="flex-1 text-right text-sm text-gray-900">
              {String(displayValue)}
            </span>
            <button
              onClick={() => onEdit(field, String(value || ""))}
              className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
              title="ערוך"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-1">{dataSource}</p>
    </div>
  );
}
