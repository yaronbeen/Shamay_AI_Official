'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Upload, X, Loader2, CheckCircle, ArrowRight } from 'lucide-react'
import { CompanySettings } from '@/lib/document-template'

interface OrganizationSettings {
  id: string
  name: string
  logo_url?: string
  settings?: CompanySettings
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [orgSettings, setOrgSettings] = useState<OrganizationSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<{ company: boolean; footer: boolean; signature: boolean }>({ company: false, footer: false, signature: false })
  const [formData, setFormData] = useState<Partial<CompanySettings>>({})
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Load user settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!session?.user?.id) return
      
      try {
        setLoading(true)
        const response = await fetch(`/api/user/settings`)
        if (response.ok) {
          const settings = await response.json()
          // Store settings in state for form
          setFormData({
            companyName: settings.companyName,
            companySlogan: settings.companySlogan,
            companyAddress: settings.companyAddress,
            companyPhone: settings.companyPhone,
            companyEmail: settings.companyEmail,
            companyWebsite: settings.companyWebsite,
            associationMembership: settings.associationMembership,
            services: settings.services,
            signature: settings.signature
          })
          // Store in orgSettings format for displaying logos
          setOrgSettings({
            id: session.user.id || '',
            name: session.user.name || '',
            logo_url: settings.companyLogo,
            settings: {
              footerLogo: settings.footerLogo,
              signature: settings.signature,
              ...settings
            }
          })
        }
      } catch (error) {
        console.error('Error loading settings:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [session?.user?.id])

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

  const handleFileUpload = async (type: 'company' | 'footer' | 'signature', file: File) => {
    if (!session?.user?.id) return

    try {
      setUploading({ ...uploading, [type]: true })
      setSuccessMessage(null)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)

      const response = await fetch(`/api/user/logo`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to upload logo')
      }

      const result = await response.json()
      
      // Reload settings
      const settingsResponse = await fetch(`/api/user/settings`)
      if (settingsResponse.ok) {
        const updatedSettings = await settingsResponse.json()
        // Update form data
        setFormData({
          companyName: updatedSettings.companyName,
          companySlogan: updatedSettings.companySlogan,
          companyAddress: updatedSettings.companyAddress,
          companyPhone: updatedSettings.companyPhone,
          companyEmail: updatedSettings.companyEmail,
          companyWebsite: updatedSettings.companyWebsite,
          associationMembership: updatedSettings.associationMembership,
          services: updatedSettings.services,
          signature: updatedSettings.signature
        })
        // Update orgSettings for display
        setOrgSettings({
          id: session.user.id || '',
          name: session.user.name || '',
          logo_url: updatedSettings.companyLogo,
          settings: {
            footerLogo: updatedSettings.footerLogo,
            signature: updatedSettings.signature,
            ...updatedSettings
          }
        })
      }

      const typeLabels: Record<string, string> = {
        company: 'לוגו חברה',
        footer: 'לוגו תחתית',
        signature: 'חתימת שמאי'
      }
      setSuccessMessage(`${typeLabels[type] || type} הועלה בהצלחה!`)
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error('Error uploading logo:', error)
      alert('שגיאה בהעלאת הלוגו. נסה שוב.')
    } finally {
      setUploading({ ...uploading, [type]: false })
    }
  }

  const handleSaveSettings = async () => {
    if (!session?.user?.id) return

    try {
      setSaving(true)
      setSuccessMessage(null)

      const response = await fetch(`/api/user/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: formData
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      // Reload settings
      const settingsResponse = await fetch(`/api/user/settings`)
      if (settingsResponse.ok) {
        const updatedSettings = await settingsResponse.json()
        // Update form data
        setFormData({
          companyName: updatedSettings.companyName,
          companySlogan: updatedSettings.companySlogan,
          companyAddress: updatedSettings.companyAddress,
          companyPhone: updatedSettings.companyPhone,
          companyEmail: updatedSettings.companyEmail,
          companyWebsite: updatedSettings.companyWebsite,
          associationMembership: updatedSettings.associationMembership,
          services: updatedSettings.services,
          signature: updatedSettings.signature
        })
        // Update orgSettings for display
        setOrgSettings({
          id: session.user.id || '',
          name: session.user.name || '',
          logo_url: updatedSettings.companyLogo,
          settings: {
            footerLogo: updatedSettings.footerLogo,
            signature: updatedSettings.signature,
            ...updatedSettings
          }
        })
      }

      setSuccessMessage('ההגדרות נשמרו בהצלחה!')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('שגיאה בשמירת ההגדרות. נסה שוב.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">הגדרות</h1>
              <p className="text-gray-600">נהל את הגדרות הארגון והחשבון שלך</p>
            </div>
            <Button
              onClick={() => router.push('/dashboard')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ArrowRight className="h-4 w-4" />
              חזרה לדף הבקרה
            </Button>
          </div>
        </div>

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border-2 border-green-300 rounded-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-green-800 font-medium">{successMessage}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Info */}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  תפקיד
                </label>
                <p className="text-gray-900">{session?.user?.primaryRole || 'לא מוגדר'}</p>
              </div>
            </CardContent>
          </Card>

          {/* User Info */}
          <Card>
            <CardHeader>
              <CardTitle>מידע משתמש</CardTitle>
              <CardDescription>פרטים בסיסיים על החשבון</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  שם המשתמש
                </label>
                <p className="text-gray-900">{session?.user?.name || 'לא מוגדר'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  דוא&quot;ל
                </label>
                <p className="text-gray-900">{session?.user?.email || 'לא מוגדר'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Logo Uploads */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>לוגואים</CardTitle>
              <CardDescription>העלה לוגואים שיופיעו בדוחות הייצוא</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Company Logo */}
              <div className="space-y-3">
                <Label>לוגו חברה (מופיע בראש העמוד הראשון)</Label>
                <div className="flex items-center gap-4">
                  {orgSettings?.logo_url && (
                    <div className="relative">
                      <img 
                        src={orgSettings.logo_url} 
                        alt="Company Logo" 
                        className="h-20 w-auto object-contain border border-gray-300 rounded"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFileUpload('company', file)
                      }}
                      disabled={uploading.company}
                      className="cursor-pointer"
                    />
                  </div>
                  {uploading.company && (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  )}
                </div>
              </div>

              {/* Footer Logo */}
              <div className="space-y-3">
                <Label>לוגו תחתית (מופיע בתחתית העמוד הראשון)</Label>
                <div className="flex items-center gap-4">
                  {orgSettings?.settings?.footerLogo && (
                    <div className="relative">
                      <img 
                        src={orgSettings.settings.footerLogo} 
                        alt="Footer Logo" 
                        className="h-20 w-auto object-contain border border-gray-300 rounded"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFileUpload('footer', file)
                      }}
                      disabled={uploading.footer}
                      className="cursor-pointer"
                    />
                  </div>
                  {uploading.footer && (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  )}
                </div>
              </div>

              {/* Signature */}
              <div className="space-y-3">
                <Label>חתימת שמאי (מופיע בסוף הדוח)</Label>
                <div className="flex items-center gap-4">
                  {orgSettings?.settings?.signature && (
                    <div className="relative">
                      <img 
                        src={orgSettings.settings.signature} 
                        alt="Signature" 
                        className="h-20 w-auto object-contain border border-gray-300 rounded"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFileUpload('signature', file)
                      }}
                      disabled={uploading.signature}
                      className="cursor-pointer"
                    />
                  </div>
                  {uploading.signature && (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company Settings */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>הגדרות חברה</CardTitle>
              <CardDescription>מידע שיופיע בדוחות הייצוא</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="companyName">שם החברה</Label>
                <Input
                  id="companyName"
                  value={formData.companyName || ''}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="לדוגמה: MMBL. - משרד שמאי מקרקעין"
                />
              </div>

              <div>
                <Label htmlFor="companySlogan">סלוגן</Label>
                <Textarea
                  id="companySlogan"
                  value={formData.companySlogan || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, companySlogan: e.target.value })}
                  placeholder="הכנס את הסלוגן של החברה (ניתן לכתוב כמה שורות)"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="companyEmail">דוא&quot;ל</Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    value={formData.companyEmail || ''}
                    onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
                    placeholder="info@company.com"
                  />
                </div>
                <div>
                  <Label htmlFor="companyPhone">טלפון</Label>
                  <Input
                    id="companyPhone"
                    type="tel"
                    value={formData.companyPhone || ''}
                    onChange={(e) => setFormData({ ...formData, companyPhone: e.target.value })}
                    placeholder="03-1234567"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="companyAddress">כתובת</Label>
                <Input
                  id="companyAddress"
                  value={formData.companyAddress || ''}
                  onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
                  placeholder="רחוב מספר, עיר"
                />
              </div>

              <div>
                <Label htmlFor="companyWebsite">אתר אינטרנט</Label>
                <Input
                  id="companyWebsite"
                  type="url"
                  value={formData.companyWebsite || ''}
                  onChange={(e) => setFormData({ ...formData, companyWebsite: e.target.value })}
                  placeholder="https://www.company.com"
                />
              </div>

              <div>
                <Label htmlFor="associationMembership">חברות בלשכה</Label>
                <Input
                  id="associationMembership"
                  value={formData.associationMembership || ''}
                  onChange={(e) => setFormData({ ...formData, associationMembership: e.target.value })}
                  placeholder="חבר בלשכת שמאי המקרקעין בישראל"
                />
              </div>

              <div>
                <Label htmlFor="services">שירותים (מופרדים ב- - )</Label>
                <Input
                  id="services"
                  value={Array.isArray(formData.services) ? formData.services.join(' - ') : (formData.services || '')}
                  onChange={(e) => {
                    const services = e.target.value.split(' - ').filter(s => s.trim())
                    setFormData({ ...formData, services })
                  }}
                  placeholder="שמאות מקרקעין - התחדשות עירונית - דוחות אפס"
                />
              </div>

              <Button 
                onClick={handleSaveSettings} 
                disabled={saving}
                className="w-full"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    שומר...
                  </>
                ) : (
                  'שמור הגדרות'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Security */}
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
        </div>
      </div>
    </div>
  )
}
