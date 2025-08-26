/**
 * Backend API Test Script
 * Tests the /upload endpoint with a real PDF file
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const http = require('http');

async function testBackendUpload() {
  const SERVER_URL = 'http://localhost:3000';
  const PDF_PATH = '/mnt/c/Users/dell/Documents/Projects/Shamay/שומות שווי שוק/שומה מלאה/נסח טאבו.pdf';
  
  console.log('🧪 Testing Backend Upload API\n');

  try {
    // Check if PDF file exists
    if (!fs.existsSync(PDF_PATH)) {
      console.log(`❌ PDF file not found at: ${PDF_PATH}`);
      console.log('Please update PDF_PATH in the script or use a different file.\n');
      process.exit(1);
    }

    console.log(`📄 PDF file found: ${path.basename(PDF_PATH)}`);
    console.log(`📊 File size: ${(fs.statSync(PDF_PATH).size / 1024).toFixed(1)} KB`);

    // Create form data with PDF file
    const form = new FormData();
    form.append('document', fs.createReadStream(PDF_PATH), {
      filename: path.basename(PDF_PATH),
      contentType: 'application/pdf'
    });

    console.log(`\n🚀 Uploading to ${SERVER_URL}/upload...`);
    const startTime = Date.now();

    // Make POST request using native http module
    const result = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/upload',
        method: 'POST',
        headers: form.getHeaders()
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const responseTime = Date.now() - startTime;
          console.log(`⏱️  Response time: ${responseTime}ms`);
          
          if (res.statusCode !== 200) {
            console.log(`❌ Upload failed with status: ${res.statusCode}`);
            console.log('Error details:', data);
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            return;
          }
          
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Invalid JSON response: ' + data));
          }
        });
      });
      
      req.on('error', reject);
      form.pipe(req);
    });
    
    console.log('\n✅ Upload successful!');
    console.log('📋 Results:');
    console.log(`   Record ID: ${result.recordId}`);
    console.log(`   Gush: ${result.results.gush}`);
    console.log(`   Chelka: ${result.results.chelka}`);
    console.log(`   Sub-Chelka: ${result.results.subChelka}`);
    console.log(`   Apartment Area: ${result.results.apartmentArea}`);
    console.log(`   Owners Count: ${result.results.ownersCount}`);
    console.log(`   Overall Confidence: ${result.results.overallConfidence}%`);

    // Test fetching the results back
    console.log(`\n🔍 Fetching results from database...`);
    const dbResult = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: 3000,
        path: `/api/results/${result.recordId}`,
        method: 'GET'
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error('Invalid JSON response'));
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      });
      req.on('error', reject);
      req.end();
    });

    console.log('✅ Database fetch successful');
    console.log(`   Document: ${dbResult.property.document_filename}`);
    console.log(`   Processing time: ${dbResult.property.processing_time_ms}ms`);
    console.log(`   Created: ${new Date(dbResult.property.created_at).toLocaleString()}`);

    console.log('\n🎉 Backend test completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure the server is running:');
      console.log('   node server.js');
      console.log('   or npm start');
    }
  }
}

// Check if required dependencies are available
try {
  require('form-data');
} catch (error) {
  console.log('❌ Missing dependencies. Install them with:');
  console.log('npm install form-data');
  process.exit(1);
}

// Run the test
testBackendUpload();