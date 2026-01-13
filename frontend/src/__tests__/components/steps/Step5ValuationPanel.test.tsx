import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Step5ValuationPanel } from "@/components/steps/Step5ValuationPanel";
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
  apartmentSqm: 100,
  pricePerSqm: 50000,
  finalValuation: 5000000,
};

describe("Step5ValuationPanel", () => {
  let mockUpdateData: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateData = vi.fn();
    // Reset fetch to default mock
    (global.fetch as ReturnType<typeof vi.fn>).mockReset();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockValuationData }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Display Mode", () => {
    it("renders panel title", () => {
      render(
        <Step5ValuationPanel
          data={mockValuationData as ValuationData}
          updateData={mockUpdateData}
          sessionId="test-session-123"
        />,
      );

      expect(screen.getByText("חישוב שווי הנכס")).toBeInTheDocument();
    });

    it("displays area and price labels", () => {
      render(
        <Step5ValuationPanel
          data={mockValuationData as ValuationData}
          updateData={mockUpdateData}
          sessionId="test-session-123"
        />,
      );

      // Check for labels that are always displayed
      expect(screen.getByText(/שטח נמדד/)).toBeInTheDocument();
      expect(screen.getByText(/מחיר למ"ר/)).toBeInTheDocument();
    });

    it("displays final valuation", async () => {
      render(
        <Step5ValuationPanel
          data={mockValuationData as ValuationData}
          updateData={mockUpdateData}
          sessionId="test-session-123"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("₪5,000,000")).toBeInTheDocument();
      });
    });

    it("displays edit button", () => {
      render(
        <Step5ValuationPanel
          data={mockValuationData as ValuationData}
          updateData={mockUpdateData}
          sessionId="test-session-123"
        />,
      );

      expect(screen.getByTitle("ערוך נתונים")).toBeInTheDocument();
    });
  });

  describe("Edit Mode", () => {
    it("has an edit button to toggle edit mode", () => {
      render(
        <Step5ValuationPanel
          data={mockValuationData as ValuationData}
          updateData={mockUpdateData}
          sessionId="test-session-123"
        />,
      );

      const editButton = screen.getByTitle("ערוך נתונים");
      expect(editButton).toBeInTheDocument();

      // Click should not throw
      fireEvent.click(editButton);
    });
  });

  describe("API Integration", () => {
    it("loads session data on mount", async () => {
      render(
        <Step5ValuationPanel
          data={mockValuationData as ValuationData}
          updateData={mockUpdateData}
          sessionId="test-session-123"
        />,
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/session/test-session-123",
        );
      });
    });

    it("does not load data when no session ID provided", async () => {
      render(
        <Step5ValuationPanel
          data={{ ...mockValuationData, sessionId: undefined } as ValuationData}
          updateData={mockUpdateData}
        />,
      );

      // Give time for any potential fetch to be called
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
