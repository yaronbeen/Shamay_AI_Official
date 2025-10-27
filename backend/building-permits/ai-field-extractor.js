/**
 * AI-Powered Field Extractor using Anthropic Claude
 * Uses Claude Opus to extract Hebrew building permit fields with high accuracy
 */

import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

class BuildingPermitAIExtractor {
  constructor(apiKey) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY
    });
    
    this.model = 'claude-3-5-sonnet-20241022'; // User-specified model
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

CRITICAL RULES:
1. Extract ONLY data that is actually present in the document
2. Return ONLY Hebrew text - no English translations or fallbacks
3. If information is not found, return null - do NOT generate or guess data
4. Do NOT provide default values or placeholder text
5. All extracted text must be in Hebrew as it appears in the document

REQUIRED FIELDS:
- permit_number: Building permit number (מספר היתר בנייה) - return null if not found
- permit_date: Date of the building permit (תאריך היתר בנייה) - return null if not found
- permitted_description: What is permitted/allowed (מותר - תיאור מה מותר לבנות). Look for the detailed "מותר:" section that contains specific building specifications with exact measurements. CRITICAL: Copy the text EXACTLY as it appears in the document. Do not paraphrase, summarize, or rearrange. Copy word-for-word, maintaining the original punctuation, line breaks, and text structure. The text should start with "מותר:" and include the exact Hebrew text as written in the document. - return null if not found
- permit_issue_date: Date when permit was issued (תאריך הפקת היתר) - return null if not found
- local_committee_name: Name of local planning committee (שם הוועדה המקומית) - return null if not found

ADDITIONAL FIELDS (if found):
- property_address: Address of the property (כתובת הנכס) - return null if not found
- gush: Block number (גוש) - return null if not found
- chelka: Plot number (חלקה) - return null if not found
- sub_chelka: Sub-plot number (תת חלקה) - return null if not found

CONFIDENCE SCORES:
For each field, provide a confidence score from 0-1 based on text clarity and certainty.
Also provide context explaining where/how the information was found.

Hebrew terms to look for:
- היתר בנייה, רישיון בנייה
- מספר היתר, מס' היתר
- תאריך, מיום
- ועדה מקומית, ועדה מקומית לתכנון ובנייה
- מותר, רשאי (especially sections starting with "מותר:")
- תאריך הפקה, תאריך הוצאה
- גוש, חלקה, תת חלקה
- כתובת, רחוב
- בית מגורים משותף, בניין, קומות, יחידות דיור
- שטחי עזר, מגורים, מרפסות, הול כניסה
- הקמת בית מגורים משותף, בניין מס', ק.ק.ק, ח.טכני
- שטחי עזר (ח. אשפה גז מחסנים), מעליות וצנרת, ממיידים
- מגורים בשטח, מרפסות פתוחות, הול כניסה וח.מדרגות

IMPORTANT: Do NOT extract from "תנאים מיוחדים להיתר", "תיאור מה מותר", or general company information sections. Look for the detailed "מותר:" section that contains specific building specifications with exact measurements. 

CRITICAL: Copy the text EXACTLY as it appears in the document. The text should look like this format:
"מותר: הקמת בית מגורים משותף( בניין מס' 11) בן 7 ק. ק.ק. +ח.טכני על הגג סה"כ 26 יח"ד המכיל :
שטחי עזר (ח. אשפה גז מחסנים, 183.46 מ"ר; מעליות וצנרת 12.79 מ"ר; ממ"דים 312.0 מ"ר;
מגורים בשטח 2735.33 מ"ר; מרפסות פתוחות 486.02 מ"ר; הול כניסה וח.מדרגות 596.67 מ"ר;
ח. מכונות על הגג בשטח 18.44 מ"ר בריכת מים; ק.ע. מפולשת 30.27 מ"ר;
אנטנה מערכת סולרית גדרות ופתוח ;הכל בהתאם לתכנית."

Do not rearrange, summarize, or paraphrase. Copy word-for-word.

Return ONLY the JSON object with this structure:
{
  "permit_number": "string or null",
  "permit_date": "YYYY-MM-DD or original format", 
  "permitted_description": "text description or null",
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
    "permit_issue_date": 0.0-1.0,
    "local_committee_name": 0.0-1.0,
    "overall": 0.0-1.0
  },
  "extraction_contexts": {
    "permit_number": "context explanation",
    "permit_date": "context explanation",
    "permitted_description": "context explanation",
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
              text: "Extract structured data from this Hebrew building permit document (היתר בנייה מילולי).\n\nCRITICAL RULES:\n1. Extract ONLY data that is actually present in the document\n2. Return ONLY Hebrew text - no English translations\n3. If information is not found, return null - do NOT generate or guess data\n4. Do NOT provide default values or placeholder text\n\nFocus on finding the Hebrew text and extracting the required fields."
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

CRITICAL RULES:
1. Extract ONLY data that is actually present in the document
2. Return ONLY Hebrew text - no English translations
3. If information is not found, return null - do NOT generate or guess data
4. Do NOT provide default values or placeholder text

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

export {
  BuildingPermitAIExtractor
};