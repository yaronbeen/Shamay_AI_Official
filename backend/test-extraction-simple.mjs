#!/usr/bin/env node

/**
 * Simple AI Extraction Test Script
 * Tests AI extractors with real documents
 */

import { LandRegistryComprehensiveAIExtractor } from './land-registry-management/comprehensive-ai-extractor.js';
import { SharedBuildingAIExtractor } from './shared-building-order/ai-field-extractor-hebrew.js';
import { BuildingPermitAIExtractor } from './building-permits/ai-field-extractor.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load .env from parent directory
dotenv.config({ path: '../.env' });

// Test configuration
const TEST_DOCUMENTS_PATH = '/Users/shalom.m/Documents/Code/Shamay-slow/integrations/test_documents';

// Test documents
const TEST_FILES = {
  landRegistry: path.join(TEST_DOCUMENTS_PATH, 'land_registry_tabu.pdf'),
  sharedBuilding: path.join(TEST_DOCUMENTS_PATH, 'shared_building_order_1.pdf'),
  buildingPermit: path.join(TEST_DOCUMENTS_PATH, 'building_permit_2.PDF'),
};

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'bright');
  console.log('='.repeat(80));
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

/**
 * Test Land Registry Extraction
 */
async function testLandRegistryExtraction() {
  logSection('TESTING LAND REGISTRY EXTRACTION');
  
  try {
    // Check if file exists
    if (!fs.existsSync(TEST_FILES.landRegistry)) {
      throw new Error(`File not found: ${TEST_FILES.landRegistry}`);
    }
    
    logInfo(`Processing file: ${TEST_FILES.landRegistry}`);
    
    // Initialize extractor
    const extractor = new LandRegistryComprehensiveAIExtractor(process.env.ANTHROPIC_API_KEY);
    
    // Extract fields
    const startTime = Date.now();
    const result = await extractor.extractAllFieldsComprehensive(TEST_FILES.landRegistry, { isPdf: true });
    const processingTime = Date.now() - startTime;
    
    // Display results
    log('\nExtraction Results:', 'cyan');
    
    // Core fields
    log('\nCore Property Identifiers:', 'magenta');
    console.log(`  Gush: ${result.gush || 'null'}`);
    console.log(`  Chelka: ${result.chelka || 'null'}`);
    console.log(`  Sub Chelka: ${result.sub_chelka || 'null'}`);
    
    // Property details
    log('\nProperty Details:', 'magenta');
    console.log(`  Total Plot Area: ${result.total_plot_area || 'null'}`);
    console.log(`  Regulation Type: ${result.regulation_type || 'null'}`);
    console.log(`  Address: ${result.address_from_tabu || 'null'}`);
    
    // Ownership
    log('\nOwnership Information:', 'magenta');
    console.log(`  Owners Count: ${result.owners_count || 0}`);
    if (result.owners && result.owners.length > 0) {
      result.owners.forEach((owner, idx) => {
        console.log(`  Owner ${idx + 1}: ${owner.name || 'Unknown'} (${owner.ownership_share || 'N/A'})`);
      });
    }
    
    // Mortgages
    log('\nMortgages:', 'magenta');
    console.log(`  Mortgages Count: ${result.mortgages?.length || 0}`);
    if (result.mortgages && result.mortgages.length > 0) {
      result.mortgages.forEach((mortgage, idx) => {
        console.log(`  Mortgage ${idx + 1}: ${mortgage.lenders || 'Unknown'} - ${mortgage.amount || 'N/A'}`);
      });
    }
    
    // Metadata
    log('\nExtraction Metadata:', 'magenta');
    console.log(`  Processing Time: ${processingTime}ms`);
    console.log(`  Overall Confidence: ${result.overallConfidence?.toFixed(1) || 0}%`);
    console.log(`  Extraction Stages: ${result.extractionStages || 1}`);
    console.log(`  Tokens Used: ${result.tokensUsed || 'N/A'}`);
    
    logSuccess('Land Registry extraction completed successfully');
    return { success: true, result };
    
  } catch (error) {
    logError(`Land Registry extraction failed: ${error.message}`);
    console.error(error);
    return { success: false, error: error.message };
  }
}

/**
 * Test Shared Building Extraction
 */
