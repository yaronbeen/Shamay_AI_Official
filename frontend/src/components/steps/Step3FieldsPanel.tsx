"use client";

import React, { useState, useEffect, useCallback } from "react";
import { CheckCircle, FileText, Building, Loader2 } from "lucide-react";
import { ValuationData } from "@/types/valuation";
import type { ProcessingStatus } from "../../lib/session-store-global";
import { ProvenanceInfo } from "./EditableField";
import {
  SectionGroup,
  StandaloneSection,
  ReadOnlyFieldDisplay,
  AdditionalAreasDisplay,
  RoomAnalysisDisplay,
  BuildingPermitsDisplay,
  getValueFromPaths,
} from "./FieldSection";
import {
  TABU_SECTION_GROUP,
  SHARED_BUILDING_SECTION_GROUP,
  PLOT_NOTES_SECTION,
  SUB_CHELKA_NOTES_SECTION,
  PLOT_EASEMENTS_SECTION,
  SUB_CHELKA_EASEMENTS_SECTION,
  MORTGAGES_SECTION,
  PARCEL_DESCRIPTION_SECTION,
  BUILDING_DETAILS_SECTION,
  PROPERTY_CHARACTERISTICS_SECTION,
  INTERIOR_ANALYSIS_SECTION,
  EXTERIOR_ANALYSIS_SECTION,
  PLANNING_RIGHTS_SECTION,
} from "./fieldSectionConfig";

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
              "Step3: Received new extracted data from background processing",
            );
            updateData({ extractedData: { ...extractedData, ...newData } });
          }

          // Determine if we need to continue polling
          const hasProcessing =
            status && Object.values(status).some((s) => s === "processing");
          setIsPolling(!!hasProcessing);

          return !allComplete && !!hasProcessing;
        }
      } catch (error) {
        console.error("Error checking processing status:", error);
      }
      return false;
    };

    // Initial check
    checkProcessingStatus().then((shouldContinue) => {
      if (shouldContinue && isMounted) {
        setIsPolling(true);
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
  }, [sessionId, updateData]);

  const handleFieldEdit = useCallback((field: string, currentValue: string) => {
    setEditingField(field);
    setTempValue(currentValue);
  }, []);

  const handleFieldSave = useCallback(
    (field: string) => {
      onFieldSave(field, tempValue);
      setEditingField(null);
      setTempValue("");
    },
    [onFieldSave, tempValue],
  );

  const handleFieldCancel = useCallback(() => {
    setEditingField(null);
    setTempValue("");
  }, []);

  const getProvenanceForField = useCallback(
    (fieldName: string): ProvenanceInfo | null => {
      if (provenanceData[fieldName]) return provenanceData[fieldName];
      const snakeCase = fieldName.replace(/([A-Z])/g, "_$1").toLowerCase();
      if (provenanceData[snakeCase]) return provenanceData[snakeCase];
      return null;
    },
    [provenanceData],
  );

  const hasExtractedData = Object.keys(extractedData).length > 0;

  // Common props for all section components
  const sectionProps = {
    extractedData,
    data,
    editingField,
    tempValue,
    onEdit: handleFieldEdit,
    onSave: handleFieldSave,
    onCancel: handleFieldCancel,
    onValueChange: setTempValue,
    getProvenanceForField,
  };

  // Get permits data for building permits display
  const permits = getValueFromPaths(
    ["permits", "land_registry.permits", "building_permit.permits"],
    extractedData,
    data,
  );

  // Get additional areas for display
  const additionalAreas = getValueFromPaths(
    ["additionalAreas", "additional_areas", "land_registry.additional_areas"],
    extractedData,
    data,
  );

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
                      {status === "completed" && " \u2713"}
                      {status === "error" && " \u2717"}
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

      {/* Tabu (Land Registry) Section Group */}
      {hasExtractedData && (
        <SectionGroup config={TABU_SECTION_GROUP} {...sectionProps} />
      )}

      {/* Plot Notes Section */}
      {hasExtractedData && (
        <StandaloneSection config={PLOT_NOTES_SECTION} {...sectionProps} />
      )}

      {/* Sub-chelka Notes Section */}
      {hasExtractedData && (
        <StandaloneSection
          config={SUB_CHELKA_NOTES_SECTION}
          {...sectionProps}
        />
      )}

      {/* Plot Easements Section */}
      {hasExtractedData && (
        <StandaloneSection config={PLOT_EASEMENTS_SECTION} {...sectionProps} />
      )}

      {/* Sub-chelka Easements Section */}
      {hasExtractedData && (
        <StandaloneSection
          config={SUB_CHELKA_EASEMENTS_SECTION}
          {...sectionProps}
        />
      )}

      {/* Mortgages Section */}
      {hasExtractedData && (
        <StandaloneSection config={MORTGAGES_SECTION} {...sectionProps} />
      )}

      {/* Shared Building Order Section Group */}
      {hasExtractedData && (
        <SectionGroup
          config={SHARED_BUILDING_SECTION_GROUP}
          {...sectionProps}
        />
      )}

      {/* Building Permits Section */}
      {hasExtractedData && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            טבלת היתר בנייה
          </h3>
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
            היתר בנייה הוא אובייקט חוזר - יכולים להיות 0/1/N היתרים. אין הכרעה
            בין היתרים, כל היתר מוצג בנפרד.
          </div>
          <BuildingPermitsDisplay permits={permits} />
        </div>
      )}

      {/* Parcel Description Section (Manual) */}
      {hasExtractedData && (
        <StandaloneSection
          config={PARCEL_DESCRIPTION_SECTION}
          {...sectionProps}
        />
      )}

      {/* Building Details Section */}
      {hasExtractedData && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">
            פרטי הבניין
          </h3>
          <div className="space-y-3">
            <StandaloneSection
              config={BUILDING_DETAILS_SECTION}
              {...sectionProps}
            />
            {/* Additional Areas Display (special case) */}
            <AdditionalAreasDisplay additionalAreas={additionalAreas} />
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
            {/* Read-only fields from user data */}
            <ReadOnlyFieldDisplay
              label="מספר חדרים"
              value={data.rooms}
              dataSource="נשלף מנתוני המשתמש"
            />
            <ReadOnlyFieldDisplay
              label="קומה"
              value={data.floor}
              dataSource="נשלף מנתוני המשתמש"
            />
            <StandaloneSection
              config={PROPERTY_CHARACTERISTICS_SECTION}
              {...sectionProps}
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
            <StandaloneSection
              config={INTERIOR_ANALYSIS_SECTION}
              {...sectionProps}
            />
            {/* Room Analysis Display (special case) */}
            {extractedData.roomAnalysis && (
              <RoomAnalysisDisplay roomAnalysis={extractedData.roomAnalysis} />
            )}
          </div>
        </div>
      )}

      {/* Exterior Analysis Section */}
      {hasExtractedData && (
        <StandaloneSection
          config={EXTERIOR_ANALYSIS_SECTION}
          {...sectionProps}
        />
      )}

      {/* Planning Rights Section */}
      {hasExtractedData && (
        <StandaloneSection config={PLANNING_RIGHTS_SECTION} {...sectionProps} />
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
