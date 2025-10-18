'use client'

import { ValuationData } from './ValuationWizard'
import { generateDocumentHTML } from '../lib/document-template'
import { useEffect, useState, useCallback, useRef } from 'react'

interface EditableDocumentPreviewProps {
  data: ValuationData
  onDataChange: (updates: Partial<ValuationData>) => void
}

export function EditableDocumentPreview({ data, onDataChange }: EditableDocumentPreviewProps) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [htmlContent, setHtmlContent] = useState<string>('')
  const [freeTextContent, setFreeTextContent] = useState<string>('')
  const [editorMode, setEditorMode] = useState<'html' | 'wysiwyg'>('wysiwyg')
  const previewRef = useRef<HTMLDivElement>(null)
  const [isUpdatingFromState, setIsUpdatingFromState] = useState(false)

  // Generate HTML content
  useEffect(() => {
    if (data.isCustomEdited && data.customHTML) {
      // Use the custom HTML content that was edited by the user
      setHtmlContent(data.customHTML)
      setFreeTextContent(data.customHTML)
    } else {
      // Generate HTML content using the shared template
      const html = generateDocumentHTML(data, true)
      setHtmlContent(html)
      setFreeTextContent(html)
    }
  }, [data])

  // Fetch fresh data from session store to get latest gisScreenshots
  useEffect(() => {
    const fetchFreshData = async () => {
      try {
        // Extract sessionId from the data
        const sessionId = data.sessionId
        if (!sessionId) return

        // Fetch fresh data from session store
        const response = await fetch(`/api/session/${sessionId}`)
        if (response.ok) {
          const freshSession = await response.json()
          const freshData = freshSession?.data || {}
          
          // Only regenerate HTML if gisScreenshots is different
          if (freshData.gisScreenshots && !data.gisScreenshots) {
            const html = generateDocumentHTML(freshData, true)
            setHtmlContent(html)
            setFreeTextContent(html)
          }
        }
      } catch (error) {
        // Silently handle errors
      }
    }

    // Fetch fresh data every 2 seconds to catch updates
    const interval = setInterval(fetchFreshData, 2000)
    
    // Also fetch immediately
    fetchFreshData()
    
    return () => clearInterval(interval)
  }, [data.sessionId, data.gisScreenshots])

  // Update content without cursor jumping (Stack Overflow solution)
  useEffect(() => {
    if (previewRef.current && !isUpdatingFromState) {
      const currentContent = previewRef.current.innerHTML
      if (currentContent !== freeTextContent && freeTextContent) {
        setIsUpdatingFromState(true)
        previewRef.current.innerHTML = freeTextContent
        setIsUpdatingFromState(false)
      }
    }
  }, [freeTextContent])

  // Ensure content is loaded when switching to edit mode
  useEffect(() => {
    if (isEditMode && editorMode === 'wysiwyg' && previewRef.current) {
      if (!previewRef.current.innerHTML || previewRef.current.innerHTML.trim() === '') {
        previewRef.current.innerHTML = freeTextContent || htmlContent
      }
    }
  }, [isEditMode, editorMode, freeTextContent, htmlContent])

  // Handle text editing in specific fields
  const handleFieldEdit = useCallback((field: string, value: string) => {
    onDataChange({ [field]: value })
  }, [onDataChange])

  // Handle free text editing (without saving on every keystroke)
  const handleFreeTextChange = useCallback((e: React.FormEvent) => {
    if (!isEditMode || isUpdatingFromState) return

    const target = e.target as HTMLElement
    const newContent = target.innerHTML
    
    setFreeTextContent(newContent)
    setHtmlContent(newContent)
    
    // Don't save on every keystroke - just update local state
    // Save will happen when user clicks "Finish Editing"
  }, [isEditMode, isUpdatingFromState])

  // Handle key events to prevent cursor jumping
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isEditMode) return
    
    // Prevent default behavior for certain keys that cause cursor jumping
    if (e.key === ' ' || e.key === 'Enter' || e.key.length === 1) {
      e.stopPropagation()
    }
    
    // Prevent focus from jumping to other elements
    if (e.key === 'Tab') {
      e.preventDefault()
      // Insert tab character instead
      document.execCommand('insertText', false, '\t')
    }
  }, [isEditMode])

  // Handle focus to prevent cursor jumping
  const handleFocus = useCallback((e: React.FocusEvent) => {
    if (!isEditMode) return
    
    // Ensure focus stays in the document
    const target = e.currentTarget as HTMLElement
    target.focus()
    
    // Prevent focus from jumping to child elements
    e.stopPropagation()
  }, [isEditMode])

  // Execute formatting commands
  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value)
    // Don't trigger save - just apply formatting
    // Save will happen when user clicks "Finish Editing"
  }, [])

  // Handle image upload
  const handleImageUpload = useCallback((field: 'signaturePreview' | 'selectedImagePreview', file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target?.result as string
      onDataChange({ [field]: base64 })
      
      // Update the free text content with new image
      if (field === 'signaturePreview') {
        const updatedContent = freeTextContent.replace(
          /<img[^>]*alt="חתימת שמאי"[^>]*>/g,
          `<img src="${base64}" alt="חתימת שמאי" style="max-width: 150px; max-height: 80px; border: 1px solid #ccc;" />`
        )
        setFreeTextContent(updatedContent)
      } else if (field === 'selectedImagePreview') {
        const updatedContent = freeTextContent.replace(
          /<img[^>]*alt="תמונה של הבניין"[^>]*>/g,
          `<img src="${base64}" alt="תמונה של הבניין" style="max-width: 300px; max-height: 200px; border: 1px solid #ccc; border-radius: 4px; display: block; margin: 0 auto;" />`
        )
        setFreeTextContent(updatedContent)
      }
    }
    reader.readAsDataURL(file)
  }, [onDataChange, freeTextContent])

  // HTML formatting function
  const formatHTML = (html: string): string => {
    // Simple HTML formatting - add proper indentation
    let formatted = html
      .replace(/></g, '>\n<')
      .split('\n')
      .map((line, index) => {
        const trimmed = line.trim()
        if (!trimmed) return ''
        
        // Add indentation based on tag depth
        const depth = (line.match(/</g) || []).length - (line.match(/<\//g) || []).length
        const indent = '  '.repeat(Math.max(0, depth))
        return indent + trimmed
      })
      .join('\n')
    
    return formatted
  }


  // Add edit controls
  const renderEditControls = () => {
    if (!isEditMode) return null

    return (
      <div className="fixed top-4 right-4 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-xs">
        <h4 className="font-semibold text-sm mb-3">עריכת מסמך</h4>
        
        {/* WYSIWYG Toolbar */}
        <div className="mb-4 p-2 bg-gray-50 rounded border">
          <div className="text-xs font-medium text-gray-700 mb-2">כלי עיצוב</div>
          <div className="flex flex-wrap gap-1 mb-2">
            <button
              onClick={() => execCommand('bold')}
              className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100"
              title="מודגש"
            >
              <strong>B</strong>
            </button>
            <button
              onClick={() => execCommand('italic')}
              className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100"
              title="נטוי"
            >
              <em>I</em>
            </button>
            <button
              onClick={() => execCommand('underline')}
              className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100"
              title="קו תחתון"
            >
              <u>U</u>
            </button>
          </div>
          <div className="flex flex-wrap gap-1 mb-2">
            <button
              onClick={() => execCommand('justifyLeft')}
              className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100"
              title="יישור לשמאל"
            >
              ←
            </button>
            <button
              onClick={() => execCommand('justifyCenter')}
              className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100"
              title="יישור למרכז"
            >
              ↔
            </button>
            <button
              onClick={() => execCommand('justifyRight')}
              className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100"
              title="יישור לימין"
            >
              →
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => execCommand('formatBlock', 'h1')}
              className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100"
              title="כותרת ראשית"
            >
              H1
            </button>
            <button
              onClick={() => execCommand('formatBlock', 'h2')}
              className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100"
              title="כותרת משנית"
            >
              H2
            </button>
            <button
              onClick={() => execCommand('formatBlock', 'h3')}
              className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100"
              title="כותרת שלישית"
            >
              H3
            </button>
            <button
              onClick={() => execCommand('formatBlock', 'p')}
              className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100"
              title="פסקה"
            >
              P
            </button>
          </div>
        </div>
        
        {/* Signature Upload */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            חתימת שמאי
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleImageUpload('signaturePreview', file)
            }}
            className="text-xs"
          />
        </div>

        {/* Property Image Upload */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            תמונת הנכס
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleImageUpload('selectedImagePreview', file)
            }}
            className="text-xs"
          />
        </div>

        {/* Quick Edit Fields */}
        <div className="space-y-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              שם השמאי
            </label>
            <input
              type="text"
              value={data.shamayName || ''}
              onChange={(e) => handleContentChange('shamayName', e.target.value)}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              מספר רישיון
            </label>
            <input
              type="text"
              value={data.shamaySerialNumber || ''}
              onChange={(e) => handleContentChange('shamaySerialNumber', e.target.value)}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              שם המזמין
            </label>
            <input
              type="text"
              value={data.clientName || ''}
              onChange={(e) => handleContentChange('clientName', e.target.value)}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              כתובת
            </label>
            <input
              type="text"
              value={`${data.street || ''} ${data.buildingNumber || ''}, ${data.city || ''}`}
              onChange={(e) => {
                const parts = e.target.value.split(',')
                handleContentChange('street', parts[0]?.split(' ')[0] || '')
                handleContentChange('buildingNumber', parts[0]?.split(' ')[1] || '')
                handleContentChange('city', parts[1]?.trim() || '')
              }}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              שווי סופי (₪)
            </label>
            <input
              type="number"
              value={data.finalValuation || ''}
              onChange={(e) => handleContentChange('finalValuation', parseInt(e.target.value) || 0)}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1"
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
      {/* Header with Edit Toggle */}
      <div className="bg-gray-100 px-4 py-3 border-b flex justify-between items-center">
        <div>
          <h3 className="text-sm font-medium text-gray-700">תצוגה מקדימה של הדוח</h3>
          {!isEditMode && (
            <p className="text-xs text-gray-500 mt-1">לחץ על "עריכת מסמך" כדי לשנות את התוכן</p>
          )}
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          <button
            onClick={() => {
              if (isEditMode) {
                // Save changes when finishing editing
                onDataChange({ 
                  customHTML: freeTextContent,
                  isCustomEdited: true 
                })
              }
              setIsEditMode(!isEditMode)
            }}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors duration-200 ${
              isEditMode 
                ? 'bg-red-500 text-white hover:bg-red-600 shadow-md' 
                : 'bg-blue-500 text-white hover:bg-blue-600 shadow-md'
            }`}
          >
            {isEditMode ? '💾 סיום עריכה ושמירה' : '✏️ עריכת מסמך'}
          </button>
          {isEditMode && (
            <div className="text-xs text-gray-600 bg-blue-50 px-2 py-1 rounded">
              💡 בחר איך לערוך למטה
            </div>
          )}
        </div>
      </div>
      
      {/* Preview Content */}
      <div className="p-2 overflow-x-auto">
        {isEditMode && editorMode === 'wysiwyg' ? (
          <div className="space-y-4">
            {/* Rich Text Toolbar for Simple Edit */}
            <div className="bg-gray-100 px-3 py-2 border border-gray-300 rounded-lg flex flex-wrap gap-1">
              <button
                onClick={() => execCommand('bold')}
                className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
                title="מודגש"
              >
                <strong>B</strong>
              </button>
              <button
                onClick={() => execCommand('italic')}
                className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
                title="נטוי"
              >
                <em>I</em>
              </button>
              <button
                onClick={() => execCommand('underline')}
                className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
                title="קו תחתון"
              >
                <u>U</u>
              </button>
              <div className="w-px h-6 bg-gray-300 mx-1"></div>
              <button
                onClick={() => execCommand('justifyLeft')}
                className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
                title="יישור לשמאל"
              >
                ←
              </button>
              <button
                onClick={() => execCommand('justifyCenter')}
                className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
                title="יישור למרכז"
              >
                ↔
              </button>
              <button
                onClick={() => execCommand('justifyRight')}
                className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
                title="יישור לימין"
              >
                →
              </button>
              <div className="w-px h-6 bg-gray-300 mx-1"></div>
              <button
                onClick={() => execCommand('formatBlock', 'h1')}
                className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
                title="כותרת 1"
              >
                H1
              </button>
              <button
                onClick={() => execCommand('formatBlock', 'h2')}
                className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
                title="כותרת 2"
              >
                H2
              </button>
              <button
                onClick={() => execCommand('formatBlock', 'p')}
                className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
                title="פסקה"
              >
                P
              </button>
            </div>
            
            {/* Instructions */}
            <div className="bg-green-50 border border-green-200 rounded p-3">
              <div className="flex items-start gap-2">
                <div className="text-green-600 text-sm">✅</div>
                <div className="text-xs text-green-800">
                  <p><strong>עריכה ישירה במסמך:</strong></p>
                  <p>1. לחץ על כל טקסט במסמך למטה</p>
                  <p>2. התחל להקליד - הטקסט יתחלף</p>
                  <p>3. השתמש בכלי העיצוב למעלה</p>
                  <p>4. כל השינויים נשמרים אוטומטית!</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        
        {isEditMode ? (
          <div className="space-y-4">
            {/* Simple Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-blue-600 text-lg">💡</div>
                <div>
                  <h4 className="font-semibold text-sm text-blue-800 mb-2">איך לערוך את המסמך?</h4>
                  <div className="text-xs text-blue-700 space-y-1">
                    <p><strong>אפשרות 1 - עריכה פשוטה:</strong> לחץ על "עריכה ויזואלית" ולחץ על כל טקסט במסמך לעריכה</p>
                    <p><strong>אפשרות 2 - עריכה מתקדמת:</strong> לחץ על "עריכת קוד" לעריכת הקוד הטכני</p>
                    <p><strong>💾 שמירה אוטומטית:</strong> כל השינויים נשמרים אוטומטית</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Simple Mode Toggle */}
            <div className="bg-white border border-gray-300 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-sm text-gray-700">בחר איך לערוך</h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditorMode('wysiwyg')}
                    className={`px-4 py-2 text-sm rounded-lg font-medium ${
                      editorMode === 'wysiwyg' 
                        ? 'bg-green-500 text-white shadow-md' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    ✏️ עריכה פשוטה
                  </button>
                  <button
                    onClick={() => setEditorMode('html')}
                    className={`px-4 py-2 text-sm rounded-lg font-medium ${
                      editorMode === 'html' 
                        ? 'bg-blue-500 text-white shadow-md' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    🔧 עריכה מתקדמת
                  </button>
                </div>
              </div>
            </div>

            {/* HTML Source Editor */}
            {editorMode === 'html' && (
              <div className="bg-white border border-gray-300 rounded-lg p-4">
                <div className="mb-4">
                  <h4 className="font-semibold text-sm text-gray-700 mb-2">🔧 עריכה מתקדמת - עריכת קוד</h4>
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                    <div className="flex items-start gap-2">
                      <div className="text-yellow-600 text-sm">⚠️</div>
                      <div className="text-xs text-yellow-800">
                        <p><strong>למשתמשים מתקדמים בלבד!</strong></p>
                        <p>כאן תוכל לערוך את הקוד הטכני של המסמך. אם אינך מכיר HTML, השתמש ב"עריכה פשוטה" למעלה.</p>
                      </div>
                    </div>
                  </div>
                </div>
              
              <textarea
                value={freeTextContent}
                onChange={(e) => {
                  setFreeTextContent(e.target.value)
                  setHtmlContent(e.target.value)
                  onDataChange({ 
                    customHTML: e.target.value,
                    isCustomEdited: true 
                  })
                }}
                className="w-full h-96 text-xs font-mono border border-gray-300 rounded px-3 py-2 resize-vertical"
                placeholder="ערוך את ה-HTML כאן..."
                style={{
                  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                  fontSize: '12px',
                  lineHeight: '1.4'
                }}
              />
              
                <div className="mt-2 text-xs text-gray-500">
                  💡 טיפ: ערוך את ה-HTML ישירות. השינויים יופיעו בתצוגה המקדימה מיד.
                </div>
              </div>
            )}

            {/* Live Document Editor */}
            {editorMode === 'wysiwyg' && (
              <div className="bg-white border border-gray-300 rounded-lg p-4">
                <div className="mb-4">
                  <h4 className="font-semibold text-sm mb-2 text-gray-700">✏️ עריכה ישירה במסמך</h4>
                  <div className="bg-green-50 border border-green-200 rounded p-3">
                    <div className="flex items-start gap-2">
                      <div className="text-green-600 text-sm">✅</div>
                      <div className="text-xs text-green-800">
                        <p><strong>איך לערוך:</strong></p>
                        <p>1. לחץ על כל טקסט במסמך למטה</p>
                        <p>2. התחל להקליד - הטקסט יתחלף</p>
                        <p>3. השתמש בכלי העיצוב למעלה</p>
                        <p>4. כל השינויים נשמרים אוטומטית!</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Rich Text Toolbar */}
                <div className="bg-gray-100 px-3 py-2 border border-gray-300 rounded-t-lg flex flex-wrap gap-1 mb-0">
                  <button
                    onClick={() => execCommand('bold')}
                    className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
                    title="מודגש"
                  >
                    <strong>B</strong>
                  </button>
                  <button
                    onClick={() => execCommand('italic')}
                    className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
                    title="נטוי"
                  >
                    <em>I</em>
                  </button>
                  <button
                    onClick={() => execCommand('underline')}
                    className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
                    title="קו תחתון"
                  >
                    <u>U</u>
                  </button>
                  <div className="w-px h-6 bg-gray-300 mx-1"></div>
                  <button
                    onClick={() => execCommand('justifyLeft')}
                    className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
                    title="יישור לשמאל"
                  >
                    ←
                  </button>
                  <button
                    onClick={() => execCommand('justifyCenter')}
                    className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
                    title="יישור למרכז"
                  >
                    ↔
                  </button>
                  <button
                    onClick={() => execCommand('justifyRight')}
                    className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
                    title="יישור לימין"
                  >
                    →
                  </button>
                  <div className="w-px h-6 bg-gray-300 mx-1"></div>
                  <button
                    onClick={() => execCommand('formatBlock', 'h1')}
                    className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
                    title="כותרת 1"
                  >
                    H1
                  </button>
                  <button
                    onClick={() => execCommand('formatBlock', 'h2')}
                    className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
                    title="כותרת 2"
                  >
                    H2
                  </button>
                  <button
                    onClick={() => execCommand('formatBlock', 'p')}
                    className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
                    title="פסקה"
                  >
                    P
                  </button>
                </div>
                
                {/* Live Document Editor */}
                <div 
                  ref={previewRef}
                  className="document-preview"
                  contentEditable={true}
                  suppressContentEditableWarning={true}
                  onInput={handleFreeTextChange}
                  onKeyDown={(e) => {
                    // Prevent cursor jumping by stopping propagation on certain keys
                    if (e.key === ' ' || e.key === 'Enter' || e.key.length === 1) {
                      e.stopPropagation()
                    }
                  }}
                  onFocus={(e) => {
                    // Keep focus in the editor
                    e.stopPropagation()
                  }}
                  style={{
                    minHeight: '600px',
                    padding: '20px',
                    backgroundColor: '#ffffff',
                    border: '2px dashed #3b82f6',
                    borderTop: 'none',
                    borderRadius: '0 0 8px 8px',
                    outline: 'none',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    fontFamily: 'Arial, sans-serif',
                    direction: 'rtl'
                  }}
                />
                
                <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-3">
                  <div className="flex items-center gap-2">
                    <div className="text-blue-600 text-sm">💡</div>
                    <div className="text-xs text-blue-800">
                      <strong>טיפ:</strong> לחץ על כל טקסט במסמך לעריכה. השתמש בכלי העיצוב למעלה. השינויים נשמרים אוטומטית!
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Live Preview */}
            <div className="bg-white border border-gray-300 rounded-lg p-4">
              <h4 className="font-semibold text-sm mb-3 text-gray-700">תצוגה מקדימה חיה</h4>
              <div 
                dangerouslySetInnerHTML={{ __html: freeTextContent }}
                className="document-preview border border-gray-200 rounded p-4"
                style={{ minHeight: '200px' }}
              />
            </div>
          </div>
        ) : (
          <div 
            ref={previewRef}
            dangerouslySetInnerHTML={isEditMode && editorMode === 'wysiwyg' ? undefined : { __html: htmlContent }}
            className="document-preview"
            contentEditable={isEditMode && editorMode === 'wysiwyg'}
            suppressContentEditableWarning={true}
            onInput={isEditMode && editorMode === 'wysiwyg' ? handleFreeTextChange : undefined}
            onKeyDown={isEditMode && editorMode === 'wysiwyg' ? (e) => {
              // Prevent cursor jumping by stopping propagation on certain keys
              if (e.key === ' ' || e.key === 'Enter' || e.key.length === 1) {
                e.stopPropagation()
              }
            } : undefined}
            onFocus={isEditMode && editorMode === 'wysiwyg' ? (e) => {
              // Keep focus in the editor
              e.stopPropagation()
            } : undefined}
            style={{ 
              position: 'relative',
              ...(isEditMode && editorMode === 'wysiwyg' ? {
                border: '2px dashed #3b82f6',
                outline: 'none',
                minHeight: '600px',
                padding: '20px',
                backgroundColor: '#f8fafc'
              } : {})
            }}
          />
        )}
      </div>

      {/* Edit Controls */}
      {renderEditControls()}
    </div>
  )
}
