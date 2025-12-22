'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Image as ImageIcon, Download, Eye, Building2, ChevronDown, ChevronRight } from 'lucide-react'

interface Upload {
  id: string
  name: string
  fileName: string
  type: string
  size: number
  url: string
  path: string
  mimeType: string
  uploadedAt: string
}

interface Valuation {
  sessionId: string
  valuationName: string
  address: string
  clientName: string
  shamayName: string
  referenceNumber: string
  uploads: Upload[]
  totalUploads: number
  totalSize: number
  createdAt: string
  updatedAt: string
}

interface ApiResponse {
  success: boolean
  summary: {
    totalValuations: number
    totalFiles: number
    totalSize: number
    totalSizeFormatted: string
  }
  valuations: Valuation[]
}

export function UploadsGrid() {
  const [valuations, setValuations] = useState<Valuation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [summary, setSummary] = useState<ApiResponse['summary'] | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchUploads()
  }, [])

  const fetchUploads = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/uploads')
      const data: ApiResponse = await response.json()
      
      if (data.success) {
        setValuations(data.valuations || [])
        setSummary(data.summary)
      }
    } catch (error) {
      console.error('Error fetching uploads:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Separate uploads into documents and images
  const documents = valuations.flatMap(valuation => 
    valuation.uploads
      .filter(upload => upload.type !== 'images' && !upload.type.startsWith('interior'))
      .map(upload => ({
        ...upload,
        valuationName: valuation.valuationName,
        address: valuation.address,
        sessionId: valuation.sessionId
      }))
  )

  const images = valuations.flatMap(valuation =>
    valuation.uploads
      .filter(upload => upload.type === 'images' || upload.type.startsWith('interior') || upload.mimeType?.startsWith('image/'))
      .map(upload => ({
        ...upload,
        valuationName: valuation.valuationName,
        address: valuation.address,
        sessionId: valuation.sessionId
      }))
  )

  const getDocTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      tabu: 'נסח טאבו',
      condo: 'צו בית משותף',
      permit: 'היתר בניה',
      planning: 'מידע תכנוני',
      land_registry: 'נסח רישום',
      building_permit: 'היתר בניה',
      gis_screenshot: 'צילום מפה',
      other: 'אחר'
    }
    return labels[type?.toLowerCase()] || type || 'מסמך'
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleView = (url: string) => {
    window.open(url, '_blank')
  }

  const handleDownload = (url: string, fileName: string) => {
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
  }

  const toggleRow = (sessionId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId)
      } else {
        newSet.add(sessionId)
      }
      return newSet
    })
  }

  if (isLoading) {
    return (
      <div className="text-center py-8" dir="rtl">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">טוען קבצים...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8" dir="rtl">
      {/* Summary Section */}
      {summary && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">{summary.totalValuations}</p>
                <p className="text-sm text-gray-600">שומות</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{summary.totalFiles}</p>
                <p className="text-sm text-gray-600">קבצים</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{summary.totalSizeFormatted}</p>
                <p className="text-sm text-gray-600">גודל כולל</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{valuations.length}</p>
                <p className="text-sm text-gray-600">פעיל</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Valuations Table */}
      <div className="space-y-2">
        {valuations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">אין שומות עם קבצים</p>
            </CardContent>
          </Card>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            {/* Table Header */}
            <div className="bg-gray-50 border-b grid grid-cols-12 gap-4 p-4 text-sm font-semibold text-gray-700">
              <div className="col-span-1"></div>
              <div className="col-span-4">שומה</div>
              <div className="col-span-2">כתובת</div>
              <div className="col-span-2">לקוח</div>
              <div className="col-span-1 text-center">קבצים</div>
              <div className="col-span-1 text-center">גודל</div>
              <div className="col-span-1 text-center">עודכן</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-gray-200">
              {valuations.map((valuation) => {
                const isExpanded = expandedRows.has(valuation.sessionId)
                return (
                  <div key={valuation.sessionId} className="bg-white">
                    {/* Row Header - Clickable */}
                    <div
                      className="grid grid-cols-12 gap-4 p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => toggleRow(valuation.sessionId)}
                    >
                      <div className="col-span-1 flex items-center justify-center">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <div className="col-span-4 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        <span className="font-medium text-gray-900 truncate">{valuation.valuationName}</span>
                      </div>
                      <div className="col-span-2 text-sm text-gray-600 truncate" title={valuation.address}>
                        {valuation.address}
                      </div>
                      <div className="col-span-2 text-sm text-gray-600 truncate" title={valuation.clientName}>
                        {valuation.clientName !== 'N/A' ? valuation.clientName : '-'}
                      </div>
                      <div className="col-span-1 text-center">
                        <Badge variant="secondary" className="text-xs">
                          {valuation.totalUploads}
                        </Badge>
                      </div>
                      <div className="col-span-1 text-center text-sm text-gray-600">
                        {formatFileSize(valuation.totalSize)}
                      </div>
                      <div className="col-span-1 text-center text-xs text-gray-500">
                        {new Date(valuation.updatedAt).toLocaleDateString('he-IL')}
                      </div>
                    </div>

                    {/* Expanded Content - Files Grid */}
                    {isExpanded && (
                      <div className="bg-gray-50 border-t border-gray-200 p-6">
                        {valuation.uploads.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                            <p>אין קבצים בשומה זו</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {valuation.uploads.map((upload) => (
                              <Card key={upload.id} className="border hover:shadow-md transition-shadow">
                                <CardHeader className="pb-3">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <CardTitle className="text-sm truncate" title={upload.name || upload.fileName}>
                                        {upload.name || upload.fileName}
                                      </CardTitle>
                                      <CardDescription className="mt-1">
                                        <Badge variant="outline" className="text-xs">
                                          {upload.type === 'images' || upload.mimeType?.startsWith('image/') ? (
                                            <><ImageIcon className="h-3 w-3 mr-1 inline" /> תמונה</>
                                          ) : (
                                            <><FileText className="h-3 w-3 mr-1 inline" /> {getDocTypeLabel(upload.type)}</>
                                          )}
                                        </Badge>
                                      </CardDescription>
                                    </div>
                                  </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                  <div className="space-y-2 text-xs text-gray-600 mb-4">
                                    <p>גודל: {formatFileSize(upload.size || 0)}</p>
                                    <p>תאריך: {new Date(upload.uploadedAt).toLocaleDateString('he-IL')}</p>
                                    {upload.mimeType && (
                                      <p className="text-gray-400 truncate text-[10px]">{upload.mimeType}</p>
                                    )}
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleView(upload.url)
                                      }}
                                      className="flex-1 text-xs"
                                    >
                                      <Eye className="h-3 w-3 ml-1" />
                                      צפה
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDownload(upload.url, upload.name || upload.fileName)
                                      }}
                                      className="flex-1 text-xs"
                                    >
                                      <Download className="h-3 w-3 ml-1" />
                                      הורד
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
