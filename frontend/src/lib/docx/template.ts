import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  ImageRun,
  AlignmentType,
  TextDirection,
  BorderStyle,
  WidthType,
  PageBreak,
  HeadingLevel,
  convertMillimetersToTwip,
  ISectionOptions,
  UnderlineType,
} from 'docx'
import { ReportData } from '../pdf/types'
import {
  COLORS,
  FONTS,
  FONT_SIZES,
  PAGE,
  RTL_PARAGRAPH,
  RTL_RUN,
  TABLE_BORDERS,
  TABLE_CELL_BASE,
  TABLE_HEADER_CELL,
  formatNumber,
  formatCurrency,
} from './styles'

// Static text constants (from pdf/constants.ts)
const PURPOSE_TEXT = 'שומת מקרקעין בקריטריון של קונה מרצון למוכר מרצון (שווי שוק).'
const LIABILITY_LIMITATION_TEXT =
  'אחריותו של החתום מטה מוגבלת למזמין השומה ולמטרת השומה בלבד. שימוש שלא בהתאם לאמור לעיל יעשה לאחר קבלת אישור מראש ובכתב מאת החתום מטה בלבד'
const LEGAL_DISCLAIMER_TEXT =
  'אין בתיאור המצב המשפטי כדי להוות חוות דעת משפטן. במידה וקיימים מסמכים שלא הובאו לידיעתו, ייתכן ויהיה בהם כדי לשנות את ההערכה.'
const SECTION4_INTRO_TEXT =
  'באומדן שווי הנכס הובאו בחשבון, בין היתר, הגורמים והשיקולים הבאים:'
const SECTION6_DECLARATION_TEXT =
  'הננו מצהירים, כי אין לנו כל עניין אישי בנכס נשוא השומה, בבעלי הזכויות בו במזמין השומה.'
const SECTION6_STANDARDS_TEXT =
  'הדו"ח הוכן על פי תקנות שמאי המקרקעין (אתיקה מקצועית), התשכ"ו – 1966 ועל פי התקנים המקצועיים של הועדה לתקינה שמאית.'
const SECTION6_FREE_FROM_DEBTS_TEXT =
  'הכול במצבו הנוכחי, כריק, פנוי וחופשי מכל מחזיק, חוב ושיעבוד, נכון לתאריך חוות-דעת זו.'

// Helper to create RTL paragraph
function rtlParagraph(
  text: string,
  options: {
    bold?: boolean
    size?: number
    color?: string
    alignment?: (typeof AlignmentType)[keyof typeof AlignmentType]
    spacing?: { before?: number; after?: number }
    underline?: boolean
  } = {}
): Paragraph {
  return new Paragraph({
    bidirectional: true,
    alignment: options.alignment || AlignmentType.RIGHT,
    spacing: options.spacing || { after: 100 },
    children: [
      new TextRun({
        text,
        font: FONTS.HEBREW,
        size: options.size || FONT_SIZES.BODY,
        bold: options.bold,
        color: options.color || COLORS.TEXT,
        rightToLeft: true,
        underline: options.underline ? { type: UnderlineType.SINGLE } : undefined,
      }),
    ],
  })
}

// Helper to create chapter title
function chapterTitle(text: string): Paragraph {
  return new Paragraph({
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
    spacing: { before: 300, after: 150 },
    children: [
      new TextRun({
        text,
        font: FONTS.HEBREW,
        size: FONT_SIZES.TITLE,
        bold: true,
        color: COLORS.PRIMARY,
        rightToLeft: true,
        underline: { type: UnderlineType.SINGLE },
      }),
    ],
  })
}

// Helper to create section title
function sectionTitle(text: string): Paragraph {
  return new Paragraph({
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
    spacing: { before: 200, after: 100 },
    children: [
      new TextRun({
        text,
        font: FONTS.HEBREW,
        size: FONT_SIZES.SECTION_TITLE,
        bold: true,
        color: COLORS.TEXT,
        rightToLeft: true,
        underline: { type: UnderlineType.SINGLE },
      }),
    ],
  })
}

// Helper to create bullet point
function bulletPoint(text: string): Paragraph {
  return new Paragraph({
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
    spacing: { after: 80 },
    children: [
      new TextRun({
        text: `• ${text}`,
        font: FONTS.HEBREW,
        size: FONT_SIZES.BODY,
        rightToLeft: true,
      }),
    ],
  })
}

// Helper to create table cell
function tableCell(
  text: string,
  options: { header?: boolean; width?: number } = {}
): TableCell {
  return new TableCell({
    ...TABLE_CELL_BASE,
    ...(options.header ? TABLE_HEADER_CELL : {}),
    width: options.width ? { size: options.width, type: WidthType.PERCENTAGE } : undefined,
    children: [
      new Paragraph({
        bidirectional: true,
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({
            text,
            font: FONTS.HEBREW,
            size: FONT_SIZES.TABLE,
            bold: options.header,
            rightToLeft: true,
          }),
        ],
      }),
    ],
  })
}

