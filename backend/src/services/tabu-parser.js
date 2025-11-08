/**
 * Tabu (Land Registry) Extract Parser
 * 
 * Extracts structured data from Israeli Land Registry PDF extracts (נסח טאבו)
 * using Hebrew keyword anchoring and pattern matching.
 * 
 * Every extracted value includes provenance:
 * - source: "tabu"
 * - file_id: UUID of uploaded PDF
 * - page: page number where found
 * - low_confidence: boolean if pattern match was weak
 */

const pdf = require('pdf-parse');
const fs = require('fs').promises;

/**
 * Hebrew keyword patterns for anchored extraction
 */
const HEBREW_PATTERNS = {
  REGISTRAR_OFFICE: /לשכת רישום[^א-ת]{0,20}([א-ת\s\-]+(?:יפו|ירושלים|חיפה|באר שבע|נצרת))/,
  EXTRACT_DATE: /(?:נכון ליום|תאריך הפקה|מיום)[:\s]*(\d{1,2}[\.\/]\d{1,2}[\.\/]\d{2,4})/,
  BLOCK: /גוש[:\s]*(\d+)/,
  PARCEL: /חלקה[:\s]*(\d+)/,
  SUB_PARCEL: /תת[־\s]*חלקה[:\s]*(\d+)/,
  PARCEL_AREA: /שטח[^א-ת]{0,30}(\d+[\.,]?\d*)\s*מ["']ר/,
  REGISTERED_AREA: /בשטח[^א-ת]{0,20}(\d+[\.,]?\d*)\s*מ["']ר/,
  FLOOR: /קומה[:\s]*(\d+)/,
  BUILDING_NUMBER: /מבנה[:\s]*(?:מס['׳]?\s*)?(\d+)/,
  COMMON_PARTS: /רכוש[^א-ת]{0,20}משותף[:\s]*([\d\/]+)/,
  
  // Ownership pattern
  OWNER: /([א-ת\s]+)\s+ת[\.״׳]ז[\.:\s]*(\d{6,10})/,
  OWNERSHIP_SHARE: /חלק[^א-ת]{0,20}בנכס[:\s]*([\d\/]+|שלמות)/,
  
  // Mortgage pattern
  MORTGAGE_RANK: /משכנתא[^א-ת]{0,20}מדרגה[^א-ת]{0,10}([א-ת]+)/,
  MORTGAGE_BENEFICIARY: /לטובת[:\s]*([^,\n]{3,80})/,
  MORTGAGE_AMOUNT: /(?:על סך|סכום)[:\s]*([₪\d,\.]+)/,
  
  // Attachments
  ATTACHMENT_TYPE: /(חניה|מחסן|מרפסת|גג|גינה)[^א-ת]{0,20}בשטח[^א-ת]{0,10}(\d+[\.,]?\d*)\s*מ["']ר/,
  ATTACHMENT_SYMBOL: /באות[:\s]*([א-ת]['׳]?)/,
  ATTACHMENT_COLOR: /בצבע[:\s]*([א-ת]+)/,
  
  // Notes
  NOTE_ACTION: /(עיקול|הערה|צו|איסור)[^,]{0,100}/,
};

/**
 * Parse Tabu PDF and extract structured data
 */
async function parseTabuPDF(filePath, fileId) {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const pdfData = await pdf(dataBuffer);
    
    const text = pdfData.text;
    const numPages = pdfData.numpages;
    
    console.log(`📄 Parsing Tabu PDF: ${numPages} pages, ${text.length} chars`);
    
    const result = {
      metadata: {
        registrar_office: extractWithProvenance(text, HEBREW_PATTERNS.REGISTRAR_OFFICE, fileId, 1),
        extract_date: extractDateWithProvenance(text, HEBREW_PATTERNS.EXTRACT_DATE, fileId, 1),
      },
      parcel: {
        block: extractNumberWithProvenance(text, HEBREW_PATTERNS.BLOCK, fileId, 1, true),
        number: extractNumberWithProvenance(text, HEBREW_PATTERNS.PARCEL, fileId, 1, true),
        area_sqm: extractNumberWithProvenance(text, HEBREW_PATTERNS.PARCEL_AREA, fileId, 1),
      },
      subparcel: {
        number: extractWithProvenance(text, HEBREW_PATTERNS.SUB_PARCEL, fileId, 1),
        floor: extractNumberWithProvenance(text, HEBREW_PATTERNS.FLOOR, fileId, 1),
        building_number: extractWithProvenance(text, HEBREW_PATTERNS.BUILDING_NUMBER, fileId, 1),
        registered_area_sqm: extractNumberWithProvenance(text, HEBREW_PATTERNS.REGISTERED_AREA, fileId, 1, true),
        common_parts: extractWithProvenance(text, HEBREW_PATTERNS.COMMON_PARTS, fileId, 1),
      },
      ownerships: extractOwnerships(text, fileId),
      attachments: extractAttachments(text, fileId),
      mortgages: extractMortgages(text, fileId),
      notes: extractNotes(text, fileId),
    };
    
    // Validate mandatory fields
    const validation = validateTabuExtraction(result);
    
    return {
      success: true,
      data: result,
      validation,
      stats: {
        pages: numPages,
        textLength: text.length,
        ownerships: result.ownerships.length,
        attachments: result.attachments.length,
        mortgages: result.mortgages.length,
        notes: result.notes.length,
      }
    };
    
  } catch (error) {
    console.error('❌ Error parsing Tabu PDF:', error);
    return {
      success: false,
      error: error.message,
      data: null,
      validation: { valid: false, missing: ['ALL'] }
    };
  }
}

/**
 * Extract text value with provenance
 */
function extractWithProvenance(text, pattern, fileId, page) {
  const match = text.match(pattern);
  
  if (!match || !match[1]) {
    return {
      value: null,
      source: {
        source: 'tabu',
        file_id: fileId,
        page,
        low_confidence: true
      }
    };
  }
  
  return {
    value: match[1].trim(),
    source: {
      source: 'tabu',
      file_id: fileId,
      page,
      low_confidence: false
    }
  };
}

/**
 * Extract number value with provenance
 */
function extractNumberWithProvenance(text, pattern, fileId, page, required = false) {
  const match = text.match(pattern);
  
  if (!match || !match[1]) {
    return {
      value: null,
      source: {
        source: 'tabu',
        file_id: fileId,
        page,
        low_confidence: true
      }
    };
  }
  
  const numStr = match[1].replace(/,/g, '').replace(/\./g, '.');
  const value = parseFloat(numStr);
  
  return {
    value: isNaN(value) ? null : value,
    source: {
      source: 'tabu',
      file_id: fileId,
      page,
      low_confidence: isNaN(value)
    }
  };
}

/**
 * Extract date with provenance
 */
function extractDateWithProvenance(text, pattern, fileId, page) {
  const match = text.match(pattern);
  
  if (!match || !match[1]) {
    return {
      value: null,
      source: {
        source: 'tabu',
        file_id: fileId,
        page,
        low_confidence: true
      }
    };
  }
  
  const dateStr = match[1];
  const parts = dateStr.split(/[\.\/]/);
  
  if (parts.length !== 3) {
    return {
      value: null,
      source: {
        source: 'tabu',
        file_id: fileId,
        page,
        low_confidence: true
      }
    };
  }
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parts[2].length === 2 ? 2000 + parseInt(parts[2], 10) : parseInt(parts[2], 10);
  
  const date = new Date(year, month - 1, day);
  
  return {
    value: date.toISOString().split('T')[0],
    source: {
      source: 'tabu',
      file_id: fileId,
      page,
      low_confidence: false
    }
  };
}

/**
 * Extract all ownerships
 */
function extractOwnerships(text, fileId) {
  const ownerships = [];
  const lines = text.split('\n');
  
  let inOwnershipSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect ownership section
    if (line.includes('בעלויות') || line.includes('בעלים')) {
      inOwnershipSection = true;
      continue;
    }
    
    // Stop at next section
    if (inOwnershipSection && (line.includes('משכנתאות') || line.includes('הערות'))) {
      break;
    }
    
    if (inOwnershipSection) {
      const ownerMatch = line.match(HEBREW_PATTERNS.OWNER);
      const shareMatch = line.match(HEBREW_PATTERNS.OWNERSHIP_SHARE);
      
      if (ownerMatch) {
        ownerships.push({
          owner_name: ownerMatch[1].trim(),
          id_type: 'ת.ז',
          id_number: ownerMatch[2].trim(),
          fraction: shareMatch ? shareMatch[1].trim() : 'שלמות',
          source: {
            source: 'tabu',
            file_id: fileId,
            page: Math.ceil(i / 50), // Rough page estimation
            low_confidence: !shareMatch
          }
        });
      }
    }
  }
  
  return ownerships;
}

/**
 * Extract all attachments
 */
function extractAttachments(text, fileId) {
  const attachments = [];
  const lines = text.split('\n');
  
  let inAttachmentSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.includes('הצמדות')) {
      inAttachmentSection = true;
      continue;
    }
    
    if (inAttachmentSection && (line.includes('בעלויות') || line.includes('משכנתאות'))) {
      break;
    }
    
    if (inAttachmentSection) {
      const typeMatch = line.match(HEBREW_PATTERNS.ATTACHMENT_TYPE);
      
      if (typeMatch) {
        const symbolMatch = line.match(HEBREW_PATTERNS.ATTACHMENT_SYMBOL);
        const colorMatch = line.match(HEBREW_PATTERNS.ATTACHMENT_COLOR);
        
        attachments.push({
          type: typeMatch[1].trim(),
          size_sqm: parseFloat(typeMatch[2].replace(',', '.')),
          symbol: symbolMatch ? symbolMatch[1].trim() : null,
          color: colorMatch ? colorMatch[1].trim() : null,
          source: {
            source: 'tabu',
            file_id: fileId,
            page: Math.ceil(i / 50),
            low_confidence: false
          }
        });
      }
    }
  }
  
  return attachments;
}

/**
 * Extract all mortgages
 */
function extractMortgages(text, fileId) {
  const mortgages = [];
  const lines = text.split('\n');
  
  let inMortgageSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.includes('משכנתאות') || line.includes('שעבודים')) {
      inMortgageSection = true;
      continue;
    }
    
    if (inMortgageSection && (line.includes('הערות') || line.includes('זיקות'))) {
      break;
    }
    
    if (inMortgageSection) {
      const rankMatch = line.match(HEBREW_PATTERNS.MORTGAGE_RANK);
      
      if (rankMatch) {
        const beneficiaryMatch = line.match(HEBREW_PATTERNS.MORTGAGE_BENEFICIARY);
        const amountMatch = line.match(HEBREW_PATTERNS.MORTGAGE_AMOUNT);
        
        mortgages.push({
          rank: rankMatch[1].trim(),
          beneficiary: beneficiaryMatch ? beneficiaryMatch[1].trim() : '[לא זוהה]',
          amount_nis: amountMatch ? parseFloat(amountMatch[1].replace(/[₪,]/g, '')) : null,
          fraction: null, // Extract separately if present
          date: null, // Extract separately if present
          source: {
            source: 'tabu',
            file_id: fileId,
            page: Math.ceil(i / 50),
            low_confidence: !beneficiaryMatch
          }
        });
      }
    }
  }
  
  return mortgages;
}

/**
 * Extract all notes
 */
function extractNotes(text, fileId) {
  const notes = [];
  const lines = text.split('\n');
  
  let inNotesSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.includes('הערות') && !line.includes('לחלקה')) {
      inNotesSection = true;
      continue;
    }
    
    if (inNotesSection && line.trim() === '') {
      continue;
    }
    
    if (inNotesSection) {
      const noteMatch = line.match(HEBREW_PATTERNS.NOTE_ACTION);
      
      if (noteMatch) {
        notes.push({
          action_type: noteMatch[1].trim(),
          date: null, // Extract date if pattern found
          beneficiary: null, // Extract beneficiary if pattern found
          extra: line.length > 100 ? line.substring(0, 100) + '...' : line,
          source: {
            source: 'tabu',
            file_id: fileId,
            page: Math.ceil(i / 50),
            low_confidence: false
          }
        });
      }
    }
  }
  
  return notes;
}

