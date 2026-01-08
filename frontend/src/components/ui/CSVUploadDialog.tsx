'use client'

import React, { useState, useCallback, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from './dialog'
import { Button } from './button'
import { parseCSVFile, generateTableId, type ParsedCSV } from '@/lib/csv-parser'
import { CustomTable } from '@/components/ValuationWizard'

interface CSVUploadDialogProps {
  isOpen: boolean
  onClose: () => void
  onTableInsert: (table: CustomTable) => void
}

export function CSVUploadDialog({ isOpen, onClose, onTableInsert }: CSVUploadDialogProps) {
  const [parsedData, setParsedData] = useState<ParsedCSV | null>(null)
  const [tableTitle, setTableTitle] = useState('')
  const [fileName, setFileName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const currentFileRef = useRef<string | null>(null)

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Security: Limit file size to 5MB to prevent memory issues
    const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
    if (file.size > MAX_FILE_SIZE) {
      setError('הקובץ גדול מדי. הגודל המקסימלי הוא 5MB')
      return
    }

    // Track current file to prevent race conditions
    const fileId = `${file.name}-${file.lastModified}`
    currentFileRef.current = fileId

    setIsLoading(true)
    setError(null)

    try {
      const parsed = await parseCSVFile(file)

      // Check if this is still the current file (user may have selected another)
      if (currentFileRef.current !== fileId) {
        return // Ignore stale result
      }

      if (parsed.headers.length === 0) {
        throw new Error('הקובץ ריק או בפורמט לא תקין')
      }

      // Security: Limit table dimensions to prevent performance issues
      const MAX_ROWS = 1000
      const MAX_COLS = 50
      if (parsed.rows.length > MAX_ROWS) {
        throw new Error(`הטבלה גדולה מדי. מקסימום ${MAX_ROWS} שורות (נמצאו ${parsed.rows.length})`)
      }
      if (parsed.headers.length > MAX_COLS) {
        throw new Error(`יותר מדי עמודות. מקסימום ${MAX_COLS} עמודות (נמצאו ${parsed.headers.length})`)
      }

      setParsedData(parsed)
      setFileName(file.name)
      // Default title from filename (without extension)
      setTableTitle(file.name.replace(/\.csv$/i, ''))
    } catch (err) {
      // Only set error if this is still the current file
      if (currentFileRef.current === fileId) {
        setError(err instanceof Error ? err.message : 'שגיאה בקריאת הקובץ')
        setParsedData(null)
      }
    } finally {
      // Only update loading state if this is still the current file
      if (currentFileRef.current === fileId) {
        setIsLoading(false)
      }
    }
  }, [])

  const handleInsert = useCallback(() => {
    if (!parsedData) return

    const now = new Date().toISOString()
    const table: CustomTable = {
      id: generateTableId(),
      title: tableTitle.trim() || undefined,
      headers: parsedData.headers,
      rows: parsedData.rows,
      createdAt: now,
      updatedAt: now,
    }

    onTableInsert(table)
    onClose()
  }, [parsedData, tableTitle, onTableInsert, onClose])

  const handleClose = useCallback(() => {
    setParsedData(null)
    setTableTitle('')
    setFileName('')
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onClose()
  }, [onClose])

  const previewRows = parsedData?.rows.slice(0, 5) || []
  const hasMoreRows = (parsedData?.rows.length || 0) > 5

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">העלאת טבלה מ-CSV</DialogTitle>
          <DialogDescription className="text-right">
            בחר קובץ CSV להוספת טבלה מותאמת אישית למסמך
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* File Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              בחר קובץ CSV
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-medium
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                cursor-pointer"
            />
            {fileName && (
              <p className="text-sm text-gray-500">קובץ נבחר: {fileName}</p>
            )}
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="mr-2 text-gray-600">מעבד קובץ...</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
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
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
                    focus:ring-blue-500 focus:border-blue-500 text-sm"
                  dir="rtl"
                />
              </div>

              {/* Data Preview */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  תצוגה מקדימה ({parsedData.rows.length} שורות, {parsedData.headers.length} עמודות)
                </label>
                <div className="border border-gray-200 rounded-md overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {parsedData.headers.map((header, idx) => (
                          <th
                            key={idx}
                            className="px-3 py-2 text-right font-medium text-gray-700 whitespace-nowrap"
                          >
                            {header || `עמודה ${idx + 1}`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {previewRows.map((row, rowIdx) => (
                        <tr key={rowIdx}>
                          {row.map((cell, cellIdx) => (
                            <td
                              key={cellIdx}
                              className="px-3 py-2 text-gray-600 whitespace-nowrap"
                            >
                              {cell || '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {hasMoreRows && (
                  <p className="text-sm text-gray-500 text-center">
                    ... ועוד {parsedData.rows.length - 5} שורות נוספות
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={handleClose}>
            ביטול
          </Button>
          <Button
            onClick={handleInsert}
            disabled={!parsedData}
            className="bg-blue-600 hover:bg-blue-700"
          >
            הוסף טבלה למסמך
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
