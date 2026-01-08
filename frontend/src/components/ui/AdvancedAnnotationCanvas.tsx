'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { 
  Square, 
  Circle as CircleIcon, 
  ArrowRight, 
  Type, 
  PenTool, 
  Eraser,
  Palette,
  Undo,
  Redo,
  Save,
  X,
  Move,
  RotateCw
} from 'lucide-react'

export interface AnnotationShape {
  id: string
  type: 'line' | 'rectangle' | 'circle' | 'arrow' | 'text' | 'freehand' | 'brush'
  x?: number
  y?: number
  width?: number
  height?: number
  radius?: number
  x1?: number
  y1?: number
  x2?: number
  y2?: number
  points?: { x: number; y: number }[]
  text?: string
  color: string
  strokeWidth: number
  opacity: number
  rotation?: number
  scaleX?: number
  scaleY?: number
}

interface AdvancedAnnotationCanvasProps {
  imageUrl: string
  initialAnnotations?: AnnotationShape[]
  onAnnotationsChange?: (annotations: AnnotationShape[]) => void
  onSave?: (annotations: AnnotationShape[], imageData: string) => void
  onClose?: () => void
  width?: number
  height?: number
}

const TOOLS = [
  { id: 'select', icon: Move, label: 'בחר', color: '#6b7280' },
  { id: 'line', icon: PenTool, label: 'קו', color: '#ef4444' },
  { id: 'rectangle', icon: Square, label: 'מלבן', color: '#3b82f6' },
  { id: 'circle', icon: CircleIcon, label: 'עיגול', color: '#10b981' },
  { id: 'arrow', icon: ArrowRight, label: 'חץ', color: '#f59e0b' },
  { id: 'text', icon: Type, label: 'טקסט', color: '#8b5cf6' },
  { id: 'freehand', icon: PenTool, label: 'יד חופשית', color: '#ec4899' },
  { id: 'brush', icon: PenTool, label: 'מברשת', color: '#06b6d4' },
  { id: 'eraser', icon: Eraser, label: 'מחק', color: '#6b7280' }
] as const

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', 
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  '#6b7280', '#000000', '#ffffff'
]

const BRUSH_SIZES = [2, 4, 6, 8, 12, 16, 20]

