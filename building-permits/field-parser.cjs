/**
 * Field Parser for Hebrew Building Permit Documents
 * Extracts structured data from MarkItDown converted markdown for building permits (היתרים מילוליים)
 */

class FieldParser {
  constructor() {
    this.confidenceThreshold = 70; // Minimum confidence for reliable extraction
  }

  /**
   * Process Hebrew text to handle RTL direction issues
   * @param {string} text - Raw text that may have RTL/LTR mixing issues
   * @returns {string} - Processed text with proper Hebrew handling
   */
  processHebrewText(text) {
    // Remove invisible RTL/LTR markers that can cause confusion
    let cleaned = text.replace(/[\u200F\u202B\u200E\u202A\u202C\u061C]/g, '');
    
    // Common OCR corrections for Hebrew building permits
    const hebrewFixes = {
      'ךיראת': 'תאריך', // Reversed "date"
      'רתיה': 'היתר', // Reversed "permit"
      'הדעוו': 'ועדה', // Reversed "committee"
      'תימוקמ': 'מקומית', // Reversed "local"
    };
    
    Object.entries(hebrewFixes).forEach(([wrong, correct]) => {
      cleaned = cleaned.replace(new RegExp(wrong, 'g'), correct);
    });
    
    return cleaned.trim();
  }

  /**
   * Extract all fields from markdown text
   * @param {string} markdownText - The markdown content from MarkItDown
   * @returns {Object} - Structured extraction results with confidence scores
   */
  extractAllFields(markdownText) {
    const startTime = Date.now();

    // Process Hebrew text first to handle RTL issues
    const processedText = this.processHebrewText(markdownText);

    const results = {
      permitNumber: this.extractPermitNumber(processedText),
      permitDate: this.extractPermitDate(processedText),
      permittedUsage: this.extractPermittedUsage(processedText),
      permitIssueDate: this.extractPermitIssueDate(processedText),
      localCommitteeName: this.extractLocalCommitteeName(processedText)
    };

    // Calculate overall confidence
    const confidenceScores = Object.values(results)
      .map(r => r.confidence)
      .filter(c => c > 0);
    
    const overallConfidence = confidenceScores.length > 0 
      ? confidenceScores.reduce((sum, c) => sum + c, 0) / confidenceScores.length 
      : 0;

    return {
      ...results,
      overallConfidence,
      processingTime: Date.now() - startTime
    };
  }

  /**
   * Extract building permit number (היתר בנייה - מספר)
   */
  extractPermitNumber(text) {
    const patterns = [
      // Look for permit number patterns
      /(?:היתר|רתיה)\s*(?:בנייה|הייבנ)?\s*(?:מספר|רפסמ)?\s*[:\s]*(\d+)/i,
      /(?:מספר|רפסמ)\s*(?:היתר|רתיה)[:\s]*(\d+)/i,
      /היתר\s*[:\s]*(\d+)/i,
      // Look for document numbers that might be permit numbers
      /(?:מס|מספר)['״׳\s]*(\d{6,9})/,
      // Pattern for numbers that look like permit IDs (6+ digits)
      /(\d{6,9})/
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const value = match[1].trim();
        const confidence = pattern.toString().includes('היתר') ? 95 : 75;
        return {
          value: value,
          confidence: confidence,
          context: match[0],
          pattern: pattern.toString()
        };
      }
    }

    return { value: null, confidence: 0, context: '', pattern: '' };
  }

