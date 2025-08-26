/**
 * Shared Building Order Module - Hebrew Shared Building Order Document Processing
 * 
 * Main module that provides direct PDF processing and field extraction
 * for Hebrew shared building order (צו רישום בית משותף) documents using AI and custom parsers.
 */
import { SharedBuildingFieldParser } from './field-parser.js';
import { SharedBuildingAIExtractor } from './ai-field-extractor.js';
import { SharedBuildingDatabaseClient } from '../src/lib/shared-building-db-client.js';
import path from 'path';
import fs from 'fs';

/**
 * Process a complete shared building order document: PDF -> Field Extraction -> Database
 * @param {string} pdfPath - Path to input PDF file
 * @param {string} outputDir - Directory to save markdown file (optional)
 * @param {Object} options - Processing options
 * @param {boolean} options.useAI - Use Anthropic for field extraction (default: true)
 * @param {string} options.anthropicApiKey - Anthropic API key
 * @param {boolean} options.saveToDatabase - Save to database (default: true)
 * @returns {Promise<Object>} - Complete processing results
 */
async function processSharedBuildingDocument(pdfPath, outputDir = 'output', options = {}) {
  try {
    // Step 1: Extract fields directly from PDF
    console.log(`Extracting shared building fields using ${options.useAI !== false ? 'Anthropic AI' : 'regex patterns'}...`);
    let extractionResults;
    
    if (options.useAI !== false) {
      const aiExtractor = new SharedBuildingAIExtractor(options.anthropicApiKey);
      // Direct PDF processing with Anthropic
      extractionResults = await aiExtractor.extractAllFields(pdfPath, { isPdf: true });
    } else {
      // For regex-based extraction, we'd need to extract text first
      // This would require pdf-parse or similar library
      throw new Error('Regex-based extraction requires text extraction from PDF. Please use AI mode.');
    }

    // Step 2: Save to database if requested
    let databaseResult = null;
    if (options.saveToDatabase !== false) {
      console.log('Saving to database...');
      const db = new SharedBuildingDatabaseClient();
      
      // Prepare extraction data for database
      const dbData = {
        order_issue_date: extractionResults.order_issue_date?.value,
        building_description: extractionResults.building_description?.value,
        building_floors: extractionResults.building_floors?.value,
        building_sub_plots_count: extractionResults.building_sub_plots_count?.value,
        building_address: extractionResults.building_address?.value,
        total_sub_plots: extractionResults.total_sub_plots?.value,
        sub_plots: extractionResults.sub_plots?.value || [],
        
        confidence_scores: {
          order_issue_date: Math.min((extractionResults.order_issue_date?.confidence || 0) / 100, 1.0),
          building_description: Math.min((extractionResults.building_description?.confidence || 0) / 100, 1.0),
          building_floors: Math.min((extractionResults.building_floors?.confidence || 0) / 100, 1.0),
          building_sub_plots_count: Math.min((extractionResults.building_sub_plots_count?.confidence || 0) / 100, 1.0),
          building_address: Math.min((extractionResults.building_address?.confidence || 0) / 100, 1.0),
          total_sub_plots: Math.min((extractionResults.total_sub_plots?.confidence || 0) / 100, 1.0),
          overall: Math.min((extractionResults.overallConfidence || 0) / 100, 1.0)
        },
        
        extraction_contexts: {
          order_issue_date: extractionResults.order_issue_date?.context,
          building_description: extractionResults.building_description?.context,
          building_floors: extractionResults.building_floors?.context,
          building_sub_plots_count: extractionResults.building_sub_plots_count?.context,
          building_address: extractionResults.building_address?.context,
          total_sub_plots: extractionResults.total_sub_plots?.context
        },
        
        raw_text: conversionResult.markdownContent,
        extraction_method: options.useAI !== false ? 'anthropic_ai_with_markitdown' : 'regex_with_markitdown',
        model_used: extractionResults.model || 'claude-opus-4-1-20250805'
      };
      
      const filename = path.basename(pdfPath);
      databaseResult = await db.insertSharedBuildingOrder(dbData, filename);
      await db.disconnect();
    }

    // Step 5: Combine results
    const combinedResults = {
      // Conversion metadata
      conversion: {
        success: conversionResult.success,
        method: conversionResult.method,
        processingTimeMs: conversionResult.processingTimeMs,
        characterCount: conversionResult.characterCount,
        outputPath: conversionResult.outputPath
      },
      
      // Field extraction results
      fields: {
        order_issue_date: extractionResults.order_issue_date,
        building_description: extractionResults.building_description,
        building_floors: extractionResults.building_floors,
        building_sub_plots_count: extractionResults.building_sub_plots_count,
        building_address: extractionResults.building_address,
        total_sub_plots: extractionResults.total_sub_plots,
        sub_plots: extractionResults.sub_plots,
        overallConfidence: extractionResults.overallConfidence,
        processingTime: extractionResults.processingTime
      },

      // Database results
      database: databaseResult ? {
        id: databaseResult.id,
        processed_at: databaseResult.processed_at
      } : null,

      // Original content for reference
      content: {
        markdownContent: conversionResult.markdownContent,
        markdownPath: conversionResult.outputPath
      }
    };

    console.log(`Shared building order processing completed successfully:`);
    console.log(`- Conversion: ${conversionResult.processingTimeMs}ms`);
    console.log(`- Field extraction: ${extractionResults.processingTime || 0}ms`);
    console.log(`- Overall confidence: ${(extractionResults.overallConfidence || 0).toFixed(1)}%`);
    console.log(`- Database ID: ${databaseResult?.id || 'Not saved'}`);
    console.log(`- Building: ${extractionResults.building_description?.value || 'Not found'}`);
    console.log(`- Sub-plots: ${extractionResults.sub_plots?.value?.length || 0} found`);

    return combinedResults;

  } catch (error) {
    console.error('Shared building order processing failed:', error.message);
    throw error;
  }
}

/**
 * Extract fields from existing markdown content
 * @param {string} markdownContent - Markdown text content
 * @param {Object} options - Processing options
 * @returns {Object} - Field extraction results
 */
function extractFieldsFromMarkdown(markdownContent, options = {}) {
  if (options.useAI !== false) {
    const aiExtractor = new SharedBuildingAIExtractor(options.anthropicApiKey);
    return aiExtractor.extractAllFields(markdownContent);
  } else {
    const parser = new SharedBuildingFieldParser();
    return parser.extractAllFields(markdownContent);
  }
}

/**
 * Extract fields from existing markdown file
 * @param {string} markdownPath - Path to markdown file
 * @param {Object} options - Processing options
 * @returns {Object} - Field extraction results
 */
function extractFieldsFromMarkdownFile(markdownPath, options = {}) {
  if (!fs.existsSync(markdownPath)) {
    throw new Error(`Markdown file not found: ${markdownPath}`);
  }
  
  const markdownContent = fs.readFileSync(markdownPath, 'utf8');
  return extractFieldsFromMarkdown(markdownContent, options);
}

export {
  // Main processing functions
  processSharedBuildingDocument,
  extractFieldsFromMarkdown,
  extractFieldsFromMarkdownFile,
  
  // Individual components (for advanced usage)
  SharedBuildingFieldParser,
  SharedBuildingAIExtractor,
  SharedBuildingDatabaseClient
};