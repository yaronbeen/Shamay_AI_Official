'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { StepIndicator } from './StepIndicator'
import { DocumentPreview } from './DocumentPreview'
import { NavigationButtons } from './NavigationButtons'
import { Step1InitialData } from './steps/Step1InitialData'
import { Step2Documents } from './steps/Step2Documents'
import { Step3Validation } from './steps/Step3Validation'
import { Step4AIAnalysis } from './steps/Step4AIAnalysis'
import { Step5Export } from './steps/Step5Export'
import { Step3PDFViewer } from './Step3PDFViewer'

export interface ValuationData {
  // Basic Property Information
  street: string
  buildingNumber: string
  city: string
  neighborhood: string
  fullAddress: string
  rooms: number
  floor: number
  airDirections?: string | number
  area: number
  propertyEssence: string
  
  // ✅ NEW: Cover Page Fields
  clientName: string
  clientTitle?: string
  clientNote?: string
  clientRelation?: string
  visitDate?: string
  valuationDate: string
  valuationEffectiveDate: string
  referenceNumber?: string
  shamayName: string
  shamaySerialNumber: string
  valuationType?: string
  appraiserLicenseNumber?: string
  
  // Land Contamination
  landContamination?: boolean
  landContaminationNote?: string
  
  // ✅ NEW: Legal Status Fields
  gush?: string
  parcel?: string
  parcelArea?: number
  parcelShape?: string
  parcelSurface?: string
  subParcel?: string
  registeredArea?: number
  builtArea?: number
  balconyArea?: number
  apartmentSqm?: number // Measured apartment area from Garmushka
  buildingPermitNumber?: string
  buildingPermitDate?: string
  buildingDescription?: string
  buildingFloors?: number
  buildingUnits?: number
  buildingDetails?: string
  constructionSource?: string
  attachments?: string
  ownershipRights?: string
  notes?: string
  
  // ✅ NEW: Registry Information
  registryOffice?: string
  extractDate?: string
  
  // ✅ NEW: Property Description Fields
  internalLayout?: string
  finishStandard?: string
  finishDetails?: string
  
  // Document Uploads
  propertyImages: File[]
  selectedImageIndex: number
  selectedImagePreview: string | null
  interiorImages: string[]
  
  // Signature
  signature: File | null
  signaturePreview: string | null
  
  // Analysis data from Step 3
  propertyAnalysis?: {
    buildingAge: string
    buildingCondition: string
    neighborhoodRating: string
    accessibility: string
    publicTransport: string
    schools: string
    shopping: string
  }
  marketAnalysis?: {
    averagePricePerSqm: number
    estimatedValue?: number
    priceRange: string
    marketTrend: string
    demandLevel: string
    competition: string
  }
  comparableDataAnalysis?: any
  comparableAnalysis?: any // Alias for document-template compatibility
  riskAssessment?: {
    legalRisks: string
    marketRisks: string
    environmentalRisks: string
    overallRisk: string
  }
  recommendations?: string[]
  
