'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowRight, CheckCircle, FileText, Calculator, Eye, Download, Star, Users, Award, Shield, Database, Zap, TrendingUp, Globe, Lock, Sparkles, Target, BarChart3, Brain, Building2, MapPin } from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const handleGetStarted = () => {
    router.push('/sign-up')
  }

  const handleSignIn = () => {
    router.push('/sign-in')
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">טוען...</h1>
          <p className="text-gray-600">מעביר אותך לדף המתאים</p>
        </div>
      </div>
    )
  }

  if (session) {
    router.push('/dashboard')
    return null
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
              <button 
                onClick={handleSignIn}
                className="text-white/80 hover:text-white transition-colors"
              >
                התחברות
              </button>
              <button 
                onClick={handleGetStarted}
                className="bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors"
              >
                התחל עכשיו
              </button>
            </div>
          </div>
        </div>
      </header>

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
              <button
                onClick={handleGetStarted}
                className="group bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 flex items-center shadow-2xl hover:shadow-purple-500/25 transform hover:scale-105"
              >
                התחל הערכת שווי
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
              
              <button 
                onClick={handleSignIn}
                className="text-white/80 hover:text-white transition-colors flex items-center"
              >
                <Eye className="mr-2 h-4 w-4" />
                התחבר לחשבון קיים
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
