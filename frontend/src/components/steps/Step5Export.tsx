'use client'

import { useState } from 'react'
import { Download, FileText, CheckCircle, Loader2 } from 'lucide-react'
import { ValuationData } from '../ValuationWizard'

interface Step5ExportProps {
  data: ValuationData
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

      // Check if response is PDF
      const contentType = response.headers.get('content-type')
      console.log('📄 Response content type:', contentType)

      if (contentType === 'application/pdf') {
        // Handle PDF response
        const pdfBlob = await response.blob()
        console.log('✅ PDF blob created:', pdfBlob.size, 'bytes')
        
        setPdfBlob(pdfBlob)
        setExportStatus('success')

        // Create download link and trigger download
        const url = URL.createObjectURL(pdfBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `shamay-valuation-${data.sessionId}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

      } else {
        // Handle JSON response (fallback)
        const result = await response.json()
        console.log('✅ PDF export successful:', result)

        if (result.pdfUrl) {
          window.open(result.pdfUrl, '_blank')
        }
        setExportStatus('success')
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
      <div>
        <h2 className="text-2xl font-bold mb-2">ייצוא דוח סופי</h2>
        <p className="text-gray-600">יצירת דוח PDF מקצועי להערכת השווי</p>
      </div>

      {/* Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PDF Export */}
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-6">
          <div className="text-center">
            <FileText className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">ייצוא PDF</h3>
            <p className="text-sm text-gray-600 mb-4">יצירת דוח PDF מקצועי</p>
            
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className={`w-full px-4 py-2 rounded-lg font-medium ${
                exporting
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {exporting ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  מייצא...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <FileText className="h-4 w-4 mr-2" />
                  יצור PDF
                </div>
              )}
            </button>

            {exportStatus === 'success' && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center text-green-800">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  <span className="text-sm">PDF נוצר בהצלחה!</span>
                </div>
                {pdfBlob && (
                  <button
                    onClick={handleDownloadPDF}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                  >
                    <Download className="h-3 w-3 inline mr-1" />
                    הורד PDF שוב
                  </button>
                )}
              </div>
            )}

            {exportStatus === 'error' && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">שגיאה ביצירת PDF</p>
              </div>
            )}
          </div>
        </div>

        {/* Word Export (Mock) */}
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-6">
          <div className="text-center">
            <FileText className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">ייצוא Word</h3>
            <p className="text-sm text-gray-600 mb-4">יצירת מסמך Word (בפיתוח)</p>
            
            <button
              disabled
              className="w-full px-4 py-2 rounded-lg font-medium bg-gray-400 text-white cursor-not-allowed"
            >
              <div className="flex items-center justify-center">
                <FileText className="h-4 w-4 mr-2" />
                בקרוב
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">סיכום הערכת השווי</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-blue-800">
              <strong>כתובת:</strong> {data.fullAddress || 'לא מוגדר'}
            </p>
            <p className="text-sm text-blue-800">
              <strong>שטח:</strong> {data.area ? `${data.area} מ"ר` : 'לא מוגדר'}
            </p>
            <p className="text-sm text-blue-800">
              <strong>חדרים:</strong> {data.rooms || 'לא מוגדר'}
            </p>
          </div>
          <div>
            <p className="text-sm text-blue-800">
              <strong>שווי נכס:</strong> ₪{data.finalValuation ? data.finalValuation.toLocaleString() : '0'}
            </p>
            <p className="text-sm text-blue-800">
              <strong>מחיר למ"ר:</strong> ₪{data.pricePerSqm ? data.pricePerSqm.toLocaleString() : '0'}
            </p>
            <p className="text-sm text-blue-800">
              <strong>תאריך:</strong> {data.valuationDate}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
