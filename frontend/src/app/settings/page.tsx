'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SettingsPage() {
  const { data: session } = useSession()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut({ callbackUrl: '/sign-in' })
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">הגדרות</h1>
          <p className="text-gray-600">נהל את הגדרות החשבון שלך</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>פרטי משתמש</CardTitle>
              <CardDescription>מידע אישי על החשבון שלך</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  שם מלא
                </label>
                <p className="text-gray-900">{session?.user?.name || 'לא מוגדר'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  כתובת אימייל
                </label>
                <p className="text-gray-900">{session?.user?.email}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>ארגון</CardTitle>
              <CardDescription>מידע על הארגון שלך</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  שם הארגון
                </label>
                <p className="text-gray-900">דוגמה - משרד שמאי מקרקעין</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  תפקיד
                </label>
                <p className="text-gray-900">{session?.user?.primaryRole || 'לא מוגדר'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>אבטחה</CardTitle>
              <CardDescription>נהל את אבטחת החשבון שלך</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="w-full"
              >
                {isSigningOut ? 'יוצא...' : 'התנתק'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>עזרה</CardTitle>
              <CardDescription>מידע נוסף ותמיכה</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full">
                מדריך שימוש
              </Button>
              <Button variant="outline" className="w-full">
                צור קשר
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
