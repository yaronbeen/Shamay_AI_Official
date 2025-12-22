#!/usr/bin/env node

/**
 * Direct test of land registry extraction on specific PDF
 */

import { processLandRegistryDocument } from './index.js';
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
  const pdfPath = '/mnt/c/Users/dell/Documents/Projects/Shamay/שומות שווי שוק/שומה מלאה/נסח טאבו.pdf';

  console.log('📋 Testing Land Registry Extraction');
  console.log('=====================================\n');
  console.log(`PDF: ${pdfPath}`);
  console.log(`File size: ${(fs.statSync(pdfPath).size / 1024).toFixed(2)} KB\n`);

  console.log('⏳ Processing with Anthropic Claude...\n');

  const startTime = Date.now();

  try {
    const results = await processLandRegistryDocument(pdfPath, {
      useAI: true,
      saveToDatabase: false  // Don't save to database for this test
    });

    const totalTime = Date.now() - startTime;

    if (!results.success) {
      console.error('❌ Extraction failed:', results.error);
      return;
    }

    console.log('✅ Extraction completed!\n');
    console.log('═══════════════════════════════════════════════════');
    console.log('📊 PROCESSING METRICS');
    console.log('═══════════════════════════════════════════════════');
    console.log(`Total Time:         ${totalTime}ms`);
    console.log(`AI Processing:      ${results.summary.processingTime}ms`);
    console.log(`Overall Confidence: ${results.summary.overallConfidence.toFixed(1)}%`);
    console.log(`Fields Extracted:   ${results.summary.fieldsExtracted}/${results.summary.totalFields}`);
    console.log(`Tokens Used:        ${results.costs.tokensUsed}`);
    console.log(`Estimated Cost:     $${results.costs.estimatedCost.toFixed(4)}\n`);

    console.log('═══════════════════════════════════════════════════');
    console.log('📝 EXTRACTED DATA');
    console.log('═══════════════════════════════════════════════════\n');

    // Get the raw extracted data
    const data = results.extractionResults.rawExtractedData || {};

    // Document Information
    console.log('📄 DOCUMENT INFORMATION:');
    console.log('------------------------');
    if (data.registration_office) console.log(`Registration Office: ${rtl(data.registration_office)}`);
    if (data.issue_date) console.log(`Issue Date: ${data.issue_date}`);
    if (data.tabu_extract_date) console.log(`Tabu Extract Date: ${data.tabu_extract_date}`);
    console.log();

    // Core Property Identifiers
    console.log('🏘️  CORE PROPERTY IDENTIFIERS:');
    console.log('------------------------------');
    console.log(`Gush (Block):        ${data.gush || 'N/A'}`);
    console.log(`Chelka (Plot):       ${data.chelka || 'N/A'}`);
    console.log(`Sub-Chelka:          ${data.sub_chelka || 'N/A'}`);
    console.log();

    // Property Details
    console.log('🏢 PROPERTY DETAILS:');
    console.log('-------------------');
    if (data.address_from_tabu) console.log(`Address: ${rtl(data.address_from_tabu)}`);
    if (data.total_plot_area) console.log(`Total Plot Area: ${data.total_plot_area} m²`);
    if (data.regulation_type) console.log(`Regulation Type: ${rtl(data.regulation_type)}`);
    if (data.sub_plots_count) console.log(`Sub-plots Count: ${data.sub_plots_count}`);
    if (data.buildings_count) console.log(`Buildings Count: ${data.buildings_count}`);
    console.log();

    // Unit Information
    console.log('🏠 UNIT/APARTMENT INFORMATION:');
    console.log('------------------------------');
    if (data.unit_description) console.log(`Unit Description: ${rtl(data.unit_description)}`);
    if (data.floor) console.log(`Floor: ${rtl(data.floor)}`);
    if (data.registered_area) console.log(`Registered Area: ${data.registered_area} m²`);
    if (data.apartment_registered_area) console.log(`Apartment Area: ${data.apartment_registered_area} m²`);
    if (data.balcony_area) console.log(`Balcony Area: ${data.balcony_area} m²`);
    if (data.shared_property) console.log(`Shared Property: ${data.shared_property}`);
    if (data.building_number) console.log(`Building Number: ${data.building_number}`);
    console.log();

    // Attachments
    if (data.attachments && data.attachments.length > 0) {
      console.log('📎 ATTACHMENTS (הצמדות):');
      console.log('------------------------');
      data.attachments.forEach((attachment, idx) => {
        console.log(`${idx + 1}. ${rtl(attachment.type || attachment.description || 'Unknown')}`);
        if (attachment.area) console.log(`   Area: ${attachment.area} m²`);
        if (attachment.symbol) console.log(`   Symbol: ${rtl(attachment.symbol)}`);
        if (attachment.color) console.log(`   Color: ${rtl(attachment.color)}`);
      });
      console.log();
    }

    // Owners
    if (data.owners && data.owners.length > 0) {
      console.log('👥 OWNERSHIP INFORMATION:');
      console.log('------------------------');
      console.log(`Total Owners: ${data.owners_count || data.owners.length}`);
      if (data.ownership_type) console.log(`Ownership Type: ${rtl(data.ownership_type)}`);
      data.owners.forEach((owner, idx) => {
        console.log(`\n${idx + 1}. ${rtl(owner.name || 'Unknown')}`);
        if (owner.id_number) console.log(`   ID: ${owner.id_number}`);
        if (owner.ownership_share) console.log(`   Share: ${owner.ownership_share}`);
      });
      console.log();
    }

    // Notes
    if (data.plot_notes) {
      console.log('📝 NOTES:');
      console.log('--------');
      console.log(rtl(data.plot_notes));
      if (data.notes_action_type) console.log(`Action Type: ${rtl(data.notes_action_type)}`);
      if (data.notes_beneficiary) console.log(`Beneficiary: ${rtl(data.notes_beneficiary)}`);
      console.log();
    }

    // Easements
    if (data.easements_essence || data.easements_description) {
      console.log('⚖️  EASEMENTS (זיקות הנאה):');
      console.log('---------------------------');
      if (data.easements_essence) console.log(`Essence: ${rtl(data.easements_essence)}`);
      if (data.easements_description) console.log(`Description: ${rtl(data.easements_description)}`);
      console.log();
    }

    // Mortgages
    if (data.mortgages && data.mortgages.length > 0) {
      console.log('🏦 MORTGAGES (משכנתאות):');
      console.log('------------------------');
      data.mortgages.forEach((mortgage, idx) => {
        console.log(`\n${idx + 1}. Mortgage #${idx + 1}`);
        if (mortgage.essence) console.log(`   Type: ${rtl(mortgage.essence)}`);
        if (mortgage.rank) console.log(`   Rank: ${rtl(mortgage.rank)}`);
        if (mortgage.lenders) console.log(`   Lenders: ${rtl(mortgage.lenders)}`);
        if (mortgage.borrowers) console.log(`   Borrowers: ${rtl(mortgage.borrowers)}`);
        if (mortgage.amount) console.log(`   Amount: ${mortgage.amount}`);
        if (mortgage.share) console.log(`   Property Share: ${rtl(mortgage.share)}`);
      });
      console.log();
    }

    // Confidence Scores
    console.log('═══════════════════════════════════════════════════');
    console.log('📊 CONFIDENCE SCORES');
    console.log('═══════════════════════════════════════════════════\n');
    const confidence = data.confidence_scores || {};
    Object.entries(confidence).forEach(([category, score]) => {
      if (typeof score === 'number') {
        const percentage = (score * 100).toFixed(1);
        const bar = '█'.repeat(Math.round(score * 20));
        console.log(`${category.padEnd(20)} ${percentage.padStart(5)}% ${bar}`);
      }
    });
    console.log();

    // Extraction Contexts
    console.log('═══════════════════════════════════════════════════');
    console.log('🔍 EXTRACTION CONTEXTS');
    console.log('═══════════════════════════════════════════════════\n');
    const contexts = data.extraction_contexts || {};
    Object.entries(contexts).forEach(([field, context]) => {
      if (context && context.trim()) {
        console.log(`${field}:`);
        console.log(`  ${formatMixedText(context)}`);
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