/**
 * Validate mandatory Tabu fields
 */
function validateTabuExtraction(data) {
  const missing = [];
  
  // Mandatory fields per spec
  if (!data.metadata.registrar_office.value) missing.push('TA56');
  if (!data.metadata.extract_date.value) missing.push('TA31');
  if (!data.parcel.block.value) missing.push('TA24');
  if (!data.parcel.number.value) missing.push('TA25');
  if (!data.parcel.area_sqm.value) missing.push('parcel_area');
  if (!data.subparcel.number.value) missing.push('TA26');
  if (!data.subparcel.registered_area_sqm.value) missing.push('TA27');
  
  // Check low confidence flags
  const warnings = [];
  if (data.metadata.registrar_office.source.low_confidence) warnings.push('TA56');
  if (data.parcel.block.source.low_confidence) warnings.push('TA24');
  if (data.parcel.number.source.low_confidence) warnings.push('TA25');
  if (data.subparcel.number.source.low_confidence) warnings.push('TA26');
  if (data.subparcel.registered_area_sqm.source.low_confidence) warnings.push('TA27');
  
  return {
    valid: missing.length === 0,
    missing,
    warnings,
    blockingIssues: missing.map(ta => ({
      taId: ta,
      message: `שדה חובה חסר: ${ta}`,
      level: 'blocking'
    })),
    warningIssues: warnings.map(ta => ({
      taId: ta,
      message: `שדה זוהה בביטחון נמוך: ${ta}`,
      level: 'warning'
    }))
  };
}

module.exports = {
  parseTabuPDF,
  validateTabuExtraction,
  HEBREW_PATTERNS
};

