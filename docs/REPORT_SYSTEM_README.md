# SHAMAY.AI Report System - Technical Documentation

## Overview

The report system implements a complete Hebrew RTL valuation report generator with:
- Structured data extraction from PDFs (Tabu, Condo, Permits)
- TA_ID → field contract enforcement
- Provenance tracking for every value
- Locked Hebrew legal templates
- Multi-step wizard UI
- PDF/DOCX export with exact formatting

## TA_ID → Field Contract

Every piece of data in the system is bound to a TA_ID (Tracking & Accountability ID). This ensures traceability and QA.

### Core TA Mappings

| TA_ID | Field Path | Required | Source | Description |
|-------|-----------|----------|--------|-------------|
| TA1 | `branding.logo_url` | No | system | Company logo |
| TA2 | `report.type` | Yes | system | Report type |
| TA3 | `address_street` | Yes | tabu | Street name |
| TA4 | `address_building_no` | Yes | tabu | Building number |
| TA5 | `address_neighborhood` | No | tabu | Neighborhood |
| TA6 | `address_city` | Yes | tabu | City |
| TA10 | `client_name` | Yes | manual | Client name (min 3 chars) |
| TA11 | `date_created` | Yes | system | Report creation date |
| TA12 | `reference_code` | Yes | system | Auto reference: `1000_{street}_{building}` |
| TA20 | `visit_date` | Yes | manual | Property visit date (≤ today) |
| TA21 | `determining_date` | Yes | manual | Valuation date (requires reason if ≠ visit_date) |
| TA24 | `parcel.block` | Yes | tabu | Block number (גוש) |
| TA25 | `parcel.number` | Yes | tabu | Parcel number (חלקה) |
| TA26 | `subparcel.number` | Yes | tabu | Sub-parcel (תת חלקה) |
| TA27 | `subparcel.registered_area_sqm` | Yes | tabu | Registered area |
| TA28 | `calc.area_built` | Yes | permit/manual | Built area |
| TA31 | `tabu_meta.extract_date` | Yes | tabu | Tabu extract date |
| TA56 | `tabu_meta.registrar_office` | Yes | tabu | Land registry office |
| TA60 | `attachment[]` | No | tabu | Attachments array |
| TA61 | `ownership[]` | No | tabu | Ownerships array |
| TA62 | `mortgage[]` | No | tabu | Mortgages array |
| TA90 | `comp[]` | Yes | manual | Comparables (min 3) |
| TA92 | `calc.eq_psm` | Yes | system | Equiv. price/sqm |
| TA95 | `calc.asset_value` | Yes | system | Final value (rounded to ₪1000) |
| TA99 | `declaration.text` | Yes | system | Appraiser declaration (locked) |
| TA100 | `signature.block` | Yes | manual | Signature block |

**Full mapping**: See `/frontend/src/lib/ta-mappings.ts`

## Locked Hebrew Templates

All formal Hebrew text is **locked** and stored in `/frontend/src/lib/locked-hebrew-templates.ts`.

### Key Templates

**Chapter 2.1 - Tabu Introduction**
```
תמצית מידע מפנקס הזכויות המתנהל בלשכת רישום המקרקעין {{tabu_meta.registrar_office}},
אשר הופק באמצעות אתר האינטרנט של רשם המקרקעין במשרד המשפטים,
בתאריך {{tabu_meta.extract_date}}.
חלקה {{parcel.number}} בגוש {{parcel.block}}, בשטח קרקע רשום של {{parcel.area_sqm}} מ"ר.
```

**Ownership Template** (TA61)
```
{{owner_name}}, {{id_type}} {{id_number}}, חלק בנכס – {{fraction}}.
```

**Mortgage Template** (TA62)
```
משכנתא מדרגה {{rank}} לטובת {{beneficiary}} על סך {{amount_nis}} ₪, חלק בנכס: {{fraction}}, מיום {{date}}.
```

**Final Valuation** (TA98)
```
בשים לב למיקומו של הנכס, לשטחו, ולכל שאר הנתונים כאמור וכמפורט לעיל,
ובהביאי בחשבון שווים של נכסים דומים רלוונטיים,
שווי הנכס בגבולות ‎{{asset_value_num}}‎ ₪ (‎{{asset_value_txt}}‎).
השווי כולל מע"מ.
הכול במצבו הנוכחי, כריק, פנוי וחופשי מכל מחזיק, חוב ושיעבוד, נכון לתאריך חוות-דעת זו.
```

**Appraiser Declaration** (TA99)
```
הנני מצהיר, כי אין לי כל עניין אישי בנכס נשוא השומה, בבעלי הזכויות בו במזמין השומה.
הדו"ח הוכן על פי תקנות שמאי המקרקעין (אתיקה מקצועית), התשכ"ו – 1966
ועל פי התקנים המקצועיים של הועדה לתקינה שמאית.
```

## Database Schema

Run migration:
```bash
psql -d shamay_db -f database/migrations/006_create_report_system_tables.sql
```

### Core Tables

- **report**: Main report entity with client, dates, address (TA3-6, TA10-12, TA20-21)
- **parcel**: Land parcel data (TA24-25)
- **subparcel**: Unit/apartment data (TA26-27)
- **attachment**: Parking, storage, etc. (TA29, TA60)
- **ownership**: Owners list (TA61)
- **mortgage**: Mortgages/liens (TA62)
- **note**: Legal notes (TA63)
- **tabu_meta**: Registry metadata (TA31, TA56)
- **condo**: Condo order data (TA64-67)
- **permit**: Building permits (TA51-52)
- **ai_text**: AI descriptions (TA34, TA38-39)
- **comp**: Comparables (TA90)
- **calc**: Valuation calculations (TA92-97)
- **audit_log**: Full change history

### Provenance (Source JSONB)

