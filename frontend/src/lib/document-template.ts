import { ValuationData } from '../components/ValuationWizard'
import { STATIC_TEXTS } from './static-texts-he'
import { LOCKED_HEBREW_TEXT, COMPLETE_TA_BINDINGS } from './report-spec-hebrew'

export interface CompanySettings {
  companyLogo?: string
  footerLogo?: string
  companyName?: string
  companySlogan?: string
  companyAddress?: string
  companyPhone?: string
  companyEmail?: string
  companyWebsite?: string
  associationMembership?: string
  services?: string[]
  signature?: string
}

const PAGE_MIN_HEIGHT_MM = 297
const DEFAULT_FONT_FAMILY = '"Noto Sans Hebrew", "Rubik", "Arial Hebrew", Arial, sans-serif'

const hebrewMonths = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']

const numberToHebrewWords = (value?: number) => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return '—'
  }
  const num = Math.floor(Number(value))

  const ones = ['', 'אחד', 'שניים', 'שלושה', 'ארבעה', 'חמישה', 'שישה', 'שבעה', 'שמונה', 'תשעה']
  const tens = ['', 'עשרה', 'עשרים', 'שלושים', 'ארבעים', 'חמישים', 'שישים', 'שבעים', 'שמונים', 'תשעים']
  const teens = ['עשר', 'אחת עשרה', 'שתים עשרה', 'שלוש עשרה', 'ארבע עשרה', 'חמש עשרה', 'שש עשרה', 'שבע עשרה', 'שמונה עשרה', 'תשע עשרה']

  const convertHundreds = (num: number): string => {
    if (num === 0) {
      return ''
    }
    if (num < 10) {
      return ones[num]
    }
    if (num < 20) {
      return teens[num - 10]
    }
    if (num < 100) {
      const ten = Math.floor(num / 10)
      const one = num % 10
      return `${tens[ten]}${one ? ` ו${ones[one]}` : ''}`.trim()
    }
    const hundred = Math.floor(num / 100)
    const rest = num % 100
    const hundredWord = hundred === 1 ? 'מאה' : hundred === 2 ? 'מאתיים' : `${ones[hundred]} מאות`
    if (rest === 0) {
      return hundredWord
    }
    return `${hundredWord} ו${convertHundreds(rest)}`
  }

  const chunks: string[] = []
  let remaining = Math.floor(Number(value))

  const millions = Math.floor(remaining / 1_000_000)
  if (millions) {
    chunks.push(millions === 1 ? 'מיליון' : `${convertHundreds(millions)} מיליון`)
    remaining %= 1_000_000
  }

  const thousands = Math.floor(remaining / 1_000)
  if (thousands) {
    chunks.push(
      thousands === 1
        ? 'אלף'
        : thousands === 2
          ? 'אלפיים'
          : `${convertHundreds(thousands)} אלף`
    )
    remaining %= 1_000
  }

  if (remaining) {
    chunks.push(convertHundreds(remaining))
  }

  if (!chunks.length) {
    return 'אפס'
  }

  return chunks.join(' ').replace(/ +/g, ' ').trim()
}

const formatDateNumeric = (value?: string) => {
  if (!value) {
    return '—'
  }
  try {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return '—'
    }
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear().toString()
    return `${day}.${month}.${year}`
  } catch {
    return '—'
  }
}

const formatDateHebrew = (value?: string) => {
  const source = value ? new Date(value) : new Date()
  if (Number.isNaN(source.getTime())) {
    return '—'
  }
  const day = source.getDate()
  const month = hebrewMonths[source.getMonth()]
  const year = source.getFullYear()
  return `${day} ${month} ${year}`
}

const formatCurrency = (value?: number) => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return '₪ —'
  }
  return `₪ ${(Number(value)).toLocaleString('he-IL')}`
}

const formatNumber = (value?: number | string, fallbackText = '—') => {
  if (value === undefined || value === null || value === '') {
    return fallbackText
  }
  const numeric = Number(value)
  if (Number.isFinite(numeric)) {
    return numeric.toLocaleString('he-IL')
  }
  return String(value)
}

const formatRooms = (rooms?: number | string) => {
  if (!rooms) {
    return 'דירת מגורים'
  }
  return `דירת מגורים בת ${rooms} חדרים`
}

const formatFloor = (floor?: number | string) => {
  if (!floor && floor !== 0) {
    return ''
  }
  return `בקומה ${floor}`
}

const formatOwnership = (data: ValuationData) => {
  const landRegistry = resolveLandRegistryData(data).landRegistry
  return (
    data.extractedData?.ownershipType ||
    data.ownershipRights ||
    landRegistry?.ownership_type ||
    'בעלות פרטית'
  )
}

const getAddress = (data: ValuationData) => {
  const { street, buildingNumber, city, neighborhood } = data
  if (!street || !buildingNumber || !city) {
    return '—'
  }
  const neighborhoodSegment = neighborhood ? `, שכונת ${neighborhood}` : ''
  return `${street} ${buildingNumber}${neighborhoodSegment}, ${city}`
}

const getReference = (data: ValuationData) => {
  if (data.referenceNumber) {
    return data.referenceNumber
  }
  const address = getAddress(data).replace(/[^א-ת0-9]/g, '')
  return `1000_${address.substring(0, 10)}`
}

const normalizeText = (value?: string, fallbackText = '—') => {
  if (!value) {
    return fallbackText
  }
  return value
}

const safeValue = (value?: string | number, fallback = '—') => {
  if (value === undefined || value === null) {
    return fallback
  }
  if (typeof value === 'string' && value.trim().length === 0) {
    return fallback
  }
  return value
}

const createDetailsTable = (data: ValuationData) => {
  const landRegistry = resolveLandRegistryData(data).landRegistry
  const attachmentsList = dedupeByKey(
    [
      ...((Array.isArray(data.extractedData?.attachments)
        ? data.extractedData?.attachments.map((item: any) => item?.description || item?.type || '')
        : []) || []),
      ...toArray((landRegistry as any)?.attachments).map((item: any) => item?.description || item?.type || '')
    ].filter(Boolean) as string[],
    (value) => value
  )
  const attachmentsText = attachmentsList.join(', ')

  const registeredAreaValue = formatNumber(
    (data as any).registeredArea ||
      data.extractedData?.apartment_registered_area ||
      data.extractedData?.apartmentRegisteredArea ||
      landRegistry?.apartment_registered_area,
    ''
  )
  const builtAreaValue = formatNumber(
    data.extractedData?.builtArea || data.builtArea || landRegistry?.built_area || (data as any).builtArea,
    ''
  )

  const rows: Array<{ label: string; value: string }> = [
    {
      label: 'מהות:',
      value: `${formatRooms(data.rooms)} ${formatFloor(landRegistry?.floor || data.floor)}`.trim()
    },
    {
      label: 'גוש:',
      value: formatNumber(data.extractedData?.gush || landRegistry?.gush || data.gush)
    },
    {
      label: 'חלקה:',
      value: formatNumber(data.extractedData?.chelka || landRegistry?.chelka || data.parcel)
    },
    {
      label: 'תת חלקה:',
      value: formatNumber(
        data.extractedData?.sub_chelka ||
          data.extractedData?.subChelka ||
          landRegistry?.sub_chelka ||
          data.subParcel
      )
    },
    {
      label: 'הצמדות:',
      value: attachmentsText || '—'
    },
    {
      label: 'שטח דירה רשום:',
      value: registeredAreaValue ? `${registeredAreaValue} מ"ר` : ''
    },
    {
      label: 'שטח דירה בנוי:',
      value: builtAreaValue ? `${builtAreaValue} מ"ר` : ''
    },
    {
      label: 'זכויות:',
      value: formatOwnership(data)
    }
  ]

  return rows
    .map((row) => {
      if (!row.value) {
        return ''
      }
      return `
        <tr>
          <th>${row.label}</th>
          <td>${row.value}</td>
        </tr>
      `
    })
    .join('')
}

const createComparablesTable = (data: ValuationData) => {
  const items: any[] = Array.isArray((data as any).comparableData || (data as any).comparable_data) ? (data as any).comparableData || (data as any).comparable_data : []

  if (!items.length) {
    return `
      <p class="muted">נתוני השוואה יוצגו לאחר הזנה במערכת</p>
    `
  }

  const rows = items.slice(0, 10).map((item) => {
    const saleDate = formatDateNumeric(item.sale_date || item.date || item.transaction_date || item.saleDate)
    const gushChelka = normalizeText(item.gush_chelka || item.block_lot || item.gush_chelka_code || item.gushChelka, '—')
    const address = normalizeText(item.address || item.street_address || item.streetAddress, '—')
    const rooms = normalizeText(item.rooms || item.room_count, '—')
    const floor = normalizeText(item.floor_number || item.floor || item.floor_num || item.floorNumber, '—')
    const size = normalizeText(item.size || item.area || item.sqm || item.sizeInSqm || item.apartmentArea, '—')
    const buildYear = normalizeText(item.building_year || item.year_built || item.construction_year || item.buildYear || item.constructionYear, '—')
    const price = item.price ? `₪ ${(Number(item.price)).toLocaleString('he-IL')}` : '—'
    const pricePerSqm = item.price_per_sqm
      ? `₪ ${(Math.round(Number(item.price_per_sqm) / 100) * 100).toLocaleString('he-IL')}`
      : '—'

    return `
      <tr>
        <td>${saleDate}</td>
        <td>${address}</td>
        <td>${gushChelka}</td>
        <td>${rooms}</td>
        <td>${floor}</td>
        <td>${size}</td>
        <td>${buildYear}</td>
        <td>${price}</td>
        <td>${pricePerSqm}</td>
      </tr>
    `
  })

  return `
    <table class="table comparables">
      <thead>
        <tr>
          <th>יום מכירה</th>
          <th>כתובת</th>
          <th>גו"ח</th>
          <th>חדרים</th>
          <th>קומה</th>
          <th>שטח דירה (מ"ר)</th>
          <th>שנת בניה</th>
          <th>מחיר עסקה</th>
          <th>מחיר למ"ר, במעוגל</th>
        </tr>
      </thead>
      <tbody>
        ${rows.join('')}
      </tbody>
    </table>
  `
}

