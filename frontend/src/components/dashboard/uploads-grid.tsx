'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Document {
  id: string
  fileName: string
  docType: string
  uploadedAt: string
  uploadedBy: {
    name: string
  }
  valuation?: {
    title: string
  }
}

interface Image {
  id: string
  fileName: string
  roomType: string
  uploadedAt: string
  uploadedBy: {
    name: string
  }
  valuation?: {
    title: string
  }
}

export function UploadsGrid() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [images, setImages] = useState<Image[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchUploads()
  }, [])

  const fetchUploads = async () => {
    try {
      const response = await fetch('/api/uploads')
      const data = await response.json()
      setDocuments(data.documents || [])
      setImages(data.images || [])
    } catch (error) {
      console.error('Error fetching uploads:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getDocTypeLabel = (docType: string) => {
    const labels = {
      TABU: 'נסח טאבו',
      CONDO: 'צו בית משותף',
      PERMIT: 'היתר בניה',
      PLANNING_INFO: 'מידע תכנוני',
      OTHER: 'אחר'
    }
    return labels[docType as keyof typeof labels] || docType
  }

  const getRoomTypeLabel = (roomType: string) => {
    const labels = {
      LIVING: 'סלון',
      KITCHEN: 'מטבח',
      BATH: 'שירותים',
      BEDROOM: 'חדר שינה',
      EXTERIOR: 'חוץ',
      OTHER: 'אחר'
    }
    return labels[roomType as keyof typeof labels] || roomType
  }

  if (isLoading) {
    return <div className="text-center py-8">טוען...</div>
  }

  return (
    <div className="space-y-8">
      {/* Documents Section */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">מסמכים</h3>
        {documents.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">אין מסמכים מועלים</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <Card key={doc.id}>
                <CardHeader>
                  <CardTitle className="text-sm">{doc.fileName}</CardTitle>
                  <CardDescription>
                    <Badge variant="outline">{getDocTypeLabel(doc.docType)}</Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>הועלה על ידי: {doc.uploadedBy.name}</p>
                    <p>תאריך: {new Date(doc.uploadedAt).toLocaleDateString('he-IL')}</p>
                    {doc.valuation && (
                      <p>שומה: {doc.valuation.title}</p>
                    )}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="outline">צפה</Button>
                    <Button size="sm" variant="outline">הורד</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Images Section */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">תמונות</h3>
        {images.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">אין תמונות מועלות</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((image) => (
              <Card key={image.id}>
                <CardHeader>
                  <CardTitle className="text-sm">{image.fileName}</CardTitle>
                  <CardDescription>
                    <Badge variant="outline">{getRoomTypeLabel(image.roomType)}</Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>הועלה על ידי: {image.uploadedBy.name}</p>
                    <p>תאריך: {new Date(image.uploadedAt).toLocaleDateString('he-IL')}</p>
                    {image.valuation && (
                      <p>שומה: {image.valuation.title}</p>
                    )}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="outline">צפה</Button>
                    <Button size="sm" variant="outline">הורד</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
