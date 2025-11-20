/**
 * Comparable Data & Valuation Engine - JSON Output Formatters
 * 
 * This module provides standardized JSON output formats for:
 * - Section 5.1: Comparable data table
 * - Section 5.2: Final value calculation
 * - Report Builder integration
 */

export interface ComparableTransaction {
  id: number
  sale_day: string
  address: string
  block_number?: number
  parcel?: number
  rooms?: number
  floor?: number
  surface?: number
  year_of_constru?: number
  sale_value_nis?: number
  price_per_sqm?: number
}

export interface Section51Output {
  selected_comparables: ComparableTransaction[]
  final_price_per_sqm?: number
  selection_timestamp: string
  session_id?: string
  analysis: {
    totalComparables: number
    averagePrice: number
    medianPrice: number
    averagePricePerSqm: number
    medianPricePerSqm: number
    priceRange: {
      min: number
      max: number
    }
  }
}

export interface Section52Data {
  final_price_per_sqm: number
  apartment_sqm: number
  balcony_sqm: number
  balcony_coef: number
  effective_sqm: number
  asset_value_nis: number
  property_description: string
}

export interface ReportSection51 {
  intro_text: string
  table: {
    headers: string[]
    rows: (string | number)[][]
  }
  summary: {
    totalComparables: number
    averagePricePerSqm: number
    medianPricePerSqm: number
    selectedPricePerSqm: number
  }
}

export interface ReportSection52 {
  intro_text: string
  table: {
    headers: string[]
    rows: (string | number)[][]
  }
  summary: {
    final_price_per_sqm: number
    asset_value_nis: number
  }
  footer_text: string
}

/**
 * Format Section 5.1 output for database storage and API responses
 */
export function formatSection51Output(
  selectedTransactions: ComparableTransaction[],
  analysisResult: any,
  sessionId?: string
): Section51Output {
  return {
    selected_comparables: selectedTransactions.map(t => ({
      id: t.id,
      sale_day: t.sale_day,
      address: t.address,
      block_number: extractBlockNumber(t),
      parcel: extractParcel(t),
      rooms: t.rooms,
      floor: t.floor,
      surface: t.surface,
      year_of_constru: t.year_of_constru,
      sale_value_nis: t.sale_value_nis,
      price_per_sqm: t.price_per_sqm || 
        (t.sale_value_nis && t.surface && t.surface > 0 
          ? Math.round(t.sale_value_nis / t.surface) 
          : undefined)
    })),
    final_price_per_sqm: analysisResult?.averagePricePerSqm || analysisResult?.medianPricePerSqm,
    selection_timestamp: new Date().toISOString(),
    session_id: sessionId,
    analysis: {
      totalComparables: analysisResult?.totalComparables || selectedTransactions.length,
      averagePrice: analysisResult?.averagePrice || 0,
      medianPrice: analysisResult?.medianPrice || 0,
      averagePricePerSqm: analysisResult?.averagePricePerSqm || 0,
      medianPricePerSqm: analysisResult?.medianPricePerSqm || 0,
      priceRange: analysisResult?.priceRange || { min: 0, max: 0 }
    }
  }
}

/**
 * Format Section 5.1 for report builder
 */
export function formatSection51ForReport(
  section51Data: Section51Output
): ReportSection51 {
  const finalPricePerSqm = section51Data.final_price_per_sqm || 
    section51Data.analysis.averagePricePerSqm

  return {
    intro_text: `נוכח נתוני ההשוואה שנאספו, ולאחר ביצוע ההתאמות הנדרשות לנכס נשוא השומה, שווי מ״ר בנוי לנכס נשוא השומה בגבולות ${formatCurrency(finalPricePerSqm)}.`,
    table: {
      headers: ['יום מכירה', 'כתובת', 'גוש/חלקה', 'חדרים', 'קומה', 'שטח (מ״ר)', 'שנת בנייה', 'מחיר עסקה (₪)', 'מחיר למ״ר (₪)'],
      rows: section51Data.selected_comparables.map(c => [
        formatDate(c.sale_day),
        c.address || 'N/A',
        formatBlockParcel(c.block_number, c.parcel),
        c.rooms || 'N/A',
        c.floor ?? 'N/A',
        c.surface ? Math.round(c.surface) : 'N/A',
        c.year_of_constru || 'N/A',
        formatCurrency(c.sale_value_nis),
        formatCurrency(c.price_per_sqm)
      ])
    },
    summary: {
      totalComparables: section51Data.analysis.totalComparables,
      averagePricePerSqm: section51Data.analysis.averagePricePerSqm,
      medianPricePerSqm: section51Data.analysis.medianPricePerSqm,
      selectedPricePerSqm: finalPricePerSqm
    }
  }
}

