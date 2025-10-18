/**
 * QC Validation Tests for Shamay.AI Valuation Reports
 * Tests covering every rule (red/amber/green)
 */

import { describe, it, expect } from 'vitest'
import { validateReport, getBlockingIssues, getWarnings, canSignReport, getQCSummary } from './rules'

describe('QC Validation Engine', () => {
  describe('Cover & Opening Page Rules', () => {
    it('should block when שם_מזמין is missing', () => {
      const data = { מועד_ביקור: '15.07.2025', גוש: '123', חלקה: '456', תת: '789', שטח_רשום: 100 }
      const results = getBlockingIssues(data)
      expect(results.some(r => r.rule.fieldRefs.includes('שם_מזמין'))).toBe(true)
    })

    it('should block when שם_מזמין is too short', () => {
      const data = { שם_מזמין: 'א', מועד_ביקור: '15.07.2025', גוש: '123', חלקה: '456', תת: '789', שטח_רשום: 100 }
      const results = getBlockingIssues(data)
      expect(results.some(r => r.rule.fieldRefs.includes('שם_מזמין'))).toBe(true)
    })

    it('should pass when שם_מזמין is valid', () => {
      const data = { שם_מזמין: 'לי גולן', מועד_ביקור: '15.07.2025', גוש: '123', חלקה: '456', תת: '789', שטח_רשום: 100 }
      const results = getBlockingIssues(data)
      expect(results.some(r => r.rule.fieldRefs.includes('שם_מזמין'))).toBe(false)
    })

    it('should block when מועד_ביקור is in the future', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 1)
      const futureDateStr = futureDate.toLocaleDateString('he-IL').replace(/\//g, '.')
      
      const data = { שם_מזמין: 'לי גולן', מועד_ביקור: futureDateStr, גוש: '123', חלקה: '456', תת: '789', שטח_רשום: 100 }
      const results = getBlockingIssues(data)
      expect(results.some(r => r.rule.fieldRefs.includes('מועד_ביקור'))).toBe(true)
    })

    it('should pass when מועד_ביקור is today or past', () => {
      const today = new Date().toLocaleDateString('he-IL').replace(/\//g, '.')
      const data = { שם_מזמין: 'לי גולן', מועד_ביקור: today, גוש: '123', חלקה: '456', תת: '789', שטח_רשום: 100 }
      const results = getBlockingIssues(data)
      expect(results.some(r => r.rule.fieldRefs.includes('מועד_ביקור'))).toBe(false)
    })

    it('should block when גוש is missing', () => {
      const data = { שם_מזמין: 'לי גולן', מועד_ביקור: '15.07.2025', חלקה: '456', תת: '789', שטח_רשום: 100 }
      const results = getBlockingIssues(data)
      expect(results.some(r => r.rule.fieldRefs.includes('גוש'))).toBe(true)
    })

    it('should block when גוש is not numeric', () => {
      const data = { שם_מזמין: 'לי גולן', מועד_ביקור: '15.07.2025', גוש: 'abc', חלקה: '456', תת: '789', שטח_רשום: 100 }
      const results = getBlockingIssues(data)
      expect(results.some(r => r.rule.fieldRefs.includes('גוש'))).toBe(true)
    })

    it('should block when שטח_רשום is missing or zero', () => {
      const data = { שם_מזמין: 'לי גולן', מועד_ביקור: '15.07.2025', גוש: '123', חלקה: '456', תת: '789' }
      const results = getBlockingIssues(data)
      expect(results.some(r => r.rule.fieldRefs.includes('שטח_רשום'))).toBe(true)
    })
  })

  describe('Section 1 Rules', () => {
    it('should warn when תיאור_סביבה is too short', () => {
      const data = { תיאור_סביבה: 'שכונה יפה' }
      const results = getWarnings(data)
      expect(results.some(r => r.rule.fieldRefs.includes('תיאור_סביבה'))).toBe(true)
    })

    it('should warn when תיאור_סביבה is too long', () => {
      const longText = 'שכונה יפה '.repeat(50) // ~300 words
      const data = { תיאור_סביבה: longText }
      const results = getWarnings(data)
      expect(results.some(r => r.rule.fieldRefs.includes('תיאור_סביבה'))).toBe(true)
    })

    it('should pass when תיאור_סביבה is within limits', () => {
      const validText = 'שכונה יפה '.repeat(20) // ~120 words
      const data = { תיאור_סביבה: validText }
      const results = getWarnings(data)
      expect(results.some(r => r.rule.fieldRefs.includes('תיאור_סביבה'))).toBe(false)
    })

    it('should warn when תיאור_סביבה lacks year mention', () => {
      const data = { תיאור_סביבה: 'שכונה יפה ללא שנת ייסוד' }
      const results = getWarnings(data)
      expect(results.some(r => r.rule.fieldRefs.includes('תיאור_סביבה'))).toBe(true)
    })

    it('should pass when תיאור_סביבה mentions year', () => {
      const data = { תיאור_סביבה: 'שכונה יפה שנוסדה בשנת 1950' }
      const results = getWarnings(data)
      expect(results.some(r => r.rule.fieldRefs.includes('תיאור_סביבה'))).toBe(false)
    })

    it('should block when חלוקה_פנימית has less than 3 spaces', () => {
      const data = { חלוקה_פנימית: ['סלון', 'מטבח'] }
      const results = getBlockingIssues(data)
      expect(results.some(r => r.rule.fieldRefs.includes('חלוקה_פנימית'))).toBe(true)
    })

    it('should pass when חלוקה_פנימית has 3 or more spaces', () => {
      const data = { חלוקה_פנימית: ['סלון', 'מטבח', 'חדר שינה', 'חדר רחצה'] }
      const results = getBlockingIssues(data)
      expect(results.some(r => r.rule.fieldRefs.includes('חלוקה_פנימית'))).toBe(false)
    })

    it('should warn when סטנדרט_גמר is Basic without explanation', () => {
      const data = { סטנדרט_גמר: 'Basic' }
      const results = getWarnings(data)
      expect(results.some(r => r.rule.fieldRefs.includes('סטנדרט_גמר'))).toBe(true)
    })

    it('should pass when סטנדרט_גמר is Basic with explanation', () => {
      const data = { סטנדרט_גמר: 'Basic', הסבר_סטנדרט: 'הדירה במצב בסיסי ללא גימורים מיוחדים' }
      const results = getWarnings(data)
      expect(results.some(r => r.rule.fieldRefs.includes('סטנדרט_גמר'))).toBe(false)
    })
  })

  describe('Section 2 Rules', () => {
    it('should block when בעלויות is empty', () => {
      const data = { בעלויות: [] }
      const results = getBlockingIssues(data)
      expect(results.some(r => r.rule.fieldRefs.includes('בעלויות'))).toBe(true)
    })

    it('should pass when בעלויות has at least one entry', () => {
      const data = { בעלויות: [{ שם: 'לי גולן', אחוז: 100 }] }
      const results = getBlockingIssues(data)
      expect(results.some(r => r.rule.fieldRefs.includes('בעלויות'))).toBe(false)
    })

    it('should warn when תאריך_נסח is in the future', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 1)
      const futureDateStr = futureDate.toLocaleDateString('he-IL').replace(/\//g, '.')
      
      const data = { תאריך_נסח: futureDateStr }
      const results = getWarnings(data)
      expect(results.some(r => r.rule.fieldRefs.includes('תאריך_נסח'))).toBe(true)
    })
  })

  describe('Section 3 Rules', () => {
    it('should block when תכניות has less than 5 entries', () => {
      const data = { תכניות: [
        { מספר: '1', תאריך: '01.01.2020' },
        { מספר: '2', תאריך: '01.01.2021' },
        { מספר: '3', תאריך: '01.01.2022' },
        { מספר: '4', תאריך: '01.01.2023' }
      ]}
      const results = getBlockingIssues(data)
      expect(results.some(r => r.rule.fieldRefs.includes('תכניות'))).toBe(true)
    })

    it('should pass when תכניות has 5 or more entries', () => {
      const data = { תכניות: [
        { מספר: '1', תאריך: '01.01.2020' },
        { מספר: '2', תאריך: '01.01.2021' },
        { מספר: '3', תאריך: '01.01.2022' },
        { מספר: '4', תאריך: '01.01.2023' },
        { מספר: '5', תאריך: '01.01.2024' }
      ]}
      const results = getBlockingIssues(data)
      expect(results.some(r => r.rule.fieldRefs.includes('תכניות'))).toBe(false)
    })

    it('should block when זכויות_בניה is missing required fields', () => {
      const data = { זכויות_בניה: { יעוד: 'מגורים' } }
      const results = getBlockingIssues(data)
      expect(results.some(r => r.rule.fieldRefs.includes('זכויות_בניה'))).toBe(true)
    })

    it('should pass when זכויות_בניה has all required fields', () => {
      const data = { זכויות_בניה: { יעוד: 'מגורים', שטח_מגרש: 500, מספר_קומות: '4' } }
      const results = getBlockingIssues(data)
      expect(results.some(r => r.rule.fieldRefs.includes('זכויות_בניה'))).toBe(false)
    })

    it('should warn when אחוזי_בניה > 800', () => {
      const data = { זכויות_בניה: { יעוד: 'מגורים', שטח_מגרש: 500, מספר_קומות: '4', אחוזי_בניה: 900 } }
      const results = getWarnings(data)
      expect(results.some(r => r.rule.fieldRefs.includes('זכויות_בניה'))).toBe(true)
    })

    it('should block when היתרים has no valid permits', () => {
      const data = { היתרים: [{ מספר: '', תאריך: '' }] }
      const results = getBlockingIssues(data)
      expect(results.some(r => r.rule.fieldRefs.includes('היתרים'))).toBe(true)
    })

    it('should pass when היתרים has at least one valid permit', () => {
      const data = { היתרים: [{ מספר: '12345', תאריך: '01.01.2020' }] }
      const results = getBlockingIssues(data)
      expect(results.some(r => r.rule.fieldRefs.includes('היתרים'))).toBe(false)
    })

    it('should block when חשד_זיהום is true but פירוט_זיהום is missing', () => {
      const data = { חשד_זיהום: true }
      const results = getBlockingIssues(data)
      expect(results.some(r => r.rule.fieldRefs.includes('פירוט_זיהום'))).toBe(true)
    })

    it('should pass when חשד_זיהום is true and פירוט_זיהום is provided', () => {
      const data = { חשד_זיהום: true, פירוט_זיהום: 'חשד לזיהום קרקע' }
      const results = getBlockingIssues(data)
      expect(results.some(r => r.rule.fieldRefs.includes('פירוט_זיהום'))).toBe(false)
    })
  })

  describe('Section 5 Rules', () => {
    it('should block when עסקאות has less than 3 entries', () => {
      const data = { עסקאות: [
        { כתובת: 'רחוב 1', מחיר: 1000000 },
        { כתובת: 'רחוב 2', מחיר: 1200000 }
      ]}
      const results = getBlockingIssues(data)
      expect(results.some(r => r.rule.fieldRefs.includes('עסקאות'))).toBe(true)
    })

    it('should pass when עסקאות has 3 or more entries', () => {
      const data = { עסקאות: [
        { כתובת: 'רחוב 1', מחיר: 1000000 },
        { כתובת: 'רחוב 2', מחיר: 1200000 },
        { כתובת: 'רחוב 3', מחיר: 1100000 }
      ]}
      const results = getBlockingIssues(data)
      expect(results.some(r => r.rule.fieldRefs.includes('עסקאות'))).toBe(false)
    })

    it('should block when היצע has less than 2 entries', () => {
      const data = { היצע: [{ כתובת: 'רחוב 1', מחיר: 1000000 }] }
      const results = getBlockingIssues(data)
      expect(results.some(r => r.rule.fieldRefs.includes('היצע'))).toBe(true)
    })

    it('should pass when היצע has 2 or more entries', () => {
      const data = { היצע: [
        { כתובת: 'רחוב 1', מחיר: 1000000 },
        { כתובת: 'רחוב 2', מחיר: 1200000 }
      ]}
      const results = getBlockingIssues(data)
      expect(results.some(r => r.rule.fieldRefs.includes('היצע'))).toBe(false)
    })
  })

  describe('Section 6 Rules', () => {
    it('should block when חותמת is missing', () => {
      const data = {}
      const results = getBlockingIssues(data)
      expect(results.some(r => r.rule.fieldRefs.includes('חותמת'))).toBe(true)
    })

    it('should pass when חותמת is provided', () => {
      const data = { חותמת: 'base64-image-data' }
      const results = getBlockingIssues(data)
      expect(results.some(r => r.rule.fieldRefs.includes('חותמת'))).toBe(false)
    })
  })

  describe('Cross-Check Rules', () => {
    it('should warn when area difference > 2%', () => {
      const data = { שטח_רשום: 100, שטח_בנוי: 110 }
      const results = getWarnings(data)
      expect(results.some(r => r.rule.fieldRefs.includes('שטח_רשום'))).toBe(true)
    })

    it('should pass when area difference ≤ 2%', () => {
      const data = { שטח_רשום: 100, שטח_בנוי: 101 }
      const results = getWarnings(data)
      expect(results.some(r => r.rule.fieldRefs.includes('שטח_רשום'))).toBe(false)
    })

    it('should warn when זכויות are inconsistent', () => {
      const data = { זכויות: 'בעלות פרטית', זכויות_צו: 'חכירה' }
      const results = getWarnings(data)
      expect(results.some(r => r.rule.fieldRefs.includes('זכויות'))).toBe(true)
    })

    it('should pass when זכויות are consistent', () => {
      const data = { זכויות: 'בעלות פרטית', זכויות_צו: 'בעלות פרטית' }
      const results = getWarnings(data)
      expect(results.some(r => r.rule.fieldRefs.includes('זכויות'))).toBe(false)
    })
  })

  describe('Integration Tests', () => {
    it('should allow signing when all blocking issues are resolved', () => {
      const validData = {
        שם_מזמין: 'לי גולן',
        מועד_ביקור: '15.07.2025',
        תאריך_קובע: '15.07.2025',
        גוש: '123',
        חלקה: '456',
        תת: '789',
        שטח_רשום: 100,
        חלוקה_פנימית: ['סלון', 'מטבח', 'חדר שינה'],
        בעלויות: [{ שם: 'לי גולן', אחוז: 100 }],
        תכניות: [
          { מספר: '1', תאריך: '01.01.2020' },
          { מספר: '2', תאריך: '01.01.2021' },
          { מספר: '3', תאריך: '01.01.2022' },
          { מספר: '4', תאריך: '01.01.2023' },
          { מספר: '5', תאריך: '01.01.2024' }
        ],
        זכויות_בניה: { יעוד: 'מגורים', שטח_מגרש: 500, מספר_קומות: '4' },
        היתרים: [{ מספר: '12345', תאריך: '01.01.2020' }],
        עסקאות: [
          { כתובת: 'רחוב 1', מחיר: 1000000 },
          { כתובת: 'רחוב 2', מחיר: 1200000 },
          { כתובת: 'רחוב 3', מחיר: 1100000 }
        ],
        היצע: [
          { כתובת: 'רחוב 1', מחיר: 1000000 },
          { כתובת: 'רחוב 2', מחיר: 1200000 }
        ],
        חותמת: 'base64-image-data'
      }
      
      expect(canSignReport(validData)).toBe(true)
    })

    it('should prevent signing when blocking issues exist', () => {
      const invalidData = {
        שם_מזמין: 'א', // Too short
        מועד_ביקור: '15.07.2025',
        גוש: '123',
        חלקה: '456',
        תת: '789',
        שטח_רשום: 100
      }
      
      expect(canSignReport(invalidData)).toBe(false)
    })

    it('should provide correct QC summary', () => {
      const dataWithIssues = {
        שם_מזמין: 'א', // Blocking
        מועד_ביקור: '15.07.2025',
        גוש: '123',
        חלקה: '456',
        תת: '789',
        שטח_רשום: 100,
        תיאור_סביבה: 'קצר' // Warning
      }
      
      const summary = getQCSummary(dataWithIssues)
      expect(summary.canSign).toBe(false)
      expect(summary.blocking).toBeGreaterThan(0)
      expect(summary.warnings).toBeGreaterThan(0)
    })
  })
})
