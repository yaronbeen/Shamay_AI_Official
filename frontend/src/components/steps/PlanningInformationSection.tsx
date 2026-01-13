"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Trash2, Table, Save } from "lucide-react";
import { ValuationData, ExtractedData } from "@/types/valuation";

// Planning Information Section Component (Chapter 3)
export function PlanningInformationSection({
  data,
  extractedData,
  updateData,
  sessionId,
}: {
  data: ValuationData;
  extractedData?: ExtractedData;
  updateData: (
    updates: Partial<ValuationData>,
    options?: { skipAutoSave?: boolean },
  ) => void;
  sessionId?: string;
}) {
  // Planning Plans (3.1)
  const [planningPlans, setPlanningPlans] = useState<
    Array<{
      plan_number?: string;
      plan_name?: string;
      publication_date?: string;
      status?: string;
    }>
  >([]);

  // Building Permits (3.3)
  const [buildingPermits, setBuildingPermits] = useState<
    Array<{
      permit_number?: string;
      permit_date?: string;
      permit_description?: string;
    }>
  >([]);

  const [completionCert, setCompletionCert] = useState<{
    date?: string;
    address?: string;
  } | null>(null);

  const [isSavingParams, setIsSavingParams] = useState(false);

  // Load initial data
  useEffect(() => {
    const plans =
      extractedData?.planning_plans ||
      extractedData?.planningPlans ||
      extractedData?.planning_information?.plans ||
      extractedData?.planning_information?.schemes ||
      [];
    setPlanningPlans(Array.isArray(plans) ? plans : []);

    const permits = extractedData?.building_permit || [];
    setBuildingPermits(
      Array.isArray(permits) ? permits : permits ? [permits] : [],
    );

    const cert =
      extractedData?.completion_certificate ||
      extractedData?.completionCertificate ||
      null;
    setCompletionCert(cert);
  }, [extractedData]);

  const savePlanningData = async () => {
    setIsSavingParams(true);
    try {
      const currentExtracted = (extractedData as any) || {};
      const updatedExtractedData = JSON.parse(JSON.stringify(currentExtracted));

      // Save planning plans
      if (!updatedExtractedData.planning_information) {
        updatedExtractedData.planning_information = {};
      }
      updatedExtractedData.planning_information.plans = planningPlans;
      updatedExtractedData.planning_plans = planningPlans;

      // Save building permits
      updatedExtractedData.building_permit =
        buildingPermits.length === 1 ? buildingPermits[0] : buildingPermits;

      // Save completion certificate
      if (completionCert) {
        updatedExtractedData.completion_certificate = completionCert;
        updatedExtractedData.completionCertificate = completionCert;
      } else {
        delete updatedExtractedData.completion_certificate;
        delete updatedExtractedData.completionCertificate;
      }

      updateData({ extractedData: updatedExtractedData });

      // Save to database
      const response = await fetch(`/api/session/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: { extractedData: updatedExtractedData } }),
      });

      if (!response.ok) {
        throw new Error("שגיאה בשמירת הנתונים");
      }

      alert("✅ הנתונים נשמרו בהצלחה");
    } catch (error: any) {
      console.error("Error saving planning data:", error);
      alert(`שגיאה בשמירת הנתונים: ${error.message || "נסה שוב"}`);
    } finally {
      setIsSavingParams(false);
    }
  };

  // Parse Excel/CSV paste data
  const parsePastedData = (
    pastedText: string,
  ): Array<{
    plan_number?: string;
    plan_name?: string;
    publication_date?: string;
    status?: string;
  }> => {
    const lines = pastedText.trim().split("\n");
    const parsed: Array<{
      plan_number?: string;
      plan_name?: string;
      publication_date?: string;
      status?: string;
    }> = [];

    for (const line of lines) {
      // Try tab-separated first (Excel default), then comma-separated
      const cells = line.includes("\t")
        ? line.split("\t")
        : line.split(",").map((c) => c.trim());

      if (cells.length >= 2) {
        const plan: {
          plan_number?: string;
          plan_name?: string;
          publication_date?: string;
          status?: string;
        } = {
          plan_number: cells[0]?.trim() || "",
          plan_name: cells[1]?.trim() || "",
          publication_date: cells[2]?.trim() || "",
          status: cells[3]?.trim() || "בתוקף",
        };

        // Try to parse date if it's in a different format
        if (
          plan.publication_date &&
          !plan.publication_date.match(/^\d{4}-\d{2}-\d{2}$/)
        ) {
          // Try to convert DD/MM/YYYY or DD.MM.YYYY to YYYY-MM-DD
          const dateMatch = plan.publication_date.match(
            /(\d{1,2})[\/\.](\d{1,2})[\/\.](\d{4})/,
          );
          if (dateMatch) {
            const [, day, month, year] = dateMatch;
            plan.publication_date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
          }
        }

        parsed.push(plan);
      }
    }

    return parsed;
  };

  const handlePasteFromExcel = () => {
    const pasteArea = document.createElement("textarea");
    pasteArea.style.position = "fixed";
    pasteArea.style.opacity = "0";
    pasteArea.style.left = "-9999px";
    document.body.appendChild(pasteArea);
    pasteArea.focus();

    setTimeout(() => {
      const pastedText = pasteArea.value;
      document.body.removeChild(pasteArea);

      if (pastedText) {
        const parsed = parsePastedData(pastedText);
        if (parsed.length > 0) {
          setPlanningPlans([...planningPlans, ...parsed]);
          alert(`✅ הודבקו ${parsed.length} שורות בהצלחה`);
        } else {
          alert(
            "⚠️ לא ניתן לפרס את הנתונים. אנא ודא שהפורמט הוא: מספר תכנית | שם תכנית | תאריך פרסום | סטטוס",
          );
        }
      }
    }, 100);
  };

  const handleTablePaste = (e: React.ClipboardEvent<HTMLTableElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    if (pastedText) {
      const parsed = parsePastedData(pastedText);
      if (parsed.length > 0) {
        setPlanningPlans([...planningPlans, ...parsed]);
      }
    }
  };

  return (
    <>
      {/* 3.1 Planning Plans Table */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 text-right">
            3.1 ריכוז תכניות בניין עיר רלוונטיות
          </h3>
          <div className="flex gap-2">
            <button
              onClick={handlePasteFromExcel}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm flex items-center gap-2"
              title="הדבק נתונים מטבלת אקסל (Ctrl+V)"
            >
              <Table className="w-4 h-4" />
              הדבק מטבלת אקסל
            </button>
            <button
              onClick={() => {
                setPlanningPlans([
                  ...planningPlans,
                  {
                    plan_number: "",
                    plan_name: "",
                    publication_date: "",
                    status: "בתוקף",
                  },
                ]);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              + הוסף תכנית
            </button>
          </div>
        </div>
        {planningPlans.length < 4 && (
          <p className="text-red-600 font-semibold mb-4 text-right">
            ⚠️ נדרש מילוי מינימום 4 תוכניות לפני ייצוא הדוח
          </p>
        )}
        <p className="text-sm text-gray-600 mb-4 text-right">
          💡 טיפ: ניתן להדבק נתונים מטבלת אקסל ישירות בטבלה (Ctrl+V) או להשתמש
          בכפתור "הדבק מטבלת אקסל".
          <br />
          הפורמט הנדרש: מספר תכנית | שם תכנית | תאריך פרסום (DD/MM/YYYY) | סטטוס
        </p>
        <div className="overflow-x-auto">
          <table
            className="w-full border-collapse border border-gray-300"
            onPaste={handleTablePaste}
          >
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-900">
                  מספר תכנית
                </th>
                <th className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-900">
                  שם תכנית
                </th>
                <th className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-900">
                  תאריך פרסום
                </th>
                <th className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-900">
                  סטטוס
                </th>
                <th className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-900">
                  פעולות
                </th>
              </tr>
            </thead>
            <tbody>
              {planningPlans.map((plan, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="text"
                      value={plan.plan_number || ""}
                      onChange={(e) => {
                        const updated = [...planningPlans];
                        updated[index] = {
                          ...updated[index],
                          plan_number: e.target.value,
                        };
                        setPlanningPlans(updated);
                      }}
                      className="w-full px-2 py-1 border rounded text-right"
                      placeholder="מספר תכנית"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="text"
                      value={plan.plan_name || ""}
                      onChange={(e) => {
                        const updated = [...planningPlans];
                        updated[index] = {
                          ...updated[index],
                          plan_name: e.target.value,
                        };
                        setPlanningPlans(updated);
                      }}
                      className="w-full px-2 py-1 border rounded text-right"
                      placeholder="שם תכנית"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="date"
                      value={plan.publication_date || ""}
                      onChange={(e) => {
                        const updated = [...planningPlans];
                        updated[index] = {
                          ...updated[index],
                          publication_date: e.target.value,
                        };
                        setPlanningPlans(updated);
                      }}
                      className="w-full px-2 py-1 border rounded text-right"
                      placeholder="תאריך פרסום"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="text"
                      value={plan.status || "בתוקף"}
                      onChange={(e) => {
                        const updated = [...planningPlans];
                        updated[index] = {
                          ...updated[index],
                          status: e.target.value,
                        };
                        setPlanningPlans(updated);
                      }}
                      className="w-full px-2 py-1 border rounded text-right"
                      placeholder="בתוקף"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <button
                      onClick={() => {
                        setPlanningPlans(
                          planningPlans.filter((_, i) => i !== index),
                        );
                      }}
                      className="p-1 text-red-600 hover:text-red-800"
                      title="מחק"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {planningPlans.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="border border-gray-300 px-4 py-4 text-center text-gray-500"
                  >
                    אין תכניות. לחץ על "הוסף תכנית" כדי להוסיף או "הדבק מטבלת
                    אקסל" להדבקת נתונים.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={savePlanningData}
            disabled={isSavingParams}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isSavingParams ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                שומר...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                שמור תכניות
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3.3 Building Permits */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 text-right">
            3.3 רישוי בניה
          </h3>
          <button
            onClick={() => {
              setBuildingPermits([
                ...buildingPermits,
                { permit_number: "", permit_date: "", permit_description: "" },
              ]);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            + הוסף היתר בנייה
          </button>
        </div>
        <p className="text-gray-700 mb-4 text-right">
          מעיון בקובצי ההיתר המילוליים אותרו המסמכים הבאים:
        </p>
        <div className="space-y-4 mb-4">
          {buildingPermits.map((permit, index) => (
            <div key={index} className="border border-gray-300 rounded p-4">
              <div className="grid grid-cols-3 gap-4 mb-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                    מספר היתר
                  </label>
                  <input
                    type="text"
                    value={permit.permit_number || ""}
                    onChange={(e) => {
                      const updated = [...buildingPermits];
                      updated[index] = {
                        ...updated[index],
                        permit_number: e.target.value,
                      };
                      setBuildingPermits(updated);
                    }}
                    className="w-full px-2 py-1 border rounded text-right"
                    placeholder="מספר היתר"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                    תאריך היתר
                  </label>
                  <input
                    type="date"
                    value={permit.permit_date || ""}
                    onChange={(e) => {
                      const updated = [...buildingPermits];
                      updated[index] = {
                        ...updated[index],
                        permit_date: e.target.value,
                      };
                      setBuildingPermits(updated);
                    }}
                    className="w-full px-2 py-1 border rounded text-right"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setBuildingPermits(
                        buildingPermits.filter((_, i) => i !== index),
                      );
                    }}
                    className="p-1 text-red-600 hover:text-red-800"
                    title="מחק"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                  תיאור היתר
                </label>
                <textarea
                  value={permit.permit_description || ""}
                  onChange={(e) => {
                    const updated = [...buildingPermits];
                    updated[index] = {
                      ...updated[index],
                      permit_description: e.target.value,
                    };
                    setBuildingPermits(updated);
                  }}
                  className="w-full px-2 py-1 border rounded text-right"
                  rows={2}
                  placeholder="תיאור ההיתר"
                />
              </div>
            </div>
          ))}
          {buildingPermits.length === 0 && (
            <p className="text-gray-500 text-right">• לא אותרו היתרי בנייה.</p>
          )}
        </div>

        {/* Completion Certificate */}
        <div className="border border-gray-300 rounded p-4 mt-4">
          <h4 className="text-md font-semibold text-gray-900 mb-3 text-right">
            תעודת גמר
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                תאריך תעודת גמר
              </label>
              <input
                type="date"
                value={completionCert?.date || ""}
                onChange={(e) => {
                  setCompletionCert({
                    ...completionCert,
                    date: e.target.value,
                  });
                }}
                className="w-full px-2 py-1 border rounded text-right"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                כתובת
              </label>
              <input
                type="text"
                value={completionCert?.address || ""}
                onChange={(e) => {
                  setCompletionCert({
                    ...completionCert,
                    address: e.target.value,
                  });
                }}
                className="w-full px-2 py-1 border rounded text-right"
                placeholder="כתובת הבניין"
              />
            </div>
          </div>
          {completionCert &&
            (completionCert.date || completionCert.address) && (
              <button
                onClick={() => setCompletionCert(null)}
                className="mt-2 text-red-600 hover:text-red-800 text-sm"
              >
                מחק תעודת גמר
              </button>
            )}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={savePlanningData}
            disabled={isSavingParams}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isSavingParams ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                שומר...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                שמור שינויים
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
