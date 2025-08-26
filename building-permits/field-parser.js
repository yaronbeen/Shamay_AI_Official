/**
 * Field Parser for Hebrew Building Permit Documents
 * Extracts structured data from MarkItDown converted markdown for היתר בנייה מילולי
 */

class BuildingPermitFieldParser {
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
    
    // Common OCR corrections for Hebrew building permit documents
    const hebrewFixes = {
      'רתיה': 'היתר',
      'הייתר': 'היתר',
      'היינב': 'בנייה',
      'הדעו': 'ועדה',
      'תימוקמ': 'מקומית',
      'רתומ': 'מותר',
      'ךיראת': 'תאריך',
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
      permit_number: this.extractPermitNumber(processedText),
      permit_date: this.extractPermitDate(processedText),
      permitted_description: this.extractPermittedDescription(processedText),
      permit_issue_date: this.extractPermitIssueDate(processedText),
      local_committee_name: this.extractLocalCommitteeName(processedText),
      property_address: this.extractPropertyAddress(processedText),
      gush: this.extractGush(processedText),
      chelka: this.extractChelka(processedText),
      sub_chelka: this.extractSubChelka(processedText)
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
      processingTime: Date.now() - startTime,
      method: 'regex_patterns'
    };
  }

  /**
   * Extract building permit number from Hebrew text
   */
  extractPermitNumber(text) {
    const patterns = [
      /(?:היתר|רתיה)\s*(?:בנייה|הייטנב)?\s*(?:מס'|מספר|'סמ)[:\s]*([0-9\-\/]+)/,
      /(?:מס'|מספר)\s*(?:היתר|רתיה)[:\s]*([0-9\-\/]+)/,
      /(?:רישיון|ןויסיר)\s*(?:מס'|מספר)[:\s]*([0-9\-\/]+)/,
      /([0-9]{7,})/,  // Long number that could be permit number
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const permitNum = match[1].trim();
        if (permitNum.length >= 4) {
          return {
            value: permitNum,
            confidence: 90,
            context: match[0],
            pattern: pattern.toString()
          };
        }
      }
    }

    return { value: null, confidence: 0, context: '', pattern: '' };
  }

  /**
   * Extract permit date from Hebrew text
   */
  extractPermitDate(text) {
    const patterns = [
      /(?:תוקף|ףקות)\s*(?:עד|דע)\s*[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/,
      /(?:תאריך|ךיראת)\s*(?:היתר|רתיה)[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/,
      /(?:בתוקף|ףקותב)\s*(?:עד|דע)[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/,
      /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/, // Generic date pattern
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const dateStr = match[1].trim();
        return {
          value: dateStr,
          confidence: 85,
          context: match[0],
          pattern: pattern.toString()
        };
      }
    }

    return { value: null, confidence: 0, context: '', pattern: '' };
  }

  /**
   * Extract permitted description from Hebrew text
   */
  extractPermittedDescription(text) {
    const patterns = [
      /(?:מותר|רתומ)[:\s]*([\u0590-\u05FF\s\d\,\.\-\(\)]{10,200})/,
      /(?:רשאי|יאשר)[:\s]*([\u0590-\u05FF\s\d\,\.\-\(\)]{10,200})/,
      /(?:לבנות|תונבל)[:\s]*([\u0590-\u05FF\s\d\,\.\-\(\)]{10,200})/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const description = match[1].trim().slice(0, 300);
        if (description.length > 5) {
          return {
            value: description,
            confidence: 75,
            context: match[0],
            pattern: pattern.toString()
          };
        }
      }
    }

    return { value: null, confidence: 0, context: '', pattern: '' };
  }

  /**
   * Extract permit issue date from Hebrew text
   */
  extractPermitIssueDate(text) {
    const patterns = [
      /(?:תאריך\s*הפקה|הקפה\s*ךיראת)[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/,
      /(?:תאריך\s*הוצאה|האצוה\s*ךיראת)[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/,
      /(?:ניתן|ןתינ)\s*(?:ביום|םויב)[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/,
      /(?:מיום|םויימ)[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const dateStr = match[1].trim();
        return {
          value: dateStr,
          confidence: 80,
          context: match[0],
          pattern: pattern.toString()
        };
      }
    }

    return { value: null, confidence: 0, context: '', pattern: '' };
  }

  /**
   * Extract local committee name from Hebrew text
   */
  extractLocalCommitteeName(text) {
    const patterns = [
      /(?:ועדה\s*מקומית|תימוקמ\s*הדעו)\s*(?:לתכנון|ןוכתל)?\s*(?:ובנייה|הייטבו)?\s*([\u0590-\u05FF\s]+)/,
      /(?:הוועדה|הדעוה)\s*(?:המקומית|תימוקמה)\s*([\u0590-\u05FF\s]+)/,
      /(ועדה\s*מקומית\s*[\u0590-\u05FF\s]+)/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        let committeeName = match[1] || match[0];
        committeeName = committeeName.trim().slice(0, 100);
        
        if (committeeName.length > 5) {
          return {
            value: committeeName,
            confidence: 85,
            context: match[0],
            pattern: pattern.toString()
          };
        }
      }
    }

    return { value: null, confidence: 0, context: '', pattern: '' };
  }

  /**
   * Extract property address from Hebrew text
   */
  extractPropertyAddress(text) {
    const patterns = [
      /(?:כתובת|תבותכ)[:\s]*([\u0590-\u05FF\s\d\,\-\.]+)/,
      /(?:רחוב|בוחר)[:\s]*([\u0590-\u05FF\s\d\,\-\.]+)/,
      /([\u0590-\u05FF\s]+\s+\d+[\u0590-\u05FF\s\,]*)/,  // Street name + number pattern
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const address = match[1].trim().slice(0, 150);
        if (address.length > 5) {
          return {
            value: address,
            confidence: 70,
            context: match[0],
            pattern: pattern.toString()
          };
        }
      }
    }

    return { value: null, confidence: 0, context: '', pattern: '' };
  }

  /**
   * Extract Gush (block number) from Hebrew text
   */
  extractGush(text) {
    const patterns = [
      /(?:גוש|שוג)[:\s]*(\d+)/,
      /(\d+)\s*:(?:שוג|גוש)/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const gushNum = parseInt(match[1]);
        if (gushNum > 0) {
          return {
            value: gushNum,
            confidence: 90,
            context: match[0],
            pattern: pattern.toString()
          };
        }
      }
    }

    return { value: null, confidence: 0, context: '', pattern: '' };
  }

  /**
   * Extract Chelka (plot number) from Hebrew text
   */
  extractChelka(text) {
    const patterns = [
      /(?:חלקה|הקלח)[:\s]*(\d+)/,
      /(\d+)\s*:(?:הקלח|חלקה)/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const chelkaNum = parseInt(match[1]);
        if (chelkaNum > 0) {
          return {
            value: chelkaNum,
            confidence: 90,
            context: match[0],
            pattern: pattern.toString()
          };
        }
      }
    }

    return { value: null, confidence: 0, context: '', pattern: '' };
  }

  /**
   * Extract Sub-Chelka (sub-plot number) from Hebrew text
   */
  extractSubChelka(text) {
    const patterns = [
      /(?:תת\s*חלקה|הקלח\s*תת)[:\s]*(\d+)/,
      /(\d+)\s*:(?:הקלח\s*תת|תת\s*חלקה)/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const subChelkaNum = parseInt(match[1]);
        if (subChelkaNum > 0) {
          return {
            value: subChelkaNum,
            confidence: 85,
            context: match[0],
            pattern: pattern.toString()
          };
        }
      }
    }

    return { value: null, confidence: 0, context: '', pattern: '' };
  }
}

export {
  BuildingPermitFieldParser
};