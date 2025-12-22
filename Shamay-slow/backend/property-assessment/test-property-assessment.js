#!/usr/bin/env node

/**
 * Property Assessment Test Script
 * Interactive CLI tool to test Hebrew property assessment document processing (שומת שווי)
 */

import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { PropertyAssessmentAIExtractor } from './ai-field-extractor.js';
import { PropertyAssessmentDatabaseClient } from './database-client.js';

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
  console.log('🏡 Property Assessment Processing Test (שומת שווי)');
  console.log('=================================================\n');

  try {
    // Get document path from user
    const documentPath = await question('📄 Enter the path to your Hebrew property assessment document (PDF): ');
    
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
    console.log('⏳ Extracting property assessment data using Anthropic AI...\n');

    // Initialize AI extractor
    const extractor = new PropertyAssessmentAIExtractor();
    
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
      'assessment_date', 'valuation_date', 'assessor_name', 'assessor_license',
      'property_address', 'gush', 'chelka', 'property_type', 'total_area',
      'built_area', 'rooms_count', 'estimated_value', 'value_per_sqm'
    ];

    keyFields.forEach(field => {
      const value = extractionResults[field];
      if (value && value.value !== null) {
        console.log(`${field}: ${value.value} (${value.confidence.toFixed(1)}% confidence)`);
      }
    });

    // Show valuation methods if available
    if (extractionResults.valuation_methods && extractionResults.valuation_methods.length > 0) {
      console.log(`\nValuation Methods: ${extractionResults.valuation_methods.join(', ')}`);
    }

    // Show market adjustments if available
    if (extractionResults.market_adjustments && extractionResults.market_adjustments.length > 0) {
      console.log(`Market Adjustments: ${extractionResults.market_adjustments.length} adjustments applied`);
    }

    // Ask if user wants to save to database
    const saveToDb = await question('\n💾 Save results to database? (y/n): ');
    
    if (saveToDb.toLowerCase() === 'y') {
      console.log('\n📥 Saving to database...');
      
      const db = new PropertyAssessmentDatabaseClient();
      
      // Prepare data for database
      const dbData = {
        assessment_date: extractionResults.assessment_date?.value,
        valuation_date: extractionResults.valuation_date?.value,
        assessor_name: extractionResults.assessor_name?.value,
        assessor_license: extractionResults.assessor_license?.value,
        assessment_purpose: extractionResults.assessment_purpose?.value,
        client_name: extractionResults.client_name?.value,
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
        neighborhood_quality: extractionResults.neighborhood_quality?.value,
        accessibility_score: extractionResults.accessibility_score?.value,
        valuation_methods: extractionResults.valuation_methods || [],
        market_adjustments: extractionResults.market_adjustments || [],
        estimated_value: extractionResults.estimated_value?.value,
        value_per_sqm: extractionResults.value_per_sqm?.value,
        assessment_notes: extractionResults.assessment_notes?.value,
        confidence_scores: {
          basic_info: Math.max(
            extractionResults.assessment_date?.confidence || 0,
            extractionResults.valuation_date?.confidence || 0,
            extractionResults.assessor_name?.confidence || 0
          ) / 100,
          location_info: Math.max(
            extractionResults.gush?.confidence || 0,
            extractionResults.chelka?.confidence || 0,
            extractionResults.property_address?.confidence || 0
          ) / 100,
          property_details: Math.max(
            extractionResults.property_type?.confidence || 0,
            extractionResults.total_area?.confidence || 0,
            extractionResults.built_area?.confidence || 0,
            extractionResults.rooms_count?.confidence || 0
          ) / 100,
          valuation_info: Math.max(
            extractionResults.estimated_value?.confidence || 0,
            extractionResults.value_per_sqm?.confidence || 0
          ) / 100,
          quality_factors: Math.max(
            extractionResults.building_condition?.confidence || 0,
            extractionResults.neighborhood_quality?.confidence || 0
          ) / 100,
          overall: extractionResults.overallConfidence / 100
        },
        extraction_contexts: {
          basic_info: 'Extracted from assessment header and assessor information',
          location_info: 'Extracted from property location and identification',
          property_details: 'Extracted from property characteristics section',
          valuation_info: 'Extracted from valuation conclusions and methodology',
          quality_factors: 'Extracted from property condition and quality assessment'
        },
        processingTime: processingTime,
        raw_text: extractionResults.rawResponse
      };
      
      const result = await db.insertPropertyAssessmentExtract(dbData, path.basename(documentPath));
      await db.disconnect();
      
      console.log(`✅ Record saved with ID: ${result.id}`);
      console.log(`📅 Created at: ${result.created_at}`);
    }

    // Ask if user wants to see valuation breakdown
    const showValuation = await question('\n💰 Show valuation breakdown? (y/n): ');
    
    if (showValuation.toLowerCase() === 'y') {
      console.log('\n💰 VALUATION BREAKDOWN:');
      console.log('======================');
      
      if (extractionResults.estimated_value?.value) {
        console.log(`Final Estimated Value: ${extractionResults.estimated_value.value}`);
      }
      
      if (extractionResults.value_per_sqm?.value) {
        console.log(`Value per Square Meter: ${extractionResults.value_per_sqm.value}`);
      }
      
      if (extractionResults.valuation_methods && extractionResults.valuation_methods.length > 0) {
        console.log('\nValuation Methods Used:');
        extractionResults.valuation_methods.forEach((method, index) => {
          console.log(`  ${index + 1}. ${method}`);
        });
      }
      
      if (extractionResults.market_adjustments && extractionResults.market_adjustments.length > 0) {
        console.log('\nMarket Adjustments Applied:');
        extractionResults.market_adjustments.forEach((adjustment, index) => {
          console.log(`  ${index + 1}. ${adjustment.reason || adjustment}: ${adjustment.value || adjustment.percentage || 'N/A'}`);
        });
      }
    }

    // Ask if user wants to see quality factors
    const showQuality = await question('\n🏗️ Show quality factors? (y/n): ');
    
    if (showQuality.toLowerCase() === 'y') {
      console.log('\n🏗️ QUALITY FACTORS:');
      console.log('==================');
      
      const qualityFields = [
        'building_condition', 'neighborhood_quality', 'accessibility_score',
        'property_age', 'floor'
      ];
      
      qualityFields.forEach(field => {
        const value = extractionResults[field];
        if (value && value.value !== null) {
          console.log(`${field.replace('_', ' ').toUpperCase()}: ${value.value}`);
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