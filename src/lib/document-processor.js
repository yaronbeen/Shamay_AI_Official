import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { extractWithFallback } from './anthropic-client.js';
import { DatabaseClient } from './database-client.js';

export async function processDocument(filePath) {
  try {
    console.log(`Processing document: ${filePath}`);
    
    // Extract text from PDF
    const pdfBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(pdfBuffer);
    const documentText = pdfData.text;
    
    console.log(`Extracted ${documentText.length} characters from PDF`);
    
    // Extract structured data using Anthropic
    const extractedData = await extractWithFallback(documentText);
    
    // Add document metadata
    const result = {
      ...extractedData,
      document_filename: path.basename(filePath),
      document_path: filePath,
      text_length: documentText.length,
      processed_at: new Date().toISOString(),
      raw_text: documentText,
    };
    
    return result;
    
  } catch (error) {
    console.error(`Document processing failed for ${filePath}:`, error);
    throw new Error(`Document processing error: ${error.message}`);
  }
}

export async function processAndSave(filePath, outputDir = 'output', saveToDb = true) {
  try {
    const result = await processDocument(filePath);
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Generate output filename
    const baseName = path.basename(filePath, '.pdf');
    const outputPath = path.join(outputDir, `${baseName}-extracted.json`);
    
    let dbRecord = null;
    
    // Save to database if requested
    if (saveToDb) {
      try {
        const db = new DatabaseClient();
        dbRecord = await db.insertExtraction(result);
        await db.disconnect();
        console.log(`💾 Saved to database with ID: ${dbRecord.id}`);
      } catch (dbError) {
        console.warn('⚠️  Database save failed, continuing with file save:', dbError.message);
      }
    }
    
    // Save extracted data to file
    const outputData = {
      ...result,
      ...(dbRecord && { database_id: dbRecord.id }),
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf8');
    
    console.log(`📁 Extraction saved to: ${outputPath}`);
    console.log(`🎯 Overall confidence: ${(result.confidence_scores?.overall * 100 || 0).toFixed(1)}%`);
    
    return {
      result: outputData,
      outputPath,
      databaseId: dbRecord?.id,
    };
    
  } catch (error) {
    console.error('Process and save failed:', error);
    throw error;
  }
}

export function validateExtraction(data) {
  const issues = [];
  
  // Check required fields
  if (!data.gush && !data.chelka) {
    issues.push('Missing both gush and chelka - core property identifiers');
  }
  
  if (data.confidence_scores?.overall < 0.7) {
    issues.push(`Low overall confidence: ${(data.confidence_scores.overall * 100).toFixed(1)}%`);
  }
  
  if (!data.owners || data.owners.length === 0) {
    issues.push('No property owners identified');
  }
  
  // Check data quality
  if (data.apartment_area && (data.apartment_area < 10 || data.apartment_area > 1000)) {
    issues.push(`Unusual apartment area: ${data.apartment_area} sqm`);
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    score: data.confidence_scores?.overall || 0,
  };
}