'use client'

import React, { useState, useEffect } from 'react'
import { Calculator, FileText, CheckCircle, AlertTriangle } from 'lucide-react'
import { formatCurrency, formatNumber, roundToThousand, numberToHebrewText } from '../../lib/utils/hebrew'
import { DataSource } from '../ui/DataSource'

interface CalculationData {
  equivalentArea: number
  averagePricePerSqm: number
  adjustedPrice: number
  finalValuation: number
  assetValueText: string
}

interface Step5FinalReviewProps {
  data: any
  comparableData: any[]
  onCalculationsChange: (calculations: CalculationData) => void
  onValidationChange: (isValid: boolean) => void
}

export function Step5FinalReview({ 
  data, 
  comparableData, 
  onCalculationsChange, 
  onValidationChange 
}: Step5FinalReviewProps) {
  const [calculations, setCalculations] = useState<CalculationData | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)

  // Calculate final valuation
  useEffect(() => {
    calculateFinalValuation()
  }, [data, comparableData])

  const calculateFinalValuation = async () => {
    setIsCalculating(true)
    
    try {
      // Get included comparable data
      const includedData = comparableData.filter(item => item.include)
      
      if (includedData.length < 3) {
        setCalculations(null)
        onValidationChange(false)
        return
      }

      // Calculate equivalent area (Built + Balcony × 0.5)
      const builtArea = data.builtArea || data.area || 85
      const balconyArea = data.balconyArea || 0
      const equivalentArea = builtArea + (balconyArea * 0.5)

      // Calculate average price per sqm
      const pricesPerSqm = includedData.map(item => item.price_per_sqm)
      const averagePricePerSqm = pricesPerSqm.reduce((sum, price) => sum + price, 0) / pricesPerSqm.length

      // Apply adjustments based on market analysis
      let adjustedPrice = averagePricePerSqm
      
      if (data.marketAnalysis) {
        // Market trend adjustment
        const marketTrend = data.marketAnalysis.marketTrend
        if (marketTrend && marketTrend.includes('עלייה')) {
          const trendMatch = marketTrend.match(/(\d+\.?\d*)%/)
          if (trendMatch) {
            const trendPercent = parseFloat(trendMatch[1])
            adjustedPrice = adjustedPrice * (1 + trendPercent / 100)
          }
        }
        
        // Demand level adjustment
        if (data.marketAnalysis.demandLevel === 'בינוני-גבוה') {
          adjustedPrice = adjustedPrice * 1.05
        } else if (data.marketAnalysis.demandLevel === 'נמוך') {
          adjustedPrice = adjustedPrice * 0.95
        }
      }

      // Property condition adjustments
      if (data.propertyAnalysis) {
        if (data.propertyAnalysis.buildingCondition === 'מעולה') {
          adjustedPrice = adjustedPrice * 1.08
        } else if (data.propertyAnalysis.buildingCondition === 'בינוני') {
          adjustedPrice = adjustedPrice * 0.95
        }
      }

      // Calculate final valuation (rounded to thousands)
      const finalValuation = roundToThousand(adjustedPrice * equivalentArea)
      
      // Convert to Hebrew text
      const assetValueText = numberToHebrewText(finalValuation)

      const calculationResult: CalculationData = {
        equivalentArea,
        averagePricePerSqm: Math.round(averagePricePerSqm),
        adjustedPrice: Math.round(adjustedPrice),
        finalValuation,
        assetValueText
      }

      setCalculations(calculationResult)
      onCalculationsChange(calculationResult)
      onValidationChange(true)

    } catch (error) {
      console.error('Error calculating valuation:', error)
      setCalculations(null)
      onValidationChange(false)
    } finally {
      setIsCalculating(false)
    }
  }

  if (isCalculating) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <Calculator className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">מחשב שווי נכס...</h3>
          <p className="text-gray-500">זה עשוי לקחת מספר שניות</p>
        </div>
      </div>
    )
  }

  if (!calculations) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <h3 className="text-lg font-semibold text-red-800">לא ניתן לחשב שווי</h3>
          </div>
          <p className="text-red-700">
            יש לבחור לפחות 3 עסקאות השוואה כדי לחשב את שווי הנכס
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-right">
          סיכום ותחשיב סופי
        </h2>
        <p className="text-gray-600 text-right">
          בדוק את החישובים הסופיים לפני יצירת השומה
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Calculation Table */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Calculator className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">תחשיב שווי הנכס</h3>
          </div>

          <div className="space-y-4">
            {/* Equivalent Area */}
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-gray-600">שטח אקוויוולנטי:</span>
              <div className="text-right">
                <div className="font-medium">{calculations.equivalentArea.toFixed(1)} מ"ר</div>
                <div className="text-xs text-gray-500">
                  {data.builtArea || data.area} + ({data.balconyArea || 0} × 0.5)
                </div>
              </div>
            </div>

            {/* Average Price per SQM */}
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-gray-600">מחיר ממוצע למ"ר:</span>
              <div className="text-right">
                <div className="font-medium">{formatCurrency(calculations.averagePricePerSqm)}</div>
                <DataSource source="csv" details="מנתוני השוואה" />
              </div>
            </div>

            {/* Adjusted Price */}
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-gray-600">מחיר מותאם למ"ר:</span>
              <div className="text-right">
                <div className="font-medium">{formatCurrency(calculations.adjustedPrice)}</div>
                <div className="text-xs text-gray-500">
                  כולל התאמות שוק ונכס
                </div>
              </div>
            </div>

            {/* Final Valuation */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-blue-900">שווי נכס סופי:</span>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-900">
                    {formatCurrency(calculations.finalValuation)}
                  </div>
                  <div className="text-sm text-blue-700">
                    מעוגל לאלפים
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hebrew Conversion */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-6 h-6 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">המרה לעברית</h3>
          </div>

          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">שווי הנכס במילים:</h4>
              <p className="text-green-800 text-lg leading-relaxed">
                {calculations.assetValueText} שקל
              </p>
            </div>

            <div className="text-sm text-gray-600">
              <p className="mb-2">
                <strong>הערה:</strong> השווי כולל מע"מ ונכון לתאריך השומה.
              </p>
              <p>
                השווי מבוסס על ניתוח השוואתי של {comparableData.filter(item => item.include).length} עסקאות 
                דומות באזור, תוך התחשבות במאפייני הנכס ומצב השוק הנוכחי.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">סיכום נתונים</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {comparableData.filter(item => item.include).length}
            </div>
            <div className="text-sm text-gray-600">עסקאות נבחרות</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(calculations.averagePricePerSqm)}
            </div>
            <div className="text-sm text-gray-600">מחיר ממוצע למ"ר</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {calculations.equivalentArea.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">שטח אקוויוולנטי</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(calculations.finalValuation)}
            </div>
            <div className="text-sm text-gray-600">שווי סופי</div>
          </div>
        </div>
      </div>

      {/* Validation Status */}
      <div className="mt-6 flex items-center justify-center">
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">החישובים מוכנים לייצוא</span>
        </div>
      </div>
    </div>
  )
}
