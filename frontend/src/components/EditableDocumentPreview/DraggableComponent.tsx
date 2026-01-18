"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Eye, EyeOff } from "lucide-react";

interface DraggableComponentProps {
  id: string;
  children: React.ReactNode;
  isEditMode?: boolean;
  isVisible?: boolean;
  onToggleVisibility?: () => void;
  label?: string;
}

export function DraggableComponent({
  id,
  children,
  isEditMode = false,
  isVisible = true,
  onToggleVisibility,
  label,
}: DraggableComponentProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // In non-edit mode, just render children directly
  if (!isEditMode) {
    return <>{children}</>;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isDragging ? "z-50" : ""} ${
        !isVisible ? "opacity-50" : ""
      }`}
    >
      {/* Drag handle and controls - visible on LEFT side for RTL */}
      <div
        className={`absolute left-0 top-0 -translate-x-full pr-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${
          isDragging ? "opacity-100" : ""
        }`}
      >
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="p-1.5 bg-white border border-gray-200 rounded shadow-sm hover:bg-gray-50 cursor-grab active:cursor-grabbing"
          title="גרור לשינוי סדר"
          aria-label={`גרור ${label || "רכיב"} לשינוי סדר`}
        >
          <GripVertical className="h-4 w-4 text-gray-500" />
        </button>

        {/* Visibility toggle */}
        {onToggleVisibility && (
          <button
            onClick={onToggleVisibility}
            className={`p-1.5 bg-white border border-gray-200 rounded shadow-sm hover:bg-gray-50 ${
              isVisible ? "text-gray-500" : "text-red-500"
            }`}
            title={isVisible ? "הסתר רכיב" : "הצג רכיב"}
            aria-label={
              isVisible ? `הסתר ${label || "רכיב"}` : `הצג ${label || "רכיב"}`
            }
          >
            {isVisible ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {/* Component border highlight on hover */}
      <div
        className={`rounded-lg transition-all ${
          isDragging
            ? "ring-2 ring-blue-400 ring-offset-2"
            : "group-hover:ring-1 group-hover:ring-gray-300"
        }`}
      >
        {children}
      </div>

      {/* Label tooltip */}
      {label && (
        <div className="absolute left-0 bottom-0 -translate-x-full pb-1 pr-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <span className="text-xs bg-gray-800 text-white px-2 py-1 rounded whitespace-nowrap">
            {label}
          </span>
        </div>
      )}
    </div>
  );
}

// Overlay component shown during drag
export function DragOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="opacity-90 shadow-2xl rounded-lg ring-2 ring-blue-500">
      {children}
    </div>
  );
}
