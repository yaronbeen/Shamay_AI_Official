"use client";

import React from "react";

// ============================================================================
// Types
// ============================================================================

export type ToolbarMode = "text" | "table" | "image";

export type TableOperation =
  | "addRow"
  | "deleteRow"
  | "addColumn"
  | "deleteColumn"
  | "deleteTable";

export interface ToolbarState {
  visible: boolean;
  mode: ToolbarMode;
  targetSelector?: string;
}

export interface FloatingToolbarProps {
  toolbarState: ToolbarState;
  onHide: () => void;
  onExecuteCommand: (command: string, value?: string) => void;
  onAdjustFontSize: (direction: "up" | "down") => void;
  onTableOperation: (operation: TableOperation) => void;
  onExportTableToCSV: () => void;
  onImageResize: (size: "full" | "half" | "third") => void;
  onImageReplace: () => void;
  onImageReset: () => void;
}

interface TextToolbarButton {
  icon: string;
  command: string;
  label: string;
}

// ============================================================================
// Constants
// ============================================================================

const textToolbarButtons: TextToolbarButton[] = [
  { icon: "B", command: "bold", label: "מודגש" },
  { icon: "I", command: "italic", label: "נטוי" },
  { icon: "U", command: "underline", label: "קו תחתון" },
  { icon: "•", command: "insertUnorderedList", label: "רשימת תבליטים" },
  { icon: "1.", command: "insertOrderedList", label: "רשימה ממוספרת" },
  { icon: "↔︎", command: "justifyFull", label: "יישור מלא" },
  { icon: "⇤", command: "justifyRight", label: "יישור לימין" },
  { icon: "⇥", command: "justifyCenter", label: "יישור למרכז" },
];

// ============================================================================
// Component
// ============================================================================

export function FloatingToolbar({
  toolbarState,
  onHide,
  onExecuteCommand,
  onAdjustFontSize,
  onTableOperation,
  onExportTableToCSV,
  onImageResize,
  onImageReplace,
  onImageReset,
}: FloatingToolbarProps) {
  if (!toolbarState.visible) {
    return null;
  }

  const isTextDisabled =
    toolbarState.mode !== "text" || !toolbarState.targetSelector;
  const isImageDisabled =
    toolbarState.mode !== "image" || !toolbarState.targetSelector;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const buttons = e.currentTarget.querySelectorAll("button:not([disabled])");
    const currentIndex = Array.from(buttons).indexOf(
      document.activeElement as HTMLButtonElement,
    );
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const direction = e.key === "ArrowRight" ? -1 : 1;
      const nextIndex =
        (currentIndex + direction + buttons.length) % buttons.length;
      (buttons[nextIndex] as HTMLButtonElement).focus();
    } else if (e.key === "Escape") {
      onHide();
    }
  };

  return (
    <div
      data-edit-toolbar="true"
      role="toolbar"
      aria-label="כלי עריכת טקסט"
      aria-orientation="horizontal"
      className="fixed top-20 sm:top-24 right-2 sm:right-8 z-[1200] flex flex-wrap items-center gap-1 rounded-lg border border-gray-300 bg-white px-2 sm:px-3 py-2 shadow-xl max-w-[calc(100vw-1rem)] sm:max-w-none"
      style={{ direction: "rtl" }}
      onKeyDown={handleKeyDown}
    >
      {toolbarState.mode === "text" ? (
        <TextToolbar
          disabled={isTextDisabled}
          onExecuteCommand={onExecuteCommand}
          onAdjustFontSize={onAdjustFontSize}
          onHide={onHide}
        />
      ) : toolbarState.mode === "table" ? (
        <TableToolbar
          onTableOperation={onTableOperation}
          onExportTableToCSV={onExportTableToCSV}
          onHide={onHide}
        />
      ) : (
        <ImageToolbar
          disabled={isImageDisabled}
          onImageResize={onImageResize}
          onImageReplace={onImageReplace}
          onImageReset={onImageReset}
          onHide={onHide}
        />
      )}
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface TextToolbarProps {
  disabled: boolean;
  onExecuteCommand: (command: string, value?: string) => void;
  onAdjustFontSize: (direction: "up" | "down") => void;
  onHide: () => void;
}

function TextToolbar({
  disabled,
  onExecuteCommand,
  onAdjustFontSize,
  onHide,
}: TextToolbarProps) {
  const buttonBaseClass = "rounded-md border px-2 py-1 text-xs font-semibold";
  const enabledClass =
    "border-gray-200 text-gray-700 hover:border-blue-400 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const disabledClass = "border-gray-200 text-gray-400 cursor-not-allowed";

  return (
    <>
      {textToolbarButtons.map((btn) => (
        <button
          key={btn.command}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onExecuteCommand(btn.command)}
          disabled={disabled}
          aria-label={btn.label}
          className={`min-w-[36px] ${buttonBaseClass} ${
            disabled ? disabledClass : enabledClass
          }`}
          title={btn.label}
        >
          {btn.icon}
        </button>
      ))}
      <button
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onAdjustFontSize("up")}
        disabled={disabled}
        className={`${buttonBaseClass} ${disabled ? disabledClass : enabledClass}`}
        title="הגדל גופן"
      >
        A+
      </button>
      <button
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onAdjustFontSize("down")}
        disabled={disabled}
        className={`${buttonBaseClass} ${disabled ? disabledClass : enabledClass}`}
        title="הקטן גופן"
      >
        A-
      </button>
      <button
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onExecuteCommand("hiliteColor", "#fff3bf")}
        disabled={disabled}
        className={`${buttonBaseClass} ${
          disabled
            ? disabledClass
            : "border-gray-200 text-gray-700 hover:border-amber-400 hover:text-amber-600"
        }`}
        title="סמן טקסט"
      >
        {"\uD83D\uDD8D\uFE0F"}
      </button>
      <CloseButton onHide={onHide} />
    </>
  );
}

