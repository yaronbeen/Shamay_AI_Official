'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, CheckCircle, FileText, Calculator, Eye, Download, Star, Users, Award, Shield, Database, Zap, TrendingUp, Globe, Lock, Sparkles, Target, BarChart3, Brain, Building2, MapPin } from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const [dbSetupLoading, setDbSetupLoading] = useState(false)
  const [dbSetupStatus, setDbSetupStatus] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [hasExistingSession, setHasExistingSession] = useState(false)

  useEffect(() => {
    setIsVisible(true)
    // Check if there's an existing session
    const existingSessionId = localStorage.getItem('shamay_session_id')
    setHasExistingSession(!!existingSessionId)
  }, [])

  const startWizard = async () => {
    try {
      console.log('🚀 Creating new session for wizard...')
      
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!response.ok) {
        throw new Error(`Session creation failed: ${response.status}`)
      }
      
      const { sessionId } = await response.json()
      console.log('✅ Session created:', sessionId)
      
      // Store sessionId in localStorage for persistence
      localStorage.setItem('shamay_session_id', sessionId)
      
      // Navigate to wizard with sessionId
      router.push(`/wizard?step=1&sessionId=${sessionId}`)
      
    } catch (error) {
      console.error('❌ Failed to create session:', error)
      // Fallback to wizard without sessionId
      router.push('/wizard?step=1')
    }
  }

  const continueWizard = () => {
    const existingSessionId = localStorage.getItem('shamay_session_id')
    if (existingSessionId) {
      router.push(`/wizard?step=1&sessionId=${existingSessionId}`)
    } else {
      startWizard()
    }
  }

  const clearSession = () => {
    localStorage.removeItem('shamay_session_id')
    console.log('🗑️ Session cleared')
  }

  const setupDatabase = async () => {
    try {
      setDbSetupLoading(true)
      setDbSetupStatus('מאתחל מסד נתונים...')
      
      const response = await fetch('/api/setup-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        setDbSetupStatus('מסד הנתונים הותקן בהצלחה!')
      } else {
        const error = await response.json()
        setDbSetupStatus(`שגיאה: ${error.details || 'Unknown error'}`)
      }
    } catch (error) {
      setDbSetupStatus(`שגיאה: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setDbSetupLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Brain className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  SHAMAY.AI
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="text-white/80 hover:text-white transition-colors">עברית</button>
            </div>
          </div>
        </div>
      </header>

      {/* Database Setup Section
      <div className="relative z-10 bg-gradient-to-r from-amber-500/20 to-orange-500/20 backdrop-blur-sm border border-amber-400/30 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Database className="h-5 w-5 text-amber-400 mr-2" />
              <span className="text-sm text-amber-100">
                מסד נתונים לא מוכן - יש לאתחל את מסד הנתונים לפני השימוש
              </span>
            </div>
            <button
              onClick={setupDatabase}
              disabled={dbSetupLoading}
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-lg text-sm hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {dbSetupLoading ? 'מאתחל...' : 'אתחל מסד נתונים'}
            </button>
          </div>
          {dbSetupStatus && (
            <div className="mt-2 text-sm text-amber-100">
              {dbSetupStatus}
            </div>
          )}
        </div>
      </div> */}

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8">
              <Sparkles className="h-4 w-4 text-yellow-400 mr-2" />
              <span className="text-sm text-white/90">פלטפורמת הערכת נכסים מתקדמת</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              הערכת שווי נכסים
              <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                בבינה מלאכותית
              </span>
            </h1>
            
            <p className="text-xl text-white/80 mb-12 max-w-4xl mx-auto leading-relaxed">
              פלטפורמה מתקדמת להערכת שווי נכסים עם עיבוד מסמכים אוטומטי, ניתוח נתונים חכם ודוחות מקצועיים
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {hasExistingSession ? (
                <>
                  <button
                    onClick={continueWizard}
                    className="group bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition-all duration-300 flex items-center shadow-2xl hover:shadow-green-500/25 transform hover:scale-105"
                  >
                    המשך הערכה קיימת
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                  
                  <button
                    onClick={() => {
                      clearSession()
                      setHasExistingSession(false)
                      startWizard()
                    }}
                    className="group bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg text-base font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 flex items-center shadow-xl hover:shadow-purple-500/25 transform hover:scale-105"
                  >
                    התחל הערכה חדשה
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </>
              ) : (
                <button
                  onClick={startWizard}
                  className="group bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 flex items-center shadow-2xl hover:shadow-purple-500/25 transform hover:scale-105"
                >
                  התחל הערכת שווי
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </button>
              )}
              
              <button className="text-white/80 hover:text-white transition-colors flex items-center">
                <Eye className="mr-2 h-4 w-4" />
                צפה בדוגמה
              </button>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className={`mt-20 grid grid-cols-1 md:grid-cols-4 gap-8 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-2">99%</div>
            <div className="text-white/70">דיוק בחישובים</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-2">5 דקות</div>
            <div className="text-white/70">זמן עיבוד ממוצע</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-2">1000+</div>
            <div className="text-white/70">הערכות שבוצעו</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-2">24/7</div>
            <div className="text-white/70">זמינות מערכת</div>
          </div>
        </div>

        {/* Features Grid */}
        <div className={`mt-32 grid grid-cols-1 md:grid-cols-3 gap-8 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="group bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-2xl hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">עיבוד מסמכים חכם</h3>
            <p className="text-white/70 leading-relaxed">עיבוד אוטומטי של מסמכי נכס, רישום מקרקעין, היתרי בנייה ועוד עם טכנולוגיית OCR מתקדמת</p>
          </div>

          <div className="group bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-2xl hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <BarChart3 className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">חישובים מדויקים</h3>
            <p className="text-white/70 leading-relaxed">אלגוריתמים מתקדמים לחישוב שווי נכסים עם נתונים עדכניים וניתוח השוואתי חכם</p>
          </div>

          <div className="group bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-2xl hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Eye className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">תצוגה מקצועית</h3>
            <p className="text-white/70 leading-relaxed">דוחות מקצועיים עם תצוגה ברורה וקלה להבנה, כולל גרפים ותרשימים מתקדמים</p>
          </div>
        </div>

        {/* Additional Features */}
        <div className={`mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="flex items-center space-x-3 bg-white/5 backdrop-blur-sm border border-white/10 p-4 rounded-xl">
            <Zap className="h-6 w-6 text-yellow-400" />
            <span className="text-white/90">עיבוד מהיר</span>
          </div>
          <div className="flex items-center space-x-3 bg-white/5 backdrop-blur-sm border border-white/10 p-4 rounded-xl">
            <Shield className="h-6 w-6 text-green-400" />
            <span className="text-white/90">אבטחה מתקדמת</span>
          </div>
          <div className="flex items-center space-x-3 bg-white/5 backdrop-blur-sm border border-white/10 p-4 rounded-xl">
            <TrendingUp className="h-6 w-6 text-blue-400" />
            <span className="text-white/90">ניתוח נתונים</span>
          </div>
          <div className="flex items-center space-x-3 bg-white/5 backdrop-blur-sm border border-white/10 p-4 rounded-xl">
            <Globe className="h-6 w-6 text-purple-400" />
            <span className="text-white/90">גישה אונליין</span>
          </div>
        </div>
      </main>
    </div>
  )
}
