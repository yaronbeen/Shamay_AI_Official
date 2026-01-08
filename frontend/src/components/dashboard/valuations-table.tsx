'use client'

import { useState, useEffect } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Building2,
  Search,
  Filter,
  Edit,
  Copy,
  Trash2,
  Calendar,
  MapPin,
  User,
  FileText,
  AlertCircle,
  CheckSquare,
  Square,
  X
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [valuationToDelete, setValuationToDelete] = useState<Valuation | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)

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
    
    const colors = {
      DRAFT: 'bg-gray-100 text-gray-800 border-gray-300',
      READY: 'bg-blue-100 text-blue-800 border-blue-300',
      SIGNED: 'bg-green-100 text-green-800 border-green-300'
    }
    
    return (
      <Badge variant={variants[status as keyof typeof variants]} className={colors[status as keyof typeof colors]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    )
  }

  const handleDelete = async () => {
    if (!valuationToDelete) return
    
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/valuations/${valuationToDelete.id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        // Remove from list
        setValuations(prev => prev.filter(v => v.id !== valuationToDelete.id))
        setDeleteDialogOpen(false)
        setValuationToDelete(null)
      } else {
        const error = await response.json().catch(() => ({ error: 'Failed to delete valuation' }))
        alert(`שגיאה במחיקה: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting valuation:', error)
      alert('שגיאה במחיקת השומה')
    } finally {
      setIsDeleting(false)
    }
  }

  const openDeleteDialog = (valuation: Valuation) => {
    setValuationToDelete(valuation)
    setDeleteDialogOpen(true)
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === valuations.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(valuations.map(v => v.id)))
    }
  }

  const handleBulkDelete = async () => {
    setIsDeleting(true)
    try {
      const deletePromises = Array.from(selectedIds).map(id =>
        fetch(`/api/valuations/${id}`, { method: 'DELETE' })
      )
      await Promise.all(deletePromises)
      setValuations(prev => prev.filter(v => !selectedIds.has(v.id)))
      setSelectedIds(new Set())
      setBulkDeleteDialogOpen(false)
    } catch (error) {
      console.error('Error deleting valuations:', error)
      alert('שגיאה במחיקת השומות')
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-12" dir="rtl">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">טוען שומות...</p>
      </div>
    )
  }

  if (valuations.length === 0) {
    return (
      <Card dir="rtl">
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">אין שומות</h3>
          <p className="text-gray-500 mb-4">התחל ליצור שומה חדשה</p>
          <Button onClick={() => window.location.href = `/wizard`} className="gap-2">
            <FileText className="h-4 w-4" />
            שומה חדשה
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Search and Filter Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="חיפוש לפי כתובת, גוש, חלקה..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
            <div className="relative">
              <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-10 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">כל הסטטוסים</option>
                <option value="DRAFT">טיוטה</option>
                <option value="READY">מוכן</option>
                <option value="SIGNED">חתום</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions Toolbar */}
      {selectedIds.size > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-blue-800">
                  {selectedIds.size} שומות נבחרו
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedIds(new Set())}
                  className="text-blue-600 hover:text-blue-800 gap-1"
                >
                  <X className="h-4 w-4" />
                  בטל בחירה
                </Button>
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setBulkDeleteDialogOpen(true)}
                className="gap-1"
              >
                <Trash2 className="h-4 w-4" />
                מחק נבחרים ({selectedIds.size})
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Valuations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            השומות שלי ({valuations.length})
          </CardTitle>
          <CardDescription>
            ניהול ועריכה של כל השומות
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-12">
                    <button onClick={toggleSelectAll} className="p-1 hover:bg-gray-200 rounded">
                      {selectedIds.size === valuations.length && valuations.length > 0 ? (
                        <CheckSquare className="h-5 w-5 text-blue-600" />
                      ) : (
                        <Square className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="font-semibold">כתובת</TableHead>
                  <TableHead className="font-semibold">סטטוס</TableHead>
                  <TableHead className="font-semibold">עודכן לאחרונה</TableHead>
                  <TableHead className="font-semibold text-center">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {valuations.map((valuation) => (
                  <TableRow key={valuation.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.has(valuation.id) ? 'bg-blue-50' : ''}`}>
                    <TableCell>
                      <button onClick={() => toggleSelect(valuation.id)} className="p-1 hover:bg-gray-200 rounded">
                        {selectedIds.has(valuation.id) ? (
                          <CheckSquare className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Square className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="font-medium">{valuation.address}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(valuation.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {(() => {
                          const date = new Date(valuation.updatedAt);
                          const day = date.getDate().toString().padStart(2, '0');
                          const month = (date.getMonth() + 1).toString().padStart(2, '0');
                          const year = date.getFullYear();
                          return `${day}.${month}.${year}`;
                        })()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 justify-center">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={async () => {
                            try {
                              const response = await fetch(`/api/valuation-session?action=get_valuation&valuationId=${valuation.id}`)
                              if (response.ok) {
                                const { shuma } = await response.json()
                                if (shuma && shuma.sessionId) {
                                  window.location.href = `/wizard?sessionId=${shuma.sessionId}&step=1`
                                } else {
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
                          className="gap-1"
                        >
                          <Edit className="h-3 w-3" />
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
                          className="gap-1"
                        >
                          <Copy className="h-3 w-3" />
                          שכפל
                        </Button>

                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => openDeleteDialog(valuation)}
                          className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                          מחק
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              מחיקת שומה
            </AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את השומה?
              <br />
              <span className="font-semibold text-gray-900 mt-2 block">
                {valuationToDelete?.address}
              </span>
              <br />
              פעולה זו לא ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'מוחק...' : 'מחק'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              מחיקת {selectedIds.size} שומות
            </AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את כל השומות שנבחרו?
              <br /><br />
              <span className="font-semibold text-red-600">
                פעולה זו תמחק {selectedIds.size} שומות ולא ניתנת לביטול.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'מוחק...' : `מחק ${selectedIds.size} שומות`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}