const resolveCoverImageSources = (data: ValuationData): string[] => {
  const pickFirstValid = (value?: string | null) => {
    if (typeof value !== 'string') {
      return null
    }
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  const fromSelected = pickFirstValid((data as any).selectedImagePreview)
  if (fromSelected) {
    return [fromSelected]
  }

  const directFields = [
    (data as any).coverImage,
    (data as any).coverPhoto,
    (data as any).coverPhotoUrl,
    (data as any).cover_image,
    (data as any).cover_photo
  ]
  for (const field of directFields) {
    const found = pickFirstValid(field)
    if (found) {
      return [found]
    }
  }

  const propertyImages = Array.isArray((data as any).propertyImages) ? (data as any).propertyImages : []
  const propertyPriority = [
    propertyImages.filter((entry: any) => (entry?.type || '').toString().toLowerCase() === 'building_image'),
    propertyImages.filter((entry: any) => !(entry?.type))
  ]
  for (const group of propertyPriority) {
    for (const entry of group) {
      if (!entry) continue
      const sources = [
        pickFirstValid(entry.preview),
        pickFirstValid(entry.url),
        pickFirstValid(entry.path),
        pickFirstValid(entry.signedUrl)
      ]
      const found = sources.find(Boolean)
      if (found) {
        return [found]
      }
    }
  }

  const uploads = Array.isArray((data as any).uploads) ? (data as any).uploads : []
  const uploadPriority = [
    uploads.filter((upload: any) => (upload?.type || '').toString().toLowerCase() === 'building_image'),
    uploads.filter((upload: any) => !(upload?.type))
  ]
  for (const group of uploadPriority) {
    for (const upload of group) {
      if (!upload) continue
      const sources = [
        pickFirstValid(upload.preview),
        pickFirstValid(upload.url),
        pickFirstValid(upload.path),
        pickFirstValid(upload.fileUrl),
        pickFirstValid(upload.absoluteUrl)
      ]
      const found = sources.find(Boolean)
      if (found) {
        return [found]
      }
    }
  }

  return []
}

const collectInteriorImages = (data: ValuationData): string[] => {
  const seen = new Set<string>()
  const results: string[] = []

  // Helper to validate if an image URL is valid and accessible
  const isValidImageUrl = (url: string): boolean => {
    if (!url || typeof url !== 'string') return false
    const trimmed = url.trim()
    
    // Filter out empty strings
    if (!trimmed) return false
    
    // Filter out placeholder indicators
    if (trimmed.includes('placeholder') || trimmed.includes('[') || trimmed.includes('לא זמין')) {
      return false
    }
    
    // Must be a valid URL or data URI
    if (!trimmed.startsWith('http') && !trimmed.startsWith('/') && !trimmed.startsWith('data:')) {
      return false
    }
    
    // Check if it looks like a valid image extension or blob URL
    const hasValidExtension = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(trimmed)
    const isBlobUrl = trimmed.includes('blob.vercel-storage.com') || trimmed.includes('/api/files/')
    const isDataUri = trimmed.startsWith('data:image/')
    
    return hasValidExtension || isBlobUrl || isDataUri
  }

  // Helper to determine if a URL is base64 (large data URI)
  const isBase64 = (url: string): boolean => {
    return url.startsWith('data:image/')
  }

  // Helper to get the best URL from an upload entry
  // Priority: url (blob) > signedUrl > path > fileUrl > absoluteUrl > preview (base64 - last resort)
  const getBestUrlFromEntry = (entry: any): string | null => {
    if (!entry) return null
    
    // Try blob URLs first (preferred - smaller, faster, persistent)
    const candidates = [
      entry.url,
      entry.signedUrl,
      entry.path,
      entry.fileUrl,
      entry.absoluteUrl,
      entry.preview // base64 - only use as last resort
    ]
    
    for (const candidate of candidates) {
      if (candidate && typeof candidate === 'string' && isValidImageUrl(candidate)) {
        // Prefer non-base64 URLs
        if (!isBase64(candidate)) {
          return candidate.trim()
        }
      }
    }
    
    // If all candidates are invalid, try base64 as last resort
    for (const candidate of candidates) {
      if (candidate && typeof candidate === 'string' && isValidImageUrl(candidate)) {
        return candidate.trim()
      }
    }
    
    return null
  }

  const add = (value?: string | null) => {
    if (typeof value !== 'string') {
      return
    }
    const trimmed = value.trim()
    if (!trimmed || seen.has(trimmed) || !isValidImageUrl(trimmed)) {
      return
    }
    seen.add(trimmed)
    results.push(trimmed)
  }

  const isInteriorType = (value?: string) => {
    const type = (value || '').toString().toLowerCase()
    return type === 'interior_image' || type === 'interior' || type === 'room' || type === 'living_room'
  }

  // SINGLE SOURCE OF TRUTH: Use uploads array (most up-to-date and has status tracking)
  const uploads = Array.isArray((data as any).uploads) ? (data as any).uploads : []
  const interiorUploads = uploads.filter((entry: any) => {
    // Only include completed uploads of interior type
    return entry.status === 'completed' && isInteriorType(entry?.type)
  })

  // Get the best URL for each upload (ONE URL per upload, not duplicates)
  interiorUploads.forEach((upload: any) => {
    const bestUrl = getBestUrlFromEntry(upload)
    if (bestUrl) {
      add(bestUrl)
    }
  })

  // FALLBACK: If no uploads found, try interiorImages array (for backward compatibility)
  if (results.length === 0) {
    const interiorArrays: Array<string[] | undefined> = [
      Array.isArray((data as any).interiorImages) ? (data as any).interiorImages : undefined,
    ]

    interiorArrays.forEach((array) => {
      if (!array) return
      array.forEach(add)
    })
  }

  // Return only valid images (up to 6)
  return results.filter(isValidImageUrl).slice(0, 6)
}

const toArray = <T>(value: T | T[] | null | undefined): T[] => {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

const resolveLandRegistryData = (data: ValuationData) => {
  const mergedRegistry = mergeRecords(
    (data.extractedData as any)?.land_registry,
    (data.extractedData as any)?.landRegistry,
    (data as any).land_registry,
    (data as any).landRegistry
  )

  const owners = toArray((mergedRegistry as any).owners).map((owner: any) => ({
    name: owner?.name || owner?.owner_name,
    idNumber: owner?.id_number || owner?.idNumber,
    share: owner?.ownership_share || owner?.share || 'שלמות'
  }))

  const mortgages = toArray((mergedRegistry as any).mortgages).map((mortgage: any) => ({
    rank: mortgage?.rank || mortgage?.mortgage_rank,
    share: mortgage?.share || mortgage?.mortgage_property_share,
    amount: mortgage?.amount || mortgage?.mortgage_amount,
    lenders: mortgage?.lenders || mortgage?.mortgage_lenders,
    borrowers: mortgage?.borrowers || mortgage?.mortgage_borrowers,
    registrationDate: mortgage?.registration_date || mortgage?.registrationDate,
    essence: mortgage?.essence || mortgage?.mortgage_essence
  }))

  const attachments = toArray((mergedRegistry as any).attachments).map((attachment: any) => ({
    type: attachment?.type || attachment?.description,
    area: attachment?.area,
    color: attachment?.color,
    symbol: attachment?.symbol
  }))

  const additionalAreas = toArray((mergedRegistry as any).additional_areas).map((item: any) => ({
    type: item?.type,
    area: item?.area
  }))

  return {
    landRegistry: mergedRegistry,
    owners,
    mortgages,
    attachments,
    additionalAreas
  }
}

const dedupeByKey = <T>(items: T[], getKey: (item: T) => string): T[] => {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = getKey(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const buildBaseCss = () => `
  @font-face {
    font-family: 'Noto Sans Hebrew';
    font-style: normal;
    font-weight: 400;
    src: local('Noto Sans Hebrew'), local('NotoSansHebrew-Regular');
        }
        @page {
          size: A4;
          margin: 0;
        }
  * {
    box-sizing: border-box;
        }
        body {
    font-family: ${DEFAULT_FONT_FAMILY};
    font-size: 10pt;
          line-height: 1.6;
    margin: 0;
    padding: 0;
    background:rgb(255, 255, 255);
    color: #0f172a;
          direction: rtl;
          text-align: right;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
  .document {
          width: 100%;
    margin: 0 auto;
          padding: 16px 0 32px;
        }
  .page {
    position: relative;
    page-break-after: auto;
          page-break-inside: avoid;
    padding: 32px 36px;
    margin-bottom: 28px;
    background: #ffffff;
    border-radius: 20px;
    border: 1px solid rgba(148, 163, 184, 0.35);
  }
  .page.cover {
    position: relative;
          page-break-after: always;
    padding: 52px 44px;
    background: white;
    color:rgb(0, 0, 0);
    border: none;
    min-height: ${PAGE_MIN_HEIGHT_MM}mm;
    overflow: hidden;
  }
  .page-title {
    font-size: 18pt;
    font-weight: 700;
    margin-bottom: 12px;
  }
  .chapter-title {
    font-size: 16pt;
    font-weight: 700;
    margin: 12px 0 24px;
    text-align: center;
    color: #0f172a;
    position: relative;
  }
  .chapter-title::after {
    content: '';
    display: block;
    width: 60px;
    height: 3px;
    background: linear-gradient(90deg, #2563eb, transparent);
    margin: 12px auto 0;
  }
  .section-title {
    font-size: 13pt;
    font-weight: 700;
    margin: 24px 0 16px;
    text-align: center;
  }
  .sub-title {
    font-size: 12.5pt;
    font-weight: 700;
    margin: 12px 0 6px;
    color: #1d4ed8;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .sub-title::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background-color: #2563eb;
  }
  .table {
          width: 100%;
          border-collapse: collapse;
    margin: 8px 0 20px;
    font-size: 10pt;
    background: #ffffff;
    border-radius: 12px;
    overflow: hidden;
    table-layout: fixed;
    break-inside: auto;
  }
  .table th,
  .table td {
    border: 1px solid rgba(148, 163, 184, 0.4);
    padding: 8px 10px;
    text-align: right;
    vertical-align: top;
    word-break: break-word;
  }
  tr, th, td {
    break-inside: avoid;
          page-break-inside: avoid;
  }
  .table th {
    background: linear-gradient(90deg, rgba(37, 99, 235, 0.12), rgba(37, 99, 235, 0.02));
    font-weight: 700;
    color: #1e3a8a;
    border-bottom: 2px solid rgba(37, 99, 235, 0.25);
  }
  .table tbody tr:nth-child(even) {
    background-color: rgba(248, 250, 252, 0.8);
  }
  .table.comparables th,
  .table.comparables td {
    white-space: nowrap;
  }
  .muted {
    color: #475569;
    font-style: italic;
  }
  .details-table th {
    width: 140px;
    font-weight: 600;
    background: rgba(15, 23, 42, 0.04);
    color: #0f172a;
  }
  .details-table td {
    font-weight: 500;
  }
  .callout {
    border: 1px solid rgba(59, 130, 246, 0.25);
    border-radius: 14px;
    padding: 14px 16px;
    margin: 16px 0;
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(59, 130, 246, 0.02));
  }
  .page-number {
    position: absolute;
    bottom: 0;
    right: 0;
    left: 0;
    padding-top: 12px;
          font-size: 9pt;
    color: #4b5563;
    text-align: left;
  }
  .page.cover .page-number {
    color: rgba(226, 232, 240, 0.9);
  }
  .page-body {
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding-bottom: 90px;
  }
  .page-footer {
    position: absolute;
    bottom: 12px;
    left: 36px;
    right: 36px;
    display: flex;
    justify-content: center;
    align-items: center;
    padding-top: 8px;
    border-top: 1px solid rgba(148, 163, 184, 0.15);
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .page-footer img {
    max-height: 50px;
    max-width: 100%;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  p {
    margin: 0;
    color: #0f172a;
  }
  .page-body p + p {
    margin-top: 6px;
  }
  .page-note {
          font-size: 9pt;
    color: #475569;
    padding: 12px 14px;
    border-radius: 12px;
    background: rgba(244, 244, 245, 0.8);
    border: 1px solid rgba(148, 163, 184, 0.35);
  }
  ul {
    margin: 0;
    padding-right: 18px;
    color: #1f2937;
  }
  ul.bullet-list {
    list-style: none;
    padding: 0;
    margin: 12px 0 0;
  }
  ul.bullet-list li {
    position: relative;
    padding: 10px 14px;
    margin-bottom: 8px;
    background: rgba(226, 232, 240, 0.45);
    border-radius: 12px;
    border: 1px solid rgba(148, 163, 184, 0.3);
  }
  ul.bullet-list li::before {
    content: '•';
    font-size: 22px;
    line-height: 1;
    position: absolute;
    right: 10px;
    top: 6px;
    color: #2563eb;
  }
  .cover-inner {
    display: flex;
    flex-direction: column;
    gap: 32px;
    align-items: center;
    text-align: center;
    padding-bottom: 120px;
    min-height: calc(100% - 120px);
  }
  .cover .title-primary {
    font-size: 26pt;
          font-weight: 700; 
    letter-spacing: 1px;
    margin-bottom: 8px;
  }
  .cover .title-secondary {
    font-size: 18pt;
    font-weight: 600;
    margin-bottom: 8px;
  }
  .cover .address {
    font-size: 16pt;
    font-weight: 500;
    margin-bottom: 20px;
  }
  .cover-title-card {
    background: rgba(15, 23, 42, 0.35);
    border-radius: 20px;
    padding: 28px 36px;
    backdrop-filter: blur(4px);
    max-width: 520px;
    width: 100%;
  }
  .page-header-brand {
    display: flex;
    justify-content: flex-start;
    align-items: center;
  }
  .page-header-brand img {
    max-height: 60px;
  }
  .cover-footer {
    position: absolute;
    bottom: 32px;
    left: 44px;
    right: 44px;
    display: flex;
    justify-content: center;
    align-items: center;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .cover-footer img {
    max-height: 90px;
    max-width: 520px;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .page-footer {
    position: absolute;
    bottom: 12px;
    left: 36px;
    right: 36px;
    display: flex;
    justify-content: center;
    align-items: center;
    padding-top: 12px;
    border-top: 1px solid rgba(148, 163, 184, 0.2);
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .page-footer img {
    max-height: 60px;
    max-width: 100%;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .key-value {
    display: flex;
    justify-content: space-between;
        gap: 12px;
    margin-bottom: 8px;
    font-weight: 500;
  }
  .key-value .key {
    font-weight: 600;
  }
  .signature-block {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: 32px;
  }
  .signature-placeholder {
    width: 160px;
    height: 90px;
    border: 2px dashed #d1d5db;
          display: flex; 
    justify-content: center;
          align-items: center; 
    font-size: 10pt;
    color: #6b7280;
  }
  .signature-image {
    max-width: 180px;
    max-height: 90px;
    border: 1px solid #d1d5db;
    padding: 4px;
  }
  .cover-image-frame {
    width: 100%;
    max-width: 540px;
    border-radius: 20px;
    overflow: hidden;
    border: 3px solid rgba(248, 250, 252, 0.45);
    box-shadow: 0 20px 45px rgba(15, 23, 42, 0.45);
  }
  .cover-image-frame img {
    width: 100%;
          height: auto; 
          display: block; 
  }
  img {
    border-radius: 14px;
    display: block;
          max-width: 100%;
          height: auto;
    break-inside: avoid;
          page-break-inside: avoid;
        }
  figure {
    margin: 0;
  }
  .media-gallery {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 16px;
    margin-top: 12px;
  }
  .media-card {
    background: rgba(248, 250, 252, 0.8);
    border: 1px solid rgba(148, 163, 184, 0.35);
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);
    display: flex;
    flex-direction: column;
    min-height: 160px;
    break-inside: avoid;
          page-break-inside: avoid;
        }
  .media-card img {
          width: 100%; 
    height: 100%;
    object-fit: cover;
    flex: 1 1 auto;
  }
+  img[data-managed-image][data-loaded='true'] {
+    opacity: 1;
+  }
  .media-caption {
          font-size: 9pt; 
    color: #475569;
    padding: 8px 12px;
    background: rgba(15, 23, 42, 0.04);
  }
  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
    padding: 12px;
    border-radius: 16px;
    background: rgba(228, 233, 242, 0.45);
    border: 1px solid rgba(148, 163, 184, 0.3);
    break-inside: avoid;
          page-break-inside: avoid;
        }
  .info-grid p {
    margin: 0;
    font-weight: 500;
  }
  .badge {
    display: inline-flex;
          align-items: center; 
    gap: 6px;
    background: rgba(59, 130, 246, 0.15);
    color: #1d4ed8;
    font-size: 9.5pt;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 999px;
  }
  .legal-list {
    list-style: none;
    padding: 0;
    margin: 12px 0 0;
  }
  .legal-list li {
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid rgba(148, 163, 184, 0.25);
    background: rgba(248, 250, 252, 0.9);
    margin-bottom: 8px;
  }
  .valuation-summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 14px;
    margin: 12px 0;
  }
  .valuation-card {
    border-radius: 16px;
    padding: 16px 18px;
    background: linear-gradient(135deg, rgba(56, 189, 248, 0.12), rgba(15, 23, 42, 0.05));
    border: 1px solid rgba(14, 165, 233, 0.35);
  }
  .section-block {
          break-inside: avoid; 
          page-break-inside: avoid; 
    margin-bottom: 18px;
  }
  .page-break {
    break-before: page;
    page-break-before: always;
  }
  .rtl {
    direction: rtl;
    unicode-bidi: plaintext;
  }
  .num {
          direction: ltr; 
          unicode-bidi: embed; 
          display: inline-block; 
        }
        @media print {
    body {
      background: #ffffff;
    }
    .document {
      padding: 0;
    }
    .page {
      box-shadow: none;
      border-radius: 0;
      margin: 0;
      border: none;
      padding: 15mm 18mm;
    }
    .page.cover {
      border: none;
      padding: 20mm 22mm;
      min-height: 297mm;
    }
    .cover-footer {
      position: absolute;
      bottom: 20mm;
      left: 22mm;
      right: 22mm;
    }
    .page-footer {
      position: absolute;
      bottom: 10mm;
      left: 18mm;
      right: 18mm;
    }
    thead {
      display: table-header-group;
    }
    tfoot {
      display: table-footer-group;
    }
    .page-number::after {
      content: 'עמוד ' counter(page) ' מתוך ' counter(pages);
    }
  }
  .rich-text {
    white-space: pre-wrap;
    line-height: 1.6;
  }
  .rich-text .section-heading {
    display: block;
          font-weight: 700; 
    margin-top: 12px;
  }
  .comparables-table-block {
    padding: 12px;
    background: rgba(248, 250, 252, 0.9);
    border-radius: 16px;
    border: 1px solid rgba(148, 163, 184, 0.3);
  }
  .comparables-table .table {
          font-size: 9pt; 
  }
  .comparables-table .table th,
  .comparables-table .table td {
    padding: 6px 8px;
    line-height: 1.4;
  }
`

const pageNumberScript = `
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const pages = Array.from(document.querySelectorAll('.page'))
      const total = pages.length
      pages.forEach((page, index) => {
        const target = page.querySelector('[data-page-number]')
        if (target) {
          target.textContent = 'עמוד ' + (index + 1) + ' מתוך ' + total
        }
      })
    })
  </script>
`

const autoPaginateScript = `
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      if (document.body.dataset.paginated === 'true') {
        return;
      }
      document.body.dataset.paginated = 'true';

      const previouslyGenerated = Array.from(document.querySelectorAll('section.page[data-generated-page=\"true\"]'));
      previouslyGenerated.forEach((page) => page.remove());

      const mmToPx = (mm) => (mm * 96) / 25.4
      const MAX_CONTENT_HEIGHT = Math.round(mmToPx(297 - 30)) // A4 height minus ~15mm top/bottom

      const createEmptyPage = (referencePage) => {
        const newPage = document.createElement('section')
        newPage.classList.add('page')
        newPage.setAttribute('data-generated-page', 'true')
        referencePage.classList.forEach((cls) => {
          if (cls !== 'cover' && cls !== 'page') {
            newPage.classList.add(cls)
          }
        })

        const newBody = document.createElement('div')
        newBody.className = 'page-body'
        newPage.appendChild(newBody)

        const pageNumberTemplate = referencePage.querySelector('.page-number[data-page-number]')
        if (pageNumberTemplate) {
          const clone = pageNumberTemplate.cloneNode(true)
          clone.textContent = ''
          newPage.appendChild(clone)
        }

        return { page: newPage, body: newBody }
      }

      const splitPage = (page) => {
        if (page.classList.contains('cover')) {
          return
        }
        const body = page.querySelector('.page-body')
        if (!body) {
          return
        }

        const ensurePageFits = (currentPage, currentBody, safety = 0) => {
          if (safety > 100) {
            console.warn('Auto pagination aborted due to safety threshold')
            return
          }
          if (currentBody.scrollHeight <= MAX_CONTENT_HEIGHT) {
            return
          }

          if (currentBody.children.length === 0) {
            return
          }

          const { page: newPage, body: newBody } = createEmptyPage(page)
          currentPage.parentNode.insertBefore(newPage, currentPage.nextSibling)

          let guard = 0
          while (currentBody.scrollHeight > MAX_CONTENT_HEIGHT && currentBody.children.length > 0) {
            guard++
            if (guard > 200) {
              console.warn('Auto pagination inner loop guard triggered')
              break
            }
            const lastChild = currentBody.lastElementChild
            if (!lastChild) {
              break
            }
            const childHeight = lastChild.getBoundingClientRect ? lastChild.getBoundingClientRect().height : lastChild.scrollHeight
            if (childHeight && childHeight >= MAX_CONTENT_HEIGHT) {
              console.warn('Auto pagination: element exceeds single-page height, leaving in place', lastChild)
              break
            }
            newBody.insertBefore(lastChild, newBody.firstChild)
          }

          if (newBody.children.length === 0) {
            newPage.remove()
            return
          }

          if (currentBody.scrollHeight > MAX_CONTENT_HEIGHT && currentBody.children.length > 0) {
            ensurePageFits(currentPage, currentBody, safety + 1)
          }

          if (newBody.scrollHeight > MAX_CONTENT_HEIGHT && newBody.children.length > 1) {
            ensurePageFits(newPage, newBody, safety + 1)
          }
        }

        ensurePageFits(page, body, 0)
      }

      const pages = Array.from(document.querySelectorAll('section.page'))
      pages.forEach(splitPage)
    })
  </script>
`

const toRichHtml = (value?: string) => {
  if (!value) return ''
  return value
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/##\s?(.*)/g, '<span class="section-heading">$1</span>')
    .replace(/\n/g, '<br/>')
}

const mergeRecords = (...records: Array<Record<string, any> | null | undefined>) => {
  return records.reduce<Record<string, any>>((acc, record) => {
    if (!record || typeof record !== 'object') {
      return acc
    }
    Object.entries(record).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return
      }
      if (acc[key] === undefined) {
        acc[key] = value
      }
    })
    return acc
  }, {})
}

export function generateDocumentHTML(
  data: ValuationData,
  isPreview: boolean = true,
  companySettings?: CompanySettings
): string {
  const customEdits = (data as any).customDocumentEdits || {}
  
  const valuationDate = data.valuationDate || new Date().toISOString()
  const valuationEffectiveDate = data.valuationEffectiveDate || valuationDate
  const address = getAddress(data)
  const reference = getReference(data)
  const finalValue = (data as any).finalValuation || (data as any).marketAnalysis?.estimatedValue

  const neighborhoodName = normalizeText(data.neighborhood, 'שכונה לא צוינה')
  const environmentParagraph = `שכונת ${neighborhoodName}${data.city ? ` ב${data.city}` : ''} נהנית מנגישות טובה, שירותים קהילתיים ומרקם מגורים מגוון.`

  const { landRegistry, owners, mortgages, attachments, additionalAreas } = resolveLandRegistryData(data)

  const plotParagraph = `חלקה ${formatNumber((data as any).land_registry?.chelka || landRegistry?.chelka || data.parcel)} בגוש ${formatNumber((data as any).land_registry?.gush || landRegistry?.gush || data.gush)} בשטח קרקע רשום של ${formatNumber(
    (data as any).parcelArea || (data as any).land_registry?.total_plot_area || (data.extractedData as any)?.total_plot_area || landRegistry?.total_plot_area
  )} מ"ר.`

  const unitDescription = normalizeText(
    landRegistry?.unit_description || data.propertyEssence || (data as any).land_registry?.unit_description || 'דירת מגורים'
  )
  const buildingIdentifier = normalizeText(
    landRegistry?.building_number || landRegistry?.buildingNumber || (data as any).land_registry?.building_number || (data as any).buildingNumber,
    ''
  )
  const buildingCondition = normalizeText(
    (data as any).buildingCondition || (data as any).land_registry?.building_condition || landRegistry?.building_condition,
    'במצב תחזוקתי טוב'
  )
  const propertyDescriptionParts = [unitDescription]
  const floorText = formatFloor(landRegistry?.floor || (data as any).land_registry?.floor || data.floor)
  if (floorText) {
    propertyDescriptionParts.push(floorText)
  }
  if (buildingIdentifier) {
    propertyDescriptionParts.push(`במבנה ${buildingIdentifier}`)
  }
  const propertyParagraph = `${propertyDescriptionParts.join(' ')}. הנכס מצוי ברמת תחזוקה ${buildingCondition}.`
  const interiorNarrative =
    (data as any).extractedData?.propertyLayoutDescription || (data as any).interior_analysis?.description || ''
  const facadeAssessment = (data as any).extractedData?.overallAssessment || (data as any).facadeAssessment || ''

  const sharedBuildingData =
    (data as any).shared_building || (data.extractedData as any)?.shared_building || {}
  const sharedBuildingRaw = sharedBuildingData?.rawData || {}
  const sharedBuildingAddresses: string[] = toArray(
    sharedBuildingData?.building_address || sharedBuildingRaw?.all_addresses?.value
  )
    .filter((value: any): value is string => typeof value === 'string' && value.trim().length > 0)
  const sharedBuildingDescription = normalizeText(
    sharedBuildingData?.building_description ||
      sharedBuildingRaw?.building_description?.value ||
      sharedBuildingRaw?.building_description_formatted,
    ''
  )
  const sharedBuildingNotes = normalizeText(sharedBuildingRaw?.validationNotes, '')
  const sharedBuildingEntries: string[] = toArray(sharedBuildingRaw?.buildings_info?.value)
    .map((info: any) => {
      const buildingNumber = info?.building_number || info?.buildingNumber
      const floors = info?.floors
      const addressText = info?.address
      const subPlots = info?.sub_plots_count || info?.subPlotsCount
      const parts: string[] = []
      if (buildingNumber) {
        parts.push(`מבנה ${buildingNumber}`)
      }
      if (floors) {
        parts.push(`${floors} קומות`)
      }
      if (subPlots) {
        parts.push(`${subPlots} תתי חלקות`)
      }
      const label = parts.join(' • ')
      return label
        ? `${label}${addressText ? ` – ${addressText}` : ''}`
        : addressText || ''
    })
    .filter((text: string) => text && text.trim().length > 0)

  const buildingMetrics = [
    {
      label: 'סוג מבנה',
      value: normalizeText(
        (data as any).buildingType || landRegistry?.building_type || sharedBuildingDescription,
        ''
      )
    },
    {
      label: 'מספר מבנים',
      value: (() => {
        const candidate =
          sharedBuildingData?.buildings_count ||
          (sharedBuildingEntries.length > 0 ? sharedBuildingEntries.length : '') ||
          landRegistry?.buildings_count
        return candidate ? formatNumber(candidate, '') : ''
      })()
    },
    {
      label: 'מספר קומות',
      value: normalizeText(
        (data as any).buildingFloors ||
          sharedBuildingData?.building_floors ||
          sharedBuildingRaw?.building_floors?.value ||
          landRegistry?.building_floors,
        ''
      )
    },
    {
      label: 'מספר יחידות',
      value: (() => {
        const candidate =
          (data as any).buildingUnits ||
          sharedBuildingData?.total_sub_plots ||
          sharedBuildingRaw?.total_sub_plots?.value ||
          sharedBuildingRaw?.building_sub_plots_count?.value ||
          landRegistry?.sub_plots_count
        return candidate ? formatNumber(candidate, '') : ''
      })()
    },
    {
      label: 'שימושים מותרים',
      value: normalizeText(
        (data as any).permittedUse ||
          (data as any).buildingRights ||
          (data as any).building_permit?.permitted_usage ||
          landRegistry?.permitted_usage,
        ''
      )
    },
    {
      label: 'שטחים משותפים',
      value: normalizeText(
        (data as any).sharedAreas ||
          sharedBuildingRaw?.specific_sub_plot?.value?.shared_property_parts ||
          landRegistry?.shared_property,
        ''
      )
    },
    {
      label: 'מצב תחזוקה',
      value: normalizeText(
        (data as any).buildingCondition ||
          landRegistry?.building_condition ||
          sharedBuildingRaw?.conditionAssessment,
        ''
      )
    }
  ].filter((row) => row.value && row.value !== '—')

  const sharedBuildingParagraph = sharedBuildingDescription || 'צו רישום בית משותף מסדיר את חלוקת הזכויות והצמדות הדירה, כולל מקומות חניה ומחסנים תואמים לתשריט.'
  const primaryPlanningPlans: any[] = Array.isArray((data as any).planningPlans) ? (data as any).planningPlans : []
  const supplementalPlanningPlans = [
    ...toArray((data as any).land_registry?.planning_plans),
    ...toArray((data as any).land_registry?.planningPlans),
    ...toArray((landRegistry as any)?.planning_plans),
    ...toArray((landRegistry as any)?.planningPlans),
    ...toArray((data.extractedData as any)?.planning_plans),
    ...toArray((data.extractedData as any)?.planningPlans)
  ]
  const planningPlans: any[] = dedupeByKey(
    [...primaryPlanningPlans, ...supplementalPlanningPlans],
    (plan: any) => `${plan?.plan_number || plan?.planNumber || plan?.id || plan?.name || ''}`
  )
  const planningParagraph = planningPlans.length > 0
    ? `התכניות הרלוונטיות כוללות ${planningPlans
        .map((plan) => `${plan.plan_number || plan.planNumber || 'תכנית'} (${plan.status || 'בתוקף'})`)
        .join(', ')}.`
    : 'לא אותרו תכניות נוספות מעבר לתכנית המתאר החלה במקום.'

  const buildingPermitParagraph = data.buildingPermitNumber
    ? `היתר בניה מס' ${data.buildingPermitNumber} מיום ${formatDateNumeric((data as any).land_registry?.building_permit_date || data.buildingPermitDate || '')} מאשר את הבניה בפועל.`
    : 'המידע על היתרי הבניה יעודכן לאחר עיון בתיק הבניין.'

  const buildingPermit: Record<string, any> = (data as any).building_permit || {}
  
  // Page header and footer components for regular pages
  const pageHeader = companySettings?.companyLogo ? `
    <div class="page-header-brand">
      <img src="${companySettings.companyLogo}" alt="לוגו" style="max-height: 54px;" />
    </div>
  ` : ''
  
  const pageFooter = companySettings?.footerLogo ? `
    <div class="page-footer">
      <img src="${companySettings.footerLogo}" alt="פרטי קשר" />
    </div>
  ` : ''

  const buildingPermitRows: Array<{ label: string; value: string }> = [
    {
      label: 'מספר היתר',
      value: normalizeText(
        buildingPermit?.permit_number ||
          data.buildingPermitNumber,
        ''
      )
    },
    {
      label: 'תאריך היתר',
      value: (() => {
        const dateCandidate =
          buildingPermit?.permit_issue_date ||
          buildingPermit?.permit_date ||
          data.buildingPermitDate
        const formatted = formatDateNumeric(dateCandidate)
        return formatted && formatted !== '—' ? formatted : ''
      })()
    },
    {
      label: 'שימוש מותר',
      value: normalizeText(
        buildingPermit?.permitted_usage ||
          (data as any).permittedUse ||
          (data as any).buildingRights,
        ''
      )
    },
    {
      label: 'תיאור הבניה',
      value: normalizeText(
        buildingPermit?.building_description ||
          data.buildingDescription,
        ''
      )
    },
    {
      label: 'ועדה מקומית',
      value: normalizeText(buildingPermit?.local_committee_name, '')
    },
    {
      label: 'גוש / חלקה',
      value: [
        formatNumber(buildingPermit?.gush, ''),
        formatNumber(buildingPermit?.chelka, ''),
        formatNumber(buildingPermit?.sub_chelka, '')
      ]
        .filter(Boolean)
        .map((value, index) => (index === 0 ? `גוש ${value}` : index === 1 ? `חלקה ${value}` : `תת חלקה ${value}`))
        .join(' • ')
    }
  ].filter((row) => row.value && row.value !== '—')

  // ===== COVER PAGE =====
  const headerBlock = `
    <section class="page cover">
      <div class="cover-inner">
        ${companySettings?.companyLogo ? `
          <div class="cover-logo">
            <img src="${companySettings.companyLogo}" alt="לוגו" style="max-height: 80px;" />
                  </div>
                ` : ''}
        <div class="cover-title-card">
          <div class="badge">חוות דעת בעניין</div>
          <div class="title-primary">${LOCKED_HEBREW_TEXT.coverMainTitle}</div>
          <div class="title-secondary">${LOCKED_HEBREW_TEXT.coverSubtitle}</div>
          <div class="address">${address}</div>
                  </div>
        ${(() => {
          const coverImages = resolveCoverImageSources(data)
          if (!coverImages.length) {
            return `
          <div class="cover-image-frame" style="display: flex; align-items: center; justify-content: center; min-height: 260px; background: rgba(15, 23, 42, 0.25);">
            <div style="text-align: center; color: rgba(226,232,240,0.85);">
              <div style="font-size: 46px; margin-bottom: 12px;">📷</div>
              <div>תמונה חיצונית לא הועלתה</div>
              </div>
              </div>
        `
          }
          return `
        <div class="cover-image-frame">
          <img src="${coverImages[0]}" alt="תמונה חיצונית" data-managed-image="true" />
              </div>
      `
        })()}
      </div>
        ${companySettings?.footerLogo ? `
          <div class="cover-footer">
          <img src="${companySettings.footerLogo}" alt="פרטי קשר" />
            </div>
                ` : ''}
        <div class="page-number" data-page-number=""></div>
    </section>
  `

  // ===== OPENING PAGE =====
  const introductionPage = `
    <section class="page">
      <div class="page-body">
        ${pageHeader}
        <div class="section-block">
          <div class="sub-title">${LOCKED_HEBREW_TEXT.coverSubtitle}</div>
          <p>${address}</p>
                    </div>
        <p class="section-block">${LOCKED_HEBREW_TEXT.openingIntro}</p>
        <div class="section-block">
          <div class="sub-title">${LOCKED_HEBREW_TEXT.purposeTitle}</div>
          <p>${LOCKED_HEBREW_TEXT.purposeText}</p>
          <p>${LOCKED_HEBREW_TEXT.limitationText}</p>
                </div>
        <div class="section-block">
          <div class="sub-title">מזמין חוות הדעת:</div>
          <p>${normalizeText(data.clientName)}</p>
                </div>
        <div class="info-grid section-block">
          <p><strong>מועד הביקור בנכס:</strong> ${formatDateHebrew(valuationEffectiveDate)}, על ידי ${normalizeText(data.shamayName, 'שמאי מקרקעין מוסמך')}.</p>
          <p><strong>המועד הקובע לשומה:</strong> ${formatDateHebrew(valuationEffectiveDate)}</p>
          </div>
        <div class="section-block">
          <div class="sub-title">פרטי הנכס:</div>
          <table class="table details-table">
            <tbody>
              ${createDetailsTable(data)}
            </tbody>
          </table>
        </div>
        <p class="page-note">
          <sup>1</sup> בהתאם לנסח רישום מקרקעין מיום ${formatDateNumeric((data as any).land_registry?.extractDate || data.extractDate)}.<br/>
          ${data.buildingPermitNumber ? `<sup>2</sup> עפ"י מדידה מתוך תכנית היתר בניה מס' ${data.buildingPermitNumber} מיום ${formatDateNumeric(data.buildingPermitDate || undefined)}.` : ''}
                </p>
      </div>
      ${pageFooter}
        <div class="page-number" data-page-number=""></div>
    </section>
  `

  // ===== CHAPTER 1 =====
  const interiorGallery = collectInteriorImages(data)
  const sectionOne = `
    <section class="page">
      <div class="page-body">
        ${pageHeader}
        <div class="chapter-title">${LOCKED_HEBREW_TEXT.chapter1Title}</div>
        <div>
          <div class="sub-title">1.1 תיאור השכונה, גבולותיה, מאפייניה וסביבתה</div>
          <p>${environmentParagraph}</p>
              </div>
        ${(data.gisScreenshots?.cropMode0 || data.gisScreenshots?.cropMode1) ? `
          <div class="media-gallery section-block">
            ${data.gisScreenshots?.cropMode0 ? `
              <figure class="media-card">
                <img src="${data.gisScreenshots.cropMode0}" alt="מפת הסביבה" />
                <figcaption class="media-caption">מקור: GovMap</figcaption>
              </figure>
            ` : ''}
            ${data.gisScreenshots?.cropMode1 ? `
              <figure class="media-card">
                <img src="${data.gisScreenshots.cropMode1}" alt="מפת הסביבה" />
                <figcaption class="media-caption">מקור: GovMap</figcaption>
              </figure>
            ` : ''}
                </div>
              ` : ''}
        <div class="section-block">
          <div class="sub-title">1.2 תיאור החלקה</div>
          <p>${plotParagraph}</p>
                </div>
        ${(data as any).parcelBoundaries ? `
          <div class="section-block">
            <div class="sub-title">גבולות החלקה</div>
            <div class="info-grid">
              ${(data as any).parcelBoundaries.north ? `<p><strong>צפון:</strong> ${(data as any).parcelBoundaries.north}</p>` : ''}
              ${(data as any).parcelBoundaries.south ? `<p><strong>דרום:</strong> ${(data as any).parcelBoundaries.south}</p>` : ''}
              ${(data as any).parcelBoundaries.east ? `<p><strong>מזרח:</strong> ${(data as any).parcelBoundaries.east}</p>` : ''}
              ${(data as any).parcelBoundaries.west ? `<p><strong>מערב:</strong> ${(data as any).parcelBoundaries.west}</p>` : ''}
            </div>
                </div>
              ` : ''}
        <div class="section-block">
          <div class="sub-title">1.3 תיאור הבניין ונשוא חוות הדעת</div>
          <p>${propertyParagraph}</p>
          <p>${normalizeText(
            (data.internalLayout as string),
            'לא סופק תיאור לחלוקה הפנימית'
          )}</p>
                </div>
        ${buildingMetrics.length > 0 ? `
          <div class="section-block">
            <div class="sub-title">מאפייני המבנה</div>
            <div class="info-grid">
              ${buildingMetrics
                .map((metric) => `<p><strong>${metric.label}:</strong> ${metric.value}</p>`)
                .join('')}
                </div>
                </div>
              ` : ''}
        ${(sharedBuildingDescription || sharedBuildingEntries.length || sharedBuildingAddresses.length || sharedBuildingNotes) ? `
          <div class="section-block">
            <div class="sub-title">פרטי הבית המשותף</div>
            ${sharedBuildingDescription ? `<p>${sharedBuildingDescription}</p>` : ''}
            ${sharedBuildingEntries.length > 0 ? `
              <ul class="bullet-list">
                ${sharedBuildingEntries.map((entry: string) => `<li>${entry}</li>`).join('')}
              </ul>
              ` : ''}
            ${sharedBuildingAddresses.length > 0 ? `<p class="muted">כתובות: ${sharedBuildingAddresses.join(' • ')}</p>` : ''}
            ${sharedBuildingNotes ? `<p class="muted">${sharedBuildingNotes}</p>` : ''}
            </div>
                  ` : ''}
        ${interiorNarrative ? `
          <div class="section-block">
            <div class="sub-title">ניתוח פנימי מפורט</div>
            <div class="rich-text">${toRichHtml(interiorNarrative)}</div>
                </div>
              ` : ''}
        ${facadeAssessment ? `
          <div class="section-block">
            <div class="sub-title">ניתוח חזית המבנה</div>
            <div class="rich-text">${toRichHtml(facadeAssessment)}</div>
                    </div>
        ` : ''}
        ${interiorGallery.length > 0 ? `
          <div class="section-block">
            <div class="sub-title">תמונות אופייניות להמחשה</div>
            <div class="media-gallery">
              ${interiorGallery
                .filter((img: string) => img && img.trim() && img.trim().length > 0)
                .map((img: string, idx: number) => `
                <figure class="media-card">
                  <img
                    src="${img}"
                    alt="תמונה פנימית ${idx + 1}"
                    data-managed-image="true"
                  />
                </figure>
                  `).join('')}
                </div>
                </div>
              ` : ''}
      </div>
      ${pageFooter}
        <div class="page-number" data-page-number=""></div>
    </section>
  `

  // ===== CHAPTER 2 - Legal Status =====
  const extractedAttachmentsArray = Array.isArray((data.extractedData as any)?.attachments)
    ? (data.extractedData as any).attachments.map((att: any) => ({
        type: att?.description || att?.type,
        area: att?.area,
        color: att?.color,
        symbol: att?.symbol
      }))
    : []
  const combinedAttachments = dedupeByKey([...extractedAttachmentsArray, ...attachments], (item) => {
    return [item.type || '', item.area || '', item.color || '', item.symbol || ''].join('|')
  })

  const extractedOwnersArray = Array.isArray((data.extractedData as any)?.owners)
    ? (data.extractedData as any).owners.map((owner: any) => ({
        name: owner?.name || owner?.owner_name,
        idNumber: owner?.id_number || owner?.idNumber,
        share: owner?.ownership_share || owner?.share || 'שלמות'
      }))
    : []
  const combinedOwners = dedupeByKey([...extractedOwnersArray, ...owners], (item) => {
    return [item.name || '', item.idNumber || '', item.share || ''].join('|')
  })

  const extractedMortgagesArray = Array.isArray((data.extractedData as any)?.mortgages)
    ? (data.extractedData as any).mortgages.map((mortgage: any) => ({
        rank: mortgage?.rank || mortgage?.degree,
        share: mortgage?.fraction || mortgage?.share,
        amount: mortgage?.amount,
        lenders: mortgage?.lenders,
        borrowers: mortgage?.borrowers,
        registrationDate: mortgage?.date,
        essence: mortgage?.essence
      }))
    : []
  const combinedMortgages = dedupeByKey([...extractedMortgagesArray, ...mortgages], (item) => {
    return [item.rank || '', item.lenders || '', item.registrationDate || ''].join('|')
  })

  const extractedNotesArray = Array.isArray((data.extractedData as any)?.notes)
    ? (data.extractedData as any).notes.map((note: any) => ({
        actionType: note?.action_type || note?.actionType,
        date: note?.date,
        beneficiary: note?.beneficiary,
        extra: note?.extra
      }))
    : []
  const landRegistryNotesArray = toArray((landRegistry as any)?.notes).map((note: any) => ({
    actionType: note?.action_type || note?.actionType,
    date: note?.date,
    beneficiary: note?.beneficiary,
    extra: note?.extra
  }))
  const combinedNotes = dedupeByKey([...extractedNotesArray, ...landRegistryNotesArray], (item) => {
    return [item.actionType || '', item.date || '', item.beneficiary || ''].join('|')
  })

  const registrarOffice = normalizeText(
    data.extractedData?.registration_office || landRegistry?.registration_office || (data as any).land_registry?.registryOffice,
    '—'
  )
  const extractDate = formatDateNumeric(
    data.extractDate || landRegistry?.tabu_extract_date || landRegistry?.issue_date || landRegistry?.registry_date
  )
  const blockNum = formatNumber(
    data.extractedData?.gush || landRegistry?.gush || data.gush
  )
  const parcelNum = formatNumber(
    data.extractedData?.chelka || landRegistry?.chelka || data.parcel
  )
  const parcelAreaSqm = formatNumber(
    (data as any).parcelArea ||
      (data.extractedData as any)?.total_plot_area ||
      landRegistry?.total_plot_area
  )
  const subParcelNum = formatNumber(
    data.extractedData?.sub_chelka ||
      landRegistry?.sub_chelka ||
      data.subParcel
  )
  const registeredAreaSqm = formatNumber(
    (data as any).registeredArea ||
      data.extractedData?.apartment_registered_area ||
      landRegistry?.apartment_registered_area
  )
  const sharedProperty = normalizeText(
    (data.extractedData as any)?.shared_property || landRegistry?.shared_property,
    '—'
  )
  
  const sectionTwo = `
    <section class="page">
      <div class="page-body">
        ${pageHeader}
        <div class="chapter-title">${LOCKED_HEBREW_TEXT.chapter2Title}</div>
        <p class="muted">להלן סקירה תמציתית של המצב המשפטי החל על המקרקעין נשוא חוות הדעת, אשר אינה מהווה תחליף לעיון מקיף במסמכים המשפטיים.</p>
        <div class="section-block">
          <div class="sub-title">2.1 נסח רישום מקרקעין (נסח טאבו)</div>
          <p>תמצית מידע מפנקס הזכויות המתנהל בלשכת רישום המקרקעין ${registrarOffice}, אשר הופק באמצעות אתר האינטרנט של רשם המקרקעין במשרד המשפטים, בתאריך ${extractDate}.</p>
          <p>חלקה ${parcelNum} בגוש ${blockNum}, בשטח קרקע רשום של ${parcelAreaSqm} מ"ר.</p>
          <div class="info-grid">
            <p><strong>תת-חלקה:</strong> ${subParcelNum}</p>
            <p><strong>קומה:</strong> ${normalizeText(landRegistry?.floor || data.floor?.toString(), '—')}</p>
            <p><strong>מספר מבנה:</strong> ${normalizeText(buildingIdentifier, '—')}</p>
            <p><strong>שטח רשום:</strong> ${registeredAreaSqm} מ"ר</p>
            <p><strong>חלק ברכוש משותף:</strong> ${sharedProperty}</p>
                          </div>
        </div>
        ${combinedAttachments.length > 0 ? `
          <div class="section-block">
            <div class="sub-title">הצמדות</div>
            <ul class="legal-list">
              ${combinedAttachments.map((att: any) => `
                <li>${normalizeText(att.type)}${att.area ? ` בשטח ${formatNumber(att.area)} מ"ר` : ''}${att.symbol ? `, המסומנ/ת בתשריט באות ${att.symbol}` : ''}${att.color ? `, בצבע ${att.color}` : ''}.</li>
                        `).join('')}
            </ul>
                      </div>
        ` : ''}
        ${additionalAreas.length > 0 ? `
          <div class="section-block">
            <div class="sub-title">שטחים נוספים</div>
            <ul class="legal-list">
              ${additionalAreas.map((area: any) => `
                <li>${normalizeText(area.type)}${area.area ? ` בשטח ${formatNumber(area.area)} מ"ר` : ''}.</li>
              `).join('')}
            </ul>
                    </div>
        ` : ''}
        ${combinedOwners.length > 0 ? `
          <div class="section-block">
            <div class="sub-title">בעלויות</div>
            <ul class="legal-list">
              ${combinedOwners.map((owner: any) => `
                <li>${normalizeText(owner.name)}${owner.idNumber ? `, ת.ז ${owner.idNumber}` : ''}, חלק בנכס – ${normalizeText(owner.share, 'שלמות')}.</li>
              `).join('')}
            </ul>
            </div>
        ` : `<p>בעלויות: ${formatOwnership(data)}</p>`}
        ${combinedMortgages.length > 0 ? `
          <div class="section-block">
            <div class="sub-title">משכנתאות</div>
            <ul class="legal-list">
              ${combinedMortgages.map((mortgage: any) => `
                <li>משכנתא מדרגה ${normalizeText(mortgage.rank, '—')} לטובת ${normalizeText(mortgage.lenders)}${mortgage.amount ? ` על סך ₪${formatNumber(mortgage.amount)}` : ''}${mortgage.registrationDate ? `, מיום ${formatDateNumeric(mortgage.registrationDate)}` : ''}${mortgage.share ? `, חלק בנכס: ${normalizeText(mortgage.share)}` : ''}.</li>
              `).join('')}
            </ul>
                </div>
              ` : ''}
        ${combinedNotes.length > 0 ? `
          <div class="section-block">
            <div class="sub-title">הערות</div>
            <ul class="legal-list">
              ${combinedNotes.map((note: any) => `
                <li>${normalizeText(note.actionType)}${note.date ? ` מיום ${formatDateNumeric(note.date)}` : ''}${note.beneficiary ? ` לטובת ${normalizeText(note.beneficiary)}` : ''}${note.extra ? `, ${normalizeText(note.extra)}` : ''}.</li>
              `).join('')}
            </ul>
            </div>
        ` : ''}
        ${(data.extractedData as any)?.plot_notes || data.notes ? `
          <div class="callout section-block">
            ${(data.extractedData as any)?.plot_notes || data.notes}
          </div>
        ` : ''}
        ${(sharedBuildingDescription || sharedBuildingEntries.length || sharedBuildingAddresses.length || sharedBuildingNotes) ? `
          <div class="section-block">
            <div class="sub-title">2.2 מסמכי בית משותף</div>
            <p>${sharedBuildingParagraph}</p>
            ${sharedBuildingEntries.length > 0 ? `
              <ul class="legal-list">
                ${sharedBuildingEntries.map((entry: string) => `<li>${entry}</li>`).join('')}
              </ul>
            ` : ''}
            ${sharedBuildingAddresses.length > 0 ? `<p class="muted">כתובות: ${sharedBuildingAddresses.join(' • ')}</p>` : ''}
            ${sharedBuildingNotes ? `<p class="muted">${sharedBuildingNotes}</p>` : ''}
          </div>
        ` : ''}
        <div class="section-block">
          <div class="sub-title">2.3 הסתייגות</div>
          <p>${LOCKED_HEBREW_TEXT.legalDisclaimer}</p>
        </div>
        ${landRegistry?.easements_description || landRegistry?.easements_essence ? `
          <div class="callout section-block">
            <strong>הערות ונשיאת זיקת הנאה:</strong> ${normalizeText(landRegistry?.easements_description || landRegistry?.easements_essence)}
          </div>
        ` : ''}
        ${buildingPermitRows.length > 0 ? `
          <table class="table details-table">
            <tbody>
              ${buildingPermitRows
                .map((row) => `
                  <tr>
                    <th>${row.label}</th>
                    <td>${row.value}</td>
                  </tr>
                `)
                .join('')}
            </tbody>
          </table>
        ` : ''}
          </div>
      ${pageFooter}
        <div class="page-number" data-page-number=""></div>
      </section>
  `

  // ===== CHAPTER 3 - Planning & Licensing =====
  const planningSection = `
    <section class="page">
      <div class="page-body">
        ${pageHeader}
        <div class="chapter-title">${LOCKED_HEBREW_TEXT.chapter3Title}</div>
        
        <div class="sub-title">3.1 ריכוז תכניות בניין עיר רלוונטיות</div>
        ${planningPlans.length >= 4 ? `
          <table class="table">
                <thead>
              <tr>
                <th>מספר תכנית</th>
                <th>שם תכנית</th>
                <th>תאריך פרסום</th>
                <th>סטטוס</th>
                  </tr>
                </thead>
                <tbody>
              ${planningPlans.map((plan: any) => `
                <tr>
                  <td>${plan.plan_number || plan.planNumber || 'N/A'}</td>
                  <td>${plan.plan_name || plan.name || 'N/A'}</td>
                  <td>${plan.publication_date || plan.publicationDate || 'N/A'}</td>
                  <td>${plan.status || 'בתוקף'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : `
          <p style="color: #dc2626; font-weight: 600;">⚠️ נדרש מילוי מינימום 4 תוכניות לפני ייצוא הדוח</p>
        `}
        
        <div class="sub-title">3.2 ריכוז זכויות בנייה</div>
                <div>
          ${(data as any).planningRights ? `
            <table class="table details-table">
              <tbody>
                <tr><th>ייעוד:</th><td>${normalizeText((data as any).planningRights.usage)}</td></tr>
                <tr><th>שטח מגרש מינימלי:</th><td>${normalizeText((data as any).planningRights.minLotSize)}</td></tr>
                <tr><th>אחוזי בנייה:</th><td>${normalizeText((data as any).planningRights.buildPercentage)}</td></tr>
                <tr><th>מספר קומות מותרות:</th><td>${normalizeText((data as any).planningRights.maxFloors)}</td></tr>
                <tr><th>מספר יחידות דיור:</th><td>${normalizeText((data as any).planningRights.maxUnits)}</td></tr>
                <tr><th>קווי בניין:</th><td>${normalizeText((data as any).planningRights.buildingLines)}</td></tr>
              </tbody>
            </table>
          ` : `<p style="color: #dc2626;">⚠️ נדרש מילוי זכויות בנייה (6 שדות חובה)</p>`}
              </div>
              
        <div class="sub-title">3.3 רישוי בנייה</div>
        <p>מעיון בתיק הבניין הסרוק בוועדה המקומית לתכנון ובניה ${normalizeText(data.city)}, אותרו המסמכים הרלוונטיים הבאים:</p>
        ${data.buildingPermitNumber ? `
          <p>• היתר בניה מס' ${data.buildingPermitNumber} מיום ${formatDateNumeric(data.buildingPermitDate || undefined)}, ${normalizeText(data.buildingDescription, '—')}.</p>
              ` : ''}
        ${(data as any).buildingPermitNumber2 ? `
          <p>• היתר בניה מס' ${(data as any).buildingPermitNumber2} מיום ${formatDateNumeric((data as any).buildingPermitDate2 || undefined)}, ${normalizeText((data as any).buildingDescription2, '—')}.</p>
              ` : ''}
        ${buildingPermitRows.length > 0 ? `
          <table class="table details-table">
            <tbody>
              ${buildingPermitRows
                .map((row) => `
                  <tr>
                    <th>${row.label}</th>
                    <td>${row.value}</td>
                  </tr>
                `)
                .join('')}
            </tbody>
          </table>
              ` : ''}
        ${data.garmushkaMeasurements?.pngExport ? `
          <figure class="media-card">
            <img src="${data.garmushkaMeasurements.pngExport}" alt="תשריט" />
            <figcaption class="media-caption">תשריט הדירה מתוך תכנית ההיתר</figcaption>
          </figure>
        ` : ''}

        <div class="sub-title">3.4 זיהום קרקע</div>
        <p>${LOCKED_HEBREW_TEXT.contaminationDefault}</p>
                </div>
      ${pageFooter}
        <div class="page-number" data-page-number=""></div>
    </section>
  `

  // ===== CHAPTER 4 - Factors & Considerations =====
  const considerationsSection = `
    <section class="page">
      <div class="page-body">
        ${pageHeader}
        <div class="chapter-title">${LOCKED_HEBREW_TEXT.chapter4Title}</div>
        <p>${LOCKED_HEBREW_TEXT.considerationsIntro}</p>
        <div class="section-block">
          <div class="sub-title">הסביבה והנכס</div>
          <ul class="bullet-list">
            <li>מיקום הנכס ב${address}.</li>
            <li>נשוא חוות הדעת: ${data.propertyEssence || 'דירת מגורים'} ${formatFloor(data.floor)}.</li>
            <li>שטח הדירה, החלוקה הפונקציונאלית ורמת הגמר (הכל מפורט בפרק 1).</li>
          </ul>
                  </div>
        <div class="section-block">
          <div class="sub-title">מצב הזכויות</div>
          <ul class="bullet-list">
            <li>הזכויות בנכס – ${formatOwnership(data)}.</li>
            <li>הדירה זוהתה בהתאם לתשריט הבית המשותף כתת חלקה ${formatNumber(data.extractedData?.sub_chelka || data.subParcel)} הנמצאת בקומה ${normalizeText(data.floor?.toString(), '—')}.</li>
          </ul>
              </div>
        <div class="section-block">
          <div class="sub-title">מצב תכנוני ורישוי</div>
          <ul class="bullet-list">
            <li>זכויות הבניה עפ"י תכניות בניין עיר בתוקף (כמפורט בפרק 3).</li>
            <li>הבנוי בפועל תואם את תכנית היתר הבניה.</li>
          </ul>
            </div>
        <div class="section-block">
          <div class="sub-title">אומדן השווי</div>
          <ul class="bullet-list">
            <li>הערכת שווי הנכס נערכה בגישת ההשוואה, תוך ביצוע התאמות נדרשות לנכס נשוא השומה.</li>
            <li>מחירי נכסים דומים תוך ביצוע התאמות לנכס נשוא חוות הדעת, נכון למועד הביקור בנכס.</li>
            <li>המחירים המפורטים בשומה כוללים מע"מ כנהוג בנכסים מסוג זה.</li>
            <li>הזכויות בנכס הוערכו כחופשיות מכל חוב, שעבוד או מחזיק.</li>
              </ul>
            </div>
          </div>
      ${pageFooter}
        <div class="page-number" data-page-number=""></div>
      </section>
  `

  // ===== CHAPTER 5 - Calculations =====
  const comparablesList = (data as any).comparableData || []
  const includedComps = comparablesList.filter((c: any) => c.included !== false)
  const equivPricePerSqm = (data as any).pricePerSqm || (data as any).marketAnalysis?.averagePricePerSqm || 0
  
  const valuationSection = `
    <section class="page">
      <div class="page-body">
        ${pageHeader}
        <div class="chapter-title">${LOCKED_HEBREW_TEXT.chapter5Title}</div>
        
        <div class="sub-title">5.1 נתוני השוואה</div>
        <p>${LOCKED_HEBREW_TEXT.comparablesIntro.replace('{{city}}', normalizeText(data.city, '—'))}</p>
        
        ${includedComps.length >= 3 ? `
          <div class="section-block comparables-table-block">
            <div class="comparables-table">
              ${createComparablesTable(data)}
              <p class="muted">* מוצגות ${includedComps.length} עסקאות כלולות מתוך ${comparablesList.length} שנבדקו</p>
            </div>
            </div>
        ` : `
          <p style="color: #dc2626; font-weight: 600;">⚠️ נדרשות מינימום 3 עסקאות השוואה לחישוב שווי</p>
        `}
        
        <div class="sub-title">5.2 תחשיב שווי הנכס</div>
        <div class="section-block">
          <p>${LOCKED_HEBREW_TEXT.calculationIntro.replace('{{calc.eq_psm}}', formatNumber(equivPricePerSqm))}</p>
          
          <table class="table">
                  <thead>
            <tr>
              <th>תיאור הנכס</th>
              <th>שטח דירה בנוי (מ"ר)</th>
              <th>שטח מרפסות (מ"ר)</th>
              <th>שטח אקו' (מ"ר)</th>
              <th>שווי למ"ר אקו' (₪)</th>
              <th>שווי הנכס (₪)</th>
                    </tr>
                  </thead>
                  <tbody>
            <tr>
              <td>${normalizeText(data.propertyEssence, 'דירת מגורים')} ${data.rooms ? `בת ${data.rooms} חדרים` : ''} ברחוב ${normalizeText(data.street)}${data.neighborhood ? `, שכונת ${data.neighborhood}` : ''}</td>
              <td>${formatNumber(data.extractedData?.builtArea || data.builtArea)} מ"ר</td>
              <td>${formatNumber((data.extractedData as any)?.balconyArea || (data as any).balconyArea || 0)} מ"ר</td>
              <td>${(() => {
                const built = Number(data.extractedData?.builtArea || data.builtArea || 0)
                const balcony = Number((data.extractedData as any)?.balconyArea || (data as any).balconyArea || 0)
                if (!built) return '—'
                return (built + balcony * 0.5).toFixed(1)
              })()}</td>
              <td>₪ ${formatNumber(equivPricePerSqm)}</td>
              <td>₪ ${formatNumber(finalValue)}</td>
                      </tr>
            <tr>
              <td colspan="5">${LOCKED_HEBREW_TEXT.vatIncluded}</td>
              <td>₪ ${formatNumber(finalValue)}</td>
                </tr>
              </tbody>
            </table>
        </div>
      </div>
      ${pageFooter}
        <div class="page-number" data-page-number=""></div>
      </section>
  `

  // ===== CHAPTER 6 - Final Valuation & Signature =====
  const finalValueText = numberToHebrewWords(finalValue)
  
  const summarySection = `
    <section class="page">
      <div class="page-body">
        ${pageHeader}
        <div class="chapter-title">${LOCKED_HEBREW_TEXT.chapter6Title}</div>
        
        <div class="valuation-summary section-block">
          <div class="valuation-card">
            <p>${LOCKED_HEBREW_TEXT.finalValuationTemplate
              .replace('{{asset_value_num}}', formatCurrency(finalValue))
              .replace('{{asset_value_txt}}', finalValueText)}</p>
            <p style="margin-top: 8px;">${LOCKED_HEBREW_TEXT.vatIncluded}</p>
            <p style="margin-top: 6px;">${LOCKED_HEBREW_TEXT.currentStateText}</p>
            </div>
                </div>
        
        <div class="section-block">
          <div class="sub-title">הצהרת השמאי</div>
          <p>${LOCKED_HEBREW_TEXT.declarationText}</p>
                </div>
        
        <div class="signature-block section-block">
          <div>
            <p>${LOCKED_HEBREW_TEXT.signatureIntro}</p>
            <p>${normalizeText(data.shamayName, 'שם השמאי')}</p>
            <p>${normalizeText(data.shamaySerialNumber, 'מספר רישיון')}</p>
            </div>
          ${companySettings?.signature ? `
            <div>
              <img src="${companySettings.signature}" alt="חתימה" class="signature-image" />
          </div>
          ` : `
            <div class="signature-placeholder">מקום לחתימה</div>
          `}
        </div>
      </div>
      ${pageFooter}
      <div class="page-number" data-page-number=""></div>
    </section>
  `

  const css = buildBaseCss()
  
  // Runtime scripts for preview mode
  const previewScripts = isPreview
    ? [pageNumberScript, autoPaginateScript].join('\n')
    : ''

  const bodyContent = `
    <div class="document">
      ${headerBlock}
      ${introductionPage}
      ${sectionOne}
      ${sectionTwo}
      ${planningSection}
      ${considerationsSection}
      ${valuationSection}
      ${summarySection}
    </div>
    ${previewScripts}
    ${(() => {
      if (!customEdits || Object.keys(customEdits).length === 0) {
        return '<script>window.__customEditsApplied = true;</script>'
      }
      const editsJson = JSON.stringify(customEdits) 
      return `
    <script>
      (function() {
        const applyEdits = () => {
          try {
            const edits = ${editsJson};
            
            Object.entries(edits).forEach(([selector, html]) => {
              try {
                const elements = document.querySelectorAll(selector);
                if (!elements.length) return;
                elements.forEach((element) => {
                  element.innerHTML = html;
                });
              } catch (selectorError) {
                console.error('Failed to apply edit:', selectorError.message);
              }
            });
            window.__customEditsApplied = true;
          } catch (error) {
            console.error('Error applying custom document edits:', error);
            window.__customEditsApplied = true;
          }
        };

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', applyEdits);
        } else {
          applyEdits();
        }
      })();
    </script>
      `
    })()}
  `

  // PDF export CSS - clean structure for Puppeteer's header/footer system
  const pdfExportCss = !isPreview ? `
    /* PDF export uses Puppeteer's displayHeaderFooter system in export.js */
    /* This CSS just ensures clean HTML structure for extraction */
    
    @page { 
      size: A4; 
      margin: 0; 
    }
    
    body {
      margin: 0;
      padding: 0;
    }
    
    /* Cover page: standalone, rendered separately */
    .cover {
      position: relative;
      background: white;
    }
    
    /* Content pages: extracted and rendered with Puppeteer header/footer */
    .pages {
      position: relative;
    }
    
    /* Flatten page wrappers for natural content flow */
    .pages main .page {
      padding: 0 !important;
      margin: 0 !important;
      border: none !important;
      background: transparent !important;
    }
    
    .pages main .page-body {
      padding: 0 16px !important;
    }
    
    /* Hide inline header/footer elements (not needed with Puppeteer system) */
    .pages main .page-header-brand,
    .pages main .page-footer,
    .pages main .page-number {
      display: none !important;
    }
  ` : ''
  
  // For PDF export, restructure HTML into two sections
  const customEditsScript = (() => {
    if (!customEdits || Object.keys(customEdits).length === 0) {
      return `
        <script>
          window.__customEditsApplied = true;
        </script>
      `
    }
    
    const transformedEdits = customEdits
    const editsJson = JSON.stringify(transformedEdits)
    
    return `
      <script>
        (function() {
          const edits = ${editsJson};
          
          const applyEdits = () => {
            try {
              const base = document.querySelector('.document') || document;
              
              Object.entries(edits).forEach(([selector, html]) => {
                try {
                  const elements = base.querySelectorAll(selector);
                  elements.forEach((element) => {
                    element.innerHTML = html;
                  });
                } catch (err) {
                  console.error('Failed to apply selector:', selector, err);
                }
              });
              
              window.__customEditsApplied = true;
            } catch (error) {
              console.error('Error applying custom edits:', error);
              window.__customEditsApplied = true;
            }
          };
          
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', applyEdits);
          } else {
            applyEdits();
          }
        })();
      </script>
    `
  })()
  
  let fullHtml = ''
  if (!isPreview) {
    // PDF export: TWO separate sections - cover (standalone) and pages (with header/footer)
    const pdfHeaderFooter = `
      ${companySettings?.companyLogo ? `<header><img src="${companySettings.companyLogo}" alt="Company Logo" /></header>` : ''}
      ${companySettings?.footerLogo ? `<footer><img src="${companySettings.footerLogo}" alt="Footer Logo" /></footer>` : ''}
    `
    
    fullHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>${css}${pdfExportCss}</style>
        </head>
        <body>
          ${headerBlock}
          <section class="pages">
            ${pdfHeaderFooter}
            <main>
              ${introductionPage}
              ${sectionOne}
              ${sectionTwo}
              ${planningSection}
              ${considerationsSection}
              ${valuationSection}
              ${summarySection}
              ${customEditsScript}
            </main>
          </section>
        </body>
      </html>
    `
  } else {
    // Preview mode: Keep existing structure
    fullHtml = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>${css}</style>
      </head>
      <body>
        ${bodyContent}
    </body>
    </html>
  `
  }
  
  if (isPreview) {
    return `<style>${css}</style>${bodyContent}`
  }

  return fullHtml
}