async function testSharedBuildingExtraction() {
  logSection('TESTING SHARED BUILDING EXTRACTION');
  
  try {
    // Check if file exists
    if (!fs.existsSync(TEST_FILES.sharedBuilding)) {
      throw new Error(`File not found: ${TEST_FILES.sharedBuilding}`);
    }
    
    logInfo(`Processing file: ${TEST_FILES.sharedBuilding}`);
    
    // Initialize extractor
    const extractor = new SharedBuildingAIExtractor(process.env.ANTHROPIC_API_KEY);
    
    // Extract fields
    const startTime = Date.now();
    const result = await extractor.extractAllFields(TEST_FILES.sharedBuilding, { isPdf: true });
    const processingTime = Date.now() - startTime;
    
    // Display results
    log('\nExtraction Results:', 'cyan');
    
    // Building information
    log('\nBuilding Information:', 'magenta');
    console.log(`  Order Issue Date: ${result.order_issue_date?.value || 'null'}`);
    console.log(`  Building Description: ${result.building_description?.value || 'null'}`);
    console.log(`  Building Floors: ${result.building_floors?.value || 'null'}`);
    console.log(`  Total Sub-plots: ${result.total_sub_plots?.value || 'null'}`);
    console.log(`  Building Address: ${result.building_address?.value || 'null'}`);
    
    // Buildings info
    log('\nAll Buildings:', 'magenta');
    if (result.buildings_info?.value && result.buildings_info.value.length > 0) {
      console.log(`  Total Buildings: ${result.buildings_info.count}`);
      result.buildings_info.value.forEach((building, idx) => {
        console.log(`  Building ${idx + 1}:`);
        console.log(`    Number: ${building.building_number || 'N/A'}`);
        console.log(`    Address: ${building.address || 'N/A'}`);
        console.log(`    Floors: ${building.floors || 'N/A'}`);
        console.log(`    Sub-plots: ${building.sub_plots_count || 'N/A'}`);
      });
    } else {
      console.log('  No buildings data found');
    }
    
    // All addresses
    log('\nAll Addresses:', 'magenta');
    if (result.all_addresses?.value && result.all_addresses.value.length > 0) {
      result.all_addresses.value.forEach((addr, idx) => {
        console.log(`  Address ${idx + 1}: ${addr}`);
      });
    }
    
    // Metadata
    log('\nExtraction Metadata:', 'magenta');
    console.log(`  Processing Time: ${processingTime}ms`);
    console.log(`  Overall Confidence: ${result.overallConfidence?.toFixed(1) || 0}%`);
    console.log(`  Method: ${result.method || 'N/A'}`);
    console.log(`  Steps Completed: ${result.stepsCompleted || 1}`);
    console.log(`  Tokens Used: ${result.tokensUsed || 'N/A'}`);
    
    logSuccess('Shared Building extraction completed successfully');
    return { success: true, result };
    
  } catch (error) {
    logError(`Shared Building extraction failed: ${error.message}`);
    console.error(error);
    return { success: false, error: error.message };
  }
}

/**
 * Test Building Permit Extraction
 */
