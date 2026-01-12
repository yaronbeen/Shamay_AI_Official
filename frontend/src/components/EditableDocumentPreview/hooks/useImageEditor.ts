/**
 * Image editing hook for EditableDocumentPreview
 * Handles image resize, replace, and reset operations
 */

import { useCallback } from "react";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_FILE_SIZE,
  ToolbarState,
} from "../types";
import { ValuationData } from "@/types/valuation";

interface UseImageEditorProps {
  getFrameDocument: () => Document | null;
  toolbarStateRef: React.MutableRefObject<ToolbarState>;
  saveOverrideForElement: (element: HTMLElement) => void;
  onDataChange: (updates: Partial<ValuationData>) => void;
}

export function useImageEditor({
  getFrameDocument,
  toolbarStateRef,
  saveOverrideForElement,
  onDataChange,
}: UseImageEditorProps) {
  const handleImageResize = useCallback(
    (mode: "full" | "half" | "third") => {
      const doc = getFrameDocument();
      const selector = toolbarStateRef.current.targetSelector;
      if (!doc || !selector || toolbarStateRef.current.mode !== "image") {
        return;
      }
      const container = doc.querySelector(selector) as HTMLElement | null;
      if (!container) {
        return;
      }
      const img = container.querySelector("img") as HTMLImageElement | null;
      if (!img) {
        return;
      }
      const width = mode === "full" ? "100%" : mode === "half" ? "50%" : "33%";
      img.style.width = width;
      img.style.height = "auto";
      saveOverrideForElement(container);
    },
    [getFrameDocument, saveOverrideForElement, toolbarStateRef],
  );

  const handleImageReplace = useCallback(() => {
    const doc = getFrameDocument();
    const selector = toolbarStateRef.current.targetSelector;
    if (!doc || !selector || toolbarStateRef.current.mode !== "image") {
      return;
    }
    const container = doc.querySelector(selector) as HTMLElement | null;
    if (!container) {
      return;
    }
    const img = container.querySelector("img") as HTMLImageElement | null;
    if (!img) {
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/gif,image/webp";
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) {
        return;
      }

      // Security: Validate file type
      if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
        alert("סוג קובץ לא נתמך. יש להעלות JPG, PNG, GIF או WebP");
        return;
      }

      // Security: Validate file size
      if (file.size > MAX_IMAGE_FILE_SIZE) {
        alert("הקובץ גדול מדי. הגודל המרבי הוא 10MB");
        return;
      }

      // Security: Validate image can be loaded
      const isValidImage = await new Promise<boolean>((resolve) => {
        const testImg = new Image();
        const objectUrl = URL.createObjectURL(file);
        testImg.onload = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(true);
        };
        testImg.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(false);
        };
        testImg.src = objectUrl;
      });

      if (!isValidImage) {
        alert("הקובץ אינו תמונה תקינה");
        return;
      }

      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const result = loadEvent.target?.result as string;
        if (result) {
          img.src = result;
          saveOverrideForElement(container);
          if (container.classList.contains("cover-image-frame")) {
            onDataChange({ selectedImagePreview: result as any });
          }
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [getFrameDocument, onDataChange, saveOverrideForElement, toolbarStateRef]);

  const handleImageReset = useCallback(() => {
    const doc = getFrameDocument();
    const selector = toolbarStateRef.current.targetSelector;
    if (!doc || !selector || toolbarStateRef.current.mode !== "image") {
      return;
    }
    const container = doc.querySelector(selector) as HTMLElement | null;
    if (!container) {
      return;
    }
    const img = container.querySelector("img") as HTMLImageElement | null;
    if (!img) {
      return;
    }
    img.style.removeProperty("width");
    img.style.removeProperty("height");
    saveOverrideForElement(container);
  }, [getFrameDocument, saveOverrideForElement, toolbarStateRef]);

  return {
    handleImageResize,
    handleImageReplace,
    handleImageReset,
  };
}
