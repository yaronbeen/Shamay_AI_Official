'use client'

import React, { useState, useEffect } from 'react'
import { Calculator, AlertCircle, CheckCircle, Info } from 'lucide-react'

interface FinalAssetValuationProps {
  finalPricePerSqm: number // From Section 5.1 analysis
  apartmentSqm: number // From measurement/permit
  balconySqm?: number // Optional balcony area
  propertyDescription?: string // For display in table
  onValuationComplete?: (valuation: Section52Data) => void
}

interface Section52Data {
  final_price_per_sqm: number
  apartment_sqm: number
  balcony_sqm: number
  balcony_coef: number
  effective_sqm: number
  asset_value_nis: number
  property_description: string
}

export default function FinalAssetValuation({
  finalPricePerSqm,
  apartmentSqm,
  balconySqm = 0,
  propertyDescription = '',
  onValuationComplete
}: FinalAssetValuationProps) {
  // State for balcony coefficient (default: 0.5, range: 0.1-1.5)
  const [balconyCoef, setBalconyCoef] = useState<number>(0.5)
  const [inputError, setInputError] = useState<string | null>(null)
  const [effectiveSqm, setEffectiveSqm] = useState<number>(0)
  const [assetValueNis, setAssetValueNis] = useState<number>(0)

  // Calculate effective area and asset value whenever inputs change
  useEffect(() => {
    // Calculate effective area: apartment + (balcony * coefficient)
    const balconyContribution = balconySqm > 0 ? balconySqm * balconyCoef : 0
    const effective = Math.ceil(apartmentSqm + balconyContribution) // Round up to whole sqm
    setEffectiveSqm(effective)

    // Calculate asset value: price per sqm * effective sqm
    const value = finalPricePerSqm * effective
    // Round to nearest 1,000 NIS
    const roundedValue = Math.round(value / 1000) * 1000
    setAssetValueNis(roundedValue)

    // Notify parent component
    if (onValuationComplete) {
      const valuationData: Section52Data = {
        final_price_per_sqm: finalPricePerSqm,
        apartment_sqm: apartmentSqm,
        balcony_sqm: balconySqm,
        balcony_coef: balconyCoef,
        effective_sqm: effective,
        asset_value_nis: roundedValue,
        property_description: propertyDescription
      }
      onValuationComplete(valuationData)
    }
  }, [balconyCoef, apartmentSqm, balconySqm, finalPricePerSqm, propertyDescription, onValuationComplete])

  // Handle balcony coefficient change with validation
  const handleCoefChange = (value: string) => {
    const numValue = parseFloat(value)
    
    // Validate range [0.1, 1.5]
    if (isNaN(numValue)) {
      setInputError('נא להזין ערך מספרי')
      return
    }
    
    if (numValue < 0.1 || numValue > 1.5) {
      setInputError('ערך מקדם לא תקין. ניתן להזין ערך בין 0.1 ל-1.5 בלבד.')
      return
    }

    setInputError(null)
    setBalconyCoef(numValue)
  }

  // Format number with thousands separator and currency
  const formatPrice = (value: number): string => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('he-IL').format(value)
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Calculator className="w-5 h-5" />
        סעיף 5.2 - חישוב שווי נכס סופי
      </h3>

      {/* Intro Text */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-gray-700 leading-relaxed">
          נוכח נתוני ההשוואה שנאספו, ולאחר ביצוע ההתאמות הנדרשות לנכס נשוא השומה, 
          שווי מ״ר בנוי לנכס נשוא השומה בגבולות{' '}
          <span className="font-bold text-blue-900">{formatPrice(finalPricePerSqm)}</span>.
        </p>
      </div>

      {/* Main Calculation Table */}
      <div className="mb-6 overflow-hidden border border-gray-200 rounded-lg">
        <table className="w-full text-sm" dir="rtl">
          <thead className="bg-gray-100">
            <tr className="text-right">
              <th className="p-3 border-b border-gray-300 font-semibold">תיאור הנכס</th>
              <th className="p-3 border-b border-gray-300 font-semibold text-center">
                שטח דירה במ״ר
              </th>
              {balconySqm > 0 && (
                <th className="p-3 border-b border-gray-300 font-semibold text-center">
                  מרפסת
                </th>
              )}
              <th className="p-3 border-b border-gray-300 font-semibold text-center">
                מ״ר אקו׳
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-3 border-b border-gray-200">
                {propertyDescription || 'נכס נשוא השומה'}
              </td>
              <td className="p-3 border-b border-gray-200 text-center font-medium">
                {formatNumber(apartmentSqm)}
              </td>
              {balconySqm > 0 && (
                <td className="p-3 border-b border-gray-200 text-center font-medium">
                  {formatNumber(balconySqm)}
                </td>
              )}
              <td className="p-3 border-b border-gray-200 text-center font-bold text-blue-900">
                {formatNumber(effectiveSqm)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Balcony Coefficient Input (only show if balcony exists) */}
      {balconySqm > 0 && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                מקדם אקו׳ למרפסת
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0.1"
                  max="1.5"
                  step="0.1"
                  value={balconyCoef}
                  onChange={(e) => handleCoefChange(e.target.value)}
                  className={`w-24 px-3 py-2 border rounded-md text-center font-medium ${
                    inputError
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                  dir="ltr"
                />
                <span className="text-xs text-gray-600">
                  (טווח: 0.1 - 1.5)
                </span>
              </div>
              {inputError && (
                <div className="mt-2 flex items-center gap-2 text-red-700 text-xs">
                  <AlertCircle className="w-4 h-4" />
                  <span>{inputError}</span>
                </div>
              )}
              <p className="mt-2 text-xs text-gray-500">
                ערך ברירת המחדל: 0.5. ניתן לשנות את המקדם בהתאם למאפייני המרפסת.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Section */}
      <div className="space-y-3">
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">שווי מ״ר בנוי</div>
              <div className="text-xl font-bold text-blue-900">
                {formatPrice(finalPricePerSqm)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">ש״ח שווי הנכס</div>
              <div className="text-2xl font-bold text-green-900">
                {formatPrice(assetValueNis)}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Text */}
        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-900 font-medium">
            השווי כולל מע״מ.
          </p>
        </div>
      </div>

      {/* Calculation Details (for transparency) */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">פירוט החישוב:</h4>
        <div className="text-xs text-gray-600 space-y-1" dir="rtl">
          <div>
            <span className="font-medium">שטח דירה:</span> {formatNumber(apartmentSqm)} מ״ר
          </div>
          {balconySqm > 0 && (
            <>
              <div>
                <span className="font-medium">שטח מרפסת:</span> {formatNumber(balconySqm)} מ״ר
              </div>
              <div>
                <span className="font-medium">מקדם אקו׳:</span> {balconyCoef}
              </div>
              <div>
                <span className="font-medium">תרומת מרפסת:</span>{' '}
                {formatNumber(balconySqm * balconyCoef)} מ״ר
              </div>
            </>
          )}
          <div className="pt-2 border-t border-gray-300">
            <span className="font-medium">שטח אפקטיבי:</span>{' '}
            {apartmentSqm} + {balconySqm > 0 ? `(${balconySqm} × ${balconyCoef})` : '0'} ={' '}
            <span className="font-bold">{formatNumber(effectiveSqm)} מ״ר</span>
          </div>
          <div className="pt-2 border-t border-gray-300">
            <span className="font-medium">חישוב שווי:</span>{' '}
            {formatPrice(finalPricePerSqm)} × {formatNumber(effectiveSqm)} מ״ר ={' '}
            <span className="font-bold">{formatPrice(assetValueNis)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

