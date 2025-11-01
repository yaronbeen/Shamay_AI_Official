'use client'

import React, { useState, useEffect, useRef } from 'react'
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
import ComparableDataViewer from '../ui/ComparableDataViewer'

interface Step4AIAnalysisProps {
  data: ValuationData
  updateData: (updates: Partial<ValuationData>, options?: { skipAutoSave?: boolean }) => void
  onValidationChange: (isValid: boolean) => void
  sessionId?: string
  onSaveGISData?: (gisData: any) => Promise<void>
  onSaveGarmushkaData?: (garmushkaData: any) => Promise<void>
  onSaveFinalResults?: (finalResults: any) => Promise<void>
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
  // CRITICAL: Use ref to prevent infinite loops - only call once on mount
  const validationCalledRef = useRef(false)
  useEffect(() => {
    if (!validationCalledRef.current) {
      onValidationChange(true)
      validationCalledRef.current = true
    }
  }, []) // Empty dependency array - only run once on mount

  // Restore comparableDataAnalysis from marketAnalysis or existing comparableDataAnalysis
  useEffect(() => {
    if (data.marketAnalysis && !data.comparableDataAnalysis && Object.keys(data.marketAnalysis).length > 0) {
      // Restore comparableDataAnalysis from marketAnalysis
      updateData({
        comparableDataAnalysis: data.marketAnalysis
      })
      console.log('✅ Restored comparableDataAnalysis from marketAnalysis')
    } else if (data.comparableDataAnalysis && Object.keys(data.comparableDataAnalysis).length > 0) {
      // Already exists, ensure it's synced
      console.log('✅ comparableDataAnalysis already exists in valuationData')
    }
  }, [data.marketAnalysis, data.comparableDataAnalysis, updateData])
  
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
      {sessionId ? (
        <ComparableDataViewer
          data={data}
          sessionId={sessionId}
          onAnalysisComplete={(analysis) => {
            console.log('📊 Step4AIAnalysis: Comparable data analysis completed', analysis)
            
            // Update local state
            setAnalysisResults((prev: any) => ({
              ...prev,
              marketAnalysis: analysis
            }))
            
            // Save to session - update both comparableDataAnalysis AND comparableData for document
            updateData({
              comparableDataAnalysis: analysis,
              comparableData: analysis.comparables || [],
              pricePerSqm: analysis.averagePricePerSqm || data.pricePerSqm || 0,
              marketAnalysis: {
                ...data.marketAnalysis,
                averagePricePerSqm: analysis.averagePricePerSqm || 0,
                marketTrend: (analysis as any).market_trends || data.marketAnalysis?.marketTrend || '',
                priceRange: (analysis as any).price_range 
                  ? `₪${(analysis as any).price_range.min?.toLocaleString()} - ₪${(analysis as any).price_range.max?.toLocaleString()}`
                  : data.marketAnalysis?.priceRange || '',
                demandLevel: data.marketAnalysis?.demandLevel || '',
                competition: data.marketAnalysis?.competition || ''
              }
            })
            
            console.log('✅ Step4AIAnalysis: Comparable data analysis updated in session and document data')
          }}
        />
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-6 text-center overflow-hidden">
          <BarChart3 className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-gray-400" />
          <p className="text-sm sm:text-base text-gray-600 break-words">לא זמין - נדרש session ID</p>
        </div>
      )}
    </div>
  )

  const renderGisMappingSection = () => (
    <div className="space-y-6">
      {sessionId ? (
        <GISMapViewer 
          sessionId={sessionId}
          data={data}
          initialScreenshots={data.gisScreenshots}
          onScreenshotsUpdated={(screenshots) => {
            // Update data immediately when screenshots are uploaded
            updateData({ gisScreenshots: screenshots }, { skipAutoSave: false })
          }}
        />
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-6 text-center overflow-hidden">
          <Map className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-gray-400" />
          <p className="text-sm sm:text-base text-gray-600 break-words">לא זמין - נדרש session ID</p>
        </div>
      )}
    </div>
  )

  const renderGarmushkaMeasurementsSection = () => (
    <div className="space-y-6">
      {sessionId ? (
        <GarmushkaMeasurementViewer 
          data={data}
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
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-6 text-center overflow-hidden">
          <Flag className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-gray-400" />
          <p className="text-sm sm:text-base text-gray-600 break-words">לא זמין - נדרש session ID</p>
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
    <div className="max-w-7xl mx-auto p-4 sm:p-6 overflow-hidden">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 text-right truncate">
          ניתוח AI
        </h2>
        <p className="text-sm sm:text-base text-gray-600 text-right break-words">
          העלה חומרים נוספים לניתוח AI מתקדם ושיפור הערכת שווי
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-4 sm:gap-6">
        {/* Left Panel - Analysis Results */}
        {/* <div className="bg-white rounded-lg border border-gray-200 p-6">
          {renderAnalysisResults()}
        </div> */}

        {/* Right Panel - AI Analysis Controls */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 overflow-hidden">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-right truncate">ניתוח AI</h3>
          
          {/* Section Toggles - Display as columns (horizontal) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
            {sections.map((section) => {
              const Icon = section.icon
              return (
                <button
                  key={section.id}
                  onClick={() => handleSectionToggle(section.id)}
                  className={`p-3 sm:p-4 rounded-lg border-2 transition-all overflow-hidden ${
                    activeSection === section.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2 sm:gap-3 min-w-0">
                    <Icon className={`w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0 ${
                      activeSection === section.id ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    <div className="text-center min-w-0 w-full">
                      <h4 className="font-semibold text-gray-900 truncate text-sm sm:text-base mb-1" title={section.title}>
                        {section.title}
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-600 line-clamp-2" title={section.description}>
                        {section.description}
                      </p>
                    </div>
                    {activeSection === section.id && (
                      <CheckCircle className="w-5 h-5 text-blue-600" />
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
