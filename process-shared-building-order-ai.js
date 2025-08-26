import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { extractWithFallback } from './src/lib/shared-building-order-client.js';
import { SharedBuildingDatabaseClient } from './src/lib/shared-building-db-client.js';

dotenv.config();

async function processSharedBuildingOrder(filePath) {
  try {
    console.log(`🚀 Processing shared building order document: ${filePath}`);
    
    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('❌ ANTHROPIC_API_KEY not found in environment variables');
      process.exit(1);
    }
    
    // Extract text from PDF
    console.log('📄 Extracting text from PDF...');
    const pdfBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(pdfBuffer);
    const documentText = pdfData.text;
    
    console.log(`📝 Extracted ${documentText.length} characters from PDF`);
    
    // Test database connection
    const db = new SharedBuildingDatabaseClient();
    const dbConnected = await db.testConnection();
    
    if (!dbConnected) {
      console.error('❌ Database connection failed');
      process.exit(1);
    }
    
    // Extract structured data using Anthropic
    console.log('🤖 Extracting structured data with Claude Opus...');
    const startTime = Date.now();
    const extractedData = await extractWithFallback(documentText);
    const processingTime = Date.now() - startTime;
    
    // Add raw text to extraction data
    extractedData.raw_text = documentText;
    
    console.log(`⏱️  Processing completed in ${processingTime}ms`);
    
    // Save to database
    const filename = path.basename(filePath);
    const dbResult = await db.insertSharedBuildingOrder(extractedData, filename);
    await db.disconnect();
    
    console.log(`💾 Saved to database with ID: ${dbResult.id}`);
    
    // Save to JSON file for backup
    const outputDir = 'output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const baseName = path.basename(filePath, '.pdf');
    const outputPath = path.join(outputDir, `${baseName}-shared-building-extracted.json`);
    
    const outputData = {
      ...extractedData,
      database_id: dbResult.id,
      document_filename: filename,
      document_path: filePath,
      text_length: documentText.length,
      processed_at: new Date().toISOString()
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf8');
    console.log(`📁 Backup saved to: ${outputPath}`);
    
    // Display results
    console.log(`\n📊 Extraction Results:`);
    console.log(`  Overall Confidence: ${(extractedData.confidence_scores?.overall * 100 || 0).toFixed(1)}%`);
    console.log(`  Database Record ID: ${dbResult.id}`);
    
    console.log(`\n📋 Extracted Data Summary:`);
    console.log(`  Order Issue Date: ${extractedData.order_issue_date || 'Not found'}`);
    console.log(`  Building Description: ${extractedData.building_description || 'Not found'}`);
    console.log(`  Building Address: ${extractedData.building_address || 'Not found'}`);
    console.log(`  Building Floors: ${extractedData.building_floors || 'Not found'}`);
    console.log(`  Building Sub-plots: ${extractedData.building_sub_plots_count || 'Not found'}`);
    console.log(`  Total Sub-plots: ${extractedData.total_sub_plots || 'Not found'}`);
    console.log(`  Sub-plots Details: ${extractedData.sub_plots?.length || 0} found`);
    
    if (extractedData.confidence_scores) {
      console.log(`\n🎯 Confidence Scores:`);
      Object.entries(extractedData.confidence_scores).forEach(([field, score]) => {
        const percentage = (score * 100).toFixed(1);
        const status = score > 0.8 ? '🟢' : score > 0.6 ? '🟡' : '🔴';
        console.log(`  ${field}: ${percentage}% ${status}`);
      });
    }
    
    console.log(`\n✨ Shared building order processing completed successfully!`);
    
  } catch (error) {
    console.error('❌ Processing failed:', error.message);
    process.exit(1);
  }
}

// Process the specific file
const filePath = 'צו-רישום.pdf';
if (fs.existsSync(filePath)) {
  processSharedBuildingOrder(filePath);
} else {
  console.error(`❌ File not found: ${filePath}`);
  console.log('Available PDF files:');
  const pdfFiles = fs.readdirSync('.').filter(f => f.endsWith('.pdf'));
  pdfFiles.forEach(file => console.log(`  - ${file}`));
}