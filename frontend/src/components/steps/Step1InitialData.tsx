'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'

interface Step1InitialDataProps {
  data: any
  updateData: (updates: Partial<any>, options?: { skipAutoSave?: boolean }) => void
  onValidationChange: (isValid: boolean) => void
}

export function Step1InitialData({ data, updateData, onValidationChange }: Step1InitialDataProps) {
  // Helper to convert DD.MM.YYYY to YYYY-MM-DD for date input
  const formatDateForInput = (dateStr: string) => {
    if (!dateStr) return new Date().toISOString().split('T')[0]
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
    // If in DD.MM.YYYY format, convert to YYYY-MM-DD
    const match = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
    if (match) {
      const [, day, month, year] = match
      return `${year}-${month}-${day}`
    }
    // Fallback to current date
    return new Date().toISOString().split('T')[0]
  }

  const [formData, setFormData] = useState({
    // סוג שומה ומועד כתיבתה
    valuationType: data.valuationType || '',
    valuationDate: formatDateForInput(data.valuationDate),
    
    // זהות מזמין השומה והקשר שלו לנכס
    clientName: data.clientName || '',
    clientRelation: data.clientRelation || '',
    
    // המועד הקובע לשומה
    valuationEffectiveDate: data.valuationEffectiveDate || new Date().toISOString().split('T')[0],
    
    // זיהוי הנכס
    street: data.street || '',
    buildingNumber: data.buildingNumber || '',
    neighborhood: data.neighborhood || '',
    city: data.city || '',
    
    // תיאור הנכס והסביבה (basic info only - detailed analysis will be done by AI in Step 3)
    rooms: (data.rooms !== null && data.rooms !== undefined && data.rooms !== 0 && data.rooms !== '') ? data.rooms : '',
    floor: (data.floor !== null && data.floor !== undefined && data.floor !== 0 && data.floor !== '') ? data.floor : '',
    area: (data.area !== null && data.area !== undefined && data.area !== 0 && data.area !== '') ? data.area : '',
    
    // פרטי שמאי
    shamayName: data.shamayName || '',
    shamaySerialNumber: data.shamaySerialNumber || '',
    
    // חתימה
    signature: data.signaturePreview || null


  })

  console.log('Validation check:',  data )

  const [signatureUploading, setSignatureUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sync local formData with incoming data prop when data changes
  useEffect(() => {
    console.log('🔄 Step1 - Data prop changed:', data)
    console.log('🔄 Step1 - Specific fields:', {
      clientName: data.clientName,
      street: data.street,
      shamayName: data.shamayName,
      valuationType: data.valuationType
    })
    
    // Always sync the form data with the incoming data prop
    setFormData({
      // סוג שומה ומועד כתיבתה
      valuationType: data.valuationType || '',
      valuationDate: formatDateForInput(data.valuationDate),
      
      // זהות מזמין השומה והקשר שלו לנכס
      clientName: data.clientName || '',
      clientRelation: data.clientRelation || '',
      
      // המועד הקובע לשומה
      valuationEffectiveDate: formatDateForInput(data.valuationEffectiveDate),
      
      // זיהוי הנכס
      street: data.street || '',
      buildingNumber: data.buildingNumber || '',
      neighborhood: data.neighborhood || '',
      city: data.city || '',
      
      // תיאור הנכס והסביבה (basic info only - detailed analysis will be done by AI in Step 3)
      rooms: (data.rooms !== null && data.rooms !== undefined && data.rooms !== 0 && data.rooms !== '') ? data.rooms : '',
      floor: (data.floor !== null && data.floor !== undefined && data.floor !== 0 && data.floor !== '') ? data.floor : '',
      area: (data.area !== null && data.area !== undefined && data.area !== 0 && data.area !== '') ? data.area : '',
      
      // פרטי שמאי
      shamayName: data.shamayName || '',
      shamaySerialNumber: data.shamaySerialNumber || '',
      
      // חתימה
      signature: data.signaturePreview || null
    })
  }, [data])

  const validateForm = useCallback(() => {
    const isValid = formData.valuationType.trim() !== '' && 
                   formData.clientName.trim() !== '' && 
                   formData.street.trim() !== '' && 
                   formData.buildingNumber.trim() !== '' && 
                   formData.city.trim() !== '' && 
                   formData.rooms > 0 && 
                   formData.floor > 0 && 
                   formData.area > 0 && 
                   formData.shamayName.trim() !== '' && 
                   formData.shamaySerialNumber.trim() !== '' &&
                   formData.signature !== null
    
    console.log('Validation check:', { isValid, formData })
    onValidationChange(isValid)
    return isValid
  }, [formData, onValidationChange])

  // Validate only when formData changes, not on every render
  useEffect(() => {
    validateForm()
  }, [validateForm])

  const updateField = useCallback((field: string, value: any) => {
    console.log(`🔄 Step1 - Updating field: ${field} = ${value}`)
    setFormData(prev => {
      const newData = { ...prev, [field]: value }
      
      // Critical fields that should save immediately:
      // - valuationType, valuationDate (required for document generation)
      // - signaturePreview (large base64, needs to be persisted)
      const criticalFields = ['valuationType', 'valuationDate', 'signaturePreview']
      const shouldSaveImmediately = criticalFields.includes(field)
      
      // Skip auto-save for text inputs - only save on step navigation or explicit save
      // BUT save immediately for critical fields
      updateData(newData as any, { skipAutoSave: !shouldSaveImmediately } as any)
      
      if (shouldSaveImmediately) {
        console.log(`💾 Step1 - Critical field ${field} saved immediately`)
      } else {
        console.log(`✅ Step1 - Updated data (no auto-save):`, newData)
      }
      
      return newData
    })
  }, [updateData])


  const handleSignatureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('אנא בחר קובץ תמונה בלבד')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('גודל הקובץ חייב להיות קטן מ-5MB')
      return
    }

    setSignatureUploading(true)

    try {
      // Convert to base64
      const reader = new FileReader()
      reader.onload = (e) => {
        const base64 = e.target?.result as string
        // Save as signaturePreview to match DocumentContent component
        // This will trigger immediate save because signaturePreview is a critical field
        updateField('signaturePreview', base64)
        setFormData(prev => ({ ...prev, signature: base64 }))
        setSignatureUploading(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error uploading signature:', error)
      alert('שגיאה בהעלאת החתימה')
      setSignatureUploading(false)
    }
  }

  const removeSignature = () => {
    updateField('signaturePreview', null)
    setFormData(prev => ({ ...prev, signature: null }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-right">
          פרטי הנכס והזמנת השומה
        </h2>
        <p className="text-gray-600 text-right">
          הזן את כל הפרטים הנדרשים לשומה מקיפה
        </p>
      </div>

      <div className="space-y-8">
        {/* סוג שומה ומועד כתיבתה */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">סוג שומה ומועד כתיבתה</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                סוג השומה *
              </label>
              <select
                name="valuationType"
                value={formData.valuationType}
                onChange={(e) => updateField('valuationType', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                dir="rtl"
              >
                <option value="">בחר סוג שומה</option>
                <option value="שווי שוק">שווי שוק</option>
                <option value="שווי השקעה">שווי השקעה</option>
                <option value="שווי ביטוח">שווי ביטוח</option>
                <option value="שווי מס">שווי מס"</option>
                <option value="שווי הפקעה">שווי הפקעה</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                מועד כתיבת השומה *
              </label>
              <input
                type="date"
                name="valuationDate"
                autoComplete="off"
                value={formData.valuationDate}
                onChange={(e) => updateField('valuationDate', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* זהות מזמין השומה והקשר שלו לנכס */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">זהות מזמין השומה והקשר שלו לנכס</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                שם מלא *
              </label>
              <input
                type="text"
                name="clientName"
                autoComplete="name"
                value={formData.clientName}
                onChange={(e) => updateField('clientName', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="הזן שם מלא"
                dir="rtl"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                הקשר לנכס
              </label>
              <select
                name="clientRelation"
                value={formData.clientRelation}
                onChange={(e) => updateField('clientRelation', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                dir="rtl"
              >
                <option value="">בחר הקשר לנכס</option>
                <option value="owner">בעלים</option>
                <option value="buyer">רוכש פוטנציאלי</option>
                <option value="seller">מוכר</option>
                <option value="bank">בנק</option>
                <option value="court">בית משפט</option>
                <option value="other">אחר</option>
              </select>
            </div>
          </div>
        </div>


        {/* המועד הקובע לשומה */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">המועד הקובע לשומה</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
              המועד הקובע לשומה *
            </label>
            <input
              type="date"
              name="valuationEffectiveDate"
              autoComplete="off"
              value={formData.valuationEffectiveDate}
              onChange={(e) => updateField('valuationEffectiveDate', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* זיהוי הנכס */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">זיהוי הנכס</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                רחוב *
              </label>
              <input
                type="text"
                name="street"
                autoComplete="address-line1"
                value={formData.street}
                onChange={(e) => updateField('street', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="הזן שם רחוב"
                dir="rtl"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                מספר בניין *
              </label>
              <input
                type="text"
                name="buildingNumber"
                autoComplete="address-line2"
                value={formData.buildingNumber}
                onChange={(e) => updateField('buildingNumber', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="הזן מספר בניין"
                dir="rtl"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                שכונה (אופציונלי)
              </label>
              <input
                type="text"
                name="neighborhood"
                autoComplete="address-level2"
                value={formData.neighborhood}
                onChange={(e) => updateField('neighborhood', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="הזן שם שכונה (אופציונלי)"
                dir="rtl"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                עיר *
              </label>
              <input
                type="text"
                name="city"
                autoComplete="address-level1"
                value={formData.city}
                onChange={(e) => updateField('city', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="הזן שם עיר"
                dir="rtl"
              />
            </div>

          </div>
        </div>

        {/* תיאור הנכס והסביבה */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">תיאור הנכס והסביבה</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                מספר חדרים *
              </label>
              <input
                type="number"
                name="rooms"
                autoComplete="off"
                min="0"
                max="99"
                value={formData.rooms === '' || formData.rooms === 0 ? '' : formData.rooms}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : parseInt(e.target.value)
                  updateField('rooms', val)
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="הזן מספר חדרים"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                קומה *
              </label>
              <input
                type="number"
                name="floor"
                autoComplete="off"
                min="0"
                max="99"
                value={formData.floor === '' || formData.floor === 0 ? '' : formData.floor}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : parseInt(e.target.value)
                  updateField('floor', val)
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="הזן מספר קומה"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                שטח (מ"ר) *
              </label>
              <input
                type="number"
                name="area"
                autoComplete="off"
                min="0"
                step="0.1"
                value={formData.area === '' || formData.area === 0 ? '' : formData.area}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : parseFloat(e.target.value)
                  updateField('area', val)
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="הזן שטח"
              />
            </div>
          </div>
        </div>

        {/* פרטי שמאי */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">פרטי שמאי</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                שם השמאי *
              </label>
              <input
                type="text"
                name="shamayName"
                autoComplete="name"
                value={formData.shamayName}
                onChange={(e) => updateField('shamayName', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="הזן שם מלא של השמאי"
                dir="rtl"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                מספר רישיון שמאי *
              </label>
              <input
                type="text"
                name="shamaySerialNumber"
                autoComplete="off"
                value={formData.shamaySerialNumber}
                onChange={(e) => updateField('shamaySerialNumber', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="הזן מספר רישיון"
                dir="rtl"
              />
            </div>

          </div>
        </div>

        {/* חתימת השמאי */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">חתימת השמאי *</h3>
          
          <div className="space-y-4">
            {formData.signature ? (
              <div className="text-center">
                <div className="mb-4">
                  <img 
                    src={formData.signature} 
                    alt="חתימת שמאי" 
                    className="max-w-xs mx-auto border border-gray-300 rounded-lg shadow-sm"
                  />
            </div>
                <div className="flex gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    החלף חתימה
                  </button>
                  <button
                    type="button"
                    onClick={removeSignature}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  >
                    הסר חתימה
                  </button>
            </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                  <div className="text-gray-500 mb-4">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  </div>
                  <p className="text-gray-600 mb-4">העלה תמונת חתימה</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={signatureUploading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {signatureUploading ? 'מעלה...' : 'בחר קובץ'}
                  </button>
                </div>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleSignatureUpload}
              className="hidden"
            />
            
            <p className="text-xs text-gray-500 text-center">
              פורמטים נתמכים: JPG, PNG, GIF. גודל מקסימלי: 5MB
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}