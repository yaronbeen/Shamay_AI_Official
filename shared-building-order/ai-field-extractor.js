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
   * @param {string|Buffer} input - Either markdown text or PDF buffer for vision processing
   * @param {Object} options - Processing options {useVision: boolean}
   * @returns {Promise<Object>} - Structured extraction results
   */
  async extractAllFields(input, options = {}) {
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
- buildings_info: Array of building information when multiple buildings exist
- sub_plots: DETAILED array of ALL individual sub-plot information from the tables (פירוט מלא של כל תתי החלקות)

CONFIDENCE SCORES:
For each field, provide a confidence score from 0-1 based on text clarity and certainty.
Also provide context explaining where/how the information was found.

Hebrew terms to look for:
- צו רישום, צו רישום בית משותף
- תאריך, מיום
- קומות, קומה
- תת חלקה, תתי חלקות, מספר תת חלקה
- מבנה, בניין, מספר מבנה
- כתובת, רחוב
- שטח, מ"ר, מטר רבוע, שטח במ"ר
- דירה, יחידה, חנות, סלון, כתחז
- קרקע, מרתף, עליון, קומה, ראשונה, שניה, שלישית
- הצמדות, צמודות
- סימון בתשריט, צבע בתשריט
- חלקים ברכוש המשותף
- תיאור הצמדה, תיאור צמודה

Return ONLY the JSON object with this structure:
{
  "order_issue_date": "YYYY-MM-DD or original format",
  "building_description": "text description",
  "building_floors": number,
  "building_sub_plots_count": number,
  "building_address": "full address",
  "total_sub_plots": number,
  "buildings_info": [
    {
      "building_number": "I/II/etc",
      "address": "building address",
      "floors": number,
      "sub_plots_count": number
    }
  ],
  "sub_plots": [
    {
      "sub_plot_number": number,
      "building_number": "I/II/etc",
      "area": number,
      "description": "unit description (דירה/חנות/etc)",
      "floor": "floor description",
      "shared_property_parts": "חלקים ברכוש המשותף value",
      "attachments": [
        {
          "description": "תיאור הצמדה",
          "diagram_symbol": "סימון בתשריט", 
          "diagram_color": "צבע בתשריט",
          "area": number
        }
      ],
      "non_attachment_areas": [
        {
          "description": "area description",
          "area": number
        }
      ]
    }
  ],
  "confidence_scores": {
    "order_issue_date": 0.0-1.0,
    "building_description": 0.0-1.0,
    "building_floors": 0.0-1.0,
    "building_sub_plots_count": 0.0-1.0,
    "building_address": 0.0-1.0,
    "total_sub_plots": 0.0-1.0,
    "buildings_info": 0.0-1.0,
    "sub_plots": 0.0-1.0,
    "overall": 0.0-1.0
  },
  "extraction_contexts": {
    "order_issue_date": "context explanation",
    "building_description": "context explanation", 
    "building_floors": "context explanation",
    "building_sub_plots_count": "context explanation",
    "building_address": "context explanation",
    "total_sub_plots": "context explanation",
    "buildings_info": "context explanation",
    "sub_plots": "context explanation with table details"
  }
}`;

    const userPrompt = `Extract structured data from this Hebrew shared building order document.

CRITICAL: This document contains detailed TABLES with individual sub-plot information. You MUST extract ALL sub-plots from the tables, not just summary information.

Look for tables with columns like:
- מספר תת חלקה (sub-plot number)
- מבנה (building)
- כניסה (entrance) 
- קומה (floor)
- תיאור חלקה (description)
- שטח במ"ר (area)
- חלקים ברכוש המשותף (shared property parts)
- הצמדות (attachments) with סימון, צבע, תיאור, שטח

Extract EVERY ROW from these tables as individual sub_plots entries.

The document should have around 55 individual sub-plot entries across multiple pages.`;

    try {
      let messageContent;
      
      if (options.useVision && Buffer.isBuffer(input)) {
        // Use vision API for PDF processing
        messageContent = [
          {
            type: "text",
            text: userPrompt
          },
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: input.toString('base64')
            }
          }
        ];
      } else {
        // Use text-based processing
        messageContent = userPrompt + (typeof input === 'string' ? `\n\nDocument:\n${input}` : '');
      }

      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 8000, // Increased for detailed table extraction
        temperature: 0,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: options.useVision ? messageContent : messageContent
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
        
        buildings_info: {
          value: extractedData.buildings_info || [],
          confidence: (extractedData.confidence_scores?.buildings_info || 0) * 100,
          context: extractedData.extraction_contexts?.buildings_info || '',
          pattern: 'ai_extraction',
          count: extractedData.buildings_info ? extractedData.buildings_info.length : 0
        },
        
        sub_plots: {
          value: extractedData.sub_plots || [],
          confidence: (extractedData.confidence_scores?.sub_plots || 0) * 100,
          context: extractedData.extraction_contexts?.sub_plots || '',
          pattern: 'ai_extraction',
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