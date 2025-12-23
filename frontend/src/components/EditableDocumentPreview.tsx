'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { ValuationData } from './ValuationWizard'
import { generateDocumentHTML, CompanySettings } from '../lib/document-template'

type ToolbarMode = 'text' | 'image'

interface ToolbarState {
  visible: boolean
  mode: ToolbarMode
  targetSelector?: string
}

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
  const [debouncedOverrides, setDebouncedOverrides] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [toolbarState, setToolbarState] = useState<ToolbarState>({
    visible: false,
    mode: 'text',
    targetSelector: undefined
  })
  const previewFrameRef = useRef<HTMLIFrameElement>(null)
  const observerRef = useRef<MutationObserver | null>(null)
  const toolbarStateRef = useRef<ToolbarState>(toolbarState)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    toolbarStateRef.current = toolbarState
  }, [toolbarState])

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedOverrides(customHtmlOverrides)
    }, 500)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [customHtmlOverrides])

  const getFrameDocument = useCallback((): Document | null => {
    const frame = previewFrameRef.current
    if (!frame) {
      return null
    }
    return frame.contentDocument || frame.contentWindow?.document || null
  }, [])

  const getUniqueSelector = useCallback(
    (element: HTMLElement): string | null => {
      const doc = getFrameDocument()
      if (!doc) {
        return null
      }
      const segments: string[] = []
      let el: HTMLElement | null = element
      while (el && el !== doc.body) {
        let selector = el.tagName.toLowerCase()
        if (el.id) {
          selector += `#${el.id}`
          segments.unshift(selector)
          break
        }
        const parent = el.parentElement as HTMLElement | null
        if (!parent) {
          break
        }
        const siblings = Array.from(parent.children).filter((child) => {
          const childElement = child as HTMLElement
          return childElement.tagName === el!.tagName
        })
        if (siblings.length > 1) {
          const index = siblings.indexOf(el) + 1
          selector += `:nth-of-type(${index})`
        }
        segments.unshift(selector)
        el = parent
      }
      return segments.length ? segments.join(' > ') : null
    },
    [getFrameDocument]
  )

  const saveOverrideForElement = useCallback(
    (element: HTMLElement) => {
      const selector = element.getAttribute('data-edit-selector')
      if (!selector) {
        return
      }
      setCustomHtmlOverrides((prev) => ({
        ...prev,
        [selector]: element.innerHTML
      }))
    },
    []
  )

  const applyOverridesToDocument = useCallback(() => {
    const doc = getFrameDocument()
    if (!doc) {
      return
    }

    const mergedEdits = {
      ...((data as any).customDocumentEdits || (data as any).propertyAnalysis?.__customDocumentEdits || {}),
      ...customHtmlOverrides
    }

    Object.entries(mergedEdits).forEach(([selector, html]) => {
      if (typeof selector !== 'string' || typeof html !== 'string') {
        return
      }
      try {
        const elements = doc.querySelectorAll(selector)
        if (!elements.length) {
          return
        }
        elements.forEach((element) => {
          element.innerHTML = html
        })
      } catch (error) {
        console.warn('Failed to apply custom edit selector:', selector, error)
      }
    })

    const frameWindow = doc.defaultView as any
    if (frameWindow?.__applyAutoPagination) {
      frameWindow.__applyAutoPagination(true)
    }
    if (frameWindow?.__applyPageNumbers) {
      frameWindow.__applyPageNumbers(true)
    }
  }, [customHtmlOverrides, data, getFrameDocument])

  useEffect(() => {
    applyOverridesToDocument()
  }, [applyOverridesToDocument])

  const showToolbarForElement = useCallback((element: HTMLElement, mode: ToolbarMode) => {
    const selector = element.getAttribute('data-edit-selector')
    if (!selector) {
      return
    }
    setToolbarState({
      visible: true,
      mode,
      targetSelector: selector
    })
  }, [])

  const handleDomFocus = useCallback(
    (event: Event) => {
      const target = event.target as HTMLElement | null
      if (!target) {
        return
      }
      target.dataset.prevBackground = target.style.backgroundColor || ''
      target.dataset.prevOutline = target.style.outline || ''
      target.style.backgroundColor = 'rgba(191, 219, 254, 0.45)'
      target.style.outline = '2px solid rgba(37, 99, 235, 0.65)'
      showToolbarForElement(target, 'text')
    },
    [showToolbarForElement]
  )

  const handleDomBlur = useCallback(
    (event: Event) => {
      const target = event.target as HTMLElement | null
      if (!target) {
        return
      }
      target.style.backgroundColor = target.dataset.prevBackground || ''
      target.style.outline = target.dataset.prevOutline || ''
      delete target.dataset.prevBackground
      delete target.dataset.prevOutline

      if (target.classList.contains('address')) {
        const newText = target.innerText
        const parts = newText.split(',')
        if (parts.length >= 2) {
          const streetAndNum = parts[0].trim().split(' ')
          const buildingNumber = streetAndNum.pop() || ''
          const street = streetAndNum.join(' ')
          const city = parts[parts.length - 1].trim()
          onDataChange({ street, buildingNumber, city })
        }
      }

      saveOverrideForElement(target)
    },
    [onDataChange, saveOverrideForElement]
  )

  const clearToolbarTarget = useCallback(() => {
    setToolbarState((prev) => ({
      visible: prev.visible,
      mode: prev.mode === 'image' ? 'text' : prev.mode,
      targetSelector: undefined
    }))
  }, [])

  const hideToolbar = useCallback(() => {
    setToolbarState((prev) => ({
      visible: false,
      mode: prev.mode,
      targetSelector: undefined
    }))
  }, [])

  const executeCommand = useCallback(
    (command: string, value?: string) => {
      const frameWindow = previewFrameRef.current?.contentWindow
      const doc = getFrameDocument()
      const selector = toolbarStateRef.current.targetSelector
      if (!frameWindow || !doc || !selector) {
        return
      }
      const target = doc.querySelector(selector) as HTMLElement | null
      if (target) {
        target.focus()
      }
      frameWindow.focus()
      const executed = frameWindow.document.execCommand(command, false, value)
      if (!executed && command === 'hiliteColor') {
        frameWindow.document.execCommand('backColor', false, value || '#fff3bf')
      }
      if (selector) {
        const target = doc.querySelector(selector) as HTMLElement | null
        if (target) {
          saveOverrideForElement(target)
        }
      }
    },
    [getFrameDocument, saveOverrideForElement]
  )

  const adjustFontSize = useCallback(
    (direction: 'up' | 'down') => {
      const doc = getFrameDocument()
      if (!doc || toolbarStateRef.current.mode !== 'text') {
        return
      }
      const selector = toolbarStateRef.current.targetSelector
      if (!selector) {
        return
      }
      const selection = doc.getSelection()
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        return
      }
      const range = selection.getRangeAt(0)
      const wrapper = doc.createElement('span')
      wrapper.style.display = 'inline'
      wrapper.style.fontSize = direction === 'up' ? '115%' : '90%'
      try {
        wrapper.appendChild(range.extractContents())
        range.insertNode(wrapper)
        selection.removeAllRanges()
        const newRange = doc.createRange()
        newRange.selectNodeContents(wrapper)
        selection.addRange(newRange)
        const container = wrapper.closest('[data-edit-selector]') as HTMLElement | null
        if (container) {
          saveOverrideForElement(container)
        }
      } catch {
        // Ignore wrapping errors
      }
    },
    [getFrameDocument, saveOverrideForElement]
  )

  const handleImageResize = useCallback(
    (mode: 'full' | 'half' | 'third') => {
      const doc = getFrameDocument()
      const selector = toolbarStateRef.current.targetSelector
      if (!doc || !selector || toolbarStateRef.current.mode !== 'image') {
        return
      }
      const container = doc.querySelector(selector) as HTMLElement | null
      if (!container) {
        return
      }
      const img = container.querySelector('img') as HTMLImageElement | null
      if (!img) {
        return
      }
      const width = mode === 'full' ? '100%' : mode === 'half' ? '50%' : '33%'
      img.style.width = width
      img.style.height = 'auto'
      saveOverrideForElement(container)
    },
    [getFrameDocument, saveOverrideForElement]
  )

  const handleImageReplace = useCallback(() => {
    const doc = getFrameDocument()
    const selector = toolbarStateRef.current.targetSelector
    if (!doc || !selector || toolbarStateRef.current.mode !== 'image') {
      return
    }
    const container = doc.querySelector(selector) as HTMLElement | null
    if (!container) {
      return
    }
    const img = container.querySelector('img') as HTMLImageElement | null
    if (!img) {
      return
    }
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (!file) {
        return
      }
      const reader = new FileReader()
      reader.onload = (loadEvent) => {
        const result = loadEvent.target?.result as string
        if (result) {
          img.src = result
          saveOverrideForElement(container)
          if (container.classList.contains('cover-image-frame')) {
            onDataChange({ selectedImagePreview: result as any })
          }
        }
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }, [getFrameDocument, onDataChange, saveOverrideForElement])

  const handleImageReset = useCallback(() => {
    const doc = getFrameDocument()
    const selector = toolbarStateRef.current.targetSelector
    if (!doc || !selector || toolbarStateRef.current.mode !== 'image') {
      return
    }
    const container = doc.querySelector(selector) as HTMLElement | null
    if (!container) {
      return
    }
    const img = container.querySelector('img') as HTMLImageElement | null
    if (!img) {
      return
    }
    img.style.removeProperty('width')
    img.style.removeProperty('height')
    saveOverrideForElement(container)
  }, [getFrameDocument, saveOverrideForElement])

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
    if (isEditMode) {
      return
    }
    const mergedEdits = {
      ...((data as any).customDocumentEdits || {}),
      ...debouncedOverrides
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
  }, [data, companySettings, debouncedOverrides, isEditMode])

  useEffect(() => {
    if (!isEditMode) {
      const existing =
        (data as any).customDocumentEdits ||
        (data as any).propertyAnalysis?.__customDocumentEdits ||
        {}
      setCustomHtmlOverrides(existing)
      setDebouncedOverrides(existing)
    }
  }, [data, isEditMode])

  const toggleEditMode = useCallback(() => {
    const newEditMode = !isEditMode
    setIsEditMode(newEditMode)
    if (newEditMode) {
      setToolbarState({
        visible: true,
        mode: 'text',
        targetSelector: undefined
      })
    } else {
      hideToolbar()
    }
    
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
  }, [hideToolbar, isEditMode])

  const applyEditableBindings = useCallback(() => {
    if (!isEditMode) {
      return
    }
    const doc = getFrameDocument()
    if (!doc) {
      return
    }

    const textSelectors = [
      'img',
      '.title-primary',
      '.title-secondary',
      '.address',
      '.sub-title',
      '.chapter-title',
      '.section-title',
      '.page-body p',
      '.page-note',
      '.info-grid p',
      '.valuation-card p',
      '.bullet-list li',
      'table td',
      '.rich-text'
    ]

    textSelectors.forEach((selector) => {
      const nodes = Array.from(doc.querySelectorAll(selector))
      nodes.forEach((node) => {
        const element = node as HTMLElement
        if (!element || element.dataset.editBound === 'true') {
          return
        }
        if (element.closest('.page-header-brand') || element.closest('.cover-footer')) {
          return
        }
        const selectorPath = getUniqueSelector(element)
        if (!selectorPath) {
          return
        }
        element.dataset.editBound = 'true'
        element.dataset.editSelector = selectorPath
        element.setAttribute('contenteditable', 'true')
        element.style.cursor = 'text'
        element.addEventListener('focus', handleDomFocus)
        element.addEventListener('blur', handleDomBlur)
      })
    })

    const imageContainers = [
      '.cover-image-frame',
      '.media-card',
      '.media-gallery figure',
      '.valuation-card figure',
      '.section-block figure'
    ]

    const nodes = Array.from(doc.querySelectorAll(imageContainers.join(',')))
    nodes.forEach((node) => {
      const container = node as HTMLElement
      if (!container) {
        return
      }
      const selectorPath = container.getAttribute('data-edit-selector') || getUniqueSelector(container)
      if (!selectorPath) {
        return
      }
      container.dataset.editSelector = selectorPath
      container.dataset.editBound = 'true'
      const img = container.querySelector('img')
      if (img && !(img as HTMLElement).dataset.imageBound) {
        const htmlImg = img as HTMLImageElement
        htmlImg.dataset.imageBound = 'true'
        htmlImg.style.cursor = 'pointer'
        htmlImg.style.pointerEvents = 'auto'
        htmlImg.tabIndex = 0
        htmlImg.setAttribute('role', 'button')
        htmlImg.addEventListener('click', (event) => {
          if (!isEditMode) {
            return
          }
          event.preventDefault()
          event.stopPropagation()
          const containerWithSelector = container.matches('[data-edit-selector]')
            ? container
            : (container.closest('[data-edit-selector]') as HTMLElement | null)
          const elementForToolbar = containerWithSelector || container
          showToolbarForElement(elementForToolbar, 'image')
        })
      }
    })
  }, [getFrameDocument, getUniqueSelector, handleDomBlur, handleDomFocus, isEditMode, showToolbarForElement])

  const handleSelectionChange = useCallback(() => {
    if (!isEditMode) {
      return
    }
    const doc = getFrameDocument()
    const frame = previewFrameRef.current
    if (!doc || !frame) {
      return
    }
    const selection = doc.getSelection()
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      setToolbarState((prev) => ({ ...prev, visible: false }))
      return
    }
    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      return
    }
    const containerNode =
      ((range.commonAncestorContainer as Element).closest?.('[data-edit-selector]') as HTMLElement | null) ||
      (range.commonAncestorContainer.parentElement?.closest('[data-edit-selector]') as HTMLElement | null)
    if (!containerNode) {
      return
    }
    showToolbarForElement(containerNode, 'text')
  }, [getFrameDocument, isEditMode, showToolbarForElement])

  const handleDocumentClick = useCallback(
    (event: Event) => {
      if (!isEditMode) {
        return
      }
      const target = event.target as HTMLElement | null
      if (!target) {
      clearToolbarTarget()
        return
      }
    if (target.closest('[data-edit-toolbar="true"]')) {
      return
    }
      if (target.closest('img') && target.closest('[data-edit-selector]')) {
        return
      }
    if (!target.closest('[data-edit-selector]')) {
      clearToolbarTarget()
      }
  },
    [clearToolbarTarget, isEditMode]
  )

  useEffect(() => {
    updateIframeHeight(previewFrameRef.current)

    if (!isEditMode) {
      hideToolbar()
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
      return
    }

    applyEditableBindings()

    const doc = getFrameDocument()
    if (!doc) {
      return
    }

    const selectionHandler = () => handleSelectionChange()
    const clickHandler = (event: Event) => handleDocumentClick(event)
    doc.addEventListener('selectionchange', selectionHandler)
    doc.addEventListener('click', clickHandler, true)

    if (observerRef.current) {
      observerRef.current.disconnect()
    }
    observerRef.current = new MutationObserver(() => {
      applyEditableBindings()
    })
    observerRef.current.observe(doc.body, { childList: true, subtree: true })

    const delayed = window.setTimeout(() => {
      applyEditableBindings()
    }, 400)

    return () => {
      window.clearTimeout(delayed)
      doc.removeEventListener('selectionchange', selectionHandler)
      doc.removeEventListener('click', clickHandler, true)
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
    }
  }, [
    applyEditableBindings,
    getFrameDocument,
    handleDocumentClick,
    handleSelectionChange,
    hideToolbar,
    htmlContent,
    isEditMode,
    updateIframeHeight
  ])

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
        customDocumentEdits: customHtmlOverrides,
        propertyAnalysis: {
          ...(data as any).propertyAnalysis,
          __customDocumentEdits: customHtmlOverrides
        }
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
      
      // Exit edit mode after successful save
      setIsEditMode(false)
    } catch (error) {
      console.error('Error saving:', error)
      alert('❌ שגיאה בשמירת השינויים')
    } finally {
      setIsSaving(false)
    }
  }, [customHtmlOverrides, data, onDataChange])

  const handleRevert = useCallback(async () => {
    const sessionId = (data as any).sessionId
    if (!sessionId) {
      alert('לא ניתן לבטל - חסר מזהה סשן')
      return
    }

    const hasLocalChanges = Object.keys(customHtmlOverrides).length > 0
    const hasSavedChanges = !!(data as any).customDocumentEdits || !!(data as any).propertyAnalysis?.__customDocumentEdits

    if (!hasLocalChanges && !hasSavedChanges) {
      alert('אין שינויים לביטול')
      return
    }

    const confirmed = window.confirm('האם אתה בטוח שברצונך לבטל את כל השינויים? פעולה זו תמחק את כל השינויים מהמסד נתונים ולא ניתנת לביטול.')
    if (!confirmed) {
      return
    }

    setIsSaving(true)
    try {
      // Remove customDocumentEdits from the session data
      const updatedData = {
        ...data,
        customDocumentEdits: {},
        propertyAnalysis: {
          ...(data as any).propertyAnalysis,
          __customDocumentEdits: {}
        }
      }
      
      const response = await fetch(`/api/session/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: updatedData
        })
      })

      if (!response.ok) {
        throw new Error('Failed to revert changes')
      }

      // Clear local state
      setCustomHtmlOverrides({})
      setDebouncedOverrides({})
      
      // Update parent component data
      onDataChange({ customDocumentEdits: {} } as any)
      
      // Reload document without overrides
      setLastRefreshTime(new Date())
      
      // Exit edit mode
      setIsEditMode(false)
      
      alert('✅ כל השינויים בוטלו ונמחקו מהמסד נתונים')
    } catch (error) {
      console.error('Error reverting:', error)
      alert('❌ שגיאה בביטול השינויים')
    } finally {
      setIsSaving(false)
    }
  }, [customHtmlOverrides, data, onDataChange])

  const handleExportPDF = useCallback(async (useReactPdf: boolean = false) => {
    const sessionId = (data as any).sessionId
    if (!sessionId) {
      alert('לא ניתן לייצא - חסר מזהה סשן')
      return
    }

    setIsExporting(true)
    try {
      const mergedEdits = {
        ...((data as any).customDocumentEdits || (data as any).propertyAnalysis?.__customDocumentEdits || {}),
        ...customHtmlOverrides
      }

      // Choose endpoint based on PDF engine preference
      const endpoint = useReactPdf 
        ? `/api/session/${sessionId}/export-pdf-react`
        : `/api/session/${sessionId}/export-pdf`

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customDocumentEdits: mergedEdits
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to export PDF: ${errorText}`)
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
      
      alert(`✅ PDF הורד בהצלחה! (${useReactPdf ? 'React-PDF' : 'Puppeteer'})`)
    } catch (error) {
      console.error('Error exporting PDF:', error)
      alert(`❌ שגיאה בייצוא PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsExporting(false)
    }
  }, [data, customHtmlOverrides])

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

  const textToolbarButtons: Array<{ icon: string; command: string; label: string }> = [
    { icon: 'B', command: 'bold', label: 'מודגש' },
    { icon: 'I', command: 'italic', label: 'נטוי' },
    { icon: 'U', command: 'underline', label: 'קו תחתון' },
    { icon: '•', command: 'insertUnorderedList', label: 'רשימת תבליטים' },
    { icon: '1.', command: 'insertOrderedList', label: 'רשימה ממוספרת' },
    { icon: '↔︎', command: 'justifyFull', label: 'יישור מלא' },
    { icon: '⇤', command: 'justifyRight', label: 'יישור לימין' },
    { icon: '⇥', command: 'justifyCenter', label: 'יישור למרכז' }
  ]

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

  const handleIframeLoad = useCallback(() => {
    updateIframeHeight(previewFrameRef.current)
    applyOverridesToDocument()
  }, [applyOverridesToDocument, updateIframeHeight])

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden max-w-[1400px] mx-auto">
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
              <div className="flex gap-2">
                <button
                  onClick={() => handleExportPDF(false)}
                  disabled={isExporting}
                  className={`px-3 py-2 text-sm rounded-lg font-medium transition-all duration-200 ${
                    isExporting 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-red-500 text-white hover:bg-red-600 shadow-md'
                  }`}
                  title="ייצא PDF של הדוח הערוך (Puppeteer - HTML template)"
                >
                  {isExporting ? (
                    <>
                      <span className="inline-block animate-spin mr-1">⟳</span>
                      מייצא...
                    </>
                  ) : (
                    <>📄 ייצא PDF (HTML)</>
                  )}
                </button>
                <button
                  onClick={() => handleExportPDF(true)}
                  disabled={isExporting}
                  className={`px-3 py-2 text-sm rounded-lg font-medium transition-all duration-200 ${
                    isExporting 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-blue-500 text-white hover:bg-blue-600 shadow-md'
                  }`}
                  title="ייצא PDF של הדוח הערוך (React-PDF - חדש)"
                >
                  {isExporting ? (
                    <>
                      <span className="inline-block animate-spin mr-1">⟳</span>
                      מייצא...
                    </>
                  ) : (
                    <>⚡ ייצא PDF (React-PDF)</>
                  )}
                </button>
              </div>
              
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
            className={`px-4 py-2 text-sm font-semibold rounded-md shadow transition-colors ${
              isEditMode 
                ? 'bg-slate-900 text-white hover:bg-slate-800 border border-slate-950'
                : 'bg-amber-500 text-white hover:bg-amber-600 border border-amber-600'
            }`}
            title={isEditMode ? 'סגור את מצב העריכה' : 'פתח את מצב העריכה'}
          >
            {isEditMode ? '🚪 סגור מצב עריכה' : '✏️ כניסה למצב עריכה'}
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
              
              <button
                onClick={handleRevert}
                disabled={isSaving || (Object.keys(customHtmlOverrides).length === 0 && !(data as any).customDocumentEdits && !(data as any).propertyAnalysis?.__customDocumentEdits)}
                className={`px-3 py-1 text-xs rounded border transition-colors ${
                  isSaving || (Object.keys(customHtmlOverrides).length === 0 && !(data as any).customDocumentEdits && !(data as any).propertyAnalysis?.__customDocumentEdits)
                    ? 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed'
                    : 'bg-red-500 text-white border-red-600 hover:bg-red-600'
                }`}
                title={
                  isSaving 
                    ? 'מבטל...' 
                    : (Object.keys(customHtmlOverrides).length === 0 && !(data as any).customDocumentEdits && !(data as any).propertyAnalysis?.__customDocumentEdits)
                      ? 'אין שינויים לביטול' 
                      : 'בטל את כל השינויים'
                }
              >
                {isSaving ? (
                  <>
                    <span className="inline-block animate-spin mr-1">⟳</span>
                    מבטל...
                  </>
                ) : (
                  <>↶ בטל שינויים</>
                )}
              </button>
              
              <div className="text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded">
                💡 לחץ על טקסט או תמונה כדי לערוך
            </div>
            </>
          )}
        </div>
      </div>
      
      <div className="p-4 overflow-x-auto">
        <iframe
          ref={previewFrameRef}
          srcDoc={htmlContent}
          className="w-full border border-gray-200 rounded shadow-sm bg-white mx-auto"
          style={{ minHeight: '1122px', width: '100%', maxWidth: '1200px' }}
          title="Document preview"
          onLoad={handleIframeLoad}
        />
        {isEditMode && toolbarState.visible && (
          <div
            data-edit-toolbar="true"
            className="fixed top-24 right-8 z-[1200] flex flex-wrap items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-xl"
            style={{ direction: 'rtl' }}
          >
            {toolbarState.mode === 'text' ? (
              <>
                {textToolbarButtons.map((btn) => {
                  const disabled = toolbarState.mode !== 'text' || !toolbarState.targetSelector
                  return (
              <button
                      key={btn.command}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => executeCommand(btn.command)}
                      disabled={disabled}
                      className={`min-w-[36px] rounded-md border px-2 py-1 text-xs font-semibold ${
                        disabled
                          ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'border-gray-200 text-gray-700 hover:border-blue-400 hover:text-blue-600'
                      }`}
                      title={btn.label}
                    >
                      {btn.icon}
              </button>
                  )
                })}
              <button
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => adjustFontSize('up')}
                  disabled={toolbarState.mode !== 'text' || !toolbarState.targetSelector}
                  className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                    toolbarState.mode !== 'text' || !toolbarState.targetSelector
                      ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                      : 'border-gray-200 text-gray-700 hover:border-blue-400 hover:text-blue-600'
                  }`}
                  title="הגדל גופן"
                >
                  A+
              </button>
              <button
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => adjustFontSize('down')}
                  disabled={toolbarState.mode !== 'text' || !toolbarState.targetSelector}
                  className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                    toolbarState.mode !== 'text' || !toolbarState.targetSelector
                      ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                      : 'border-gray-200 text-gray-700 hover:border-blue-400 hover:text-blue-600'
                  }`}
                  title="הקטן גופן"
                >
                  A-
              </button>
              <button
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => executeCommand('hiliteColor', '#fff3bf')}
                  disabled={toolbarState.mode !== 'text' || !toolbarState.targetSelector}
                  className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                    toolbarState.mode !== 'text' || !toolbarState.targetSelector
                      ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                      : 'border-gray-200 text-gray-700 hover:border-amber-400 hover:text-amber-600'
                  }`}
                  title="סמן טקסט"
                >
                  🖍️
              </button>
              <button
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={hideToolbar}
                  className="rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 hover:border-red-400 hover:text-red-600"
                  title="הסתרת סרגל"
                >
                  ✖
              </button>
              </>
            ) : (
              <>
              <button
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={handleImageReplace}
                  disabled={toolbarState.mode !== 'image' || !toolbarState.targetSelector}
                  className={`rounded-md border px-3 py-1 text-xs font-semibold ${
                    toolbarState.mode !== 'image' || !toolbarState.targetSelector
                      ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'border-blue-400 bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}
                  title="החלפת תמונה"
                >
                  החלף תמונה
              </button>
              <button
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleImageResize('full')}
                  disabled={toolbarState.mode !== 'image' || !toolbarState.targetSelector}
                  className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                    toolbarState.mode !== 'image' || !toolbarState.targetSelector
                      ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                      : 'border-gray-200 text-gray-700 hover:border-blue-400 hover:text-blue-600'
                  }`}
                  title="רוחב מלא"
                >
                  100%
              </button>
              <button
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleImageResize('half')}
                  disabled={toolbarState.mode !== 'image' || !toolbarState.targetSelector}
                  className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                    toolbarState.mode !== 'image' || !toolbarState.targetSelector
                      ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                      : 'border-gray-200 text-gray-700 hover:border-blue-400 hover:text-blue-600'
                  }`}
                  title="חצי רוחב"
                >
                  50%
              </button>
              <button
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleImageResize('third')}
                  disabled={toolbarState.mode !== 'image' || !toolbarState.targetSelector}
                  className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                    toolbarState.mode !== 'image' || !toolbarState.targetSelector
                      ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                      : 'border-gray-200 text-gray-700 hover:border-blue-400 hover:text-blue-600'
                  }`}
                  title="שליש רוחב"
                >
                  33%
              </button>
                <button
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={handleImageReset}
                  disabled={toolbarState.mode !== 'image' || !toolbarState.targetSelector}
                  className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                    toolbarState.mode !== 'image' || !toolbarState.targetSelector
                      ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                      : 'border-gray-200 text-gray-700 hover:border-green-400 hover:text-green-600'
                  }`}
                  title="איפוס התאמות"
                >
                  איפוס
                </button>
                <button
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={hideToolbar}
                  className="rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 hover:border-red-400 hover:text-red-600"
                  title="הסתרת סרגל"
                >
                  ✖
                </button>
              </>
            )}
              </div>
            )}
        <style jsx global>{`
          iframe {
            background: #ffffff;
          }
        `}</style>
      </div>
    </div>
  )
}

