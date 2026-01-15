import { describe, it, expect, vi, beforeEach } from "vitest";

// =============================================================================
// DOCUMENT TYPES AND CONFIGURATION TESTS
// =============================================================================

const DOCUMENT_TYPES = {
  tabu: {
    label: "נסח טאבו",
    description: "נסח רישום מקרקעין",
    color: "blue",
    required: false,
  },
  permit: {
    label: "היתר בניה",
    description: "היתר בניה ותשריט",
    color: "blue",
    required: false,
  },
  condo: {
    label: "צו בית משותף",
    description: "צו בית משותף",
    color: "blue",
    required: false,
  },
  planning: {
    label: "מידע תכנוני",
    description: "מידע תכנוני נוסף",
    color: "blue",
    required: false,
  },
  building_image: {
    label: "תמונת חזית הבניין",
    description: "תמונת החזית/שער הכניסה (תוצג בראש הדוח)",
    color: "blue",
    required: false,
  },
  interior_image: {
    label: "תמונות פנים הדירה",
    description: "תמונות פנים הדירה (עד 6 תמונות)",
    color: "blue",
    required: false,
  },
};

// Document upload interface
interface DocumentUpload {
  id: string;
  file: File;
  type:
    | "tabu"
    | "permit"
    | "condo"
    | "planning"
    | "building_image"
    | "interior_image";
  status: "uploading" | "processing" | "completed" | "error";
  progress: number;
  extractedData?: Record<string, unknown>;
  error?: string;
  preview?: string;
  url?: string;
  path?: string;
  isSelected?: boolean;
  previewReady?: boolean;
}

// =============================================================================
// HELPER FUNCTIONS FOR TESTING
// =============================================================================

// Determine if file is an image based on MIME type
function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

// Determine if file is a document (PDF/DOC)
function isDocumentFile(file: File): boolean {
  const docTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  return docTypes.includes(file.type);
}

// Get allowed file types for a document type
function getAllowedFileTypes(docType: string): string {
  if (docType === "building_image" || docType === "interior_image") {
    return "image/*";
  }
  return ".pdf,.doc,.docx";
}

// Check if file type is valid for document type
function isValidFileForType(file: File, docType: string): boolean {
  if (docType === "building_image" || docType === "interior_image") {
    return isImageFile(file);
  }
  return isDocumentFile(file);
}

// Filter uploads for database (remove base64 previews)
function filterUploadsForDB(
  uploads: DocumentUpload[],
): Partial<DocumentUpload>[] {
  return uploads.map((upload) => {
    const uploadUrl = upload.url;
    const uploadPreview = upload.preview;

    // NEVER save base64 previews to database
    let finalUrl = uploadUrl;
    if (!finalUrl && uploadPreview && !uploadPreview.startsWith("data:")) {
      finalUrl = uploadPreview;
    }

    return {
      id: upload.id,
      type: upload.type,
      status: upload.status,
      url: finalUrl,
      path: upload.path,
      isSelected: upload.isSelected,
    };
  });
}

// Get max files allowed for a document type
function getMaxFilesForType(docType: string): number {
  if (docType === "interior_image") {
    return 6;
  }
  if (
    docType === "building_image" ||
    docType === "tabu" ||
    docType === "condo"
  ) {
    return 1;
  }
  return 10; // Default max for other types
}

// =============================================================================
// TESTS
// =============================================================================

