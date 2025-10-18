/**
 * Land Registry Management Module
 * 
 * Main module that provides direct PDF processing and field extraction
 * for Hebrew land registry documents (נסח טאבו) using AI and custom parsers.
 */

import { LandRegistryAIExtractor } from './ai-field-extractor.js';
import { LandRegistryDatabaseClient } from './database-client.js';
import path from 'path';
import fs from 'fs';

/**
 * Process a complete land registry document: PDF -> Field Extraction -> Database
 * @param {string} pdfPath - Path to input PDF file
 * @param {Object} options - Processing options
 * @param {boolean} options.useAI - Use Anthropic for field extraction (default: true)
 * @param {string} options.anthropicApiKey - Anthropic API key
 * @param {boolean} options.saveToDatabase - Save to database (default: true)
 * @returns {Promise<Object>} - Complete processing results
 */
async function processLandRegistryDocument(pdfPath, options = {}) {
  try {
    // Step 1: Extract fields directly from PDF
    console.log(`Extracting land registry fields using ${options.useAI !== false ? 'Anthropic AI (direct PDF)' : 'regex patterns'}...`);
    let extractionResults;
    
    if (options.useAI !== false) {
      const aiExtractor = new LandRegistryAIExtractor(options.anthropicApiKey);
      // Direct PDF processing with Anthropic
      console.log('📄 Processing PDF directly with Anthropic...');
      extractionResults = await aiExtractor.extractAllFields(pdfPath, { isPdf: true });
    } else {
      // For regex-based extraction, we'd need to extract text first
      // This would require pdf-parse or similar library
      throw new Error('Regex-based extraction requires text extraction from PDF. Please use AI mode.');
    }

    // Step 2: Save to database if requested
    let databaseResult = null;
    if (options.saveToDatabase !== false) {
      console.log('💾 Saving to database...');
      const db = new LandRegistryDatabaseClient();
      
      // Prepare extraction data for database - pass the raw extracted data
      const dbData = extractionResults.rawExtractedData || extractionResults;
      
      databaseResult = await db.insertLandRegistryExtract(dbData, path.basename(pdfPath));
      await db.disconnect();
    }

    // Step 3: Calculate overall confidence and prepare results
    const fieldsExtracted = Object.keys(extractionResults).filter(key => 
      extractionResults[key]?.value !== null && extractionResults[key]?.value !== undefined
    ).length;
    
    const totalFields = 5; // gush, chelka, sub_chelka, apartment_area, attachments
    const extractionCompleteness = (fieldsExtracted / totalFields) * 100;

    return {
      success: true,
      filename: path.basename(pdfPath),
      extractionResults: extractionResults,
      databaseResult: databaseResult,
      summary: {
        fieldsExtracted: fieldsExtracted,
        totalFields: totalFields,
        completeness: extractionCompleteness,
        overallConfidence: extractionResults.overallConfidence,
        processingTime: extractionResults.processingTime
      },
      costs: {
        tokensUsed: extractionResults.tokensUsed,
        estimatedCost: extractionResults.cost
      }
    };

  } catch (error) {
    console.error('❌ Land registry processing failed:', error.message);
    return {
      success: false,
      error: error.message,
      filename: path.basename(pdfPath)
    };
  }
}

/**
 * Create a new land registry record from user input
 * @param {Object} landRegistryData - Land registry data
 * @param {string} userId - ID of user creating the record
 * @returns {Promise<Object>} - Creation result
 */
async function createLandRegistryRecord(landRegistryData, userId = 'system') {
  try {
    console.log('📋 Creating new land registry record...');
    
    const db = new LandRegistryDatabaseClient();
    const result = await db.insertLandRegistryExtract(landRegistryData, landRegistryData.filename || 'manual-entry');
    await db.disconnect();
    
    console.log(`✅ Land registry record created successfully with ID: ${result.id}`);
    
    return {
      success: true,
      id: result.id,
      created_at: result.created_at,
      data: landRegistryData
    };
    
  } catch (error) {
    console.error('❌ Failed to create land registry record:', error.message);
    throw error;
  }
}

/**
 * Get land registry record by ID
 * @param {number} id - Record ID
 * @returns {Promise<Object>} - Land registry record
 */
async function getLandRegistryRecord(id) {
  try {
    const db = new LandRegistryDatabaseClient();
    const result = await db.getLandRegistryExtractById(id);
    await db.disconnect();
    
    if (!result) {
      throw new Error(`Land registry record with ID ${id} not found`);
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Failed to get land registry record:', error.message);
    throw error;
  }
}

/**
 * Search land registry records by Gush and Chelka
 * @param {number} gush - Block number
 * @param {number} chelka - Plot number (optional)
 * @returns {Promise<Array>} - Array of matching records
 */
async function searchLandRegistryByLocation(gush, chelka = null) {
  try {
    const db = new LandRegistryDatabaseClient();
    const results = await db.searchByGushChelka(gush, chelka);
    await db.disconnect();
    
    return results;
    
  } catch (error) {
    console.error('❌ Failed to search land registry records:', error.message);
    throw error;
  }
}

export {
  processLandRegistryDocument,
  createLandRegistryRecord,
  getLandRegistryRecord,
  searchLandRegistryByLocation
};