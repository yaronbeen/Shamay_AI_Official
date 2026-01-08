'use client'

import { Building2, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function AssetsList() {
  return (
    <div className="text-center py-16 bg-white shadow rounded-lg border-dashed border-2 border-gray-200" dir="rtl">
      <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Building2 className="h-8 w-8 text-purple-600" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">אין נכסים עדיין</h3>
      <p className="text-gray-500 mb-6 max-w-md mx-auto">
        נכסים שתיצור במהלך עבודתך יופיעו כאן. התחל ביצירת שומה חדשה כדי להוסיף נכס.
      </p>
      <Button onClick={() => window.location.href = '/wizard'} className="gap-2">
        <FileText className="h-4 w-4" />
        צור שומה חדשה
      </Button>
      <p className="text-xs text-gray-400 mt-4">נכסים נוצרים אוטומטית כשאתה מסיים שומה</p>
    </div>
  )
}