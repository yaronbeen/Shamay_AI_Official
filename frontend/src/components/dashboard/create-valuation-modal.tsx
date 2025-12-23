'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CreateValuationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const LAST_ADDRESS_KEY = 'shamay_last_address'

export function CreateValuationModal({ open, onOpenChange }: CreateValuationModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    addressFull: '',
    // גוש, חלקה ותת-חלקה ימולאו אוטומטית מנתוני הטאבו
  })
  const [isLoading, setIsLoading] = useState(false)

  // טען כתובת אחרונה כשהמודאל נפתח
  useEffect(() => {
    if (open) {
      const lastAddress = localStorage.getItem(LAST_ADDRESS_KEY)
      if (lastAddress) {
        setFormData(prev => ({ ...prev, addressFull: lastAddress }))
      }
    }
  }, [open])

  // נקה את הטופס כשהמודאל נסגר
  useEffect(() => {
    if (!open) {
      setFormData({ title: '', addressFull: '' })
    }
  }, [open])

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
        
        // שמור את הכתובת ב-localStorage לשימוש עתידי
        if (formData.addressFull) {
          localStorage.setItem(LAST_ADDRESS_KEY, formData.addressFull)
        }
        
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
            <Label htmlFor="addressFull">כתובת מלאה *</Label>
            <Input
              id="addressFull"
              value={formData.addressFull}
              onChange={(e) => setFormData(prev => ({ ...prev, addressFull: e.target.value }))}
              required
              placeholder="לדוגמה: רחוב הרצל 15, תל אביב"
              dir="rtl"
            />
            <p className="text-xs text-gray-500 mt-1 text-right">
              💡 גוש, חלקה ותת-חלקה ימולאו אוטומטית לאחר העלאת נסח הטאבו בשלב 2
            </p>
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