import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { AppraisalDocument } from './template';
import { ReportData } from './types';

/**
 * Renders a property appraisal PDF document from report data
 * @param reportData - Complete report data structure
 * @returns PDF blob (for browser use)
 */
export async function renderPdf(reportData: ReportData): Promise<Blob> {
  // Validate required fields
  validateReportData(reportData);
  
  // Render PDF
  const pdfDoc = pdf(React.createElement(AppraisalDocument, { data: reportData }));
  const pdfBlob = await pdfDoc.toBlob();
  
  return pdfBlob;
}

/**
 * Renders PDF and converts to Buffer (for Node.js/server environments)
 * Note: This requires Node.js environment with Buffer support
 */
export async function renderPdfToBuffer(reportData: ReportData): Promise<Buffer> {
  // Validate required fields
  validateReportData(reportData);
  
  // Render PDF
  const pdfDoc = pdf(React.createElement(AppraisalDocument, { data: reportData }));
  
  // In Node.js, use toBuffer() which returns a Promise<Buffer>
  // In browser, use toBlob() and convert
  if (typeof Buffer !== 'undefined') {
    return await pdfDoc.toBuffer();
  } else {
    const blob = await pdfDoc.toBlob();
    const arrayBuffer = await blob.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}

/**
 * Validates report data and throws errors for missing required fields
 */
function validateReportData(data: ReportData): void {
  const errors: string[] = [];
  
  // Meta validation
  if (!data.meta.documentTitle) errors.push('meta.documentTitle is required');
  if (!data.meta.reportDate) errors.push('meta.reportDate is required');
  if (!data.meta.referenceNumber) errors.push('meta.referenceNumber is required');
  if (!data.meta.clientName) errors.push('meta.clientName is required');
  if (!data.meta.inspectionDate) errors.push('meta.inspectionDate is required');
  if (!data.meta.valuationDate) errors.push('meta.valuationDate is required');
  if (!data.meta.appraiserName) errors.push('meta.appraiserName is required');
  
  // Address validation
  if (!data.address.street) errors.push('address.street is required');
  if (!data.address.buildingNumber) errors.push('address.buildingNumber is required');
  if (!data.address.city) errors.push('address.city is required');
  
  // Section 1 validation
  if (!data.section1.environmentDescription) errors.push('section1.environmentDescription is required');
  if (!data.section1.parcel.gush) errors.push('section1.parcel.gush is required');
  if (!data.section1.parcel.helka) errors.push('section1.parcel.helka is required');
  if (!data.section1.property.rooms) errors.push('section1.property.rooms is required');
  if (!data.section1.property.floor) errors.push('section1.property.floor is required');
  if (!data.section1.property.internalLayoutAndFinish) {
    errors.push('section1.property.internalLayoutAndFinish is required');
  }
  
  // Section 2 validation
  if (!data.section2.legalDisclaimerText) {
    errors.push('section2.legalDisclaimerText is required');
  }
  
  // Section 3 validation
  if (!data.section3.environmentQualityText) {
    errors.push('section3.environmentQualityText is required');
  }
  
  // Section 4 validation
  if (!data.section4.introText) errors.push('section4.introText is required');
  
  // Section 5 validation
  if (!data.section5.comparablesTable || data.section5.comparablesTable.length === 0) {
    errors.push('section5.comparablesTable is required and must have at least one entry');
  }
  if (!data.section5.valuationCalc) {
    errors.push('section5.valuationCalc is required');
  }
  
  // Section 6 validation
  if (!data.section6.finalValueIls) errors.push('section6.finalValueIls is required');
  if (!data.section6.finalValueText) errors.push('section6.finalValueText is required');
  if (!data.section6.declarationText) errors.push('section6.declarationText is required');
  if (!data.section6.standardsText) errors.push('section6.standardsText is required');
  
  if (errors.length > 0) {
    throw new Error(`Validation failed:\n${errors.join('\n')}`);
  }
}

// Re-export converter function
export { convertValuationDataToReportData } from './converter'

