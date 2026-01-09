import {
  AlignmentType,
  TextDirection,
  BorderStyle,
  WidthType,
  convertMillimetersToTwip,
  ITableCellOptions,
  IParagraphOptions,
  IRunOptions,
} from 'docx'

// Color constants matching PDF template
export const COLORS = {
  PRIMARY: '1e3a8a', // Dark blue
  TEXT: '000000',
  MUTED: '666666',
  LIGHT_GRAY: 'f0f0f0',
  BORDER: '94a3b8',
  WHITE: 'ffffff',
}

// Font configuration
export const FONTS = {
  HEBREW: 'David Libre',
  FALLBACK: 'Arial',
}

// Font sizes in half-points (Word uses half-points: pt * 2)
// Matching HTML template: body 12pt, chapter 14pt, section 12pt
export const FONT_SIZES = {
  TITLE_LARGE: 36, // 18pt - Main cover title
  TITLE: 28, // 14pt - Chapter titles (matches HTML .chapter-title 14pt)
  SECTION_TITLE: 24, // 12pt - Section titles (matches HTML .section-title 12pt)
  BODY: 24, // 12pt - Body text (matches HTML body font-size)
  SMALL: 22, // 11pt
  TABLE: 20, // 10pt
  FOOTNOTE: 18, // 9pt
  // Cover page specific sizes (matching HTML)
  COVER_TITLE_MAIN: 26, // 13pt - "חוות דעת בעניין"
  COVER_TITLE_SUB: 30, // 15pt - "אומדן שווי זכויות במקרקעין"
  COVER_TITLE_TYPE: 24, // 12pt - "דירת מגורים"
  COVER_ADDRESS: 24, // 12pt - Address line
}

// Page dimensions in twips (1 inch = 1440 twips)
export const PAGE = {
  WIDTH: convertMillimetersToTwip(210), // A4 width
  HEIGHT: convertMillimetersToTwip(297), // A4 height
  MARGIN_TOP: convertMillimetersToTwip(20),
  MARGIN_BOTTOM: convertMillimetersToTwip(20),
  MARGIN_LEFT: convertMillimetersToTwip(15),
  MARGIN_RIGHT: convertMillimetersToTwip(15),
}

// RTL paragraph configuration
export const RTL_PARAGRAPH: Partial<IParagraphOptions> = {
  bidirectional: true,
  alignment: AlignmentType.RIGHT,
}

// RTL text run configuration
export const RTL_RUN: Partial<IRunOptions> = {
  font: FONTS.HEBREW,
  rightToLeft: true,
}

// Standard paragraph styles
export const PARAGRAPH_STYLES = {
  title: {
    ...RTL_PARAGRAPH,
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  } as Partial<IParagraphOptions>,

  sectionTitle: {
    ...RTL_PARAGRAPH,
    spacing: { before: 300, after: 150 },
  } as Partial<IParagraphOptions>,

  body: {
    ...RTL_PARAGRAPH,
    spacing: { after: 100, line: 408 }, // 1.7 line spacing (matching HTML line-height: 1.7)
  } as Partial<IParagraphOptions>,

  bullet: {
    ...RTL_PARAGRAPH,
    spacing: { after: 80 },
  } as Partial<IParagraphOptions>,
}

// Text run styles
export const TEXT_STYLES = {
  titleLarge: {
    ...RTL_RUN,
    size: FONT_SIZES.TITLE_LARGE,
    bold: true,
    color: COLORS.PRIMARY,
  } as Partial<IRunOptions>,

  title: {
    ...RTL_RUN,
    size: FONT_SIZES.TITLE,
    bold: true,
    color: COLORS.PRIMARY,
  } as Partial<IRunOptions>,

  sectionTitle: {
    ...RTL_RUN,
    size: FONT_SIZES.SECTION_TITLE,
    bold: true,
    color: COLORS.PRIMARY,
  } as Partial<IRunOptions>,

  body: {
    ...RTL_RUN,
    size: FONT_SIZES.BODY,
    color: COLORS.TEXT,
  } as Partial<IRunOptions>,

  bodyBold: {
    ...RTL_RUN,
    size: FONT_SIZES.BODY,
    bold: true,
    color: COLORS.TEXT,
  } as Partial<IRunOptions>,

  small: {
    ...RTL_RUN,
    size: FONT_SIZES.SMALL,
    color: COLORS.MUTED,
  } as Partial<IRunOptions>,

  table: {
    ...RTL_RUN,
    size: FONT_SIZES.TABLE,
    color: COLORS.TEXT,
  } as Partial<IRunOptions>,

  tableHeader: {
    ...RTL_RUN,
    size: FONT_SIZES.TABLE,
    bold: true,
    color: COLORS.TEXT,
  } as Partial<IRunOptions>,
}

// Table styles
export const TABLE_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 1, color: COLORS.BORDER },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.BORDER },
  left: { style: BorderStyle.SINGLE, size: 1, color: COLORS.BORDER },
  right: { style: BorderStyle.SINGLE, size: 1, color: COLORS.BORDER },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: COLORS.BORDER },
  insideVertical: { style: BorderStyle.SINGLE, size: 1, color: COLORS.BORDER },
}

// Table cell base configuration
export const TABLE_CELL_BASE: Partial<ITableCellOptions> = {
  margins: {
    top: convertMillimetersToTwip(2),
    bottom: convertMillimetersToTwip(2),
    left: convertMillimetersToTwip(3),
    right: convertMillimetersToTwip(3),
  },
}

// Header cell with gray background
export const TABLE_HEADER_CELL: Partial<ITableCellOptions> = {
  ...TABLE_CELL_BASE,
  shading: { fill: COLORS.LIGHT_GRAY },
}

// Format number with thousands separator
export function formatNumber(num: number | undefined): string {
  if (num === undefined || num === null || !Number.isFinite(num)) return '—'
  return num.toLocaleString('he-IL')
}

// Format currency
export function formatCurrency(num: number | undefined): string {
  if (num === undefined || num === null || !Number.isFinite(num)) return '—'
  return `${formatNumber(num)} ש"ח`
}
