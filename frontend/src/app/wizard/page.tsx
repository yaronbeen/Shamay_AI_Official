"use client";

import {
  useState,
  useEffect,
  useCallback,
  useTransition,
  useRef,
  useMemo,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { StepIndicator } from "@/components/StepIndicator";
import { DocumentPreview } from "@/components/DocumentPreview";
import { NavigationButtons } from "@/components/NavigationButtons";
import { Step1InitialData } from "@/components/steps/Step1InitialData";
import { Step2Documents } from "@/components/steps/Step2Documents";
import { Step3Validation } from "@/components/steps/Step3Validation";
import { Step4AIAnalysis } from "@/components/steps/Step4AIAnalysis";
import { Step5Export } from "@/components/steps/Step5Export";
import { ValuationData } from "@/components/ValuationWizard";
import { useShumaDB } from "@/hooks/useShumaDB";
import { ChatInterface } from "@/components/chat/ChatInterface";

// Simple debounce function
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout | null = null;
  return ((...args: any[]) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

// Deep comparison helper - compares objects/arrays for equality
// Handles edge cases: undefined, null, date strings, large base64 data
function deepEqual(obj1: any, obj2: any): boolean {
  // Same reference
  if (obj1 === obj2) return true;

  // Handle null/undefined
  if (obj1 == null && obj2 == null) return true;
  if (obj1 == null || obj2 == null) return false;

  // Different types
  if (typeof obj1 !== typeof obj2) return false;

  // Primitives
  if (typeof obj1 !== "object") return obj1 === obj2;

  // Use JSON.stringify with replacer to handle undefined consistently
  // This ensures undefined values are handled the same way in both objects
  const replacer = (key: string, value: any) => {
    // Convert undefined to null for consistent comparison
    return value === undefined ? null : value;
  };

  try {
    const str1 = JSON.stringify(obj1, replacer);
    const str2 = JSON.stringify(obj2, replacer);
    return str1 === str2;
  } catch (e) {
    // Fallback for circular references or non-serializable data
    console.warn("⚠️ Deep comparison failed (circular reference?):", e);
    // If comparison fails, assume different (safer than assuming same)
    return false;
  }
}

export default function WizardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [currentStep, setCurrentStep] = useState(1);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [valuationId, setValuationId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedData, setLastSavedData] = useState<ValuationData | null>(
    null,
  );
  const [isTransitioning, startTransition] = useTransition();
  const [stepKey, setStepKey] = useState(1); // Key for forcing re-render on step change
  const [showChat, setShowChat] = useState(false); // Chat interface visibility

  // Track pending save to prevent race conditions
  const pendingSaveRef = useRef<Promise<any> | null>(null);

  // Track if session initialization has already happened
  // Prevents reload on step transitions when sessionId hasn't changed
  const initializedSessionRef = useRef<string | null>(null);

  // Track previous sessionId to detect actual changes (not just object reference)
  const prevSessionIdRef = useRef<string | null>(null);

  // CRITICAL FIX: Extract sessionId from searchParams
  // Compare value, not object reference
  const urlSessionId = searchParams.get("sessionId");

  // Database integration hook
  const {
    saveShumaToDatabase,
    loadShumaForWizard,
    saveGISData,
    saveGarmushkaData,
    saveFinalResults,
    isLoading: dbLoading,
  } = useShumaDB();
  const [stepValidation, setStepValidation] = useState({
    step1: false,
    step2: false,
    step3: false,
    step4: false,
  });
  const [data, setData] = useState<ValuationData>({
    street: "",
    buildingNumber: "",
    neighborhood: "",
    city: "",
    fullAddress: "",
    clientName: "",
    clientRelation: "",
    valuationDate: "",
    valuationEffectiveDate: "",
    referenceNumber: "",
    rooms: 0,
    floor: 0,
    area: 0,
    balconyArea: 0,
    propertyEssence: "",
    shamayName: "",
    shamaySerialNumber: "",
    propertyImages: [],
    selectedImageIndex: 0,
    selectedImagePreview: null,
    interiorImages: [],
    signature: null,
    signaturePreview: null,
    comparableData: [],
    finalValuation: 0,
    pricePerSqm: 0,
    isComplete: false,
  });

  // Get step from URL or default to 1
  useEffect(() => {
    const step = parseInt(searchParams.get("step") || "1");
    if (step !== currentStep) {
      startTransition(() => {
        setCurrentStep(step);
        setStepKey(step); // Force re-render with new key for animation
      });
    }
  }, [searchParams, currentStep]);

  // Keyboard shortcut for returning to dashboard (Ctrl/Cmd + D)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "d") {
        event.preventDefault();
        if (
          confirm(
            "האם אתה בטוח שברצונך לעזוב את האשף? כל ההתקדמות נשמרת אוטומטית.",
          )
        ) {
          router.push("/dashboard");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  // Check for existing session or create new one only if needed
  // OPTIMIZATION: Only runs when sessionId actually changes, not on step transitions
  // CRITICAL: Compare actual sessionId value, not searchParams object reference
  useEffect(() => {
    // Get sessionId from URL or localStorage
    const currentUrlSessionId = searchParams.get("sessionId");
    const localSessionId = localStorage.getItem("shamay_session_id");
    const currentSessionId = currentUrlSessionId || localSessionId;

    // CRITICAL FIX: Compare actual value, not object reference
    // If sessionId value hasn't changed, skip entirely
    if (currentSessionId === prevSessionIdRef.current) {
      // SessionId value is the same, no need to do anything
      return; // Exit immediately - don't run any initialization logic
    }

    // CRITICAL FIX: Also check if already initialized
    if (
      currentSessionId &&
      currentSessionId === initializedSessionRef.current
    ) {
      // Session already initialized, just update ref for future comparisons
      prevSessionIdRef.current = currentSessionId;
      return; // Exit early - don't run initialization
    }

    // Also check if there's no sessionId at all and we're already initialized
    if (!currentSessionId && initializedSessionRef.current) {
      console.log("⏭️ [INIT] Already initialized, no sessionId");
      prevSessionIdRef.current = null;
      return;
    }

    // Update ref to track current value for next comparison
    prevSessionIdRef.current = currentSessionId;

    const initializeSession = async () => {
      try {
        setSessionLoading(true);

        // Check if there's a sessionId in the URL params
        if (currentUrlSessionId) {
          console.log(
            "🔄 [INIT] Using existing session from URL:",
            currentUrlSessionId,
          );
          setSessionId(currentUrlSessionId);
          setData((prev) => ({ ...prev, sessionId: currentUrlSessionId }));
          // Save to localStorage for persistence
          localStorage.setItem("shamay_session_id", currentUrlSessionId);

          // Load existing data from database
          try {
            const loadResult = await loadShumaForWizard(currentUrlSessionId);
            if (loadResult.success && loadResult.valuationData) {
              // Directly set the data - REPLACE, don't merge
              const loadedData = {
                ...loadResult.valuationData,
                sessionId: currentUrlSessionId,
              };
              // CRITICAL: Replace all data, don't merge with previous state
              setData(loadedData);
              // MITIGATION: Initialize lastSavedData from loaded data
              setLastSavedData(loadedData);
            }
          } catch (error) {
            console.error("❌ [INIT] Error loading existing data:", error);
          }

          // Mark as initialized
          initializedSessionRef.current = currentUrlSessionId;
          setSessionLoading(false);
          setIsInitialLoad(false);
          return;
        }

        // Check if there's a sessionId in localStorage
        if (localSessionId) {
          console.log(
            "🔄 [INIT] Using existing session from localStorage:",
            localSessionId,
          );
          setSessionId(localSessionId);
          setData((prev) => ({ ...prev, sessionId: localSessionId }));

          // Load existing data from database
          try {
            const loadResult = await loadShumaForWizard(localSessionId);
            if (loadResult.success && loadResult.valuationData) {
              // Directly set the data - REPLACE, don't merge
              const loadedData = {
                ...loadResult.valuationData,
                sessionId: localSessionId,
              };
              // CRITICAL: Replace all data, don't merge with previous state
              setData(loadedData);
              // MITIGATION: Initialize lastSavedData from loaded data
              setLastSavedData(loadedData);
            }
          } catch (error) {
            console.error("❌ [INIT] Error loading existing data:", error);
          }

          // Mark as initialized
          initializedSessionRef.current = localSessionId;
          setSessionLoading(false);
          setIsInitialLoad(false);
          return;
        }

        // If no existing session, create a new one (only once)
        if (!initializedSessionRef.current) {
          console.log(
            "🆕 [INIT] No existing session found, creating new session",
          );
          try {
            // Generate a new session ID locally
            const newSessionId = Date.now().toString();
            console.log("✅ [INIT] Created new session:", newSessionId);
            setSessionId(newSessionId);
            setData((prev) => ({ ...prev, sessionId: newSessionId }));
            localStorage.setItem("shamay_session_id", newSessionId);
            initializedSessionRef.current = newSessionId;
            setSessionLoading(false);
            setIsInitialLoad(false);
          } catch (error) {
            console.error("❌ [INIT] Error creating session:", error);
            router.push("/");
          }
        }
      } catch (error) {
        console.error("❌ [INIT] Failed to initialize session:", error);
        setSessionLoading(false);
        router.push("/");
      }
    };

    // Only initialize if sessionId changed or not initialized yet
    initializeSession();
  }, [searchParams, router, loadShumaForWizard, sessionId]); // searchParams in deps, but we compare actual values inside

  // Enhanced debounced save function with database integration
  // Tracks pending saves to prevent race conditions
  const debouncedSave = useCallback(
    debounce(async (dataToSave: ValuationData) => {
      console.log("Currect pendingSaveRef", pendingSaveRef.current);
      if (sessionId && !isInitialLoad) {
        try {
          // Wait for any pending save to complete first
          if (pendingSaveRef.current) {
            console.log(
              "⏳ [DEBOUNCED SAVE] Waiting for pending save to complete...",
            );
            try {
              await pendingSaveRef.current;
            } catch (e) {
              // Previous save might have failed, continue anyway
              console.warn("⚠️ Previous save had issues, continuing...");
            }
          }

          console.log("💾 [DEBOUNCED SAVE] Starting save to database...");
          console.log(
            "💾 [DEBOUNCED SAVE] Uploads status:",
            dataToSave.uploads?.map((u: any) => ({
              id: u.id,
              type: u.type,
              status: u.status,
            })),
          );

          const organizationId = session?.user?.primaryOrganizationId;
          const userId = session?.user?.id;

          if (!organizationId || !userId) {
            console.warn(
              "⚠️ Skipping save: missing authenticated user or organization",
            );
            return;
          }

          // Create save promise and track it
          const savePromise = saveShumaToDatabase(
            sessionId,
            organizationId,
            userId,
            dataToSave,
          );

          pendingSaveRef.current = savePromise;

          // Wait for save to complete
          const result = await savePromise;

          // MITIGATION: Only update lastSavedData on successful save
          if (result.success) {
            console.log(
              "✅ [DEBOUNCED SAVE] Data saved to database successfully",
            );
            console.log(
              "✅ Uploads with status saved:",
              dataToSave.uploads?.length || 0,
              "uploads",
            );
            setHasUnsavedChanges(false);
            // Create a deep copy to avoid reference issues
            setLastSavedData(JSON.parse(JSON.stringify(dataToSave)));
            console.log("✅ [DEBOUNCED SAVE] Updated lastSavedData baseline");

            if (result.shumaId && !valuationId) {
              setValuationId(result.shumaId);
              console.log("✅ New shuma created:", result.shumaId);
            }
          } else {
            console.error(
              "❌ [DEBOUNCED SAVE] Database save failed:",
              result.error,
            );
            // Don't update lastSavedData on failure - keep old baseline
          }
        } catch (err) {
          console.error("❌ [DEBOUNCED SAVE] Database save error:", err);
        } finally {
          // Clear pending save reference
          pendingSaveRef.current = null;
        }
      } else if (isInitialLoad) {
        console.log("⏭️ [DEBOUNCED SAVE] Skipping save during initial load");
      }
    }, 1000), // 1 second debounce
    [
      sessionId,
      isInitialLoad,
      saveShumaToDatabase,
      valuationId,
      session?.user?.primaryOrganizationId,
      session?.user?.id,
    ],
  );

  // Memoize the updateData function to prevent infinite loops
  // Only trigger save on meaningful data additions (not every keystroke)
  const updateData = useCallback(
    (updates: Partial<ValuationData>, options?: { skipAutoSave?: boolean }) => {
      setData((prev) => {
        const newData = { ...prev, ...updates };

        // Check if data actually changed (deep comparison for objects/arrays)
        const changedFields: string[] = [];
        const hasActualChanges = Object.keys(updates).some((key) => {
          const oldValue = prev[key as keyof ValuationData];
          const newValue = updates[key as keyof ValuationData];

          // CRITICAL FIX: Handle undefined/null/empty values correctly
          // Both empty means no change
          if (oldValue == null && newValue == null) {
            return false; // Both null/undefined - no change
          }

          // If old is empty and new is empty (empty array, empty object, empty string), no change
          if (!oldValue && !newValue) {
            // Check if both are "empty" values (empty string, empty array, empty object)
            const oldIsEmpty =
              oldValue === "" ||
              (Array.isArray(oldValue) && oldValue.length === 0) ||
              (typeof oldValue === "object" &&
                Object.keys(oldValue).length === 0);
            const newIsEmpty =
              newValue === "" ||
              (Array.isArray(newValue) && newValue.length === 0) ||
              (typeof newValue === "object" &&
                newValue !== null &&
                Object.keys(newValue).length === 0);

            if (oldIsEmpty && newIsEmpty) {
              return false; // Both empty - no change
            }
          }

          // Simple comparison for primitives
          if (typeof newValue !== "object" || newValue === null) {
            // Handle undefined/null/empty string comparison
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

          // For objects/arrays, compare JSON strings (simple but effective)
          // CRITICAL: Only compare if both have actual content
          const oldJSON = oldValue ? JSON.stringify(oldValue) : "";
          const newJSON = newValue ? JSON.stringify(newValue) : "";

          // If both are empty strings, no change
          if (!oldJSON && !newJSON) {
            return false;
          }

          // If old has content and new is empty, check if it's a real change
          // (not just setting to empty when old was already empty)
          if (oldJSON && !newJSON) {
            // This might be a change (clearing data) - treat as change for safety
            // But log it for debugging
            console.log(
              `⚠️ [CHANGE CHECK] Field ${key}: old has content, new is empty`,
            );
            changedFields.push(key);
            return true;
          }

          if (oldJSON !== newJSON) {
            changedFields.push(key);
            console.log(`🔍 Change detected in ${key}:`, {
              oldLength: oldJSON?.length || 0,
              newLength: newJSON?.length || 0,
              sample: newJSON ? newJSON.substring(0, 100) : "",
            });
            return true;
          }
          return false;
        });

        if (!hasActualChanges) {
          console.log("⏭️ No actual changes detected in update, skipping");
          return prev; // Return unchanged data
        }

        console.log("✅ Changes detected in fields:", changedFields);

        // Check if this is a meaningful update that should trigger save
        const isMeaningfulUpdate =
          updates.uploads || // New file uploaded
          updates.extractedData || // AI extraction completed
          updates.gisScreenshots || // GIS screenshot captured
          updates.garmushkaMeasurements || // Garmushka measurement added
          updates.propertyImages || // Images added
          updates.interiorImages || // Interior images added
          updates.comparableData || // Comparable data added
          updates.propertyAnalysis || // Analysis completed
          updates.marketAnalysis || // Market analysis completed
          updates.riskAssessment || // Risk assessment completed
          updates.recommendations || // Recommendations added
          updates.structuredFootnotes || // Footnote changes
          updates.customDocumentEdits; // Document edits

        // Mark that we have unsaved changes
        if (!options?.skipAutoSave) {
          setHasUnsavedChanges(true);
        }

        // Only save if it's a meaningful update and not explicitly skipped
        if (isMeaningfulUpdate && !options?.skipAutoSave) {
          console.log(
            "💾 Triggering save for meaningful update:",
            Object.keys(updates),
          );
          debouncedSave(newData);
          setHasUnsavedChanges(false); // Mark as saved after triggering save
        } else if (options?.skipAutoSave) {
          console.log("⏭️ Skipping auto-save (explicitly disabled)");
        } else {
          console.log(
            "⏭️ Skipping auto-save for minor update:",
            Object.keys(updates),
          );
        }

        return newData;
      });
    },
    [debouncedSave],
  );

  // Manual save function (for explicit saves, like form submission or step navigation)
  // Uses best practices: waits for pending saves, does deep comparison, avoids redundant saves
  const saveManually = useCallback(async () => {
    if (sessionId && !isInitialLoad) {
      // BEST PRACTICE 1: Wait for any pending debounced save to complete first
      if (pendingSaveRef.current) {
        console.log(
          "⏳ [MANUAL SAVE] Waiting for pending debounced save to complete...",
        );
        try {
          await pendingSaveRef.current;
        } catch (e) {
          // Previous save might have failed, continue anyway
          console.warn(
            "⚠️ [MANUAL SAVE] Previous save had issues, continuing with manual save...",
          );
        }
      }

      // MITIGATION: Safety net for first navigation (lastSavedData is null)
      // On first navigation after load, save once to establish baseline
      if (!lastSavedData) {
        console.log(
          "💾 [MANUAL SAVE] First save after load - establishing baseline",
        );
        // This is safe: first save establishes the baseline
        // Subsequent navigations will compare against this
      } else {
        // BEST PRACTICE 2: Deep comparison instead of flag-based checking
        // This is more reliable than hasUnsavedChanges flag which can be stale
        const hasActualChanges = !deepEqual(data, lastSavedData);

        if (!hasActualChanges) {
          console.log(
            "⏭️ [MANUAL SAVE] No actual changes detected (deep comparison), skipping save",
          );
          console.log(
            "🔍 [MANUAL SAVE] Data matches lastSavedData - no save needed",
          );
          setHasUnsavedChanges(false);
          return { success: true, skipped: true };
        }

        // Also check flag as secondary validation
        if (!hasUnsavedChanges && !hasActualChanges) {
          console.log(
            "⏭️ [MANUAL SAVE] No unsaved changes flag AND data matches, skipping save",
          );
          return { success: true, skipped: true };
        }
      }

      const organizationId = session?.user?.primaryOrganizationId;
      const userId = session?.user?.id;

      if (!organizationId || !userId) {
        console.warn(
          "⚠️ [MANUAL SAVE] Cannot save: missing authenticated user or organization",
        );
        return { success: false, error: "Missing user or organization" };
      }

      console.log(
        "💾 [MANUAL SAVE] Changes detected or first save, saving to database...",
      );

      // Create save promise and track it
      const savePromise = saveShumaToDatabase(
        sessionId,
        organizationId,
        userId,
        data,
      );
      pendingSaveRef.current = savePromise;

      const result = await savePromise;

      // MITIGATION: Only update lastSavedData on successful save
      // This prevents stale comparison baseline
      if (result.success) {
        console.log("✅ [MANUAL SAVE] Save successful");
        setHasUnsavedChanges(false);
        // Create a deep copy to avoid reference issues
        setLastSavedData(JSON.parse(JSON.stringify(data)));
        console.log("✅ [MANUAL SAVE] Updated lastSavedData baseline");
      } else {
        console.error("❌ [MANUAL SAVE] Save failed:", result.error);
        // Don't update lastSavedData on failure - keep old baseline
      }

      // Clear pending save reference
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
    hasUnsavedChanges,
    lastSavedData,
  ]);

  // Save GIS data to database
  const saveGISDataToDB = useCallback(
    async (gisData: any) => {
      if (valuationId) {
        const result = await saveGISData(valuationId, gisData);
        if (result.success) {
          console.log("✅ GIS data saved to database");
        } else {
          console.error("❌ Failed to save GIS data:", result.error);
        }
      }
    },
    [valuationId, saveGISData],
  );

  // Save Garmushka data to database
  const saveGarmushkaDataToDB = useCallback(
    async (garmushkaData: any) => {
      if (valuationId) {
        const result = await saveGarmushkaData(valuationId, garmushkaData);
        if (result.success) {
          console.log("✅ Garmushka data saved to database");
        } else {
          console.error("❌ Failed to save Garmushka data:", result.error);
        }
      }
    },
    [valuationId, saveGarmushkaData],
  );

  // Save final results to database
  const saveFinalResultsToDB = useCallback(
    async (
      finalValuation: number,
      pricePerSqm: number,
      comparableData: any,
      propertyAnalysis: any,
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
          console.log("✅ Final results saved to database");
        } else {
          console.error("❌ Failed to save final results:", result.error);
        }
      }
    },
    [valuationId, saveFinalResults],
  );

  // Memoize the validation handler to prevent infinite loops
  const handleValidationChange = useCallback(
    (step: number, isValid: boolean) => {
      setStepValidation((prev) => {
        const key = `step${step}` as keyof typeof prev;
        if (prev[key] !== isValid) {
          return { ...prev, [key]: isValid };
        }
        return prev;
      });
    },
    [],
  );

  const nextStep = async () => {
    if (currentStep < 5) {
      // Save data before navigating (especially important for Step 1)
      await saveManually();

      const newStep = currentStep + 1;
      startTransition(() => {
        setCurrentStep(newStep);
        setStepKey(newStep);
        router.push(`/wizard?step=${newStep}`);
      });
    }
  };

  const prevStep = async () => {
    if (currentStep > 1) {
      // Save data before navigating
      await saveManually();

      const newStep = currentStep - 1;
      startTransition(() => {
        setCurrentStep(newStep);
        setStepKey(newStep);
        router.push(`/wizard?step=${newStep}`);
      });
    }
  };

  // Handle step click navigation
  const handleStepClick = async (step: number) => {
    if (step <= currentStep || step === currentStep + 1) {
      // Save data before navigating
      await saveManually();

      startTransition(() => {
        setCurrentStep(step);
        setStepKey(step);
        router.push(`/wizard?step=${step}`);
      });
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1InitialData
            data={data}
            updateData={updateData}
            onValidationChange={(isValid) => handleValidationChange(1, isValid)}
          />
        );
      case 2:
        return (
          <Step2Documents
            data={data}
            updateData={updateData}
            sessionId={sessionId || undefined}
            onValidationChange={(isValid) => handleValidationChange(2, isValid)}
          />
        );
      case 3:
        return (
          <Step3Validation
            data={data}
            updateData={updateData}
            onValidationChange={(isValid) => handleValidationChange(3, isValid)}
            sessionId={sessionId || undefined}
          />
        );
      case 4:
        return (
          <Step4AIAnalysis
            data={data}
            updateData={updateData}
            sessionId={sessionId || undefined}
            onValidationChange={(isValid) => handleValidationChange(4, isValid)}
            onSaveGISData={saveGISDataToDB}
            onSaveGarmushkaData={saveGarmushkaDataToDB}
          />
        );
      case 5:
        return (
          <Step5Export data={data} onSaveFinalResults={saveFinalResultsToDB} />
        );
      default:
        return (
          <Step1InitialData
            data={data}
            updateData={updateData}
            onValidationChange={(isValid) => handleValidationChange(1, isValid)}
          />
        );
    }
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">מייצר שומה חדשה..</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <svg
                    className="h-5 w-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  SHAMAY.AI
                </h1>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                שלב {currentStep} מתוך 5
              </div>
              <button
                onClick={() => {
                  if (
                    confirm(
                      "האם אתה בטוח שברצונך לעזוב את האשף? כל ההתקדמות נשמרת אוטומטית.",
                    )
                  ) {
                    router.push("/dashboard");
                  }
                }}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                title="חזור ללוח בקרה (Ctrl+D)"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                <span>חזור ללוח בקרה</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div
          className={`grid grid-cols-1 ${currentStep === 3 ? "" : "xl:grid-cols-12"} gap-8`}
        >
          {/* Main Content - Full width on Step 3, 7/12 otherwise */}
          <div className={currentStep === 3 ? "" : "xl:col-span-7"}>
            <StepIndicator
              currentStep={currentStep}
              onStepClick={handleStepClick}
            />
            <div
              className={`bg-white rounded-lg shadow-md mt-6 transition-wrapper ${currentStep === 3 ? "p-0" : "p-6"}`}
            >
              {isTransitioning ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div key={stepKey} className="step-transition-enter">
                  {renderStep()}
                </div>
              )}
              <NavigationButtons
                currentStep={currentStep}
                totalSteps={5}
                onNext={nextStep}
                onPrevious={prevStep}
                canProceed={
                  stepValidation[
                    `step${currentStep}` as keyof typeof stepValidation
                  ]
                }
                isLoading={isTransitioning}
              />
            </div>
          </div>

          {/* Document Preview - Takes 5/12 of the width (42%) - Hidden on Step 3 which has its own layout */}
          {currentStep !== 3 && (
            <div className="xl:col-span-5 sticky top-24 self-start h-[calc(100vh-8rem)]">
              <DocumentPreview data={data} onDataChange={updateData} />
            </div>
          )}
        </div>
      </div>

      {/* Chat Interface - Floating bubble button (bottom right) */}
      {sessionId && (
        <>
          {/* Floating Chat Button - Bottom Right Corner */}
          {!showChat && (
            <button
              onClick={() => setShowChat(true)}
              className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-teal-500 hover:bg-teal-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group animate-bounce-subtle"
              title="עוזר AI"
              aria-label="פתח עוזר AI"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              {/* Optional: Notification badge - uncomment to show */}
              {/* <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center font-bold shadow-md">
                5
              </span> */}
            </button>
          )}

          {/* Chat Interface Modal - Quarter screen, right side */}
          {showChat && (
            <div className="fixed inset-0 z-50 pointer-events-none" dir="rtl">
              {/* Backdrop */}
              <div
                className="absolute inset-0 bg-black bg-opacity-30 pointer-events-auto transition-opacity duration-300"
                onClick={() => setShowChat(false)}
              />

              {/* Chat Window - Quarter screen, right side */}
              <div className="absolute right-0 top-0 bottom-0 w-1/4 h-full pointer-events-auto animate-slide-in-right-rtl">
                <ChatInterface
                  sessionId={sessionId}
                  mode="sidebar"
                  onClose={() => setShowChat(false)}
                  className="h-full"
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