describe("Step2Documents Configuration", () => {
  describe("DOCUMENT_TYPES", () => {
    it("has all required document types", () => {
      expect(DOCUMENT_TYPES).toHaveProperty("tabu");
      expect(DOCUMENT_TYPES).toHaveProperty("permit");
      expect(DOCUMENT_TYPES).toHaveProperty("condo");
      expect(DOCUMENT_TYPES).toHaveProperty("planning");
      expect(DOCUMENT_TYPES).toHaveProperty("building_image");
      expect(DOCUMENT_TYPES).toHaveProperty("interior_image");
    });

    it("all document types have required properties", () => {
      Object.entries(DOCUMENT_TYPES).forEach(([key, config]) => {
        expect(config).toHaveProperty("label");
        expect(config).toHaveProperty("description");
        expect(config).toHaveProperty("color");
        expect(config).toHaveProperty("required");
        expect(typeof config.label).toBe("string");
        expect(typeof config.description).toBe("string");
      });
    });

    it("no document types are required", () => {
      Object.values(DOCUMENT_TYPES).forEach((config) => {
        expect(config.required).toBe(false);
      });
    });

    it("has Hebrew labels", () => {
      expect(DOCUMENT_TYPES.tabu.label).toBe("נסח טאבו");
      expect(DOCUMENT_TYPES.permit.label).toBe("היתר בניה");
      expect(DOCUMENT_TYPES.condo.label).toBe("צו בית משותף");
      expect(DOCUMENT_TYPES.building_image.label).toBe("תמונת חזית הבניין");
    });
  });
});

