# AGENTS.md - Comprehensive Guide for AI Coding Agents

This document provides detailed information for AI coding agents working on the Shamay.AI codebase. It serves as a complete reference for understanding the architecture, data flow, and common development tasks.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Directory Structure](#3-directory-structure)
4. [Wizard Steps - Detailed Breakdown](#4-wizard-steps---detailed-breakdown)
5. [Key Functions Reference](#5-key-functions-reference)
6. [Data Flow Architecture](#6-data-flow-architecture)
7. [Transformation Layer](#7-transformation-layer)
8. [Database Schema](#8-database-schema)
9. [API Endpoints](#9-api-endpoints)
10. [Common Tasks](#10-common-tasks)
11. [Testing](#11-testing)
12. [Troubleshooting](#12-troubleshooting)
13. [File References](#13-file-references)

---

## 1. Project Overview

### What is Shamay.AI?

Shamay.AI is a Hebrew real estate valuation wizard application. It guides property appraisers (shamayim) through a 5-step process to create professional valuation reports:

1. **Step 1: Initial Data** - Property details, client info, appraiser credentials
2. **Step 2: Documents** - Upload and AI extraction from legal documents (Tabu, permits, etc.)
3. **Step 3: Validation** - Review and edit AI-extracted data
4. **Step 4: AI Analysis** - GIS mapping, measurements (Garmushka), market analysis
5. **Step 5: Export** - Calculate final value and generate PDF/Word reports

### Key Business Concepts

| Hebrew Term          | English       | Description                                   |
| -------------------- | ------------- | --------------------------------------------- |
| Shuma (שומה)         | Valuation     | The complete property valuation report        |
| Shamay (שמאי)        | Appraiser     | The real estate appraiser creating the report |
| Tabu (טאבו)          | Land Registry | Official property registration document       |
| Gush (גוש)           | Block         | Land registry block number                    |
| Chelka (חלקה)        | Parcel        | Land registry parcel number                   |
| Sub-Chelka (תת-חלקה) | Sub-Parcel    | Sub-unit within a parcel                      |
| Garmushka (גרמושקה)  | Floor Plan    | Floor plan measurement tool                   |

### Quick Reference - Key Files

| Purpose               | File                                                     | Lines | Notes                            |
| --------------------- | -------------------------------------------------------- | ----- | -------------------------------- |
| **Types**             | `frontend/src/types/valuation.ts`                        | ~550  | All interfaces - READ THIS FIRST |
| **Data Transform**    | `frontend/src/lib/transformers/valuation-transformer.ts` | ~530  | camelCase ↔ snake_case           |
| **State**             | `frontend/src/contexts/ValuationContext.tsx`             | ~720  | Global state management          |
| **DB Hook**           | `frontend/src/hooks/useShumaDB.ts`                       | ~560  | Database operations              |
| **PDF Utils**         | `frontend/src/lib/pdf/`                                  | ~3500 | Modular PDF generation           |
| **Document Template** | `frontend/src/lib/document-template.ts`                  | ~1500 | HTML document orchestration      |
| **Backend DB**        | `backend/src/models/ShumaDB.js`                          | ~2700 | Database operations              |

### Files to Avoid Modifying Directly

| File                   | Lines  | Reason                             |
| ---------------------- | ------ | ---------------------------------- |
| `ShumaDB.js`           | 2,700+ | Monolithic - prefer using services |
| `Step3FieldsPanel.tsx` | 2,900+ | 69 fields - easy to break          |

> **Note**: `document-template.ts` was refactored from 4,570 to ~1,500 lines. Chapter content is now in `pdf/chapters/` modules.

---

## 2. Tech Stack

### Frontend

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context (ValuationContext)
- **Authentication**: NextAuth.js
- **UI Components**: Lucide React icons, Sonner toasts
- **Testing**: Vitest (unit), Playwright (E2E)

### Backend

- **Framework**: Express.js
- **Language**: JavaScript (Node.js)
- **Database**: PostgreSQL (Neon serverless in production)
- **ORM**: Raw SQL with pg/neon driver
- **Testing**: Jest

### Database

- **Production**: Neon Serverless PostgreSQL
- **Development**: Local PostgreSQL
- **Main Table**: `shuma` (70+ columns)
- **JSONB Columns**: extractedData, garmushkaMeasurements, gisScreenshots, etc.

---

## 3. Directory Structure

```
shamay_shalom_18dev/
├── frontend/                    # Next.js 14 application
│   ├── src/
│   │   ├── app/                 # Next.js App Router
│   │   │   ├── wizard/          # Main wizard page
│   │   │   │   └── page.tsx     # Wizard orchestrator (~800 lines)
│   │   │   ├── panel/           # Standalone panel views
│   │   │   └── api/             # API routes (Next.js)
│   │   ├── components/
│   │   │   ├── steps/           # Step1-5 components
│   │   │   │   ├── Step1InitialData.tsx   (~700 lines)
│   │   │   │   ├── Step2Documents.tsx     (~1200 lines)
│   │   │   │   ├── Step3Validation.tsx    (~400 lines)
│   │   │   │   ├── Step3FieldsPanel.tsx   (~2900 lines)
│   │   │   │   ├── Step4AIAnalysis.tsx    (~1100 lines)
│   │   │   │   ├── Step5Export.tsx        (~500 lines)
│   │   │   │   └── Step5ValuationPanel.tsx (~360 lines)
│   │   │   ├── ui/              # Reusable UI components
│   │   │   └── chat/            # AI chat interface
│   │   ├── contexts/
│   │   │   └── ValuationContext.tsx  # Central state management
│   │   ├── hooks/
│   │   │   ├── useShumaDB.ts    # Database operations
│   │   │   ├── useChat.ts       # Chat interface
│   │   │   └── useProvenance.ts # Field source tracking
│   │   ├── lib/
│   │   │   ├── pdf/             # PDF generation modules (~3500 lines total)
│   │   │   │   ├── index.ts           # Main exports
│   │   │   │   ├── types.ts           # CompanySettings, FontFamily
│   │   │   │   ├── constants.ts       # FONT_FAMILIES, text constants
│   │   │   │   ├── utils/             # formatters, text, data-resolvers
│   │   │   │   ├── tables/            # details, comparables, custom
│   │   │   │   ├── images/            # cover, interior images
│   │   │   │   ├── styles/            # document CSS
│   │   │   │   ├── scripts/           # pagination scripts
│   │   │   │   └── chapters/          # Chapter generators (6 files)
│   │   │   │       ├── chapter1-property.ts   # Property, GIS, interior
│   │   │   │       ├── chapter2-legal.ts      # Legal status, ownership
│   │   │   │       ├── chapter3-planning.ts   # Planning rights
│   │   │   │       ├── chapter4-factors.ts    # Valuation factors
│   │   │   │       ├── chapter5-calculations.ts # Methodology
│   │   │   │       └── chapter6-valuation.ts  # Final valuation
│   │   │   ├── transformers/
│   │   │   │   └── valuation-transformer.ts  # camelCase ↔ snake_case
│   │   │   └── document-template.ts  # HTML orchestration (~1500 lines)
│   │   ├── types/
│   │   │   └── valuation.ts     # TypeScript definitions (SINGLE SOURCE)
│   │   └── __tests__/           # Vitest unit tests
│   ├── e2e/                     # Playwright E2E tests
│   └── public/                  # Static assets
├── backend/                     # Express.js API
│   ├── src/
│   │   ├── models/
│   │   │   └── ShumaDB.js       # Database operations (2700+ lines)
│   │   ├── routes/
│   │   │   └── sessions.js      # Session API endpoints
│   │   ├── services/            # Business logic
│   │   ├── middleware/          # Express middleware
│   │   └── __tests__/           # Jest tests
│   └── database/
│       └── migrations/          # SQL migrations
├── CLAUDE.md                    # Additional project docs
└── AGENTS.md                    # This file
```

---

## 4. Wizard Steps - Detailed Breakdown

### Step 1: Initial Data (Step1InitialData.tsx)

**Purpose**: Collect basic property information and appraiser details.

**File**: `frontend/src/components/steps/Step1InitialData.tsx`

#### Key Functions

| Function                        | Purpose                                     | Implementation                               |
| ------------------------------- | ------------------------------------------- | -------------------------------------------- |
| `normalizeDateToISO(dateInput)` | Converts various date formats to YYYY-MM-DD | Handles DD/MM/YYYY, DD.MM.YYYY, Date objects |
| `formatDateForDisplay(dateStr)` | Converts to DD/MM/YYYY for UI display       | For Hebrew locale display                    |
| `parseAddress(address)`         | Parses Hebrew address strings into parts    | Extracts street, number, city                |
| `validateForm()`                | Validates all required fields are filled    | Returns boolean                              |
| `updateField(field, value)`     | Updates a field and triggers context save   | Calls context.updateData                     |

#### Fields Used (All from ValuationData)

| Field                  | Type    | Required | Database Column          | Section     |
| ---------------------- | ------- | -------- | ------------------------ | ----------- |
| valuationType          | string  | Yes      | valuation_type           | Cover Page  |
| valuationDate          | date    | Yes      | valuation_date           | Cover Page  |
| valuationEffectiveDate | date    | No       | valuation_effective_date | Cover Page  |
| clientName             | string  | Yes      | client_name              | Client Info |
| clientTitle            | string  | No       | client_title             | Client Info |
| clientNote             | string  | No       | client_note              | Client Info |
| clientRelation         | string  | No       | client_relation          | Client Info |
| street                 | string  | Yes      | street                   | Address     |
| buildingNumber         | string  | Yes      | building_number          | Address     |
| neighborhood           | string  | No       | neighborhood             | Address     |
| city                   | string  | Yes      | city                     | Address     |
| rooms                  | number  | Yes      | rooms                    | Property    |
| floor                  | string  | Yes      | floor                    | Property    |
| airDirections          | string  | No       | air_directions           | Property    |
| landContamination      | boolean | No       | land_contamination       | Property    |
| landContaminationNote  | string  | No       | land_contamination_note  | Property    |
| shamayName             | string  | Yes      | shamay_name              | Appraiser   |
| shamaySerialNumber     | string  | Yes      | shamay_serial_number     | Appraiser   |

#### Data Flow

```
User Input -> updateField() -> setFormData() -> updateData() (context)
                                              -> debouncedSave() (1s delay)
                                              -> API POST /api/sessions
```

---

### Step 2: Documents (Step2Documents.tsx)

**Purpose**: Upload documents and trigger AI extraction.

**File**: `frontend/src/components/steps/Step2Documents.tsx`

#### Key Functions

| Function                                | Purpose                                 | API Endpoint                                             |
| --------------------------------------- | --------------------------------------- | -------------------------------------------------------- |
| `handleFileSelect(type, files)`         | Handle file selection for document type | -                                                        |
| `simulateUpload(upload)`                | Upload file to server                   | POST `/api/files/{sessionId}/upload`                     |
| `triggerBackgroundProcessing(docType)`  | Start AI processing                     | POST `/api/session/{sessionId}/process-document`         |
| `processDocuments(reprocessSelection?)` | Orchestrate all extractions             | Multiple endpoints                                       |
| `extractLandRegistryData()`             | Extract from Tabu document              | POST `/api/session/{sessionId}/land-registry-analysis`   |
| `extractBuildingPermitData()`           | Extract from permit                     | POST `/api/session/{sessionId}/building-permit-analysis` |
| `extractSharedBuildingData()`           | Extract from condo order                | POST `/api/session/{sessionId}/shared-building-analysis` |
| `extractImageAnalysisData()`            | Analyze images                          | POST `/api/session/{sessionId}/interior-analysis`        |
| `handleRemoveUpload(uploadId)`          | Delete uploaded file                    | DELETE `/api/session/{sessionId}/upload/{uploadId}`      |
| `pollProcessingStatus()`                | Check AI processing status              | GET `/api/session/{sessionId}/processing-status`         |

#### Document Types

| Type Code      | Hebrew Name       | File Types | Purpose                 | Max Files |
| -------------- | ----------------- | ---------- | ----------------------- | --------- |
| tabu           | נסח טאבו          | PDF/DOC    | Land registry extract   | 1         |
| permit         | היתר בניה         | PDF/DOC    | Building permit         | Multiple  |
| condo          | צו בית משותף      | PDF/DOC    | Shared building order   | 1         |
| planning       | מידע תכנוני       | PDF/DOC    | Planning information    | Multiple  |
| building_image | תמונת חזית הבניין | IMAGE      | Building exterior photo | 1         |
| interior_image | תמונות פנים הדירה | IMAGE      | Interior photos         | 6         |

#### Background Processing Status Interface

```typescript
interface ProcessingStatus {
  tabu: "pending" | "processing" | "completed" | "error";
  condo: "pending" | "processing" | "completed" | "error";
  permit: "pending" | "processing" | "completed" | "error";
  interior: "pending" | "processing" | "completed" | "error";
  exterior: "pending" | "processing" | "completed" | "error";
}
```

#### Extraction Data Flow

```
File Upload -> simulateUpload() -> Server Storage (uploads/ folder)
           -> triggerBackgroundProcessing() -> AI Service (GPT-4 Vision)
           -> pollProcessingStatus() -> Check completion
           -> Update extractedData in context
           -> updateData({ extractedData: merged }) -> Auto-save
```

---

### Step 3: Validation (Step3Validation.tsx & Step3FieldsPanel.tsx)

**Purpose**: Review and edit AI-extracted data across 69 fields in 13 sections.

**Files**:

- `frontend/src/components/steps/Step3Validation.tsx` (main container)
- `frontend/src/components/steps/Step3FieldsPanel.tsx` (fields display)

#### Key Functions

| Function                            | Purpose                              | Location         |
| ----------------------------------- | ------------------------------------ | ---------------- |
| `handleFieldEdit(field, value)`     | Start editing a field                | Step3FieldsPanel |
| `handleFieldSave(field)`            | Save edited field value              | Step3FieldsPanel |
| `handleFieldCancel()`               | Cancel field edit                    | Step3FieldsPanel |
| `getProvenanceForField(fieldPath)`  | Get field source info (AI vs Manual) | Step3FieldsPanel |
| `loadAIExtractions()`               | Load extraction history              | Step3Validation  |
| `restoreAIExtraction(extractionId)` | Restore previous version             | Step3Validation  |

#### Section Groups (13 sections, 69 fields)

| Section                      | Hebrew Name   | Key Fields                                                                      |
| ---------------------------- | ------------- | ------------------------------------------------------------------------------- |
| IDENTIFICATION_SECTION       | זיהוי ורישום  | gush, parcel, subParcel, fullAddress, registrationOffice, tabuExtractDate       |
| OWNERSHIP_SECTION            | בעלות וזכויות | ownershipType, rights, owners[], commonParts, attachments                       |
| UNIT_DESCRIPTION_SECTION     | תאור החלק     | floor, unitDescription, regulationType, bylaws                                  |
| NOTES_SECTION                | הערות         | notes, sharedAreas, plotNotes, subChelkaNotes                                   |
| SHARED_BUILDING_SECTION      | צו בית משותף  | sharedBuildingOrderDate, buildingAddressFromOrder, floorsCountInBuilding        |
| SUB_PLOTS_SECTION            | חלקות משנה    | subPlotNumber, subPlotFloor, subPlotArea, subPlotDescription                    |
| PLOT_SHAPE_SECTION           | צורת חלקה     | parcelShape, parcelTerrain, parcelBoundaryN/S/E/W                               |
| BUILDING_PERMITS_SECTION     | בדיקת עמידות  | buildingPermitNumber, buildingPermitDate, permittedUse                          |
| BUILDING_DESCRIPTION_SECTION | תיאור הבנייה  | constructionYear, buildingFloors, buildingUnits, numberOfBuildings              |
| CONDITION_SECTION            | מצב וגימור    | propertyCondition, finishLevel, finishDetails, conditionAssessment              |
| PLANNING_RIGHTS_SECTION      | זכויות תכנון  | planningRights.usage, planningRights.minLotSize, planningRights.buildPercentage |
| INTERIOR_ANALYSIS_SECTION    | ניתוח פנים    | propertyLayoutDescription, roomAnalysis[]                                       |
| EXTERIOR_ANALYSIS_SECTION    | ניתוח חיצוני  | buildingCondition, buildingFeatures, buildingType                               |

#### Data Sources Priority

The `getValueFromPaths()` function tries multiple paths for backward compatibility:

```typescript
// From frontend/src/lib/transformers/valuation-transformer.ts
const gush = getValueFromPaths(
  data,
  [
    "extractedData.land_registry.gush", // AI extraction path
    "extractedData.gush", // Direct extraction
    "gush", // Top-level field
  ],
  "",
);
```

---

### Step 4: AI Analysis (Step4AIAnalysis.tsx)

**Purpose**: GIS mapping, Garmushka measurements, and market analysis.

**File**: `frontend/src/components/steps/Step4AIAnalysis.tsx`

#### Analysis Sections

| Section ID             | Hebrew Name     | Component                  | Purpose                   | Output Fields                               |
| ---------------------- | --------------- | -------------------------- | ------------------------- | ------------------------------------------- |
| garmushka_measurements | מדידות גרמושקה  | GarmushkaMeasurementViewer | Floor plan measurements   | apartmentSqm, garmushkaMeasurements         |
| gis_mapping            | מפת GOVMAP      | GISMapViewer               | GOVMAP screenshots        | gisScreenshots                              |
| market_analysis        | ניתוח נתוני שוק | ComparableDataViewer       | Comparable sales analysis | comparableData, pricePerSqm, finalValuation |

#### Key Functions

| Function                               | Purpose                            |
| -------------------------------------- | ---------------------------------- |
| `handleSectionToggle(section)`         | Switch between analysis sections   |
| `handleImageAnalysis()`                | Trigger image analysis API         |
| `handleMarketAnalysis()`               | Trigger market analysis API        |
| `renderGisMappingSection()`            | Render GIS map viewer with GOVMAP  |
| `renderGarmushkaMeasurementsSection()` | Render floor plan measurement tool |
| `renderMarketAnalysisSection()`        | Render comparable data viewer      |
| `saveAnalysisResults(results)`         | Save results to session            |

#### Garmushka Measurements Data Structure

```typescript
interface GarmushkaMeasurements {
  measurementTable: GarmushkaMeasurement[];
  metersPerPixel: number; // Calibration value
  unitMode: "metric" | "imperial";
  isCalibrated: boolean;
  fileName: string; // Original file name
  pngExport?: string; // Base64 export of annotated image
}

interface GarmushkaMeasurement {
  id: string; // UUID
  name: string; // e.g., "סלון", "חדר שינה"
  type: "calibration" | "polyline" | "polygon";
  measurement: string; // e.g., "123.45 m²" or "5.5 m"
  notes: string; // User notes
  color: string; // Hex color code
}
```

#### GIS Screenshots Structure

```typescript
interface GISScreenshots {
  wideArea?: string; // Wide area map screenshot (base64 or URL)
  zoomedNoTazea?: string; // Zoomed without zoning layer
  zoomedWithTazea?: string; // Zoomed with zoning layer
  // Legacy fields for backward compatibility
  cropMode0?: string;
  cropMode1?: string;
}
```

#### Comparable Data Analysis Flow

```
CSV Upload -> ComparableDataViewer.handleCSVUpload()
          -> POST /api/comparable-data/import
          -> POST /api/comparable-data/analyze
          -> Parse section52 values (government data format)
          -> Calculate pricePerSqm, finalValuation
          -> updateData({ comparableDataAnalysis, comparableData, pricePerSqm })
```

---

### Step 5: Export (Step5Export.tsx & Step5ValuationPanel.tsx)

**Purpose**: Calculate final value and generate PDF/Word documents.

**Files**:

- `frontend/src/components/steps/Step5Export.tsx` (export controls)
- `frontend/src/components/steps/Step5ValuationPanel.tsx` (valuation calculation)

#### Key Functions (Step5Export)

| Function               | Purpose                        | API Endpoint                                |
| ---------------------- | ------------------------------ | ------------------------------------------- |
| `handleExportPDF()`    | Generate PDF document          | POST `/api/session/{sessionId}/export-pdf`  |
| `handleExportDocx()`   | Generate Word document         | POST `/api/session/{sessionId}/export-docx` |
| `handleDownloadPDF()`  | Re-download cached PDF blob    | -                                           |
| `handleDownloadDocx()` | Re-download cached Word blob   | -                                           |
| `openExportInNewTab()` | Open export in separate window | -                                           |

#### Key Functions (Step5ValuationPanel)

| Function                        | Purpose                                                    |
| ------------------------------- | ---------------------------------------------------------- |
| `parseNumeric(value, fallback)` | Safely parse numeric values (handles strings from backend) |
| `formatNumber(num)`             | Format with Hebrew locale (thousands separator)            |
| `handleStartEdit()`             | Enter edit mode for manual value adjustment                |
| `handleAutoSave()`              | Auto-save on input blur (debounced)                        |
| `handleSaveEdit()`              | Save and exit edit mode                                    |

#### Valuation Calculation Logic

```typescript
// Measured Area Sources (priority order):
const measuredArea =
  data.apartmentSqm || // 1. From Garmushka measurements (most accurate)
  data.area || // 2. From Step 1 manual input
  data.registeredArea || // 3. From Tabu extraction
  0;

// Price Per Sqm Sources (priority order):
const pricePerSqm =
  data.pricePerSqm || // 1. Directly set value
  data.comparableDataAnalysis?.averagePricePerSqm || // 2. From comparable analysis
  data.marketAnalysis?.averagePricePerSqm || // 3. From market analysis
  data.comparableDataAnalysis?.section52?.final_price_per_sqm || // 4. From section 52 data
  0;

// Final Value Calculation:
const finalValue = measuredArea * pricePerSqm;

// Display fallback (if calculation is 0):
const displayValue =
  finalValue > 0
    ? finalValue
    : data.finalValuation ||
      data.comparableDataAnalysis?.estimatedValue ||
      data.comparableDataAnalysis?.section52?.asset_value_nis ||
      0;
```

---

## 5. Key Functions Reference

### ValuationContext (frontend/src/contexts/ValuationContext.tsx)

The central state management for the wizard, providing global state and persistence.

#### State Interface

```typescript
interface ValuationState {
  data: ValuationData; // Current valuation data (all fields)
  hasUnsavedChanges: boolean; // Dirty flag for UI indicators
  lastSavedData: ValuationData; // For change detection
  sessionId: string | null; // Current session ID (from URL or localStorage)
  valuationId: string | null; // Database ID after first save
  isLoading: boolean; // Loading state
  isInitialLoad: boolean; // First load flag (prevents saves during load)
}
```

#### Key Functions

| Function                 | Signature                                                            | Purpose                                   |
| ------------------------ | -------------------------------------------------------------------- | ----------------------------------------- |
| `updateData`             | `(updates: Partial<ValuationData>, options?: SaveOptions) => void`   | Update data with optional auto-save skip  |
| `saveManually`           | `() => Promise<SaveResult>`                                          | Explicit save (called on step navigation) |
| `resetToSaved`           | `() => void`                                                         | Revert to last saved data                 |
| `saveGISDataToDB`        | `(gisData: GISScreenshots) => Promise<void>`                         | Save GIS screenshots                      |
| `saveGarmushkaDataToDB`  | `(data: GarmushkaMeasurements) => Promise<void>`                     | Save measurements                         |
| `saveFinalResultsToDB`   | `(finalVal, pricePerSqm, comparableData, analysis) => Promise<void>` | Save final valuation                      |
| `handleValidationChange` | `(step: number, isValid: boolean) => void`                           | Update step validation status             |

#### updateData Implementation Details

```typescript
const updateData: UpdateDataFn = (updates, options) => {
  setData((prev) => {
    const newData = { ...prev, ...updates };

    // Check for actual changes (prevents unnecessary saves)
    const hasActualChanges = Object.keys(updates).some((key) => {
      const oldValue = prev[key];
      const newValue = updates[key];
      // Deep comparison for objects, simple for primitives
      return !deepEqual(oldValue, newValue);
    });

    if (!hasActualChanges) {
      console.log("No actual changes detected, skipping save");
      return prev;
    }

    // Meaningful updates trigger auto-save
    const isMeaningfulUpdate =
      updates.uploads ||
      updates.extractedData ||
      updates.gisScreenshots ||
      updates.garmushkaMeasurements ||
      updates.propertyImages ||
      updates.comparableData ||
      updates.structuredFootnotes ||
      updates.customDocumentEdits;

    if (isMeaningfulUpdate && !options?.skipAutoSave) {
      debouncedSave(newData); // 1 second debounce
    }

    return newData;
  });
};
```

### useShumaDB Hook (frontend/src/hooks/useShumaDB.ts)

Database operations hook with error handling and loading states.

#### Key Methods

| Method                         | Signature                                                                    | API Action                      |
| ------------------------------ | ---------------------------------------------------------------------------- | ------------------------------- |
| `saveShumaToDatabase`          | `(sessionId, orgId, userId, data) => Promise<SaveShumaResult>`               | save_to_db                      |
| `loadShumaForWizard`           | `(sessionId) => Promise<LoadShumaResult>`                                    | load_from_db                    |
| `saveGISData`                  | `(sessionId, gisData) => Promise<HookResult>`                                | save_gis_data                   |
| `saveGarmushkaData`            | `(sessionId, data) => Promise<HookResult>`                                   | save_garmushka                  |
| `saveFinalResults`             | `(sessionId, finalVal, price, comparables, analysis) => Promise<HookResult>` | save_final_results              |
| `savePermitExtraction`         | `(sessionId, data, filename) => Promise<PermitResult>`                       | save_permit_extraction          |
| `saveLandRegistryExtraction`   | `(sessionId, data, filename) => Promise<LandRegistryResult>`                 | save_land_registry_extraction   |
| `saveSharedBuildingExtraction` | `(sessionId, data, filename) => Promise<SharedBuildingResult>`               | save_shared_building_extraction |
| `getAllExtractedData`          | `(sessionId) => Promise<ExtractedDataResult>`                                | get_all_extracted_data          |
| `getUserShumas`                | `() => Promise<ShumaListResult>`                                             | get_valuations                  |
| `searchShumas`                 | `(searchTerm?, status?) => Promise<ShumaListResult>`                         | search_valuations               |

#### Return Types

```typescript
interface HookResult {
  success: boolean;
  error?: string;
}

interface SaveShumaResult extends HookResult {
  shumaId?: number; // Database ID
}

interface LoadShumaResult extends HookResult {
  valuationData?: ValuationData;
}
```

### ShumaDB Class (backend/src/models/ShumaDB.js)

Main database operations class handling all PostgreSQL interactions.

#### Key Static Methods

| Method                                                    | Purpose                                           |
| --------------------------------------------------------- | ------------------------------------------------- |
| `saveShumaFromSession(sessionId, orgId, userId, data)`    | Complete save with transaction (main entry point) |
| `loadShumaForWizard(sessionId, skipCache)`                | Load with 5-second cache for performance          |
| `clearShumaCache(sessionId)`                              | Clear cache entry after save                      |
| `_saveShumaTable(client, sessionId, orgId, userId, data)` | Internal: save to main shuma table                |
| `_saveExtractedData(client, shumaId, sessionId, data)`    | Internal: save to normalized extraction tables    |
| `_saveGarmushkaData(client, shumaId, sessionId, data)`    | Internal: save measurements                       |
| `_saveGISScreenshots(client, shumaId, sessionId, data)`   | Internal: save GIS data                           |
| `_parseNumeric(value)`                                    | Helper: safely parse numeric strings              |

#### Transaction Flow

```javascript
static async saveShumaFromSession(sessionId, orgId, userId, valuationData) {
  const client = await db.client();
  try {
    await client.query('BEGIN');

    // 1. Save/Update main shuma table (69+ columns)
    const shumaResult = await this._saveShumaTable(
      client, sessionId, orgId, userId, valuationData
    );
    const shumaId = shumaResult.shumaId;

    // 2. Save extracted data to normalized tables
    if (valuationData.extractedData) {
      await this._saveExtractedData(client, shumaId, sessionId, valuationData.extractedData);
    }

    // 3. Save Garmushka measurements
    if (valuationData.garmushkaMeasurements) {
      await this._saveGarmushkaData(client, shumaId, sessionId, valuationData.garmushkaMeasurements);
    }

    // 4. Save GIS screenshots
    if (valuationData.gisScreenshots) {
      await this._saveGISScreenshots(client, shumaId, sessionId, valuationData.gisScreenshots);
    }

    await client.query('COMMIT');
    this.clearShumaCache(sessionId);  // Ensure fresh data on next load

    return { success: true, shumaId };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Save failed:', error);
    return { error: error.message };
  } finally {
    client.release();
  }
}
```

---

## 6. Data Flow Architecture

### Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER INTERACTION                               │
│                                  ↓                                       │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                    Step Component (Step1-5)                      │   │
│   │                           updateField(field, value)              │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                  ↓                                       │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                    ValuationContext                              │   │
│   │                    updateData(updates)                           │   │
│   │                         ↓                                        │   │
│   │              setData() → State Merge (prev + updates)            │   │
│   │                         ↓                                        │   │
│   │              debouncedSave() (1 second delay)                    │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                  ↓                                       │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                    useShumaDB Hook                               │   │
│   │              saveShumaToDatabase(sessionId, orgId, userId, data) │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                  ↓                                       │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                    POST /api/sessions                            │   │
│   │                    action: "save_to_db"                          │   │
│   │                    body: { sessionId, organizationId,            │   │
│   │                           userId, valuationData }                │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                  ↓                                       │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                    Backend Route Handler                         │   │
│   │                    ShumaDB.saveShumaFromSession(...)             │   │
│   │                    Transaction: BEGIN → Operations → COMMIT      │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                  ↓                                       │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │              PostgreSQL shuma table (70+ columns)                │   │
│   │              + Normalized extraction tables                      │   │
│   │              + garmushka table                                   │   │
│   │              + images table (GIS)                                │   │
│   └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Session ID Flow

```
1. URL Parameter: ?sessionId=xxx
   OR
2. localStorage: localStorage.getItem('shamay_session_id')
   OR
3. Generate New: Date.now().toString()

→ Stored in ValuationContext.sessionId
→ Stored in localStorage for persistence
→ Used as FK in all database operations
```

### Load Flow

```
1. ValuationProvider mounts
2. Check URL for ?sessionId=xxx
3. If not in URL, check localStorage
4. If found, call loadShumaForWizard(sessionId)
5. Response: { success: true, valuationData: {...} }
6. Merge with initialValuationData
7. setData(mergedData)
8. setLastSavedData(mergedData)
9. setIsInitialLoad(false) - enables saves
```

---

## 7. Transformation Layer

### CRITICAL: Naming Convention

The codebase uses **DUAL naming conventions** that MUST be respected:

- **Frontend (TypeScript)**: camelCase (e.g., `buildingNumber`, `pricePerSqm`)
- **Database (PostgreSQL)**: snake_case (e.g., `building_number`, `price_per_sqm`)

### Transformation File

**Location**: `frontend/src/lib/transformers/valuation-transformer.ts`

#### Core Functions

| Function                     | Direction              | Usage                         |
| ---------------------------- | ---------------------- | ----------------------------- |
| `transformToBackend(data)`   | camelCase → snake_case | Before API calls (saving)     |
| `transformFromBackend(data)` | snake_case → camelCase | After API responses (loading) |
| `keysToSnakeCase(obj)`       | Deep key transform     | Helper                        |
| `keysToCamelCase(obj)`       | Deep key transform     | Helper                        |
| `toSnakeCase(str)`           | Single string          | Helper                        |
| `toCamelCase(str)`           | Single string          | Helper                        |

#### Usage Example

```typescript
import {
  transformToBackend,
  transformFromBackend,
  getValueFromPaths
} from "@/lib/transformers/valuation-transformer";

// Saving to backend
const backendData = transformToBackend(frontendData);
await fetch('/api/sessions', {
  method: 'POST',
  body: JSON.stringify({
    action: 'save_to_db',
    valuationData: backendData  // Now in snake_case
  })
});

// Loading from backend
const response = await fetch('/api/sessions', { ... });
const result = await response.json();
const frontendData = transformFromBackend(result.valuationData);  // Now in camelCase
```

### Backward Compatibility with getValueFromPaths

For fields that may exist in multiple formats (especially in extractedData):

```typescript
// frontend/src/lib/transformers/valuation-transformer.ts
export function getValueFromPaths<T>(
  obj: Record<string, unknown>,
  paths: string[],
  defaultValue: T,
): T {
  for (const path of paths) {
    const parts = path.split(".");
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) break;
      current = (current as Record<string, unknown>)[part];
    }

    if (current !== null && current !== undefined) {
      return current as T;
    }
  }
  return defaultValue;
}

// Usage example - checking multiple possible paths
const subParcel = getValueFromPaths(
  data,
  [
    "extractedData.land_registry.sub_parcel", // AI extraction snake_case
    "extractedData.land_registry.subParcel", // AI extraction camelCase
    "extractedData.subParcel", // Direct camelCase
    "extractedData.sub_parcel", // Direct snake_case
    "subParcel", // Top-level camelCase
    "sub_parcel", // Top-level snake_case
  ],
  "",
);
```

---

## 8. Database Schema

### Main Table: `shuma`

The `shuma` table has 70+ columns. Here's the complete schema:

```sql
CREATE TABLE shuma (
  -- System/Metadata (5 columns)
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE NOT NULL,  -- Links to frontend session
  organization_id VARCHAR(255),              -- Multi-tenant isolation
  user_id VARCHAR(255),                      -- Creating user
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Basic Property Information (10 columns)
  street VARCHAR(255),
  building_number VARCHAR(50),
  city VARCHAR(255),
  neighborhood VARCHAR(255),
  full_address TEXT,
  rooms DECIMAL(3,1),
  floor VARCHAR(50),
  air_directions VARCHAR(255),
  area DECIMAL(10,2),
  property_essence VARCHAR(255),

  -- Cover Page Information (12 columns)
  client_name VARCHAR(255),
  client_title VARCHAR(255),
  client_note TEXT,
  client_relation VARCHAR(255),
  visit_date DATE,
  valuation_date DATE,
  valuation_type VARCHAR(255),
  valuation_effective_date DATE,
  reference_number VARCHAR(255),
  shamay_name VARCHAR(255),
  shamay_serial_number VARCHAR(255),
  appraiser_license_number VARCHAR(255),

  -- Legal Status / Land Registry (20 columns)
  gush VARCHAR(50),
  parcel VARCHAR(50),
  parcel_area DECIMAL(10,2),
  parcel_shape VARCHAR(255),
  parcel_surface VARCHAR(255),
  sub_parcel VARCHAR(255),
  registered_area DECIMAL(10,2),
  built_area DECIMAL(10,2),
  balcony_area DECIMAL(10,2),
  building_permit_number VARCHAR(255),
  building_permit_date DATE,
  building_description TEXT,
  building_floors INTEGER,
  building_units INTEGER,
  building_details TEXT,
  construction_source TEXT,
  attachments TEXT,
  ownership_rights TEXT,
  notes TEXT,
  registry_office VARCHAR(255),
  extract_date DATE,

  -- Property Description (3 columns)
  internal_layout TEXT,
  finish_standard VARCHAR(255),
  finish_details TEXT,

  -- JSONB Fields - Complex Nested Data (15 columns)
  extracted_data JSONB DEFAULT '{}',           -- AI extraction results
  property_analysis JSONB DEFAULT '{}',        -- Building analysis
  market_analysis JSONB DEFAULT '{}',          -- Market trends
  risk_assessment JSONB DEFAULT '{}',          -- Risk evaluation
  recommendations JSONB DEFAULT '[]',          -- Array of recommendations
  comparable_data JSONB DEFAULT '[]',          -- Array of comparables
  gis_analysis JSONB DEFAULT '{}',             -- GIS coordinates
  gis_screenshots JSONB DEFAULT '{}',          -- Map screenshot URLs/base64
  garmushka_measurements JSONB DEFAULT '{}',   -- Measurement data
  property_images JSONB DEFAULT '[]',          -- Image metadata array
  interior_images JSONB DEFAULT '[]',          -- Interior image array
  uploads JSONB DEFAULT '[]',                  -- Upload metadata array
  structured_footnotes JSONB DEFAULT '[]',     -- Footnotes array
  custom_tables JSONB DEFAULT '[]',            -- CSV table data
  custom_document_edits JSONB DEFAULT '{}',    -- User edits to document

  -- Valuation Results (3 columns)
  final_valuation DECIMAL(12,2) DEFAULT 0,
  price_per_sqm DECIMAL(10,2) DEFAULT 0,
  is_complete BOOLEAN DEFAULT FALSE,

  -- Special Fields (5 columns)
  land_contamination BOOLEAN DEFAULT FALSE,
  land_contamination_note TEXT,
  selected_image_index INTEGER DEFAULT 0,
  selected_image_preview TEXT,
  signature_preview TEXT
);

-- Index for fast session lookups
CREATE INDEX idx_shuma_session_id ON shuma(session_id);
CREATE INDEX idx_shuma_organization_id ON shuma(organization_id);
```

### Key JSONB Column Structures

#### extracted_data

```json
{
  "land_registry": {
    "gush": "1234",
    "chelka": "56",
    "sub_parcel": "1",
    "registration_office": "תל אביב",
    "extract_date": "2024-01-15",
    "owners": [
      {
        "name": "ישראל ישראלי",
        "id_number": "123456789",
        "ownership_share": "1/1"
      }
    ],
    "apartment_registered_area": 85.5,
    "attachments": "מרפסת - 12 מ\"ר, מחסן - 5 מ\"ר",
    "mortgages": [
      {
        "rank": "ראשונה",
        "amount": 500000,
        "lenders": "בנק לאומי"
      }
    ]
  },
  "building_permit": {
    "permit_number": "12345",
    "permit_date": "2020-01-15",
    "permitted_use": "מגורים",
    "local_committee": "תל אביב"
  },
  "shared_building": {
    "order_date": "2015-06-20",
    "floors_count": 5,
    "sub_plots_count": 20,
    "building_address": "הרצל 5, תל אביב"
  },
  "interior_analysis": {
    "property_layout_description": "דירת 4 חדרים, מרווחת...",
    "room_analysis": [
      {
        "room_type": "סלון",
        "size_estimate": "25 מ\"ר",
        "condition": "טוב"
      }
    ],
    "condition_assessment": "מצב כללי טוב, דרוש ריענון"
  },
  "exterior_analysis": {
    "building_condition": "טוב",
    "building_type": "בניין מגורים",
    "building_features": "מעלית, לובי מטופח"
  }
}
```

#### garmushka_measurements

```json
{
  "measurement_table": [
    {
      "id": "uuid-1",
      "name": "סלון",
      "type": "polygon",
      "measurement": "25.5 m\u00b2",
      "notes": "חדר ראשי",
      "color": "#ff0000"
    },
    {
      "id": "uuid-2",
      "name": "מסדרון",
      "type": "polyline",
      "measurement": "5.2 m",
      "notes": "אורך מסדרון",
      "color": "#00ff00"
    }
  ],
  "meters_per_pixel": 0.05,
  "unit_mode": "metric",
  "is_calibrated": true,
  "file_name": "floor-plan.png",
  "png_export": "data:image/png;base64,..."
}
```

#### gis_screenshots

```json
{
  "wide_area": "data:image/png;base64,...",
  "zoomed_no_tazea": "data:image/png;base64,...",
  "zoomed_with_tazea": "data:image/png;base64,..."
}
```

#### comparable_data

```json
[
  {
    "id": "comp-1",
    "address": "הרצל 7, תל אביב",
    "gush": "1234",
    "chelka": "58",
    "rooms": 4,
    "floor": 3,
    "area": 90,
    "construction_year": 1995,
    "sale_date": "2024-01-10",
    "declared_price": 2800000,
    "price_per_sqm": 31111,
    "distance": 150,
    "adjustment_factor": 1.05,
    "adjusted_price_per_sqm": 32667
  }
]
```

---

## 9. API Endpoints

### Sessions API (`POST /api/sessions`)

| Action                            | Body Parameters                                                          | Response                                                     | Purpose                 |
| --------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------ | ----------------------- |
| `save_to_db`                      | sessionId, organizationId, userId, valuationData                         | { success, shumaId }                                         | Save complete valuation |
| `load_from_db`                    | sessionId                                                                | { success, valuationData }                                   | Load valuation data     |
| `save_gis_data`                   | sessionId, gisData                                                       | { success }                                                  | Save GIS screenshots    |
| `save_garmushka`                  | sessionId, garmushkaData                                                 | { success }                                                  | Save measurements       |
| `save_final_results`              | sessionId, finalValuation, pricePerSqm, comparableData, propertyAnalysis | { success }                                                  | Save final valuation    |
| `save_permit_extraction`          | sessionId, permitData, documentFilename                                  | { success, permitId }                                        | Save permit extraction  |
| `save_land_registry_extraction`   | sessionId, landRegistryData, documentFilename                            | { success, landRegistryId }                                  | Save tabu extraction    |
| `save_shared_building_extraction` | sessionId, sharedBuildingData, documentFilename                          | { success, sharedBuildingId }                                | Save condo extraction   |
| `get_all_extracted_data`          | sessionId                                                                | { success, data: { permits, landRegistry, sharedBuilding } } | Get all extractions     |

### Session API (`/api/session/{sessionId}`)

| Method | Endpoint                              | Purpose                              |
| ------ | ------------------------------------- | ------------------------------------ |
| GET    | `/api/session/{id}`                   | Get session data                     |
| PUT    | `/api/session/{id}`                   | Update session data (partial update) |
| GET    | `/api/session/{id}/processing-status` | Get background processing status     |
| POST   | `/api/session/{id}/process-document`  | Trigger document processing          |
| GET    | `/api/session/{id}/ai-extractions`    | Get extraction history               |
| POST   | `/api/session/{id}/ai-extractions`    | Save AI extraction                   |
| PUT    | `/api/session/{id}/ai-extractions`    | Restore previous extraction          |

### Document Processing

| Method | Endpoint                                     | Purpose                      | Input            |
| ------ | -------------------------------------------- | ---------------------------- | ---------------- |
| POST   | `/api/session/{id}/land-registry-analysis`   | Extract from Tabu PDF        | File reference   |
| POST   | `/api/session/{id}/building-permit-analysis` | Extract from permit PDF      | File reference   |
| POST   | `/api/session/{id}/shared-building-analysis` | Extract from condo order PDF | File reference   |
| POST   | `/api/session/{id}/interior-analysis`        | Analyze interior images      | Image references |
| POST   | `/api/session/{id}/exterior-analysis`        | Analyze exterior images      | Image references |

### Export

| Method | Endpoint                        | Purpose                | Response         |
| ------ | ------------------------------- | ---------------------- | ---------------- |
| POST   | `/api/session/{id}/export-pdf`  | Generate PDF document  | Binary PDF blob  |
| POST   | `/api/session/{id}/export-docx` | Generate Word document | Binary DOCX blob |

### Files

| Method | Endpoint                              | Purpose                 |
| ------ | ------------------------------------- | ----------------------- |
| POST   | `/api/files/{sessionId}/upload`       | Upload file (multipart) |
| DELETE | `/api/session/{id}/upload/{uploadId}` | Delete uploaded file    |
| GET    | `/api/files/{sessionId}/{filename}`   | Get uploaded file       |

### Comparable Data

| Method | Endpoint                       | Purpose                                    |
| ------ | ------------------------------ | ------------------------------------------ |
| POST   | `/api/comparable-data/import`  | Import CSV data                            |
| POST   | `/api/comparable-data/analyze` | Analyze comparables and calculate averages |
| GET    | `/api/comparable-data/search`  | Search comparables database                |

---

## 10. Common Tasks

### Adding a New Field End-to-End

#### 1. Add to Types (frontend/src/types/valuation.ts)

```typescript
// In ValuationData interface (around line 363):
export interface ValuationData {
  // ... existing fields

  // Add your new field
  myNewField?: string; // Use optional (?) unless truly required
}

// Update initialValuationData (around line 513):
export const initialValuationData: ValuationData = {
  // ... existing fields
  myNewField: "", // Provide default value
};
```

#### 2. Add to Database Migration

```sql
-- Create file: backend/database/migrations/add_my_new_field.sql
ALTER TABLE shuma ADD COLUMN IF NOT EXISTS my_new_field VARCHAR(255);
```

#### 3. Update ShumaDB.js INSERT Query

In `_saveShumaTable` method (around line 521), add to INSERT:

```javascript
// Add to column list:
INSERT INTO shuma (
  ...,
  my_new_field  // Add here
) VALUES (
  ...,
  $XX  // Add parameter placeholder
)

// Add to parameters array (around line 552):
valuationData.myNewField || '',  // Add parameter
```

#### 4. Update ShumaDB.js UPDATE Query

In `_saveShumaTable` UPDATE (around line 671), add:

```javascript
my_new_field = COALESCE(NULLIF($XX, ''), my_new_field),
```

And add to parameters array.

#### 5. Add to Transformer (if special handling needed)

If field doesn't follow standard camelCase/snake_case:

```typescript
// frontend/src/lib/transformers/valuation-transformer.ts
const SPECIAL_FIELD_MAPPINGS: Record<string, string> = {
  // ... existing
  myNewField: "my_new_field", // Usually not needed
};
```

#### 6. Add to Step Component

```typescript
// In appropriate Step component (e.g., Step1InitialData.tsx):
<input
  type="text"
  value={formData.myNewField || ''}
  onChange={(e) => updateField('myNewField', e.target.value)}
  placeholder="הזן ערך"
/>
```

#### 7. Add to Document Generation (if displayed in report)

```typescript
// frontend/src/lib/document-template.ts or pdf/ modules:
const myNewFieldValue = getValueFromPaths(data, [
  'extractedData.myNewField',
  'myNewField'
], 'ברירת מחדל');

// Add to HTML template
<tr>
  <td>תווית חדשה</td>
  <td>${myNewFieldValue}</td>
</tr>
```

---

### Modifying Document Generation

**Orchestrator**: `frontend/src/lib/document-template.ts` (~1500 lines)
**Chapter Modules**: `frontend/src/lib/pdf/chapters/` (6 chapter generators)
**Utilities**: `frontend/src/lib/pdf/utils/`, `tables/`, `images/`, `styles/`

#### Using PDF Modules (Recommended)

```typescript
// Import from pdf/ modules
import {
  formatNumber,
  formatDateHebrew,
  formatCurrency,
  getValueFromPaths,
  createDetailsTable,
  buildBaseCss,
} from "@/lib/pdf";

// Use these utilities
const formattedPrice = formatCurrency(data.finalValuation);
const formattedDate = formatDateHebrew(data.valuationDate);
const tableHtml = createDetailsTable(data);
```

#### PDF Module Structure

```
frontend/src/lib/pdf/
├── index.ts              # Main exports - import from here
├── types.ts              # CompanySettings, FontFamily types
├── constants.ts          # FONT_FAMILIES, hebrewMonths, text constants
├── utils/
│   ├── formatters.ts     # formatNumber, formatDateHebrew, formatCurrency
│   ├── text.ts           # normalizeText, escapeHtmlForTable, toRichHtml
│   └── data-resolvers.ts # getValueFromPaths, getAddress, getSubParcelValue
├── tables/
│   ├── details-table.ts  # createDetailsTable (70+ fields)
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
    ├── index.ts              # Re-exports all chapter modules
    ├── chapter-context.ts    # createChapterContext, ChapterContext interface
    ├── chapter1-property.ts  # Property description, GIS, interior (~420 lines)
    ├── chapter2-legal.ts     # Legal status, ownership, notes (~220 lines)
    ├── chapter3-planning.ts  # Planning rights and status (~180 lines)
    ├── chapter4-factors.ts   # Valuation factors analysis (~150 lines)
    ├── chapter5-calculations.ts # Calculation methodology (~170 lines)
    └── chapter6-valuation.ts # Final valuation and summary (~120 lines)
```

**Chapter Generator Pattern**: Each chapter exports a `generateChapterN(ctx: ChapterContext, params?)` function that returns HTML string. The `ChapterContext` bundles all data and helper functions needed by chapters.

#### Adding a New Section to Document

```typescript
// In document-template.ts generateDocumentHTML():

const myNewSection = `
  <div class="section" style="page-break-before: always;">
    <h2 class="section-title">כותרת חדשה</h2>
    <div class="section-content">
      <table class="details-table">
        <tr>
          <td class="label">שדה חדש</td>
          <td class="value">${getValueFromPaths(data, ["myField"], "ברירת מחדל")}</td>
        </tr>
      </table>
    </div>
  </div>
`;

// Insert in the template at appropriate position
return `
  <!DOCTYPE html>
  <html dir="rtl" lang="he">
    ...
    ${existingSections}
    ${myNewSection}
    ...
  </html>
`;
```

---

### Adding a New API Endpoint

#### 1. Create Route Handler (backend/src/routes/sessions.js)

```javascript
// Add to existing router
router.post("/session/:sessionId/my-new-action", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { data } = req.body;

    // Validate input
    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required" });
    }

    // Your business logic
    const result = await ShumaDB.myNewMethod(sessionId, data);

    if (result.error) {
      return res.status(500).json({ error: result.error });
    }

    res.json({ success: true, result: result.data });
  } catch (error) {
    console.error("Error in my-new-action:", error);
    res.status(500).json({ error: error.message });
  }
});
```

#### 2. Add ShumaDB Method (backend/src/models/ShumaDB.js)

```javascript
/**
 * Description of what this method does
 * @param {string} sessionId - Session identifier
 * @param {Object} data - Data to process
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
static async myNewMethod(sessionId, data) {
  const client = await db.client();
  try {
    await client.query('BEGIN');

    // Your database operations
    const result = await client.query(
      'UPDATE shuma SET my_column = $1 WHERE session_id = $2 RETURNING *',
      [data.myValue, sessionId]
    );

    await client.query('COMMIT');

    // Clear cache after modification
    this.clearShumaCache(sessionId);

    return { success: true, data: result.rows[0] };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in myNewMethod:', error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}
```

#### 3. Add Frontend Hook Function (frontend/src/hooks/useShumaDB.ts)

```typescript
const myNewAction = useCallback(
  async (sessionId: string, data: MyDataType): Promise<HookResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/session/${sessionId}/my-new-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Operation failed");
      }

      return { success: true, ...result };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error("Error in myNewAction:", errorMessage);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  },
  [],
);

// Add to return object:
return {
  // ... existing methods
  myNewAction,
};
```

---

## 11. Testing

### Frontend Unit Tests (Vitest)

```bash
cd frontend && npm test
```

**Test Files**:

- `src/__tests__/lib/csv-export.test.ts` - CSV export functions
- `src/__tests__/components/steps/AIGeneratedField.test.tsx` - Auto-save behavior
- `src/__tests__/components/steps/Step5Export.test.tsx` - Export functionality
- `src/__tests__/components/steps/Step5ValuationPanel.test.tsx` - Valuation calculation

**Writing a Test**:

```typescript
// src/__tests__/components/MyComponent.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MyComponent } from '@/components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent data={mockData} />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('should handle click events', async () => {
    const mockHandler = vi.fn();
    render(<MyComponent onClick={mockHandler} />);

    fireEvent.click(screen.getByRole('button'));
    expect(mockHandler).toHaveBeenCalled();
  });
});
```

### Backend Integration Tests (Jest)

```bash
cd backend && npm test
```

**Test Files**:

- `src/__tests__/sessions.test.js` - API endpoint tests

### E2E Tests (Playwright)

```bash
cd frontend && npm run test:e2e
```

**Test Files**:

- `e2e/step5-export.spec.ts` - Export UI tests
- `e2e/auto-save.spec.ts` - Auto-save behavior
- `e2e/wizard-flow.spec.ts` - Complete wizard flow

### Type Checking

```bash
cd frontend && npm run type-check
```

---

## 12. Troubleshooting

### Common Issues and Solutions

#### Data Not Saving

1. **Check browser console for errors**

   ```javascript
   // Look for these log patterns:
   // "Saving data:..." - save initiated
   // "No actual changes detected" - skipped
   // "Error:" - failure
   ```

2. **Verify sessionId exists**

   ```typescript
   const { sessionId } = useValuation();
   console.log("Current sessionId:", sessionId); // Should not be null
   ```

3. **Check user authentication**

   ```typescript
   const { data: session } = useSession();
   console.log("User:", session?.user); // Should have organizationId, id
   ```

4. **Check network tab for API failures**
   - Look for POST /api/sessions requests
   - Check response status and body

#### Field Not Showing in Document

1. **Check document-template.ts**
   - Search for field name in the file
   - Verify it's included in output HTML

2. **Verify field path in getValueFromPaths**

   ```typescript
   // Debug what paths work:
   console.log("Direct:", data.myField);
   console.log("ExtractedData:", data.extractedData?.myField);
   console.log(
     "FromPaths:",
     getValueFromPaths(data, ["myField", "extractedData.myField"], "default"),
   );
   ```

3. **Check both naming conventions**
   ```typescript
   // Field might be in snake_case from AI extraction
   const value =
     data.myField ||
     data["my_field"] ||
     data.extractedData?.myField ||
     data.extractedData?.["my_field"];
   ```

#### Naming Convention Issues

1. **Frontend should always use camelCase**

   ```typescript
   // Correct:
   data.buildingNumber;
   // Incorrect:
   data.building_number;
   ```

2. **Database always uses snake_case**

   ```sql
   -- Correct:
   SELECT building_number FROM shuma
   ```

3. **ExtractedData may have both (backward compatibility)**
   ```typescript
   // AI extraction might return either format
   const value = getValueFromPaths(
     data,
     ["extractedData.buildingNumber", "extractedData.building_number"],
     "",
   );
   ```

### Debug Logging

**Enable detailed backend logging:**

```bash
DEBUG_DB_QUERIES=true npm run dev
```

**Frontend component debugging:**

```typescript
// In component:
useEffect(() => {
  console.log("Component state:", {
    data: JSON.stringify(data, null, 2),
    extractedDataKeys: Object.keys(data.extractedData || {}),
    sessionId,
    hasUnsavedChanges,
  });
}, [data, sessionId, hasUnsavedChanges]);
```

**API debugging:**

```javascript
// In browser console:
fetch("/api/sessions", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    action: "load_from_db",
    sessionId: "your-session-id",
  }),
})
  .then((r) => r.json())
  .then(console.log);
```

---

## 13. File References

### Documentation

- **CLAUDE.md** - Complete project documentation (detailed API, database schema)
- **AGENTS.md** - This file (AI agent guide)

### Key Source Files

| File                                                     | Purpose                                   | Lines |
| -------------------------------------------------------- | ----------------------------------------- | ----- |
| `frontend/src/types/valuation.ts`                        | Type definitions (SINGLE SOURCE OF TRUTH) | ~550  |
| `frontend/src/contexts/ValuationContext.tsx`             | Global state management                   | ~720  |
| `frontend/src/hooks/useShumaDB.ts`                       | Database operations hook                  | ~560  |
| `frontend/src/lib/transformers/valuation-transformer.ts` | camelCase ↔ snake_case                    | ~530  |
| `frontend/src/lib/document-template.ts`                  | HTML document orchestration               | ~1500 |
| `frontend/src/lib/pdf/`                                  | PDF utilities + chapter generators        | ~3500 |
| `backend/src/models/ShumaDB.js`                          | Database operations                       | ~2700 |
| `backend/src/routes/sessions.js`                         | API endpoints                             | ~500  |

### Step Components

| File                                                    | Purpose                    | Lines |
| ------------------------------------------------------- | -------------------------- | ----- |
| `frontend/src/app/wizard/page.tsx`                      | Wizard orchestrator        | ~800  |
| `frontend/src/components/steps/Step1InitialData.tsx`    | Initial data entry         | ~700  |
| `frontend/src/components/steps/Step2Documents.tsx`      | Document upload/extraction | ~1200 |
| `frontend/src/components/steps/Step3Validation.tsx`     | Validation container       | ~400  |
| `frontend/src/components/steps/Step3FieldsPanel.tsx`    | 69 editable fields         | ~2900 |
| `frontend/src/components/steps/Step4AIAnalysis.tsx`     | GIS/Garmushka/Market       | ~1100 |
| `frontend/src/components/steps/Step5Export.tsx`         | Export controls            | ~500  |
| `frontend/src/components/steps/Step5ValuationPanel.tsx` | Final valuation            | ~360  |

---

## Git Workflow

**IMPORTANT: Always push to the official repo, NOT the dev repo!**

```bash
# Check remotes
git remote -v
# official -> https://github.com/yaronbeen/Shamay_AI_Official.git (PUSH HERE)
# origin -> https://github.com/yaronbeen/shamay_shalom_18dev.git (DO NOT PUSH)

# Push to official
git push official main

# NEVER do:
# git push origin main  # Wrong!
```

---

## Beads Issue Tracking

```bash
bd list --status=open    # Show open issues
bd ready                 # Show ready to work
bd stats                 # Project statistics
bd show <id>             # Issue details
bd create --title="..." --type=task --priority=2  # Create issue
bd close <id>            # Close issue
```

**Known Issues to Be Aware Of**:

- #972: `apartmentSqm` vs `apartmentRegisteredArea` naming
- #lqb: `parcel` vs `chelka` terminology
- #ii1: Expand table filters for comparable data
- #dfo: Refactor updateData() function

---

_Last updated: 2026-01-14 (Chapter extraction refactor complete)_
_For additional context, see CLAUDE.md_
