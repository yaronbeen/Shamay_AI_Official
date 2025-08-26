/**
 * AI-Powered Field Extractor using Anthropic Claude
 * Uses Claude Opus to extract Hebrew shared building order fields with high accuracy
 */

import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

class SharedBuildingAIExtractor {
  constructor(apiKey) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY
    });
    
    this.model = 'claude-opus-4-1-20250805'; // User-specified model
  }

  /**
   * Extract all fields using Anthropic with structured output
   * @param {string} markdownText - The converted markdown text
   * @returns {Promise<Object>} - Structured extraction results
   */
  async extractAllFields(markdownText) {
    const startTime = Date.now();

    const systemPrompt = `You are an expert at extracting data from Hebrew shared building order documents (צו רישום בית משותף).

Extract the following information with high accuracy and return ONLY valid JSON:

REQUIRED FIELDS:
- order_issue_date: Date when the order was issued (תאריך הוצאת הצו)
- building_description: Description of the building (תיאור המבנה)
- building_floors: Number of floors in the building (מספר קומות)
- building_sub_plots_count: Number of sub-plots/units in the building (מספר תתי חלקות במבנה)
- building_address: Complete address of the building (כתובת המבנה)
- total_sub_plots: Total number of sub-plots in the project (סה"כ תתי חלקות)
- sub_plots: Array of sub-plot details including floor, description, area, etc. (פירוט תתי החלקות)

CONFIDENCE SCORES:
For each field, provide a confidence score from 0-1 based on text clarity and certainty.
Also provide context explaining where/how the information was found.

Hebrew terms to look for:
- צו רישום, צו רישום בית משותף
- תאריך, מיום
- קומות, קומה
- תת חלקה, תתי חלקות
- מבנה, בניין
- כתובת, רחוב
- שטח, מ"ר, מטר רבוע
- דירה, יחידה
- קרקע, מרתף, עליון

Return ONLY the JSON object with this structure:
{
  "order_issue_date": "YYYY-MM-DD or original format",
  "building_description": "text description",
  "building_floors": number,
  "building_sub_plots_count": number,
  "building_address": "full address",
  "total_sub_plots": number,
  "sub_plots": [
    {
      "sub_plot_number": number,
      "floor": "floor description",
      "description": "unit description",
      "area": number,
      "additional_info": "any additional details"
    }
  ],
  "confidence_scores": {
    "order_issue_date": 0.0-1.0,
    "building_description": 0.0-1.0,
    "building_floors": 0.0-1.0,
    "building_sub_plots_count": 0.0-1.0,
    "building_address": 0.0-1.0,
    "total_sub_plots": 0.0-1.0,
    "overall": 0.0-1.0
  },
  "extraction_contexts": {
    "order_issue_date": "context explanation",
    "building_description": "context explanation",
    "building_floors": "context explanation",
    "building_sub_plots_count": "context explanation",
    "building_address": "context explanation",
    "total_sub_plots": "context explanation"
  }
}`;

    const userPrompt = `Extract structured data from this Hebrew shared building order document:

${markdownText}`;

    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 4000,
        temperature: 0,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userPrompt
          }
        ]
      });

      const content = message.content[0].text;
      
      // Parse the JSON response
      let extractedData;
      try {
        extractedData = JSON.parse(content);
      } catch (parseError) {
        // Try to extract JSON from response if wrapped in text
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          extractedData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No valid JSON found in response');
        }
      }

      // Structure the result to match field parser format
      const result = {
        order_issue_date: {
          value: extractedData.order_issue_date || null,
          confidence: (extractedData.confidence_scores?.order_issue_date || 0) * 100, // Convert to 0-100
          context: extractedData.extraction_contexts?.order_issue_date || '',
          pattern: 'ai_extraction'
        },
        
        building_description: {
          value: extractedData.building_description || null,
          confidence: (extractedData.confidence_scores?.building_description || 0) * 100,
          context: extractedData.extraction_contexts?.building_description || '',
          pattern: 'ai_extraction'
        },
        
        building_floors: {
          value: extractedData.building_floors || null,
          confidence: (extractedData.confidence_scores?.building_floors || 0) * 100,
          context: extractedData.extraction_contexts?.building_floors || '',
          pattern: 'ai_extraction'
        },
        
        building_sub_plots_count: {
          value: extractedData.building_sub_plots_count || null,
          confidence: (extractedData.confidence_scores?.building_sub_plots_count || 0) * 100,
          context: extractedData.extraction_contexts?.building_sub_plots_count || '',
          pattern: 'ai_extraction'
        },
        
        building_address: {
          value: extractedData.building_address || null,
          confidence: (extractedData.confidence_scores?.building_address || 0) * 100,
          context: extractedData.extraction_contexts?.building_address || '',
          pattern: 'ai_extraction'
        },
        
        total_sub_plots: {
          value: extractedData.total_sub_plots || null,
          confidence: (extractedData.confidence_scores?.total_sub_plots || 0) * 100,
          context: extractedData.extraction_contexts?.total_sub_plots || '',
          pattern: 'ai_extraction'
        },
        
        sub_plots: {
          value: extractedData.sub_plots || [],
          confidence: extractedData.sub_plots && extractedData.sub_plots.length > 0 ? 80 : 0,
          context: extractedData.sub_plots ? `Found ${extractedData.sub_plots.length} sub-plots` : '',
          count: extractedData.sub_plots ? extractedData.sub_plots.length : 0
        },
        
        // Metadata
        overallConfidence: (extractedData.confidence_scores?.overall || 0) * 100,
        processingTime: Date.now() - startTime,
        method: 'anthropic_claude_opus',
        model: this.model,
        tokensUsed: message.usage.total_tokens,
        cost: this.estimateCost(message.usage.total_tokens),
        rawResponse: content
      };

      return result;

    } catch (error) {
      console.error('Anthropic shared building extraction failed:', error.message);
      throw new Error(`Shared building AI extraction failed: ${error.message}`);
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
      order_issue_date: 'Extract the order issue date (תאריך הוצאת הצו) when the shared building order was issued',
      building_description: 'Extract the building description (תיאור המבנה) - what type of building it is',
      building_floors: 'Extract the number of floors (מספר קומות) in the building',
      building_sub_plots_count: 'Extract the number of sub-plots/units (מספר תתי חלקות) in this building',
      building_address: 'Extract the complete building address (כתובת המבנה)',
      total_sub_plots: 'Extract the total number of sub-plots (סה"כ תתי חלקות) in the entire project',
      sub_plots: 'Extract all individual sub-plot details (פירוט תתי החלקות) including floor, area, description'
    };

    const prompt = `Extract ONLY the ${fieldName} from this Hebrew shared building order document:

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
  SharedBuildingAIExtractor
};