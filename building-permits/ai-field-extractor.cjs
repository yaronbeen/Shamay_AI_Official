/**
 * AI-Powered Field Extractor using OpenAI
 * Uses GPT to extract Hebrew building permit fields with high accuracy
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
You are an expert in Hebrew building permit (היתרים מילוליים) document analysis. Extract the following fields from this Hebrew document text with high precision.

DOCUMENT TEXT:
${markdownText}

Please extract the following information and return it as JSON:

{
  "permitNumber": {
    "value": "string",
    "confidence": number (0-100),
    "context": "text where found"
  },
  "permitDate": {
    "value": "YYYY-MM-DD format", 
    "confidence": number (0-100),
    "context": "text where found"
  },
  "permittedUsage": {
    "value": "string",
    "confidence": number (0-100), 
    "context": "text where found"
  },
  "permitIssueDate": {
    "value": "YYYY-MM-DD format",
    "confidence": number (0-100),
    "context": "text where found"
  },
  "localCommitteeName": {
    "value": "string",
    "confidence": number (0-100),
    "context": "text where found"
  }
}

FIELD DEFINITIONS:
- permitNumber (היתר בנייה - מספר): Building permit number, usually 6-9 digits
- permitDate (היתר בנייה - תאריך): Date of the building permit  
- permittedUsage (מותר): What is permitted to be built/used (e.g., מגורים, משרדים, מסחר)
- permitIssueDate (תאריך הפקת היתר): Date when the permit was issued
- localCommitteeName (שם הוועדה המקומית): Name of the local planning committee

IMPORTANT NOTES:
- Text is in Hebrew and may be RTL (right-to-left)
- Look for patterns like "היתר מספר", "תאריך", "ועדה מקומית"
- Dates should be converted to YYYY-MM-DD format
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
            content: 'You are a Hebrew building permit document analysis expert. Return only valid JSON with extracted data.'
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
        extractedData.permitNumber?.confidence || 0,
        extractedData.permitDate?.confidence || 0, 
        extractedData.permittedUsage?.confidence || 0,
        extractedData.permitIssueDate?.confidence || 0,
        extractedData.localCommitteeName?.confidence || 0
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
      permitNumber: 'Extract the building permit number (היתר בנייה - מספר) - usually 6-9 digits',
      permitDate: 'Extract the building permit date (היתר בנייה - תאריך) - convert to YYYY-MM-DD format',
      permittedUsage: 'Extract what is permitted (מותר) - the usage/purpose of the building',
      permitIssueDate: 'Extract the permit issue date (תאריך הפקת היתר) - when permit was issued',
      localCommitteeName: 'Extract the local committee name (שם הוועדה המקומית) - the planning authority'
    };

    const prompt = `
Extract ONLY the ${fieldName} from this Hebrew building permit document:

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