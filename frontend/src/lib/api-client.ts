/**
 * API Client for calling Express backend from Next.js frontend
 * 
 * In development: Calls localhost:3001
 * In production: Calls deployed Vercel Express backend
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

export interface APIOptions extends RequestInit {
  params?: Record<string, string | number | boolean>
}

/**
 * Call Express backend API
 * @param endpoint - API endpoint (e.g., '/api/sessions/123')
 * @param options - Fetch options
 */
export async function callBackendAPI<T = any>(
  endpoint: string,
  options: APIOptions = {}
): Promise<T> {
  const { params, ...fetchOptions } = options
  
  // Build URL with query params
  let url = `${BACKEND_URL}${endpoint}`
  if (params) {
    const queryString = new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        acc[key] = String(value)
        return acc
      }, {} as Record<string, string>)
    ).toString()
    url = `${url}?${queryString}`
  }
  
  console.log(`📡 Calling backend: ${options.method || 'GET'} ${url}`)
  
  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error(`❌ Backend API error: ${response.status} ${response.statusText}`, errorText)
    throw new Error(`Backend API error: ${response.statusText}`)
  }
  
  const data = await response.json()
  console.log(`✅ Backend response received`)
  
  return data as T
}

/**
 * Upload file to Express backend
 * @param endpoint - Upload endpoint
 * @param formData - FormData with file(s)
 */
export async function uploadToBackend<T = any>(
  endpoint: string,
  formData: FormData
): Promise<T> {
  const url = `${BACKEND_URL}${endpoint}`
  
  console.log(`📤 Uploading to backend: POST ${url}`)
  
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
    // Don't set Content-Type header - browser will set it with boundary for multipart/form-data
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error(`❌ Upload error: ${response.status} ${response.statusText}`, errorText)
    throw new Error(`Upload failed: ${response.statusText}`)
  }
  
  const data = await response.json()
  console.log(`✅ Upload successful`)
  
  return data as T
}

/**
 * Get backend base URL
 */
export function getBackendURL(): string {
  return BACKEND_URL
}

/**
 * Check if backend is healthy
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
    })
    return response.ok
  } catch (error) {
    console.error('❌ Backend health check failed:', error)
    return false
  }
}

// Example usage:
/*
import { callBackendAPI, uploadToBackend } from '@/lib/api-client'

// GET request
const session = await callBackendAPI('/api/sessions/123')

// POST request
const newValuation = await callBackendAPI('/api/valuations', {
  method: 'POST',
  body: JSON.stringify({ address: '123 Main St' })
}) 

// PUT request with query params
const updated = await callBackendAPI('/api/sessions/123', {
  method: 'PUT',
  body: JSON.stringify({ data: {...} }),
  params: { action: 'save' }
})

// DELETE request
await callBackendAPI('/api/valuations/123', {
  method: 'DELETE'
})

// File upload
const formData = new FormData()
formData.append('file', file)
formData.append('type', 'tabu')
const result = await uploadToBackend('/api/sessions/123/upload', formData)
*/
