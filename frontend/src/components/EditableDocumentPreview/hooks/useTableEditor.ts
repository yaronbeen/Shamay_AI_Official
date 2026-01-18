/**
 * Table editing hook for EditableDocumentPreview
 * Handles custom table CRUD operations including:
 * - Insert custom table from CSV
 * - Export table to CSV
 * - Table operations (add/delete rows/columns, delete table)
 */

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { TableCellPosition, ToolbarState } from "../types";
import { CustomTable, ValuationData } from "@/types/valuation";

/**
 * Table operation types
 */
export type TableOperation =
  | "addRow"
  | "deleteRow"
  | "addColumn"
  | "deleteColumn"
  | "deleteTable";

interface UseTableEditorProps {
  data: ValuationData;
  onDataChange: (updates: Partial<ValuationData>) => void;
  getFrameDocument: () => Document | null;
  toolbarState: ToolbarState;
  setToolbarState: React.Dispatch<React.SetStateAction<ToolbarState>>;
  saveOverrideForElement: (element: HTMLElement) => void;
}

interface UseTableEditorReturn {
  /** Current selected table cell position */
  currentTableCell: TableCellPosition | null;
  /** Set current table cell position */
  setCurrentTableCell: React.Dispatch<
    React.SetStateAction<TableCellPosition | null>
  >;
  /** Insert a new custom table from CSV data */
  handleInsertCustomTable: (table: CustomTable) => void;
  /** Export the currently selected table to CSV file */
  handleExportTableToCSV: () => void;
  /** Perform table operation (add/delete row/column, delete table) */
  handleTableOperation: (operation: TableOperation) => void;
}

/**
 * Escape a CSV field value properly
 * Handles commas, quotes, and newlines within field values
 */
