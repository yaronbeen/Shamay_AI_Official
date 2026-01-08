'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function SignUpPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    organizationName: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState('password')

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')
    
    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.organizationName,
          user: {
            name: formData.name,
            email: formData.email
          }
        })
      })
      
      if (response.ok) {
        setMessage('הארגון נוצר בהצלחה! בדוק את האימייל שלך לקבלת קישור התחברות')
        setTimeout(() => {
          router.push('/sign-in')
        }, 2000)
      } else {
        const error = await response.json()
        setMessage(error.error || 'שגיאה ביצירת הארגון')
      }
    } catch (error) {
      console.error('Sign up error:', error)
      setMessage('שגיאה ביצירת הארגון. נסה שוב.')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')
    
    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.organizationName,
          user: {
            name: formData.name,
            email: formData.email,
            password: formData.password
          }
        })
      })
      
      if (response.ok) {
        setMessage('הארגון נוצר בהצלחה! עכשיו תוכל להתחבר עם האימייל והסיסמה')
        setTimeout(() => {
          router.push('/sign-in')
        }, 2000)
      } else {
        const error = await response.json()
        setMessage(error.error || 'שגיאה ביצירת הארגון')
      }
    } catch (error) {
      console.error('Sign up error:', error)
      setMessage('שגיאה ביצירת הארגון. נסה שוב.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">הרשמה</CardTitle>
          <CardDescription className="text-center">
            צור ארגון חדש והתחל להשתמש במערכת
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="password">אימייל וסיסמה</TabsTrigger>
              <TabsTrigger value="email">קישור אימייל</TabsTrigger>
            </TabsList>
            
            <TabsContent value="password" className="mt-6">
              <form onSubmit={handlePasswordSignUp} className="space-y-4">
                <Input
                  type="text"
                  placeholder="שם מלא"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
                <Input
                  type="email"
                  placeholder="כתובת אימייל"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
                <Input
                  type="password"
                  placeholder="סיסמה"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  required
                />
                <Input
                  type="text"
                  placeholder="שם הארגון"
                  value={formData.organizationName}
                  onChange={(e) => setFormData(prev => ({ ...prev, organizationName: e.target.value }))}
                  required
                />
                {message && (
                  <p className={`text-sm ${message.includes('שגיאה') ? 'text-red-600' : 'text-green-600'}`}>
                    {message}
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'יוצר...' : 'צור ארגון'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="email" className="mt-6">
              <form onSubmit={handleEmailSignUp} className="space-y-4">
                <Input
                  type="text"
                  placeholder="שם מלא"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
                <Input
                  type="email"
                  placeholder="כתובת אימייל"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
                <Input
                  type="text"
                  placeholder="שם הארגון"
                  value={formData.organizationName}
                  onChange={(e) => setFormData(prev => ({ ...prev, organizationName: e.target.value }))}
                  required
                />
                {message && (
                  <p className={`text-sm ${message.includes('שגיאה') ? 'text-red-600' : 'text-green-600'}`}>
                    {message}
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'יוצר...' : 'צור ארגון'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
