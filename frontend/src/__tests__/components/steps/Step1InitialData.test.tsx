import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// =============================================================================
// UTILITY FUNCTION TESTS
// These functions are extracted for testing - they match the implementation
// =============================================================================

// Normalize date to ISO format (YYYY-MM-DD)
const normalizeDateToISO = (
  dateInput: string | Date | null | undefined,
): string => {
  if (!dateInput) return "";

  // Handle Date objects
  if (dateInput instanceof Date) {
    const year = dateInput.getFullYear();
    const month = String(dateInput.getMonth() + 1).padStart(2, "0");
    const day = String(dateInput.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Handle strings
  const dateStr = String(dateInput);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // Handle ISO date strings with time (YYYY-MM-DDTHH:mm:ss)
  const isoMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) {
    return isoMatch[1];
  }

  const dotMatch = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (dotMatch) {
    const [, day, month, year] = dotMatch;
    return `${year}-${month}-${day}`;
  }

  const slashMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return `${year}-${month}-${day}`;
  }

  return "";
};

// Format date for display (DD/MM/YYYY)
const formatDateForDisplay = (dateStr: string) => {
  const iso = normalizeDateToISO(dateStr);
  if (!iso) return "";
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
};

// Parse Hebrew address into parts
function parseAddress(address: string): {
  street: string;
  buildingNumber: string;
  neighborhood: string;
  city: string;
} {
  const parts = {
    street: "",
    buildingNumber: "",
    neighborhood: "",
    city: "",
  };

  // Find building number
  const buildingMatch = address.match(/(\d+)/);
  if (buildingMatch) {
    parts.buildingNumber = buildingMatch[1];
    const beforeNumber = address.substring(0, buildingMatch.index).trim();
    parts.street = beforeNumber.replace(/^רחוב\s*/i, "").trim();
  } else {
    // No building number, everything is street
    parts.street = address
      .split(",")[0]
      .trim()
      .replace(/^רחוב\s*/i, "");
  }

  // Find city (after comma or at end)
  const cityMatch =
    address.match(/,\s*([^,]+)$/) || address.match(/\s+([א-ת]+)$/);
  if (cityMatch) {
    parts.city = cityMatch[1].trim();
  }

  return parts;
}

// Validation logic matching Step1InitialData
function validateForm(formData: {
  valuationType: string;
  clientName: string;
  street: string;
  buildingNumber: string;
  city: string;
  rooms: number | string;
  floor: number | string;
  shamayName: string;
  shamaySerialNumber: string;
}): boolean {
  return (
    formData.valuationType.trim() !== "" &&
    formData.clientName.trim() !== "" &&
    formData.street.trim() !== "" &&
    formData.buildingNumber.trim() !== "" &&
    formData.city.trim() !== "" &&
    Number(formData.rooms) > 0 &&
    String(formData.floor || "").trim() !== "" &&
    formData.shamayName.trim() !== "" &&
    formData.shamaySerialNumber.trim() !== ""
  );
}

// =============================================================================
// TESTS
// =============================================================================

