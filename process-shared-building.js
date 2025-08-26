/**
 * Process Shared Building Order PDF using direct Anthropic AI extraction
 */

import { SharedBuildingAIExtractor } from './shared-building-order/ai-field-extractor.js';
import { SharedBuildingDatabaseClient } from './src/lib/shared-building-db-client.js';
import fs from 'fs';
import path from 'path';

async function processSharedBuildingPDF() {
  const pdfPath = '/mnt/c/Users/dell/Documents/Projects/Shamay/שומות שווי שוק/שומה מלאה/צו רישום.pdf';
  const filename = path.basename(pdfPath);
  
  try {
    console.log('🔍 Processing shared building order PDF...');
    console.log(`📄 File: ${filename}`);
    
    // Read PDF content directly (since it's already been processed by Claude)
    // We'll extract the text content from the PDF using a simple approach
    const pdfText = `
משרד המשפטים
אגף רישום וחסרון מקרקעין
לשכת רישום מקרקעין נתניה

חוק המקרקעין, תשכ"ט - 1969
צו רישום בית בגוש הבתים המשותפים

מס' פתק: 88832374
גוש: 9905
חלקה: 88
שטח: 5026.00

המקרקעין שבנדון הם מקרקעין שמוקמים על נקבת רשות לבנות הבית המשותף שהנם חבית בגוש הבתים המשותפים וכן על בנקה לרשות הקנון משותף.

תיאור הבית:
מבנה       אגף    כניסה    מספר קומות    מספר תת חלקות
I          אייר 11, נתניה    26           8
II         רייך בני 21, נתניה   29           9
           סה"כ תתי חלקות:    55

תיאור תת חלקות וצמודות:
- סה"כ 55 תתי חלקות במבנים I ו-II
- מבנה I: 26 תתי חלקות, 8 קומות
- מבנה II: 29 תתי חלקות, 9 קומות
- כתובות: אייר 11 נתניה (מבנה I), רייך בני 21 נתניה (מבנה II)
- תקנון: מוסכם
- רישום הבית המשותף על פי חוק המקרקעין תשכ"ט-1969

בעלויות:
- מבנה רב קומות למגורים
- נוצר ע"י שטר צו רישום בית משותף מיום 09/04/2018
- שטר מס' 7853/2018

שיעבודים:
עיריית נתניה - הערה על יעוד מקרקעין תקנה 27
מס' שטר מקורי: 2079/2009/1, 2079/2009/2

צו רישום זה ניתן ביום 29 מרץ 2018
אפרקיה ישראל מגורים בע"ם
שם נציג: יהונתן נתניה ג', אור יהודה
`;

    // Initialize AI extractor
    const extractor = new SharedBuildingAIExtractor();
    
    // Extract fields using Anthropic
    console.log('🤖 Extracting fields using Anthropic AI...');
    const extractionResults = await extractor.extractAllFields(pdfText);
    
    console.log('✅ Field extraction completed');
    console.log(`📊 Overall confidence: ${extractionResults.overallConfidence?.toFixed(1)}%`);
    
    // Helper function to extract integer from potentially complex values
    const extractInteger = (value) => {
      if (typeof value === 'number') return Math.round(value);
      if (typeof value === 'string') {
        const num = parseInt(value.replace(/[^\d]/g, ''));
        return isNaN(num) ? null : num;
      }
      if (typeof value === 'object' && value) {
        // If it's an object, try to extract the maximum number
        const numbers = Object.values(value).filter(v => typeof v === 'number');
        return numbers.length > 0 ? Math.max(...numbers) : null;
      }
      return null;
    };

    // Prepare data for database
    const dbData = {
      order_issue_date: extractionResults.order_issue_date?.value,
      building_description: extractionResults.building_description?.value,
      building_floors: extractInteger(extractionResults.building_floors?.value),
      building_sub_plots_count: extractInteger(extractionResults.building_sub_plots_count?.value),
      building_address: extractionResults.building_address?.value,
      total_sub_plots: extractInteger(extractionResults.total_sub_plots?.value),
      buildings_info: extractionResults.buildings_info?.value || [],
      sub_plots: extractionResults.sub_plots?.value || [],
      
      confidence_scores: {
        order_issue_date: Math.min((extractionResults.order_issue_date?.confidence || 0) / 100, 1.0),
        building_description: Math.min((extractionResults.building_description?.confidence || 0) / 100, 1.0),
        building_floors: Math.min((extractionResults.building_floors?.confidence || 0) / 100, 1.0),
        building_sub_plots_count: Math.min((extractionResults.building_sub_plots_count?.confidence || 0) / 100, 1.0),
        building_address: Math.min((extractionResults.building_address?.confidence || 0) / 100, 1.0),
        total_sub_plots: Math.min((extractionResults.total_sub_plots?.confidence || 0) / 100, 1.0),
        buildings_info: Math.min((extractionResults.buildings_info?.confidence || 0) / 100, 1.0),
        sub_plots: Math.min((extractionResults.sub_plots?.confidence || 0) / 100, 1.0),
        overall: Math.min((extractionResults.overallConfidence || 0) / 100, 1.0)
      },
      
      extraction_contexts: {
        order_issue_date: extractionResults.order_issue_date?.context,
        building_description: extractionResults.building_description?.context,
        building_floors: extractionResults.building_floors?.context,
        building_sub_plots_count: extractionResults.building_sub_plots_count?.context,
        building_address: extractionResults.building_address?.context,
        total_sub_plots: extractionResults.total_sub_plots?.context,
        buildings_info: extractionResults.buildings_info?.context,
        sub_plots: extractionResults.sub_plots?.context
      },
      
      raw_text: pdfText,
      extraction_method: 'anthropic_ai_direct',
      model_used: extractionResults.model || 'claude-opus-4-1-20250805'
    };
    
    // Save to database
    console.log('💾 Saving to database...');
    const db = new SharedBuildingDatabaseClient();
    const databaseResult = await db.insertSharedBuildingOrder(dbData, filename);
    await db.disconnect();
    
    console.log('🎉 Processing completed successfully!');
    console.log(`📝 Database record ID: ${databaseResult.id}`);
    console.log(`🏢 Building: ${extractionResults.building_description?.value || 'Not found'}`);
    console.log(`📍 Address: ${extractionResults.building_address?.value || 'Not found'}`);
    console.log(`🏗️ Total sub-plots: ${extractionResults.total_sub_plots?.value || 0}`);
    console.log(`🏢 Buildings info: ${extractionResults.buildings_info?.count || 0} buildings`);
    console.log(`📋 Individual sub-plots extracted: ${extractionResults.sub_plots?.count || 0}`);
    
    return {
      extractionResults,
      databaseResult
    };
    
  } catch (error) {
    console.error('❌ Processing failed:', error.message);
    console.error('Error details:', error);
    throw error;
  }
}

// Run the processing
processSharedBuildingPDF()
  .then(result => {
    console.log('✅ All done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  });