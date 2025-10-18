'use client'

import React from 'react'
import { ChevronRight, ChevronLeft } from 'lucide-react'

interface NavigationButtonsProps {
  currentStep: number
  totalSteps: number
  onNext: () => void
  onPrevious: () => void
  canProceed: boolean
  isLoading?: boolean
  nextLabel?: string
  previousLabel?: string
}

export function NavigationButtons({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  canProceed,
  isLoading = false,
  nextLabel = 'הבא',
  previousLabel = 'חזרה'
}: NavigationButtonsProps) {
  const isFirstStep = currentStep === 1
  const isLastStep = currentStep === totalSteps

  return (
    <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
      {/* Previous Button */}
      <button
        type="button"
        onClick={onPrevious}
        disabled={isFirstStep || isLoading}
        className={`
          flex items-center gap-2 px-6 py-3 rounded-lg font-medium
          transition-all duration-200
          ${
            isFirstStep || isLoading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 active:scale-95'
          }
        `}
      >
        <ChevronLeft className="w-5 h-5" />
        <span>{previousLabel}</span>
      </button>

      {/* Step Indicator */}
      <div className="text-sm text-gray-600 font-medium">
        שלב {currentStep} מתוך {totalSteps}
      </div>

      {/* Next Button */}
      <button
        type="button"
        onClick={onNext}
        disabled={!canProceed || isLoading}
        className={`
          flex items-center gap-2 px-6 py-3 rounded-lg font-medium
          transition-all duration-200
          ${
            !canProceed || isLoading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-md'
          }
        `}
      >
        <span>{isLoading ? 'מעבד...' : isLastStep ? 'סיום' : nextLabel}</span>
        {!isLastStep && <ChevronRight className="w-5 h-5" />}
      </button>
    </div>
  )
}
