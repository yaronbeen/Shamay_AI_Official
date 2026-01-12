"use client";

import { useSearchParams, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Step3FieldsPanel } from "@/components/steps/Step3FieldsPanel";
import { Step3PDFPanel, PDFFile } from "@/components/steps/Step3PDFPanel";
import { Step5ValuationPanel } from "@/components/steps/Step5ValuationPanel";
import { ValuationData } from "@/types/valuation";
import {
  Loader2,
  FileText,
  Download,
  CheckCircle,
  ExternalLink,
} from "lucide-react";

export default function PanelPage() {
  const params = useParams<{ type: string }>();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const [data, setData] = useState<ValuationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfFiles, setPdfFiles] = useState<PDFFile[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  useEffect(() => {
    const loadSessionData = async () => {
      if (!sessionId) {
        setError("No session ID provided");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/session/${sessionId}`);
        if (!response.ok) {
          throw new Error("Failed to load session");
        }
        const result = await response.json();
        if (result.data) {
          setData(result.data as ValuationData);

          // Load PDF files from uploads
          if (result.data.uploads && Array.isArray(result.data.uploads)) {
            const files: PDFFile[] = [];
            for (const upload of result.data.uploads) {
              if (upload.status !== "completed") continue;
              const fileName =
                upload.name || upload.fileName || `${upload.type}_document`;
              const fileType = upload.mimeType || "application/octet-stream";
              const isPDF =
                fileType === "application/pdf" ||
                fileType.includes("pdf") ||
                fileName.toLowerCase().endsWith(".pdf") ||
                ["tabu", "permit", "condo"].includes(upload.type);

              if (isPDF && upload.url) {
                files.push({
                  type: upload.type,
                  name: fileName,
                  preview: upload.url,
                  url: upload.url,
                  file: new File([], fileName, { type: "application/pdf" }),
                });
              }
            }
            setPdfFiles(files);
          }
        } else {
          throw new Error("No data in session");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load session");
      } finally {
        setLoading(false);
      }
    };

    loadSessionData();
  }, [sessionId]);

  const updateData = (updates: Partial<ValuationData>) => {
    if (data) {
      setData({ ...data, ...updates });
    }
  };

  const handleExportPDF = async () => {
    if (!sessionId) return;
    try {
      setExporting(true);
      setExportStatus("idle");
      const response = await fetch(`/api/session/${sessionId}/export-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("PDF export failed");
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/pdf")) {
        const blob = await response.blob();
        setPdfBlob(blob);
        setExportStatus("success");
        const url = URL.createObjectURL(blob);
        try {
          const link = document.createElement("a");
          link.href = url;
          link.download = `shamay-valuation-${sessionId}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } finally {
          URL.revokeObjectURL(url);
        }
      } else {
        throw new Error("Invalid response");
      }
    } catch (error) {
      setExportStatus("error");
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadPDF = () => {
    if (pdfBlob && sessionId) {
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `shamay-valuation-${sessionId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-2">שגיאה בטעינת הנתונים</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const renderPanel = () => {
    switch (params.type) {
      case "step3-fields":
        return (
          <div className="p-6 h-screen overflow-y-auto" dir="rtl">
            <Step3FieldsPanel
              data={data}
              updateData={updateData}
              sessionId={sessionId || undefined}
              extractedData={data.extractedData || {}}
              onFieldSave={() => {}}
              provenanceData={{}}
            />
          </div>
        );
      case "step5-valuation":
        return (
          <div className="p-6 h-screen overflow-y-auto" dir="rtl">
            <Step5ValuationPanel
              data={data}
              updateData={updateData}
              sessionId={sessionId || undefined}
            />
          </div>
        );
      case "step3-pdf":
        return (
          <div className="h-screen" dir="rtl">
            <Step3PDFPanel
              files={pdfFiles}
              currentIndex={currentFileIndex}
              onIndexChange={setCurrentFileIndex}
              loading={false}
              sessionId={sessionId || undefined}
            />
          </div>
        );
      case "step5-export":
        return (
          <div className="p-6 h-screen overflow-y-auto" dir="rtl">
            <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-lg">
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
                    : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg"
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
        );
      default:
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <p className="text-gray-600">Unknown panel type: {params.type}</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center overflow-x-auto">
      <div className="w-full sm:w-5/6 md:w-2/3 lg:w-1/2 lg:min-w-[600px] px-4 sm:px-0">
        {renderPanel()}
      </div>
    </div>
  );
}