export default function AdvancedAnnotationCanvas({
  imageUrl,
  initialAnnotations = [],
  onAnnotationsChange,
  onSave,
  onClose,
  width = 800,
  height = 600
}: AdvancedAnnotationCanvasProps) {
  const [annotations, setAnnotations] = useState<AnnotationShape[]>(initialAnnotations)
  const [selectedTool, setSelectedTool] = useState<typeof TOOLS[number]['id']>('select')
  const [selectedColor, setSelectedColor] = useState('#ef4444')
  const [brushSize, setBrushSize] = useState(4)
  const [opacity, setOpacity] = useState(1)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentShape, setCurrentShape] = useState<AnnotationShape | null>(null)
  const [history, setHistory] = useState<AnnotationShape[][]>([initialAnnotations])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null)
  const [textInput, setTextInput] = useState('')
  const [showTextInput, setShowTextInput] = useState(false)
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 })

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null)

  // Save state to history
  const saveToHistory = useCallback((newAnnotations: AnnotationShape[]) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push([...newAnnotations])
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }, [history, historyIndex])

  // Undo/Redo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setAnnotations([...history[newIndex]])
    }
  }, [historyIndex, history])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setAnnotations([...history[newIndex]])
    }
  }, [historyIndex, history])

  // Get mouse position relative to canvas - accounts for scaling
  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  // Handle mouse events
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e)

    if (selectedTool === 'select') {
      // Handle selection
      const clickedShape = annotations.find(annotation => {
        if (annotation.type === 'line' && annotation.x1 && annotation.y1 && annotation.x2 && annotation.y2) {
          const distance = Math.abs((annotation.y2 - annotation.y1) * pos.x - (annotation.x2 - annotation.x1) * pos.y + annotation.x2 * annotation.y1 - annotation.y2 * annotation.x1) / 
                          Math.sqrt(Math.pow(annotation.y2 - annotation.y1, 2) + Math.pow(annotation.x2 - annotation.x1, 2))
          return distance < 10
        }
        return false
      })
      
      if (clickedShape) {
        setSelectedShapeId(clickedShape.id)
      } else {
        setSelectedShapeId(null)
      }
      return
    }

    if (selectedTool === 'text') {
      setTextPosition(pos)
      setShowTextInput(true)
      return
    }

    if (selectedTool === 'eraser') {
      // Remove shape at position
      const shapeToRemove = annotations.find(annotation => {
        if (annotation.type === 'line' && annotation.x1 && annotation.y1 && annotation.x2 && annotation.y2) {
          const distance = Math.abs((annotation.y2 - annotation.y1) * pos.x - (annotation.x2 - annotation.x1) * pos.y + annotation.x2 * annotation.y1 - annotation.y2 * annotation.x1) / 
                          Math.sqrt(Math.pow(annotation.y2 - annotation.y1, 2) + Math.pow(annotation.x2 - annotation.x1, 2))
          return distance < 10
        }
        return false
      })
      
      if (shapeToRemove) {
        const newAnnotations = annotations.filter(a => a.id !== shapeToRemove.id)
        setAnnotations(newAnnotations)
        saveToHistory(newAnnotations)
      }
      return
    }

    setIsDrawing(true)
    
    const newShape: AnnotationShape = {
      id: `shape_${Date.now()}_${Math.random()}`,
      type: selectedTool as any,
      x: pos.x,
      y: pos.y,
      x1: pos.x,
      y1: pos.y,
      color: selectedColor,
      strokeWidth: brushSize,
      opacity: opacity,
      points: selectedTool === 'freehand' || selectedTool === 'brush' ? [{ x: pos.x, y: pos.y }] : undefined
    }

    setCurrentShape(newShape)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentShape) return

    const pos = getMousePos(e)

    if (currentShape.type === 'freehand' || currentShape.type === 'brush') {
      const newPoints = [...(currentShape.points || []), { x: pos.x, y: pos.y }]
      setCurrentShape({ ...currentShape, points: newPoints })
    } else {
      setCurrentShape({
        ...currentShape,
        x2: pos.x,
        y2: pos.y,
        width: Math.abs(pos.x - (currentShape.x1 || 0)),
        height: Math.abs(pos.y - (currentShape.y1 || 0)),
        radius: Math.sqrt(Math.pow(pos.x - (currentShape.x1 || 0), 2) + Math.pow(pos.y - (currentShape.y1 || 0), 2))
      })
    }

    // Redraw canvas
    redrawCanvas()
  }

  const handleMouseUp = () => {
    if (!isDrawing || !currentShape) return

    setIsDrawing(false)
    
    if (currentShape.type === 'freehand' || currentShape.type === 'brush') {
      if ((currentShape.points?.length || 0) > 1) {
        const newAnnotations = [...annotations, currentShape]
        setAnnotations(newAnnotations)
        saveToHistory(newAnnotations)
      }
    } else {
      const newAnnotations = [...annotations, currentShape]
      setAnnotations(newAnnotations)
      saveToHistory(newAnnotations)
    }

    setCurrentShape(null)
    redrawCanvas()
  }

  // Handle text input
  const handleTextSubmit = () => {
    if (!textInput.trim()) {
      setShowTextInput(false)
      setTextInput('')
      return
    }

    const newShape: AnnotationShape = {
      id: `text_${Date.now()}_${Math.random()}`,
      type: 'text',
      x: textPosition.x,
      y: textPosition.y,
      text: textInput,
      color: selectedColor,
      strokeWidth: brushSize,
      opacity: opacity
    }

    const newAnnotations = [...annotations, newShape]
    setAnnotations(newAnnotations)
    saveToHistory(newAnnotations)

    setShowTextInput(false)
    setTextInput('')
    redrawCanvas()
  }

  // Draw shape on canvas
  const drawShape = (ctx: CanvasRenderingContext2D, shape: AnnotationShape) => {
    ctx.strokeStyle = shape.color
    ctx.fillStyle = shape.color
    ctx.lineWidth = shape.strokeWidth
    ctx.globalAlpha = shape.opacity
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    switch (shape.type) {
      case 'line':
        if (shape.x1 !== undefined && shape.y1 !== undefined && shape.x2 !== undefined && shape.y2 !== undefined) {
          ctx.beginPath()
          ctx.moveTo(shape.x1, shape.y1)
          ctx.lineTo(shape.x2, shape.y2)
          ctx.stroke()
        }
        break
      
      case 'rectangle':
        if (shape.x !== undefined && shape.y !== undefined && shape.width !== undefined && shape.height !== undefined) {
          ctx.strokeRect(shape.x, shape.y, shape.width, shape.height)
        }
        break
      
      case 'circle':
        if (shape.x !== undefined && shape.y !== undefined && shape.radius !== undefined) {
          ctx.beginPath()
          ctx.arc(shape.x, shape.y, shape.radius, 0, 2 * Math.PI)
          ctx.stroke()
        }
        break
      
      case 'arrow':
        if (shape.x1 !== undefined && shape.y1 !== undefined && shape.x2 !== undefined && shape.y2 !== undefined) {
          drawArrow(ctx, shape.x1, shape.y1, shape.x2, shape.y2)
        }
        break
      
      case 'text':
        if (shape.x !== undefined && shape.y !== undefined && shape.text) {
          ctx.font = `${shape.strokeWidth * 2}px Arial`
          ctx.fillText(shape.text, shape.x, shape.y)
        }
        break
      
      case 'freehand':
      case 'brush':
        if (shape.points && shape.points.length > 1) {
          ctx.beginPath()
          ctx.moveTo(shape.points[0].x, shape.points[0].y)
          for (let i = 1; i < shape.points.length; i++) {
            ctx.lineTo(shape.points[i].x, shape.points[i].y)
          }
          ctx.stroke()
        }
        break
    }

    ctx.globalAlpha = 1
  }

  // Draw arrow
  const drawArrow = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) => {
    const headlen = 15
    const angle = Math.atan2(y2 - y1, x2 - x1)

    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(x2, y2)
    ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6))
    ctx.moveTo(x2, y2)
    ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6))
    ctx.stroke()
  }

  // Redraw canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw background image
    if (backgroundImage) {
      ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height)
    }

    // Draw annotations
    annotations.forEach(shape => {
      drawShape(ctx, shape)
    })

    // Draw current shape being drawn
    if (currentShape) {
      drawShape(ctx, currentShape)
    }

    // Highlight selected shape
    if (selectedShapeId) {
      const selectedShape = annotations.find(s => s.id === selectedShapeId)
      if (selectedShape) {
        ctx.strokeStyle = '#ff0000'
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])
        drawShape(ctx, selectedShape)
        ctx.setLineDash([])
      }
    }
  }, [annotations, currentShape, selectedShapeId, backgroundImage])

  // Initialize canvas size
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      canvas.width = width
      canvas.height = height
      console.log(`📐 Canvas initialized: ${width}x${height}`)
    }
  }, [width, height])

  // Load image and redraw
  useEffect(() => {
    if (!imageUrl) return
    
    console.log('🖼️ AdvancedAnnotationCanvas: Loading image:', imageUrl?.substring(0, 50) + '...')
    const canvas = canvasRef.current
    if (!canvas) return
    
    // Initialize canvas size
    canvas.width = width
    canvas.height = height
    
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      console.log('✅ AdvancedAnnotationCanvas: Image loaded successfully')
      console.log(`📊 Image size: ${img.width}x${img.height}, Canvas size: ${canvas.width}x${canvas.height}`)
      setBackgroundImage(img)
    }
    img.onerror = (error) => {
      console.error('❌ AdvancedAnnotationCanvas: Image load error:', error)
      console.error('❌ Image URL:', imageUrl?.substring(0, 100))
      setBackgroundImage(null)
    }
    img.src = imageUrl
  }, [imageUrl, width, height])

  // Redraw when background image changes
  useEffect(() => {
    if (backgroundImage) {
      console.log('🎨 Redrawing canvas with loaded image')
      redrawCanvas()
    }
  }, [backgroundImage, redrawCanvas])

  // Export annotations
  const handleSave = () => {
    if (onSave) {
      const canvas = canvasRef.current
      if (canvas) {
        const imageData = canvas.toDataURL('image/png', 1)
        onSave(annotations, imageData)
      }
    }
  }

  // Notify parent of changes
  useEffect(() => {
    if (onAnnotationsChange) {
      onAnnotationsChange(annotations)
    }
  }, [annotations, onAnnotationsChange])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">עריכת תמונה מתקדמת</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Save className="w-4 h-4" />
              שמור
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              <X className="w-4 h-4" />
              סגור
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Toolbar */}
          <div className="w-64 bg-gray-50 border-l p-4 overflow-y-auto">
            {/* Tools */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">כלים</h4>
              <div className="grid grid-cols-2 gap-2">
                {TOOLS.map(tool => (
                  <button
                    key={tool.id}
                    onClick={() => setSelectedTool(tool.id)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border ${
                      selectedTool === tool.id
                        ? 'bg-blue-100 border-blue-300 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <tool.icon className="w-5 h-5" style={{ color: tool.color }} />
                    <span className="text-xs">{tool.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Colors */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">צבעים</h4>
              <div className="grid grid-cols-6 gap-2">
                {COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-8 h-8 rounded-full border-2 ${
                      selectedColor === color ? 'border-gray-800' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Brush Size */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">גודל מברשת</h4>
              <div className="space-y-2">
                {BRUSH_SIZES.map(size => (
                  <button
                    key={size}
                    onClick={() => setBrushSize(size)}
                    className={`w-full p-2 rounded border ${
                      brushSize === size
                        ? 'bg-blue-100 border-blue-300 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div 
                      className="mx-auto rounded-full"
                      style={{ 
                        width: Math.min(size * 2, 20), 
                        height: Math.min(size * 2, 20),
                        backgroundColor: selectedColor 
                      }}
                    />
                    <span className="text-xs">{size}px</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Opacity */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">שקיפות</h4>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="text-sm text-gray-600 text-center">{Math.round(opacity * 100)}%</div>
            </div>

            {/* History */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">היסטוריה</h4>
              <div className="flex gap-2">
                <button
                  onClick={undo}
                  disabled={historyIndex <= 0}
                  className="flex items-center gap-1 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Undo className="w-4 h-4" />
                  בטל
                </button>
                <button
                  onClick={redo}
                  disabled={historyIndex >= history.length - 1}
                  className="flex items-center gap-1 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Redo className="w-4 h-4" />
                  חזור
                </button>
              </div>
            </div>

            {/* Annotations Count */}
            <div className="text-sm text-gray-600">
              <div className="font-medium">הערות: {annotations.length}</div>
              <div className="text-xs">כלים פעילים: {TOOLS.find(t => t.id === selectedTool)?.label}</div>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 p-4">
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <canvas
                ref={canvasRef}
                width={width}
                height={height}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                className="cursor-crosshair"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            </div>
          </div>
        </div>

        {/* Text Input Modal */}
        {showTextInput && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg p-6 w-96">
              <h4 className="font-medium text-gray-900 mb-4">הוסף טקסט</h4>
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="הקלד טקסט..."
                className="w-full p-3 border border-gray-300 rounded-lg mb-4"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleTextSubmit()
                  } else if (e.key === 'Escape') {
                    setShowTextInput(false)
                    setTextInput('')
                  }
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleTextSubmit}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  הוסף
                </button>
                <button
                  onClick={() => {
                    setShowTextInput(false)
                    setTextInput('')
                  }}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}