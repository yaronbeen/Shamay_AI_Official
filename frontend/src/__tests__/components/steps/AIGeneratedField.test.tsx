import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AIGeneratedField } from "@/components/steps/AIGeneratedField";

describe("AIGeneratedField", () => {
  let mockOnChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockOnChange = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("Rendering", () => {
    it("renders with initial value", () => {
      render(
        <AIGeneratedField
          label="Test Field"
          value="Initial text"
          onChange={mockOnChange}
          isLoading={false}
        />,
      );

      expect(screen.getByText("Test Field")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Initial text")).toBeInTheDocument();
    });

    it("renders textarea in edit mode", () => {
      render(
        <AIGeneratedField
          label="Test Field"
          value="Some text"
          onChange={mockOnChange}
          isLoading={false}
        />,
      );

      const textarea = screen.getByRole("textbox");
      expect(textarea).toBeInTheDocument();
      expect(textarea.tagName).toBe("TEXTAREA");
    });
  });

  describe("Debounced auto-save", () => {
    it("does not call onChange immediately on typing", async () => {
      render(
        <AIGeneratedField
          label="Test Field"
          value="Initial"
          onChange={mockOnChange}
          isLoading={false}
        />,
      );

      const textarea = screen.getByRole("textbox");
      fireEvent.change(textarea, { target: { value: "Updated" } });

      // Should not be called immediately
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it("calls onChange after debounce delay", async () => {
      render(
        <AIGeneratedField
          label="Test Field"
          value="Initial"
          onChange={mockOnChange}
          isLoading={false}
        />,
      );

      const textarea = screen.getByRole("textbox");
      fireEvent.change(textarea, { target: { value: "Updated" } });

      // Should not be called immediately
      expect(mockOnChange).not.toHaveBeenCalled();

      // Advance timers by debounce delay (500ms)
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Now onChange should be called
      expect(mockOnChange).toHaveBeenCalledWith("Updated");
    });

    it("resets debounce timer on subsequent typing", async () => {
      render(
        <AIGeneratedField
          label="Test Field"
          value="Initial"
          onChange={mockOnChange}
          isLoading={false}
        />,
      );

      const textarea = screen.getByRole("textbox");

      // Type first change
      fireEvent.change(textarea, { target: { value: "First" } });

      // Wait 300ms (less than debounce)
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Type second change - should reset the timer
      fireEvent.change(textarea, { target: { value: "Second" } });

      // Wait another 300ms
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Should not have been called yet (only 300ms since last change)
      expect(mockOnChange).not.toHaveBeenCalled();

      // Wait the remaining time
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Now onChange should be called with the final value
      expect(mockOnChange).toHaveBeenCalledWith("Second");
      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });

    it("immediately calls onChange on blur", async () => {
      render(
        <AIGeneratedField
          label="Test Field"
          value="Initial"
          onChange={mockOnChange}
          isLoading={false}
        />,
      );

      const textarea = screen.getByRole("textbox");
      fireEvent.change(textarea, { target: { value: "Updated" } });

      // Should not be called immediately
      expect(mockOnChange).not.toHaveBeenCalled();

      // Blur the field - should immediately trigger onChange
      fireEvent.blur(textarea);

      // onChange should be called immediately without waiting for debounce
      expect(mockOnChange).toHaveBeenCalledWith("Updated");
    });

    it("cancels pending debounce on blur", async () => {
      render(
        <AIGeneratedField
          label="Test Field"
          value="Initial"
          onChange={mockOnChange}
          isLoading={false}
        />,
      );

      const textarea = screen.getByRole("textbox");
      fireEvent.change(textarea, { target: { value: "Updated" } });

      // Blur immediately
      fireEvent.blur(textarea);

      // Should be called once from blur
      expect(mockOnChange).toHaveBeenCalledTimes(1);

      // Advance timers past debounce - should not call again
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Should still only be called once
      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });
  });

  describe("Local state management", () => {
    it("updates local value on typing without calling onChange", () => {
      render(
        <AIGeneratedField
          label="Test Field"
          value="Initial"
          onChange={mockOnChange}
          isLoading={false}
        />,
      );

      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: "New Value" } });

      // Local state should update
      expect(textarea.value).toBe("New Value");

      // But onChange should not be called yet
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe("Cleanup", () => {
    it("cleans up debounce timer on unmount", () => {
      const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

      const { unmount } = render(
        <AIGeneratedField
          label="Test Field"
          value="Initial"
          onChange={mockOnChange}
          isLoading={false}
        />,
      );

      const textarea = screen.getByRole("textbox");
      fireEvent.change(textarea, { target: { value: "Updated" } });

      unmount();

      // clearTimeout should have been called during cleanup
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });
});
