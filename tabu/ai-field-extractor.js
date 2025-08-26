/**
 * AI-Powered Field Extractor using OpenAI
 * Uses GPT to extract Hebrew land registry fields with high accuracy
 */

const OpenAI = require('openai');

class AIFieldExtractor {
  constructor(apiKey) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY
    });
    
    this.model = 'gpt-4o-mini'; // Cost-effective model good for extraction tasks
  }

  /**
   * Extract all fields using OpenAI with structured output
   * @param {string} markdownText - The converted markdown text
   * @returns {Promise<Object>} - Structured extraction results
   */
  async extractAllFields(markdownText) {
    const startTime = Date.now();

    const prompt = `
You are an expert in Hebrew land registry (Tabu) document analysis. Extract the following fields from this Hebrew document text with high precision.

DOCUMENT TEXT:
${markdownText}

Please extract the following information and return it as JSON:

{
  "gush": {
    "value": number,
    "confidence": number (0-100),
    "context": "text where found"
  },
  "chelka": {
    "value": number, 
    "confidence": number (0-100),
    "context": "text where found"
  },
  "subChelka": {
    "value": number,
    "confidence": number (0-100), 
    "context": "text where found"
  },
  "apartmentArea": {
    "value": number,
    "confidence": number (0-100),
    "context": "text where found"
  },
  "owners": {
    "value": [
      {
        "hebrewName": "string",
        "englishName": "string", 
        "idNumber": "string",
        "ownershipShare": "string like 1/2"
      }
    ],
    "confidence": number (0-100),
    "context": "text where found",
    "count": number
  },
  "attachments": {
    "value": [
      {
        "type": "parking|balcony|storage",
        "description": "Hebrew description",
        "area": number,
        "count": number
      }
    ],
    "confidence": number (0-100),
    "context": "text where found"
  }
}

FIELD DEFINITIONS:
- gush (גוש): Block number, usually 4-5 digits
- chelka (חלקה): Plot number, usually 1-3 digits  
- subChelka (תת חלקה): Sub-plot number, usually 1-2 digits
- apartmentArea: Apartment area in square meters (not building area)
- owners: Property owners with names, IDs, and ownership shares
- attachments: Additional areas like parking (חניה), balconies (מרפסת)

IMPORTANT NOTES:
- Text is in Hebrew and may be RTL (right-to-left)
- Look for patterns like "9905 :גוש" or "88 :חלקה" 
- Apartment area is typically smaller than building area
- Return null for any field not found
- Confidence should reflect certainty of extraction
- Context should show the exact text where you found the value

Return only valid JSON, no additional text.`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a Hebrew document analysis expert. Return only valid JSON with extracted data.'
          },
          {
            role: 'user', 
            content: prompt
          }
        ],
        temperature: 0.1, // Low temperature for consistent extraction
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      });

      const extractedData = JSON.parse(response.choices[0].message.content);
      
      // Calculate overall confidence
      const confidenceScores = [
        extractedData.gush?.confidence || 0,
        extractedData.chelka?.confidence || 0, 
        extractedData.subChelka?.confidence || 0,
        extractedData.apartmentArea?.confidence || 0,
        extractedData.owners?.confidence || 0,
        extractedData.attachments?.confidence || 0
      ].filter(c => c > 0);
      
      const overallConfidence = confidenceScores.length > 0 
        ? confidenceScores.reduce((sum, c) => sum + c, 0) / confidenceScores.length 
        : 0;

      return {
        ...extractedData,
        overallConfidence,
        processingTime: Date.now() - startTime,
        method: 'openai-gpt4',
        tokensUsed: response.usage.total_tokens,
        cost: this.estimateCost(response.usage.total_tokens)
      };

    } catch (error) {
      console.error('OpenAI extraction failed:', error.message);
      throw new Error(`AI field extraction failed: ${error.message}`);
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
      gush: 'Extract the Gush (גוש) number - the block number, typically 4-5 digits',
      chelka: 'Extract the Chelka (חלקה) number - the plot number, typically 1-3 digits',
      subChelka: 'Extract the Sub-Chelka (תת חלקה) number - the sub-plot number, typically 1-2 digits',
      apartmentArea: 'Extract the apartment area in square meters (not the building area)',
      owners: 'Extract all property owners with their Hebrew names, ID numbers, and ownership shares',
      attachments: 'Extract additional property features like parking (חניה), balconies (מרפסת), storage'
    };

    const prompt = `
Extract ONLY the ${fieldName} from this Hebrew land registry document:

${markdownText}

Task: ${fieldPrompts[fieldName]}

Return JSON format:
{
  "${fieldName}": {
    "value": extracted_value,
    "confidence": confidence_score_0_to_100,
    "context": "exact_text_where_found"
  }
}`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      });

      return JSON.parse(response.choices[0].message.content);
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
    // GPT-4o-mini pricing: $0.15 per 1M input tokens, $0.075 per 1M output tokens
    // Rough estimate assuming 70% input, 30% output
    const inputTokens = Math.floor(tokens * 0.7);
    const outputTokens = Math.floor(tokens * 0.3);
    
    return ((inputTokens * 0.15) + (outputTokens * 0.075)) / 1000000;
  }
}

module.exports = {
  AIFieldExtractor
};