// Images storage for async loading
export interface ImageData {
  buffer: Buffer
  width: number
  height: number
}

export type ImageMap = Map<string, ImageData>

// Build Cover Page
function buildCoverPage(data: ReportData, images: ImageMap): (Paragraph | Table)[] {
  const fullAddress =
    data.address.fullAddressLine ||
    `רחוב ${data.address.street} ${data.address.buildingNumber}${data.address.neighborhood ? ` שכונת ${data.address.neighborhood}` : ''}, ${data.address.city}`

  const content: (Paragraph | Table)[] = []

  // Company header
  content.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 50 },
      children: [
        new TextRun({
          text: 'MMBL.',
          font: FONTS.HEBREW,
          size: 56,
          bold: true,
          color: COLORS.PRIMARY,
        }),
      ],
    })
  )

  content.push(
    rtlParagraph(data.cover.companyName || 'מנשה-ליבוביץ שמאות מקרקעין', {
      bold: true,
      size: FONT_SIZES.TITLE,
      color: COLORS.PRIMARY,
      alignment: AlignmentType.CENTER,
    })
  )

  content.push(
    rtlParagraph(data.cover.companyTagline || 'ליווי וייעוץ בתחום המקרקעין', {
      size: FONT_SIZES.SMALL,
      color: COLORS.PRIMARY,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  )

  // Title box
  content.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 100 },
      shading: { fill: COLORS.LIGHT_GRAY },
      border: {
        top: { style: BorderStyle.SINGLE, size: 1, color: COLORS.TEXT },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.TEXT },
        left: { style: BorderStyle.SINGLE, size: 1, color: COLORS.TEXT },
        right: { style: BorderStyle.SINGLE, size: 1, color: COLORS.TEXT },
      },
      children: [
        new TextRun({
          text: 'חוות דעת בעניין',
          font: FONTS.HEBREW,
          size: FONT_SIZES.TITLE,
          bold: true,
          rightToLeft: true,
        }),
      ],
    })
  )

  content.push(
    rtlParagraph('אומדן שווי זכויות במקרקעין', {
      bold: true,
      size: 32,
      color: COLORS.PRIMARY,
      alignment: AlignmentType.CENTER,
    })
  )

  content.push(
    rtlParagraph('דירת מגורים', {
      bold: true,
      size: FONT_SIZES.SECTION_TITLE,
      color: COLORS.PRIMARY,
      alignment: AlignmentType.CENTER,
    })
  )

  content.push(
    rtlParagraph(fullAddress, {
      bold: true,
      size: FONT_SIZES.SECTION_TITLE,
      color: COLORS.PRIMARY,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    })
  )

  // Cover image
  if (data.cover.coverImage?.src && images.has('coverImage')) {
    const imgData = images.get('coverImage')!
    content.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 200 },
        children: [
          new ImageRun({
            data: imgData.buffer,
            transformation: {
              width: Math.min(imgData.width, 450),
              height: Math.min(imgData.height, 350),
            },
            type: 'png',
          }),
        ],
      })
    )
  }

  // Footer services
  content.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 2, color: COLORS.PRIMARY },
      },
      children: [
        new TextRun({
          text:
            data.cover.companyServices ||
            'שמאות מקרקעין - התחדשות עירונית - דוחות אפס וליווי פיננסי - מיסוי מקרקעין',
          font: FONTS.HEBREW,
          size: FONT_SIZES.SMALL,
          bold: true,
          color: COLORS.PRIMARY,
          rightToLeft: true,
        }),
      ],
    })
  )

  // Contact info
  if (data.cover.companyContact) {
    const contactParts: string[] = []
    if (data.cover.companyContact.phone) contactParts.push(`טלפון: ${data.cover.companyContact.phone}`)
    if (data.cover.companyContact.email) contactParts.push(`דוא"ל: ${data.cover.companyContact.email}`)
    if (contactParts.length > 0) {
      content.push(rtlParagraph(contactParts.join(' | '), { size: FONT_SIZES.FOOTNOTE, alignment: AlignmentType.CENTER }))
    }
    if (data.cover.companyContact.address) {
      content.push(rtlParagraph(`כתובת משרדנו: ${data.cover.companyContact.address}`, { size: FONT_SIZES.FOOTNOTE, alignment: AlignmentType.CENTER }))
    }
  }

  return content
}

