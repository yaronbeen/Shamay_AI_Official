"use client";

import React, { useState, useCallback, useRef } from "react";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Dialog, DialogContent, DialogFooter } from "./dialog";
import { Button } from "./button";
import {
  parseCSVFile,
  generateTableId,
  type ParsedCSV,
} from "@/lib/csv-parser";
import { CustomTable } from "@/types/valuation";

interface CSVUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onTableInsert: (table: CustomTable) => void;
}

export function CSVUploadDialog({
  isOpen,
  onClose,
  onTableInsert,
}: CSVUploadDialogProps) {
  const [parsedData, setParsedData] = useState<ParsedCSV | null>(null);
  const [tableTitle, setTableTitle] = useState("");
  const [fileName, setFileName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentFileRef = useRef<string | null>(null);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Security: Limit file size to 5MB to prevent memory issues
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
      if (file.size > MAX_FILE_SIZE) {
        setError("הקובץ גדול מדי. הגודל המקסימלי הוא 5MB");
        return;
      }

      // Track current file to prevent race conditions
      const fileId = `${file.name}-${file.lastModified}`;
      currentFileRef.current = fileId;

      setIsLoading(true);
      setError(null);

      try {
        const parsed = await parseCSVFile(file);

        // Check if this is still the current file (user may have selected another)
        if (currentFileRef.current !== fileId) {
          return; // Ignore stale result
        }

        if (parsed.headers.length === 0) {
          throw new Error("הקובץ ריק או בפורמט לא תקין");
        }

        // Security: Limit table dimensions to prevent performance issues
        const MAX_ROWS = 1000;
        const MAX_COLS = 50;
        if (parsed.rows.length > MAX_ROWS) {
          throw new Error(
            `הטבלה גדולה מדי. מקסימום ${MAX_ROWS} שורות (נמצאו ${parsed.rows.length})`,
          );
        }
        if (parsed.headers.length > MAX_COLS) {
          throw new Error(
            `יותר מדי עמודות. מקסימום ${MAX_COLS} עמודות (נמצאו ${parsed.headers.length})`,
          );
        }

        setParsedData(parsed);
        setFileName(file.name);
        // Default title from filename (without extension)
        setTableTitle(file.name.replace(/\.csv$/i, ""));
      } catch (err) {
        // Only set error if this is still the current file
        if (currentFileRef.current === fileId) {
          setError(err instanceof Error ? err.message : "שגיאה בקריאת הקובץ");
          setParsedData(null);
        }
      } finally {
        // Only update loading state if this is still the current file
        if (currentFileRef.current === fileId) {
          setIsLoading(false);
        }
      }
    },
    [],
  );

  const handleInsert = useCallback(() => {
    if (!parsedData) return;

    const now = new Date().toISOString();
    const table: CustomTable = {
      id: generateTableId(),
      title: tableTitle.trim() || undefined,
      headers: parsedData.headers,
      rows: parsedData.rows,
      createdAt: now,
      updatedAt: now,
    };

    onTableInsert(table);
    onClose();
  }, [parsedData, tableTitle, onTableInsert, onClose]);

  const handleClose = useCallback(() => {
    setParsedData(null);
    setTableTitle("");
    setFileName("");
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  }, [onClose]);

  const previewRows = parsedData?.rows.slice(0, 5) || [];
  const hasMoreRows = (parsedData?.rows.length || 0) > 5;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col"
        dir="rtl"
      >
        {/* Centered Header with Icon - Dashboard Modal Style */}
        <div className="flex flex-col items-center text-center pt-2 pb-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Upload className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">
            העלאת טבלה מ-CSV
          </h2>
          <p className="text-sm text-gray-500">
            בחר קובץ CSV להוספת טבלה מותאמת אישית למסמך
          </p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-5">
          {/* File Input - Dropzone Style */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              בחר קובץ CSV
            </label>
            <div
              className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
                fileName
                  ? "border-green-300 bg-green-50"
                  : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="text-center pointer-events-none">
                {fileName ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileSpreadsheet className="h-6 w-6 text-green-600" />
                    <span className="text-sm font-medium text-green-700">
                      {fileName}
                    </span>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                ) : (
                  <>
                    <FileSpreadsheet className="mx-auto h-10 w-10 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 mb-1">
                      גרור קובץ CSV לכאן או{" "}
                      <span className="text-blue-600 font-medium">
                        לחץ לבחירה
                      </span>
                    </p>
                    <p className="text-xs text-gray-400">
                      מקסימום 5MB, עד 1000 שורות
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="mr-3 text-gray-600">מעבד קובץ...</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Preview */}
          {parsedData && (
            <>
              {/* Table Title Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  כותרת הטבלה (אופציונלי)
                </label>
                <input
                  type="text"
                  value={tableTitle}
                  onChange={(e) => setTableTitle(e.target.value)}
                  placeholder="הזן כותרת לטבלה"
                  className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm
                    focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  dir="rtl"
                />
              </div>

              {/* Data Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    תצוגה מקדימה
                  </label>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {parsedData.rows.length} שורות • {parsedData.headers.length}{" "}
                    עמודות
                  </span>
                </div>
                <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          {parsedData.headers.map((header, idx) => (
                            <th
                              key={idx}
                              className="px-4 py-2.5 text-right font-semibold text-gray-700 whitespace-nowrap"
                            >
                              {header || `עמודה ${idx + 1}`}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {previewRows.map((row, rowIdx) => (
                          <tr
                            key={rowIdx}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            {row.map((cell, cellIdx) => (
                              <td
                                key={cellIdx}
                                className="px-4 py-2.5 text-gray-600 whitespace-nowrap"
                              >
                                {cell || "—"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                {hasMoreRows && (
                  <p className="text-xs text-gray-500 text-center py-1">
                    ... ועוד {parsedData.rows.length - 5} שורות נוספות
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer with Action Buttons */}
        <DialogFooter className="flex gap-3 pt-4 border-t border-gray-200 mt-4">
          <Button
            variant="outline"
            onClick={handleClose}
            className="px-5 py-2.5"
          >
            ביטול
          </Button>
          <Button
            onClick={handleInsert}
            disabled={!parsedData}
            className="bg-blue-600 hover:bg-blue-700 px-5 py-2.5 font-medium"
          >
            הוסף טבלה למסמך
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
