#!/usr/bin/env node

/**
 * Land Registry Test Script
 * Interactive CLI tool to test Hebrew land registry document processing (נסח טאבו)
 */

import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { processLandRegistryDocument } from './index.js';

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
  console.log('📋 Land Registry Processing Test (נסח טאבו)');
  console.log('============================================\n');

  try {
    // Get document path from user
    const documentPath = '/mnt/c/Users/dell/CascadeProjects/Shamay-slow/test_documents/land_registry_tabu.pdf';
    
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
    console.log('⏳ Extracting land registry data using Anthropic AI...\n');

    // Process the document
    const startTime = Date.now();
    const results = await processLandRegistryDocument(documentPath, {
      useAI: true,
      saveToDatabase: true
    });
    const totalTime = Date.now() - startTime;

    if (!results.success) {
      console.error('❌ Processing failed:', results.error);
      return;
    }

    console.log('✅ Processing completed!\n');
    console.log('📊 PROCESSING RESULTS:');
    console.log('=====================');
    console.log(`File: ${results.filename}`);
    console.log(`Total Processing Time: ${totalTime}ms`);
    console.log(`AI Processing Time: ${results.summary.processingTime}ms`);
    console.log(`Overall Confidence: ${results.summary.overallConfidence.toFixed(1)}%`);
    console.log(`Fields Extracted: ${results.summary.fieldsExtracted}/${results.summary.totalFields}`);
    console.log(`Completeness: ${results.summary.completeness.toFixed(1)}%`);
    console.log(`Tokens Used: ${results.costs.tokensUsed}`);
    console.log(`Estimated Cost: $${results.costs.estimatedCost.toFixed(4)}\n`);

    // Display key extracted fields
    console.log('📝 KEY EXTRACTED FIELDS:');
    console.log('=======================');
    
    const keyFields = ['gush', 'chelka', 'sub_chelka', 'apartment_area'];
    keyFields.forEach(field => {
      const value = results.extractionResults[field];
      if (value && value.value !== null) {
        console.log(`${field}: ${value.value} (${value.confidence.toFixed(1)}% confidence)`);
      }
    });

    // Display additional comprehensive fields
    if (results.extractionResults.registration_office) {
      console.log(`Registration Office: ${results.extractionResults.registration_office}`);
    }
    if (results.extractionResults.issue_date) {
      console.log(`Issue Date: ${results.extractionResults.issue_date}`);
    }
    if (results.extractionResults.address_from_tabu) {
      console.log(`Address: ${results.extractionResults.address_from_tabu}`);
    }
    if (results.extractionResults.owners && results.extractionResults.owners.length > 0) {
      console.log(`Owners Count: ${results.extractionResults.owners.length}`);
    }
    if (results.extractionResults.attachments && results.extractionResults.attachments.length > 0) {
      console.log(`Attachments: ${results.extractionResults.attachments.length} items`);
    }

    // Show database result if saved
    if (results.databaseResult) {
      console.log('\n💾 DATABASE STORAGE:');
      console.log('==================');
      console.log(`Record ID: ${results.databaseResult.id}`);
      console.log(`Created: ${results.databaseResult.created_at}`);
    }

    // Show confidence breakdown
    console.log('\n📈 CONFIDENCE BREAKDOWN:');
    console.log('=======================');
    const confidenceData = results.extractionResults.confidence_scores || {};
    Object.entries(confidenceData).forEach(([category, score]) => {
      if (typeof score === 'number') {
        console.log(`${category.replace('_', ' ').toUpperCase()}: ${(score * 100).toFixed(1)}%`);
      }
    });

    // Ask if user wants to see full extraction contexts
    const showContexts = await question('\n🔍 Show extraction contexts? (y/n): ');
    
    if (showContexts.toLowerCase() === 'y') {
      console.log('\n📋 EXTRACTION CONTEXTS:');
      console.log('======================');
      const contexts = results.extractionResults.extraction_contexts || {};
      Object.entries(contexts).forEach(([field, context]) => {
        if (context && context.trim()) {
          console.log(`${field}: ${context}`);
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