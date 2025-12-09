/**
 * AI Extractor Factory
 * Selects the appropriate extractor based on AI_PROVIDER environment variable
 */

const AI_PROVIDER = process.env.AI_PROVIDER || 'anthropic';

/**
 * Get the appropriate land registry extractor
 * @returns {Object} Extractor instance
 */
function getLandRegistryExtractor() {
  if (AI_PROVIDER === 'gemini') {
    const { LandRegistryGeminiExtractor } = require('../../land-registry-management/ai-field-extractor-gemini.js');
    return new LandRegistryGeminiExtractor(process.env.GEMINI_API_KEY);
  } else {
    const { LandRegistryAIExtractor } = require('../../land-registry-management/ai-field-extractor.js');
    return new LandRegistryAIExtractor(process.env.ANTHROPIC_API_KEY);
  }
}

/**
 * Get the appropriate shared building extractor
 * @returns {Object} Extractor instance
 */
function getSharedBuildingExtractor() {
  if (AI_PROVIDER === 'gemini') {
    const { SharedBuildingGeminiExtractor } = require('../../shared-building-order/ai-field-extractor-gemini.js');
    return new SharedBuildingGeminiExtractor(process.env.GEMINI_API_KEY);
  } else {
    const { SharedBuildingAIExtractor } = require('../../shared-building-order/ai-field-extractor-hebrew.js');
    return new SharedBuildingAIExtractor(process.env.ANTHROPIC_API_KEY);
  }
}

/**
 * Get the appropriate building permit extractor
 * @returns {Object} Extractor instance
 */
function getBuildingPermitExtractor() {
  if (AI_PROVIDER === 'gemini') {
    const { BuildingPermitGeminiExtractor } = require('../../building-permits/ai-field-extractor-gemini.js');
    return new BuildingPermitGeminiExtractor(process.env.GEMINI_API_KEY);
  } else {
    const { BuildingPermitAIExtractor } = require('../../building-permits/ai-field-extractor.js');
    return new BuildingPermitAIExtractor(process.env.ANTHROPIC_API_KEY);
  }
}

module.exports = {
  getLandRegistryExtractor,
  getSharedBuildingExtractor,
  getBuildingPermitExtractor,
  AI_PROVIDER
};

