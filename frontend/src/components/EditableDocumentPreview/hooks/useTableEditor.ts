/**
 * Table editing hook for EditableDocumentPreview
 * Handles custom table CRUD operations
 */

import { useCallback } from "react";
import { TableCellPosition, ToolbarState } from "../types";
import { CustomTable, ValuationData } from "@/types/valuation";

interface UseTableEditorProps {
  data: ValuationData;
  onDataChange: (updates: Partial<ValuationData>) => void;
  currentTableCell: TableCellPosition | null;
  setCurrentTableCell: React.Dispatch<
    React.SetStateAction<TableCellPosition | null>
  >;
  setToolbarState: React.Dispatch<React.SetStateAction<ToolbarState>>;
}

export function useTableEditor({
  data,
  onDataChange,
  currentTableCell,
  setCurrentTableCell,
  setToolbarState,
}: UseTableEditorProps) {
  const handleTableOperation = useCallback(
    (
      operation:
        | "addRow"
        | "deleteRow"
        | "addColumn"
        | "deleteColumn"
        | "deleteTable",
    ) => {
      if (!currentTableCell) {
        alert("יש לבחור תא בטבלה");
        return;
      }

      const { tableId, row, col } = currentTableCell;
      const existingTables: CustomTable[] = (data as any).customTables || [];
      const tableIndex = existingTables.findIndex((t) => t.id === tableId);

      if (tableIndex === -1) {
        alert("לא נמצאה הטבלה");
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
            alert("לא ניתן למחוק את השורה היחידה");
            return;
          }
          updatedTable = {
            ...table,
            rows: table.rows.filter((_, idx) => idx !== row),
            updatedAt: new Date().toISOString(),
          };
          const newLength = table.rows.length - 1;
          const newRowIndex = row >= newLength ? newLength - 1 : row;
          setCurrentTableCell((prev: TableCellPosition | null) =>
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
            alert("לא ניתן למחוק את העמודה היחידה");
            return;
          }
          updatedTable = {
            ...table,
            headers: table.headers.filter((_, idx) => idx !== col),
            rows: table.rows.map((r) => r.filter((_, idx) => idx !== col)),
            updatedAt: new Date().toISOString(),
          };
          const newLength = table.headers.length - 1;
          const newColIndex = col >= newLength ? newLength - 1 : col;
          setCurrentTableCell((prev: TableCellPosition | null) =>
            prev ? { ...prev, col: Math.max(0, newColIndex) } : null,
          );
          break;
        }
        case "deleteTable": {
          if (!confirm("האם אתה בטוח שברצונך למחוק את הטבלה?")) {
            return;
          }
          const updatedTables = existingTables.filter((t) => t.id !== tableId);
          onDataChange({ customTables: updatedTables } as any);
          setCurrentTableCell(null);
          setToolbarState((prev) => ({ ...prev, mode: "text" }));
          return;
        }
      }

      if (updatedTable) {
        const updatedTables = [...existingTables];
        updatedTables[tableIndex] = updatedTable;
        onDataChange({ customTables: updatedTables } as any);
      }
    },
    [
      currentTableCell,
      data,
      onDataChange,
      setCurrentTableCell,
      setToolbarState,
    ],
  );

  // Handle inserting a custom table from CSV
  const handleInsertCustomTable = useCallback(
    (table: CustomTable) => {
      const existingTables = (data as any).customTables || [];
      const updatedTables = [...existingTables, table];

      onDataChange({
        customTables: updatedTables,
      } as any);

      alert(
        `✅ טבלה "${table.title || "ללא כותרת"}" נוספה בהצלחה! (${table.rows.length} שורות)`,
      );
    },
    [data, onDataChange],
  );

  return {
    handleTableOperation,
    handleInsertCustomTable,
  };
}
