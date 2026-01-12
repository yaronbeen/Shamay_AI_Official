# Shamay AI - System Architecture

## Overview

Shamay AI is a Hebrew real estate valuation wizard application. This document describes the system architecture, data flow, naming conventions, and key integration points.

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Data Flow](#data-flow)
3. [Type System](#type-system)
4. [Naming Conventions](#naming-conventions)
5. [State Management](#state-management)
6. [Key Files Reference](#key-files-reference)
7. [Database Schema](#database-schema)
8. [API Endpoints](#api-endpoints)

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Next.js)                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    ValuationContext                              │    │
│  │  (Centralized State Management)                                  │    │
│  │  - data: ValuationData                                          │    │
│  │  - updateData(), saveManually()                                 │    │
│  │  - saveGISDataToDB(), saveGarmushkaDataToDB()                   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│           │                                                              │
│           │ Context Provider                                             │
│           ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    WizardPage                                    │    │
│  │  - Step navigation                                              │    │
│  │  - URL-based routing (/wizard?step=1&sessionId=xxx)            │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│           │                                                              │
│           ▼                                                              │
│  ┌───────┬───────┬───────┬───────┬───────┐                             │
│  │Step1  │Step2  │Step3  │Step4  │Step5  │                             │
│  │Initial│Docs   │Valid  │AI     │Export │                             │
│  └───────┴───────┴───────┴───────┴───────┘                             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/REST API
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (Express.js)                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    API Routes                                    │    │
│  │  /api/session/:id          - Session CRUD                       │    │
│  │  /api/sessions             - Multi-action endpoint              │    │
│  │  /api/session/:id/export-* - PDF/DOCX export                   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│           │                                                              │
│           │ Zod Validation (where implemented)                           │
│           ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    ShumaDB.js                                    │    │
│  │  (Database Operations - 2,700+ lines)                           │    │
│  │  - saveShumaFromSession()                                       │    │
│  │  - loadShumaForWizard()                                         │    │
│  │  - saveGISData(), saveGarmushkaData()                           │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│           │                                                              │
│           ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    PostgreSQL (Neon)                             │    │
│  │  - shuma table (69+ columns)                                    │    │
│  │  - valuation_sessions table                                     │    │
│  │  - comparable_data, asset_details, etc.                         │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Save Flow

```
User Edit
    │
    ▼
updateData(partial) ──► ValuationContext
    │
    ├──► Immediate state update (setData)
    │
    └──► debouncedSave (1000ms delay)
              │
              ▼
         POST /api/session/:id
              │
              ▼
         ShumaDB.saveShumaFromSession()
              │
              ├──► shuma table (69 columns)
              └──► Related tables (comparable_data, etc.)
```

### Load Flow

```
Page Load / Session Resume
    │
    ▼
GET /api/session/:id
    │
    ▼
ShumaDB.loadShumaForWizard()
    │
    ├──► Cache check (5-second TTL)
    │
    └──► PostgreSQL query
              │
              ▼
         safeParseJSON() for JSONB fields
              │
              ▼
         Frontend receives camelCase data
              │
              ▼
         ValuationContext updates state
```

### Export Flow

```
Step 5 "Export PDF"
    │
    ▼
POST /api/session/:id/export-pdf
    │
    ▼
converter.ts: convertValuationDataToReportData()
    │
    ▼
document-template.ts: generateDocumentHTML()
    │
    ▼
Puppeteer PDF generation
    │
    ▼
PDF blob returned to frontend
```

---

## Type System

### Single Source of Truth

All types are defined in `frontend/src/types/valuation.ts`. This is the **ONLY** location where ValuationData types should be defined.

```typescript
// Location: frontend/src/types/valuation.ts

// Core interface - all fields use camelCase
export interface ValuationData {
  // Property identification
  street?: string;
  buildingNumber?: string;
  city?: string;
  gush?: string; // Block number (גוש)
  chelka?: string; // Parcel number (חלקה)
  subChelka?: string; // Sub-parcel (תת-חלקה)

  // Property details
  apartmentSqm?: number; // Measured area from Garmushka
  rooms?: number;
  floor?: number;

  // Valuation results
  pricePerSqm?: number;
  finalValuation?: number;

  // Complex nested data
  extractedData?: ExtractedData;
  comparableDataAnalysis?: ComparableDataAnalysis;
  garmushkaMeasurements?: GarmushkaMeasurements;
  // ... 400+ fields total
}
```

### Import Pattern

All files should import types from the centralized location:

```typescript
// ✅ CORRECT - Single source of truth
import { ValuationData, ExtractedData } from "@/types/valuation";

// ❌ WRONG - Do not import from component files
import { ValuationData } from "../ValuationWizard";
import { ValuationData } from "@/components/ValuationWizard";
```

### Transformation Layer

The transformer handles conversion between frontend (camelCase) and backend (snake_case):

```typescript
// Location: frontend/src/lib/transformers/valuation-transformer.ts

// Convert before sending to backend
export function toBackend(data: ValuationData): BackendValuationData;

// Convert after receiving from backend
export function fromBackend(data: BackendValuationData): ValuationData;

// Utility functions
export function toSnakeCase(str: string): string;
export function toCamelCase(str: string): string;
export function keysToSnakeCase(obj: object): object;
export function keysToCamelCase(obj: object): object;
```

---

## Naming Conventions

### Frontend: camelCase

All frontend code uses camelCase for field names:

```typescript
// Frontend fields
const data = {
  buildingNumber: "5",
  apartmentSqm: 120,
  subChelka: "1",
  garmushkaMeasurements: { ... }
};
```

### Backend: snake_case

Database columns and backend fields use snake_case:

```sql
-- Database columns
building_number VARCHAR(255),
apartment_sqm DECIMAL,
sub_chelka VARCHAR(100),
garmushka_measurements JSONB
```

### Transformation Rules

The transformation layer in `valuation-transformer.ts` handles conversion automatically:

| Frontend (camelCase)    | Backend (snake_case)     |
| ----------------------- | ------------------------ |
| `buildingNumber`        | `building_number`        |
| `apartmentSqm`          | `apartment_sqm`          |
| `subChelka`             | `sub_chelka`             |
| `garmushkaMeasurements` | `garmushka_measurements` |
| `extractedData`         | `extracted_data`         |

---

## State Management

### ValuationContext

The `ValuationContext` provides centralized state management:

```typescript
// Location: frontend/src/contexts/ValuationContext.tsx

interface ValuationContextValue {
  // State
  data: ValuationData;
  hasUnsavedChanges: boolean;
  lastSavedData: ValuationData | null;
  sessionId: string | null;

  // Core operations
  updateData: (updates: Partial<ValuationData>, options?: SaveOptions) => void;
  saveManually: () => Promise<SaveResult>;
  resetToSaved: () => void;

  // Specialized saves
  saveGISDataToDB: (gisData: unknown) => Promise<void>;
  saveGarmushkaDataToDB: (garmushkaData: unknown) => Promise<void>;
  saveFinalResultsToDB: (...args) => Promise<void>;

  // Validation
  stepValidation: StepValidation;
  handleValidationChange: (step: number, isValid: boolean) => void;
}
```

### Usage in Components

```typescript
// In any component under ValuationProvider
import { useValuation } from '@/contexts/ValuationContext';

function MyComponent() {
  const { data, updateData, saveManually } = useValuation();

  const handleChange = (value: string) => {
    updateData({ street: value });
  };

  return <input value={data.street} onChange={e => handleChange(e.target.value)} />;
}
```

---

## Key Files Reference

### Frontend Core

| File                                        | Purpose                     | Lines |
| ------------------------------------------- | --------------------------- | ----- |
| `types/valuation.ts`                        | **Type definitions (SSoT)** | ~525  |
| `contexts/ValuationContext.tsx`             | State management            | ~500  |
| `lib/transformers/valuation-transformer.ts` | camelCase ↔ snake_case      | ~200  |
| `app/wizard/page.tsx`                       | Wizard orchestration        | ~1000 |
| `components/EditableDocumentPreview.tsx`    | Document preview/edit       | ~1964 |

### Step Components

| File                                    | Purpose                             |
| --------------------------------------- | ----------------------------------- |
| `components/steps/Step1InitialData.tsx` | Property identification form        |
| `components/steps/Step2Documents.tsx`   | Document upload interface           |
| `components/steps/Step3Validation.tsx`  | Data validation & extraction review |
| `components/steps/Step4AIAnalysis.tsx`  | AI analysis with comparable data    |
| `components/steps/Step5Export.tsx`      | Valuation calculation & PDF export  |

### Backend Core

| File                 | Purpose                          | Lines   |
| -------------------- | -------------------------------- | ------- |
| `models/ShumaDB.js`  | **Database operations (facade)** | ~3200   |
| `routes/sessions.js` | Session API endpoints            | ~200    |
| `routes/export-*.js` | Export functionality             | various |

### Backend Services (NEW - Modular Architecture)

| File                             | Purpose                          | Lines |
| -------------------------------- | -------------------------------- | ----- |
| `services/DatabaseClient.js`     | Shared DB connection & utilities | ~200  |
| `services/ValuationService.js`   | Core valuation CRUD operations   | ~350  |
| `services/GISService.js`         | GIS screenshot management        | ~150  |
| `services/GarmushkaService.js`   | Measurement data management      | ~200  |
| `services/ExtractionService.js`  | AI extraction & history          | ~400  |
| `services/FileStorageService.js` | File storage (local/Vercel Blob) | ~150  |

**Usage:**

```javascript
// New code should import services directly:
const { ValuationService, GISService } = require("../services");

// Or from ShumaDB for backward compatibility:
const { ValuationService, ShumaDB } = require("./models/ShumaDB");
```

### Hooks

| File                           | Purpose                  |
| ------------------------------ | ------------------------ |
| `hooks/useShumaDB.ts`          | Database operations hook |
| `hooks/useValuationSession.ts` | Session management       |

---

## Database Schema

### Main Tables

```sql
-- Primary valuation storage
shuma (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE,
  organization_id VARCHAR(255),
  user_id VARCHAR(255),

  -- Property identification (69+ columns)
  street VARCHAR(255),
  building_number VARCHAR(100),
  city VARCHAR(255),
  gush VARCHAR(50),
  chelka VARCHAR(50),
  sub_chelka VARCHAR(100),

  -- JSONB for complex data
  extracted_data JSONB,
  gis_screenshots JSONB,
  garmushka_measurements JSONB,
  comparable_data_analysis JSONB,
  structured_footnotes JSONB,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)

-- Session state
valuation_sessions (
  id VARCHAR(255) PRIMARY KEY,
  data JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  expires_at TIMESTAMP
)

-- Comparable properties
comparable_data (
  id SERIAL PRIMARY KEY,
  shuma_id INTEGER REFERENCES shuma(id),
  property_data JSONB,
  analysis_results JSONB
)
```

### Field Mapping: Database → Frontend

| Database Column            | Frontend Field           | Description           |
| -------------------------- | ------------------------ | --------------------- |
| `street`                   | `street`                 | Street name           |
| `building_number`          | `buildingNumber`         | Building number       |
| `apartment_sqm`            | `apartmentSqm`           | Measured area         |
| `sub_chelka`               | `subChelka`              | Sub-parcel number     |
| `gush`                     | `gush`                   | Block number          |
| `chelka`                   | `chelka`                 | Parcel number         |
| `extracted_data`           | `extractedData`          | AI extraction results |
| `garmushka_measurements`   | `garmushkaMeasurements`  | Measurement data      |
| `comparable_data_analysis` | `comparableDataAnalysis` | Comparable analysis   |
| `structured_footnotes`     | `structuredFootnotes`    | Document footnotes    |
| `property_images`          | `propertyImages`         | Property photos       |
| `gis_screenshots`          | `gisScreenshots`         | GIS map images        |

---

## API Endpoints

### Session Operations

```typescript
// Get session data
GET /api/session/:sessionId
Response: { data: ValuationData, sessionId: string }

// Update session data
PUT /api/session/:sessionId
Body: { data: Partial<ValuationData> }
Response: { success: boolean }

// Multi-action endpoint
POST /api/sessions
Body: {
  action: 'save_to_db' | 'load_from_db' | 'save_gis_data' | 'save_garmushka' | 'save_final_results',
  sessionId: string,
  data: any
}
```

### Export Operations

```typescript
// Export PDF
POST /api/session/:sessionId/export-pdf
Response: application/pdf blob

// Export DOCX
POST /api/session/:sessionId/export-docx
Response: application/vnd.openxmlformats-officedocument.wordprocessingml.document blob
```

---

## Architecture Principles

### 1. Single Source of Truth

- **Types**: All types in `@/types/valuation.ts`
- **State**: All state in `ValuationContext`
- **Naming**: Frontend uses camelCase, transformers handle conversion

### 2. Separation of Concerns

- **Presentation**: Step components render UI
- **State**: Context manages data and persistence
- **Transformation**: Separate layer for format conversion
- **Persistence**: Backend handles database operations

### 3. Validation at Boundaries

- **Frontend**: Zod schemas validate before save
- **Backend**: Middleware validates incoming requests
- **Database**: Constraints enforce data integrity

### 4. Avoid Prop Drilling

Components access data via `useValuation()` hook instead of passing props through multiple levels.

---

## Future Improvements

1. **Convert backend to TypeScript** - Add type safety to ShumaDB.js
2. **Split ShumaDB.js** - Break into domain services (SessionService, ValuationService, etc.)
3. **Add JSDoc documentation** - Document critical backend methods
4. **Database normalization** - Extract JSONB arrays to proper tables
5. **API contract tests** - Ensure frontend/backend alignment

---

_Last updated: January 2026_
