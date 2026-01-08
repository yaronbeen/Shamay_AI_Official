/**
 * Tool Handlers for Claude Agent SDK
 * Execute tool calls and return results
 */

import { taIdDefinitions } from './tools';

interface SessionData {
  id?: string;
  session_id?: string;
  sessionId?: string;
  extracted_data?: Record<string, unknown>;
  extractedData?: Record<string, unknown>;
  uploads?: Array<{ type: string; name: string; status: string }>;
  comparable_data?: Array<Record<string, unknown>>;
  comparableData?: Array<Record<string, unknown>>;
  gush?: string;
  parcel?: string;
  sub_parcel?: string;
  subParcel?: string;
  registered_area?: number;
  registeredArea?: number;
  building_permit_number?: string;
  buildingPermitNumber?: string;
  building_permit_date?: string;
  buildingPermitDate?: string;
  building_description?: string;
  buildingDescription?: string;
  building_floors?: number;
  buildingFloors?: number;
  building_units?: number;
  buildingUnits?: number;
  street?: string;
  building_number?: string;
  buildingNumber?: string;
  city?: string;
  neighborhood?: string;
  area?: number;
  rooms?: number;
  floor?: string | number;
}

interface AIExtraction {
  extraction_type: string;
  extracted_fields: Record<string, unknown>;
  raw_ai_response?: Record<string, unknown>;
}

interface ToolContext {
  session: SessionData;
  aiExtractions: AIExtraction[];
}

type ToolInput = Record<string, unknown>;

/**
 * Execute a tool call and return the result
 */
