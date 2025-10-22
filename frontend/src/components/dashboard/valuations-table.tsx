'use client'

import { useState, useEffect } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface Valuation {
  id: string
  status: 'DRAFT' | 'READY' | 'SIGNED'
  address: string
  block?: string
  parcel?: string
  subparcel?: string
  updatedAt: string
  createdBy: {
    name: string
  }
}

export function ValuationsTable() {
  const [valuations, setValuations] = useState<Valuation[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchValuations()
  }, [search, statusFilter])

  const fetchValuations = async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      
      const response = await fetch(`/api/valuations?${params}`)
      const data = await response.json()
      setValuations(data.valuations || [])
    } catch (error) {
      console.error('Error fetching valuations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      DRAFT: 'secondary',
      READY: 'default',
      SIGNED: 'success'
    } as const
    
    const labels = {
      DRAFT: 'טיוטה',
      READY: 'מוכן',
      SIGNED: 'חתום'
    }
    
    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    )
  }

  if (isLoading) {
    return <div className="text-center py-8">טוען...</div>
  }

  if (valuations.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">אין שומות</h3>
        <p className="text-gray-500 mb-4">התחל ליצור שומה חדשה</p>
        <Button onClick={() => window.location.href = `/wizard`}>+ שומה חדשה</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Input
          placeholder="חיפוש לפי כתובת, גוש, חלקה..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="all">כל הסטטוסים</option>
          <option value="DRAFT">טיוטה</option>
          <option value="READY">מוכן</option>
          <option value="SIGNED">חתום</option>
        </select>
      </div>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>כתובת</TableHead>
              <TableHead>עודכן לאחרונה</TableHead>
              <TableHead>פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {valuations.map((valuation) => (
              <TableRow key={valuation.id}>
                <TableCell>{valuation.address}</TableCell>
                <TableCell>
                  {[valuation.block, valuation.parcel, valuation.subparcel]
                    .filter(Boolean)
                    .join('/')}
                </TableCell>
                <TableCell>{getStatusBadge(valuation.status)}</TableCell>
                <TableCell>
                  {new Date(valuation.updatedAt).toLocaleDateString('he-IL')}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={async () => {
                        try {
                          // Get the existing session ID for this valuation from the database
                          const response = await fetch(`/api/valuation-session?action=get_valuation&valuationId=${valuation.id}`)
                          if (response.ok) {
                            const { shuma } = await response.json()
                            if (shuma && shuma.session_id) {
                              // Use existing session ID
                              window.location.href = `/wizard?sessionId=${shuma.session_id}&step=1`
                            } else {
                              // No existing session, create new one
                              const sessionResponse = await fetch('/api/session', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  data: {
                                    valuationId: valuation.id,
                                    valuationAddress: valuation.address
                                  }
                                })
                              })
                              
                              if (sessionResponse.ok) {
                                const { sessionId } = await sessionResponse.json()
                                window.location.href = `/wizard?sessionId=${sessionId}&step=1`
                              } else {
                                window.location.href = `/wizard?step=1`
                              }
                            }
                          } else {
                            window.location.href = `/wizard?step=1`
                          }
                        } catch (error) {
                          console.error('Error opening valuation:', error)
                          window.location.href = `/wizard?step=1`
                        }
                      }}
                    >
                      פתח
                    </Button>

                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={async () => {
                        try {
                          const sessionResponse = await fetch('/api/session', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({})
                          })
                          
                          if (sessionResponse.ok) {
                            const { sessionId } = await sessionResponse.json()
                            window.location.href = `/wizard?sessionId=${sessionId}`
                          } else {
                            window.location.href = `/wizard`
                          }
                        } catch (error) {
                          console.error('Error creating session:', error)
                          window.location.href = `/wizard`
                        }
                      }}
                    >
                      שכפל
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}