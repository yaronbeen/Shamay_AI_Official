'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState('password')

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')
    
    try {
      const result = await signIn('email', { 
        email, 
        redirect: false,
        callbackUrl: '/dashboard'
      })
      
      if (result?.error) {
        setMessage('שגיאה בהתחברות. נסה שוב.')
      } else {
        setMessage('בדוק את האימייל שלך לקבלת קישור התחברות')
      }
    } catch (error) {
      console.error('Sign in error:', error)
      setMessage('שגיאה בהתחברות. נסה שוב.')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')
    
    try {
      const result = await signIn('credentials', { 
        email, 
        password,
        redirect: false,
        callbackUrl: '/dashboard'
      })
      
      if (result?.error) {
        setMessage('שגיאה בהתחברות. בדוק את הפרטים ונסה שוב.')
      } else {
        setMessage('התחברת בהצלחה! מעביר לדף הבקרה...')
        window.location.href = '/dashboard'
      }
    } catch (error) {
      console.error('Sign in error:', error)
      setMessage('שגיאה בהתחברות. נסה שוב.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">התחברות</CardTitle>
          <CardDescription className="text-center">
            בחר את שיטת ההתחברות המועדפת עליך
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="password">אימייל וסיסמה</TabsTrigger>
              <TabsTrigger value="email">קישור אימייל</TabsTrigger>
            </TabsList>
            
            <TabsContent value="password" className="mt-6">
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <Input
                  type="email"
                  placeholder="כתובת אימייל"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Input
                  type="password"
                  placeholder="סיסמה"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {message && (
                  <p className={`text-sm ${message.includes('שגיאה') ? 'text-red-600' : 'text-green-600'}`}>
                    {message}
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'מתחבר...' : 'התחבר'}
                </Button>
                
                {/* Development Admin Access */}
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs text-yellow-800 mb-2">🔧 גישה למפתחים:</p>
                  <p className="text-xs text-yellow-700">admin@shamay.ai / admin123</p>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="email" className="mt-6">
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <Input
                  type="email"
                  placeholder="כתובת אימייל"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                {message && (
                  <p className={`text-sm ${message.includes('שגיאה') ? 'text-red-600' : 'text-green-600'}`}>
                    {message}
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'שולח...' : 'שלח קישור התחברות'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