  // Extracted data from documents
  extractedData?: {
    // Legal Status - Land Registry
    registrationOffice?: string
    registration_office?: string // Backend snake_case format
    gush?: string | number
    chelka?: string | number
    subParcel?: string | number
    sub_parcel?: string | number // Backend snake_case format
    sub_chelka?: string | number // Legacy backend format (deprecated, use sub_parcel)
    ownershipType?: string
    ownership_type?: string // Backend snake_case format
    attachments?: string | Array<{
      type?: string
      area?: number
      color?: string
      symbol?: string
      description?: string
    }>
    attachmentsArea?: number
    attachments_area?: number // Backend snake_case format
    attachmentsDescription?: string
    attachments_description?: string // Backend snake_case format
    sharedAreas?: string
    sharedProperty?: string
    shared_property?: string // Backend snake_case format
    buildingRights?: string
    permittedUse?: string
    
    // Building Details
    buildingYear?: string
    floor?: string
    builtArea?: string
    registeredArea?: number
    apartmentRegisteredArea?: number
    apartment_registered_area?: number // Backend snake_case format
    balconyArea?: number
    balcony_area?: number // Backend snake_case format
    buildingDescription?: string
    buildingNumber?: string
    building_number?: string // Backend snake_case format
    buildingsCount?: number
    buildings_count?: number // Backend snake_case format
    unitDescription?: string
    unit_description?: string // Backend snake_case format
    
    // Property Characteristics
    propertyCondition?: string
    finishLevel?: string
    
    // Owners
    owners?: Array<{
      name?: string
      id_number?: string
      ownership_share?: string
    }>
    ownersCount?: number
    owners_count?: number // Backend snake_case format
    rights?: string
    
    // Mortgages
    mortgages?: Array<{
      rank?: string
      share?: string
      amount?: number
      essence?: string
      lenders?: string
      borrowers?: string
      registration_date?: string
    }>
    mortgageRank?: string
    mortgage_rank?: string // Backend snake_case format
    mortgageAmount?: number
    mortgage_amount?: number // Backend snake_case format
    mortgageEssence?: string
    mortgage_essence?: string // Backend snake_case format
    mortgageLenders?: string
    mortgage_lenders?: string // Backend snake_case format
    mortgageBorrowers?: string
    mortgage_borrowers?: string // Backend snake_case format
    mortgagePropertyShare?: string
    mortgage_property_share?: string // Backend snake_case format
    
    // Easements
    easementsEssence?: string
    easements_essence?: string // Backend snake_case format
    easementsDescription?: string
    easements_description?: string // Backend snake_case format
    
    // Notes
    plotNotes?: string
    plot_notes?: string // Backend snake_case format
    notesActionType?: string
    notes_action_type?: string // Backend snake_case format
    notesBeneficiary?: string
    notes_beneficiary?: string // Backend snake_case format
    
    // Additional Areas
    additionalAreas?: Array<{
      type?: string
      area?: number
    }>
    additional_areas?: Array<{
      type?: string
      area?: number
    }> // Backend snake_case format
    
    // Document Info
    issueDate?: string
    issue_date?: string // Backend snake_case format
    tabuExtractDate?: string
    tabu_extract_date?: string // Backend snake_case format
    documentType?: string
    document_type?: string // Backend snake_case format
    addressFromTabu?: string
    address_from_tabu?: string // Backend snake_case format
    
    // Sub Plots
    subPlotsCount?: number
    sub_plots_count?: number // Backend snake_case format
    
    // Building Permit
    permitNumber?: string
    permit_number?: string // Backend snake_case format
    permitDate?: string
    permit_date?: string // Backend snake_case format
    permittedUsage?: string
    permitted_usage?: string // Backend snake_case format
    permitted_description?: string // Backend snake_case format
    permitIssueDate?: string
    permit_issue_date?: string // Backend snake_case format
    localCommitteeName?: string
    local_committee_name?: string // Backend snake_case format
    propertyAddress?: string
    property_address?: string // Backend snake_case format
    
    // Shared Building Order
    orderIssueDate?: string
    order_issue_date?: string // Backend snake_case format
    buildingFloors?: string
    building_floors?: string // Backend snake_case format
    buildingSubPlotsCount?: string
    building_sub_plots_count?: string // Backend snake_case format
    totalSubPlots?: string
    total_sub_plots?: string // Backend snake_case format
    buildingAddress?: string
    building_address?: string // Backend snake_case format
    allAddresses?: string[]
    all_addresses?: string[] // Backend snake_case format
    buildingsInfo?: Array<{
      building_number?: string
      address?: string
      floors?: string
      sub_plots_count?: string
    }>
    city?: string
    specificSubPlot?: {
      number?: string
      floor?: string
      area?: string
      description?: string
      attachments?: string[]
      shared_property_parts?: string
    }
    specific_sub_plot?: {
      number?: string
      floor?: string
      area?: string
      description?: string
      attachments?: string[]
      shared_property_parts?: string
    } // Backend snake_case format
    
    // Confidence
    confidence?: number
    
    // Image Analysis - Interior
    propertyLayoutDescription?: string
    roomAnalysis?: Array<{
      room_type: string
      size_estimate: string
      features: string
      condition: string
    }>
    conditionAssessment?: string
    
    // Image Analysis - Exterior
    buildingCondition?: string
    buildingFeatures?: string
    buildingType?: string
    overallAssessment?: string
    
    // Comparable Sales
    averagePricePerSqm?: string
    medianPricePerSqm?: string
    adjustmentFactor?: string
    
    // Planning Information (Chapter 3)
    planning_information?: {
      rights?: {
        usage?: string
        minLotSize?: string | number
        min_lot_size?: string | number
        buildPercentage?: string | number
        build_percentage?: string | number
        maxFloors?: string | number
        max_floors?: string | number
        maxUnits?: string | number
        max_units?: string | number
        buildingLines?: string
        building_lines?: string
      }
      plans?: Array<{
        name?: string
        number?: string
        date?: string
        status?: string
        description?: string
      }>
    }
    planning_rights?: {
      usage?: string
      minLotSize?: string | number
      buildPercentage?: string | number
      maxFloors?: string | number
      maxUnits?: string | number
      buildingLines?: string
    }
  }
  
