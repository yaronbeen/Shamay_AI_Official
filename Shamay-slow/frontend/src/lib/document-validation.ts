/**
 * Validation functions for valuation document fields
 * Validates critical fields according to TA mapping requirements
 */

import { ValuationData } from '../components/ValuationWizard'

export interface ValidationResult {
  isValid: boolean
  errors: Array<{
    field: string
    message: string
    taId?: string
  }>
  warnings: Array<{
    field: string
    message: string
    taId?: string
  }>
}

/**
 * Validate critical fields for valuation document
 */
export function validateValuationData(data: ValuationData): ValidationResult {
  const errors: ValidationResult['errors'] = []
  const warnings: ValidationResult['warnings'] = []

  // TA3-TA6: Address fields (Critical)
  if (!data.street || data.street.trim() === '') {
    errors.push({ field: 'street', message: 'רחוב הוא שדה חובה', taId: 'TA3' })
  }
  if (!data.buildingNumber || data.buildingNumber.trim() === '') {
    errors.push({ field: 'buildingNumber', message: 'מספר בניין הוא שדה חובה', taId: 'TA4' })
  }
  if (!data.city || data.city.trim() === '') {
    errors.push({ field: 'city', message: 'עיר היא שדה חובה', taId: 'TA6' })
  }

  // TA12: Reference Number (Critical)
  if (!data.referenceNumber || data.referenceNumber.trim() === '') {
    warnings.push({ field: 'referenceNumber', message: 'סימוכין/מספר שומה - מומלץ למלא', taId: 'TA12' })
  }

  // TA13: Valuation Type (Critical)
  if (!data.valuationType || data.valuationType.trim() === '') {
    errors.push({ field: 'valuationType', message: 'סוג שומה הוא שדה חובה', taId: 'TA13' })
  }

  // TA10: Client Name (Critical)
  if (!data.clientName || data.clientName.trim() === '') {
    errors.push({ field: 'clientName', message: 'מזמין חוות הדעת הוא שדה חובה', taId: 'TA10' })
  }

  // TA11: Valuation Date (Critical)
  if (!data.valuationDate) {
    errors.push({ field: 'valuationDate', message: 'תאריך כתיבת השומה הוא שדה חובה', taId: 'TA11' })
  } else {
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(data.valuationDate)) {
      warnings.push({ field: 'valuationDate', message: 'תאריך כתיבת השומה - פורמט מומלץ: YYYY-MM-DD', taId: 'TA11' })
    }
  }

  // TA20: Visit Date (Critical)
  const visitDate =
    data.valuationEffectiveDate ||
    (data as any).visitDate ||
    ''

  if (!visitDate) {
    errors.push({ field: 'valuationEffectiveDate', message: 'תאריך ביקור הנכס הוא שדה חובה', taId: 'TA20' })
  } else {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(visitDate)) {
      warnings.push({ field: 'valuationEffectiveDate', message: 'תאריך ביקור הנכס - פורמט מומלץ: YYYY-MM-DD', taId: 'TA20' })
    }
  }

  // TA24-TA26: Gush, Chelka, Sub-Parcel (Critical)
  if (!data.extractedData?.gush && !data.gush) {
    errors.push({ field: 'gush', message: 'גוש הוא שדה חובה', taId: 'TA24' })
  }
  if (!data.extractedData?.chelka && !data.parcel) {
    errors.push({ field: 'chelka', message: 'חלקה היא שדה חובה', taId: 'TA25' })
  }
  if (!data.extractedData?.sub_chelka && !data.extractedData?.subChelka && !data.subParcel) {
    errors.push({ field: 'subParcel', message: 'תת חלקה היא שדה חובה', taId: 'TA26' })
  }

  // TA27: Registered Area (Critical)
  if (!(data as any).registeredArea && !data.extractedData?.apartment_registered_area && !data.extractedData?.apartmentRegisteredArea) {
    errors.push({ field: 'registeredArea', message: 'שטח דירה רשום הוא שדה חובה', taId: 'TA27' })
  }

  // TA28: Built Area (Warning - can be calculated)
  if (!data.extractedData?.builtArea && !data.builtArea) {
    warnings.push({ field: 'builtArea', message: 'שטח דירה בנוי - מומלץ למלא או לחשב ממערך', taId: 'TA28' })
  }

  // TA23: Property Essence (Critical)
  if (!data.propertyEssence || data.propertyEssence.trim() === '') {
    errors.push({ field: 'propertyEssence', message: 'מהות הנכס היא שדה חובה', taId: 'TA23' })
  }

  // TA32-TA33: Shamay Name and License (Critical)
  if (!data.shamayName || data.shamayName.trim() === '') {
    errors.push({ field: 'shamayName', message: 'שם השמאי הוא שדה חובה' })
  }
  if (!data.shamaySerialNumber || data.shamaySerialNumber.trim() === '') {
    errors.push({ field: 'shamaySerialNumber', message: 'מספר רישיון שמאי הוא שדה חובה' })
  }

  // Validate number formats
  if (data.rooms !== undefined && data.rooms !== null && (isNaN(Number(data.rooms)) || Number(data.rooms) <= 0)) {
    warnings.push({ field: 'rooms', message: 'מספר חדרים - ערך לא תקין' })
  }

  if (data.floor !== undefined && data.floor !== null && isNaN(Number(data.floor))) {
    warnings.push({ field: 'floor', message: 'קומה - ערך לא תקין' })
  }

  // Validate final valuation if exists
  if ((data as any).finalValuation !== undefined && (data as any).finalValuation !== null) {
    const finalValue = Number((data as any).finalValuation)
    if (isNaN(finalValue) || finalValue <= 0) {
      warnings.push({ field: 'finalValuation', message: 'שווי סופי - ערך לא תקין' })
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Format date to DD.MM.YYYY format
 */
export function formatDateDDMMYYYY(dateString: string): string {
  if (!dateString) return ''
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString
    
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    
    return `${day}.${month}.${year}`
  } catch {
    return dateString
  }
}

/**
 * Format number with thousands separator
 */
export function formatNumberWithSeparator(num: number | string | null | undefined): string {
  if (num === null || num === undefined) return ''
  
  const numValue = typeof num === 'string' ? parseFloat(num) : num
  if (isNaN(numValue)) return ''
  
  return numValue.toLocaleString('he-IL')
}

