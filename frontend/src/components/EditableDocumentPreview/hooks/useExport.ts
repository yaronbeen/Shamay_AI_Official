/**
 * Export hook for EditableDocumentPreview
 * Handles PDF and DOCX export functionality
 */

import { useState, useCallback } from "react";
import { ValuationData } from "@/types/valuation";

interface UseExportProps {
  data: ValuationData;
  customHtmlOverrides: Record<string, string>;
}

interface UseExportReturn {
  isExporting: boolean;
  handleExportPDF: (useReactPdf?: boolean) => Promise<void>;
  handleExportDOCX: () => Promise<void>;
}

/**
 * Helper to get merged document edits from data and overrides
 */
function getMergedEdits(
  data: ValuationData,
  customHtmlOverrides: Record<string, string>,
): Record<string, string> {
  return {
    ...(data.customDocumentEdits || {}),
    ...customHtmlOverrides,
  };
}

/**
 * Helper to trigger file download from blob
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export function useExport({
  data,
  customHtmlOverrides,
}: UseExportProps): UseExportReturn {
  const [isExporting, setIsExporting] = useState(false);

  /**
   * Export document as PDF
   * @param useReactPdf - If true, uses React-PDF engine; otherwise uses Puppeteer
   */
  const handleExportPDF = useCallback(
    async (useReactPdf: boolean = false): Promise<void> => {
      const sessionId = data.sessionId;
      if (!sessionId) {
        alert("לא ניתן לייצא - חסר מזהה סשן");
        return;
      }

      setIsExporting(true);
      try {
        const mergedEdits = getMergedEdits(data, customHtmlOverrides);

        // Choose endpoint based on PDF engine preference
        const endpoint = useReactPdf
          ? `/api/session/${sessionId}/export-pdf-react`
          : `/api/session/${sessionId}/export-pdf`;

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customDocumentEdits: mergedEdits,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to export PDF: ${errorText}`);
        }

        const blob = await response.blob();
        downloadBlob(blob, `shamay-valuation-${sessionId}.pdf`);

        alert(
          `✅ PDF הורד בהצלחה! (${useReactPdf ? "React-PDF" : "Puppeteer"})`,
        );
      } catch (error) {
        console.error("Error exporting PDF:", error);
        alert(
          `❌ שגיאה בייצוא PDF: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      } finally {
        setIsExporting(false);
      }
    },
    [data, customHtmlOverrides],
  );

  /**
   * Export document as DOCX (Word)
   */
  const handleExportDOCX = useCallback(async (): Promise<void> => {
    const sessionId = data.sessionId;
    if (!sessionId) {
      alert("לא ניתן לייצא - חסר מזהה סשן");
      return;
    }

    setIsExporting(true);
    try {
      const mergedEdits = getMergedEdits(data, customHtmlOverrides);

      const response = await fetch(`/api/session/${sessionId}/export-docx`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customDocumentEdits: mergedEdits,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to export DOCX: ${errorText}`);
      }

      const blob = await response.blob();
      downloadBlob(blob, `shamay-valuation-${sessionId}.docx`);

      alert("✅ קובץ Word הורד בהצלחה!");
    } catch (error) {
      console.error("Error exporting DOCX:", error);
      alert(
        `❌ שגיאה בייצוא Word: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsExporting(false);
    }
  }, [data, customHtmlOverrides]);

  return {
    isExporting,
    handleExportPDF,
    handleExportDOCX,
  };
}
