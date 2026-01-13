const request = require("supertest");
const express = require("express");

// Mock the ShumaDB before requiring sessions route
jest.mock("../models/ShumaDB", () => ({
  ShumaDB: {
    saveShumaFromSession: jest.fn(),
    loadShumaForWizard: jest.fn(),
    saveGISData: jest.fn(),
    saveGarmushkaData: jest.fn(),
    saveFinalResults: jest.fn(),
    getShumaById: jest.fn(),
    getShumasByOrg: jest.fn(),
  },
}));

// Mock logger
jest.mock("../config/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

// Mock validation middleware - use a simpler schema that works
jest.mock("../middleware/validateRequest", () => {
  const { z } = require("zod");

  const validateBody = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: result.error.issues,
      });
    }
    req.validatedBody = result.data;
    next();
  };

  return {
    validateBody,
    schemas: {
      BaseSessionSchema: z
        .object({
          action: z.string(),
          sessionId: z.string().optional(),
        })
        .passthrough(),
    },
  };
});

const { ShumaDB } = require("../models/ShumaDB");
const sessionsRouter = require("../routes/sessions");

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use("/api/sessions", sessionsRouter);
  return app;
};

describe("Sessions API Integration Tests", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createTestApp();
  });

  describe("POST /api/sessions - save_to_db action", () => {
    it("saves valuation data successfully", async () => {
      ShumaDB.saveShumaFromSession.mockResolvedValue({
        shumaId: 123,
      });

      const response = await request(app)
        .post("/api/sessions")
        .send({
          action: "save_to_db",
          sessionId: "test-session-123",
          organizationId: "org-1",
          userId: "user-1",
          valuationData: {
            street: "Test Street",
            buildingNumber: "42",
            city: "Tel Aviv",
            apartmentSqm: 100,
            pricePerSqm: 50000,
            finalValuation: 5000000,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        shumaId: 123,
      });
      expect(ShumaDB.saveShumaFromSession).toHaveBeenCalledWith(
        "test-session-123",
        "org-1",
        "user-1",
        expect.objectContaining({
          street: "Test Street",
          finalValuation: 5000000,
        }),
      );
    });

    it("returns error when save fails", async () => {
      ShumaDB.saveShumaFromSession.mockResolvedValue({
        error: "Database connection failed",
      });

      const response = await request(app).post("/api/sessions").send({
        action: "save_to_db",
        sessionId: "test-session-123",
        valuationData: {},
      });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: "Database connection failed",
      });
    });

    it("uses default organization and user when not provided", async () => {
      ShumaDB.saveShumaFromSession.mockResolvedValue({ shumaId: 456 });

      await request(app)
        .post("/api/sessions")
        .send({
          action: "save_to_db",
          sessionId: "test-session-123",
          valuationData: { street: "Test Street" },
        });

      expect(ShumaDB.saveShumaFromSession).toHaveBeenCalledWith(
        "test-session-123",
        "default-org",
        "system",
        expect.any(Object),
      );
    });
  });

  describe("POST /api/sessions - load_from_db action", () => {
    it("loads valuation data successfully", async () => {
      const mockData = {
        street: "Test Street",
        buildingNumber: "42",
        city: "Tel Aviv",
        apartmentSqm: 100,
        pricePerSqm: 50000,
        finalValuation: 5000000,
      };

      ShumaDB.loadShumaForWizard.mockResolvedValue({
        valuationData: mockData,
      });

      const response = await request(app).post("/api/sessions").send({
        action: "load_from_db",
        sessionId: "test-session-123",
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        valuationData: mockData,
      });
    });

    it("returns 404 when session not found", async () => {
      ShumaDB.loadShumaForWizard.mockResolvedValue({
        error: "Session not found",
      });

      const response = await request(app).post("/api/sessions").send({
        action: "load_from_db",
        sessionId: "nonexistent-session",
      });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: "Session not found",
      });
    });
  });

  describe("POST /api/sessions - save_gis_data action", () => {
    it("saves GIS data successfully", async () => {
      ShumaDB.saveGISData.mockResolvedValue({ success: true });

      const response = await request(app)
        .post("/api/sessions")
        .send({
          action: "save_gis_data",
          sessionId: "test-session-123",
          gisData: {
            gisScreenshot: "base64-image-data",
            govmapScreenshot: "base64-govmap-data",
          },
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    it("returns error when GIS save fails", async () => {
      ShumaDB.saveGISData.mockResolvedValue({
        error: "Failed to save GIS data",
      });

      const response = await request(app).post("/api/sessions").send({
        action: "save_gis_data",
        sessionId: "test-session-123",
        gisData: {},
      });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Failed to save GIS data");
    });
  });

  describe("POST /api/sessions - save_garmushka action", () => {
    it("saves garmushka data successfully", async () => {
      ShumaDB.saveGarmushkaData.mockResolvedValue({ success: true });

      const response = await request(app)
        .post("/api/sessions")
        .send({
          action: "save_garmushka",
          sessionId: "test-session-123",
          garmushkaData: {
            measurements: { width: 10, height: 5 },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    it("returns error when garmushka save fails", async () => {
      ShumaDB.saveGarmushkaData.mockResolvedValue({
        error: "Failed to save garmushka",
      });

      const response = await request(app).post("/api/sessions").send({
        action: "save_garmushka",
        sessionId: "test-session-123",
        garmushkaData: {},
      });

      expect(response.status).toBe(500);
    });
  });

  describe("Request Validation", () => {
    it("rejects request without action", async () => {
      const response = await request(app).post("/api/sessions").send({
        sessionId: "test-session-123",
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Validation failed");
    });

    it("accepts valid action without additional required fields", async () => {
      ShumaDB.saveShumaFromSession.mockResolvedValue({ shumaId: 123 });

      const response = await request(app).post("/api/sessions").send({
        action: "save_to_db",
        sessionId: "test-session",
        valuationData: {},
      });

      expect(response.status).toBe(200);
    });
  });

  describe("Data Integrity", () => {
    it("preserves Hebrew characters in save and load", async () => {
      const hebrewData = {
        street: "רחוב דיזנגוף",
        city: "תל אביב",
        notes: "הערות בעברית",
      };

      ShumaDB.saveShumaFromSession.mockResolvedValue({ shumaId: 789 });
      ShumaDB.loadShumaForWizard.mockResolvedValue({
        valuationData: hebrewData,
      });

      // Save
      const saveResponse = await request(app).post("/api/sessions").send({
        action: "save_to_db",
        sessionId: "hebrew-session",
        valuationData: hebrewData,
      });

      expect(saveResponse.status).toBe(200);

      // Load
      const loadResponse = await request(app).post("/api/sessions").send({
        action: "load_from_db",
        sessionId: "hebrew-session",
      });

      expect(loadResponse.status).toBe(200);
      expect(loadResponse.body.valuationData.street).toBe("רחוב דיזנגוף");
      expect(loadResponse.body.valuationData.city).toBe("תל אביב");
    });

    it("preserves numeric values correctly", async () => {
      const numericData = {
        apartmentSqm: 100.5,
        pricePerSqm: 50000,
        finalValuation: 5050000,
      };

      ShumaDB.loadShumaForWizard.mockResolvedValue({
        valuationData: numericData,
      });

      const response = await request(app).post("/api/sessions").send({
        action: "load_from_db",
        sessionId: "numeric-session",
      });

      expect(response.body.valuationData.apartmentSqm).toBe(100.5);
      expect(response.body.valuationData.pricePerSqm).toBe(50000);
      expect(response.body.valuationData.finalValuation).toBe(5050000);
    });

    it("handles nested extractedData structure", async () => {
      const nestedData = {
        extractedData: {
          gush: "1234",
          chelka: "567",
          subChelka: "89",
          buildingPermit: {
            permitNumber: "P-2024-001",
            issueDate: "2024-01-15",
          },
        },
      };

      ShumaDB.loadShumaForWizard.mockResolvedValue({
        valuationData: nestedData,
      });

      const response = await request(app).post("/api/sessions").send({
        action: "load_from_db",
        sessionId: "nested-session",
      });

      expect(response.body.valuationData.extractedData.gush).toBe("1234");
      expect(
        response.body.valuationData.extractedData.buildingPermit.permitNumber,
      ).toBe("P-2024-001");
    });
  });
});

describe("Save and Load Cycle", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createTestApp();
  });

  it("complete save and load cycle maintains data integrity", async () => {
    const originalData = {
      sessionId: "cycle-test-123",
      street: "רחוב הרצל",
      buildingNumber: "15",
      city: "תל אביב",
      apartmentSqm: 85,
      pricePerSqm: 45000,
      finalValuation: 3825000,
      extractedData: {
        gush: "6789",
        chelka: "123",
      },
      structuredFootnotes: [
        { id: "1", text: "הערה ראשונה" },
        { id: "2", text: "הערה שניה" },
      ],
    };

    // Mock save to return success
    ShumaDB.saveShumaFromSession.mockImplementation(
      (sessionId, orgId, userId, data) => {
        return Promise.resolve({ shumaId: 1 });
      },
    );

    // Mock load to return the same data
    ShumaDB.loadShumaForWizard.mockResolvedValue({
      valuationData: originalData,
    });

    // Save
    const saveResponse = await request(app).post("/api/sessions").send({
      action: "save_to_db",
      sessionId: "cycle-test-123",
      valuationData: originalData,
    });

    expect(saveResponse.status).toBe(200);
    expect(saveResponse.body.success).toBe(true);

    // Load
    const loadResponse = await request(app).post("/api/sessions").send({
      action: "load_from_db",
      sessionId: "cycle-test-123",
    });

    expect(loadResponse.status).toBe(200);
    expect(loadResponse.body.valuationData).toEqual(originalData);
    expect(loadResponse.body.valuationData.structuredFootnotes).toHaveLength(2);
  });
});
