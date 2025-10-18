import { z } from 'zod'

// Hebrew validation messages
const HEBREW_ERRORS = {
  required: 'שדה חובה',
  invalidNumber: 'יש להזין מספר תקין',
  invalidDate: 'יש להזין תאריך תקין',
  futureDate: 'התאריך אינו יכול להיות עתידי',
  minValue: (min: number) => `הערך חייב להיות לפחות ${min}`,
  maxValue: (max: number) => `הערך לא יכול לעלות על ${max}`,
  minLength: (min: number) => `יש להזין לפחות ${min} תווים`,
  invalidHebrewText: 'יש להזין טקסט בעברית בלבד',
  invalidAddress: 'נא להזין את כל רכיבי הכתובת (רחוב, מספר, שכונה, עיר)',
  missingTabuData: 'חסר נתון חובה: גוש/חלקה/תת-חלקה',
  minComparables: 'בחר לפחות שלוש עסקאות'
}

// Helper: Hebrew text validator
const hebrewTextRegex = /^[\u0590-\u05FF\s\-'"]+$/
const isHebrewText = (text: string) => hebrewTextRegex.test(text)

// Helper: Date validator (not in future)
const isNotFutureDate = (date: string | Date) => {
  const inputDate = new Date(date)
  const today = new Date()
  today.setHours(23, 59, 59, 999) // End of today
  return inputDate <= today
}

// Step 1: Initial Property Data Schema
export const step1Schema = z.object({
  // Address (all required, Hebrew text)
  street: z
    .string()
    .min(1, HEBREW_ERRORS.required)
    .refine(isHebrewText, { message: HEBREW_ERRORS.invalidHebrewText }),
  
  buildingNumber: z
    .string()
    .min(1, HEBREW_ERRORS.required),
  
  neighborhood: z
    .string()
    .min(1, HEBREW_ERRORS.required)
    .refine(isHebrewText, { message: HEBREW_ERRORS.invalidHebrewText }),
  
  city: z
    .string()
    .min(1, HEBREW_ERRORS.required)
    .refine(isHebrewText, { message: HEBREW_ERRORS.invalidHebrewText }),
  
  // Property essence
  rooms: z
    .number({ invalid_type_error: HEBREW_ERRORS.invalidNumber })
    .min(1, HEBREW_ERRORS.minValue(1))
    .max(99, HEBREW_ERRORS.maxValue(99)),
  
  floor: z
    .number({ invalid_type_error: HEBREW_ERRORS.invalidNumber })
    .min(1, HEBREW_ERRORS.minValue(1))
    .max(99, HEBREW_ERRORS.maxValue(99)),
  
  area: z
    .number({ invalid_type_error: HEBREW_ERRORS.invalidNumber })
    .positive('השטח חייב להיות גדול מאפס'),
  
  airDirections: z.string().optional(),
  
  // Client info
  clientName: z
    .string()
    .min(1, 'יש להזין שם מזמין')
    .refine(isHebrewText, { message: HEBREW_ERRORS.invalidHebrewText }),
  
  // Dates
  visitDate: z
    .string()
    .min(1, HEBREW_ERRORS.required)
    .refine(isNotFutureDate, { message: HEBREW_ERRORS.futureDate }),
  
  valuationDate: z
    .string()
    .min(1, HEBREW_ERRORS.required)
    .refine(isNotFutureDate, { message: HEBREW_ERRORS.futureDate }),
  
  // Appraiser info
  shamayName: z.string().min(1, HEBREW_ERRORS.required),
  shamaySerialNumber: z.string().min(1, HEBREW_ERRORS.required),
  
  referenceNumber: z.string().optional()
})

// Step 2: Tabu (Land Registry) Data Schema (from OCR)
export const tabuDataSchema = z.object({
  gush: z.string().min(1, 'חסר נתון חובה: גוש'),
  parcel: z.string().min(1, 'חסר נתון חובה: חלקה'),
  subParcel: z.string().min(1, 'חסר נתון חובה: תת-חלקה'),
  registeredArea: z.number().positive('יש להזין שטח רשום גדול מאפס'),
  parcelArea: z.number().positive().optional(),
  parcelShape: z.string().optional(),
  parcelSurface: z.string().optional(),
  registryOffice: z.string().optional(),
  extractDate: z.string().optional(),
  ownershipRights: z.string().optional(),
  notes: z.string().optional()
})

// Step 2: Building Permit Data Schema (from OCR)
export const buildingPermitSchema = z.object({
  buildingPermitNumber: z.string().min(1, 'חסר מספר היתר בניה'),
  buildingPermitDate: z.string().optional(),
  builtArea: z.number().positive('יש להזין שטח בנוי גדול מאפס'),
  balconyArea: z.number().nonnegative().optional(),
  buildingDescription: z.string().optional(),
  buildingFloors: z.number().positive().optional(),
  buildingUnits: z.number().positive().optional(),
  buildingDetails: z.string().optional(),
  constructionSource: z.string().optional()
})

// Step 4: Comparable Data Schema
export const comparableDataSchema = z.object({
  address: z.string().min(1),
  city: z.string().min(1),
  rooms: z.number().positive(),
  floor: z.number().positive(),
  area: z.number().positive(),
  price: z.number().positive(),
  price_per_sqm: z.number().positive(),
  sale_date: z.string(),
  include: z.boolean().default(true)
})

// Step 4: Minimum 3 comparables validation
export const comparablesListSchema = z
  .array(comparableDataSchema)
  .min(3, HEBREW_ERRORS.minComparables)
  .refine(
    (data) => data.filter((item) => item.include).length >= 3,
    { message: HEBREW_ERRORS.minComparables }
  )

export type Step1Data = z.infer<typeof step1Schema>
export type TabuData = z.infer<typeof tabuDataSchema>
export type BuildingPermitData = z.infer<typeof buildingPermitSchema>
export type ComparableData = z.infer<typeof comparableDataSchema>
