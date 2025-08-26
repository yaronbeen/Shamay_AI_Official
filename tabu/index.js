/**
 * Tabu Module - Hebrew Land Registry Document Processing
 * 
 * Main module that provides PDF to markdown conversion and field extraction
 * for Hebrew land registry (Tabu) documents using MarkItDown and custom parsers.
 */

const { convertPdfToMarkdown } = require('./pdf-converter');
const { FieldParser } = require('./field-parser');
const { AIFieldExtractor } = require('./ai-field-extractor');
const path = require('path');
const fs = require('fs');

/**
 * Process a complete document: PDF -> Markdown -> Field Extraction
 * @param {string} pdfPath - Path to input PDF file
 * @param {string} outputDir - Directory to save markdown file (optional)
 * @param {Object} options - Processing options
 * @param {boolean} options.useAI - Use OpenAI for field extraction (default: false)
 * @param {string} options.openaiApiKey - OpenAI API key
 * @returns {Promise<Object>} - Complete processing results
 */
async function processDocument(pdfPath, outputDir = 'output', options = {}) {
  try {
    // Step 1: Generate output path with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseName = path.basename(pdfPath, '.pdf');
    const markdownFileName = `${baseName}-${timestamp}.md`;
    const markdownPath = path.join(outputDir, markdownFileName);

    // Step 2: Convert PDF to markdown using MarkItDown
    console.log(`Converting PDF to markdown: ${pdfPath} -> ${markdownPath}`);
    const conversionResult = await convertPdfToMarkdown(pdfPath, markdownPath);
    
    // Step 3: Extract fields from the generated markdown
    console.log(`Extracting fields using ${options.useAI ? 'OpenAI' : 'regex patterns'}...`);
    let extractionResults;
    
    if (options.useAI) {
      const aiExtractor = new AIFieldExtractor(options.openaiApiKey);
      extractionResults = await aiExtractor.extractAllFields(conversionResult.markdownContent);
    } else {
      const parser = new FieldParser();
      extractionResults = parser.extractAllFields(conversionResult.markdownContent);
    }

    // Step 4: Combine results
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
        gush: extractionResults.gush,
        chelka: extractionResults.chelka,
        subChelka: extractionResults.subChelka,
        apartmentArea: extractionResults.apartmentArea,
        owners: extractionResults.owners,
        attachments: extractionResults.attachments,
        overallConfidence: extractionResults.overallConfidence,
        processingTime: extractionResults.processingTime
      },

      // Original content for database storage
      content: {
        markdownContent: conversionResult.markdownContent,
        markdownPath: conversionResult.outputPath
      }
    };

    console.log(`Document processing completed successfully:`);
    console.log(`- Conversion: ${conversionResult.processingTimeMs}ms`);
    console.log(`- Field extraction: ${extractionResults.processingTime}ms`);
    console.log(`- Overall confidence: ${extractionResults.overallConfidence.toFixed(1)}%`);
    console.log(`- Fields found: Gush=${extractionResults.gush.value}, Chelka=${extractionResults.chelka.value}, Owners=${extractionResults.owners.count}`);

    return combinedResults;

  } catch (error) {
    console.error('Document processing failed:', error.message);
    throw error;
  }
}

/**
 * Extract fields from existing markdown content
 * @param {string} markdownContent - Markdown text content
 * @returns {Object} - Field extraction results
 */
function extractFieldsFromMarkdown(markdownContent) {
  const parser = new FieldParser();
  return parser.extractAllFields(markdownContent);
}

/**
 * Extract fields from existing markdown file
 * @param {string} markdownPath - Path to markdown file
 * @returns {Object} - Field extraction results
 */
function extractFieldsFromMarkdownFile(markdownPath) {
  if (!fs.existsSync(markdownPath)) {
    throw new Error(`Markdown file not found: ${markdownPath}`);
  }
  
  const markdownContent = fs.readFileSync(markdownPath, 'utf8');
  return extractFieldsFromMarkdown(markdownContent);
}

module.exports = {
  // Main processing functions
  processDocument,
  extractFieldsFromMarkdown,
  extractFieldsFromMarkdownFile,
  
  // Individual components (for advanced usage)
  convertPdfToMarkdown,
  FieldParser,
  AIFieldExtractor
};