// Custom hook for valuation database integration
import { useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'

export interface ValuationDBHook {
  saveToDatabase: (sessionId: string, wizardData: any) => Promise<{ success: boolean; valuationId?: string; error?: string }>
  loadFromDatabase: (valuationId: string) => Promise<{ success: boolean; wizardData?: any; error?: string }>
  saveGISData: (valuationId: string, gisData: any) => Promise<{ success: boolean; error?: string }>
  saveGarmushkaData: (valuationId: string, garmushkaData: any) => Promise<{ success: boolean; error?: string }>
  saveFinalResults: (valuationId: string, finalValuation: number, pricePerSqm: number, comparableData: any, propertyAnalysis: any) => Promise<{ success: boolean; error?: string }>
  getUserValuations: () => Promise<{ success: boolean; valuations?: any[]; error?: string }>
  getValuation: (valuationId: string) => Promise<{ success: boolean; valuation?: any; error?: string }>
  searchValuations: (searchTerm?: string, status?: string) => Promise<{ success: boolean; valuations?: any[]; error?: string }>
  completeValuation: (valuationId: string) => Promise<{ success: boolean; error?: string }>
  archiveValuation: (valuationId: string) => Promise<{ success: boolean; error?: string }>
  isLoading: boolean
}

export function useValuationDB(): ValuationDBHook {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)

  const saveToDatabase = useCallback(async (sessionId: string, wizardData: any) => {
    if (!session?.user?.primaryOrganizationId) {
      return { success: false, error: 'Not authenticated' }
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/valuation-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          action: 'save_to_db',
          data: wizardData
        })
      })

      const result = await response.json()
      setIsLoading(false)
      return result
    } catch (error) {
      setIsLoading(false)
      return { success: false, error: 'Network error' }
    }
  }, [session])

  const loadFromDatabase = useCallback(async (valuationId: string) => {
    if (!session?.user?.primaryOrganizationId) {
      return { success: false, error: 'Not authenticated' }
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/valuation-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'load',
          action: 'load_from_db',
          data: { valuationId }
        })
      })

      const result = await response.json()
      setIsLoading(false)
      return result
    } catch (error) {
      setIsLoading(false)
      return { success: false, error: 'Network error' }
    }
  }, [session])

  const saveGISData = useCallback(async (valuationId: string, gisData: any) => {
    if (!session?.user?.primaryOrganizationId) {
      return { success: false, error: 'Not authenticated' }
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/valuation-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'save',
          action: 'save_gis_data',
          data: { valuationId, gisData }
        })
      })

      const result = await response.json()
      setIsLoading(false)
      return result
    } catch (error) {
      setIsLoading(false)
      return { success: false, error: 'Network error' }
    }
  }, [session])

  const saveGarmushkaData = useCallback(async (valuationId: string, garmushkaData: any) => {
    if (!session?.user?.primaryOrganizationId) {
      return { success: false, error: 'Not authenticated' }
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/valuation-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'save',
          action: 'save_garmushka_data',
          data: { valuationId, garmushkaData }
        })
      })

      const result = await response.json()
      setIsLoading(false)
      return result
    } catch (error) {
      setIsLoading(false)
      return { success: false, error: 'Network error' }
    }
  }, [session])

  const saveFinalResults = useCallback(async (
    valuationId: string,
    finalValuation: number,
    pricePerSqm: number,
    comparableData: any,
    propertyAnalysis: any
  ) => {
    if (!session?.user?.primaryOrganizationId) {
      return { success: false, error: 'Not authenticated' }
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/valuation-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'save',
          action: 'save_final_results',
          data: { valuationId, finalValuation, pricePerSqm, comparableData, propertyAnalysis }
        })
      })

      const result = await response.json()
      setIsLoading(false)
      return result
    } catch (error) {
      setIsLoading(false)
      return { success: false, error: 'Network error' }
    }
  }, [session])

  const getUserValuations = useCallback(async () => {
    if (!session?.user?.primaryOrganizationId) {
      return { success: false, error: 'Not authenticated' }
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/valuation-session?action=get_valuations')
      const result = await response.json()
      setIsLoading(false)
      return result
    } catch (error) {
      setIsLoading(false)
      return { success: false, error: 'Network error' }
    }
  }, [session])

  const getValuation = useCallback(async (valuationId: string) => {
    if (!session?.user?.primaryOrganizationId) {
      return { success: false, error: 'Not authenticated' }
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/valuation-session?action=get_valuation&valuationId=${valuationId}`)
      const result = await response.json()
      setIsLoading(false)
      return result
    } catch (error) {
      setIsLoading(false)
      return { success: false, error: 'Network error' }
    }
  }, [session])

  const searchValuations = useCallback(async (searchTerm?: string, status?: string) => {
    if (!session?.user?.primaryOrganizationId) {
      return { success: false, error: 'Not authenticated' }
    }

    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('action', 'search_valuations')
      if (searchTerm) params.append('search', searchTerm)
      if (status) params.append('status', status)

      const response = await fetch(`/api/valuation-session?${params.toString()}`)
      const result = await response.json()
      setIsLoading(false)
      return result
    } catch (error) {
      setIsLoading(false)
      return { success: false, error: 'Network error' }
    }
  }, [session])

  const completeValuation = useCallback(async (valuationId: string) => {
    if (!session?.user?.primaryOrganizationId) {
      return { success: false, error: 'Not authenticated' }
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/valuation-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'complete',
          action: 'complete_valuation',
          data: { valuationId }
        })
      })

      const result = await response.json()
      setIsLoading(false)
      return result
    } catch (error) {
      setIsLoading(false)
      return { success: false, error: 'Network error' }
    }
  }, [session])

  const archiveValuation = useCallback(async (valuationId: string) => {
    if (!session?.user?.primaryOrganizationId) {
      return { success: false, error: 'Not authenticated' }
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/valuation-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'archive',
          action: 'archive_valuation',
          data: { valuationId }
        })
      })

      const result = await response.json()
      setIsLoading(false)
      return result
    } catch (error) {
      setIsLoading(false)
      return { success: false, error: 'Network error' }
    }
  }, [session])

  return {
    saveToDatabase,
    loadFromDatabase,
    saveGISData,
    saveGarmushkaData,
    saveFinalResults,
    getUserValuations,
    getValuation,
    searchValuations,
    completeValuation,
    archiveValuation,
    isLoading
  }
}
