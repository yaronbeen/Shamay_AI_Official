/**
 * AI-Powered Field Extractor using Google Gemini
 * Uses Gemini 3 Pro Preview to extract Hebrew building permit fields with high accuracy
 * Includes field location tracking for scroll-to-source functionality
 */

const { GoogleGenAI } = require('@google/genai');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config();

class BuildingPermitGeminiExtractor {
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

    const systemPrompt = `You are an expert at extracting data from Hebrew building permit documents (היתר בנייה מילולי).

Extract the following information with high accuracy and return ONLY valid JSON:

CRITICAL EXTRACTION RULES:

1. PERMIT DATE (permit_date) - VERY IMPORTANT:
   - ALWAYS look for "מועד קביעת ההיתר" at the BOTTOM of the document
   - IGNORE any other dates in the document (headers, middle sections, application dates)
   - This is the FINAL determination date, usually with an official stamp
   - Look for exact phrases: "מועד קביעת ההיתר", "מועד קביעה", "נקבע ביום", "תאריך נתינת היתר"
   - Must be in the signature/stamp area at the bottom of the last page
   - If "מועד קביעת ההיתר" is not found, return null rather than guessing

2. LOCAL COMMITTEE NAME (local_committee_name) - CRITICAL RULES:
   - ABSOLUTE REQUIREMENT: MUST include specific city name
   - Generic "הועדה המקומית לתכנון ובנייה" WITHOUT city name = INVALID = return null
   - If you CANNOT find the city name with 100% certainty, return null with confidence 0
   - REQUIRED format: "הועדה המקומית לתכנון ובנייה [EXACT_CITY_NAME]"
   - Search locations in this order:
     1. Official stamp/seal area at bottom (primary location)
     2. Signature area and around stamps
     3. Document letterhead at top
     4. Any municipal logos or emblems
     5. Address fields or contact information
     6. Throughout the document text
   - Look for city names like: אשקלון, נתניה, גבעתיים, תל אביב, ירושלים, חיפה, באר שבע
   - VALIDATION: If committee name does not contain a specific city, return null instead
   - Better to return null than generic name without city

3. PERMITTED DESCRIPTION (permitted_description) - ABSOLUTE STRICTNESS REQUIRED:
   - Extract ONLY if you find EXPLICIT section starting with: "מותר:", "רשאי:", "מאושר:", "מורשה:"
   - CRITICAL: Do NOT extract from:
     * תנאים מיוחדים (special conditions)
     * כתובות או גוש/חלקה (addresses or plot numbers)
     * תכנית מתאר (master plan references)
     * כללי instructions or conditions
     * תיאור הנכס (property descriptions)
   - ONLY extract text that explicitly says what construction is PERMITTED
   - If section does NOT start with "מותר:" or "רשאי:", return null with confidence 0
   - Better to return null than extract wrong content
   - DO NOT make up, summarize, or invent any content
   - If unsure or cannot find clear "מותר:" section, return null

REQUIRED FIELDS:
- permit_number: Building permit number (מספר היתר בנייה)
- permit_date: Date from "מועד קביעת ההיתר" ONLY (bottom of document)
- permitted_description: EXACT Hebrew text of what is permitted (מותר) - from dedicated "מותר:" sections ONLY
- building_description: Complete description of the building/construction from any part of document (תיאור הבניין/עבודות)
- permit_issue_date: Date when permit was issued (תאריך הפקת היתר)
- local_committee_name: Committee name from permit stamp area ONLY

ADDITIONAL FIELDS (if found):
- property_address: Address of the property (כתובת הנכס)
- gush: Block number (גוש)
- chelka: Plot number (חלקה)
- sub_chelka: Sub-plot number (תת חלקה)

FIELD LOCATIONS:
For EACH field you extract, also provide its location in the document:
- page: page number (1, 2, 3...)
- y_percent: vertical position (0 = top of page, 100 = bottom of page)

IMPORTANT DISTINCTION:
- permitted_description: STRICT - only from "מותר:" sections
- building_description: FLEXIBLE - can come from any section describing the construction work, including detailed descriptions of floors, areas, units, etc.

BUILDING DESCRIPTION EXTRACTION GUIDANCE:
- This field is FLEXIBLE and can come from multiple sections in the document
- Look for detailed descriptions that include:
  * Number of floors ("קומות", "מפלסים") - e.g., "בן 7 קומות", "7 ק.+ק.+ק.נוספת"
  * Number of units ("יחידות דיור", "דירות") - e.g., "סה\"כ 28 יח\"ד", "55 דירות"
  * Areas breakdown:
    - "שטחי עזר" (auxiliary areas)
    - "ממ\"דים" (shelters)
    - "מגורים" (residential areas)
    - "מרפסות פתוחות" (open balconies)
    - "הול כניסה וח. מדרגות" (entrance hall and stairwell)
    - "ח. מכונות" (machine room)
    - "בריכת מים" (water pool)
    - "ק.ע. מפולשת" (pierced ground floor)
  * Building features:
    - "מעליות" (elevators)
    - "אנטנה" (antenna)
    - "מערכת סולרית" (solar system)
    - "גדרות ופתוח" (fences and development)
- Can appear in:
  * The "תיאור הבניין" or "תיאור העבודות" section
  * The detailed permit conditions
  * The building specifications table
  * The "הפכיל" (details) section
- Extract the COMPLETE description, including all details and specifications
- If multiple sections exist with building details, combine them into one comprehensive description
- Include all numeric values (areas, counts) as they appear in the document
- Preserve Hebrew formatting and terminology exactly as written

PROPERTY IDENTIFIERS (gush/chelka) EXTRACTION:
- Look for "גוש", "חלקה", "תת חלקה" in:
  * Document header/title section (most reliable)
  * Property address section
  * Plot identification table (if exists)
- Extract numeric values only (e.g., gush: 9905, chelka: 30, sub_chelka: null or number)
- Format: Usually appears as "גוש: 9905 חלקה: 30" or in a table format
- If found in multiple places, prioritize the one from the header/title section
- If not found, return null (do NOT guess)

CONFIDENCE SCORES:
For each field, provide a confidence score from 0-1 based on text clarity and certainty.
Also provide context explaining where/how the information was found.

Hebrew search terms:
- היתר בנייה, רישיון בנייה
- מספר היתר, מס' היתר
- מועד קביעת ההיתר, מועד קביעה, נקבע ביום, תאריך נתינת היתר
- ועדה מקומית + [עיר], הועדה המקומית לתכנון ובנייה + [מיקום]
- מותר, רשאי, מאושר, מורשה, תיאור מה מותר לבנות
- עיר, עירייה, רשות מקומית, מועצה מקומית
- אשקלון, נתניה, גבעתיים, תל אביב, ירושלים, חיפה, באר שבע
- גוש, חלקה, תת חלקה
- כתובת, רחוב

CRITICAL EXTRACTION LOCATION GUIDANCE:
- permit_date: ONLY from BOTTOM of LAST PAGE near official stamps - look for "מועד קביעת ההיתר"
- local_committee_name: Search ENTIRE document for city name - check stamps, letterheads, addresses, text
- permitted_description: ONLY from dedicated "מותר:" sections - not addresses or general descriptions
- permit_number: Usually at top or in document header
- permit_issue_date: Date of document creation/issuance (different from determination date)

VALIDATION RULES:
- If permit_date does not come from "מועד קביעת ההיתר" area, return null
- Committee name: MUST include specific city name - search entire document if needed
- If description is not from a "מותר:" section, return null

SEARCH STRATEGY FOR COMMITTEE:
- If initial search finds generic name, expand search to entire document
- Look for any city name mentioned anywhere in the document
- Common city patterns: [עיר] + municipality, addresses with city names
- Stamp areas may have abbreviated city names or municipal symbols

Return ONLY the JSON object with this structure:
{
  "data": {
    "permit_number": "string or null",
    "permit_date": "YYYY-MM-DD or original format", 
    "permitted_description": "text description or null (strict - only from מותר: sections)",
    "building_description": "complete building description or null (flexible - from any part)",
    "permit_issue_date": "YYYY-MM-DD or original format",
    "local_committee_name": "committee name or null",
    "property_address": "address or null",
    "gush": number or null,
    "chelka": number or null,
    "sub_chelka": number or null
  },
  "locations": {
    "permit_number": {"page": 1, "y_percent": 5},
    "permit_date": {"page": 3, "y_percent": 90},
    "local_committee_name": {"page": 3, "y_percent": 85},
    ...
  },
  "confidence_scores": {
    "permit_number": 0.0-1.0,
    "permit_date": 0.0-1.0,
    "permitted_description": 0.0-1.0,
    "building_description": 0.0-1.0,
    "permit_issue_date": 0.0-1.0,
    "local_committee_name": 0.0-1.0,
    "overall": 0.0-1.0
  },
  "extraction_contexts": {
    "permit_number": "context explanation",
    "permit_date": "context explanation",
    "permitted_description": "context explanation",
    "building_description": "context explanation",
    "permit_issue_date": "context explanation",
    "local_committee_name": "context explanation"
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
          text: `Extract structured data from this Hebrew building permit document (היתר בנייה מילולי).

CRITICAL EXTRACTION RULES:
1. PERMIT DATE: Look ONLY at BOTTOM of document for 'מועד קביעת ההיתר' - ignore other dates
2. COMMITTEE NAME: MUST include specific city name - search entire document if needed
3. PERMITTED DESCRIPTION: ONLY from sections starting with 'מותר:' - not addresses or conditions
4. BUILDING DESCRIPTION: Extract COMPLETE description from all relevant sections - combine details from multiple sections if needed
5. PROPERTY IDENTIFIERS: Extract gush/chelka from header/title section - prioritize header over other locations
6. If any field cannot be found with 100% certainty, return null
7. Return ONLY Hebrew text - no English translations
8. Do NOT generate or guess any data

Focus on finding the Hebrew text and extracting the required fields with strict validation.

For each field, also provide its location (page number and y_percent).`
        }
      ];
    } else {
      // Handle text input
      contents = [
        { text: systemPrompt },
        {
          text: `Extract structured data from this Hebrew building permit document:

CRITICAL EXTRACTION RULES:
1. PERMIT DATE: Look ONLY at BOTTOM of document for 'מועד קביעת ההיתר' - ignore other dates
2. COMMITTEE NAME: MUST include specific city name - search entire document if needed
3. PERMITTED DESCRIPTION: ONLY from sections starting with 'מותר:' - not addresses or conditions
4. If any field cannot be found with 100% certainty, return null
5. Return ONLY Hebrew text - no English translations
6. Do NOT generate or guess any data

${input}`
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
        permit_number: {
          value: data.permit_number || null,
          confidence: (confidenceScores.permit_number || 0) * 100,
          context: extractionContexts.permit_number || '',
          pattern: 'ai_extraction'
        },
        
        permit_date: {
          value: data.permit_date || null,
          confidence: (confidenceScores.permit_date || 0) * 100,
          context: extractionContexts.permit_date || '',
          pattern: 'ai_extraction'
        },
        
        permitted_description: {
          value: data.permitted_description || null,
          confidence: (confidenceScores.permitted_description || 0) * 100,
          context: extractionContexts.permitted_description || '',
          pattern: 'ai_extraction'
        },
        
        building_description: {
          value: data.building_description || null,
          confidence: (confidenceScores.building_description || 0) * 100,
          context: extractionContexts.building_description || '',
          pattern: 'ai_extraction'
        },
        
        permit_issue_date: {
          value: data.permit_issue_date || null,
          confidence: (confidenceScores.permit_issue_date || 0) * 100,
          context: extractionContexts.permit_issue_date || '',
          pattern: 'ai_extraction'
        },
        
        local_committee_name: {
          value: data.local_committee_name || null,
          confidence: (confidenceScores.local_committee_name || 0) * 100,
          context: extractionContexts.local_committee_name || '',
          pattern: 'ai_extraction'
        },
        
        // Additional fields
        property_address: {
          value: data.property_address || null,
          confidence: data.property_address ? 70 : 0,
          context: data.property_address ? 'Found in document' : '',
          pattern: 'ai_extraction'
        },
        
        gush: {
          value: data.gush || null,
          confidence: data.gush ? 80 : 0,
          context: data.gush ? 'Found in document' : '',
          pattern: 'ai_extraction'
        },
        
        chelka: {
          value: data.chelka || null,
          confidence: data.chelka ? 80 : 0,
          context: data.chelka ? 'Found in document' : '',
          pattern: 'ai_extraction'
        },
        
        sub_chelka: {
          value: data.sub_chelka || null,
          confidence: data.sub_chelka ? 80 : 0,
          context: data.sub_chelka ? 'Found in document' : '',
          pattern: 'ai_extraction'
        },
        
        // Field locations for scroll-to-source
        fieldLocations: locations,
        
        // Metadata
        overallConfidence: (confidenceScores.overall || 0) * 100,
        processingTime: Date.now() - startTime,
        method: 'gemini_3_pro_preview',
        model: this.model,
        rawResponse: text
      };

      return result;

    } catch (error) {
      console.error('Gemini building permit extraction failed:', error.message);
      throw new Error(`Building permit AI extraction failed: ${error.message}`);
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
  BuildingPermitGeminiExtractor
};

