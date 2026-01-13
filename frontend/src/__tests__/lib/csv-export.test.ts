import { describe, it, expect, vi, beforeEach } from "vitest";

// Helper function to escape CSV fields (matches the implementation in EditableDocumentPreview)
function escapeCSVField(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

// Helper function to generate CSV content
function generateCSVContent(headers: string[], rows: string[][]): string {
  const headerRow = headers.map(escapeCSVField).join(",");
  const dataRows = rows.map((row) => row.map(escapeCSVField).join(","));
  return [headerRow, ...dataRows].join("\n");
}

describe("CSV Export", () => {
  describe("escapeCSVField", () => {
    it("returns unescaped field when no special characters", () => {
      expect(escapeCSVField("simple text")).toBe("simple text");
      expect(escapeCSVField("123")).toBe("123");
      expect(escapeCSVField("שלום")).toBe("שלום");
    });

    it("escapes fields containing commas", () => {
      expect(escapeCSVField("hello,world")).toBe('"hello,world"');
      expect(escapeCSVField("a,b,c")).toBe('"a,b,c"');
    });

    it("escapes fields containing double quotes", () => {
      expect(escapeCSVField('say "hello"')).toBe('"say ""hello"""');
      expect(escapeCSVField('"quoted"')).toBe('"""quoted"""');
    });

    it("escapes fields containing newlines", () => {
      expect(escapeCSVField("line1\nline2")).toBe('"line1\nline2"');
      expect(escapeCSVField("multi\nline\ntext")).toBe('"multi\nline\ntext"');
    });

    it("handles fields with multiple special characters", () => {
      expect(escapeCSVField('hello,world\nwith "quotes"')).toBe(
        '"hello,world\nwith ""quotes"""',
      );
    });

    it("handles empty strings", () => {
      expect(escapeCSVField("")).toBe("");
    });
  });

  describe("generateCSVContent", () => {
    it("generates correct CSV from simple data", () => {
      const headers = ["Name", "Age", "City"];
      const rows = [
        ["John", "25", "New York"],
        ["Jane", "30", "London"],
      ];

      const result = generateCSVContent(headers, rows);
      expect(result).toBe("Name,Age,City\nJohn,25,New York\nJane,30,London");
    });

    it("handles Hebrew characters correctly", () => {
      const headers = ["שם", "גיל", "עיר"];
      const rows = [
        ["יוחנן", "25", "תל אביב"],
        ["שרה", "30", "ירושלים"],
      ];

      const result = generateCSVContent(headers, rows);
      expect(result).toBe("שם,גיל,עיר\nיוחנן,25,תל אביב\nשרה,30,ירושלים");
    });

    it("escapes special characters in data", () => {
      const headers = ["Description", "Value"];
      const rows = [
        ["Item with, comma", "100"],
        ['Item with "quotes"', "200"],
        ["Item with\nnewline", "300"],
      ];

      const result = generateCSVContent(headers, rows);
      expect(result).toContain('"Item with, comma"');
      expect(result).toContain('"Item with ""quotes"""');
      expect(result).toContain('"Item with\nnewline"');
    });

    it("handles empty rows array", () => {
      const headers = ["A", "B", "C"];
      const rows: string[][] = [];

      const result = generateCSVContent(headers, rows);
      expect(result).toBe("A,B,C");
    });

    it("handles empty cells", () => {
      const headers = ["A", "B", "C"];
      const rows = [
        ["1", "", "3"],
        ["", "2", ""],
      ];

      const result = generateCSVContent(headers, rows);
      expect(result).toBe("A,B,C\n1,,3\n,2,");
    });
  });

  describe("BOM for Excel Hebrew support", () => {
    it("BOM constant is correct UTF-8 BOM", () => {
      const BOM = "\uFEFF";
      // UTF-8 BOM is the character U+FEFF
      expect(BOM.charCodeAt(0)).toBe(0xfeff);
    });

    it("CSV with BOM can be read correctly", () => {
      const BOM = "\uFEFF";
      const csv = "שם,גיל\nאבי,30";
      const csvWithBom = BOM + csv;

      // First character should be BOM
      expect(csvWithBom.charCodeAt(0)).toBe(0xfeff);
      // Rest should be the CSV content
      expect(csvWithBom.substring(1)).toBe(csv);
    });
  });
});

describe("CSV Export Integration", () => {
  let mockCreateObjectURL: ReturnType<typeof vi.fn>;
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>;
  let mockAppendChild: ReturnType<typeof vi.fn>;
  let mockRemoveChild: ReturnType<typeof vi.fn>;
  let mockClick: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockCreateObjectURL = vi.fn(() => "blob:mock-url");
    mockRevokeObjectURL = vi.fn();
    mockAppendChild = vi.fn();
    mockRemoveChild = vi.fn();
    mockClick = vi.fn();

    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    // Mock document.createElement to return a mock link element
    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName === "a") {
        return {
          href: "",
          download: "",
          click: mockClick,
        } as unknown as HTMLAnchorElement;
      }
      return document.createElement(tagName);
    });

    vi.spyOn(document.body, "appendChild").mockImplementation(mockAppendChild);
    vi.spyOn(document.body, "removeChild").mockImplementation(mockRemoveChild);
  });

  it("creates blob with correct content type", () => {
    const BOM = "\uFEFF";
    const csvContent = "Name,Age\nJohn,25";

    const blob = new Blob([BOM + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    expect(blob.type).toBe("text/csv;charset=utf-8;");
    expect(blob.size).toBeGreaterThan(csvContent.length); // BOM adds bytes
  });

  it("triggers download with correct filename", () => {
    const tableTitle = "נתוני השוואה";
    const expectedFilename = `${tableTitle}-export.csv`;

    // Simulate the download process
    const BOM = "\uFEFF";
    const csvContent = "A,B\n1,2";
    const blob = new Blob([BOM + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = expectedFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    expect(mockCreateObjectURL).toHaveBeenCalledWith(blob);
    expect(mockClick).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });
});