  // Calculations
  comparableData: any[]
  finalValuation: number
  pricePerSqm: number
  
  // Status
  isComplete: boolean
  sessionId?: string
  
  // Uploads
  uploads?: any[]
  
  // GIS Analysis Data
  gisAnalysis?: {
    coordinates: {
      x: number
      y: number
      lat: number
      lng: number
    }
    govmapUrls: {
      cropMode0: string
      cropMode1: string
    }
    extractedAt: string
    status: string
    confidence?: number
    address?: string
  }
  
  // GIS Screenshots (URLs or base64 data)
  gisScreenshots?: {
    // New 3-screenshot format
    wideArea?: string       // Large environment map for Section 1.1
    zoomedNoTazea?: string  // Close-up without תצ"א for Section 1.2 (left)
    zoomedWithTazea?: string // Close-up with תצ"א for Section 1.2 (right)
    // Legacy fields for backward compatibility
    cropMode0?: string
    cropMode1?: string
  }
  
  // Garmushka Measurements
  garmushkaMeasurements?: {
    measurementTable: Array<{
      id: string
      name: string
      type: 'calibration' | 'polyline' | 'polygon'
      measurement: string
      notes: string
      color: string
    }>
    metersPerPixel: number
    unitMode: 'metric' | 'imperial'
    isCalibrated: boolean
    fileName: string
    pngExport?: string // Base64 PNG export of the measurements
  }

  // Custom Tables (uploaded CSV tables)
  customTables?: CustomTable[]

  // Custom document edits (CSS selector → HTML content)
  customDocumentEdits?: Record<string, string>
}

// Custom table structure for CSV uploads
export interface CustomTable {
  id: string                    // Unique ID: `custom-table-${timestamp}`
  title?: string                // Optional table title
  headers: string[]             // Column headers from CSV
  rows: string[][]              // 2D array of cell values
  sectionId?: string            // Which page/section it belongs to
  createdAt: string             // ISO timestamp
  updatedAt: string             // ISO timestamp
}

