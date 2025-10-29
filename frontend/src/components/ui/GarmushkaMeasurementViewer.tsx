'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { ValuationData } from '../ValuationWizard'

interface Measurement {
  id: string
  type: 'line' | 'area' | 'point'
  x1?: number
  y1?: number
  x2?: number
  y2?: number
  x?: number
  y?: number
  width?: number
  height?: number
  length?: number
  area?: number
  label?: string
  color: string
}

interface GarmushkaMeasurementViewerProps {
  data: ValuationData
  onMeasurementsChange?: (measurements: Measurement[]) => void
}

export default function GarmushkaMeasurementViewer({ 
  data, 
  onMeasurementsChange 
}: GarmushkaMeasurementViewerProps) {
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentMeasurement, setCurrentMeasurement] = useState<Measurement | null>(null)
  const [selectedTool, setSelectedTool] = useState<'line' | 'area' | 'point'>('line')
  const [selectedColor, setSelectedColor] = useState('#ff0000')
  const [imageLoaded, setImageLoaded] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null)

  // Get mouse position relative to canvas
  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }

  // Calculate distance between two points
  const calculateDistance = (x1: number, y1: number, x2: number, y2: number) => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
  }

  // Calculate area of rectangle
  const calculateArea = (width: number, height: number) => {
    return width * height
  }

  // Draw measurement on canvas
  const drawMeasurement = (ctx: CanvasRenderingContext2D, measurement: Measurement) => {
    ctx.strokeStyle = measurement.color
    ctx.fillStyle = measurement.color
    ctx.lineWidth = 2
    ctx.font = '14px Arial'

    switch (measurement.type) {
      case 'line':
        if (measurement.x1 !== undefined && measurement.y1 !== undefined && 
            measurement.x2 !== undefined && measurement.y2 !== undefined) {
          ctx.beginPath()
          ctx.moveTo(measurement.x1, measurement.y1)
          ctx.lineTo(measurement.x2, measurement.y2)
          ctx.stroke()

          // Draw measurement label
          const midX = (measurement.x1 + measurement.x2) / 2
          const midY = (measurement.y1 + measurement.y2) / 2
          const length = measurement.length || calculateDistance(measurement.x1, measurement.y1, measurement.x2, measurement.y2)
          
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(midX - 30, midY - 10, 60, 20)
          ctx.fillStyle = measurement.color
          ctx.fillText(`${length.toFixed(1)}m`, midX - 25, midY + 5)
        }
        break

      case 'area':
        if (measurement.x !== undefined && measurement.y !== undefined && 
            measurement.width !== undefined && measurement.height !== undefined) {
          ctx.strokeRect(measurement.x, measurement.y, measurement.width, measurement.height)
          
          // Draw area label
          const centerX = measurement.x + measurement.width / 2
          const centerY = measurement.y + measurement.height / 2
          const area = measurement.area || calculateArea(measurement.width, measurement.height)
          
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(centerX - 40, centerY - 10, 80, 20)
          ctx.fillStyle = measurement.color
          ctx.fillText(`${area.toFixed(1)}m²`, centerX - 35, centerY + 5)
        }
        break

      case 'point':
        if (measurement.x !== undefined && measurement.y !== undefined) {
          ctx.beginPath()
          ctx.arc(measurement.x, measurement.y, 5, 0, 2 * Math.PI)
          ctx.fill()
          
          // Draw point label
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(measurement.x + 10, measurement.y - 10, 60, 20)
          ctx.fillStyle = measurement.color
          ctx.fillText(measurement.label || 'Point', measurement.x + 15, measurement.y + 5)
        }
        break
    }
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

    // Draw measurements
    measurements.forEach(measurement => {
      drawMeasurement(ctx, measurement)
    })

    // Draw current measurement being drawn
    if (currentMeasurement) {
      drawMeasurement(ctx, currentMeasurement)
    }
  }, [measurements, currentMeasurement, backgroundImage])

  // Handle mouse events
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!imageLoaded) return

    const pos = getMousePos(e)
    
    if (selectedTool === 'point') {
      const newMeasurement: Measurement = {
        id: `point_${Date.now()}`,
        type: 'point',
        x: pos.x,
        y: pos.y,
        label: `Point ${measurements.filter(m => m.type === 'point').length + 1}`,
        color: selectedColor
      }
      
      const newMeasurements = [...measurements, newMeasurement]
      setMeasurements(newMeasurements)
      if (onMeasurementsChange) {
        onMeasurementsChange(newMeasurements)
      }
      redrawCanvas()
      return
    }

    setIsDrawing(true)
    
    const newMeasurement: Measurement = {
      id: `${selectedTool}_${Date.now()}`,
      type: selectedTool,
      x1: pos.x,
      y1: pos.y,
      x: pos.x,
      y: pos.y,
      color: selectedColor
    }

    setCurrentMeasurement(newMeasurement)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentMeasurement) return

    const pos = getMousePos(e)

    if (selectedTool === 'line') {
      setCurrentMeasurement({
        ...currentMeasurement,
        x2: pos.x,
        y2: pos.y,
        length: calculateDistance(currentMeasurement.x1!, currentMeasurement.y1!, pos.x, pos.y)
      })
    } else if (selectedTool === 'area') {
      setCurrentMeasurement({
        ...currentMeasurement,
        width: pos.x - currentMeasurement.x1!,
        height: pos.y - currentMeasurement.y1!,
        area: calculateArea(pos.x - currentMeasurement.x1!, pos.y - currentMeasurement.y1!)
      })
    }

    redrawCanvas()
  }

  const handleMouseUp = () => {
    if (!isDrawing || !currentMeasurement) return

    setIsDrawing(false)
    
    const newMeasurements = [...measurements, currentMeasurement]
    setMeasurements(newMeasurements)
    
    if (onMeasurementsChange) {
      onMeasurementsChange(newMeasurements)
    }

    setCurrentMeasurement(null)
    redrawCanvas()
  }

  // Load image
  useEffect(() => {
    // Try to get the building image from the data
    const buildingImage = (data as any).buildingImage || (data as any).exteriorImage
    if (buildingImage) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        setBackgroundImage(img)
        setImageLoaded(true)
        
        // Set canvas size to match image
        const canvas = canvasRef.current
        if (canvas) {
          canvas.width = img.width
          canvas.height = img.height
        }
        
        redrawCanvas()
      }
      img.src = buildingImage
    }
  }, [data.buildingImage, data.exteriorImage, redrawCanvas])

  // Clear measurements
  const clearMeasurements = () => {
    setMeasurements([])
    if (onMeasurementsChange) {
      onMeasurementsChange([])
    }
    redrawCanvas()
  }

  // Remove measurement
  const removeMeasurement = (id: string) => {
    const newMeasurements = measurements.filter(m => m.id !== id)
    setMeasurements(newMeasurements)
    if (onMeasurementsChange) {
      onMeasurementsChange(newMeasurements)
    }
    redrawCanvas()
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">מדידות גרמושקה</h3>
      
      {!imageLoaded ? (
        <div className="text-center py-8">
          <div className="text-gray-500 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-gray-600">אין תמונה זמינה למדידה</p>
          <p className="text-sm text-gray-500 mt-2">העלה תמונת בניין בשלב הקודם</p>
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="mb-4 flex flex-wrap gap-2">
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedTool('line')}
                className={`px-3 py-2 rounded text-sm font-medium ${
                  selectedTool === 'line'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                📏 קו
              </button>
              <button
                onClick={() => setSelectedTool('area')}
                className={`px-3 py-2 rounded text-sm font-medium ${
                  selectedTool === 'area'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                ⬜ שטח
              </button>
              <button
                onClick={() => setSelectedTool('point')}
                className={`px-3 py-2 rounded text-sm font-medium ${
                  selectedTool === 'point'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                📍 נקודה
              </button>
            </div>

            <div className="flex gap-2">
              {['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'].map(color => (
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

            <button
              onClick={clearMeasurements}
              className="px-3 py-2 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700"
            >
              🗑️ נקה הכל
            </button>
          </div>

          {/* Canvas */}
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="cursor-crosshair max-w-full h-auto"
              style={{ maxWidth: '100%', height: 'auto' }}
            />
          </div>

          {/* Measurements List */}
          {measurements.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium text-gray-900 mb-2">מדידות ({measurements.length})</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {measurements.map(measurement => (
                  <div key={measurement.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: measurement.color }}
                      />
                      <span className="text-sm">
                        {measurement.type === 'line' && `${measurement.length?.toFixed(1)}m`}
                        {measurement.type === 'area' && `${measurement.area?.toFixed(1)}m²`}
                        {measurement.type === 'point' && measurement.label}
                      </span>
                    </div>
                    <button
                      onClick={() => removeMeasurement(measurement.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-4 text-sm text-gray-600">
            <p><strong>הוראות:</strong></p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>בחר כלי מדידה מהסרגל העליון</li>
              <li>למדידת קו: לחץ וגרור מהנקודה הראשונה לשנייה</li>
              <li>למדידת שטח: לחץ וגרור ליצירת מלבן</li>
              <li>לסימון נקודה: לחץ על המיקום הרצוי</li>
              <li>המדידות יוצגו על התמונה עם התוויות המתאימות</li>
            </ul>
          </div>
        </>
      )}
    </div>
  )
}