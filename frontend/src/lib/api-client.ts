/**
 * Type-safe API Client for Shamay Valuation System
 * Generated from OpenAPI specification
 */

export interface User {
  id: string
  email: string
  name?: string
  primaryOrganizationId: string
}

export interface Organization {
  id: string
  name: string
  role: 'owner' | 'admin' | 'appraiser' | 'viewer'
}

export type ValuationStatus = 'draft' | 'in_progress' | 'final' | 'archived'

export interface Valuation {
  id: string
  organizationId: string
  createdBy: string
  status: ValuationStatus
  address: string
  block?: string
  parcel?: string
  subParcel?: string
  formState: any
  finalizedAt?: string
  createdAt: string
  updatedAt: string
}

export interface ValuationStep {
  id: string
  valuationId: string
  stepNo: number
  data: any
  updatedAt: string
}

export interface Measurement {
  id: string
  valuationId: string
  type: 'polyline' | 'polygon' | 'calibration'
  points: Array<{ x: number; y: number }>
  name: string
  notes?: string
  realWorldLength?: number
  metersPerPixel?: number
  unitMode: 'metric' | 'imperial'
  color: string
  createdAt: string
}

export interface ApiError {
  error: string
  details?: any
}

class ShamayApiClient {
  private baseUrl: string

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include cookies
    })

    if (!response.ok) {
      const error: ApiError = await response.json()
      throw new Error(error.error || 'API request failed')
    }

    return response.json()
  }

  // Auth endpoints
  auth = {
    register: async (data: {
      email: string
      password: string
      name: string
      organizationName?: string
    }) => {
      return this.request<{ success: boolean; user: User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },

    login: async (email: string, password: string) => {
      return this.request<{
        success: boolean
        user: User
        organizations: Organization[]
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
    },

    logout: async () => {
      return this.request<{ success: boolean }>('/auth/logout', {
        method: 'POST',
      })
    },

    me: async () => {
      return this.request<{ user: User; organizations: Organization[] }>(
        '/auth/me'
      )
    },

    changePassword: async (oldPassword: string, newPassword: string) => {
      return this.request<{ success: boolean }>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ oldPassword, newPassword }),
      })
    },
  }

  // Valuation endpoints
  valuations = {
    list: async (params?: {
      status?: ValuationStatus
      search?: string
      cursor?: string
      limit?: number
    }) => {
      const query = new URLSearchParams()
      if (params?.status) query.set('status', params.status)
      if (params?.search) query.set('search', params.search)
      if (params?.cursor) query.set('cursor', params.cursor)
      if (params?.limit) query.set('limit', params.limit.toString())

      return this.request<{
        items: Valuation[]
        nextCursor: string | null
      }>(`/valuations?${query}`)
    },

    create: async (data: {
      address: string
      block?: string
      parcel?: string
      subParcel?: string
      initialData?: any
    }) => {
      return this.request<Valuation>('/valuations', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },

    get: async (id: string) => {
      return this.request<Valuation>(`/valuations/${id}`)
    },

    delete: async (id: string) => {
      return this.request<{ success: boolean }>(`/valuations/${id}`, {
        method: 'DELETE',
      })
    },

    finalize: async (
      id: string,
      data?: { signatureHash?: string; notes?: string }
    ) => {
      return this.request<{
        valuation: Valuation
        version: { id: string; createdAt: string }
      }>(`/valuations/${id}/finalize`, {
        method: 'POST',
        body: JSON.stringify(data || {}),
      })
    },
  }

  // Step endpoints
  steps = {
    get: async (valuationId: string, stepNo: number) => {
      return this.request<{
        valuation: { id: string; status: ValuationStatus; address: string }
        step: ValuationStep
      }>(`/valuations/${valuationId}/steps/${stepNo}`)
    },

    update: async (valuationId: string, stepNo: number, data: any) => {
      return this.request<{
        valuation: Valuation
        step: ValuationStep
      }>(`/valuations/${valuationId}/steps/${stepNo}`, {
        method: 'PUT',
        body: JSON.stringify({ data }),
      })
    },
  }

  // Measurement endpoints
  measurements = {
    list: async (valuationId: string) => {
      return this.request<{ measurements: Measurement[] }>(
        `/valuations/${valuationId}/measurements`
      )
    },

    save: async (
      valuationId: string,
      data: {
        measurements: Array<{
          type: 'polyline' | 'polygon' | 'calibration'
          points: Array<{ x: number; y: number }>
          name: string
          notes?: string
          realWorldLength?: number
          metersPerPixel?: number
          unitMode: 'metric' | 'imperial'
          color: string
        }>
        metersPerPixel: number
        unitMode: 'metric' | 'imperial'
        fileName: string
      }
    ) => {
      return this.request<{ measurements: Measurement[] }>(
        `/valuations/${valuationId}/measurements`,
        {
          method: 'PUT',
          body: JSON.stringify(data),
        }
      )
    },
  }
}

// Export singleton instance
export const api = new ShamayApiClient()

// Export class for custom instances
export default ShamayApiClient

