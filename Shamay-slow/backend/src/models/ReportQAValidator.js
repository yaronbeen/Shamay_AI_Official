/**
 * SHAMAY.AI Report QA Validator
 * Meticulous auditor for Hebrew real-estate valuation reports
 * Validates DOCX/PDF reports against SHAMAY.AI specifications
 */

const pdfParse = require('pdf-parse')
const mammoth = require('mammoth')

class ReportQAValidator {
  constructor() {
    this.checks = []
    this.errors = 0
    this.warnings = 0
  }

  /**
   * Main validation entry point
   * @param {Object} inputs - { file_bytes, text_extracted, layout_map, gen_context }
   * @returns {Object} - JSON validation report
   */
  async validateReport(inputs) {
    const { file_bytes, text_extracted, layout_map, gen_context } = inputs

    this.checks = []
    this.errors = 0
    this.warnings = 0

    // Parse document
    const parsed = await this._parseDocument(file_bytes, text_extracted, layout_map)
    
    // Run all validation checks
    this._checkShellFormatting(parsed)
    this._checkHeadersFooters(parsed, gen_context)
    this._checkSectionOrder(parsed, gen_context)
    this._checkAddressSync(parsed, gen_context)
    this._checkClientName(parsed, gen_context)
    this._checkDates(parsed, gen_context)
    this._checkMandatoryFields(parsed, gen_context)
    this._checkAttachments(parsed, gen_context)
    this._checkPlanningPermitting(parsed, gen_context)
    this._checkComparablesTable(parsed, gen_context)
    this._checkCalculations(parsed, gen_context)
    this._checkFinalStatement(parsed, gen_context)
    this._checkPaginationIntegrity(parsed)
    this._checkTypography(parsed)
    this._checkHebrewLocalization(parsed)

    // Generate summary
    const summary = {
      pass: this.errors === 0,
      pages: parsed.totalPages || 0,
      errors: this.errors,
      warnings: this.warnings
    }

    // Generate auto-fix suggestions
    const autoFixSuggestions = this._generateAutoFixSuggestions()

    return {
      summary,
      checks: this.checks,
      auto_fix_suggestions: autoFixSuggestions
    }
  }

  /**
   * Parse document (PDF or DOCX)
   * @private
   */
  async _parseDocument(file_bytes, text_extracted, layout_map) {
    let parsed = {
      text: text_extracted || '',
      pages: [],
      totalPages: 0,
      layout: layout_map || {}
    }

    try {
      // Try PDF first
      if (file_bytes && Buffer.isBuffer(file_bytes)) {
        const pdfData = await pdfParse(file_bytes)
        parsed.text = pdfData.text
        parsed.totalPages = pdfData.numpages
        parsed.pages = this._extractPagesFromPDF(pdfData)
      } else if (file_bytes && typeof file_bytes === 'string') {
        // Try DOCX
        const result = await mammoth.extractRawText({ buffer: Buffer.from(file_bytes, 'base64') })
        parsed.text = result.value
        parsed.pages = this._extractPagesFromText(parsed.text)
        parsed.totalPages = parsed.pages.length
      }
    } catch (error) {
      console.warn('Document parsing error:', error.message)
    }

    return parsed
  }

  /**
   * Extract pages from PDF
   * @private
   */
  _extractPagesFromPDF(pdfData) {
    const pages = []
    const text = pdfData.text
    const lines = text.split('\n')
    
    // Simple page break detection (can be enhanced)
    let currentPage = 1
    let currentPageText = []
    
    for (const line of lines) {
      currentPageText.push(line)
      // Detect page breaks (heuristic)
      if (line.match(/עמוד\s+\d+/i) || line.match(/page\s+\d+/i)) {
        pages.push({
          pageNumber: currentPage,
          text: currentPageText.join('\n'),
          lines: [...currentPageText]
        })
        currentPage++
        currentPageText = []
      }
    }
    
    if (currentPageText.length > 0) {
      pages.push({
        pageNumber: currentPage,
        text: currentPageText.join('\n'),
        lines: currentPageText
      })
    }

    return pages
  }

  /**
   * Extract pages from text
   * @private
   */
  _extractPagesFromText(text) {
    const pages = []
    const lines = text.split('\n')
    
    let currentPage = 1
    let currentPageText = []
    
    for (const line of lines) {
      currentPageText.push(line)
      if (line.match(/עמוד\s+\d+/i) || line.match(/page\s+\d+/i)) {
        pages.push({
          pageNumber: currentPage,
          text: currentPageText.join('\n'),
          lines: [...currentPageText]
        })
        currentPage++
        currentPageText = []
      }
    }
    
    if (currentPageText.length > 0 || pages.length === 0) {
      pages.push({
        pageNumber: currentPage,
        text: currentPageText.join('\n'),
        lines: currentPageText
      })
    }

    return pages
  }

