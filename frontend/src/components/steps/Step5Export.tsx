"use client";

import { useState } from "react";
import React from "react";
import {
  Download,
  FileText,
  CheckCircle,
  Loader2,
  ExternalLink,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { ValuationData } from "@/types/valuation";
import { Step5ValuationPanel } from "./Step5ValuationPanel";
import { EditableDocumentPreview } from "../EditableDocumentPreview";
import { CollapsibleDrawer } from "../ui/CollapsibleDrawer";
import { cn } from "@/lib/utils";

interface Step5ExportProps {
  data: ValuationData;
  updateData?: (updates: Partial<ValuationData>) => void;
  sessionId?: string;
  onSaveFinalResults?: (
    finalValuation: number,
    pricePerSqm: number,
    comparableData: any,
    propertyAnalysis: any,
  ) => Promise<void>;
}

export function Step5Export({ data, updateData, sessionId }: Step5ExportProps) {
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  // Word export state
  const [exportingDocx, setExportingDocx] = useState(false);
  const [docxStatus, setDocxStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const [docxBlob, setDocxBlob] = useState<Blob | null>(null);

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);

  // Preview drawer state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewWidth, setPreviewWidth] = useState<"half" | "full">("half");

  // Use prop sessionId or fall back to data.sessionId
  const effectiveSessionId = sessionId || data.sessionId;

  const openExportInNewTab = () => {
    if (effectiveSessionId) {
      window.open(
        `/panel/step5-export?sessionId=${effectiveSessionId}`,
        "_blank",
        "noopener,noreferrer",
      );
    }
  };

  const handleExportPDF = async () => {
    if (!effectiveSessionId) {
      console.error("No session ID available");
      return;
    }

    try {
      setExporting(true);
      setExportStatus("idle");

      console.log("📄 Starting PDF export...");

      const response = await fetch(
        `/api/session/${effectiveSessionId}/export-pdf`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!response.ok) {
        throw new Error(`PDF export failed: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      console.log("📄 Response content type:", contentType);

      if (contentType?.includes("application/pdf")) {
        const pdfBlob = await response.blob();
        console.log("✅ PDF blob created:", pdfBlob.size, "bytes");

        setPdfBlob(pdfBlob);
        setExportStatus("success");
        toast.success("PDF נוצר בהצלחה! הקובץ הורד למחשב שלך");

        const url = URL.createObjectURL(pdfBlob);
        try {
          const link = document.createElement("a");
          link.href = url;
          link.download = `shamay-valuation-${effectiveSessionId}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } finally {
          URL.revokeObjectURL(url);
        }
      } else if (contentType?.includes("text/html")) {
        const html = await response.text();
        console.warn(
          "⚠️ Received HTML instead of PDF, opening print dialog...",
        );

        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          setTimeout(() => printWindow.print(), 500);
        }

        setExportStatus("success");
      } else {
        const result = await response.json();
        console.error("❌ PDF export error:", result);
        throw new Error(result.error || "PDF export failed");
      }
    } catch (error) {
      console.error("❌ PDF export error:", error);
      setExportStatus("error");
      toast.error("שגיאה ביצירת PDF. אנא נסה שוב");
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadPDF = () => {
    if (pdfBlob && effectiveSessionId) {
      const url = URL.createObjectURL(pdfBlob);
      try {
        const link = document.createElement("a");
        link.href = url;
        link.download = `shamay-valuation-${effectiveSessionId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } finally {
        URL.revokeObjectURL(url);
      }
    }
  };

  const handleExportDocx = async () => {
    if (!effectiveSessionId) {
      console.error("No session ID available");
      return;
    }

    try {
      setExportingDocx(true);
      setDocxStatus("idle");

      console.log("📝 Starting Word export...");

      const response = await fetch(
        `/api/session/${effectiveSessionId}/export-docx`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!response.ok) {
        throw new Error(`Word export failed: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");

      if (
        contentType?.includes(
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
      ) {
        const wordBlob = await response.blob();
        console.log("✅ Word blob created:", wordBlob.size, "bytes");

        setDocxBlob(wordBlob);
        setDocxStatus("success");
        toast.success("Word נוצר בהצלחה! הקובץ הורד למחשב שלך");

        const url = URL.createObjectURL(wordBlob);
        try {
          const link = document.createElement("a");
          link.href = url;
          link.download = `shamay-valuation-${effectiveSessionId}.docx`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } finally {
          URL.revokeObjectURL(url);
        }
      } else {
        const result = await response.json();
        console.error("❌ Word export error:", result);
        throw new Error(result.error || "Word export failed");
      }
    } catch (error) {
      console.error("❌ Word export error:", error);
      setDocxStatus("error");
      toast.error("שגיאה ביצירת Word. אנא נסה שוב");
    } finally {
      setExportingDocx(false);
    }
  };

  const handleDownloadDocx = () => {
    if (docxBlob && effectiveSessionId) {
      const url = URL.createObjectURL(docxBlob);
      try {
        const link = document.createElement("a");
        link.href = url;
        link.download = `shamay-valuation-${effectiveSessionId}.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } finally {
        URL.revokeObjectURL(url);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">חישוב שווי וייצוא</h2>
        <p className="text-gray-600 text-lg">
          סיכום הערכת השווי ויצירת דוח PDF
        </p>
      </div>

      {/* Main Content - Flex Layout with Drawers */}
      <div className="flex gap-4 min-h-[600px]">
        {/* Left Side - Valuation Calculation (Collapsible Drawer) - Hidden when preview is full */}
        {!(isPreviewOpen && previewWidth === "full") && (
          <CollapsibleDrawer
            isOpen={isDrawerOpen}
            onToggle={() => setIsDrawerOpen(!isDrawerOpen)}
            width={isPreviewOpen ? "w-1/4" : "w-1/3"}
            collapsedLabel="חישוב שווי"
          >
            <Step5ValuationPanel
              data={data}
              updateData={updateData}
              sessionId={sessionId}
            />
          </CollapsibleDrawer>
        )}

        {/* Center - PDF Export (shrinks when preview open, hidden when preview full) */}
        <div
          className={cn(
            "transition-all duration-300",
            isPreviewOpen && previewWidth === "full"
              ? "hidden"
              : "flex-1 min-w-[280px]",
          )}
        >
          <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-lg h-full">
            {/* Header with action buttons */}
            <div className="flex justify-end gap-2 mb-2">
              {/* Preview toggle button */}
              <button
                onClick={() => setIsPreviewOpen(!isPreviewOpen)}
                className={cn(
                  "p-1.5 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
                  isPreviewOpen
                    ? "bg-blue-100 text-blue-600"
                    : "hover:bg-gray-100 text-gray-600",
                )}
                title={isPreviewOpen ? "סגור תצוגה מקדימה" : "פתח תצוגה מקדימה"}
                aria-label="תצוגה מקדימה של הדוח"
              >
                <Eye className="w-4 h-4" />
              </button>
              {effectiveSessionId && (
                <button
                  onClick={openExportInNewTab}
                  className="p-1.5 hover:bg-gray-100 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                  title="פתח בלשונית חדשה"
                  aria-label="פתח ייצוא בלשונית חדשה"
                >
                  <ExternalLink className="w-4 h-4 text-gray-600" />
                </button>
              )}
            </div>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">ייצוא PDF</h3>
              <p className="text-sm text-gray-600">
                יצירת דוח PDF מקצועי עם כל המידע והנתונים
              </p>
            </div>

            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className={`w-full px-6 py-4 rounded-lg font-semibold text-lg transition-all ${
                exporting
                  ? "bg-gray-400 text-white cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg transform hover:scale-105"
              }`}
            >
              {exporting ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  מייצא...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <FileText className="h-5 w-5 mr-2" />
                  יצור PDF
                </div>
              )}
            </button>

            {exportStatus === "success" && (
              <div className="mt-6 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                <div className="flex items-center justify-center text-green-800 mb-2">
                  <CheckCircle className="h-6 w-6 mr-2" />
                  <span className="text-base font-semibold">
                    PDF נוצר בהצלחה!
                  </span>
                </div>
                {pdfBlob && (
                  <button
                    onClick={handleDownloadPDF}
                    className="w-full mt-3 px-4 py-2 text-sm text-blue-700 hover:text-blue-900 hover:underline font-medium"
                  >
                    <Download className="h-4 w-4 inline mr-2" />
                    הורד PDF שוב
                  </button>
                )}
              </div>
            )}

            {exportStatus === "error" && (
              <div className="mt-6 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                <p className="text-sm text-red-800 text-center font-medium">
                  שגיאה ביצירת PDF
                </p>
              </div>
            )}

            {/* Word Export Option */}
            <div className="mt-6 pt-6 border-t-2 border-gray-200">
              <div className="text-center mb-4">
                <h4 className="text-lg font-semibold mb-1">ייצוא Word</h4>
                <p className="text-sm text-gray-600">
                  יצירת מסמך Word ניתן לעריכה
                </p>
              </div>

              <button
                onClick={handleExportDocx}
                disabled={exportingDocx}
                className={`w-full px-4 py-3 rounded-lg font-medium transition-all ${
                  exportingDocx
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : "bg-green-600 text-white hover:bg-green-700 hover:shadow-lg"
                }`}
              >
                {exportingDocx ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    מייצא Word...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <FileText className="h-4 w-4 mr-2" />
                    יצור Word
                  </div>
                )}
              </button>

              {docxStatus === "success" && (
                <div className="mt-4 p-3 bg-green-50 border border-green-300 rounded-lg">
                  <div className="flex items-center justify-center text-green-800 mb-1">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    <span className="text-sm font-semibold">
                      Word נוצר בהצלחה!
                    </span>
                  </div>
                  {docxBlob && (
                    <button
                      onClick={handleDownloadDocx}
                      className="w-full mt-2 px-3 py-1.5 text-sm text-green-700 hover:text-green-900 hover:underline font-medium"
                    >
                      <Download className="h-3 w-3 inline mr-1" />
                      הורד Word שוב
                    </button>
                  )}
                </div>
              )}

              {docxStatus === "error" && (
                <div className="mt-4 p-3 bg-red-50 border border-red-300 rounded-lg">
                  <p className="text-sm text-red-800 text-center font-medium">
                    שגיאה ביצירת Word
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side - Document Preview (Collapsible Drawer) */}
        <CollapsibleDrawer
          isOpen={isPreviewOpen}
          onToggle={() => setIsPreviewOpen(!isPreviewOpen)}
          width={previewWidth === "full" ? "w-full" : "w-1/2"}
          collapsedLabel="תצוגה מקדימה"
        >
          <EditableDocumentPreview
            data={data}
            onDataChange={updateData || (() => {})}
          />
        </CollapsibleDrawer>
      </div>
    </div>
  );
}
