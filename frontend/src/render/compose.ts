/**
 * Render Orchestrator for Shamay.AI Valuation Reports
 * Composes report data → fills template placeholders → sets placeholders (red/yellow) when missing/invalid
 */

import { validateReport, getBlockingIssues, getWarnings, canSignReport } from '../qc/rules'
import { generateDocumentHTML } from '../lib/document-template'

export interface RenderOptions {
  showPlaceholders: boolean
  highlightErrors: boolean
  includeAuditLog: boolean
}

export interface RenderResult {
  html: string
  canSign: boolean
  blockingIssues: number
  warnings: number
  placeholders: Array<{
    field: string
    type: 'block' | 'pending'
    message: string
  }>
  auditLog?: Array<{
    timestamp: string
    field: string
    action: string
    details: string
  }>
}

/**
 * Main render function that composes the report
 */
export function composeReport(
  data: any, 
  options: RenderOptions = {
    showPlaceholders: true,
    highlightErrors: true,
    includeAuditLog: false
  }
): RenderResult {
  // Validate the data
  const validationResults = validateReport(data)
  const blockingIssues = getBlockingIssues(data)
  const warnings = getWarnings(data)
  const canSign = canSignReport(data)
  
  // Generate placeholders for missing/invalid fields
  const placeholders = generatePlaceholders(data, validationResults)
  
  // Generate audit log if requested
  const auditLog = options.includeAuditLog ? generateAuditLog(data) : undefined
  
  // Generate the HTML with placeholders
  const html = generateDocumentHTML(data, true)
  
  // Apply placeholder styling if requested
  const styledHtml = options.showPlaceholders 
    ? applyPlaceholderStyling(html, placeholders)
    : html
  
  // Apply error highlighting if requested
  const finalHtml = options.highlightErrors
    ? applyErrorHighlighting(styledHtml, blockingIssues)
    : styledHtml
  
  return {
    html: finalHtml,
    canSign,
    blockingIssues: blockingIssues.length,
    warnings: warnings.length,
    placeholders,
    auditLog
  }
}

/**
 * Generate placeholders for missing or invalid fields
 */
function generatePlaceholders(data: any, validationResults: any[]): Array<{
  field: string
  type: 'block' | 'pending'
  message: string
}> {
  const placeholders: Array<{
    field: string
    type: 'block' | 'pending'
    message: string
  }> = []
  
  for (const result of validationResults) {
    if (!result.passed) {
      const field = result.rule.fieldRefs[0] || 'unknown'
      const type = result.rule.severity === 'block' ? 'block' : 'pending'
      const message = result.rule.message_he
      
      placeholders.push({
        field,
        type,
        message
      })
    }
  }
  
  return placeholders
}

/**
 * Apply placeholder styling to HTML
 */
function applyPlaceholderStyling(html: string, placeholders: Array<{
  field: string
  type: 'block' | 'pending'
  message: string
}>): string {
  let styledHtml = html
  
  for (const placeholder of placeholders) {
    const fieldName = placeholder.field
    const placeholderText = getPlaceholderText(fieldName, placeholder.type === 'block')
    
    // Replace field values with styled placeholders
    const fieldRegex = new RegExp(`{{${fieldName}}}`, 'g')
    const styledPlaceholder = `<span class="placeholder ${placeholder.type}" title="${placeholder.message}">${placeholderText}</span>`
    
    styledHtml = styledHtml.replace(fieldRegex, styledPlaceholder)
  }
  
  return styledHtml
}

/**
 * Apply error highlighting to HTML
 */
function applyErrorHighlighting(html: string, blockingIssues: any[]): string {
  let highlightedHtml = html
  
  // Add CSS for error highlighting
  const errorCSS = `
    <style>
      .placeholder.block {
        color: #D32F2F;
        background-color: #FFEBEE;
        border: 1pt solid #D32F2F;
        padding: 2pt;
        font-weight: bold;
      }
      .placeholder.pending {
        color: #F57C00;
        background-color: #FFF59D;
        border: 1pt solid #F57C00;
        padding: 2pt;
      }
      .error-highlight {
        background-color: #FFEBEE;
        border-left: 3pt solid #D32F2F;
        padding: 4pt;
        margin: 2pt 0;
      }
    </style>
  `
  
  // Add error summary if there are blocking issues
  if (blockingIssues.length > 0) {
    const errorSummary = `
      <div class="error-highlight">
        <h3>שגיאות חוסמות:</h3>
        <ul>
          ${blockingIssues.map(issue => `<li>${issue.rule.message_he}</li>`).join('')}
        </ul>
      </div>
    `
    highlightedHtml = errorSummary + highlightedHtml
  }
  
  return errorCSS + highlightedHtml
}

/**
 * Generate audit log for manual overrides
 */
