/**
 * React Hook for Field Provenance
 * Manages fetching, updating, and syncing provenance data
 */

import { useState, useEffect, useCallback } from 'react'

export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface ProvenanceRecord {
  id: string
  shumaId?: number | null
  sessionId: string
  fieldPath: string
  fieldValue?: string | null
  documentId?: string | null
  documentName?: string | null
  documentType?: string | null
  documentUrl?: string | null
  pageNumber: number
  bbox: BoundingBox
  confidence: number
  extractionMethod: string
  modelUsed?: string | null
  isActive: boolean
  versionNumber: number
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface ProvenanceByField {
  [fieldPath: string]: ProvenanceRecord[]
}

export interface UseProvenanceOptions {
  sessionId: string | null | undefined
  autoFetch?: boolean
}

export interface UseProvenanceReturn {
  provenance: ProvenanceByField
  isLoading: boolean
  error: string | null
  selectedFieldId: string | null
  selectedSourceIndex: Record<string, number>
  
  // Actions
  fetchProvenance: (fieldPath?: string) => Promise<void>
  createProvenance: (record: Omit<ProvenanceRecord, 'id' | 'createdAt' | 'updatedAt' | 'versionNumber'>) => Promise<ProvenanceRecord | null>
  updateProvenance: (id: string, updates: Partial<ProvenanceRecord>) => Promise<void>
  deleteProvenance: (id: string) => Promise<void>
  
  // Selection
  selectField: (fieldPath: string, sourceIndex?: number) => void
  cycleSource: (fieldPath: string, direction: 1 | -1) => void
  clearSelection: () => void
  
  // Getters
  getProvenanceForField: (fieldPath: string) => ProvenanceRecord[]
  getActiveProvenanceForField: (fieldPath: string) => ProvenanceRecord | null
}

export function useProvenance({ 
  sessionId, 
  autoFetch = true 
}: UseProvenanceOptions): UseProvenanceReturn {
  const [provenance, setProvenance] = useState<ProvenanceByField>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [selectedSourceIndex, setSelectedSourceIndex] = useState<Record<string, number>>({})

  // Fetch provenance data
  const fetchProvenance = useCallback(async (fieldPath?: string) => {
    if (!sessionId) {
      setError('Session ID is required')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ sessionId })
      if (fieldPath) {
        params.append('fieldPath', fieldPath)
      }
      const url = `/api/provenance?${params.toString()}`

      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch provenance: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.success) {
        setProvenance(result.data || {})
      } else {
        throw new Error(result.error || 'Failed to fetch provenance')
      }
    } catch (err: any) {
      console.error('Error fetching provenance:', err)
      setError(err.message || 'Failed to fetch provenance')
      setProvenance({})
    } finally {
      setIsLoading(false)
    }
  }, [sessionId])

  // Create new provenance record
  const createProvenance = useCallback(async (
    record: Omit<ProvenanceRecord, 'id' | 'createdAt' | 'updatedAt' | 'versionNumber'>
  ): Promise<ProvenanceRecord | null> => {
    if (!sessionId) {
      setError('Session ID is required')
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/provenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...record,
          sessionId
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to create provenance: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success) {
        // Refresh provenance data
        await fetchProvenance(record.fieldPath)
        
        // Return the created record (would need to fetch full record)
        return {
          id: result.data.id,
          ...record,
          versionNumber: result.data.versionNumber,
          createdAt: result.data.createdAt,
          updatedAt: result.data.createdAt
        } as ProvenanceRecord
      } else {
        throw new Error(result.error || 'Failed to create provenance')
      }
    } catch (err: any) {
      console.error('Error creating provenance:', err)
      setError(err.message || 'Failed to create provenance')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [sessionId, fetchProvenance])

  // Update existing provenance record
  const updateProvenance = useCallback(async (id: string, updates: Partial<ProvenanceRecord>) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/provenance/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        throw new Error(`Failed to update provenance: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success) {
        // Refresh provenance data
        await fetchProvenance()
      } else {
        throw new Error(result.error || 'Failed to update provenance')
      }
    } catch (err: any) {
      console.error('Error updating provenance:', err)
      setError(err.message || 'Failed to update provenance')
    } finally {
      setIsLoading(false)
    }
  }, [fetchProvenance])

  // Delete provenance record
  const deleteProvenance = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/provenance/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(`Failed to delete provenance: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success) {
        // Refresh provenance data
        await fetchProvenance()
      } else {
        throw new Error(result.error || 'Failed to delete provenance')
      }
    } catch (err: any) {
      console.error('Error deleting provenance:', err)
      setError(err.message || 'Failed to delete provenance')
    } finally {
      setIsLoading(false)
    }
  }, [fetchProvenance])

  // Select field and optionally a specific source
  const selectField = useCallback((fieldPath: string, sourceIndex: number = 0) => {
    setSelectedFieldId(fieldPath)
    setSelectedSourceIndex(prev => ({
      ...prev,
      [fieldPath]: sourceIndex
    }))
  }, [])

  // Cycle through sources for a field
  const cycleSource = useCallback((fieldPath: string, direction: 1 | -1) => {
    const records = provenance[fieldPath] || []
    if (records.length === 0) return

    const currentIndex = selectedSourceIndex[fieldPath] || 0
    const newIndex = Math.max(0, Math.min(records.length - 1, currentIndex + direction))
    
    setSelectedSourceIndex(prev => ({
      ...prev,
      [fieldPath]: newIndex
    }))
  }, [provenance, selectedSourceIndex])

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedFieldId(null)
    setSelectedSourceIndex({})
  }, [])

  // Get provenance records for a specific field
  const getProvenanceForField = useCallback((fieldPath: string): ProvenanceRecord[] => {
    return provenance[fieldPath] || []
  }, [provenance])

  // Get the active (current) provenance record for a field
  const getActiveProvenanceForField = useCallback((fieldPath: string): ProvenanceRecord | null => {
    const records = provenance[fieldPath] || []
    return records.find(r => r.isActive) || records[0] || null
  }, [provenance])

  // Auto-fetch on mount and when sessionId changes
  useEffect(() => {
    if (autoFetch && sessionId) {
      fetchProvenance()
    }
  }, [sessionId, autoFetch, fetchProvenance])

  return {
    provenance,
    isLoading,
    error,
    selectedFieldId,
    selectedSourceIndex,
    fetchProvenance,
    createProvenance,
    updateProvenance,
    deleteProvenance,
    selectField,
    cycleSource,
    clearSelection,
    getProvenanceForField,
    getActiveProvenanceForField
  }
}

