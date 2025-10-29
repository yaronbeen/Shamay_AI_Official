'use client'

import React, { useState, useCallback } from 'react'
import { 
  ChevronLeft, 
  ChevronRight, 
  Download,
  FileText,
  Loader2
} from 'lucide-react'

interface PDFViewerProps {
  files: Array<{
    type: string
    name: string
    url?: string
    preview?: string
    file?: File
  }>
  className?: string
}

export function Step3PDFViewer({ files, className = '' }: PDFViewerProps) {
  const [currentFileIndex, setCurrentFileIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filter only PDF files
  const pdfFiles = files.filter(file => 
    file.type === 'tabu' || 
    file.type === 'permit' || 
    file.type === 'condo' ||
    file.name.toLowerCase().endsWith('.pdf') ||
    (file.file && file.file.type === 'application/pdf')
  )

  const currentFile = pdfFiles[currentFileIndex]

  const goToPrevFile = () => {
    if (currentFileIndex > 0) {
      setCurrentFileIndex(currentFileIndex - 1)
      setIsLoading(true)
    }
  }

  const goToNextFile = () => {
    if (currentFileIndex < pdfFiles.length - 1) {
      setCurrentFileIndex(currentFileIndex + 1)
      setIsLoading(true)
    }
  }

  const downloadFile = () => {
    if (currentFile?.url) {
      const link = document.createElement('a')
      link.href = currentFile.url
      link.download = currentFile.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleIframeLoad = () => {
    setIsLoading(false)
    setError(null)
  }

  const handleIframeError = () => {
    setIsLoading(false)
    setError('שגיאה בטעינת המסמך')
  }

  if (pdfFiles.length === 0) {
    return (
      <div className={`bg-gray-50 rounded-lg border border-gray-200 p-8 text-center ${className}`}>
        <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-600 mb-2">אין מסמכי PDF להצגה</h3>
        <p className="text-gray-500">
          העלה מסמכי PDF (טאבו, היתר בנייה, צו בית משותף) כדי לראות אותם כאן
        </p>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="font-semibold text-gray-900">{currentFile?.name}</h3>
            <p className="text-sm text-gray-500">
              מסמך {currentFileIndex + 1} מתוך {pdfFiles.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* File navigation */}
          <button
            onClick={goToPrevFile}
            disabled={currentFileIndex === 0}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="מסמך קודם"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600 min-w-[80px] text-center">
            {currentFileIndex + 1}/{pdfFiles.length}
          </span>
          <button
            onClick={goToNextFile}
            disabled={currentFileIndex === pdfFiles.length - 1}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="מסמך הבא"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          {/* Download */}
          <button
            onClick={downloadFile}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="הורד מסמך"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="relative bg-gray-50 min-h-[400px] flex items-center justify-center">
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-gray-600">טוען מסמך...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center p-8">
            <div className="text-red-600 mb-2">⚠️ {error}</div>
            <p className="text-gray-500 text-sm">
              לא ניתן לטעון את המסמך. בדוק שהקובץ תקין ונסה שוב.
            </p>
            {currentFile?.url && (
              <a 
                href={currentFile.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="mt-2 inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                פתח קובץ בחלון חדש
              </a>
            )}
          </div>
        )}

        {currentFile && !error && (
          <div className="w-full h-full">
            <iframe
              key={`pdf-${currentFile.url}-${currentFileIndex}`}
              src={currentFile.url}
              className="w-full h-full rounded border"
              title={currentFile.name}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              style={{ minHeight: '400px' }}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            <span className="font-medium">סוג מסמך:</span> 
            <span className="mr-2">
              {currentFile?.type === 'tabu' && 'טאבו'}
              {currentFile?.type === 'permit' && 'היתר בנייה'}
              {currentFile?.type === 'condo' && 'צו בית משותף'}
              {!['tabu', 'permit', 'condo'].includes(currentFile?.type || '') && 'מסמך PDF'}
            </span>
          </div>
          <div>
            <span className="font-medium">מצב:</span> 
            <span className="mr-2">תצוגה מובנית</span>
          </div>
        </div>
      </div>
    </div>
  )
}