  /**
   * Check A: Document shell & typography
   */
  _checkShellFormatting(parsed) {
    // Check for Hebrew RTL
    const hasHebrew = /[\u0590-\u05FF]/.test(parsed.text)
    this._addCheck('shell.formatting', hasHebrew, null, 'Document should contain Hebrew text (RTL)')

    // Check font sizes (heuristic - would need actual layout parsing)
    // This is a simplified check
    this._addCheck('shell.formatting', true, null, 'Font size validation requires layout parsing')
  }

  /**
   * Check B: Headers and footers
   */
  _checkHeadersFooters(parsed, gen_context) {
    const text = parsed.text
    
    // Check for page numbering pattern
    const pageNumberPattern = /עמוד\s+(\d+)\s+מתוך\s+(\d+)/i
    const matches = text.match(pageNumberPattern)
    
    if (matches) {
      const currentPage = parseInt(matches[1])
      const totalPages = parseInt(matches[2])
      
      this._addCheck('headers_footers', currentPage === 1 || currentPage > 0, null, 
        `Page numbering found: ${currentPage} of ${totalPages}`)
      
      this._addCheck('headers_footers', totalPages === parsed.totalPages, null,
        `Total pages mismatch: footer says ${totalPages}, document has ${parsed.totalPages}`)
    } else {
      this._addCheck('headers_footers', false, null, 
        'Page numbering pattern "עמוד X מתוך Y" not found in footer',
        { action: 'ensure_footer_page_x_of_y', target: 'footer', details: 'Insert page field X and total pages Y in RTL footer template' })
    }
  }

  /**
   * Check C: Section order
   */
  _checkSectionOrder(parsed, gen_context) {
    const text = parsed.text
    const requiredSections = [
      { name: 'Cover', pattern: /חוות\s+דעת|אומדן\s+שווי/i },
      { name: '1. תיאור הנכס', pattern: /1\.\s*תיאור\s+הנכס/i },
      { name: '2. מצב משפטי', pattern: /2\.\s*מצב\s+משפטי/i },
      { name: '3. מידע תכנוני', pattern: /3\.\s*מידע\s+תכנוני/i },
      { name: '4. גורמים ושיקולים', pattern: /4\.\s*גורמים\s+ושיקולים/i },
      { name: '5. תחשיבים', pattern: /5\.\s*תחשיבים/i },
      { name: '6. השומה', pattern: /6\.\s*השומה/i }
    ]

    let lastIndex = -1
    let allFound = true
    const foundSections = []

    for (const section of requiredSections) {
      const match = text.search(section.pattern)
      if (match === -1) {
        allFound = false
        this._addCheck('order.completeness', false, null, 
          `Required section "${section.name}" not found`,
          { action: 'add_section', target: section.name, details: `Add section "${section.name}" in correct order` })
      } else {
        foundSections.push({ name: section.name, index: match })
        if (match < lastIndex) {
          allFound = false
          this._addCheck('order.completeness', false, null,
            `Section "${section.name}" appears out of order`)
        }
        lastIndex = match
      }
    }

    if (allFound) {
      this._addCheck('order.completeness', true, null, 'All required sections found in correct order')
    }
  }