export function ValuationWizard() {
  const [currentStep, setCurrentStep] = useState(1)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [showPDFViewer, setShowPDFViewer] = useState(false)
  const dataRef = useRef<ValuationData | null>(null)
  const [data, setData] = useState<ValuationData>({
    street: '',
    buildingNumber: '',
    city: '',
    neighborhood: '',
    fullAddress: '',
    rooms: 0,
    floor: 0,
    airDirections: '',
    area: 0,
    propertyEssence: '',
    landContamination: false,
    landContaminationNote: '',
    clientName: '',
    clientTitle: '',
    clientNote: '',
    clientRelation: '',
    valuationDate: '',
    valuationEffectiveDate: '',
    referenceNumber: '',
    shamayName: '',
    shamaySerialNumber: '',
    gush: '',
    parcel: '',
    parcelArea: 0,
    parcelShape: '',
    parcelSurface: '',
    subParcel: '',
    registeredArea: 0,
    builtArea: 0,
    balconyArea: 0,
    buildingPermitNumber: '',
    buildingPermitDate: '',
    buildingDescription: '',
    buildingFloors: 0,
    buildingUnits: 0,
    buildingDetails: '',
    constructionSource: '',
    attachments: '',
    ownershipRights: '',
    notes: '',
    registryOffice: '',
    extractDate: '',
    internalLayout: '',
    finishStandard: '',
    finishDetails: '',
    propertyImages: [],
    selectedImageIndex: 0,
    selectedImagePreview: null,
    interiorImages: [],
    signature: null,
    signaturePreview: null,
    propertyAnalysis: {
      buildingAge: '',
      buildingCondition: '',
      neighborhoodRating: '',
      accessibility: '',
      publicTransport: '',
      schools: '',
      shopping: '',
    },
    marketAnalysis: {
      averagePricePerSqm: 0,
      priceRange: '',
      marketTrend: '',
      demandLevel: '',
      competition: '',
    },
    riskAssessment: {
      legalRisks: '',
      marketRisks: '',
      environmentalRisks: '',
      overallRisk: '',
    },
    recommendations: [],
    comparableData: [],
    finalValuation: 0,
    pricePerSqm: 0,
    isComplete: false
  })

  // Load or create session on mount
  useEffect(() => {
    const loadOrCreateSession = async () => {
      try {
        setSessionLoading(true)
        
        // Check for sessionId in URL or localStorage
        const urlParams = new URLSearchParams(window.location.search)
        const urlSessionId = urlParams.get('sessionId')
        const storedSessionId = localStorage.getItem('valuationSessionId')
        const existingSessionId = urlSessionId || storedSessionId
        
        if (existingSessionId) {
          console.log('🔄 Loading existing session:', existingSessionId)
          
          // Try to load existing session data
          const response = await fetch(`/api/session/${existingSessionId}`)
          
          if (response.ok) {
            const result = await response.json()
            if (result.data && Object.keys(result.data).length > 0) {
              console.log('✅ Session loaded:', existingSessionId, 'Fields:', Object.keys(result.data))
              setSessionId(existingSessionId)
              setData(prev => {
                // Deep merge to preserve all fields including valuationType, clientTitle, etc.
                const mergedData = {
                  ...prev,
                  ...result.data,
                  sessionId: existingSessionId,
                  // Ensure critical fields are preserved
                  valuationType: result.data.valuationType || prev.valuationType || '',
                  valuationDate: result.data.valuationDate || prev.valuationDate || '',
                  valuationEffectiveDate: result.data.valuationEffectiveDate || prev.valuationEffectiveDate || '',
                  clientTitle: result.data.clientTitle || prev.clientTitle || '',
                  // Deep merge extractedData if it exists
                  extractedData: result.data.extractedData 
                    ? { ...prev.extractedData, ...result.data.extractedData }
                    : prev.extractedData
                }
                dataRef.current = mergedData
                return mergedData
              })
              localStorage.setItem('valuationSessionId', existingSessionId)
              setSessionLoading(false)
              return
            }
          }
          
          console.log('⚠️ Session not found, creating new session')
        }
        
        // Create new session
        console.log('🚀 Creating new session...')
        const response = await fetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
        
        if (!response.ok) {
          throw new Error(`Session creation failed: ${response.status}`)
        }
        
        const { sessionId } = await response.json()
        console.log('✅ Session created:', sessionId)
        
        setSessionId(sessionId)
        setData(prev => {
          const newData = { ...prev, sessionId }
          dataRef.current = newData
          return newData
        })
        localStorage.setItem('valuationSessionId', sessionId)
        setSessionLoading(false)
        
      } catch (error) {
        console.error('❌ Failed to load/create session:', error)
        setSessionLoading(false)
        // Still allow the wizard to work, just without session persistence
      }
    }
    loadOrCreateSession()
  }, [])

  // Save data to session whenever it changes
  const saveToSession = useCallback(async (dataToSave: Partial<ValuationData> | ValuationData) => {
    if (!sessionId) return

    try {
      console.log('💾 Saving to session:', sessionId, 'Fields:', Object.keys(dataToSave))
      
      const response = await fetch(`/api/session/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: dataToSave })
      })

      if (!response.ok) {
        console.error('❌ Failed to save to session:', response.status)
      } else {
        console.log('✅ Data saved to session')
      }
    } catch (error) {
      console.error('❌ Error saving to session:', error)
    }
  }, [sessionId])

  // Memoize the updateData function to prevent infinite loops
  const updateData = useCallback((updates: Partial<ValuationData>, options?: { skipAutoSave?: boolean }) => {
    console.log('📝 Updating data:', updates, 'skipAutoSave:', options?.skipAutoSave)
    setData(prev => {
      // Deep merge for extractedData to preserve planning_rights, planning_information, etc.
      let newData: ValuationData
      if (updates.extractedData) {
        newData = {
          ...prev,
          ...updates,
          extractedData: {
            ...prev.extractedData,
            ...updates.extractedData
          }
        }
      } else {
        newData = { ...prev, ...updates }
      }
      
      // Update ref with latest data
      dataRef.current = newData
      
      // Save to session - send ALL current data, not just updates
      // This ensures fields like valuationType, valuationDate, etc. are always saved
      if (!options?.skipAutoSave) {
        saveToSession(newData)
      }
      
      return newData
    })
  }, [saveToSession])

  // Keep dataRef in sync with data state
  useEffect(() => {
    dataRef.current = data
  }, [data])

  const nextStep = useCallback(() => {
    if (currentStep < 5) {
      // Save all current data before moving to next step
      // This ensures fields like valuationType, valuationDate, valuationEffectiveDate, clientTitle are saved
      const currentData = dataRef.current || data
      if (currentData) {
        saveToSession(currentData)
      }
      setCurrentStep(prev => prev + 1)
    }
  }, [currentStep, saveToSession, data])

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const onValidationChange = (isValid: boolean) => {
    // Handle validation state if needed
    console.log('Validation changed:', isValid)
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1InitialData data={data} updateData={updateData} onValidationChange={onValidationChange} />
      case 2:
        return <Step2Documents data={data} updateData={updateData} sessionId={sessionId || undefined} onValidationChange={onValidationChange} />
      case 3:
        return <Step3Validation data={data} updateData={updateData} sessionId={sessionId || undefined} onValidationChange={onValidationChange} />
      case 4:
        return <Step4AIAnalysis data={data} updateData={updateData} sessionId={sessionId || undefined} onValidationChange={onValidationChange} />
      case 5:
        return <Step5Export data={data} updateData={updateData} sessionId={sessionId || undefined} />
      default:
        return <Step1InitialData data={data} updateData={updateData} onValidationChange={onValidationChange} />
    }
  }

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">מייצר שומה חדשה..</p>
        </div>
      </div>
    )
  }

  // Step 3 uses full width (has its own PDF viewer + fields layout)
  const isFullWidthStep = currentStep === 3

  return (
    <div className="min-h-screen bg-gray-50">
      <div className={`mx-auto px-4 sm:px-6 lg:px-8 py-8 ${isFullWidthStep ? 'max-w-full' : 'max-w-7xl'}`}>
        <div className={`grid gap-8 ${isFullWidthStep ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'}`}>
          {/* Main Content */}
          <div className={isFullWidthStep ? '' : 'lg:col-span-2'}>
            <StepIndicator currentStep={currentStep} />
            <div className={`bg-white rounded-lg shadow-md mt-6 ${isFullWidthStep ? 'p-0' : 'p-6'}`}>
              {renderStep()}
              {!isFullWidthStep && (
                <NavigationButtons
                  currentStep={currentStep}
                  totalSteps={5}
                  onNext={nextStep}
                  onPrevious={prevStep}
                  canProceed={true}
                />
              )}
            </div>
            {isFullWidthStep && (
              <div className="mt-4 px-6">
                <NavigationButtons
                  currentStep={currentStep}
                  totalSteps={5}
                  onNext={nextStep}
                  onPrevious={prevStep}
                  canProceed={true}
                />
              </div>
            )}
          </div>

          {/* Document Preview - Hidden on Step 3 (has its own document viewer) */}
          {!isFullWidthStep && (
            <div className="lg:col-span-1">
              <DocumentPreview data={data} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
