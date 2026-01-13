# SHAMAY.AI - Comprehensive Project Documentation

## Git Workflow

**IMPORTANT: Always push to the official repo, NOT the dev repo!**

- **Official repo**: `official` -> `https://github.com/yaronbeen/Shamay_AI_Official.git`
- **Dev repo (DO NOT PUSH)**: `origin` -> `https://github.com/yaronbeen/shamay_shalom_18dev.git`

```bash
git push official main
```

---

## Project Architecture

### Directory Structure

```
shamay_shalom_18dev/
├── frontend/                    # Next.js 14 frontend application
│   ├── src/
│   │   ├── app/                 # Next.js app router pages
│   │   │   ├── wizard/          # Main wizard page
│   │   │   └── panel/           # Standalone panel views
│   │   ├── components/          # React components
│   │   │   ├── steps/           # Wizard step components (Step1-5)
│   │   │   ├── ui/              # Reusable UI components
│   │   │   └── ...
│   │   ├── contexts/            # React contexts (ValuationContext)
│   │   ├── hooks/               # Custom hooks (useShumaDB, useChat, useProvenance)
│   │   ├── lib/                 # Utilities and helpers
│   │   │   ├── pdf/             # PDF generation
│   │   │   ├── transformers/    # Data transformers (camelCase ↔ snake_case)
│   │   │   └── document-template.ts  # Document HTML generation
│   │   ├── types/               # TypeScript type definitions
│   │   │   └── valuation.ts     # Main ValuationData interface
│   │   └── __tests__/           # Vitest unit tests
│   ├── e2e/                     # Playwright E2E tests
│   └── ...
├── backend/                     # Express.js backend API
│   ├── src/
│   │   ├── models/              # Database models (ShumaDB.js)
│   │   ├── routes/              # API routes
│   │   ├── services/            # Business logic services
│   │   ├── middleware/          # Express middleware
│   │   └── __tests__/           # Jest integration tests
│   └── ...
└── .beads/                      # Issue tracking (beads workflow)
```

---

## Key Files Reference

| File                                                     | Purpose                                      |
| -------------------------------------------------------- | -------------------------------------------- |
| `frontend/src/app/wizard/page.tsx`                       | Main wizard orchestrator (navigation, state) |
| `frontend/src/contexts/ValuationContext.tsx`             | Centralized state management                 |
| `frontend/src/hooks/useShumaDB.ts`                       | Database operations hook                     |
| `frontend/src/types/valuation.ts`                        | TypeScript type definitions                  |
| `frontend/src/lib/document-template.ts`                  | Document HTML generation (2000+ lines)       |
| `frontend/src/lib/transformers/valuation-transformer.ts` | camelCase ↔ snake_case conversion            |
| `backend/src/models/ShumaDB.js`                          | Database operations (2700+ lines)            |
| `backend/src/routes/sessions.js`                         | Session API endpoints                        |

---

## Wizard Steps Overview

| Step | Component              | Purpose                          | Key Functions                                         |
| ---- | ---------------------- | -------------------------------- | ----------------------------------------------------- |
| 1    | `Step1InitialData.tsx` | Basic property info, client data | `validateForm()`, `updateField()`                     |
| 2    | `Step2Documents.tsx`   | Document upload & AI extraction  | `processDocuments()`, `extractLandRegistryData()`     |
| 3    | `Step3Validation.tsx`  | Review & edit extracted data     | `handleFieldSave()`, `restoreAIExtraction()`          |
| 4    | `Step4AIAnalysis.tsx`  | GIS, Garmushka, Market analysis  | `handleMarketAnalysis()`, `renderGisMappingSection()` |
| 5    | `Step5Export.tsx`      | Final valuation & export         | `handleExportPDF()`, `handleExportDocx()`             |

---

## Step 1: Initial Data (Step1InitialData.tsx)

### Functions

