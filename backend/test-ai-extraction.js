#!/usr/bin/env node

/**
 * Comprehensive AI Extraction Test Script
 * Tests all AI extractors with real documents and verifies DB/UI integration
 */

import { LandRegistryComprehensiveAIExtractor } from './land-registry-management/comprehensive-ai-extractor.js';
import { SharedBuildingAIExtractor } from './shared-building-order/ai-field-extractor-hebrew.js';
import { BuildingPermitAIExtractor } from './building-permits/ai-field-extractor.js';
import ApartmentInteriorAnalyzer from './image-analysis/apartment-interior-analyzer/apartment-interior-analyzer.js';
import BuildingExteriorAnalyzer from './image-analysis/building-exterior-analyzer/building-exterior-analyzer.js';
import ShumaDB from './src/models/ShumaDB.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Test configuration
const TEST_SESSION_ID = 'test_extraction_' + Date.now();
const TEST_DOCUMENTS_PATH = '/Users/shalom.m/Documents/Code/Shamay-slow/integrations/test_documents';

// Test documents
const TEST_FILES = {
  landRegistry: path.join(TEST_DOCUMENTS_PATH, 'land_registry_tabu.pdf'),
  sharedBuilding: path.join(TEST_DOCUMENTS_PATH, 'shared_building_order_1.pdf'),
  buildingPermit: path.join(TEST_DOCUMENTS_PATH, 'building_permit_2.PDF'),
  interiorImages: [
    path.join(TEST_DOCUMENTS_PATH, 'internal_image_-20250608-WA0066.jpg'),
    path.join(TEST_DOCUMENTS_PATH, 'internal_image_-20250608-WA0067.jpg'),
    path.join(TEST_DOCUMENTS_PATH, 'internal_image_-20250608-WA0072.jpg')
  ],
  exteriorImage: path.join(TEST_DOCUMENTS_PATH, 'external_image.jpg')
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

function logSubSection(title) {
  console.log('\n' + '-'.repeat(60));
  log(title, 'cyan');
  console.log('-'.repeat(60));
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
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
    logSubSection('Extraction Results');
    
    // Core fields
    log('Core Property Identifiers:', 'magenta');
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
    
    // Save to database
    logSubSection('Database Integration');
    const dbResult = await ShumaDB.saveLandRegistryExtraction(
      TEST_SESSION_ID,
      result,
      path.basename(TEST_FILES.landRegistry)
    );
    
    if (dbResult.success) {
      logSuccess(`Saved to database with ID: ${dbResult.landRegistryId}`);
    } else {
      logError(`Database save failed: ${dbResult.error}`);
    }
    
    return { success: true, result, dbResult };
    
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
    logSubSection('Extraction Results');
    
    // Building information
    log('Building Information:', 'magenta');
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
    
    // Save to database
    logSubSection('Database Integration');
    const dbResult = await ShumaDB.saveSharedBuildingExtraction(
      TEST_SESSION_ID,
      {
        orderIssueDate: result.order_issue_date?.value,
        buildingDescription: result.building_description?.value,
        buildingFloors: result.building_floors?.value,
        buildingSubPlotsCount: result.building_sub_plots_count?.value,
        buildingAddress: result.building_address?.value,
        totalSubPlots: result.total_sub_plots?.value,
        buildingsInfo: result.buildings_info?.value,
        overallConfidence: result.overallConfidence / 100
      },
      path.basename(TEST_FILES.sharedBuilding)
    );
    
    if (dbResult.success) {
      logSuccess(`Saved to database with ID: ${dbResult.sharedBuildingId}`);
    } else {
      logError(`Database save failed: ${dbResult.error}`);
    }
    
    return { success: true, result, dbResult };
    
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
    logSubSection('Extraction Results');
    
    // Permit information
    log('Permit Information:', 'magenta');
    console.log(`  Permit Number: ${result.permit_number?.value || 'null'}`);
    console.log(`  Permit Date: ${result.permit_date?.value || 'null'}`);
    console.log(`  Issue Date: ${result.permit_issue_date?.value || 'null'}`);
    console.log(`  Committee Name: ${result.local_committee_name?.value || 'null'}`);
    
    log('\nPermitted Description:', 'magenta');
    if (result.permitted_description?.value) {
      console.log(result.permitted_description.value.substring(0, 200) + '...');
    } else {
      console.log('  null');
    }
    
    // Additional fields
    log('\nProperty Details:', 'magenta');
    console.log(`  Address: ${result.property_address?.value || 'null'}`);
    console.log(`  Gush: ${result.gush?.value || 'null'}`);
    console.log(`  Chelka: ${result.chelka?.value || 'null'}`);
    console.log(`  Sub Chelka: ${result.sub_chelka?.value || 'null'}`);
    
    // Metadata
    log('\nExtraction Metadata:', 'magenta');
    console.log(`  Processing Time: ${processingTime}ms`);
    console.log(`  Overall Confidence: ${result.overallConfidence?.toFixed(1) || 0}%`);
    console.log(`  Tokens Used: ${result.tokensUsed || 'N/A'}`);
    
    // Save to database
    logSubSection('Database Integration');
    const dbResult = await ShumaDB.savePermitExtraction(
      TEST_SESSION_ID,
      {
        permitNumber: result.permit_number?.value,
        permitDate: result.permit_date?.value,
        permittedDescription: result.permitted_description?.value,
        permitIssueDate: result.permit_issue_date?.value,
        localCommitteeName: result.local_committee_name?.value,
        propertyAddress: result.property_address?.value,
        gush: result.gush?.value,
        chelka: result.chelka?.value,
        subChelka: result.sub_chelka?.value,
        permitNumberConfidence: result.permit_number?.confidence,
        permitDateConfidence: result.permit_date?.confidence,
        permittedDescriptionConfidence: result.permitted_description?.confidence
      },
      path.basename(TEST_FILES.buildingPermit)
    );
    
    if (dbResult.success) {
      logSuccess(`Saved to database with ID: ${dbResult.permitId}`);
    } else {
      logError(`Database save failed: ${dbResult.error}`);
    }
    
    return { success: true, result, dbResult };
    
  } catch (error) {
    logError(`Building Permit extraction failed: ${error.message}`);
    console.error(error);
    return { success: false, error: error.message };
  }
}

