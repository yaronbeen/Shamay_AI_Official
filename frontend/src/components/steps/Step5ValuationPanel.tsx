"use client";

import { useState, useEffect, useCallback } from "react";
import React from "react";
import { Calculator, Edit2, Save } from "lucide-react";
import { toast } from "sonner";
import { ValuationData } from "@/types/valuation";

interface Step5ValuationPanelProps {
  data: ValuationData;
  updateData?: (updates: Partial<ValuationData>) => void;
  sessionId?: string;
}

// Helper function to safely parse numeric values (handles strings from backend)
const parseNumeric = (value: any, fallback: number = 0): number => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  if (typeof value === "number") {
    return isNaN(value) || !isFinite(value) ? fallback : value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (
      trimmed === "" ||
      trimmed.toLowerCase() === "null" ||
      trimmed.toLowerCase() === "undefined"
    ) {
      return fallback;
    }
    const parsed = parseFloat(trimmed);
    return isNaN(parsed) || !isFinite(parsed) ? fallback : parsed;
  }
  return fallback;
};

// Format number with thousands separator
const formatNumber = (num: number): string => {
  return num.toLocaleString("he-IL");
};

export function Step5ValuationPanel({
  data,
  updateData,
  sessionId,
}: Step5ValuationPanelProps) {
  const [sessionData, setSessionData] = useState<ValuationData | null>(null);

  // Editable values for the calculation
  const [isEditing, setIsEditing] = useState(false);
  const [editMeasuredArea, setEditMeasuredArea] = useState<number>(0);
  const [editPricePerSqm, setEditPricePerSqm] = useState<number>(0);

  // Use prop sessionId or fall back to data.sessionId
  const effectiveSessionId = sessionId || data.sessionId;

  // Load latest data from session when component mounts
  useEffect(() => {
    const loadSessionData = async () => {
      if (!effectiveSessionId) return;

      try {
        const response = await fetch(`/api/session/${effectiveSessionId}`);
        if (response.ok) {
          const result = await response.json();
          if (result.data) {
            setSessionData(result.data as ValuationData);
            console.log("✅ Step5ValuationPanel: Loaded session data", {
              apartmentSqm: result.data.apartmentSqm,
              pricePerSqm: result.data.pricePerSqm,
              finalValuation: result.data.finalValuation,
            });
          }
        }
      } catch (error) {
        console.error(
          "❌ Step5ValuationPanel: Failed to load session data",
          error,
        );
      }
    };

    loadSessionData();
  }, [effectiveSessionId]);

  // Merge session data with props data - props data is more up-to-date for recent changes
  const displayData = {
    ...sessionData,
    ...data,
    // Prefer non-zero values from either source
    apartmentSqm: data.apartmentSqm || sessionData?.apartmentSqm,
    pricePerSqm: data.pricePerSqm || sessionData?.pricePerSqm,
    finalValuation: data.finalValuation || sessionData?.finalValuation,
  };

  // Get measured area from Garmushka (apartmentSqm) or fall back to area field
  const measuredArea = parseNumeric(
    displayData.apartmentSqm ||
      displayData.area ||
      displayData.registeredArea ||
      0,
  );

  // Get price per sqm from comparable analysis
  const pricePerSqm = parseNumeric(
    displayData.pricePerSqm ||
      (displayData.comparableDataAnalysis as any)?.averagePricePerSqm ||
      displayData.marketAnalysis?.averagePricePerSqm ||
      ((displayData.comparableDataAnalysis as any)?.section52 as any)
        ?.final_price_per_sqm ||
      0,
  );

  // Calculate final value: measured area × price per sqm
  const calculatedValue = isEditing
    ? editMeasuredArea * editPricePerSqm
    : measuredArea * pricePerSqm;

  // Use calculated value or existing final valuation
  const finalValue =
    calculatedValue > 0
      ? calculatedValue
      : parseNumeric(
          displayData.finalValuation ||
            (displayData.comparableDataAnalysis as any)?.estimatedValue ||
            ((displayData.comparableDataAnalysis as any)?.section52 as any)
              ?.asset_value_nis ||
            0,
        );

  // Initialize edit values when data loads
  useEffect(() => {
    setEditMeasuredArea(measuredArea);
    setEditPricePerSqm(pricePerSqm);
  }, [measuredArea, pricePerSqm]);

  const handleStartEdit = () => {
    setEditMeasuredArea(measuredArea);
    setEditPricePerSqm(pricePerSqm);
    setIsEditing(true);
  };

  // Auto-save on blur - saves current values without exiting edit mode
  const handleAutoSave = useCallback(async () => {
    const newFinalValue = editMeasuredArea * editPricePerSqm;

    // Update local state
    if (updateData) {
      updateData({
        apartmentSqm: editMeasuredArea,
        pricePerSqm: editPricePerSqm,
        finalValuation: newFinalValue,
      });
    }

    // Save to session
    if (effectiveSessionId) {
      try {
        await fetch(`/api/session/${effectiveSessionId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: {
              apartmentSqm: editMeasuredArea,
              pricePerSqm: editPricePerSqm,
              finalValuation: newFinalValue,
            },
          }),
        });
        console.log("✅ Auto-saved valuation to session");
      } catch (error) {
        console.error("Error auto-saving valuation:", error);
      }
    }
  }, [editMeasuredArea, editPricePerSqm, effectiveSessionId, updateData]);

  const handleSaveEdit = async () => {
    const newFinalValue = editMeasuredArea * editPricePerSqm;

    // Update local state
    if (updateData) {
      updateData({
        apartmentSqm: editMeasuredArea,
        pricePerSqm: editPricePerSqm,
        finalValuation: newFinalValue,
      });
    }

    // Save to session
    if (effectiveSessionId) {
      try {
        await fetch(`/api/session/${effectiveSessionId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: {
              apartmentSqm: editMeasuredArea,
              pricePerSqm: editPricePerSqm,
              finalValuation: newFinalValue,
            },
          }),
        });
        console.log("✅ Saved updated valuation to session");
        toast.success("הערכת השווי נשמרה בהצלחה");
      } catch (error) {
        console.error("Error saving valuation:", error);
        toast.error("שגיאה בשמירת הערכת השווי");
      }
    }

    setIsEditing(false);
  };

  // Check if we have all required data for calculation
  const hasCalculationData = measuredArea > 0 && pricePerSqm > 0;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 shadow-lg h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-blue-900 flex items-center gap-2">
          <Calculator className="w-6 h-6" />
          חישוב שווי הנכס
        </h3>
        {!isEditing ? (
          <button
            onClick={handleStartEdit}
            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
            title="ערוך נתונים"
          >
            <Edit2 className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={handleSaveEdit}
            className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            <Save className="w-4 h-4" />
            שמור
          </button>
        )}
      </div>

      {/* Calculation Formula Display */}
      <div className="space-y-4">
        {/* Measured Area */}
        <div className="bg-white rounded-lg p-4 border border-blue-200">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">שטח נמדד (מגרמושקה)</span>
            {!hasCalculationData && !displayData.apartmentSqm && (
              <span className="text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded">
                חסר - יש למדוד בשלב 4
              </span>
            )}
          </div>
          {isEditing ? (
            <div className="flex items-center gap-2 mt-1">
              <input
                type="number"
                value={editMeasuredArea}
                onChange={(e) =>
                  setEditMeasuredArea(parseFloat(e.target.value) || 0)
                }
                onBlur={handleAutoSave}
                className="text-2xl font-bold text-blue-900 w-32 border-b-2 border-blue-300 focus:border-blue-500 outline-none bg-transparent"
              />
              <span className="text-lg text-gray-600">מ"ר</span>
            </div>
          ) : (
            <p className="text-2xl font-bold text-blue-900 mt-1">
              {measuredArea > 0 ? `${formatNumber(measuredArea)} מ"ר` : "---"}
            </p>
          )}
        </div>

        {/* Multiplication Sign */}
        <div className="text-center text-3xl text-gray-400 font-light">×</div>

        {/* Price Per Sqm */}
        <div className="bg-white rounded-lg p-4 border border-blue-200">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">
              מחיר למ"ר (מניתוח השוואתי)
            </span>
            {!hasCalculationData && !displayData.pricePerSqm && (
              <span className="text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded">
                חסר - יש להזין בשלב 4
              </span>
            )}
          </div>
          {isEditing ? (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-lg text-gray-600">₪</span>
              <input
                type="number"
                value={editPricePerSqm}
                onChange={(e) =>
                  setEditPricePerSqm(parseFloat(e.target.value) || 0)
                }
                onBlur={handleAutoSave}
                className="text-2xl font-bold text-blue-900 w-32 border-b-2 border-blue-300 focus:border-blue-500 outline-none bg-transparent"
              />
            </div>
          ) : (
            <p className="text-2xl font-bold text-blue-900 mt-1">
              {pricePerSqm > 0 ? `₪${formatNumber(pricePerSqm)}` : "---"}
            </p>
          )}
        </div>

        {/* Equals Sign */}
        <div className="text-center text-3xl text-gray-400 font-light">=</div>

        {/* Final Value */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-5 text-white">
          <span className="text-sm opacity-90 block mb-1">שווי הנכס הסופי</span>
          <p className="text-4xl font-bold">
            {finalValue > 0
              ? `₪${formatNumber(Math.round(finalValue))}`
              : "---"}
          </p>
          {finalValue > 0 && (
            <p className="text-sm opacity-75 mt-2">
              {formatNumber(isEditing ? editMeasuredArea : measuredArea)} מ"ר ×
              ₪{formatNumber(isEditing ? editPricePerSqm : pricePerSqm)} = ₪
              {formatNumber(Math.round(finalValue))}
            </p>
          )}
        </div>
      </div>

      {/* Additional Info */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-3 border border-blue-200">
          <p className="text-xs text-gray-500 mb-1">חדרים</p>
          <p className="text-lg font-semibold text-gray-900">
            {displayData.rooms || "---"}
          </p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-blue-200">
          <p className="text-xs text-gray-500 mb-1">תאריך הערכה</p>
          <p className="text-base font-semibold text-gray-900">
            {displayData.valuationDate ||
              new Date().toLocaleDateString("he-IL")}
          </p>
        </div>
      </div>

      {/* Warning if missing data */}
      {!hasCalculationData && (
        <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-sm text-orange-800">
            ⚠️ חסרים נתונים לחישוב. יש לוודא שבוצעו מדידות בשלב 4 והוזנו נתוני
            השוואה.
          </p>
        </div>
      )}
    </div>
  );
}
