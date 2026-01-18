import { describe, it, expect, vi, beforeEach } from "vitest";

// =============================================================================
// HELPER FUNCTION TESTS - Extracted from FieldSection.tsx
// =============================================================================

// Get nested value from object by path (e.g., "extractedData.gush")
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current === "object" && current !== null) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return current;
}

// Try multiple paths to get a value (first non-empty wins)
function getValueFromPaths(
  data: Record<string, unknown>,
  paths: string[],
): unknown {
  for (const path of paths) {
    const value = getNestedValue(data, path);
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return undefined;
}

// Field configuration interface
interface FieldConfig {
  key: string;
  label: string;
  type?: "text" | "date" | "number" | "textarea" | "owners" | "attachments";
  paths?: string[];
  editable?: boolean;
  multiline?: boolean;
}

// Get field value using configuration
function getFieldValue(
  data: Record<string, unknown>,
  fieldConfig: FieldConfig,
): unknown {
  // If paths are specified, try them in order
  if (fieldConfig.paths && fieldConfig.paths.length > 0) {
    return getValueFromPaths(data, fieldConfig.paths);
  }
  // Otherwise, try the key directly at top level and in extractedData
  return getValueFromPaths(data, [
    fieldConfig.key,
    `extractedData.${fieldConfig.key}`,
  ]);
}

// Format owners array for display
function formatOwnersValue(owners: unknown): string {
  if (!Array.isArray(owners)) return "";
  return owners
    .map((owner: { name?: string; share?: string }) => {
      const name = owner.name || "";
      const share = owner.share ? ` (${owner.share})` : "";
      return `${name}${share}`;
    })
    .filter(Boolean)
    .join(", ");
}

// Format attachments array for display
function formatAttachmentsValue(attachments: unknown): string {
  if (!Array.isArray(attachments)) return "";
  return attachments.filter(Boolean).join(", ");
}

// =============================================================================
// SECTION CONFIGURATION TESTS
// =============================================================================

const FIELD_SECTIONS = [
  {
    id: "identification",
    title: "זיהוי ורישום",
    fields: [
      {
        key: "gush",
        label: "גוש",
        paths: ["gush", "extractedData.gush", "extractedData.block"],
      },
      {
        key: "parcel",
        label: "חלקה",
        paths: ["parcel", "extractedData.parcel", "extractedData.chelka"],
      },
      {
        key: "subParcel",
        label: "תת-חלקה",
        paths: [
          "subParcel",
          "extractedData.subParcel",
          "extractedData.sub_parcel",
        ],
      },
      {
        key: "fullAddress",
        label: "כתובת מלאה",
        paths: ["fullAddress", "extractedData.fullAddress"],
      },
      {
        key: "registrationOffice",
        label: "לשכת רישום",
        paths: ["registrationOffice", "extractedData.registrationOffice"],
      },
      {
        key: "tabuExtractDate",
        label: "תאריך נסח",
        type: "date" as const,
        paths: ["tabuExtractDate", "extractedData.tabuExtractDate"],
      },
    ],
  },
  {
    id: "ownership",
    title: "בעלות וזכויות",
    fields: [
      {
        key: "ownershipType",
        label: "סוג בעלות",
        paths: ["ownershipType", "extractedData.ownershipType"],
      },
      {
        key: "rights",
        label: "זכויות",
        paths: ["rights", "extractedData.rights"],
      },
      {
        key: "owners",
        label: "בעלים",
        type: "owners" as const,
        paths: ["owners", "extractedData.owners"],
      },
      {
        key: "commonParts",
        label: "רכוש משותף",
        paths: ["commonParts", "extractedData.commonParts"],
      },
      {
        key: "attachments",
        label: "הצמדות",
        type: "attachments" as const,
        paths: ["attachments", "extractedData.attachments"],
      },
    ],
  },
  {
    id: "unit_description",
    title: "תאור החלק",
    fields: [
      { key: "floor", label: "קומה", paths: ["floor", "extractedData.floor"] },
      {
        key: "unitDescription",
        label: "תיאור היחידה",
        paths: ["unitDescription", "extractedData.unitDescription"],
      },
      {
        key: "regulationType",
        label: "סוג תקנון",
        paths: ["regulationType", "extractedData.regulationType"],
      },
      {
        key: "bylaws",
        label: "תקנון",
        paths: ["bylaws", "extractedData.bylaws"],
      },
    ],
  },
];

// =============================================================================
// TESTS
// =============================================================================

describe("Step3Validation Helper Functions", () => {
  describe("getNestedValue", () => {
    it("gets top-level value", () => {
      const data = { gush: "1234" };
      expect(getNestedValue(data, "gush")).toBe("1234");
    });

    it("gets nested value one level deep", () => {
      const data = { extractedData: { gush: "5678" } };
      expect(getNestedValue(data, "extractedData.gush")).toBe("5678");
    });

    it("gets nested value two levels deep", () => {
      const data = { level1: { level2: { value: "deep" } } };
      expect(getNestedValue(data, "level1.level2.value")).toBe("deep");
    });

    it("returns undefined for non-existent path", () => {
      const data = { gush: "1234" };
      expect(getNestedValue(data, "nonexistent")).toBeUndefined();
    });

    it("returns undefined for partial path", () => {
      const data = { extractedData: { gush: "1234" } };
      expect(getNestedValue(data, "extractedData.nonexistent")).toBeUndefined();
    });

    it("handles null intermediate values", () => {
      const data = { extractedData: null };
      expect(
        getNestedValue(data as Record<string, unknown>, "extractedData.gush"),
      ).toBeUndefined();
    });

    it("handles undefined intermediate values", () => {
      const data = { extractedData: undefined };
      expect(
        getNestedValue(data as Record<string, unknown>, "extractedData.gush"),
      ).toBeUndefined();
    });

    it("returns array values", () => {
      const data = { owners: [{ name: "John" }, { name: "Jane" }] };
      expect(getNestedValue(data, "owners")).toEqual([
        { name: "John" },
        { name: "Jane" },
      ]);
    });

    it("returns object values", () => {
      const data = { extractedData: { gush: "1234", parcel: "56" } };
      expect(getNestedValue(data, "extractedData")).toEqual({
        gush: "1234",
        parcel: "56",
      });
    });

    it("handles numeric values", () => {
      const data = { rooms: 4.5 };
      expect(getNestedValue(data, "rooms")).toBe(4.5);
    });

    it("handles boolean values", () => {
      const data = { isComplete: true };
      expect(getNestedValue(data, "isComplete")).toBe(true);
    });

    it("handles empty string values", () => {
      const data = { gush: "" };
      expect(getNestedValue(data, "gush")).toBe("");
    });

    it("handles zero values", () => {
      const data = { floor: 0 };
      expect(getNestedValue(data, "floor")).toBe(0);
    });
  });

  describe("getValueFromPaths", () => {
    it("returns first non-empty value from paths", () => {
      const data = { gush: "1234" };
      expect(getValueFromPaths(data, ["gush", "extractedData.gush"])).toBe(
        "1234",
      );
    });

    it("falls back to second path if first is empty", () => {
      const data = { gush: "", extractedData: { gush: "5678" } };
      expect(getValueFromPaths(data, ["gush", "extractedData.gush"])).toBe(
        "5678",
      );
    });

    it("falls back to second path if first is undefined", () => {
      const data = { extractedData: { gush: "5678" } };
      expect(getValueFromPaths(data, ["gush", "extractedData.gush"])).toBe(
        "5678",
      );
    });

    it("falls back to second path if first is null", () => {
      const data = { gush: null, extractedData: { gush: "5678" } };
      expect(
        getValueFromPaths(data as Record<string, unknown>, [
          "gush",
          "extractedData.gush",
        ]),
      ).toBe("5678");
    });

    it("returns undefined if no paths have values", () => {
      const data = {};
      expect(
        getValueFromPaths(data, ["gush", "extractedData.gush"]),
      ).toBeUndefined();
    });

    it("returns undefined for all empty paths", () => {
      const data = { gush: "", extractedData: { gush: "" } };
      expect(
        getValueFromPaths(data, ["gush", "extractedData.gush"]),
      ).toBeUndefined();
    });

    it("handles single path", () => {
      const data = { gush: "1234" };
      expect(getValueFromPaths(data, ["gush"])).toBe("1234");
    });

    it("handles multiple fallback paths", () => {
      const data = { extractedData: { block: "9999" } };
      expect(
        getValueFromPaths(data, [
          "gush",
          "extractedData.gush",
          "extractedData.block",
        ]),
      ).toBe("9999");
    });

    it("returns first truthy value even if later paths exist", () => {
      const data = { gush: "first", extractedData: { gush: "second" } };
      expect(getValueFromPaths(data, ["gush", "extractedData.gush"])).toBe(
        "first",
      );
    });

    it("handles Hebrew values", () => {
      const data = { city: "תל אביב" };
      expect(getValueFromPaths(data, ["city"])).toBe("תל אביב");
    });
  });

  describe("getFieldValue", () => {
    it("uses paths from field config", () => {
      const data = { extractedData: { gush: "1234" } };
      const config: FieldConfig = {
        key: "gush",
        label: "גוש",
        paths: ["gush", "extractedData.gush"],
      };
      expect(getFieldValue(data, config)).toBe("1234");
    });

    it("falls back to key and extractedData.key when no paths", () => {
      const data = { gush: "5678" };
      const config: FieldConfig = { key: "gush", label: "גוש" };
      expect(getFieldValue(data, config)).toBe("5678");
    });

    it("falls back to extractedData.key when key not at top level", () => {
      const data = { extractedData: { gush: "9999" } };
      const config: FieldConfig = { key: "gush", label: "גוש" };
      expect(getFieldValue(data, config)).toBe("9999");
    });

    it("returns undefined when field not found", () => {
      const data = {};
      const config: FieldConfig = { key: "gush", label: "גוש" };
      expect(getFieldValue(data, config)).toBeUndefined();
    });

    it("handles empty paths array", () => {
      const data = { gush: "1234" };
      const config: FieldConfig = { key: "gush", label: "גוש", paths: [] };
      expect(getFieldValue(data, config)).toBe("1234");
    });
  });
});

describe("Step3Validation Formatters", () => {
  describe("formatOwnersValue", () => {
    it("formats single owner without share", () => {
      const owners = [{ name: "ישראל ישראלי" }];
      expect(formatOwnersValue(owners)).toBe("ישראל ישראלי");
    });

    it("formats single owner with share", () => {
      const owners = [{ name: "ישראל ישראלי", share: "1/2" }];
      expect(formatOwnersValue(owners)).toBe("ישראל ישראלי (1/2)");
    });

    it("formats multiple owners", () => {
      const owners = [
        { name: "ישראל ישראלי", share: "1/2" },
        { name: "שרה כהן", share: "1/2" },
      ];
      expect(formatOwnersValue(owners)).toBe(
        "ישראל ישראלי (1/2), שרה כהן (1/2)",
      );
    });

    it("handles empty array", () => {
      expect(formatOwnersValue([])).toBe("");
    });

    it("handles non-array input", () => {
      expect(formatOwnersValue("not an array")).toBe("");
      expect(formatOwnersValue(null)).toBe("");
      expect(formatOwnersValue(undefined)).toBe("");
    });

    it("filters empty owner entries", () => {
      const owners = [{ name: "ישראל" }, { name: "" }, { name: "שרה" }];
      expect(formatOwnersValue(owners)).toBe("ישראל, שרה");
    });

    it("handles owners with missing name", () => {
      const owners = [{ share: "1/2" }];
      expect(formatOwnersValue(owners)).toBe(" (1/2)");
    });
  });

  describe("formatAttachmentsValue", () => {
    it("formats single attachment", () => {
      const attachments = ["מחסן"];
      expect(formatAttachmentsValue(attachments)).toBe("מחסן");
    });

    it("formats multiple attachments", () => {
      const attachments = ["מחסן", "חניה", "גינה"];
      expect(formatAttachmentsValue(attachments)).toBe("מחסן, חניה, גינה");
    });

    it("handles empty array", () => {
      expect(formatAttachmentsValue([])).toBe("");
    });

    it("handles non-array input", () => {
      expect(formatAttachmentsValue("not an array")).toBe("");
      expect(formatAttachmentsValue(null)).toBe("");
      expect(formatAttachmentsValue(undefined)).toBe("");
    });

    it("filters empty strings", () => {
      const attachments = ["מחסן", "", "חניה"];
      expect(formatAttachmentsValue(attachments)).toBe("מחסן, חניה");
    });

    it("filters null and undefined values", () => {
      const attachments = ["מחסן", null, undefined, "חניה"];
      expect(formatAttachmentsValue(attachments as unknown[])).toBe(
        "מחסן, חניה",
      );
    });
  });
});

describe("Step3Validation Section Configuration", () => {
  describe("FIELD_SECTIONS structure", () => {
    it("has identification section", () => {
      const section = FIELD_SECTIONS.find((s) => s.id === "identification");
      expect(section).toBeDefined();
      expect(section?.title).toBe("זיהוי ורישום");
    });

    it("has ownership section", () => {
      const section = FIELD_SECTIONS.find((s) => s.id === "ownership");
      expect(section).toBeDefined();
      expect(section?.title).toBe("בעלות וזכויות");
    });

    it("has unit_description section", () => {
      const section = FIELD_SECTIONS.find((s) => s.id === "unit_description");
      expect(section).toBeDefined();
      expect(section?.title).toBe("תאור החלק");
    });

    it("all sections have id and title", () => {
      FIELD_SECTIONS.forEach((section) => {
        expect(section.id).toBeDefined();
        expect(typeof section.id).toBe("string");
        expect(section.title).toBeDefined();
        expect(typeof section.title).toBe("string");
      });
    });

    it("all sections have fields array", () => {
      FIELD_SECTIONS.forEach((section) => {
        expect(Array.isArray(section.fields)).toBe(true);
        expect(section.fields.length).toBeGreaterThan(0);
      });
    });

    it("all fields have key and label", () => {
      FIELD_SECTIONS.forEach((section) => {
        section.fields.forEach((field) => {
          expect(field.key).toBeDefined();
          expect(typeof field.key).toBe("string");
          expect(field.label).toBeDefined();
          expect(typeof field.label).toBe("string");
        });
      });
    });
  });

  describe("identification section fields", () => {
    const section = FIELD_SECTIONS.find((s) => s.id === "identification");

    it("has gush field with fallback paths", () => {
      const field = section?.fields.find((f) => f.key === "gush");
      expect(field).toBeDefined();
      expect(field?.paths).toContain("gush");
      expect(field?.paths).toContain("extractedData.gush");
    });

    it("has parcel field with chelka fallback", () => {
      const field = section?.fields.find((f) => f.key === "parcel");
      expect(field).toBeDefined();
      expect(field?.paths).toContain("extractedData.chelka");
    });

    it("has subParcel field with snake_case fallback", () => {
      const field = section?.fields.find((f) => f.key === "subParcel");
      expect(field).toBeDefined();
      expect(field?.paths).toContain("extractedData.sub_parcel");
    });

    it("has tabuExtractDate field with date type", () => {
      const field = section?.fields.find((f) => f.key === "tabuExtractDate");
      expect(field).toBeDefined();
      expect(field?.type).toBe("date");
    });
  });

  describe("ownership section fields", () => {
    const section = FIELD_SECTIONS.find((s) => s.id === "ownership");

    it("has owners field with owners type", () => {
      const field = section?.fields.find((f) => f.key === "owners");
      expect(field).toBeDefined();
      expect(field?.type).toBe("owners");
    });

    it("has attachments field with attachments type", () => {
      const field = section?.fields.find((f) => f.key === "attachments");
      expect(field).toBeDefined();
      expect(field?.type).toBe("attachments");
    });
  });
});

describe("Step3Validation Data Integration", () => {
  describe("extracting data from real-world structure", () => {
    const mockValuationData = {
      gush: "6158",
      parcel: "167",
      subParcel: "3",
      city: "תל אביב",
      street: "הרצל",
      buildingNumber: "15",
      extractedData: {
        gush: "6158",
        parcel: "167",
        subParcel: "3",
        ownershipType: "בעלות פרטית",
        owners: [
          { name: "ישראל ישראלי", share: "1/2" },
          { name: "שרה ישראלי", share: "1/2" },
        ],
        attachments: ["מחסן", "חניה"],
        floor: "קומה 3",
        registrationOffice: "לשכת רישום תל אביב",
        tabuExtractDate: "2024-01-15",
      },
    };

    it("gets gush from top level", () => {
      expect(
        getValueFromPaths(mockValuationData, ["gush", "extractedData.gush"]),
      ).toBe("6158");
    });

    it("gets owners from extractedData", () => {
      expect(
        getValueFromPaths(mockValuationData, [
          "owners",
          "extractedData.owners",
        ]),
      ).toEqual([
        { name: "ישראל ישראלי", share: "1/2" },
        { name: "שרה ישראלי", share: "1/2" },
      ]);
    });

    it("formats owners for display", () => {
      const owners = getValueFromPaths(mockValuationData, [
        "owners",
        "extractedData.owners",
      ]);
      expect(formatOwnersValue(owners)).toBe(
        "ישראל ישראלי (1/2), שרה ישראלי (1/2)",
      );
    });

    it("gets attachments and formats them", () => {
      const attachments = getValueFromPaths(mockValuationData, [
        "attachments",
        "extractedData.attachments",
      ]);
      expect(formatAttachmentsValue(attachments)).toBe("מחסן, חניה");
    });

    it("gets date field", () => {
      expect(
        getValueFromPaths(mockValuationData, [
          "tabuExtractDate",
          "extractedData.tabuExtractDate",
        ]),
      ).toBe("2024-01-15");
    });

    it("gets all identification fields", () => {
      const identificationSection = FIELD_SECTIONS.find(
        (s) => s.id === "identification",
      );
      const values: Record<string, unknown> = {};

      identificationSection?.fields.forEach((field) => {
        if (field.paths) {
          values[field.key] = getValueFromPaths(mockValuationData, field.paths);
        }
      });

      expect(values.gush).toBe("6158");
      expect(values.parcel).toBe("167");
      expect(values.subParcel).toBe("3");
      expect(values.registrationOffice).toBe("לשכת רישום תל אביב");
      expect(values.tabuExtractDate).toBe("2024-01-15");
    });
  });

  describe("handling missing data gracefully", () => {
    const sparseData = {
      gush: "1234",
      extractedData: {},
    };

    it("returns undefined for missing nested values", () => {
      expect(
        getValueFromPaths(sparseData, ["owners", "extractedData.owners"]),
      ).toBeUndefined();
    });

    it("returns empty string for missing formatters", () => {
      const owners = getValueFromPaths(sparseData, [
        "owners",
        "extractedData.owners",
      ]);
      expect(formatOwnersValue(owners)).toBe("");
    });

    it("returns available values even when others are missing", () => {
      expect(
        getValueFromPaths(sparseData, ["gush", "extractedData.gush"]),
      ).toBe("1234");
    });
  });

  describe("handling both naming conventions", () => {
    it("prefers camelCase over snake_case", () => {
      const data = {
        extractedData: {
          subParcel: "camelCase",
          sub_parcel: "snake_case",
        },
      };
      expect(
        getValueFromPaths(data, [
          "extractedData.subParcel",
          "extractedData.sub_parcel",
        ]),
      ).toBe("camelCase");
    });

    it("falls back to snake_case when camelCase missing", () => {
      const data = {
        extractedData: {
          sub_parcel: "snake_case",
        },
      };
      expect(
        getValueFromPaths(data, [
          "extractedData.subParcel",
          "extractedData.sub_parcel",
        ]),
      ).toBe("snake_case");
    });

    it("handles Hebrew field name aliases (chelka vs parcel)", () => {
      const data = {
        extractedData: {
          chelka: "167",
        },
      };
      expect(
        getValueFromPaths(data, [
          "parcel",
          "extractedData.parcel",
          "extractedData.chelka",
        ]),
      ).toBe("167");
    });
  });
});

describe("Step3Validation Field Edit Tracking", () => {
  // Mock interface for tracking edits
  interface FieldEdit {
    field: string;
    oldValue: unknown;
    newValue: unknown;
    timestamp: Date;
    source: "user" | "ai" | "system";
  }

  function createFieldEdit(
    field: string,
    oldValue: unknown,
    newValue: unknown,
    source: "user" | "ai" | "system" = "user",
  ): FieldEdit {
    return {
      field,
      oldValue,
      newValue,
      timestamp: new Date(),
      source,
    };
  }

  it("creates field edit with all properties", () => {
    const edit = createFieldEdit("gush", "1234", "5678");
    expect(edit.field).toBe("gush");
    expect(edit.oldValue).toBe("1234");
    expect(edit.newValue).toBe("5678");
    expect(edit.source).toBe("user");
    expect(edit.timestamp).toBeInstanceOf(Date);
  });

  it("tracks AI source edits", () => {
    const edit = createFieldEdit("owners", [], [{ name: "Test" }], "ai");
    expect(edit.source).toBe("ai");
  });

  it("tracks system source edits", () => {
    const edit = createFieldEdit("updatedAt", null, new Date(), "system");
    expect(edit.source).toBe("system");
  });

  it("handles complex value changes", () => {
    const oldOwners = [{ name: "Old Owner", share: "1/1" }];
    const newOwners = [
      { name: "New Owner 1", share: "1/2" },
      { name: "New Owner 2", share: "1/2" },
    ];
    const edit = createFieldEdit("owners", oldOwners, newOwners);
    expect(edit.oldValue).toEqual(oldOwners);
    expect(edit.newValue).toEqual(newOwners);
  });
});

describe("Step3Validation Provenance", () => {
  interface ProvenanceInfo {
    field: string;
    source:
      | "land_registry"
      | "building_permit"
      | "shared_building"
      | "manual"
      | "unknown";
    documentName?: string;
    extractedAt?: Date;
    confidence?: number;
  }

  function getProvenanceSource(
    field: string,
    dataSourceMap: Record<string, string>,
  ): ProvenanceInfo["source"] {
    const source = dataSourceMap[field];
    if (source === "land_registry") return "land_registry";
    if (source === "building_permit") return "building_permit";
    if (source === "shared_building") return "shared_building";
    if (source === "manual") return "manual";
    return "unknown";
  }

  const DATA_SOURCE_MAP: Record<string, string> = {
    gush: "land_registry",
    parcel: "land_registry",
    subParcel: "land_registry",
    owners: "land_registry",
    buildingPermitNumber: "building_permit",
    buildingPermitDate: "building_permit",
    permittedUse: "building_permit",
    sharedBuildingOrderDate: "shared_building",
    floorsCountInBuilding: "shared_building",
  };

  it("identifies land registry fields", () => {
    expect(getProvenanceSource("gush", DATA_SOURCE_MAP)).toBe("land_registry");
    expect(getProvenanceSource("parcel", DATA_SOURCE_MAP)).toBe(
      "land_registry",
    );
    expect(getProvenanceSource("owners", DATA_SOURCE_MAP)).toBe(
      "land_registry",
    );
  });

  it("identifies building permit fields", () => {
    expect(getProvenanceSource("buildingPermitNumber", DATA_SOURCE_MAP)).toBe(
      "building_permit",
    );
    expect(getProvenanceSource("buildingPermitDate", DATA_SOURCE_MAP)).toBe(
      "building_permit",
    );
  });

  it("identifies shared building fields", () => {
    expect(
      getProvenanceSource("sharedBuildingOrderDate", DATA_SOURCE_MAP),
    ).toBe("shared_building");
    expect(getProvenanceSource("floorsCountInBuilding", DATA_SOURCE_MAP)).toBe(
      "shared_building",
    );
  });

  it("returns unknown for unmapped fields", () => {
    expect(getProvenanceSource("unknownField", DATA_SOURCE_MAP)).toBe(
      "unknown",
    );
  });
});
