// PDF specifications for document generation
export const pdfSpecs = {
  format: 'A4' as const,
  margin: {
    top: '20mm',
    right: '20mm',
    bottom: '20mm',
    left: '20mm',
  },
  printBackground: true,
  preferCSSPageSize: true,
}

