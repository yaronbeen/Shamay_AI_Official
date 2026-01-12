"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StepIndicator } from "@/components/StepIndicator";
import { DocumentPreview } from "@/components/DocumentPreview";
import { NavigationButtons } from "@/components/NavigationButtons";
import { Step1InitialData } from "@/components/steps/Step1InitialData";
import { Step2Documents } from "@/components/steps/Step2Documents";
import { Step3Validation } from "@/components/steps/Step3Validation";
import { Step4AIAnalysis } from "@/components/steps/Step4AIAnalysis";
import { Step5Export } from "@/components/steps/Step5Export";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { ValuationProvider, useValuation } from "@/contexts/ValuationContext";

// =============================================================================
// WIZARD PAGE WRAPPER - Provides ValuationContext
// =============================================================================

export default function WizardPage() {
  return (
    <ValuationProvider>
      <WizardContent />
    </ValuationProvider>
  );
}

// =============================================================================
// WIZARD CONTENT - Uses ValuationContext for state management
// =============================================================================

function WizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ==========================================================================
  // CONTEXT - All valuation state comes from here
  // ==========================================================================

  const {
    data,
    updateData,
    saveManually,
    sessionId,
    isLoading,
    stepValidation,
    handleValidationChange,
    saveGISDataToDB,
    saveGarmushkaDataToDB,
    saveFinalResultsToDB,
  } = useValuation();

  // ==========================================================================
  // LOCAL UI STATE - Only UI concerns remain here
  // ==========================================================================

  const [currentStep, setCurrentStep] = useState(1);
  const [isTransitioning, startTransition] = useTransition();
  const [stepKey, setStepKey] = useState(1);
  const [showChat, setShowChat] = useState(false);

  // ==========================================================================
  // EFFECTS
  // ==========================================================================

  // Get step from URL or default to 1
  useEffect(() => {
    const step = parseInt(searchParams.get("step") || "1");
    if (step !== currentStep) {
      startTransition(() => {
        setCurrentStep(step);
        setStepKey(step);
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

  // ==========================================================================
  // NAVIGATION HANDLERS
  // ==========================================================================

  const nextStep = async () => {
    if (currentStep < 5) {
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
      await saveManually();
      const newStep = currentStep - 1;
      startTransition(() => {
        setCurrentStep(newStep);
        setStepKey(newStep);
        router.push(`/wizard?step=${newStep}`);
      });
    }
  };

  const handleStepClick = async (step: number) => {
    if (step <= currentStep || step === currentStep + 1) {
      await saveManually();
      startTransition(() => {
        setCurrentStep(step);
        setStepKey(step);
        router.push(`/wizard?step=${step}`);
      });
    }
  };

  // ==========================================================================
  // RENDER HELPERS
  // ==========================================================================

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

  // ==========================================================================
  // RENDER
  // ==========================================================================

  if (isLoading) {
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

          {/* Document Preview - Takes 5/12 of the width (42%) - Hidden on Step 3 */}
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
