/**
 * QC Validation Engine for Shamay.AI Valuation Reports
 * Implements all blocking/warning/info rules as pure functions
 */

export interface QCRule {
  severity: 'block' | 'warn' | 'info'
  message_he: string
  fieldRefs: string[]
  check: (data: any) => boolean
}

export interface QCResult {
  rule: QCRule
  passed: boolean
  details?: string
}

// Helper functions
const isDateValid = (dateStr: string): boolean => {
  if (!dateStr) return false
  const pattern = /^\d{2}\.\d{2}\.\d{4}$/
  if (!pattern.test(dateStr)) return false
  
  const [day, month, year] = dateStr.split('.').map(Number)
  const date = new Date(year, month - 1, day)
  const today = new Date()
  
  return date <= today && date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year
}

const isDateBeforeToday = (dateStr: string): boolean => {
  if (!isDateValid(dateStr)) return false
  const [day, month, year] = dateStr.split('.').map(Number)
  const date = new Date(year, month - 1, day)
  const today = new Date()
  today.setHours(23, 59, 59, 999) // End of today
  return date <= today
}

const calculateAreaDifference = (area1: number, area2: number): number => {
  if (!area1 || !area2) return 0
  return Math.abs(area1 - area2) / Math.max(area1, area2) * 100
}

