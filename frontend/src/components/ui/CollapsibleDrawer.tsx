'use client'

import React from 'react'
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CollapsibleDrawerProps {
  children: React.ReactNode
  isOpen: boolean
  onToggle: () => void
  width?: string
  newTabUrl?: string
  className?: string
  collapsedLabel?: string
}

export function CollapsibleDrawer({
  children,
  isOpen,
  onToggle,
  width = 'w-1/2',
  newTabUrl,
  className,
  collapsedLabel
}: CollapsibleDrawerProps) {
  const openInNewTab = () => {
    if (newTabUrl) {
      window.open(newTabUrl, '_blank')
    }
  }

  return (
    <div className={cn(
      'flex h-full transition-all duration-300 ease-in-out',
      isOpen ? width : 'w-auto'
    )}>
      {/* Drawer Content */}
      <div
        className={cn(
          'transition-all duration-300 ease-in-out overflow-hidden h-full flex-1',
          isOpen ? 'w-full' : 'w-0',
          className
        )}
      >
        {isOpen && (
          <div className="h-full w-full">
            {children}
          </div>
        )}
      </div>

      {/* Toggle Button Strip */}
      <div className="flex flex-col items-center bg-gray-100 border-x border-gray-200 py-2 gap-2">
        {/* Toggle Button */}
        <button
          onClick={onToggle}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title={isOpen ? 'סגור פאנל' : 'פתח פאנל'}
        >
          {isOpen ? (
            <ChevronRight className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          )}
        </button>

        {/* Collapsed Label - shown when drawer is closed */}
        {!isOpen && collapsedLabel && (
          <div
            className="writing-mode-vertical text-xs font-medium text-gray-700 px-1 py-2 cursor-pointer hover:text-blue-600"
            onClick={onToggle}
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            {collapsedLabel}
          </div>
        )}

        {/* Open in New Tab Button */}
        {newTabUrl && (
          <button
            onClick={openInNewTab}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="פתח בלשונית חדשה"
          >
            <ExternalLink className="w-5 h-5 text-gray-600" />
          </button>
        )}
      </div>
    </div>
  )
}