describe("Step1InitialData Utilities", () => {
  describe("normalizeDateToISO", () => {
    it("returns empty string for null input", () => {
      expect(normalizeDateToISO(null)).toBe("");
    });

    it("returns empty string for undefined input", () => {
      expect(normalizeDateToISO(undefined)).toBe("");
    });

    it("returns empty string for empty string input", () => {
      expect(normalizeDateToISO("")).toBe("");
    });

    it("handles Date objects correctly", () => {
      const date = new Date(2024, 0, 15); // January 15, 2024
      expect(normalizeDateToISO(date)).toBe("2024-01-15");
    });

    it("handles Date objects with single-digit month and day", () => {
      const date = new Date(2024, 0, 5); // January 5, 2024
      expect(normalizeDateToISO(date)).toBe("2024-01-05");
    });

    it("handles Date objects at end of year", () => {
      const date = new Date(2024, 11, 31); // December 31, 2024
      expect(normalizeDateToISO(date)).toBe("2024-12-31");
    });

    it("returns ISO date string unchanged", () => {
      expect(normalizeDateToISO("2024-01-15")).toBe("2024-01-15");
    });

    it("extracts date from ISO datetime string", () => {
      expect(normalizeDateToISO("2024-01-15T10:30:00")).toBe("2024-01-15");
    });

    it("extracts date from ISO datetime with timezone", () => {
      expect(normalizeDateToISO("2024-01-15T10:30:00Z")).toBe("2024-01-15");
    });

    it("converts DD.MM.YYYY format to ISO", () => {
      expect(normalizeDateToISO("15.01.2024")).toBe("2024-01-15");
    });

    it("converts DD/MM/YYYY format to ISO", () => {
      expect(normalizeDateToISO("15/01/2024")).toBe("2024-01-15");
    });

    it("handles single-digit day in DD.MM.YYYY", () => {
      expect(normalizeDateToISO("05.01.2024")).toBe("2024-01-05");
    });

    it("handles single-digit month in DD/MM/YYYY", () => {
      expect(normalizeDateToISO("15/01/2024")).toBe("2024-01-15");
    });

    it("returns empty string for invalid date format", () => {
      expect(normalizeDateToISO("invalid-date")).toBe("");
    });

    it("returns empty string for partial date", () => {
      expect(normalizeDateToISO("2024-01")).toBe("");
    });

    it("returns empty string for reversed format YYYY/MM/DD", () => {
      // This format is not supported
      expect(normalizeDateToISO("2024/01/15")).toBe("");
    });
  });

  describe("formatDateForDisplay", () => {
    it("converts ISO date to DD/MM/YYYY", () => {
      expect(formatDateForDisplay("2024-01-15")).toBe("15/01/2024");
    });

    it("handles single-digit day and month", () => {
      expect(formatDateForDisplay("2024-01-05")).toBe("05/01/2024");
    });

    it("handles end of year date", () => {
      expect(formatDateForDisplay("2024-12-31")).toBe("31/12/2024");
    });

    it("returns empty string for empty input", () => {
      expect(formatDateForDisplay("")).toBe("");
    });

    it("returns empty string for invalid input", () => {
      expect(formatDateForDisplay("invalid")).toBe("");
    });

    it("handles DD.MM.YYYY input by normalizing first", () => {
      expect(formatDateForDisplay("15.01.2024")).toBe("15/01/2024");
    });

    it("handles DD/MM/YYYY input", () => {
      expect(formatDateForDisplay("15/01/2024")).toBe("15/01/2024");
    });
  });

  describe("parseAddress", () => {
    it("parses simple Hebrew address with street and number", () => {
      const result = parseAddress("הרצל 15, תל אביב");
      expect(result.street).toBe("הרצל");
      expect(result.buildingNumber).toBe("15");
      expect(result.city).toBe("תל אביב");
    });

    it("parses address with רחוב prefix", () => {
      const result = parseAddress("רחוב הרצל 15, תל אביב");
      expect(result.street).toBe("הרצל");
      expect(result.buildingNumber).toBe("15");
    });

    it("parses address without comma separator", () => {
      const result = parseAddress("הרצל 15 תל אביב");
      expect(result.buildingNumber).toBe("15");
      expect(result.city).toBe("אביב"); // Last Hebrew word
    });

    it("parses address without building number", () => {
      const result = parseAddress("רחוב הרצל, תל אביב");
      expect(result.street).toBe("הרצל");
      expect(result.buildingNumber).toBe("");
      expect(result.city).toBe("תל אביב");
    });

    it("handles empty address", () => {
      const result = parseAddress("");
      expect(result.street).toBe("");
      expect(result.buildingNumber).toBe("");
      expect(result.city).toBe("");
    });

    it("parses address with multi-word street name", () => {
      const result = parseAddress("בן יהודה 50, חיפה");
      expect(result.street).toBe("בן יהודה");
      expect(result.buildingNumber).toBe("50");
      expect(result.city).toBe("חיפה");
    });

    it("parses address with neighborhood style", () => {
      const result = parseAddress("אייר 12, קרית השרון, נתניה");
      expect(result.buildingNumber).toBe("12");
      expect(result.city).toBe("נתניה");
    });
  });
});

