/**
 * Process Shared Building Order PDF using Anthropic Vision API
 * This sends the actual PDF to Anthropic for visual table extraction
 */

import { SharedBuildingAIExtractor } from './shared-building-order/ai-field-extractor.js';
import { SharedBuildingDatabaseClient } from './src/lib/shared-building-db-client.js';
import fs from 'fs';
import path from 'path';

async function processSharedBuildingPDFWithVision() {
  const pdfPath = '/mnt/c/Users/dell/Documents/Projects/Shamay/שומות שווי שוק/שומה מלאה/צו רישום.pdf';
  const filename = path.basename(pdfPath);
  
  try {
    console.log('🔍 Processing shared building order PDF with Anthropic Vision...');
    console.log(`📄 File: ${filename}`);
    
    // Read the actual PDF file as buffer
    console.log('📖 Reading PDF file...');
    const pdfBuffer = fs.readFileSync(pdfPath);
    console.log(`📊 PDF size: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);
    
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

    // Initialize AI extractor
    const extractor = new SharedBuildingAIExtractor();
    
    // Extract fields using Anthropic Vision API with the actual PDF
    console.log('👁️  Extracting fields using Anthropic Vision API...');
    const extractionResults = await extractor.extractAllFields(pdfBuffer, { 
      useVision: true 
    });
    
    console.log('✅ Field extraction completed');
    console.log(`📊 Overall confidence: ${extractionResults.overallConfidence?.toFixed(1)}%`);
    
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
      
      raw_text: `PDF processed with vision API - ${pdfBuffer.length} bytes`,
      extraction_method: 'anthropic_vision_api',
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
    
    // Show sample sub-plot data if available
    if (extractionResults.sub_plots?.value && extractionResults.sub_plots.value.length > 0) {
      console.log('\n📋 Sample sub-plot data:');
      console.log(JSON.stringify(extractionResults.sub_plots.value[0], null, 2));
    }
    
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
processSharedBuildingPDFWithVision()
  .then(result => {
    console.log('✅ All done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  });