'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { StepIndicator } from '@/components/StepIndicator'
import { DocumentPreview } from '@/components/DocumentPreview'
import { NavigationButtons } from '@/components/NavigationButtons'
import { Step1InitialData } from '@/components/steps/Step1InitialData'
import { Step2Documents } from '@/components/steps/Step2Documents'
import { Step3Validation } from '@/components/steps/Step3Validation'
import { Step4AIAnalysis } from '@/components/steps/Step4AIAnalysis'
import { Step5Export } from '@/components/steps/Step5Export'
import { ValuationData } from '@/components/ValuationWizard'
import { useShumaDB } from '@/hooks/useShumaDB'

// Simple debounce function
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout | null = null
  return ((...args: any[]) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }) as T
}

export default function WizardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const [currentStep, setCurrentStep] = useState(1)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [valuationId, setValuationId] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSavedData, setLastSavedData] = useState<ValuationData | null>(null)
  
  // Database integration hook
  const { 
    saveShumaToDatabase, 
    loadShumaForWizard,
    saveGISData, 
    saveGarmushkaData, 
    saveFinalResults,
    isLoading: dbLoading 
  } = useShumaDB()
  const [stepValidation, setStepValidation] = useState({
    step1: false,
    step2: false,
    step3: false,
    step4: false
  })
  const [data, setData] = useState<ValuationData>({
    street: '',
    buildingNumber: '',
    neighborhood: '',
    city: '',
    fullAddress: '',
    clientName: '',
    visitDate: new Date().toLocaleDateString('he-IL'),
    valuationDate: new Date().toLocaleDateString('he-IL'),
    referenceNumber: '',
    rooms: 0,
    floor: 0,
    area: 0,
    balconyArea: 0,
    propertyEssence: '',
    shamayName: '',
    shamaySerialNumber: '',
    propertyImages: [],
    selectedImageIndex: 0,
    selectedImagePreview: null,
    interiorImages: [],
    signature: null,
    signaturePreview: null,
    comparableData: [],
    finalValuation: 0,
    pricePerSqm: 0,
    isComplete: false
  })

  // Get step from URL or default to 1
  useEffect(() => {
    const step = parseInt(searchParams.get('step') || '1')
    setCurrentStep(step)
  }, [searchParams])

  // Keyboard shortcut for returning to dashboard (Ctrl/Cmd + D)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
        event.preventDefault()
        if (confirm('האם אתה בטוח שברצונך לעזוב את האשף? כל ההתקדמות נשמרת אוטומטית.')) {
          router.push('/dashboard')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])

  // Check for existing session or create new one only if needed
  useEffect(() => {
    const initializeSession = async () => {
      try {
        setSessionLoading(true)
        
        // Check if there's a sessionId in the URL params
        const urlSessionId = searchParams.get('sessionId')
        if (urlSessionId) {
          console.log('🔄 Using existing session from URL:', urlSessionId)
          setSessionId(urlSessionId)
          setData(prev => ({ ...prev, sessionId: urlSessionId }))
          // Save to localStorage for persistence
          localStorage.setItem('shamay_session_id', urlSessionId)
          
          // Load existing data from database
          try {
            const loadResult = await loadShumaForWizard(urlSessionId)
            console.log('🔍 Database load result:', loadResult)
            if (loadResult.success && loadResult.valuationData) {
              console.log('✅ Loaded existing data from database:', loadResult.valuationData)
              console.log('🔍 [LOAD] Uploads from database:', loadResult.valuationData.uploads)
              console.log('🔍 [LOAD] Uploads status:', loadResult.valuationData.uploads?.map((u: any) => ({ id: u.id, type: u.type, status: u.status, hasStatus: 'status' in u })))
              // Directly set the data without going through session store merge
              setData(prev => ({
                ...prev,
                ...loadResult.valuationData,
                sessionId: urlSessionId
              }))
            } else {
              console.log('⚠️ No existing data found, starting fresh')
            }
          } catch (error) {
            console.error('❌ Error loading existing data:', error)
          }
          
          setSessionLoading(false)
          setIsInitialLoad(false)
          return
        }
        
        // Check if there's a sessionId in localStorage
        const localSessionId = localStorage.getItem('shamay_session_id')
        if (localSessionId) {
          console.log('🔄 Using existing session from localStorage:', localSessionId)
          setSessionId(localSessionId)
          setData(prev => ({ ...prev, sessionId: localSessionId }))
          
          // Load existing data from database
          try {
            const loadResult = await loadShumaForWizard(localSessionId)
            if (loadResult.success && loadResult.valuationData) {
              console.log('✅ Loaded existing data from database')
              console.log('🔍 [LOAD] Uploads from database:', loadResult.valuationData.uploads)
              console.log('🔍 [LOAD] Uploads status:', loadResult.valuationData.uploads?.map((u: any) => ({ id: u.id, type: u.type, status: u.status, hasStatus: 'status' in u })))
              // Directly set the data without going through session store merge
              setData(prev => ({
                ...prev,
                ...loadResult.valuationData,
                sessionId: localSessionId
              }))
            } else {
              console.log('⚠️ No existing data found, starting fresh')
            }
          } catch (error) {
            console.error('❌ Error loading existing data:', error)
          }
          
          setSessionLoading(false)
          setIsInitialLoad(false)
          return
        }
        
        // If no existing session, create a new one
        console.log('🆕 No existing session found, creating new session')
        try {
          // Generate a new session ID locally
          const newSessionId = Date.now().toString()
          console.log('✅ Created new session:', newSessionId)
          setSessionId(newSessionId)
          setData(prev => ({ ...prev, sessionId: newSessionId }))
          localStorage.setItem('shamay_session_id', newSessionId)
          setSessionLoading(false)
          setIsInitialLoad(false)
        } catch (error) {
          console.error('❌ Error creating session:', error)
          router.push('/')
        }
        
      } catch (error) {
        console.error('❌ Failed to initialize session:', error)
        setSessionLoading(false)
        router.push('/')
      }
    }
    initializeSession()
  }, [searchParams, router, loadShumaForWizard])

  // Enhanced debounced save function with database integration
  const debouncedSave = useCallback(
    debounce(async (dataToSave: ValuationData) => {
      if (sessionId && !isInitialLoad) {
        try {
          console.log('💾 [DEBOUNCED SAVE] Starting save to database...')
          console.log('💾 [DEBOUNCED SAVE] Uploads status:', dataToSave.uploads?.map((u: any) => ({ id: u.id, type: u.type, status: u.status })))
          
          const organizationId = session?.user?.primaryOrganizationId
          const userId = session?.user?.id

          if (!organizationId || !userId) {
            console.warn('⚠️ Skipping save: missing authenticated user or organization')
            return
          }

          // Save directly to database using ShumaDB
          const result = await saveShumaToDatabase(
            sessionId,
            organizationId,
            userId,
            dataToSave
          )
          
          if (result.success) {
            console.log('✅ Data saved to database successfully')
            console.log('✅ Uploads with status saved:', dataToSave.uploads?.length || 0, 'uploads')
            setHasUnsavedChanges(false)
            setLastSavedData(dataToSave)
            if (result.shumaId && !valuationId) {
              setValuationId(result.shumaId)
              console.log('✅ New shuma created:', result.shumaId)
            }
          } else {
            console.error('❌ Database save failed:', result.error)
          }
        } catch (err) {
          console.error('Database save error:', err)
        }
      } else if (isInitialLoad) {
        console.log('⏭️ Skipping save during initial load')
      }
    }, 1000), // 1 second debounce
    [
      sessionId,
      isInitialLoad,
      saveShumaToDatabase,
      valuationId,
      session?.user?.primaryOrganizationId,
      session?.user?.id
    ]
  )

  // Memoize the updateData function to prevent infinite loops
  // Only trigger save on meaningful data additions (not every keystroke)
  const updateData = useCallback((updates: Partial<ValuationData>, options?: { skipAutoSave?: boolean }) => {
    setData(prev => {
      const newData = { ...prev, ...updates }
      
      // Check if data actually changed (deep comparison for objects/arrays)
      const changedFields: string[] = []
      const hasActualChanges = Object.keys(updates).some(key => {
        const oldValue = prev[key as keyof ValuationData]
        const newValue = updates[key as keyof ValuationData]
        
        // Simple comparison for primitives
        if (typeof newValue !== 'object' || newValue === null) {
          if (oldValue !== newValue) {
            changedFields.push(key)
            return true
          }
          return false
        }
        
        // For objects/arrays, compare JSON strings (simple but effective)
        const oldJSON = JSON.stringify(oldValue)
        const newJSON = JSON.stringify(newValue)
        if (oldJSON !== newJSON) {
          changedFields.push(key)
          console.log(`🔍 Change detected in ${key}:`, {
            oldLength: oldJSON.length,
            newLength: newJSON.length,
            sample: newJSON.substring(0, 100)
          })
          return true
        }
        return false
      })
      
      if (!hasActualChanges) {
        console.log('⏭️ No actual changes detected in update, skipping')
        return prev // Return unchanged data
      }
      
      console.log('✅ Changes detected in fields:', changedFields)
      
      // Check if this is a meaningful update that should trigger save
      const isMeaningfulUpdate = 
        updates.uploads ||           // New file uploaded
        updates.extractedData ||     // AI extraction completed
        updates.gisScreenshots ||    // GIS screenshot captured
        updates.garmushkaMeasurements || // Garmushka measurement added
        updates.propertyImages ||    // Images added
        updates.interiorImages ||    // Interior images added
        updates.comparableData ||    // Comparable data added
        updates.propertyAnalysis ||  // Analysis completed
        updates.marketAnalysis ||    // Market analysis completed
        updates.riskAssessment ||    // Risk assessment completed
        updates.recommendations      // Recommendations added
      
      // Mark that we have unsaved changes
      if (!options?.skipAutoSave) {
        setHasUnsavedChanges(true)
      }
      
      // Only save if it's a meaningful update and not explicitly skipped
      if (isMeaningfulUpdate && !options?.skipAutoSave) {
        console.log('💾 Triggering save for meaningful update:', Object.keys(updates))
        debouncedSave(newData)
        setHasUnsavedChanges(false) // Mark as saved after triggering save
      } else if (options?.skipAutoSave) {
        console.log('⏭️ Skipping auto-save (explicitly disabled)')
      } else {
        console.log('⏭️ Skipping auto-save for minor update:', Object.keys(updates))
      }
      
      return newData
    })
  }, [debouncedSave])

  // Manual save function (for explicit saves, like form submission or step navigation)
  // Only saves if there are actual changes
  const saveManually = useCallback(async () => {
    if (sessionId && !isInitialLoad) {
      // Check if there are unsaved changes
      if (!hasUnsavedChanges) {
        console.log('⏭️ [MANUAL SAVE] No changes detected, skipping save')
        return { success: true, skipped: true }
      }

      const organizationId = session?.user?.primaryOrganizationId
      const userId = session?.user?.id

      if (!organizationId || !userId) {
        console.warn('⚠️ Cannot save: missing authenticated user or organization')
        return { success: false, error: 'Missing user or organization' }
      }

      console.log('💾 [MANUAL SAVE] Changes detected, saving to database...')
      const result = await saveShumaToDatabase(sessionId, organizationId, userId, data)
      
      if (result.success) {
        console.log('✅ Manual save successful')
        setHasUnsavedChanges(false)
        setLastSavedData(data)
      } else {
        console.error('❌ Manual save failed:', result.error)
      }
      
      return result
    }
    return { success: false, error: 'No session or still loading' }
  }, [sessionId, isInitialLoad, session?.user, data, saveShumaToDatabase, hasUnsavedChanges])

  // Save GIS data to database
  const saveGISDataToDB = useCallback(async (gisData: any) => {
    if (valuationId) {
      const result = await saveGISData(valuationId, gisData)
      if (result.success) {
        console.log('✅ GIS data saved to database')
      } else {
        console.error('❌ Failed to save GIS data:', result.error)
      }
    }
  }, [valuationId, saveGISData])

  // Save Garmushka data to database
  const saveGarmushkaDataToDB = useCallback(async (garmushkaData: any) => {
    if (valuationId) {
      const result = await saveGarmushkaData(valuationId, garmushkaData)
      if (result.success) {
        console.log('✅ Garmushka data saved to database')
      } else {
        console.error('❌ Failed to save Garmushka data:', result.error)
      }
    }
  }, [valuationId, saveGarmushkaData])

  // Save final results to database
  const saveFinalResultsToDB = useCallback(async (finalValuation: number, pricePerSqm: number, comparableData: any, propertyAnalysis: any) => {
    if (valuationId) {
      const result = await saveFinalResults(valuationId, finalValuation, pricePerSqm, comparableData, propertyAnalysis)
      if (result.success) {
        console.log('✅ Final results saved to database')
      } else {
        console.error('❌ Failed to save final results:', result.error)
      }
    }
  }, [valuationId, saveFinalResults])

  // Memoize the validation handler to prevent infinite loops
  const handleValidationChange = useCallback((step: number, isValid: boolean) => {
    setStepValidation(prev => {
      const key = `step${step}` as keyof typeof prev
      if (prev[key] !== isValid) {
        return { ...prev, [key]: isValid }
      }
      return prev
    })
  }, [])

  const nextStep = async () => {
    if (currentStep < 5) {
      // Save data before navigating (especially important for Step 1)
      await saveManually()
      
      const newStep = currentStep + 1
      setCurrentStep(newStep)
      router.push(`/wizard?step=${newStep}`)
    }
  }

  const prevStep = async () => {
    if (currentStep > 1) {
      // Save data before navigating
      await saveManually()
      
      const newStep = currentStep - 1
      setCurrentStep(newStep)
      router.push(`/wizard?step=${newStep}`)
    }
  }

  // Handle step click navigation
  const handleStepClick = async (step: number) => {
    if (step <= currentStep || step === currentStep + 1) {
      // Save data before navigating
      await saveManually()
      
      setCurrentStep(step)
      router.push(`/wizard?step=${step}`)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1InitialData 
            data={data} 
            updateData={updateData} 
            onValidationChange={(isValid) => handleValidationChange(1, isValid)}
          />
        )
      case 2:
        return (
          <Step2Documents 
            data={data} 
            updateData={updateData} 
            sessionId={sessionId || undefined}
            onValidationChange={(isValid) => handleValidationChange(2, isValid)}
          />
        )
      case 3:
        return (
          <Step3Validation 
            data={data} 
            updateData={updateData}
            onValidationChange={(isValid) => handleValidationChange(3, isValid)}
            sessionId={sessionId || undefined}
          />
        )
      case 4:
        return (
          <Step4AIAnalysis 
            data={data} 
            updateData={updateData}
            sessionId={sessionId || undefined}
            onValidationChange={(isValid) => handleValidationChange(4, isValid)}
            onSaveGISData={saveGISDataToDB}
            onSaveGarmushkaData={saveGarmushkaDataToDB}
          />
        )
      case 5:
        return (
          <Step5Export 
            data={data} 
            onSaveFinalResults={saveFinalResultsToDB}
          />
        )
      default:
        return (
          <Step1InitialData 
            data={data} 
            updateData={updateData} 
            onValidationChange={(isValid) => handleValidationChange(1, isValid)}
          />
        )
    }
  }

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">יוצר מושב חדש...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  SHAMAY.AI
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                שלב {currentStep} מתוך 5
              </div>
              <button
                onClick={() => {
                  if (confirm('האם אתה בטוח שברצונך לעזוב את האשף? כל ההתקדמות נשמרת אוטומטית.')) {
                    router.push('/dashboard')
                  }
                }}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                title="חזור ללוח בקרה (Ctrl+D)"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>חזור ללוח בקרה</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Debug info */}
      {sessionId && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 mb-4">
          <p className="text-sm">✅ Session ID: {sessionId}</p>
          <p className="text-xs">Session is active and ready for uploads</p>
        </div>
      )}
      
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* Main Content - Takes 7/12 of the width (58%) */}
          <div className="xl:col-span-7">
            <StepIndicator currentStep={currentStep} onStepClick={handleStepClick} />
            <div className="bg-white rounded-lg shadow-md p-6 mt-6">
              {renderStep()}
              <NavigationButtons
                currentStep={currentStep}
                totalSteps={5}
                onNext={nextStep}
                onPrevious={prevStep}
                canProceed={stepValidation[`step${currentStep}` as keyof typeof stepValidation]}
              />
            </div>
          </div>

          {/* Document Preview - Takes 5/12 of the width (42%) */}
          <div className="xl:col-span-5">
            <DocumentPreview data={data} onDataChange={updateData} />
          </div>
        </div>
      </div>
    </div>
  )
}