// Build Client Details Page (Page 2)
function buildClientDetailsPage(data: ReportData): (Paragraph | Table)[] {
  const fullAddress =
    data.address.fullAddressLine ||
    `${data.address.street} ${data.address.buildingNumber}${data.address.neighborhood ? ` שכונת ${data.address.neighborhood}` : ''}, ${data.address.city}`

  const openingDate = data.openingPage?.openingDate || data.meta.reportDate
  const summaryTable = data.openingPage?.propertySummaryTable || {
    gush: data.section1.parcel.gush,
    helka: data.section1.parcel.helka,
    area: data.section1.parcel.parcelAreaSqm,
  }

  const content: (Paragraph | Table)[] = []

  // Date and reference
  content.push(
    rtlParagraph(`תאריך: ${openingDate}`, { size: FONT_SIZES.SMALL })
  )
  content.push(
    rtlParagraph(`סימנון: ${data.meta.referenceNumber}`, { size: FONT_SIZES.SMALL, spacing: { after: 200 } })
  )

  // Client name
  content.push(
    rtlParagraph(
      `לכבוד${data.meta.clientTitle ? `, ${data.meta.clientTitle}` : ''} ${data.meta.clientName}`,
      { spacing: { after: 200 } }
    )
  )

  // Title section
  content.push(
    rtlParagraph('חוות דעת בעניין', { bold: true, size: FONT_SIZES.TITLE, alignment: AlignmentType.CENTER })
  )
  content.push(
    rtlParagraph('אומדן שווי זכויות במקרקעין', { bold: true, size: 32, color: COLORS.PRIMARY, alignment: AlignmentType.CENTER })
  )
  content.push(
    rtlParagraph('דירת מגורים', { bold: true, size: FONT_SIZES.SECTION_TITLE, color: COLORS.PRIMARY, alignment: AlignmentType.CENTER })
  )
  content.push(
    rtlParagraph(fullAddress, { size: FONT_SIZES.BODY, alignment: AlignmentType.CENTER, spacing: { after: 200 } })
  )

  // Introduction
  content.push(
    rtlParagraph(
      'נתבקשתי לאמוד את שווי הזכויות בנכס שבגדון. לצורך הכנת השומה נערך ביקור בנכס נערך סקר מחירי שוק, ולהלן חוות הדעת:'
    )
  )

  // Purpose
  content.push(rtlParagraph('מטרת חוות הדעת:', { bold: true, spacing: { before: 150 } }))
  content.push(rtlParagraph(PURPOSE_TEXT))
  content.push(rtlParagraph(LIABILITY_LIMITATION_TEXT))

  // Client details
  content.push(rtlParagraph('מזמין חוות הדעת:', { bold: true, spacing: { before: 150 } }))
  content.push(rtlParagraph(`${data.meta.clientTitle ? `${data.meta.clientTitle} ` : ''}${data.meta.clientName}.`))

  // Visit date
  content.push(rtlParagraph('מועד הביקור בנכס:', { bold: true, spacing: { before: 100 } }))
  content.push(
    rtlParagraph(
      `${data.meta.inspectionDate}, על ידי ${data.meta.appraiserName}${data.meta.appraiserLicenseNumber ? `, שמאי מקרקעין מס' ${data.meta.appraiserLicenseNumber}` : ', שמאי מקרקעין'}. לביקור התלוותה בעלת הזכויות בנכס.`
    )
  )

  // Valuation date
  content.push(rtlParagraph('תאריך קובע לשומה:', { bold: true, spacing: { before: 100 } }))
  content.push(rtlParagraph(`${data.meta.valuationDate}, מועד הביקור בנכס.`))

  // Property summary table
  content.push(
    rtlParagraph('ריכוז פרטי הנכס', { bold: true, alignment: AlignmentType.CENTER, spacing: { before: 200 } })
  )

  content.push(
    new Table({
      visuallyRightToLeft: true,
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: TABLE_BORDERS,
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            tableCell('גוש', { header: true }),
            tableCell('חלקה', { header: true }),
            tableCell('שטח', { header: true }),
          ],
        }),
        new TableRow({
          children: [
            tableCell(summaryTable.gush || data.section1.parcel.gush || '—'),
            tableCell(summaryTable.helka || data.section1.parcel.helka || '—'),
            tableCell(
              summaryTable.area
                ? `${formatNumber(summaryTable.area)} מ"ר`
                : data.section1.parcel.parcelAreaSqm
                  ? `${formatNumber(data.section1.parcel.parcelAreaSqm)} מ"ר`
                  : '—'
            ),
          ],
        }),
      ],
    })
  )

  return content
}

