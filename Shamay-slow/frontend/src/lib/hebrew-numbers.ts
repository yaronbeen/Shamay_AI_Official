/**
 * Hebrew Number Conversion Utility
 * Converts numbers to Hebrew text for professional documents
 */

export interface HebrewNumberOptions {
  gender?: 'masculine' | 'feminine'
  currency?: boolean
  ordinal?: boolean
}

export class HebrewNumberConverter {
  private static readonly ones = [
    '', 'אחד', 'שניים', 'שלושה', 'ארבעה', 'חמישה', 'שישה', 'שבעה', 'שמונה', 'תשעה'
  ]

  private static readonly onesFeminine = [
    '', 'אחת', 'שתיים', 'שלוש', 'ארבע', 'חמש', 'שש', 'שבע', 'שמונה', 'תשע'
  ]

  private static readonly tens = [
    '', 'עשרה', 'עשרים', 'שלושים', 'ארבעים', 'חמישים', 'שישים', 'שבעים', 'שמונים', 'תשעים'
  ]

  private static readonly hundreds = [
    '', 'מאה', 'מאתיים', 'שלוש מאות', 'ארבע מאות', 'חמש מאות', 'שש מאות', 'שבע מאות', 'שמונה מאות', 'תשע מאות'
  ]

  private static readonly thousands = [
    '', 'אלף', 'אלפיים', 'שלושת אלפים', 'ארבעת אלפים', 'חמשת אלפים', 'ששת אלפים', 'שבעת אלפים', 'שמונת אלפים', 'תשעת אלפים'
  ]

  private static readonly millions = [
    '', 'מיליון', 'שני מיליונים', 'שלושה מיליונים', 'ארבעה מיליונים', 'חמישה מיליונים', 'שישה מיליונים', 'שבעה מיליונים', 'שמונה מיליונים', 'תשעה מיליונים'
  ]

  /**
   * Convert number to Hebrew text
   */
  static convert(num: number, options: HebrewNumberOptions = {}): string {
    const { gender = 'masculine', currency = false, ordinal = false } = options

    if (num === 0) return 'אפס'
    if (num < 0) return 'מינוס ' + this.convert(-num, options)
    if (num > 999999999) return 'מספר גדול מדי להמרה אוטומטית'

    let result = ''
    const onesArray = gender === 'feminine' ? this.onesFeminine : this.ones
    
    // Millions
    if (num >= 1000000) {
      const millionsPart = Math.floor(num / 1000000)
      result += this.millions[millionsPart] + ' '
      num %= 1000000
    }
    
    // Thousands
    if (num >= 1000) {
      const thousandsPart = Math.floor(num / 1000)
      result += this.thousands[thousandsPart] + ' '
      num %= 1000
    }
    
    // Hundreds
    if (num >= 100) {
      const hundredsPart = Math.floor(num / 100)
      result += this.hundreds[hundredsPart] + ' '
      num %= 100
    }
    
    // Tens and ones
    if (num >= 20) {
      const tensPart = Math.floor(num / 10)
      const onesPart = num % 10
      result += this.tens[tensPart]
      if (onesPart > 0) {
        result += ' ו' + onesArray[onesPart]
      }
    } else if (num >= 10) {
      result += this.tens[num - 10]
    } else if (num > 0) {
      result += onesArray[num]
    }
    
    // Add currency suffix
    if (currency) {
      result += ' שקל'
    }
    
    // Add ordinal suffix
    if (ordinal) {
      result += 'י'
    }
    
    return result.trim()
  }

  /**
   * Convert currency amount to Hebrew text
   */
  static convertCurrency(amount: number): string {
    return this.convert(amount, { currency: true })
  }

  /**
   * Convert ordinal number to Hebrew text
   */
  static convertOrdinal(num: number): string {
    return this.convert(num, { ordinal: true })
  }

  /**
   * Format number with Hebrew text in parentheses
   */
  static formatWithHebrew(num: number, options: HebrewNumberOptions = {}): string {
    return `(${this.convert(num, options)})`
  }
}
