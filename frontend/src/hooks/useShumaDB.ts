// ShumaDB Hook - Complete valuation data management
import { useState, useCallback } from "react";
import {
  ValuationData,
  GISScreenshots,
  GarmushkaMeasurements,
  ExtractedData,
  ComparableProperty,
  PropertyAnalysis,
} from "@/types/valuation";

// Result types for hook returns
interface HookResult {
  success: boolean;
  error?: string;
}

interface SaveShumaResult extends HookResult {
  shumaId?: number;
}

interface LoadShumaResult extends HookResult {
  valuationData?: ValuationData;
}

interface ExtractedDataResult extends HookResult {
  data?: {
    permits?: ExtractedData[];
    landRegistry?: ExtractedData[];
    sharedBuilding?: ExtractedData[];
  };
}

interface ShumaListResult extends HookResult {
  shumas?: ValuationData[];
}

interface ShumaResult extends HookResult {
  shuma?: ValuationData;
}

interface PermitResult extends HookResult {
  permitId?: number;
}

interface LandRegistryResult extends HookResult {
  landRegistryId?: number;
}

interface SharedBuildingResult extends HookResult {
  sharedBuildingId?: number;
}

export const useShumaDB = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Save complete shuma data
  const saveShumaToDatabase = useCallback(
    async (
      sessionId: string,
      organizationId: string,
      userId: string,
      valuationData: ValuationData,
    ) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save_to_db",
            sessionId,
            organizationId,
            userId,
            valuationData,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to save shuma to database");
        }

        return { success: true, shumaId: result.shumaId };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        console.error("❌ [HOOK] Save error:", errorMessage);
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Load shuma data for wizard
  const loadShumaForWizard = useCallback(async (sessionId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "load_from_db",
          sessionId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to load shuma data");
      }

      return { success: true, valuationData: result.valuationData };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error("❌ [HOOK] Load error:", errorMessage);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save GIS data
  const saveGISData = useCallback(
    async (sessionId: string, gisData: GISScreenshots): Promise<HookResult> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save_gis_data",
            sessionId,
            gisData,
          }),
        });

        // Read response as text first (we can parse it as JSON later if needed)
        const textResponse = await response.text();
        let result: { error?: string };

        // Try to parse as JSON
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          try {
            result = JSON.parse(textResponse);
          } catch (jsonError) {
            // If JSON parsing fails
            console.error(
              "❌ Failed to parse JSON response:",
              textResponse.substring(0, 200),
            );
            throw new Error(`Server error: ${textResponse.substring(0, 100)}`);
          }
        } else {
          // Non-JSON response (likely HTML error page)
          console.error(
            "❌ Non-JSON response received:",
            textResponse.substring(0, 200),
          );
          throw new Error(
            `Server returned non-JSON response: ${response.status} ${response.statusText}`,
          );
        }

        if (!response.ok) {
          throw new Error(
            result?.error ||
              `Failed to save GIS data: ${response.status} ${response.statusText}`,
          );
        }

        return { success: true };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to save GIS data";
        console.error("❌ [HOOK] Save GIS data error:", errorMessage);
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Save Garmushka data to garmushka table + shuma
  const saveGarmushkaData = useCallback(
    async (
      sessionId: string,
      garmushkaData: GarmushkaMeasurements,
    ): Promise<HookResult> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save_garmushka_data",
            sessionId,
            garmushkaData,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to save Garmushka data");
        }

        return { success: true };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to save Garmushka data";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Save building permit extraction to building_permit_extracts + shuma
  const savePermitExtraction = useCallback(
    async (
      sessionId: string,
      permitData: ExtractedData,
      documentFilename: string,
    ): Promise<PermitResult> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save_permit_extraction",
            sessionId,
            permitData,
            documentFilename,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to save permit extraction");
        }

        return { success: true, permitId: result.permitId };
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to save permit extraction";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Save land registry extraction to land_registry_extracts + shuma
  const saveLandRegistryExtraction = useCallback(
    async (
      sessionId: string,
      landRegistryData: ExtractedData,
      documentFilename: string,
    ): Promise<LandRegistryResult> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save_land_registry_extraction",
            sessionId,
            landRegistryData,
            documentFilename,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || "Failed to save land registry extraction",
          );
        }

        return { success: true, landRegistryId: result.landRegistryId };
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to save land registry extraction";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Save shared building extraction to shared_building_order + shuma
  const saveSharedBuildingExtraction = useCallback(
    async (
      sessionId: string,
      sharedBuildingData: ExtractedData,
      documentFilename: string,
    ): Promise<SharedBuildingResult> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save_shared_building_extraction",
            sessionId,
            sharedBuildingData,
            documentFilename,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || "Failed to save shared building extraction",
          );
        }

        return { success: true, sharedBuildingId: result.sharedBuildingId };
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to save shared building extraction";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Get all extracted data from all tables
  const getAllExtractedData = useCallback(
    async (sessionId: string): Promise<ExtractedDataResult> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "get_all_extracted_data",
            sessionId,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to get extracted data");
        }

        return { success: true, data: result.data };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to get extracted data";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Save final results
  const saveFinalResults = useCallback(
    async (
      sessionId: string,
      finalValuation: number,
      pricePerSqm: number,
      comparableData: ComparableProperty[],
      propertyAnalysis: PropertyAnalysis | null,
    ): Promise<HookResult> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save_final_results",
            sessionId,
            finalValuation,
            pricePerSqm,
            comparableData,
            propertyAnalysis,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to save final results");
        }

        return { success: true };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to save final results";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Get user's shumas
  const getUserShumas = useCallback(async (): Promise<ShumaListResult> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        "/api/valuation-session?action=get_valuations",
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to get shumas");
      }

      return { success: true, shumas: result.shumas };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to get shumas";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get specific shuma
  const getShumaById = useCallback(
    async (shumaId: string): Promise<ShumaResult> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/valuation-session?action=get_valuation&valuationId=${shumaId}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          },
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to get shuma");
        }

        return { success: true, shuma: result.shuma };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to get shuma";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Search shumas
  const searchShumas = useCallback(
    async (searchTerm?: string, status?: string): Promise<ShumaListResult> => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (searchTerm) params.append("search", searchTerm);
        if (status) params.append("status", status);

        const response = await fetch(
          `/api/valuation-session?action=search_valuations&${params.toString()}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          },
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to search shumas");
        }

        return { success: true, shumas: result.shumas };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to search shumas";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return {
    saveShumaToDatabase,
    loadShumaForWizard,
    saveGISData,
    saveGarmushkaData,
    saveFinalResults,
    savePermitExtraction,
    saveLandRegistryExtraction,
    saveSharedBuildingExtraction,
    getAllExtractedData,
    getUserShumas,
    getShumaById,
    searchShumas,
    isLoading,
    error,
  };
};