// Build Section 1 - Property Description
function buildSection1(data: ReportData, images: ImageMap): (Paragraph | Table)[] {
  const parcel = data.section1.parcel
  const property = data.section1.property
  const content: (Paragraph | Table)[] = []

  content.push(chapterTitle('1. תיאור הנכס והסביבה'))

  // 1.1 Environment
  content.push(sectionTitle('1.1 הסביבה והקשר העירוני'))
  content.push(rtlParagraph(data.section1.environmentDescription || 'שדה חובה חסר: תיאור סביבה'))

  // Environment map
  if (data.section1.environmentMap?.src && images.has('environmentMap')) {
    const imgData = images.get('environmentMap')!
    content.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 100, after: 50 },
        children: [
          new ImageRun({
            data: imgData.buffer,
            transformation: {
              width: Math.min(imgData.width, 450),
              height: Math.min(imgData.height, 300),
            },
            type: 'png',
          }),
        ],
      })
    )
    content.push(
      rtlParagraph(data.section1.environmentMap.caption, {
        size: FONT_SIZES.FOOTNOTE,
        color: COLORS.MUTED,
        alignment: AlignmentType.CENTER,
      })
    )
  }

  // 1.2 Parcel description
  content.push(sectionTitle('1.2 תיאור החלקה והבניין'))

  const parcelText =
    parcel.numberOfBuildings && parcel.numberOfBuildings > 1
      ? `חלקה ${parcel.helka} בגוש ${parcel.gush}, בשטח קרקע רשום של ${formatNumber(parcel.parcelAreaSqm)} מ"ר${parcel.parcelShape ? `, צורתה ${parcel.parcelShape}` : ''}${parcel.parcelSurface ? `, פני הקרקע ${parcel.parcelSurface}` : ''}. על החלקה ${parcel.numberOfBuildings} בנייני מגורים${parcel.buildingYear ? `, אשר הוקמו בהתאם ל${parcel.buildingYear}` : ''}. הבניינים בני ${parcel.buildingFloors || '—'} קומות${parcel.buildingUnits ? `, כל אחד כולל ${parcel.buildingUnits} יח"ד` : ''}.`
      : `חלקה ${parcel.helka} בגוש ${parcel.gush}, בשטח קרקע רשום של ${formatNumber(parcel.parcelAreaSqm)} מ"ר${parcel.parcelShape ? `, צורתה ${parcel.parcelShape}` : ''}${parcel.parcelSurface ? `, פני הקרקע ${parcel.parcelSurface}` : ''}. על החלקה בניין מגורים${parcel.buildingYear ? `, אשר הוקם בהתאם ל${parcel.buildingYear}` : ''}. הבניין בן ${parcel.buildingFloors || '—'} קומות${parcel.buildingUnits ? ` וכולל ${parcel.buildingUnits} יח"ד` : ''}.`

  content.push(rtlParagraph(parcelText))

  // Parcel sketch
  if (parcel.parcelSketch?.src && images.has('parcelSketch')) {
    const imgData = images.get('parcelSketch')!
    content.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 100, after: 50 },
        children: [
          new ImageRun({
            data: imgData.buffer,
            transformation: {
              width: Math.min(imgData.width, 400),
              height: Math.min(imgData.height, 280),
            },
            type: 'png',
          }),
        ],
      })
    )
    content.push(
      rtlParagraph(parcel.parcelSketch.caption, {
        size: FONT_SIZES.FOOTNOTE,
        color: COLORS.MUTED,
        alignment: AlignmentType.CENTER,
      })
    )
  }

  // Boundaries
  if (parcel.boundaries) {
    content.push(rtlParagraph('גבולות החלקה:', { spacing: { before: 100 } }))
    if (parcel.boundaries.west) content.push(rtlParagraph(`מערב – ${parcel.boundaries.west}`))
    if (parcel.boundaries.north) content.push(rtlParagraph(`צפון – ${parcel.boundaries.north}`))
    if (parcel.boundaries.east) content.push(rtlParagraph(`מזרח – ${parcel.boundaries.east}`))
    if (parcel.boundaries.south) content.push(rtlParagraph(`דרום – ${parcel.boundaries.south}`))
  }

  // 1.3 Property description
  content.push(sectionTitle('1.3 תיאור נשוא השומה'))

  content.push(
    rtlParagraph(
      `נשוא השומה הינה ${property.subParcel ? `תת חלקה ${property.subParcel}` : 'תת חלקה [חסר]'}, המהווה דירת מגורים בת ${property.rooms || '[חסר]'} חדרים${property.airDirections ? ` עם ${property.airDirections} כיווני אוויר` : ''}, הממוקמת בקומה ${property.floor ?? '[חסר]'}.`
    )
  )

  content.push(
    rtlParagraph(
      `הדירה בשטח רשום של ${formatNumber(property.registeredAreaSqm)} מ"ר${property.builtAreaSqm ? `, ובשטח בנוי רישוי של כ-${formatNumber(property.builtAreaSqm)} מ"ר` : ''}${property.attachmentsText ? `. לדירה צמודות ${property.attachmentsText}` : ''}.`
    )
  )

  content.push(
    rtlParagraph(
      `הדירה בחלוקה פנימית: ${property.internalLayoutAndFinish || '[חסר]'}`
    )
  )

  return content
}

