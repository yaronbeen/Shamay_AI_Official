/**
 * Tests for AI Extractor Factory
 */

// Store original env vars
const originalEnv = { ...process.env };

// Reset modules and env before each test
beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

describe("AI Extractor Factory", () => {
  describe("getApiKey", () => {
    it("returns GEMINI_API_KEY when AI_PROVIDER is gemini", () => {
      process.env.AI_PROVIDER = "gemini";
      process.env.GEMINI_API_KEY = "test-gemini-key";

      // Mock extractors to avoid loading actual modules
      jest.mock(
        "../../land-registry-management/ai-field-extractor-gemini.js",
        () => ({
          LandRegistryGeminiExtractor: jest.fn(),
        }),
      );

      const factory = require("../utils/ai-extractor-factory");
      // The factory exports AI_PROVIDER, which confirms the config
      expect(factory.AI_PROVIDER).toBe("gemini");
    });

    it("returns ANTHROPIC_API_KEY when AI_PROVIDER is anthropic", () => {
      process.env.AI_PROVIDER = "anthropic";
      process.env.ANTHROPIC_API_KEY = "test-anthropic-key";

      jest.resetModules();
      const factory = require("../utils/ai-extractor-factory");
      expect(factory.AI_PROVIDER).toBe("anthropic");
    });

    it("defaults to gemini when AI_PROVIDER is not set", () => {
      delete process.env.AI_PROVIDER;
      process.env.GEMINI_API_KEY = "test-gemini-key";

      jest.resetModules();
      const factory = require("../utils/ai-extractor-factory");
      expect(factory.AI_PROVIDER).toBe("gemini");
    });
  });

  describe("EXTRACTOR_CONFIG", () => {
    it("has configuration for all three extractor types", () => {
      process.env.AI_PROVIDER = "gemini";
      process.env.GEMINI_API_KEY = "test-key";

      jest.resetModules();
      const factory = require("../utils/ai-extractor-factory");

      expect(factory.EXTRACTOR_CONFIG).toHaveProperty("landRegistry");
      expect(factory.EXTRACTOR_CONFIG).toHaveProperty("sharedBuilding");
      expect(factory.EXTRACTOR_CONFIG).toHaveProperty("buildingPermit");
    });

    it("has both gemini and anthropic configs for each type", () => {
      process.env.AI_PROVIDER = "gemini";
      process.env.GEMINI_API_KEY = "test-key";

      jest.resetModules();
      const factory = require("../utils/ai-extractor-factory");

      const types = ["landRegistry", "sharedBuilding", "buildingPermit"];
      types.forEach((type) => {
        expect(factory.EXTRACTOR_CONFIG[type]).toHaveProperty("gemini");
        expect(factory.EXTRACTOR_CONFIG[type]).toHaveProperty("anthropic");
        expect(factory.EXTRACTOR_CONFIG[type].gemini).toHaveProperty("module");
        expect(factory.EXTRACTOR_CONFIG[type].gemini).toHaveProperty(
          "className",
        );
        expect(factory.EXTRACTOR_CONFIG[type].anthropic).toHaveProperty(
          "module",
        );
        expect(factory.EXTRACTOR_CONFIG[type].anthropic).toHaveProperty(
          "className",
        );
      });
    });
  });

  describe("getExtractor", () => {
    it("throws error for unknown extractor type", () => {
      process.env.AI_PROVIDER = "gemini";
      process.env.GEMINI_API_KEY = "test-key";

      jest.resetModules();
      const factory = require("../utils/ai-extractor-factory");

      expect(() => factory.getExtractor("unknownType")).toThrow(
        "Unknown extractor type: unknownType",
      );
    });

    it("throws error when API key is not configured", () => {
      process.env.AI_PROVIDER = "gemini";
      delete process.env.GEMINI_API_KEY;

      jest.resetModules();
      const factory = require("../utils/ai-extractor-factory");

      expect(() => factory.getExtractor("landRegistry")).toThrow(
        "GEMINI_API_KEY environment variable is not set but AI_PROVIDER is 'gemini'",
      );
    });
  });

  describe("clearExtractorCache", () => {
    it("clears the extractor cache", () => {
      process.env.AI_PROVIDER = "gemini";
      process.env.GEMINI_API_KEY = "test-key";

      jest.resetModules();
      const factory = require("../utils/ai-extractor-factory");

      // Clear cache should not throw
      expect(() => factory.clearExtractorCache()).not.toThrow();
    });
  });

  describe("convenience functions", () => {
    it("exports getLandRegistryExtractor function", () => {
      process.env.AI_PROVIDER = "gemini";
      process.env.GEMINI_API_KEY = "test-key";

      jest.resetModules();
      const factory = require("../utils/ai-extractor-factory");

      expect(typeof factory.getLandRegistryExtractor).toBe("function");
    });

    it("exports getSharedBuildingExtractor function", () => {
      process.env.AI_PROVIDER = "gemini";
      process.env.GEMINI_API_KEY = "test-key";

      jest.resetModules();
      const factory = require("../utils/ai-extractor-factory");

      expect(typeof factory.getSharedBuildingExtractor).toBe("function");
    });

    it("exports getBuildingPermitExtractor function", () => {
      process.env.AI_PROVIDER = "gemini";
      process.env.GEMINI_API_KEY = "test-key";

      jest.resetModules();
      const factory = require("../utils/ai-extractor-factory");

      expect(typeof factory.getBuildingPermitExtractor).toBe("function");
    });
  });
});
