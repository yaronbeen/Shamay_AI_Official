'use client'

import React, { useState, useEffect } from 'react'
import { Brain, MapPin, FileText, Building, TrendingUp, AlertTriangle } from 'lucide-react'
import { DataSource } from '../ui/DataSource'

interface AutoSection {
  id: string
  title: string
  content: string
  source: 'ai' | 'extracted' | 'generated'
  confidence?: number
  isGenerated: boolean
}

interface Step3AutoSectionsProps {
  data: any
  updateData: (updates: any) => void
  onValidationChange: (isValid: boolean) => void
}

export function Step3AutoSections({ data, updateData, onValidationChange }: Step3AutoSectionsProps) {
  const [sections, setSections] = useState<AutoSection[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [editingSection, setEditingSection] = useState<string | null>(null)

  // Generate auto sections based on uploaded data
  useEffect(() => {
    generateAutoSections()
  }, [data])

  const generateAutoSections = async () => {
    setIsGenerating(true)
    
    try {
      // Simulate AI processing delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const generatedSections: AutoSection[] = [
        {
          id: 'neighborhood',
          title: 'תיאור השכונה והסביבה',
          content: generateNeighborhoodDescription(data),
          source: 'ai',
          confidence: 0.85,
          isGenerated: true
        },
        {
          id: 'legal_summary',
          title: 'סיכום מצב משפטי',
          content: generateLegalSummary(data),
          source: 'extracted',
          confidence: 0.95,
          isGenerated: false
        },
        {
          id: 'planning_summary',
          title: 'סיכום מצב תכנוני',
          content: generatePlanningSummary(data),
          source: 'extracted',
          confidence: 0.90,
          isGenerated: false
        },
        {
          id: 'property_analysis',
          title: 'ניתוח הנכס',
          content: generatePropertyAnalysis(data),
          source: 'ai',
          confidence: 0.80,
          isGenerated: true
        }
      ]

      setSections(generatedSections)
      
      // Update parent data
      updateData({
        autoSections: generatedSections
      })
      
      onValidationChange(true)
      
    } catch (error) {
      console.error('Error generating sections:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const generateNeighborhoodDescription = (data: any): string => {
    const address = `${data.street} ${data.buildingNumber}, ${data.neighborhood}, ${data.city}`
    
    return `
      הנכס ממוקם ב${address}, באזור מגורים מבוקש המאופיין באיכות חיים גבוהה ונגישות מעולה לתחבורה ציבורית. 
      השכונה מציעה מגוון שירותים עירוניים, מוסדות חינוך איכותיים, מרכזי קניות ופנאי, 
      וכן קרבה לאזורי תעסוקה מרכזיים. האזור נהנה מתשתיות מפותחות, 
      כבישים רחבים ונגישות נוחה לכל חלקי העיר.
      
      השכונה מאופיינת בבנייה מגוונת הכוללת בניינים חדשים לצד בניינים ותיקים משופצים, 
      מה שיוצר איזון בין מודרניות למסורת. הסביבה ירוקה ומטופחת עם גנים ציבוריים 
      ושטחים פתוחים המספקים איכות חיים גבוהה לתושבים.
    `.trim()
  }

  const generateLegalSummary = (data: any): string => {
    return `
      הנכס רשום בפנקס הזכויות בלשכת רישום המקרקעין ${data.registryOffice || '[שם הלשכה]'}, 
      חלקה ${data.parcel || '[מספר חלקה]'} בגוש ${data.gush || '[מספר גוש]'}, 
      תת-חלקה ${data.subParcel || '[תת-חלקה]'}.
      
      השטח הרשום: ${data.registeredArea || '[שטח]'} מ"ר.
      ${data.ownershipRights ? `בעלויות: ${data.ownershipRights}` : ''}
      ${data.notes ? `הערות: ${data.notes}` : ''}
      
      הזכויות בנכס הן בעלות פרטית מלאה, ללא שעבודים או הגבלות מיוחדות.
    `.trim()
  }

  const generatePlanningSummary = (data: any): string => {
    return `
      הנכס ממוקם באזור המיועד למגורים בהתאם לתכניות בניין עיר בתוקף.
      
      ${data.buildingPermitNumber ? `
      היתר בניה מס' ${data.buildingPermitNumber} מיום ${data.buildingPermitDate || '[תאריך]'} 
      מאשר בנייה של ${data.buildingDescription || '[תיאור הבנייה]'}.
      ` : ''}
      
      השטח הבנוי המותר: ${data.builtArea || '[שטח]'} מ"ר
      ${data.balconyArea ? `שטח מרפסות: ${data.balconyArea} מ"ר` : ''}
      
      הבניין בן ${data.buildingFloors || '[מספר קומות]'} קומות וכולל ${data.buildingUnits || '[מספר יח"ד]'} יח"ד.
    `.trim()
  }

  const generatePropertyAnalysis = (data: any): string => {
    return `
      הנכס הינו דירת מגורים בקומה ${data.floor || '[קומה]'} בבניין בן ${data.buildingFloors || '[קומות]'} קומות.
      
      הדירה כוללת ${data.rooms || '[חדרים]'} חדרים בשטח כולל של ${data.area || '[שטח]'} מ"ר.
      ${data.airDirections ? `הדירה פונה לכיוונים: ${data.airDirections}` : ''}
      
      סטנדרט הגמר בדירה ברמה טובה וכולל ריצוף איכותי, חלונות כפולים, 
      מערכת מיזוג אוויר ומטבח מאובזר. הדירה נמצאת במצב תחזוקה טוב 
      ומתאימה למגורים מיידיים.
    `.trim()
  }

  const handleSectionEdit = (sectionId: string, newContent: string) => {
    setSections(prev => 
      prev.map(section => 
        section.id === sectionId 
          ? { ...section, content: newContent, isGenerated: false }
          : section
      )
    )
  }

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'ai':
        return <Brain className="w-4 h-4 text-blue-600" />
      case 'extracted':
        return <FileText className="w-4 h-4 text-green-600" />
      default:
        return <Building className="w-4 h-4 text-gray-600" />
    }
  }

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'text-gray-500'
    if (confidence >= 0.9) return 'text-green-600'
    if (confidence >= 0.7) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-right">
          פרקים אוטומטיים
        </h2>
        <p className="text-gray-600 text-right">
          המערכת יצרה אוטומטית פרקים בסיסיים לשומה על בסיס המסמכים שהועלו
        </p>
      </div>

      {isGenerating ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-3">
            <Brain className="w-8 h-8 text-blue-600 animate-pulse" />
            <span className="text-lg font-medium text-gray-700">מעבד ומנתח מסמכים...</span>
          </div>
          <p className="text-gray-500 mt-2">זה עשוי לקחת מספר דקות</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {getSourceIcon(section.source)}
                  <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                  {section.confidence && (
                    <span className={`text-sm font-medium ${getConfidenceColor(section.confidence)}`}>
                      {Math.round(section.confidence * 100)}% ביטחון
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <DataSource 
                    source={section.source as any} 
                    details={section.isGenerated ? 'נוצר אוטומטית' : 'נשלף מהמסמכים'}
                  />
                  
                  <button
                    onClick={() => setEditingSection(editingSection === section.id ? null : section.id)}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    {editingSection === section.id ? 'שמור' : 'ערוך'}
                  </button>
                </div>
              </div>

              {editingSection === section.id ? (
                <textarea
                  value={section.content}
                  onChange={(e) => handleSectionEdit(section.id, e.target.value)}
                  className="w-full h-64 p-4 border border-gray-300 rounded-lg text-right"
                  dir="rtl"
                />
              ) : (
                <div className="prose prose-sm max-w-none text-right">
                  <p className="whitespace-pre-line leading-relaxed">
                    {section.content}
                  </p>
                </div>
              )}

              {/* Section Actions */}
              <div className="mt-4 flex justify-end gap-2">
                {section.isGenerated && (
                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                    נוצר אוטומטית
                  </span>
                )}
                {editingSection === section.id && (
                  <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                    נערך ידנית
                  </span>
                )}
              </div>
            </div>
          ))}

          {/* GOVMAP Integration Placeholder */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">מפת הסביבה</h3>
            </div>
            
            <div className="bg-gray-100 rounded-lg p-8 text-center">
              <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">מפת GOVMAP</p>
              <p className="text-sm text-gray-500">
                כאן תוצג מפה אינטראקטיבית של הסביבה
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
