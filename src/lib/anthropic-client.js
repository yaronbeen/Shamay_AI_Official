import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function extractLandRegistryData(documentText) {
  try {
    const message = await anthropic.messages.create({
      model: "claude-opus-4-1-20250805",
      max_tokens: 4000,
      temperature: 0,
      system: `You are an expert at extracting data from Hebrew land registry documents (נסח טאבו).

Extract ALL the following information with high accuracy and return ONLY valid JSON:

DOCUMENT INFO:
- registration_office: לשכת רישום מקרקעין (text)
- issue_date: תאריך הפקה (date string)
- tabu_extract_date: מתי הופק נסח טאבו (date string)

PROPERTY INFO:
- gush: גוש (number)
- chelka: חלקה (number) 
- sub_chelka: תת חלקה (number)
- total_plot_area: שטח קרקע של כל החלקה (number in sqm)
- regulation_type: תקנון - מוסכם/לא מוסכם/מצוי (text)
- sub_plots_count: תתי חלקות - כמה יש (number)
- buildings_count: כמה מבנים (number)
- address_from_tabu: כתובת מהנסח טאבו AS IS (text)

APARTMENT/UNIT INFO:
- unit_description: תיאור הדירה (text)
- floor: קומה (text/number)
- registered_area: שטח רשום (number)
- apartment_registered_area: שטח דירה רשום (number)
- balcony_area: שטח מרפסת (number)
- shared_property: רכוש משותף (text/number)
- building_number: מבנה - מספר מבנה (text)
- additional_areas: שטחים נוספים (array of objects)

ATTACHMENTS:
- attachments: הצמדות (array with symbol, color, description, area)

OWNERSHIP:
- owners: בעלויות (array with name, id, share)
- ownership_type: סוג הבעלות (text)
- rights: זכויות (text)

NOTES & COMMENTS:
- plot_notes: הערות לכל החלקה (text)
- notes_action_type: הערות - מהות פעולה (text)
- notes_beneficiary: הערות - שם המוטב (text)

EASEMENTS:
- easements_essence: זיקות הנאה - מהות (text)
- easements_description: זיקות הנאה - תיאור (text)

MORTGAGES:
- mortgages: משכנתאות (array with essence, rank, lenders, borrowers, amount, property_share)

CONFIDENCE SCORES:
- confidence_scores: Object with scores 0-1 for each major field group

Hebrew terms to look for:
- לשכת רישום מקרקעין, נתניה, חיפה, תל אביב
- תאריך, שעה
- גוש מספר, מספר גוש
- חלקה מספר, מספר חלקה
- תת חלקה, תת-חלקה
- שטח, מ"ר, מטר רבוע
- תקנון, מוסכם, לא מוסכם
- קומה, קרקע, שני, שלישי
- דירה, חדרים
- מרפסת, חניה, מחסן
- בעל, בעלת, שם, ת.ז
- חלק בנכס, באחוזים
- משכנתא, בנק, סכום
- הערות, זיקות הנאה

Return ONLY the JSON object, no other text.`,
      messages: [
        {
          role: "user",
          content: `Extract structured data from this Hebrew land registry document:\n\n${documentText}`
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

    // Validate and structure the comprehensive data - handle nested structure
    const result = {
      // Document Info
      registration_office: extractedData.document_info?.registration_office || extractedData.registration_office || null,
      issue_date: extractedData.document_info?.issue_date || extractedData.issue_date || null,
      tabu_extract_date: extractedData.document_info?.tabu_extract_date || extractedData.tabu_extract_date || null,
      
      // Property Info
      gush: extractedData.property_info?.gush || extractedData.gush || null,
      chelka: extractedData.property_info?.chelka || extractedData.chelka || null,
      sub_chelka: extractedData.property_info?.sub_chelka || extractedData.sub_chelka || null,
      total_plot_area: extractedData.property_info?.total_plot_area || extractedData.total_plot_area || null,
      regulation_type: extractedData.property_info?.regulation_type || extractedData.regulation_type || null,
      sub_plots_count: extractedData.property_info?.sub_plots_count || extractedData.sub_plots_count || null,
      buildings_count: extractedData.property_info?.buildings_count || extractedData.buildings_count || null,
      address_from_tabu: extractedData.property_info?.address_from_tabu || extractedData.address_from_tabu || null,
      
      // Apartment/Unit Info
      unit_description: extractedData.apartment_info?.unit_description || extractedData.unit_description || null,
      floor: extractedData.apartment_info?.floor || extractedData.floor || null,
      registered_area: extractedData.apartment_info?.registered_area || extractedData.registered_area || null,
      apartment_registered_area: extractedData.apartment_info?.apartment_registered_area || extractedData.apartment_registered_area || null,
      balcony_area: extractedData.apartment_info?.balcony_area || extractedData.balcony_area || null,
      shared_property: extractedData.apartment_info?.shared_property || extractedData.shared_property || null,
      building_number: extractedData.apartment_info?.building_number || extractedData.building_number || null,
      additional_areas: extractedData.apartment_info?.additional_areas || extractedData.additional_areas || [],
      
      // Attachments
      attachments: extractedData.attachments || [],
      
      // Ownership
      owners: extractedData.ownership?.owners || extractedData.owners || [],
      ownership_type: extractedData.ownership?.ownership_type || extractedData.ownership_type || null,
      rights: extractedData.ownership?.rights || extractedData.rights || null,
      
      // Notes & Comments
      plot_notes: extractedData.notes?.plot_notes || extractedData.plot_notes || null,
      notes_action_type: extractedData.notes?.notes_action_type || extractedData.notes_action_type || null,
      notes_beneficiary: extractedData.notes?.notes_beneficiary || extractedData.notes_beneficiary || null,
      
      // Easements
      easements_essence: extractedData.easements?.easements_essence || extractedData.easements_essence || null,
      easements_description: extractedData.easements?.easements_description || extractedData.easements_description || null,
      
      // Mortgages
      mortgages: extractedData.mortgages || [],
      
      // Confidence Scores
      confidence_scores: extractedData.confidence_scores || {
        document_info: 0,
        property_info: 0,
        unit_info: 0,
        ownership: 0,
        attachments: 0,
        mortgages: 0,
        overall: 0
      },
      
      // Metadata
      extraction_method: 'anthropic_structured',
      model_used: 'claude-opus-4-1-20250805',
      extracted_at: new Date().toISOString(),
      raw_response: content,
    };

    return result;

  } catch (error) {
    console.error('Anthropic structured extraction failed:', error);
    throw new Error(`Anthropic extraction error: ${error.message}`);
  }
}

export async function extractWithFallback(documentText) {
  try {
    return await extractLandRegistryData(documentText);
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
            content: `Extract basic info from Hebrew land registry: gush (גוש), chelka (חלקה), area, owners. Return JSON only.\n\n${documentText.slice(0, 8000)}`
          }
        ]
      });

      const content = message.content[0].text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          ...parsed,
          extraction_method: 'anthropic_fallback',
          model_used: 'claude-3-haiku-20240307',
          extracted_at: new Date().toISOString(),
        };
      } else {
        throw new Error('No JSON found in fallback response');
      }
    } catch (fallbackError) {
      throw new Error(`All extraction methods failed: ${fallbackError.message}`);
    }
  }
}