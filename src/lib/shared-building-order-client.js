import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function extractSharedBuildingOrderData(documentText) {
  try {
    const message = await anthropic.messages.create({
      model: "claude-opus-4-1-20250805",
      max_tokens: 4000,
      temperature: 0,
      system: `You are an expert at extracting data from Hebrew shared building order documents (צו רישום בית משותף).

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
}`,
      messages: [
        {
          role: "user",
          content: `Extract structured data from this Hebrew shared building order document:\n\n${documentText}`
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

    // Structure the result
    const result = {
      order_issue_date: extractedData.order_issue_date || null,
      building_description: extractedData.building_description || null,
      building_floors: extractedData.building_floors || null,
      building_sub_plots_count: extractedData.building_sub_plots_count || null,
      building_address: extractedData.building_address || null,
      total_sub_plots: extractedData.total_sub_plots || null,
      sub_plots: extractedData.sub_plots || [],
      
      // Confidence scores
      confidence_scores: extractedData.confidence_scores || {
        order_issue_date: 0,
        building_description: 0,
        building_floors: 0,
        building_sub_plots_count: 0,
        building_address: 0,
        total_sub_plots: 0,
        overall: 0
      },
      
      // Extraction contexts
      extraction_contexts: extractedData.extraction_contexts || {},
      
      // Metadata
      extraction_method: 'anthropic_shared_building_order',
      model_used: 'claude-opus-4-1-20250805',
      extracted_at: new Date().toISOString(),
      raw_response: content,
    };

    return result;

  } catch (error) {
    console.error('Anthropic shared building order extraction failed:', error);
    throw new Error(`Shared building order extraction error: ${error.message}`);
  }
}

export async function extractWithFallback(documentText) {
  try {
    return await extractSharedBuildingOrderData(documentText);
  } catch (error) {
    console.error('Primary extraction failed:', error);
    
    // Fallback with simpler prompt
    try {
      const message = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 2000,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: `Extract basic info from Hebrew shared building order: date, building address, floors, sub-plots. Return JSON only.\n\n${documentText.slice(0, 8000)}`
          }
        ]
      });

      const content = message.content[0].text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          ...parsed,
          extraction_method: 'anthropic_fallback_shared_building',
          model_used: 'claude-3-haiku-20240307',
          extracted_at: new Date().toISOString(),
        };
      } else {
        throw new Error('No JSON found in fallback response');
      }
    } catch (fallbackError) {
      throw new Error(`All shared building order extraction methods failed: ${fallbackError.message}`);
    }
  }
}