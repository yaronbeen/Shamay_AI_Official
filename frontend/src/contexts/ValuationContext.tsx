"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
// Import from centralized types (single source of truth)
import {
  ValuationData,
  initialValuationData as defaultInitialData,
  GISScreenshots,
  GarmushkaMeasurements,
  ComparableProperty,
  PropertyAnalysis,
} from "@/types/valuation";
import { useShumaDB } from "@/hooks/useShumaDB";

// =============================================================================
// LOCAL TYPE DEFINITIONS (compatible with existing ValuationData)
// =============================================================================

interface SaveOptions {
  skipAutoSave?: boolean;
}

type UpdateDataFn = (
  updates: Partial<ValuationData>,
  options?: SaveOptions,
) => void;

interface SaveResult {
  success: boolean;
  valuationId?: number;
  shumaId?: string;
  error?: string;
  skipped?: boolean;
}

// Use centralized initial data from @/types/valuation
const initialValuationData: ValuationData = defaultInitialData;

// =============================================================================
// TYPES
// =============================================================================

interface ValuationState {
  data: ValuationData;
  hasUnsavedChanges: boolean;
  lastSavedData: ValuationData | null;
  sessionId: string | null;
  valuationId: string | null;
  isLoading: boolean;
  isInitialLoad: boolean;
}

interface ValuationContextValue extends ValuationState {
  // Core data operations
  updateData: UpdateDataFn;
  saveManually: () => Promise<SaveResult>;
  resetToSaved: () => void;

  // Specialized save operations
  saveGISDataToDB: (gisData: GISScreenshots) => Promise<void>;
  saveGarmushkaDataToDB: (
    garmushkaData: GarmushkaMeasurements,
  ) => Promise<void>;
  saveFinalResultsToDB: (
    finalValuation: number,
    pricePerSqm: number,
    comparableData: ComparableProperty[],
    propertyAnalysis: PropertyAnalysis | null,
  ) => Promise<void>;

  // Step validation
  stepValidation: StepValidation;
  handleValidationChange: (step: number, isValid: boolean) => void;
}

interface StepValidation {
  step1: boolean;
  step2: boolean;
  step3: boolean;
  step4: boolean;
}