| Function                        | Purpose                               |
| ------------------------------- | ------------------------------------- |
| `normalizeDateToISO(dateInput)` | Converts dates to YYYY-MM-DD format   |
| `formatDateForDisplay(dateStr)` | Converts to DD/MM/YYYY display format |
| `parseAddress(address)`         | Parses Hebrew address strings         |
| `validateForm()`                | Validates required fields             |
| `updateField(field, value)`     | Updates form field and triggers save  |

### Fields Used

| Field                  | Type    | Required | DB Column                |
| ---------------------- | ------- | -------- | ------------------------ |
| valuationType          | string  | Yes      | valuation_type           |
| valuationDate          | date    | Yes      | valuation_date           |
| valuationEffectiveDate | date    | No       | valuation_effective_date |
| clientName             | string  | Yes      | client_name              |
| clientTitle            | string  | No       | client_title             |
| clientNote             | string  | No       | client_note              |
| clientRelation         | string  | No       | client_relation          |
| street                 | string  | Yes      | street                   |
| buildingNumber         | string  | Yes      | building_number          |
| neighborhood           | string  | No       | neighborhood             |
| city                   | string  | Yes      | city                     |
| rooms                  | number  | Yes      | rooms                    |
| floor                  | string  | Yes      | floor                    |
| airDirections          | string  | No       | air_directions           |
| landContamination      | boolean | No       | land_contamination       |
| landContaminationNote  | string  | No       | land_contamination_note  |
| shamayName             | string  | Yes      | shamay_name              |
| shamaySerialNumber     | string  | Yes      | shamay_serial_number     |

---

## Step 2: Documents (Step2Documents.tsx)

### Functions

| Function                                | Purpose                     | API Endpoint                                             |
| --------------------------------------- | --------------------------- | -------------------------------------------------------- |
| `handleFileSelect(type, files)`         | Handle file selection       | -                                                        |
| `simulateUpload(upload)`                | Upload file to server       | POST `/api/files/{sessionId}/upload`                     |
| `triggerBackgroundProcessing(docType)`  | Start AI processing         | POST `/api/session/{sessionId}/process-document`         |
| `processDocuments(reprocessSelection?)` | Orchestrate all extractions | Multiple endpoints                                       |
| `extractLandRegistryData()`             | Process tabu documents      | POST `/api/session/{sessionId}/land-registry-analysis`   |
| `extractBuildingPermitData()`           | Process building permits    | POST `/api/session/{sessionId}/building-permit-analysis` |
| `extractSharedBuildingData()`           | Process condo documents     | POST `/api/session/{sessionId}/shared-building-analysis` |
| `extractImageAnalysisData()`            | Analyze property images     | POST `/api/session/{sessionId}/interior-analysis`        |
| `handleRemoveUpload(uploadId)`          | Delete uploaded file        | DELETE `/api/session/{sessionId}/upload/{uploadId}`      |

### Document Types

| Type Code      | Hebrew Name       | File Types    |
| -------------- | ----------------- | ------------- |
| tabu           | נסח טאבו          | PDF/DOC       |
| permit         | היתר בניה         | PDF/DOC       |
| condo          | צו בית משותף      | PDF/DOC       |
| planning       | מידע תכנוני       | PDF/DOC       |
| building_image | תמונת חזית הבניין | IMAGE         |
| interior_image | תמונות פנים הדירה | IMAGE (max 6) |

---

## Step 3: Validation (Step3Validation.tsx)

### Functions

| Function                                    | Purpose                  | API Endpoint                                  |
| ------------------------------------------- | ------------------------ | --------------------------------------------- |
| `loadSessionData()`                         | Load extracted data      | GET `/api/session/{sessionId}`                |
| `trackFieldEdit(field, oldValue, newValue)` | Track edit analytics     | POST `/api/field-edits`                       |
| `handleFieldSave(field, value)`             | Save edited field        | -                                             |
| `loadAIExtractions()`                       | Load extraction history  | GET `/api/session/{sessionId}/ai-extractions` |
| `restoreAIExtraction(extractionId)`         | Restore previous version | PUT `/api/session/{sessionId}/ai-extractions` |
| `getProvenanceForField(fieldPath)`          | Get field source info    | GET `/api/provenance`                         |

