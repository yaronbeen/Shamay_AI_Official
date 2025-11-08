import React from 'react'

import type { RenderOptions, ReportData } from './report-types'

interface SectionProps {
  data: ReportData
  options: Required<RenderOptions>
}

const defaultRenderOptions: Required<RenderOptions> = {
  mode: 'preview',
  showPlaceholders: false,
  highlightIssues: false,
  validation: { blockingIssues: [], warnings: [] },
}

function PageContainer({ children, page, sectionId }: { children: React.ReactNode; page: number; sectionId: string }) {
  return (
    <section className="report-page" data-page={page} data-section={sectionId} id={`page-${page}`}>
      <div className="page-inner">{children}</div>
    </section>
  )
}

function CoverPage({ data }: SectionProps) {
  return (
    <PageContainer page={1} sectionId="cover">
      <header className="cover-header">
        {data.headerLogo ? <img src={data.headerLogo} alt="לוגו" className="cover-logo" /> : null}
      </header>

      <div className="cover-title-box">
        {data.documentTitle.value ? <div className="cover-subtitle">חוות דעת בעניין</div> : null}
        <h1 className="cover-title">{data.documentTitle.value || '[כותרת דוח]'}</h1>
        <div className="cover-subtitle">דירת מגורים</div>
        <div className="cover-address">
          <span className="underline">{data.address.value || '[כתובת מלאה]'}</span>
        </div>
      </div>

      <div className="cover-image-wrapper">
        {data.coverImage ? (
          <img src={data.coverImage} alt="תמונה חזיתית" className="cover-image" />
        ) : (
          <div className="cover-image-placeholder">
            <span className="placeholder-icon">📷</span>
            <span>תמונה לא הועלתה</span>
          </div>
        )}
      </div>

      <footer className="report-footer">
        {data.footerLogo ? <img src={data.footerLogo} alt="לוגו" className="footer-logo" /> : null}
        <div className="footer-contact">
          <span>{data.firmName || 'שם המשרד'}</span>
          {data.contactInfo?.phone ? <span>טל׳ {data.contactInfo.phone}</span> : null}
          {data.contactInfo?.email ? <span>{data.contactInfo.email}</span> : null}
          {data.contactInfo?.website ? <span>{data.contactInfo.website}</span> : null}
        </div>
      </footer>
    </PageContainer>
  )
}

function ClientAndDatesPage({ data }: SectionProps) {
  return (
    <PageContainer page={2} sectionId="client-details">
      <header className="page-header">
        <div className="header-left">{data.firmName || 'שם המשרד'}</div>
        <div className="header-right">{data.documentTitle.value || 'חוות דעת שמאית'}</div>
      </header>

      <div className="page-section">
        <h2 className="section-title">פרטי המזמין ותאריכים</h2>
        <div className="details-grid">
          <div className="detail-row">
            <span className="label">לכבוד</span>
            <span className="value">{data.clientName.value || '[שם המזמין]'}</span>
          </div>
          <div className="detail-row">
            <span className="label">מועד הביקור בנכס</span>
            <span className="value">{data.inspectionDate.value || '[תאריך]'}</span>
          </div>
          <div className="detail-row">
            <span className="label">תאריך קובע לשומה</span>
            <span className="value">{data.valuationDate.value || '[תאריך]'}</span>
          </div>
          <div className="detail-row">
            <span className="label">סימוכין / מספר שומה</span>
            <span className="value">{data.referenceNumber.value || '[מספר]'}</span>
          </div>
        </div>

        <div className="fixed-paragraph">
          <p>{data.purpose.value}</p>
          <p>{data.limitation.value}</p>
        </div>
      </div>

      <footer className="report-footer">
        {data.footerLogo ? <img src={data.footerLogo} alt="לוגו" className="footer-logo" /> : null}
        <div className="footer-contact">
          <span>{data.firmName || 'שם המשרד'}</span>
          <span className="page-number" data-page-number></span>
        </div>
      </footer>
    </PageContainer>
  )
}

function SectionOne({ data }: SectionProps) {
  return (
    <PageContainer page={3} sectionId="section-1">
      <header className="page-header">
        <div className="header-left">{data.firmName || 'שם המשרד'}</div>
        <div className="header-right">{data.documentTitle.value || 'חוות דעת שמאית'}</div>
      </header>

      <div className="page-section">
        <h2 className="section-title">1. תיאור הנכס והסביבה</h2>

        <div className="subsection">
          <h3>1.1 הסביבה והקשר העירוני</h3>
          <p>{data.environmentParagraph?.value || 'תיאור סביבת הנכס יוצג כאן.'}</p>
          {data.mapImage ? (
            <figure className="figure">
              <img src={data.mapImage} alt="מפת הסביבה" />
              <figcaption>{data.mapCaption?.value || 'מקור: GovMap'}</figcaption>
            </figure>
          ) : null}
        </div>

        <div className="subsection">
          <h3>1.2 תיאור החלקה והבניין</h3>
          <ul className="bullet-list">
            <li>
              גוש {data.block.value || '[גוש]'} / חלקה {data.parcel.value || '[חלקה]'} / שטח רשום{' '}
              {data.registeredParcelArea.value || '[שטח]'} מ"ר
            </li>
            <li>
              נבנה בשנת {data.constructionYear.value || '[שנה]'}, {data.floors.value || '[קומות]'} קומות,{' '}
              {data.totalUnits.value || '[יחידות]'} יחידות
            </li>
          </ul>
          {data.lotPlanImage ? (
            <figure className="figure">
              <img src={data.lotPlanImage} alt="תשריט החלקה" />
              <figcaption>{data.lotPlanCaption?.value || 'תשריט החלקה'}</figcaption>
            </figure>
          ) : null}
        </div>

        <div className="subsection">
          <h3>1.3 תיאור נשוא השומה (הדירה)</h3>
          <ul className="bullet-list">
            <li>תת חלקה {data.subParcel.value || '[תת]'}</li>
            <li>{data.propertyEssence.value || '[מהות הנכס]'}</li>
            <li>שטח רשום {data.registeredArea.value || '[שטח]'} מ"ר</li>
            <li>שטח בנוי {data.builtArea.value || '[שטח]'} מ"ר</li>
          </ul>
          {data.propertyPhotos && data.propertyPhotos.length ? (
            <div className="photo-grid">
              {data.propertyPhotos.map((photo, index) => (
                <figure className="figure" key={`photo-${index}`}>
                  <img src={photo.src} alt={photo.caption?.value || 'תמונה'} />
                  {photo.caption?.value ? <figcaption>{photo.caption.value}</figcaption> : null}
                </figure>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <footer className="report-footer">
        {data.footerLogo ? <img src={data.footerLogo} alt="לוגו" className="footer-logo" /> : null}
        <div className="footer-contact">
          <span>{data.firmName || 'שם המשרד'}</span>
          <span className="page-number" data-page-number></span>
        </div>
      </footer>
    </PageContainer>
  )
}

export interface ReportRendererProps {
  data: ReportData
  options?: RenderOptions
}

export function ReportRenderer({ data, options }: ReportRendererProps) {
  const mergedOptions: Required<RenderOptions> = {
    ...defaultRenderOptions,
    ...options,
    validation: options?.validation ?? defaultRenderOptions.validation,
  }

  return (
    <div className={`report-document mode-${mergedOptions.mode}`}>
      <CoverPage data={data} options={mergedOptions} />
      <ClientAndDatesPage data={data} options={mergedOptions} />
      <SectionOne data={data} options={mergedOptions} />
      {/* Additional sections (2-6) will be implemented in subsequent iterations */}
    </div>
  )
}

