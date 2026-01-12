"use client";

import { useState } from "react";
import React from "react";
import {
  Download,
  FileText,
  CheckCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { ValuationData } from "@/types/valuation";
import { Step5ValuationPanel } from "./Step5ValuationPanel";
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

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">חישוב שווי וייצוא</h2>
        <p className="text-gray-600 text-lg">
          סיכום הערכת השווי ויצירת דוח PDF
        </p>
      </div>

      {/* Main Content - Flex Layout with Drawer */}
      <div className="flex gap-6 min-h-[500px]">
        {/* Left Side - Valuation Calculation (Collapsible Drawer) */}
        <CollapsibleDrawer
          isOpen={isDrawerOpen}
          onToggle={() => setIsDrawerOpen(!isDrawerOpen)}
          width="w-1/2"
        >
          <Step5ValuationPanel
            data={data}
            updateData={updateData}
            sessionId={sessionId}
          />
        </CollapsibleDrawer>

        {/* Right Side - PDF Export (expands when drawer closed) */}
        <div
          className={cn(
            "transition-all duration-300",
            isDrawerOpen ? "flex-1" : "w-full",
          )}
        >
          <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-lg h-full">
            {/* Header with open in new tab button */}
            <div className="flex justify-end mb-2">
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

            {/* Word Conversion Option */}
            <div className="mt-6 pt-6 border-t-2 border-gray-200">
              <p className="text-sm text-gray-700 mb-3 text-center font-medium">
                רוצים להמיר את ה-PDF ל-Word?
              </p>
              <a
                href="https://www.adobe.com/il_he/acrobat/online/pdf-to-word.html"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full px-4 py-3 rounded-lg font-medium bg-green-50 text-green-700 hover:bg-green-100 border-2 border-green-300 transition-colors"
              >
                <FileText className="h-4 w-4 ml-2" />
                המרת PDF ל-Word באמצעות Adobe
                <ExternalLink className="h-4 w-4 mr-2" />
              </a>
              <p className="text-xs text-gray-500 mt-2 text-center">
                כלי חינמי להמרת PDF למסמך Word ניתן לעריכה
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
