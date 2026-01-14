/**
 * Document CSS styles for PDF generation
 */

import type { CompanySettings } from "../types";
import { getFontFamily, getFontSize, PAGE_MIN_HEIGHT_MM } from "../constants";

/**
 * Builds the complete CSS stylesheet for the document.
 *
 * @param settings - Company settings for customization
 * @returns CSS string
 */
export const buildBaseCss = (settings?: CompanySettings): string => `
  /* ===== MMBL Professional Report Styles ===== */
  @font-face {
    font-family: 'David Libre';
    font-style: normal;
    font-weight: 400;
    src: url('/fonts/DavidLibre-Regular.ttf') format('truetype');
  }
  @font-face {
    font-family: 'David Libre';
    font-style: normal;
    font-weight: 700;
    src: url('/fonts/DavidLibre-Bold.ttf') format('truetype');
  }
  @font-face {
    font-family: 'Noto Sans Hebrew';
    font-style: normal;
    font-weight: 400;
    src: local('Noto Sans Hebrew'), local('NotoSansHebrew-Regular');
        }
        @page {
          size: A4;
          margin: 0;
        }
  * {
    box-sizing: border-box;
        }
        body {
    font-family: ${getFontFamily(settings)};
    font-size: ${getFontSize(settings)}pt;
    line-height: 1.7;
    margin: 0;
    padding: 0;
    background: #ffffff;
    color: #000000;
          direction: rtl;
          text-align: right;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
  .document {
          width: 100%;
    margin: 0 auto;
          padding: 16px 0 32px;
        }

  /* ===== PAGE STRUCTURE ===== */
  .page {
    position: relative;
    page-break-after: auto;
          page-break-inside: avoid;
    padding: 12mm 18mm 18mm 18mm;
    margin-bottom: 20px;
    background: #ffffff;
    min-height: ${PAGE_MIN_HEIGHT_MM}mm;
  }
  .page.cover {
    position: relative;
          page-break-after: always;
    padding: 8mm 18mm 0mm 18mm; /* No bottom padding - footer is absolute */
    background: white;
    color: #000000;
    border: none;
    min-height: 297mm;
    height: 297mm;
    max-height: 297mm;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* Visual page separator for preview (dashed line between pages) */
  .page:not(.cover):not(:last-of-type)::after {
    content: '';
    display: block;
    position: absolute;
    bottom: -10px;
    left: 10%;
    right: 10%;
    border-bottom: 2px dashed #94a3b8;
    pointer-events: none;
  }

  /* Auto page break visual marker */
  .auto-page-break-marker {
    position: relative;
    margin: 12px 0;
  }
  .auto-page-break-marker::before {
    content: '--- עמוד חדש ---';
    display: block;
    text-align: center;
    color: #94a3b8;
    font-size: 9pt;
    border-top: 1px dashed #94a3b8;
    padding-top: 4px;
  }

  /* Hide visual separators in print/PDF */
  @media print {
    .page::after {
      display: none !important;
    }
    .auto-page-break-marker::before {
      display: none !important;
    }
  }

  /* ===== HEADER - MMBL Style - Compact ===== */
  .page-header {
    text-align: center;
    margin-bottom: 8px;
    padding-bottom: 4px;
  }
  .page-header-logo {
    font-size: 22pt;
    font-weight: 700;
    letter-spacing: 2px;
    color: #1e3a8a;
    margin-bottom: 0;
  }
  .page-header-company {
    font-size: 9pt;
    font-weight: 700;
    color: #1e3a8a;
    margin-bottom: 0;
  }
  .page-header-tagline {
    font-size: 8pt;
    color: #1e3a8a;
  }
  .page-header-brand {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .page-header-brand img {
    max-height: 45px;
  }

  /* ===== FOOTER - Simple large logo at bottom ===== */
  .page-footer {
    position: absolute;
    bottom: 0;
    left: 18mm;
    right: 18mm;
    display: flex;
    justify-content: center;
    align-items: center;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .footer-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
  }
  .footer-logo img {
    max-height: 80px;
    width: auto;
    height: auto;
    display: block;
  }
  .page-number {
    font-size: 8pt;
    color: #000000;
    text-align: left;
    margin-top: 2px;
  }
  .page.cover .page-number {
    display: none;
  }

  /* ===== COVER PAGE ===== */
  .cover-header {
    text-align: center;
    margin-bottom: 5px;
    flex-shrink: 0;
  }
  .cover-title-box {
    background: #f0f0f0;
    border: 1.5px solid #000000;
    padding: 12px 20px;
    margin: 8px auto;
    max-width: 520px;
    text-align: center;
    flex-shrink: 0;
  }
  .cover-title-main {
    font-size: 13pt;
    font-weight: 700;
    color: #000000;
    margin-bottom: 4px;
  }
  .cover-title-sub {
    font-size: 15pt;
    font-weight: 700;
    color: #1e3a8a;
    margin-bottom: 4px;
  }
  .cover-title-type {
    font-size: 12pt;
    font-weight: 700;
    color: #1e3a8a;
    margin-bottom: 6px;
  }
  .cover-address {
    font-size: 12pt;
          font-weight: 700;
    color: #000000;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .cover-image-frame {
    width: 100%;
    max-width: 520px;
    margin: 5px auto 0;
    border: 1.5px solid #000000;
    overflow: hidden;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
    max-height: 100%;
  }
  .cover-image-frame img {
    width: 100%;
    height: 100%;
    max-height: 100%;
    display: block;
    border-radius: 0;
    object-fit: cover;
  }
  /* Cover footer - Simple large logo at bottom */
  .cover-footer-container {
    position: absolute !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    width: 100% !important;
    height: auto !important;
    margin: 0 !important;
    padding: 10mm 18mm 5mm 18mm !important;
    line-height: 0 !important;
    background: white !important;
    flex-shrink: 0;
    border: none;
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    z-index: 10;
  }
  .cover-footer-container img {
    display: block !important;
    width: auto !important;
    max-width: 100% !important;
    max-height: 120px !important;
    height: auto !important;
    object-fit: contain !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  /* ===== CHAPTER & SECTION TITLES ===== */
  .chapter-title {
    font-size: 14pt;
    font-weight: 700;
    color: #1e3a8a;
    margin: 20px 0 16px;
    text-align: right;
    text-decoration: underline;
    text-underline-offset: 4px;
    /* Page break control - avoid orphaned chapter headers */
    break-after: avoid;
    break-inside: avoid;
    page-break-after: avoid;
    page-break-inside: avoid;
  }
  /* Wrapper for chapter header + first content to keep together */
  .chapter-header-group {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .section-title {
    font-size: 12pt;
    font-weight: 700;
    color: #000000;
    margin: 16px 0 10px;
    text-align: right;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .sub-title {
    font-size: 11pt;
    font-weight: 700;
    color: #000000;
    margin: 12px 0 8px;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .sub-title::before {
    display: none;
  }

  /* ===== PAGE BODY ===== */
  .page-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-bottom: 45px;
  }
  p {
    margin: 0 0 8px 0;
    color: #000000;
    text-align: justify;
    line-height: 1.8;
  }
  .page-body p + p {
    margin-top: 0;
  }

  /* ===== TABLES - Clean Professional Style - Keep on same page ===== */
  .table {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0 12px;
    font-size: 9.5pt;
    background: #ffffff;
    table-layout: auto;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .table th,
  .table td {
    border: none;
    border-bottom: 1px solid #cccccc;
    padding: 6px 8px;
    text-align: right;
    vertical-align: middle;
    word-break: break-word;
    line-height: 1.5;
  }
  .table thead th {
    border-bottom: 2px solid #000000;
    background: transparent;
    font-weight: 700;
    color: #000000;
  }
  tr, th, td {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .table th {
    background: transparent;
    font-weight: 700;
    color: #000000;
  }
  .table.comparables {
    font-size: 8.5pt;
  }
  .table.comparables th,
  .table.comparables td {
    padding: 4px 6px;
    white-space: nowrap;
    border: none;
    border-bottom: 1px solid #cccccc;
  }
  .table.comparables thead th {
    border-bottom: 2px solid #000000;
  }
  .table.comparables th {
    font-size: 8.5pt;
    font-weight: 700;
  }
  .table.comparables .address-cell {
    white-space: normal;
    word-wrap: break-word;
    max-width: 100px;
  }
  /* Keep tables with their headers on same page */
  .table-wrapper {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .details-table {
    width: auto;
  }
  .details-table th,
  .details-table td {
    border: none;
    border-bottom: 1px solid #eeeeee;
  }
  .details-table th {
    width: 120px;
    font-weight: 600;
    background: #ffffff;
    color: #000000;
    text-align: right;
  }
  .details-table td {
    font-weight: 400;
  }

  /* ===== CUSTOM UPLOADED TABLES ===== */
  .custom-table-container {
    margin: 20px 0;
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    padding: 16px;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .custom-table-container .sub-title {
    font-size: 11pt;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 2px solid #e5e7eb;
  }
  .custom-table-container .table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9.5pt;
    border: 1px solid #d1d5db;
  }
  .custom-table-container .table th,
  .custom-table-container .table td {
    border-bottom: 1px solid #e5e7eb;
    padding: 8px 12px;
    text-align: right;
    vertical-align: middle;
  }
  .custom-table-container .table thead th {
    background: #f3f4f6;
    border-bottom: 2px solid #1f2937;
    font-weight: 700;
    color: #1f2937;
  }
  /* Striped rows for better readability */
  .custom-table-container .table tbody tr:nth-child(even) {
    background: #f9fafb;
  }
  /* Hover effect for rows */
  .custom-table-container .table tbody tr:hover {
    background: #f3f4f6;
  }
  /* Edit mode hover effects for custom tables */
  .custom-table-container[data-edit-mode="true"] {
    outline: 2px dashed transparent;
    transition: outline-color 0.2s;
  }
  .custom-table-container[data-edit-mode="true"]:hover {
    outline-color: rgba(59, 130, 246, 0.4);
  }
  .custom-table-container[data-edit-mode="true"] td:hover,
  .custom-table-container[data-edit-mode="true"] th:hover {
    background: rgba(191, 219, 254, 0.3);
    cursor: text;
  }

  /* ===== FOOTNOTES ===== */
  .page-footnotes {
    position: absolute;
    bottom: 60px;
    right: 18mm;
    left: 18mm;
    font-size: 9pt;
    line-height: 1.4;
    border-top: 1px solid #000000;
    padding-top: 8px;
  }
  .page-footnotes p {
    margin: 2px 0;
    text-align: right;
  }
  .footnote-ref {
    font-size: 8pt;
    vertical-align: super;
    color: #1e3a8a;
    cursor: pointer;
  }
  .footnote-number {
    font-weight: 700;
    margin-left: 4px;
  }

  /* ===== LISTS ===== */
  ul {
    margin: 8px 0;
    padding-right: 20px;
    color: #000000;
  }
  ul li {
    margin-bottom: 6px;
    line-height: 1.7;
  }
  ul.bullet-list {
    list-style: none;
    padding: 0;
    margin: 8px 0;
  }
  ul.bullet-list li {
    position: relative;
    padding: 0 20px 0 0;
    margin-bottom: 6px;
    background: transparent;
    border-radius: 0;
    border: none;
  }
  ul.bullet-list li::before {
    content: '-';
    font-size: 12pt;
    line-height: 1;
    position: absolute;
    right: 0;
    top: 2px;
    color: #000000;
  }
  .legal-list {
    list-style: none;
    padding: 0;
    margin: 8px 0;
  }
  .legal-list li {
    padding: 6px 20px 6px 0;
    position: relative;
    border-radius: 0;
    border: none;
    background: transparent;
    margin-bottom: 10px;
    line-height: 1.6;
  }
  .legal-list li::before {
    content: '-';
    position: absolute;
    right: 0;
    top: 6px;
  }

  /* ===== IMAGES & MEDIA ===== */
  img {
    border-radius: 0;
    display: block;
          max-width: 100%;
          height: auto;
    break-inside: avoid;
          page-break-inside: avoid;
        }
  figure {
    margin: 0;
  }
  .media-gallery {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin: 12px 0;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .media-card {
    background: #ffffff;
    border: 1px solid #cccccc;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 180px; /* Fixed height for uniformity in 2x3 grid */
    margin: 0;
    break-inside: avoid;
          page-break-inside: avoid;
        }
  .media-card img {
          width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 0;
  }
  .media-caption {
    font-size: 8pt;
    color: #666666;
    padding: 4px 6px;
    text-align: center;
  }
  /* Garmushka (floor plan) - full size without cropping */
  .garmushka-card {
    background: #ffffff;
    border: 1px solid #cccccc;
    display: flex;
    flex-direction: column;
    break-inside: avoid;
          page-break-inside: avoid;
    margin: 16px 0;
    align-items: center;
  }
  .garmushka-card img {
    width: 100%;
    max-width: 100%;
    height: auto;
    object-fit: contain;
    border-radius: 0;
  }
  .garmushka-card .media-caption {
    font-size: 9pt;
    padding: 8px;
  }
  .side-by-side-images {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    margin: 12px 0;
  }
  .side-by-side-images figure {
    border: 1px solid #cccccc;
    overflow: hidden;
  }
  .side-by-side-images img {
    width: 100%;
    height: auto;
  }

  /* ===== INFO SECTIONS ===== */
  .info-grid {
    display: block;
    margin: 8px 0;
        }
  .info-grid p {
    margin: 0 0 4px;
    font-weight: 400;
  }
  .info-grid p strong {
    font-weight: 700;
  }
  .key-value {
    display: flex;
    justify-content: flex-start;
    gap: 20px;
    margin-bottom: 4px;
  }
  .key-value .key {
    font-weight: 700;
    min-width: 100px;
  }

  /* ===== BOUNDARIES SECTION ===== */
  .boundaries-section {
    margin: 12px 0;
  }
  .boundary-row {
    display: flex;
    gap: 8px;
    margin-bottom: 4px;
  }
  .boundary-direction {
    font-weight: 700;
    min-width: 50px;
  }

  /* ===== NOTES & CALLOUTS ===== */
  .page-note {
    font-size: 9pt;
    color: #000000;
    margin-top: 20px;
    padding-top: 10px;
    border-top: 1px solid #000000;
    line-height: 1.5;
  }
  .muted {
    color: #666666;
  }
  .callout {
    border: 1px solid #cccccc;
    padding: 12px 14px;
    margin: 12px 0;
    background: #f9f9f9;
  }

  /* ===== VALUATION SECTION ===== */
  .valuation-summary {
    margin: 16px 0;
  }
  .valuation-card {
    padding: 12px;
    background: #ffffff;
    border: 1px solid #000000;
    margin-bottom: 8px;
  }
  .valuation-final {
    font-size: 12pt;
    font-weight: 700;
    margin: 16px 0;
  }
  .valuation-final-amount {
    text-decoration: underline;
  }

  /* ===== SIGNATURE ===== */
  .signature-block {
    margin-top: 40px;
    text-align: left;
  }
  .signature-image {
    max-width: 180px;
    max-height: 100px;
    border: none;
    padding: 0;
    border-radius: 0;
  }
  .signature-placeholder {
    width: 160px;
    height: 80px;
    border: 1px dashed #999999;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 10pt;
    color: #999999;
  }

  /* ===== UTILITY CLASSES ===== */
  .section-block {
          break-inside: avoid;
          page-break-inside: avoid;
    margin-bottom: 8px;
  }
  .section-block p {
    margin: 4px 0;
  }
  .page-break {
    break-before: page;
    page-break-before: always;
  }
  .rtl {
    direction: rtl;
    unicode-bidi: plaintext;
  }
  .num {
          direction: ltr;
          unicode-bidi: embed;
          display: inline-block;
        }
  .bold-text {
    font-weight: 700;
  }
  .rich-text {
    white-space: pre-wrap;
    line-height: 1.7;
  }
  .rich-text .section-heading {
    display: block;
    font-weight: 700;
    margin-top: 12px;
  }

  /* ===== PAGE BREAK CONTROL ===== */
  /* Keep titles with following content */
  .chapter-title, .sub-title {
    page-break-after: avoid;
    break-after: avoid;
  }

  /* Table row handling - keep rows together */
  tr {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* Repeat table headers on each page */
  thead {
    display: table-header-group;
  }

  /* Orphan/widow control */
  p {
    orphans: 3;
    widows: 3;
  }

  /* Keep bullet list items together (min 2) */
  .bullet-list li:first-child,
  .bullet-list li:first-child + li {
    page-break-before: avoid;
  }

  /* ===== PRINT STYLES ===== */
        @media print {
    body {
      background: #ffffff;
    }
    .document {
      padding: 0;
    }
    .page {
      box-shadow: none;
      margin: 0;
      border: none;
      padding: 10mm 18mm 15mm 18mm;
    }
    .page.cover {
      border: none;
      padding: 8mm 18mm 35mm 18mm;
      min-height: 297mm;
      display: flex;
      flex-direction: column;
    }
    .cover-footer-container {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
    }
    .page-footer {
      position: absolute;
      bottom: 0;
      left: 18mm;
      right: 18mm;
    }
    thead {
      display: table-header-group;
    }
    tfoot {
      display: table-footer-group;
    }
    /* Keep tables and images together on same page */
    .table, .table-wrapper, .media-gallery, .section-block {
      break-inside: avoid;
      page-break-inside: avoid;
  }
  }

  /* ===== COMPARABLES TABLE WRAPPER ===== */
  .comparables-table-block {
    margin: 12px 0;
  }
  .comparables-table .table {
    font-size: 9.5pt;
  }
  .comparables-table .table th,
  .comparables-table .table td {
    padding: 8px 6px;
    line-height: 1.5;
  }

  /* ===== OPENING PAGE STYLES ===== */
  .opening-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 12px;
    font-size: 10pt;
  }
  .opening-recipient {
    margin-bottom: 10px;
  }
  .opening-title-section {
    text-align: center;
    margin: 12px 0;
  }
  .opening-title-section .cover-title-main {
    font-size: 12pt;
  }
  .opening-title-section .cover-title-sub {
    font-size: 13pt;
  }
  .opening-title-section .cover-title-type {
    font-size: 11pt;
  }
  .opening-title-section .cover-address {
    font-size: 10pt;
  }
`;
