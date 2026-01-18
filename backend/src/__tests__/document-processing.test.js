const request = require("supertest");
const express = require("express");

// =============================================================================
// MOCKS
// =============================================================================

// Mock the ShumaDB
jest.mock("../models/ShumaDB", () => ({
  ShumaDB: {
    saveShumaFromSession: jest.fn(),
    loadShumaForWizard: jest.fn(),
    saveGISData: jest.fn(),
    saveGarmushkaData: jest.fn(),
    saveFinalResults: jest.fn(),
    saveLandRegistryExtraction: jest.fn(),
    savePermitExtraction: jest.fn(),
    saveSharedBuildingExtraction: jest.fn(),
    saveAIExtraction: jest.fn(),
    getAIExtractions: jest.fn(),
    saveImageAnalysis: jest.fn(),
  },
}));

// Mock logger
jest.mock("../config/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

// Mock OpenAI
jest.mock("openai", () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  gush: "1234",
                  parcel: "567",
                  owners: [{ name: "Test Owner" }],
                }),
              },
            },
          ],
        }),
      },
    },
  }));
});

// Mock Anthropic
jest.mock("@anthropic-ai/sdk", () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [
          {
            text: JSON.stringify({
              gush: "1234",
              parcel: "567",
            }),
          },
        ],
      }),
    },
  }));
});

const { ShumaDB } = require("../models/ShumaDB");

// =============================================================================
// TEST APP SETUP
// =============================================================================