/**
 * Format Section 5.2 for report builder
 */
export function formatSection52ForReport(
  section52Data: Section52Data
): ReportSection52 {
  const hasBalcony = section52Data.balcony_sqm > 0

  return {
    intro_text: `נוכח נתוני ההשוואה שנאספו, ולאחר ביצוע ההתאמות הנדרשות לנכס נשוא השומה, שווי מ״ר בנוי לנכס נשוא השומה בגבולות ${formatCurrency(section52Data.final_price_per_sqm)}.`,
    table: {
      headers: hasBalcony 
        ? ['תיאור הנכס', 'שטח דירה במ״ר', 'מרפסת', 'מ״ר אקו׳']
        : ['תיאור הנכס', 'שטח דירה במ״ר', 'מ״ר אקו׳'],
      rows: [
        hasBalcony
          ? [
              section52Data.property_description,
              section52Data.apartment_sqm,
              section52Data.balcony_sqm,
              section52Data.effective_sqm
            ]
          : [
              section52Data.property_description,
              section52Data.apartment_sqm,
              section52Data.effective_sqm
            ]
      ]
    },
    summary: {
      final_price_per_sqm: section52Data.final_price_per_sqm,
      asset_value_nis: section52Data.asset_value_nis
    },
    footer_text: 'השווי כולל מע״מ.'
  }
}

/**
 * Complete report output combining 5.1 and 5.2
 */
export interface CompleteValuationReport {
  section_5_1: ReportSection51
  section_5_2: ReportSection52
  metadata: {
    session_id?: string
    created_at: string
    property_description: string
  }
}

export function formatCompleteReport(
  section51: Section51Output,
  section52: Section52Data,
  sessionId?: string
): CompleteValuationReport {
  return {
    section_5_1: formatSection51ForReport(section51),
    section_5_2: formatSection52ForReport(section52),
    metadata: {
      session_id: sessionId,
      created_at: new Date().toISOString(),
      property_description: section52.property_description
    }
  }
}

// Helper functions

export function extractBlockNumber(transaction: ComparableTransaction): number | undefined {
  // Try to extract block number from block_of_land field
  // Format: "006154-0330-004-00" → block_number: 6154
  const blockOfLand = (transaction as any).block_of_land
  if (!blockOfLand) return undefined
  
  // Extract first segment before first hyphen and remove leading zeros
  const match = blockOfLand.match(/^0*(\d+)-/)
  return match ? parseInt(match[1], 10) : undefined
}

export function extractParcel(transaction: ComparableTransaction): number | undefined {
  // Try to extract parcel (chelka) from block_of_land field
  // Format: "006154-0330-004-00" → parcel: 330
  const blockOfLand = (transaction as any).block_of_land
  if (!blockOfLand) return undefined
  
  // Extract second segment (after first hyphen, before second hyphen)
  const match = blockOfLand.match(/^\d+-0*(\d+)-/)
  return match ? parseInt(match[1], 10) : undefined
}

export function formatBlockParcel(block?: number, parcel?: number): string {
  if (!block && !parcel) return 'N/A'
  if (block && !parcel) return String(block)
  if (!block && parcel) return String(parcel)
  return `${block}/${parcel}`
}

/**
 * Format block/parcel from raw parcel_id string
 * Example: "007113-0009-010-00" → "7113/9"
 */
export function formatBlockParcelFromString(parcelId: string | null | undefined): string {
  if (!parcelId) return '—'
  
  const blockMatch = parcelId.match(/^0*(\d+)-/)
  const parcelMatch = parcelId.match(/^\d+-0*(\d+)-/)
  
  const block = blockMatch ? parseInt(blockMatch[1], 10) : null
  const parcel = parcelMatch ? parseInt(parcelMatch[1], 10) : null
  
  if (!block && !parcel) return '—'
  if (block && !parcel) return String(block)
  if (!block && parcel) return String(parcel)
  return `${block}/${parcel}`
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('he-IL', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    })
  } catch {
    return dateString
  }
}

function formatCurrency(value: number | null | undefined): string {
  if (!value) return 'N/A'
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

