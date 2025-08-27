#!/usr/bin/env node

/**
 * Comparable Data Test Script
 * Interactive CLI tool to test Hebrew comparable property data document processing (נתוני השוואה)
 */

import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { ComparableDataAIExtractor } from './ai-field-extractor.js';
import { ComparableDataDatabaseClient } from './database-client.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('📊 Comparable Data Processing Test (נתוני השוואה)');
  console.log('===============================================\n');

  try {
    // Get document path from user
    const documentPath = await question('📄 Enter the path to your Hebrew comparable data document (PDF): ');
    
    // Validate file exists
    if (!fs.existsSync(documentPath)) {
      console.error('❌ File not found:', documentPath);
      process.exit(1);
    }

    const fileExtension = path.extname(documentPath).toLowerCase();
    if (fileExtension !== '.pdf') {
      console.error('❌ Only PDF files are supported');
      process.exit(1);
    }

    console.log(`\n📋 Processing: ${path.basename(documentPath)}`);
    console.log('⏳ Extracting comparable data using Anthropic AI...\n');

    // Initialize AI extractor
    const extractor = new ComparableDataAIExtractor();
    
    // Extract fields from PDF
    const startTime = Date.now();
    const extractionResults = await extractor.extractAllFields(documentPath, { isPdf: true });
    const processingTime = Date.now() - startTime;

    console.log('✅ Extraction completed!\n');
    console.log('📊 EXTRACTION RESULTS:');
    console.log('=====================');
    console.log(`Processing Time: ${processingTime}ms`);
    console.log(`Overall Confidence: ${extractionResults.overallConfidence.toFixed(1)}%`);
    console.log(`Tokens Used: ${extractionResults.tokensUsed}`);
    console.log(`Estimated Cost: $${extractionResults.cost.toFixed(4)}\n`);

    // Display extracted fields
    console.log('📝 EXTRACTED FIELDS:');
    console.log('===================');
    
    const keyFields = [
      'report_date', 'valuation_date', 'property_address', 'gush', 'chelka',
      'property_type', 'total_area', 'built_area', 'rooms_count',
      'parking_spaces', 'balcony_area', 'storage_area'
    ];

    keyFields.forEach(field => {
      const value = extractionResults[field];
      if (value && value.value !== null) {
        console.log(`${field}: ${value.value} (${value.confidence.toFixed(1)}% confidence)`);
      }
    });

    // Show comparable properties if available
    if (extractionResults.comparable_properties && extractionResults.comparable_properties.length > 0) {
      console.log(`\nComparable Properties: ${extractionResults.comparable_properties.length} properties found`);
    }

    // Show market analysis if available
    if (extractionResults.market_analysis) {
      console.log(`Market Analysis: Available`);
    }

    // Ask if user wants to save to database
    const saveToDb = await question('\n💾 Save results to database? (y/n): ');
    
    if (saveToDb.toLowerCase() === 'y') {
      console.log('\n📥 Saving to database...');
      
      const db = new ComparableDataDatabaseClient();
      
      // Prepare data for database
      const dbData = {
        report_date: extractionResults.report_date?.value,
        valuation_date: extractionResults.valuation_date?.value,
        property_address: extractionResults.property_address?.value,
        gush: extractionResults.gush?.value,
        chelka: extractionResults.chelka?.value,
        sub_chelka: extractionResults.sub_chelka?.value,
        property_type: extractionResults.property_type?.value,
        total_area: extractionResults.total_area?.value,
        built_area: extractionResults.built_area?.value,
        rooms_count: extractionResults.rooms_count?.value,
        floor: extractionResults.floor?.value,
        parking_spaces: extractionResults.parking_spaces?.value,
        balcony_area: extractionResults.balcony_area?.value,
        storage_area: extractionResults.storage_area?.value,
        property_age: extractionResults.property_age?.value,
        building_condition: extractionResults.building_condition?.value,
        comparable_properties: extractionResults.comparable_properties || [],
        market_analysis: extractionResults.market_analysis || {},
        valuation_method: extractionResults.valuation_method?.value,
        estimated_value: extractionResults.estimated_value?.value,
        value_per_sqm: extractionResults.value_per_sqm?.value,
        confidence_scores: {
          basic_info: Math.max(
            extractionResults.report_date?.confidence || 0,
            extractionResults.valuation_date?.confidence || 0,
            extractionResults.property_address?.confidence || 0
          ) / 100,
          location_info: Math.max(
            extractionResults.gush?.confidence || 0,
            extractionResults.chelka?.confidence || 0
          ) / 100,
          property_details: Math.max(
            extractionResults.property_type?.confidence || 0,
            extractionResults.total_area?.confidence || 0,
            extractionResults.built_area?.confidence || 0,
            extractionResults.rooms_count?.confidence || 0
          ) / 100,
          comparable_data: extractionResults.comparable_properties?.length > 0 ? 0.8 : 0,
          valuation_info: Math.max(
            extractionResults.estimated_value?.confidence || 0,
            extractionResults.value_per_sqm?.confidence || 0,
            extractionResults.valuation_method?.confidence || 0
          ) / 100,
          overall: extractionResults.overallConfidence / 100
        },
        extraction_contexts: {
          basic_info: 'Extracted from report header and basic information',
          location_info: 'Extracted from property location details',
          property_details: 'Extracted from property characteristics section',
          comparable_data: 'Extracted from comparable properties table/section',
          valuation_info: 'Extracted from valuation conclusions and methodology'
        },
        processingTime: processingTime,
        raw_text: extractionResults.rawResponse
      };
      
      const result = await db.insertComparableDataExtract(dbData, path.basename(documentPath));
      await db.disconnect();
      
      console.log(`✅ Record saved with ID: ${result.id}`);
      console.log(`📅 Created at: ${result.created_at}`);
    }

    // Ask if user wants to see comparable properties breakdown
    const showComparables = await question('\n🏘️ Show comparable properties? (y/n): ');
    
    if (showComparables.toLowerCase() === 'y' && extractionResults.comparable_properties && extractionResults.comparable_properties.length > 0) {
      console.log('\n🏘️ COMPARABLE PROPERTIES:');
      console.log('========================');
      extractionResults.comparable_properties.forEach((comp, index) => {
        console.log(`Property ${index + 1}:`);
        console.log(`  - Address: ${comp.address || 'N/A'}`);
        console.log(`  - Sale Date: ${comp.sale_date || 'N/A'}`);
        console.log(`  - Sale Price: ${comp.sale_price || 'N/A'}`);
        console.log(`  - Area: ${comp.area || 'N/A'}`);
        console.log(`  - Price per SQM: ${comp.price_per_sqm || 'N/A'}`);
        console.log('');
      });
    }

    // Ask if user wants to see market analysis
    const showAnalysis = await question('📈 Show market analysis? (y/n): ');
    
    if (showAnalysis.toLowerCase() === 'y' && extractionResults.market_analysis) {
      console.log('\n📈 MARKET ANALYSIS:');
      console.log('==================');
      Object.entries(extractionResults.market_analysis).forEach(([key, value]) => {
        if (value && value.toString().trim()) {
          console.log(`${key.replace('_', ' ').toUpperCase()}: ${value}`);
        }
      });
    }

    console.log('\n🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    rl.close();
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n👋 Test cancelled by user');
  rl.close();
  process.exit(0);
});

main().catch(console.error);