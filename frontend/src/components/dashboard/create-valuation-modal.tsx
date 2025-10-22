'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CreateValuationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateValuationModal({ open, onOpenChange }: CreateValuationModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    addressFull: '',
    block: '',
    parcel: '',
    subparcel: '',
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      // First create a new session for the wizard
      const sessionResponse = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      
      if (!sessionResponse.ok) {
        throw new Error('Failed to create session')
      }
      
      const { sessionId } = await sessionResponse.json()
      
      // Create the valuation with the session ID
      const response = await fetch('/api/valuations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          sessionId: sessionId
        })
      })
      
      if (response.ok) {
        const { valuation } = await response.json()
        onOpenChange(false)
        // Navigate to the wizard with the session ID
        window.location.href = `/wizard?sessionId=${sessionId}`
      }
    } catch (error) {
      console.error('Error creating valuation:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>שומה חדשה</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">כותרת השומה</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="addressFull">כתובת מלאה</Label>
            <Input
              id="addressFull"
              value={formData.addressFull}
              onChange={(e) => setFormData(prev => ({ ...prev, addressFull: e.target.value }))}
              required
            />
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label htmlFor="block">גוש</Label>
              <Input
                id="block"
                value={formData.block}
                onChange={(e) => setFormData(prev => ({ ...prev, block: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="parcel">חלקה</Label>
              <Input
                id="parcel"
                value={formData.parcel}
                onChange={(e) => setFormData(prev => ({ ...prev, parcel: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="subparcel">תת</Label>
              <Input
                id="subparcel"
                value={formData.subparcel}
                onChange={(e) => setFormData(prev => ({ ...prev, subparcel: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ביטול
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'יוצר...' : 'צור שומה'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}