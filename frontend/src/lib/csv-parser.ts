/**
 * CSV Parser Utility
 * Client-side CSV parsing for custom table uploads
 */

export interface ParsedCSV {
  headers: string[]
  rows: string[][]
}

/**
 * Parse CSV content into headers and rows
 * Handles:
 * - Quoted fields (with commas inside)
 * - Newlines inside quoted fields
 * - Empty lines
 * - Windows/Unix line endings
 * - Hebrew text
 */
export function parseCSV(content: string): ParsedCSV {
  if (!content || content.trim().length === 0) {
    return { headers: [], rows: [] }
  }

  const rows: string[][] = []
  let currentRow: string[] = []
  let currentCell = ''
  let inQuotes = false

  // Parse character by character to handle newlines in quoted fields
  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    const nextChar = content[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote inside quoted field
        currentCell += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentCell.trim())
      currentCell = ''
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      // End of row (but only if not inside quotes)
      if (char === '\r' && nextChar === '\n') {
        i++ // Skip \n in \r\n
      }
      if (currentCell.length > 0 || currentRow.length > 0) {
        currentRow.push(currentCell.trim())
        if (currentRow.some(cell => cell.length > 0)) {
          rows.push(currentRow)
        }
        currentRow = []
        currentCell = ''
      }
    } else {
      currentCell += char
    }
  }

  // Don't forget the last cell/row
  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim())
    if (currentRow.some(cell => cell.length > 0)) {
      rows.push(currentRow)
    }
  }

  if (rows.length === 0) {
    return { headers: [], rows: [] }
  }

  const headers = rows[0]
  const dataRows = rows.slice(1)

  // Normalize row lengths to match headers
  const normalizedRows = dataRows.map(row => {
    if (row.length < headers.length) {
      // Pad with empty strings if row is shorter
      return [...row, ...Array(headers.length - row.length).fill('')]
    } else if (row.length > headers.length) {
      // Truncate if row is longer
      return row.slice(0, headers.length)
    }
    return row
  })

  return { headers, rows: normalizedRows }
}

/**
 * Read a File object and parse as CSV
 */
export function parseCSVFile(file: File): Promise<ParsedCSV> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const result = e.target?.result
        if (typeof result !== 'string') {
          reject(new Error('Failed to read file as text'))
          return
        }
        const parsed = parseCSV(result)
        resolve(parsed)
      } catch (error) {
        reject(new Error('Failed to parse CSV file'))
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    // Try UTF-8 first, fallback handled by browser
    reader.readAsText(file, 'UTF-8')
  })
}

/**
 * Escape HTML special characters for safe rendering
 */
export function escapeHtml(text: string): string {
  const div = typeof document !== 'undefined' ? document.createElement('div') : null
  if (div) {
    div.textContent = text
    return div.innerHTML
  }
  // Fallback for server-side
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Generate unique table ID
 */
export function generateTableId(): string {
  return `custom-table-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}
