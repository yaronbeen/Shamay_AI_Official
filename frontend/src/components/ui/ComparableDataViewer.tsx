"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Search,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { ValuationData } from "@/types/valuation";
import FinalAssetValuation from "../valuation/FinalAssetValuation";

// Analysis result interface for type safety
interface AnalysisResult {
  success: boolean;
  totalComparables: number;
  averagePrice: number;
  medianPrice: number;
  averagePricePerSqm: number;
  medianPricePerSqm: number;
  estimatedValue?: number;
  finalValue?: number;
  estimatedRange?: {
    low: number;
    high: number;
  };
  comparables: ComparableTransaction[];
  priceRange: {
    min: number;
    max: number;
  };
  section52?: unknown;
  warning?: string;
}

interface ComparableDataViewerProps {
  data: ValuationData;
  sessionId?: string;
  onAnalysisComplete?: (analysis: AnalysisResult) => void;
}

interface ComparableTransaction {
  id: number;
  sale_day: string;
  address: string; // From asset_details (street + house_number + city) OR settlement OR 'N/A'
  street?: string; // From asset_details or 'N/A'
  house_number?: string; // From asset_details or 'N/A'
  city?: string; // From asset_details or settlement or 'N/A'
  settlement?: string; // From properties table
  block_of_land?: string; // From properties table
  rooms?: number; // From properties table
  floor?: number; // From properties table
  surface?: number; // From properties table (square meters)
  year_of_constru?: number; // From properties table (year_of_construction)
  sale_value_nis?: number; // From properties table
  estimated_price_ils?: number; // Alias for sale_value_nis
  price_per_sqm?: number; // Calculated as sale_value_nis / surface
  asset_type?: string; // From properties table
  // NEW FIELDS from asset_details (25 additional fields)
  entrance?: number; // כניסה
  apartment_number?: number; // דירה
  arnona_area_sqm?: number; // שטח ברוטו (ארנונה)
  registered_area_sqm?: number; // שטח נטו (רשום)
  shares?: string; // חלק מהמקרקעין
  plot?: number; // מגרש (1/0)
  roof?: number; // גג (1/0)
  storage?: number; // מחסן (1/0)
  yard?: number; // חצר (1/0)
  gallery?: number; // גלריה (1/0)
  parking_spaces?: number; // חניות
  elevator?: string; // מעליות
  total_floors?: number; // מספר קומות
  apartments_in_building?: number; // דירות בבנין
  building_function?: string; // תפקוד בנין
  unit_function?: string; // תפקוד יחידה
  transaction_type?: string; // סוג עסקה
  declared_price_ils?: number; // מחיר מוצהר
  declared_price_usd?: number; // מחיר מוצהר בדולר
  estimated_price_usd?: number; // מחיר מוערך בדולר
  price_per_room?: number; // מחיר לחדר
  rights?: string; // מהות הזכות
  zoning_plan?: string; // תב"ע
}

interface FilterState {
  // Search type
  searchType: "block" | "blockRange" | "street" | "city";

  // Block search (existing + enhanced)
  blockNumber: string;
  blockNumbers: string[]; // Array for multiple blocks
  blockRangeFrom: string;
  blockRangeTo: string;

  // Street/City search (new)
  streetName: string;
  cityName: string;

  // Parcel range (new)
  parcelFrom: string;
  parcelTo: string;

  // Sale value range (new)
  saleValueMin: number | null;
  saleValueMax: number | null;

  // Sale date preset (new)
  saleDatePreset: "all" | "lastYear" | "last2Years" | "last5Years" | "custom";

  // Property type (new)
  propertyType: string; // 'all' or specific type

  // Rooms (new)
  rooms: string; // 'all' or specific number

  // Existing fields
  surfaceMin: number;
  surfaceMax: number;
  yearMin: number;
  yearMax: number;
  dateFrom: string; // Sale date from (YYYY-MM-DD format)
  dateTo: string; // Sale date to (YYYY-MM-DD format)
}

// Column group definitions for toggling visibility
type ColumnGroupKey =
  | "basic"
  | "address"
  | "areas"
  | "building"
  | "amenities"
  | "prices"
  | "legal";

interface ColumnGroup {
  key: ColumnGroupKey;
  label: string;
  icon: string;
  columns: string[];
}

// Configuration constants
const CONFIG = {
  SANITIZATION: {
    MAX_NUMERIC_LENGTH: 10,
    MAX_TEXT_LENGTH: 200,
    MAX_SESSION_ID_LENGTH: 64,
  },
  SEARCH: {
    DEBOUNCE_MS: 500,
    MAX_BLOCK_NUMBERS: 20,
  },
  PERSISTENCE: {
    DEBOUNCE_MS: 1000,
  },
  FILTERS: {
    MIN_CONSTRUCTION_YEAR: 1900,
  },
} as const;

// Input sanitization helpers - defined at module level for performance
const sanitizeNumeric = (input: string): string =>
  input
    .replace(/[^0-9]/g, "")
    .substring(0, CONFIG.SANITIZATION.MAX_NUMERIC_LENGTH);

