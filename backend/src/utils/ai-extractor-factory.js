/**
 * AI Extractor Factory
 * Selects the appropriate extractor based on AI_PROVIDER environment variable
 * Uses singleton pattern to cache extractor instances for performance
 */

const AI_PROVIDER = process.env.AI_PROVIDER || "gemini";

// Singleton cache for extractor instances
const extractorCache = new Map();

// Extractor configuration - single source of truth
const EXTRACTOR_CONFIG = {
  landRegistry: {
    gemini: {
      module: "../../land-registry-management/ai-field-extractor-gemini.js",
      className: "LandRegistryGeminiExtractor",
    },
    anthropic: {
      module: "../../land-registry-management/ai-field-extractor.js",
      className: "LandRegistryAIExtractor",
    },
  },
  sharedBuilding: {
    gemini: {
      module: "../../shared-building-order/ai-field-extractor-gemini.js",
      className: "SharedBuildingGeminiExtractor",
    },
    anthropic: {
      module: "../../shared-building-order/ai-field-extractor-hebrew.js",
      className: "SharedBuildingAIExtractor",
    },
  },
  buildingPermit: {
    gemini: {
      module: "../../building-permits/ai-field-extractor-gemini.js",
      className: "BuildingPermitGeminiExtractor",
    },
    anthropic: {
      module: "../../building-permits/ai-field-extractor.js",
      className: "BuildingPermitAIExtractor",
    },
  },
};

/**
 * Get the API key for the current provider
 * @returns {string} API key
 * @throws {Error} If API key is not configured
 */
function getApiKey() {
  const isGemini = AI_PROVIDER === "gemini";
  const envKey = isGemini ? "GEMINI_API_KEY" : "ANTHROPIC_API_KEY";
  const apiKey = process.env[envKey];

  if (!apiKey) {
    throw new Error(
      `${envKey} environment variable is not set but AI_PROVIDER is '${AI_PROVIDER}'`,
    );
  }

  return apiKey;
}

/**
 * Generic extractor factory function
 * @param {string} extractorType - One of: landRegistry, sharedBuilding, buildingPermit
 * @returns {Object} Extractor instance
 * @throws {Error} If API key is not configured or extractor type is unknown
 */
function getExtractor(extractorType) {
  // Return cached instance if available (singleton pattern)
  if (extractorCache.has(extractorType)) {
    return extractorCache.get(extractorType);
  }

  const config = EXTRACTOR_CONFIG[extractorType];
  if (!config) {
    throw new Error(`Unknown extractor type: ${extractorType}`);
  }

  const provider = AI_PROVIDER === "gemini" ? "gemini" : "anthropic";
  const { module: modulePath, className } = config[provider];

  const apiKey = getApiKey();
  const ExtractorClass = require(modulePath)[className];
  const instance = new ExtractorClass(apiKey);

  extractorCache.set(extractorType, instance);
  return instance;
}

/**
 * Get land registry extractor
 * @returns {Object} Extractor instance
 */
const getLandRegistryExtractor = () => getExtractor("landRegistry");

/**
 * Get shared building extractor
 * @returns {Object} Extractor instance
 */
const getSharedBuildingExtractor = () => getExtractor("sharedBuilding");

/**
 * Get building permit extractor
 * @returns {Object} Extractor instance
 */
const getBuildingPermitExtractor = () => getExtractor("buildingPermit");

/**
 * Clear extractor cache (useful for testing)
 */
const clearExtractorCache = () => extractorCache.clear();

module.exports = {
  getLandRegistryExtractor,
  getSharedBuildingExtractor,
  getBuildingPermitExtractor,
  getExtractor,
  clearExtractorCache,
  AI_PROVIDER,
  EXTRACTOR_CONFIG,
};
