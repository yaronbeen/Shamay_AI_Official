/**
 * AI-Powered Field Extractor using Anthropic Claude
 * Uses Claude Opus to extract Hebrew building permit fields with high accuracy
 */

const Anthropic = require('@anthropic-ai/sdk');
const dotenv = require('dotenv');

dotenv.config();

class BuildingPermitAIExtractor {
  constructor(apiKey) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY
    });
    
    this.model = 'claude-3-5-sonnet-20241022'; // Updated model
  }

  /**
   * Extract all fields using Anthropic with structured output
   * @param {string|Buffer} input - Either markdown text or PDF file path/buffer
   * @param {Object} options - Options including isPdf flag
   * @returns {Promise<Object>} - Structured extraction results
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

IMPORTANT DISTINCTION:
- permitted_description: STRICT - only from "מותר:" sections
- building_description: FLEXIBLE - can come from any section describing the construction work, including detailed descriptions of floors, areas, units, etc.

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
  "permit_number": "string or null",
  "permit_date": "YYYY-MM-DD or original format", 
  "permitted_description": "text description or null (strict - only from מותר: sections)",
  "building_description": "complete building description or null (flexible - from any part)",
  "permit_issue_date": "YYYY-MM-DD or original format",
  "local_committee_name": "committee name or null",
  "property_address": "address or null",
  "gush": number or null,
  "chelka": number or null,
  "sub_chelka": number or null,
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

    let messages = [];
    
    if (options.isPdf && typeof input === 'string') {
      // Read PDF file as base64 for direct processing
      const fs = await import('fs');
      const pdfBuffer = fs.default.readFileSync(input);
      const base64Pdf = pdfBuffer.toString('base64');
      
      messages = [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf", 
                data: base64Pdf
              }
            },
            {
              type: "text",
              text: "Extract structured data from this Hebrew building permit document (היתר בנייה מילולי).\n\nCRITICAL EXTRACTION RULES:\n1. PERMIT DATE: Look ONLY at BOTTOM of document for 'מועד קביעת ההיתר' - ignore other dates\n2. COMMITTEE NAME: MUST include specific city name - search entire document if needed\n3. PERMITTED DESCRIPTION: ONLY from sections starting with 'מותר:' - not addresses or conditions\n4. If any field cannot be found with 100% certainty, return null\n5. Return ONLY Hebrew text - no English translations\n6. Do NOT generate or guess any data\n\nFocus on finding the Hebrew text and extracting the required fields with strict validation."
            }
          ]
        }
      ];
    } else {
      // Handle text input (existing functionality)
      messages = [
        {
          role: "user",
          content: `Extract structured data from this Hebrew building permit document:

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
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 4000,
        temperature: 0,
        system: systemPrompt,
        messages: messages
      });

      console.log('Raw API response:', JSON.stringify(message, null, 2));
      
      const content = message.content[0]?.text || JSON.stringify(message.content[0]);
      console.log('Extracted content:', content);
      
      // Parse the JSON response
      let extractedData;
      try {
        extractedData = JSON.parse(content);
      } catch (parseError) {
        console.log('JSON parse error:', parseError.message);
        // Try to extract JSON from response if wrapped in text
        if (typeof content === 'string' && content.includes('{')) {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            console.log('Found JSON match:', jsonMatch[0]);
            extractedData = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('No valid JSON found in response');
          }
        } else {
          // Handle non-string content or content without JSON
          console.error('Unexpected response format:', content);
          throw new Error('Unexpected response format from Anthropic API');
        }
      }

      // Structure the result to match field parser format
      const result = {
        permit_number: {
          value: extractedData.permit_number || null,
          confidence: (extractedData.confidence_scores?.permit_number || 0) * 100,
          context: extractedData.extraction_contexts?.permit_number || '',
          pattern: 'ai_extraction'
        },
        
        permit_date: {
          value: extractedData.permit_date || null,
          confidence: (extractedData.confidence_scores?.permit_date || 0) * 100,
          context: extractedData.extraction_contexts?.permit_date || '',
          pattern: 'ai_extraction'
        },
        
        permitted_description: {
          value: extractedData.permitted_description || null,
          confidence: (extractedData.confidence_scores?.permitted_description || 0) * 100,
          context: extractedData.extraction_contexts?.permitted_description || '',
          pattern: 'ai_extraction'
        },
        
        building_description: {
          value: extractedData.building_description || null,
          confidence: (extractedData.confidence_scores?.building_description || 0) * 100,
          context: extractedData.extraction_contexts?.building_description || '',
          pattern: 'ai_extraction'
        },
        
        permit_issue_date: {
          value: extractedData.permit_issue_date || null,
          confidence: (extractedData.confidence_scores?.permit_issue_date || 0) * 100,
          context: extractedData.extraction_contexts?.permit_issue_date || '',
          pattern: 'ai_extraction'
        },
        
        local_committee_name: {
          value: extractedData.local_committee_name || null,
          confidence: (extractedData.confidence_scores?.local_committee_name || 0) * 100,
          context: extractedData.extraction_contexts?.local_committee_name || '',
          pattern: 'ai_extraction'
        },
        
        // Additional fields
        property_address: {
          value: extractedData.property_address || null,
          confidence: extractedData.property_address ? 70 : 0,
          context: extractedData.property_address ? 'Found in document' : '',
          pattern: 'ai_extraction'
        },
        
        gush: {
          value: extractedData.gush || null,
          confidence: extractedData.gush ? 80 : 0,
          context: extractedData.gush ? 'Found in document' : '',
          pattern: 'ai_extraction'
        },
        
        chelka: {
          value: extractedData.chelka || null,
          confidence: extractedData.chelka ? 80 : 0,
          context: extractedData.chelka ? 'Found in document' : '',
          pattern: 'ai_extraction'
        },
        
        sub_chelka: {
          value: extractedData.sub_chelka || null,
          confidence: extractedData.sub_chelka ? 80 : 0,
          context: extractedData.sub_chelka ? 'Found in document' : '',
          pattern: 'ai_extraction'
        },
        
        // Metadata
        overallConfidence: (extractedData.confidence_scores?.overall || 0) * 100,
        processingTime: Date.now() - startTime,
        method: 'anthropic_claude_opus',
        model: this.model,
        tokensUsed: (message.usage?.input_tokens || 0) + (message.usage?.output_tokens || 0),
        cost: this.estimateCost(message.usage?.input_tokens || 0, message.usage?.output_tokens || 0),
        rawResponse: content
      };

      return result;

    } catch (error) {
      console.error('Anthropic building permit extraction failed:', error.message);
      throw new Error(`Building permit AI extraction failed: ${error.message}`);
    }
  }

  /**
   * Extract a specific field with focused prompting
   * @param {string} markdownText - Document text
   * @param {string} fieldName - Specific field to extract
   * @returns {Promise<Object>} - Field extraction result
   */
  async extractSpecificField(markdownText, fieldName) {
    const fieldPrompts = {
      permit_number: 'Extract the building permit number (מספר היתר בנייה) from this document',
      permit_date: 'Extract the building permit date (תאריך היתר בנייה) when permit is valid',
      permitted_description: 'Extract what is permitted/allowed (מותר) to be built according to this permit',
      permit_issue_date: 'Extract the permit issue date (תאריך הפקת היתר) when the permit was issued',
      local_committee_name: 'Extract the local planning committee name (שם הוועדה המקומית)'
    };

    const prompt = `Extract ONLY the ${fieldName} from this Hebrew building permit document:

${markdownText}

Task: ${fieldPrompts[fieldName]}

Return JSON format:
{
  "${fieldName}": {
    "value": extracted_value,
    "confidence": confidence_score_0_to_1,
    "context": "exact_text_where_found"
  }
}`;

    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 1500,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      });

      const content = message.content[0].text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (error) {
      throw new Error(`Failed to extract ${fieldName}: ${error.message}`);
    }
  }

  /**
   * Estimate API cost based on token usage
   * @param {number} inputTokens - Input tokens used
   * @param {number} outputTokens - Output tokens used
   * @returns {number} - Estimated cost in USD
   */
  estimateCost(inputTokens = 0, outputTokens = 0) {
    // Claude Opus pricing: $15 per 1M input tokens, $75 per 1M output tokens
    return ((inputTokens * 15) + (outputTokens * 75)) / 1000000;
  }
}

module.exports = {
  BuildingPermitAIExtractor
};