// Build Section 2 - Legal Status
function buildSection2(data: ReportData, images: ImageMap): (Paragraph | Table)[] {
  const content: (Paragraph | Table)[] = []

  content.push(chapterTitle('2. מצב משפטי'))

  // 2.1 Registry
  content.push(sectionTitle('2.1 נסח רישום מקרקעין'))
  content.push(
    rtlParagraph(
      `תמצית מידע מפנקס הזכויות המתנהל בלשכת רישום המקרקעין ${data.section2.registryOfficeName || '[חסר]'}, אשר הופק בתאריך ${data.section2.tabuIssueDate || '[חסר]'}.`
    )
  )
  content.push(
    rtlParagraph(
      `חלקה ${data.section1.parcel.helka || '—'} בגוש ${data.section1.parcel.gush || '—'}, בשטח קרקע רשום של ${formatNumber(data.section1.parcel.parcelAreaSqm)} מ"ר.`
    )
  )

  // Ownerships
  if (data.section2.ownerships && data.section2.ownerships.length > 0) {
    content.push(sectionTitle('בעלויות'))
    for (const owner of data.section2.ownerships) {
      content.push(
        rtlParagraph(
          `${owner.name}${owner.id ? `, ${owner.id}` : ''}${owner.share ? `, חלק בנכס – ${owner.share}` : ''}`
        )
      )
    }
  }

  // Easements
  if (data.section2.easements && data.section2.easements.length > 0) {
    content.push(sectionTitle('זיקות הנאה'))
    content.push(rtlParagraph('על הנכס רשומות זיקות הנאה לציבור בשטחים הבאים:'))
    for (const easement of data.section2.easements) {
      content.push(
        rtlParagraph(
          `${easement.letter}) ${easement.description}${easement.areaSqm ? ` בשטח ${formatNumber(easement.areaSqm)} מ"ר` : ''}`
        )
      )
    }
  }

  // Mortgages
  if (data.section2.mortgagesText && data.section2.mortgagesText !== 'אין משכנתאות רשומות') {
    content.push(sectionTitle('משכנתאות'))
    content.push(rtlParagraph(data.section2.mortgagesText))
  }

  // Notes
  if (data.section2.notesText && data.section2.notesText !== 'אין הערות') {
    content.push(sectionTitle('הערות'))
    content.push(rtlParagraph(data.section2.notesText))
  }

  // Condo order
  if (data.section2.condoOrder) {
    content.push(sectionTitle('2.2 מסמכי בית משותף'))
    content.push(
      rtlParagraph(
        `מעיון בצו רישום הבית המשותף מיום ${data.section2.condoOrder.orderDate || '—'} עולים הפרטים הרלוונטיים הבאים:`
      )
    )
    if (data.section2.condoOrder.buildingDescription) {
      content.push(rtlParagraph(data.section2.condoOrder.buildingDescription))
    }

    if (data.section2.condoOrder.buildingsInfo && data.section2.condoOrder.buildingsInfo.length > 0) {
      content.push(rtlParagraph('פירוט המבנים בפרויקט:', { bold: true }))
      for (const building of data.section2.condoOrder.buildingsInfo) {
        content.push(
          rtlParagraph(
            `מבנה ${building.buildingNumber}${building.address ? `, ${building.address}` : ''}${building.floors ? `, ${building.floors} קומות` : ''}${building.units ? `, ${building.units} יח"ד` : ''}.`
          )
        )
      }
    }
  }

  // Disclaimer
  content.push(sectionTitle('2.3 הסתייגות'))
  content.push(rtlParagraph(LEGAL_DISCLAIMER_TEXT, { size: FONT_SIZES.SMALL }))

  return content
}

