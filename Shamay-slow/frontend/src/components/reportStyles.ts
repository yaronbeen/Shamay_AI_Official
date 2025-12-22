export const REPORT_CSS = `
@page {
  size: A4;
  margin: 2cm 2.5cm;
}

.report-document {
  font-family: 'Noto Sans Hebrew', 'Arial', 'David', sans-serif;
  direction: rtl;
  text-align: right;
  color: #1f2933;
  background: #fff;
  font-size: 12pt;
  line-height: 1.5;
}

.report-document .report-page {
  page-break-after: always;
  position: relative;
  min-height: calc(297mm - 4cm);
  display: flex;
  padding-bottom: 2.5cm;
}

.report-document .report-page:last-of-type {
  page-break-after: auto;
}

.report-document .page-inner {
  width: 100%;
  position: relative;
}

.cover-header {
  display: flex;
  justify-content: center;
  margin-bottom: 32px;
}

.cover-logo {
  max-height: 80px;
}

.cover-title-box {
  border: 1px solid #d1d5db;
  background: #f8fafc;
  padding: 24px;
  text-align: center;
  margin: 0 auto 24px;
  max-width: 420px;
}

.cover-title {
  font-size: 26pt;
  margin: 12px 0;
  font-weight: 700;
}

.cover-subtitle {
  font-size: 14pt;
  color: #334155;
}

.cover-address {
  font-size: 13pt;
  margin-top: 12px;
}

.cover-address .underline {
  text-decoration: underline;
}

.cover-image-wrapper {
  margin: 32px auto;
  max-width: 520px;
}

.cover-image {
  width: 100%;
  height: auto;
  border-radius: 8px;
  object-fit: cover;
}

.cover-image-placeholder {
  border: 2px dashed #cbd5e1;
  color: #94a3b8;
  padding: 64px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  border-radius: 8px;
  font-size: 14pt;
}

.placeholder-icon {
  font-size: 24pt;
}

.report-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 2px solid #e2e8f0;
  padding-top: 12px;
  font-size: 10pt;
}

.footer-logo {
  max-height: 36px;
}

.footer-contact {
  display: flex;
  gap: 12px;
  align-items: center;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10pt;
  color: #475569;
  margin-bottom: 24px;
}

.section-title {
  font-size: 13pt;
  font-weight: 700;
  margin-bottom: 16px;
}

.subsection {
  margin-bottom: 24px;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 24px;
  margin-bottom: 20px;
}

.detail-row {
  display: flex;
  flex-direction: column;
}

.detail-row .label {
  font-weight: 600;
  color: #475569;
  margin-bottom: 4px;
}

.detail-row .value {
  font-weight: 500;
}

.fixed-paragraph p {
  margin-bottom: 12px;
}

.bullet-list {
  list-style: none;
  padding: 0;
  margin: 12px 0;
}

.bullet-list li {
  position: relative;
  padding-right: 14px;
  margin-bottom: 8px;
}

.bullet-list li::before {
  content: '•';
  position: absolute;
  right: 0;
  top: 0;
  color: #64748b;
}

.figure {
  margin: 16px 0;
  page-break-inside: avoid;
}

.figure img {
  max-width: 100%;
  border-radius: 6px;
}

.figure figcaption {
  font-size: 10pt;
  color: #64748b;
  margin-top: 6px;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.page-number::before {
  content: attr(data-page-label);
}

@media screen {
  .report-document {
    margin: 0 auto;
    background: #f1f5f9;
    padding: 24px;
  }

  .report-page {
    background: #fff;
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
    margin: 0 auto 32px;
    max-width: 794px;
  }
}
`

