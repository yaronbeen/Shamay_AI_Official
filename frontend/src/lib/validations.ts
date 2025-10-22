import { z } from 'zod'

export const createOrganizationSchema = z.object({
  name: z.string().min(1, 'שם הארגון נדרש'),
})

export const inviteUserSchema = z.object({
  email: z.string().email('כתובת אימייל לא תקינה'),
  role: z.enum(['ORG_ADMIN', 'APPRAISER', 'CLIENT_VIEWER']),
})

export const createValuationSchema = z.object({
  title: z.string().min(1, 'כותרת השומה נדרשת'),
  addressFull: z.string().min(1, 'כתובת מלאה נדרשת'),
  block: z.string().optional(),
  parcel: z.string().optional(),
  subparcel: z.string().optional(),
})

export const updateValuationSchema = createValuationSchema.partial()

export const presignUploadSchema = z.object({
  fileName: z.string().min(1),
  mime: z.string().min(1),
  scope: z.enum(['valuation', 'loose']),
  valuationId: z.string().optional(),
})

export const createDocumentSchema = z.object({
  valuationId: z.string().optional(),
  docType: z.enum(['TABU', 'CONDO', 'PERMIT', 'PLANNING_INFO', 'OTHER']),
  storageKey: z.string().min(1),
  sha256: z.string().min(1),
  source: z.enum(['USER_UPLOAD', 'APP_GENERATED']),
})
