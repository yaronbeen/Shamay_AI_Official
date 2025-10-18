import React from 'react'
import { Info } from 'lucide-react'

interface DataSourceProps {
  source: 'tabu' | 'permit' | 'condo' | 'manual' | 'ai' | 'csv'
  details?: string
  className?: string
}

const SOURCE_LABELS = {
  tabu: 'נשלף אוטומטית מנסח טאבו',
  permit: 'נשלף מהיתר בניה',
  condo: 'נשלף מצו בית משותף',
  manual: 'הוזן ידנית',
  ai: 'ניתוח תמונות AI',
  csv: 'נשלף מקובץ CSV'
}

export function DataSource({ source, details, className = '' }: DataSourceProps) {
  const label = SOURCE_LABELS[source]
  const tooltip = details ? `${label} - ${details}` : label
  
  return (
    <div 
      className={`inline-flex items-center gap-1 text-xs text-gray-500 ${className}`}
      title={tooltip}
    >
      <Info className="w-3 h-3" />
      <span>{label}</span>
    </div>
  )
}
