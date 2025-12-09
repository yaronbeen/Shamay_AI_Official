/**
 * AI-Powered Field Extractor using Google Gemini
 * Uses Gemini 3 Pro Preview to extract Hebrew shared building order fields with high accuracy
 * Includes field location tracking for scroll-to-source functionality
 */

const { GoogleGenAI } = require('@google/genai');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config();

class SharedBuildingGeminiExtractor {
  constructor(apiKey) {
    this.ai = new GoogleGenAI({ apiKey: apiKey || process.env.GEMINI_API_KEY });
    this.model = 'gemini-3-pro-preview';
  }

  /**
   * Extract all fields using Gemini with structured output and field locations
   * @param {string|Buffer} input - Either markdown text or PDF file path/buffer
   * @param {Object} options - Processing options {isPdf: boolean}
   * @returns {Promise<Object>} - Structured extraction results with locations
   */
  async extractAllFields(input, options = {}) {
    const startTime = Date.now();

    const systemPrompt = `You are an expert at extracting data from Hebrew shared building order documents (צו רישום בית משותף).

CRITICAL RULES:
1. Extract ONLY data that is actually present in the document
2. Return ONLY Hebrew text - no English translations or fallbacks
3. If information is not found, return null - do NOT generate or guess data
4. Do NOT provide default values or placeholder text
5. All extracted text must be in Hebrew as it appears in the document

REQUIRED FIELDS:
- order_issue_date: Date when the order was issued (תאריך הוצאת הצו) - return null if not found
- building_description: Description of the building (תיאור המבנה) - return null if not found
- building_floors: Number of floors in the building (מספר קומות) - return null if not found
- building_sub_plots_count: Number of sub-plots/units in the building (מספר תתי חלקות במבנה) - return null if not found
- building_address: Complete address of the building (כתובת המבנה) - return null if not found
- total_sub_plots: Total number of sub-plots in the project (סה"כ תתי חלקות) - return null if not found
- buildings_info: Array of building information when multiple buildings exist - return empty array if not found
- sub_plots: DETAILED array of ALL individual sub-plot information from the tables (פירוט מלא של כל תתי החלקות) - return empty array if not found

FIELD LOCATIONS:
For EACH field you extract, also provide its location in the document:
- page: page number (1, 2, 3...)
- y_percent: vertical position (0 = top of page, 100 = bottom of page)

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
  "data": {
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
    ]
  },
  "locations": {
    "order_issue_date": {"page": 1, "y_percent": 5},
    "building_description": {"page": 1, "y_percent": 10},
    "total_sub_plots": {"page": 2, "y_percent": 15},
    ...
  },
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

CRITICAL RULES:
1. Extract ONLY data that is actually present in the document
2. Return ONLY Hebrew text - no English translations
3. If information is not found, return null - do NOT generate or guess data
4. Do NOT provide default values or placeholder text

This document contains detailed TABLES with individual sub-plot information. You MUST extract ALL sub-plots from the tables, not just summary information.

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

The document should have around 55 individual sub-plot entries across multiple pages.

For each field, also provide its location (page number and y_percent).`;

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
        { text: userPrompt }
      ];
    } else {
      // Handle text input
      contents = [
        { text: systemPrompt },
        {
          text: `${userPrompt}\n\nDocument:\n${typeof input === 'string' ? input : input.toString()}`
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
        order_issue_date: {
          value: data.order_issue_date || null,
          confidence: (confidenceScores.order_issue_date || 0) * 100,
          context: extractionContexts.order_issue_date || '',
          pattern: 'ai_extraction'
        },
        
        building_description: {
          value: data.building_description || null,
          confidence: (confidenceScores.building_description || 0) * 100,
          context: extractionContexts.building_description || '',
          pattern: 'ai_extraction'
        },
        
        building_floors: {
          value: data.building_floors || null,
          confidence: (confidenceScores.building_floors || 0) * 100,
          context: extractionContexts.building_floors || '',
          pattern: 'ai_extraction'
        },
        
        building_sub_plots_count: {
          value: data.building_sub_plots_count || null,
          confidence: (confidenceScores.building_sub_plots_count || 0) * 100,
          context: extractionContexts.building_sub_plots_count || '',
          pattern: 'ai_extraction'
        },
        
        building_address: {
          value: data.building_address || null,
          confidence: (confidenceScores.building_address || 0) * 100,
          context: extractionContexts.building_address || '',
          pattern: 'ai_extraction'
        },
        
        total_sub_plots: {
          value: data.total_sub_plots || null,
          confidence: (confidenceScores.total_sub_plots || 0) * 100,
          context: extractionContexts.total_sub_plots || '',
          pattern: 'ai_extraction'
        },
        
        buildings_info: {
          value: data.buildings_info || [],
          confidence: (confidenceScores.buildings_info || 0) * 100,
          context: extractionContexts.buildings_info || '',
          pattern: 'ai_extraction',
          count: data.buildings_info ? data.buildings_info.length : 0
        },
        
        sub_plots: {
          value: data.sub_plots || [],
          confidence: (confidenceScores.sub_plots || 0) * 100,
          context: extractionContexts.sub_plots || '',
          pattern: 'ai_extraction',
          count: data.sub_plots ? data.sub_plots.length : 0
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
      console.error('Gemini shared building extraction failed:', error.message);
      throw new Error(`Shared building AI extraction failed: ${error.message}`);
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
  SharedBuildingGeminiExtractor
};