// Build Section 3 - Planning
function buildSection3(data: ReportData, images: ImageMap): (Paragraph | Table)[] {
  const content: (Paragraph | Table)[] = []

  content.push(chapterTitle('3. מידע תכנוני / רישוי'))

  // 3.1 Plans table
  if (data.section3.plansTable && data.section3.plansTable.length > 0) {
    content.push(sectionTitle('3.1 ריכוז תכניות בניין עיר תקפות'))

    content.push(
      new Table({
        visuallyRightToLeft: true,
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: TABLE_BORDERS,
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              tableCell('מספר תכנית', { header: true }),
              tableCell('שם תכנית', { header: true }),
              tableCell('תאריך פרסום', { header: true }),
              tableCell('סטטוס', { header: true }),
            ],
          }),
          ...data.section3.plansTable.map(
            (plan) =>
              new TableRow({
                children: [
                  tableCell(plan.planId),
                  tableCell(plan.planName),
                  tableCell(plan.publishDate),
                  tableCell(plan.status),
                ],
              })
          ),
        ],
      })
    )
  }

  // 3.2 Rights summary
  if (data.section3.rightsSummary) {
    content.push(sectionTitle('3.2 ריכוז זכויות בנייה'))

    const rs = data.section3.rightsSummary
    if (rs.designation) content.push(bulletPoint(`ייעוד: ${rs.designation}`))
    if (rs.minLotSizeSqm) content.push(bulletPoint(`שטח מגרש מינימלי: ${formatNumber(rs.minLotSizeSqm)} מ"ר`))
    if (rs.buildPercentage) content.push(bulletPoint(`אחוזי בנייה: ${rs.buildPercentage}%`))
    if (rs.maxFloors) content.push(bulletPoint(`מספר קומות מותרות: ${rs.maxFloors}`))
    if (rs.maxUnits) content.push(bulletPoint(`מספר יחידות דיור: ${rs.maxUnits}`))
    if (rs.buildingLines) content.push(bulletPoint(`קווי בניין: ${rs.buildingLines}`))

    // Building lines table
    if (rs.buildingLinesTable) {
      content.push(rtlParagraph('קווי בניין:', { bold: true, spacing: { before: 150 } }))
      content.push(
        new Table({
          visuallyRightToLeft: true,
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: TABLE_BORDERS,
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                tableCell('חזית', { header: true }),
                tableCell('אחורי', { header: true }),
                tableCell('צד 1', { header: true }),
                tableCell('צד 2', { header: true }),
              ],
            }),
            new TableRow({
              children: [
                tableCell(rs.buildingLinesTable.front ? `${formatNumber(rs.buildingLinesTable.front)} מ'` : '—'),
                tableCell(rs.buildingLinesTable.back ? `${formatNumber(rs.buildingLinesTable.back)} מ'` : '—'),
                tableCell(rs.buildingLinesTable.side1 ? `${formatNumber(rs.buildingLinesTable.side1)} מ'` : '—'),
                tableCell(rs.buildingLinesTable.side2 ? `${formatNumber(rs.buildingLinesTable.side2)} מ'` : '—'),
              ],
            }),
          ],
        })
      )
    }
  }

  // 3.3 Permits
  if (data.section3.permits && data.section3.permits.length > 0) {
    content.push(sectionTitle('3.3 רישוי בנייה'))
    content.push(rtlParagraph('מעיון בקובצי ההיתר המילוליים אותרו המסמכים הבאים:'))

    for (const permit of data.section3.permits) {
      content.push(
        bulletPoint(`היתר בנייה מס' ${permit.permitNumber} מיום ${permit.permitDate} — ${permit.description}`)
      )
    }

    if (data.section3.completionCertificate) {
      content.push(
        rtlParagraph(
          `תעודת גמר מיום ${data.section3.completionCertificate.date} מאשרת כי הבניין ברח' ${data.section3.completionCertificate.address} הוקם בהתאם לתנאי ההיתר העדכני.`
        )
      )
    }

    // Auxiliary areas
    if (data.section3.auxiliaryAreas) {
      content.push(rtlParagraph('שטחי עזר:', { bold: true, spacing: { before: 150 } }))
      if (data.section3.auxiliaryAreas.parkingSpaces) {
        content.push(bulletPoint(`מספר חניות: ${formatNumber(data.section3.auxiliaryAreas.parkingSpaces)}`))
      }
      if (data.section3.auxiliaryAreas.storageRooms) {
        content.push(bulletPoint(`מספר מחסנים: ${formatNumber(data.section3.auxiliaryAreas.storageRooms)}`))
      }
      if (data.section3.auxiliaryAreas.otherAreas) {
        for (const area of data.section3.auxiliaryAreas.otherAreas) {
          content.push(bulletPoint(`${area.type}${area.areaSqm ? ` בשטח ${formatNumber(area.areaSqm)} מ"ר` : ''}`))
        }
      }
    }
  }

  // Apartment plan image
  if (data.section3.apartmentPlan?.src && images.has('apartmentPlan')) {
    const imgData = images.get('apartmentPlan')!
    content.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 150, after: 50 },
        children: [
          new ImageRun({
            data: imgData.buffer,
            transformation: {
              width: Math.min(imgData.width, 400),
              height: Math.min(imgData.height, 300),
            },
            type: 'png',
          }),
        ],
      })
    )
    if (data.section3.apartmentPlan.caption) {
      content.push(
        rtlParagraph(data.section3.apartmentPlan.caption, {
          size: FONT_SIZES.FOOTNOTE,
          color: COLORS.MUTED,
          alignment: AlignmentType.CENTER,
        })
      )
    }
  }

  // 3.4 Environment quality
  content.push(sectionTitle('3.4 זיהום קרקע'))
  content.push(rtlParagraph(data.section3.environmentQualityText))

  return content
}