interface TableToolbarProps {
  onTableOperation: (operation: TableOperation) => void;
  onExportTableToCSV: () => void;
  onHide: () => void;
}

function TableToolbar({
  onTableOperation,
  onExportTableToCSV,
  onHide,
}: TableToolbarProps) {
  return (
    <>
      <span className="text-xs text-gray-500 ml-2">פעולות טבלה:</span>
      <button
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onTableOperation("addRow")}
        className="rounded-md border border-green-300 bg-green-50 px-2 py-1 text-xs font-semibold text-green-700 hover:bg-green-100"
        title="הוסף שורה מתחת לשורה הנוכחית"
      >
        {"\u2795"} שורה
      </button>
      <button
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onTableOperation("deleteRow")}
        className="rounded-md border border-red-300 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
        title="מחק שורה נוכחית"
      >
        {"\u2796"} שורה
      </button>
      <button
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onTableOperation("addColumn")}
        className="rounded-md border border-green-300 bg-green-50 px-2 py-1 text-xs font-semibold text-green-700 hover:bg-green-100"
        title="הוסף עמודה אחרי העמודה הנוכחית"
      >
        {"\u2795"} עמודה
      </button>
      <button
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onTableOperation("deleteColumn")}
        className="rounded-md border border-red-300 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
        title="מחק עמודה נוכחית"
      >
        {"\u2796"} עמודה
      </button>
      <button
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onTableOperation("deleteTable")}
        className="rounded-md border border-red-400 bg-red-100 px-2 py-1 text-xs font-semibold text-red-800 hover:bg-red-200"
        title="מחק את כל הטבלה"
      >
        {"\uD83D\uDDD1\uFE0F"} מחק טבלה
      </button>
      <button
        onMouseDown={(event) => event.preventDefault()}
        onClick={onExportTableToCSV}
        className="rounded-md border border-blue-300 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
        title="ייצוא טבלה ל-CSV"
      >
        {"\uD83D\uDCE5"} ייצוא CSV
      </button>
      <CloseButton onHide={onHide} />
    </>
  );
}

interface ImageToolbarProps {
  disabled: boolean;
  onImageResize: (size: "full" | "half" | "third") => void;
  onImageReplace: () => void;
  onImageReset: () => void;
  onHide: () => void;
}

function ImageToolbar({
  disabled,
  onImageResize,
  onImageReplace,
  onImageReset,
  onHide,
}: ImageToolbarProps) {
  const buttonBaseClass = "rounded-md border px-2 py-1 text-xs font-semibold";
  const enabledClass =
    "border-gray-200 text-gray-700 hover:border-blue-400 hover:text-blue-600";
  const disabledClass = "border-gray-200 text-gray-400 cursor-not-allowed";

  return (
    <>
      <button
        onMouseDown={(event) => event.preventDefault()}
        onClick={onImageReplace}
        disabled={disabled}
        className={`rounded-md border px-3 py-1 text-xs font-semibold ${
          disabled
            ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
            : "border-blue-400 bg-blue-50 text-blue-700 hover:bg-blue-100"
        }`}
        title="החלפת תמונה"
      >
        החלף תמונה
      </button>
      <button
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onImageResize("full")}
        disabled={disabled}
        className={`${buttonBaseClass} ${disabled ? disabledClass : enabledClass}`}
        title="רוחב מלא"
      >
        100%
      </button>
      <button
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onImageResize("half")}
        disabled={disabled}
        className={`${buttonBaseClass} ${disabled ? disabledClass : enabledClass}`}
        title="חצי רוחב"
      >
        50%
      </button>
      <button
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onImageResize("third")}
        disabled={disabled}
        className={`${buttonBaseClass} ${disabled ? disabledClass : enabledClass}`}
        title="שליש רוחב"
      >
        33%
      </button>
      <button
        onMouseDown={(event) => event.preventDefault()}
        onClick={onImageReset}
        disabled={disabled}
        className={`${buttonBaseClass} ${
          disabled
            ? disabledClass
            : "border-gray-200 text-gray-700 hover:border-green-400 hover:text-green-600"
        }`}
        title="איפוס התאמות"
      >
        איפוס
      </button>
      <CloseButton onHide={onHide} />
    </>
  );
}

interface CloseButtonProps {
  onHide: () => void;
}

function CloseButton({ onHide }: CloseButtonProps) {
  return (
    <button
      onMouseDown={(event) => event.preventDefault()}
      onClick={onHide}
      className="rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 hover:border-red-400 hover:text-red-600"
      title="הסתרת סרגל"
    >
      {"\u2716"}
    </button>
  );
}

export default FloatingToolbar;
