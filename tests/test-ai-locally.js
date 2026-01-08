#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing AI Extraction Locally');
console.log('================================\n');

// Colors
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

// Test configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const TEST_DOCS_DIR = path.join(__dirname, 'integrations/test_documents');

// Test files
const testFiles = {
  landRegistry: 'tabu_example.pdf',
  buildingPermit: 'building_permit_2.PDF',
  sharedBuilding: 'shared_building_example_3.pdf',
  interiorImage: 'interior_image_1.jpg',
  exteriorImage: 'external_image.jpg'
};

async function testEndpoint(name, endpoint, fileKey) {
  console.log(`\n📋 Testing ${name}...`);
  
  const filePath = path.join(TEST_DOCS_DIR, testFiles[fileKey]);
  
  if (!fs.existsSync(filePath)) {
    console.log(`${colors.yellow}⚠️  Test file not found: ${filePath}${colors.reset}`);
    return;
  }
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/ai/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileUrl: filePath,
        sessionId: 'test-session'
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`${colors.green}✅ Success!${colors.reset}`);
      
      // Show key extracted fields
      if (endpoint === 'land-registry') {
        console.log(`   Gush: ${result.gush || 'N/A'}`);
        console.log(`   Chelka: ${result.chelka || 'N/A'}`);
        console.log(`   Area: ${result.registeredArea || 'N/A'} m²`);
      } else if (endpoint === 'building-permit') {
        console.log(`   Permit #: ${result.permitNumber || 'N/A'}`);
        console.log(`   Date: ${result.permitDate || 'N/A'}`);
        console.log(`   Description: ${(result.buildingDescription || 'N/A').substring(0, 50)}...`);
      } else if (endpoint === 'shared-building') {
        console.log(`   Date: ${result.order_issue_date || 'N/A'}`);
        console.log(`   Floors: ${result.building_floors || 'N/A'}`);
        console.log(`   Units: ${result.building_sub_plots_count || 'N/A'}`);
      }
      
      console.log(`   Confidence: ${result.confidence || 'N/A'}%`);
    } else {
      console.log(`${colors.red}❌ Failed: ${result.error}${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
  }
}

async function testImageAnalysis() {
  console.log('\n📸 Testing Image Analysis...');
  
  const images = [
    { name: testFiles.interiorImage, url: path.join(TEST_DOCS_DIR, testFiles.interiorImage) }
  ];
  
  try {
    // Test interior
    console.log('  Interior Analysis:');
    const interiorResponse = await fetch(`${BACKEND_URL}/api/ai/interior-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images, sessionId: 'test-session' })
    });
    
    if (interiorResponse.ok) {
      const result = await interiorResponse.json();
      console.log(`  ${colors.green}✅ Success!${colors.reset}`);
      console.log(`     Description: ${(result.description || 'N/A').substring(0, 60)}...`);
    } else {
      console.log(`  ${colors.red}❌ Failed${colors.reset}`);
    }
    
    // Test exterior
    console.log('\n  Exterior Analysis:');
    const exteriorImages = [
      { name: testFiles.exteriorImage, url: path.join(TEST_DOCS_DIR, testFiles.exteriorImage) }
    ];
    
    const exteriorResponse = await fetch(`${BACKEND_URL}/api/ai/exterior-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images: exteriorImages, sessionId: 'test-session' })
    });
    
    if (exteriorResponse.ok) {
      const result = await exteriorResponse.json();
      console.log(`  ${colors.green}✅ Success!${colors.reset}`);
      const assessment = result.extractedData?.overall_assessment || result.overall_assessment || 'N/A';
      console.log(`     Assessment: ${assessment.substring(0, 60)}...`);
    } else {
      console.log(`  ${colors.red}❌ Failed${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
  }
}

async function checkBackendHealth() {
  console.log('🏥 Checking backend health...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    if (response.ok) {
      console.log(`${colors.green}✅ Backend is healthy${colors.reset}`);
      return true;
    }
  } catch (error) {
    console.log(`${colors.red}❌ Backend not reachable at ${BACKEND_URL}${colors.reset}`);
    console.log('   Make sure backend is running: cd backend && npm start');
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Test docs: ${TEST_DOCS_DIR}\n`);
  
  // Check backend health first
  const isHealthy = await checkBackendHealth();
  if (!isHealthy) {
    process.exit(1);
  }
  
  // Check if test documents exist
  const docsExist = Object.values(testFiles).every(file => 
    fs.existsSync(path.join(TEST_DOCS_DIR, file))
  );
  
  if (!docsExist) {
    console.log(`${colors.yellow}⚠️  Some test documents missing${colors.reset}`);
    console.log('   Available test docs:');
    if (fs.existsSync(TEST_DOCS_DIR)) {
      fs.readdirSync(TEST_DOCS_DIR).forEach(file => {
        console.log(`   - ${file}`);
      });
    }
  }
  
  // Run tests
  await testEndpoint('Land Registry', 'land-registry', 'landRegistry');
  await testEndpoint('Building Permit', 'building-permit', 'buildingPermit');
  await testEndpoint('Shared Building', 'shared-building', 'sharedBuilding');
  await testImageAnalysis();
  
  console.log('\n================================');
  console.log(`${colors.green}✅ Testing complete!${colors.reset}`);
  console.log('\nTo test in the UI:');
  console.log('1. Open http://localhost:3000');
  console.log('2. Create a new session');
  console.log('3. Upload documents from integrations/test_documents/');
  console.log('4. Click "Process with AI"\n');
}

// Run tests
runTests().catch(console.error);
