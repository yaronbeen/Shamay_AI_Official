# PDF Generator for Property Appraisal Reports

מנוע יצירת PDF לדוחות שמאי בעברית (RTL) לפי מבנה קבוע של דוח שמאי ישראלי.

## טכנולוגיה

הפרויקט משתמש ב-`@react-pdf/renderer` ליצירת PDFs מ-React components.

## התקנה

```bash
cd frontend
pnpm add @react-pdf/renderer
```

## שימוש בסיסי

```typescript
import { renderPdf } from '@/lib/pdf/render';
import { ReportData } from '@/lib/pdf/types';
import reportData from '@/lib/pdf/reportData.example.json';

// Render PDF from report data
const pdfBuffer = await renderPdf(reportData as ReportData);

// Save to file
import fs from 'fs';
fs.writeFileSync('output.pdf', pdfBuffer);
```

## מבנה הנתונים

המבנה המלא מוגדר ב-`types.ts`. דוגמה מלאה ב-`reportData.example.json`.

### שדות חובה

- `meta.documentTitle` - כותרת המסמך
- `meta.reportDate` - תאריך הדוח
- `meta.referenceNumber` - מספר סימוכין
- `meta.clientName` - שם המזמין
- `meta.inspectionDate` - תאריך ביקור
- `meta.valuationDate` - תאריך קובע לשומה
- `meta.appraiserName` - שם השמאי
- `address.street`, `address.buildingNumber`, `address.city`
- `section1.environmentDescription`
- `section1.parcel.gush`, `section1.parcel.helka`
- `section1.property.rooms`, `section1.property.floor`
- `section1.property.internalLayoutAndFinish`
- `section2.legalDisclaimerText`
- `section3.environmentQualityText`
- `section4.introText`
- `section5.comparablesTable` (לפחות שורה אחת)
- `section5.valuationCalc`
- `section6.finalValueIls`, `section6.finalValueText`, `section6.declarationText`, `section6.standardsText`

## מבנה המסמך

המסמך נבנה לפי הסדר הבא (לא ניתן לשנות):

1. **דף שער** - כותרת, כתובת, תמונה, תאריך, מספר סימוכין
2. **פרטי מזמין ותאריכים** - "לכבוד", תאריכים
3. **פרק 1 - תיאור הנכס והסביבה**
   - 1.1 הסביבה והקשר העירוני
   - 1.2 תיאור החלקה והבניין
   - 1.3 תיאור נשוא השומה
4. **פרק 2 - מצב משפטי**
   - 2.1 נסח רישום מקרקעין
   - 2.2 מסמכי בית משותף
5. **פרק 3 - מידע תכנוני/רישוי**
   - 3.1 ריכוז תכניות בניין עיר תקפות
   - 3.2 ריכוז זכויות בנייה
   - 3.3 רישוי בנייה
   - 3.4 זיהום קרקע
6. **פרק 4 - גורמים ושיקולים באומדן השווי**
7. **פרק 5 - תחשיבים לאומדן השווי**
   - 5.1 נתוני השוואה
   - 5.2 תחשיב שווי הנכס
8. **פרק 6 - השומה + חתימה**

## תמונות

כל תמונה יכולה להיות:
- Base64 data URI: `"data:image/jpeg;base64,..."`
- URL path: `"/images/building.jpg"`

אם תמונה חסרה במקום שצריך להציגה, יוצג placeholder עם מסגרת מקווקו.

## טבלאות

הטבלאות מוצגות עם:
- רקע אפור לכותרת
- גבולות 1px
- padding 6px
- גופן 10.5pt

## טקסטים קבועים

טקסטים קבועים מוגדרים ב-`constants.ts` ולא ניתנים לעריכה דרך UI:
- מטרת חוות הדעת
- הגבלת אחריות
- הסתייגות משפטית
- פתיח פרק 4
- הצהרת שמאי
- תקנים מקצועיים

## ולידציה

הפונקציה `renderPdf()` בודקת שדות חובה ומזריקה שגיאה אם חסרים נתונים קריטיים.

## דוגמה מלאה

ראה `reportData.example.json` לדוגמה מלאה של מבנה הנתונים.

## אינטגרציה עם המערכת הקיימת

### המרה מ-ValuationData ל-ReportData

הפונקציה `convertValuationDataToReportData()` ממירה את מבנה הנתונים הקיים (`ValuationData`) למבנה הנדרש ל-PDF (`ReportData`):

```typescript
import { convertValuationDataToReportData } from '@/lib/pdf/converter'
import { renderPdfToBuffer } from '@/lib/pdf/render'

const reportData = convertValuationDataToReportData(valuationData, companySettings)
const pdfBuffer = await renderPdfToBuffer(reportData)
```

### שימוש ב-EditableDocumentPreview

ב-`EditableDocumentPreview.tsx` יש כעת שתי אפשרויות לייצוא PDF:

1. **ייצוא PDF (HTML)** - משתמש ב-Puppeteer + HTML template (הדרך הקיימת)
2. **ייצוא PDF (React-PDF)** - משתמש במנוע החדש @react-pdf/renderer

### API Routes

יש שני endpoints לייצוא PDF:

- **`POST /api/session/[sessionId]/export-pdf`** - ייצוא באמצעות Puppeteer (HTML template)
- **`POST /api/session/[sessionId]/export-pdf-react`** - ייצוא באמצעות React-PDF (חדש)

שניהם מקבלים את אותם פרמטרים ומחזירים PDF זהה.

## הערות

- המסמך הוא RTL מלא
- כל הסעיפים מופיעים גם אם חלק מהשדות חסרים (עם "—" או אזהרה)
- שדות חובה חסרים מוצגים בטקסט אדום בתוך המסמך (לשכבת QA)
- תמונות חסרות מוחלפות ב-placeholder box