### Editable Fields (69 fields across 13 sections)

**Section 1: זיהוי ורישום (Identification & Registration)**

- gush, parcel, subParcel, fullAddress, registrationOffice, tabuExtractDate

**Section 2: בעלות וזכויות (Ownership & Rights)**

- ownershipType, rights, owners[], commonParts, attachments

**Section 3: תאור החלק (Unit Description)**

- floor, unitDescription, regulationType, bylaws

**Section 4: הערות (Notes)**

- notes, sharedAreas, plotNotes, subChelkaNotes

**Section 5: צו בית משותף (Shared Building Order)**

- sharedBuildingOrderDate, buildingAddressFromOrder, floorsCountInBuilding, etc.

**Section 6: חלקות משנה (Sub-plots)**

- subPlotNumber, subPlotFloor, subPlotArea, subPlotDescription

**Section 7: צורת חלקה (Plot Shape)**

- parcelShape, parcelTerrain, parcelBoundary\* (N/S/E/W)

**Section 8: בדיקת עמידות (Building Permits)**

- buildingPermitNumber, buildingPermitDate, permittedUse

**Section 9: תיאור הבנייה (Building Description)**

- constructionYear, buildingFloors, buildingUnits, numberOfBuildings

**Section 10: מצב וגימור (Condition & Finish)**

- propertyCondition, finishLevel, finishDetails, conditionAssessment

**Section 11: זכויות תכנון (Planning Rights)**

- planningRights.usage, planningRights.minLotSize, planningRights.buildPercentage, etc.

---

## Step 4: AI Analysis (Step4AIAnalysis.tsx)

### Functions

| Function                               | Purpose                 | API Endpoint                                    |
| -------------------------------------- | ----------------------- | ----------------------------------------------- |
| `handleSectionToggle(section)`         | Switch analysis section | -                                               |
| `handleImageAnalysis()`                | Trigger image analysis  | POST `/api/session/{sessionId}/image-analysis`  |
| `handleMarketAnalysis()`               | Trigger market analysis | POST `/api/session/{sessionId}/comparable-data` |
| `renderGisMappingSection()`            | Render GIS map viewer   | -                                               |
| `renderGarmushkaMeasurementsSection()` | Render measurement tool | -                                               |
| `renderMarketAnalysisSection()`        | Render comparable data  | -                                               |
| `saveAnalysisResults()`                | Save results to session | PUT `/api/session/{sessionId}`                  |

### Analysis Sections

| Section ID             | Hebrew Name     | Component                  | Output Fields                               |
| ---------------------- | --------------- | -------------------------- | ------------------------------------------- |
| garmushka_measurements | מדידות גרמושקה  | GarmushkaMeasurementViewer | apartmentSqm, garmushkaMeasurements         |
| gis_mapping            | מפת GOVMAP      | GISMapViewer               | gisScreenshots                              |
| market_analysis        | ניתוח נתוני שוק | ComparableDataViewer       | comparableData, pricePerSqm, finalValuation |

---

## Step 5: Export (Step5Export.tsx)

### Functions

| Function               | Purpose                 | API Endpoint                                |
| ---------------------- | ----------------------- | ------------------------------------------- |
| `handleExportPDF()`    | Generate PDF document   | POST `/api/session/{sessionId}/export-pdf`  |
| `handleExportDocx()`   | Generate Word document  | POST `/api/session/{sessionId}/export-docx` |
| `handleDownloadPDF()`  | Re-download PDF blob    | -                                           |
| `handleDownloadDocx()` | Re-download Word blob   | -                                           |
| `openExportInNewTab()` | Open in separate window | -                                           |

### Step5ValuationPanel Functions

| Function                        | Purpose                     |
| ------------------------------- | --------------------------- |
| `parseNumeric(value, fallback)` | Safely parse numeric values |
| `formatNumber(num)`             | Format with Hebrew locale   |
| `handleStartEdit()`             | Enter edit mode             |
| `handleAutoSave()`              | Auto-save on blur           |
| `handleSaveEdit()`              | Save and exit edit mode     |

### Valuation Data Sources (Priority Order)

