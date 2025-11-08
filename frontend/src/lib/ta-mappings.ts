/**
 * TA_ID ↔ Field Contract (Authoritative)
 * 
 * This file maps every TA_ID to its corresponding data path in the system.
 * These bindings are used for:
 * 1. Data extraction and validation
 * 2. Template rendering
 * 3. QA and traceability
 * 4. Audit logging
 * 
 * DO NOT modify without PM approval.
 */

export interface TAMapping {
  taId: string
  fieldPath: string
  required: boolean
  source: 'tabu' | 'condo' | 'permit' | 'manual' | 'ai' | 'system' | 'multiple'
  description: string
  validation?: string
}

export const TA_MAPPINGS: TAMapping[] = [
  // ===== COVER PAGE & OPENING =====
  { taId: 'TA1', fieldPath: 'branding.logo_url', required: false, source: 'system', description: 'Company logo' },
  { taId: 'TA2', fieldPath: 'report.type', required: true, source: 'system', description: 'Report type' },
  { taId: 'TA3', fieldPath: 'address_street', required: true, source: 'tabu', description: 'Street name' },
  { taId: 'TA4', fieldPath: 'address_building_no', required: true, source: 'tabu', description: 'Building number' },
  { taId: 'TA5', fieldPath: 'address_neighborhood', required: false, source: 'tabu', description: 'Neighborhood' },
  { taId: 'TA6', fieldPath: 'address_city', required: true, source: 'tabu', description: 'City' },
  { taId: 'TA7', fieldPath: 'media.cover_photo_url', required: false, source: 'manual', description: 'Cover facade photo' },
  { taId: 'TA8', fieldPath: 'branding.footer_html', required: false, source: 'system', description: 'Footer branding (page 1)' },
  
  { taId: 'TA10', fieldPath: 'client_name', required: true, source: 'manual', description: 'Client name', validation: 'min_length:3' },
  { taId: 'TA11', fieldPath: 'date_created', required: true, source: 'system', description: 'Report creation date', validation: 'date_not_future' },
  { taId: 'TA12', fieldPath: 'reference_code', required: true, source: 'system', description: 'Auto reference number' },
  
  { taId: 'TA18', fieldPath: 'purpose', required: true, source: 'system', description: 'Valuation purpose (locked)' },
  { taId: 'TA19', fieldPath: 'limitation', required: true, source: 'system', description: 'Liability limitation (locked)' },
  
  { taId: 'TA20', fieldPath: 'visit_date', required: true, source: 'manual', description: 'Property visit date', validation: 'date_not_future' },
  { taId: 'TA21', fieldPath: 'determining_date', required: true, source: 'manual', description: 'Valuation determining date', validation: 'date_not_future,requires_reason_if_override' },
  
  { taId: 'TA22', fieldPath: 'property_details_header', required: true, source: 'system', description: 'Property details header (locked)' },
  { taId: 'TA23', fieldPath: 'essence_text', required: true, source: 'manual', description: 'Property essence description' },
  { taId: 'TA24', fieldPath: 'parcel.block', required: true, source: 'tabu', description: 'Block number (גוש)' },
  { taId: 'TA25', fieldPath: 'parcel.number', required: true, source: 'tabu', description: 'Parcel number (חלקה)' },
  { taId: 'TA26', fieldPath: 'subparcel.number', required: true, source: 'tabu', description: 'Sub-parcel number (תת חלקה)' },
  { taId: 'TA27', fieldPath: 'subparcel.registered_area_sqm', required: true, source: 'tabu', description: 'Registered area (שטח רשום)' },
  { taId: 'TA28', fieldPath: 'calc.area_built', required: true, source: 'permit', description: 'Built area (שטח בנוי)', validation: 'positive_number' },
  { taId: 'TA29', fieldPath: 'attachment[]', required: false, source: 'tabu', description: 'Attachments list' },
  { taId: 'TA30', fieldPath: 'rights.ownership_type', required: true, source: 'tabu', description: 'Ownership type' },
  { taId: 'TA31', fieldPath: 'tabu_meta.extract_date', required: true, source: 'tabu', description: 'Tabu extract date' },
  
  { taId: 'TA32', fieldPath: 'branding.footer_html', required: false, source: 'system', description: 'Footer branding (pages 2+)' },
  
  // ===== CHAPTER 1 - PROPERTY DESCRIPTION =====
  { taId: 'TA33', fieldPath: 'chapter_1.title', required: true, source: 'system', description: 'Chapter 1 title (locked): "פרק 1 – תיאור הנכס והסביבה"' },
  { taId: 'TA34', fieldPath: 'ai_text.neighborhood_desc', required: false, source: 'ai', description: 'AI neighborhood description' },
  { taId: 'TA35', fieldPath: 'media.govmap_screenshot', required: false, source: 'manual', description: 'GovMap screenshot' },
  
  { taId: 'TA37', fieldPath: 'chapter_1.section_1_2.title', required: true, source: 'system', description: 'Section 1.2 title (locked)' },
  { taId: 'TA38', fieldPath: 'ai_text.parcel_desc', required: false, source: 'ai', description: 'AI parcel description' },
  { taId: 'TA39', fieldPath: 'ai_text.building_desc', required: false, source: 'ai', description: 'AI building description' },
  { taId: 'TA40', fieldPath: 'media.gis_screenshot_1', required: false, source: 'manual', description: 'GIS screenshot 1' },
  { taId: 'TA41', fieldPath: 'media.gis_screenshot_2', required: false, source: 'manual', description: 'GIS screenshot 2' },
  
  { taId: 'TA42', fieldPath: 'parcel.boundary_north', required: false, source: 'manual', description: 'Parcel boundary - North' },
  { taId: 'TA43', fieldPath: 'parcel.boundary_south', required: false, source: 'manual', description: 'Parcel boundary - South' },
  { taId: 'TA44', fieldPath: 'parcel.boundary_east', required: false, source: 'manual', description: 'Parcel boundary - East' },
  { taId: 'TA45', fieldPath: 'parcel.boundary_west', required: false, source: 'manual', description: 'Parcel boundary - West' },
  { taId: 'TA46', fieldPath: 'parcel.boundaries_footer', required: false, source: 'system', description: 'Boundaries section footer' },
  
  { taId: 'TA47', fieldPath: 'ai_text.subject_desc', required: false, source: 'ai', description: 'Property subject description' },
  { taId: 'TA48', fieldPath: 'media.interior_photos[]', required: false, source: 'manual', description: 'Interior photos array' },
  { taId: 'TA49', fieldPath: 'ai_text.internal_layout', required: false, source: 'ai', description: 'Internal layout description' },
  
  // ===== CHAPTER 1.4 - PERMITS =====
  { taId: 'TA50', fieldPath: 'planning.authority_name', required: false, source: 'permit', description: 'Planning authority name' },
  { taId: 'TA51', fieldPath: 'permit[0]', required: false, source: 'permit', description: 'Primary permit' },
  { taId: 'TA52', fieldPath: 'permit[1]', required: false, source: 'permit', description: 'Secondary permit' },
  { taId: 'TA53', fieldPath: 'media.plan_excerpt', required: false, source: 'manual', description: 'Plan excerpt image' },
  
  // ===== CHAPTER 2 - LEGAL STATUS =====
  { taId: 'TA55', fieldPath: 'chapter_2.title', required: true, source: 'system', description: 'Chapter 2 title (locked): "פרק 2 – מצב משפטי"' },
  { taId: 'TA56', fieldPath: 'tabu_meta.registrar_office', required: true, source: 'tabu', description: 'Land registry office name' },
  { taId: 'TA57', fieldPath: 'parcel.legal_overview', required: true, source: 'tabu', description: 'Composite parcel legal overview' },
  
  { taId: 'TA59', fieldPath: 'subparcel.legal_desc', required: true, source: 'tabu', description: 'Sub-parcel legal description' },
  { taId: 'TA60', fieldPath: 'attachment[]', required: false, source: 'tabu', description: 'Legal attachments array' },
  { taId: 'TA61', fieldPath: 'ownership[]', required: false, source: 'tabu', description: 'Ownership records array' },
  { taId: 'TA62', fieldPath: 'mortgage[]', required: false, source: 'tabu', description: 'Mortgage records array' },
  { taId: 'TA63', fieldPath: 'note[]', required: false, source: 'tabu', description: 'Notes/remarks array' },
  
  { taId: 'TA64', fieldPath: 'condo.order_date', required: false, source: 'condo', description: 'Condo order date' },
  { taId: 'TA65', fieldPath: 'condo.building_desc', required: false, source: 'condo', description: 'Condo building description' },
  { taId: 'TA66', fieldPath: 'condo.subparcel_desc', required: false, source: 'condo', description: 'Condo sub-parcel description' },
  { taId: 'TA67', fieldPath: 'media.condo_screenshots[]', required: false, source: 'manual', description: 'Condo plan screenshots' },
  
  { taId: 'TA68', fieldPath: 'chapter_2.section_2_3.disclaimer', required: true, source: 'system', description: 'Legal disclaimer (locked)' },
  
  // ===== CHAPTER 3 - PLANNING =====
  { taId: 'TA69', fieldPath: 'chapter_3.title', required: true, source: 'system', description: 'Chapter 3 title (locked): "פרק 3 – מידע תכנוני"' },
  { taId: 'TA70', fieldPath: 'planning.tama_list[]', required: true, source: 'manual', description: 'Planning schemes table', validation: 'min_rows:4' },
  { taId: 'TA71', fieldPath: 'planning.rights_summary', required: true, source: 'permit', description: 'Building rights summary (6 fields)' },
  { taId: 'TA72', fieldPath: 'media.zoning_sheet', required: false, source: 'manual', description: 'Zoning plan image' },
  
  // ===== CHAPTER 4 - CONSIDERATIONS =====
  { taId: 'TA73', fieldPath: 'chapter_4.title', required: true, source: 'system', description: 'Chapter 4 title (locked)' },
  { taId: 'TA74-89', fieldPath: 'factors.bullets[]', required: true, source: 'multiple', description: 'Consideration bullets (auto + manual)' },
  
  // ===== CHAPTER 5 - CALCULATIONS =====
  { taId: 'TA90', fieldPath: 'comp[]', required: true, source: 'manual', description: 'Comparables table', validation: 'min_included:3' },
  { taId: 'TA91', fieldPath: 'comp_analytics', required: true, source: 'system', description: 'Comparables analytics (count, avg, median, etc.)' },
  { taId: 'TA92', fieldPath: 'calc.eq_psm', required: true, source: 'system', description: 'Equivalent price per sqm' },
  { taId: 'TA93', fieldPath: 'calc.eq_coefficient', required: false, source: 'manual', description: 'Equivalence coefficient (if needed)' },
  { taId: 'TA94', fieldPath: 'calc.eq_area', required: true, source: 'system', description: 'Equivalent area calculation' },
  { taId: 'TA95', fieldPath: 'calc.asset_value', required: true, source: 'system', description: 'Final asset value', validation: 'round_to_thousands' },
  { taId: 'TA96', fieldPath: 'calc.description', required: true, source: 'manual', description: 'Property description for calc table' },
  { taId: 'TA97', fieldPath: 'calc.vat_included', required: true, source: 'system', description: 'VAT included flag (always true)' },
  
  // ===== CHAPTER 6 - FINAL VALUATION =====
  { taId: 'TA98', fieldPath: 'valuation.final_value_text', required: true, source: 'system', description: 'Final value in Hebrew words' },
  { taId: 'TA99', fieldPath: 'declaration.text', required: true, source: 'system', description: 'Appraiser declaration (locked)' },
  { taId: 'TA100', fieldPath: 'signature.block', required: true, source: 'manual', description: 'Signature block with appraiser details' },
]

