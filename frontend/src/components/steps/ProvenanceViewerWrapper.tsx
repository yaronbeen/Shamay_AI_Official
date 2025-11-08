'use client'

import React from 'react'
import { Loader2, AlertTriangle, FileText, X } from 'lucide-react'
import { ProvenanceViewer } from '../ProvenanceViewer'

type ExtractedData = {
  gush?: string | number
  chelka?: string | number
  sub_chelka?: string | number
  registrationOffice?: string
  registration_office?: string
  ownershipType?: string
  ownership_type?: string
  registeredArea?: string | number
  registered_area?: string | number
  apartmentArea?: string | number
  apartment_registered_area?: string | number
  buildingDescription?: string
  building_description?: string
  permitNumber?: string
  permit_number?: string
  permittedUsage?: string
  permitted_usage?: string
  [key: string]: any
}

interface ProvenanceViewerWrapperProps {
  sessionId: string
  extractedData: ExtractedData
  allFiles: Array<{type: string, name: string, preview?: string, url?: string, file?: File, source?: string}>
  onClose: () => void
}

export function ProvenanceViewerWrapper({ 
  sessionId, 
  extractedData, 
  allFiles, 
  onClose 
}: ProvenanceViewerWrapperProps) {
  const [provenanceData, setProvenanceData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const getFieldLabel = (key: string): string => {
    const labels: Record<string, string> = {
      'gush': 'מספר גוש',
      'chelka': 'מספר חלקה',
      'sub_chelka': 'מספר תת חלקה',
      'registrationOffice': 'משרד רישום',
      'registration_office': 'משרד רישום',
      'ownershipType': 'סוג בעלות',
      'ownership_type': 'סוג בעלות',
      'registeredArea': 'שטח רשום',
      'registered_area': 'שטח רשום',
      'apartmentArea': 'שטח דירה',
      'apartment_registered_area': 'שטח דירה',
      'buildingDescription': 'תיאור בניין',
      'building_description': 'תיאור בניין',
      'permitNumber': 'מספר היתר',
      'permit_number': 'מספר היתר',
      'permittedUsage': 'שימוש מותר',
      'permitted_usage': 'שימוש מותר',
    }
    
    // Handle nested paths
    if (key.includes('.')) {
      const parts = key.split('.')
      const lastPart = parts[parts.length - 1]
      return labels[lastPart] || lastPart
    }
    
    return labels[key] || key
  }

  React.useEffect(() => {
    const fetchProvenance = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Fetch provenance records from API
        const response = await fetch(`/api/provenance?sessionId=${sessionId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch provenance data')
        }
        
        const result = await response.json()
        const provenanceRecords = result.provenance || []
        
        console.log('📊 Provenance records loaded:', provenanceRecords.length)
        console.log('📋 Sample provenance field_paths:', provenanceRecords.slice(0, 5).map((r: any) => r.field_path))
        console.log('📋 Extracted data keys:', Object.keys(extractedData))
        
        // Build provenance data structure for ProvenanceViewer
        const fields: any[] = []
        const documents: any[] = []
        
        // Map files to documents
        allFiles.forEach(file => {
          if (file.url || file.preview) {
            documents.push({
              id: file.name,
              name: file.name,
              type: file.type || 'unknown',
              url: file.url || file.preview || ''
            })
          }
        })
        
        // Group provenance by field
        const provenanceByField: Record<string, any[]> = {}
        provenanceRecords.forEach((record: any) => {
          if (!provenanceByField[record.field_path]) {
            provenanceByField[record.field_path] = []
          }
          provenanceByField[record.field_path].push({
            id: record.id,
            documentId: record.document_id || record.document_name,
            documentName: record.document_name,
            documentType: record.document_type,
            documentUrl: record.document_url,
            pageNumber: record.page_number,
            bbox: typeof record.bbox === 'string' ? JSON.parse(record.bbox) : (record.bbox || null),
            confidence: parseFloat(record.confidence) || 0,
            extractionMethod: record.extraction_method,
            modelUsed: record.model_used,
            isActive: record.is_active,
            versionNumber: record.version_number,
            createdAt: record.created_at
          })
        })
        
        // Helper to convert camelCase to snake_case and find matching provenance
        const findProvenanceForField = (fieldPath: string): any[] => {
          // Try exact match first
          if (provenanceByField[fieldPath]) {
            return provenanceByField[fieldPath]
          }
          
          // Try snake_case version (gush -> gush, registrationOffice -> registration_office)
          const snakeCase = fieldPath.replace(/([A-Z])/g, '_$1').toLowerCase()
          if (provenanceByField[snakeCase]) {
            return provenanceByField[snakeCase]
          }
          
          // Try various case conversions
          const variations = [
            fieldPath,
            snakeCase,
            fieldPath.toLowerCase(),
            fieldPath.toUpperCase()
          ]
          
          for (const variant of variations) {
            if (provenanceByField[variant]) {
              return provenanceByField[variant]
            }
          }
          
          return []
        }
        
        // Build fields from extractedData + provenance
        Object.entries(extractedData).forEach(([key, value]) => {
          // Skip nested objects (they'll be handled separately)
          if (value !== null && value !== undefined && value !== '' && typeof value !== 'object') {
            const fieldProvenance = findProvenanceForField(key)
            
            // Also try with common prefixes/suffixes
            const allProvenance = [
              ...fieldProvenance,
              ...(provenanceByField[`land_registry.${key}`] || []),
              ...(provenanceByField[`tabu.${key}`] || [])
            ]
            
            // Remove duplicates by id
            const uniqueProvenance = Array.from(
              new Map(allProvenance.map((p: any) => [p.id, p])).values()
            )
            
            fields.push({
              id: key,
              label: getFieldLabel(key),
              value: String(value),
              sources: uniqueProvenance.filter((p: any) => p.isActive).map((p: any) => ({
                page: p.pageNumber,
                bbox: p.bbox ? [p.bbox.x, p.bbox.y, p.bbox.width, p.bbox.height] : [0, 0, 100, 100],
                conf: p.confidence
              })),
              status: uniqueProvenance.length > 0 
                ? (uniqueProvenance.some((p: any) => p.extractionMethod === 'manual') ? 'manual' : 
                   uniqueProvenance.some((p: any) => p.confidence < 0.7) ? 'low_conf' : 'ok')
                : 'missing'
            })
          }
        })
        
        // Handle nested fields (land_registry.gush, etc.)
        const nestedStructures = ['land_registry', 'building_permit', 'shared_building']
        nestedStructures.forEach(structKey => {
          if (extractedData[structKey] && typeof extractedData[structKey] === 'object') {
            Object.entries(extractedData[structKey]).forEach(([key, value]) => {
              if (value !== null && value !== undefined && value !== '' && typeof value !== 'object') {
                // Try multiple field path formats
                const possiblePaths = [
                  `${structKey}.${key}`,
                  key, // Sometimes stored as top-level
                  `${structKey}_${key}`
                ]
                
                let fieldProvenance: any[] = []
                for (const path of possiblePaths) {
                  if (provenanceByField[path] && provenanceByField[path].length > 0) {
                    fieldProvenance = provenanceByField[path]
                    break
                  }
                }
                
                // Also try snake_case conversion
                const snakeCaseKey = key.replace(/([A-Z])/g, '_$1').toLowerCase()
                const snakeCasePath = `${structKey}.${snakeCaseKey}`
                if (provenanceByField[snakeCasePath] && provenanceByField[snakeCasePath].length > 0) {
                  fieldProvenance = provenanceByField[snakeCasePath]
                }
                
                const fieldPath = `${structKey}.${key}`
                fields.push({
                  id: fieldPath,
                  label: getFieldLabel(fieldPath),
                  value: String(value),
                  sources: fieldProvenance.filter((p: any) => p.isActive).map((p: any) => ({
                    page: p.pageNumber,
                    bbox: p.bbox ? [p.bbox.x, p.bbox.y, p.bbox.width, p.bbox.height] : [0, 0, 100, 100],
                    conf: p.confidence
                  })),
                  status: fieldProvenance.length > 0 ? 'ok' : 'missing'
                })
              }
            })
          }
        })
        
        // Build pages for each document
        const pagesByDoc: Record<string, any[]> = {}
        provenanceRecords.forEach((record: any) => {
          const docId = record.document_id || record.document_name || 'unknown'
          if (!pagesByDoc[docId]) {
            pagesByDoc[docId] = []
          }
          if (!pagesByDoc[docId].find((p: any) => p.page === record.page_number)) {
            pagesByDoc[docId].push({
              page: record.page_number,
              width: 800, // Default page width
              height: 1200, // Default page height
              imageUrl: record.document_url || ''
            })
          }
        })
        
        // Build doc structure with pages
        const docPages = documents.flatMap(doc => {
          const docPages = pagesByDoc[doc.id] || [{ page: 1, width: 800, height: 1200, imageUrl: doc.url }]
          return docPages.map(p => ({ ...p, docId: doc.id, docName: doc.name }))
        })
        
        setProvenanceData({
          fields,
          doc: {
            name: documents[0]?.name || 'מסמך',
            pages: docPages.length > 0 ? docPages : [
              { page: 1, width: 800, height: 1200, imageUrl: '', docId: 'unknown', docName: 'אין מסמכים' }
            ]
          },
          meta: {
            units: 'px',
            direction: 'rtl'
          },
          documents: documents.length > 0 ? documents : [
            { id: 'unknown', name: 'אין מסמכים', type: 'unknown', url: '' }
          ]
        })
      } catch (err: any) {
        console.error('Error fetching provenance:', err)
        setError(err.message || 'Failed to load provenance data')
      } finally {
        setLoading(false)
      }
    }
    
    fetchProvenance()
  }, [sessionId, extractedData, allFiles])
  
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mr-3" />
          <span className="text-gray-600">טוען מקורות נתונים...</span>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <div>
              <h3 className="text-sm font-semibold text-red-900">שגיאה בטעינת מקורות נתונים</h3>
              <p className="text-red-700 text-xs mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-red-600 hover:text-red-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    )
  }
  
  if (!provenanceData || provenanceData.fields.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-semibold text-blue-900">אין מקורות נתונים זמינים</h3>
              <p className="text-blue-700 text-xs mt-1">
                עדיין לא חולצו נתונים או לא נוצרו רשומות מקור. הנתונים יתווספו אוטומטית לאחר חילוץ AI.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-blue-600 hover:text-blue-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 mb-6 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-purple-50">
        <h3 className="text-lg font-semibold text-purple-900">מציג מקורות נתונים</h3>
        <button
          onClick={onClose}
          className="text-purple-600 hover:text-purple-800 p-1 rounded hover:bg-purple-100"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="max-h-[600px] overflow-auto">
        <ProvenanceViewer 
          data={provenanceData} 
          onChange={(updated) => setProvenanceData(updated)}
        />
      </div>
    </div>
  )
}

