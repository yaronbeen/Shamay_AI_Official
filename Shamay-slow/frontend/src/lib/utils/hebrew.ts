import dayjs from 'dayjs'
import 'dayjs/locale/he'

dayjs.locale('he')

/**
 * Format date as Hebrew (dd.mm.yyyy)
 * Example: 15.03.2024
 */
export function formatDateHebrew(date: string | Date): string {
  const d = new Date(date)
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const year = d.getFullYear()
  return `${day}.${month}.${year}`
}

/**
 * Format date as Hebrew long format
 * Example: 15 במרץ 2024
 */
export function formatDateHebrewLong(date: string | Date): string {
  return new Date(date).toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Format currency in Israeli Shekels
 * Example: ₪1,234,567
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

/**
 * Format number with Hebrew thousand separators
 * Example: 1,234,567
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('he-IL').format(num)
}

/**
 * Round to nearest thousand
 * Example: 1,234,567 → 1,235,000
 */
export function roundToThousand(num: number): number {
  return Math.ceil(num / 1000) * 1000
}

/**
 * Convert number to Hebrew text
 * Example: 1,234,567 → "מיליון ומאתיים ושלושים וארבעה אלף וחמש מאות ושישים ושבעה"
 */
export function numberToHebrewText(num: number): string {
  if (num === 0) return 'אפס'
  if (num < 0) return 'מינוס ' + numberToHebrewText(-num)
  if (num > 999999999999) return 'מספר גדול מדי'

  const ones = ['', 'אחד', 'שניים', 'שלושה', 'ארבעה', 'חמישה', 'שישה', 'שבעה', 'שמונה', 'תשעה']
  const tens = ['', 'עשרה', 'עשרים', 'שלושים', 'ארבעים', 'חמישים', 'שישים', 'שבעים', 'שמונים', 'תשעים']
  const hundreds = ['', 'מאה', 'מאתיים', 'שלוש מאות', 'ארבע מאות', 'חמש מאות', 'שש מאות', 'שבע מאות', 'שמונה מאות', 'תשע מאות']
  
  const thousands = ['', 'אלף', 'אלפיים', 'שלושת אלפים', 'ארבעת אלפים', 'חמשת אלפים', 'ששת אלפים', 'שבעת אלפים', 'שמונת אלפים', 'תשעת אלפים']
  const tenThousands = ['', 'עשרת אלפים', 'עשרים אלף', 'שלושים אלף', 'ארבעים אלף', 'חמישים אלף', 'שישים אלף', 'שבעים אלף', 'שמונים אלף', 'תשעים אלף']
  const hundredThousands = ['', 'מאה אלף', 'מאתיים אלף', 'שלוש מאות אלף', 'ארבע מאות אלף', 'חמש מאות אלף', 'שש מאות אלף', 'שבע מאות אלף', 'שמונה מאות אלף', 'תשע מאות אלף']
  
  const millions = ['', 'מיליון', 'שני מיליונים', 'שלושה מיליונים', 'ארבעה מיליונים', 'חמישה מיליונים', 'שישה מיליונים', 'שבעה מיליונים', 'שמונה מיליונים', 'תשעה מיליונים']
  const tenMillions = ['', 'עשרה מיליונים', 'עשרים מיליון', 'שלושים מיליון', 'ארבעים מיליון', 'חמישים מיליון', 'שישים מיליון', 'שבעים מיליון', 'שמונים מיליון', 'תשעים מיליון']
  const hundredMillions = ['', 'מאה מיליון', 'מאתיים מיליון', 'שלוש מאות מיליון', 'ארבע מאות מיליון', 'חמש מאות מיליון', 'שש מאות מיליון', 'שבע מאות מיליון', 'שמונה מאות מיליון', 'תשע מאות מיליון']
  
  const billions = ['', 'מיליארד', 'שני מיליארדים', 'שלושה מיליארדים']

  let result = ''
  
  // Billions
  if (num >= 1000000000) {
    const billionsPart = Math.floor(num / 1000000000)
    result += billions[billionsPart] + ' ו'
    num %= 1000000000
  }
  
  // Hundred Millions
  if (num >= 100000000) {
    const hundredMillionsPart = Math.floor(num / 100000000)
    result += hundredMillions[hundredMillionsPart] + ' ו'
    num %= 100000000
  }
  
  // Ten Millions
  if (num >= 10000000) {
    const tenMillionsPart = Math.floor(num / 10000000)
    result += tenMillions[tenMillionsPart] + ' ו'
    num %= 10000000
  }
  
  // Millions
  if (num >= 1000000) {
    const millionsPart = Math.floor(num / 1000000)
    result += millions[millionsPart] + ' ו'
    num %= 1000000
  }
  
  // Hundred Thousands
  if (num >= 100000) {
    const hundredThousandsPart = Math.floor(num / 100000)
    result += hundredThousands[hundredThousandsPart] + ' ו'
    num %= 100000
  }
  
  // Ten Thousands
  if (num >= 10000) {
    const tenThousandsPart = Math.floor(num / 10000)
    result += tenThousands[tenThousandsPart] + ' ו'
    num %= 10000
  }
  
  // Thousands
  if (num >= 1000) {
    const thousandsPart = Math.floor(num / 1000)
    result += thousands[thousandsPart] + ' ו'
    num %= 1000
  }
  
  // Hundreds
  if (num >= 100) {
    const hundredsPart = Math.floor(num / 100)
    result += hundreds[hundredsPart] + ' ו'
    num %= 100
  }
  
  // Tens and Ones
  if (num >= 20) {
    const tensPart = Math.floor(num / 10)
    const onesPart = num % 10
    result += tens[tensPart]
    if (onesPart > 0) {
      result += ' ו' + ones[onesPart]
    }
  } else if (num >= 10) {
    result += 'עשרה'
  } else if (num > 0) {
    result += ones[num]
  }
  
  // Clean up trailing "ו"
  return result.replace(/\sו$/, '').trim()
}

/**
 * Validate that date is not in the future
 */
export function isNotFutureDate(date: string | Date): boolean {
  const inputDate = new Date(date)
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  return inputDate <= today
}

/**
 * Calculate equivalent area (Built + Balcony × 0.5)
 */
export function calculateEquivalentArea(builtArea: number, balconyArea: number = 0): number {
  return builtArea + (balconyArea * 0.5)
}
