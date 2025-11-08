'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { ValuationData } from './ValuationWizard'
import { generateDocumentHTML, CompanySettings } from '../lib/document-template'

interface EditableDocumentPreviewProps {
  data: ValuationData
  onDataChange: (updates: Partial<ValuationData>) => void
}

export function EditableDocumentPreview({ data, onDataChange }: EditableDocumentPreviewProps) {
  const [companySettings, setCompanySettings] = useState<CompanySettings | undefined>(undefined)
  const [htmlContent, setHtmlContent] = useState<string>('')
  const [pageCount, setPageCount] = useState<number>(8)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [viewMode, setViewMode] = useState<'continuous' | 'paged'>('continuous')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [customHtmlOverrides, setCustomHtmlOverrides] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const previewFrameRef = useRef<HTMLIFrameElement>(null)

  const updateIframeHeight = useCallback((frame: HTMLIFrameElement | null) => {
    if (!frame) {
      return
    }

    const measure = () => {
      const contentDocument = frame.contentDocument || frame.contentWindow?.document
      if (!contentDocument) {
        return
      }
      const docEl = contentDocument.documentElement
      const bodyEl = contentDocument.body
      const scrollTargets = [
        docEl?.scrollHeight,
        bodyEl?.scrollHeight,
        docEl?.offsetHeight,
        bodyEl?.offsetHeight
      ].filter((value): value is number => typeof value === 'number')
      const scrollHeight = scrollTargets.length > 0 ? Math.max(...scrollTargets) : 0
      frame.style.height = `${Math.max(scrollHeight, 1122)}px`
    }

    measure()
    window.setTimeout(measure, 200)
  }, [])

  useEffect(() => {
    const fetchCompanySettings = async () => {
      try {
        const response = await fetch('/api/user/settings')
        if (response.ok) {
          const settings: CompanySettings = await response.json()
          setCompanySettings(settings)
        }
      } catch (error) {
        console.warn('⚠️ Could not load user settings for preview:', error)
      }
    }
    
    fetchCompanySettings()
  }, [])

  useEffect(() => {
    const mergedEdits = {
      ...((data as any).customDocumentEdits || {}),
      ...customHtmlOverrides
    }

    const mergedData = {
      ...data,
      customDocumentEdits: mergedEdits
    }

    const html = generateDocumentHTML(mergedData as ValuationData, true, companySettings)
    setHtmlContent(html)
    
    // Count actual pages in generated HTML
    const pageMatches = html.match(/<section[^>]*class="page"/g)
    const actualPageCount = pageMatches ? pageMatches.length : 8
    setPageCount(actualPageCount)
  }, [data, companySettings, customHtmlOverrides])

  useEffect(() => {
    if (!isEditMode) {
      setCustomHtmlOverrides((data as any).customDocumentEdits || {})
    }
  }, [data, isEditMode])

  const toggleEditMode = useCallback(() => {
    const newEditMode = !isEditMode
    setIsEditMode(newEditMode)
    
    // If disabling edit mode, remove contenteditable from all elements
    if (!newEditMode && previewFrameRef.current) {
      const iframe = previewFrameRef.current
      const doc = iframe.contentDocument || iframe.contentWindow?.document
      if (doc) {
        const editableElements = doc.querySelectorAll('[contenteditable="true"]')
        editableElements.forEach((el: Element) => {
          (el as HTMLElement).removeAttribute('contenteditable')
          ;(el as HTMLElement).style.cursor = ''
          ;(el as HTMLElement).style.backgroundColor = ''
          ;(el as HTMLElement).style.border = ''
        })
      }
    }
  }, [isEditMode])

  useEffect(() => {
    updateIframeHeight(previewFrameRef.current)
    
    // Set up interactive editing in iframe
    if (isEditMode && previewFrameRef.current) {
      const iframe = previewFrameRef.current
      const doc = iframe.contentDocument || iframe.contentWindow?.document
      if (!doc) return

      // Make editable fields interactive
      const setupEditing = () => {
        // Add contenteditable to key elements
        const editableSelectors = [
          '.title-primary',
          '.title-secondary',
          '.address',
          '.sub-title',
          'p:not(.page-note)',
          '.table td',
          '.chapter-title',
          '.section-title',
          '.bullet-list li',
          'ul li',
          'h3'
        ]

        editableSelectors.forEach(selector => {
          const elements = doc.querySelectorAll(selector)
          elements.forEach((el: Element) => {
            const htmlEl = el as HTMLElement
            htmlEl.setAttribute('contenteditable', 'true')
            htmlEl.style.cursor = 'text'
            htmlEl.style.outline = 'none'
            
            // Add hover effect
            htmlEl.addEventListener('mouseenter', () => {
              htmlEl.style.backgroundColor = '#f0f9ff'
              htmlEl.style.border = '1px dashed #3b82f6'
            })
            htmlEl.addEventListener('mouseleave', () => {
              htmlEl.style.backgroundColor = ''
              htmlEl.style.border = ''
            })
            
            // Save changes on blur
            htmlEl.addEventListener('blur', (e) => {
              const target = e.target as HTMLElement
              const newText = target.innerText
              const newHtml = target.innerHTML
              
              // Store the edit - generate unique selector
              const tagName = target.tagName.toLowerCase()
              const classes = Array.from(target.classList).join('.')
              const uniqueSelector = classes ? `${tagName}.${classes}` : tagName
              
              // Save to custom overrides
              setCustomHtmlOverrides(prev => ({
                ...prev,
                [uniqueSelector]: newHtml
              }))
              
              // Try to map the change back to data
              if (target.classList.contains('address')) {
                // Parse address
                const parts = newText.split(',')
                if (parts.length >= 2) {
                  const streetAndNum = parts[0].trim().split(' ')
                  const buildingNumber = streetAndNum.pop() || ''
                  const street = streetAndNum.join(' ')
                  const city = parts[parts.length - 1].trim()
                  
                  onDataChange({ street, buildingNumber, city })
                }
              }
              
              // Note: Auto-save is disabled - user must click Save button
              // This prevents excessive API calls on every edit
              
              // Visual feedback
              target.style.backgroundColor = '#dcfce7'
              setTimeout(() => {
                target.style.backgroundColor = ''
              }, 500)
            })
          })
        })

        // Make images clickable to change
        const images = doc.querySelectorAll('img:not([alt="לוגו"]):not([alt="פוטר"])')
        images.forEach((img: Element) => {
          const htmlImg = img as HTMLImageElement
          htmlImg.style.cursor = 'pointer'
          htmlImg.style.border = '2px solid transparent'
          
          htmlImg.addEventListener('mouseenter', () => {
            htmlImg.style.border = '2px solid #3b82f6'
          })
          htmlImg.addEventListener('mouseleave', () => {
            htmlImg.style.border = '2px solid transparent'
          })
          
          htmlImg.addEventListener('click', () => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = 'image/*'
            input.onchange = async (e) => {
              const file = (e.target as HTMLInputElement).files?.[0]
              if (file) {
                const reader = new FileReader()
                reader.onload = (e) => {
                  htmlImg.src = e.target?.result as string
                  // Update in data
                  if (htmlImg.alt.includes('תמונה חיצונית')) {
                    onDataChange({ selectedImagePreview: e.target?.result as string })
                  }
                }
                reader.readAsDataURL(file)
              }
            }
            input.click()
          })
        })
      }

      // Wait for iframe to load
      if (doc.readyState === 'complete') {
        setupEditing()
      } else {
        iframe.addEventListener('load', setupEditing)
      }
    }
  }, [htmlContent, updateIframeHeight, isEditMode, onDataChange])

  const handleSave = useCallback(async () => {
    const sessionId = (data as any).sessionId
    if (!sessionId) {
      alert('לא ניתן לשמור - חסר מזהה סשן')
      return
    }

    setIsSaving(true)
    try {
      // Merge custom edits with existing data
      const updatedData = {
        ...data,
        customDocumentEdits: customHtmlOverrides
      }
      
      const response = await fetch(`/api/session/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: updatedData
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save')
      }

      // Update data with saved edits
      onDataChange({ customDocumentEdits: customHtmlOverrides } as any)
      
      alert('✅ השינויים נשמרו בהצלחה!')
      setLastRefreshTime(new Date())
    } catch (error) {
      console.error('Error saving:', error)
      alert('❌ שגיאה בשמירת השינויים')
    } finally {
      setIsSaving(false)
    }
  }, [customHtmlOverrides, data, onDataChange])

  const handleExportPDF = useCallback(async () => {
    const sessionId = (data as any).sessionId
    if (!sessionId) {
      alert('לא ניתן לייצא - חסר מזהה סשן')
      return
    }

    setIsExporting(true)
    try {
      const mergedEdits = {
        ...((data as any).customDocumentEdits || {}),
        ...customHtmlOverrides
      }

      const response = await fetch(`/api/session/${sessionId}/export-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customDocumentEdits: mergedEdits
        })
      })

      if (!response.ok) {
        throw new Error('Failed to export PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `shamay-valuation-${sessionId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      alert('✅ PDF הורד בהצלחה!')
    } catch (error) {
      console.error('Error exporting PDF:', error)
      alert('❌ שגיאה בייצוא PDF')
    } finally {
      setIsExporting(false)
    }
  }, [data])

  const handleManualRefresh = useCallback(async () => {
    const sessionId = (data as any).sessionId
    if (!sessionId) {
      return
    }

    setIsRefreshing(true)
    try {
      const response = await fetch(`/api/session/${sessionId}`)
      if (!response.ok) {
        return
      }

      const freshSession = await response.json()
      const freshData = freshSession?.data || {}

      if (
        freshData.gisScreenshots &&
        JSON.stringify(freshData.gisScreenshots) !== JSON.stringify((data as any).gisScreenshots)
      ) {
        onDataChange({ gisScreenshots: freshData.gisScreenshots })
      }

      setLastRefreshTime(new Date())
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [data, onDataChange])

  const handleSelectPage = useCallback(
    (page: number) => {
      setCurrentPage(page)
      const frame = previewFrameRef.current
      if (!frame) {
        return
      }
      const doc = frame.contentDocument || frame.contentWindow?.document
      if (!doc) {
        return
      }
      const target = doc.getElementById(`page-${page}`)
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    },
    []
  )

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
      <div className="bg-gray-100 px-4 py-3 border-b flex justify-between items-center">
        <div>
          <h3 className="text-sm font-medium text-gray-700">תצוגה מקדימה של הדוח</h3>
          <p className="text-xs text-gray-500 mt-1">
            התצוגה משקפת במדויק את ה-PDF המופק מן השרת.
          </p>
          {lastRefreshTime && (
            <p className="text-xs text-green-600 mt-1">
              עודכן לאחרונה: {lastRefreshTime.toLocaleTimeString('he-IL')}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2 space-x-reverse gap-2">
          {(data as any).sessionId && (
            <>
              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className={`px-3 py-2 text-sm rounded-lg font-medium transition-all duration-200 ${
                  isExporting 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-red-500 text-white hover:bg-red-600 shadow-md'
                }`}
                title="ייצא PDF"
              >
                {isExporting ? (
                  <>
                    <span className="inline-block animate-spin mr-1">⟳</span>
                    מייצא...
                  </>
                ) : (
                  <>📄 ייצא PDF</>
                )}
              </button>
              
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className={`px-3 py-2 text-sm rounded-lg font-medium transition-all duration-200 ${
                  isRefreshing 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-green-500 text-white hover:bg-green-600 shadow-md'
                }`}
                title="רענן נתונים מהשרת"
              >
                {isRefreshing ? (
                  <>
                    <span className="inline-block animate-spin mr-1">⟳</span>
                    מרענן...
                  </>
                ) : (
                  <>🔄 רענן נתונים</>
                )}
              </button>
            </>
          )}
        </div>
      </div>
      
      <div className="px-4 py-2 border-b bg-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleEditMode}
            className={`px-3 py-1 text-xs rounded border transition-colors ${
              isEditMode
                ? 'bg-blue-500 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50'
            }`}
          >
            {isEditMode ? '🔒 נעל עריכה' : '✏️ פתח עריכה'}
          </button>
          
          {isEditMode && (
            <>
              <button
                onClick={handleSave}
                disabled={isSaving || Object.keys(customHtmlOverrides).length === 0}
                className={`px-3 py-1 text-xs rounded border transition-colors ${
                  isSaving || Object.keys(customHtmlOverrides).length === 0
                    ? 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed'
                    : 'bg-green-500 text-white border-green-600 hover:bg-green-600'
                }`}
                title={Object.keys(customHtmlOverrides).length === 0 ? 'אין שינויים לשמירה' : 'שמור שינויים'}
              >
                {isSaving ? (
                  <>
                    <span className="inline-block animate-spin mr-1">⟳</span>
                    שומר...
                  </>
                ) : (
                  <>💾 שמור ({Object.keys(customHtmlOverrides).length})</>
                )}
              </button>
              
              <div className="text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded">
                💡 לחץ על טקסט או תמונה כדי לערוך
              </div>
            </>
          )}
        </div>
      </div>

      <div className="p-2 overflow-x-auto">
        <iframe
          ref={previewFrameRef}
          srcDoc={htmlContent}
          className="w-full border border-gray-200 rounded shadow-sm bg-white"
          style={{ minHeight: '1122px', width: '100%' }}
          title="Document preview"
          onLoad={() => updateIframeHeight(previewFrameRef.current)}
        />
        <style jsx global>{`
          iframe {
            background: #ffffff;
          }
        `}</style>
      </div>
    </div>
  )
}

