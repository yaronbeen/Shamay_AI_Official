#!/usr/bin/env node

/**
 * Script to process צו בית משותף (Shared Building Order) documents
 * Uses MarkItDown + Anthropic AI for high-accuracy extraction
 * Based on the tabu folder architecture for better PDF conversion
 */

import { processSharedBuildingDocument } from './shared-building-order/index.js';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const pdfPath = process.argv[2];
  
  if (!pdfPath) {
    console.log('Usage: node process-shared-building-markitdown.js <path-to-pdf>');
    console.log('Example: node process-shared-building-markitdown.js "/mnt/c/Users/dell/Documents/Projects/Shamay/שומות שווי שוק/שומה מלאה/צו רישום.pdf"');
    console.log('Example: node process-shared-building-markitdown.js "צו-רישום.pdf"');
    process.exit(1);
  }
  
  if (!fs.existsSync(pdfPath)) {
    console.error(`❌ File not found: ${pdfPath}`);
    
    // Show available PDF files in current directory
    console.log('Available PDF files in current directory:');
    const pdfFiles = fs.readdirSync('.').filter(f => f.toLowerCase().endsWith('.pdf'));
    if (pdfFiles.length > 0) {
      pdfFiles.forEach(file => console.log(`  - ${file}`));
    } else {
      console.log('  No PDF files found in current directory');
    }
    
    process.exit(1);
  }
  
  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY not found in environment variables');
    console.log('Please add your Anthropic API key to your .env file:');
    console.log('ANTHROPIC_API_KEY=your_api_key_here');
    process.exit(1);
  }
  
  try {
    console.log(`🚀 Processing shared building order document: ${pdfPath}`);
    console.log('📋 Processing pipeline: PDF → MarkItDown → Claude Opus → Database');
    
    const startTime = Date.now();
    
    // Process with AI extraction and database save
    const results = await processSharedBuildingDocument(pdfPath, 'output', {
      useAI: true,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      saveToDatabase: true
    });
    
    const totalTime = Date.now() - startTime;
    
    console.log(`\n✨ Processing completed in ${totalTime}ms!`);
    
    // Display detailed results
    console.log(`\n📊 Extraction Results:`);
    console.log(`  Overall Confidence: ${results.fields.overallConfidence.toFixed(1)}%`);
    console.log(`  Database ID: ${results.database?.id || 'Not saved'}`);
    console.log(`  Markdown saved: ${results.conversion.outputPath}`);
    
    console.log(`\n📋 Extracted Fields:`);
    console.log(`  Order Issue Date: ${results.fields.order_issue_date?.value || 'Not found'} (${results.fields.order_issue_date?.confidence.toFixed(1)}%)`);
    console.log(`  Building Description: ${results.fields.building_description?.value || 'Not found'} (${results.fields.building_description?.confidence.toFixed(1)}%)`);
    console.log(`  Building Address: ${results.fields.building_address?.value || 'Not found'} (${results.fields.building_address?.confidence.toFixed(1)}%)`);
    console.log(`  Building Floors: ${results.fields.building_floors?.value || 'Not found'} (${results.fields.building_floors?.confidence.toFixed(1)}%)`);
    console.log(`  Building Sub-plots: ${results.fields.building_sub_plots_count?.value || 'Not found'} (${results.fields.building_sub_plots_count?.confidence.toFixed(1)}%)`);
    console.log(`  Total Sub-plots: ${results.fields.total_sub_plots?.value || 'Not found'} (${results.fields.total_sub_plots?.confidence.toFixed(1)}%)`);
    console.log(`  Sub-plots Details: ${results.fields.sub_plots?.count || 0} found (${results.fields.sub_plots?.confidence.toFixed(1)}%)`);
    
    if (results.fields.sub_plots?.value && results.fields.sub_plots.value.length > 0) {
      console.log(`\n🏠 Sub-plot Details:`);
      results.fields.sub_plots.value.slice(0, 5).forEach((subPlot, index) => {
        console.log(`  ${index + 1}. Sub-plot ${subPlot.sub_plot_number}: ${subPlot.description}`);
        console.log(`     Floor: ${subPlot.floor || 'Not specified'}, Area: ${subPlot.area ? subPlot.area + ' m²' : 'Not specified'}`);
      });
      
      if (results.fields.sub_plots.value.length > 5) {
        console.log(`     ... and ${results.fields.sub_plots.value.length - 5} more sub-plots`);
      }
    }
    
    console.log(`\n🎯 Confidence Analysis:`);
    const fields = ['order_issue_date', 'building_description', 'building_address', 'building_floors', 'building_sub_plots_count', 'total_sub_plots'];
    fields.forEach(field => {
      const fieldData = results.fields[field];
      if (fieldData) {
        const confidence = fieldData.confidence || 0;
        const status = confidence > 80 ? '🟢' : confidence > 60 ? '🟡' : '🔴';
        console.log(`  ${field}: ${confidence.toFixed(1)}% ${status}`);
      }
    });
    
    console.log(`\n💰 API Usage:`);
    console.log(`  Tokens used: ${results.fields.tokensUsed || 'N/A'}`);
    console.log(`  Estimated cost: $${results.fields.cost ? results.fields.cost.toFixed(4) : 'N/A'}`);
    
    console.log(`\n📄 Processing Performance:`);
    console.log(`  PDF → Markdown: ${results.conversion.processingTimeMs}ms`);
    console.log(`  AI Extraction: ${results.fields.processingTime || 0}ms`);
    console.log(`  Characters processed: ${results.conversion.characterCount.toLocaleString()}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Processing failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}