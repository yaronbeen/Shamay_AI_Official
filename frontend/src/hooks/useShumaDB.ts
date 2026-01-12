// ShumaDB Hook - Complete valuation data management
import { useState, useCallback } from "react";
import { ValuationData } from "@/types/valuation";

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
      } catch (err: any) {
        console.error("❌ [HOOK] Save error:", err.message);
        setError(err.message);
        return { success: false, error: err.message };
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
    } catch (err: any) {
      console.error("❌ [HOOK] Load error:", err.message);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save GIS data
  const saveGISData = useCallback(async (sessionId: string, gisData: any) => {
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
      let result: any;

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
    } catch (err: any) {
      const errorMessage = err.message || "Failed to save GIS data";
      console.error("❌ [HOOK] Save GIS data error:", errorMessage);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save Garmushka data to garmushka table + shuma
  const saveGarmushkaData = useCallback(
    async (sessionId: string, garmushkaData: any) => {
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
      } catch (err: any) {
        setError(err.message);
        return { success: false, error: err.message };
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Save building permit extraction to building_permit_extracts + shuma
  const savePermitExtraction = useCallback(
    async (sessionId: string, permitData: any, documentFilename: string) => {
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
      } catch (err: any) {
        setError(err.message);
        return { success: false, error: err.message };
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
      landRegistryData: any,
      documentFilename: string,
    ) => {
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
      } catch (err: any) {
        setError(err.message);
        return { success: false, error: err.message };
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
      sharedBuildingData: any,
      documentFilename: string,
    ) => {
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
      } catch (err: any) {
        setError(err.message);
        return { success: false, error: err.message };
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Get all extracted data from all tables
  const getAllExtractedData = useCallback(async (sessionId: string) => {
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
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save final results
  const saveFinalResults = useCallback(
    async (
      sessionId: string,
      finalValuation: number,
      pricePerSqm: number,
      comparableData: any,
      propertyAnalysis: any,
    ) => {
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
      } catch (err: any) {
        setError(err.message);
        return { success: false, error: err.message };
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Get user's shumas
  const getUserShumas = useCallback(async () => {
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
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get specific shuma
  const getShumaById = useCallback(async (shumaId: string) => {
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
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Search shumas
  const searchShumas = useCallback(
    async (searchTerm?: string, status?: string) => {
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
      } catch (err: any) {
        setError(err.message);
        return { success: false, error: err.message };
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