// QC Rules Implementation
export const QC_RULES: QCRule[] = [
  // COVER & OPENING PAGE RULES
  {
    severity: 'block',
    message_he: 'שם מזמין חובה',
    fieldRefs: ['שם_מזמין'],
    check: (data) => !!(data.שם_מזמין && data.שם_מזמין.length >= 2)
  },
  {
    severity: 'block', 
    message_he: 'מועד ביקור חייב להיות ≤ היום',
    fieldRefs: ['מועד_ביקור'],
    check: (data) => isDateBeforeToday(data.מועד_ביקור)
  },
  {
    severity: 'block',
    message_he: 'תאריך קובע חייב ≤ היום',
    fieldRefs: ['תאריך_קובע'],
    check: (data) => isDateBeforeToday(data.תאריך_קובע)
  },
  {
    severity: 'block',
    message_he: 'גוש חובה',
    fieldRefs: ['גוש'],
    check: (data) => !!(data.גוש && /^\d+$/.test(data.גוש))
  },
  {
    severity: 'block',
    message_he: 'חלקה חובה',
    fieldRefs: ['חלקה'],
    check: (data) => !!(data.חלקה && /^\d+$/.test(data.חלקה))
  },
  {
    severity: 'block',
    message_he: 'תת חלקה חובה',
    fieldRefs: ['תת'],
    check: (data) => !!(data.תת && /^\d+$/.test(data.תת))
  },
  {
    severity: 'block',
    message_he: 'שטח רשום חובה',
    fieldRefs: ['שטח_רשום'],
    check: (data) => !!(data.שטח_רשום && data.שטח_רשום > 0)
  },

  // SECTION 1 RULES
  {
    severity: 'warn',
    message_he: 'תיאור סביבה חייב להיות 120-250 מילים',
    fieldRefs: ['תיאור_סביבה'],
    check: (data) => {
      if (!data.תיאור_סביבה) return false
      const wordCount = data.תיאור_סביבה.split(/\s+/).length
      return wordCount >= 120 && wordCount <= 250
    }
  },
  {
    severity: 'warn',
    message_he: 'תיאור סביבה חייב להזכיר שנת ייסוד שכונה',
    fieldRefs: ['תיאור_סביבה'],
    check: (data) => {
      if (!data.תיאור_סביבה) return false
      return /\d{4}/.test(data.תיאור_סביבה)
    }
  },
  {
    severity: 'block',
    message_he: 'חלוקה פנימית חובה - לפחות 3 חללים',
    fieldRefs: ['חלוקה_פנימית'],
    check: (data) => {
      if (!data.חלוקה_פנימית || !Array.isArray(data.חלוקה_פנימית)) return false
      return data.חלוקה_פנימית.length >= 3
    }
  },
  {
    severity: 'warn',
    message_he: 'סטנדרט גמר Basic דורש הסבר',
    fieldRefs: ['סטנדרט_גמר', 'הסבר_סטנדרט'],
    check: (data) => {
      if (data.סטנדרט_גמר !== 'Basic') return true
      return !!(data.הסבר_סטנדרט && data.הסבר_סטנדרט.length >= 15)
    }
  },

  // SECTION 2 RULES
  {
    severity: 'block',
    message_he: 'בעלות אחת לפחות חובה',
    fieldRefs: ['בעלויות'],
    check: (data) => {
      if (!data.בעלויות || !Array.isArray(data.בעלויות)) return false
      return data.בעלויות.length >= 1
    }
  },
  {
    severity: 'warn',
    message_he: 'תאריכים חייבים ≤ היום',
    fieldRefs: ['תאריך_נסח', 'תאריך_צו'],
    check: (data) => {
      const dates = [data.תאריך_נסח, data.תאריך_צו].filter(Boolean)
      return dates.every(date => isDateBeforeToday(date))
    }
  },

  // SECTION 3 RULES
  {
    severity: 'block',
    message_he: 'חובה להזין לפחות 5 תכניות',
    fieldRefs: ['תכניות'],
    check: (data) => {
      if (!data.תכניות || !Array.isArray(data.תכניות)) return false
      return data.תכניות.length >= 5
    }
  },
  {
    severity: 'warn',
    message_he: 'תאריך תכנית עתידי דורש אישור Admin',
    fieldRefs: ['תכניות'],
    check: (data) => {
      if (!data.תכניות || !Array.isArray(data.תכניות)) return true
      return data.תכניות.every((plan: any) => isDateBeforeToday(plan.תאריך))
    }
  },
  {
    severity: 'block',
    message_he: 'שדות זכויות בנייה חובה',
    fieldRefs: ['זכויות_בניה'],
    check: (data) => {
      if (!data.זכויות_בניה) return false
      const rights = data.זכויות_בניה
      return !!(rights.יעוד && rights.שטח_מגרש && rights.מספר_קומות)
    }
  },
  {
    severity: 'warn',
    message_he: 'אחוזי בנייה > 800 דורש אישור שמאי בכיר',
    fieldRefs: ['זכויות_בניה'],
    check: (data) => {
      if (!data.זכויות_בניה || !data.זכויות_בניה.אחוזי_בניה) return true
      return data.זכויות_בניה.אחוזי_בניה <= 800
    }
  },
  {
    severity: 'block',
    message_he: 'היתר אחד לפחות עם מספר + תאריך חובה',
    fieldRefs: ['היתרים'],
    check: (data) => {
      if (!data.היתרים || !Array.isArray(data.היתרים)) return false
      return data.היתרים.some((permit: any) => permit.מספר && permit.תאריך)
    }
  },
  {
    severity: 'warn',
    message_he: 'תאריך היתר עתידי דורש אישור Admin',
    fieldRefs: ['היתרים'],
    check: (data) => {
      if (!data.היתרים || !Array.isArray(data.היתרים)) return true
      return data.היתרים.every((permit: any)  => isDateBeforeToday(permit.תאריך))
    }
  },
  {
    severity: 'block',
    message_he: 'פירוט זיהום חובה אם חשד זיהום = כן',
    fieldRefs: ['חשד_זיהום', 'פירוט_זיהום'],
    check: (data) => {
      if (!data.חשד_זיהום) return true
      return !!(data.פירוט_זיהום && data.פירוט_זיהום.length >= 4)
    }
  },

  // SECTION 4 RULES
  {
    severity: 'warn',
    message_he: 'Override ידני דורש הסבר (≥15 תווים)',
    fieldRefs: ['גורמים_שיקולים'],
    check: (data) => {
      if (!data.גורמים_שיקולים || !data.גורמים_שיקולים.override) return true
      return !!(data.גורמים_שיקולים.סיבת_override && data.גורמים_שיקולים.סיבת_override.length >= 15)
    }
  },

  // SECTION 5 RULES
  {
    severity: 'block',
    message_he: 'לפחות 3 עסקאות השוואה חובה',
    fieldRefs: ['עסקאות'],
    check: (data) => {
      if (!data.עסקאות || !Array.isArray(data.עסקאות)) return false
      return data.עסקאות.length >= 3
    }
  },
  {
    severity: 'block',
    message_he: 'לפחות 2 נכסי היצע חובה',
    fieldRefs: ['היצע'],
    check: (data) => {
      if (!data.היצע || !Array.isArray(data.היצע)) return false
      return data.היצע.length >= 2
    }
  },

  // SECTION 6 RULES
  {
    severity: 'block',
    message_he: 'חותמת PNG חובה (35×35 מ"מ)',
    fieldRefs: ['חותמת'],
    check: (data) => {
      return !!(data.חותמת && data.חותמת.length > 0)
    }
  },

  // CROSS-CHECK RULES
  {
    severity: 'warn',
    message_he: 'סטיית ≤ 2% בין שטח רשום ↔ בנוי',
    fieldRefs: ['שטח_רשום', 'שטח_בנוי'],
    check: (data) => {
      if (!data.שטח_רשום || !data.שטח_בנוי) return true
      const diff = calculateAreaDifference(data.שטח_רשום, data.שטח_בנוי)
      return diff <= 2
    }
  },
  {
    severity: 'warn',
    message_he: 'זכויות חייבות להיות עקביות בין נסח לצו',
    fieldRefs: ['זכויות', 'זכויות_צו'],
    check: (data) => {
      if (!data.זכויות || !data.זכויות_צו) return true
      return data.זכויות === data.זכויות_צו
    }
  },
  {
    severity: 'warn',
    message_he: 'שנת היתר ≤ שנת בניה + 3 שנים',
    fieldRefs: ['שנת_בניה', 'היתר_עדכני'],
    check: (data) => {
      if (!data.שנת_בניה || !data.היתר_עדכני || !data.היתר_עדכני.תאריך) return true
      const [day, month, year] = data.היתר_עדכני.תאריך.split('.').map(Number)
      const permitYear = year
      return permitYear <= data.שנת_בניה + 3
    }
  }
]

