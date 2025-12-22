'use client'

interface StepIndicatorProps {
  currentStep: number
  onStepClick?: (step: number) => void
}

export function StepIndicator({ currentStep, onStepClick }: StepIndicatorProps) {
  const steps = [
    { number: 1, title: 'נתונים ראשוניים', description: 'מילוי פרטים בסיסיים' },
    { number: 2, title: 'מסמכים', description: 'עיבוד מסמכים עם AI' },
    { number: 3, title: 'אימות', description: 'בדיקה ואימות' },
    { number: 4, title: 'ניתוח AI', description: 'ניתוח מתקדם עם AI' },
    { number: 5, title: 'ייצוא', description: 'יצירת דוח סופי' }
  ]

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 overflow-hidden">
      <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-center truncate">שלבי הערכת השווי</h2>
      
      {/* Mobile: Vertical Stack */}
      <div className="flex flex-col sm:hidden gap-4">
        {steps.map((step) => (
          <div key={step.number} className="relative">
            <div
              className={`flex items-center gap-3 transition-all duration-300 ${
                onStepClick ? 'cursor-pointer' : 'cursor-default'
              }`}
              onClick={() => {
                if (onStepClick) {
                  onStepClick(step.number)
                }
              }}
            >
              <div
                className={`
                  w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center text-sm font-bold
                  transition-all duration-300
                  ${
                    step.number === currentStep
                      ? 'bg-blue-600 text-white'
                      : step.number < currentStep
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }
                `}
              >
                {step.number < currentStep ? '✓' : step.number}
              </div>
              <div className="text-right min-w-0 flex-1">
                <p 
                  className="text-sm font-medium text-gray-900 truncate" 
                  title={step.title}
                >
                  {step.title}
                </p>
                <p 
                  className="text-xs text-gray-500 truncate" 
                  title={step.description}
                >
                  {step.description}
                </p>
              </div>
            </div>
            {/* Vertical line between steps (mobile only) */}
            {step.number < steps.length && (
              <div
                className={`
                  absolute right-5 top-10 w-0.5 h-6 transition-all duration-300
                  ${
                    step.number < currentStep
                      ? 'bg-green-500'
                      : 'bg-gray-200'
                  }
                `}
              />
            )}
          </div>
        ))}
      </div>

      {/* Desktop: Horizontal Layout */}
      <div className="hidden sm:flex justify-between items-center relative">
        {steps.map((step, index) => (
          <div key={step.number} className="relative flex-1 flex flex-col items-center">
            <div
              className={`flex flex-col items-center gap-2 transition-all duration-300 min-w-0 ${
                onStepClick ? 'cursor-pointer' : 'cursor-default'
              }`}
              onClick={() => {
                if (onStepClick) {
                  onStepClick(step.number)
                }
              }}
            >
              <div
                className={`
                  w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center text-sm font-bold
                  transition-all duration-300 z-10 relative
                  ${
                    step.number === currentStep
                      ? 'bg-blue-600 text-white'
                      : step.number < currentStep
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }
                `}
              >
                {step.number < currentStep ? '✓' : step.number}
              </div>
              <div className="text-center min-w-0 w-full">
                <p 
                  className="text-sm font-medium text-gray-900 truncate px-1" 
                  title={step.title}
                >
                  {step.title}
                </p>
                <p 
                  className="text-xs text-gray-500 truncate px-1" 
                  title={step.description}
                >
                  {step.description}
                </p>
              </div>
            </div>
            {/* Connecting line between steps (desktop only) */}
            {index < steps.length - 1 && (
              <div
                className={`
                  absolute top-5 left-[50%] right-0 h-0.5 transition-all duration-300 z-0
                  ${
                    step.number < currentStep
                      ? 'bg-green-500'
                      : 'bg-gray-200'
                  }
                `}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
