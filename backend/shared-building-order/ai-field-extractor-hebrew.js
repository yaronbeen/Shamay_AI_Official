/**
 * AI-Powered Field Extractor using Anthropic Claude
 * Uses Claude Opus to extract Hebrew shared building order fields with high accuracy
 */

const Anthropic = require('@anthropic-ai/sdk');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config();

class SharedBuildingAIExtractor {
  constructor(apiKey) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY
    });
    
    this.model = 'claude-3-5-sonnet-20241022'; // Updated model
  }

  /**
   * Step 1: Extract document structure and basic information
   * @param {string|Buffer} input - Either markdown text or PDF file path
   * @param {Object} options - Processing options {useVision: boolean}
   * @returns {Promise<Object>} - Document structure analysis
   */
  async extractDocumentStructure(input, options = {}) {
    const systemPrompt = `אתה מומחה לניתוח מסמכי צו רישום בית משותף בעברית.

משימה ראשונה: נתח את מבנה המסמך ומצא את המידע הבסיסי.

חפש ומצא:
1. כמה מבנים יש בפרויקט ומה הכתובת של כל מבנה מטבלת תיאור הבית
   - חלץ את כל המבנים עם הנתונים המלאים: מספר מבנה, כתובת, קומות, ומספר תתי חלקות
   - בדוק בטבלת "תיאור הבית" - לכל שורה יש מבנה עם כתובת
2. כמה קומות יש בכל מבנה (מטבלת תיאור הבית)
3. כמה תתי חלקות יש בכל מבנה (מהעמודות בטבלת תיאור הבית)
4. מה המספר הכולל של תתי החלקות:
   - ראשית חפש "סה״כ תתי חלקות" בטבלת "תיאור הבית" (טבלה 1)
   - אם לא קיים בטבלה, מצא את מספר תת החלקה הגבוה ביותר מטבלאות "תיאור תתי חלקות ותצמודות"
   - התעלם ממספרי רישום, כותרות עליונות/תחתונות, ושברים כמו "44/0" או "0/44"
   - רק מספרים מתוך הטבלאות עצמן (עמודת "מספר תת חלקה") הם תקפים
5. מצא את תת החלקה הספציפית שהדוח מתמקד בה (בדרך כלל מודגש או בתחילת המסמך)

חשוב: חלץ את כל המבנים, לא רק את הראשון!

מונחים עבריים לחיפוש:
- צו רישום, צו רישום בית משותף
- תיאור הבית, תיאור המבנה
- מבנה, בניין, קומות, קומה
- תת חלקה, תתי חלקות, סה״כ תתי חלקות
- כתובת, רחוב, עיר

החזר רק JSON בפורמט זה:
{
  "buildings": [
    {
      "building_number": "מספר/אות מבנה",
      "address": "כתובת מלאה",
      "floors": "מספר קומות",
      "sub_plots_count": "כמה תתי חלקות יש במבנה זה",
      "confidence": 0.0-1.0
    }
  ],
  "total_sub_plots": "מספר כולל תתי חלקות",
  "total_sub_plots_source": "סה״כ או מספר גבוה ביותר",
  "focus_sub_plot": "מספר תת החלקה שהדוח עוסק בה",
  "document_date": "תאריך הוצאת הצו",
  "confidence_scores": {
    "buildings": 0.0-1.0,
    "total_sub_plots": 0.0-1.0,
    "focus_sub_plot": 0.0-1.0,
    "document_date": 0.0-1.0,
    "overall": 0.0-1.0
  }
}`;

    const userPrompt = `נתח את מסמך צו רישום בית משותף זה ומצא את המידע הבסיסי המבוקש.

התמקד במציאת:
- כל המבנים והכתובות מטבלת תיאור הבית (טבלה 1) - חלץ את כולם!
- לכל מבנה: מספר מבנה, כתובת מלאה, מספר קומות, וכמה תתי חלקות יש בו
- סה״כ תתי חלקות מהשדה "סה״כ תתי חלקות" בטבלה 1, או המספר הגבוה ביותר בעמודת "מספר תת חלקה"
- התעלם ממספרי רישום בכותרות/תחתיות הדף
- תת החלקה הספציפית שהדוח עוסק בה

חשוב: אם יש 3 מבנים בטבלה - חלץ את שלושתם עם כל הפרטים!

החזר רק JSON מובנה כפי שנדרש.`;

    return await this.callAnthropicAPI(systemPrompt, userPrompt, input, options, 4000);
  }

  /**
   * Step 2: Extract detailed fields based on structure analysis
   * @param {string|Buffer} input - Either markdown text or PDF file path
   * @param {Object} structureData - Results from step 1
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Detailed field extraction
   */
  async extractDetailedFields(input, structureData, options = {}) {
    const systemPrompt = `אתה מומחה לחילוץ שדות מפורט ממסמכי צו רישום בית משותף.

על בסיס הניתוח המבני שקיבלת, חלץ את כל השדות הנדרשים בדיוק:

1. תיאור הבית - פורמט נדרש:
   עצב כך: "X מבנים, Y קומות למבנה א', Z קומות למבנה ב', כתובת: [כל הכתובות], [עיר], בית משותף"
   כלול את כל המבנים עם הקומות והכתובות שלהם

2. תיאור קומות מילולי:
   תאר במילים את סעיף "תיאור הבית" מהמסמך המקורי - העתק את הטקסט המדויק

3. כל הכתובות וכל המבנים:
   רשום את כל הכתובות מטבלת תיאור הבית, לא רק הראשונה
   לכל מבנה הוסף: מספר מבנה, כתובת, קומות, מספר תתי חלקות

4. נתוני תת החלקה הספציפית:
   מצא את תת החלקה ${structureData.focus_sub_plot || '[המספר שנמצא]'} וחלץ:
   - קומה
   - שטח במ״ר
   - תיאור מפורט
   - הצמדות (חניה, מחסן, גינה וכו')
   - חלקים ברכוש המשותף

החזר רק JSON בפורמט זה:
{
  "building_description_formatted": "תיאור בפורמט הנדרש",
  "building_description_original": "העתקה מדויקת של סעיף תיאור הבית",
  "all_addresses": ["כתובת 1", "כתובת 2", "..."],
  "all_buildings": [
    {
      "building_number": "מספר מבנה",
      "address": "כתובת מלאה",
      "floors": "מספר קומות",
      "sub_plots_count": "מספר תתי חלקות"
    }
  ],
  "city": "שם העיר",
  "order_issue_date": "תאריך הוצאת הצו",
  "specific_sub_plot": {
    "number": "מספר תת החלקה",
    "floor": "קומה",
    "area": "שטח במ״ר",
    "description": "תיאור",
    "attachments": ["חניה", "מחסן", "גינה"],
    "shared_property_parts": "חלקים ברכוש המשותף"
  },
  "confidence_scores": {
    "building_description": 0.0-1.0,
    "all_addresses": 0.0-1.0,
    "all_buildings": 0.0-1.0,
    "specific_sub_plot": 0.0-1.0,
    "order_date": 0.0-1.0,
    "overall": 0.0-1.0
  }
}`;

    const userPrompt = `על בסיס הניתוח המבני הבא:
${JSON.stringify(structureData, null, 2)}

חלץ את כל השדות המפורטים מהמסמך.

שים לב במיוחד ל:
- עיצוב תיאור הבית בפורמט המדויק שנדרש
- כלילת כל הכתובות, לא רק הראשונה
- חילוץ כל המבנים עם כל הפרטים (מספר מבנה, כתובת, קומות, מספר תתי חלקות)
- מציאת כל הנתונים של תת החלקה המספר ${structureData.focus_sub_plot || '[לא נמצא]'}
- העתקה מדויקת של סעיף תיאור הבית המקורי

חשוב: אם יש ${structureData.buildings?.length || 'מספר'} מבנים - חלץ את כולם!

החזר רק JSON מובנה.`;

    return await this.callAnthropicAPI(systemPrompt, userPrompt, input, options, 6000);
  }

  /**
   * Step 3: Validate and format final results
   * @param {string|Buffer} input - Either markdown text or PDF file path
   * @param {Object} structureData - Results from step 1
   * @param {Object} detailedData - Results from step 2
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Final validated results
   */
  async validateAndFormat(input, structureData, detailedData, options = {}) {
    const systemPrompt = `אתה מומחה לוידוא ועיצוב סופי של נתוני צו רישום בית משותף.

שלב וידוא אחרון: בדוק שכל המידע מדויק ומלא לפי הדרישות:

1. וידוא תיאור הבית:
   ✓ האם כלול מספר המבנים?
   ✓ האם כלול מספר קומות לכל מבנה?
   ✓ האם כל הכתובות כלולות?
   ✓ האם מצוין "בית משותף"?

2. וידוא מספר תתי חלקות:
   ✓ האם המספר מגיע מ"סה״כ תתי חלקות" בטבלת תיאור הבית?
   ✓ אם לא, האם זה המספר הגבוה ביותר בעמודת "מספר תת חלקה" מטבלאות הפירוט?
   ✗ וודא שהמספר לא מגיע ממספרי רישום בכותרות/תחתיות (למשל "44/0" או "0/44")
   ✗ אם המספר נראה כמו שבר או מספר רישום - תקן לפי הטבלאות בלבד

3. וידוא כתובות ומבנים:
   ✓ האם כל הכתובות מטבלת תיאור הבית כלולות?
   ✓ האם כל המבנים מופיעים עם כל הפרטים (מספר, כתובת, קומות, תתי חלקות)?
   ✓ אם בניתוח המבני נמצאו 3 מבנים - האם כולם מופיעים?

4. וידוא תת החלקה הספציפית:
   ✓ האם נמצאו כל הנתונים של תת החלקה שהדוח עוסק בה?

תקן כל חסר או לא מדויק ותן תוצאה סופית מושלמת.
חשוב: וודא שכל המבנים כלולים בתוצאה הסופית!

החזר רק JSON סופי בפורמט זה:
{
  "order_issue_date": "תאריך הוצאת הצו",
  "building_description": "תיאור בפורמט: X מבנים, Y קומות...",
  "building_description_original": "העתקה מדויקת מהמסמך",
  "building_floors": "מספר קומות כולל או למבנה הראשי",
  "building_sub_plots_count": "מספר תתי חלקות במבנה",
  "building_address": "כתובת ראשית",
  "all_addresses": ["כל הכתובות"],
  "all_buildings": [
    {
      "building_number": "מספר מבנה",
      "address": "כתובת מלאה",
      "floors": "מספר קומות",
      "sub_plots_count": "מספר תתי חלקות"
    }
  ],
  "city": "עיר",
  "total_sub_plots": "סה״כ תתי חלקות",
  "total_sub_plots_source": "מקור המספר",
  "specific_sub_plot": {
    "number": "מספר",
    "floor": "קומה",
    "area": "שטח",
    "description": "תיאור",
    "attachments": [],
    "shared_property_parts": "חלקים"
  },
  "confidence_scores": {
    "order_issue_date": 0.0-1.0,
    "building_description": 0.0-1.0,
    "building_floors": 0.0-1.0,
    "building_sub_plots_count": 0.0-1.0,
    "building_address": 0.0-1.0,
    "all_buildings": 0.0-1.0,
    "total_sub_plots": 0.0-1.0,
    "specific_sub_plot": 0.0-1.0,
    "overall": 0.0-1.0
  },
  "validation_notes": "הערות על תיקונים שבוצעו"
}`;

    const userPrompt = `בדוק ותקן את הנתונים הבאים:

ניתוח מבני:
${JSON.stringify(structureData, null, 2)}

נתונים מפורטים:
${JSON.stringify(detailedData, null, 2)}

וודא שהתוצאה הסופית עומדת בכל הדרישות ותקן כל בעיה שאתה מוצא.
חשוב במיוחד: וודא שכל המבנים (${structureData.buildings?.length || 'X'} מבנים) מופיעים ב-all_buildings עם כל הפרטים!

החזר JSON סופי מושלם.`;

    return await this.callAnthropicAPI(systemPrompt, userPrompt, input, options, 8000);
  }

  /**
   * Helper method to call Anthropic API
   */
  async callAnthropicAPI(systemPrompt, userPrompt, input, options, maxTokens) {
    let messageContent;
    let pdfBuffer = null;

    // Handle PDF file path input
    if (options.isPdf && typeof input === 'string') {
      pdfBuffer = fs.readFileSync(input);
    } else if (options.useVision && typeof input === 'string') {
      pdfBuffer = fs.readFileSync(input);
    } else if (Buffer.isBuffer(input)) {
      pdfBuffer = input;
    }

    if (pdfBuffer) {
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
            data: pdfBuffer.toString('base64')
          }
        }
      ];
    } else {
      messageContent = userPrompt + (typeof input === 'string' ? `\n\nמסמך:\n${input}` : '');
    }

    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: maxTokens,
      temperature: 0,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: pdfBuffer ? messageContent : messageContent
        }
      ]
    });

    const content = message.content[0].text;

    // Parse JSON with error handling
    let extractedData;
    try {
      extractedData = JSON.parse(content);
    } catch (parseError) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        let jsonText = jsonMatch[0]
          .replace(/,(\s*[}\]])/g, '$1')
          .replace(/([}\]]),(\s*[}\]])/g, '$1$2')
          .replace(/,(\s*,)/g, ',')
          .replace(/\.\.\./g, '')
          .replace(/\n/g, ' ')
          .replace(/\r/g, '')
          .replace(/\t/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/,(\s*[}\]])/g, '$1')
          .trim();

        extractedData = JSON.parse(jsonText);
      } else {
        throw new Error('No valid JSON found in response');
      }
    }

    return {
      data: extractedData,
      usage: message.usage,
      rawResponse: content
    };
  }

  /**
   * Extract all fields using 3-step Hebrew prompt approach
   * @param {string|Buffer} input - Either markdown text or PDF file path
   * @param {Object} options - Processing options {useVision: boolean}
   * @returns {Promise<Object>} - Structured extraction results
   */
  async extractAllFields(input, options = {}) {
    const startTime = Date.now();
    console.log('🔄 Starting 3-step Hebrew extraction process...');

    try {
      // Step 1: Extract document structure
      console.log('📋 Step 1: Analyzing document structure...');
      const step1Result = await this.extractDocumentStructure(input, options);
      const structureData = step1Result.data;
      console.log(`✅ Step 1 completed. Found ${structureData.buildings?.length || 0} buildings, focus sub-plot: ${structureData.focus_sub_plot || 'not found'}`);

      // Step 2: Extract detailed fields
      console.log('🔍 Step 2: Extracting detailed fields...');
      const step2Result = await this.extractDetailedFields(input, structureData, options);
      const detailedData = step2Result.data;
      console.log(`✅ Step 2 completed. Addresses found: ${detailedData.all_addresses?.length || 0}`);

      // Step 3: Validate and format
      console.log('✓ Step 3: Validating and formatting final results...');
      const step3Result = await this.validateAndFormat(input, structureData, detailedData, options);
      const finalData = step3Result.data;
      console.log('✅ Step 3 completed. Final validation done.');

      // Calculate total cost and tokens
      const totalTokens = (step1Result.usage?.total_tokens || 0) +
                         (step2Result.usage?.total_tokens || 0) +
                         (step3Result.usage?.total_tokens || 0);
      const totalCost = this.estimateCost(totalTokens);

      // Structure the result to match the expected format
      const result = {
        order_issue_date: {
          value: finalData.order_issue_date || null,
          confidence: (finalData.confidence_scores?.order_issue_date || 0) * 100,
          context: 'Step 3 validation',
          pattern: '3_step_hebrew_extraction'
        },

        building_description: {
          value: finalData.building_description || null,
          confidence: (finalData.confidence_scores?.building_description || 0) * 100,
          context: finalData.building_description_original || 'Step 2 extraction',
          pattern: '3_step_hebrew_extraction'
        },

        building_floors: {
          value: finalData.building_floors || null,
          confidence: (finalData.confidence_scores?.building_floors || 0) * 100,
          context: 'From building structure analysis',
          pattern: '3_step_hebrew_extraction'
        },

        building_sub_plots_count: {
          value: finalData.building_sub_plots_count || null,
          confidence: (finalData.confidence_scores?.building_sub_plots_count || 0) * 100,
          context: 'From building analysis',
          pattern: '3_step_hebrew_extraction'
        },

        building_address: {
          value: finalData.building_address || null,
          confidence: (finalData.confidence_scores?.building_address || 0) * 100,
          context: `All addresses: ${(finalData.all_addresses || []).join(', ')}`,
          pattern: '3_step_hebrew_extraction'
        },

        total_sub_plots: {
          value: finalData.total_sub_plots || null,
          confidence: (finalData.confidence_scores?.total_sub_plots || 0) * 100,
          context: finalData.total_sub_plots_source || 'Step 1 analysis',
          pattern: '3_step_hebrew_extraction'
        },

        buildings_info: {
          value: finalData.all_buildings || structureData.buildings || [],
          confidence: (finalData.confidence_scores?.all_buildings || structureData.confidence_scores?.buildings || 0) * 100,
          context: 'Complete buildings list from step 3 validation',
          pattern: '3_step_hebrew_extraction',
          count: (finalData.all_buildings || structureData.buildings || []).length
        },

        specific_sub_plot: {
          value: finalData.specific_sub_plot || null,
          confidence: (finalData.confidence_scores?.specific_sub_plot || 0) * 100,
          context: `Focus sub-plot: ${structureData.focus_sub_plot || 'not identified'}`,
          pattern: '3_step_hebrew_extraction'
        },

        // Additional fields from 3-step process
        all_addresses: {
          value: finalData.all_addresses || [],
          confidence: (finalData.confidence_scores?.building_address || 0) * 100,
          context: 'Complete address list from building table',
          pattern: '3_step_hebrew_extraction',
          count: finalData.all_addresses?.length || 0
        },

        city: {
          value: finalData.city || null,
          confidence: (finalData.confidence_scores?.building_address || 0) * 100,
          context: 'Extracted from addresses',
          pattern: '3_step_hebrew_extraction'
        },

        // Metadata
        overallConfidence: (finalData.confidence_scores?.overall || 0) * 100,
        processingTime: Date.now() - startTime,
        method: '3_step_hebrew_anthropic',
        model: this.model,
        tokensUsed: totalTokens,
        cost: totalCost,
        stepsCompleted: 3,
        validationNotes: finalData.validation_notes || 'No validation notes',
        rawResponses: {
          step1: step1Result.rawResponse.substring(0, 200) + '...',
          step2: step2Result.rawResponse.substring(0, 200) + '...',
          step3: step3Result.rawResponse.substring(0, 200) + '...'
        }
      };

      console.log(`🎉 3-step extraction completed successfully!`);
      console.log(`⏱️  Total time: ${result.processingTime}ms`);
      console.log(`🔗 Total tokens: ${totalTokens}`);
      console.log(`💰 Estimated cost: $${totalCost.toFixed(4)}`);
      console.log(`📊 Overall confidence: ${result.overallConfidence.toFixed(1)}%`);
      console.log(`🏢 Buildings: ${result.buildings_info?.count || 0}`);

      return result;

    } catch (error) {
      console.error('❌ 3-step extraction failed:', error.message);
      throw new Error(`3-step Hebrew extraction failed: ${error.message}`);
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
        let jsonText = jsonMatch[0];
        
        // Clean common JSON formatting issues aggressively
        jsonText = jsonText
          .replace(/,(\s*[}\]])/g, '$1')  // Remove trailing commas
          .replace(/([}\]]),(\s*[}\]])/g, '$1$2')  // Remove trailing commas before closing brackets
          .replace(/,(\s*,)/g, ',')  // Remove duplicate commas
          .replace(/\.\.\./g, '')    // Remove ellipsis that might break JSON
          .replace(/\n/g, ' ')  // Replace newlines with spaces
          .replace(/\r/g, '')   // Remove carriage returns
          .replace(/\t/g, ' ')  // Replace tabs with spaces
          .replace(/\s+/g, ' ') // Normalize multiple spaces
          .replace(/,(\s*[}\]])/g, '$1')  // Remove trailing commas again after cleanup
          .trim();
        
        // If JSON is too long and likely causing issues, truncate sub_plots array
        if (jsonText.length > 20000) {
          console.warn('⚠️  JSON response very long, truncating sub_plots array to prevent parsing errors');
          jsonText = jsonText.replace(/"sub_plots":\s*\[[^\]]*\]/g, '"sub_plots": [{"truncated": true}]');
        }
        
        try {
          return JSON.parse(jsonText);
        } catch (parseError) {
          console.error('JSON parse error in extractSingleField:', parseError.message);
          console.error('Problematic JSON:', jsonText.substring(0, 300) + '...');
          throw new Error(`JSON parsing failed: ${parseError.message}`);
        }
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

module.exports = {
  SharedBuildingAIExtractor
};
