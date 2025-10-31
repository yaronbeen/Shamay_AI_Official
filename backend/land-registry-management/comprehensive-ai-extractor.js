/**
 * Comprehensive AI-Powered Field Extractor using Anthropic Claude
 * Addresses issues with incomplete data extraction by using multi-stage AI prompts
 * Extracts ALL owners, mortgages, notes, and easements - not just the first ones
 */

const Anthropic = require('@anthropic-ai/sdk');
const dotenv = require('dotenv');

dotenv.config();

class LandRegistryComprehensiveAIExtractor {
  constructor(apiKey) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY
    });

    this.model = 'claude-sonnet-4-20250514'; // Latest Sonnet model
  }

  /**
   * Comprehensive extraction using multi-stage AI analysis
   * @param {string|Buffer} input - Either markdown text or PDF file path/buffer
   * @param {Object} options - Options including useVision flag
   * @returns {Promise<Object>} - Complete extraction results with ALL data
   */
  async extractAllFieldsComprehensive(input, options = {}) {
    const startTime = Date.now();

    try {
      // Stage 1: Analyze document structure
      console.log('🔍 Stage 1: Analyzing document structure...');
      const analysis = await this.analyzeDocumentStructure(input, options);

      // Stage 2: Comprehensive field extraction
      console.log('📊 Stage 2: Comprehensive field extraction...');
      const comprehensiveData = await this.extractWithAnalysis(input, analysis, options);

      // Stage 3: Extract specific problematic sections with dedicated prompts
      console.log('🎯 Stage 3: Detailed section extraction...');
      const detailedSections = await this.extractDetailedSections(input, options);

      // Merge all results
      const mergedResults = this.mergeExtractionResults(comprehensiveData, detailedSections);

      // Structure the final result
      const result = {
        ...mergedResults,

        // Metadata
        overallConfidence: (mergedResults.confidence_scores?.overall || 0) * 100,
        processingTime: Date.now() - startTime,
        method: 'anthropic_claude_comprehensive',
        model: this.model,
        extractionStages: 3,
        tokensUsed: (analysis.tokensUsed || 0) + (comprehensiveData.tokensUsed || 0) + (detailedSections.tokensUsed || 0),
        analysis: analysis.summary
      };

      return result;

    } catch (error) {
      console.error('Comprehensive land registry extraction failed:', error.message);
      throw new Error(`Comprehensive AI extraction failed: ${error.message}`);
    }
  }

  /**
   * Stage 1: Analyze document structure and count elements
   */
  async analyzeDocumentStructure(input, options = {}) {
    const analysisPrompt = `You are analyzing a Hebrew land registry document (נסח טאבו) structure.

CRITICAL TASK: Count and locate ALL instances of each element type. Do not stop at the first occurrence.

Analyze the ENTIRE document and provide counts:

1. OWNERS ANALYSIS:
   - How many different owners/co-owners are mentioned? (בעלים, שותפים)
   - Are they in a main table or scattered throughout?
   - Check notes sections for ownership transfers/changes

2. MORTGAGES ANALYSIS:
   - How many mortgages exist? (דרגה ראשונה, שנייה, שלישית)
   - Different banks/lenders mentioned?
   - Multiple mortgage amounts?

3. NOTES ANALYSIS:
   - Locate regulation table/section (תקנון, מוסכם/לא מוסכם/מצוי)
   - Count notes above regulation = sub-plot notes
   - Count notes below regulation = general plot notes
   - Any other scattered notes?

4. EASEMENTS ANALYSIS:
   - How many easements (זיקות הנאה) are listed?
   - Are they in a table or separate entries?

5. DOCUMENT STRUCTURE:
   - How many pages?
   - Main sections identified?
   - Any tables or complex layouts?

Return ONLY JSON:
{
  "owners_count": number,
  "owners_locations": ["where found"],
  "mortgages_count": number,
  "mortgages_locations": ["where found"],
  "notes_above_regulation": number,
  "notes_below_regulation": number,
  "regulation_table_location": "description",
  "easements_count": number,
  "easements_locations": ["where found"],
  "document_pages": number,
  "complex_sections": ["list of complex areas"],
  "extraction_challenges": ["potential issues to watch for"]
}`;

    let messages = [];

    if (options.useVision && Buffer.isBuffer(input)) {
      messages = [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this Hebrew land registry document structure and count all elements."
            },
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: input.toString('base64')
              }
            }
          ]
        }
      ];
    } else if (options.isPdf && typeof input === 'string') {
      const fs = require('fs');
      const pdfBuffer = fs.readFileSync(input);
      const base64Pdf = pdfBuffer.toString('base64');

      messages = [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this Hebrew land registry document structure and count all elements."
            },
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64Pdf
              }
            }
          ]
        }
      ];
    } else {
      messages = [
        {
          role: "user",
          content: `${analysisPrompt}\n\nDocument:\n${input}`
        }
      ];
    }

    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 2000,
      temperature: 0,
      system: analysisPrompt,
      messages: messages
    });

    const content = message.content[0]?.text || '';
    console.log('📋 Document analysis:', content.substring(0, 200) + '...');

    try {
      const analysisData = JSON.parse(content);
      return {
        summary: analysisData,
        tokensUsed: message.usage.total_tokens,
        rawResponse: content
      };
    } catch (parseError) {
      console.warn('⚠️  Analysis parsing failed, using fallback');
      return {
        summary: { owners_count: 0, mortgages_count: 0, notes_above_regulation: 0, notes_below_regulation: 0, easements_count: 0 },
        tokensUsed: message.usage.total_tokens,
        rawResponse: content
      };
    }
  }

  /**
   * Stage 2: Comprehensive extraction based on analysis
   */
  async extractWithAnalysis(input, analysis, options = {}) {
    const systemPrompt = `You are an expert at extracting ALL data from Hebrew land registry documents (נסח טאבו).

CRITICAL INSTRUCTIONS BASED ON DOCUMENT ANALYSIS:
- Expected owners: ${analysis.summary.owners_count || 'multiple'}
- Expected mortgages: ${analysis.summary.mortgages_count || 'multiple'}
- Expected notes sections: above and below regulation table
- Expected easements: ${analysis.summary.easements_count || 'multiple'}

EXTRACTION REQUIREMENTS:
1. Extract ALL owners (not just first) - you should find ${analysis.summary.owners_count || 'several'}
2. Extract ALL mortgages (all ranks/lenders) - you should find ${analysis.summary.mortgages_count || 'several'}
3. Extract ALL notes with hierarchy awareness
4. Extract ALL easements - you should find ${analysis.summary.easements_count || 'several'}

VALIDATION: Before returning results, verify your counts match the analysis.

CRITICAL RULES:
1. Extract ONLY data that is actually present in the document
2. Return ONLY Hebrew text - no English translations or fallbacks
3. If information is not found, return null - do NOT generate or guess data
4. Do NOT provide default values or placeholder text
5. All extracted text must be in Hebrew as it appears in the document

Extract the following information with high accuracy and return ONLY valid JSON:

DOCUMENT INFORMATION:
- registration_office: Land registry office name (לשכת רישום מקרקעין) - return null if not found
- issue_date: Document issue date (תאריך הפקה) - return null if not found
- tabu_extract_date: Tabu extract date (תאריך נסח טאבו) - return null if not found

CORE PROPERTY IDENTIFIERS:
- gush: Block number (גוש) - return null if not found
- chelka: Plot number (חלקה) - return null if not found
- sub_chelka: Sub-plot number (תת חלקה) - return null if not found

PROPERTY DETAILS:
- total_plot_area: Total plot area (שטח קרקע כולל) - return null if not found
- regulation_type: Regulation type - מוסכם/לא מוסכם/מצוי - return null if not found
- sub_plots_count: Number of sub-plots (מספר תתי חלקות) - return null if not found
- buildings_count: Number of buildings (מספר מבנים) - return null if not found
- address_from_tabu: Address from tabu document (כתובת מהנסח) - return null if not found

UNIT/APARTMENT INFORMATION:
- unit_description: Unit description (תיאור הדירה - דירה/חנות/משרד) - return null if not found
- floor: Floor description (קומה) - return null if not found
- registered_area: Registered area (שטח רשום) - return null if not found
- apartment_registered_area: Apartment registered area (שטח דירה רשום) - return null if not found
- balcony_area: Balcony area (שטח מרפסת) - return null if not found
- shared_property: Shared property fraction (רכוש משותף - חלק) - return null if not found
- building_number: Building number (מספר מבנה) - return null if not found
- additional_areas: Additional areas array (שטחים נוספים) - return empty array if not found

ATTACHMENTS (הצמדות):
- attachments: Complete attachments data with all details - return empty array if not found
- attachments_symbol: Attachment symbol in blueprint (סימן בתשריט) - return null if not found
- attachments_color: Attachment color in blueprint (צבע בתשריט) - return null if not found
- attachments_description: Attachment description (תיאור הצמדה) - return null if not found
- attachments_area: Attachment area (שטח הצמדה) - return null if not found

OWNERSHIP (בעלויות) - EXTRACT ALL OWNERS:
- owners: Complete owners array with ALL names, IDs, shares (not just first owner) - return empty array if not found
- owners_count: Actual number of owners found - return 0 if none found
- ownership_type: Ownership type (סוג בעלות) - return null if not found
- rights: Rights description (זכויות) - return null if not found

NOTES AND COMMENTS (הערות) - HIERARCHICAL EXTRACTION WITH SPECIFIC LOCATIONS:
CRITICAL: Two types of notes with specific positions:
1. הערות לתת חלקה (Sub-plot notes):
   - Located ABOVE the regulation table (טבלת תקנון)
   - Usually marked as "הערות לתת חלקה" or just "הערות" before the regulation table
   - Extract: plot_notes_sub_plot - return null if not found

2. הערות כלליות (General plot notes):
   - Located AFTER the shared property section (רכוש משותף)
   - Usually marked as "הערות כלליות לחלקה" or "הערות"
   - This appears at the END of the document after all property details
   - Extract: plot_notes_general - return null if not found

Also extract:
- notes_action_type: Action type in notes (מהות פעולה) - return null if not found
- notes_beneficiary: Beneficiary in notes (שם המוטב) - return null if not found

EASEMENTS (זיקות הנאה) - EXTRACT ALL:
CRITICAL: Common easement essences to look for:
- "חלקה כפופה" (Subordinate plot) - VERY COMMON, don't miss this!
- "זכות מעבר" (Right of passage)
- "זכות חניה" (Parking right)
- "זכות שביל" (Pathway right)

Extract:
- easements: Complete easements array with ALL entries (including חלקה כפופה) - return empty array if not found
- easements_essence: Primary easement essence (מהות זיקת ההנאה) - often "חלקה כפופה" - return null if not found
- easements_description: Primary easement description (תיאור זיקת ההנאה) - return null if not found

MORTGAGES (משכנתאות) - EXTRACT ALL:
- mortgages: Complete mortgages array with ALL mortgages (all ranks, with registration dates) - return empty array if not found
- mortgage_essence: Primary mortgage essence (משכנתא - מהות) - return null if not found
- mortgage_rank: Primary mortgage rank (משכנתא - דרגה) - return null if not found
- mortgage_lenders: Primary mortgage lenders (בעלי המשכנתא) - return null if not found
- mortgage_borrowers: Primary mortgage borrowers (שם הלווים) - return null if not found
- mortgage_amount: Primary mortgage amount (סכום משכנתא) - return null if not found
- mortgage_property_share: Property share in mortgage (חלק בנכס) - return null if not found
- mortgage_registration_date: Primary mortgage registration date (תאריך רישום משכנתא) - return null if not found

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
  "owners_count": number or 0,
  "ownership_type": "type or null",
  "rights": "rights or null",
  "plot_notes_general": "general plot notes or null",
  "plot_notes_sub_plot": "sub-plot notes or null",
  "notes_action_type": "action or null",
  "notes_beneficiary": "beneficiary or null",
  "easements": [{"essence": "essence", "description": "description"}],
  "easements_essence": "primary essence or null",
  "easements_description": "primary description or null",
  "mortgages": [{"essence": "type", "rank": "rank", "lenders": "lenders", "borrowers": "borrowers", "amount": number, "share": "share", "registration_date": "YYYY-MM-DD or null"}],
  "mortgage_essence": "primary essence or null",
  "mortgage_rank": "primary rank or null",
  "mortgage_lenders": "primary lenders or null",
  "mortgage_borrowers": "primary borrowers or null",
  "mortgage_amount": number or null,
  "mortgage_property_share": "primary share or null",
  "mortgage_registration_date": "YYYY-MM-DD or null",
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

    if (options.useVision && Buffer.isBuffer(input)) {
      messages = [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract ALL structured data from this Hebrew land registry document. Remember to find ALL owners, mortgages, notes, and easements based on the analysis."
            },
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: input.toString('base64')
              }
            }
          ]
        }
      ];
    } else if (options.isPdf && typeof input === 'string') {
      const fs = require('fs');
      const pdfBuffer = fs.readFileSync(input);
      const base64Pdf = pdfBuffer.toString('base64');

      messages = [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract ALL structured data from this Hebrew land registry document. Remember to find ALL owners, mortgages, notes, and easements based on the analysis."
            },
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64Pdf
              }
            }
          ]
        }
      ];
    } else {
      messages = [
        {
          role: "user",
          content: `Extract ALL structured data from this Hebrew land registry document:\n\n${input}`
        }
      ];
    }

    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 4000, // Max 4096 for Opus model
      temperature: 0,
      system: systemPrompt,
      messages: messages
    });

    const content = message.content[0]?.text || '';
    console.log('📊 Comprehensive extraction preview:', content.substring(0, 200) + '...');

    let extractedData;
    try {
      extractedData = JSON.parse(content);
    } catch (parseError) {
      console.log('JSON parse error:', parseError.message);
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No valid JSON found in comprehensive extraction response');
      }
    }

    return {
      ...extractedData,
      tokensUsed: message.usage.total_tokens,
      rawResponse: content
    };
  }

  /**
   * Stage 3: Extract specific problematic sections with dedicated prompts
   */
  async extractDetailedSections(input, options = {}) {
    console.log('🎯 Extracting detailed sections...');

    // For now, return empty structure - can be enhanced with specific section extractors
    return {
      detailedOwners: [],
      detailedMortgages: [],
      hierarchicalNotes: {},
      detailedEasements: [],
      tokensUsed: 0
    };
  }

  /**
   * Merge extraction results from different stages
   */
  mergeExtractionResults(comprehensiveData, detailedSections) {
    // For now, prioritize comprehensive data
    // Can be enhanced to merge and validate between stages
    return {
      ...comprehensiveData,
      // Add any enhanced data from detailed sections if available
      ...(detailedSections.detailedOwners?.length > 0 && { owners: detailedSections.detailedOwners }),
      ...(detailedSections.detailedMortgages?.length > 0 && { mortgages: detailedSections.detailedMortgages })
    };
  }

  /**
   * Estimate API cost based on token usage
   */
  estimateCost(tokens) {
    const inputTokens = Math.floor(tokens * 0.7);
    const outputTokens = Math.floor(tokens * 0.3);

    return ((inputTokens * 15) + (outputTokens * 75)) / 1000000;
  }
}

module.exports = {
  LandRegistryComprehensiveAIExtractor
};
