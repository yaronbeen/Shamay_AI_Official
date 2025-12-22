'use client'

import { useState, useRef, useEffect } from 'react'
import React from 'react'
import { Download, FileText, CheckCircle, Loader2, ExternalLink, Send, Sparkles, Bot, User, Mic, MicOff, Paperclip, X } from 'lucide-react'
import { ValuationData } from '../ValuationWizard'
import { buildOpeningMessage } from '@/lib/chat/system-prompt'

interface Step5ExportProps {
  data: ValuationData
  onSaveFinalResults?: (finalValuation: number, pricePerSqm: number, comparableData: any, propertyAnalysis: any) => Promise<void>
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

// Helper function to safely parse numeric values (handles strings from backend)
const parseNumeric = (value: any, fallback: number = 0): number => {
  if (value === null || value === undefined || value === '') {
    return fallback
  }
  if (typeof value === 'number') {
    return isNaN(value) || !isFinite(value) ? fallback : value
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed === '' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') {
      return fallback
    }
    const parsed = parseFloat(trimmed)
    return isNaN(parsed) || !isFinite(parsed) ? fallback : parsed
  }
  return fallback
}

export function Step5Export({ data }: Step5ExportProps) {
  const [exporting, setExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [sessionData, setSessionData] = useState<ValuationData | null>(null)

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Microphone selection state
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedMicId, setSelectedMicId] = useState<string>('')
  const [showMicSelector, setShowMicSelector] = useState(false)
  const micSelectorRef = useRef<HTMLDivElement>(null)

  // Close mic selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (micSelectorRef.current && !micSelectorRef.current.contains(event.target as Node)) {
        setShowMicSelector(false)
      }
    }
    if (showMicSelector) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMicSelector])

  // Ref for the messages container
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages change - scroll only within the chat container
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [messages])

  // Load available audio devices
  const loadAudioDevices = async () => {
    try {
      // Need to request permission first to get device labels
      await navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => stream.getTracks().forEach(track => track.stop()))
        .catch(() => {}) // Ignore if permission denied

      const devices = await navigator.mediaDevices.enumerateDevices()
      const audioInputs = devices.filter(device => device.kind === 'audioinput')
      setAudioDevices(audioInputs)

      // Set default device if none selected
      if (!selectedMicId && audioInputs.length > 0) {
        setSelectedMicId(audioInputs[0].deviceId)
      }
    } catch (error) {
      console.error('Failed to enumerate audio devices:', error)
    }
  }

  useEffect(() => {
    loadAudioDevices()

    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', loadAudioDevices)
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', loadAudioDevices)
    }
  }, [])

  // Load latest data from session when component mounts
  React.useEffect(() => {
    const loadSessionData = async () => {
      if (!data.sessionId) return

      try {
        const response = await fetch(`/api/session/${data.sessionId}`)
        if (response.ok) {
          const result = await response.json()
          if (result.data) {
            setSessionData(result.data as ValuationData)
            console.log('Step5Export: Loaded session data', {
              finalValuation: result.data.finalValuation,
              pricePerSqm: result.data.pricePerSqm,
              hasComparableDataAnalysis: !!result.data.comparableDataAnalysis
            })
          }
        }
      } catch (error) {
        console.error('Step5Export: Failed to load session data', error)
      }
    }

    loadSessionData()
  }, [data.sessionId])

  // Initialize chat with opening message for guided flow
  useEffect(() => {
    if (messages.length === 0) {
      const openingMessage: ChatMessage = {
        id: 'opening',
        role: 'assistant',
        content: buildOpeningMessage(),
        timestamp: new Date(),
      }
      setMessages([openingMessage])
    }
  }, [])

  // Use session data if available, otherwise fall back to props data
  const displayData = sessionData || data

  // Suggested questions for the chat
  const suggestedQuestions = [
    'סכם את כל הנתונים שנאספו על הנכס',
    'מה השווי הסופי של הנכס ואיך הגעת אליו?',
    'האם יש בעיות או חוסרים בנתונים?',
    'כתוב טקסט מקצועי לדוח השמאות',
  ]

  // File handling
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/')
      const isPdf = file.type === 'application/pdf'
      const isValidSize = file.size <= 10 * 1024 * 1024 // 10MB max
      return (isImage || isPdf) && isValidSize
    })
    setAttachments(prev => [...prev, ...validFiles])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const handleSendMessage = async (messageText?: string) => {
    const text = messageText || inputValue.trim()
    if ((!text && attachments.length === 0) || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text + (attachments.length > 0 ? ` [${attachments.length} קבצים מצורפים]` : ''),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    const currentAttachments = [...attachments]
    setAttachments([])
    setIsLoading(true)

    try {
      let response: Response

      if (currentAttachments.length > 0) {
        // Use FormData for file uploads
        const formData = new FormData()
        formData.append('message', text)
        formData.append('conversationHistory', JSON.stringify(messages.map(m => ({
          role: m.role,
          content: m.content,
        }))))
        currentAttachments.forEach(file => formData.append('files', file))

        response = await fetch(`/api/session/${data.sessionId}/chat`, {
          method: 'POST',
          body: formData,
        })
      } else {
        response = await fetch(`/api/session/${data.sessionId}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            conversationHistory: messages.map(m => ({
              role: m.role,
              content: m.content,
            })),
          }),
        })
      }

      if (!response.ok) {
        throw new Error('Chat request failed')
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, assistantMessage])

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          assistantContent += chunk

          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMessage.id
                ? { ...m, content: assistantContent }
                : m
            )
          )
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'מצטער, אירעה שגיאה. אנא נסה שוב.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Voice recording handlers
  const [isTranscribing, setIsTranscribing] = useState(false)

  const startRecording = async () => {
    try {
      // Check if we're in a secure context (required for microphone access)
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      if (!window.isSecureContext && !isLocalhost) {
        alert(`גישה למיקרופון נחסמה כי האתר אינו מאובטח (HTTPS נדרש).\n\nאם אתה ניגש דרך כתובת IP (כמו WSL2):\n1. פתח טאב חדש בכרום\n2. הקלד: chrome://flags/#unsafely-treat-insecure-origin-as-secure\n3. הוסף: ${window.location.origin}\n4. בחר Enable ולחץ Relaunch`)
        return
      }

      // First check if MediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('הדפדפן שלך לא תומך בהקלטת קול. נסה להשתמש ב-Chrome או Firefox.')
        return
      }

      // Check existing permission status
      if (navigator.permissions) {
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName })
          if (permissionStatus.state === 'denied') {
            alert('גישה למיקרופון נחסמה. לחץ על סמל המנעול בשורת הכתובת ואפשר גישה למיקרופון, ואז רענן את הדף.')
            return
          }
        } catch (e) {
          // Permission API might not be available for microphone in all browsers
          console.log('Permission query not available, proceeding with getUserMedia')
        }
      }

      // Request microphone access with optimized settings for speech recognition
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000, // Optimal for speech recognition
        channelCount: 1,   // Mono is better for speech
      }

      // Use selected microphone if available
      if (selectedMicId) {
        audioConstraints.deviceId = { exact: selectedMicId }
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints
      })

      // Try to use a compatible MIME type with good quality settings
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4'

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000, // 128kbps for good speech quality
      })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
        stream.getTracks().forEach(track => track.stop())

        if (audioBlob.size === 0) {
          console.error('No audio recorded')
          return
        }

        setIsTranscribing(true)

        console.log('🎤 Sending audio for transcription:', {
          size: audioBlob.size,
          type: mimeType,
          duration: `${audioChunksRef.current.length} chunks`
        })

        // Send to transcription API
        const formData = new FormData()
        formData.append('audio', audioBlob, 'recording.webm')
        formData.append('language', 'he')
        if (data.sessionId) {
          formData.append('sessionId', data.sessionId)
        }

        try {
          const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          })

          const result = await response.json()
          console.log('📝 Transcription result:', result)

          if (response.ok && result.text) {
            setInputValue(prev => prev ? `${prev} ${result.text}` : result.text)
          } else {
            console.error('Transcription failed:', result.error)
            alert(`התמלול נכשל: ${result.error || 'שגיאה לא ידועה'}`)
          }
        } catch (error) {
          console.error('Transcription error:', error)
          alert('שגיאה בתמלול. נסה שוב.')
        } finally {
          setIsTranscribing(false)
        }
      }

      mediaRecorder.start(1000) // Collect data every second
      setIsRecording(true)
    } catch (error: any) {
      console.error('Failed to start recording:', error)

      // Provide more specific error messages
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        alert('גישה למיקרופון נדחתה.\n\nכדי לאפשר:\n1. לחץ על סמל המנעול/מידע בשורת הכתובת\n2. מצא "מיקרופון" והעבר ל"אפשר"\n3. רענן את הדף')
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        alert('לא נמצא מיקרופון. וודא שמיקרופון מחובר למחשב.')
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        alert('המיקרופון בשימוש על ידי תוכנית אחרת. סגור תוכניות אחרות שמשתמשות במיקרופון.')
      } else if (error.name === 'SecurityError') {
        alert('גישה למיקרופון נחסמה מסיבות אבטחה.\n\nאם אתה ניגש דרך כתובת IP (כמו WSL2):\n1. פתח chrome://flags/#unsafely-treat-insecure-origin-as-secure\n2. הוסף את כתובת האתר (למשל http://192.168.90.147:3000)\n3. לחץ Relaunch')
      } else {
        // Check if this might be a secure context issue (non-localhost access)
        const isSecureContext = window.isSecureContext
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

        if (!isSecureContext && !isLocalhost) {
          alert(`גישה למיקרופון נחסמה כי האתר אינו מאובטח.\n\nאם אתה ניגש דרך כתובת IP (כמו WSL2):\n1. פתח chrome://flags/#unsafely-treat-insecure-origin-as-secure\n2. הוסף: ${window.location.origin}\n3. לחץ Enable ואז Relaunch`)
        } else {
          alert(`שגיאה בגישה למיקרופון: ${error.message || 'שגיאה לא ידועה'}`)
        }
      }
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const handleExportPDF = async () => {
    if (!data.sessionId) {
      console.error('No session ID available')
      return
    }

    try {
      setExporting(true)
      setExportStatus('idle')

      console.log('Starting PDF export...')

      const response = await fetch(`/api/session/${data.sessionId}/export-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error(`PDF export failed: ${response.status}`)
      }

      const contentType = response.headers.get('content-type')

      if (contentType?.includes('application/pdf')) {
        const pdfBlob = await response.blob()

        setPdfBlob(pdfBlob)
        setExportStatus('success')

        const url = URL.createObjectURL(pdfBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `shamay-valuation-${data.sessionId}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        setTimeout(() => URL.revokeObjectURL(url), 60000)

      } else if (contentType?.includes('text/html')) {
        const html = await response.text()

        const printWindow = window.open('', '_blank')
        if (printWindow) {
          printWindow.document.write(html)
          printWindow.document.close()
          setTimeout(() => printWindow.print(), 500)
        }

        setExportStatus('success')

      } else {
        const result = await response.json()
        throw new Error(result.error || 'PDF export failed')
      }

    } catch (error) {
      console.error('PDF export error:', error)
      setExportStatus('error')
    } finally {
      setExporting(false)
    }
  }

  const handleDownloadPDF = () => {
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `shamay-valuation-${data.sessionId}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">עוזר AI וייצוא דוח</h2>
        <p className="text-gray-600 text-lg">שאל שאלות על הנכס וצור דוח PDF מקצועי</p>
      </div>

      {/* Main Layout - Chat on Left, Export on Right */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* AI Chat - Takes 2/3 of the space */}
        <div className="xl:col-span-2 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 rounded-2xl shadow-2xl overflow-hidden border border-blue-500/30">
          {/* Chat Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 border-b border-blue-500/30">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">עוזר השמאות החכם</h3>
              </div>
              <div className="mr-auto flex items-center gap-2">
                <span className="flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <span className="text-green-300 text-sm font-medium">מוכן לעזור</span>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <div ref={messagesContainerRef} className="h-[400px] overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-transparent to-black/20">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <div className="w-20 h-20 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm border border-blue-400/30">
                  <Bot className="w-10 h-10 text-blue-300" />
                </div>
                <h4 className="text-xl font-semibold text-white mb-2">שלום! אני עוזר השמאות שלך</h4>
                <p className="text-blue-200 mb-6 max-w-md">
                  אני יכול לעזור לך לסכם את הנתונים, לכתוב טקסטים לדוח, ולענות על שאלות לגבי הנכס והשמאות.
                </p>

                {/* Suggested Questions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                  {suggestedQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleSendMessage(question)}
                      className="px-4 py-3 bg-white/10 hover:bg-white/20 border border-blue-400/30 rounded-xl text-sm text-blue-100 text-right transition-all hover:scale-[1.02] hover:border-blue-400/50 backdrop-blur-sm"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      message.role === 'user'
                        ? 'bg-blue-500'
                        : 'bg-gradient-to-br from-purple-500 to-indigo-600'
                    }`}>
                      {message.role === 'user' ? (
                        <User className="w-5 h-5 text-white" />
                      ) : (
                        <Bot className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/10 text-white border border-white/10 backdrop-blur-sm'
                      }`}
                      onCopy={(e) => {
                        // Strip formatting when copying - paste as plain black text
                        const selection = window.getSelection()?.toString() || ''
                        e.clipboardData.setData('text/plain', selection)
                        e.preventDefault()
                      }}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="bg-white/10 border border-white/10 rounded-2xl px-4 py-3 backdrop-blur-sm">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Chat Input */}
          <div className="p-4 bg-black/30 border-t border-blue-500/30">
            {/* Attachment Preview */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-blue-400/30 rounded-lg text-sm text-blue-200">
                    <Paperclip className="w-3 h-3" />
                    <span className="max-w-[150px] truncate">{file.name}</span>
                    <button
                      onClick={() => removeAttachment(index)}
                      className="hover:text-red-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="שאל שאלה על הנכס או בקש עזרה בכתיבת הדוח..."
                  className="w-full px-4 py-3 bg-white/10 border border-blue-400/30 rounded-xl text-white placeholder-blue-300/50 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm"
                  rows={2}
                  dir="rtl"
                />
              </div>

              {/* File Attachment */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 rounded-xl bg-white/10 hover:bg-white/20 border border-blue-400/30 transition-all"
                title="צרף קובץ"
              >
                <Paperclip className="w-5 h-5 text-blue-300" />
              </button>

              {/* Voice Input with Mic Selector */}
              <div className="relative" ref={micSelectorRef}>
                <div className="flex items-center gap-1">
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isTranscribing}
                    className={`p-3 rounded-xl transition-all ${
                      isTranscribing
                        ? 'bg-yellow-500 cursor-wait'
                        : isRecording
                        ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                        : 'bg-white/10 hover:bg-white/20 border border-blue-400/30'
                    }`}
                    title={isTranscribing ? 'מתמלל...' : isRecording ? 'הפסק הקלטה' : 'הקלט קול'}
                  >
                    {isTranscribing ? (
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    ) : isRecording ? (
                      <MicOff className="w-5 h-5 text-white" />
                    ) : (
                      <Mic className="w-5 h-5 text-blue-300" />
                    )}
                  </button>
                  {/* Mic Settings Button - always show to allow device selection */}
                  <button
                    onClick={() => {
                      loadAudioDevices() // Refresh devices list
                      setShowMicSelector(!showMicSelector)
                    }}
                    className="p-1 rounded hover:bg-white/10 transition-all"
                    title="בחר מיקרופון"
                  >
                    <svg className="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* Mic Selector Dropdown */}
                {showMicSelector && (
                  <div className="absolute bottom-full mb-2 right-0 bg-slate-800 border border-blue-400/30 rounded-lg shadow-xl p-2 min-w-[250px] z-50">
                    <div className="text-xs text-blue-300 mb-2 px-2">בחר מיקרופון:</div>
                    {audioDevices.length === 0 ? (
                      <div className="text-sm text-gray-400 px-3 py-2">
                        לא נמצאו מיקרופונים. אנא אשר גישה למיקרופון.
                      </div>
                    ) : (
                      audioDevices.map((device, index) => (
                        <button
                          key={device.deviceId || index}
                          onClick={() => {
                            setSelectedMicId(device.deviceId)
                            setShowMicSelector(false)
                          }}
                          className={`w-full text-right px-3 py-2 rounded text-sm transition-all ${
                            selectedMicId === device.deviceId
                              ? 'bg-blue-500/30 text-white'
                              : 'text-gray-300 hover:bg-white/10'
                          }`}
                        >
                          {device.label || `מיקרופון ${index + 1}`}
                          {selectedMicId === device.deviceId && (
                            <span className="mr-2">✓</span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Send Button */}
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || isLoading}
                className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all hover:scale-105"
              >
                <Send className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Export & Summary */}
        <div className="space-y-6">
          {/* PDF Export Card */}
          <div className="bg-white border-2 border-blue-200 rounded-xl p-6 shadow-lg">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-full mb-3">
                <FileText className="h-7 w-7 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-1">ייצוא PDF</h3>
              <p className="text-sm text-gray-600">יצירת דוח מקצועי</p>
            </div>

            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className={`w-full px-4 py-3 rounded-lg font-semibold transition-all ${
                exporting
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg transform hover:scale-105'
              }`}
            >
              {exporting ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  מייצא...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Download className="h-5 w-5 mr-2" />
                  יצור PDF
                </div>
              )}
            </button>

            {exportStatus === 'success' && (
              <div className="mt-4 p-3 bg-green-50 border border-green-300 rounded-lg">
                <div className="flex items-center justify-center text-green-800 text-sm">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  <span className="font-medium">PDF נוצר בהצלחה!</span>
                </div>
                {pdfBlob && (
                  <button
                    onClick={handleDownloadPDF}
                    className="w-full mt-2 text-sm text-blue-700 hover:text-blue-900 hover:underline"
                  >
                    הורד שוב
                  </button>
                )}
              </div>
            )}

            {exportStatus === 'error' && (
              <div className="mt-4 p-3 bg-red-50 border border-red-300 rounded-lg">
                <p className="text-sm text-red-800 text-center">שגיאה ביצירת PDF</p>
              </div>
            )}

            {/* Word Conversion */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <a
                href="https://www.adobe.com/il_he/acrobat/online/pdf-to-word.html"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full px-3 py-2 rounded-lg text-sm font-medium bg-green-50 text-green-700 hover:bg-green-100 border border-green-300 transition-colors"
              >
                <FileText className="h-4 w-4 ml-1" />
                המר ל-Word
                <ExternalLink className="h-3 w-3 mr-1" />
              </a>
            </div>
          </div>

          {/* Summary Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-blue-900 mb-4 text-center">סיכום השווי</h3>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <p className="text-xs text-gray-500 mb-1">שטח</p>
                  <p className="text-base font-bold text-blue-900">
                    {displayData.area ? `${displayData.area} מ"ר` : '-'}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <p className="text-xs text-gray-500 mb-1">חדרים</p>
                  <p className="text-base font-bold text-blue-900">
                    {displayData.rooms || '-'}
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-4 text-white">
                <p className="text-xs mb-1 opacity-90">שווי הנכס</p>
                <p className="text-2xl font-bold">
                  ₪{parseNumeric(
                    displayData.finalValuation ||
                    (displayData.comparableDataAnalysis as any)?.estimatedValue ||
                    ((displayData.comparableDataAnalysis as any)?.section52 as any)?.asset_value_nis ||
                    ((displayData as any).comparableAnalysis as any)?.finalValue ||
                    ((displayData.marketAnalysis as any)?.estimatedValue) || ((displayData.marketAnalysis as any)?.averagePrice) ||
                    0
                  ).toLocaleString('he-IL')}
                </p>
              </div>

              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <p className="text-xs text-gray-500 mb-1">מחיר למ"ר</p>
                <p className="text-base font-bold text-blue-900">
                  ₪{parseNumeric(
                    displayData.pricePerSqm ||
                    (displayData.comparableDataAnalysis as any)?.averagePricePerSqm ||
                    ((displayData as any).comparableAnalysis as any)?.averagePricePerSqm ||
                    displayData.marketAnalysis?.averagePricePerSqm ||
                    ((displayData.comparableDataAnalysis as any)?.section52 as any)?.final_price_per_sqm ||
                    0
                  ).toLocaleString('he-IL')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