async function testBuildingPermitExtraction() {
  logSection('TESTING BUILDING PERMIT EXTRACTION');
  
  try {
    // Check if file exists
    if (!fs.existsSync(TEST_FILES.buildingPermit)) {
      throw new Error(`File not found: ${TEST_FILES.buildingPermit}`);
    }
    
    logInfo(`Processing file: ${TEST_FILES.buildingPermit}`);
    
    // Initialize extractor
    const extractor = new BuildingPermitAIExtractor(process.env.ANTHROPIC_API_KEY);
    
    // Extract fields
    const startTime = Date.now();
    const result = await extractor.extractAllFields(TEST_FILES.buildingPermit, { isPdf: true });
    const processingTime = Date.now() - startTime;
    
    // Display results
    log('\nExtraction Results:', 'cyan');
    
    // Permit information
    log('\nPermit Information:', 'magenta');
    console.log(`  Permit Number: ${result.permit_number?.value || 'null'}`);
    console.log(`  Permit Date: ${result.permit_date?.value || 'null'}`);
    console.log(`  Issue Date: ${result.permit_issue_date?.value || 'null'}`);
    console.log(`  Committee Name: ${result.local_committee_name?.value || 'null'}`);
    
    log('\nPermitted Description:', 'magenta');
    if (result.permitted_description?.value) {
      console.log('  ' + result.permitted_description.value.substring(0, 200) + '...');
    } else {
      console.log('  null');
    }
    
    // Additional fields
    log('\nProperty Details:', 'magenta');
    console.log(`  Address: ${result.property_address?.value || 'null'}`);
    console.log(`  Gush: ${result.gush?.value || 'null'}`);
    console.log(`  Chelka: ${result.chelka?.value || 'null'}`);
    console.log(`  Sub Chelka: ${result.sub_chelka?.value || 'null'}`);
    
    // Confidence scores
    log('\nConfidence Scores:', 'magenta');
    console.log(`  Permit Number: ${result.permit_number?.confidence?.toFixed(1) || 0}%`);
    console.log(`  Permit Date: ${result.permit_date?.confidence?.toFixed(1) || 0}%`);
    console.log(`  Committee Name: ${result.local_committee_name?.confidence?.toFixed(1) || 0}%`);
    console.log(`  Permitted Description: ${result.permitted_description?.confidence?.toFixed(1) || 0}%`);
    
    // Metadata
    log('\nExtraction Metadata:', 'magenta');
    console.log(`  Processing Time: ${processingTime}ms`);
    console.log(`  Overall Confidence: ${result.overallConfidence?.toFixed(1) || 0}%`);
    console.log(`  Tokens Used: ${result.tokensUsed || 'N/A'}`);
    
    logSuccess('Building Permit extraction completed successfully');
    return { success: true, result };
    
  } catch (error) {
    logError(`Building Permit extraction failed: ${error.message}`);
    console.error(error);
    return { success: false, error: error.message };
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  logSection('AI EXTRACTION TEST SUITE');
  log(`Test Documents Path: ${TEST_DOCUMENTS_PATH}`, 'yellow');
  
  const results = {
    landRegistry: null,
    sharedBuilding: null,
    buildingPermit: null
  };
  
  // Run tests sequentially
  results.landRegistry = await testLandRegistryExtraction();
  results.sharedBuilding = await testSharedBuildingExtraction();
  results.buildingPermit = await testBuildingPermitExtraction();
  
  // Summary
  logSection('TEST SUMMARY');
  
  const testNames = Object.keys(results);
  const passed = testNames.filter(name => results[name]?.success).length;
  const failed = testNames.length - passed;
  
  console.log(`\nTests Passed: ${passed}/${testNames.length}`);
  console.log(`Tests Failed: ${failed}/${testNames.length}`);
  
  testNames.forEach(name => {
    if (results[name]?.success) {
      logSuccess(`${name}: PASSED`);
    } else {
      logError(`${name}: FAILED - ${results[name]?.error || 'Unknown error'}`);
    }
  });
  
  if (failed === 0) {
    logSuccess('\n🎉 All tests passed successfully!');
  } else {
    log(`\n⚠️  ${failed} test(s) failed. Please review the errors above.`, 'yellow');
  }
  
  // Display Hebrew extraction verification
  logSection('HEBREW EXTRACTION VERIFICATION');
  
  console.log('\nVerifying Hebrew-only extraction (no English fallbacks):');
  
  // Check land registry
  if (results.landRegistry?.result) {
    const lr = results.landRegistry.result;
    console.log('\nLand Registry:');
    console.log(`  Gush: ${lr.gush === null ? '✅ null (correct)' : lr.gush}`);
    console.log(`  Address: ${lr.address_from_tabu === null ? '✅ null (correct)' : lr.address_from_tabu}`);
    console.log(`  Regulation Type: ${lr.regulation_type === null ? '✅ null (correct)' : lr.regulation_type}`);
  }
  
  // Check shared building
  if (results.sharedBuilding?.result) {
    const sb = results.sharedBuilding.result;
    console.log('\nShared Building:');
    console.log(`  Order Date: ${sb.order_issue_date?.value === null ? '✅ null (correct)' : sb.order_issue_date?.value}`);
    console.log(`  Building Description: ${sb.building_description?.value === null ? '✅ null (correct)' : sb.building_description?.value?.substring(0, 50) + '...'}`);
    console.log(`  Building Address: ${sb.building_address?.value === null ? '✅ null (correct)' : sb.building_address?.value}`);
  }
  
  // Check building permit
  if (results.buildingPermit?.result) {
    const bp = results.buildingPermit.result;
    console.log('\nBuilding Permit:');
    console.log(`  Permit Number: ${bp.permit_number?.value === null ? '✅ null (correct)' : bp.permit_number?.value}`);
    console.log(`  Committee Name: ${bp.local_committee_name?.value === null ? '✅ null (correct)' : bp.local_committee_name?.value}`);
    console.log(`  Permitted Description: ${bp.permitted_description?.value === null ? '✅ null (correct)' : bp.permitted_description?.value?.substring(0, 50) + '...'}`);
  }
  
  process.exit(failed === 0 ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
