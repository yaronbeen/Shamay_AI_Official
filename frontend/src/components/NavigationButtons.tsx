'use client'

import React, { useState } from 'react'
import { ChevronRight, ChevronLeft, AlertCircle } from 'lucide-react'

interface NavigationButtonsProps {
  currentStep: number
  totalSteps: number
  onNext: () => void
  onPrevious: () => void
  canProceed: boolean
  isLoading?: boolean
  nextLabel?: string
  previousLabel?: string
  missingFields?: string[]
}

export function NavigationButtons({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  canProceed,
  isLoading = false,
  nextLabel = 'הבא',
  previousLabel = 'חזרה',
  missingFields = []
}: NavigationButtonsProps) {
  const isFirstStep = currentStep === 1
  const isLastStep = currentStep === totalSteps
  const [showTooltip, setShowTooltip] = useState(false)

  const hasMissingFields = missingFields.length > 0

  return (
    <div className="flex flex-col gap-3 mt-8 pt-6 border-t border-gray-200">
      {/* Missing Fields Warning */}
      {hasMissingFields && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-right" dir="rtl">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <span className="font-medium">שדות חובה חסרים: </span>
            <span>{missingFields.join('، ')}</span>
          </div>
        </div>
      )}

      {/* Navigation Buttons Row */}
      <div className="flex justify-between items-center">
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
          <ChevronRight className="w-5 h-5" />
          <span>{previousLabel}</span>
        </button>

        {/* Step Indicator */}
        <div className="text-sm text-gray-600 font-medium">
          שלב {currentStep} מתוך {totalSteps}
        </div>

        {/* Next Button with Tooltip */}
        <div className="relative">
          <button
            type="button"
            onClick={onNext}
            disabled={!canProceed || isLoading}
            onMouseEnter={() => !canProceed && setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
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
            {!isLastStep && <ChevronLeft className="w-5 h-5" />}
          </button>

          {/* Tooltip on hover when disabled */}
          {showTooltip && hasMissingFields && (
            <div className="absolute bottom-full left-0 mb-2 p-2 bg-gray-800 text-white text-xs rounded shadow-lg whitespace-nowrap z-10" dir="rtl">
              יש למלא את כל שדות החובה
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
