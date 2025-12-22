/**
 * A4 PDF Specifications for Hebrew Property Valuation Reports
 * Following Israeli real estate appraisal standards
 */

export const A4_SPECS = {
  // Page dimensions (A4 in mm)
  pageWidth: 210,
  pageHeight: 297,
  
  // Margins (2-2.5cm as per PRD)
  margins: {
    top: 25,      // 2.5cm
    right: 20,    // 2cm  
    bottom: 30,   // 3cm (extra space for footer)
    left: 20      // 2cm
  },
  
  // Content area
  contentWidth: 170,  // 210 - 20 - 20
  contentHeight: 242, // 297 - 25 - 30
  
  // Typography
  fonts: {
    primary: 'Calibri, Arial, David, sans-serif',
    fallback: 'Arial, sans-serif'
  },
  
  // Font sizes (body 12pt, titles up to 13pt)
  fontSize: {
    body: 12,
    title: 13,
    subtitle: 11,
    small: 10,
    large: 14
  },
  
  // Line spacing
  lineHeight: 1.5,
  
  // Colors
  colors: {
    text: '#000000',
    primary: '#1f2937',
    secondary: '#6b7280',
    accent: '#3b82f6',
    border: '#d1d5db',
    background: '#ffffff'
  }
}

export const PDF_STYLES = `
  @page {
    size: A4;
    margin: ${A4_SPECS.margins.top}mm ${A4_SPECS.margins.right}mm ${A4_SPECS.margins.bottom}mm ${A4_SPECS.margins.left}mm;
  }
  
  body {
    font-family: ${A4_SPECS.fonts.primary};
    font-size: ${A4_SPECS.fontSize.body}pt;
    line-height: ${A4_SPECS.lineHeight};
    color: ${A4_SPECS.colors.text};
    direction: rtl;
    text-align: right;
    margin: 0;
    padding: 0;
    background: ${A4_SPECS.colors.background};
  }
  
  .document-header {
    border-bottom: 2px solid ${A4_SPECS.colors.text};
    padding-bottom: 10px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .cover-page {
    margin-bottom: 30px;
  }
  
  .cover-title {
    font-size: ${A4_SPECS.fontSize.large}pt;
    font-weight: bold;
    text-align: center;
    margin-bottom: 20px;
    line-height: 1.3;
  }
  
  .cover-subtitle {
    font-size: ${A4_SPECS.fontSize.title}pt;
    font-weight: bold;
    text-align: center;
    margin-bottom: 15px;
  }
  
  .cover-address {
    font-size: ${A4_SPECS.fontSize.title}pt;
    font-weight: bold;
    text-align: center;
    margin-bottom: 20px;
  }
  
  h1 {
    font-size: ${A4_SPECS.fontSize.large}pt;
    font-weight: bold;
    text-align: center;
    margin-bottom: 20px;
    line-height: 1.3;
  }
  
  h2 {
    font-size: ${A4_SPECS.fontSize.title}pt;
    font-weight: bold;
    text-align: center;
    margin-bottom: 15px;
  }
  
  h3 {
    font-size: ${A4_SPECS.fontSize.subtitle}pt;
    font-weight: bold;
    margin-bottom: 10px;
  }
  
  .section {
    margin-bottom: 30px;
    page-break-inside: avoid;
  }
  
  .info-box {
    background-color: #f8f9fa;
    border: 1px solid ${A4_SPECS.colors.border};
    border-radius: 4px;
    padding: 15px;
    margin-bottom: 15px;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 15px;
    font-size: ${A4_SPECS.fontSize.small}pt;
  }
  
  th, td {
    border: 1px solid #333;
    padding: 8px;
    text-align: center;
  }
  
  th {
    background-color: #f5f5f5;
    font-weight: bold;
  }
  
  .calculation-table {
    background-color: #e8f5e8;
    border: 1px solid #4caf50;
    border-radius: 4px;
    padding: 15px;
  }
  
  .final-valuation {
    background-color: #fff3e0;
    border: 2px solid #ff9800;
    border-radius: 4px;
    padding: 20px;
    font-size: ${A4_SPECS.fontSize.subtitle}pt;
    line-height: 1.6;
    margin-bottom: 30px;
  }
  
  .signature-section {
    background-color: #f8f9fa;
    border: 1px solid ${A4_SPECS.colors.border};
    border-radius: 4px;
    padding: 20px;
    margin-top: 30px;
  }
  
  .signature-container {
    display: flex;
    justify-content: space-between;
    align-items: end;
    margin-top: 20px;
  }
  
  .signature-image {
    max-width: 150px;
    max-height: 80px;
    border: 1px solid #ccc;
  }
  
  .document-footer {
    border-top: 1px solid #ccc;
    padding-top: 10px;
    margin-top: 20px;
    font-size: ${A4_SPECS.fontSize.small}pt;
    color: #666;
    text-align: center;
  }
  
  .page-break {
    page-break-before: always;
  }
  
  .no-break {
    page-break-inside: avoid;
  }
  
  /* Hebrew-specific styles */
  .hebrew-text {
    direction: rtl;
    text-align: right;
  }
  
  .currency {
    font-weight: bold;
  }
  
  .highlight {
    background-color: #fff3cd;
    padding: 2px 4px;
    border-radius: 2px;
  }
`
