/**
 * AI-Powered Field Extractor using Anthropic Claude
 * Uses Claude Opus to extract Hebrew land registry fields with high accuracy
 */

import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

class LandRegistryAIExtractor {
  constructor(apiKey) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY
    });
    
    this.model = 'claude-opus-4-1-20250805'; // User-specified model
  }

  /**
   * Extract all fields using Anthropic with structured output
   * @param {string|Buffer} input - Either markdown text or PDF file path/buffer
   * @param {Object} options - Options including isPdf flag
   * @returns {Promise<Object>} - Structured extraction results
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
- total_plot_area: Total plot area (שטח קרקע כולל)
- regulation_type: Regulation type - מוסכם/לא מוסכם/מצוי
- sub_plots_count: Number of sub-plots (מספר תתי חלקות)
- buildings_count: Number of buildings (מספר מבנים)
- address_from_tabu: Address from tabu document (כתובת מהנסח)

UNIT/APARTMENT INFORMATION:
- unit_description: Unit description (תיאור הדירה - דירה/חנות/משרד)
- floor: Floor description (קומה)
- registered_area: Registered area (שטח רשום)
- apartment_registered_area: Apartment registered area (שטח דירה רשום)
- balcony_area: Balcony area (שטח מרפסת)
- shared_property: Shared property fraction (רכוש משותף - חלק)
- building_number: Building number (מספר מבנה)
- additional_areas: Additional areas array (שטחים נוספים)

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

NOTES AND COMMENTS (הערות):
- plot_notes: Notes for the entire plot (הערות לכל החלקה)
- notes_action_type: Action type in notes (מהות פעולה)
- notes_beneficiary: Beneficiary in notes (שם המוטב)

EASEMENTS (זיקות הנאה):
- easements_essence: Easement essence (זיקות הנאה - מהות)
- easements_description: Easement description (זיקות הנאה - תיאור)

MORTGAGES (משכנתאות):
- mortgages: Complete mortgages array
- mortgage_essence: Primary mortgage essence (משכנתא - מהות)
- mortgage_rank: Primary mortgage rank (משכנתא - דרגה)
- mortgage_lenders: Primary mortgage lenders (בעלי המשכנתא)
- mortgage_borrowers: Primary mortgage borrowers (שם הלווים)
- mortgage_amount: Primary mortgage amount (סכום משכנתא)
- mortgage_property_share: Property share in mortgage (חלק בנכס)

CONFIDENCE SCORES:
For each field, provide a confidence score from 0-1 based on text clarity and certainty.
Also provide context explaining where/how the information was found.

Hebrew terms to look for:
- לשכת רישום מקרקעין, לשכת רישום
- תאריך הפקה, תאריך נסח
- גוש, גו"ח
- חלקה
- תת חלקה, תת-חלקה
- שטח קרקע, שטח כולל
- מוסכם, לא מוסכם, מצוי
- תתי חלקות
- מבנים, מבנה
- כתובת, רחוב
- דירה, חנות, משרד, יחידה
- קומה, קומת, קרקע, מרתף
- שטח רשום, שטח דירה
- שטח מרפסת
- רכוש משותף, זכויות
- מספר מבנה, בניין
- הצמדות, צמודות
- חניה, מרפסת, מחסן, גינה
- סימן בתשריט, צבע בתשריט
- בעלים, בעל/ת, שותפים
- בעלות, חלק, שיתוף
- זכויות
- הערות
- מהות פעולה
- שם המוטב
- זיקות הנאה
- משכנתא, משכנתאות
- דרגה ראשונה, שנייה
- בנק, קרן, מלווה
- לווה, שם הלווים
- סכום, שווי
- חלק בנכס

Return ONLY the JSON object with this structure:
{
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
  "address_from_tabu": "address or null",
  "unit_description": "description or null",
  "floor": "floor or null",
  "registered_area": number or null,
  "apartment_registered_area": number or null,
  "balcony_area": number or null,
  "shared_property": "fraction or null",
  "building_number": "number or null",
  "additional_areas": [{"type": "type", "area": number}],
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
  "notes_action_type": "action or null",
  "notes_beneficiary": "beneficiary or null",
  "easements_essence": "essence or null",
  "easements_description": "description or null",
  "mortgages": [{"essence": "type", "rank": "rank", "lenders": "lenders", "borrowers": "borrowers", "amount": number, "share": "share"}],
  "mortgage_essence": "primary essence or null",
  "mortgage_rank": "primary rank or null",
  "mortgage_lenders": "primary lenders or null",
  "mortgage_borrowers": "primary borrowers or null",
  "mortgage_amount": number or null,
  "mortgage_property_share": "primary share or null",
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
              text: "Extract structured data from this Hebrew land registry document (נסח טאבו). Focus on finding the Hebrew text and extracting the required fields."
            }
          ]
        }
      ];
    } else {
      // Handle text input (existing functionality)
      messages = [
        {
          role: "user",
          content: `Extract structured data from this Hebrew land registry document:

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
        gush: {
          value: extractedData.gush || null,
          confidence: (extractedData.confidence_scores?.gush || 0) * 100,
          context: extractedData.extraction_contexts?.gush || '',
          pattern: 'ai_extraction'
        },
        
        chelka: {
          value: extractedData.chelka || null,
          confidence: (extractedData.confidence_scores?.chelka || 0) * 100,
          context: extractedData.extraction_contexts?.chelka || '',
          pattern: 'ai_extraction'
        },
        
        sub_chelka: {
          value: extractedData.sub_chelka || null,
          confidence: (extractedData.confidence_scores?.sub_chelka || 0) * 100,
          context: extractedData.extraction_contexts?.sub_chelka || '',
          pattern: 'ai_extraction'
        },
        
        apartment_area: {
          value: extractedData.apartment_area || null,
          confidence: (extractedData.confidence_scores?.apartment_area || 0) * 100,
          context: extractedData.extraction_contexts?.apartment_area || '',
          pattern: 'ai_extraction'
        },
        
        attachments: extractedData.attachments || [],
        
        owners: extractedData.owners || [],
        
        // Additional fields
        property_address: {
          value: extractedData.property_address || null,
          confidence: extractedData.property_address ? 70 : 0,
          context: extractedData.property_address ? 'Found in document' : '',
          pattern: 'ai_extraction'
        },
        
        floor: {
          value: extractedData.floor || null,
          confidence: extractedData.floor ? 70 : 0,
          context: extractedData.floor ? 'Found in document' : '',
          pattern: 'ai_extraction'
        },
        
        building_number: {
          value: extractedData.building_number || null,
          confidence: extractedData.building_number ? 70 : 0,
          context: extractedData.building_number ? 'Found in document' : '',
          pattern: 'ai_extraction'
        },
        
        // Metadata
        overallConfidence: (extractedData.confidence_scores?.overall || 0) * 100,
        processingTime: Date.now() - startTime,
        method: 'anthropic_claude_opus',
        model: this.model,
        tokensUsed: message.usage.total_tokens,
        cost: this.estimateCost(message.usage.total_tokens),
        rawResponse: content,
        rawExtractedData: extractedData
      };

      return result;

    } catch (error) {
      console.error('Anthropic land registry extraction failed:', error.message);
      throw new Error(`Land registry AI extraction failed: ${error.message}`);
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
      gush: 'Extract the block number (גוש) from this document',
      chelka: 'Extract the plot number (חלקה) from this document',
      sub_chelka: 'Extract the sub-plot number (תת חלקה) from this document',
      apartment_area: 'Extract the apartment area in square meters (שטח דירה במ"ר)',
      attachments: 'Extract all attachments like parking, balcony, storage (הצמדות)'
    };

    const prompt = `Extract ONLY the ${fieldName} from this Hebrew land registry document:

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
   * @param {number} tokens - Total tokens used
   * @returns {number} - Estimated cost in USD
   */
  estimateCost(tokens) {
    // Claude Opus pricing: $15 per 1M input tokens, $75 per 1M output tokens
    // Rough estimate assuming 70% input, 30% output
    const inputTokens = Math.floor(tokens * 0.7);
    const outputTokens = Math.floor(tokens * 0.3);
    
    return ((inputTokens * 15) + (outputTokens * 75)) / 1000000;
  }
}

export {
  LandRegistryAIExtractor
};