/**
 * Test Interior Image Analysis
 */
async function testInteriorImageAnalysis() {
  logSection('TESTING INTERIOR IMAGE ANALYSIS');
  
  try {
    const analyzer = new ApartmentInteriorAnalyzer(process.env.ANTHROPIC_API_KEY);
    const results = [];
    
    for (const imagePath of TEST_FILES.interiorImages) {
      if (!fs.existsSync(imagePath)) {
        logWarning(`File not found: ${imagePath}`);
        continue;
      }
      
      logInfo(`Processing image: ${path.basename(imagePath)}`);
      
      // Read image as base64
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      
      // Analyze image
      const result = await analyzer.analyzeApartmentInterior(base64Image);
      
      if (result.success) {
        logSuccess(`Analysis completed for ${path.basename(imagePath)}`);
        console.log(`  Room Type: ${result.structuredData?.room_type || 'Unknown'}`);
        console.log(`  Condition: ${result.structuredData?.condition || 'Unknown'}`);
        console.log(`  Area Estimate: ${result.structuredData?.area_estimate || 'Unknown'}`);
        results.push(result);
      } else {
        logError(`Analysis failed: ${result.error}`);
      }
    }
    
    return { success: true, results };
    
  } catch (error) {
    logError(`Interior Image analysis failed: ${error.message}`);
    console.error(error);
    return { success: false, error: error.message };
  }
}

/**
 * Test Exterior Image Analysis
 */
async function testExteriorImageAnalysis() {
  logSection('TESTING EXTERIOR IMAGE ANALYSIS');
  
  try {
    if (!fs.existsSync(TEST_FILES.exteriorImage)) {
      throw new Error(`File not found: ${TEST_FILES.exteriorImage}`);
    }
    
    logInfo(`Processing image: ${path.basename(TEST_FILES.exteriorImage)}`);
    
    const analyzer = new BuildingExteriorAnalyzer(process.env.ANTHROPIC_API_KEY);
    
    // Read image as base64
    const imageBuffer = fs.readFileSync(TEST_FILES.exteriorImage);
    const base64Image = imageBuffer.toString('base64');
    
    // Analyze image
    const result = await analyzer.analyzeBuildingExterior(base64Image);
    
    if (result.success) {
      logSuccess('Analysis completed');
      console.log(`  Building Type: ${result.structuredData?.building_type || 'Unknown'}`);
      console.log(`  Condition: ${result.structuredData?.condition || 'Unknown'}`);
      console.log(`  Floors Estimate: ${result.structuredData?.floors_estimate || 'Unknown'}`);
      console.log(`  Features: ${result.structuredData?.features?.join(', ') || 'None'}`);
    } else {
      logError(`Analysis failed: ${result.error}`);
    }
    
    return result;
    
  } catch (error) {
    logError(`Exterior Image analysis failed: ${error.message}`);
    console.error(error);
    return { success: false, error: error.message };
  }
}