**Measured Area:**

1. `data.apartmentSqm` (Garmushka)
2. `data.area`
3. `data.registeredArea`
4. 0 (default)

**Price Per Sqm:**

1. `data.pricePerSqm`
2. `data.comparableDataAnalysis.averagePricePerSqm`
3. `data.marketAnalysis.averagePricePerSqm`
4. `data.comparableDataAnalysis.section52.final_price_per_sqm`

**Final Value:**

1. Calculated (area × price)
2. `data.finalValuation`
3. `data.comparableDataAnalysis.estimatedValue`
4. `data.comparableDataAnalysis.section52.asset_value_nis`

---

## Database Schema (shuma table - 70+ columns)

### System/Metadata Columns

| Column          | Type                | Purpose             |
| --------------- | ------------------- | ------------------- |
| id              | SERIAL PRIMARY KEY  | Unique identifier   |
| session_id      | VARCHAR(255) UNIQUE | Session identifier  |
| organization_id | VARCHAR(255)        | Multi-tenant org ID |
| user_id         | VARCHAR(255)        | Creating user       |
| created_at      | TIMESTAMP           | Creation time       |
| updated_at      | TIMESTAMP           | Last update time    |

### Basic Property Information

| Column           | Frontend Field  | Type          |
| ---------------- | --------------- | ------------- |
| street           | street          | VARCHAR(255)  |
| building_number  | buildingNumber  | VARCHAR(50)   |
| city             | city            | VARCHAR(255)  |
| neighborhood     | neighborhood    | VARCHAR(255)  |
| full_address     | fullAddress     | TEXT          |
| rooms            | rooms           | DECIMAL(3,1)  |
| floor            | floor           | VARCHAR(50)   |
| air_directions   | airDirections   | VARCHAR(255)  |
| area             | area            | DECIMAL(10,2) |
| property_essence | propertyEssence | VARCHAR(255)  |

### Cover Page Information

| Column                   | Frontend Field         | Type         |
| ------------------------ | ---------------------- | ------------ |
| client_name              | clientName             | VARCHAR(255) |
| client_title             | clientTitle            | VARCHAR(255) |
| client_note              | clientNote             | TEXT         |
| client_relation          | clientRelation         | VARCHAR(255) |
| visit_date               | visitDate              | DATE         |
| valuation_date           | valuationDate          | DATE         |
| valuation_type           | valuationType          | VARCHAR(255) |
| valuation_effective_date | valuationEffectiveDate | DATE         |
| reference_number         | referenceNumber        | VARCHAR(255) |
| shamay_name              | shamayName             | VARCHAR(255) |
| shamay_serial_number     | shamaySerialNumber     | VARCHAR(255) |

### Legal Status / Land Registry

| Column                 | Frontend Field       | Type          |
| ---------------------- | -------------------- | ------------- |
| gush                   | gush                 | VARCHAR(50)   |
| parcel                 | parcel               | VARCHAR(50)   |
| parcel_area            | parcelArea           | DECIMAL(10,2) |
| parcel_shape           | parcelShape          | VARCHAR(255)  |
| parcel_surface         | parcelSurface        | VARCHAR(255)  |
| sub_parcel             | subParcel            | VARCHAR(255)  |
| registered_area        | registeredArea       | DECIMAL(10,2) |
| built_area             | builtArea            | DECIMAL(10,2) |
| balcony_area           | balconyArea          | DECIMAL(10,2) |
| building_permit_number | buildingPermitNumber | VARCHAR(255)  |
| building_permit_date   | buildingPermitDate   | DATE          |
| building_description   | buildingDescription  | TEXT          |
| building_floors        | buildingFloors       | INTEGER       |
| building_units         | buildingUnits        | INTEGER       |
| building_details       | buildingDetails      | TEXT          |
| construction_source    | constructionSource   | TEXT          |
| attachments            | attachments          | TEXT          |
| ownership_rights       | ownershipRights      | TEXT          |
| notes                  | notes                | TEXT          |
| registry_office        | registryOffice       | VARCHAR(255)  |
| extract_date           | extractDate          | DATE          |

