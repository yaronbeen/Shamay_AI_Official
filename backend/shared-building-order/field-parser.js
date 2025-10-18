/**
 * Field Parser for Hebrew Shared Building Order Documents
 * Extracts structured data from MarkItDown converted markdown for צו רישום בית משותף
 */

class SharedBuildingFieldParser {
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
    
    // Common OCR corrections for Hebrew shared building order documents
    const hebrewFixes = {
      'וצ': 'צו',
      'םושיר': 'רישום', 
      'תיב': 'בית',
      'ףותשמ': 'משותף',
      'ןיינב': 'בניין',
      'תומוק': 'קומות',
      'הקלח': 'חלקה',
      'תת': 'תת',
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
      order_issue_date: this.extractOrderIssueDate(processedText),
      building_description: this.extractBuildingDescription(processedText),
      building_floors: this.extractBuildingFloors(processedText),
      building_sub_plots_count: this.extractBuildingSubPlotsCount(processedText),
      building_address: this.extractBuildingAddress(processedText),
      total_sub_plots: this.extractTotalSubPlots(processedText),
      sub_plots: this.extractSubPlots(processedText)
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
   * Extract order issue date from Hebrew text
   */
  extractOrderIssueDate(text) {
    // Look for date patterns in Hebrew shared building order documents
    const patterns = [
      /(?:תאריך|ךיראת)[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/,
      /(?:מיום|םויימ)[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/,
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
   * Extract building description from Hebrew text
   */
  extractBuildingDescription(text) {
    // Look for building description patterns
    const patterns = [
      /(?:בניין|ןיינב)[:\s]*([\u0590-\u05FF\s\d]+)/,
      /(?:מבנה|הנבמ)[:\s]*([\u0590-\u05FF\s\d]+)/,
      /(?:בית משותף|ףותשמ תיב)[:\s]*([\u0590-\u05FF\s\d]+)/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const description = match[1].trim().slice(0, 100); // Limit length
        if (description.length > 3) {
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
   * Extract building floors from Hebrew text
   */
  extractBuildingFloors(text) {
    // Look for floor count patterns
    const patterns = [
      /(\d+)\s*(?:קומות|תומוק)/,
      /(?:קומות|תומוק)[:\s]*(\d+)/,
      /(?:בן|ןב)[:\s]*(\d+)[:\s]*(?:קומות|תומוק)/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const floors = parseInt(match[1]);
        if (floors > 0 && floors < 50) { // Reasonable range
          return {
            value: floors,
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
   * Extract building sub-plots count from Hebrew text
   */
  extractBuildingSubPlotsCount(text) {
    // Look for sub-plot count in building
    const patterns = [
      /(\d+)\s*(?:תת חלקות|תוקלח תת)/,
      /(?:תת חלקות|תוקלח תת)[:\s]*(\d+)/,
      /(\d+)\s*(?:יחידות|תודיחי)/,
      /(?:יחידות|תודיחי)[:\s]*(\d+)/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const count = parseInt(match[1]);
        if (count > 0 && count < 500) { // Reasonable range
          return {
            value: count,
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
   * Extract building address from Hebrew text
   */
  extractBuildingAddress(text) {
    // Look for address patterns
    const patterns = [
      /(?:כתובת|תבותכ)[:\s]*([\u0590-\u05FF\s\d\,\-\.]+)/,
      /(?:רחוב|בוחר)[:\s]*([\u0590-\u05FF\s\d\,\-\.]+)/,
      /([\u0590-\u05FF\s]+\s+\d+[\u0590-\u05FF\s\,]*)/,  // Street name + number pattern
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const address = match[1].trim().slice(0, 150); // Limit length
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
   * Extract total sub-plots from Hebrew text
   */
  extractTotalSubPlots(text) {
    // Look for total sub-plots in project
    const patterns = [
      /(?:סה\"כ|\"כהס)\s*(?:תת חלקות|תוקלח תת)[:\s]*(\d+)/,
      /(?:כולל|ללוכ)[:\s]*(\d+)[:\s]*(?:תת חלקות|תוקלח תת)/,
      /(?:סה\"כ|\"כהס)[:\s]*(\d+)/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const total = parseInt(match[1]);
        if (total > 0 && total < 1000) { // Reasonable range
          return {
            value: total,
            confidence: 80,
            context: match[0],
            pattern: pattern.toString()
          };
        }
      }
    }

    return { value: null, confidence: 0, context: '', pattern: '' };
  }

  /**
   * Extract individual sub-plots from Hebrew text
   */
  extractSubPlots(text) {
    const subPlots = [];
    
    // Look for sub-plot listing patterns
    const patterns = [
      // Pattern for "תת חלקה מס' X: description"
      /(?:תת חלקה|הקלח תת)\s*(?:מס'|'סמ)\s*(\d+)[:\s]*([\u0590-\u05FF\s\d]+)/g,
      // Pattern for "דירה מס' X"
      /(?:דירה|הריד)\s*(?:מס'|'סמ)\s*(\d+)[:\s]*([\u0590-\u05FF\s\d]*)/g,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const subPlotNumber = parseInt(match[1]);
        const description = match[2] ? match[2].trim().slice(0, 100) : '';
        
        if (subPlotNumber > 0) {
          // Try to extract area from description
          const areaMatch = description.match(/(\d+(?:\.\d+)?)\s*(?:מ\"ר|ר\"מ)/);
          const area = areaMatch ? parseFloat(areaMatch[1]) : null;
          
          // Try to extract floor from description  
          const floorPatterns = [
            /(?:קומה|המוק)\s*([\u0590-\u05FF\d]+)/,
            /(?:קרקע|עקרק)/,
            /(?:מרתף|ףתרמ)/,
          ];
          
          let floor = null;
          for (const floorPattern of floorPatterns) {
            const floorMatch = description.match(floorPattern);
            if (floorMatch) {
              floor = floorMatch[1] || floorMatch[0];
              break;
            }
          }

          subPlots.push({
            sub_plot_number: subPlotNumber,
            floor: floor,
            description: description,
            area: area,
            additional_info: null
          });
        }
      }
    }

    const confidence = subPlots.length > 0 ? 75 : 0;
    
    return {
      value: subPlots,
      confidence,
      context: subPlots.length > 0 ? `Found ${subPlots.length} sub-plots` : '',
      count: subPlots.length
    };
  }
}

export {
  SharedBuildingFieldParser
};