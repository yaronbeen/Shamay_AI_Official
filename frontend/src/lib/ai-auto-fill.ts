/**
 * AI Auto-Fill Helper for Step 3 Property Description Fields
 * Auto-answers calibration questions based on extracted data from Steps 1-2
 */

import { section13, type CalibrationQuestion } from './chat/report-sections'

export interface PropertyData {
  // From Step 1
  street?: string
  buildingNumber?: string
  city?: string
  rooms?: number
  floor?: string | number
  airDirections?: string
  area?: number

  // From Step 2 / Extracted Data
  extractedData?: {
    propertyCondition?: string
    finishLevel?: string
    finish_standard?: string
    finishDetails?: string
    finish_details?: string
    propertyLayoutDescription?: string
    internal_layout?: string
    environmentDescription?: string
    environment_description?: string
    [key: string]: any
  }
}

export interface AIAutoFillResult {
  success: boolean
  generatedText?: string
  questionsAsked?: Array<{ question: string; answer: string }>
  error?: string
}

/**
 * Auto-answer Section 1.3 calibration questions based on available data
 */
export function autoAnswerSection13Questions(data: PropertyData): Record<string, string> {
  const answers: Record<string, string> = {}

  // Q1: Location in building + air directions
  if (data.floor || data.airDirections) {
    let locationDesc = ''
    if (data.floor) {
      locationDesc += `קומה ${data.floor}`
    }
    if (data.airDirections) {
      const directions = data.airDirections
      locationDesc += locationDesc ? `, כיווני אוויר: ${directions}` : `כיווני אוויר: ${directions}`
    }
    answers['q1_3_location'] = locationDesc || 'לא ידוע'
  }

  // Q2: Internal layout
  if (data.extractedData?.propertyLayoutDescription || data.extractedData?.internal_layout) {
    answers['q1_3_layout'] = data.extractedData.propertyLayoutDescription || data.extractedData.internal_layout || ''
  } else if (data.rooms) {
    // Infer basic layout from room count
    answers['q1_3_layout'] = `דירה בת ${data.rooms} חדרים`
  }

  // Q3: Finish standard
  const finishLevel = data.extractedData?.finishLevel || data.extractedData?.finish_standard
  const finishDetails = data.extractedData?.finishDetails || data.extractedData?.finish_details

  if (finishLevel || finishDetails) {
    let finishDesc = ''
    if (finishLevel) {
      finishDesc += finishLevel
    }
    if (finishDetails) {
      finishDesc += finishDesc ? `. ${finishDetails}` : finishDetails
    }
    answers['q1_3_finish'] = finishDesc
  }

  return answers
}

/**
 * Generate AI text for property description by calling chat API
 */
export async function generatePropertyDescription(
  sessionId: string,
  data: PropertyData
): Promise<AIAutoFillResult> {
  try {
    // Build the calibration answers
    const calibrationAnswers = autoAnswerSection13Questions(data)

    // Format questions and answers for AI
    const questionsAsked: Array<{ question: string; answer: string }> = []
    section13.calibrationQuestions.forEach((q) => {
      const answer = calibrationAnswers[q.id]
      if (answer) {
        questionsAsked.push({
          question: q.question,
          answer: answer
        })
      }
    })

    // Build the prompt for Section 1.3
    let prompt = `אני צריך שתכתוב עבורי את סעיף 1.3 - תיאור נשוא השומה.\n\n`
    prompt += `הנה התשובות לשאלות התכיילות:\n\n`

    questionsAsked.forEach((qa, idx) => {
      prompt += `${idx + 1}. ${qa.question}\n`
      prompt += `   תשובה: ${qa.answer}\n\n`
    })

    prompt += `\nפרטי הנכס הנוספים:\n`
    if (data.street && data.buildingNumber && data.city) {
      prompt += `- כתובת: ${data.street} ${data.buildingNumber}, ${data.city}\n`
    }
    if (data.rooms) {
      prompt += `- חדרים: ${data.rooms}\n`
    }
    if (data.area) {
      prompt += `- שטח: ${data.area} מ"ר\n`
    }

    prompt += `\nכתוב את הסעיף בפורמט מקצועי, תמציתי וענייני.`

    // Call the chat API
    const response = await fetch(`/api/session/${sessionId}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: prompt,
        conversationHistory: []
      })
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    // Stream the response
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    const decoder = new TextDecoder()
    let generatedText = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      generatedText += chunk
    }

    return {
      success: true,
      generatedText: generatedText.trim(),
      questionsAsked
    }
  } catch (error) {
    console.error('AI auto-fill error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Generate environment description (Section 1.1)
 * Uses AI to research the surroundings based on address
 */
export async function generateEnvironmentDescription(
  sessionId: string,
  data: PropertyData
): Promise<AIAutoFillResult> {
  try {
    let prompt = `כתוב תיאור סביבה מקצועי (סעיף 1.1) עבור נכס הממוקם ב:\n`

    if (data.street && data.buildingNumber && data.city) {
      prompt += `${data.street} ${data.buildingNumber}, ${data.city}\n\n`
    }

    prompt += `**חשוב:** השתמש בכלים הזמינים לך (get_extracted_data, search_documents) כדי למצוא מידע על:\n`
    prompt += `- מיקום הנכס בתוך העיר/שכונה\n`
    prompt += `- אופי הסביבה הבנויה (למשל: אזור מגורים, מסחרי, מעורב)\n`
    prompt += `- שירותים ותשתיות בסביבה (ככל שניתן לזהות)\n`
    prompt += `- נגישות תחבורתית (אם ישנו מידע)\n\n`

    prompt += `הנחיות כתיבה:\n`
    prompt += `- ניטרלי ומקצועי בלבד - ללא שפה שיווקית\n`
    prompt += `- אל תשתמש במילים כמו "מבוקש", "איכותי", "יוקרתי"\n`
    prompt += `- תיאורי בלבד - ללא מסקנות או התייחסות לשווי\n`
    prompt += `- 2-4 פסקאות, 120-200 מילים\n`
    prompt += `- רק מידע שניתן לאמת - אל תשלים מידע חסר\n`

    const response = await fetch(`/api/session/${sessionId}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: prompt,
        conversationHistory: []
      })
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    const decoder = new TextDecoder()
    let generatedText = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      generatedText += chunk
    }

    return {
      success: true,
      generatedText: generatedText.trim(),
      questionsAsked: [
        {
          question: 'כתוב תיאור סביבה מקצועי',
          answer: `כתובת: ${data.street} ${data.buildingNumber}, ${data.city}`
        }
      ]
    }
  } catch (error) {
    console.error('Environment description error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
