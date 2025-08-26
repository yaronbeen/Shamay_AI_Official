// Main entry point for Shamay SaaS PDF processing
const { processDocument, extractFieldsFromMarkdown, FieldParser } = require('./tabu');

module.exports = {
  // Main processing functions
  processDocument,
  extractFieldsFromMarkdown,
  
  // Individual components
  FieldParser
};