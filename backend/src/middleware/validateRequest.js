/**
 * Request Validation Middleware using Zod
 *
 * Validates incoming request data at API boundaries.
 * Provides clear error messages when data shape is wrong.
 */
const { z } = require("zod");
const logger = require("../config/logger");

// =============================================================================
// VALIDATION MIDDLEWARE FACTORY
// =============================================================================

/**
 * Creates validation middleware for request body
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware
 */
function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
        code: issue.code,
      }));

      logger.warn("Request validation failed:", {
        path: req.path,
        errors,
      });

      return res.status(400).json({
        error: "Validation failed",
        details: errors,
      });
    }

    // Attach validated data to request
    req.validatedBody = result.data;
    next();
  };
}

// =============================================================================
// SESSION ACTION SCHEMAS
// =============================================================================

// Base session request - all actions require these
const BaseSessionSchema = z.object({
  action: z.string(),
  sessionId: z.string().optional(),
});

// Save to DB action
const SaveToDbSchema = z.object({
  action: z.literal("save_to_db"),
  sessionId: z.string().min(1, "sessionId is required"),
  organizationId: z.string().optional(),
  userId: z.string().optional(),
  valuationData: z
    .object({
      // Core required fields
      street: z.string().optional(),
      city: z.string().optional(),
      // Allow any additional fields - we validate structure, not completeness
    })
    .passthrough(),
});

// Load from DB action
const LoadFromDbSchema = z.object({
  action: z.literal("load_from_db"),
  sessionId: z.string().min(1, "sessionId is required"),
});

// Save GIS data action
const SaveGisDataSchema = z.object({
  action: z.literal("save_gis_data"),
  sessionId: z.string().min(1, "sessionId is required"),
  gisData: z
    .object({
      wideArea: z.string().optional(),
      zoomedNoTazea: z.string().optional(),
      zoomedWithTazea: z.string().optional(),
      cropMode0: z.string().optional(),
      cropMode1: z.string().optional(),
    })
    .passthrough(),
});

// Save Garmushka measurements action
const SaveGarmushkaSchema = z.object({
  action: z.literal("save_garmushka"),
  sessionId: z.string().min(1, "sessionId is required"),
  garmushkaData: z
    .object({
      measurementTable: z
        .array(
          z.object({
            id: z.string(),
            name: z.string(),
            type: z.enum(["calibration", "polyline", "polygon"]),
            measurement: z.string(),
            notes: z.string().optional(),
            color: z.string().optional(),
          }),
        )
        .optional(),
      metersPerPixel: z.number().optional(),
      unitMode: z.enum(["metric", "imperial"]).optional(),
      isCalibrated: z.boolean().optional(),
      fileName: z.string().optional(),
      pngExport: z.string().optional(),
    })
    .passthrough(),
});

// Save final results action
const SaveFinalResultsSchema = z.object({
  action: z.literal("save_final_results"),
  sessionId: z.string().min(1, "sessionId is required"),
  results: z
    .object({
      finalValuation: z.number().optional(),
      pricePerSqm: z.number().optional(),
      comparableData: z.array(z.any()).optional(),
      propertyAnalysis: z.any().optional(),
    })
    .passthrough(),
});

// Union of all session action schemas
const SessionActionSchema = z.discriminatedUnion("action", [
  SaveToDbSchema,
  LoadFromDbSchema,
  SaveGisDataSchema,
  SaveGarmushkaSchema,
  SaveFinalResultsSchema,
  // Fallback for other actions - just validate they have action field
  z.object({ action: z.string() }).passthrough(),
]);

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  validateBody,
  schemas: {
    BaseSessionSchema,
    SaveToDbSchema,
    LoadFromDbSchema,
    SaveGisDataSchema,
    SaveGarmushkaSchema,
    SaveFinalResultsSchema,
    SessionActionSchema,
  },
};
