'use client'

import { useState } from 'react'
import { Download, FileText, CheckCircle, Loader2, ExternalLink } from 'lucide-react'
import { ValuationData } from '../ValuationWizard'

interface Step5ExportProps {
  data: ValuationData
  onSaveFinalResults?: (finalValuation: number, pricePerSqm: number, comparableData: any, propertyAnalysis: any) => Promise<void>
}

export function Step5Export({ data }: Step5ExportProps) {
  const [exporting, setExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)

  const handleExportPDF = async () => {
    if (!data.sessionId) {
      console.error('No session ID available')
      return
    }

    try {
      setExporting(true)
      setExportStatus('idle')

      console.log('📄 Starting PDF export...')
      
      const response = await fetch(`/api/session/${data.sessionId}/export-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error(`PDF export failed: ${response.status}`)
      }

      // Check response type
      const contentType = response.headers.get('content-type')
      console.log('📄 Response content type:', contentType)

      if (contentType?.includes('application/pdf')) {
        // PDF response - download directly
        const pdfBlob = await response.blob()
        console.log('✅ PDF blob created:', pdfBlob.size, 'bytes')
        
        setPdfBlob(pdfBlob)
        setExportStatus('success')

        // Create download link and trigger automatic download
        const url = URL.createObjectURL(pdfBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `shamay-valuation-${data.sessionId}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        // Keep the URL for re-download button
        // Don't revoke immediately so user can re-download
        setTimeout(() => URL.revokeObjectURL(url), 60000) // Clean up after 1 minute
        
      } else if (contentType?.includes('text/html')) {
        // Fallback: HTML response (shouldn't happen with new backend)
        const html = await response.text()
        console.warn('⚠️ Received HTML instead of PDF, opening print dialog...')
        
        const printWindow = window.open('', '_blank')
        if (printWindow) {
          printWindow.document.write(html)
          printWindow.document.close()
          setTimeout(() => printWindow.print(), 500)
        }
        
        setExportStatus('success')

      } else {
        // Handle JSON response (error)
        const result = await response.json()
        console.error('❌ PDF export error:', result)
        throw new Error(result.error || 'PDF export failed')
      }

    } catch (error) {
      console.error('❌ PDF export error:', error)
      setExportStatus('error')
    } finally {
      setExporting(false)
    }
  }

  const handleDownloadPDF = () => {
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `shamay-valuation-${data.sessionId}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">ייצוא דוח סופי</h2>
        <p className="text-gray-600 text-lg">יצירת דוח PDF מקצועי להערכת השווי</p>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - PDF Export */}
        <div className="bg-white border-2 border-blue-200 rounded-xl p-8 shadow-lg">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">ייצוא PDF</h3>
            <p className="text-sm text-gray-600">יצירת דוח PDF מקצועי עם כל המידע והנתונים</p>
          </div>
          
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className={`w-full px-6 py-4 rounded-lg font-semibold text-lg transition-all ${
              exporting
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg transform hover:scale-105'
            }`}
          >
            {exporting ? (
              <div className="flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                מייצא...
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <FileText className="h-5 w-5 mr-2" />
                יצור PDF
              </div>
            )}
          </button>

          {exportStatus === 'success' && (
            <div className="mt-6 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
              <div className="flex items-center justify-center text-green-800 mb-2">
                <CheckCircle className="h-6 w-6 mr-2" />
                <span className="text-base font-semibold">PDF נוצר בהצלחה!</span>
              </div>
              {pdfBlob && (
                <button
                  onClick={handleDownloadPDF}
                  className="w-full mt-3 px-4 py-2 text-sm text-blue-700 hover:text-blue-900 hover:underline font-medium"
                >
                  <Download className="h-4 w-4 inline mr-2" />
                  הורד PDF שוב
                </button>
              )}
            </div>
          )}

          {exportStatus === 'error' && (
            <div className="mt-6 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
              <p className="text-sm text-red-800 text-center font-medium">שגיאה ביצירת PDF</p>
            </div>
          )}

          {/* Word Conversion Option */}
          <div className="mt-6 pt-6 border-t-2 border-gray-200">
            <p className="text-sm text-gray-700 mb-3 text-center font-medium">רוצים להמיר את ה-PDF ל-Word?</p>
            <a
              href="https://www.adobe.com/il_he/acrobat/online/pdf-to-word.html"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-full px-4 py-3 rounded-lg font-medium bg-green-50 text-green-700 hover:bg-green-100 border-2 border-green-300 transition-colors"
            >
              <FileText className="h-4 w-4 ml-2" />
              המרת PDF ל-Word באמצעות Adobe
              <ExternalLink className="h-4 w-4 mr-2" />
            </a>
            <p className="text-xs text-gray-500 mt-2 text-center">
              כלי חינמי להמרת PDF למסמך Word ניתן לעריכה
            </p>
          </div>
        </div>

        {/* Right Column - Summary */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-8 shadow-lg">
          <h3 className="text-2xl font-bold text-blue-900 mb-6 text-center">סיכום הערכת השווי</h3>
          
          <div className="space-y-4">

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <p className="text-xs text-gray-500 mb-1">שטח</p>
                <p className="text-lg font-bold text-blue-900">
                  {data.area ? `${data.area} מ"ר` : 'לא מוגדר'}
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <p className="text-xs text-gray-500 mb-1">חדרים</p>
                <p className="text-lg font-bold text-blue-900">
                  {data.rooms || 'לא מוגדר'}
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-5 text-white">
              <p className="text-sm mb-2 opacity-90">שווי הנכס</p>
              <p className="text-3xl font-bold">
                ₪{data.comparableDataAnalysis?.estimatedValue ? data.comparableDataAnalysis?.estimatedValue.toLocaleString() : '0'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <p className="text-xs text-gray-500 mb-1">מחיר למ"ר</p>
                <p className="text-lg font-bold text-blue-900">
                  ₪{data.pricePerSqm ? data.pricePerSqm.toLocaleString() : '0'}
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <p className="text-xs text-gray-500 mb-1">תאריך הערכה</p>
                <p className="text-base font-semibold text-gray-900">
                  {data.valuationDate || 'לא מוגדר'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