  /**
   * Check D: Address synchronization
   */
  _checkAddressSync(parsed, gen_context) {
    if (!gen_context?.address_struct) {
      this._addCheck('address.sync', false, null, 'Address structure missing from gen_context')
      return
    }

    const { street, house_number, neighborhood, city } = gen_context.address_struct
    const expectedAddress = `${street} ${house_number}, ${neighborhood}, ${city}`.trim()
    
    // Find all address occurrences
    const addressPatterns = [
      new RegExp(street.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
      new RegExp(house_number.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
      new RegExp(city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    ]

    const text = parsed.text
    let allMatch = true

    for (const pattern of addressPatterns) {
      if (!pattern.test(text)) {
        allMatch = false
        break
      }
    }

    this._addCheck('address.sync', allMatch, null,
      allMatch ? 'Address components found in document' : 'Address components mismatch',
      allMatch ? null : { action: 'replace_all', target: '{{Address}}', details: `Replace with '${expectedAddress}' everywhere` })
  }

  /**
   * Check E: Client name
   */
  _checkClientName(parsed, gen_context) {
    if (!gen_context?.client_name) {
      this._addCheck('client_name.present', false, null, 'Client name missing from gen_context')
      return
    }

    const clientName = gen_context.client_name
    const text = parsed.text
    const found = text.includes(clientName)

    this._addCheck('client_name.present', found, null,
      found ? 'Client name found in document' : `Client name "${clientName}" not found in document`,
      found ? null : { action: 'insert_client_name', target: 'cover_page', details: `Add client name "${clientName}" to cover page` })
  }

  /**
   * Check F: Dates validation
   */
  _checkDates(parsed, gen_context) {
    const today = new Date()
    today.setHours(23, 59, 59, 999)

    // Check inspection_date
    if (gen_context?.inspection_date) {
      const inspectionDate = this._parseDate(gen_context.inspection_date)
      if (inspectionDate) {
        const isPast = inspectionDate <= today
        this._addCheck('dates.valid', isPast, null,
          isPast ? 'Inspection date is valid' : 'Inspection date is in the future',
          isPast ? null : { action: 'fix_date', target: 'inspection_date', details: 'Inspection date must be ≤ today' })
      }
    }

    // Check valuation_date
    if (gen_context?.valuation_date) {
      const valuationDate = this._parseDate(gen_context.valuation_date)
      if (valuationDate) {
        const isPast = valuationDate <= today
        this._addCheck('dates.valid', isPast, null,
          isPast ? 'Valuation date is valid' : 'Valuation date is in the future',
          isPast ? null : { action: 'fix_date', target: 'valuation_date', details: 'Valuation date must be ≤ today' })
      }
    }
  }

  /**
   * Check G: Mandatory fields
   */
  _checkMandatoryFields(parsed, gen_context) {
    const mandatoryFields = [
      { key: 'gush', label: 'גוש', pattern: /גוש[:\s]+(\d+)/i },
      { key: 'parcel', label: 'חלקה', pattern: /חלקה[:\s]+(\d+)/i },
      { key: 'sub_parcel', label: 'תת חלקה', pattern: /תת[-\s]?חלקה[:\s]+(\d+)/i },
      { key: 'registered_area', label: 'שטח רשום', pattern: /שטח\s+רשום[:\s]+([\d,]+)/i }
    ]

    const text = parsed.text
    let allFound = true

    for (const field of mandatoryFields) {
      const found = field.pattern.test(text)
      if (!found) {
        allFound = false
        this._addCheck('ids.mandatory_fields', false, null,
          `Mandatory field "${field.label}" not found`,
          { action: 'add_field', target: field.key, details: `Add ${field.label} to document` })
      }
    }

    if (allFound) {
      this._addCheck('ids.mandatory_fields', true, null, 'All mandatory fields found')
    }
  }

  /**
   * Check H: Attachments rendering
   */
  _checkAttachments(parsed, gen_context) {
    if (!gen_context?.rights?.attachments || gen_context.rights.attachments.length === 0) {
      this._addCheck('attachments.render', true, null, 'No attachments to check')
      return
    }

    const text = parsed.text
    const hasAttachments = /הצמדות|נספחים|attachments/i.test(text)

    this._addCheck('attachments.render', hasAttachments, null,
      hasAttachments ? 'Attachments section found' : 'Attachments section missing despite attachments in gen_context',
      hasAttachments ? null : { action: 'add_attachments_section', target: 'section_2.1', details: 'Add attachments section to 2.1' })
  }

  /**
   * Check I: Planning and permitting
   */
  _checkPlanningPermitting(parsed, gen_context) {
    const text = parsed.text
    
    // Check for planning section
    const hasPlanning = /3\.\s*מידע\s+תכנוני/i.test(text)
    this._addCheck('planning/permitting', hasPlanning, null,
      hasPlanning ? 'Planning section found' : 'Planning section (3) missing')

    // Check permits
    if (gen_context?.permits && gen_context.permits.length > 0) {
      const hasPermits = /היתר|permit/i.test(text)
      this._addCheck('planning/permitting', hasPermits, null,
        hasPermits ? 'Permits section found' : 'Permits section missing despite permits in gen_context')
    }
  }

  /**
   * Check J: Comparables table
   */
  _checkComparablesTable(parsed, gen_context) {
    if (!gen_context?.comparables_grid || gen_context.comparables_grid.length === 0) {
      this._addCheck('comps.table', false, null, 'No comparables data in gen_context')
      return
    }

    const comparables = gen_context.comparables_grid
    const hasEnough = comparables.length >= 3

    this._addCheck('comps.table', hasEnough, null,
      hasEnough ? `Found ${comparables.length} comparables (≥3 required)` : `Only ${comparables.length} comparables found (≥3 required)`,
      hasEnough ? null : { action: 'add_comparables', target: 'section_5.1', details: 'Add at least 3 comparables to section 5.1' })

    // Check for price_per_sqm calculation
    const text = parsed.text
    const hasPricePerSqm = /מחיר\s+למ"ר|price\s+per\s+sqm/i.test(text)
    this._addCheck('comps.table', hasPricePerSqm, null,
      hasPricePerSqm ? 'Price per sqm calculation found' : 'Price per sqm calculation missing')
  }

  /**
   * Check K: Calculations (5.2)
   */
  _checkCalculations(parsed, gen_context) {
    if (!gen_context?.calc_5_2) {
      this._addCheck('calc.engine', false, null, 'Calculation data (calc_5_2) missing from gen_context')
      return
    }

    const { eq_area, asset_value, asset_value_rounded } = gen_context.calc_5_2
    const { built_area_sqm, balcony_sqm } = gen_context.property_meta || {}

    // Verify eq_area calculation
    if (built_area_sqm !== undefined && balcony_sqm !== undefined) {
      const expectedEqArea = built_area_sqm + (balcony_sqm || 0) * 0.5
      const eqAreaMatch = Math.abs(eq_area - expectedEqArea) < 0.01

      this._addCheck('calc.eq_area', eqAreaMatch, null,
        eqAreaMatch ? `eq_area correct: ${eq_area} = ${built_area_sqm} + ${balcony_sqm}*0.5` : 
        `eq_area mismatch: expected ${expectedEqArea}, found ${eq_area}`,
        eqAreaMatch ? null : { action: 'recalculate_5_2', target: 'section 5.2', details: 'Recompute with balcony coef 0.5' })
    }

    // Verify asset_value calculation
    if (gen_context.calc_5_1?.equiv_price_per_sqm) {
      const expectedAssetValue = eq_area * gen_context.calc_5_1.equiv_price_per_sqm
      const assetValueMatch = Math.abs(asset_value - expectedAssetValue) < 100

      this._addCheck('calc.asset_value', assetValueMatch, null,
        assetValueMatch ? `asset_value correct: ${asset_value}` : 
        `asset_value mismatch: expected ~${expectedAssetValue}, found ${asset_value}`)
    }

    // Verify rounding
    if (asset_value_rounded) {
      const expectedRounded = Math.ceil(asset_value / 1000) * 1000
      const roundingMatch = asset_value_rounded === expectedRounded

      this._addCheck('calc.rounding', roundingMatch, null,
        roundingMatch ? `Rounding correct: ${asset_value_rounded}` : 
        `Rounding mismatch: expected ${expectedRounded}, found ${asset_value_rounded}`)
    }
  }

  /**
   * Check L: Final statement (Section 6)
   */
  _checkFinalStatement(parsed, gen_context) {
    const text = parsed.text
    
    // Check for section 6
    const hasSection6 = /6\.\s*השומה/i.test(text)
    this._addCheck('final.statement', hasSection6, null,
      hasSection6 ? 'Section 6 found' : 'Section 6 (השומה) missing')

    // Check for VAT note
    if (gen_context?.calc_5_2?.asset_value_rounded) {
      const hasVAT = /מע"מ|VAT|כולל\s+מע"מ/i.test(text)
      this._addCheck('final.statement', hasVAT, null,
        hasVAT ? 'VAT note found' : 'VAT note missing',
        hasVAT ? null : { action: 'add_vat_note', target: 'section_5.2', details: 'Add "השווי כולל מע"מ." under 5.2' })
    }
  }

  /**
   * Check M: Pagination integrity (CRITICAL)
   */
  _checkPaginationIntegrity(parsed) {
    const pages = parsed.pages || []
    
    // Check for orphaned headings
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i]
      const nextPage = pages[i + 1]
      
      if (nextPage) {
        // Check if last line of page is a heading
        const lastLines = page.lines.slice(-3)
        for (const line of lastLines) {
          if (this._isHeading(line)) {
            this._addCheck('pagination.orphans', false, [page.pageNumber, nextPage.pageNumber],
              `Heading orphaned at page ${page.pageNumber} bottom: "${line.trim()}"`,
              { action: 'apply_keep_with_next', target: `heading(${line.trim()})`, details: 'Set heading style "keep-with-next"=true or insert page break before heading' })
            this.errors++
          }
        }
      }
    }

    // Check for split table rows (heuristic)
    const text = parsed.text
    const tablePattern = /\|.*\|/g
    const tables = text.match(tablePattern)
    if (tables && tables.length > 0) {
      // Simplified check - would need actual layout parsing
      this._addCheck('tables.split', true, null, 'Table row split check requires layout parsing')
    }

    // Check for blank pages
    for (const page of pages) {
      if (page.text.trim().length < 50) {
        this._addCheck('pagination.blank_pages', false, [page.pageNumber],
          `Page ${page.pageNumber} appears to be blank`,
          { action: 'remove_blank_page', target: `page_${page.pageNumber}`, details: 'Remove or add content to blank page' })
        this.errors++
      }
    }
  }

  /**
   * Check N: Typography rules
   */
  _checkTypography(parsed) {
    const text = parsed.text
    
    // Check for underlines/italics (heuristic - would need actual formatting)
    // This is simplified
    this._addCheck('typography.rules', true, null, 'Typography validation requires layout parsing')
  }

  /**
   * Check O: Hebrew localization
   */
  _checkHebrewLocalization(parsed) {
    const text = parsed.text
    
    // Check for Hebrew text
    const hasHebrew = /[\u0590-\u05FF]/.test(text)
    this._addCheck('l10n.hebrew', hasHebrew, null,
      hasHebrew ? 'Hebrew text found' : 'No Hebrew text found in document')

    // Check for RTL direction (heuristic)
    this._addCheck('l10n.hebrew', true, null, 'RTL direction check requires layout parsing')
  }

  /**
   * Helper: Add a check result
   * @private
   */
  _addCheck(id, pass, page, message, fix = null) {
    this.checks.push({
      id,
      pass,
      page: page !== null ? (Array.isArray(page) ? page : [page]) : null,
      message,
      fix: fix || undefined
    })

    if (!pass) {
      if (id.includes('pagination') || id.includes('calc') || id.includes('ids.mandatory')) {
        this.errors++
      } else {
        this.warnings++
      }
    }
  }

  /**
   * Helper: Parse date string
   * @private
   */
  _parseDate(dateStr) {
    if (!dateStr) return null

    // Try DD.MM.YYYY format
    if (dateStr.includes('.')) {
      const [day, month, year] = dateStr.split('.').map(Number)
      return new Date(year, month - 1, day)
    }

    // Try DD/MM/YYYY format
    if (dateStr.includes('/')) {
      const [day, month, year] = dateStr.split('/').map(Number)
      return new Date(year, month - 1, day)
    }

    return new Date(dateStr)
  }

  /**
   * Helper: Check if line is a heading
   * @private
   */
  _isHeading(line) {
    const trimmed = line.trim()
    // Check for numbered headings (1., 2., etc.)
    if (/^\d+\.\s+/.test(trimmed)) return true
    // Check for common Hebrew headings
    if (/^(תיאור|מצב|מידע|גורמים|תחשיב|השומה|ניתוח|מסקנות)/.test(trimmed)) return true
    return false
  }

  /**
   * Generate auto-fix suggestions
   * @private
   */
  _generateAutoFixSuggestions() {
    const suggestions = []

    // Check if pagination issues exist
    const hasPaginationIssues = this.checks.some(c => c.id.includes('pagination') && !c.pass)
    if (hasPaginationIssues) {
      suggestions.push({
        priority: 1,
        action: 'enable_keep_with_next_for_heading_levels',
        details: 'Apply to H1–H3 styles to prevent orphaned headings'
      })
    }

    // Check if table issues exist
    const hasTableIssues = this.checks.some(c => c.id.includes('table') && !c.pass)
    if (hasTableIssues) {
      suggestions.push({
        priority: 2,
        action: 'repeat_table_header_rows',
        details: 'All tables with more than one page'
      })
    }

    // Check if image issues exist
    const hasImageIssues = this.checks.some(c => c.id.includes('image') && !c.pass)
    if (hasImageIssues) {
      suggestions.push({
        priority: 3,
        action: 'bind_image_with_caption',
        details: "Use 'keep with next' on caption and 'keep lines together' on figure paragraph"
      })
    }

    // Check if currency formatting issues exist
    const hasCurrencyIssues = this.checks.some(c => c.id.includes('currency') && !c.pass)
    if (hasCurrencyIssues) {
      suggestions.push({
        priority: 4,
        action: 'format_currency',
        details: "Normalize to '₪ 1,234,567'"
      })
    }

    // Check if footer issues exist
    const hasFooterIssues = this.checks.some(c => c.id.includes('footer') && !c.pass)
    if (hasFooterIssues) {
      suggestions.push({
        priority: 5,
        action: 'ensure_footer_page_x_of_y',
        details: 'Insert page field X and total pages Y in RTL footer template'
      })
    }

    return suggestions
  }
}

module.exports = ReportQAValidator