/**
 * Get field path for a given TA_ID
 */
export function getFieldPathForTA(taId: string): string | null {
  const mapping = TA_MAPPINGS.find(m => m.taId === taId)
  return mapping?.fieldPath || null
}

/**
 * Get TA_ID for a given field path
 */
export function getTAForFieldPath(fieldPath: string): string | null {
  const mapping = TA_MAPPINGS.find(m => m.fieldPath === fieldPath)
  return mapping?.taId || null
}

/**
 * Get all required TA_IDs
 */
export function getRequiredTAs(): TAMapping[] {
  return TA_MAPPINGS.filter(m => m.required)
}

/**
 * Validate if all required TA fields have values
 */
export function validateRequiredTAs(data: Record<string, any>): { valid: boolean; missing: string[] } {
  const required = getRequiredTAs()
  const missing: string[] = []
  
  for (const ta of required) {
    const pathParts = ta.fieldPath.split('.')
    let value: any = data
    
    for (const part of pathParts) {
      if (part.endsWith('[]')) {
        // Array field
        const key = part.replace('[]', '')
        value = value?.[key]
        if (!Array.isArray(value) || value.length === 0) {
          missing.push(ta.taId)
          break
        }
      } else {
        value = value?.[part]
      }
    }
    
    if (value === undefined || value === null || value === '') {
      missing.push(ta.taId)
    }
  }
  
  return {
    valid: missing.length === 0,
    missing
  }
}