// Build Section 4 - Factors
function buildSection4(data: ReportData): (Paragraph | Table)[] {
  const content: (Paragraph | Table)[] = []

  content.push(chapterTitle('4. גורמים ושיקולים באומדן השווי'))
  content.push(rtlParagraph(SECTION4_INTRO_TEXT))

  content.push(sectionTitle('הסביבה והנכס'))
  for (const bullet of data.section4.bullets.environmentAndAsset) {
    content.push(bulletPoint(bullet))
  }

  content.push(sectionTitle('מצב הזכויות'))
  for (const bullet of data.section4.bullets.rightsStatus) {
    if (bullet) content.push(bulletPoint(bullet))
  }

  content.push(sectionTitle('מצב תכנוני ורישוי'))
  for (const bullet of data.section4.bullets.planningAndPermits) {
    if (bullet) content.push(bulletPoint(bullet))
  }

  content.push(sectionTitle('אומדן השווי'))
  for (const bullet of data.section4.bullets.valuation) {
    content.push(bulletPoint(bullet))
  }

  return content
}

// Build Section 5 - Calculations
function buildSection5(data: ReportData): (Paragraph | Table)[] {
  const content: (Paragraph | Table)[] = []

  content.push(chapterTitle('5. תחשיבים לאומדן השווי'))

  // 5.1 Comparables
  content.push(sectionTitle('5.1 נתוני השוואה'))

  if (data.section5.comparablesTable && data.section5.comparablesTable.length > 0) {
    content.push(
      new Table({
        visuallyRightToLeft: true,
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: TABLE_BORDERS,
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              tableCell('יום מכירה', { header: true }),
              tableCell('כתובת', { header: true }),
              tableCell('גוש/חלקה', { header: true }),
              tableCell('חדרים', { header: true }),
              tableCell('קומה', { header: true }),
              tableCell('שטח (מ"ר)', { header: true }),
              tableCell('מחיר (₪)', { header: true }),
              tableCell('מחיר/מ"ר', { header: true }),
            ],
          }),
          ...data.section5.comparablesTable.map(
            (comp) =>
              new TableRow({
                children: [
                  tableCell(comp.saleDate),
                  tableCell(comp.address),
                  tableCell(comp.gushHelka),
                  tableCell(String(comp.rooms)),
                  tableCell(String(comp.floor)),
                  tableCell(formatNumber(comp.areaSqm)),
                  tableCell(formatNumber(comp.priceIls)),
                  tableCell(formatNumber(comp.pricePerSqmIls)),
                ],
              })
          ),
        ],
      })
    )
  }

  // 5.2 Valuation calculation
  content.push(sectionTitle('5.2 תחשיב שווי הנכס'))
  content.push(
    rtlParagraph(
      `בשים לב לנתוני ההשוואה שלעיל, ותוך ביצוע התאמות נדרשות לנכס נשוא השומה, שווי מ"ר בנוי אקוו' לנכס נשוא השומה מוערך כ-${formatCurrency(data.section5.valuationCalc.pricePerBuiltSqmIls)}.`
    )
  )

  const calcHeaders = ['תיאור הנכס', 'שטח דירה בנוי (מ"ר)']
  const calcValues = [
    data.section5.valuationCalc.description,
    formatNumber(data.section5.valuationCalc.builtAreaSqm),
  ]

  if (data.section5.valuationCalc.balconyAreaSqm > 0) {
    calcHeaders.push('שטח מרפסות (מ"ר)')
    calcValues.push(formatNumber(data.section5.valuationCalc.balconyAreaSqm))
  }

  calcHeaders.push('שטח אקוו\' (מ"ר)', 'שווי למ"ר אקוו\' (₪)', 'שווי הנכס במעוגל (₪)')
  calcValues.push(
    formatNumber(data.section5.valuationCalc.equityAreaSqm),
    formatCurrency(data.section5.valuationCalc.pricePerBuiltSqmIls),
    formatCurrency(data.section5.valuationCalc.totalValueIls)
  )

  content.push(
    new Table({
      visuallyRightToLeft: true,
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: TABLE_BORDERS,
      rows: [
        new TableRow({
          tableHeader: true,
          children: calcHeaders.map((h) => tableCell(h, { header: true })),
        }),
        new TableRow({
          children: calcValues.map((v) => tableCell(v)),
        }),
      ],
    })
  )

  return content
}

