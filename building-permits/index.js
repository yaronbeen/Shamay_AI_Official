/**
 * Building Permits Module - Hebrew Building Permits Document Processing
 * 
 * Main module that provides direct PDF processing and field extraction
 * for Hebrew building permits (היתר בנייה מילולי) documents using AI and custom parsers.
 */
import { BuildingPermitFieldParser } from './field-parser.js';
import { BuildingPermitAIExtractor } from './ai-field-extractor.js';
import { BuildingPermitDatabaseClient } from './database-client.js';
import path from 'path';
import fs from 'fs';

/**
 * Process a complete building permit document: PDF -> Field Extraction -> Database
 * @param {string} pdfPath - Path to input PDF file
 * @param {string} outputDir - Directory to save markdown file (optional)
 * @param {Object} options - Processing options
 * @param {boolean} options.useAI - Use Anthropic for field extraction (default: true)
 * @param {string} options.anthropicApiKey - Anthropic API key
 * @param {boolean} options.saveToDatabase - Save to database (default: true)
 * @returns {Promise<Object>} - Complete processing results
 */
async function processBuildingPermitDocument(pdfPath, outputDir = 'output', options = {}) {
  try {
    // Step 1: Extract fields directly from PDF
    console.log(`Extracting building permit fields using ${options.useAI !== false ? 'Anthropic AI (direct PDF)' : 'regex patterns'}...`);
    let extractionResults;
    
    if (options.useAI !== false) {
      const aiExtractor = new BuildingPermitAIExtractor(options.anthropicApiKey);
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
      console.log('Saving to database...');
      const db = new BuildingPermitDatabaseClient();
      
      // Prepare extraction data for database
      const dbData = {
        permit_number: extractionResults.permit_number?.value,
        permit_date: extractionResults.permit_date?.value,
        permitted_description: extractionResults.permitted_description?.value,
        permit_issue_date: extractionResults.permit_issue_date?.value,
        local_committee_name: extractionResults.local_committee_name?.value,
        
        confidence_scores: {
          permit_number: Math.min((extractionResults.permit_number?.confidence || 0) / 100, 1.0),
          permit_date: Math.min((extractionResults.permit_date?.confidence || 0) / 100, 1.0),
          permitted_description: Math.min((extractionResults.permitted_description?.confidence || 0) / 100, 1.0),
          permit_issue_date: Math.min((extractionResults.permit_issue_date?.confidence || 0) / 100, 1.0),
          local_committee_name: Math.min((extractionResults.local_committee_name?.confidence || 0) / 100, 1.0),
          overall: Math.min((extractionResults.overallConfidence || 0) / 100, 1.0)
        },
        
        extraction_contexts: {
          permit_number: extractionResults.permit_number?.context,
          permit_date: extractionResults.permit_date?.context,
          permitted_description: extractionResults.permitted_description?.context,
          permit_issue_date: extractionResults.permit_issue_date?.context,
          local_committee_name: extractionResults.local_committee_name?.context
        },
        
        raw_text: conversionResult.markdownContent,
        extraction_method: options.useAI !== false ? 'anthropic_ai_with_markitdown' : 'regex_with_markitdown',
        model_used: extractionResults.model || 'claude-opus-4-1-20250805',
        processing_time: extractionResults.processingTime,
        document_path: pdfPath,
        markdown_path: markdownPath
      };
      
      const filename = path.basename(pdfPath);
      databaseResult = await db.insertBuildingPermit(dbData, filename);
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
        permit_number: extractionResults.permit_number,
        permit_date: extractionResults.permit_date,
        permitted_description: extractionResults.permitted_description,
        permit_issue_date: extractionResults.permit_issue_date,
        local_committee_name: extractionResults.local_committee_name,
        property_address: extractionResults.property_address,
        gush: extractionResults.gush,
        chelka: extractionResults.chelka,
        sub_chelka: extractionResults.sub_chelka,
        overallConfidence: extractionResults.overallConfidence,
        processingTime: extractionResults.processingTime
      },

      // Database results
      database: databaseResult ? {
        id: databaseResult.id,
        extracted_at: databaseResult.extracted_at
      } : null,

      // Original content for reference
      content: {
        markdownContent: conversionResult.markdownContent,
        markdownPath: conversionResult.outputPath
      }
    };

    console.log(`Building permit processing completed successfully:`);
    console.log(`- Conversion: ${conversionResult.processingTimeMs}ms`);
    console.log(`- Field extraction: ${extractionResults.processingTime || 0}ms`);
    console.log(`- Overall confidence: ${(extractionResults.overallConfidence || 0).toFixed(1)}%`);
    console.log(`- Database ID: ${databaseResult?.id || 'Not saved'}`);
    console.log(`- Permit Number: ${extractionResults.permit_number?.value || 'Not found'}`);
    console.log(`- Committee: ${extractionResults.local_committee_name?.value || 'Not found'}`);

    return combinedResults;

  } catch (error) {
    console.error('Building permit processing failed:', error.message);
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
    const aiExtractor = new BuildingPermitAIExtractor(options.anthropicApiKey);
    return aiExtractor.extractAllFields(markdownContent);
  } else {
    const parser = new BuildingPermitFieldParser();
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
  processBuildingPermitDocument,
  extractFieldsFromMarkdown,
  extractFieldsFromMarkdownFile,
  
  // Individual components (for advanced usage)
  BuildingPermitFieldParser,
  BuildingPermitAIExtractor,
  BuildingPermitDatabaseClient
};