const sanitizeText = (
  input: string,
  maxLen: number = CONFIG.SANITIZATION.MAX_TEXT_LENGTH,
): string =>
  input
    .substring(0, maxLen)
    .replace(/[<>"'`;\\{}[\]()&|]/g, "")
    .trim();

/**
 * Parse block_of_land format: "GGGGGGG-PPPP-SSS-XX"
 * where G=gush, P=parcel, S=sub-parcel
 */
interface ParsedBlockOfLand {
  block: number | null;
  parcel: number | null;
  subParcel: number | null;
}

const parseBlockOfLand = (
  blockOfLand: string | null | undefined,
): ParsedBlockOfLand => {
  if (!blockOfLand) return { block: null, parcel: null, subParcel: null };

  const parts = blockOfLand.split("-");
  return {
    block: parts[0] ? parseInt(parts[0], 10) || null : null,
    parcel: parts[1] ? parseInt(parts[1], 10) || null : null,
    subParcel: parts[2] ? parseInt(parts[2], 10) || null : null,
  };
};

const COLUMN_GROUPS: ColumnGroup[] = [
  {
    key: "basic",
    label: "בסיסי",
    icon: "🏠",
    // Extended basic columns to show more useful data by default
    columns: [
      "sale_day",
      "address",
      "block_of_land",
      "rooms",
      "floor",
      "surface",
      "year_of_constru",
      "sale_value_nis",
      "price_per_sqm",
      "total_floors",
      "parking_spaces",
      "entrance",
    ],
  },
  {
    key: "address",
    label: "כתובת",
    icon: "📍",
    columns: ["apartment_number", "sub_chelka"],
  },
  {
    key: "areas",
    label: "שטחים",
    icon: "📐",
    columns: ["arnona_area_sqm", "registered_area_sqm", "shares"],
  },
  {
    key: "building",
    label: "בניין",
    icon: "🏗️",
    columns: ["apartments_in_building", "elevator"],
  },
  {
    key: "amenities",
    label: "הצמדות",
    icon: "🏷️",
    columns: ["plot", "roof", "storage", "yard", "gallery"],
  },
  {
    key: "prices",
    label: "מחירים",
    icon: "💰",
    columns: [
      "declared_price_ils",
      "declared_price_usd",
      "estimated_price_usd",
      "price_per_room",
    ],
  },
  {
    key: "legal",
    label: "משפטי",
    icon: "📋",
    columns: [
      "transaction_type",
      "building_function",
      "unit_function",
      "rights",
      "zoning_plan",
    ],
  },
];

export default function ComparableDataViewer({
  data,
  sessionId,
  onAnalysisComplete,
}: ComparableDataViewerProps) {
  // Sanitize session ID for storage key - only allow alphanumeric and hyphens
  const sanitizeSessionId = (id: string | undefined): string => {
    if (!id || typeof id !== "string") return "default";
    const sanitized = id.replace(/[^a-zA-Z0-9-]/g, "").substring(0, 64);
    return sanitized || "default";
  };

  // Generate storage key based on sanitized sessionId
  const storageKey = `comparable-data-${sanitizeSessionId(sessionId)}`;

  // Helper to load persisted state
  const loadPersistedState = () => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : null;
    } catch (err) {
      console.error("Failed to load persisted state:", err);
      return null;
    }
  };

  // Initialize state from localStorage if available
  const persistedState = loadPersistedState();

  // State management
  const [transactions, setTransactions] = useState<ComparableTransaction[]>(
    persistedState?.transactions || [],
  );
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    new Set(persistedState?.selectedIds || []),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    persistedState?.analysisResult || null,
  );
  const [showSection52, setShowSection52] = useState(
    persistedState?.showSection52 || false,
  );
  const [finalPricePerSqm, setFinalPricePerSqm] = useState<number | null>(
    persistedState?.finalPricePerSqm || null,
  );

  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(
    persistedState?.sortColumn || null,
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(
    persistedState?.sortDirection || "desc",
  );

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingCell, setEditingCell] = useState<{
    transactionId: number;
    field: string;
    value: string;
  } | null>(null);

  // Track manually removed rows
  const [removedRowIds, setRemovedRowIds] = useState<Set<number>>(
    new Set(persistedState?.removedRowIds || []),
  );

  // Block filter for results (when searching multiple blocks)
  const [resultBlockFilter, setResultBlockFilter] = useState<string>(
    persistedState?.resultBlockFilter || "all",
  );

  // Helper to update a transaction field
  const updateTransaction = useCallback(
    (transactionId: number, field: string, value: string | number) => {
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === transactionId ? { ...t, [field]: value } : t,
        ),
      );
    },
    [],
  );

  // Helper to remove a row
  const removeRow = useCallback((transactionId: number) => {
    setRemovedRowIds((prev) => new Set([...prev, transactionId]));
    // Also remove from selected if selected
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(transactionId);
      return newSet;
    });
  }, []);

  // Helper to restore a removed row
  const restoreRow = useCallback((transactionId: number) => {
    setRemovedRowIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(transactionId);
      return newSet;
    });
  }, []);

  /**
   * Pre-computed map of transaction IDs to block numbers for O(1) lookups.
   * Uses parseBlockOfLand helper for consistent parsing.
   */
  const transactionBlockMap = useMemo(() => {
    const map = new Map<number, string | null>();
    for (const t of transactions) {
      const { block } = parseBlockOfLand(t.block_of_land);
      map.set(t.id, block !== null ? String(block) : null);
    }
    return map;
  }, [transactions]);

  // Get unique block numbers from transactions EXCLUDING removed rows (for filtering)
  // Uses transactionBlockMap to avoid re-parsing strings
  const uniqueBlocksInResults = useMemo(() => {
    const blocks = new Set<string>();
    for (const t of transactions) {
      if (removedRowIds.has(t.id)) continue;
      const block = transactionBlockMap.get(t.id);
      if (block) blocks.add(block);
    }
    return Array.from(blocks).sort((a, b) => parseInt(a) - parseInt(b));
  }, [transactions, removedRowIds, transactionBlockMap]);

  // Filtered transactions (excludes removed rows and applies block filter)
  // Uses transactionBlockMap for O(1) lookups instead of string parsing
  const visibleTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Exclude removed rows
      if (removedRowIds.has(t.id)) return false;

      // Apply block filter if not "all"
      if (resultBlockFilter !== "all") {
        const blockNum = transactionBlockMap.get(t.id);
        // If no block or doesn't match filter, exclude
        if (!blockNum || blockNum !== resultBlockFilter) return false;
      }

      return true;
    });
  }, [transactions, removedRowIds, resultBlockFilter, transactionBlockMap]);

  // Reset block filter if current selection becomes invalid (e.g., all rows from that block were removed)
  useEffect(() => {
    if (
      resultBlockFilter !== "all" &&
      !uniqueBlocksInResults.includes(resultBlockFilter)
    ) {
      setResultBlockFilter("all");
    }
  }, [uniqueBlocksInResults, resultBlockFilter]);

  // Column visibility state - 'basic' is always visible
  const [visibleGroups, setVisibleGroups] = useState<Set<ColumnGroupKey>>(
    new Set(persistedState?.visibleGroups || ["basic"]),
  );

  // Memoized Set of visible columns for O(1) lookups (avoids O(n*m) iteration in render)
  const visibleColumns = useMemo(() => {
    const columns = new Set<string>();
    for (const group of COLUMN_GROUPS) {
      if (visibleGroups.has(group.key)) {
        for (const col of group.columns) {
          columns.add(col);
        }
      }
    }
    return columns;
  }, [visibleGroups]);

  // Helper to check if a column should be visible (O(1) lookup)
  const isColumnVisible = useCallback(
    (columnName: string): boolean => {
      return visibleColumns.has(columnName);
    },
    [visibleColumns],
  );

  // Toggle a column group
  const toggleColumnGroup = (groupKey: ColumnGroupKey) => {
    if (groupKey === "basic") return; // Basic is always visible
    setVisibleGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  // Pagination
  const [page, setPage] = useState(persistedState?.page || 0);
  const [pageSize] = useState(50);
  const [hasMore, setHasMore] = useState(persistedState?.hasMore || false);

  // Track if data was restored from storage
  const [wasRestored, setWasRestored] = useState(!!persistedState);

  // Hide restored message after a few seconds
  useEffect(() => {
    if (wasRestored) {
      const timer = setTimeout(() => setWasRestored(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [wasRestored]);

  // Extract property data from ValuationData - try multiple sources
  const propertyBlock = useMemo(() => {
    // Try multiple sources for gush (block number)
    // 1. Direct from data.gush
    if (data.gush) return String(data.gush).trim();

    // 2. From extractedData
    const extractedData = (data as any).extractedData;
    if (extractedData?.gush) return String(extractedData.gush).trim();

    // 3. From land registry object
    const landRegistry = (data as any).landRegistry;
    if (landRegistry?.gush) return String(landRegistry.gush).trim();

    // 4. From land_registry nested object
    const landRegistryNested = (data as any).land_registry;
    if (landRegistryNested?.gush) return String(landRegistryNested.gush).trim();

    return "";
  }, [data]);

  // Extract parcel (chelka) from ValuationData - try multiple sources
  const propertyParcel = useMemo(() => {
    // Try multiple sources for parcel (chelka)
    // 1. Direct from data.parcel
    if (data.parcel) return String(data.parcel).trim();

    // 2. From extractedData
    const extractedData = (data as any).extractedData;
    if (extractedData?.parcel) return String(extractedData.parcel).trim();
    if (extractedData?.chelka) return String(extractedData.chelka).trim();

    // 3. From land registry object
    const landRegistry = (data as any).landRegistry;
    if (landRegistry?.parcel) return String(landRegistry.parcel).trim();
    if (landRegistry?.chelka) return String(landRegistry.chelka).trim();

    // 4. From land_registry nested object
    const landRegistryNested = (data as any).land_registry;
    if (landRegistryNested?.parcel)
      return String(landRegistryNested.parcel).trim();
    if (landRegistryNested?.chelka)
      return String(landRegistryNested.chelka).trim();

    return "";
  }, [data]);

  // Extract apartment and balcony areas separately (Section 5.2 calculation logic)
  const apartmentSqm = useMemo(() => {
    // Net apartment area (built area)
    return (
      (data as any).builtArea ||
      (data as any).area ||
      (data as any).registered_area_sqm ||
      (data.extractedData as any)?.builtArea ||
      (data.extractedData as any)?.apartment_registered_area ||
      0
    );
  }, [data]);

  const balconySqm = useMemo(() => {
    // Balcony area (if exists)
    return (
      (data as any).balconyArea ||
      (data as any).balcony_area ||
      (data.extractedData as any)?.balconyArea ||
      (data.extractedData as any)?.balcony_area ||
      0
    );
  }, [data]);

  // Property area for backward compatibility (used in filters)
  const propertyArea = useMemo(() => {
    return apartmentSqm || 0;
  }, [apartmentSqm]);

  const propertyYear = useMemo(() => {
    // Try to extract construction year from permit or land registry
    const year =
      (data as any).year_built ||
      (data as any).construction_year ||
      (data as any).year_of_construction;
    return year ? parseInt(String(year), 10) : new Date().getFullYear();
  }, [data]);

  // Filter state with defaults based on property data
  const [filters, setFilters] = useState<FilterState>(
    persistedState?.filters || {
      // Search type
      searchType: "block",

      // Block search
      blockNumber: propertyBlock,
      blockNumbers: [],
      blockRangeFrom: "",
      blockRangeTo: "",

      // Street/City search
      streetName: "",
      cityName: "",

      // Parcel range
      parcelFrom: "",
      parcelTo: "",

      // Sale value range
      saleValueMin: null,
      saleValueMax: null,

      // Sale date preset
      saleDatePreset: "all",

      // Property type and rooms
      propertyType: "all",
      rooms: "all",

      // Existing fields
      surfaceMin: Math.max(0, propertyArea - 15),
      surfaceMax: propertyArea + 15,
      yearMin: Math.max(1900, propertyYear - 10),
      yearMax: Math.min(new Date().getFullYear(), propertyYear + 10),
      dateFrom: "",
      dateTo: "",
    },
  );

  // State for property types (loaded from API)
  const [propertyTypes, setPropertyTypes] = useState<string[]>([]);

  // Load property types on mount
  useEffect(() => {
    const loadPropertyTypes = async () => {
      try {
        const response = await fetch("/api/asset-details/property-types");
        const result = await response.json();
        if (result.success) {
          setPropertyTypes(result.types || []);
        }
      } catch (err) {
        console.error("Failed to load property types:", err);
      }
    };
    loadPropertyTypes();
  }, []);

  // Ref for debouncing localStorage writes
  const persistTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Persist state to localStorage with debounce (avoids blocking main thread on rapid changes)
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Cancel any pending persist operation
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
    }

    // Debounce localStorage writes by 1000ms to avoid blocking on rapid interactions
    persistTimerRef.current = setTimeout(() => {
      const stateToSave = {
        transactions,
        selectedIds: Array.from(selectedIds),
        removedRowIds: Array.from(removedRowIds),
        resultBlockFilter,
        analysisResult,
        showSection52,
        finalPricePerSqm,
        page,
        hasMore,
        filters,
        sortColumn,
        sortDirection,
        visibleGroups: Array.from(visibleGroups),
        timestamp: new Date().toISOString(),
      };

      try {
        localStorage.setItem(storageKey, JSON.stringify(stateToSave));
      } catch (err) {
        console.error("Failed to persist state:", err);
      }
    }, 1000);

    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
      }
    };
  }, [
    transactions,
    selectedIds,
    removedRowIds,
    resultBlockFilter,
    analysisResult,
    showSection52,
    finalPricePerSqm,
    page,
    hasMore,
    filters,
    sortColumn,
    sortDirection,
    visibleGroups,
    storageKey,
  ]);

  // Helper to calculate date range based on preset
  const getDateRangeFromPreset = (
    preset: string,
  ): { from: string; to: string } => {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    switch (preset) {
      case "lastYear": {
        const yearAgo = new Date(today);
        yearAgo.setFullYear(today.getFullYear() - 1);
        return { from: formatDate(yearAgo), to: formatDate(today) };
      }
      case "last2Years": {
        const twoYearsAgo = new Date(today);
        twoYearsAgo.setFullYear(today.getFullYear() - 2);
        return { from: formatDate(twoYearsAgo), to: formatDate(today) };
      }
      case "last5Years": {
        const fiveYearsAgo = new Date(today);
        fiveYearsAgo.setFullYear(today.getFullYear() - 5);
        return { from: formatDate(fiveYearsAgo), to: formatDate(today) };
      }
      default:
        return { from: "", to: "" };
    }
  };

  // Ref for AbortController to cancel in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounced search function with request cancellation
  const searchTransactions = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          limit: String(pageSize),
          offset: String(page * pageSize),
        });

        // Primary search filters based on search type (with sanitization)
        switch (filters.searchType) {
          case "block":
            if (filters.blockNumber) {
              const sanitized = sanitizeNumeric(filters.blockNumber);
              if (sanitized) params.append("block_number", sanitized);
            }
            break;
          case "blockRange":
            if (filters.blockRangeFrom) {
              const sanitized = sanitizeNumeric(filters.blockRangeFrom);
              if (sanitized) params.append("block_range_from", sanitized);
            }
            if (filters.blockRangeTo) {
              const sanitized = sanitizeNumeric(filters.blockRangeTo);
              if (sanitized) params.append("block_range_to", sanitized);
            }
            break;
          case "street":
            if (filters.streetName) {
              const sanitized = sanitizeText(filters.streetName);
              if (sanitized) params.append("street", sanitized);
            }
            break;
          case "city":
            if (filters.cityName) {
              const sanitized = sanitizeText(filters.cityName, 100);
              if (sanitized) params.append("city", sanitized);
            }
            break;
        }

        // Multiple block numbers (for chips) - with sanitization and limit
        if (filters.blockNumbers && filters.blockNumbers.length > 0) {
          const sanitizedBlocks = filters.blockNumbers
            .map((b) => sanitizeNumeric(b))
            .filter((b) => b.length > 0)
            .slice(0, 20);
          if (sanitizedBlocks.length > 0) {
            params.append("block_numbers", sanitizedBlocks.join(","));
          }
        }

        // Surface area range
        if (filters.surfaceMin > 0)
          params.append("surface_min", String(filters.surfaceMin));
        if (filters.surfaceMax > 0)
          params.append("surface_max", String(filters.surfaceMax));

        // Construction year range
        if (filters.yearMin) params.append("year_min", String(filters.yearMin));
        if (filters.yearMax) params.append("year_max", String(filters.yearMax));

        // Sale date - use preset or custom dates
        if (
          filters.saleDatePreset !== "all" &&
          filters.saleDatePreset !== "custom"
        ) {
          const { from, to } = getDateRangeFromPreset(filters.saleDatePreset);
          if (from) params.append("sale_date_from", from);
          if (to) params.append("sale_date_to", to);
        } else if (filters.saleDatePreset === "custom") {
          if (filters.dateFrom)
            params.append("sale_date_from", filters.dateFrom);
          if (filters.dateTo) params.append("sale_date_to", filters.dateTo);
        }

        // Sale value range
        if (filters.saleValueMin !== null && filters.saleValueMin > 0) {
          params.append("sale_value_min", String(filters.saleValueMin));
        }
        if (filters.saleValueMax !== null && filters.saleValueMax > 0) {
          params.append("sale_value_max", String(filters.saleValueMax));
        }

        // Property type (sanitize to prevent injection)
        if (filters.propertyType && filters.propertyType !== "all") {
          params.append("asset_type", sanitizeText(filters.propertyType, 50));
        }

        // Rooms (sanitize to numeric only)
        if (filters.rooms && filters.rooms !== "all") {
          const sanitized = sanitizeNumeric(filters.rooms);
          if (sanitized) params.append("rooms", sanitized);
        }

        // Parcel range (sanitize to alphanumeric)
        if (filters.parcelFrom) {
          const sanitized = sanitizeNumeric(filters.parcelFrom);
          if (sanitized) params.append("parcel_from", sanitized);
        }
        if (filters.parcelTo) {
          const sanitized = sanitizeNumeric(filters.parcelTo);
          if (sanitized) params.append("parcel_to", sanitized);
        }

        console.log("🔍 Searching with params:", Object.fromEntries(params));

        const response = await fetch(
          `/api/asset-details/search?${params.toString()}`,
          { signal },
        );

        // Check if request was aborted before processing response
        if (signal?.aborted) return;

        const result = await response.json();

        if (result.success) {
          // Debug: Log first transaction to inspect data structure
          if (result.data && result.data.length > 0) {
            console.log("🔍 First transaction data:", result.data[0]);
            console.log("💰 Price fields:", {
              estimated_price_ils: result.data[0].estimated_price_ils,
              sale_value_nis: result.data[0].sale_value_nis,
              price_per_sqm: result.data[0].price_per_sqm,
            });
          }
          setTransactions(result.data || []);
          setHasMore(result.pagination?.hasMore || false);
          // Reset block filter when new results arrive
          setResultBlockFilter("all");

          if (result.data.length === 0) {
            setError(
              "לא נמצאו עסקאות בגוש זה. ניתן להרחיב את טווח השטח או שנת הבנייה.",
            );
          }
        } else {
          setError(result.error || "שגיאה בטעינת הנתונים");
        }
      } catch (err) {
        // Ignore AbortError - request was cancelled intentionally
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        console.error("❌ Search failed:", err);
        setError("שגיאה בחיפוש עסקאות");
      } finally {
        setIsLoading(false);
      }
    },
    [filters, page, pageSize],
  );

  // Debounce search (500ms delay) with request cancellation to prevent race conditions
  useEffect(() => {
    // Cancel any previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(() => {
      searchTransactions(controller.signal);
    }, 500);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchTransactions]);

  // Initial load based on property data - update filters when data changes
  useEffect(() => {
    if (propertyBlock) {
      setFilters((prev) => {
        // Only update if the block number is different and not empty
        if (prev.blockNumber !== propertyBlock && propertyBlock.trim() !== "") {
          return { ...prev, blockNumber: propertyBlock };
        }
        return prev;
      });
    }
  }, [propertyBlock]);

  // Also update when component mounts or data changes significantly
  useEffect(() => {
    // If filters are empty and we have data, populate them
    if (!filters.blockNumber && propertyBlock) {
      setFilters((prev) => ({ ...prev, blockNumber: propertyBlock }));
    }
  }, []); // Run once on mount

  // Toggle selection
  const toggleSelection = (id: number) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Select/deselect all (only visible transactions)
  const selectAll = () => {
    // Only select visible transactions (respects removed rows and block filter)
    const visibleIds = visibleTransactions.map((t) => t.id);
    setSelectedIds(new Set(visibleIds));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  // Calculate median
  const calculateMedian = (values: number[]): number => {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  };

  // Analyze selected transactions
  const analyzeSelected = async () => {
    if (selectedIds.size === 0) {
      setError("נא לבחור לפחות עסקה אחת לניתוח");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/asset-details/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedIds: Array.from(selectedIds),
          propertyArea, // For backward compatibility
          apartmentSqm: apartmentSqm || null, // Net apartment area
          balconySqm: balconySqm || null, // Balcony area (if exists)
          balconyCoef: 0.5, // Default coefficient (can be changed in Section 5.2)
        }),
      });

      const result = await response.json();

      if (result.success) {
        setAnalysisResult(result);
        // Parse numeric values safely (handles strings from backend)
        const avgPricePerSqm =
          typeof result.averagePricePerSqm === "string"
            ? parseFloat(result.averagePricePerSqm.trim())
            : typeof result.averagePricePerSqm === "number"
              ? result.averagePricePerSqm
              : null;
        const medPricePerSqm =
          typeof result.medianPricePerSqm === "string"
            ? parseFloat(result.medianPricePerSqm.trim())
            : typeof result.medianPricePerSqm === "number"
              ? result.medianPricePerSqm
              : null;
        setFinalPricePerSqm(avgPricePerSqm || medPricePerSqm || null);

        // Parse estimatedValue (finalValue) safely
        const estimatedValue =
          typeof result.estimatedValue === "string"
            ? parseFloat(result.estimatedValue.trim())
            : typeof result.estimatedValue === "number"
              ? result.estimatedValue
              : null;

        // Ensure estimatedValue is included in the result passed to parent
        const resultWithFinalValue = {
          ...result,
          estimatedValue: estimatedValue || result.estimatedValue || null,
          finalValue: estimatedValue || result.estimatedValue || null, // Also include as finalValue for compatibility
        };

        if (onAnalysisComplete) {
          onAnalysisComplete(resultWithFinalValue);
        }
      } else {
        setError(result.error || "שגיאה בניתוח הנתונים");
      }
    } catch (err) {
      console.error("❌ Analysis failed:", err);
      setError("שגיאה בניתוח העסקאות");
    } finally {
      setIsLoading(false);
    }
  };

  // Proceed to Section 5.2
  const proceedToSection52 = () => {
    if (!finalPricePerSqm) {
      setError("נא לבצע ניתוח תחילה");
      return;
    }
    setShowSection52(true);
  };

  // Export transactions to CSV
  const exportToCSV = () => {
    try {
      if (transactions.length === 0) {
        toast.error("אין נתונים לייצוא");
        return;
      }

      // Define all columns for export (Hebrew headers for Excel compatibility)
      const headers = [
        "id",
        "יום מכירה",
        "כתובת",
        "גוש/חלקה",
        "חדרים",
        "קומה",
        'שטח (מ"ר)',
        "שנת בנייה",
        "מחיר מכירה",
        'מחיר למ"ר',
        "כניסה",
        "דירה",
        "תת חלקה",
        "שטח ברוטו",
        "שטח נטו",
        "חלק מקרקעין",
        "קומות בבניין",
        "דירות בבניין",
        "מעלית",
        "חניות",
        "מגרש",
        "גג",
        "מחסן",
        "חצר",
        "גלריה",
        "מחיר מוצהר",
        "מחיר מוצהר $",
        "מחיר מוערך $",
        "מחיר לחדר",
        "סוג עסקה",
        "תפקוד בניין",
        "תפקוד יחידה",
        "מהות זכות",
        'תב"ע',
      ];

      // Map transactions to CSV rows
      const rows = sortedTransactions.map((t) =>
        [
          t.id,
          t.sale_day || "",
          t.address || "",
          t.block_of_land || "",
          t.rooms ?? "",
          t.floor ?? "",
          t.surface ?? "",
          t.year_of_constru || "",
          t.sale_value_nis ?? t.estimated_price_ils ?? "",
          t.price_per_sqm ?? "",
          t.entrance ?? "",
          t.apartment_number ?? "",
          formatSubChelka(t.block_of_land),
          t.arnona_area_sqm ?? "",
          t.registered_area_sqm ?? "",
          t.shares || "",
          t.total_floors ?? "",
          t.apartments_in_building ?? "",
          t.elevator || "",
          t.parking_spaces ?? "",
          t.plot ?? "",
          t.roof ?? "",
          t.storage ?? "",
          t.yard ?? "",
          t.gallery ?? "",
          t.declared_price_ils ?? "",
          t.declared_price_usd ?? "",
          t.estimated_price_usd ?? "",
          t.price_per_room ?? "",
          t.transaction_type || "",
          t.building_function || "",
          t.unit_function || "",
          t.rights || "",
          t.zoning_plan || "",
        ].map((cell) => {
          // Escape quotes and wrap in quotes for CSV
          const cellStr = String(cell ?? "");
          return `"${cellStr.replace(/"/g, '""')}"`;
        }),
      );

      // Create CSV content with BOM for Hebrew support in Excel
      const csvContent = [
        headers.map((h) => `"${h}"`).join(","),
        ...rows.map((row) => row.join(",")),
      ].join("\n");

      // Add BOM for UTF-8 encoding (Excel Hebrew support)
      const blob = new Blob(["\ufeff" + csvContent], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `comparable-data-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("הקובץ יורד...");
    } catch (error) {
      console.error("CSV export failed:", error);
      toast.error("שגיאה בייצוא הנתונים");
    }
  };

  // Clear persisted state and reset
  const clearPersistedData = () => {
    if (typeof window === "undefined") return;

    try {
      localStorage.removeItem(storageKey);
      console.log("🗑️ Persisted state cleared");

      // Reset all state to defaults
      setTransactions([]);
      setSelectedIds(new Set());
      setAnalysisResult(null);
      setShowSection52(false);
      setFinalPricePerSqm(null);
      setPage(0);
      setHasMore(false);
      setFilters({
        searchType: "block",
        blockNumber: propertyBlock,
        blockNumbers: [],
        blockRangeFrom: "",
        blockRangeTo: "",
        streetName: "",
        cityName: "",
        parcelFrom: "",
        parcelTo: "",
        saleValueMin: null,
        saleValueMax: null,
        saleDatePreset: "all",
        propertyType: "all",
        rooms: "all",
        surfaceMin: Math.max(0, propertyArea - 15),
        surfaceMax: propertyArea + 15,
        yearMin: Math.max(1900, propertyYear - 10),
        yearMax: Math.min(new Date().getFullYear() + 5, propertyYear + 10),
        dateFrom: "",
        dateTo: "",
      });
      setSortColumn(null);
      setSortDirection("desc");
      setError(null);
      setWasRestored(false);
    } catch (err) {
      console.error("Failed to clear persisted state:", err);
    }
  };

  // Format price
  const formatPrice = (price: number | string | null | undefined): string => {
    // Handle null/undefined/empty string
    if (price === null || price === undefined || price === "") {
      console.debug("🔍 formatPrice: null/undefined/empty", price);
      return "N/A";
    }

    // Convert string to number if needed (handles "0", "null", etc.)
    let numPrice: number;
    if (typeof price === "string") {
      const trimmed = price.trim();
      if (
        trimmed === "" ||
        trimmed.toLowerCase() === "null" ||
        trimmed.toLowerCase() === "undefined"
      ) {
        console.debug("🔍 formatPrice: invalid string", price);
        return "N/A";
      }
      numPrice = parseFloat(trimmed);
    } else {
      numPrice = price;
    }

    // Check if valid number
    if (!Number.isFinite(numPrice) || numPrice <= 0 || isNaN(numPrice)) {
      console.debug("🔍 formatPrice: invalid number", {
        price,
        numPrice,
        isFinite: Number.isFinite(numPrice),
      });
      return "N/A";
    }

    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numPrice);
  };

  // Format date
  const formatDate = (date: string | null | undefined): string => {
    if (!date) return "N/A";
    try {
      return new Date(date).toLocaleDateString("he-IL");
    } catch {
      return date;
    }
  };

  // Format parcel ID (block_of_land) from "006770-0049-014-00" to "6770/49"
  const formatParcelId = (parcelId: string | null | undefined): string => {
    if (!parcelId) return "N/A";
    const { block, parcel } = parseBlockOfLand(parcelId);
    if (block === null || parcel === null) return parcelId;
    return `${block}/${parcel}`;
  };

  // Format sub-chelka from block_of_land "006770-0049-014-00" -> "14"
  const formatSubChelka = (parcelId: string | null | undefined): string => {
    const { subParcel } = parseBlockOfLand(parcelId);
    return subParcel !== null && subParcel !== 0 ? String(subParcel) : "-";
  };

  // Format boolean fields (1/0 or true/false) to כן/לא
  const formatBoolean = (
    value: number | boolean | null | undefined,
  ): string => {
    if (value === null || value === undefined) return "-";
    return value === 1 || value === true ? "כן" : "לא";
  };

  // Format USD price
  const formatPriceUSD = (
    price: number | string | null | undefined,
  ): string => {
    if (price === null || price === undefined || price === "") return "-";
    let numPrice: number;
    if (typeof price === "string") {
      const trimmed = price.trim();
      if (trimmed === "" || trimmed.toLowerCase() === "null") return "-";
      numPrice = parseFloat(trimmed);
    } else {
      numPrice = price;
    }
    if (!Number.isFinite(numPrice) || numPrice <= 0 || isNaN(numPrice))
      return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numPrice);
  };

  // Handle column sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new column and default to descending
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  // Sort transactions based on current sort state
  const sortedTransactions = useMemo(() => {
    if (!sortColumn) return visibleTransactions;

    const sorted = [...visibleTransactions].sort((a, b) => {
      let aValue: any = a[sortColumn as keyof ComparableTransaction];
      let bValue: any = b[sortColumn as keyof ComparableTransaction];

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) aValue = "";
      if (bValue === null || bValue === undefined) bValue = "";

      // Special handling for different column types
      switch (sortColumn) {
        case "sale_day":
          // Sort by date
          const aDate = aValue ? new Date(aValue).getTime() : 0;
          const bDate = bValue ? new Date(bValue).getTime() : 0;
          return sortDirection === "asc" ? aDate - bDate : bDate - aDate;

        case "price_per_sqm":
        case "sale_value_nis":
        case "estimated_price_ils":
        case "surface":
        case "rooms":
        case "floor":
        case "year_of_constru":
        case "entrance":
        case "apartment_number":
        case "arnona_area_sqm":
        case "registered_area_sqm":
        case "parking_spaces":
        case "total_floors":
        case "apartments_in_building":
        case "declared_price_ils":
        case "declared_price_usd":
        case "estimated_price_usd":
        case "price_per_room":
        case "plot":
        case "roof":
        case "storage":
        case "yard":
        case "gallery":
          // Sort by number
          const aNum =
            typeof aValue === "string" ? parseFloat(aValue) || 0 : aValue || 0;
          const bNum =
            typeof bValue === "string" ? parseFloat(bValue) || 0 : bValue || 0;
          return sortDirection === "asc" ? aNum - bNum : bNum - aNum;

        case "address":
        case "city":
        case "settlement":
        case "street":
        case "asset_type":
        case "block_of_land":
        case "shares":
        case "elevator":
        case "building_function":
        case "unit_function":
        case "transaction_type":
        case "rights":
        case "zoning_plan":
          // Sort by string (case-insensitive)
          const aStr = String(aValue || "").toLowerCase();
          const bStr = String(bValue || "").toLowerCase();
          if (sortDirection === "asc") {
            return aStr.localeCompare(bStr, "he");
          } else {
            return bStr.localeCompare(aStr, "he");
          }

        default:
          // Default string comparison
          const aDefault = String(aValue || "").toLowerCase();
          const bDefault = String(bValue || "").toLowerCase();
          if (sortDirection === "asc") {
            return aDefault.localeCompare(bDefault, "he");
          } else {
            return bDefault.localeCompare(aDefault, "he");
          }
      }
    });

    return sorted;
  }, [visibleTransactions, sortColumn, sortDirection]);

  // Render sort indicator icon
  const renderSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <span className="text-gray-400 text-xs">↕</span>;
    }
    return sortDirection === "asc" ? (
      <span className="text-blue-600 text-xs">↑</span>
    ) : (
      <span className="text-blue-600 text-xs">↓</span>
    );
  };

  // Editable cell component for inline editing
  const EditableCell = ({
    transactionId,
    field,
    value,
    type = "text",
    formatter,
    className = "",
  }: {
    transactionId: number;
    field: string;
    value: string | number | null | undefined;
    type?: "text" | "number";
    formatter?: (val: any) => string;
    className?: string;
  }) => {
    const isEditing =
      editingCell?.transactionId === transactionId &&
      editingCell?.field === field;

    const displayValue = formatter ? formatter(value) : (value ?? "-");

    if (!isEditMode) {
      return <span className={className}>{displayValue}</span>;
    }

    if (isEditing) {
      return (
        <input
          type={type}
          autoFocus
          defaultValue={value ?? ""}
          className="w-full px-1 py-0.5 text-sm border border-orange-400 rounded bg-orange-50 focus:outline-none focus:ring-1 focus:ring-orange-500"
          onBlur={(e) => {
            const newValue =
              type === "number"
                ? parseFloat(e.target.value) || 0
                : e.target.value;
            updateTransaction(transactionId, field, newValue);
            setEditingCell(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const newValue =
                type === "number"
                  ? parseFloat((e.target as HTMLInputElement).value) || 0
                  : (e.target as HTMLInputElement).value;
              updateTransaction(transactionId, field, newValue);
              setEditingCell(null);
            } else if (e.key === "Escape") {
              setEditingCell(null);
            }
          }}
          onClick={(e) => e.stopPropagation()}
        />
      );
    }

    return (
      <span
        className={`${className} cursor-pointer hover:bg-orange-100 px-1 rounded border border-transparent hover:border-orange-300`}
        onClick={(e) => {
          e.stopPropagation();
          setEditingCell({
            transactionId,
            field,
            value: String(value ?? ""),
          });
        }}
        title="לחץ לעריכה"
      >
        {displayValue}
      </span>
    );
  };

  // If showing Section 5.2, render that instead
  if (showSection52 && finalPricePerSqm) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setShowSection52(false)}
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-2"
        >
          ← חזרה לנתוני השוואה
        </button>

        <FinalAssetValuation
          finalPricePerSqm={finalPricePerSqm}
          apartmentSqm={propertyArea}
          balconySqm={(data as any).balcony_area || 0}
          propertyDescription={(data as any).address || "נכס נשוא השומה"}
          onValuationComplete={(valuation) => {
            console.log("✅ Section 5.2 complete:", valuation);
            if (onAnalysisComplete && analysisResult) {
              // Ensure estimatedValue/finalValue is preserved when section52 completes
              // Priority: section52.asset_value_nis > analysisResult.estimatedValue > analysisResult.finalValue
              const finalValue =
                valuation.asset_value_nis ||
                analysisResult.estimatedValue ||
                analysisResult.finalValue;
              onAnalysisComplete({
                ...analysisResult,
                estimatedValue: finalValue,
                finalValue: finalValue, // Also include as finalValue for compatibility
                section52: valuation,
              } as AnalysisResult);
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Search className="w-5 h-5" />
          נתוני השוואה מהמאגר
        </h3>

        {(transactions.length > 0 || analysisResult) && (
          <button
            onClick={clearPersistedData}
            className="text-xs px-3 py-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md border border-red-200 flex items-center gap-1"
            title="אפס נתונים והתחל מחדש"
          >
            <X className="w-3 h-3" />
            התחל מחדש
          </button>
        )}
      </div>

      {/* Restored Data Indicator */}
      {wasRestored && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm">
          <CheckCircle className="w-4 h-4" />
          <span>הנתונים שוחזרו בהצלחה מהשמירה הקודמת</span>
        </div>
      )}

      {/* Enhanced Filter Bar - wrapped in form for accessibility */}
      <form
        className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          // Search is triggered automatically via debounce
        }}
        role="search"
        aria-label="חיפוש עסקאות השוואה"
      >
        {/* Search Type Selector */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-shrink-0">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              חיפוש נוסף
            </label>
            <select
              value={filters.searchType}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  searchType: e.target.value as FilterState["searchType"],
                  // Clear search fields when changing type
                  blockNumber:
                    e.target.value === "block" ? prev.blockNumber : "",
                  blockRangeFrom: "",
                  blockRangeTo: "",
                  streetName: "",
                  cityName: "",
                }))
              }
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="block">לפי גוש</option>
              <option value="blockRange">לפי טווח גושים</option>
              <option value="street">לפי רחוב</option>
              <option value="city">לפי יישוב</option>
            </select>
          </div>

          {/* Dynamic Search Input based on type */}
          <div className="flex-1 min-w-[200px]">
            {filters.searchType === "block" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <span className="text-red-600">*</span> גוש
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={filters.blockNumber || ""}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        blockNumber: e.target.value,
                      }))
                    }
                    placeholder={
                      propertyBlock ? `מספר גוש (${propertyBlock})` : "מספר גוש"
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        filters.blockNumber &&
                        !filters.blockNumbers.includes(filters.blockNumber)
                      ) {
                        setFilters((prev) => ({
                          ...prev,
                          blockNumbers: [
                            ...prev.blockNumbers,
                            prev.blockNumber,
                          ],
                          blockNumber: "",
                        }));
                      }
                    }}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                  >
                    + הוסף
                  </button>
                </div>
                {propertyBlock &&
                  !filters.blockNumber &&
                  filters.blockNumbers.length === 0 && (
                    <p className="text-xs text-blue-600 mt-1">
                      📋 נשלף מהדיבי: {propertyBlock}
                    </p>
                  )}
              </div>
            )}

            {filters.searchType === "blockRange" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <span className="text-red-600">*</span> טווח גושים
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={filters.blockRangeFrom}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        blockRangeFrom: e.target.value,
                      }))
                    }
                    placeholder="מגוש"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="text-gray-500">עד</span>
                  <input
                    type="text"
                    value={filters.blockRangeTo}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        blockRangeTo: e.target.value,
                      }))
                    }
                    placeholder="עד גוש"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {filters.searchType === "street" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <span className="text-red-600">*</span> רחוב
                </label>
                <input
                  type="text"
                  value={filters.streetName}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      streetName: e.target.value,
                    }))
                  }
                  placeholder="שם הרחוב"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            {filters.searchType === "city" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <span className="text-red-600">*</span> יישוב
                </label>
                <input
                  type="text"
                  value={filters.cityName}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      cityName: e.target.value,
                    }))
                  }
                  placeholder="שם היישוב"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Block Chips (for multiple blocks) - Always visible when searchType is block */}
        {filters.searchType === "block" && (
          <div className="flex flex-wrap gap-2 p-3 bg-blue-50 rounded-md border border-blue-200">
            <span className="text-sm font-medium text-blue-700 self-center">
              גושים נבחרים (
              {filters.blockNumbers.length + (filters.blockNumber ? 1 : 0)}):
            </span>
            {/* Show current input as a chip if it exists */}
            {filters.blockNumber && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-200 text-blue-900 rounded-md text-sm font-medium border border-blue-300">
                {filters.blockNumber}
                <span className="text-blue-600 text-xs">(נוכחי)</span>
              </span>
            )}
            {/* Show added blocks as chips */}
            {filters.blockNumbers.map((block, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm"
              >
                {block}
                <button
                  type="button"
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      blockNumbers: prev.blockNumbers.filter(
                        (_, i) => i !== index,
                      ),
                    }))
                  }
                  className="text-blue-600 hover:text-blue-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {filters.blockNumbers.length === 0 && !filters.blockNumber && (
              <span className="text-sm text-blue-500 italic">
                הזן מספר גוש ולחץ "+ הוסף" לחיפוש במספר גושים
              </span>
            )}
          </div>
        )}

        {/* Filters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* תאריך מכירה (Sale Date) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              תאריך מכירה
            </label>
            <select
              value={filters.saleDatePreset}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  saleDatePreset: e.target
                    .value as FilterState["saleDatePreset"],
                  dateFrom: e.target.value === "custom" ? prev.dateFrom : "",
                  dateTo: e.target.value === "custom" ? prev.dateTo : "",
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="all">הכל</option>
              <option value="lastYear">שנה אחרונה</option>
              <option value="last2Years">שנתיים אחרונות</option>
              <option value="last5Years">5 שנים אחרונות</option>
              <option value="custom">טווח מותאם</option>
            </select>
            {filters.saleDatePreset === "custom" && (
              <div className="flex gap-2 mt-2">
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      dateFrom: e.target.value,
                    }))
                  }
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-md"
                  placeholder="מתאריך"
                />
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, dateTo: e.target.value }))
                  }
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-md"
                  placeholder="עד תאריך"
                />
              </div>
            )}
          </div>

          {/* שווי מכירה (Sale Value) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              שווי מכירה (₪)
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                value={filters.saleValueMin || ""}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    saleValueMin: e.target.value
                      ? parseFloat(e.target.value)
                      : null,
                  }))
                }
                placeholder="מ"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-gray-500">-</span>
              <input
                type="number"
                value={filters.saleValueMax || ""}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    saleValueMax: e.target.value
                      ? parseFloat(e.target.value)
                      : null,
                  }))
                }
                placeholder="עד"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* סוג נכס (Property Type) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              סוג נכס
            </label>
            <select
              value={filters.propertyType}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  propertyType: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="all">הכל</option>
              {propertyTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* מספר חדרים (Rooms) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              מספר חדרים
            </label>
            <select
              value={filters.rooms}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, rooms: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="all">הכל</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5+</option>
            </select>
          </div>

          {/* חלקה (Parcel Range) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              חלקה
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={filters.parcelFrom}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    parcelFrom: e.target.value,
                  }))
                }
                placeholder="מחלקה"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-gray-500">-</span>
              <input
                type="text"
                value={filters.parcelTo}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, parcelTo: e.target.value }))
                }
                placeholder="עד"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* שטח (Surface Area) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              שטח (מ"ר)
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                value={filters.surfaceMin}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    surfaceMin: parseFloat(e.target.value) || 0,
                  }))
                }
                placeholder="מ"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-gray-500">-</span>
              <input
                type="number"
                value={filters.surfaceMax}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    surfaceMax: parseFloat(e.target.value) || 0,
                  }))
                }
                placeholder="עד"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* שנת בנייה (Construction Year) */}
          <div className="min-w-0 overflow-hidden">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              שנת בנייה
            </label>
            <div className="flex gap-1 items-center">
              <input
                type="number"
                value={filters.yearMin}
                min={1900}
                max={new Date().getFullYear()}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  const currentYear = new Date().getFullYear();
                  const clampedValue = Math.max(
                    1900,
                    Math.min(currentYear, value || 1900),
                  );
                  setFilters((prev) => ({
                    ...prev,
                    yearMin: clampedValue,
                  }));
                }}
                placeholder="מ"
                className="flex-1 min-w-[60px] max-w-[80px] px-2 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <span className="text-gray-500 flex-shrink-0">-</span>
              <input
                type="number"
                value={filters.yearMax}
                min={1900}
                max={new Date().getFullYear()}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  const currentYear = new Date().getFullYear();
                  const clampedValue = Math.max(
                    1900,
                    Math.min(currentYear, value || currentYear),
                  );
                  setFilters((prev) => ({
                    ...prev,
                    yearMax: clampedValue,
                  }));
                }}
                placeholder="עד"
                className="flex-1 min-w-[60px] max-w-[80px] px-2 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="mt-3 text-xs text-gray-600">
          💡 המערכת תחפש עסקאות דומות לפי הפילטרים שהוגדרו
        </div>
      </form>

      {/* Error Message */}
      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between"
        >
          <div className="flex items-center gap-2 text-yellow-700">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-yellow-500 hover:text-yellow-700"
            aria-label="סגור הודעה"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="mr-2 text-sm text-gray-600">טוען עסקאות...</span>
        </div>
      )}

      {/* Empty State - No Search Yet */}
      {!isLoading && transactions.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50 rounded-lg border border-gray-200">
          <Search className="w-12 h-12 text-gray-300 mb-4" />
          <h4 className="text-lg font-medium text-gray-600 mb-2">
            לא בוצע חיפוש עדיין
          </h4>
          <p className="text-sm text-gray-500 max-w-md">
            הזן מספר גוש או בחר קריטריונים לחיפוש בפילטרים למעלה כדי למצוא
            עסקאות השוואה
          </p>
          {!filters.blockNumber &&
            !filters.streetName &&
            !filters.cityName &&
            filters.blockNumbers.length === 0 && (
              <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                נא למלא לפחות שדה חיפוש אחד
              </p>
            )}
        </div>
      )}

      {/* Empty State - Filter Results in No Visible Transactions */}
      {!isLoading &&
        transactions.length > 0 &&
        visibleTransactions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-amber-50 rounded-lg border border-amber-200">
            <SlidersHorizontal className="w-12 h-12 text-amber-300 mb-4" />
            <h4 className="text-lg font-medium text-amber-700 mb-2">
              אין עסקאות התואמות לסינון
            </h4>
            <p className="text-sm text-amber-600 max-w-md mb-4">
              {resultBlockFilter !== "all"
                ? `לא נמצאו עסקאות בגוש ${resultBlockFilter} לאחר החרגות`
                : "כל העסקאות הוסתרו. לחץ על 'שחזר שורות' להחזרתן."}
            </p>
            <div className="flex gap-2">
              {resultBlockFilter !== "all" && (
                <button
                  onClick={() => setResultBlockFilter("all")}
                  className="px-4 py-2 text-sm bg-amber-100 text-amber-700 rounded hover:bg-amber-200"
                >
                  הצג כל הגושים
                </button>
              )}
              {removedRowIds.size > 0 && (
                <button
                  onClick={() => setRemovedRowIds(new Set())}
                  className="px-4 py-2 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                >
                  שחזר {removedRowIds.size} שורות
                </button>
              )}
            </div>
          </div>
        )}

      {/* Results Table */}
      {!isLoading && transactions.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h4 className="font-semibold text-gray-900">
                נמצאו {visibleTransactions.length} עסקאות
                {removedRowIds.size > 0 && (
                  <span className="text-sm font-normal text-gray-500 mr-1">
                    ({removedRowIds.size} הוסתרו)
                  </span>
                )}
                {hasMore ? "+" : ""}
              </h4>
              {/* Edit Mode Toggle */}
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className={`text-xs px-3 py-1 rounded flex items-center gap-1 ${
                  isEditMode
                    ? "bg-orange-500 text-white hover:bg-orange-600"
                    : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                }`}
                title={
                  isEditMode
                    ? "צא ממצב עריכה"
                    : "מצב עריכה - ערוך תאים, מחק שורות"
                }
              >
                {isEditMode ? "✓ סיים עריכה" : "✎ ערוך טבלה"}
              </button>

              {/* Block filter dropdown - show when multiple blocks in results */}
              {uniqueBlocksInResults.length > 1 && (
                <div className="flex items-center gap-1">
                  <label
                    htmlFor="result-block-filter"
                    className="text-xs text-gray-600"
                  >
                    סנן גוש:
                  </label>
                  <select
                    id="result-block-filter"
                    value={resultBlockFilter}
                    onChange={(e) => setResultBlockFilter(e.target.value)}
                    className="text-xs px-2 py-1 border border-gray-300 rounded bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    aria-label="סנן תוצאות לפי גוש"
                  >
                    <option value="all">
                      כל הגושים ({uniqueBlocksInResults.length})
                    </option>
                    {uniqueBlocksInResults.map((block) => (
                      <option key={block} value={block}>
                        גוש {block}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {/* Restore removed rows button */}
              {removedRowIds.size > 0 && (
                <button
                  onClick={() => setRemovedRowIds(new Set())}
                  className="text-xs px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                  title="שחזר את כל השורות שהוסתרו"
                >
                  שחזר {removedRowIds.size} שורות
                </button>
              )}
              <button
                onClick={exportToCSV}
                disabled={transactions.length === 0}
                className={`text-xs px-3 py-1 rounded ${
                  transactions.length === 0
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-green-100 text-green-700 hover:bg-green-200"
                }`}
                title="ייצא לקובץ CSV לעריכה באקסל"
              >
                ייצא CSV
              </button>
              <button
                onClick={selectAll}
                className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                בחר הכל
              </button>
              <button
                onClick={deselectAll}
                className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                בטל הכל
              </button>
            </div>
          </div>

          {/* Column Group Toggles */}
          <div className="flex flex-wrap gap-2 mb-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
            <span className="text-xs text-gray-500 self-center ml-2">
              עמודות:
            </span>
            {COLUMN_GROUPS.map((group) => {
              const isActive = visibleGroups.has(group.key);
              const isBasic = group.key === "basic";
              return (
                <button
                  key={group.key}
                  onClick={() => toggleColumnGroup(group.key)}
                  disabled={isBasic}
                  aria-label={`${isActive ? "הסתר" : "הצג"} עמודות ${group.label}`}
                  aria-pressed={isActive}
                  className={`
                    text-xs px-3 py-1.5 rounded-full flex items-center gap-1 transition-all
                    ${
                      isBasic
                        ? "bg-blue-600 text-white cursor-default"
                        : isActive
                          ? "bg-blue-500 text-white hover:bg-blue-600"
                          : "bg-white text-gray-600 border border-gray-300 hover:border-blue-400 hover:text-blue-600"
                    }
                  `}
                  title={
                    isBasic
                      ? "עמודות בסיסיות (תמיד מוצגות)"
                      : `לחץ להצגת/הסתרת ${group.label}`
                  }
                >
                  <span aria-hidden="true">{group.icon}</span>
                  <span>{group.label}</span>
                  {!isBasic && (
                    <span
                      className={`text-[10px] ${isActive ? "text-blue-200" : "text-gray-400"}`}
                      aria-hidden="true"
                    >
                      {isActive ? "✓" : "+"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="border rounded-lg overflow-hidden relative">
            {/* Mobile scroll indicator */}
            <div className="md:hidden absolute top-0 left-0 bottom-0 w-6 bg-gradient-to-r from-transparent to-gray-200/80 pointer-events-none z-30 flex items-center">
              <span className="text-gray-400 text-[10px] transform -rotate-90 whitespace-nowrap">
                גלול ←
              </span>
            </div>
            <div className="max-h-96 overflow-auto scrollbar-thin scrollbar-thumb-gray-300">
              <table className="min-w-max text-sm" dir="rtl">
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr className="text-right whitespace-nowrap">
                    {/* Delete action column - only in edit mode */}
                    {isEditMode && (
                      <th className="p-2 w-10 bg-orange-100 text-orange-700 text-xs sticky right-0 z-20">
                        מחק
                      </th>
                    )}
                    {/* Checkbox - always visible */}
                    <th
                      className={`p-2 w-12 bg-gray-100 z-20 ${isEditMode ? "sticky right-10" : "sticky right-0"}`}
                    >
                      בחירה
                    </th>

                    {/* BASIC GROUP */}
                    {isColumnVisible("sale_day") && (
                      <th
                        className="p-2 cursor-pointer hover:bg-gray-200 select-none"
                        onClick={() => handleSort("sale_day")}
                      >
                        <div className="flex items-center justify-end gap-1">
                          יום מכירה{renderSortIcon("sale_day")}
                        </div>
                      </th>
                    )}
                    {isColumnVisible("address") && (
                      <th
                        className="p-2 cursor-pointer hover:bg-gray-200 select-none"
                        onClick={() => handleSort("address")}
                      >
                        <div className="flex items-center justify-end gap-1">
                          כתובת{renderSortIcon("address")}
                        </div>
                      </th>
                    )}
                    {isColumnVisible("block_of_land") && (
                      <th
                        className="p-2 cursor-pointer hover:bg-gray-200 select-none"
                        onClick={() => handleSort("block_of_land")}
                      >
                        <div className="flex items-center justify-end gap-1">
                          גוש/חלקה{renderSortIcon("block_of_land")}
                        </div>
                      </th>
                    )}
                    {isColumnVisible("rooms") && (
                      <th
                        className="p-2 cursor-pointer hover:bg-gray-200 select-none"
                        onClick={() => handleSort("rooms")}
                      >
                        <div className="flex items-center justify-end gap-1">
                          חדרים{renderSortIcon("rooms")}
                        </div>
                      </th>
                    )}
                    {isColumnVisible("floor") && (
                      <th
                        className="p-2 cursor-pointer hover:bg-gray-200 select-none"
                        onClick={() => handleSort("floor")}
                      >
                        <div className="flex items-center justify-end gap-1">
                          קומה{renderSortIcon("floor")}
                        </div>
                      </th>
                    )}
                    {isColumnVisible("surface") && (
                      <th
                        className="p-2 cursor-pointer hover:bg-gray-200 select-none"
                        onClick={() => handleSort("surface")}
                      >
                        <div className="flex items-center justify-end gap-1">
                          שטח (מ"ר){renderSortIcon("surface")}
                        </div>
                      </th>
                    )}
                    {isColumnVisible("year_of_constru") && (
                      <th
                        className="p-2 cursor-pointer hover:bg-gray-200 select-none"
                        onClick={() => handleSort("year_of_constru")}
                      >
                        <div className="flex items-center justify-end gap-1">
                          שנת בנייה{renderSortIcon("year_of_constru")}
                        </div>
                      </th>
                    )}
                    {isColumnVisible("sale_value_nis") && (
                      <th
                        className="p-2 cursor-pointer hover:bg-gray-200 select-none"
                        onClick={() => handleSort("sale_value_nis")}
                      >
                        <div className="flex items-center justify-end gap-1">
                          מחיר מכירה{renderSortIcon("sale_value_nis")}
                        </div>
                      </th>
                    )}
                    {isColumnVisible("price_per_sqm") && (
                      <th
                        className="p-2 cursor-pointer hover:bg-gray-200 select-none bg-green-100"
                        onClick={() => handleSort("price_per_sqm")}
                      >
                        <div className="flex items-center justify-end gap-1">
                          מחיר למ"ר{renderSortIcon("price_per_sqm")}
                        </div>
                      </th>
                    )}

                    {/* ADDRESS GROUP */}
                    {isColumnVisible("entrance") && (
                      <th className="p-2">כניסה</th>
                    )}
                    {isColumnVisible("apartment_number") && (
                      <th className="p-2">דירה</th>
                    )}
                    {isColumnVisible("sub_chelka") && (
                      <th className="p-2">תת חלקה</th>
                    )}

                    {/* AREAS GROUP */}
                    {isColumnVisible("arnona_area_sqm") && (
                      <th
                        className="p-2 cursor-pointer hover:bg-gray-200 select-none"
                        onClick={() => handleSort("arnona_area_sqm")}
                      >
                        <div className="flex items-center justify-end gap-1">
                          שטח ברוטו{renderSortIcon("arnona_area_sqm")}
                        </div>
                      </th>
                    )}
                    {isColumnVisible("registered_area_sqm") && (
                      <th
                        className="p-2 cursor-pointer hover:bg-gray-200 select-none"
                        onClick={() => handleSort("registered_area_sqm")}
                      >
                        <div className="flex items-center justify-end gap-1">
                          שטח נטו{renderSortIcon("registered_area_sqm")}
                        </div>
                      </th>
                    )}
                    {isColumnVisible("shares") && (
                      <th className="p-2">חלק מקרקעין</th>
                    )}

                    {/* BUILDING GROUP */}
                    {isColumnVisible("total_floors") && (
                      <th
                        className="p-2 cursor-pointer hover:bg-gray-200 select-none"
                        onClick={() => handleSort("total_floors")}
                      >
                        <div className="flex items-center justify-end gap-1">
                          קומות בבניין{renderSortIcon("total_floors")}
                        </div>
                      </th>
                    )}
                    {isColumnVisible("apartments_in_building") && (
                      <th
                        className="p-2 cursor-pointer hover:bg-gray-200 select-none"
                        onClick={() => handleSort("apartments_in_building")}
                      >
                        <div className="flex items-center justify-end gap-1">
                          דירות בבניין{renderSortIcon("apartments_in_building")}
                        </div>
                      </th>
                    )}
                    {isColumnVisible("elevator") && (
                      <th className="p-2">מעלית</th>
                    )}
                    {isColumnVisible("parking_spaces") && (
                      <th
                        className="p-2 cursor-pointer hover:bg-gray-200 select-none"
                        onClick={() => handleSort("parking_spaces")}
                      >
                        <div className="flex items-center justify-end gap-1">
                          חניות{renderSortIcon("parking_spaces")}
                        </div>
                      </th>
                    )}

                    {/* AMENITIES GROUP */}
                    {isColumnVisible("plot") && <th className="p-2">מגרש</th>}
                    {isColumnVisible("roof") && <th className="p-2">גג</th>}
                    {isColumnVisible("storage") && (
                      <th className="p-2">מחסן</th>
                    )}
                    {isColumnVisible("yard") && <th className="p-2">חצר</th>}
                    {isColumnVisible("gallery") && (
                      <th className="p-2">גלריה</th>
                    )}

                    {/* PRICES GROUP */}
                    {isColumnVisible("declared_price_ils") && (
                      <th
                        className="p-2 cursor-pointer hover:bg-gray-200 select-none"
                        onClick={() => handleSort("declared_price_ils")}
                      >
                        <div className="flex items-center justify-end gap-1">
                          מחיר מוצהר{renderSortIcon("declared_price_ils")}
                        </div>
                      </th>
                    )}
                    {isColumnVisible("declared_price_usd") && (
                      <th className="p-2">מחיר מוצהר $</th>
                    )}
                    {isColumnVisible("estimated_price_usd") && (
                      <th className="p-2">מחיר מוערך $</th>
                    )}
                    {isColumnVisible("price_per_room") && (
                      <th
                        className="p-2 cursor-pointer hover:bg-gray-200 select-none"
                        onClick={() => handleSort("price_per_room")}
                      >
                        <div className="flex items-center justify-end gap-1">
                          מחיר לחדר{renderSortIcon("price_per_room")}
                        </div>
                      </th>
                    )}

                    {/* LEGAL GROUP */}
                    {isColumnVisible("transaction_type") && (
                      <th className="p-2">סוג עסקה</th>
                    )}
                    {isColumnVisible("building_function") && (
                      <th className="p-2">תפקוד בניין</th>
                    )}
                    {isColumnVisible("unit_function") && (
                      <th className="p-2">תפקוד יחידה</th>
                    )}
                    {isColumnVisible("rights") && (
                      <th className="p-2">מהות זכות</th>
                    )}
                    {isColumnVisible("zoning_plan") && (
                      <th className="p-2">תב"ע</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {sortedTransactions.map((transaction) => {
                    const isSelected = selectedIds.has(transaction.id);
                    return (
                      <tr
                        key={transaction.id}
                        className={`border-t cursor-pointer hover:bg-gray-50 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset ${
                          isSelected ? "bg-blue-50" : ""
                        } ${isEditMode ? "hover:bg-orange-50" : ""}`}
                        onClick={() =>
                          !isEditMode && toggleSelection(transaction.id)
                        }
                        onKeyDown={(e) => {
                          if (
                            !isEditMode &&
                            (e.key === "Enter" || e.key === " ")
                          ) {
                            e.preventDefault();
                            toggleSelection(transaction.id);
                          }
                        }}
                        tabIndex={0}
                        role="row"
                        aria-selected={isSelected}
                      >
                        {/* Delete button - only in edit mode */}
                        {isEditMode && (
                          <td
                            className={`p-1 text-center sticky right-0 z-10 bg-orange-50`}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeRow(transaction.id);
                              }}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded"
                              title="הסר שורה מהטבלה"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                        {/* Checkbox - always visible */}
                        <td
                          className={`p-2 text-center z-10 ${isSelected ? "bg-blue-50" : "bg-white"} ${isEditMode ? "sticky right-10" : "sticky right-0"}`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelection(transaction.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 cursor-pointer"
                            aria-label={`בחר עסקה ${transaction.address || formatParcelId(transaction.block_of_land)}`}
                          />
                        </td>

                        {/* BASIC GROUP */}
                        {isColumnVisible("sale_day") && (
                          <td className="p-2">
                            {formatDate(transaction.sale_day)}
                          </td>
                        )}
                        {isColumnVisible("address") && (
                          <td
                            className="p-2 max-w-xs truncate"
                            title={transaction.address}
                          >
                            {transaction.address || "-"}
                          </td>
                        )}
                        {isColumnVisible("block_of_land") && (
                          <td className="p-2">
                            {formatParcelId(transaction.block_of_land)}
                          </td>
                        )}
                        {isColumnVisible("rooms") && (
                          <td className="p-2">
                            <EditableCell
                              transactionId={transaction.id}
                              field="rooms"
                              value={transaction.rooms}
                              type="number"
                            />
                          </td>
                        )}
                        {isColumnVisible("floor") && (
                          <td className="p-2">
                            <EditableCell
                              transactionId={transaction.id}
                              field="floor"
                              value={transaction.floor}
                              type="number"
                            />
                          </td>
                        )}
                        {isColumnVisible("surface") && (
                          <td className="p-2">
                            <EditableCell
                              transactionId={transaction.id}
                              field="surface"
                              value={transaction.surface}
                              type="number"
                              formatter={(val) =>
                                val ? Math.round(val).toString() : "-"
                              }
                            />
                          </td>
                        )}
                        {isColumnVisible("year_of_constru") && (
                          <td className="p-2">
                            <EditableCell
                              transactionId={transaction.id}
                              field="year_of_constru"
                              value={transaction.year_of_constru}
                              type="number"
                            />
                          </td>
                        )}
                        {isColumnVisible("sale_value_nis") && (
                          <td className="p-2 font-semibold">
                            <EditableCell
                              transactionId={transaction.id}
                              field="sale_value_nis"
                              value={
                                transaction.estimated_price_ils ??
                                transaction.sale_value_nis
                              }
                              type="number"
                              formatter={formatPrice}
                            />
                          </td>
                        )}
                        {isColumnVisible("price_per_sqm") && (
                          <td className="p-2 text-green-700 font-medium bg-green-50">
                            <EditableCell
                              transactionId={transaction.id}
                              field="price_per_sqm"
                              value={transaction.price_per_sqm}
                              type="number"
                              formatter={formatPrice}
                              className="text-green-700 font-medium"
                            />
                          </td>
                        )}

                        {/* ADDRESS GROUP */}
                        {isColumnVisible("entrance") && (
                          <td className="p-2">{transaction.entrance ?? "-"}</td>
                        )}
                        {isColumnVisible("apartment_number") && (
                          <td className="p-2">
                            {transaction.apartment_number ?? "-"}
                          </td>
                        )}
                        {isColumnVisible("sub_chelka") && (
                          <td className="p-2">
                            {formatSubChelka(transaction.block_of_land)}
                          </td>
                        )}

                        {/* AREAS GROUP */}
                        {isColumnVisible("arnona_area_sqm") && (
                          <td className="p-2">
                            {transaction.arnona_area_sqm
                              ? Math.round(transaction.arnona_area_sqm)
                              : "-"}
                          </td>
                        )}
                        {isColumnVisible("registered_area_sqm") && (
                          <td className="p-2">
                            {transaction.registered_area_sqm
                              ? Math.round(transaction.registered_area_sqm)
                              : "-"}
                          </td>
                        )}
                        {isColumnVisible("shares") && (
                          <td className="p-2 text-xs">
                            {transaction.shares || "-"}
                          </td>
                        )}

                        {/* BUILDING GROUP */}
                        {isColumnVisible("total_floors") && (
                          <td className="p-2">
                            {transaction.total_floors ?? "-"}
                          </td>
                        )}
                        {isColumnVisible("apartments_in_building") && (
                          <td className="p-2">
                            {transaction.apartments_in_building ?? "-"}
                          </td>
                        )}
                        {isColumnVisible("elevator") && (
                          <td className="p-2">{transaction.elevator || "-"}</td>
                        )}
                        {isColumnVisible("parking_spaces") && (
                          <td className="p-2">
                            {transaction.parking_spaces ?? "-"}
                          </td>
                        )}

                        {/* AMENITIES GROUP */}
                        {isColumnVisible("plot") && (
                          <td className="p-2">
                            {formatBoolean(transaction.plot)}
                          </td>
                        )}
                        {isColumnVisible("roof") && (
                          <td className="p-2">
                            {formatBoolean(transaction.roof)}
                          </td>
                        )}
                        {isColumnVisible("storage") && (
                          <td className="p-2">
                            {formatBoolean(transaction.storage)}
                          </td>
                        )}
                        {isColumnVisible("yard") && (
                          <td className="p-2">
                            {formatBoolean(transaction.yard)}
                          </td>
                        )}
                        {isColumnVisible("gallery") && (
                          <td className="p-2">
                            {formatBoolean(transaction.gallery)}
                          </td>
                        )}

                        {/* PRICES GROUP */}
                        {isColumnVisible("declared_price_ils") && (
                          <td className="p-2">
                            {formatPrice(transaction.declared_price_ils)}
                          </td>
                        )}
                        {isColumnVisible("declared_price_usd") && (
                          <td className="p-2">
                            {formatPriceUSD(transaction.declared_price_usd)}
                          </td>
                        )}
                        {isColumnVisible("estimated_price_usd") && (
                          <td className="p-2">
                            {formatPriceUSD(transaction.estimated_price_usd)}
                          </td>
                        )}
                        {isColumnVisible("price_per_room") && (
                          <td className="p-2">
                            {formatPrice(transaction.price_per_room)}
                          </td>
                        )}

                        {/* LEGAL GROUP */}
                        {isColumnVisible("transaction_type") && (
                          <td className="p-2 text-xs">
                            {transaction.transaction_type || "-"}
                          </td>
                        )}
                        {isColumnVisible("building_function") && (
                          <td
                            className="p-2 text-xs max-w-[100px] truncate"
                            title={transaction.building_function}
                          >
                            {transaction.building_function || "-"}
                          </td>
                        )}
                        {isColumnVisible("unit_function") && (
                          <td
                            className="p-2 text-xs max-w-[100px] truncate"
                            title={transaction.unit_function}
                          >
                            {transaction.unit_function || "-"}
                          </td>
                        )}
                        {isColumnVisible("rights") && (
                          <td
                            className="p-2 text-xs max-w-[100px] truncate"
                            title={transaction.rights}
                          >
                            {transaction.rights || "-"}
                          </td>
                        )}
                        {isColumnVisible("zoning_plan") && (
                          <td
                            className="p-2 text-xs max-w-[100px] truncate"
                            title={transaction.zoning_plan}
                          >
                            {transaction.zoning_plan || "-"}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile scroll hint */}
          <p className="md:hidden text-xs text-gray-500 text-center mt-2">
            💡 גלול ימינה לראות עמודות נוספות
          </p>

          <div className="mt-4 text-sm text-gray-600">
            נבחרו: {selectedIds.size} מתוך {transactions.length}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!isLoading && transactions.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <button
            onClick={analyzeSelected}
            disabled={selectedIds.size === 0}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium ${
              selectedIds.size === 0
                ? "bg-gray-400 text-white cursor-not-allowed"
                : "bg-purple-600 text-white hover:bg-purple-700"
            }`}
          >
            נתח עסקאות נבחרות
          </button>

          {analysisResult && finalPricePerSqm && (
            <button
              onClick={proceedToSection52}
              className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4" />
              אשר והמשך לעיבוד נתונים
            </button>
          )}
        </div>
      )}

      {/* Analysis Results */}
      {analysisResult && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-3">
            תוצאות ניתוח ({analysisResult.totalComparables} עסקאות)
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-blue-700">מחיר ממוצע:</span>
              <div className="font-bold text-blue-900">
                {formatPrice(analysisResult.averagePrice)}
              </div>
            </div>
            <div>
              <span className="text-blue-700">מחיר חציוני:</span>
              <div className="font-bold text-blue-900">
                {formatPrice(analysisResult.medianPrice)}
              </div>
            </div>
            <div>
              <span className="text-blue-700">ממוצע למ"ר:</span>
              <div className="font-bold text-blue-900">
                {formatPrice(analysisResult.averagePricePerSqm)}
              </div>
            </div>
            <div>
              <span className="text-blue-700">חציון למ"ר:</span>
              <div className="font-bold text-blue-900">
                {formatPrice(analysisResult.medianPricePerSqm)}
              </div>
            </div>
          </div>
          {analysisResult.estimatedValue && (
            <div className="mt-4 pt-4 border-t border-blue-300 text-center">
              <span className="text-blue-700 text-sm block mb-1">
                הערכת שווי:
              </span>
              <div className="text-2xl font-bold text-blue-900">
                {formatPrice(analysisResult.estimatedValue)}
              </div>
              {analysisResult.estimatedRange && (
                <div className="text-xs text-blue-600 mt-1">
                  טווח: {formatPrice(analysisResult.estimatedRange.low)} -{" "}
                  {formatPrice(analysisResult.estimatedRange.high)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
