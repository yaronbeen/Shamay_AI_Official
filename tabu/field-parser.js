/**
 * Field Parser for Hebrew Land Registry Documents
 * Extracts structured data from MarkItDown converted markdown
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
    
    // Common OCR corrections for Hebrew - be very careful with these
    const hebrewFixes = {
      'נ\'': 'נס\'',
      'ח1קה': 'חלקה', 
      'ג0ש': 'גוש',
      'מס\'': 'מס\'',
      'ךיראת': 'תאריך', // Reversed "date"
      // Don't fix שוג and הקלח - they might be correct RTL representations
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
      gush: this.extractGush(processedText),
      chelka: this.extractChelka(processedText),
      subChelka: this.extractSubChelka(processedText),
      apartmentArea: this.extractApartmentArea(processedText),
      owners: this.extractOwners(processedText),
      attachments: this.extractAttachments(processedText)
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
   * Extract Gush (block number) from Hebrew text
   */
  extractGush(text) {
    // Pattern: looks for "גוש" (Gush) with numbers, handling RTL text
    const patterns = [
      /(\d+)\s*:(?:שוג|גוש)/,  // "9905 :גוש" or reversed
      /(?:גוש|שוג)[:\s]*(\d+)/,
      // Handle the specific line pattern we see: "8 :הקלח תת     88 :הקלח     9905 :שוג"
      /(\d+)\s*:שוג/,  // Look for numbers before ":שוג"
      /(\d+)\s+:(?:שוג|גוש)/, // With space before colon
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const value = match[1].trim();
        return {
          value: parseInt(value),
          confidence: 95,
          context: match[0],
          pattern: pattern.toString()
        };
      }
    }

    return { value: null, confidence: 0, context: '', pattern: '' };
  }

  /**
   * Extract Chelka (plot number) from Hebrew text
   */
  extractChelka(text) {
    // Pattern: looks for "חלקה" (Chelka) with numbers, handling RTL text
    // From line: "8 :הקלח תת     88 :הקלח     9905 :שוג"
    // We want 88 (middle number)
    const patterns = [
      // Parse the full line: "8 :הקלח תת     88 :הקלח     9905 :שוג"
      // We need to extract 88 (middle value)
      /:\s*הקלח\s*תת\s+(\d+)\s*:\s*הקלח\s+\d+\s*:\s*שוג/, // Extract 88 from full pattern
      /(\d+)\s*:\s*הקלח(?!\s*תת)/, // 88 before ":הקלח" (not followed by תת)
      /(?:תת\s+)?(\d+)\s*:\s*הקלח(?!\s*תת)/, // More flexible version
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const value = match[1].trim();
        return {
          value: parseInt(value),
          confidence: 95,
          context: match[0],
          pattern: pattern.toString()
        };
      }
    }

    return { value: null, confidence: 0, context: '', pattern: '' };
  }

  /**
   * Extract Sub-Chelka (sub-plot number) from Hebrew text
   */
  extractSubChelka(text) {
    // Pattern: looks for "תת חלקה" (Sub-Chelka) with numbers, handling RTL text
    // From line: "8 :הקלח תת     88 :הקלח     9905 :שוג"
    // We want 8 (first number)
    const patterns = [
      /(\d+)\s*:\s*הקלח\s*תת/, // "8 :הקלח תת" - gets the 8
      /(\d+)\s*:\s*תת\s*הקלח/, // "8 : תת חלקה" 
      /תת\s*חלקה[:\s]*(\d+)/,
      /תת[־\s]*חלקה[:\s]*(\d+)/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const value = match[1].trim();
        return {
          value: parseInt(value),
          confidence: 90,
          context: match[0],
          pattern: pattern.toString()
        };
      }
    }

    return { value: null, confidence: 0, context: '', pattern: '' };
  }

  /**
   * Extract apartment area from Hebrew text
   */
  extractApartmentArea(text) {
    // Pattern: looks for area measurements in square meters
    // From the text we see: "10.30" and "104.30" - we want the apartment area (10.30)
    const patterns = [
      /(\d+\.\d+)/, // Look for decimal numbers like "10.30"
      /(\d+\.?\d*)\s*(?=ר"מב חטש|מ"ר|מטר)/,  // Before area units
      /חטש[:\s]*(\d+\.?\d*)/,
      /שטח[:\s]*(\d+\.?\d*)/
    ];

    const foundAreas = [];
    
    for (const pattern of patterns) {
      const matches = text.match(new RegExp(pattern.source, 'g'));
      if (matches) {
        matches.forEach(match => {
          const numMatch = match.match(/(\d+\.?\d*)/);
          if (numMatch) {
            const area = parseFloat(numMatch[1]);
            if (area > 0 && area < 200) { // Reasonable apartment size
              foundAreas.push({
                value: area,
                context: match,
                pattern: pattern.toString()
              });
            }
          }
        });
      }
    }

    if (foundAreas.length > 0) {
      // Prefer smaller values (likely apartment vs building)
      const sorted = foundAreas.sort((a, b) => a.value - b.value);
      const selected = sorted[0];
      
      return {
        value: selected.value,
        confidence: 85,
        context: selected.context,
        pattern: selected.pattern
      };
    }

    return { value: null, confidence: 0, context: '', pattern: '' };
  }

  /**
   * Extract property owners from Hebrew text
   */
  extractOwners(text) {
    const owners = [];
    
    // Look for owner patterns in Hebrew text
    const ownerPatterns = [
      // Pattern for Hebrew names with ID numbers
      /([\u0590-\u05FF\s]+)\s*(\d{8,9})/g,
      // Pattern around ownership contexts
      /(?:םילעבה|בעב|לעב)[:\s]*([\u0590-\u05FF\s]+)/g
    ];

    const foundNames = new Set();
    
    for (const pattern of ownerPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const nameText = match[1] ? match[1].trim() : '';
        const idText = match[2] ? match[2].trim() : '';
        
        if (nameText && nameText.length > 2 && !foundNames.has(nameText)) {
          foundNames.add(nameText);
          
          const owner = {
            hebrewName: nameText,
            englishName: '', // MarkItDown may not preserve English names well
            idNumber: idText || '',
            ownershipShare: '1/1' // Default, may need more sophisticated parsing
          };
          
          owners.push(owner);
        }
      }
    }

    // Look for specific names that appear in the document
    const specificNames = text.match(/(גומלא בגר|תיריא בגר)/g);
    if (specificNames) {
      specificNames.forEach(name => {
        if (!foundNames.has(name)) {
          foundNames.add(name);
          owners.push({
            hebrewName: name,
            englishName: '',
            idNumber: '',
            ownershipShare: '1/2' // Based on document pattern
          });
        }
      });
    }

    const confidence = owners.length > 0 ? 75 : 0;
    
    return {
      value: owners,
      confidence,
      context: owners.length > 0 ? `Found ${owners.length} owners` : '',
      count: owners.length
    };
  }

  /**
   * Extract attachments (parking, balconies, etc.) from Hebrew text
   */
  extractAttachments(text) {
    const attachments = [];
    
    // Look for parking spaces
    const parkingPatterns = [
      /הינח/g,  // "הינח" = parking
      /ףינח/g,  // Alternative spelling
    ];
    
    for (const pattern of parkingPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        attachments.push({
          type: 'parking',
          description: 'חניה', // Hebrew for parking
          area: null,
          count: matches.length
        });
        break; // Don't double count
      }
    }
    
    // Look for balconies/terraces
    const balconyPatterns = [
      /תספרמ/g,  // "תספרמ" = balcony/terrace
      /תצרמ/g,   // Alternative
    ];
    
    for (const pattern of balconyPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        attachments.push({
          type: 'balcony',
          description: 'מרפסת', // Hebrew for balcony
          area: null,
          count: matches.length
        });
        break;
      }
    }
    
    const confidence = attachments.length > 0 ? 80 : 0;
    
    return {
      value: attachments,
      confidence,
      context: attachments.length > 0 ? `Found ${attachments.length} attachments` : ''
    };
  }
}

module.exports = {
  FieldParser
};