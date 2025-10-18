#!/usr/bin/env node

/**
 * Garmushka Management Test Script
 * Interactive CLI tool to test Hebrew Garmushka document processing (גרמושקה)
 */

import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { GarmushkaAIExtractor } from './ai-field-extractor.js';
import { GarmushkaDatabaseClient } from './database-client.js';

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
  console.log('📊 Garmushka Processing Test (גרמושקה)');
  console.log('=====================================\n');

  try {
    // Get document path from user
    const documentPath = await question('📄 Enter the path to your Hebrew Garmushka document (PDF): ');
    
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
    console.log('⏳ Extracting Garmushka data using Anthropic AI...\n');

    // Initialize AI extractor
    const extractor = new GarmushkaAIExtractor();
    
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
      'report_date', 'report_type', 'reporting_period', 'company_name',
      'company_id', 'report_id', 'total_units', 'total_value',
      'currency', 'reporting_entity'
    ];

    keyFields.forEach(field => {
      const value = extractionResults[field];
      if (value && value.value !== null) {
        console.log(`${field}: ${value.value} (${value.confidence.toFixed(1)}% confidence)`);
      }
    });

    // Show line items if available
    if (extractionResults.line_items && extractionResults.line_items.length > 0) {
      console.log(`\nLine Items: ${extractionResults.line_items.length} entries found`);
    }

    // Show summary totals if available
    if (extractionResults.summary_totals) {
      console.log(`Summary Totals: Available`);
    }

    // Ask if user wants to save to database
    const saveToDb = await question('\n💾 Save results to database? (y/n): ');
    
    if (saveToDb.toLowerCase() === 'y') {
      console.log('\n📥 Saving to database...');
      
      const db = new GarmushkaDatabaseClient();
      
      // Prepare data for database
      const dbData = {
        report_date: extractionResults.report_date?.value,
        report_type: extractionResults.report_type?.value,
        reporting_period: extractionResults.reporting_period?.value,
        company_name: extractionResults.company_name?.value,
        company_id: extractionResults.company_id?.value,
        report_id: extractionResults.report_id?.value,
        reporting_entity: extractionResults.reporting_entity?.value,
        total_units: extractionResults.total_units?.value,
        total_value: extractionResults.total_value?.value,
        currency: extractionResults.currency?.value,
        line_items: extractionResults.line_items || [],
        summary_totals: extractionResults.summary_totals || {},
        categories_breakdown: extractionResults.categories_breakdown || {},
        validation_status: extractionResults.validation_status?.value,
        audit_notes: extractionResults.audit_notes?.value,
        discrepancies_found: extractionResults.discrepancies_found || [],
        confidence_scores: {
          document_header: Math.max(
            extractionResults.report_date?.confidence || 0,
            extractionResults.report_type?.confidence || 0,
            extractionResults.reporting_period?.confidence || 0
          ) / 100,
          company_info: Math.max(
            extractionResults.company_name?.confidence || 0,
            extractionResults.company_id?.confidence || 0,
            extractionResults.reporting_entity?.confidence || 0
          ) / 100,
          financial_data: Math.max(
            extractionResults.total_units?.confidence || 0,
            extractionResults.total_value?.confidence || 0,
            extractionResults.currency?.confidence || 0
          ) / 100,
          line_items: extractionResults.line_items?.length > 0 ? 0.8 : 0,
          summary_data: Object.keys(extractionResults.summary_totals || {}).length > 0 ? 0.8 : 0,
          overall: extractionResults.overallConfidence / 100
        },
        extraction_contexts: {
          document_header: 'Extracted from report header and metadata',
          company_info: 'Extracted from company identification section',
          financial_data: 'Extracted from financial totals and currency information',
          line_items: 'Extracted from detailed transaction/item listings',
          summary_data: 'Extracted from summary and totals sections'
        },
        processingTime: processingTime,
        raw_text: extractionResults.rawResponse
      };
      
      const result = await db.insertGarmushkaExtract(dbData, path.basename(documentPath));
      await db.disconnect();
      
      console.log(`✅ Record saved with ID: ${result.id}`);
      console.log(`📅 Created at: ${result.created_at}`);
    }

    // Ask if user wants to see line items breakdown
    const showLineItems = await question('\n📋 Show line items breakdown? (y/n): ');
    
    if (showLineItems.toLowerCase() === 'y' && extractionResults.line_items && extractionResults.line_items.length > 0) {
      console.log('\n📋 LINE ITEMS BREAKDOWN:');
      console.log('=======================');
      extractionResults.line_items.forEach((item, index) => {
        console.log(`Item ${index + 1}:`);
        console.log(`  - Description: ${item.description || 'N/A'}`);
        console.log(`  - Category: ${item.category || 'N/A'}`);
        console.log(`  - Quantity: ${item.quantity || 'N/A'}`);
        console.log(`  - Unit Price: ${item.unit_price || 'N/A'}`);
        console.log(`  - Total Value: ${item.total_value || 'N/A'}`);
        console.log('');
      });
    }

    // Ask if user wants to see summary totals
    const showSummary = await question('💰 Show summary totals? (y/n): ');
    
    if (showSummary.toLowerCase() === 'y' && extractionResults.summary_totals) {
      console.log('\n💰 SUMMARY TOTALS:');
      console.log('==================');
      Object.entries(extractionResults.summary_totals).forEach(([key, value]) => {
        if (value && value.toString().trim()) {
          console.log(`${key.replace('_', ' ').toUpperCase()}: ${value}`);
        }
      });
    }

    // Ask if user wants to see categories breakdown
    const showCategories = await question('📊 Show categories breakdown? (y/n): ');
    
    if (showCategories.toLowerCase() === 'y' && extractionResults.categories_breakdown) {
      console.log('\n📊 CATEGORIES BREAKDOWN:');
      console.log('=======================');
      Object.entries(extractionResults.categories_breakdown).forEach(([category, data]) => {
        console.log(`${category}:`);
        if (typeof data === 'object') {
          Object.entries(data).forEach(([subkey, subvalue]) => {
            console.log(`  - ${subkey}: ${subvalue}`);
          });
        } else {
          console.log(`  - Value: ${data}`);
        }
        console.log('');
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