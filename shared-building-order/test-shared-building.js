#!/usr/bin/env node

/**
 * Shared Building Order Test Script
 * Interactive CLI tool to test Hebrew shared building order document processing (צו רישום בית משותף)
 */

import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { SharedBuildingAIExtractor } from './ai-field-extractor.js';
import { SharedBuildingDatabaseClient } from './database-client.js';

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
  console.log('🏢 Shared Building Order Processing Test (צו רישום בית משותף)');
  console.log('===========================================================\n');

  try {
    // Get document path from user
    const documentPath = await question('📄 Enter the path to your Hebrew shared building order document (PDF): ');
    
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
    console.log('⏳ Extracting shared building data using Anthropic AI...\n');

    // Initialize AI extractor
    const extractor = new SharedBuildingAIExtractor();
    
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
      'building_name', 'gush', 'chelka', 'sub_chelka', 'building_address',
      'registration_date', 'committee_decision_date', 'total_apartments',
      'total_shared_area', 'management_company'
    ];

    keyFields.forEach(field => {
      const value = extractionResults[field];
      if (value && value.value !== null) {
        console.log(`${field}: ${value.value} (${value.confidence.toFixed(1)}% confidence)`);
      }
    });

    // Show apartment details if available
    if (extractionResults.apartment_details && extractionResults.apartment_details.length > 0) {
      console.log(`\nApartment Details: ${extractionResults.apartment_details.length} units found`);
    }

    // Show shared areas if available
    if (extractionResults.shared_areas && extractionResults.shared_areas.length > 0) {
      console.log(`Shared Areas: ${extractionResults.shared_areas.length} areas defined`);
    }

    // Ask if user wants to save to database
    const saveToDb = await question('\n💾 Save results to database? (y/n): ');
    
    if (saveToDb.toLowerCase() === 'y') {
      console.log('\n📥 Saving to database...');
      
      const db = new SharedBuildingDatabaseClient();
      
      // Prepare data for database
      const dbData = {
        building_name: extractionResults.building_name?.value,
        gush: extractionResults.gush?.value,
        chelka: extractionResults.chelka?.value,
        sub_chelka: extractionResults.sub_chelka?.value,
        building_address: extractionResults.building_address?.value,
        registration_date: extractionResults.registration_date?.value,
        committee_decision_date: extractionResults.committee_decision_date?.value,
        total_apartments: extractionResults.total_apartments?.value,
        total_shared_area: extractionResults.total_shared_area?.value,
        management_company: extractionResults.management_company?.value,
        apartment_details: extractionResults.apartment_details || [],
        shared_areas: extractionResults.shared_areas || [],
        management_rules: extractionResults.management_rules?.value,
        special_provisions: extractionResults.special_provisions?.value,
        confidence_scores: {
          building_info: Math.max(
            extractionResults.building_name?.confidence || 0,
            extractionResults.building_address?.confidence || 0
          ) / 100,
          location_info: Math.max(
            extractionResults.gush?.confidence || 0,
            extractionResults.chelka?.confidence || 0,
            extractionResults.sub_chelka?.confidence || 0
          ) / 100,
          registration_info: Math.max(
            extractionResults.registration_date?.confidence || 0,
            extractionResults.committee_decision_date?.confidence || 0
          ) / 100,
          apartment_info: Math.max(
            extractionResults.total_apartments?.confidence || 0,
            extractionResults.apartment_details?.length > 0 ? 80 : 0
          ) / 100,
          shared_areas_info: Math.max(
            extractionResults.total_shared_area?.confidence || 0,
            extractionResults.shared_areas?.length > 0 ? 80 : 0
          ) / 100,
          management_info: Math.max(
            extractionResults.management_company?.confidence || 0,
            extractionResults.management_rules?.confidence || 0
          ) / 100,
          overall: extractionResults.overallConfidence / 100
        },
        extraction_contexts: {
          building_info: 'Extracted from document header and building information section',
          location_info: 'Extracted from property location details',
          registration_info: 'Extracted from registration and committee decision sections',
          apartment_info: 'Extracted from apartment listing and details',
          shared_areas_info: 'Extracted from shared areas and common property sections',
          management_info: 'Extracted from management and rules sections'
        },
        processingTime: processingTime,
        raw_text: extractionResults.rawResponse
      };
      
      const result = await db.insertSharedBuildingExtract(dbData, path.basename(documentPath));
      await db.disconnect();
      
      console.log(`✅ Record saved with ID: ${result.id}`);
      console.log(`📅 Created at: ${result.created_at}`);
    }

    // Ask if user wants to see detailed apartment breakdown
    const showDetails = await question('\n🏠 Show apartment details? (y/n): ');
    
    if (showDetails.toLowerCase() === 'y' && extractionResults.apartment_details && extractionResults.apartment_details.length > 0) {
      console.log('\n🏠 APARTMENT DETAILS:');
      console.log('====================');
      extractionResults.apartment_details.forEach((apt, index) => {
        console.log(`Apartment ${index + 1}:`);
        console.log(`  - Number: ${apt.apartment_number || 'N/A'}`);
        console.log(`  - Floor: ${apt.floor || 'N/A'}`);
        console.log(`  - Area: ${apt.area || 'N/A'}`);
        console.log(`  - Share: ${apt.shared_percentage || 'N/A'}`);
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