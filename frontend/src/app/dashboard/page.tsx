'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ValuationsTable } from '@/components/dashboard/valuations-table'
import { UploadsGrid } from '@/components/dashboard/uploads-grid'
import { AssetsList } from '@/components/dashboard/assets-list'
import { CreateValuationModal } from '@/components/dashboard/create-valuation-modal'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('valuations')
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Handle authentication redirect in useEffect to avoid render-phase updates
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/sign-in')
    }
  }, [status, router])

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center" dir="rtl">טוען...</div>
  }

  if (status === 'unauthenticated') {
    return null
  }

  // Handle case where user doesn't have organization yet
  if (session?.user && !session.user.primaryOrganizationId) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" dir="rtl">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">אין ארגון קשור לחשבון</h2>
          <p className="text-gray-600 mb-6">נראה שאין ארגון קשור לחשבון שלך. אנא צור קשר עם מנהל המערכת.</p>
          <button 
            onClick={() => router.push('/sign-up')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            צור ארגון חדש
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" dir="rtl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">לוח בקרה</h1>
          <p className="text-gray-600">ברוך הבא, {session?.user?.name}</p>
        </div>
        <Button 
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          + שומה חדשה
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="valuations">השומות שלי</TabsTrigger>
          <TabsTrigger value="uploads">העלאות</TabsTrigger>
          <TabsTrigger value="assets">נכסים שנוצרו</TabsTrigger>
        </TabsList>
        
        <TabsContent value="valuations" className="mt-6">
          <ValuationsTable />
        </TabsContent>
        
        <TabsContent value="uploads" className="mt-6">
          <UploadsGrid />
        </TabsContent>
        
        <TabsContent value="assets" className="mt-6">
          <AssetsList />
        </TabsContent>
      </Tabs>

      <CreateValuationModal 
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />
    </div>
  )
}
