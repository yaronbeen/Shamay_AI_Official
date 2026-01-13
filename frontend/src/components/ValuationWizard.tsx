"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { StepIndicator } from "./StepIndicator";
import { DocumentPreview } from "./DocumentPreview";
import { NavigationButtons } from "./NavigationButtons";
import { Step1InitialData } from "./steps/Step1InitialData";
import { Step2Documents } from "./steps/Step2Documents";
import { Step3Validation } from "./steps/Step3Validation";
import { Step4AIAnalysis } from "./steps/Step4AIAnalysis";
import { Step5Export } from "./steps/Step5Export";
import { Step3PDFViewer } from "./Step3PDFViewer";
import {
  ValuationData,
  CustomTable,
  initialValuationData,
} from "@/types/valuation";

// Re-export types for backward compatibility (legacy imports from this file)
export type { ValuationData, CustomTable };

// Type definitions now live in @/types/valuation.ts
// This component imports and re-exports them for backward compatibility

export function ValuationWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const dataRef = useRef<ValuationData | null>(null);
  const [data, setData] = useState<ValuationData>({
    street: "",
    buildingNumber: "",
    city: "",
    neighborhood: "",
    fullAddress: "",
    rooms: 0,
    floor: 0,
    airDirections: "",
    area: 0,
    propertyEssence: "",
    landContamination: false,
    landContaminationNote: "",
    clientName: "",
    clientTitle: "",
    clientNote: "",
    clientRelation: "",
    valuationDate: "",
    valuationEffectiveDate: "",
    referenceNumber: "",
    shamayName: "",
    shamaySerialNumber: "",
    gush: "",
    parcel: "",
    parcelArea: 0,
    parcelShape: "",
    parcelSurface: "",
    subParcel: "",
    registeredArea: 0,
    builtArea: 0,
    balconyArea: 0,
    buildingPermitNumber: "",
    buildingPermitDate: "",
    buildingDescription: "",
    buildingFloors: 0,
    buildingUnits: 0,
    buildingDetails: "",
    constructionSource: "",
    attachments: "",
    ownershipRights: "",
    notes: "",
    registryOffice: "",
    extractDate: "",
    internalLayout: "",
    finishStandard: "",
    finishDetails: "",
    propertyImages: [],
    selectedImageIndex: 0,
    selectedImagePreview: null,
    interiorImages: [],
    signature: null,
    signaturePreview: null,
    propertyAnalysis: {
      buildingAge: "",
      buildingCondition: "",
      neighborhoodRating: "",
      accessibility: "",
      publicTransport: "",
      schools: "",
      shopping: "",
    },
    marketAnalysis: {
      averagePricePerSqm: 0,
      priceRange: "",
      marketTrend: "",
      demandLevel: "",
      competition: "",
    },
    riskAssessment: {
      legalRisks: "",
      marketRisks: "",
      environmentalRisks: "",
      overallRisk: "",
    },
    recommendations: [],
    comparableData: [],
    finalValuation: 0,
    pricePerSqm: 0,
    isComplete: false,
  });

  // Load or create session on mount
  useEffect(() => {
    const loadOrCreateSession = async () => {
      try {
        setSessionLoading(true);

        // Check for sessionId in URL or localStorage
        const urlParams = new URLSearchParams(window.location.search);
        const urlSessionId = urlParams.get("sessionId");
        const storedSessionId = localStorage.getItem("valuationSessionId");
        const existingSessionId = urlSessionId || storedSessionId;

        if (existingSessionId) {
          console.log("🔄 Loading existing session:", existingSessionId);

          // Try to load existing session data
          const response = await fetch(`/api/session/${existingSessionId}`);

          if (response.ok) {
            const result = await response.json();
            if (result.data && Object.keys(result.data).length > 0) {
              console.log(
                "✅ Session loaded:",
                existingSessionId,
                "Fields:",
                Object.keys(result.data),
              );
              setSessionId(existingSessionId);
              setData((prev) => {
                // Deep merge to preserve all fields including valuationType, clientTitle, etc.
                const mergedData = {
                  ...prev,
                  ...result.data,
                  sessionId: existingSessionId,
                  // Ensure critical fields are preserved
                  valuationType:
                    result.data.valuationType || prev.valuationType || "",
                  valuationDate:
                    result.data.valuationDate || prev.valuationDate || "",
                  valuationEffectiveDate:
                    result.data.valuationEffectiveDate ||
                    prev.valuationEffectiveDate ||
                    "",
                  clientTitle:
                    result.data.clientTitle || prev.clientTitle || "",
                  // Deep merge extractedData if it exists
                  extractedData: result.data.extractedData
                    ? { ...prev.extractedData, ...result.data.extractedData }
                    : prev.extractedData,
                };
                dataRef.current = mergedData;
                return mergedData;
              });
              localStorage.setItem("valuationSessionId", existingSessionId);
              setSessionLoading(false);
              return;
            }
          }

          console.log("⚠️ Session not found, creating new session");
        }

        // Create new session
        console.log("🚀 Creating new session...");
        const response = await fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          throw new Error(`Session creation failed: ${response.status}`);
        }

        const { sessionId } = await response.json();
        console.log("✅ Session created:", sessionId);

        setSessionId(sessionId);
        setData((prev) => {
          const newData = { ...prev, sessionId };
          dataRef.current = newData;
          return newData;
        });
        localStorage.setItem("valuationSessionId", sessionId);
        setSessionLoading(false);
      } catch (error) {
        console.error("❌ Failed to load/create session:", error);
        setSessionLoading(false);
        // Still allow the wizard to work, just without session persistence
      }
    };
    loadOrCreateSession();
  }, []);

  // Save data to session whenever it changes
  const saveToSession = useCallback(
    async (dataToSave: Partial<ValuationData> | ValuationData) => {
      if (!sessionId) return;

      try {
        console.log(
          "💾 Saving to session:",
          sessionId,
          "Fields:",
          Object.keys(dataToSave),
        );

        const response = await fetch(`/api/session/${sessionId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: dataToSave }),
        });

        if (!response.ok) {
          console.error("❌ Failed to save to session:", response.status);
        } else {
          console.log("✅ Data saved to session");
        }
      } catch (error) {
        console.error("❌ Error saving to session:", error);
      }
    },
    [sessionId],
  );

  // Memoize the updateData function to prevent infinite loops
  const updateData = useCallback(
    (updates: Partial<ValuationData>, options?: { skipAutoSave?: boolean }) => {
      console.log(
        "📝 Updating data:",
        updates,
        "skipAutoSave:",
        options?.skipAutoSave,
      );
      setData((prev) => {
        // Deep merge for extractedData to preserve planning_rights, planning_information, etc.
        let newData: ValuationData;
        if (updates.extractedData) {
          newData = {
            ...prev,
            ...updates,
            extractedData: {
              ...prev.extractedData,
              ...updates.extractedData,
            },
          };
        } else {
          newData = { ...prev, ...updates };
        }

        // Update ref with latest data
        dataRef.current = newData;

        // Save to session - send ALL current data, not just updates
        // This ensures fields like valuationType, valuationDate, etc. are always saved
        if (!options?.skipAutoSave) {
          saveToSession(newData);
        }

        return newData;
      });
    },
    [saveToSession],
  );

  // Keep dataRef in sync with data state
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const nextStep = useCallback(() => {
    if (currentStep < 5) {
      // Save all current data before moving to next step
      // This ensures fields like valuationType, valuationDate, valuationEffectiveDate, clientTitle are saved
      const currentData = dataRef.current || data;
      if (currentData) {
        saveToSession(currentData);
      }
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, saveToSession, data]);

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onValidationChange = (isValid: boolean) => {
    // Handle validation state if needed
    console.log("Validation changed:", isValid);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1InitialData
            data={data}
            updateData={updateData}
            onValidationChange={onValidationChange}
          />
        );
      case 2:
        return (
          <Step2Documents
            data={data}
            updateData={updateData}
            sessionId={sessionId || undefined}
            onValidationChange={onValidationChange}
          />
        );
      case 3:
        return (
          <Step3Validation
            data={data}
            updateData={updateData}
            sessionId={sessionId || undefined}
            onValidationChange={onValidationChange}
          />
        );
      case 4:
        return (
          <Step4AIAnalysis
            data={data}
            updateData={updateData}
            sessionId={sessionId || undefined}
            onValidationChange={onValidationChange}
          />
        );
      case 5:
        return (
          <Step5Export
            data={data}
            updateData={updateData}
            sessionId={sessionId || undefined}
          />
        );
      default:
        return (
          <Step1InitialData
            data={data}
            updateData={updateData}
            onValidationChange={onValidationChange}
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

  // Step 3 uses full width (has its own PDF viewer + fields layout)
  const isFullWidthStep = currentStep === 3;

  return (
    <div className="min-h-screen bg-gray-50">
      <div
        className={`mx-auto px-4 sm:px-6 lg:px-8 py-8 ${isFullWidthStep ? "max-w-full" : "max-w-7xl"}`}
      >
        <div
          className={`grid gap-8 ${isFullWidthStep ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-3"}`}
        >
          {/* Main Content */}
          <div className={isFullWidthStep ? "" : "lg:col-span-2"}>
            <StepIndicator currentStep={currentStep} />
            <div
              className={`bg-white rounded-lg shadow-md mt-6 ${isFullWidthStep ? "p-0" : "p-6"}`}
            >
              {renderStep()}
              {!isFullWidthStep && (
                <NavigationButtons
                  currentStep={currentStep}
                  totalSteps={5}
                  onNext={nextStep}
                  onPrevious={prevStep}
                  canProceed={true}
                />
              )}
            </div>
            {isFullWidthStep && (
              <div className="mt-4 px-6">
                <NavigationButtons
                  currentStep={currentStep}
                  totalSteps={5}
                  onNext={nextStep}
                  onPrevious={prevStep}
                  canProceed={true}
                />
              </div>
            )}
          </div>

          {/* Document Preview - Hidden on Step 3 (has its own document viewer) */}
          {!isFullWidthStep && (
            <div className="lg:col-span-1">
              <DocumentPreview data={data} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
