/**
 * AI-Powered Field Extractor using Google Gemini
 * Uses Gemini 3 Pro Preview to extract Hebrew land registry fields with high accuracy
 * Includes field location tracking for scroll-to-source functionality
 */

const { GoogleGenAI } = require('@google/genai');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config();

class LandRegistryGeminiExtractor {
  constructor(apiKey) {
    this.ai = new GoogleGenAI({ apiKey: apiKey || process.env.GEMINI_API_KEY });
    this.model = 'gemini-3-pro-preview';
  }

  /**
   * Extract all fields using Gemini with structured output and field locations
   * @param {string|Buffer} input - Either markdown text or PDF file path/buffer
   * @param {Object} options - Options including isPdf flag
   * @returns {Promise<Object>} - Structured extraction results with locations
   */
  async extractAllFields(input, options = {}) {
    const startTime = Date.now();

    const systemPrompt = `You are an expert at extracting data from Hebrew land registry documents (נסח טאבו).

Extract the following information with high accuracy and return ONLY valid JSON:

DOCUMENT INFORMATION:
- registration_office: Land registry office name (לשכת רישום מקרקעין)
- issue_date: Document issue date (תאריך הפקה)
- tabu_extract_date: Tabu extract date (תאריך נסח טאבו)

CORE PROPERTY IDENTIFIERS:
- gush: Block number (גוש)
- chelka: Plot number (חלקה)
- sub_chelka: Sub-plot number (תת חלקה)

PROPERTY DETAILS:
- total_plot_area: Total plot area (שטח קרקע כולל של החלקה)
- regulation_type: Regulation type - מוסכם/לא מוסכם/מצוי (סוג התקנון)
- sub_plots_count: Number of sub-plots (מספר תתי חלקות)
- buildings_count: Number of buildings (מספר מבנים)
- building_units: Number of units in building (מספר יחידות בבניין)
- wings_count: Number of wings/entrances (מספר אגפים / כניסות)
- building_wing_number: Building/wing number of sub-plot (מספר מבנה / אגף של תת־החלקה)
- address_from_tabu: Address from tabu document (כתובת מהנסח)
- bylaws: Bylaws/regulations text (תקנון - טקסט)
- general_notes: General notes about property (הערות כלליות)
- building_description: Building description (תיאור הבניין)
- air_directions: Air directions/orientation (כיווני אוויר - צפון/דרום/מזרח/מערב)
- property_essence: Property essence/type (מהות הנכס - דירה/משרד/חנות)

UNIT/APARTMENT INFORMATION:
- unit_description: Unit description (תיאור הדירה - דירה/חנות/משרד)
- floor: Floor description (קומה)
- registered_area: Registered area (שטח רשום)
- apartment_registered_area: Apartment registered area (שטח דירה רשום)
- built_area: Built area in square meters (שטח בנוי במ"ר)
- balcony_area: Balcony area (שטח מרפסת)
- shared_property: Shared property fraction (רכוש משותף - חלק)
- shared_areas: Shared areas description (שטחים משותפים)
- building_number: Building number (מספר מבנה)
- additional_areas: Additional areas array (שטחים נוספים)
- construction_year: Year of construction (שנת בנייה)
- property_condition: Property condition/state (מצב הנכס)
- finish_standard: Finish level/standard (רמת גימור)
- finish_details: Finish details description (פרטי גימור)

ATTACHMENTS (הצמדות):
- attachments: Complete attachments data with all details
- attachments_symbol: Attachment symbol in blueprint (סימן בתשריט)
- attachments_color: Attachment color in blueprint (צבע בתשריט) 
- attachments_description: Attachment description (תיאור הצמדה)
- attachments_area: Attachment area (שטח הצמדה)

OWNERSHIP (בעלויות):
- owners: Complete owners array with names, IDs, shares
- owners_count: Number of owners (מספר בעלים)
- ownership_type: Ownership type (סוג בעלות)
- rights: Rights description (זכויות)

NOTES AND COMMENTS - FOR ENTIRE PLOT (הערות רישומיות – לכלל החלקה):
- plot_notes: Notes for the entire plot (הערות לחלקה)
- plot_notes_action_type: Action type in plot notes (מהות הפעולה - לחלקה)
- plot_notes_beneficiary: Beneficiary in plot notes (שם המוטב - לחלקה)

NOTES AND COMMENTS - FOR SUB-PLOT (הערות רישומיות – לתת־חלקה):
- sub_chelka_notes: Notes for sub-plot (הערות לתת־חלקה)
- sub_chelka_notes_action_type: Action type for sub-plot notes (מהות הפעולה - לתת חלקה)
- sub_chelka_notes_beneficiary: Beneficiary for sub-plot notes (שם המוטב - לתת חלקה)

EASEMENTS FOR ENTIRE PLOT (זיקות הנאה – לכלל החלקה):
- plot_easements_essence: Easement essence for plot (זיקות הנאה לחלקה - מהות)
- plot_easements_description: Easement description for plot (זיקות הנאה לחלקה - תיאור)

EASEMENTS FOR SUB-PLOT (זיקות הנאה – לתת־חלקה):
- sub_chelka_easements_essence: Easement essence for sub-plot (זיקות הנאה לתת־חלקה - מהות)
- sub_chelka_easements_description: Easement description for sub-plot (זיקות הנאה לתת־חלקה - תיאור)

MORTGAGES (משכנתאות):
- mortgages: Complete mortgages array
- mortgage_essence: Primary mortgage essence (משכנתא - מהות)
- mortgage_rank: Primary mortgage rank (משכנתא - דרגה)
- mortgage_lenders: Primary mortgage lenders (בעלי המשכנתא)
- mortgage_borrowers: Primary mortgage borrowers (שם הלווים)
- mortgage_amount: Primary mortgage amount (סכום משכנתא)
- mortgage_property_share: Property share in mortgage (חלק בנכס)
- mortgage_date: Mortgage registration date (תאריך רישום משכנתא)

ATTACHMENTS SHARED WITH (שיוך הצמדות):
- attachments_shared_with: Which units/properties share the attachment (שיוך - לאילו יחידות משויכת ההצמדה)

SHARED BUILDING ORDER (צו בית משותף):
- shared_building_order_date: Date of shared building order (תאריך הפקת צו בית משותף)
- building_address: Building address (כתובת הבניין)
- floors_count_in_building: Number of floors in building (מספר קומות בבניין)
- sub_plots_total_in_building: Total sub-plots in building (מספר תתי־חלקות כולל בבניין)
- sub_plot_floor: Sub-plot floor (קומה של תת־החלקה)
- sub_plot_area: Sub-plot area (שטח תת־החלקה)
- sub_plot_description: Sub-plot verbal description (תיאור מילולי של תת־החלקה)
- shared_property_parts: Shared property parts attributed to sub-plot (חלקים ברכוש המשותף המיוחסים לתת־החלקה)
- non_attachment_areas: Areas not in attachments (שטחים שאינם בהצמדות)

BUILDING PERMITS (היתרי בנייה) - This is a REPEATING object (0/1/N permits):
- permits: Array of building permits, each containing:
  * permit_number: Permit number (מספר היתר)
  * permit_date: Permit date (תאריך היתר)
  * permit_issue_date: Permit issue date (תאריך הפקת היתר)
  * permitted_description: Permitted description (תיאור מותר) - store AS IS without parsing
  * local_committee_name: Local committee name (שם הוועדה המקומית)

FIELD LOCATIONS:
For EACH field you extract, also provide its location in the document:
- page: page number (1, 2, 3...)
- y_percent: vertical position (0 = top of page, 100 = bottom of page)

CONFIDENCE SCORES:
For each field, provide a confidence score from 0-1 based on text clarity and certainty.
Also provide context explaining where/how the information was found.

CRITICAL FIELD EXTRACTION GUIDANCE:

1. built_area (שטח בנוי):
   - Look for "שטח בנוי", "שטח במ\"ר", "שטח בנוי במ\"ר" in the unit description section
   - May appear as a separate field or within the property description
   - If not found explicitly, try to calculate from registered_area + balcony_area if both are available
   - If still not found, return null (do NOT guess or estimate)

2. finish_standard (רמת גימור):
   - Look for "רמת גימור", "סטנדרט גימור", "גימור" in property description or unit details
   - Common values: "יוקרתי", "טוב", "בינוני", "בסיסי", "סטנדרטי"
   - May be implied from property description (e.g., "דירה משופצת" = טוב, "דירה יוקרתית" = יוקרתי)
   - If not found, return null

3. construction_year (שנת בנייה):
   - Look for "שנת בנייה", "נבנה ב-", "בנייה משנת", "הוקם ב-" in property details
   - Extract 4-digit year (e.g., 1995, 2008, 2015)
   - May appear in building description or property notes
   - If not found, return null

4. shared_areas (שטחים משותפים):
   - Look for "שטחים משותפים", "רכוש משותף", "חלקים ברכוש המשותף"
   - Can appear as fraction (e.g., "104/5975") or as description text
   - Check both the unit section and the shared property section
   - If found as fraction, extract the full fraction string
   - If found as description, extract the description text
   - If not found, return null

5. property_condition (מצב הנכס):
   - Look for "מצב הנכס", "מצב", "תחזוקה" in property description
   - Common values: "מצוין", "טוב", "בינוני", "דורש שיפוץ", "משופץ"
   - May be implied from description (e.g., "דירה משופצת" = טוב)
   - If not found, return null

6. attachments (הצמדות):
   - Look for "הצמדות", "צמודות" section in the document
   - Extract ALL attachments, not just the first one
   - Each attachment should include:
     * type: "חניה", "מחסן", "גינה", "גג", "קרקע", etc.
     * area: numeric value in square meters
     * symbol: Hebrew letter or symbol from blueprint (if mentioned)
     * color: color mentioned in blueprint (if mentioned)
     * description: full description text
   - If attachments section exists but is empty, return empty array []
   - If no attachments section found, return empty array []

7. ownership_type (סוג בעלות):
   - Look for "סוג בעלות", "בעלות", "מוסכם", "לא מוסכם", "מצוי"
   - Usually appears near the regulation_type or in the ownership section
   - Common values: "מוסכם", "לא מוסכם", "מצוי", "בעלות מלאה"
   - If not found, return null

Return ONLY the JSON object with this structure:
{
  "data": {
    "registration_office": "office name or null",
    "issue_date": "YYYY-MM-DD or null",
    "tabu_extract_date": "YYYY-MM-DD or null",
    "gush": number or null,
    "chelka": number or null,
    "sub_chelka": number or null,
    "total_plot_area": number or null,
    "regulation_type": "מוסכם/לא מוסכם/מצוי or null",
    "sub_plots_count": number or null,
    "buildings_count": number or null,
    "building_units": number or null,
    "wings_count": number or null,
    "building_wing_number": "number or null",
    "address_from_tabu": "address or null",
    "bylaws": "bylaws text or null",
    "general_notes": "notes or null",
    "building_description": "description or null",
    "air_directions": "N/S/E/W or null",
    "property_essence": "type or null",
    "unit_description": "description or null",
    "floor": "floor or null",
    "registered_area": number or null,
    "apartment_registered_area": number or null,
    "built_area": number or null,
    "balcony_area": number or null,
    "shared_property": "fraction or null",
    "shared_areas": "description or null",
    "building_number": "number or null",
    "additional_areas": [{"type": "type", "area": number}],
    "construction_year": number or null,
    "property_condition": "condition or null",
    "finish_standard": "finish level or null",
    "finish_details": "finish details or null",
    "attachments": [{"type": "type", "area": number, "symbol": "symbol", "color": "color", "description": "desc"}],
    "attachments_symbol": "primary symbol or null",
    "attachments_color": "primary color or null", 
    "attachments_description": "primary description or null",
    "attachments_area": number or null,
    "owners": [{"name": "name", "id_number": "id", "ownership_share": "share"}],
    "owners_count": number or null,
    "ownership_type": "type or null",
    "rights": "rights or null",
    "plot_notes": "notes or null",
    "plot_notes_action_type": "action or null",
    "plot_notes_beneficiary": "beneficiary or null",
    "sub_chelka_notes": "notes or null",
    "sub_chelka_notes_action_type": "action or null",
    "sub_chelka_notes_beneficiary": "beneficiary or null",
    "plot_easements_essence": "essence or null",
    "plot_easements_description": "description or null",
    "sub_chelka_easements_essence": "essence or null",
    "sub_chelka_easements_description": "description or null",
    "mortgages": [{"essence": "type", "rank": "rank", "lenders": "lenders", "borrowers": "borrowers", "amount": number, "share": "share", "date": "YYYY-MM-DD or null"}],
    "mortgage_essence": "primary essence or null",
    "mortgage_rank": "primary rank or null",
    "mortgage_lenders": "primary lenders or null",
    "mortgage_borrowers": "primary borrowers or null",
    "mortgage_amount": number or null,
    "mortgage_property_share": "primary share or null",
    "mortgage_date": "YYYY-MM-DD or null",
    "attachments_shared_with": "shared units or null",
    "shared_building_order_date": "YYYY-MM-DD or null",
    "building_address": "address or null",
    "floors_count_in_building": number or null,
    "sub_plots_total_in_building": number or null,
    "sub_plot_floor": "floor or null",
    "sub_plot_area": number or null,
    "sub_plot_description": "description or null",
    "shared_property_parts": "fraction or description or null",
    "non_attachment_areas": "description or null",
    "permits": [{"permit_number": "number", "permit_date": "YYYY-MM-DD or null", "permit_issue_date": "YYYY-MM-DD or null", "permitted_description": "description", "local_committee_name": "name or null"}]
  },
  "locations": {
    "gush": {"page": 1, "y_percent": 8},
    "chelka": {"page": 1, "y_percent": 8},
    "mortgage_amount": {"page": 2, "y_percent": 75}
  },
  "confidence_scores": {
    "document_info": 0.0-1.0,
    "property_info": 0.0-1.0,
    "unit_info": 0.0-1.0,
    "ownership": 0.0-1.0,
    "attachments": 0.0-1.0,
    "notes": 0.0-1.0,
    "easements": 0.0-1.0,
    "mortgages": 0.0-1.0,
    "overall": 0.0-1.0
  },
  "extraction_contexts": {
    "document_info": "context",
    "property_info": "context",
    "unit_info": "context", 
    "ownership": "context",
    "attachments": "context",
    "notes": "context",
    "easements": "context",
    "mortgages": "context"
  }
}`;

    let contents = [];
    
    if (options.isPdf && typeof input === 'string') {
      // Read PDF file as base64 for direct processing
      const pdfBuffer = fs.readFileSync(input);
      const base64Pdf = pdfBuffer.toString('base64');
      
      contents = [
        { text: systemPrompt },
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: base64Pdf
          }
        },
        {
          text: `Extract structured data from this Hebrew land registry document (נסח טאבו).

CRITICAL EXTRACTION GUIDANCE:

1. built_area: Look for "שטח בנוי", "שטח במ\"ר", "שטח בנוי במ\"ר" in unit description section. If not found, try calculating from registered_area + balcony_area. If still not found, return null.

2. finish_standard: Look for "רמת גימור", "סטנדרט גימור", "גימור" in property description. Common values: "יוקרתי", "טוב", "בינוני", "בסיסי". If not found, return null.

3. construction_year: Look for "שנת בנייה", "נבנה ב-", "בנייה משנת" in property details. Extract 4-digit year. If not found, return null.

4. shared_areas: Look for "שטחים משותפים", "רכוש משותף", "חלקים ברכוש המשותף". Can appear as fraction (e.g., "104/5975") or description. Check both unit section and shared property section.

5. property_condition: Look for "מצב הנכס", "מצב", "תחזוקה" in property description. Common values: "מצוין", "טוב", "בינוני", "דורש שיפוץ". If not found, return null.

6. attachments: Look for "הצמדות", "צמודות" section. Extract ALL attachments with type, area, symbol, color, description. If section exists but is empty, return empty array []. If no section found, return empty array [].

7. ownership_type: Look for "סוג בעלות", "בעלות", "מוסכם", "לא מוסכם", "מצוי" near regulation_type or in ownership section.

Focus on finding the Hebrew text and extracting the required fields. For each field, also provide its location (page number and y_percent).`
        }
      ];
    } else {
      // Handle text input
      contents = [
        { text: systemPrompt },
        {
          text: `Extract structured data from this Hebrew land registry document:\n\n${input}`
        }
      ];
    }

    try {
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: contents
      });

      // Extract text from response - response structure may vary
      let text;
      if (response.text) {
        text = response.text;
      } else if (response.response && response.response.text) {
        text = response.response.text;
      } else if (response.candidates && response.candidates[0] && response.candidates[0].content) {
        text = response.candidates[0].content.parts[0].text;
      } else {
        text = JSON.stringify(response);
      }
      
      console.log('Raw Gemini response:', text.substring(0, 500));
      
      // Parse the JSON response
      let extractedData;
      try {
        extractedData = JSON.parse(text);
      } catch (parseError) {
        console.log('JSON parse error:', parseError.message);
        // Try to extract JSON from response if wrapped in text
        if (typeof text === 'string' && text.includes('{')) {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            console.log('Found JSON match');
            extractedData = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('No valid JSON found in response');
          }
        } else {
          throw new Error('Unexpected response format from Gemini API');
        }
      }

      const data = extractedData.data || extractedData;
      const locations = extractedData.locations || {};
      const confidenceScores = extractedData.confidence_scores || {};
      const extractionContexts = extractedData.extraction_contexts || {};

      // Structure the result to match field parser format
      const result = {
        gush: {
          value: data.gush || null,
          confidence: (confidenceScores.property_info || 0) * 100,
          context: extractionContexts.property_info || '',
          pattern: 'ai_extraction'
        },
        
        chelka: {
          value: data.chelka || null,
          confidence: (confidenceScores.property_info || 0) * 100,
          context: extractionContexts.property_info || '',
          pattern: 'ai_extraction'
        },
        
        sub_chelka: {
          value: data.sub_chelka || null,
          confidence: (confidenceScores.property_info || 0) * 100,
          context: extractionContexts.property_info || '',
          pattern: 'ai_extraction'
        },
        
        apartment_area: {
          value: data.apartment_registered_area || data.registered_area || null,
          confidence: (confidenceScores.unit_info || 0) * 100,
          context: extractionContexts.unit_info || '',
          pattern: 'ai_extraction'
        },
        
        built_area: {
          value: data.built_area || null,
          confidence: (confidenceScores.unit_info || 0) * 100,
          context: extractionContexts.unit_info || '',
          pattern: 'ai_extraction'
        },
        
        construction_year: {
          value: data.construction_year || null,
          confidence: (confidenceScores.property_info || 0) * 100,
          context: extractionContexts.property_info || '',
          pattern: 'ai_extraction'
        },
        
        property_condition: {
          value: data.property_condition || null,
          confidence: (confidenceScores.property_info || 0) * 100,
          context: extractionContexts.property_info || '',
          pattern: 'ai_extraction'
        },
        
        finish_standard: {
          value: data.finish_standard || null,
          confidence: (confidenceScores.unit_info || 0) * 100,
          context: extractionContexts.unit_info || '',
          pattern: 'ai_extraction'
        },
        
        shared_areas: {
          value: data.shared_areas || data.shared_property || null,
          confidence: (confidenceScores.property_info || 0) * 100,
          context: extractionContexts.property_info || '',
          pattern: 'ai_extraction'
        },
        
        attachments: data.attachments || [],
        
        owners: data.owners || [],
        
        // Additional fields
        property_address: {
          value: data.address_from_tabu || null,
          confidence: data.address_from_tabu ? 70 : 0,
          context: data.address_from_tabu ? 'Found in document' : '',
          pattern: 'ai_extraction'
        },
        
        floor: {
          value: data.floor || null,
          confidence: data.floor ? 70 : 0,
          context: data.floor ? 'Found in document' : '',
          pattern: 'ai_extraction'
        },
        
        building_number: {
          value: data.building_number || null,
          confidence: data.building_number ? 70 : 0,
          context: data.building_number ? 'Found in document' : '',
          pattern: 'ai_extraction'
        },
        
        registration_office: {
          value: data.registration_office || null,
          confidence: (confidenceScores.document_info || 0) * 100,
          context: extractionContexts.document_info || '',
          pattern: 'ai_extraction'
        },
        
        ownership_type: {
          value: data.ownership_type || null,
          confidence: (confidenceScores.ownership || 0) * 100,
          context: extractionContexts.ownership || '',
          pattern: 'ai_extraction'
        },

        // Wings/entrances count
        wings_count: {
          value: data.wings_count || null,
          confidence: data.wings_count ? 70 : 0,
          context: data.wings_count ? 'Found in document' : '',
          pattern: 'ai_extraction'
        },

        building_wing_number: {
          value: data.building_wing_number || null,
          confidence: data.building_wing_number ? 70 : 0,
          context: data.building_wing_number ? 'Found in document' : '',
          pattern: 'ai_extraction'
        },

        // Plot notes
        plot_notes: {
          value: data.plot_notes || null,
          confidence: (confidenceScores.notes || 0) * 100,
          context: extractionContexts.notes || '',
          pattern: 'ai_extraction'
        },

        plot_notes_action_type: {
          value: data.plot_notes_action_type || null,
          confidence: (confidenceScores.notes || 0) * 100,
          context: extractionContexts.notes || '',
          pattern: 'ai_extraction'
        },

        plot_notes_beneficiary: {
          value: data.plot_notes_beneficiary || null,
          confidence: (confidenceScores.notes || 0) * 100,
          context: extractionContexts.notes || '',
          pattern: 'ai_extraction'
        },

        // Sub-chelka notes
        sub_chelka_notes: {
          value: data.sub_chelka_notes || null,
          confidence: (confidenceScores.notes || 0) * 100,
          context: extractionContexts.notes || '',
          pattern: 'ai_extraction'
        },

        sub_chelka_notes_action_type: {
          value: data.sub_chelka_notes_action_type || null,
          confidence: (confidenceScores.notes || 0) * 100,
          context: extractionContexts.notes || '',
          pattern: 'ai_extraction'
        },

        sub_chelka_notes_beneficiary: {
          value: data.sub_chelka_notes_beneficiary || null,
          confidence: (confidenceScores.notes || 0) * 100,
          context: extractionContexts.notes || '',
          pattern: 'ai_extraction'
        },

        // Plot easements
        plot_easements_essence: {
          value: data.plot_easements_essence || null,
          confidence: (confidenceScores.easements || 0) * 100,
          context: extractionContexts.easements || '',
          pattern: 'ai_extraction'
        },

        plot_easements_description: {
          value: data.plot_easements_description || null,
          confidence: (confidenceScores.easements || 0) * 100,
          context: extractionContexts.easements || '',
          pattern: 'ai_extraction'
        },

        // Sub-chelka easements
        sub_chelka_easements_essence: {
          value: data.sub_chelka_easements_essence || null,
          confidence: (confidenceScores.easements || 0) * 100,
          context: extractionContexts.easements || '',
          pattern: 'ai_extraction'
        },

        sub_chelka_easements_description: {
          value: data.sub_chelka_easements_description || null,
          confidence: (confidenceScores.easements || 0) * 100,
          context: extractionContexts.easements || '',
          pattern: 'ai_extraction'
        },

        // Aliases for sub_parcel naming (DB compatibility)
        sub_parcel_easements_essence: {
          value: data.sub_chelka_easements_essence || null,
          confidence: (confidenceScores.easements || 0) * 100,
          context: extractionContexts.easements || '',
          pattern: 'ai_extraction'
        },

        sub_parcel_easements_description: {
          value: data.sub_chelka_easements_description || null,
          confidence: (confidenceScores.easements || 0) * 100,
          context: extractionContexts.easements || '',
          pattern: 'ai_extraction'
        },

        // Balcony area
        balcony_area: {
          value: data.balcony_area || null,
          confidence: (confidenceScores.unit_info || 0) * 100,
          context: extractionContexts.unit_info || '',
          pattern: 'ai_extraction'
        },

        // Regulation type
        regulation_type: {
          value: data.regulation_type || null,
          confidence: (confidenceScores.property_info || 0) * 100,
          context: extractionContexts.property_info || '',
          pattern: 'ai_extraction'
        },

        // Property counts
        sub_plots_count: {
          value: data.sub_plots_count || null,
          confidence: (confidenceScores.property_info || 0) * 100,
          context: extractionContexts.property_info || '',
          pattern: 'ai_extraction'
        },

        buildings_count: {
          value: data.buildings_count || null,
          confidence: (confidenceScores.property_info || 0) * 100,
          context: extractionContexts.property_info || '',
          pattern: 'ai_extraction'
        },

        total_plot_area: {
          value: data.total_plot_area || null,
          confidence: (confidenceScores.property_info || 0) * 100,
          context: extractionContexts.property_info || '',
          pattern: 'ai_extraction'
        },

        // Rights
        rights: {
          value: data.rights || null,
          confidence: (confidenceScores.ownership || 0) * 100,
          context: extractionContexts.ownership || '',
          pattern: 'ai_extraction'
        },

        // Mortgage date
        mortgage_date: {
          value: data.mortgage_date || null,
          confidence: (confidenceScores.mortgages || 0) * 100,
          context: extractionContexts.mortgages || '',
          pattern: 'ai_extraction'
        },

        // Attachments shared with
        attachments_shared_with: {
          value: data.attachments_shared_with || null,
          confidence: (confidenceScores.attachments || 0) * 100,
          context: extractionContexts.attachments || '',
          pattern: 'ai_extraction'
        },

        // Missing Tabu fields
        mortgage_lenders: {
          value: data.mortgage_lenders || null,
          confidence: (confidenceScores.mortgages || 0) * 100,
          context: extractionContexts.mortgages || '',
          pattern: 'ai_extraction'
        },

        mortgage_borrowers: {
          value: data.mortgage_borrowers || null,
          confidence: (confidenceScores.mortgages || 0) * 100,
          context: extractionContexts.mortgages || '',
          pattern: 'ai_extraction'
        },

        mortgage_essence: {
          value: data.mortgage_essence || null,
          confidence: (confidenceScores.mortgages || 0) * 100,
          context: extractionContexts.mortgages || '',
          pattern: 'ai_extraction'
        },

        mortgage_rank: {
          value: data.mortgage_rank || null,
          confidence: (confidenceScores.mortgages || 0) * 100,
          context: extractionContexts.mortgages || '',
          pattern: 'ai_extraction'
        },

        mortgage_amount: {
          value: data.mortgage_amount || null,
          confidence: (confidenceScores.mortgages || 0) * 100,
          context: extractionContexts.mortgages || '',
          pattern: 'ai_extraction'
        },

        mortgage_property_share: {
          value: data.mortgage_property_share || null,
          confidence: (confidenceScores.mortgages || 0) * 100,
          context: extractionContexts.mortgages || '',
          pattern: 'ai_extraction'
        },

        // Mortgages array
        mortgages: data.mortgages || [],

        issue_date: {
          value: data.issue_date || null,
          confidence: (confidenceScores.document_info || 0) * 100,
          context: extractionContexts.document_info || '',
          pattern: 'ai_extraction'
        },

        tabu_extract_date: {
          value: data.tabu_extract_date || null,
          confidence: (confidenceScores.document_info || 0) * 100,
          context: extractionContexts.document_info || '',
          pattern: 'ai_extraction'
        },

        unit_description: {
          value: data.unit_description || null,
          confidence: (confidenceScores.unit_info || 0) * 100,
          context: extractionContexts.unit_info || '',
          pattern: 'ai_extraction'
        },

        additional_areas: data.additional_areas || [],

        // Shared Building Order (צו בית משותף) fields
        shared_building_order_date: {
          value: data.shared_building_order_date || null,
          confidence: (confidenceScores.property_info || 0) * 100,
          context: extractionContexts.property_info || '',
          pattern: 'ai_extraction'
        },

        building_address: {
          value: data.building_address || null,
          confidence: (confidenceScores.property_info || 0) * 100,
          context: extractionContexts.property_info || '',
          pattern: 'ai_extraction'
        },

        floors_count_in_building: {
          value: data.floors_count_in_building || null,
          confidence: (confidenceScores.property_info || 0) * 100,
          context: extractionContexts.property_info || '',
          pattern: 'ai_extraction'
        },

        sub_plots_total_in_building: {
          value: data.sub_plots_total_in_building || null,
          confidence: (confidenceScores.property_info || 0) * 100,
          context: extractionContexts.property_info || '',
          pattern: 'ai_extraction'
        },

        sub_plot_floor: {
          value: data.sub_plot_floor || null,
          confidence: (confidenceScores.unit_info || 0) * 100,
          context: extractionContexts.unit_info || '',
          pattern: 'ai_extraction'
        },

        sub_plot_area: {
          value: data.sub_plot_area || null,
          confidence: (confidenceScores.unit_info || 0) * 100,
          context: extractionContexts.unit_info || '',
          pattern: 'ai_extraction'
        },

        sub_plot_description: {
          value: data.sub_plot_description || null,
          confidence: (confidenceScores.unit_info || 0) * 100,
          context: extractionContexts.unit_info || '',
          pattern: 'ai_extraction'
        },

        shared_property_parts: {
          value: data.shared_property_parts || null,
          confidence: (confidenceScores.property_info || 0) * 100,
          context: extractionContexts.property_info || '',
          pattern: 'ai_extraction'
        },

        non_attachment_areas: {
          value: data.non_attachment_areas || null,
          confidence: (confidenceScores.property_info || 0) * 100,
          context: extractionContexts.property_info || '',
          pattern: 'ai_extraction'
        },

        // Building Permits (היתרי בנייה) - repeating object array
        permits: data.permits || [],

        // New fields added for Step3 UI alignment
        building_units: {
          value: data.building_units || null,
          confidence: (confidenceScores.property_info || 0) * 100,
          context: extractionContexts.property_info || '',
          pattern: 'ai_extraction'
        },

        bylaws: {
          value: data.bylaws || null,
          confidence: (confidenceScores.property_info || 0) * 100,
          context: extractionContexts.property_info || '',
          pattern: 'ai_extraction'
        },

        general_notes: {
          value: data.general_notes || null,
          confidence: (confidenceScores.notes || 0) * 100,
          context: extractionContexts.notes || '',
          pattern: 'ai_extraction'
        },

        building_description: {
          value: data.building_description || null,
          confidence: (confidenceScores.property_info || 0) * 100,
          context: extractionContexts.property_info || '',
          pattern: 'ai_extraction'
        },

        air_directions: {
          value: data.air_directions || null,
          confidence: (confidenceScores.unit_info || 0) * 100,
          context: extractionContexts.unit_info || '',
          pattern: 'ai_extraction'
        },

        property_essence: {
          value: data.property_essence || null,
          confidence: (confidenceScores.property_info || 0) * 100,
          context: extractionContexts.property_info || '',
          pattern: 'ai_extraction'
        },

        finish_details: {
          value: data.finish_details || null,
          confidence: (confidenceScores.unit_info || 0) * 100,
          context: extractionContexts.unit_info || '',
          pattern: 'ai_extraction'
        },

        built_area: {
          value: data.built_area || null,
          confidence: (confidenceScores.unit_info || 0) * 100,
          context: extractionContexts.unit_info || '',
          pattern: 'ai_extraction'
        },

        shared_areas: {
          value: data.shared_areas || null,
          confidence: (confidenceScores.property_info || 0) * 100,
          context: extractionContexts.property_info || '',
          pattern: 'ai_extraction'
        },

        construction_year: {
          value: data.construction_year || null,
          confidence: (confidenceScores.property_info || 0) * 100,
          context: extractionContexts.property_info || '',
          pattern: 'ai_extraction'
        },

        property_condition: {
          value: data.property_condition || null,
          confidence: (confidenceScores.unit_info || 0) * 100,
          context: extractionContexts.unit_info || '',
          pattern: 'ai_extraction'
        },

        finish_standard: {
          value: data.finish_standard || null,
          confidence: (confidenceScores.unit_info || 0) * 100,
          context: extractionContexts.unit_info || '',
          pattern: 'ai_extraction'
        },

        // Field locations for scroll-to-source
        fieldLocations: locations,
        
        // Metadata
        overallConfidence: (confidenceScores.overall || 0) * 100,
        processingTime: Date.now() - startTime,
        method: 'gemini_3_pro_preview',
        model: this.model,
        rawResponse: text,
        rawExtractedData: data
      };

      return result;

    } catch (error) {
      console.error('Gemini land registry extraction failed:', error.message);
      console.error('Error stack:', error.stack);
      throw new Error(`Land registry AI extraction failed: ${error.message}`);
    }
  }

  /**
   * Estimate API cost based on token usage (placeholder - Gemini pricing may differ)
   * @param {number} tokens - Total tokens used
   * @returns {number} - Estimated cost in USD
   */
  estimateCost(tokens) {
    // Placeholder - adjust based on actual Gemini pricing
    return tokens * 0.000001; // Rough estimate
  }
}

module.exports = {
  LandRegistryGeminiExtractor
};