### Property Description

| Column          | Frontend Field | Type         |
| --------------- | -------------- | ------------ |
| internal_layout | internalLayout | TEXT         |
| finish_standard | finishStandard | VARCHAR(255) |
| finish_details  | finishDetails  | TEXT         |

### JSONB Fields (Complex Data)

| Column                 | Frontend Field        | Content                                 |
| ---------------------- | --------------------- | --------------------------------------- |
| extracted_data         | extractedData         | AI-extracted fields (60+ nested fields) |
| property_analysis      | propertyAnalysis      | Building analysis object                |
| market_analysis        | marketAnalysis        | Market trends object                    |
| risk_assessment        | riskAssessment        | Risk evaluation object                  |
| recommendations        | recommendations       | Recommendations array                   |
| comparable_data        | comparableData        | Comparable properties array             |
| gis_analysis           | gisAnalysis           | GIS coordinates object                  |
| gis_screenshots        | gisScreenshots        | Map screenshot URLs                     |
| garmushka_measurements | garmushkaMeasurements | Measurement data                        |
| property_images        | propertyImages        | Image metadata array                    |
| interior_images        | interiorImages        | Interior image array                    |
| uploads                | uploads               | Upload metadata array                   |
| structured_footnotes   | structuredFootnotes   | Footnotes array                         |
| custom_tables          | customTables          | CSV table data                          |

### Valuation Results

| Column          | Frontend Field | Type          |
| --------------- | -------------- | ------------- |
| final_valuation | finalValuation | DECIMAL(12,2) |
| price_per_sqm   | pricePerSqm    | DECIMAL(10,2) |
| is_complete     | isComplete     | BOOLEAN       |

### Special Fields

| Column                  | Frontend Field        | Type    |
| ----------------------- | --------------------- | ------- |
| land_contamination      | landContamination     | BOOLEAN |
| land_contamination_note | landContaminationNote | TEXT    |
| selected_image_index    | selectedImageIndex    | INTEGER |
| selected_image_preview  | selectedImagePreview  | TEXT    |
| signature_preview       | signaturePreview      | TEXT    |

---

## Field Naming Convention

**CRITICAL: The codebase uses DUAL naming conventions:**

- **Frontend**: camelCase (e.g., `buildingNumber`, `pricePerSqm`)
- **Database**: snake_case (e.g., `building_number`, `price_per_sqm`)

**Transformation Layer:** `frontend/src/lib/transformers/valuation-transformer.ts`

- `toBackend()` - Converts camelCase → snake_case before API calls
- `fromBackend()` - Converts snake_case → camelCase after API responses

**Within extractedData (JSONB):**
Both naming conventions may exist for backward compatibility. The `getValueFromPaths()` function tries multiple paths:

```javascript
// Example: Getting sub-parcel value
getValueFromPaths(data, [
  "extractedData.subParcel",
  "extractedData.sub_parcel",
  "extractedData.subChelka",
  "extractedData.sub_chelka",
  "subParcel",
  "sub_parcel",
]);
```

---

## API Endpoints

### Sessions API (`/api/sessions`)

| Method | Endpoint          | Action             | Purpose                 |
| ------ | ----------------- | ------------------ | ----------------------- |
| POST   | /api/sessions     | save_to_db         | Save complete valuation |
| POST   | /api/sessions     | load_from_db       | Load valuation data     |
| POST   | /api/sessions     | save_gis_data      | Save GIS screenshots    |
| POST   | /api/sessions     | save_garmushka     | Save measurements       |
| POST   | /api/sessions     | save_final_results | Save final valuation    |
| GET    | /api/session/{id} | -                  | Get session data        |
| PUT    | /api/session/{id} | -                  | Update session data     |

### Document Processing

| Method | Endpoint                                   | Purpose                  |
| ------ | ------------------------------------------ | ------------------------ |
| POST   | /api/session/{id}/land-registry-analysis   | Extract from tabu        |
| POST   | /api/session/{id}/building-permit-analysis | Extract from permit      |
| POST   | /api/session/{id}/shared-building-analysis | Extract from condo order |
| POST   | /api/session/{id}/interior-analysis        | Analyze interior images  |
| POST   | /api/session/{id}/exterior-analysis        | Analyze exterior images  |