function generateAuditLog(data: any): Array<{
  timestamp: string
  field: string
  action: string
  details: string
}> {
  const auditLog: Array<{
    timestamp: string
    field: string
    action: string
    details: string
  }> = []
  
  // Check for manual overrides in the data
  if (data.manualOverrides) {
    for (const override of data.manualOverrides) {
      auditLog.push({
        timestamp: override.timestamp || new Date().toISOString(),
        field: override.field,
        action: 'Manual Override',
        details: override.reason || 'No reason provided'
      })
    }
  }
  
  // Check for AI-generated content that was modified
  if (data.aiModifications) {
    for (const modification of data.aiModifications) {
      auditLog.push({
        timestamp: modification.timestamp || new Date().toISOString(),
        field: modification.field,
        action: 'AI Content Modified',
        details: modification.changes || 'Content was modified from AI output'
      })
    }
  }
  
  return auditLog
}

/**
 * Get placeholder text for a field
 */
function getPlaceholderText(fieldName: string, isRequired: boolean): string {
  if (isRequired) {
    return `[חסר נתון ${fieldName}]`
  }
  return `[${fieldName} לא זמין]`
}

/**
 * Check if a field needs a placeholder
 */
function needsPlaceholder(value: any, isRequired: boolean): boolean {
  if (isRequired && (!value || value === '')) return true
  if (!isRequired && (!value || value === '')) return false
  return false
}

/**
 * Format field value with proper Hebrew formatting
 */
export function formatFieldValue(fieldName: string, value: any): string {
  if (!value || value === '') return ''
  
  switch (fieldName) {
    case 'מועד_ביקור':
    case 'תאריך_קובע':
    case 'תאריך_נסח':
    case 'תאריך_צו':
      return formatDate(value)
    
    case 'שטח_רשום':
    case 'שטח_בנוי':
    case 'שטח_חלקה':
      return `${value} מ"ר`
    
    case 'שווי_מעוגל':
      return `${value.toLocaleString('he-IL')} ₪`
    
    case 'מחיר':
    case 'מחיר_למ2':
      return `${value.toLocaleString('he-IL')} ₪`
    
    default:
      return String(value)
  }
}

/**
 * Format date in Hebrew format (dd.mm.yyyy)
 */
function formatDate(dateValue: any): string {
  if (!dateValue) return ''
  
  try {
    const date = new Date(dateValue)
    if (isNaN(date.getTime())) return String(dateValue)
    
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    
    return `${day}.${month}.${year}`
  } catch (error) {
    return String(dateValue)
  }
}

/**
 * Generate Hebrew number words (up to 999,999,999)
 */
export function numberToHebrewWords(num: number): string {
  if (num === 0) return 'אפס'
  if (num > 999999999) return 'מספר גדול מדי'
  
  const ones = ['', 'אחד', 'שניים', 'שלושה', 'ארבעה', 'חמישה', 'שישה', 'שבעה', 'שמונה', 'תשעה']
  const tens = ['', '', 'עשרים', 'שלושים', 'ארבעים', 'חמישים', 'שישים', 'שבעים', 'שמונים', 'תשעים']
  const hundreds = ['', 'מאה', 'מאתיים', 'שלוש מאות', 'ארבע מאות', 'חמש מאות', 'שש מאות', 'שבע מאות', 'שמונה מאות', 'תשע מאות']
  
  if (num < 10) return ones[num]
  if (num < 20) return `עשרה${num === 11 ? '' : ' ' + ones[num - 10]}`
  if (num < 100) return `${tens[Math.floor(num / 10)]}${num % 10 ? ' ' + ones[num % 10] : ''}`
  if (num < 1000) return `${hundreds[Math.floor(num / 100)]}${num % 100 ? ' ' + numberToHebrewWords(num % 100) : ''}`
  if (num < 1000000) return `${numberToHebrewWords(Math.floor(num / 1000))} אלף${num % 1000 ? ' ' + numberToHebrewWords(num % 1000) : ''}`
  if (num < 1000000000) return `${numberToHebrewWords(Math.floor(num / 1000000))} מיליון${num % 1000000 ? ' ' + numberToHebrewWords(num % 1000000) : ''}`
  
  return 'מספר גדול מדי'
}

/**
 * Generate report summary for QC dashboard
 */
export function generateReportSummary(data: any): {
  totalFields: number
  completedFields: number
  missingFields: number
  canSign: boolean
  blockingIssues: string[]
  warnings: string[]
} {
  const validationResults = validateReport(data)
  const blockingIssues = getBlockingIssues(data)
  const warnings = getWarnings(data)
  
  const totalFields = validationResults.length
  const completedFields = validationResults.filter(r => r.passed).length
  const missingFields = totalFields - completedFields
  
  return {
    totalFields,
    completedFields,
    missingFields,
    canSign: canSignReport(data),
    blockingIssues: blockingIssues.map(issue => issue.rule.message_he),
    warnings: warnings.map(warning => warning.rule.message_he)
  }
}
