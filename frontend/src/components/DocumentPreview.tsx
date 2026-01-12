"use client";

import { ValuationData } from "@/types/valuation";
import { EditableDocumentPreview } from "./EditableDocumentPreview";

interface DocumentPreviewProps {
  data: ValuationData;
  onDataChange?: (updates: Partial<ValuationData>) => void;
}

export function DocumentPreview({ data, onDataChange }: DocumentPreviewProps) {
  return (
    <EditableDocumentPreview
      data={data}
      onDataChange={onDataChange || (() => {})}
    />
  );
}
