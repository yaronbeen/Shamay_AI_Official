import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Step5Export } from "@/components/steps/Step5Export";
import { ValuationData } from "@/types/valuation";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock data
const mockValuationData: Partial<ValuationData> = {
  sessionId: "test-session-123",
  street: "Test Street",
  buildingNumber: "42",
  city: "Tel Aviv",
  apartmentSqm: 100,
  pricePerSqm: 50000,
  finalValuation: 5000000,
};

describe("Step5Export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch to default mock that works with all tests
    (global.fetch as ReturnType<typeof vi.fn>).mockReset();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockValuationData }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Rendering", () => {
    it("renders export page title", () => {
      render(
        <Step5Export
          data={mockValuationData as ValuationData}
          sessionId="test-session-123"
        />,
      );

      expect(screen.getByText("חישוב שווי וייצוא")).toBeInTheDocument();
    });

    it("renders PDF export section", () => {
      render(
        <Step5Export
          data={mockValuationData as ValuationData}
          sessionId="test-session-123"
        />,
      );

      expect(screen.getByText("ייצוא PDF")).toBeInTheDocument();
      expect(screen.getByText("יצור PDF")).toBeInTheDocument();
    });

    it("renders Word export section", () => {
      render(
        <Step5Export
          data={mockValuationData as ValuationData}
          sessionId="test-session-123"
        />,
      );

      expect(screen.getByText("ייצוא Word")).toBeInTheDocument();
      expect(screen.getByText("יצור Word")).toBeInTheDocument();
    });
  });

  describe("PDF Export", () => {
    it("calls PDF export API when button is clicked", async () => {
      const mockBlob = new Blob(["test pdf"], { type: "application/pdf" });
      // First call is for session data (from Step5ValuationPanel), second is for export
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockValuationData }),
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ "content-type": "application/pdf" }),
          blob: () => Promise.resolve(mockBlob),
        });

      render(
        <Step5Export
          data={mockValuationData as ValuationData}
          sessionId="test-session-123"
        />,
      );

      const pdfButton = screen.getByText("יצור PDF");
      fireEvent.click(pdfButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/session/test-session-123/export-pdf",
          expect.objectContaining({ method: "POST" }),
        );
      });
    });

    it("shows success toast after PDF export", async () => {
      const { toast } = await import("sonner");
      const mockBlob = new Blob(["test pdf"], { type: "application/pdf" });
      // First call is for session data (from Step5ValuationPanel), second is for export
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockValuationData }),
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ "content-type": "application/pdf" }),
          blob: () => Promise.resolve(mockBlob),
        });

      render(
        <Step5Export
          data={mockValuationData as ValuationData}
          sessionId="test-session-123"
        />,
      );

      const pdfButton = screen.getByText("יצור PDF");
      fireEvent.click(pdfButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          "PDF נוצר בהצלחה! הקובץ הורד למחשב שלך",
        );
      });
    });
  });

  describe("Word Export", () => {
    it("calls DOCX export API when button is clicked", async () => {
      const mockBlob = new Blob(["test docx"], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      // First call is for session data (from Step5ValuationPanel), second is for export
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockValuationData }),
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({
            "content-type":
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          }),
          blob: () => Promise.resolve(mockBlob),
        });

      render(
        <Step5Export
          data={mockValuationData as ValuationData}
          sessionId="test-session-123"
        />,
      );

      const wordButton = screen.getByText("יצור Word");
      fireEvent.click(wordButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/session/test-session-123/export-docx",
          expect.objectContaining({ method: "POST" }),
        );
      });
    });

    it("shows success toast after Word export", async () => {
      const { toast } = await import("sonner");
      const mockBlob = new Blob(["test docx"], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      // First call is for session data (from Step5ValuationPanel), second is for export
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockValuationData }),
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({
            "content-type":
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          }),
          blob: () => Promise.resolve(mockBlob),
        });

      render(
        <Step5Export
          data={mockValuationData as ValuationData}
          sessionId="test-session-123"
        />,
      );

      const wordButton = screen.getByText("יצור Word");
      fireEvent.click(wordButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          "Word נוצר בהצלחה! הקובץ הורד למחשב שלך",
        );
      });
    });

    it("shows error toast when Word export fails", async () => {
      const { toast } = await import("sonner");
      // First call is for session data (from Step5ValuationPanel), second is for export
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockValuationData }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

      render(
        <Step5Export
          data={mockValuationData as ValuationData}
          sessionId="test-session-123"
        />,
      );

      const wordButton = screen.getByText("יצור Word");
      fireEvent.click(wordButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "שגיאה ביצירת Word. אנא נסה שוב",
        );
      });
    });
  });

  describe("Loading states", () => {
    it("shows loading state while exporting PDF", async () => {
      // First call resolves (session data), second never resolves (export)
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockValuationData }),
        })
        .mockImplementationOnce(() => new Promise(() => {}));

      render(
        <Step5Export
          data={mockValuationData as ValuationData}
          sessionId="test-session-123"
        />,
      );

      const pdfButton = screen.getByText("יצור PDF");
      fireEvent.click(pdfButton);

      await waitFor(() => {
        expect(screen.getByText("מייצא...")).toBeInTheDocument();
      });
    });

    it("shows loading state while exporting Word", async () => {
      // First call resolves (session data), second never resolves (export)
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockValuationData }),
        })
        .mockImplementationOnce(() => new Promise(() => {}));

      render(
        <Step5Export
          data={mockValuationData as ValuationData}
          sessionId="test-session-123"
        />,
      );

      const wordButton = screen.getByText("יצור Word");
      fireEvent.click(wordButton);

      await waitFor(() => {
        expect(screen.getByText("מייצא Word...")).toBeInTheDocument();
      });
    });
  });
});
