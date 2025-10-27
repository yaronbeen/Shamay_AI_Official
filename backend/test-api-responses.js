#!/usr/bin/env node

/**
 * Test API Endpoints and Show Response JSON
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: '../.env' });

const TEST_DOCUMENTS_PATH = '/Users/shalom.m/Documents/Code/Shamay-slow/integrations/test_documents';
const BACKEND_URL = 'http://localhost:3001';

// Color codes
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testBuildingPermitAPI() {
  log('\n========================================', 'cyan');
  log('TESTING BUILDING PERMIT API', 'cyan');
  log('========================================\n', 'cyan');
  
  try {
    const filePath = path.join(TEST_DOCUMENTS_PATH, 'building_permit_2.PDF');
    const fileBuffer = fs.readFileSync(filePath);
    
    const formData = new FormData();
    formData.append('file', new Blob([fileBuffer]), 'building_permit_2.PDF');
    
    const response = await fetch(`${BACKEND_URL}/api/ai/building-permit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileUrl: filePath,
        sessionId: 'test_' + Date.now()
      })
    });
    
    const data = await response.json();
    
    log('📤 API Response:', 'blue');
    console.log(JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    return null;
  }
}

async function testSharedBuildingAPI() {
  log('\n========================================', 'cyan');
  log('TESTING SHARED BUILDING API', 'cyan');
  log('========================================\n', 'cyan');
  
  try {
    const filePath = path.join(TEST_DOCUMENTS_PATH, 'shared_building_order_1.pdf');
    const fileBuffer = fs.readFileSync(filePath);
    
    const response = await fetch(`${BACKEND_URL}/api/ai/shared-building`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileUrl: filePath,
        sessionId: 'test_' + Date.now()
      })
    });
    
    const data = await response.json();
    
    log('📤 API Response:', 'blue');
    console.log(JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    return null;
  }
}

async function testLandRegistryAPI() {
  log('\n========================================', 'cyan');
  log('TESTING LAND REGISTRY API', 'cyan');
  log('========================================\n', 'cyan');
  
  try {
    const filePath = path.join(TEST_DOCUMENTS_PATH, 'land_registry_tabu.pdf');
    const fileBuffer = fs.readFileSync(filePath);
    
    const response = await fetch(`${BACKEND_URL}/api/ai/land-registry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileUrl: filePath,
        sessionId: 'test_' + Date.now()
      })
    });
    
    const data = await response.json();
    
    log('📤 API Response:', 'blue');
    console.log(JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    return null;
  }
}

async function testInteriorAnalysisAPI() {
  log('\n========================================', 'cyan');
  log('TESTING INTERIOR ANALYSIS API', 'cyan');
  log('========================================\n', 'cyan');
  
  try {
    const imagePath = path.join(TEST_DOCUMENTS_PATH, 'internal_image_-20250608-WA0066.jpg');
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    const response = await fetch(`${BACKEND_URL}/api/ai/interior-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        images: [{
          name: 'internal_image.jpg',
          data: base64Image
        }],
        sessionId: 'test_' + Date.now()
      })
    });
    
    const data = await response.json();
    
    log('📤 API Response:', 'blue');
    console.log(JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    return null;
  }
}

// Run tests
async function runTests() {
  log('\n🚀 Starting API Response Tests', 'green');
  log('========================================\n', 'green');
  
  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Test all APIs
  await testBuildingPermitAPI();
  await testSharedBuildingAPI();
  await testLandRegistryAPI();
  await testInteriorAnalysisAPI();
  
  log('\n✅ All tests completed!\n', 'green');
}

runTests().catch(console.error);

