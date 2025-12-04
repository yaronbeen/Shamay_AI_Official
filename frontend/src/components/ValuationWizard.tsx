'use client'

import { useState, useEffect, useCallback } from 'react'
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
  airDirections?: string
  area: number
  propertyEssence: string
  
  // ✅ NEW: Cover Page Fields
  clientName: string
  clientRelation?: string
  valuationDate: string
  valuationEffectiveDate: string
  referenceNumber?: string
  shamayName: string
  shamaySerialNumber: string
  valuationType?: string
  
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
    subChelka?: string | number
    sub_chelka?: string | number // Backend snake_case format
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
  
  // GIS Screenshots (base64 data)
  gisScreenshots?: {
    cropMode0?: string // base64 data
    cropMode1?: string // base64 data
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
}

export function ValuationWizard() {
  const [currentStep, setCurrentStep] = useState(1)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [showPDFViewer, setShowPDFViewer] = useState(false)
  const [data, setData] = useState<ValuationData>({
    street: '',
    buildingNumber: '',
    city: '',
    neighborhood: '',
    fullAddress: '',
    rooms: 0,
    floor: 0,
    area: 0,
    propertyEssence: '',
    clientName: '',
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

  // Create session on mount
  useEffect(() => {
    const createSession = async () => {
      try {
        console.log('🚀 Creating new session...')
        setSessionLoading(true)
        
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
        setData(prev => ({ ...prev, sessionId }))
        setSessionLoading(false)
        
      } catch (error) {
        console.error('❌ Failed to create session:', error)
        setSessionLoading(false)
        // Still allow the wizard to work, just without session persistence
      }
    }
    createSession()
  }, [])

  // Save data to session whenever it changes
  const saveToSession = useCallback(async (updates: Partial<ValuationData>) => {
    if (!sessionId) return

    try {
      console.log('💾 Saving to session:', sessionId, updates)
      
      const response = await fetch(`/api/session/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: updates })
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
  const updateData = useCallback((updates: Partial<ValuationData>) => {
    console.log('📝 Updating data:', updates)
    setData(prev => {
      const newData = { ...prev, ...updates }
      
      // Save to session
      saveToSession(updates)
      
      return newData
    })
  }, [saveToSession])

  const nextStep = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1)
    }
  }

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
        return <Step5Export data={data} />
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <StepIndicator currentStep={currentStep} />
            <div className="bg-white rounded-lg shadow-md p-6 mt-6">
              {renderStep()}
        <NavigationButtons
          currentStep={currentStep}
          totalSteps={5}
          onNext={nextStep}
          onPrevious={prevStep}
          canProceed={true}
        />
            </div>
          </div>

          {/* Document Preview */}
          <div className="lg:col-span-1">
            <DocumentPreview data={data} />
          </div>
        </div>
      </div>
    </div>
  )
}
