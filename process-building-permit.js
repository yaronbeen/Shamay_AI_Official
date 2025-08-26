#!/usr/bin/env node

/**
 * Script to process היתר בנייה מילולי (Hebrew Building Permit) documents
 * Uses MarkItDown + Anthropic AI for high-accuracy extraction
 * Based on the modular architecture for consistent document processing
 */

import { processBuildingPermitDocument } from './building-permits/index.js';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const pdfPath = process.argv[2];
  
  if (!pdfPath) {
    console.log('Usage: node process-building-permit.js <path-to-pdf>');
    console.log('Example: node process-building-permit.js "2139394.PDF"');
    console.log('Example: node process-building-permit.js "/path/to/building-permit.pdf"');
    process.exit(1);
  }
  
  if (!fs.existsSync(pdfPath)) {
    console.error(`❌ File not found: ${pdfPath}`);
    
    // Show available PDF files in current directory
    console.log('Available PDF files in current directory:');
    const pdfFiles = fs.readdirSync('.').filter(f => f.toLowerCase().endsWith('.pdf') || f.toLowerCase().endsWith('.PDF'));
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
    console.log(`🚀 Processing building permit document: ${pdfPath}`);
    console.log('📋 Processing pipeline: PDF → MarkItDown → Claude Opus → Database');
    
    const startTime = Date.now();
    
    // Process with AI extraction and database save
    const results = await processBuildingPermitDocument(pdfPath, 'output', {
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
    
    console.log(`\n📋 Extracted Building Permit Fields:`);
    console.log(`  Permit Number: ${results.fields.permit_number?.value || 'Not found'} (${(results.fields.permit_number?.confidence || 0).toFixed(1)}%)`);
    console.log(`  Permit Date: ${results.fields.permit_date?.value || 'Not found'} (${(results.fields.permit_date?.confidence || 0).toFixed(1)}%)`);
    console.log(`  Issue Date: ${results.fields.permit_issue_date?.value || 'Not found'} (${(results.fields.permit_issue_date?.confidence || 0).toFixed(1)}%)`);
    console.log(`  Local Committee: ${results.fields.local_committee_name?.value || 'Not found'} (${(results.fields.local_committee_name?.confidence || 0).toFixed(1)}%)`);
    
    if (results.fields.permitted_description?.value) {
      const description = results.fields.permitted_description.value;
      const shortDesc = description.length > 100 ? description.substring(0, 100) + '...' : description;
      console.log(`  Permitted: ${shortDesc} (${(results.fields.permitted_description?.confidence || 0).toFixed(1)}%)`);
    } else {
      console.log(`  Permitted: Not found (0.0%)`);
    }
    
    // Additional fields if found
    if (results.fields.property_address?.value) {
      console.log(`  Property Address: ${results.fields.property_address.value} (${(results.fields.property_address?.confidence || 0).toFixed(1)}%)`);
    }
    
    if (results.fields.gush?.value || results.fields.chelka?.value || results.fields.sub_chelka?.value) {
      const plotRef = [
        results.fields.gush?.value ? `גוש ${results.fields.gush.value}` : null,
        results.fields.chelka?.value ? `חלקה ${results.fields.chelka.value}` : null,
        results.fields.sub_chelka?.value ? `תת חלקה ${results.fields.sub_chelka.value}` : null
      ].filter(Boolean).join(', ');
      
      console.log(`  Plot Reference: ${plotRef}`);
    }
    
    console.log(`\n🎯 Confidence Analysis:`);
    const fields = ['permit_number', 'permit_date', 'permit_issue_date', 'local_committee_name', 'permitted_description'];
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
    
    // Show extraction contexts for high-confidence fields
    console.log(`\n🔍 High-Confidence Field Contexts:`);
    fields.forEach(field => {
      const fieldData = results.fields[field];
      if (fieldData && fieldData.confidence > 70 && fieldData.context) {
        console.log(`  ${field}: "${fieldData.context.substring(0, 80)}..."`);
      }
    });
    
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