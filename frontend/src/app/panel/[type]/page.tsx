'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Step3FieldsPanel } from '@/components/steps/Step3FieldsPanel'
import { Step3PDFPanel, PDFFile } from '@/components/steps/Step3PDFPanel'
import { Step5ValuationPanel } from '@/components/steps/Step5ValuationPanel'
import { ValuationData } from '@/components/ValuationWizard'
import { Loader2, FileText, Download, CheckCircle, ExternalLink } from 'lucide-react'

interface PanelPageProps {
  params: { type: string }
}

export default function PanelPage({ params }: PanelPageProps) {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId')
  const [data, setData] = useState<ValuationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pdfFiles, setPdfFiles] = useState<PDFFile[]>([])
  const [currentFileIndex, setCurrentFileIndex] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)

  useEffect(() => {
    const loadSessionData = async () => {
      if (!sessionId) {
        setError('No session ID provided')
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/session/${sessionId}`)
        if (!response.ok) {
          throw new Error('Failed to load session')
        }
        const result = await response.json()
        if (result.data) {
          setData(result.data as ValuationData)
        } else {
          throw new Error('No data in session')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load session')
      } finally {
        setLoading(false)
      }
    }

    loadSessionData()
  }, [sessionId])

  const updateData = (updates: Partial<ValuationData>) => {
    if (data) {
      setData({ ...data, ...updates })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">טוען נתונים...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-2">שגיאה בטעינת הנתונים</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  const renderPanel = () => {
    switch (params.type) {
      case 'step3-fields':
        return (
          <div className="p-6 h-screen overflow-y-auto" dir="rtl">
            <Step3FieldsPanel
              data={data}
              updateData={updateData}
              sessionId={sessionId || undefined}
              extractedData={data.extractedData || {}}
              onFieldSave={() => {}}
              provenanceData={{}}
            />
          </div>
        )
      case 'step5-valuation':
        return (
          <div className="p-6 h-screen overflow-y-auto" dir="rtl">
            <Step5ValuationPanel
              data={data}
              updateData={updateData}
              sessionId={sessionId || undefined}
            />
          </div>
        )
      default:
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <p className="text-gray-600">Unknown panel type: {params.type}</p>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {renderPanel()}
    </div>
  )
}
