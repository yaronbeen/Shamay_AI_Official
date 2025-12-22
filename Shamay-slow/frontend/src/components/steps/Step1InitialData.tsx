'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'

interface Step1InitialDataProps {
  data: any
  updateData: (updates: Partial<any>, options?: { skipAutoSave?: boolean }) => void
  onValidationChange: (isValid: boolean) => void
}

const DATE_FIELDS = new Set(['valuationDate', 'valuationEffectiveDate'])

const normalizeDateToISO = (dateStr: string) => {
  if (!dateStr) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr
  }
  const dotMatch = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (dotMatch) {
    const [, day, month, year] = dotMatch
    return `${year}-${month}-${day}`
  }
  const slashMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (slashMatch) {
    const [, day, month, year] = slashMatch
    return `${year}-${month}-${day}`
  }
  return ''
}

const formatDateForDisplay = (dateStr: string) => {
  const iso = normalizeDateToISO(dateStr)
  if (!iso) return ''
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}

export function Step1InitialData({ data, updateData, onValidationChange }: Step1InitialDataProps) {
  const [formData, setFormData] = useState({
    // סוג שומה ומועד כתיבתה
    valuationType: data.valuationType || '',
    valuationDate: normalizeDateToISO(data.valuationDate) || '',
    
    // זהות מזמין השומה והקשר שלו לנכס
    clientName: data.clientName || '',
    clientRelation: data.clientRelation || '',
    
    // המועד הקובע לשומה
    valuationEffectiveDate: normalizeDateToISO(data.valuationEffectiveDate) || '',
    
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
    shamaySerialNumber: data.shamaySerialNumber || ''
  })

  console.log('Validation check:',  data )

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
      valuationDate: normalizeDateToISO(data.valuationDate) || '',
      
      // זהות מזמין השומה והקשר שלו לנכס
      clientName: data.clientName || '',
      clientRelation: data.clientRelation || '',
      
      // המועד הקובע לשומה
      valuationEffectiveDate: normalizeDateToISO(data.valuationEffectiveDate) || '',
      
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
      shamaySerialNumber: data.shamaySerialNumber || ''
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
                   formData.shamaySerialNumber.trim() !== ''
    
    console.log('Validation check:', { isValid, formData })
    return isValid
  }, [formData])

  // CRITICAL: Use ref to prevent infinite loops - track last validation state
  const lastValidationStateRef = useRef<boolean | null>(null)
  
  // Validate only when formData changes and update validation if it changed
  useEffect(() => {
    const isValid = validateForm()
    // Only call onValidationChange if validation state actually changed
    if (lastValidationStateRef.current !== isValid) {
      onValidationChange(isValid)
      lastValidationStateRef.current = isValid
    }
  }, [formData]) // Only depend on formData, not onValidationChange or validateForm

  const updateField = useCallback((field: string, value: any) => {
    console.log(`🔄 Step1 - Updating field: ${field} = ${value}`)
    setFormData(prev => {
      const newData = { ...prev, [field]: value }

      const payload: Record<string, any> = { ...newData }
      // For date fields, the value is already in ISO format from the date input
      // No need to normalize again
      
      // Critical fields that should save immediately:
      // - valuationType, valuationDate (required for document generation)
      const criticalFields = ['valuationType', 'valuationDate']
      const shouldSaveImmediately = criticalFields.includes(field)
      
      // Skip auto-save for text inputs - only save on step navigation or explicit save
      // BUT save immediately for critical fields
      updateData(payload as any, { skipAutoSave: !shouldSaveImmediately } as any)
      
      if (shouldSaveImmediately) {
        console.log(`💾 Step1 - Critical field ${field} saved immediately`)
      } else {
        console.log(`✅ Step1 - Updated data (no auto-save):`, newData)
      }
      
      return newData
    })
  }, [updateData])


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

        {/* Note about signature */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            💡 <strong>חתימת שמאי:</strong> ניתן להעלות חתימת שמאי קבועה בהגדרות הארגון. החתימה תופיע בכל הדוחות שיוצאו.
          </p>
        </div>
      </div>
    </div>
  )
}