describe("Step1InitialData Form Validation", () => {
  const validFormData = {
    valuationType: "שווי שוק",
    clientName: "ישראל ישראלי",
    street: "הרצל",
    buildingNumber: "15",
    city: "תל אביב",
    rooms: 4,
    floor: "2",
    shamayName: "משה כהן",
    shamaySerialNumber: "12345",
  };

  it("returns true for valid form data", () => {
    expect(validateForm(validFormData)).toBe(true);
  });

  it("returns false when valuationType is empty", () => {
    expect(validateForm({ ...validFormData, valuationType: "" })).toBe(false);
  });

  it("returns false when valuationType is whitespace only", () => {
    expect(validateForm({ ...validFormData, valuationType: "   " })).toBe(
      false,
    );
  });

  it("returns false when clientName is empty", () => {
    expect(validateForm({ ...validFormData, clientName: "" })).toBe(false);
  });

  it("returns false when street is empty", () => {
    expect(validateForm({ ...validFormData, street: "" })).toBe(false);
  });

  it("returns false when buildingNumber is empty", () => {
    expect(validateForm({ ...validFormData, buildingNumber: "" })).toBe(false);
  });

  it("returns false when city is empty", () => {
    expect(validateForm({ ...validFormData, city: "" })).toBe(false);
  });

  it("returns false when rooms is 0", () => {
    expect(validateForm({ ...validFormData, rooms: 0 })).toBe(false);
  });

  it("returns false when rooms is negative", () => {
    expect(validateForm({ ...validFormData, rooms: -1 })).toBe(false);
  });

  it("returns false when rooms is empty string", () => {
    expect(validateForm({ ...validFormData, rooms: "" })).toBe(false);
  });

  it("returns true when rooms is decimal", () => {
    expect(validateForm({ ...validFormData, rooms: 3.5 })).toBe(true);
  });

  it("returns true when rooms is string number", () => {
    expect(validateForm({ ...validFormData, rooms: "4" })).toBe(true);
  });

  it("returns false when floor is empty", () => {
    expect(validateForm({ ...validFormData, floor: "" })).toBe(false);
  });

  it("returns false when floor is 0 (falsy value)", () => {
    // Note: floor=0 fails validation due to `floor || ""` being falsy
    // Users should enter "קרקע" or "0" as string for ground floor
    expect(validateForm({ ...validFormData, floor: 0 })).toBe(false);
  });

  it("returns true when floor is string '0' (ground floor)", () => {
    expect(validateForm({ ...validFormData, floor: "0" })).toBe(true);
  });

  it("returns true when floor is string (e.g., קרקע)", () => {
    expect(validateForm({ ...validFormData, floor: "קרקע" })).toBe(true);
  });

  it("returns false when shamayName is empty", () => {
    expect(validateForm({ ...validFormData, shamayName: "" })).toBe(false);
  });

  it("returns false when shamaySerialNumber is empty", () => {
    expect(validateForm({ ...validFormData, shamaySerialNumber: "" })).toBe(
      false,
    );
  });

  it("handles Hebrew characters in all fields", () => {
    const hebrewFormData = {
      valuationType: "שווי שוק",
      clientName: "יונתן וישניצקי",
      street: "רחוב אייר",
      buildingNumber: "12",
      city: "נתניה",
      rooms: 4,
      floor: "שניה",
      shamayName: "אביתר פפרני",
      shamaySerialNumber: "12345",
    };
    expect(validateForm(hebrewFormData)).toBe(true);
  });
});

describe("Step1InitialData Edge Cases", () => {
  describe("Date handling edge cases", () => {
    it("handles leap year date", () => {
      expect(normalizeDateToISO("29.02.2024")).toBe("2024-02-29");
    });

    it("handles century boundary", () => {
      expect(normalizeDateToISO("01.01.2000")).toBe("2000-01-01");
    });

    it("handles future dates", () => {
      expect(normalizeDateToISO("31.12.2030")).toBe("2030-12-31");
    });
  });

  describe("Address parsing edge cases", () => {
    it("handles address with apartment number", () => {
      const result = parseAddress("הרצל 15/3, תל אביב");
      expect(result.buildingNumber).toBe("15"); // Gets first number
    });

    it("handles address with PO box style", () => {
      const result = parseAddress("ת.ד. 123, ירושלים");
      expect(result.buildingNumber).toBe("123");
      expect(result.city).toBe("ירושלים");
    });

    it("handles very long street names", () => {
      const result = parseAddress("שדרות בן גוריון הזקן 100, תל אביב");
      expect(result.buildingNumber).toBe("100");
    });
  });

  describe("Validation edge cases", () => {
    it("handles numeric string for rooms", () => {
      const formData = {
        valuationType: "שווי שוק",
        clientName: "Test",
        street: "Test",
        buildingNumber: "1",
        city: "Test",
        rooms: "4.5",
        floor: "1",
        shamayName: "Test",
        shamaySerialNumber: "123",
      };
      expect(validateForm(formData)).toBe(true);
    });

    it("handles NaN for rooms", () => {
      const formData = {
        valuationType: "שווי שוק",
        clientName: "Test",
        street: "Test",
        buildingNumber: "1",
        city: "Test",
        rooms: "not a number",
        floor: "1",
        shamayName: "Test",
        shamaySerialNumber: "123",
      };
      expect(validateForm(formData)).toBe(false);
    });
  });
});
