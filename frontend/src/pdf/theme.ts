/**
 * Shamay.AI PDF Theme Configuration
 * Encodes sizes (pt/mm), borders, colors, spacing, bullet styles, and caption specs
 */

export const PDF_THEME = {
  // Page Configuration
  page: {
    width: 595, // A4 width in points
    height: 842, // A4 height in points
    margin: {
      top: 72, // 25mm in points
      bottom: 72, // 25mm in points
      left: 57, // 20mm in points
      right: 57 // 20mm in points
    }
  },

  // Typography
  fonts: {
    primary: 'Assistant',
    fallback: 'Arial',
    sizes: {
      h1: 14, // Heading 1
      h2: 12, // Heading 2
      body: 11, // Body text
      caption: 9, // Captions
      footer: 9 // Footer text
    }
  },

  // Colors
  colors: {
    primary: '#000000',
    secondary: '#666666',
    accent: '#D32F2F', // Red for errors
    warning: '#FFF59D', // Yellow for warnings
    border: '#CCCCCC',
    background: '#FFFFFF',
    headerBg: '#EFEFEF'
  },

  // Spacing
  spacing: {
    xs: 2, // 2pt
    sm: 4, // 4pt
    md: 6, // 6pt
    lg: 8, // 8pt
    xl: 15, // 15pt
    xxl: 20 // 20pt
  },

  // Borders
  borders: {
    thin: 0.5, // 0.5pt
    medium: 1, // 1pt
    thick: 1.2 // 1.2pt
  },

  // Line Heights
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.8
  },

  // Bullet Styles
  bullets: {
    disc: '•',
    dash: '–',
    arrow: '→'
  },

  // Image Sizes (in mm converted to points)
  images: {
    cover: {
      width: 160 * 2.834, // 160mm to points
      height: 120 * 2.834 // 120mm to points
    },
    map: {
      width: 140 * 2.834, // 140mm to points
      height: 140 * 2.834 // 140mm to points
    },
    parcel: {
      width: 70 * 2.834, // 70mm to points
      height: 70 * 2.834 // 70mm to points
    },
    stamp: {
      width: 35 * 2.834, // 35mm to points
      height: 35 * 2.834 // 35mm to points
    }
  },

  // Table Configuration
  table: {
    borderWidth: 0.5,
    borderColor: '#999999',
    cellPadding: 6,
    headerBg: '#EFEFEF',
    columnWidths: {
      field: 45 * 2.834, // 45mm to points
      value: 70 * 2.834 // 70mm to points
    }
  },

  // Placeholder Styles
  placeholders: {
    block: {
      color: '#D32F2F',
      backgroundColor: '#FFEBEE',
      border: '1pt solid #D32F2F',
      padding: 2
    },
    pending: {
      color: '#F57C00',
      backgroundColor: '#FFF59D',
      border: '1pt solid #F57C00',
      padding: 2
    }
  },

  // RTL Configuration
  rtl: {
    direction: 'rtl',
    textAlign: 'right',
    marginStart: 'right',
    marginEnd: 'left'
  }
}

// Helper functions for theme usage
export const getThemeColor = (colorName: keyof typeof PDF_THEME.colors): string => {
  return PDF_THEME.colors[colorName]
}

export const getThemeSize = (sizeName: keyof typeof PDF_THEME.fonts.sizes): number => {
  return PDF_THEME.fonts.sizes[sizeName]
}

export const getThemeSpacing = (spacingName: keyof typeof PDF_THEME.spacing): number => {
  return PDF_THEME.spacing[spacingName]
}

export const getThemeBorder = (borderName: keyof typeof PDF_THEME.borders): number => {
  return PDF_THEME.borders[borderName]
}

export const getThemeImageSize = (imageName: keyof typeof PDF_THEME.images) => {
  return PDF_THEME.images[imageName]
}

// RTL Helper Functions
export const getRTLStyle = () => ({
  direction: PDF_THEME.rtl.direction,
  textAlign: PDF_THEME.rtl.textAlign
})

export const getRTLMargin = (start: number, end: number) => ({
  marginRight: start,
  marginLeft: end
})

// Placeholder Helper Functions
export const getPlaceholderStyle = (type: 'block' | 'pending') => {
  const style = PDF_THEME.placeholders[type]
  return {
    color: style.color,
    backgroundColor: style.backgroundColor,
    border: style.border,
    padding: style.padding
  }
}

// Validation Helper Functions
export const isPlaceholderNeeded = (value: any, required: boolean = false): boolean => {
  if (required && (!value || value === '')) return true
  if (!required && (!value || value === '')) return false
  return false
}

export const getPlaceholderText = (fieldName: string, required: boolean = false): string => {
  if (required) {
    return `[חסר נתון ${fieldName}]`
  }
  return `[${fieldName} לא זמין]`
}
