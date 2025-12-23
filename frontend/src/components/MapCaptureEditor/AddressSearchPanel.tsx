'use client'

import React, { useState, useEffect } from 'react'
import { Search, MapPin, Loader2 } from 'lucide-react'
import type { AddressData, GISData } from './types'

interface AddressSearchPanelProps {
  sessionId: string
  initialAddress?: string
  initialStreet?: string
  initialNumber?: string
  initialCity?: string
  onAddressFound: (address: AddressData, gisData: GISData) => void
  onError: (error: Error) => void
}

/**
 * AddressSearchPanel - Handles address search and GIS data retrieval
 * On successful search, overrides Step 1 address data
 */
const AddressSearchPanel: React.FC<AddressSearchPanelProps> = ({
  sessionId,
  initialAddress,
  initialStreet,
  initialNumber,
  initialCity,
  onAddressFound,
  onError
}) => {
  const [streetInput, setStreetInput] = useState(initialStreet || '')
  const [numberInput, setNumberInput] = useState(initialNumber || '')
  const [cityInput, setCityInput] = useState(initialCity || '')
  const [isSearching, setIsSearching] = useState(false)

  // טען כתובת מהדיבי אם יש נתונים
  useEffect(() => {
    if (initialStreet) {
      setStreetInput(initialStreet)
    }
    if (initialNumber) {
      setNumberInput(initialNumber)
    }
    if (initialCity) {
      setCityInput(initialCity)
    }
  }, [initialStreet, initialNumber, initialCity])

  const handleSearch = async () => {
    if (!streetInput.trim() || !cityInput.trim()) {
      onError(new Error('נא להזין רחוב ועיר לפחות'))
      return
    }

    const address = `${streetInput} ${numberInput} ${cityInput}`.trim()
    console.log('🔍 Searching address:', address)

    setIsSearching(true)
    try {
      const response = await fetch('/api/address-to-govmap', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        cache: 'no-store',
        body: JSON.stringify({ 
          address, 
          options: { zoom: 16, showTazea: true, showInfo: false }
        })
      })

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'כתובת לא נמצאה')
      }

      // Convert API response to internal format
      const addressData: AddressData = {
        input: address,
        normalized: result.address.normalized,
        displayAddress: `${streetInput} ${numberInput}, ${cityInput}`,
        confidence: result.confidence,
        details: result.address.details
      }

      const gisData: GISData = {
        coordinates: {
          wgs84: result.coordinates.wgs84,
          itm: result.coordinates.itm
        },
        govmapUrls: {
          cropMode0: result.govmap.urlWithoutTazea,
          cropMode1: result.govmap.urlWithTazea
        },
        address: result.address.normalized,
        confidence: result.confidence,
        extractedAt: new Date().toISOString()
      }

      console.log('✅ Address found:', addressData)
      console.log('📍 GIS data:', gisData)

      onAddressFound(addressData, gisData)

    } catch (error) {
      console.error('❌ Address search error:', error)
      onError(error instanceof Error ? error : new Error('Unknown error'))
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <MapPin className="w-5 h-5 text-blue-600" />
        חיפוש כתובת
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Street Input */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
            רחוב *
          </label>
          <input
            type="text"
            value={streetInput}
            onChange={(e) => setStreetInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="נורדאו / Nordau"
            className="w-full p-3 border-2 border-gray-300 rounded-lg text-right focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            dir="rtl"
          />
        </div>

        {/* Number Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
            מספר
          </label>
          <input
            type="text"
            value={numberInput}
            onChange={(e) => setNumberInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="8"
            className="w-full p-3 border-2 border-gray-300 rounded-lg text-right focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            dir="rtl"
          />
        </div>

        {/* City Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
            עיר *
          </label>
          <input
            type="text"
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="רעננה / Raanana"
            className="w-full p-3 border-2 border-gray-300 rounded-lg text-right focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            dir="rtl"
          />
        </div>
      </div>

      {/* Search Button */}
      <div className="mt-4">
        <button
          onClick={handleSearch}
          disabled={isSearching || !streetInput.trim() || !cityInput.trim()}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isSearching ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              מחפש...
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              חפש כתובת
            </>
          )}
        </button>
      </div>

      <p className="text-xs text-gray-500 mt-3 text-right">
        * חיפוש כתובת יעדכן את הכתובת בשלב 1
      </p>
    </div>
  )
}

export default AddressSearchPanel