interface ValuationProviderProps {
  children: ReactNode;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// Simple debounce function
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((...args: any[]) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

// Deep comparison helper
function deepEqual(obj1: unknown, obj2: unknown): boolean {
  if (obj1 === obj2) return true;
  if (obj1 == null && obj2 == null) return true;
  if (obj1 == null || obj2 == null) return false;
  if (typeof obj1 !== typeof obj2) return false;
  if (typeof obj1 !== "object") return obj1 === obj2;

  const replacer = (_key: string, value: unknown) => {
    return value === undefined ? null : value;
  };

  try {
    const str1 = JSON.stringify(obj1, replacer);
    const str2 = JSON.stringify(obj2, replacer);
    return str1 === str2;
  } catch {
    console.warn("⚠️ Deep comparison failed (circular reference?)");
    return false;
  }
}

// =============================================================================
// CONTEXT
// =============================================================================

const ValuationContext = createContext<ValuationContextValue | null>(null);

// =============================================================================
// HOOK
// =============================================================================

export function useValuation(): ValuationContextValue {
  const ctx = useContext(ValuationContext);
  if (!ctx) {
    throw new Error("useValuation must be used within a ValuationProvider");
  }
  return ctx;
}

// Optional hook that returns null if outside provider (useful for optional usage)
export function useValuationOptional(): ValuationContextValue | null {
  return useContext(ValuationContext);
}

// =============================================================================
// PROVIDER
// =============================================================================

export function ValuationProvider({ children }: ValuationProviderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  // ==========================================================================
  // STATE
  // ==========================================================================

  const [data, setData] = useState<ValuationData>(initialValuationData);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [valuationId, setValuationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedData, setLastSavedData] = useState<ValuationData | null>(
    null,
  );
  const [stepValidation, setStepValidation] = useState<StepValidation>({
    step1: false,
    step2: false,
    step3: false,
    step4: false,
  });

  // ==========================================================================
  // REFS
  // ==========================================================================

  const pendingSaveRef = useRef<Promise<SaveResult> | null>(null);
  const initializedSessionRef = useRef<string | null>(null);
  const prevSessionIdRef = useRef<string | null>(null);

  // ==========================================================================
  // HOOKS
  // ==========================================================================

  const {
    saveShumaToDatabase,
    loadShumaForWizard,
    saveGISData,
    saveGarmushkaData,
    saveFinalResults,
  } = useShumaDB();

  // ==========================================================================
  // SESSION INITIALIZATION
  // ==========================================================================

  useEffect(() => {
    const currentUrlSessionId = searchParams.get("sessionId");
    const localSessionId = localStorage.getItem("shamay_session_id");
    const currentSessionId = currentUrlSessionId || localSessionId;

    // Skip if already initialized with this session
    if (
      currentSessionId &&
      currentSessionId === initializedSessionRef.current
    ) {
      prevSessionIdRef.current = currentSessionId;
      return;
    }

    // Skip if no sessionId and already initialized
    if (!currentSessionId && initializedSessionRef.current) {
      prevSessionIdRef.current = null;
      return;
    }

    // Skip if sessionId value hasn't changed AND we're already initialized
    // (This prevents re-initialization on every render, but allows first initialization)
    if (
      currentSessionId === prevSessionIdRef.current &&
      initializedSessionRef.current
    ) {
      return;
    }

    prevSessionIdRef.current = currentSessionId;

    const initializeSession = async () => {
      try {
        setIsLoading(true);

        if (currentUrlSessionId) {
          console.log(
            "🔄 [ValuationContext] Using session from URL:",
            currentUrlSessionId,
          );
          setSessionId(currentUrlSessionId);
          setData((prev) => ({ ...prev, sessionId: currentUrlSessionId }));
          localStorage.setItem("shamay_session_id", currentUrlSessionId);

          try {
            const loadResult = await loadShumaForWizard(currentUrlSessionId);
            if (loadResult.success && loadResult.valuationData) {
              const loadedData = {
                ...initialValuationData,
                ...loadResult.valuationData,
                sessionId: currentUrlSessionId,
              };
              setData(loadedData);
              setLastSavedData(loadedData);
            }
          } catch (error) {
            console.error(
              "❌ [ValuationContext] Error loading existing data:",
              error,
            );
          }

          initializedSessionRef.current = currentUrlSessionId;
          setIsLoading(false);
          setIsInitialLoad(false);
          return;
        }

        if (localSessionId) {
          console.log(
            "🔄 [ValuationContext] Using session from localStorage:",
            localSessionId,
          );
          setSessionId(localSessionId);
          setData((prev) => ({ ...prev, sessionId: localSessionId }));

          try {
            const loadResult = await loadShumaForWizard(localSessionId);
            if (loadResult.success && loadResult.valuationData) {
              const loadedData = {
                ...initialValuationData,
                ...loadResult.valuationData,
                sessionId: localSessionId,
              };
              setData(loadedData);
              setLastSavedData(loadedData);
            }
          } catch (error) {
            console.error(
              "❌ [ValuationContext] Error loading existing data:",
              error,
            );
          }

          initializedSessionRef.current = localSessionId;
          setIsLoading(false);
          setIsInitialLoad(false);
          return;
        }

        // Create new session if none exists
        if (!initializedSessionRef.current) {
          console.log("🆕 [ValuationContext] Creating new session");
          const newSessionId = Date.now().toString();
          setSessionId(newSessionId);
          setData((prev) => ({ ...prev, sessionId: newSessionId }));
          localStorage.setItem("shamay_session_id", newSessionId);
          initializedSessionRef.current = newSessionId;
          setIsLoading(false);
          setIsInitialLoad(false);
        }
      } catch (error) {
        console.error(
          "❌ [ValuationContext] Failed to initialize session:",
          error,
        );
        setIsLoading(false);
        router.push("/");
      }
    };

    initializeSession();
  }, [searchParams, router, loadShumaForWizard]);

  // ==========================================================================
  // DEBOUNCED SAVE
  // ==========================================================================

  const debouncedSave = useCallback(
    debounce(async (dataToSave: ValuationData) => {
      if (sessionId && !isInitialLoad) {
        try {
          // Wait for pending save
          if (pendingSaveRef.current) {
            console.log(
              "⏳ [ValuationContext] Waiting for pending save to complete...",
            );
            try {
              await pendingSaveRef.current;
            } catch {
              console.warn("⚠️ Previous save had issues, continuing...");
            }
          }

          console.log("💾 [ValuationContext] Starting debounced save...");

          const organizationId = session?.user?.primaryOrganizationId;
          const userId = session?.user?.id;

          if (!organizationId || !userId) {
            console.warn(
              "⚠️ [ValuationContext] Skipping save: missing user/org",
            );
            return;
          }

          const savePromise = saveShumaToDatabase(
            sessionId,
            organizationId,
            userId,
            dataToSave,
          );

          pendingSaveRef.current = savePromise;
          const result = await savePromise;

          if (result.success) {
            console.log("✅ [ValuationContext] Debounced save successful");
            setHasUnsavedChanges(false);
            setLastSavedData(JSON.parse(JSON.stringify(dataToSave)));

            if (result.shumaId && !valuationId) {
              setValuationId(result.shumaId);
            }
          } else {
            console.error(
              "❌ [ValuationContext] Debounced save failed:",
              result.error,
            );
          }
        } catch (err) {
          console.error("❌ [ValuationContext] Debounced save error:", err);
        } finally {
          pendingSaveRef.current = null;
        }
      }
    }, 1000),
    [sessionId, isInitialLoad, saveShumaToDatabase, valuationId, session?.user],
  );

  // ==========================================================================
  // UPDATE DATA
  // ==========================================================================

  const updateData: UpdateDataFn = useCallback(
    (updates: Partial<ValuationData>, options?: SaveOptions) => {
      setData((prev) => {
        const newData = { ...prev, ...updates };

        // Check if data actually changed
        const changedFields: string[] = [];
        const hasActualChanges = Object.keys(updates).some((key) => {
          const oldValue = prev[key as keyof ValuationData];
          const newValue = updates[key as keyof ValuationData];

          // Handle null/undefined
          if (oldValue == null && newValue == null) return false;
          if (!oldValue && !newValue) {
            const oldIsEmpty =
              oldValue === "" ||
              (Array.isArray(oldValue) && oldValue.length === 0) ||
              (typeof oldValue === "object" &&
                oldValue !== null &&
                Object.keys(oldValue as Record<string, unknown>).length === 0);
            const newIsEmpty =
              newValue === "" ||
              (Array.isArray(newValue) && newValue.length === 0) ||
              (typeof newValue === "object" &&
                newValue !== null &&
                Object.keys(newValue as Record<string, unknown>).length === 0);
            if (oldIsEmpty && newIsEmpty) return false;
          }

          // Simple comparison for primitives
          if (typeof newValue !== "object" || newValue === null) {
            const oldNormalized =
              oldValue == null ? "" : String(oldValue).trim();
            const newNormalized =
              newValue == null ? "" : String(newValue).trim();
            if (oldNormalized !== newNormalized) {
              changedFields.push(key);
              return true;
            }
            return false;
          }

          // For objects/arrays, compare JSON strings
          const oldJSON = oldValue ? JSON.stringify(oldValue) : "";
          const newJSON = newValue ? JSON.stringify(newValue) : "";

          if (!oldJSON && !newJSON) return false;

          if (oldJSON !== newJSON) {
            changedFields.push(key);
            return true;
          }
          return false;
        });

        if (!hasActualChanges) {
          console.log(
            "⏭️ [ValuationContext] No actual changes detected, skipping",
          );
          return prev;
        }

        console.log(
          "✅ [ValuationContext] Changes detected in fields:",
          changedFields,
        );

        // Check if meaningful update
        const isMeaningfulUpdate =
          updates.uploads ||
          updates.extractedData ||
          updates.gisScreenshots ||
          updates.garmushkaMeasurements ||
          updates.propertyImages ||
          updates.interiorImages ||
          updates.comparableData ||
          updates.propertyAnalysis ||
          updates.marketAnalysis ||
          updates.riskAssessment ||
          updates.recommendations ||
          updates.structuredFootnotes ||
          updates.customDocumentEdits;

        if (!options?.skipAutoSave) {
          setHasUnsavedChanges(true);
        }

        if (isMeaningfulUpdate && !options?.skipAutoSave) {
          console.log(
            "💾 [ValuationContext] Triggering save for meaningful update:",
            Object.keys(updates),
          );
          debouncedSave(newData);
          setHasUnsavedChanges(false);
        }

        return newData;
      });
    },
    [debouncedSave],
  );

  // ==========================================================================
  // MANUAL SAVE
  // ==========================================================================

  const saveManually = useCallback(async (): Promise<SaveResult> => {
    if (sessionId && !isInitialLoad) {
      // Wait for pending save
      if (pendingSaveRef.current) {
        console.log(
          "⏳ [ValuationContext] Waiting for pending save to complete...",
        );
        try {
          await pendingSaveRef.current;
        } catch {
          console.warn("⚠️ Previous save had issues, continuing...");
        }
      }

      // First save establishes baseline
      if (!lastSavedData) {
        console.log(
          "💾 [ValuationContext] First save after load - establishing baseline",
        );
      } else {
        // Deep comparison
        const hasActualChanges = !deepEqual(data, lastSavedData);
        if (!hasActualChanges) {
          console.log(
            "⏭️ [ValuationContext] No changes detected (deep comparison), skipping save",
          );
          setHasUnsavedChanges(false);
          return { success: true, skipped: true };
        }
      }

      const organizationId = session?.user?.primaryOrganizationId;
      const userId = session?.user?.id;

      if (!organizationId || !userId) {
        console.warn(
          "⚠️ [ValuationContext] Cannot save: missing user or organization",
        );
        return { success: false, error: "Missing user or organization" };
      }

      console.log("💾 [ValuationContext] Manual save starting...");

      const savePromise = saveShumaToDatabase(
        sessionId,
        organizationId,
        userId,
        data,
      );
      pendingSaveRef.current = savePromise;

      const result = await savePromise;

      if (result.success) {
        console.log("✅ [ValuationContext] Manual save successful");
        setHasUnsavedChanges(false);
        setLastSavedData(JSON.parse(JSON.stringify(data)));
      } else {
        console.error(
          "❌ [ValuationContext] Manual save failed:",
          result.error,
        );
      }

      pendingSaveRef.current = null;
      return result;
    }

    return { success: false, error: "No session or still loading" };
  }, [
    sessionId,
    isInitialLoad,
    session?.user,
    data,
    saveShumaToDatabase,
    lastSavedData,
  ]);

  // ==========================================================================
  // RESET TO SAVED
  // ==========================================================================

  const resetToSaved = useCallback(() => {
    if (lastSavedData) {
      setData(lastSavedData);
      setHasUnsavedChanges(false);
    }
  }, [lastSavedData]);

  // ==========================================================================
  // SPECIALIZED SAVE OPERATIONS
  // ==========================================================================

  const saveGISDataToDB = useCallback(
    async (gisData: GISScreenshots) => {
      if (valuationId) {
        const result = await saveGISData(valuationId, gisData);
        if (result.success) {
          console.log("✅ [ValuationContext] GIS data saved");
        } else {
          console.error(
            "❌ [ValuationContext] Failed to save GIS data:",
            result.error,
          );
        }
      }
    },
    [valuationId, saveGISData],
  );

  const saveGarmushkaDataToDB = useCallback(
    async (garmushkaData: GarmushkaMeasurements) => {
      if (valuationId) {
        const result = await saveGarmushkaData(valuationId, garmushkaData);
        if (result.success) {
          console.log("✅ [ValuationContext] Garmushka data saved");
        } else {
          console.error(
            "❌ [ValuationContext] Failed to save Garmushka data:",
            result.error,
          );
        }
      }
    },
    [valuationId, saveGarmushkaData],
  );

  const saveFinalResultsToDB = useCallback(
    async (
      finalValuation: number,
      pricePerSqm: number,
      comparableData: ComparableProperty[],
      propertyAnalysis: PropertyAnalysis | null,
    ) => {
      if (valuationId) {
        const result = await saveFinalResults(
          valuationId,
          finalValuation,
          pricePerSqm,
          comparableData,
          propertyAnalysis,
        );
        if (result.success) {
          console.log("✅ [ValuationContext] Final results saved");
        } else {
          console.error(
            "❌ [ValuationContext] Failed to save final results:",
            result.error,
          );
        }
      }
    },
    [valuationId, saveFinalResults],
  );

  // ==========================================================================
  // VALIDATION HANDLER
  // ==========================================================================

  const handleValidationChange = useCallback(
    (step: number, isValid: boolean) => {
      setStepValidation((prev) => {
        const key = `step${step}` as keyof StepValidation;
        if (prev[key] !== isValid) {
          return { ...prev, [key]: isValid };
        }
        return prev;
      });
    },
    [],
  );

  // ==========================================================================
  // CONTEXT VALUE
  // ==========================================================================

  const contextValue: ValuationContextValue = {
    // State
    data,
    hasUnsavedChanges,
    lastSavedData,
    sessionId,
    valuationId,
    isLoading,
    isInitialLoad,

    // Core operations
    updateData,
    saveManually,
    resetToSaved,

    // Specialized saves
    saveGISDataToDB,
    saveGarmushkaDataToDB,
    saveFinalResultsToDB,

    // Validation
    stepValidation,
    handleValidationChange,
  };

  return (
    <ValuationContext.Provider value={contextValue}>
      {children}
    </ValuationContext.Provider>
  );
}

// =============================================================================
// RE-EXPORTS for convenience
// =============================================================================

export type { ValuationState, ValuationContextValue, StepValidation };
