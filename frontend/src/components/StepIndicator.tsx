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
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-6 text-center">שלבי הערכת השווי</h2>
      <div className="flex justify-between items-center">
        {steps.map((step) => (
          <div
            key={step.number}
            className={`flex flex-col items-center gap-2 transition-all duration-300 ${
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
                w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
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
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900">{step.title}</p>
              <p className="text-xs text-gray-500">{step.description}</p>
            </div>
            {step.number < steps.length && (
              <div
                className={`
                  w-full h-0.5 mt-5 transition-all duration-300
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