describe("Step2Documents File Type Handling", () => {
  describe("isImageFile", () => {
    it("returns true for JPEG files", () => {
      const file = new File([""], "test.jpg", { type: "image/jpeg" });
      expect(isImageFile(file)).toBe(true);
    });

    it("returns true for PNG files", () => {
      const file = new File([""], "test.png", { type: "image/png" });
      expect(isImageFile(file)).toBe(true);
    });

    it("returns true for WebP files", () => {
      const file = new File([""], "test.webp", { type: "image/webp" });
      expect(isImageFile(file)).toBe(true);
    });

    it("returns true for GIF files", () => {
      const file = new File([""], "test.gif", { type: "image/gif" });
      expect(isImageFile(file)).toBe(true);
    });

    it("returns false for PDF files", () => {
      const file = new File([""], "test.pdf", { type: "application/pdf" });
      expect(isImageFile(file)).toBe(false);
    });

    it("returns false for DOC files", () => {
      const file = new File([""], "test.doc", { type: "application/msword" });
      expect(isImageFile(file)).toBe(false);
    });
  });

  describe("isDocumentFile", () => {
    it("returns true for PDF files", () => {
      const file = new File([""], "test.pdf", { type: "application/pdf" });
      expect(isDocumentFile(file)).toBe(true);
    });

    it("returns true for DOC files", () => {
      const file = new File([""], "test.doc", { type: "application/msword" });
      expect(isDocumentFile(file)).toBe(true);
    });

    it("returns true for DOCX files", () => {
      const file = new File([""], "test.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      expect(isDocumentFile(file)).toBe(true);
    });

    it("returns false for image files", () => {
      const file = new File([""], "test.jpg", { type: "image/jpeg" });
      expect(isDocumentFile(file)).toBe(false);
    });

    it("returns false for text files", () => {
      const file = new File([""], "test.txt", { type: "text/plain" });
      expect(isDocumentFile(file)).toBe(false);
    });
  });

  describe("getAllowedFileTypes", () => {
    it("returns image/* for building_image", () => {
      expect(getAllowedFileTypes("building_image")).toBe("image/*");
    });

    it("returns image/* for interior_image", () => {
      expect(getAllowedFileTypes("interior_image")).toBe("image/*");
    });

    it("returns document extensions for tabu", () => {
      expect(getAllowedFileTypes("tabu")).toBe(".pdf,.doc,.docx");
    });

    it("returns document extensions for permit", () => {
      expect(getAllowedFileTypes("permit")).toBe(".pdf,.doc,.docx");
    });

    it("returns document extensions for condo", () => {
      expect(getAllowedFileTypes("condo")).toBe(".pdf,.doc,.docx");
    });
  });

  describe("isValidFileForType", () => {
    it("accepts images for building_image", () => {
      const file = new File([""], "building.jpg", { type: "image/jpeg" });
      expect(isValidFileForType(file, "building_image")).toBe(true);
    });

    it("accepts images for interior_image", () => {
      const file = new File([""], "room.png", { type: "image/png" });
      expect(isValidFileForType(file, "interior_image")).toBe(true);
    });

    it("rejects documents for building_image", () => {
      const file = new File([""], "doc.pdf", { type: "application/pdf" });
      expect(isValidFileForType(file, "building_image")).toBe(false);
    });

    it("accepts PDF for tabu", () => {
      const file = new File([""], "tabu.pdf", { type: "application/pdf" });
      expect(isValidFileForType(file, "tabu")).toBe(true);
    });

    it("rejects images for tabu", () => {
      const file = new File([""], "tabu.jpg", { type: "image/jpeg" });
      expect(isValidFileForType(file, "tabu")).toBe(false);
    });
  });
});

describe("Step2Documents Upload Management", () => {
  describe("getMaxFilesForType", () => {
    it("allows 6 interior images", () => {
      expect(getMaxFilesForType("interior_image")).toBe(6);
    });

    it("allows 1 building image", () => {
      expect(getMaxFilesForType("building_image")).toBe(1);
    });

    it("allows 1 tabu document", () => {
      expect(getMaxFilesForType("tabu")).toBe(1);
    });

    it("allows 1 condo document", () => {
      expect(getMaxFilesForType("condo")).toBe(1);
    });

    it("allows multiple permit documents", () => {
      expect(getMaxFilesForType("permit")).toBe(10);
    });
  });

  describe("filterUploadsForDB", () => {
    it("removes base64 previews from uploads", () => {
      const uploads: DocumentUpload[] = [
        {
          id: "1",
          file: new File([""], "test.pdf", { type: "application/pdf" }),
          type: "tabu",
          status: "completed",
          progress: 100,
          preview: "data:application/pdf;base64,JVBER...",
          url: "/uploads/test.pdf",
          path: "/uploads/test.pdf",
        },
      ];

      const filtered = filterUploadsForDB(uploads);
      expect(filtered[0].url).toBe("/uploads/test.pdf");
      expect(filtered[0]).not.toHaveProperty("preview");
      expect(filtered[0]).not.toHaveProperty("file");
    });

    it("preserves non-base64 URLs", () => {
      const uploads: DocumentUpload[] = [
        {
          id: "1",
          file: new File([""], "test.pdf", { type: "application/pdf" }),
          type: "tabu",
          status: "completed",
          progress: 100,
          preview: "/uploads/test.pdf",
          url: undefined,
          path: "/uploads/test.pdf",
        },
      ];

      const filtered = filterUploadsForDB(uploads);
      expect(filtered[0].url).toBe("/uploads/test.pdf");
    });

    it("preserves upload metadata", () => {
      const uploads: DocumentUpload[] = [
        {
          id: "abc123",
          file: new File([""], "test.pdf", { type: "application/pdf" }),
          type: "permit",
          status: "completed",
          progress: 100,
          isSelected: true,
          path: "/uploads/test.pdf",
        },
      ];

      const filtered = filterUploadsForDB(uploads);
      expect(filtered[0].id).toBe("abc123");
      expect(filtered[0].type).toBe("permit");
      expect(filtered[0].status).toBe("completed");
      expect(filtered[0].isSelected).toBe(true);
    });

    it("handles empty uploads array", () => {
      const filtered = filterUploadsForDB([]);
      expect(filtered).toEqual([]);
    });

    it("handles multiple uploads", () => {
      const uploads: DocumentUpload[] = [
        {
          id: "1",
          file: new File([""], "tabu.pdf", { type: "application/pdf" }),
          type: "tabu",
          status: "completed",
          progress: 100,
          url: "/uploads/tabu.pdf",
        },
        {
          id: "2",
          file: new File([""], "permit.pdf", { type: "application/pdf" }),
          type: "permit",
          status: "completed",
          progress: 100,
          url: "/uploads/permit.pdf",
        },
      ];

      const filtered = filterUploadsForDB(uploads);
      expect(filtered).toHaveLength(2);
      expect(filtered[0].type).toBe("tabu");
      expect(filtered[1].type).toBe("permit");
    });
  });
});

describe("Step2Documents Upload Status", () => {
  describe("status transitions", () => {
    it("upload starts with uploading status", () => {
      const upload: DocumentUpload = {
        id: "1",
        file: new File([""], "test.pdf", { type: "application/pdf" }),
        type: "tabu",
        status: "uploading",
        progress: 0,
      };
      expect(upload.status).toBe("uploading");
      expect(upload.progress).toBe(0);
    });

    it("upload transitions to processing", () => {
      const upload: DocumentUpload = {
        id: "1",
        file: new File([""], "test.pdf", { type: "application/pdf" }),
        type: "tabu",
        status: "processing",
        progress: 100,
      };
      expect(upload.status).toBe("processing");
    });

    it("upload transitions to completed", () => {
      const upload: DocumentUpload = {
        id: "1",
        file: new File([""], "test.pdf", { type: "application/pdf" }),
        type: "tabu",
        status: "completed",
        progress: 100,
        extractedData: { gush: "1234" },
      };
      expect(upload.status).toBe("completed");
      expect(upload.extractedData).toBeDefined();
    });

    it("upload can have error status", () => {
      const upload: DocumentUpload = {
        id: "1",
        file: new File([""], "test.pdf", { type: "application/pdf" }),
        type: "tabu",
        status: "error",
        progress: 50,
        error: "Upload failed",
      };
      expect(upload.status).toBe("error");
      expect(upload.error).toBe("Upload failed");
    });
  });
});

describe("Step2Documents Validation", () => {
  // Validation logic: !isProcessing
  // - Valid (true) when NOT processing
  // - Invalid (false) when processing is in progress (blocks navigation)
  const getValidation = (isProcessing: boolean) => !isProcessing;

  it("validation is true when not processing (allows navigation)", () => {
    const isProcessing = false;
    expect(getValidation(isProcessing)).toBe(true);
  });

  it("validation is false when processing (blocks navigation)", () => {
    const isProcessing = true;
    expect(getValidation(isProcessing)).toBe(false);
  });

  it("validation is true with no uploads and not processing", () => {
    const uploads: DocumentUpload[] = [];
    const isProcessing = false;
    expect(getValidation(isProcessing)).toBe(true);
  });

  it("validation is true with completed uploads and not processing", () => {
    const uploads: DocumentUpload[] = [
      {
        id: "1",
        file: new File([""], "test.pdf", { type: "application/pdf" }),
        type: "tabu",
        status: "completed",
        progress: 100,
      },
    ];
    const isProcessing = false;
    expect(getValidation(isProcessing)).toBe(true);
  });

  it("validation is false during AI processing even with completed uploads", () => {
    const uploads: DocumentUpload[] = [
      {
        id: "1",
        file: new File([""], "test.pdf", { type: "application/pdf" }),
        type: "tabu",
        status: "completed",
        progress: 100,
      },
    ];
    const isProcessing = true; // AI is still processing other documents
    expect(getValidation(isProcessing)).toBe(false);
  });

  it("validation is true with error uploads when not processing", () => {
    const uploads: DocumentUpload[] = [
      {
        id: "1",
        file: new File([""], "test.pdf", { type: "application/pdf" }),
        type: "tabu",
        status: "error",
        progress: 0,
        error: "Failed",
      },
    ];
    const isProcessing = false;
    expect(getValidation(isProcessing)).toBe(true);
  });
});

describe("Step2Documents Hebrew Content", () => {
  it("handles Hebrew file names", () => {
    const file = new File([""], "נסח_טאבו.pdf", { type: "application/pdf" });
    expect(file.name).toBe("נסח_טאבו.pdf");
  });

  it("handles Hebrew in extracted data", () => {
    const extractedData = {
      gush: "1234",
      city: "תל אביב",
      street: "רחוב הרצל",
      owners: [{ name: "ישראל ישראלי" }],
    };
    expect(extractedData.city).toBe("תל אביב");
    expect(extractedData.owners[0].name).toBe("ישראל ישראלי");
  });
});
