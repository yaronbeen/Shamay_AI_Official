'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Valuation {
  id: string
  title: string
  status: string
  addressFull: string
  block?: string
  parcel?: string
  subparcel?: string
  meta?: any
  createdAt: string
  updatedAt: string
  createdBy: {
    name: string
  }
}

export default function ValuationEditorPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const valuationId = params.id as string
  const [valuation, setValuation] = useState<Valuation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    addressFull: '',
    block: '',
    parcel: '',
    subparcel: '',
  })

  useEffect(() => {
    if (valuationId) {
      fetchValuation()
    }
  }, [valuationId])

  const fetchValuation = async () => {
    try {
      const response = await fetch(`/api/valuations/${valuationId}`)
      if (response.ok) {
        const data = await response.json()
        setValuation(data.valuation)
        setFormData({
          title: data.valuation.title,
          addressFull: data.valuation.addressFull,
          block: data.valuation.block || '',
          parcel: data.valuation.parcel || '',
          subparcel: data.valuation.subparcel || '',
        })
      }
    } catch (error) {
      console.error('Error fetching valuation:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/valuations/${valuationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        await fetchValuation() // Refresh data
      }
    } catch (error) {
      console.error('Error saving valuation:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center" dir="rtl">טוען...</div>
  }

  if (!valuation) {
    return <div className="min-h-screen flex items-center justify-center" dir="rtl">שומה לא נמצאה</div>
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{valuation.title}</h1>
            <p className="text-gray-600">{valuation.addressFull}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              חזור
            </Button>
            <Button 
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'שומר...' : 'שמור'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>פרטי השומה</CardTitle>
              <CardDescription>ערוך את פרטי השומה</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  כותרת השומה
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  כתובת מלאה
                </label>
                <Input
                  value={formData.addressFull}
                  onChange={(e) => setFormData(prev => ({ ...prev, addressFull: e.target.value }))}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    גוש
                  </label>
                  <Input
                    value={formData.block}
                    onChange={(e) => setFormData(prev => ({ ...prev, block: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    חלקה
                  </label>
                  <Input
                    value={formData.parcel}
                    onChange={(e) => setFormData(prev => ({ ...prev, parcel: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    תת
                  </label>
                  <Input
                    value={formData.subparcel}
                    onChange={(e) => setFormData(prev => ({ ...prev, subparcel: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>מידע נוסף</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600">
                <p><strong>נוצר על ידי:</strong> {valuation.createdBy.name}</p>
                <p><strong>תאריך יצירה:</strong> {new Date(valuation.createdAt).toLocaleDateString('he-IL')}</p>
                <p><strong>עודכן לאחרונה:</strong> {new Date(valuation.updatedAt).toLocaleDateString('he-IL')}</p>
                <p><strong>סטטוס:</strong> {valuation.status}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