### Export

| Method | Endpoint                      | Purpose                |
| ------ | ----------------------------- | ---------------------- |
| POST   | /api/session/{id}/export-pdf  | Generate PDF document  |
| POST   | /api/session/{id}/export-docx | Generate Word document |

### Files

| Method | Endpoint                            | Purpose       |
| ------ | ----------------------------------- | ------------- |
| POST   | /api/files/{sessionId}/upload       | Upload file   |
| DELETE | /api/session/{id}/upload/{uploadId} | Delete upload |

### Comparable Data

| Method | Endpoint                     | Purpose             |
| ------ | ---------------------------- | ------------------- |
| POST   | /api/comparable-data/import  | Import CSV data     |
| POST   | /api/comparable-data/analyze | Analyze comparables |
| GET    | /api/comparable-data/search  | Search comparables  |

---

## ShumaDB Methods (backend/src/models/ShumaDB.js)

### Core Operations

| Method                                                          | Purpose                  |
| --------------------------------------------------------------- | ------------------------ |
| `saveShumaFromSession(sessionId, orgId, userId, valuationData)` | Save complete valuation  |
| `loadShumaForWizard(sessionId, skipCache)`                      | Load with 5-second cache |
| `clearShumaCache(sessionId)`                                    | Clear cache entry        |

### Specialized Saves

| Method                                                    | Purpose                       |
| --------------------------------------------------------- | ----------------------------- |
| `saveGISData(sessionId, gisData)`                         | Save GIS screenshots          |
| `saveGarmushkaData(sessionId, data)`                      | Save measurements             |
| `saveFinalResults(sessionId, results)`                    | Save final valuation          |
| `savePermitExtraction(sessionId, data, filename)`         | Save permit extraction        |
| `saveLandRegistryExtraction(sessionId, data, filename)`   | Save land registry extraction |
| `saveSharedBuildingExtraction(sessionId, data, filename)` | Save condo extraction         |

### AI Extractions

| Method                                             | Purpose                  |
| -------------------------------------------------- | ------------------------ |
| `saveAIExtraction(sessionId, type, data, docData)` | Save AI extraction       |
| `getAIExtractions(sessionId, type)`                | Get extraction history   |
| `restoreAIExtraction(sessionId, extractionId)`     | Restore previous version |

### Search & Retrieval

| Method                                | Purpose             |
| ------------------------------------- | ------------------- |
| `searchShumas(orgId, search, status)` | Search valuations   |
| `getShumaById(shumaId)`               | Get by database ID  |
| `getAllExtractedData(sessionId)`      | Get all extractions |

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER INTERACTION                            │
│                             ↓                                    │
│                    Step Component                                │
│                             ↓                                    │
│                   updateData(updates)                            │
│                             ↓                                    │
│               ValuationContext (state merge)                     │
│                             ↓                                    │
│              debouncedSave (1 second delay)                      │
│                             ↓                                    │
│               useShumaDB.saveShumaToDatabase()                   │
│                             ↓                                    │
│              valuation-transformer.toBackend()                   │
│                   (camelCase → snake_case)                       │
│                             ↓                                    │
│                  POST /api/sessions                              │
│                  action: "save_to_db"                            │
│                             ↓                                    │
│              ShumaDB.saveShumaFromSession()                      │
│                             ↓                                    │
│              PostgreSQL shuma table (70+ cols)                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Known Issues & Data Gaps

### Fields NOT Persisted to Database (Data Loss Risk)

| Field                           | Issue                                   |
| ------------------------------- | --------------------------------------- |
| `customTables`                  | CSV tables displayed but LOST on reload |
| `customDocumentEdits`           | User edits to document LOST on reload   |
| `appraiserLicenseNumber`        | Defined in frontend, never saved        |
| `propertyImages` (File objects) | Only preview string saved               |

