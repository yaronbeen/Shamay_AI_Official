# AI Agent Guide for Shamay.AI Codebase

This document helps AI coding agents understand the codebase structure, conventions, and common tasks.

## Quick Reference

### Key Files

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| **Types** | `frontend/src/types/valuation.ts` | ~400 | All interfaces - READ THIS FIRST |
| **Data Transform** | `frontend/src/lib/transformers/valuation-transformer.ts` | ~200 | camelCase ↔ snake_case |
| **State** | `frontend/src/contexts/ValuationContext.tsx` | ~300 | Global state management |
| **DB Hook** | `frontend/src/hooks/useShumaDB.ts` | ~200 | Database operations |
| **PDF Utils** | `frontend/src/lib/pdf/` | ~2500 | Modular PDF generation |

### Files to Avoid Modifying Directly

| File | Lines | Reason |
|------|-------|--------|
| `document-template.ts` | 4,570 | Too large - use extracted pdf/ modules instead |
| `ShumaDB.js` | 3,222 | Monolithic - prefer using services |
| `Step3FieldsPanel.tsx` | 2,986 | 69 fields - easy to break |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Next.js 14 + TypeScript)                         │
│  ├── app/wizard/page.tsx    → Main wizard orchestrator      │
│  ├── contexts/              → ValuationContext (state)      │
│  ├── components/steps/      → Step1-5 components            │
│  ├── hooks/                 → useShumaDB, useProvenance     │
│  ├── types/valuation.ts     → All TypeScript interfaces     │
│  └── lib/pdf/               → Modular PDF generation        │
├─────────────────────────────────────────────────────────────┤
│  Backend (Express.js + PostgreSQL)                          │
│  ├── routes/sessions.js     → Main API endpoints            │
│  ├── models/ShumaDB.js      → Database operations           │
│  └── services/              → Domain services               │
└─────────────────────────────────────────────────────────────┘
```

---

## Critical: Naming Conventions

### The Dual Naming System

**Frontend uses camelCase:**
```typescript
{ buildingNumber: "5", subParcel: "1a", apartmentSqm: 150 }
```

**Database uses snake_case:**
```sql
building_number, sub_parcel, apartment_sqm
```

### Transformation Layer

Always use the transformer when sending/receiving data:

```typescript
import { toBackend, fromBackend } from "@/lib/transformers/valuation-transformer";

// Sending to API
const backendData = toBackend(frontendData);  // camelCase → snake_case

// Receiving from API
const frontendData = fromBackend(apiResponse); // snake_case → camelCase
```

### Extracted Data (Special Case)

The `extractedData` field may contain BOTH formats from AI extraction. Use `getValueFromPaths`:

```typescript
import { getValueFromPaths } from "@/lib/pdf/utils/data-resolvers";

// This tries multiple paths and returns first found value
const subParcel = getValueFromPaths(data, [
  "extractedData.subParcel",    // camelCase
  "extractedData.sub_parcel",   // snake_case
  "subParcel",                  // top-level fallback
]);
```

---

## Type System

### Main Interface: ValuationData

Located in `frontend/src/types/valuation.ts`. Key sections:

```typescript
interface ValuationData {
  // Basic Info
  street?: string;
  buildingNumber?: string;
  city?: string;
  rooms?: number;
  floor?: string;

  // Valuation
  valuationDate?: string;
  finalValuation?: number;
  pricePerSqm?: number;

  // Extracted AI Data (nested object)
  extractedData?: ExtractedData;

  // Analysis Results
  comparableDataAnalysis?: ComparableDataAnalysis;
  gisScreenshots?: GISScreenshots;
  garmushkaMeasurements?: GarmushkaMeasurements;
}
```

### When Types Say `any`

If you see `any` in the codebase, check `valuation.ts` for the actual type. Common pattern:

```typescript
// ❌ Code uses any
const value = (data as any).someField;

// ✅ Better: Check if field exists in ValuationData
// If not, it might be in ExtractedData:
const value = data.extractedData?.someField;
```

---

## Common Tasks

### Adding a New Field

1. **Add to type definition:**
   ```typescript
   // frontend/src/types/valuation.ts
   interface ValuationData {
     // ...existing fields
     newField?: string;  // Add here
   }
   ```

2. **Add to transformer (if needed for API):**
   ```typescript
   // frontend/src/lib/transformers/valuation-transformer.ts
   // Usually auto-handled, but check if special conversion needed
   ```

3. **Add to database (if persisting):**
   ```sql
   -- Create migration in backend/src/migrations/
   ALTER TABLE shuma ADD COLUMN new_field VARCHAR(255);
   ```

4. **Add to ShumaDB.js INSERT/UPDATE:**
   ```javascript
   // backend/src/models/ShumaDB.js
   // Add to both INSERT columns list and UPDATE SET clause
   ```

### Updating Document Generation

Use the modular PDF utilities instead of editing document-template.ts:

```typescript
// Import from pdf/ modules
import {
  formatNumber,
  formatDateHebrew,
  getValueFromPaths,
  createDetailsTable,
} from "@/lib/pdf";

