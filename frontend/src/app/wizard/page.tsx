'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { StepIndicator } from '@/components/StepIndicator'
import { DocumentPreview } from '@/components/DocumentPreview'
import { NavigationButtons } from '@/components/NavigationButtons'
import { Step1InitialData } from '@/components/steps/Step1InitialData'
import { Step2Documents } from '@/components/steps/Step2Documents'
import { Step3Validation } from '@/components/steps/Step3Validation'
import { Step4AIAnalysis } from '@/components/steps/Step4AIAnalysis'
import { Step5Export } from '@/components/steps/Step5Export'
import { ValuationData } from '@/components/ValuationWizard'

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
  const [currentStep, setCurrentStep] = useState(1)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
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
          setSessionLoading(false)
          setIsInitialLoad(false)
          return
        }
        
        // If no existing session, redirect to home page
        console.log('❌ No existing session found, redirecting to home')
        router.push('/')
        
      } catch (error) {
        console.error('❌ Failed to initialize session:', error)
        setSessionLoading(false)
        router.push('/')
      }
    }
    initializeSession()
  }, [searchParams, router])

  // Debounced save function to prevent excessive API calls
  const debouncedSave = useCallback(
    debounce(async (dataToSave: ValuationData) => {
      if (sessionId && !isInitialLoad) {
        try {
          // First, get the current session data to merge with
          const currentSessionResponse = await fetch(`/api/session/${sessionId}`)
          const currentSession = await currentSessionResponse.json()
          const existingData = currentSession?.data || {}
          
          // Merge existing data with new data
          const mergedData = {
            ...existingData,
            ...dataToSave
          }
          
          const response = await fetch(`/api/session/${sessionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: mergedData })
          })
          
          if (!response.ok) {
            console.error('❌ Session save failed:', response.status, response.statusText)
          }
        } catch (err) {
          console.error('Session save error:', err)
        }
      } else if (isInitialLoad) {
        console.log('⏭️ Skipping save during initial load')
      }
    }, 1000), // 1 second debounce
    [sessionId, isInitialLoad]
  )

  // Memoize the updateData function to prevent infinite loops
  const updateData = useCallback((updates: Partial<ValuationData>) => {
    setData(prev => {
      const newData = { ...prev, ...updates }
      
      // Debounced save to session
      debouncedSave(newData)
      
      return newData
    })
  }, [debouncedSave])

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

  const nextStep = () => {
    if (currentStep < 5) {
      const newStep = currentStep + 1
      setCurrentStep(newStep)
      router.push(`/wizard?step=${newStep}`)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      const newStep = currentStep - 1
      setCurrentStep(newStep)
      router.push(`/wizard?step=${newStep}`)
    }
  }

  // Handle step click navigation
  const handleStepClick = (step: number) => {
    if (step <= currentStep || step === currentStep + 1) {
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
          />
        )
      case 5:
        return <Step5Export data={data} />
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
