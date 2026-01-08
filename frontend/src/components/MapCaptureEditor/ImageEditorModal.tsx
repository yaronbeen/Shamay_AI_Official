'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { 
  X, Save, Crop as CropIcon, Pen, Eraser, 
  Circle, Square, Type, Undo, Redo, MousePointer
} from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import type { CapturedImage, DrawingAnnotation, CropArea } from './types'

interface ImageEditorModalProps {
  image: CapturedImage
  onSave: (
    editedBlob: Blob,
    annotations: DrawingAnnotation[],
    cropArea?: CropArea
  ) => void
  onClose: () => void
}

type DrawMode = 'select' | 'freehand' | 'rectangle' | 'circle' | 'text' | 'crop'

/**
 * ImageEditorModal - Full-featured image editor with drawing and cropping
 * 
 * Features:
 * - Multiple drawing tools (freehand, shapes, text)
 * - Crop tool with ReactCrop
 * - Undo/Redo support
 * - Color and stroke width customization
 * - High-quality output
 */
const ImageEditorModal: React.FC<ImageEditorModalProps> = ({
  image,
  onSave,
  onClose
}) => {
  // === State ===
  const [mode, setMode] = useState<DrawMode>('select')
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [drawColor, setDrawColor] = useState('#FF0000')
  const [strokeWidth, setStrokeWidth] = useState(3)
  const [annotations, setAnnotations] = useState<DrawingAnnotation[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([])
  const [history, setHistory] = useState<DrawingAnnotation[][]>([[]])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [textInput, setTextInput] = useState('')
  const [showTextInput, setShowTextInput] = useState(false)
  const [textPosition, setTextPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // === Canvas Drawing ===
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img || !img.complete) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size to match image natural size
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw image
    ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight)

    // Draw all annotations
    annotations.forEach(annotation => {
      ctx.strokeStyle = annotation.color
      ctx.fillStyle = annotation.color
      ctx.lineWidth = annotation.strokeWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      if (annotation.type === 'freehand' && annotation.points.length > 1) {
        ctx.beginPath()
        ctx.moveTo(annotation.points[0].x, annotation.points[0].y)
        annotation.points.forEach(point => {
          ctx.lineTo(point.x, point.y)
        })
        ctx.stroke()
      } else if (annotation.type === 'rectangle' && annotation.points.length === 2) {
        const [start, end] = annotation.points
        ctx.strokeRect(
          start.x,
          start.y,
          end.x - start.x,
          end.y - start.y
        )
      } else if (annotation.type === 'circle' && annotation.points.length === 2) {
        const [center, edge] = annotation.points
        const radius = Math.sqrt(
          Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2)
        )
        ctx.beginPath()
        ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI)
        ctx.stroke()
      } else if (annotation.type === 'text' && annotation.text && annotation.points.length > 0) {
        ctx.font = `bold ${annotation.strokeWidth * 6}px Arial`
        ctx.fillText(annotation.text, annotation.points[0].x, annotation.points[0].y)
      }
    })
  }, [annotations])

  useEffect(() => {
    redrawCanvas()
  }, [annotations, redrawCanvas])

  // === Mouse Event Handlers ===
  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>) => {
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

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode === 'select' || mode === 'crop') return

    const point = getCanvasPoint(e)

    if (mode === 'text') {
      setTextPosition(point)
      setShowTextInput(true)
      return
    }

    setIsDrawing(true)
    setCurrentPath([point])
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || mode === 'select' || mode === 'crop') return

    const point = getCanvasPoint(e)

    if (mode === 'freehand') {
      setCurrentPath(prev => [...prev, point])
      
      // Draw preview line
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (ctx && currentPath.length > 0) {
        ctx.strokeStyle = drawColor
        ctx.lineWidth = strokeWidth
        ctx.lineCap = 'round'
        
        const lastPoint = currentPath[currentPath.length - 1]
        ctx.beginPath()
        ctx.moveTo(lastPoint.x, lastPoint.y)
        ctx.lineTo(point.x, point.y)
        ctx.stroke()
      }
    } else {
      // For shapes, just update the end point
      setCurrentPath([currentPath[0], point])
    }
  }

  const handleCanvasMouseUp = () => {
    if (!isDrawing) return

    if (currentPath.length > 0) {
      const newAnnotation: DrawingAnnotation = {
        id: uuidv4(),
        type: mode as any,
        points: [...currentPath],
        color: drawColor,
        strokeWidth
      }

      addAnnotation(newAnnotation)
    }

    setIsDrawing(false)
    setCurrentPath([])
    redrawCanvas()
  }

  // === Annotation Management ===
  const addAnnotation = (annotation: DrawingAnnotation) => {
    const newAnnotations = [...annotations, annotation]
    setAnnotations(newAnnotations)

    // Update history
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newAnnotations)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const handleTextSubmit = () => {
    if (!textInput.trim()) {
      setShowTextInput(false)
      return
    }

    const newAnnotation: DrawingAnnotation = {
      id: uuidv4(),
      type: 'text',
      points: [textPosition],
      color: drawColor,
      strokeWidth,
      text: textInput
    }

    addAnnotation(newAnnotation)
    setTextInput('')
    setShowTextInput(false)
  }

  // === Undo/Redo ===
  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      setAnnotations(history[historyIndex - 1])
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      setAnnotations(history[historyIndex + 1])
    }
  }

  const clearAll = () => {
    setAnnotations([])
    setHistory([[]])
    setHistoryIndex(0)
  }

  // === Save Handler ===
  const handleSave = async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    let finalCanvas = canvas

    // Apply crop if exists
    if (completedCrop && completedCrop.width > 0 && completedCrop.height > 0) {
      console.log('✂️ Applying crop:', completedCrop)
      
      const croppedCanvas = document.createElement('canvas')
      const ctx = croppedCanvas.getContext('2d')
      if (!ctx) return

      croppedCanvas.width = completedCrop.width
      croppedCanvas.height = completedCrop.height

      ctx.drawImage(
        canvas,
        completedCrop.x,
        completedCrop.y,
        completedCrop.width,
        completedCrop.height,
        0,
        0,
        completedCrop.width,
        completedCrop.height
      )

      finalCanvas = croppedCanvas
    }

    // Convert to blob
    finalCanvas.toBlob((blob) => {
      if (blob) {
        console.log('💾 Saving edited image:', blob.size, 'bytes')
        
        const cropArea: CropArea | undefined = completedCrop ? {
          x: completedCrop.x,
          y: completedCrop.y,
          width: completedCrop.width,
          height: completedCrop.height,
          unit: 'px'
        } : undefined

        onSave(blob, annotations, cropArea)
      } else {
        console.error('❌ Failed to create blob from canvas')
      }
    }, 'image/png', 0.95)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-lg max-w-7xl max-h-[95vh] overflow-hidden w-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <h3 className="text-xl font-bold text-gray-900">עריכת תמונת מפה</h3>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            title="סגור"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 p-4 border-b bg-gray-50 flex-wrap">
          {/* Mode Selection */}
          <div className="flex gap-1 border-l border-gray-300 pl-3">
            <button
              onClick={() => setMode('select')}
              className={`p-2.5 rounded-lg transition-colors ${
                mode === 'select' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 hover:bg-gray-100'
              }`}
              title="בחירה"
            >
              <MousePointer className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMode('freehand')}
              className={`p-2.5 rounded-lg transition-colors ${
                mode === 'freehand' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 hover:bg-gray-100'
              }`}
              title="ציור חופשי"
            >
              <Pen className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMode('rectangle')}
              className={`p-2.5 rounded-lg transition-colors ${
                mode === 'rectangle' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 hover:bg-gray-100'
              }`}
              title="מלבן"
            >
              <Square className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMode('circle')}
              className={`p-2.5 rounded-lg transition-colors ${
                mode === 'circle' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 hover:bg-gray-100'
              }`}
              title="עיגול"
            >
              <Circle className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMode('text')}
              className={`p-2.5 rounded-lg transition-colors ${
                mode === 'text' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 hover:bg-gray-100'
              }`}
              title="טקסט"
            >
              <Type className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMode('crop')}
              className={`p-2.5 rounded-lg transition-colors ${
                mode === 'crop' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 hover:bg-gray-100'
              }`}
              title="חיתוך"
            >
              <CropIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Drawing Options */}
          {mode !== 'select' && mode !== 'crop' && (
            <>
              <div className="border-l border-gray-300 pl-3 flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">צבע:</label>
                <input
                  type="color"
                  value={drawColor}
                  onChange={(e) => setDrawColor(e.target.value)}
                  className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">עובי:</label>
                <select
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg bg-white"
                >
                  <option value="1">1px</option>
                  <option value="2">2px</option>
                  <option value="3">3px</option>
                  <option value="5">5px</option>
                  <option value="8">8px</option>
                  <option value="12">12px</option>
                </select>
              </div>
            </>
          )}

          {/* History Controls */}
          <div className="border-l border-gray-300 pl-3 flex gap-1">
            <button
              onClick={undo}
              disabled={historyIndex === 0}
              className="p-2.5 rounded-lg bg-white border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="בטל"
            >
              <Undo className="w-4 h-4" />
            </button>
            <button
              onClick={redo}
              disabled={historyIndex === history.length - 1}
              className="p-2.5 rounded-lg bg-white border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="בצע שוב"
            >
              <Redo className="w-4 h-4" />
            </button>
            <button
              onClick={clearAll}
              disabled={annotations.length === 0}
              className="p-2.5 rounded-lg bg-white border border-gray-300 hover:bg-red-50 hover:border-red-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="מחק הכל"
            >
              <Eraser className="w-4 h-4" />
            </button>
          </div>

          {/* Annotations Count */}
          <div className="mr-auto text-sm text-gray-600">
            {annotations.length} הערות
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 overflow-auto p-6 bg-gray-100">
          <div 
            ref={containerRef}
            className="relative inline-block max-w-full"
          >
            {/* Hidden image for reference */}
            <img
              ref={imageRef}
              src={image.dataUrl}
              alt="מפה"
              onLoad={() => {
                console.log('🖼️ Image loaded for editing')
                redrawCanvas()
              }}
              className="hidden"
            />

            {/* Crop Mode */}
            {mode === 'crop' && (
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={undefined}
                className="max-w-full"
              >
                <canvas
                  ref={canvasRef}
                  className="max-w-full h-auto border-2 border-blue-500 rounded"
                />
              </ReactCrop>
            )}

            {/* Drawing Mode */}
            {mode !== 'crop' && (
              <canvas
                ref={canvasRef}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                className={`max-w-full h-auto border-2 border-gray-300 rounded ${
                  mode !== 'select' ? 'cursor-crosshair' : 'cursor-default'
                }`}
              />
            )}

            {/* Text Input Overlay */}
            {showTextInput && (
              <div
                className="absolute bg-white border-2 border-blue-500 rounded-lg p-3 shadow-lg z-10"
                style={{
                  left: textPosition.x,
                  top: textPosition.y,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleTextSubmit()
                    if (e.key === 'Escape') setShowTextInput(false)
                  }}
                  placeholder="הזן טקסט..."
                  className="px-3 py-2 border border-gray-300 rounded mb-2 w-48"
                  autoFocus
                  dir="rtl"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleTextSubmit}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    הוסף
                  </button>
                  <button
                    onClick={() => setShowTextInput(false)}
                    className="px-3 py-1 bg-gray-300 rounded text-sm hover:bg-gray-400"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {mode === 'crop' && 'בחר אזור לחיתוך'}
            {mode === 'freehand' && 'צייר בעכבר'}
            {mode === 'rectangle' && 'לחץ וגרור ליצירת מלבן'}
            {mode === 'circle' && 'לחץ וגרור ליצירת עיגול'}
            {mode === 'text' && 'לחץ להוספת טקסט'}
            {mode === 'select' && 'בחר כלי מהתפריט'}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 border-2 border-gray-300 rounded-lg hover:bg-gray-100 font-medium transition-colors"
            >
              ביטול
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              <Save className="w-5 h-5" />
              שמור תמונה
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImageEditorModal

