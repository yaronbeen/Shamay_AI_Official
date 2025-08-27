#!/usr/bin/env node

/**
 * Building Permits Test Script
 * Interactive CLI tool to test Hebrew building permit document processing
 */

import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { BuildingPermitAIExtractor } from './ai-field-extractor.js';
import { BuildingPermitDatabaseClient } from './database-client.js';

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
  console.log('🏗️  Building Permits Processing Test');
  console.log('=====================================\n');

  try {
    // Get document path from user
    const documentPath = '/mnt/c/Users/dell/CascadeProjects/Shamay-slow/test_documents/building_permit_1.PDF';
    
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
    console.log('⏳ Extracting building permit data using Anthropic AI...\n');

    // Initialize AI extractor
    const extractor = new BuildingPermitAIExtractor();
    
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
    
    const fields = [
      'permit_number', 'issue_date', 'permit_type', 'project_description',
      'applicant_name', 'plot_address', 'gush', 'chelka', 'sub_chelka',
      'architect_name', 'engineer_name', 'committee_name'
    ];

    fields.forEach(field => {
      const value = extractionResults[field];
      if (value && value.value !== null) {
        console.log(`${field}: ${value.value} (${value.confidence.toFixed(1)}% confidence)`);
      }
    });

    // Ask if user wants to save to database
    const saveToDb = await question('\n💾 Save results to database? (y/n): ');
    
    if (saveToDb.toLowerCase() === 'y') {
      console.log('\n📥 Saving to database...');
      
      const db = new BuildingPermitDatabaseClient();
      
      // Prepare data for database
      const dbData = {
        permit_number: extractionResults.permit_number?.value,
        issue_date: extractionResults.issue_date?.value,
        permit_type: extractionResults.permit_type?.value,
        project_description: extractionResults.project_description?.value,
        applicant_name: extractionResults.applicant_name?.value,
        plot_address: extractionResults.plot_address?.value,
        gush: extractionResults.gush?.value,
        chelka: extractionResults.chelka?.value,
        sub_chelka: extractionResults.sub_chelka?.value,
        architect_name: extractionResults.architect_name?.value,
        engineer_name: extractionResults.engineer_name?.value,
        committee_name: extractionResults.committee_name?.value,
        confidence_scores: {
          permit_number: extractionResults.permit_number?.confidence / 100,
          issue_date: extractionResults.issue_date?.confidence / 100,
          permit_type: extractionResults.permit_type?.confidence / 100,
          project_description: extractionResults.project_description?.confidence / 100,
          applicant_name: extractionResults.applicant_name?.confidence / 100,
          plot_address: extractionResults.plot_address?.confidence / 100,
          location_info: Math.max(
            extractionResults.gush?.confidence || 0,
            extractionResults.chelka?.confidence || 0,
            extractionResults.sub_chelka?.confidence || 0
          ) / 100,
          professional_info: Math.max(
            extractionResults.architect_name?.confidence || 0,
            extractionResults.engineer_name?.confidence || 0
          ) / 100,
          overall: extractionResults.overallConfidence / 100
        },
        extraction_contexts: {
          permit_number: extractionResults.permit_number?.context,
          issue_date: extractionResults.issue_date?.context,
          permit_type: extractionResults.permit_type?.context,
          project_description: extractionResults.project_description?.context,
          applicant_name: extractionResults.applicant_name?.context,
          plot_address: extractionResults.plot_address?.context,
          location_info: 'Extracted from document location section',
          professional_info: 'Extracted from professional details section'
        },
        processingTime: processingTime,
        raw_text: extractionResults.rawResponse
      };
      
      const result = await db.insertBuildingPermit(extractionResults, path.basename(documentPath));
      await db.disconnect();
      
      console.log(`✅ Record saved with ID: ${result.id}`);
      console.log(`📅 Created at: ${result.created_at}`);
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