// Use these utilities in your code
const formattedValue = formatNumber(data.someField);
```

### Working with the Wizard

```typescript
// Access state from context
import { useValuation } from "@/contexts/ValuationContext";

function MyComponent() {
  const { data, updateData, saveManually } = useValuation();

  // Update a field (auto-saves after 1 second)
  updateData({ fieldName: "new value" });

  // Force immediate save
  await saveManually();
}
```

---

## PDF Module Structure

```
frontend/src/lib/pdf/
├── index.ts              # Import from here
├── types.ts              # CompanySettings, FontFamily
├── constants.ts          # FONT_FAMILIES, hebrewMonths, text constants
├── utils/
│   ├── formatters.ts     # formatNumber, formatDateHebrew, formatCurrency
│   ├── text.ts           # normalizeText, escapeHtmlForTable
│   └── data-resolvers.ts # getValueFromPaths, getAddress, getSubParcelValue
├── tables/
│   ├── details-table.ts  # createDetailsTable
│   ├── comparables-table.ts
│   └── custom-tables.ts
├── images/
│   ├── cover-images.ts   # resolveCoverImageSources
│   └── interior-images.ts
├── styles/
│   └── document-styles.ts # buildBaseCss
├── scripts/
│   └── pagination.ts     # pageNumberScript, autoPaginateScript
└── chapters/
    └── chapter-context.ts # createChapterContext
```

**Usage:**
```typescript
import {
  formatNumber,
  formatDateHebrew,
  getValueFromPaths,
  createDetailsTable,
  buildBaseCss,
} from "@/lib/pdf";
```

---

## API Endpoints

### Sessions API

| Action | Method | Endpoint | Purpose |
|--------|--------|----------|---------|
| Save | POST | `/api/sessions` | action=save_to_db |
| Load | POST | `/api/sessions` | action=load_from_db |
| GIS | POST | `/api/sessions` | action=save_gis_data |
| Garmushka | POST | `/api/sessions` | action=save_garmushka |
| Final | POST | `/api/sessions` | action=save_final_results |

### Document Processing

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/session/{id}/land-registry-analysis` | Extract from tabu |
| POST | `/api/session/{id}/building-permit-analysis` | Extract from permit |
| POST | `/api/session/{id}/export-pdf` | Generate PDF |
| POST | `/api/session/{id}/export-docx` | Generate Word doc |

---

## Database Schema (Key Columns)

The `shuma` table has 70+ columns. Key ones:

```sql
-- Identity
id SERIAL PRIMARY KEY
session_id VARCHAR(255) UNIQUE
organization_id, user_id

-- Address
street, building_number, city, neighborhood

-- Property
rooms DECIMAL(3,1), floor, area DECIMAL(10,2)

-- Valuation
final_valuation DECIMAL(12,2), price_per_sqm DECIMAL(10,2)

-- JSONB (complex nested data)
extracted_data JSONB      -- AI extraction results
gis_screenshots JSONB     -- Map images
garmushka_measurements JSONB
comparable_data JSONB
structured_footnotes JSONB
custom_tables JSONB       -- CSV uploads
custom_document_edits JSONB
```

---

## Common Pitfalls

### 1. Field Not Saving

Check these in order:
1. Is field in `ValuationData` interface? (`types/valuation.ts`)
2. Is field in `ShumaDB.js` INSERT/UPDATE?
3. Is field in database schema?

### 2. Field Shows Wrong Value

Likely a naming mismatch. Use `getValueFromPaths` with multiple paths:
```typescript
const value = getValueFromPaths(data, [
  "extractedData.fieldName",     // camelCase nested
  "extractedData.field_name",    // snake_case nested
  "fieldName",                   // camelCase top-level
]);
```

### 3. PDF Export Missing Data

Check `document-template.ts` for how that field is accessed. Often needs multiple fallback paths.

### 4. Type Error with `any`

Don't add more `any`. Instead:
1. Check if field exists in `ValuationData`
2. Use proper type narrowing: `if (data.field) { ... }`
3. Add the field to the interface if it's missing

---

## Testing

```bash
# Frontend unit tests
cd frontend && npm test

# Type checking
cd frontend && npm run type-check

# Backend tests
cd backend && npm test
```

---

## Quick Debugging

### Check what data is being saved
```typescript
console.log("Saving data:", JSON.stringify(data, null, 2));
```

### Check what fields exist
```typescript
console.log("Keys:", Object.keys(data));
console.log("ExtractedData keys:", Object.keys(data.extractedData || {}));
```

### Check API response
```bash
# In browser console
fetch('/api/sessions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'load_from_db', sessionId: 'your-session-id' })
}).then(r => r.json()).then(console.log);
```

---

## Beads Issue Tracking

```bash
bd list --status=open    # Show open issues
bd ready                 # Show ready to work
bd show <id>             # Issue details
```

Known naming issues to be aware of:
- #972: `apartmentSqm` vs `apartmentRegisteredArea`
- #lqb: `parcel` vs `chelka` terminology