/**
 * Test Complete Valuation Data Save
 */
async function testCompleteSave() {
  logSection('TESTING COMPLETE VALUATION DATA SAVE');
  
  try {
    // Create complete valuation data object
    const valuationData = {
      sessionId: TEST_SESSION_ID,
      street: 'רחוב הבדיקה',
      buildingNumber: '123',
      city: 'תל אביב',
      neighborhood: 'צפון',
      fullAddress: 'רחוב הבדיקה 123, תל אביב',
      rooms: 4,
      floor: 3,
      area: 120,
      propertyEssence: 'דירה',
      clientName: 'לקוח בדיקה',
      visitDate: new Date().toISOString(),
      valuationDate: new Date().toISOString(),
      referenceNumber: 'TEST-' + Date.now(),
      shamayName: 'שמאי בדיקה',
      shamaySerialNumber: '12345',
      isComplete: false,
      uploads: [
        { type: 'land_registry', url: TEST_FILES.landRegistry },
        { type: 'shared_building_order', url: TEST_FILES.sharedBuilding },
        { type: 'building_permit', url: TEST_FILES.buildingPermit }
      ]
    };
    
    // Save to database
    const result = await ShumaDB.saveShumaFromSession(
      TEST_SESSION_ID,
      'test-org',
      'test-user',
      valuationData
    );
    
    if (result.success) {
      logSuccess(`Complete valuation saved with Shuma ID: ${result.shumaId}`);
      
      // Load back to verify
      const loadResult = await ShumaDB.loadShumaForWizard(TEST_SESSION_ID);
      if (loadResult.success) {
        logSuccess('Successfully loaded valuation data from database');
        console.log(`  Session ID: ${loadResult.valuationData.sessionId}`);
        console.log(`  Address: ${loadResult.valuationData.fullAddress}`);
        console.log(`  Uploads: ${loadResult.valuationData.uploads?.length || 0} files`);
      }
    } else {
      logError(`Save failed: ${result.error}`);
    }
    
    return result;
    
  } catch (error) {
    logError(`Complete save failed: ${error.message}`);
    console.error(error);
    return { success: false, error: error.message };
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  logSection('AI EXTRACTION COMPREHENSIVE TEST SUITE');
  log(`Test Session ID: ${TEST_SESSION_ID}`, 'yellow');
  log(`Test Documents Path: ${TEST_DOCUMENTS_PATH}`, 'yellow');
  
  const results = {
    landRegistry: null,
    sharedBuilding: null,
    buildingPermit: null,
    interiorImages: null,
    exteriorImage: null,
    completeSave: null
  };
  
  // Run tests sequentially
  results.landRegistry = await testLandRegistryExtraction();
  results.sharedBuilding = await testSharedBuildingExtraction();
  results.buildingPermit = await testBuildingPermitExtraction();
  results.interiorImages = await testInteriorImageAnalysis();
  results.exteriorImage = await testExteriorImageAnalysis();
  results.completeSave = await testCompleteSave();
  
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
    logWarning(`\n⚠️  ${failed} test(s) failed. Please review the errors above.`);
  }
  
  // Database verification
  logSection('DATABASE VERIFICATION');
  
  try {
    const allExtracted = await ShumaDB.getAllExtractedData(TEST_SESSION_ID);
    if (allExtracted.success) {
      console.log('\nExtracted Data in Database:');
      console.log(`  Land Registry: ${allExtracted.data.landRegistry ? '✅' : '❌'}`);
      console.log(`  Building Permit: ${allExtracted.data.buildingPermit ? '✅' : '❌'}`);
      console.log(`  Shared Building: ${allExtracted.data.sharedBuilding ? '✅' : '❌'}`);
    }
  } catch (error) {
    logError(`Database verification failed: ${error.message}`);
  }
  
  process.exit(failed === 0 ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
