"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle,
  XCircle,
  FileText,
  Building,
  Edit3,
  Save,
  Info,
  Loader2,
} from "lucide-react";
import { ValuationData } from "@/types/valuation";
import type { ProcessingStatus } from "../../lib/session-store-global";

interface Step3FieldsPanelProps {
  data: ValuationData;
  extractedData: Record<string, any>;
  onFieldSave: (field: string, value: string) => void;
  provenanceData: Record<string, any>;
  updateData?: (
    updates: Partial<ValuationData>,
    options?: { skipAutoSave?: boolean },
  ) => void;
  sessionId?: string;
}

// Editable Field Component
function EditableField({
  field,
  label,
  value,
  editingField,
  tempValue,
  onEdit,
  onSave,
  onCancel,
  onValueChange,
  dataSource,
  provenanceInfo,
  type = "text",
  options,
}: {
  field: string;
  label: string;
  value: string | number | undefined;
  editingField: string | null;
  tempValue: string;
  onEdit: (field: string, value: string) => void;
  onSave: (field: string) => void;
  onCancel: () => void;
  onValueChange: (value: string) => void;
  dataSource: string;
  provenanceInfo?: {
    documentName?: string;
    pageNumber?: number;
    confidence?: number;
    extractionMethod?: string;
  } | null;
  type?: "text" | "textarea" | "select";
  options?: string[];
}) {
  const displayValue = value || "לא נמצא";
  const isEditing = editingField === field;
  const [showTooltip, setShowTooltip] = useState(false);

  const tooltipContent = provenanceInfo ? (
    <div className="text-sm space-y-1">
      {provenanceInfo.documentName && (
        <p>
          <strong>מסמך:</strong> {provenanceInfo.documentName}
        </p>
      )}
      {provenanceInfo.pageNumber && (
        <p>
          <strong>עמוד:</strong> {provenanceInfo.pageNumber}
        </p>
      )}
      {provenanceInfo.confidence !== undefined && (
        <p>
          <strong>רמת ביטחון:</strong>{" "}
          {Math.round(provenanceInfo.confidence * 100)}%
        </p>
      )}
      {provenanceInfo.extractionMethod && (
        <p>
          <strong>שיטת חילוץ:</strong>{" "}
          {provenanceInfo.extractionMethod === "manual" ? "ידני" : "AI"}
        </p>
      )}
    </div>
  ) : null;

  return (
    <div className="p-3 rounded-lg bg-gray-50">
      <label className="block text-sm font-medium text-gray-700 mb-2 text-right flex items-center gap-2">
        <span className="flex-1">{label}</span>
        {provenanceInfo && (
          <span className="relative inline-block">
            <button
              type="button"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="text-blue-500 hover:text-blue-700 transition-colors cursor-help"
              title="מידע מקור"
            >
              <Info className="w-4 h-4" />
            </button>
            {showTooltip && (
              <div className="absolute right-0 bottom-full mb-2 w-64 bg-gray-900 text-white p-3 rounded-lg shadow-lg z-50 text-right">
                <div className="text-xs mb-1 font-semibold border-b border-gray-700 pb-1">
                  מידע מקור
                </div>
                {tooltipContent}
                <div className="absolute bottom-0 right-4 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
            )}
          </span>
        )}
      </label>

      <div className="flex items-center gap-2">
        {isEditing ? (
          <div className="flex-1 flex items-center gap-2">
            {type === "textarea" ? (
              <textarea
                value={tempValue}
                onChange={(e) => onValueChange(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-right min-h-[60px] text-sm"
                dir="rtl"
              />
            ) : type === "select" && options ? (
              <select
                value={tempValue}
                onChange={(e) => onValueChange(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-right text-sm"
                dir="rtl"
              >
                {options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={type}
                value={tempValue}
                onChange={(e) => onValueChange(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-right text-sm"
                dir="rtl"
              />
            )}
            <button
              onClick={() => onSave(field)}
              className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors"
              title="שמור"
            >
              <Save className="w-4 h-4" />
            </button>
            <button
              onClick={onCancel}
              className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
              title="בטל"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <span className="flex-1 text-right text-sm text-gray-900">
              {String(displayValue)}
            </span>
            <button
              onClick={() => onEdit(field, String(value || ""))}
              className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
              title="ערוך"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-1">{dataSource}</p>
    </div>
  );
}

export function Step3FieldsPanel({
  data,
  extractedData,
  onFieldSave,
  provenanceData,
  updateData,
  sessionId,
}: Step3FieldsPanelProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>("");
  const [processingStatus, setProcessingStatus] =
    useState<ProcessingStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Poll for background processing status
  // Note: extractedData removed from deps to prevent multiple intervals
  useEffect(() => {
    if (!sessionId) return;

    let pollInterval: NodeJS.Timeout | null = null;
    let isMounted = true;

    const checkProcessingStatus = async (): Promise<boolean> => {
      if (!isMounted) return false;
      try {
        const response = await fetch(
          `/api/session/${sessionId}/processing-status`,
        );
        if (response.ok && isMounted) {
          const {
            processingStatus: status,
            allComplete,
            extractedData: newData,
          } = await response.json();
          setProcessingStatus(status);

          // If we have new extracted data, update the parent
          if (newData && Object.keys(newData).length > 0 && updateData) {
            console.log(
              "📦 Step3: Received new extracted data from background processing",
            );
            // Merge new data with existing extractedData
            updateData({ extractedData: { ...extractedData, ...newData } });
          }

          // Determine if we need to continue polling
          const hasProcessing =
            status && Object.values(status).some((s) => s === "processing");
          setIsPolling(!!hasProcessing);

          return !allComplete && !!hasProcessing;
        }
      } catch (error) {
        console.error("❌ Error checking processing status:", error);
      }
      return false;
    };

    // Initial check
    checkProcessingStatus().then((shouldContinue) => {
      if (shouldContinue && isMounted) {
        setIsPolling(true);
        // Only start polling if not already running
        if (!pollInterval) {
          pollInterval = setInterval(async () => {
            const shouldContinue = await checkProcessingStatus();
            if (!shouldContinue && pollInterval) {
              clearInterval(pollInterval);
              pollInterval = null;
              setIsPolling(false);
            }
          }, 3000);
        }
      }
    });

    return () => {
      isMounted = false;
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };
  }, [sessionId, updateData]); // Removed extractedData to prevent infinite loop

  const handleFieldEdit = (field: string, currentValue: string) => {
    setEditingField(field);
    setTempValue(currentValue);
  };

  const handleFieldSave = (field: string) => {
    onFieldSave(field, tempValue);
    setEditingField(null);
    setTempValue("");
  };

  const handleFieldCancel = () => {
    setEditingField(null);
    setTempValue("");
  };

  const getDataSource = (field: string): string => {
    const sourceMap: Record<string, string> = {
      registrationOffice: "נשלף מתוך תעודת בעלות (עמוד 1)",
      gush: "נשלף מתוך תעודת בעלות (עמוד 1)",
      parcel: "נשלף מתוך תעודת בעלות (עמוד 1)",
      chelka: "נשלף מתוך תעודת בעלות (עמוד 1)",
      parcelArea: "נשלף מתוך תעודת בעלות",
      fullAddress: "נשלף מנתוני המשתמש",
      bylaws: "נשלף מתוך תעודת בעלות",
      subParcel: "נשלף מתוך תעודת בעלות",
      unitDescription: "נשלף מתוך תעודת בעלות",
      registeredArea: "נשלף מתוך תעודת בעלות",
      commonParts: "נשלף מתוך תעודת בעלות",
      ownershipType: "נשלף מתוך תעודת בעלות (עמוד 2)",
      attachments: "נשלף מתוך תעודת בעלות (עמוד 3)",
      owners: "נשלף מתוך תעודת בעלות",
      notes: "נשלף מתוך תעודת בעלות",
      sharedAreas: "נשלף מתוך צו בית משותף (סעיף 2)",
      constructionYear: "נשלף מתוך היתר בנייה",
      buildingYear: "נשלף מתוך היתר בנייה",
      buildingFloors: "נשלף מתוך צו בית משותף",
      buildingUnits: "נשלף מתוך צו בית משותף",
      numberOfBuildings: "נשלף מתוך צו בית משותף",
      parcelShape: "נשלף מתוך תעודת בעלות",
      parcelSurface: "נשלף מתוך תעודת בעלות",
      plotBoundaryNorth: "נשלף מניתוח GIS",
      plotBoundarySouth: "נשלף מניתוח GIS",
      plotBoundaryEast: "נשלף מניתוח GIS",
      plotBoundaryWest: "נשלף מניתוח GIS",
      floor: "נשלף מתוך צו בית משותף",
      builtArea: "נשלף מתוך היתר בנייה (עמוד 2)",
      balconyArea: "נשלף מתוך תעודת בעלות",
      buildingDescription: "נשלף מתוך צו בית משותף (סעיף 1)",
      permittedUse: "נשלף מתוך מידע תכנוני",
      airDirections: "נשלף מנתוני המשתמש",
      propertyEssence: "נשלף מנתוני המשתמש",
      propertyCondition: "נקבע מתמונות הנכס",
      finishLevel: "נקבע מתמונות הנכס",
      finishDetails: "נקבע מתמונות הנכס",
      propertyLayoutDescription: "נשלף מניתוח תמונות פנים",
      conditionAssessment: "נשלף מניתוח תמונות פנים",
      finishStandard: "נשלף מניתוח תמונות פנים",
      buildingCondition: "נשלף מניתוח תמונות חוץ",
      buildingFeatures: "נשלף מניתוח תמונות חוץ",
      buildingType: "נשלף מניתוח תמונות חוץ",
      overallAssessment: "נשלף מניתוח תמונות חוץ",
      environmentDescription: "נשלף מניתוח תמונות חוץ",
    };
    return sourceMap[field] || "נשלף מהמסמכים";
  };

  const getProvenanceForField = (fieldName: string) => {
    if (provenanceData[fieldName]) return provenanceData[fieldName];
    const snakeCase = fieldName.replace(/([A-Z])/g, "_$1").toLowerCase();
    if (provenanceData[snakeCase]) return provenanceData[snakeCase];
    return null;
  };

  // Helper to get nested values
  const getNestedValue = React.useCallback((obj: any, path: string): any => {
    const keys = path.split(".");
    let value = obj;
    for (const key of keys) {
      if (value && typeof value === "object") {
        value = value[key];
      } else {
        return undefined;
      }
    }
    return value;
  }, []);

  // Helper to get value from multiple possible paths
  const getValueFromPaths = React.useCallback(
    (paths: string[], extracted: any, data: any): any => {
      for (const path of paths) {
        const value =
          getNestedValue(extracted, path) || getNestedValue(data, path);
        if (value !== undefined && value !== null && value !== "") {
          return value;
        }
      }
      return undefined;
    },
    [getNestedValue],
  );

  const hasExtractedData = Object.keys(extractedData).length > 0;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="border-b pb-4">
        <h2 className="text-xl font-bold text-gray-900">נתונים שחולצו</h2>
        <p className="text-sm text-gray-600 mt-1">
          ניתן לערוך ידנית או לבחור טקסט מהמסמך (קליק ימני)
        </p>
      </div>

      {/* Background Processing Status Banner */}
      {isPolling && processingStatus && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />
            <div className="flex-1">
              <p className="text-blue-700 text-sm font-medium">
                מעבד מסמכים ברקע...
              </p>
              <div className="flex gap-2 mt-1 text-xs">
                {(["tabu", "condo", "permit"] as const).map((docType) => {
                  const status = processingStatus[docType];
                  if (status === "pending") return null;
                  return (
                    <span
                      key={docType}
                      className={`px-2 py-0.5 rounded ${
                        status === "processing"
                          ? "bg-blue-100 text-blue-700"
                          : status === "completed"
                            ? "bg-green-100 text-green-700"
                            : status === "error"
                              ? "bg-red-100 text-red-700"
                              : ""
                      }`}
                    >
                      {docType === "tabu"
                        ? "טאבו"
                        : docType === "condo"
                          ? "צו בית משותף"
                          : "היתר"}
                      {status === "completed" && " ✓"}
                      {status === "error" && " ✗"}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Status - Only show when NOT polling */}
      {hasExtractedData && !isPolling && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-green-700 text-sm">עיבוד הושלם בהצלחה</p>
            </div>
          </div>
        </div>
      )}

      {/* Extraction Summary */}
      {hasExtractedData && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-blue-600" />
              <h4 className="font-medium text-gray-900 text-sm">מצב משפטי</h4>
            </div>
            <div className="text-xs text-gray-600 space-y-0.5">
              <p>גוש: {extractedData.gush || "לא נמצא"}</p>
              <p>
                חלקה:{" "}
                {extractedData.chelka || extractedData.parcel || "לא נמצא"}
              </p>
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 border border-green-100">
            <div className="flex items-center gap-2 mb-1">
              <Building className="w-4 h-4 text-green-600" />
              <h4 className="font-medium text-gray-900 text-sm">פרטי בנייה</h4>
            </div>
            <div className="text-xs text-gray-600 space-y-0.5">
              <p>שנה: {extractedData.buildingYear || "לא נמצא"}</p>
              <p>
                שטח:{" "}
                {extractedData?.land_registry?.apartment_registered_area ||
                  extractedData.builtArea ||
                  "לא נמצא"}{" "}
                מ"ר
              </p>
            </div>
          </div>
        </div>
      )}

      {/* נסח טאבו Section */}
      {hasExtractedData && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            טבלת נסח טאבו
          </h3>
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
            השדות המפורטים לעיל הם שדות אפשריים מנסח טאבו. לא בכל נסח מופיעים כל
            השדות, והיעדר שדה אינו מהווה חוסר נתון אלא מצב רישומי תקין.
          </div>

          {/* זיהוי ורישום */}
          <h4 className="text-base font-semibold text-gray-800 mb-3 mt-4 border-b pb-2">
            זיהוי ורישום
          </h4>
          <div className="space-y-3">
            <EditableField
              field="gush"
              label="גוש"
              value={
                extractedData.gush ||
                extractedData.land_registry?.gush ||
                data.gush
              }
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource={getDataSource("gush")}
              provenanceInfo={getProvenanceForField("gush")}
            />
            <EditableField
              field="parcel"
              label="חלקה"
              value={
                extractedData.parcel ||
                extractedData.chelka ||
                extractedData.land_registry?.chelka ||
                extractedData.land_registry?.parcel ||
                data.parcel
              }
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource={getDataSource("parcel")}
              provenanceInfo={
                getProvenanceForField("parcel") ||
                getProvenanceForField("chelka")
              }
            />
            <EditableField
              field="subParcel"
              label="תת־חלקה"
              value={getValueFromPaths(
                [
                  "subParcel",
                  "sub_parcel",
                  "subparcel",
                  "land_registry.subParcel",
                  "land_registry.sub_parcel",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource={getDataSource("subParcel")}
              provenanceInfo={getProvenanceForField("subParcel")}
            />
            <EditableField
              field="fullAddress"
              label="כתובת"
              value={
                data.street && data.buildingNumber && data.city
                  ? `${data.street} ${data.buildingNumber}, ${data.neighborhood ? `שכונת ${data.neighborhood}, ` : ""}${data.city}`
                  : undefined
              }
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource={getDataSource("fullAddress")}
              provenanceInfo={getProvenanceForField("fullAddress")}
            />
            <EditableField
              field="registrationOffice"
              label="לשכת רישום מקרקעין"
              value={
                extractedData.registrationOffice ||
                extractedData.land_registry?.registration_office
              }
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource={getDataSource("registrationOffice")}
              provenanceInfo={getProvenanceForField("registrationOffice")}
            />
            <EditableField
              field="tabuExtractDate"
              label="תאריך הפקת נסח"
              value={getValueFromPaths(
                [
                  "tabuExtractDate",
                  "tabu_extract_date",
                  "land_registry.tabu_extract_date",
                  "issue_date",
                  "land_registry.issue_date",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך נסח טאבו"
              provenanceInfo={getProvenanceForField("tabuExtractDate")}
            />
          </div>

          {/* מבנה וחלוקה */}
          <h4 className="text-base font-semibold text-gray-800 mb-3 mt-6 border-b pb-2">
            מבנה וחלוקה
          </h4>
          <div className="space-y-3">
            <EditableField
              field="buildingsCount"
              label="מספר מבנים"
              value={getValueFromPaths(
                [
                  "buildingsCount",
                  "buildings_count",
                  "land_registry.buildings_count",
                  "numberOfBuildings",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך נסח טאבו"
              provenanceInfo={getProvenanceForField("buildingsCount")}
            />
            <EditableField
              field="wingsCount"
              label="מספר אגפים / כניסות"
              value={getValueFromPaths(
                [
                  "wingsCount",
                  "wings_count",
                  "land_registry.wings_count",
                  "entrances_count",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך נסח טאבו"
              provenanceInfo={getProvenanceForField("wingsCount")}
            />
            <EditableField
              field="buildingWingNumber"
              label="מספר מבנה / אגף של תת־החלקה"
              value={getValueFromPaths(
                [
                  "buildingWingNumber",
                  "building_wing_number",
                  "land_registry.building_wing_number",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך נסח טאבו"
              provenanceInfo={getProvenanceForField("buildingWingNumber")}
            />
            <EditableField
              field="subPlotsCount"
              label="מספר תתי־חלקות"
              value={getValueFromPaths(
                [
                  "subPlotsCount",
                  "sub_plots_count",
                  "land_registry.sub_plots_count",
                  "total_sub_plots",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך נסח טאבו"
              provenanceInfo={getProvenanceForField("subPlotsCount")}
            />
            <EditableField
              field="parcelArea"
              label="שטח קרקע כולל של החלקה"
              value={getValueFromPaths(
                [
                  "parcelArea",
                  "parcel_area",
                  "land_registry.parcelArea",
                  "land_registry.total_plot_area",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource={getDataSource("parcelArea")}
              provenanceInfo={getProvenanceForField("parcelArea")}
            />
          </div>

          {/* זכויות ובעלות */}
          <h4 className="text-base font-semibold text-gray-800 mb-3 mt-6 border-b pb-2">
            זכויות ובעלות
          </h4>
          <div className="space-y-3">
            <EditableField
              field="ownershipType"
              label="סוג הבעלות"
              value={
                extractedData.ownershipType ||
                extractedData.land_registry?.ownership_type ||
                "בעלות פרטית"
              }
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource={getDataSource("ownershipType")}
              provenanceInfo={getProvenanceForField("ownershipType")}
            />
            <EditableField
              field="rights"
              label="זכויות בנכס"
              value={getValueFromPaths(
                ["rights", "land_registry.rights"],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך נסח טאבו"
              provenanceInfo={getProvenanceForField("rights")}
            />
            <EditableField
              field="owners"
              label="בעלי זכויות"
              value={(() => {
                const owners = getValueFromPaths(
                  ["owners", "land_registry.owners"],
                  extractedData,
                  data,
                );
                if (Array.isArray(owners) && owners.length > 0) {
                  return owners
                    .map((o: any) => {
                      if (typeof o === "string") return o;
                      return `${o.name || ""}${o.idType ? `, ${o.idType}` : ""}${o.idNumber ? ` ${o.idNumber}` : ""}${o.share ? `, חלק ${o.share}` : ""}`;
                    })
                    .join("; ");
                }
                return owners;
              })()}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource={getDataSource("owners")}
              provenanceInfo={getProvenanceForField("owners")}
              type="textarea"
            />
            <EditableField
              field="commonParts"
              label="החלק ברכוש המשותף"
              value={getValueFromPaths(
                [
                  "commonParts",
                  "common_parts",
                  "land_registry.commonParts",
                  "land_registry.common_parts",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource={getDataSource("commonParts")}
              provenanceInfo={getProvenanceForField("commonParts")}
            />
          </div>

          {/* הצמדות */}
          <h4 className="text-base font-semibold text-gray-800 mb-3 mt-6 border-b pb-2">
            הצמדות
          </h4>
          <div className="space-y-3">
            <EditableField
              field="attachments"
              label="הצמדות (כולל תיאור, שטח, שיוך, סימון בתשריט)"
              value={
                typeof extractedData.attachments === "string"
                  ? extractedData.attachments
                  : Array.isArray(extractedData.attachments)
                    ? extractedData.attachments
                        .map((a: any) => {
                          const parts = [];
                          if (a.description || a.type)
                            parts.push(a.description || a.type);
                          if (a.area || a.size)
                            parts.push(`שטח: ${a.area || a.size} מ"ר`);
                          if (a.symbol) parts.push(`אות: ${a.symbol}`);
                          if (a.color) parts.push(`צבע: ${a.color}`);
                          return parts.join(", ");
                        })
                        .join("; ")
                    : extractedData.land_registry?.attachments ||
                      data.attachments ||
                      ""
              }
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource={getDataSource("attachments")}
              provenanceInfo={getProvenanceForField("attachments")}
              type="textarea"
            />
          </div>

          {/* נתוני יחידה כפי שמופיעים בנסח */}
          <h4 className="text-base font-semibold text-gray-800 mb-3 mt-6 border-b pb-2">
            נתוני יחידה כפי שמופיעים בנסח
          </h4>
          <div className="space-y-3">
            <EditableField
              field="floor"
              label="קומה"
              value={getValueFromPaths(
                ["floor", "land_registry.floor"],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך נסח טאבו"
              provenanceInfo={getProvenanceForField("floor")}
            />
            <EditableField
              field="registeredArea"
              label="שטח דירה רשום"
              value={getValueFromPaths(
                [
                  "registeredArea",
                  "registered_area",
                  "land_registry.registeredArea",
                  "land_registry.registered_area",
                  "apartment_registered_area",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource={getDataSource("registeredArea")}
              provenanceInfo={getProvenanceForField("registeredArea")}
            />
            <EditableField
              field="balconyArea"
              label="שטח מרפסת"
              value={getValueFromPaths(
                ["balconyArea", "balcony_area", "land_registry.balcony_area"],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך נסח טאבו"
              provenanceInfo={getProvenanceForField("balconyArea")}
            />
            <EditableField
              field="additionalAreas"
              label="שטחים נוספים"
              value={getValueFromPaths(
                [
                  "additionalAreas",
                  "additional_areas",
                  "land_registry.additional_areas",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך נסח טאבו"
              provenanceInfo={getProvenanceForField("additionalAreas")}
            />
            <EditableField
              field="unitDescription"
              label="תיאור הדירה"
              value={getValueFromPaths(
                [
                  "unitDescription",
                  "unit_description",
                  "land_registry.unitDescription",
                  "land_registry.unit_description",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource={getDataSource("unitDescription")}
              provenanceInfo={getProvenanceForField("unitDescription")}
              type="textarea"
            />
          </div>

          {/* תקנון */}
          <h4 className="text-base font-semibold text-gray-800 mb-3 mt-6 border-b pb-2">
            תקנון
          </h4>
          <div className="space-y-3">
            <EditableField
              field="regulationType"
              label="סוג התקנון (מוסכם / לא מוסכם / מצוי וכו')"
              value={getValueFromPaths(
                [
                  "regulationType",
                  "regulation_type",
                  "land_registry.regulation_type",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך נסח טאבו"
              provenanceInfo={getProvenanceForField("regulationType")}
              type="select"
              options={["מוסכם", "לא מוסכם", "מצוי", "אחר"]}
            />
            <EditableField
              field="bylaws"
              label="תוכן התקנון"
              value={getValueFromPaths(
                [
                  "bylaws",
                  "bylaw",
                  "land_registry.bylaws",
                  "land_registry.bylaw",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource={getDataSource("bylaws")}
              provenanceInfo={getProvenanceForField("bylaws")}
              type="textarea"
            />
          </div>
        </div>
      )}

      {/* Placeholder for continuation - Remove duplicate old fields */}
      {false && hasExtractedData && (
        <div className="hidden">
          <EditableField
            field="owners_old"
            label="בעלים"
            value={(() => {
              const owners = getValueFromPaths(
                ["owners", "land_registry.owners"],
                extractedData,
                data,
              );
              if (Array.isArray(owners) && owners.length > 0) {
                return owners
                  .map((o: any) => {
                    if (typeof o === "string") return o;
                    return `${o.name || ""}${o.idType ? `, ${o.idType}` : ""}${o.idNumber ? ` ${o.idNumber}` : ""}${o.share ? `, חלק ${o.share}` : ""}`;
                  })
                  .join("; ");
              }
              return owners;
            })()}
            editingField={editingField}
            tempValue={tempValue}
            onEdit={handleFieldEdit}
            onSave={handleFieldSave}
            onCancel={handleFieldCancel}
            onValueChange={setTempValue}
            dataSource={getDataSource("owners")}
            provenanceInfo={getProvenanceForField("owners")}
            type="textarea"
          />
          <EditableField
            field="notes"
            label="הערות"
            value={getValueFromPaths(
              ["notes", "land_registry.notes", "land_registry.warnings"],
              extractedData,
              data,
            )}
            editingField={editingField}
            tempValue={tempValue}
            onEdit={handleFieldEdit}
            onSave={handleFieldSave}
            onCancel={handleFieldCancel}
            onValueChange={setTempValue}
            dataSource={getDataSource("notes")}
            provenanceInfo={getProvenanceForField("notes")}
            type="textarea"
          />
          <EditableField
            field="sharedAreas"
            label="שטחים משותפים"
            value={
              extractedData.sharedAreas ||
              extractedData.shared_building?.shared_areas ||
              extractedData.land_registry?.common_parts ||
              ""
            }
            editingField={editingField}
            tempValue={tempValue}
            onEdit={handleFieldEdit}
            onSave={handleFieldSave}
            onCancel={handleFieldCancel}
            onValueChange={setTempValue}
            dataSource={getDataSource("sharedAreas")}
            provenanceInfo={getProvenanceForField("sharedAreas")}
          />
          <EditableField
            field="wingsCount"
            label="מספר אגפים / כניסות"
            value={getValueFromPaths(
              [
                "wingsCount",
                "wings_count",
                "land_registry.wings_count",
                "entrances_count",
              ],
              extractedData,
              data,
            )}
            editingField={editingField}
            tempValue={tempValue}
            onEdit={handleFieldEdit}
            onSave={handleFieldSave}
            onCancel={handleFieldCancel}
            onValueChange={setTempValue}
            dataSource="נשלף מתוך נסח טאבו"
            provenanceInfo={getProvenanceForField("wingsCount")}
          />
          <EditableField
            field="buildingWingNumber"
            label="מספר מבנה / אגף של תת־החלקה"
            value={getValueFromPaths(
              [
                "buildingWingNumber",
                "building_wing_number",
                "land_registry.building_wing_number",
              ],
              extractedData,
              data,
            )}
            editingField={editingField}
            tempValue={tempValue}
            onEdit={handleFieldEdit}
            onSave={handleFieldSave}
            onCancel={handleFieldCancel}
            onValueChange={setTempValue}
            dataSource="נשלף מתוך נסח טאבו"
            provenanceInfo={getProvenanceForField("buildingWingNumber")}
          />
        </div>
      )}

      {/* Notes - Plot Level Section */}
      {hasExtractedData && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
            השדות המפורטים לעיל הם שדות אפשריים מנסח טאבו. לא בכל נסח מופיעים כל
            השדות, והיעדר שדה אינו מהווה חוסר נתון אלא מצב רישומי תקין.
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-3">
            הערות רישומיות – לכלל החלקה
          </h3>
          <div className="space-y-3">
            <EditableField
              field="plotNotes"
              label="הערות לחלקה"
              value={getValueFromPaths(
                ["plotNotes", "plot_notes", "land_registry.plot_notes"],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך נסח טאבו"
              provenanceInfo={getProvenanceForField("plotNotes")}
              type="textarea"
            />
            <EditableField
              field="plotNotesActionType"
              label="מהות הפעולה"
              value={getValueFromPaths(
                [
                  "plotNotesActionType",
                  "plot_notes_action_type",
                  "land_registry.plot_notes_action_type",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך נסח טאבו"
              provenanceInfo={getProvenanceForField("plotNotesActionType")}
            />
            <EditableField
              field="plotNotesBeneficiary"
              label="שם המוטב"
              value={getValueFromPaths(
                [
                  "plotNotesBeneficiary",
                  "plot_notes_beneficiary",
                  "land_registry.plot_notes_beneficiary",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך נסח טאבו"
              provenanceInfo={getProvenanceForField("plotNotesBeneficiary")}
            />
          </div>
        </div>
      )}

      {/* Notes - Sub-chelka Level Section */}
      {hasExtractedData && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">
            הערות רישומיות – לתת־חלקה
          </h3>
          <div className="space-y-3">
            <EditableField
              field="subChelkaNotes"
              label="הערות לתת־חלקה"
              value={getValueFromPaths(
                [
                  "subChelkaNotes",
                  "sub_chelka_notes",
                  "land_registry.sub_chelka_notes",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך נסח טאבו"
              provenanceInfo={getProvenanceForField("subChelkaNotes")}
              type="textarea"
            />
            <EditableField
              field="subChelkaNotesActionType"
              label="מהות הפעולה"
              value={getValueFromPaths(
                [
                  "subChelkaNotesActionType",
                  "sub_chelka_notes_action_type",
                  "land_registry.sub_chelka_notes_action_type",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך נסח טאבו"
              provenanceInfo={getProvenanceForField("subChelkaNotesActionType")}
            />
            <EditableField
              field="subChelkaNotesBeneficiary"
              label="שם המוטב"
              value={getValueFromPaths(
                [
                  "subChelkaNotesBeneficiary",
                  "sub_chelka_notes_beneficiary",
                  "land_registry.sub_chelka_notes_beneficiary",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך נסח טאבו"
              provenanceInfo={getProvenanceForField(
                "subChelkaNotesBeneficiary",
              )}
            />
          </div>
        </div>
      )}

      {/* Easements - Plot Level Section */}
      {hasExtractedData && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">
            זיקות הנאה – לכלל החלקה
          </h3>
          <div className="space-y-3">
            <EditableField
              field="plotEasementsEssence"
              label="מהות"
              value={getValueFromPaths(
                [
                  "plotEasementsEssence",
                  "plot_easements_essence",
                  "land_registry.plot_easements_essence",
                  "easements_essence",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך נסח טאבו"
              provenanceInfo={getProvenanceForField("plotEasementsEssence")}
            />
            <EditableField
              field="plotEasementsDescription"
              label="תיאור"
              value={getValueFromPaths(
                [
                  "plotEasementsDescription",
                  "plot_easements_description",
                  "land_registry.plot_easements_description",
                  "easements_description",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך נסח טאבו"
              provenanceInfo={getProvenanceForField("plotEasementsDescription")}
              type="textarea"
            />
          </div>
        </div>
      )}

      {/* Easements - Sub-chelka Level Section */}
      {hasExtractedData && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">
            זיקות הנאה – לתת־חלקה
          </h3>
          <div className="space-y-3">
            <EditableField
              field="subChelkaEasementsEssence"
              label="מהות"
              value={getValueFromPaths(
                [
                  "subChelkaEasementsEssence",
                  "sub_chelka_easements_essence",
                  "land_registry.sub_chelka_easements_essence",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך נסח טאבו"
              provenanceInfo={getProvenanceForField(
                "subChelkaEasementsEssence",
              )}
            />
            <EditableField
              field="subChelkaEasementsDescription"
              label="תיאור"
              value={getValueFromPaths(
                [
                  "subChelkaEasementsDescription",
                  "sub_chelka_easements_description",
                  "land_registry.sub_chelka_easements_description",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך נסח טאבו"
              provenanceInfo={getProvenanceForField(
                "subChelkaEasementsDescription",
              )}
              type="textarea"
            />
          </div>
        </div>
      )}

      {/* Mortgages Section */}
      {hasExtractedData && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">
            משכנתאות
          </h3>
          <div className="space-y-3">
            <EditableField
              field="mortgageEssence"
              label="מהות"
              value={getValueFromPaths(
                [
                  "mortgageEssence",
                  "mortgage_essence",
                  "land_registry.mortgage_essence",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך נסח טאבו"
              provenanceInfo={getProvenanceForField("mortgageEssence")}
            />
            <EditableField
              field="mortgageAmount"
              label="סכום"
              value={getValueFromPaths(
                [
                  "mortgageAmount",
                  "mortgage_amount",
                  "land_registry.mortgage_amount",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך נסח טאבו"
              provenanceInfo={getProvenanceForField("mortgageAmount")}
            />
            <EditableField
              field="mortgageRank"
              label="דרגה"
              value={getValueFromPaths(
                [
                  "mortgageRank",
                  "mortgage_rank",
                  "land_registry.mortgage_rank",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך נסח טאבו"
              provenanceInfo={getProvenanceForField("mortgageRank")}
            />
            <EditableField
              field="mortgagePropertyShare"
              label="חלק בנכס"
              value={getValueFromPaths(
                [
                  "mortgagePropertyShare",
                  "mortgage_property_share",
                  "land_registry.mortgage_property_share",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך נסח טאבו"
              provenanceInfo={getProvenanceForField("mortgagePropertyShare")}
            />
            <EditableField
              field="mortgageLenders"
              label="בעלי המשכנתא"
              value={getValueFromPaths(
                [
                  "mortgageLenders",
                  "mortgage_lenders",
                  "land_registry.mortgage_lenders",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך נסח טאבו"
              provenanceInfo={getProvenanceForField("mortgageLenders")}
            />
            <EditableField
              field="mortgageBorrowers"
              label="לווים"
              value={getValueFromPaths(
                [
                  "mortgageBorrowers",
                  "mortgage_borrowers",
                  "land_registry.mortgage_borrowers",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך נסח טאבו"
              provenanceInfo={getProvenanceForField("mortgageBorrowers")}
            />
            <EditableField
              field="mortgageDate"
              label="תאריך"
              value={getValueFromPaths(
                [
                  "mortgageDate",
                  "mortgage_date",
                  "land_registry.mortgage_date",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך נסח טאבו"
              provenanceInfo={getProvenanceForField("mortgageDate")}
            />
          </div>
        </div>
      )}

      {/* Shared Building Order Section (צו בית משותף) */}
      {hasExtractedData && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-bold text-gray-900 mb-2">צו בית משותף</h3>
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
            השדות המפורטים לעיל הם שדות אפשריים מצו בית משותף. לא בכל צו מופיעים
            כל השדות, והיעדר שדה אינו מהווה חוסר נתון.
          </div>

          {/* זיהוי ומסמך */}
          <h4 className="text-base font-semibold text-gray-800 mb-3 mt-4 border-b pb-2">
            זיהוי ומסמך
          </h4>
          <div className="space-y-3">
            <EditableField
              field="sharedBuildingOrderDate"
              label="תאריך הפקת צו בית משותף"
              value={getValueFromPaths(
                [
                  "sharedBuildingOrderDate",
                  "shared_building_order_date",
                  "shared_building.order_date",
                  "land_registry.shared_building_order_date",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך צו בית משותף"
              provenanceInfo={getProvenanceForField("sharedBuildingOrderDate")}
            />
          </div>

          {/* תיאור הבניין */}
          <h4 className="text-base font-semibold text-gray-800 mb-3 mt-6 border-b pb-2">
            תיאור הבניין
          </h4>
          <div className="space-y-3">
            <EditableField
              field="buildingAddressFromOrder"
              label="כתובת הבניין"
              value={getValueFromPaths(
                [
                  "buildingAddressFromOrder",
                  "building_address",
                  "shared_building.address",
                  "land_registry.building_address",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך צו בית משותף"
              provenanceInfo={getProvenanceForField("buildingAddressFromOrder")}
            />
            <EditableField
              field="buildingNumberFromOrder"
              label="מספר מבנה"
              value={getValueFromPaths(
                [
                  "buildingNumberFromOrder",
                  "building_number",
                  "shared_building.building_number",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך צו בית משותף"
              provenanceInfo={getProvenanceForField("buildingNumberFromOrder")}
            />
            <EditableField
              field="floorsCountInBuilding"
              label="מספר קומות בבניין"
              value={getValueFromPaths(
                [
                  "floorsCountInBuilding",
                  "floors_count_in_building",
                  "shared_building.floors_count",
                  "buildingFloors",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך צו בית משותף"
              provenanceInfo={getProvenanceForField("floorsCountInBuilding")}
            />
            <EditableField
              field="subPlotsTotalInBuilding"
              label="מספר תתי־חלקות כולל בבניין"
              value={getValueFromPaths(
                [
                  "subPlotsTotalInBuilding",
                  "sub_plots_total_in_building",
                  "shared_building.total_sub_plots",
                  "buildingUnits",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך צו בית משותף"
              provenanceInfo={getProvenanceForField("subPlotsTotalInBuilding")}
            />
          </div>

          {/* זיהוי תת־חלקה */}
          <h4 className="text-base font-semibold text-gray-800 mb-3 mt-6 border-b pb-2">
            זיהוי תת־חלקה
          </h4>
          <div className="space-y-3">
            <EditableField
              field="subPlotNumber"
              label="מספר תת־חלקה"
              value={getValueFromPaths(
                [
                  "subPlotNumber",
                  "sub_plot_number",
                  "shared_building.sub_plot_number",
                  "subParcel",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך צו בית משותף"
              provenanceInfo={getProvenanceForField("subPlotNumber")}
            />
            <EditableField
              field="subPlotFloor"
              label="קומה של תת־החלקה"
              value={getValueFromPaths(
                [
                  "subPlotFloor",
                  "sub_plot_floor",
                  "shared_building.floor",
                  "floor",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך צו בית משותף"
              provenanceInfo={getProvenanceForField("subPlotFloor")}
            />
            <EditableField
              field="subPlotArea"
              label="שטח תת־החלקה"
              value={getValueFromPaths(
                [
                  "subPlotArea",
                  "sub_plot_area",
                  "shared_building.area",
                  "registeredArea",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך צו בית משותף"
              provenanceInfo={getProvenanceForField("subPlotArea")}
            />
            <EditableField
              field="subPlotDescription"
              label="תיאור מילולי של תת־החלקה"
              value={getValueFromPaths(
                [
                  "subPlotDescription",
                  "sub_plot_description",
                  "shared_building.description",
                  "unitDescription",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך צו בית משותף"
              provenanceInfo={getProvenanceForField("subPlotDescription")}
              type="textarea"
            />
          </div>

          {/* רכוש משותף */}
          <h4 className="text-base font-semibold text-gray-800 mb-3 mt-6 border-b pb-2">
            רכוש משותף
          </h4>
          <div className="space-y-3">
            <EditableField
              field="sharedPropertyParts"
              label="חלקים ברכוש המשותף המיוחסים לתת־החלקה"
              value={getValueFromPaths(
                [
                  "sharedPropertyParts",
                  "shared_property_parts",
                  "shared_building.common_parts",
                  "commonParts",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך צו בית משותף"
              provenanceInfo={getProvenanceForField("sharedPropertyParts")}
            />
          </div>

          {/* הצמדות לתת־חלקה */}
          <h4 className="text-base font-semibold text-gray-800 mb-3 mt-6 border-b pb-2">
            הצמדות לתת־חלקה
          </h4>
          <div className="space-y-3">
            <EditableField
              field="subPlotAttachments"
              label="הצמדות (תיאור, שטח, סימון בתשריט, צבע)"
              value={(() => {
                const attachments = getValueFromPaths(
                  [
                    "subPlotAttachments",
                    "sub_plot_attachments",
                    "shared_building.attachments",
                    "attachments",
                  ],
                  extractedData,
                  data,
                );
                if (typeof attachments === "string") return attachments;
                if (Array.isArray(attachments) && attachments.length > 0) {
                  return attachments
                    .map((a: any) => {
                      const parts = [];
                      if (a.description || a.type)
                        parts.push(a.description || a.type);
                      if (a.area || a.size)
                        parts.push(`שטח: ${a.area || a.size} מ"ר`);
                      if (a.symbol) parts.push(`סימון: ${a.symbol}`);
                      if (a.color) parts.push(`צבע: ${a.color}`);
                      return parts.join(", ");
                    })
                    .join("; ");
                }
                return attachments;
              })()}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך צו בית משותף"
              provenanceInfo={getProvenanceForField("subPlotAttachments")}
              type="textarea"
            />
          </div>

          {/* שטחים נוספים */}
          <h4 className="text-base font-semibold text-gray-800 mb-3 mt-6 border-b pb-2">
            שטחים נוספים
          </h4>
          <div className="space-y-3">
            <EditableField
              field="nonAttachmentAreas"
              label="שטחים שאינם בהצמדות"
              value={getValueFromPaths(
                [
                  "nonAttachmentAreas",
                  "non_attachment_areas",
                  "shared_building.additional_areas",
                  "additionalAreas",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך צו בית משותף"
              provenanceInfo={getProvenanceForField("nonAttachmentAreas")}
              type="textarea"
            />
          </div>
        </div>
      )}

      {/* Building Permits Section (היתרי בנייה) */}
      {hasExtractedData && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            טבלת היתר בנייה
          </h3>
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
            היתר בנייה הוא אובייקט חוזר - יכולים להיות 0/1/N היתרים. אין הכרעה
            בין היתרים, כל היתר מוצג בנפרד.
          </div>
          <div className="space-y-4">
            {/* Show permits array if exists */}
            {(() => {
              const permits = getValueFromPaths(
                ["permits", "land_registry.permits", "building_permit.permits"],
                extractedData,
                data,
              );
              if (Array.isArray(permits) && permits.length > 0) {
                return permits.map((permit: any, index: number) => (
                  <div
                    key={index}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                  >
                    <h4 className="text-base font-semibold text-gray-800 mb-3 border-b pb-2">
                      היתר {index + 1}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            מספר היתר:
                          </span>
                          <span className="text-sm font-medium">
                            {permit.permit_number || "-"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            תאריך היתר:
                          </span>
                          <span className="text-sm font-medium">
                            {permit.permit_date || "-"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            תאריך הפקת היתר:
                          </span>
                          <span className="text-sm font-medium">
                            {permit.permit_issue_date || "-"}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            שם הוועדה המקומית:
                          </span>
                          <span className="text-sm font-medium">
                            {permit.local_committee_name || "-"}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-600 mb-1">
                            תיאור מותר:
                          </span>
                          <span className="text-sm font-medium bg-white p-2 rounded border">
                            {permit.permitted_description || "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ));
              }
              return (
                <p className="text-gray-500 text-sm text-center py-4">
                  לא נמצאו היתרי בנייה
                </p>
              );
            })()}
          </div>
        </div>
      )}

      {/* Parcel Description Section (Manual Fields) */}
      {hasExtractedData && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">
            תיאור החלקה
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            שדות אלו הם שדות ידניים למילוי על ידי השמאי
          </p>
          <div className="space-y-3">
            <EditableField
              field="parcelShape"
              label="צורת החלקה"
              value={getValueFromPaths(
                ["parcelShape", "parcel_shape"],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="הזנה ידנית"
              provenanceInfo={getProvenanceForField("parcelShape")}
            />
            <EditableField
              field="parcelTerrain"
              label="פני הקרקע"
              value={getValueFromPaths(
                ["parcelTerrain", "parcel_terrain", "parcelSurface"],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="הזנה ידנית"
              provenanceInfo={getProvenanceForField("parcelTerrain")}
            />
            <EditableField
              field="parcelBoundaryNorth"
              label="גבול צפון"
              value={getValueFromPaths(
                [
                  "parcelBoundaryNorth",
                  "parcel_boundary_north",
                  "plotBoundaryNorth",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="הזנה ידנית"
              provenanceInfo={getProvenanceForField("parcelBoundaryNorth")}
            />
            <EditableField
              field="parcelBoundarySouth"
              label="גבול דרום"
              value={getValueFromPaths(
                [
                  "parcelBoundarySouth",
                  "parcel_boundary_south",
                  "plotBoundarySouth",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="הזנה ידנית"
              provenanceInfo={getProvenanceForField("parcelBoundarySouth")}
            />
            <EditableField
              field="parcelBoundaryEast"
              label="גבול מזרח"
              value={getValueFromPaths(
                [
                  "parcelBoundaryEast",
                  "parcel_boundary_east",
                  "plotBoundaryEast",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="הזנה ידנית"
              provenanceInfo={getProvenanceForField("parcelBoundaryEast")}
            />
            <EditableField
              field="parcelBoundaryWest"
              label="גבול מערב"
              value={getValueFromPaths(
                [
                  "parcelBoundaryWest",
                  "parcel_boundary_west",
                  "plotBoundaryWest",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="הזנה ידנית"
              provenanceInfo={getProvenanceForField("parcelBoundaryWest")}
            />
          </div>
        </div>
      )}

      {/* Building Details Section */}
      {hasExtractedData && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">
            פרטי הבניין
          </h3>
          <div className="space-y-3">
            <EditableField
              field="constructionYear"
              label="שנת הקמה"
              value={getValueFromPaths(
                [
                  "constructionYear",
                  "construction_year",
                  "year_of_construction",
                  "buildingYear",
                  "building_year",
                  "shared_building.constructionYear",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource={getDataSource("constructionYear")}
              provenanceInfo={getProvenanceForField("constructionYear")}
            />
            <EditableField
              field="buildingYear"
              label="שנת בנייה"
              value={
                extractedData.buildingYear ||
                extractedData.building_permit?.building_year ||
                extractedData.exterior_analysis?.building_year ||
                extractedData.shared_building?.construction_year ||
                ""
              }
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource={getDataSource("buildingYear")}
              provenanceInfo={getProvenanceForField("buildingYear")}
            />
            <EditableField
              field="buildingFloors"
              label="מספר קומות"
              value={getValueFromPaths(
                [
                  "buildingFloors",
                  "building_floors",
                  "floors",
                  "shared_building.buildingFloors",
                  "shared_building.floors",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource={getDataSource("buildingFloors")}
              provenanceInfo={getProvenanceForField("buildingFloors")}
            />
            <EditableField
              field="buildingUnits"
              label="מספר יחידות"
              value={getValueFromPaths(
                [
                  "buildingUnits",
                  "building_units",
                  "units",
                  "shared_building.buildingUnits",
                  "shared_building.units",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource={getDataSource("buildingUnits")}
              provenanceInfo={getProvenanceForField("buildingUnits")}
            />
            <EditableField
              field="numberOfBuildings"
              label="מספר בניינים"
              value={getValueFromPaths(
                [
                  "numberOfBuildings",
                  "number_of_buildings",
                  "buildings_count",
                  "shared_building.numberOfBuildings",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource={getDataSource("numberOfBuildings")}
              provenanceInfo={getProvenanceForField("numberOfBuildings")}
            />
            <EditableField
              field="parcelShape"
              label="צורת החלקה"
              value={getValueFromPaths(
                ["parcelShape", "parcel_shape", "land_registry.parcelShape"],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource={getDataSource("parcelShape")}
              provenanceInfo={getProvenanceForField("parcelShape")}
            />
            <EditableField
              field="parcelSurface"
              label="פני הקרקע"
              value={getValueFromPaths(
                [
                  "parcelSurface",
                  "parcel_surface",
                  "land_registry.parcelSurface",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource={getDataSource("parcelSurface")}
              provenanceInfo={getProvenanceForField("parcelSurface")}
            />
            <EditableField
              field="plotBoundaryNorth"
              label="גבול צפון"
              value={getValueFromPaths(
                [
                  "plotBoundaryNorth",
                  "plot_boundary_north",
                  "boundary_north",
                  "gis_analysis.boundary_north",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource={getDataSource("plotBoundaryNorth")}
              provenanceInfo={getProvenanceForField("plotBoundaryNorth")}
            />
            <EditableField
              field="plotBoundarySouth"
              label="גבול דרום"
              value={getValueFromPaths(
                [
                  "plotBoundarySouth",
                  "plot_boundary_south",
                  "boundary_south",
                  "gis_analysis.boundary_south",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource={getDataSource("plotBoundarySouth")}
              provenanceInfo={getProvenanceForField("plotBoundarySouth")}
            />
            <EditableField
              field="plotBoundaryEast"
              label="גבול מזרח"
              value={getValueFromPaths(
                [
                  "plotBoundaryEast",
                  "plot_boundary_east",
                  "boundary_east",
                  "gis_analysis.boundary_east",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource={getDataSource("plotBoundaryEast")}
              provenanceInfo={getProvenanceForField("plotBoundaryEast")}
            />
            <EditableField
              field="plotBoundaryWest"
              label="גבול מערב"
              value={getValueFromPaths(
                [
                  "plotBoundaryWest",
                  "plot_boundary_west",
                  "boundary_west",
                  "gis_analysis.boundary_west",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource={getDataSource("plotBoundaryWest")}
              provenanceInfo={getProvenanceForField("plotBoundaryWest")}
            />
            <EditableField
              field="floor"
              label="קומה"
              value={extractedData.floor || data.floor || ""}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource={getDataSource("floor")}
              provenanceInfo={getProvenanceForField("floor")}
            />
            <EditableField
              field="builtArea"
              label="שטח בנוי (מ״ר)"
              value={
                extractedData.builtArea ||
                extractedData.land_registry?.built_area ||
                data.builtArea ||
                ""
              }
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource={getDataSource("builtArea")}
              provenanceInfo={getProvenanceForField("builtArea")}
            />
            <EditableField
              field="balconyArea"
              label="שטח מרפסת (מר״)"
              value={getValueFromPaths(
                ["balconyArea", "balcony_area", "land_registry.balconyArea"],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource={getDataSource("balconyArea")}
              provenanceInfo={getProvenanceForField("balconyArea")}
            />
            {/* Additional Areas Display */}
            {(() => {
              const additionalAreas = getValueFromPaths(
                [
                  "additionalAreas",
                  "additional_areas",
                  "land_registry.additional_areas",
                ],
                extractedData,
                data,
              );
              if (
                Array.isArray(additionalAreas) &&
                additionalAreas.length > 0
              ) {
                return (
                  <div className="p-3 rounded-lg bg-gray-50">
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                      שטחים נוספים
                    </label>
                    <div className="space-y-1">
                      {additionalAreas.map((area: any, index: number) => (
                        <div
                          key={index}
                          className="text-sm text-gray-900 text-right"
                        >
                          {area.type}: {area.area} מ״ר
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      נשלף מתוך נסח טאבו
                    </p>
                  </div>
                );
              }
              return null;
            })()}
            <EditableField
              field="buildingDescription"
              label="תיאור הבניין"
              value={
                extractedData.buildingDescription ||
                extractedData.building_permit?.building_description ||
                extractedData.shared_building?.building_description ||
                ""
              }
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource={getDataSource("buildingDescription")}
              provenanceInfo={getProvenanceForField("buildingDescription")}
              type="textarea"
            />
            <EditableField
              field="permittedUse"
              label="שימוש מותר"
              value={
                extractedData.permittedUse ||
                extractedData.building_permit?.permitted_usage ||
                extractedData.buildingRights ||
                ""
              }
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource={getDataSource("permittedUse")}
              provenanceInfo={getProvenanceForField("permittedUse")}
            />
          </div>
        </div>
      )}

      {/* Property Characteristics Section */}
      {hasExtractedData && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">
            מאפייני הנכס
          </h3>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-gray-50">
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                מספר חדרים
              </label>
              <div className="flex items-center gap-2">
                <span className="flex-1 text-right text-sm text-gray-900">
                  {data.rooms || "לא נמצא"}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">נשלף מנתוני המשתמש</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50">
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                קומה
              </label>
              <div className="flex items-center gap-2">
                <span className="flex-1 text-right text-sm text-gray-900">
                  {data.floor || "לא נמצא"}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">נשלף מנתוני המשתמש</p>
            </div>
            <EditableField
              field="propertyCondition"
              label="מצב הנכס"
              value={
                extractedData.propertyCondition ||
                extractedData.interior_analysis?.property_condition ||
                "מצוין"
              }
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource={getDataSource("propertyCondition")}
              provenanceInfo={getProvenanceForField("propertyCondition")}
              type="select"
              options={["מצוין", "טוב", "בינוני", "גרוע", "דורש שיפוץ"]}
            />
            <EditableField
              field="airDirections"
              label="כיווני אוויר"
              value={data.airDirections || ""}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource={getDataSource("airDirections")}
              provenanceInfo={getProvenanceForField("airDirections")}
            />
            <EditableField
              field="propertyEssence"
              label="מהות הנכס"
              value={
                data.propertyEssence ||
                (data.rooms
                  ? `דירת מגורים בת ${data.rooms} חדרים`
                  : "דירת מגורים")
              }
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource={getDataSource("propertyEssence")}
              provenanceInfo={getProvenanceForField("propertyEssence")}
            />
            <EditableField
              field="finishLevel"
              label="רמת גימור"
              value={
                extractedData.finishLevel ||
                extractedData.interior_analysis?.finish_level ||
                "בסיסי"
              }
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource={getDataSource("finishLevel")}
              provenanceInfo={getProvenanceForField("finishLevel")}
              type="select"
              options={["בסיסי", "בינוני", "גבוה", "יוקרתי", "לוקסוס"]}
            />
            <EditableField
              field="finishDetails"
              label="פרטי גימור"
              value={
                extractedData.finishDetails ||
                extractedData.finish_details ||
                ""
              }
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource={getDataSource("finishDetails")}
              provenanceInfo={getProvenanceForField("finishDetails")}
              type="textarea"
            />
          </div>
        </div>
      )}

      {/* Interior Analysis Section */}
      {hasExtractedData && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">
            ניתוח פנים הנכס
          </h3>
          <div className="space-y-3">
            <EditableField
              field="propertyLayoutDescription"
              label="תיאור תכנון הנכס"
              value={
                extractedData.propertyLayoutDescription ||
                extractedData.interior_analysis?.interior_features ||
                extractedData.internalLayout ||
                ""
              }
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מניתוח תמונות פנים"
              provenanceInfo={getProvenanceForField(
                "propertyLayoutDescription",
              )}
              type="textarea"
            />
            <EditableField
              field="conditionAssessment"
              label="הערכת מצב כללי"
              value={
                extractedData.conditionAssessment ||
                extractedData.interior_analysis?.condition_assessment ||
                ""
              }
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מניתוח תמונות פנים"
              provenanceInfo={getProvenanceForField("conditionAssessment")}
              type="textarea"
            />
            <EditableField
              field="finishStandard"
              label="סטנדרט גמר"
              value={
                extractedData.finishStandard ||
                extractedData.finish_standard ||
                ""
              }
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource={getDataSource("finishStandard")}
              provenanceInfo={getProvenanceForField("finishStandard")}
            />
            {/* Room Analysis */}
            {extractedData.roomAnalysis &&
              Array.isArray(extractedData.roomAnalysis) &&
              extractedData.roomAnalysis.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                    ניתוח חדרים
                  </label>
                  <div className="space-y-3">
                    {extractedData.roomAnalysis.map(
                      (room: any, index: number) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-gray-900">
                              {room.room_type || "חדר"}
                            </h4>
                            <span className="text-sm text-gray-600">
                              {room.condition || ""}
                            </span>
                          </div>
                          {room.features && (
                            <div className="text-sm text-gray-700 mb-1">
                              <strong>תכונות:</strong> {room.features}
                            </div>
                          )}
                          {room.size_estimate && (
                            <div className="text-sm text-gray-700">
                              <strong>הערכת גודל:</strong> {room.size_estimate}
                            </div>
                          )}
                        </div>
                      ),
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    נשלף מניתוח תמונות פנים
                  </p>
                </div>
              )}
          </div>
        </div>
      )}

      {/* Exterior Analysis Section */}
      {hasExtractedData && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">
            ניתוח חוץ הנכס
          </h3>
          <div className="space-y-3">
            <EditableField
              field="buildingCondition"
              label="מצב הבניין"
              value={
                extractedData.buildingCondition ||
                extractedData.exterior_analysis?.building_condition ||
                ""
              }
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מניתוח תמונות חוץ"
              provenanceInfo={getProvenanceForField("buildingCondition")}
              type="select"
              options={["מצוין", "טוב", "בינוני", "גרוע", "דורש שיפוץ"]}
            />
            <EditableField
              field="buildingType"
              label="סוג הבניין"
              value={
                extractedData.buildingType ||
                extractedData.exterior_analysis?.building_type ||
                ""
              }
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מניתוח תמונות חוץ"
              provenanceInfo={getProvenanceForField("buildingType")}
              type="select"
              options={[
                "מגדל מגורים",
                "בניין מגורים נמוך",
                "בית פרטי",
                "דופלקס",
                "פנטהאוז",
                "וילה",
                "קוטג'",
              ]}
            />
            <EditableField
              field="buildingFeatures"
              label="תכונות הבניין"
              value={
                extractedData.buildingFeatures ||
                extractedData.exterior_analysis?.building_features ||
                ""
              }
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מניתוח תמונות חוץ"
              provenanceInfo={getProvenanceForField("buildingFeatures")}
            />
            <EditableField
              field="overallAssessment"
              label="הערכה כללית"
              value={
                extractedData.overallAssessment ||
                extractedData.exterior_analysis?.exterior_assessment ||
                ""
              }
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מניתוח תמונות חוץ"
              provenanceInfo={getProvenanceForField("overallAssessment")}
              type="textarea"
            />
            <EditableField
              field="environmentDescription"
              label="תיאור הסביבה (AI)"
              value={
                extractedData.environmentDescription ||
                extractedData.environment_description ||
                (data as any).environmentDescription ||
                ""
              }
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource={getDataSource("environmentDescription")}
              provenanceInfo={getProvenanceForField("environmentDescription")}
              type="textarea"
            />
          </div>
        </div>
      )}

      {/* Planning Rights Section (3.2) */}
      {hasExtractedData && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">
            3.2 זכויות בנייה
          </h3>
          <div className="space-y-3">
            <EditableField
              field="planningRights.usage"
              label="ייעוד"
              value={getValueFromPaths(
                [
                  "planning_information.rights.usage",
                  "planning_rights.usage",
                  "planningRights.usage",
                  "planning_information.rights.yiud",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך מידע תכנוני"
              provenanceInfo={getProvenanceForField("planningRights.usage")}
            />
            <EditableField
              field="planningRights.minLotSize"
              label="שטח מגרש מינימלי (מ״ר)"
              value={getValueFromPaths(
                [
                  "planning_information.rights.minLotSize",
                  "planning_information.rights.min_lot_size",
                  "planning_rights.minLotSize",
                  "planning_rights.min_lot_size",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך מידע תכנוני"
              provenanceInfo={getProvenanceForField(
                "planningRights.minLotSize",
              )}
            />
            <EditableField
              field="planningRights.buildPercentage"
              label="אחוזי בנייה (%)"
              value={getValueFromPaths(
                [
                  "planning_information.rights.buildPercentage",
                  "planning_information.rights.build_percentage",
                  "planning_rights.buildPercentage",
                  "planning_rights.build_percentage",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך מידע תכנוני"
              provenanceInfo={getProvenanceForField(
                "planningRights.buildPercentage",
              )}
            />
            <EditableField
              field="planningRights.maxFloors"
              label="מספר קומות מותרות"
              value={getValueFromPaths(
                [
                  "planning_information.rights.maxFloors",
                  "planning_information.rights.max_floors",
                  "planning_rights.maxFloors",
                  "planning_rights.max_floors",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך מידע תכנוני"
              provenanceInfo={getProvenanceForField("planningRights.maxFloors")}
            />
            <EditableField
              field="planningRights.maxUnits"
              label="מספר יחידות דיור"
              value={getValueFromPaths(
                [
                  "planning_information.rights.maxUnits",
                  "planning_information.rights.max_units",
                  "planning_rights.maxUnits",
                  "planning_rights.max_units",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך מידע תכנוני"
              provenanceInfo={getProvenanceForField("planningRights.maxUnits")}
            />
            <EditableField
              field="planningRights.buildingLines"
              label="קווי בניין"
              value={getValueFromPaths(
                [
                  "planning_information.rights.buildingLines",
                  "planning_information.rights.building_lines",
                  "planning_rights.buildingLines",
                  "planning_rights.building_lines",
                ],
                extractedData,
                data,
              )}
              editingField={editingField}
              tempValue={tempValue}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              onCancel={handleFieldCancel}
              onValueChange={setTempValue}
              dataSource="נשלף מתוך מידע תכנוני"
              provenanceInfo={getProvenanceForField(
                "planningRights.buildingLines",
              )}
            />
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasExtractedData && (
        <div className="text-center py-12 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>לא נמצאו נתונים שחולצו</p>
          <p className="text-sm mt-1">העלה מסמכים בשלב הקודם</p>
        </div>
      )}
    </div>
  );
}
