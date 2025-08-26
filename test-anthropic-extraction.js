import dotenv from 'dotenv';
import { processDocument, processAndSave, validateExtraction } from './src/lib/document-processor.js';
import { DatabaseClient } from './src/lib/database-client.js';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

async function testAnthropicExtraction() {
  try {
    console.log('🚀 Testing Anthropic-based document extraction...\n');
    
    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('❌ ANTHROPIC_API_KEY not found in environment variables');
      console.log('Please set your API key in .env file');
      process.exit(1);
    }
    
    // Look for PDF files to test
    const testFiles = [];
    
    // Check common locations for test PDFs
    const searchPaths = [
      'tabu',
      'uploads',
      'temp',
      '.'
    ];
    
    for (const searchPath of searchPaths) {
      if (fs.existsSync(searchPath)) {
        const files = fs.readdirSync(searchPath)
          .filter(file => file.toLowerCase().endsWith('.pdf'))
          .map(file => path.join(searchPath, file));
        testFiles.push(...files);
      }
    }
    
    if (testFiles.length === 0) {
      console.log('❌ No PDF files found for testing');
      console.log('Please place a PDF file in one of these directories: tabu/, uploads/, temp/, or current directory');
      return;
    }
    
    console.log(`📄 Found ${testFiles.length} PDF file(s) to test:`);
    testFiles.forEach((file, i) => console.log(`  ${i + 1}. ${file}`));
    console.log();
    
    // Test Hebrew document first if available
    const hebrewFile = testFiles.find(f => f.includes('נסח-טאבו'));
    const testFile = hebrewFile || testFiles[0];
    console.log(`🔍 Testing extraction on: ${testFile}`);
    
    // Test database connection first
    console.log(`🔗 Testing database connection...`);
    const db = new DatabaseClient();
    const dbConnected = await db.testConnection();
    await db.disconnect();
    
    if (!dbConnected) {
      console.log(`⚠️  Database not available, will save to file only`);
    }
    
    const startTime = Date.now();
    const { result, outputPath, databaseId } = await processAndSave(testFile, 'output', dbConnected);
    const processingTime = Date.now() - startTime;
    
    console.log(`\n✅ Processing completed in ${processingTime}ms`);
    console.log(`📄 Results saved to: ${outputPath}`);
    if (databaseId) {
      console.log(`💾 Database record ID: ${databaseId}`);
    }
    
    // Validate extraction
    const validation = validateExtraction(result);
    console.log(`\n📊 Extraction Quality:`);
    console.log(`  Overall Score: ${(validation.score * 100).toFixed(1)}%`);
    console.log(`  Status: ${validation.isValid ? '✅ Valid' : '⚠️ Issues Found'}`);
    
    if (validation.issues.length > 0) {
      console.log(`  Issues:`);
      validation.issues.forEach(issue => console.log(`    - ${issue}`));
    }
    
    // Display key extracted data
    console.log(`\n📋 Extracted Data Summary:`);
    console.log(`  Gush (Block): ${result.gush || 'Not found'}`);
    console.log(`  Chelka (Plot): ${result.chelka || 'Not found'}`);
    console.log(`  Sub-Chelka: ${result.sub_chelka || 'Not found'}`);
    console.log(`  Area: ${result.apartment_area || 'Not found'} sqm`);
    console.log(`  Owners: ${result.owners?.length || 0} found`);
    
    if (result.owners && result.owners.length > 0) {
      console.log(`  Owner Details:`);
      result.owners.forEach((owner, i) => {
        console.log(`    ${i + 1}. ${owner.hebrew_name || owner.english_name || 'Unknown'}`);
        if (owner.ownership_share) {
          console.log(`       Share: ${owner.ownership_share}`);
        }
      });
    }
    
    console.log(`\n🎯 Confidence Scores:`);
    if (result.confidence_scores) {
      Object.entries(result.confidence_scores).forEach(([field, score]) => {
        const percentage = (score * 100).toFixed(1);
        const status = score > 0.8 ? '🟢' : score > 0.6 ? '🟡' : '🔴';
        console.log(`  ${field}: ${percentage}% ${status}`);
      });
    }
    
    console.log(`\n✨ Test completed successfully!`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.message.includes('API key')) {
      console.log('\n💡 Make sure to:');
      console.log('  1. Set ANTHROPIC_API_KEY in your .env file');
      console.log('  2. Restart the script after adding the API key');
    }
    process.exit(1);
  }
}

// Run the test
testAnthropicExtraction();