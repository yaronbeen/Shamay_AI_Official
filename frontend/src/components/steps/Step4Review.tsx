'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Calculator, TrendingUp, RefreshCw, Building, MapPin, AlertTriangle } from 'lucide-react'
import { ValuationData } from '../ValuationWizard'

interface Step4ReviewProps {
  data: ValuationData
  updateData: (updates: Partial<ValuationData>) => void
}

interface ComparableData {
  id: string
  address: string
  rooms: number
  floor: number
  area: number
  price: number
  price_per_sqm: number
  sale_date: string
  neighborhood: string
  city: string
  include: boolean
}

export function Step4Review({ data, updateData }: Step4ReviewProps) {
  const [comparableData, setComparableData] = useState<ComparableData[]>([])
  const [loading, setLoading] = useState(false)
  const [calculations, setCalculations] = useState({
    averagePricePerSqm: 0,
    adjustedPrice: 0,
    finalValuation: 0
  })

  // ✅ NEW: Compress image to reduce base64 size
  const compressImage = (base64: string, maxWidth: number = 800, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        // Calculate new dimensions
        let { width, height } = img
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        
        canvas.width = width
        canvas.height = height
        
        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height)
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality)
        resolve(compressedBase64)
      }
      img.src = base64
    })
  }

  // ✅ ENHANCED: Fetch real comparable data using backend service
  const fetchComparableData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        city: data.city || 'תל אביב', // Default to Tel Aviv
        rooms: data.rooms?.toString() || ''
      })

      console.log('🔍 Frontend: Fetching comparable data with params:', params.toString())
      console.log('🔍 Frontend: Data object:', {
        city: data.city,
        rooms: data.rooms,
        address: data.address,
        fullAddress: data.fullAddress
      })

      // ✅ DEBUG: Test the debug endpoint first
      try {
        const debugResponse = await fetch(`/api/debug-query?${params.toString()}`)
        const debugResult = await debugResponse.json()
        console.log('🔍 Debug query result:', debugResult)
      } catch (debugError) {
        console.log('⚠️ Debug query failed:', debugError)
      }

      // ✅ NEW: Use backend service for database queries
      const response = await fetch(`/api/session/${data.sessionId}/comparable-data?${params}`)
      const result = await response.json()
      
      console.log('📊 Comparable data response:', result)
      
      if (result.success && result.data && result.data.length > 0) {
        const dataWithInclude = result.data.map((item: any) => ({
          ...item,
          include: true // Include all by default
        }))
        setComparableData(dataWithInclude)
        console.log('✅ Comparable data loaded via', result.source + ':', dataWithInclude.length, 'items')
      } else {
        console.error('❌ No comparable data found:', result.error || 'No data returned')
        console.log('📊 Debug info:', result.debug)
        setComparableData([])
      }
    } catch (error) {
      console.error('❌ Failed to fetch comparable data:', error)
      setComparableData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // ✅ ENHANCED: Always try to fetch data, even without all parameters
    fetchComparableData()
  }, [data.sessionId]) // ✅ FIXED: Only depend on sessionId to avoid infinite loops

  // ✅ ENHANCED: Calculate valuation using Step 3 analysis data + comparable data
  useEffect(() => {
    const includedData = comparableData.filter(item => item.include)
    
    if (includedData.length > 0) {
      console.log('🧮 Calculating valuation with', includedData.length, 'comparable properties')
      console.log('📊 Sample data item:', includedData[0]) // Debug the data structure
      
      // ✅ FIXED: Handle missing price_per_sqm field and calculate it if needed
      const validData = includedData.filter(item => {
        const price = item.price || item.declared_price
        const area = item.area || item.apartment_area_sqm
        return price && area && !isNaN(price) && !isNaN(area)
      })
      
      if (validData.length === 0) {
        console.log('⚠️ No valid comparable data for calculations')
        setCalculations({
          averagePricePerSqm: 0,
          adjustedPrice: 0,
          finalValuation: 0
        })
        return
      }
      
      // Calculate price per sqm for each item
      const pricesPerSqm = validData.map(item => {
        const price = item.price || item.declared_price
        const area = item.area || item.apartment_area_sqm
        return Math.round(price / area)
      })
      
      console.log('📊 Calculated prices per sqm:', pricesPerSqm)
      
      const averagePricePerSqm = pricesPerSqm.reduce((sum, price) => sum + price, 0) / pricesPerSqm.length
      
      // ✅ NEW: Use Step 3 market analysis data for adjustments
      let adjustedPrice = averagePricePerSqm
      
      if (data.marketAnalysis) {
        // Apply market trend adjustment
        const marketTrend = data.marketAnalysis.marketTrend
        if (marketTrend && marketTrend.includes('עלייה')) {
          const trendMatch = marketTrend.match(/(\d+\.?\d*)%/)
          if (trendMatch) {
            const trendPercent = parseFloat(trendMatch[1])
            adjustedPrice = adjustedPrice * (1 + trendPercent / 100)
            console.log('📈 Applied market trend adjustment:', trendPercent + '%')
          }
        }
        
        // Apply demand level adjustment
        if (data.marketAnalysis.demandLevel === 'בינוני-גבוה') {
          adjustedPrice = adjustedPrice * 1.05 // 5% premium for high demand
          console.log('📈 Applied high demand premium: 5%')
        } else if (data.marketAnalysis.demandLevel === 'נמוך') {
          adjustedPrice = adjustedPrice * 0.95 // 5% discount for low demand
          console.log('📉 Applied low demand discount: 5%')
        }
      }
      
      // ✅ NEW: Apply property analysis adjustments
      if (data.propertyAnalysis) {
        // Building condition adjustment
        if (data.propertyAnalysis.buildingCondition === 'מעולה') {
          adjustedPrice = adjustedPrice * 1.08 // 8% premium for excellent condition
          console.log('🏢 Applied excellent condition premium: 8%')
        } else if (data.propertyAnalysis.buildingCondition === 'בינוני') {
          adjustedPrice = adjustedPrice * 0.95 // 5% discount for average condition
          console.log('🏢 Applied average condition discount: 5%')
        }
        
        // Neighborhood rating adjustment
        if (data.propertyAnalysis.neighborhoodRating) {
          const rating = parseFloat(data.propertyAnalysis.neighborhoodRating.replace('/10', ''))
          if (!isNaN(rating)) {
            if (rating >= 8) {
              adjustedPrice = adjustedPrice * 1.03 // 3% premium for high-rated neighborhood
              console.log('🏘️ Applied high neighborhood rating premium: 3%')
            } else if (rating <= 6) {
              adjustedPrice = adjustedPrice * 0.97 // 3% discount for lower-rated neighborhood
              console.log('🏘️ Applied low neighborhood rating discount: 3%')
            }
          }
        }
      }
      
      // ✅ NEW: Apply risk assessment adjustments
      if (data.riskAssessment) {
        if (data.riskAssessment.overallRisk === 'נמוך') {
          adjustedPrice = adjustedPrice * 1.02 // 2% premium for low risk
          console.log('⚠️ Applied low risk premium: 2%')
        } else if (data.riskAssessment.overallRisk === 'גבוה') {
          adjustedPrice = adjustedPrice * 0.95 // 5% discount for high risk
          console.log('⚠️ Applied high risk discount: 5%')
        }
      }
      
      const finalValuation = Math.round(adjustedPrice * (data.area || 85)) // Use property area or default
      
      console.log('💰 Final calculations:', {
        averagePricePerSqm: Math.round(averagePricePerSqm),
        adjustedPrice: Math.round(adjustedPrice),
        finalValuation,
        area: data.area || 85,
        validDataCount: validData.length
      })
      
      setCalculations({
        averagePricePerSqm: Math.round(averagePricePerSqm),
        adjustedPrice: Math.round(adjustedPrice),
        finalValuation
      })
      
      // Update the data with calculated values
      updateData({
        comparableData: includedData,
        finalValuation,
        pricePerSqm: Math.round(adjustedPrice)
      })
    } else {
      console.log('⚠️ No comparable data available for calculations')
      setCalculations({
        averagePricePerSqm: 0,
        adjustedPrice: 0,
        finalValuation: 0
      })
    }
  }, [comparableData, data.area, data.marketAnalysis, data.propertyAnalysis, data.riskAssessment, updateData])

  const toggleInclude = (id: string) => {
    setComparableData(prev => 
      prev.map(item => 
        item.id === id ? { ...item, include: !item.include } : item
      )
    )
  }

  const saveAssessment = async () => {
    try {
      // ✅ NEW: Compress the selected image to reduce payload size
      let compressedImagePreview = null
      if (data.selectedImagePreview) {
        console.log('🖼️ Original image size:', data.selectedImagePreview.length, 'characters')
        try {
          compressedImagePreview = await compressImage(data.selectedImagePreview, 600, 0.7)
          console.log('🖼️ Compressed image size:', compressedImagePreview.length, 'characters')
          console.log('🖼️ Size reduction:', Math.round((1 - compressedImagePreview.length / data.selectedImagePreview.length) * 100) + '%')
        } catch (error) {
          console.error('❌ Error compressing image:', error)
          compressedImagePreview = data.selectedImagePreview // Fallback to original
        }
      }

      const assessmentData = {
        // Basic property data
        address: data.address || data.fullAddress,
        clientName: data.clientName,
        valuationDate: data.valuationDate,
        shamayName: data.shamayName,
        shamaySerialNumber: data.shamaySerialNumber,
        
        // Property characteristics
        rooms: data.rooms,
        floor: data.floor,
        area: data.area,
        balcony: data.balcony,
        parking: data.parking,
        elevator: data.elevator,
        
        // Calculations
        finalValuation: data.finalValuation,
        pricePerSqm: data.pricePerSqm,
        comparableData: data.comparableData,
        
        // ✅ NEW: Include Step 3 analysis data
        propertyAnalysis: data.propertyAnalysis,
        marketAnalysis: data.marketAnalysis,
        riskAssessment: data.riskAssessment,
        recommendations: data.recommendations,
        
        // Images and signature
        signaturePreview: data.signaturePreview,
        signature: data.signature,
        
        // ✅ FIXED: Use compressed image preview to reduce payload size
        selectedImagePreview: compressedImagePreview,
        selectedImageName: data.propertyImages[data.selectedImageIndex || 0]?.name || null,
        selectedImageIndex: data.selectedImageIndex || 0,
        totalImages: data.propertyImages?.length || 0
      }

      console.log('💾 Saving assessment with analysis data:', {
        hasPropertyAnalysis: !!data.propertyAnalysis,
        hasMarketAnalysis: !!data.marketAnalysis,
        hasRiskAssessment: !!data.riskAssessment,
        hasRecommendations: !!data.recommendations,
        hasSelectedImagePreview: !!compressedImagePreview,
        selectedImageName: data.propertyImages[data.selectedImageIndex || 0]?.name,
        selectedImageIndex: data.selectedImageIndex,
        totalImages: data.propertyImages?.length || 0,
        hasSignaturePreview: !!data.signaturePreview,
        hasSignature: !!data.signature,
        shamayName: data.shamayName,
        shamaySerialNumber: data.shamaySerialNumber,
        selectedImagePreviewLength: compressedImagePreview?.length || 0,
        payloadSize: JSON.stringify(assessmentData).length
      })

      // ✅ NEW: Check payload size and warn if too large
      const payloadSize = JSON.stringify(assessmentData).length
      if (payloadSize > 1000000) { // 1MB limit
        console.warn('⚠️ Large payload size:', payloadSize, 'bytes')
      }

      const response = await fetch(`/api/session/${data.sessionId}/property-assessment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assessmentData)
      })

      if (response.ok) {
        console.log('✅ Assessment saved successfully')
        updateData({ isComplete: true })
      } else {
        console.error('❌ Failed to save assessment')
      }
    } catch (error) {
      console.error('❌ Error saving assessment:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">סקירה וסיכום</h2>
        <p className="text-gray-600">בדוק את הנתונים והחישובים לפני היצוא</p>
      </div>

      {/* ✅ NEW: Step 3 Analysis Summary */}
      {(data.propertyAnalysis || data.marketAnalysis || data.riskAssessment) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
            <Building className="h-5 w-5 mr-2" />
            סיכום ניתוח מקצועי (משלב 3)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {data.propertyAnalysis && (
              <div className="bg-white p-3 rounded border">
                <h4 className="font-semibold text-blue-800 mb-2">ניתוח הנכס</h4>
                <p><strong>מצב הבניין:</strong> {data.propertyAnalysis.buildingCondition}</p>
                <p><strong>דירוג שכונה:</strong> {data.propertyAnalysis.neighborhoodRating}</p>
                <p><strong>נגישות:</strong> {data.propertyAnalysis.accessibility}</p>
              </div>
            )}
            
            {data.marketAnalysis && (
              <div className="bg-white p-3 rounded border">
                <h4 className="font-semibold text-green-800 mb-2">ניתוח שוק</h4>
                <p><strong>מחיר ממוצע:</strong> ₪{data.marketAnalysis.averagePricePerSqm.toLocaleString()}/מ"ר</p>
                <p><strong>מגמת שוק:</strong> {data.marketAnalysis.marketTrend}</p>
                <p><strong>רמת ביקוש:</strong> {data.marketAnalysis.demandLevel}</p>
              </div>
            )}
            
            {data.riskAssessment && (
              <div className="bg-white p-3 rounded border">
                <h4 className="font-semibold text-yellow-800 mb-2">הערכת סיכונים</h4>
                <p><strong>סיכון כולל:</strong> {data.riskAssessment.overallRisk}</p>
                <p><strong>סיכונים משפטיים:</strong> {data.riskAssessment.legalRisks}</p>
                <p><strong>סיכוני שוק:</strong> {data.riskAssessment.marketRisks}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ✅ NEW: Recommendations from Step 3 */}
      {data.recommendations && data.recommendations.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-purple-900 mb-3 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            המלצות מקצועיות
          </h3>
          <ul className="space-y-1 text-sm">
            {data.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start">
                <span className="text-purple-600 mr-2">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Comparable Data Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <MapPin className="h-5 w-5 mr-2" />
            נתוני השוואה
          </h3>
          <button
            onClick={fetchComparableData}
            disabled={loading}
            className="flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            רענן נתונים
          </button>
        </div>

        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">טוען נתוני השוואה...</p>
          </div>
        ) : comparableData.length > 0 ? (
          <div className="space-y-3">
            {comparableData.map((item) => (
              <div
                key={item.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  item.include 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}
                onClick={() => toggleInclude(item.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {item.include ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    ) : (
                      <XCircle className="h-5 w-5 text-gray-400 mr-2" />
                    )}
                    <div>
                      <p className="font-medium">{item.address}</p>
                      <p className="text-sm text-gray-600">
                        {item.rooms} חדרים • קומה {item.floor} • {item.area} מ"ר
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">₪{item.price.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">₪{item.price_per_sqm.toLocaleString()}/מ"ר</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            <p>לא נמצאו נתוני השוואה מתאימים</p>
          </div>
        )}
      </div>

      {/* Calculations Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calculator className="h-5 w-5 mr-2" />
          חישוב שווי
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-sm text-gray-600">מחיר ממוצע למ"ר</p>
            <p className="text-lg font-semibold">₪{calculations.averagePricePerSqm.toLocaleString()}</p>
          </div>
          
          <div className="bg-blue-50 p-3 rounded">
            <p className="text-sm text-gray-600">מחיר מותאם למ"ר</p>
            <p className="text-lg font-semibold text-blue-600">₪{calculations.adjustedPrice.toLocaleString()}</p>
            <p className="text-xs text-gray-500">כולל התאמות משלב 3</p>
          </div>
          
          <div className="bg-green-50 p-3 rounded">
            <p className="text-sm text-gray-600">שווי סופי</p>
            <p className="text-xl font-bold text-green-600">₪{calculations.finalValuation.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Image Selection Summary */}
      {data.propertyImages && data.propertyImages.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-green-900 mb-2">תמונות נכס</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-800">
                <strong>סה"כ תמונות:</strong> {data.propertyImages.length}
              </p>
              <p className="text-sm text-green-800">
                <strong>תמונה נבחרת:</strong> {data.propertyImages[data.selectedImageIndex || 0]?.name || 'לא נבחרה'}
              </p>
              <p className="text-sm text-green-800">
                <strong>תצוגה מקדימה:</strong> {data.selectedImagePreview ? '✓ זמינה' : '✗ לא זמינה'}
              </p>
              {data.selectedImagePreview && (
                <p className="text-xs text-green-700">
                  <strong>גודל תמונה:</strong> {Math.round(data.selectedImagePreview.length / 1024)} KB
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-green-600">
                תמונה {((data.selectedImageIndex || 0) + 1)} מתוך {data.propertyImages.length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          onClick={saveAssessment}
          className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <TrendingUp className="h-5 w-5 mr-2" />
          שמור הערכה
        </button>
      </div>
    </div>
  )
}
      