function escapeCSVField(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

export function useTableEditor({
  data,
  onDataChange,
  getFrameDocument,
  toolbarState,
  setToolbarState,
  saveOverrideForElement,
}: UseTableEditorProps): UseTableEditorReturn {
  // Track current table cell for table operations
  const [currentTableCell, setCurrentTableCell] =
    useState<TableCellPosition | null>(null);

  /**
   * Handle inserting a custom table from CSV
   */
  const handleInsertCustomTable = useCallback(
    (table: CustomTable) => {
      const existingTables: CustomTable[] = data.customTables || [];
      const updatedTables = [...existingTables, table];

      onDataChange({
        customTables: updatedTables,
      });

      toast.success(
        `טבלה "${table.title || "ללא כותרת"}" נוספה בהצלחה (${table.rows.length} שורות)`,
      );
    },
    [data.customTables, onDataChange],
  );

  /**
   * Export current table to CSV file
   * Creates a downloadable CSV file with BOM for Hebrew support in Excel
   */
  const handleExportTableToCSV = useCallback(() => {
    if (!currentTableCell) {
      toast.error("יש לבחור תא בטבלה לפני ייצוא");
      return;
    }

    const existingTables: CustomTable[] = data.customTables || [];
    const table = existingTables.find((t) => t.id === currentTableCell.tableId);

    if (!table) {
      toast.error("לא נמצאה הטבלה לייצוא");
      return;
    }

    try {
      // Build CSV content with proper escaping
      const headerRow = table.headers.map(escapeCSVField).join(",");
      const dataRows = table.rows.map((row) =>
        row.map(escapeCSVField).join(","),
      );
      const csvContent = [headerRow, ...dataRows].join("\n");

      // Add BOM for Hebrew support in Excel
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], {
        type: "text/csv;charset=utf-8;",
      });

      // Download the file
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${table.title || "table"}-export.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("הטבלה יוצאה בהצלחה");
    } catch (error) {
      console.error("CSV export failed:", error);
      toast.error("שגיאה בייצוא הטבלה");
    }
  }, [currentTableCell, data.customTables]);

  /**
   * Handle table operations: add/delete rows/columns, delete table
   */
  const handleTableOperation = useCallback(
    (operation: TableOperation) => {
      if (!currentTableCell) {
        toast.error("יש לבחור תא בטבלה");
        return;
      }

      const { tableId, row, col } = currentTableCell;
      const existingTables: CustomTable[] = data.customTables || [];
      const tableIndex = existingTables.findIndex((t) => t.id === tableId);

      if (tableIndex === -1) {
        toast.error("לא נמצאה הטבלה");
        return;
      }

      const table = existingTables[tableIndex];
      let updatedTable: CustomTable | null = null;

      switch (operation) {
        case "addRow": {
          const newRow = new Array(table.headers.length).fill("");
          const insertIndex = row >= 0 ? row + 1 : table.rows.length;
          const newRows = [...table.rows];
          newRows.splice(insertIndex, 0, newRow);
          updatedTable = {
            ...table,
            rows: newRows,
            updatedAt: new Date().toISOString(),
          };
          break;
        }

        case "deleteRow": {
          if (row < 0 || table.rows.length <= 1) {
            toast.error("לא ניתן למחוק את השורה היחידה");
            return;
          }
          updatedTable = {
            ...table,
            rows: table.rows.filter((_, idx) => idx !== row),
            updatedAt: new Date().toISOString(),
          };
          // Update currentTableCell to reflect deleted row
          // After deletion, new length = table.rows.length - 1, so max valid index = table.rows.length - 2
          const newRowLength = table.rows.length - 1;
          const newRowIndex = row >= newRowLength ? newRowLength - 1 : row;
          setCurrentTableCell((prev) =>
            prev ? { ...prev, row: Math.max(0, newRowIndex) } : null,
          );
          break;
        }

        case "addColumn": {
          const insertIndex = col >= 0 ? col + 1 : table.headers.length;
          const newHeaders = [...table.headers];
          newHeaders.splice(insertIndex, 0, "עמודה חדשה");
          const newRows = table.rows.map((r) => {
            const newRow = [...r];
            newRow.splice(insertIndex, 0, "");
            return newRow;
          });
          updatedTable = {
            ...table,
            headers: newHeaders,
            rows: newRows,
            updatedAt: new Date().toISOString(),
          };
          break;
        }

        case "deleteColumn": {
          if (col < 0 || table.headers.length <= 1) {
            toast.error("לא ניתן למחוק את העמודה היחידה");
            return;
          }
          updatedTable = {
            ...table,
            headers: table.headers.filter((_, idx) => idx !== col),
            rows: table.rows.map((r) => r.filter((_, idx) => idx !== col)),
            updatedAt: new Date().toISOString(),
          };
          // Update currentTableCell to reflect deleted column
          // After deletion, new length = table.headers.length - 1, so max valid index = table.headers.length - 2
          const newColLength = table.headers.length - 1;
          const newColIndex = col >= newColLength ? newColLength - 1 : col;
          setCurrentTableCell((prev) =>
            prev ? { ...prev, col: Math.max(0, newColIndex) } : null,
          );
          break;
        }

        case "deleteTable": {
          if (!confirm("האם אתה בטוח שברצונך למחוק את הטבלה?")) {
            return;
          }
          const updatedTables = existingTables.filter((t) => t.id !== tableId);
          onDataChange({ customTables: updatedTables });
          setCurrentTableCell(null);
          setToolbarState((prev) => ({ ...prev, mode: "text" }));
          return;
        }
      }

      if (updatedTable) {
        const updatedTables = [...existingTables];
        updatedTables[tableIndex] = updatedTable;
        onDataChange({ customTables: updatedTables });
      }
    },
    [currentTableCell, data.customTables, onDataChange, setToolbarState],
  );

  return {
    currentTableCell,
    setCurrentTableCell,
    handleInsertCustomTable,
    handleExportTableToCSV,
    handleTableOperation,
  };
}
