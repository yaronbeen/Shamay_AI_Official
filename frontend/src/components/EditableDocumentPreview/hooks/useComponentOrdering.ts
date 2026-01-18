"use client";

import { useCallback, useMemo } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { DocumentComponentOrder, ValuationData } from "@/types/valuation";

interface UseComponentOrderingProps {
  data: ValuationData;
  onDataChange: (updates: Partial<ValuationData>) => void;
}

interface UseComponentOrderingReturn {
  componentOrder: DocumentComponentOrder[];
  reorderComponents: (activeId: string, overId: string) => void;
  toggleComponentVisibility: (componentId: string) => void;
  getOrderedCustomTables: () => Array<{
    id: string;
    order: number;
    visible: boolean;
  }>;
  initializeOrderFromTables: () => void;
}

export function useComponentOrdering({
  data,
  onDataChange,
}: UseComponentOrderingProps): UseComponentOrderingReturn {
  // Get existing component order or create default from custom tables
  const componentOrder = useMemo(() => {
    const existingOrder = data.documentComponentOrder || [];

    // If we have custom tables but no order, create default order
    if (existingOrder.length === 0 && data.customTables?.length) {
      return data.customTables.map((table, index) => ({
        id: table.id,
        type: "custom-table" as const,
        customPosition: index,
        visible: true,
      }));
    }

    return existingOrder;
  }, [data.documentComponentOrder, data.customTables]);

  // Reorder components when drag ends
  const reorderComponents = useCallback(
    (activeId: string, overId: string) => {
      if (activeId === overId) return;

      const oldIndex = componentOrder.findIndex((item) => item.id === activeId);
      const newIndex = componentOrder.findIndex((item) => item.id === overId);

      if (oldIndex === -1 || newIndex === -1) return;

      const newOrder = arrayMove(componentOrder, oldIndex, newIndex).map(
        (item, index) => ({
          ...item,
          customPosition: index,
        }),
      );

      onDataChange({ documentComponentOrder: newOrder });
    },
    [componentOrder, onDataChange],
  );

  // Toggle visibility of a component
  const toggleComponentVisibility = useCallback(
    (componentId: string) => {
      const newOrder = componentOrder.map((item) =>
        item.id === componentId ? { ...item, visible: !item.visible } : item,
      );
      onDataChange({ documentComponentOrder: newOrder });
    },
    [componentOrder, onDataChange],
  );

  // Get ordered list of custom tables with their order info
  const getOrderedCustomTables = useCallback(() => {
    if (!data.customTables) return [];

    const orderMap = new Map(
      componentOrder
        .filter((item) => item.type === "custom-table")
        .map((item, index) => [
          item.id,
          { order: index, visible: item.visible },
        ]),
    );

    return data.customTables
      .map((table) => {
        const orderInfo = orderMap.get(table.id) || {
          order: 999,
          visible: true,
        };
        return {
          id: table.id,
          order: orderInfo.order,
          visible: orderInfo.visible,
        };
      })
      .sort((a, b) => a.order - b.order);
  }, [data.customTables, componentOrder]);

  // Initialize order from existing custom tables
  const initializeOrderFromTables = useCallback(() => {
    if (!data.customTables?.length) return;

    // Check if order already exists for all tables
    const existingIds = new Set(
      componentOrder.filter((c) => c.type === "custom-table").map((c) => c.id),
    );
    const tableIds = new Set(data.customTables.map((t) => t.id));

    // Only initialize if there are new tables without order
    const needsInit = data.customTables.some((t) => !existingIds.has(t.id));
    if (!needsInit) return;

    // Merge existing order with new tables
    const existingOrder = componentOrder.filter((c) => tableIds.has(c.id));
    const newTables = data.customTables
      .filter((t) => !existingIds.has(t.id))
      .map((table, index) => ({
        id: table.id,
        type: "custom-table" as const,
        customPosition: existingOrder.length + index,
        visible: true,
      }));

    const mergedOrder = [...existingOrder, ...newTables].map((item, index) => ({
      ...item,
      customPosition: index,
    }));

    onDataChange({ documentComponentOrder: mergedOrder });
  }, [data.customTables, componentOrder, onDataChange]);

  return {
    componentOrder,
    reorderComponents,
    toggleComponentVisibility,
    getOrderedCustomTables,
    initializeOrderFromTables,
  };
}
