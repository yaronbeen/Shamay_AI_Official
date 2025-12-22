#!/usr/bin/env node

/**
 * Direct test of building permit extraction on specific PDF
 */

import { BuildingPermitAIExtractor } from './ai-field-extractor.js';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
dotenv.config({ path: path.join(projectRoot, '.env') });

// RTL formatting helpers
const RTL_MARK = '\u202B'; // RIGHT-TO-LEFT EMBEDDING
const LTR_MARK = '\u202A'; // LEFT-TO-RIGHT EMBEDDING
const PDF_MARK = '\u202C'; // POP DIRECTIONAL FORMATTING

function rtl(text) {
  // Wrap Hebrew text in RTL markers
  if (!text) return text;
  return `${RTL_MARK}${text}${PDF_MARK}`;
}

function formatMixedText(text) {
  // For mixed Hebrew/English text with numbers
  if (!text) return text;

  // Check if text contains Hebrew
  const hasHebrew = /[\u0590-\u05FF]/.test(text);
  if (hasHebrew) {
    return `${RTL_MARK}${text}${PDF_MARK}`;
  }
  return text;
}

async function runExtraction() {
  const pdfPath = '/mnt/c/Users/dell/Documents/Projects/Shamay/שומות שווי שוק/שומה מלאה/היתרים מילוליים/היתר 1.PDF';

  console.log('🏗️  Testing Building Permit Extraction');
  console.log('========================================\n');
  console.log(`PDF: ${pdfPath}`);
  console.log(`File size: ${(fs.statSync(pdfPath).size / 1024).toFixed(2)} KB\n`);

  console.log('⏳ Processing with Anthropic Claude...\n');

  const startTime = Date.now();

  try {
    const extractor = new BuildingPermitAIExtractor();
    const results = await extractor.extractAllFields(pdfPath, { isPdf: true });

    const totalTime = Date.now() - startTime;

    console.log('✅ Extraction completed!\n');
    console.log('═══════════════════════════════════════════════════');
    console.log('📊 PROCESSING METRICS');
    console.log('═══════════════════════════════════════════════════');
    console.log(`Total Time:         ${totalTime}ms`);
    console.log(`AI Processing:      ${results.processingTime}ms`);
    console.log(`Overall Confidence: ${results.overallConfidence.toFixed(1)}%`);
    console.log(`Tokens Used:        ${results.tokensUsed}`);
    console.log(`Estimated Cost:     $${results.cost.toFixed(4)}\n`);

    console.log('═══════════════════════════════════════════════════');
    console.log('📝 EXTRACTED DATA');
    console.log('═══════════════════════════════════════════════════\n');

    // Main Permit Information
    console.log('📋 PERMIT INFORMATION:');
    console.log('---------------------');
    if (results.permit_number?.value) {
      console.log(`Permit Number: ${results.permit_number.value}`);
      console.log(`  Confidence: ${results.permit_number.confidence.toFixed(1)}%`);
    }
    if (results.permit_date?.value) {
      console.log(`Permit Date: ${results.permit_date.value}`);
      console.log(`  Confidence: ${results.permit_date.confidence.toFixed(1)}%`);
    }
    if (results.permit_issue_date?.value) {
      console.log(`Issue Date: ${results.permit_issue_date.value}`);
      console.log(`  Confidence: ${results.permit_issue_date.confidence.toFixed(1)}%`);
    }
    if (results.local_committee_name?.value) {
      console.log(`Local Committee: ${rtl(results.local_committee_name.value)}`);
      console.log(`  Confidence: ${results.local_committee_name.confidence.toFixed(1)}%`);
    }
    console.log();

    // Property Location
    console.log('📍 PROPERTY LOCATION:');
    console.log('--------------------');
    if (results.property_address?.value) {
      console.log(`Address: ${rtl(results.property_address.value)}`);
      console.log(`  Confidence: ${results.property_address.confidence.toFixed(1)}%`);
    }
    if (results.gush?.value) {
      console.log(`Gush (Block): ${results.gush.value}`);
      console.log(`  Confidence: ${results.gush.confidence.toFixed(1)}%`);
    }
    if (results.chelka?.value) {
      console.log(`Chelka (Plot): ${results.chelka.value}`);
      console.log(`  Confidence: ${results.chelka.confidence.toFixed(1)}%`);
    }
    if (results.sub_chelka?.value) {
      console.log(`Sub-Chelka: ${results.sub_chelka.value}`);
      console.log(`  Confidence: ${results.sub_chelka.confidence.toFixed(1)}%`);
    }
    console.log();

    // Permitted Description (Most Important Field)
    if (results.permitted_description?.value) {
      console.log('🏗️  PERMITTED DESCRIPTION (מותר):');
      console.log('═══════════════════════════════════════════════════');

      // Split into lines and apply RTL to each line for better formatting
      const lines = results.permitted_description.value.split(/[;،]/);
      lines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine) {
          console.log(rtl(trimmedLine));
        }
      });

      console.log(`\nConfidence: ${results.permitted_description.confidence.toFixed(1)}%`);
      console.log('═══════════════════════════════════════════════════\n');
    }

    // Confidence Scores
    console.log('═══════════════════════════════════════════════════');
    console.log('📊 CONFIDENCE SCORES');
    console.log('═══════════════════════════════════════════════════\n');

    const confidenceFields = [
      'permit_number',
      'permit_date',
      'permit_issue_date',
      'local_committee_name',
      'permitted_description',
      'property_address',
      'gush',
      'chelka',
      'sub_chelka'
    ];

    confidenceFields.forEach(field => {
      if (results[field]?.confidence !== undefined) {
        const confidence = results[field].confidence / 100;
        const percentage = (confidence * 100).toFixed(1);
        const bar = '█'.repeat(Math.round(confidence * 20));
        console.log(`${field.padEnd(25)} ${percentage.padStart(5)}% ${bar}`);
      }
    });

    console.log(`${'overall'.padEnd(25)} ${results.overallConfidence.toFixed(1).padStart(5)}% ${'█'.repeat(Math.round(results.overallConfidence / 5))}`);
    console.log();

    // Extraction Contexts
    console.log('═══════════════════════════════════════════════════');
    console.log('🔍 EXTRACTION CONTEXTS');
    console.log('═══════════════════════════════════════════════════\n');

    confidenceFields.forEach(field => {
      if (results[field]?.context && results[field].context.trim()) {
        console.log(`${field}:`);
        console.log(`  ${formatMixedText(results[field].context)}`);
        console.log();
      }
    });

    console.log('═══════════════════════════════════════════════════');
    console.log('✅ Test completed successfully!');
    console.log('═══════════════════════════════════════════════════');

  } catch (error) {
    console.error('\n❌ Extraction failed:');
    console.error(error.message);
    console.error('\nFull error:', error);
  }
}

runExtraction().catch(console.error);