// Main validation function
export function validateReport(data: any): QCResult[] {
  const results: QCResult[] = []
  
  for (const rule of QC_RULES) {
    try {
      const passed = rule.check(data)
      results.push({
        rule,
        passed,
        details: passed ? undefined : `Failed: ${rule.message_he}`
      })
    } catch (error) {
      results.push({
        rule,
        passed: false,
        details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }
  
  return results
}

// Helper functions for specific validations
export function getBlockingIssues(data: any): QCResult[] {
  const results = validateReport(data)
  return results.filter(result => !result.passed && result.rule.severity === 'block')
}

export function getWarnings(data: any): QCResult[] {
  const results = validateReport(data)
  return results.filter(result => !result.passed && result.rule.severity === 'warn')
}

export function getInfo(data: any): QCResult[] {
  const results = validateReport(data)
  return results.filter(result => !result.passed && result.rule.severity === 'info')
}

export function canSignReport(data: any): boolean {
  const blockingIssues = getBlockingIssues(data)
  return blockingIssues.length === 0
}

export function getQCSummary(data: any): {
  canSign: boolean
  blocking: number
  warnings: number
  info: number
  total: number
} {
  const results = validateReport(data)
  const blocking = results.filter(r => !r.passed && r.rule.severity === 'block').length
  const warnings = results.filter(r => !r.passed && r.rule.severity === 'warn').length
  const info = results.filter(r => !r.passed && r.rule.severity === 'info').length
  
  return {
    canSign: blocking === 0,
    blocking,
    warnings,
    info,
    total: results.length
  }
}
