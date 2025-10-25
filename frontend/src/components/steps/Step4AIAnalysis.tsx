'use client'

import React, { useState, useEffect } from 'react'
import { 
  Brain, 
  MapPin, 
  BarChart3, 
  Image, 
  Upload, 
  Eye, 
  Edit3, 
  CheckCircle, 
  AlertTriangle, 
  Loader2,
  ChevronLeft,
  ChevronRight,
  Download,
  Map,
  Flag
} from 'lucide-react'
import { ValuationData } from '../ValuationWizard'
import GISMapViewer from '../ui/GISMapViewer'
import GarmushkaMeasurementViewer from '../ui/GarmushkaMeasurementViewer'

interface Step4AIAnalysisProps {
  data: ValuationData
  updateData: (updates: Partial<ValuationData>) => void
  onValidationChange: (isValid: boolean) => void
  sessionId?: string
}

interface AIAnalysisSection {
  id: string
  title: string
  description: string
  icon: React.ComponentType<any>
  active: boolean
}

export function Step4AIAnalysis({ data, updateData, onValidationChange, sessionId }: Step4AIAnalysisProps) {
  const [activeSection, setActiveSection] = useState<string>('market_analysis')
  const [isProcessing, setIsProcessing] = useState(false)
  const [analysisResults, setAnalysisResults] = useState<any>({})
  const [gisMapFile, setGisMapFile] = useState<File | null>(null)
  const [gisMapPreview, setGisMapPreview] = useState<string | null>(null)
  
  // Step 4 is optional - always allow proceeding
  useEffect(() => {
    onValidationChange(true)
  }, [onValidationChange])
  
  // Debug: Log uploads data when Step4 mounts or data changes
  useEffect(() => {
    console.log('🔍 Step4 - data.uploads:', data.uploads)
    if (data.uploads && Array.isArray(data.uploads)) {
      data.uploads.forEach((upload: any, index: number) => {
        console.log(`🔍 Step4 - Upload ${index}:`, {
          id: upload.id,
          type: upload.type,
          name: upload.name,
          status: upload.status,
          hasStatus: 'status' in upload
        })
      })
    }
  }, [data.uploads])

  const sections: AIAnalysisSection[] = [
    {
      id: 'market_analysis',
      title: 'ניתוח נתוני שוק',
      description: 'העלה נתוני מכירות להשוואה וניתוח שוק מבוסס AI',
      icon: BarChart3,
      active: true
    },
    {
      id: 'gis_mapping',
      title: 'מפה GIS',
      description: 'העלה מפה או הורד מפה ממשרד הממשלה לשרטוט על הנכס',
      icon: Map,
      active: true
    },
    {
      id: 'garmushka_measurements',
      title: 'מדידות גרמושקה',
      description: 'העלה תכנית קומה לביצוע מדידות מרחק ושטח אינטראקטיביות',
      icon: Flag,
      active: true
    }
  ]

  // Load analysis results from session
  useEffect(() => {
    const loadAnalysisResults = async () => {
      if (sessionId) {
        try {
          const response = await fetch(`/api/session/${sessionId}`)
          if (response.ok) {
            const sessionData = await response.json()
            if (sessionData.analysisResults) {
              setAnalysisResults(sessionData.analysisResults)
            }
          }
        } catch (error) {
          console.error('Error loading analysis results:', error)
        }
      }
    }
    
    loadAnalysisResults()
  }, [sessionId])

  const handleSectionToggle = (sectionId: string) => {
    setActiveSection(sectionId)
  }

  const handleImageAnalysis = async () => {
    setIsProcessing(true)
    try {
      // Call image analysis API
      const response = await fetch(`/api/session/${sessionId}/image-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        const result = await response.json()
        setAnalysisResults((prev: any) => ({
          ...prev,
          visualMapping: result
        }))
        
        // Save to session
        await saveAnalysisResults({
          ...analysisResults,
          visualMapping: result
        })
      }
    } catch (error) {
      console.error('Error analyzing images:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleMarketAnalysis = async () => {
    setIsProcessing(true)
    try {
      // Call market analysis API
      const response = await fetch(`/api/session/${sessionId}/comparable-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        const result = await response.json()
        setAnalysisResults((prev: any) => ({
          ...prev,
          marketAnalysis: result
        }))
        
        // Save to session
        await saveAnalysisResults({
          ...analysisResults,
          marketAnalysis: result
        })
      }
    } catch (error) {
      console.error('Error analyzing market data:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleGisMapUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setGisMapFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setGisMapPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const saveAnalysisResults = async (results: any) => {
    if (sessionId) {
      try {
        const response = await fetch(`/api/session/${sessionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            analysisResults: results
          })
        })
        
        if (response.ok) {
          console.log('✅ Analysis results saved to session')
        }
      } catch (error) {
        console.error('❌ Error saving analysis results:', error)
      }
    }
  }


  const renderMarketAnalysisSection = () => (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          ניתוח נתוני שוק
        </h3>
        <p className="text-green-700 text-sm mb-4">
          העלה קובץ CSV עם נתוני נכסים להשוואה לניתוח שוק מבוסס AI
        </p>
        
        <div className="flex gap-4">
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <Upload className="w-4 h-4" />
            הוסף קובץ CSV
          </button>
          <button 
            onClick={handleMarketAnalysis}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
            נתח נתוני שוק
          </button>
        </div>
      </div>
    </div>
  )

  const renderGisMappingSection = () => (
    <div className="space-y-6">
      {sessionId ? (
        <GISMapViewer 
          sessionId={sessionId}
          data={data}
          initialScreenshots={data.gisScreenshots}
        />
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <Map className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">לא זמין - נדרש session ID</p>
        </div>
      )}
    </div>
  )

  const renderGarmushkaMeasurementsSection = () => (
    <div className="space-y-6">
      {sessionId ? (
        <GarmushkaMeasurementViewer 
          sessionId={sessionId}
          initialMeasurements={data.garmushkaMeasurements}
          onMeasurementComplete={(measurements) => {
            if (measurements) {
              console.log('📐 Step4AIAnalysis: Garmushka measurements completed', measurements)
              
              // Update local state
              setAnalysisResults((prev: any) => ({
                ...prev,
                garmushkaMeasurements: measurements
              }))
              
              // Save to session via updateData
              updateData({
                garmushkaMeasurements: measurements
              })
              
              console.log('✅ Step4AIAnalysis: Garmushka measurements updated in session')
            } else {
              console.log('📐 Step4AIAnalysis: Garmushka measurements returned null')
            }
          }}
        />
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <Flag className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">לא זמין - נדרש session ID</p>
        </div>
      )}
    </div>
  )

  const renderAnalysisResults = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">תוצאות ניתוח AI</h3>
      <p className="text-gray-600 text-sm mb-6">סקור וערוך את הניתוח שנוצר על ידי AI</p>
      

      {/* Market Analysis Results */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-900">מגמות שוק</h4>
          <button className="p-1 text-gray-400 hover:text-gray-600">
            <Edit3 className="w-4 h-4" />
          </button>
        </div>
        <div className="text-gray-600">
          {analysisResults.marketAnalysis?.trends || 
           'אין ניתוח מגמות שוק זמין עדיין. אנא העלה נתוני מכירות להשוואה.'}
        </div>
      </div>

      {/* Comparable Assets */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-900">נכסים להשוואה</h4>
          <button className="p-1 text-gray-400 hover:text-gray-600">
            <Edit3 className="w-4 h-4" />
          </button>
        </div>
        <div className="text-gray-600">
          {analysisResults.marketAnalysis?.comparableAssets?.length > 0 ? 
           `${analysisResults.marketAnalysis.comparableAssets.length} נכסים להשוואה זמינים` :
           'אין נתוני השוואה מנותחים עדיין.'}
        </div>
      </div>

      {/* Value Assessment Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-900">סיכום הערכת שווי</h4>
          <button className="p-1 text-gray-400 hover:text-gray-600">
            <Edit3 className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">מחיר ממוצע למ"ר:</span>
            <span className="font-semibold mr-2">₪{analysisResults.marketAnalysis?.averagePricePerSqm || 0}</span>
          </div>
          <div>
            <span className="text-gray-500">מחיר חציוני למ"ר:</span>
            <span className="font-semibold mr-2">₪{analysisResults.marketAnalysis?.medianPricePerSqm || 0}</span>
          </div>
          <div>
            <span className="text-gray-500">גורם התאמה:</span>
            <span className="font-semibold mr-2">{analysisResults.marketAnalysis?.adjustmentFactor || 1}</span>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-right">
          ניתוח AI
        </h2>
        <p className="text-gray-600 text-right">
          העלה חומרים נוספים לניתוח AI מתקדם ושיפור הערכת שווי
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        {/* Left Panel - Analysis Results */}
        {/* <div className="bg-white rounded-lg border border-gray-200 p-6">
          {renderAnalysisResults()}
        </div> */}

        {/* Right Panel - AI Analysis Controls */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-right">ניתוח AI</h3>
          
          {/* Section Toggles */}
          <div className="space-y-4 mb-6">
            {sections.map((section) => {
              const Icon = section.icon
              return (
                <button
                  key={section.id}
                  onClick={() => handleSectionToggle(section.id)}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    activeSection === section.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${
                      activeSection === section.id ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    <div className="text-right">
                      <h4 className="font-semibold text-gray-900">{section.title}</h4>
                      <p className="text-sm text-gray-600">{section.description}</p>
                    </div>
                    {activeSection === section.id && (
                      <CheckCircle className="w-5 h-5 text-blue-600 mr-auto" />
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Active Section Content */}
          <div className="border-t border-gray-200 pt-6">
            {activeSection === 'market_analysis' && renderMarketAnalysisSection()}
            {activeSection === 'gis_mapping' && renderGisMappingSection()}
            {activeSection === 'garmushka_measurements' && renderGarmushkaMeasurementsSection()}
          </div>

          {/* Navigation Buttons */}
        </div>
      </div>
    </div>
  )
}