Every extracted/entered value includes:
```json
{
  "source": "tabu|condo|permit|manual|ai",
  "file_id": "uuid-or-null",
  "page": "integer-or-null",
  "low_confidence": false
}
```

## API Endpoints

### Reports CRUD
```
POST   /api/reports                    Create new report
GET    /api/reports/:id                Get full report data
PUT    /api/reports/:id                Update fields (with audit)
```

### Parsing
```
POST   /api/reports/:id/parse/tabu     Parse Tabu PDF → extract TA24-27, TA31, TA56, TA60-63
POST   /api/reports/:id/parse/condo    Parse Condo Order → TA64-67
POST   /api/reports/:id/parse/permit   Parse Permit → TA51-52
```

### Calculations
```
POST   /api/reports/:id/comps/import   Upload comparables CSV → TA90
PUT    /api/reports/:id/comps/:compId  Toggle include/exclude
POST   /api/reports/:id/calc           Compute TA92-97 (requires ≥3 comps)
```

### Export
```
POST   /api/reports/:id/export/pdf     Generate PDF (A4, 20-25mm margins, 12pt body, 13pt titles)
POST   /api/reports/:id/export/docx    Generate DOCX
```

## Validation Rules

### Blocking (Hard Errors)

- **TA10** (client_name): min 3 chars
- **TA3, TA4, TA6** (address): all required
- **TA20** (visit_date): ≤ today
- **TA21** (determining_date): ≤ today; if ≠ visit_date, requires `determining_date_reason`
- **TA24, TA25** (block, parcel): must be parsed from Tabu or manually entered
- **TA26, TA27** (sub-parcel, registered_area): required
- **TA90** (comparables): min 3 included
- **TA51** (permits): if completion certificate exists, must match latest permit

### Warnings (Soft)

- Low confidence OCR values (show orange badge)
- Outlier comparables (±3σ from mean)
- Missing optional sections (condo, attachments, mortgages)

## UI Behavior

### Step 1 - פרטי נכס
- All fields show provenance badge
- Address changes propagate to all {{כתובת}} references
- Dates validated client-side + server-side

### Step 2 - העלאת מסמכים
- Upload Tabu PDF → auto-parse → show extraction results
- Status indicators: ✅ parsed / 🟧 needs confirmation / ⛔ missing
- Block progress if TA24/TA25 missing

### Step 3 - בדיקה
- Review all required fields
- Confirm low-confidence extractions
- Cannot proceed until all ✅

### Step 4 - שיקולים
- Auto bullets (from stored data) + manual bullets (min 3 words)
- Drag to reorder

### Step 5 - תחשיבים
- **5.1**: CSV grid, live stats, include/exclude toggles
- **5.2**: Auto-calc from 5.1, show table, edit description (TA96)

### Step 6 - השומה
- Show final value + Hebrew text
- Signature upload
- Export button (disabled if validation fails)

## Export Format

### PDF Specs
- **Paper**: A4 (210×297mm)
- **Margins**: 20mm top/bottom, 25mm left/right
- **Font**: Calibri/Arial Hebrew, 12pt body, 13pt titles, line-height 1.5
- **Direction**: RTL throughout
- **Header**: Page 1 = logo only; Pages 2+ = firm name + minimal
- **Footer**: All pages = contact + "עמוד X מתוך Y"
- **Sections**: Omit headers if empty (e.g., no attachments → no "הצמדות" section)

### DOCX Specs
- Same formatting as PDF
- Use Hebrew-capable template
- Tables with proper RTL alignment
- Embedded images with captions

## Testing

### Unit Tests
```bash
npm test -- tabu-parser.test.js    # OCR extraction
npm test -- calc.test.js           # Valuation math
npm test -- validation.test.js     # TA validation
```

### Integration Tests
```bash
npm test -- report-flow.test.js    # End-to-end wizard
```

### Manual QA Checklist
1. Create report → upload Tabu → verify all TA24-27, TA31, TA56 extracted
2. Upload Condo → verify 2.2 populates
3. Add ≥3 comps → verify calc works
4. Export PDF → verify locked Hebrew text appears exactly
5. Verify omitted sections don't show headers

## File Structure

```
frontend/
  src/
    lib/
      ta-mappings.ts              ← TA_ID contract (authoritative)
      locked-hebrew-templates.ts  ← All locked text
      document-template.ts        ← HTML renderer
    components/
      steps/
        Step1InitialData.tsx      ← TA10, TA20-21, TA3-6
        Step2Documents.tsx        ← Upload + parse
        Step3Validation.tsx       ← Review + confirm
        Step4Considerations.tsx   ← Bullets
        Step5Calculations.tsx     ← Comps + calc
        Step6Export.tsx           ← Final + signature

backend/
  src/
    routes/
      reports.js                  ← CRUD + calc API
      export.js                   ← PDF/DOCX generation
    services/
      tabu-parser.js              ← Tabu OCR
      condo-parser.js             ← Condo OCR
      permit-parser.js            ← Permit OCR
    models/
      ShumaDB.js                  ← DB client

database/
  migrations/
    006_create_report_system_tables.sql
```

## Audit & Compliance

- All writes logged to `audit_log` with old/new values
- Field-level provenance displayed in UI
- Export includes footnote citations (e.g., "נשלף מנסח טאבו מיום X")
- TA_ID validation before export

## Notes for Developers

1. **Never translate Hebrew templates** - they are legal text
2. **Always include source JSONB** when creating/updating data
3. **Block export** if required TAs missing
4. **Omit empty sections** - don't show "הצמדות" header if no attachments
5. **Round final value** to ₪ thousands upward (TA95)
6. **Hebrew number conversion** must handle up to 999,999,999 (TA98)

## Contact

For questions about TA mappings or locked templates, contact the Product team.