  /**
   * Extract building permit date (היתר בנייה - תאריך)
   */
  extractPermitDate(text) {
    const patterns = [
      // Hebrew date formats
      /(?:תאריך|ךיראת)\s*(?:היתר|רתיה)?\s*[:\s]*(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})/i,
      /(?:היתר|רתיה)\s*(?:מתאריך|ךיראתמ)\s*[:\s]*(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})/i,
      // General date patterns
      /(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{4})/,
      /(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2})/
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const value = match[1].trim();
        const confidence = pattern.toString().includes('תאריך') ? 90 : 70;
        return {
          value: this.normalizeDate(value),
          confidence: confidence,
          context: match[0],
          pattern: pattern.toString()
        };
      }
    }

    return { value: null, confidence: 0, context: '', pattern: '' };
  }

  /**
   * Extract permitted usage (מותר)
   */
  extractPermittedUsage(text) {
    const patterns = [
      // Look for usage descriptions
      /(?:מותר|רתומ)\s*[:\s]*([^\n\r]{10,100})/i,
      /(?:ייעוד|דועיי)\s*[:\s]*([^\n\r]{5,80})/i,
      /(?:שימוש|שומיש)\s*[:\s]*([^\n\r]{5,80})/i,
      // Common building uses in Hebrew
      /(מגורים|םירוגמ)/i,
      /(משרדים|םידרשמ)/i,
      /(מסחר|רחסמ)/i,
      /(תעשייה|היישעת)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const value = match[1] ? match[1].trim() : match[0].trim();
        const confidence = pattern.toString().includes('מותר') ? 90 : 75;
        return {
          value: value,
          confidence: confidence,
          context: match[0],
          pattern: pattern.toString()
        };
      }
    }

    return { value: null, confidence: 0, context: '', pattern: '' };
  }

  /**
   * Extract permit issue date (תאריך הפקת היתר)
   */
  extractPermitIssueDate(text) {
    const patterns = [
      // Hebrew issue date patterns
      /(?:תאריך|ךיראת)\s*(?:הפקת|תקפה)\s*(?:היתר|רתיה)\s*[:\s]*(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})/i,
      /(?:הפקת|תקפה)\s*(?:היתר|רתיה)\s*[:\s]*(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})/i,
      /(?:ניתן|ןתינ)\s*[:\s]*(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})/i,
      // Look for dates near "הפקה" or "ניתן"
      /(?:הפקה|הקפה|ניתן|ןתינ)[^\d]*(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{4})/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const value = match[1].trim();
        const confidence = pattern.toString().includes('הפקת') ? 95 : 80;
        return {
          value: this.normalizeDate(value),
          confidence: confidence,
          context: match[0],
          pattern: pattern.toString()
        };
      }
    }

    return { value: null, confidence: 0, context: '', pattern: '' };
  }

  /**
   * Extract local committee name (שם הוועדה המקומית)
   */
  extractLocalCommitteeName(text) {
    const patterns = [
      // Hebrew committee patterns
      /(?:ועדה|הדעו)\s*(?:מקומית|תימוקמ)\s*([^\n\r]{5,50})/i,
      /(?:ועדת|תדעו)\s*([^\n\r]{5,50})/i,
      /(?:הוועדה|הדעווה)\s*(?:המקומית|תימוקמה)\s*([^\n\r]{5,50})/i,
      // Look for city names that might indicate committees
      /(?:עיריית|תיירע)\s*([^\n\r]{3,30})/i,
      /(?:מועצה|הצעומ)\s*(?:מקומית|תימוקמ)\s*([^\n\r]{3,30})/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const value = match[1] ? match[1].trim() : match[0].trim();
        const confidence = pattern.toString().includes('ועדה') ? 90 : 75;
        return {
          value: value,
          confidence: confidence,
          context: match[0],
          pattern: pattern.toString()
        };
      }
    }

    return { value: null, confidence: 0, context: '', pattern: '' };
  }

  /**
   * Normalize date format to YYYY-MM-DD
   * @param {string} dateStr - Input date string
   * @returns {string} - Normalized date or original string if can't parse
   */
  normalizeDate(dateStr) {
    try {
      // Handle different date formats
      const parts = dateStr.split(/[\/\.\-]/);
      if (parts.length === 3) {
        let day, month, year;
        
        // Determine if year is first or last
        if (parts[2].length === 4) {
          // DD/MM/YYYY or MM/DD/YYYY
          day = parts[0];
          month = parts[1];
          year = parts[2];
        } else if (parts[0].length === 4) {
          // YYYY/MM/DD
          year = parts[0];
          month = parts[1];
          day = parts[2];
        } else {
          // DD/MM/YY or MM/DD/YY
          day = parts[0];
          month = parts[1];
          year = '20' + parts[2]; // Assume 2000s
        }
        
        // Pad with zeros
        day = day.padStart(2, '0');
        month = month.padStart(2, '0');
        
        return `${year}-${month}-${day}`;
      }
    } catch (error) {
      // Return original string if parsing fails
    }
    
    return dateStr;
  }
}

module.exports = {
  FieldParser
};