// Build Section 6 - Final Valuation
function buildSection6(data: ReportData): (Paragraph | Table)[] {
  const content: (Paragraph | Table)[] = []

  // Company header
  if (data.cover.companyName) {
    content.push(rtlParagraph(data.cover.companyName, { bold: true, size: FONT_SIZES.TITLE }))
  }
  if (data.cover.companyTagline) {
    content.push(rtlParagraph(data.cover.companyTagline, { size: FONT_SIZES.SMALL, spacing: { after: 200 } }))
  }

  content.push(chapterTitle('6. השומה'))

  content.push(rtlParagraph('בשים לב למיקומו של הנכס,'))
  content.push(rtlParagraph('לשטחו, ולכל שאר הנתונים כאמור וכמפורט לעיל,'))
  content.push(rtlParagraph('בהביאי בחשבון שווים של נכסים דומים רלוונטיים,'))
  content.push(
    rtlParagraph(
      `סביר לאמוד את שווי הנכס בגבולות, ${formatCurrency(data.section6.finalValueIls)} (${data.section6.finalValueText}).`,
      { bold: true }
    )
  )
  content.push(rtlParagraph(data.section6.freeFromDebtsText || SECTION6_FREE_FROM_DEBTS_TEXT))

  // Declaration
  content.push(sectionTitle('הצהרה:'))
  content.push(rtlParagraph(data.section6.declarationText || SECTION6_DECLARATION_TEXT))
  content.push(rtlParagraph(data.section6.standardsText || SECTION6_STANDARDS_TEXT))

  // Company footer
  if (data.cover.companyServices) {
    content.push(
      rtlParagraph(data.cover.companyServices, {
        size: FONT_SIZES.FOOTNOTE,
        alignment: AlignmentType.CENTER,
        spacing: { before: 400 },
      })
    )
  }

  return content
}

// Build Custom Tables Section (for user-uploaded CSV tables)
function buildCustomTablesSection(data: ReportData): (Paragraph | Table)[] {
  const customTables = data.customTables
  if (!customTables || customTables.length === 0) {
    return []
  }

  const content: (Paragraph | Table)[] = []

  content.push(chapterTitle('נספחים - טבלאות מותאמות אישית'))

  customTables.forEach((table, tableIndex) => {
    // Add table title if exists
    if (table.title) {
      content.push(sectionTitle(table.title))
    } else {
      content.push(sectionTitle(`טבלה ${tableIndex + 1}`))
    }

    // Build table rows
    const rows: TableRow[] = []

    // Header row
    rows.push(
      new TableRow({
        tableHeader: true,
        children: table.headers.map(header => tableCell(header || '—', { header: true })),
      })
    )

    // Data rows
    table.rows.forEach(row => {
      rows.push(
        new TableRow({
          children: row.map(cell => tableCell(cell || '—')),
        })
      )
    })

    // Create table
    content.push(
      new Table({
        visuallyRightToLeft: true,
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: TABLE_BORDERS,
        rows,
      })
    )

    // Add spacing after each table
    content.push(rtlParagraph('', { spacing: { after: 200 } }))
  })

  return content
}

// Main document builder
export function buildDocxDocument(data: ReportData, images: ImageMap): Document {
  const pageProperties = {
    page: {
      size: {
        width: PAGE.WIDTH,
        height: PAGE.HEIGHT,
      },
      margin: {
        top: PAGE.MARGIN_TOP,
        bottom: PAGE.MARGIN_BOTTOM,
        left: PAGE.MARGIN_LEFT,
        right: PAGE.MARGIN_RIGHT,
      },
    },
  }

  return new Document({
    sections: [
      {
        properties: pageProperties,
        children: buildCoverPage(data, images),
      },
      {
        properties: pageProperties,
        children: buildClientDetailsPage(data),
      },
      {
        properties: pageProperties,
        children: buildSection1(data, images),
      },
      {
        properties: pageProperties,
        children: buildSection2(data, images),
      },
      {
        properties: pageProperties,
        children: buildSection3(data, images),
      },
      {
        properties: pageProperties,
        children: buildSection4(data),
      },
      {
        properties: pageProperties,
        children: buildSection5(data),
      },
      {
        properties: pageProperties,
        children: buildSection6(data),
      },
      // Custom tables section (only if there are custom tables)
      ...(data.customTables && data.customTables.length > 0
        ? [{
            properties: pageProperties,
            children: buildCustomTablesSection(data),
          }]
        : []),
    ],
  })
}