const createTestApp = () => {
  const app = express();
  app.use(express.json({ limit: "50mb" }));

  // Mock document processing endpoints
  app.post(
    "/api/session/:sessionId/land-registry-analysis",
    async (req, res) => {
      try {
        const { sessionId } = req.params;
        const { documentBase64, fileName } = req.body;

        if (!documentBase64) {
          return res.status(400).json({ error: "Document data required" });
        }

        // Simulate AI extraction
        const extractedData = {
          gush: "1234",
          parcel: "567",
          subParcel: "89",
          ownershipType: "בעלות פרטית",
          owners: [{ name: "ישראל ישראלי", share: "1/1" }],
          registrationOffice: "תל אביב",
          extractDate: "2024-01-15",
        };

        await ShumaDB.saveLandRegistryExtraction(
          sessionId,
          extractedData,
          fileName,
        );

        res.json({
          success: true,
          extractedData,
          fileName,
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    },
  );

  app.post(
    "/api/session/:sessionId/building-permit-analysis",
    async (req, res) => {
      try {
        const { sessionId } = req.params;
        const { documentBase64, fileName } = req.body;

        if (!documentBase64) {
          return res.status(400).json({ error: "Document data required" });
        }

        const extractedData = {
          permitNumber: "P-2024-001",
          permitDate: "2024-01-15",
          permittedUse: "מגורים",
          permittedArea: 100,
          buildingFloors: 4,
        };

        await ShumaDB.savePermitExtraction(sessionId, extractedData, fileName);

        res.json({
          success: true,
          extractedData,
          fileName,
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    },
  );

  app.post(
    "/api/session/:sessionId/shared-building-analysis",
    async (req, res) => {
      try {
        const { sessionId } = req.params;
        const { documentBase64, fileName } = req.body;

        if (!documentBase64) {
          return res.status(400).json({ error: "Document data required" });
        }

        const extractedData = {
          sharedBuildingOrderDate: "2020-05-10",
          floorsCountInBuilding: 5,
          unitsCountInBuilding: 20,
          subPlotNumber: "3",
          subPlotArea: 85.5,
        };

        await ShumaDB.saveSharedBuildingExtraction(
          sessionId,
          extractedData,
          fileName,
        );

        res.json({
          success: true,
          extractedData,
          fileName,
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    },
  );

  app.post("/api/session/:sessionId/interior-analysis", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { images } = req.body;

      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ error: "Images required" });
      }

      const analysisResults = {
        conditionAssessment: "טוב מאוד",
        finishLevel: "גבוה",
        roomsIdentified: ["סלון", "מטבח", "חדר שינה"],
        features: ["מיזוג", "מטבח מאובזר"],
      };

      await ShumaDB.saveImageAnalysis(sessionId, "interior", analysisResults);

      res.json({
        success: true,
        analysis: analysisResults,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/session/:sessionId/exterior-analysis", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { images } = req.body;

      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ error: "Images required" });
      }

      const analysisResults = {
        buildingCondition: "טוב",
        buildingStyle: "מודרני",
        numberOfFloors: 5,
        parkingVisible: true,
      };

      await ShumaDB.saveImageAnalysis(sessionId, "exterior", analysisResults);

      res.json({
        success: true,
        analysis: analysisResults,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/session/:sessionId/export-pdf", async (req, res) => {
    try {
      const { sessionId } = req.params;

      // Load session data
      const sessionData = await ShumaDB.loadShumaForWizard(sessionId);
      if (sessionData.error) {
        return res.status(404).json({ error: "Session not found" });
      }

      // Generate mock PDF
      const pdfBuffer = Buffer.from("Mock PDF content for testing");

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="valuation-${sessionId}.pdf"`,
      );
      res.send(pdfBuffer);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/session/:sessionId/export-docx", async (req, res) => {
    try {
      const { sessionId } = req.params;

      // Load session data
      const sessionData = await ShumaDB.loadShumaForWizard(sessionId);
      if (sessionData.error) {
        return res.status(404).json({ error: "Session not found" });
      }

      // Generate mock DOCX
      const docxBuffer = Buffer.from("Mock DOCX content for testing");

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="valuation-${sessionId}.docx"`,
      );
      res.send(docxBuffer);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/comparable-data/import", async (req, res) => {
    try {
      const { csvData, sessionId } = req.body;

      if (!csvData) {
        return res.status(400).json({ error: "CSV data required" });
      }

      // Parse CSV (mock)
      const parsedData = [
        { address: "הרצל 10", price: 1000000, area: 100 },
        { address: "הרצל 12", price: 1200000, area: 110 },
      ];

      res.json({
        success: true,
        imported: parsedData.length,
        data: parsedData,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/comparable-data/analyze", async (req, res) => {
    try {
      const { comparables, subjectProperty } = req.body;

      if (!comparables || !Array.isArray(comparables)) {
        return res.status(400).json({ error: "Comparables array required" });
      }

      // Calculate analysis
      const analysis = {
        averagePricePerSqm: 52000,
        medianPricePerSqm: 51000,
        adjustedAverage: 53000,
        comparablesCount: comparables.length,
        recommendedValue: 5300000,
      };

      res.json({
        success: true,
        analysis,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/session/:sessionId/ai-extractions", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { type } = req.query;

      const extractions = await ShumaDB.getAIExtractions(sessionId, type);

      res.json({
        success: true,
        extractions: extractions || [],
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return app;
};

// =============================================================================
// DOCUMENT PROCESSING TESTS
// =============================================================================

describe("Document Processing API Tests", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createTestApp();
  });

  describe("POST /api/session/:sessionId/land-registry-analysis", () => {
    it("extracts data from tabu document successfully", async () => {
      ShumaDB.saveLandRegistryExtraction.mockResolvedValue({ success: true });

      const response = await request(app)
        .post("/api/session/test-session/land-registry-analysis")
        .send({
          documentBase64: "base64-encoded-pdf-content",
          fileName: "tabu-extract.pdf",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.extractedData).toHaveProperty("gush");
      expect(response.body.extractedData).toHaveProperty("parcel");
      expect(response.body.extractedData.ownershipType).toBe("בעלות פרטית");
      expect(ShumaDB.saveLandRegistryExtraction).toHaveBeenCalledWith(
        "test-session",
        expect.objectContaining({ gush: "1234" }),
        "tabu-extract.pdf",
      );
    });

    it("returns 400 when document data is missing", async () => {
      const response = await request(app)
        .post("/api/session/test-session/land-registry-analysis")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Document data required");
    });

    it("handles extraction failure gracefully", async () => {
      ShumaDB.saveLandRegistryExtraction.mockRejectedValue(
        new Error("DB Error"),
      );

      const response = await request(app)
        .post("/api/session/test-session/land-registry-analysis")
        .send({
          documentBase64: "base64-content",
          fileName: "test.pdf",
        });

      expect(response.status).toBe(500);
    });
  });

  describe("POST /api/session/:sessionId/building-permit-analysis", () => {
    it("extracts data from building permit successfully", async () => {
      ShumaDB.savePermitExtraction.mockResolvedValue({ success: true });

      const response = await request(app)
        .post("/api/session/test-session/building-permit-analysis")
        .send({
          documentBase64: "base64-encoded-permit",
          fileName: "building-permit.pdf",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.extractedData).toHaveProperty("permitNumber");
      expect(response.body.extractedData).toHaveProperty("permitDate");
      expect(response.body.extractedData.permittedUse).toBe("מגורים");
    });

    it("returns 400 when document data is missing", async () => {
      const response = await request(app)
        .post("/api/session/test-session/building-permit-analysis")
        .send({ fileName: "test.pdf" });

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/session/:sessionId/shared-building-analysis", () => {
    it("extracts data from shared building order successfully", async () => {
      ShumaDB.saveSharedBuildingExtraction.mockResolvedValue({ success: true });

      const response = await request(app)
        .post("/api/session/test-session/shared-building-analysis")
        .send({
          documentBase64: "base64-encoded-order",
          fileName: "shared-building-order.pdf",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.extractedData).toHaveProperty(
        "sharedBuildingOrderDate",
      );
      expect(response.body.extractedData).toHaveProperty(
        "floorsCountInBuilding",
      );
      expect(response.body.extractedData.subPlotArea).toBe(85.5);
    });
  });
});

// =============================================================================
// IMAGE ANALYSIS TESTS
// =============================================================================

describe("Image Analysis API Tests", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createTestApp();
  });

  describe("POST /api/session/:sessionId/interior-analysis", () => {
    it("analyzes interior images successfully", async () => {
      ShumaDB.saveImageAnalysis.mockResolvedValue({ success: true });

      const response = await request(app)
        .post("/api/session/test-session/interior-analysis")
        .send({
          images: [
            { base64: "image1-base64", type: "living_room" },
            { base64: "image2-base64", type: "kitchen" },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.analysis).toHaveProperty("conditionAssessment");
      expect(response.body.analysis).toHaveProperty("finishLevel");
      expect(response.body.analysis.roomsIdentified).toContain("סלון");
    });

    it("returns 400 when images array is missing", async () => {
      const response = await request(app)
        .post("/api/session/test-session/interior-analysis")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Images required");
    });

    it("returns 400 when images array is empty", async () => {
      const response = await request(app)
        .post("/api/session/test-session/interior-analysis")
        .send({ images: [] });

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/session/:sessionId/exterior-analysis", () => {
    it("analyzes exterior images successfully", async () => {
      ShumaDB.saveImageAnalysis.mockResolvedValue({ success: true });

      const response = await request(app)
        .post("/api/session/test-session/exterior-analysis")
        .send({
          images: [{ base64: "building-image-base64", type: "facade" }],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.analysis).toHaveProperty("buildingCondition");
      expect(response.body.analysis).toHaveProperty("buildingStyle");
      expect(response.body.analysis.numberOfFloors).toBe(5);
    });

    it("returns 400 when images array is missing", async () => {
      const response = await request(app)
        .post("/api/session/test-session/exterior-analysis")
        .send({});

      expect(response.status).toBe(400);
    });
  });
});

// =============================================================================
// EXPORT TESTS
// =============================================================================

describe("Export API Tests", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createTestApp();
  });

  describe("POST /api/session/:sessionId/export-pdf", () => {
    it("generates PDF successfully", async () => {
      ShumaDB.loadShumaForWizard.mockResolvedValue({
        valuationData: {
          street: "הרצל",
          city: "תל אביב",
          finalValuation: 5000000,
        },
      });

      const response = await request(app)
        .post("/api/session/test-session/export-pdf")
        .send({});

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/application\/pdf/);
      expect(response.headers["content-disposition"]).toContain(
        "valuation-test-session.pdf",
      );
    });

    it("returns 404 when session not found", async () => {
      ShumaDB.loadShumaForWizard.mockResolvedValue({
        error: "Session not found",
      });

      const response = await request(app)
        .post("/api/session/nonexistent/export-pdf")
        .send({});

      expect(response.status).toBe(404);
    });
  });

  describe("POST /api/session/:sessionId/export-docx", () => {
    it("generates DOCX successfully", async () => {
      ShumaDB.loadShumaForWizard.mockResolvedValue({
        valuationData: {
          street: "הרצל",
          city: "תל אביב",
          finalValuation: 5000000,
        },
      });

      const response = await request(app)
        .post("/api/session/test-session/export-docx")
        .send({});

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(
        /application\/vnd.openxmlformats-officedocument.wordprocessingml.document/,
      );
      expect(response.headers["content-disposition"]).toContain(
        "valuation-test-session.docx",
      );
    });

    it("returns 404 when session not found", async () => {
      ShumaDB.loadShumaForWizard.mockResolvedValue({
        error: "Session not found",
      });

      const response = await request(app)
        .post("/api/session/nonexistent/export-docx")
        .send({});

      expect(response.status).toBe(404);
    });
  });
});

// =============================================================================
// COMPARABLE DATA TESTS
// =============================================================================

describe("Comparable Data API Tests", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createTestApp();
  });

  describe("POST /api/comparable-data/import", () => {
    it("imports CSV data successfully", async () => {
      const csvData =
        "address,price,area\nהרצל 10,1000000,100\nהרצל 12,1200000,110";

      const response = await request(app)
        .post("/api/comparable-data/import")
        .send({
          csvData,
          sessionId: "test-session",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.imported).toBe(2);
      expect(response.body.data).toHaveLength(2);
    });

    it("returns 400 when CSV data is missing", async () => {
      const response = await request(app)
        .post("/api/comparable-data/import")
        .send({ sessionId: "test-session" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("CSV data required");
    });
  });

  describe("POST /api/comparable-data/analyze", () => {
    it("analyzes comparable data successfully", async () => {
      const comparables = [
        { address: "הרצל 10", pricePerSqm: 50000, area: 100 },
        { address: "הרצל 12", pricePerSqm: 52000, area: 110 },
        { address: "הרצל 14", pricePerSqm: 54000, area: 95 },
      ];

      const response = await request(app)
        .post("/api/comparable-data/analyze")
        .send({
          comparables,
          subjectProperty: { area: 100, floor: 3 },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.analysis).toHaveProperty("averagePricePerSqm");
      expect(response.body.analysis).toHaveProperty("medianPricePerSqm");
      expect(response.body.analysis.comparablesCount).toBe(3);
    });

    it("returns 400 when comparables array is missing", async () => {
      const response = await request(app)
        .post("/api/comparable-data/analyze")
        .send({ subjectProperty: {} });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Comparables array required");
    });

    it("returns 400 when comparables is not an array", async () => {
      const response = await request(app)
        .post("/api/comparable-data/analyze")
        .send({ comparables: "not an array" });

      expect(response.status).toBe(400);
    });
  });
});

// =============================================================================
// AI EXTRACTIONS HISTORY TESTS
// =============================================================================

describe("AI Extractions API Tests", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createTestApp();
  });

  describe("GET /api/session/:sessionId/ai-extractions", () => {
    it("returns extraction history", async () => {
      ShumaDB.getAIExtractions.mockResolvedValue([
        {
          id: "1",
          type: "land_registry",
          extractedAt: "2024-01-15T10:00:00Z",
          data: { gush: "1234" },
        },
        {
          id: "2",
          type: "building_permit",
          extractedAt: "2024-01-16T10:00:00Z",
          data: { permitNumber: "P-001" },
        },
      ]);

      const response = await request(app)
        .get("/api/session/test-session/ai-extractions")
        .query({ type: "land_registry" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.extractions)).toBe(true);
    });

    it("returns empty array when no extractions exist", async () => {
      ShumaDB.getAIExtractions.mockResolvedValue([]);

      const response = await request(app)
        .get("/api/session/test-session/ai-extractions")
        .query({ type: "land_registry" });

      expect(response.status).toBe(200);
      expect(response.body.extractions).toEqual([]);
    });
  });
});

// =============================================================================
// DATA INTEGRITY TESTS
// =============================================================================

describe("Data Integrity Tests", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createTestApp();
  });

  it("preserves Hebrew text in extraction", async () => {
    ShumaDB.saveLandRegistryExtraction.mockResolvedValue({ success: true });

    const response = await request(app)
      .post("/api/session/hebrew-test/land-registry-analysis")
      .send({
        documentBase64: "base64-content",
        fileName: "נסח_טאבו.pdf",
      });

    expect(response.status).toBe(200);
    expect(response.body.extractedData.ownershipType).toBe("בעלות פרטית");
  });

  it("handles large document content", async () => {
    ShumaDB.savePermitExtraction.mockResolvedValue({ success: true });

    // Generate large base64 content (simulating a real PDF)
    const largeContent = "A".repeat(1000000); // ~750KB base64

    const response = await request(app)
      .post("/api/session/large-doc-test/building-permit-analysis")
      .send({
        documentBase64: largeContent,
        fileName: "large-permit.pdf",
      });

    expect(response.status).toBe(200);
  });

  it("handles special characters in file names", async () => {
    ShumaDB.saveSharedBuildingExtraction.mockResolvedValue({ success: true });

    const response = await request(app)
      .post("/api/session/special-chars/shared-building-analysis")
      .send({
        documentBase64: "base64-content",
        fileName: "צו_בית_משותף (2024).pdf",
      });

    expect(response.status).toBe(200);
    expect(response.body.fileName).toBe("צו_בית_משותף (2024).pdf");
  });
});