### Fields Stored but NOT Used in Document

| Column                    | Status                  |
| ------------------------- | ----------------------- |
| client_relation           | Stored, never displayed |
| valuation_type            | Stored, not used        |
| shamay_serial_number      | Stored, not used        |
| parcel_shape              | Stored, not used        |
| parcel_surface            | Stored, not used        |
| building_floors           | Stored, not used        |
| building_units            | Stored, not used        |
| building_details          | Stored, not used        |
| construction_source       | Stored, not used        |
| ownership_rights          | Stored, not used        |
| property_analysis (JSONB) | Stored, not rendered    |
| market_analysis (JSONB)   | Stored, not rendered    |
| risk_assessment (JSONB)   | Stored, not rendered    |
| recommendations           | Stored, not rendered    |
| land_contamination        | Stored, not used        |
| uploads                   | Stored, unclear usage   |

---

## Testing

### Frontend Unit Tests (Vitest)

```bash
cd frontend && npm test
```

**Test Files:**

- `src/__tests__/lib/csv-export.test.ts` - CSV export (15 tests)
- `src/__tests__/components/steps/AIGeneratedField.test.tsx` - Auto-save (9 tests)
- `src/__tests__/components/steps/Step5Export.test.tsx` - Export (10 tests)
- `src/__tests__/components/steps/Step5ValuationPanel.test.tsx` - Panel (7 tests)

### Backend Integration Tests (Jest)

```bash
cd backend && npm test
```

**Test Files:**

- `src/__tests__/sessions.test.js` - API endpoints (15 tests)

### E2E Tests (Playwright)

```bash
cd frontend && npm run test:e2e
```

**Test Files:**

- `e2e/step5-export.spec.ts` - Export UI tests
- `e2e/auto-save.spec.ts` - Auto-save behavior
- `e2e/wizard-flow.spec.ts` - Complete wizard flow

---

## Beads Issue Tracking

```bash
bd list --status=open    # Show open issues
bd ready                 # Show ready to work
bd stats                 # Project statistics
bd create --title="..." --type=task --priority=2  # Create issue
bd close <id>            # Close issue
```

**Current Open Issues:**

- `972` - Standardize apartmentSqm vs apartmentRegisteredArea naming
- `lqb` - Standardize parcel vs chelka naming
- `ii1` - Expand table filters for comparable data
- `w2n` - Allow multi-gush search
- `1pv` - Support dual monitor workflow
- `bpj` - Faster document upload flow
- `olk` - Change font to DAVID 12
- `7gu` - Display all Bright Data columns
- `dfo` - Refactor updateData() function

---

## Context & Hooks

### ValuationContext

**Provider:** `<ValuationProvider>` wraps wizard

**State:**

- `data` - Current ValuationData
- `sessionId` - Current session ID
- `hasUnsavedChanges` - Dirty flag
- `lastSavedData` - For change detection
- `stepValidation` - Per-step validation status

**Functions:**

- `updateData(updates, options?)` - Update with auto-save
- `saveManually()` - Explicit save
- `resetToSaved()` - Revert changes
- `handleValidationChange(step, isValid)` - Update validation

### useShumaDB Hook

Database operations with error handling and loading states.

### useChat Hook

Chat interface with streaming responses and file attachments.

### useProvenance Hook

Field source tracking for AI extractions.

---

## Document Generation

**File:** `frontend/src/lib/document-template.ts`

**Main Function:** `generateDocumentHTML(data: ValuationData)`

**Key Helpers:**

- `getValueFromPaths(data, paths[])` - Multi-path fallback lookup
- `formatDateNumeric(date)` - DD.MM.YYYY format
- `formatCurrency(value)` - Hebrew locale currency
- `createDetailsTable(data)` - 70+ field property table
- `createComparablesTable(comparables[])` - Comparable properties

**Sections Generated:**

1. Cover page with client info
2. Property identification
3. Legal status (gush/chelka)
4. Building description
5. Property details table
6. Comparable properties
7. Market analysis
8. Final valuation
9. Custom tables (CSV)
10. Footnotes
