#!/usr/bin/env node

/**
 * Images Management Test Script
 * Interactive CLI tool to test image processing and analysis capabilities
 */

import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { ImageAIExtractor } from './ai-field-extractor.js';
import { ImageDatabaseClient } from './database-client.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('🖼️  Images Management Processing Test');
  console.log('=====================================\n');

  try {
    // Get image path from user
    const imagePath = await question('📄 Enter the path to your image document (JPG/PNG/PDF): ');
    
    // Validate file exists
    if (!fs.existsSync(imagePath)) {
      console.error('❌ File not found:', imagePath);
      process.exit(1);
    }

    const fileExtension = path.extname(imagePath).toLowerCase();
    const supportedFormats = ['.jpg', '.jpeg', '.png', '.pdf'];
    if (!supportedFormats.includes(fileExtension)) {
      console.error('❌ Supported formats: JPG, PNG, PDF');
      process.exit(1);
    }

    console.log(`\n📋 Processing: ${path.basename(imagePath)}`);
    console.log('⏳ Analyzing image using Anthropic AI...\n');

    // Initialize AI extractor
    const extractor = new ImageAIExtractor();
    
    // Determine processing options based on file type
    const isImage = ['.jpg', '.jpeg', '.png'].includes(fileExtension);
    const isPdf = fileExtension === '.pdf';
    
    // Extract fields from image
    const startTime = Date.now();
    const extractionResults = await extractor.extractAllFields(imagePath, { 
      isImage: isImage,
      isPdf: isPdf 
    });
    const processingTime = Date.now() - startTime;

    console.log('✅ Analysis completed!\n');
    console.log('📊 ANALYSIS RESULTS:');
    console.log('===================');
    console.log(`Processing Time: ${processingTime}ms`);
    console.log(`Overall Confidence: ${extractionResults.overallConfidence.toFixed(1)}%`);
    console.log(`Tokens Used: ${extractionResults.tokensUsed}`);
    console.log(`Estimated Cost: $${extractionResults.cost.toFixed(4)}\n`);

    // Display extracted fields
    console.log('📝 EXTRACTED INFORMATION:');
    console.log('========================');
    
    const keyFields = [
      'document_type', 'detected_text', 'image_quality', 'content_description',
      'hebrew_text_detected', 'tables_detected', 'forms_detected'
    ];

    keyFields.forEach(field => {
      const value = extractionResults[field];
      if (value && value.value !== null) {
        console.log(`${field}: ${value.value} (${value.confidence.toFixed(1)}% confidence)`);
      }
    });

    // Show detected elements if available
    if (extractionResults.detected_elements && extractionResults.detected_elements.length > 0) {
      console.log(`\nDetected Elements: ${extractionResults.detected_elements.length} items found`);
    }

    // Show extracted text preview if available
    if (extractionResults.extracted_text_content && extractionResults.extracted_text_content.length > 0) {
      const textPreview = extractionResults.extracted_text_content.substring(0, 200);
      console.log(`\nText Preview: ${textPreview}${extractionResults.extracted_text_content.length > 200 ? '...' : ''}`);
    }

    // Ask if user wants to save to database
    const saveToDb = await question('\n💾 Save results to database? (y/n): ');
    
    if (saveToDb.toLowerCase() === 'y') {
      console.log('\n📥 Saving to database...');
      
      const db = new ImageDatabaseClient();
      
      // Prepare data for database
      const dbData = {
        image_filename: path.basename(imagePath),
        image_format: fileExtension.substring(1).toUpperCase(),
        file_size: fs.statSync(imagePath).size,
        document_type: extractionResults.document_type?.value,
        content_description: extractionResults.content_description?.value,
        image_quality: extractionResults.image_quality?.value,
        detected_text: extractionResults.detected_text?.value,
        hebrew_text_detected: extractionResults.hebrew_text_detected?.value === 'Yes',
        tables_detected: extractionResults.tables_detected?.value === 'Yes',
        forms_detected: extractionResults.forms_detected?.value === 'Yes',
        detected_elements: extractionResults.detected_elements || [],
        extracted_text_content: extractionResults.extracted_text_content || '',
        image_dimensions: extractionResults.image_dimensions || null,
        processing_notes: extractionResults.processing_notes?.value,
        confidence_scores: {
          content_analysis: Math.max(
            extractionResults.document_type?.confidence || 0,
            extractionResults.content_description?.confidence || 0
          ) / 100,
          text_detection: Math.max(
            extractionResults.detected_text?.confidence || 0,
            extractionResults.hebrew_text_detected?.confidence || 0
          ) / 100,
          image_quality: extractionResults.image_quality?.confidence / 100 || 0,
          element_detection: extractionResults.detected_elements?.length > 0 ? 0.8 : 0,
          overall: extractionResults.overallConfidence / 100
        },
        extraction_contexts: {
          content_analysis: 'Analyzed image content and document type',
          text_detection: 'Detected and extracted textual content',
          image_quality: 'Assessed image clarity and processing quality',
          element_detection: 'Identified structural elements and components'
        },
        processingTime: processingTime,
        raw_response: extractionResults.rawResponse
      };
      
      const result = await db.insertImageExtract(dbData, path.basename(imagePath));
      await db.disconnect();
      
      console.log(`✅ Record saved with ID: ${result.id}`);
      console.log(`📅 Created at: ${result.created_at}`);
    }

    // Ask if user wants to see detected elements
    const showElements = await question('\n🔍 Show detected elements? (y/n): ');
    
    if (showElements.toLowerCase() === 'y' && extractionResults.detected_elements && extractionResults.detected_elements.length > 0) {
      console.log('\n🔍 DETECTED ELEMENTS:');
      console.log('====================');
      extractionResults.detected_elements.forEach((element, index) => {
        console.log(`Element ${index + 1}:`);
        console.log(`  - Type: ${element.type || 'N/A'}`);
        console.log(`  - Description: ${element.description || 'N/A'}`);
        console.log(`  - Location: ${element.location || 'N/A'}`);
        console.log(`  - Confidence: ${element.confidence || 'N/A'}`);
        console.log('');
      });
    }

    // Ask if user wants to see full extracted text
    const showFullText = await question('📄 Show full extracted text? (y/n): ');
    
    if (showFullText.toLowerCase() === 'y' && extractionResults.extracted_text_content) {
      console.log('\n📄 FULL EXTRACTED TEXT:');
      console.log('=======================');
      console.log(extractionResults.extracted_text_content);
    }

    console.log('\n🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    rl.close();
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n👋 Test cancelled by user');
  rl.close();
  process.exit(0);
});

main().catch(console.error);