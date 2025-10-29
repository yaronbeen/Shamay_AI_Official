'use client'

import React, { useRef, useImperativeHandle, forwardRef, useState, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import html2canvas from 'html2canvas'
import type { GISData } from './types'

interface MapViewerIFrameProps {
  gisData: GISData
  sessionId: string
}

export interface MapViewerIFrameHandle {
  captureScreenshot: () => Promise<Blob | null>
}

/**
 * MapViewerIFrame - Displays GovMap iframe and handles client-side screenshot capture
 * 
 * Screenshot Capture Strategy:
 * 1. Primary: html2canvas on iframe container (works for same-origin)
 * 2. Fallback: Canvas.toDataURL() if iframe allows
 * 3. Error: Return null and parent will offer manual upload
 */
const MapViewerIFrame = forwardRef<MapViewerIFrameHandle, MapViewerIFrameProps>(
  ({ gisData, sessionId }, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [iframeLoaded, setIframeLoaded] = useState(false)
    const [crossOriginError, setCrossOriginError] = useState(false)

    // Expose capture method to parent
    useImperativeHandle(ref, () => ({
      captureScreenshot: async (): Promise<Blob | null> => {
        console.log('📸 Attempting iframe screenshot capture...')

        if (!containerRef.current || !iframeRef.current) {
          throw new Error('Iframe not ready')
        }

        try {
          // Method 1: html2canvas on container (most reliable)
          console.log('🎨 Method 1: html2canvas on iframe container')
          
          const canvas = await html2canvas(containerRef.current, {
            useCORS: true,
            allowTaint: true,
            logging: false,
            scale: 2, // Higher quality
            backgroundColor: '#ffffff',
            onclone: (clonedDoc) => {
              // Ensure iframe is visible in clone
              const clonedIframe = clonedDoc.querySelector('iframe')
              if (clonedIframe) {
                clonedIframe.style.display = 'block'
              }
            }
          })

          // Convert canvas to blob
          return new Promise<Blob | null>((resolve) => {
            canvas.toBlob((blob) => {
              if (blob) {
                console.log('✅ Screenshot captured via html2canvas:', blob.size, 'bytes')
                resolve(blob)
              } else {
                console.error('❌ Failed to create blob from canvas')
                resolve(null)
              }
            }, 'image/png', 0.95)
          })

        } catch (error) {
          console.error('❌ html2canvas failed:', error)

          // Method 2: Try direct iframe content capture (may fail due to CORS)
          try {
            console.log('🎨 Method 2: Direct iframe content capture')
            
            const iframe = iframeRef.current
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document

            if (!iframeDoc) {
              throw new Error('Cannot access iframe document (CORS)')
            }

            // Create canvas from iframe body
            const iframeBody = iframeDoc.body
            const canvas = await html2canvas(iframeBody, {
              useCORS: true,
              allowTaint: true,
              logging: false,
              scale: 2
            })

            return new Promise<Blob | null>((resolve) => {
              canvas.toBlob((blob) => {
                if (blob) {
                  console.log('✅ Screenshot captured via iframe content:', blob.size, 'bytes')
                  resolve(blob)
                } else {
                  resolve(null)
                }
              }, 'image/png', 0.95)
            })

          } catch (innerError) {
            console.error('❌ Iframe content capture failed:', innerError)
            setCrossOriginError(true)
            return null
          }
        }
      }
    }))

    // Monitor iframe load
    useEffect(() => {
      const iframe = iframeRef.current
      if (!iframe) return

      const handleLoad = () => {
        console.log('✅ GovMap iframe loaded')
        setIframeLoaded(true)
        setCrossOriginError(false)
      }

      const handleError = () => {
        console.error('❌ GovMap iframe load error')
        setIframeLoaded(false)
      }

      iframe.addEventListener('load', handleLoad)
      iframe.addEventListener('error', handleError)

      return () => {
        iframe.removeEventListener('load', handleLoad)
        iframe.removeEventListener('error', handleError)
      }
    }, [gisData.govmapUrls.cropMode0])

    // Select URL (prefer clean map without תצ"א for screenshots)
    const mapUrl = gisData.govmapUrls.cropMode0

    console.log('🗺️ Rendering GovMap iframe:', mapUrl)

    return (
      <div>
        {/* Iframe Container */}
        <div 
          ref={containerRef}
          className="relative w-full h-[600px] bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-300"
        >
          <iframe
            ref={iframeRef}
            src={mapUrl}
            className="w-full h-full"
            title="GovMap - מפת הנכס"
            allowFullScreen
            style={{
              border: 'none',
              display: 'block'
            }}
          />

          {/* Loading Overlay */}
          {!iframeLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">טוען מפה...</p>
              </div>
            </div>
          )}
        </div>

        {/* CORS Warning */}
        {crossOriginError && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">לא ניתן לצלם מסך אוטומטית</p>
              <p className="mt-1">הדפדפן חוסם גישה למפה עקב הגבלות אבטחה. השתמש בהעלאה ידנית.</p>
            </div>
          </div>
        )}

        {/* Coordinates Info */}
        <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 font-mono text-right">
          <div><strong>WGS84:</strong> {gisData.coordinates.wgs84.lat.toFixed(6)}, {gisData.coordinates.wgs84.lon.toFixed(6)}</div>
          <div><strong>ITM:</strong> E={gisData.coordinates.itm.easting.toFixed(2)}, N={gisData.coordinates.itm.northing.toFixed(2)}</div>
          <div><strong>Confidence:</strong> {(gisData.confidence * 100).toFixed(1)}%</div>
        </div>
      </div>
    )
  }
)

MapViewerIFrame.displayName = 'MapViewerIFrame'

export default MapViewerIFrame

