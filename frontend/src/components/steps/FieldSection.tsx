"use client";

import React, { useCallback } from "react";
import { EditableField, ProvenanceInfo } from "./EditableField";
import {
  SectionConfig,
  SectionGroupConfig,
  FieldConfig,
} from "./fieldSectionConfig";
import { ValuationData } from "@/types/valuation";

export interface FieldSectionProps {
  config: SectionConfig;
  extractedData: Record<string, any>;
  data: ValuationData;
  editingField: string | null;
  tempValue: string;
  onEdit: (field: string, value: string) => void;
  onSave: (field: string) => void;
  onCancel: () => void;
  onValueChange: (value: string) => void;
  getProvenanceForField: (fieldName: string) => ProvenanceInfo | null;
}

export interface SectionGroupProps {
  config: SectionGroupConfig;
  extractedData: Record<string, any>;
  data: ValuationData;
  editingField: string | null;
  tempValue: string;
  onEdit: (field: string, value: string) => void;
  onSave: (field: string) => void;
  onCancel: () => void;
  onValueChange: (value: string) => void;
  getProvenanceForField: (fieldName: string) => ProvenanceInfo | null;
}

// Helper to get nested values from an object
export const getNestedValue = (obj: any, path: string): any => {
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
};

// Helper to get value from multiple possible paths
export const getValueFromPaths = (
  paths: string[],
  extracted: any,
  data: any,
): any => {
  for (const path of paths) {
    const value = getNestedValue(extracted, path) || getNestedValue(data, path);
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return undefined;
};

// Get field value using config
export const getFieldValue = (
  fieldConfig: FieldConfig,
  extractedData: Record<string, any>,
  data: ValuationData,
): string | number | undefined => {
  // Use custom getter if provided
  if (fieldConfig.customValueGetter) {
    return fieldConfig.customValueGetter(extractedData, data);
  }
  // Otherwise use value paths
  return getValueFromPaths(fieldConfig.valuePaths, extractedData, data);
};

/**
 * FieldSection renders a single section with a title and list of editable fields
 */
export function FieldSection({
  config,
  extractedData,
  data,
  editingField,
  tempValue,
  onEdit,
  onSave,
  onCancel,
  onValueChange,
  getProvenanceForField,
}: FieldSectionProps) {
  const getFieldValueMemo = useCallback(
    (fieldConfig: FieldConfig) =>
      getFieldValue(fieldConfig, extractedData, data),
    [extractedData, data],
  );

  return (
    <div className="space-y-3">
      <h4 className="text-base font-semibold text-gray-800 mb-3 mt-4 border-b pb-2">
        {config.title}
      </h4>
      {config.infoMessage && (
        <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
          {config.infoMessage}
        </div>
      )}
      <div className="space-y-3">
        {config.fields.map((fieldConfig) => (
          <EditableField
            key={fieldConfig.field}
            field={fieldConfig.field}
            label={fieldConfig.label}
            value={getFieldValueMemo(fieldConfig)}
            editingField={editingField}
            tempValue={tempValue}
            onEdit={onEdit}
            onSave={onSave}
            onCancel={onCancel}
            onValueChange={onValueChange}
            dataSource={fieldConfig.dataSource}
            provenanceInfo={getProvenanceForField(fieldConfig.field)}
            type={fieldConfig.type}
            options={fieldConfig.options}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * SectionGroup renders a group of related sections with a main title
 */
export function SectionGroup({
  config,
  extractedData,
  data,
  editingField,
  tempValue,
  onEdit,
  onSave,
  onCancel,
  onValueChange,
  getProvenanceForField,
}: SectionGroupProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-lg font-bold text-gray-900 mb-2">{config.title}</h3>
      {config.infoMessage && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          {config.infoMessage}
        </div>
      )}
      {config.sections.map((sectionConfig) => (
        <FieldSection
          key={sectionConfig.id}
          config={sectionConfig}
          extractedData={extractedData}
          data={data}
          editingField={editingField}
          tempValue={tempValue}
          onEdit={onEdit}
          onSave={onSave}
          onCancel={onCancel}
          onValueChange={onValueChange}
          getProvenanceForField={getProvenanceForField}
        />
      ))}
    </div>
  );
}

/**
 * StandaloneSection renders a single section in a card layout (for sections not in a group)
 */
export function StandaloneSection({
  config,
  extractedData,
  data,
  editingField,
  tempValue,
  onEdit,
  onSave,
  onCancel,
  onValueChange,
  getProvenanceForField,
}: FieldSectionProps) {
  const getFieldValueMemo = useCallback(
    (fieldConfig: FieldConfig) =>
      getFieldValue(fieldConfig, extractedData, data),
    [extractedData, data],
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-base font-semibold text-gray-900 mb-3">
        {config.title}
      </h3>
      {config.infoMessage && (
        <p className="text-xs text-gray-500 mb-3">{config.infoMessage}</p>
      )}
      <div className="space-y-3">
        {config.fields.map((fieldConfig) => (
          <EditableField
            key={fieldConfig.field}
            field={fieldConfig.field}
            label={fieldConfig.label}
            value={getFieldValueMemo(fieldConfig)}
            editingField={editingField}
            tempValue={tempValue}
            onEdit={onEdit}
            onSave={onSave}
            onCancel={onCancel}
            onValueChange={onValueChange}
            dataSource={fieldConfig.dataSource}
            provenanceInfo={getProvenanceForField(fieldConfig.field)}
            type={fieldConfig.type}
            options={fieldConfig.options}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * ReadOnlyFieldDisplay renders a read-only field (like rooms/floor from user data)
 */
export function ReadOnlyFieldDisplay({
  label,
  value,
  dataSource,
}: {
  label: string;
  value: string | number | undefined;
  dataSource: string;
}) {
  return (
    <div className="p-3 rounded-lg bg-gray-50">
      <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <span className="flex-1 text-right text-sm text-gray-900">
          {value || "לא נמצא"}
        </span>
      </div>
      <p className="text-xs text-gray-500 mt-1">{dataSource}</p>
    </div>
  );
}

/**
 * AdditionalAreasDisplay renders additional areas array (special display)
 */
export function AdditionalAreasDisplay({
  additionalAreas,
}: {
  additionalAreas: any[];
}) {
  if (!Array.isArray(additionalAreas) || additionalAreas.length === 0) {
    return null;
  }

  return (
    <div className="p-3 rounded-lg bg-gray-50">
      <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
        שטחים נוספים
      </label>
      <div className="space-y-1">
        {additionalAreas.map((area: any, index: number) => (
          <div key={index} className="text-sm text-gray-900 text-right">
            {area.type}: {area.area} מ״ר
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-1">נשלף מתוך נסח טאבו</p>
    </div>
  );
}

/**
 * RoomAnalysisDisplay renders room analysis from interior images
 */
export function RoomAnalysisDisplay({ roomAnalysis }: { roomAnalysis: any[] }) {
  if (!Array.isArray(roomAnalysis) || roomAnalysis.length === 0) {
    return null;
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
        ניתוח חדרים
      </label>
      <div className="space-y-3">
        {roomAnalysis.map((room: any, index: number) => (
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
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-1">נשלף מניתוח תמונות פנים</p>
    </div>
  );
}

/**
 * BuildingPermitsDisplay renders building permits array (repeating object)
 */
export function BuildingPermitsDisplay({ permits }: { permits: any[] }) {
  if (!Array.isArray(permits) || permits.length === 0) {
    return (
      <p className="text-gray-500 text-sm text-center py-4">
        לא נמצאו היתרי בנייה
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {permits.map((permit: any, index: number) => (
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
                <span className="text-sm text-gray-600">מספר היתר:</span>
                <span className="text-sm font-medium">
                  {permit.permit_number || "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">תאריך היתר:</span>
                <span className="text-sm font-medium">
                  {permit.permit_date || "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">תאריך הפקת היתר:</span>
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
                <span className="text-sm text-gray-600 mb-1">תיאור מותר:</span>
                <span className="text-sm font-medium bg-white p-2 rounded border">
                  {permit.permitted_description || "-"}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
