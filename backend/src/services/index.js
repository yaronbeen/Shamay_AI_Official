/**
 * Services Index
 *
 * Central export for all domain services.
 * Import services from this file for cleaner imports.
 *
 * @example
 * const { ValuationService, GISService } = require('./services');
 *
 * @module services
 */

const { db, cache, safeParseJSON } = require("./DatabaseClient");
const ValuationService = require("./ValuationService");
const GISService = require("./GISService");
const GarmushkaService = require("./GarmushkaService");
const ExtractionService = require("./ExtractionService");
const FileStorageService = require("./FileStorageService");
const AIExtractionService = require("./AIExtractionService");

module.exports = {
  // Database utilities
  db,
  cache,
  safeParseJSON,

  // Domain services
  ValuationService,
  GISService,
  GarmushkaService,
  ExtractionService,
  FileStorageService,
  AIExtractionService,
};
