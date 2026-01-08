/**
 * AI Auto-Fill Section for Step 3
 * Automatically generates property description fields using chat AI
 */

'use client'

import React, { useState, useEffect } from 'react'
import { AIGeneratedField } from './AIGeneratedField'
import {
  generatePropertyDescription,
  generateEnvironmentDescription,
  type PropertyData,
  type AIAutoFillResult
} from '@/lib/ai-auto-fill'
import { Sparkles } from 'lucide-react'

interface AIAutoFillSectionProps {
  sessionId: string
  data: PropertyData
  onFieldUpdate: (fieldName: string, value: string) => void
}

interface FieldState {
  value: string
  isLoading: boolean
}

export function AIAutoFillSection({
  sessionId,
  data,
  onFieldUpdate
}: AIAutoFillSectionProps) {
  const [propertyDescription, setPropertyDescription] = useState<FieldState>({
    value: '',
    isLoading: false
  })

  const [environmentDescription, setEnvironmentDescription] = useState<FieldState>({
    value: '',
    isLoading: false
  })

  const [hasAutoFilled, setHasAutoFilled] = useState(false)

  // Auto-fill on mount (only once)
  useEffect(() => {
    if (!hasAutoFilled && sessionId) {
      handleAutoFillAll()
      setHasAutoFilled(true)
    }
  }, [sessionId, hasAutoFilled])

  const handleAutoFillAll = async () => {
    // Generate both descriptions in parallel
    await Promise.all([
      handleGeneratePropertyDescription(),
      handleGenerateEnvironmentDescription()
    ])
  }

  const handleGeneratePropertyDescription = async () => {
    setPropertyDescription(prev => ({ ...prev, isLoading: true }))

    const result = await generatePropertyDescription(sessionId, data)

    if (result.success && result.generatedText) {
      setPropertyDescription({
        value: result.generatedText,
        isLoading: false
      })

      // Update the parent component with generated values
      onFieldUpdate('propertyLayoutDescription', result.generatedText)
    } else {
      setPropertyDescription(prev => ({ ...prev, isLoading: false }))
      console.error('Failed to generate property description:', result.error)
    }
  }

  const handleGenerateEnvironmentDescription = async () => {
    setEnvironmentDescription(prev => ({ ...prev, isLoading: true }))

    const result = await generateEnvironmentDescription(sessionId, data)

    if (result.success && result.generatedText) {
      setEnvironmentDescription({
        value: result.generatedText,
        isLoading: false
      })

      onFieldUpdate('environmentDescription', result.generatedText)
    } else {
      setEnvironmentDescription(prev => ({ ...prev, isLoading: false }))
      console.error('Failed to generate environment description:', result.error)
    }
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200 mb-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-blue-600" />
        <h2 className="text-xl font-bold text-gray-900">תיאורי נכס - נוצר ע"י AI</h2>
      </div>

      <p className="text-sm text-gray-600 mb-6 text-right">
        התיאורים הבאים נוצרו אוטומטית על בסיס הנתונים שהזנת בשלבים הקודמים.
        ניתן לערוך את הטקסט באופן חופשי או לצור מחדש.
      </p>

      {/* Fields */}
      <div className="space-y-4">
        <AIGeneratedField
          label="תיאור נשוא השומה (פרק 1.3)"
          value={propertyDescription.value}
          isLoading={propertyDescription.isLoading}
          onRegenerate={handleGeneratePropertyDescription}
          onChange={(newValue) => {
            setPropertyDescription(prev => ({ ...prev, value: newValue }))
            onFieldUpdate('propertyLayoutDescription', newValue)
          }}
          rows={8}
        />

        <AIGeneratedField
          label="תיאור הסביבה (פרק 1.1)"
          value={environmentDescription.value}
          isLoading={environmentDescription.isLoading}
          onRegenerate={handleGenerateEnvironmentDescription}
          onChange={(newValue) => {
            setEnvironmentDescription(prev => ({ ...prev, value: newValue }))
            onFieldUpdate('environmentDescription', newValue)
          }}
          rows={8}
        />
      </div>

      {/* Info note */}
      <div className="mt-4 p-3 bg-blue-100 border border-blue-300 rounded-lg">
        <p className="text-xs text-blue-800 text-right">
          💡 <strong>שים לב:</strong> התיאורים נוצרו אוטומטית על בסיס הנתונים מהשלבים הקודמים. ניתן לערוך באופן חופשי.
        </p>
      </div>
    </div>
  )
}
