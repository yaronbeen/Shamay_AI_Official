/**
 * Data Lineage Tooltips Component
 * Renders short source chips with detailed lineage information
 */

import React, { useState } from 'react'
import { Tooltip, Chip, Box, Typography } from '@mui/material'
import { InfoOutlined } from '@mui/icons-material'

export interface SourceInfo {
  source: 'ocr:tabu' | 'ocr:condo' | 'ocr:permit' | 'manual' | 'computed' | 'ai:gpt' | 'ai:cv' | 'gis:govmap'
  lineage: string
  confidence?: number
  timestamp?: string
  page?: number
}

interface TooltipSourceProps {
  fieldName: string
  sourceInfo: SourceInfo
  value: any
  showChip?: boolean
  size?: 'small' | 'medium' | 'large'
}

const SOURCE_LABELS = {
  'ocr:tabu': 'נסח טאבו',
  'ocr:condo': 'צו בית משותף',
  'ocr:permit': 'היתר בניה',
  'manual': 'קלט ידני',
  'computed': 'חישוב אוטומטי',
  'ai:gpt': 'AI טקסט',
  'ai:cv': 'AI תמונה',
  'gis:govmap': 'GOVMAP'
}

const SOURCE_COLORS = {
  'ocr:tabu': '#2196F3',
  'ocr:condo': '#4CAF50',
  'ocr:permit': '#FF9800',
  'manual': '#9C27B0',
  'computed': '#607D8B',
  'ai:gpt': '#E91E63',
  'ai:cv': '#795548',
  'gis:govmap': '#00BCD4'
}

const SOURCE_ICONS = {
  'ocr:tabu': '📄',
  'ocr:condo': '🏢',
  'ocr:permit': '📋',
  'manual': '✏️',
  'computed': '🧮',
  'ai:gpt': '🤖',
  'ai:cv': '👁️',
  'gis:govmap': '🗺️'
}

export const TooltipSource: React.FC<TooltipSourceProps> = ({
  fieldName,
  sourceInfo,
  value,
  showChip = true,
  size = 'small'
}) => {
  const [open, setOpen] = useState(false)
  
  const sourceLabel = SOURCE_LABELS[sourceInfo.source] || sourceInfo.source
  const sourceColor = SOURCE_COLORS[sourceInfo.source] || '#666666'
  const sourceIcon = SOURCE_ICONS[sourceInfo.source] || '❓'
  
  const tooltipContent = (
    <Box sx={{ p: 1, maxWidth: 300 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
        מקור נתונים: {sourceLabel}
      </Typography>
      
      <Typography variant="body2" sx={{ mb: 1 }}>
        {sourceInfo.lineage}
      </Typography>
      
      {sourceInfo.confidence && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          רמת ביטחון: {Math.round(sourceInfo.confidence * 100)}%
        </Typography>
      )}
      
      {sourceInfo.page && (
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          עמוד: {sourceInfo.page}
        </Typography>
      )}
      
      {sourceInfo.timestamp && (
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          זמן: {new Date(sourceInfo.timestamp).toLocaleString('he-IL')}
        </Typography>
      )}
    </Box>
  )
  
  if (!showChip) {
    return (
      <Tooltip title={tooltipContent} open={open} onOpen={() => setOpen(true)} onClose={() => setOpen(false)}>
        <Box
          component="span"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            cursor: 'help',
            ml: 0.5
          }}
        >
          <InfoOutlined sx={{ fontSize: 14, color: sourceColor }} />
        </Box>
      </Tooltip>
    )
  }
  
  return (
    <Tooltip title={tooltipContent} open={open} onOpen={() => setOpen(true)} onClose={() => setOpen(false)}>
      <Chip
        icon={<span>{sourceIcon}</span>}
        label={sourceLabel}
        size={size}
        sx={{
          backgroundColor: sourceColor + '20',
          color: sourceColor,
          border: `1px solid ${sourceColor}40`,
          cursor: 'help',
          '&:hover': {
            backgroundColor: sourceColor + '30'
          }
        }}
        onClick={() => setOpen(!open)}
      />
    </Tooltip>
  )
}

// Helper component for displaying multiple sources
interface MultiSourceProps {
  sources: Array<{
    fieldName: string
    sourceInfo: SourceInfo
    value: any
  }>
  layout?: 'horizontal' | 'vertical'
}

export const MultiSource: React.FC<MultiSourceProps> = ({
  sources,
  layout = 'horizontal'
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: layout === 'vertical' ? 'column' : 'row',
        gap: 1,
        flexWrap: 'wrap',
        alignItems: 'center'
      }}
    >
      {sources.map((source, index) => (
        <TooltipSource
          key={index}
          fieldName={source.fieldName}
          sourceInfo={source.sourceInfo}
          value={source.value}
          showChip={true}
          size="small"
        />
      ))}
    </Box>
  )
}

// Helper component for inline source display
interface InlineSourceProps {
  fieldName: string
  sourceInfo: SourceInfo
  value: any
  showValue?: boolean
}

export const InlineSource: React.FC<InlineSourceProps> = ({
  fieldName,
  sourceInfo,
  value,
  showValue = true
}) => {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5
      }}
    >
      {showValue && (
        <Typography variant="body2" component="span">
          {value}
        </Typography>
      )}
      <TooltipSource
        fieldName={fieldName}
        sourceInfo={sourceInfo}
        value={value}
        showChip={false}
      />
    </Box>
  )
}

// Helper function to create source info from field metadata
export function createSourceInfo(
  source: SourceInfo['source'],
  lineage: string,
  confidence?: number,
  page?: number
): SourceInfo {
  return {
    source,
    lineage,
    confidence,
    page,
    timestamp: new Date().toISOString()
  }
}

// Helper function to get source color
export function getSourceColor(source: SourceInfo['source']): string {
  return SOURCE_COLORS[source] || '#666666'
}

// Helper function to get source label
export function getSourceLabel(source: SourceInfo['source']): string {
  return SOURCE_LABELS[source] || source
}

// Helper function to get source icon
export function getSourceIcon(source: SourceInfo['source']): string {
  return SOURCE_ICONS[source] || '❓'
}