export async function executeToolCall(
  toolName: string,
  input: ToolInput,
  context: ToolContext
): Promise<string> {
  const handlers: Record<string, (input: ToolInput, context: ToolContext) => Promise<string>> = {
    get_extracted_data: handleGetExtractedData,
    get_document_content: handleGetDocumentContent,
    explain_field: handleExplainField,
    search_documents: handleSearchDocuments,
    get_validation_status: handleGetValidationStatus,
    generate_report_text: handleGenerateReportText,
    get_comparable_analysis: handleGetComparableAnalysis,
    web_search: handleWebSearch,
  };

  const handler = handlers[toolName];
  if (!handler) {
    return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }

  try {
    return await handler(input, context);
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error);
    return JSON.stringify({
      error: `שגיאה בהפעלת הכלי: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
}

/**
 * Get extracted data from documents
 */
async function handleGetExtractedData(
  input: ToolInput,
  context: ToolContext
): Promise<string> {
  const { document_type, field_ids } = input as {
    document_type: string;
    field_ids?: string[];
  };

  const { session, aiExtractions } = context;
  const result: Record<string, unknown> = {};

  // Map document type to extraction type
  const typeMap: Record<string, string> = {
    tabu: 'land_registry',
    building_permit: 'building_permit',
    condo_order: 'shared_building_order',
  };

  // Get extractions based on document type
  const relevantExtractions = document_type === 'all'
    ? aiExtractions
    : aiExtractions.filter(e => e.extraction_type === typeMap[document_type]);

  // Extract fields
  for (const extraction of relevantExtractions) {
    const fields = extraction.extracted_fields || {};

    if (field_ids && field_ids.length > 0) {
      // Return only requested fields
      for (const fieldId of field_ids) {
        const fieldDef = taIdDefinitions[fieldId];
        if (fieldDef && fields[fieldDef.name] !== undefined) {
          result[fieldId] = {
            name: fieldDef.hebrewName,
            value: fields[fieldDef.name],
            source: extraction.extraction_type,
          };
        }
      }
    } else {
      // Return all fields from this extraction
      Object.entries(fields).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          result[key] = value;
        }
      });
    }
  }

  // Also include direct session data
  if (document_type === 'all' || document_type === 'tabu') {
    if (session.gush) result['TA24'] = { name: 'גוש', value: session.gush, source: 'session' };
    if (session.parcel) result['TA25'] = { name: 'חלקה', value: session.parcel, source: 'session' };
    if (session.sub_parcel) result['TA26'] = { name: 'תת-חלקה', value: session.sub_parcel, source: 'session' };
    if (session.registered_area) result['TA27'] = { name: 'שטח רשום', value: session.registered_area, source: 'session' };
  }

  if (document_type === 'all' || document_type === 'building_permit') {
    if (session.building_permit_number) result['TA50'] = { name: 'מספר היתר', value: session.building_permit_number, source: 'session' };
    if (session.building_permit_date) result['TA51'] = { name: 'תאריך היתר', value: session.building_permit_date, source: 'session' };
  }

  if (document_type === 'all' || document_type === 'condo_order') {
    if (session.building_description) result['TA60'] = { name: 'תיאור הבניין', value: session.building_description, source: 'session' };
    if (session.building_floors) result['TA61'] = { name: 'קומות', value: session.building_floors, source: 'session' };
    if (session.building_units) result['TA62'] = { name: 'יחידות', value: session.building_units, source: 'session' };
  }

  return JSON.stringify({
    success: true,
    documentType: document_type,
    data: result,
    extractionCount: relevantExtractions.length,
  });
}

/**
 * Get raw document content
 */
async function handleGetDocumentContent(
  input: ToolInput,
  context: ToolContext
): Promise<string> {
  const { document_type } = input as { document_type: string };
  const { aiExtractions } = context;

  const typeMap: Record<string, string> = {
    tabu: 'land_registry',
    building_permit: 'building_permit',
    condo_order: 'shared_building_order',
  };

  const extraction = aiExtractions.find(e => e.extraction_type === typeMap[document_type]);

  if (!extraction) {
    return JSON.stringify({
      success: false,
      error: `לא נמצא מסמך מסוג ${document_type}`,
    });
  }

  // Return raw AI response which contains extracted text
  return JSON.stringify({
    success: true,
    documentType: document_type,
    content: extraction.raw_ai_response || extraction.extracted_fields,
  });
}

/**
 * Explain a TA_ID field
 */
async function handleExplainField(
  input: ToolInput,
  _context: ToolContext
): Promise<string> {
  const { field_id } = input as { field_id: string };

  const fieldDef = taIdDefinitions[field_id];

  if (!fieldDef) {
    return JSON.stringify({
      success: false,
      error: `שדה ${field_id} לא מוכר במערכת`,
      availableFields: Object.keys(taIdDefinitions).slice(0, 20),
    });
  }

  return JSON.stringify({
    success: true,
    fieldId: field_id,
    name: fieldDef.name,
    hebrewName: fieldDef.hebrewName,
    description: fieldDef.description,
    source: fieldDef.source,
    legalContext: getLegalContext(field_id),
  });
}

/**
 * Get additional legal context for fields
 */
function getLegalContext(fieldId: string): string {
  const contexts: Record<string, string> = {
    'TA24': 'הגוש הוא יחידת מיפוי קדסטרית. מספר הגוש ייחודי לכל אזור ומופיע בכל מסמכי הרישום.',
    'TA25': 'החלקה היא יחידת הקרקע הבסיסית. לכל חלקה יש בעלים רשומים ושטח מוגדר בספרי האחוזה.',
    'TA26': 'תת-חלקה משמשת בבתים משותפים לזיהוי דירה ספציפית. כל דירה בבניין מקבלת מספר תת-חלקה ייחודי.',
    'TA27': 'השטח הרשום בטאבו הוא השטח המשפטי. יתכנו הפרשים בין השטח הרשום לשטח הפיזי בפועל.',
    'TA40': 'משכנתא היא זכות קניינית המשועבדת לטובת נושה. חובה לסלק משכנתא או לקבל הסכמה לפני מכירה.',
    'TA41': 'הערת אזהרה היא רישום שמטרתו להזהיר קונים פוטנציאליים על התחייבות קיימת של הבעלים.',
    'TA42': 'זיקת הנאה היא זכות שימוש של אחר בנכס (למשל זכות מעבר). היא נלווית לנכס ועוברת לקונים.',
    'TA43': 'הצמדות הן שטחים המוצמדים לדירה ספציפית ורשומים בצו הבית המשותף.',
    'TA50': 'היתר הבנייה הוא אישור חוקי לביצוע עבודות בנייה. בנייה ללא היתר היא עבירה פלילית.',
  };

  return contexts[fieldId] || 'אין מידע משפטי נוסף זמין לשדה זה.';
}

/**
 * Search across documents
 */
async function handleSearchDocuments(
  input: ToolInput,
  context: ToolContext
): Promise<string> {
  const { query, document_type } = input as {
    query: string;
    document_type?: string;
  };

  const { aiExtractions } = context;
  const results: Array<{ field: string; value: string; source: string; context: string }> = [];

  const searchLower = query.toLowerCase();

  for (const extraction of aiExtractions) {
    if (document_type && document_type !== 'all') {
      const typeMap: Record<string, string> = {
        tabu: 'land_registry',
        building_permit: 'building_permit',
        condo_order: 'shared_building_order',
      };
      if (extraction.extraction_type !== typeMap[document_type]) continue;
    }

    const fields = extraction.extracted_fields || {};

    for (const [key, value] of Object.entries(fields)) {
      const valueStr = String(value || '');
      if (valueStr.toLowerCase().includes(searchLower)) {
        results.push({
          field: key,
          value: valueStr,
          source: extraction.extraction_type,
          context: `נמצא ב${getHebrewDocType(extraction.extraction_type)}`,
        });
      }
    }
  }

  return JSON.stringify({
    success: true,
    query,
    resultsCount: results.length,
    results: results.slice(0, 20), // Limit results
  });
}

function getHebrewDocType(type: string): string {
  const types: Record<string, string> = {
    land_registry: 'נסח טאבו',
    building_permit: 'היתר בנייה',
    shared_building_order: 'צו בית משותף',
  };
  return types[type] || type;
}

/**
 * Get validation status of fields
 */
async function handleGetValidationStatus(
  input: ToolInput,
  context: ToolContext
): Promise<string> {
  const { include_warnings = true, field_ids } = input as {
    include_warnings?: boolean;
    field_ids?: string[];
  };

  const { session, aiExtractions } = context;
  const issues: Array<{ field: string; type: string; message: string; severity: string }> = [];

  // Check required fields
  const requiredFields = [
    { id: 'TA24', name: 'gush', hebrew: 'גוש' },
    { id: 'TA25', name: 'parcel', hebrew: 'חלקה' },
    { id: 'TA27', name: 'registeredArea', hebrew: 'שטח רשום' },
    { id: 'TA3', name: 'street', hebrew: 'רחוב' },
    { id: 'TA5', name: 'city', hebrew: 'עיר' },
  ];

  for (const field of requiredFields) {
    if (field_ids && !field_ids.includes(field.id)) continue;

    const sessionKey = field.name as keyof SessionData;
    const value = session[sessionKey];
    if (!value) {
      issues.push({
        field: field.id,
        type: 'missing',
        message: `${field.hebrew} חסר`,
        severity: 'error',
      });
    }
  }

  // Check confidence scores from extractions
  for (const extraction of aiExtractions) {
    const fields = extraction.extracted_fields || {};

    for (const [key, value] of Object.entries(fields)) {
      if (typeof value === 'object' && value !== null) {
        const obj = value as Record<string, unknown>;
        if (obj.confidence !== undefined && Number(obj.confidence) < 0.7) {
          if (!include_warnings) continue;

          issues.push({
            field: key,
            type: 'low_confidence',
            message: `רמת ביטחון נמוכה (${Math.round(Number(obj.confidence) * 100)}%)`,
            severity: 'warning',
          });
        }
      }
    }
  }

  // Check for missing documents
  const uploads = session.uploads || [];
  const hasTabu = uploads.some(u => u.type === 'tabu' && u.status === 'completed');
  const hasPermit = uploads.some(u => u.type === 'building_permit' && u.status === 'completed');

  if (!hasTabu && include_warnings) {
    issues.push({
      field: 'documents',
      type: 'missing_document',
      message: 'נסח טאבו לא הועלה',
      severity: 'warning',
    });
  }

  return JSON.stringify({
    success: true,
    issuesCount: issues.length,
    errors: issues.filter(i => i.severity === 'error'),
    warnings: include_warnings ? issues.filter(i => i.severity === 'warning') : [],
    isValid: issues.filter(i => i.severity === 'error').length === 0,
  });
}

/**
 * Generate report text for a section
 */
async function handleGenerateReportText(
  input: ToolInput,
  context: ToolContext
): Promise<string> {
  const { section, additional_context, style = 'formal' } = input as {
    section: string;
    additional_context?: string;
    style?: string;
  };

  const { session } = context;

  // Generate text based on section and available data
  const generators: Record<string, () => string> = {
    property_description: () => generatePropertyDescription(session, style),
    location_analysis: () => generateLocationAnalysis(session, style),
    building_description: () => generateBuildingDescription(session, style),
    legal_status: () => generateLegalStatus(session, style),
    market_analysis: () => generateMarketAnalysis(session, style),
    valuation_methodology: () => generateValuationMethodology(session, style),
    final_assessment: () => generateFinalAssessment(session, style),
  };

  const generator = generators[section];
  if (!generator) {
    return JSON.stringify({
      success: false,
      error: `סעיף לא מוכר: ${section}`,
    });
  }

  const text = generator();

  return JSON.stringify({
    success: true,
    section,
    style,
    text,
    additionalContext: additional_context,
    canCopyToReport: true,
  });
}

// Text generation helpers
function generatePropertyDescription(session: SessionData, style: string): string {
  const address = `${session.street || ''} ${session.building_number || ''}, ${session.city || ''}`.trim();
  const area = session.area || session.registered_area;
  const rooms = session.rooms;
  const floor = session.floor;

  if (style === 'concise') {
    return `הנכס הנישום ממוקם ב${address}. שטח: ${area} מ"ר, ${rooms} חדרים, קומה ${floor}.`;
  }

  return `הנכס הנישום הינו דירת מגורים הממוקמת ב${address}${session.neighborhood ? `, שכונת ${session.neighborhood}` : ''}. ` +
    `שטח הדירה ${area} מ"ר, והיא כוללת ${rooms} חדרים. ` +
    `הדירה ממוקמת בקומה ${floor} בבניין.`;
}

function generateLocationAnalysis(session: SessionData, style: string): string {
  const city = session.city || 'העיר';
  const neighborhood = session.neighborhood || 'השכונה';

  if (style === 'concise') {
    return `הנכס ממוקם ב${neighborhood}, ${city}. אזור מבוקש עם נגישות טובה.`;
  }

  return `הנכס ממוקם ב${neighborhood} שב${city}. ` +
    `השכונה מאופיינת במגורים ונהנית מקרבה לשירותים ציבוריים, תחבורה ומסחר. ` +
    `סביבת הנכס הינה עירונית מבוססת עם מאפיינים אופייניים לאזור.`;
}

function generateBuildingDescription(session: SessionData, style: string): string {
  const floors = session.building_floors;
  const units = session.building_units;
  const description = session.building_description;

  if (description) {
    return description;
  }

  if (style === 'concise') {
    return `בניין בן ${floors || '?'} קומות עם ${units || '?'} יחידות דיור.`;
  }

  return `הבניין בו מצוי הנכס הינו בניין מגורים בן ${floors || '?'} קומות הכולל ${units || '?'} יחידות דיור. ` +
    `הבניין תקין ומתוחזק כראוי.`;
}

function generateLegalStatus(session: SessionData, _style: string): string {
  const gush = session.gush;
  const parcel = session.parcel;
  const subParcel = session.sub_parcel;

  return `הנכס רשום בפנקסי המקרקעין בגוש ${gush || '?'}, חלקה ${parcel || '?'}` +
    `${subParcel ? `, תת-חלקה ${subParcel}` : ''}. ` +
    `הזכויות בנכס הן זכויות בעלות רשומות.`;
}

function generateMarketAnalysis(session: SessionData, _style: string): string {
  const comparable = session.comparable_data;

  if (!comparable || !Array.isArray(comparable) || comparable.length === 0) {
    return 'לא הוזנו נתוני עסקאות השוואה לניתוח שוק.';
  }

  const avgPrice = comparable.reduce((sum: number, c: Record<string, unknown>) =>
    sum + (Number(c.price_per_sqm) || 0), 0) / comparable.length;

  return `ניתוח השוק התבסס על ${comparable.length} עסקאות השוואה באזור. ` +
    `מחיר ממוצע למ"ר: ${Math.round(avgPrice).toLocaleString()} ₪.`;
}

function generateValuationMethodology(_session: SessionData, _style: string): string {
  return `השומה בוצעה בגישת ההשוואה (Market Approach), ` +
    `תוך התבססות על עסקאות מכר של נכסים דומים באזור. ` +
    `המחיר הושווה למ"ר ונלקחו בחשבון הבדלים בגודל, קומה, ומצב הנכס.`;
}

function generateFinalAssessment(session: SessionData, _style: string): string {
  const extractedData = session.extracted_data as Record<string, unknown> | undefined;
  const finalValuation = extractedData?.finalValuation;
  const pricePerSqm = extractedData?.pricePerSqm;

  if (!finalValuation) {
    return 'טרם בוצע חישוב שווי סופי.';
  }

  return `לאור כל האמור לעיל, שווי הנכס נכון ליום הקובע מוערך ב-${Number(finalValuation).toLocaleString()} ₪ ` +
    `(${Number(pricePerSqm).toLocaleString()} ₪ למ"ר).`;
}

/**
 * Get comparable analysis data
 */
async function handleGetComparableAnalysis(
  input: ToolInput,
  context: ToolContext
): Promise<string> {
  const { include_excluded = false, statistics_only = false } = input as {
    include_excluded?: boolean;
    statistics_only?: boolean;
  };

  const { session } = context;
  const comparables = (session.comparable_data || []) as Array<Record<string, unknown>>;

  if (comparables.length === 0) {
    return JSON.stringify({
      success: true,
      hasData: false,
      message: 'לא הוזנו עסקאות השוואה',
    });
  }

  // Filter included comparables
  const filtered = include_excluded
    ? comparables
    : comparables.filter((c: Record<string, unknown>) => c.included !== false);

  // Calculate statistics
  const prices = filtered.map((c: Record<string, unknown>) => Number(c.price_per_sqm) || 0);
  const avgPrice = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  // Standard deviation
  const variance = prices.reduce((sum: number, p: number) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length;
  const stdDev = Math.sqrt(variance);

  const statistics = {
    count: filtered.length,
    totalCount: comparables.length,
    averagePricePerSqm: Math.round(avgPrice),
    minPricePerSqm: Math.round(minPrice),
    maxPricePerSqm: Math.round(maxPrice),
    standardDeviation: Math.round(stdDev),
    coefficientOfVariation: Math.round((stdDev / avgPrice) * 100),
  };

  if (statistics_only) {
    return JSON.stringify({
      success: true,
      hasData: true,
      statistics,
    });
  }

  return JSON.stringify({
    success: true,
    hasData: true,
    statistics,
    comparables: filtered.slice(0, 10).map((c: Record<string, unknown>) => ({
      address: c.address,
      rooms: c.rooms,
      area: c.area,
      saleDate: c.sale_date,
      price: c.price,
      pricePerSqm: c.price_per_sqm,
      included: c.included !== false,
    })),
  });
}

/**
 * Web search handler using DuckDuckGo
 */
async function handleWebSearch(
  input: ToolInput,
  _context: ToolContext
): Promise<string> {
  const { query, num_results = 5 } = input as {
    query: string;
    num_results?: number;
  };

  try {
    // Use DuckDuckGo instant answers API (no key required)
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1&skip_disambig=1`
    );

    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }

    const data = await response.json();

    const results: Array<{ title: string; snippet: string; url: string }> = [];

    // Add abstract/answer if available
    if (data.AbstractText) {
      results.push({
        title: data.Heading || query,
        snippet: data.AbstractText,
        url: data.AbstractURL || '',
      });
    }

    // Add related topics
    if (data.RelatedTopics) {
      for (const topic of data.RelatedTopics.slice(0, Math.min(num_results, 10))) {
        if (topic.Text && !topic.Topics) {
          results.push({
            title: topic.Text.split(' - ')[0] || topic.Text.substring(0, 50),
            snippet: topic.Text,
            url: topic.FirstURL || '',
          });
        }
      }
    }

    // If no results from DuckDuckGo, provide a helpful message
    if (results.length === 0) {
      return JSON.stringify({
        success: true,
        query,
        resultsCount: 0,
        message: 'לא נמצאו תוצאות ישירות. נסה לנסח את השאילתה באנגלית או בצורה אחרת.',
        suggestion: `ניתן לחפש ידנית ב: https://www.google.com/search?q=${encodedQuery}`,
      });
    }

    return JSON.stringify({
      success: true,
      query,
      resultsCount: results.length,
      results: results.slice(0, num_results),
    });
  } catch (error) {
    console.error('Web search error:', error);
    return JSON.stringify({
      success: false,
      error: `שגיאה בחיפוש: ${error instanceof Error ? error.message : 'Unknown error'}`,
      suggestion: `ניתן לחפש ידנית ב: https://www.google.com/search?q=${encodeURIComponent(query)}`,
    });
  }
}

