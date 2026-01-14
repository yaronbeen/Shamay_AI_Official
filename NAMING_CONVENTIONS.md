# Field Naming Conventions

This document provides a comprehensive reference for field naming conventions used throughout the Shamay.AI codebase. The system uses a dual naming convention that must be carefully managed.

## Table of Contents

1. [Overview](#overview)
2. [Naming Convention Rules](#naming-convention-rules)
3. [Field Mapping Table](#field-mapping-table)
4. [Problem Fields](#problem-fields)
5. [ExtractedData Paths](#extracteddata-paths)
6. [Best Practices](#best-practices)
7. [Quick Reference](#quick-reference)

---

## Overview

### The Dual Naming System

| Layer | Convention | Example |
|-------|------------|---------|
| **Frontend (TypeScript)** | camelCase | `buildingNumber` |
| **Backend/Database (PostgreSQL)** | snake_case | `building_number` |
| **ExtractedData (JSONB)** | **BOTH** (for compatibility) | `subParcel` OR `sub_parcel` |

### Transformation Layer

The transformer functions in `frontend/src/lib/transformers/valuation-transformer.ts` handle all conversions:

```typescript
// Converting frontend -> backend (for API calls)
transformToBackend(frontendData)  // camelCase -> snake_case

// Converting backend -> frontend (after API responses)
transformFromBackend(backendData)  // snake_case -> camelCase

// Utility functions
toSnakeCase("buildingNumber")  // -> "building_number"
toCamelCase("building_number") // -> "buildingNumber"
```

---

## Naming Convention Rules

### Standard Conversion

Most fields follow predictable conversion:

| camelCase | snake_case |
|-----------|------------|
| `buildingNumber` | `building_number` |
| `pricePerSqm` | `price_per_sqm` |
| `finalValuation` | `final_valuation` |
| `valuationDate` | `valuation_date` |

### Fields That Don't Convert

Some fields are the same in both conventions:

| Field | Reason |
|-------|--------|
| `gush` | Single word (Hebrew: block number) |
| `chelka` | Single word (Hebrew: parcel number) |
| `sqm` | Abbreviation |
| `id` | Single word |

---

## Field Mapping Table

### Basic Property Information

| Frontend (camelCase) | Database (snake_case) | Type | Notes |
|---------------------|----------------------|------|-------|
| `street` | `street` | VARCHAR(255) | Same |
| `buildingNumber` | `building_number` | VARCHAR(50) | |
| `city` | `city` | VARCHAR(255) | Same |
| `neighborhood` | `neighborhood` | VARCHAR(255) | Same |
| `fullAddress` | `full_address` | TEXT | |
| `rooms` | `rooms` | DECIMAL(3,1) | Same |
| `floor` | `floor` | VARCHAR(50) | Same |
| `airDirections` | `air_directions` | VARCHAR(255) | |
| `area` | `area` | DECIMAL(10,2) | Same |
| `propertyEssence` | `property_essence` | VARCHAR(255) | |

### Cover Page / Client Information

| Frontend (camelCase) | Database (snake_case) | Type | Notes |
|---------------------|----------------------|------|-------|
| `clientName` | `client_name` | VARCHAR(255) | |
| `clientTitle` | `client_title` | VARCHAR(255) | |
| `clientNote` | `client_note` | TEXT | |
| `clientRelation` | `client_relation` | VARCHAR(255) | |
| `visitDate` | `visit_date` | DATE | |
| `valuationDate` | `valuation_date` | DATE | |
| `valuationType` | `valuation_type` | VARCHAR(255) | |
| `valuationEffectiveDate` | `valuation_effective_date` | DATE | |
| `referenceNumber` | `reference_number` | VARCHAR(255) | |
| `shamayName` | `shamay_name` | VARCHAR(255) | |
| `shamaySerialNumber` | `shamay_serial_number` | VARCHAR(255) | |
| `appraiserLicenseNumber` | `appraiser_license_number` | VARCHAR(255) | |

### Land Registry / Legal Status

| Frontend (camelCase) | Database (snake_case) | Type | Notes |
|---------------------|----------------------|------|-------|
| `gush` | `gush` | VARCHAR(50) | Same (Hebrew: block) |
| `parcel` | `parcel` | VARCHAR(50) | Same |
| `parcelArea` | `parcel_area` | DECIMAL(10,2) | |
| `parcelShape` | `parcel_shape` | VARCHAR(255) | |
| `parcelSurface` | `parcel_surface` | VARCHAR(255) | |
| `subParcel` | `sub_parcel` | VARCHAR(255) | **Problem field** |
| `registeredArea` | `registered_area` | DECIMAL(10,2) | |
| `builtArea` | `built_area` | DECIMAL(10,2) | |
| `balconyArea` | `balcony_area` | DECIMAL(10,2) | |
| `registryOffice` | `registry_office` | VARCHAR(255) | |
| `extractDate` | `extract_date` | DATE | |

### Building Information

| Frontend (camelCase) | Database (snake_case) | Type | Notes |
|---------------------|----------------------|------|-------|
| `buildingPermitNumber` | `building_permit_number` | VARCHAR(255) | |
| `buildingPermitDate` | `building_permit_date` | DATE | |
| `buildingDescription` | `building_description` | TEXT | |
| `buildingFloors` | `building_floors` | INTEGER | |
| `buildingUnits` | `building_units` | INTEGER | |
| `buildingDetails` | `building_details` | TEXT | |
| `constructionSource` | `construction_source` | TEXT | |

### Property Details

| Frontend (camelCase) | Database (snake_case) | Type | Notes |
|---------------------|----------------------|------|-------|
| `attachments` | `attachments` | TEXT | Same |
| `ownershipRights` | `ownership_rights` | TEXT | |
| `notes` | `notes` | TEXT | Same |
| `internalLayout` | `internal_layout` | TEXT | |
| `finishStandard` | `finish_standard` | VARCHAR(255) | |
| `finishDetails` | `finish_details` | TEXT | |

### Valuation Results

| Frontend (camelCase) | Database (snake_case) | Type | Notes |
|---------------------|----------------------|------|-------|
| `apartmentSqm` | `apartment_sqm` | DECIMAL(10,2) | **Problem field** |
| `finalValuation` | `final_valuation` | DECIMAL(12,2) | |
| `pricePerSqm` | `price_per_sqm` | DECIMAL(10,2) | |
| `isComplete` | `is_complete` | BOOLEAN | |

### Special Fields

| Frontend (camelCase) | Database (snake_case) | Type | Notes |
|---------------------|----------------------|------|-------|
| `landContamination` | `land_contamination` | BOOLEAN | |
| `landContaminationNote` | `land_contamination_note` | TEXT | |
| `selectedImageIndex` | `selected_image_index` | INTEGER | |
| `selectedImagePreview` | `selected_image_preview` | TEXT | |
| `signaturePreview` | `signature_preview` | TEXT | |

### JSONB Fields (Complex Objects)

| Frontend (camelCase) | Database (snake_case) | Content |
|---------------------|----------------------|---------|
| `extractedData` | `extracted_data` | AI extraction results |
| `propertyAnalysis` | `property_analysis` | Building analysis |
| `marketAnalysis` | `market_analysis` | Market trends |
| `riskAssessment` | `risk_assessment` | Risk evaluation |
| `recommendations` | `recommendations` | Recommendations array |
| `comparableData` | `comparable_data` | Comparable properties |
| `gisAnalysis` | `gis_analysis` | GIS coordinates |
| `gisScreenshots` | `gis_screenshots` | Map screenshots |
| `garmushkaMeasurements` | `garmushka_measurements` | Measurements |
| `propertyImages` | `property_images` | Image metadata |
| `interiorImages` | `interior_images` | Interior images |
| `uploads` | `uploads` | Upload metadata |
| `structuredFootnotes` | `structured_footnotes` | Footnotes |
| `customTables` | `custom_tables` | CSV tables |
| `customDocumentEdits` | `custom_document_edits` | Document edits |

---

## Problem Fields

These fields have known ambiguity and require special handling.

### 1. `apartmentSqm` vs `apartmentRegisteredArea`

**Issue:** Two different fields represent apartment area measurements.

| Field | Source | Purpose |
|-------|--------|---------|
| `apartmentSqm` | Garmushka measurement tool | Actual measured area |
| `apartmentRegisteredArea` | Land registry (Tabu) | Officially registered area |
| `registeredArea` | Land registry | Alternative name for registered area |

**Resolution Priority:**
```typescript
// When displaying area, use this priority:
1. data.apartmentSqm          // Actual measurement (most accurate)
2. data.area                  // General area field
3. data.registeredArea        // From land registry
4. extractedData.apartment_registered_area
```

**Open Issue:** `#972` - Standardize naming

### 2. `parcel` vs `chelka`

**Issue:** Hebrew term "chelka" (חלקה) and English "parcel" are used interchangeably.

| Context | Field Used |
|---------|------------|
| Frontend ValuationData | `parcel` |
| ExtractedData | `chelka` or `parcel` |
| Database | `parcel` |
| API from external sources | `chelka` |

**Resolution:** Always check both paths:
```typescript
getValueFromPaths(data, [
  "extractedData.chelka",
  "extractedData.parcel",
  "parcel",
  "chelka"
])
```

**Open Issue:** `#lqb` - Standardize naming

### 3. `subParcel` vs `sub_parcel` vs `subChelka`

**Issue:** Sub-parcel has three naming variants.

| Variant | Where Used |
|---------|------------|
| `subParcel` | Frontend TypeScript |
| `sub_parcel` | Database, some API responses |
| `subChelka` | Legacy code, some extractions |
| `sub_chelka` | Backend snake_case variant |

**Resolution:** Use multi-path lookup:
```typescript
getValueFromPaths(data, [
  "extractedData.subParcel",
  "extractedData.sub_parcel",
  "extractedData.subChelka",
  "extractedData.sub_chelka",
  "extractedData.land_registry.subParcel",
  "extractedData.land_registry.sub_parcel",
  "subParcel",
  "sub_parcel"
])
```

### 4. `comparableDataAnalysis` vs `marketAnalysis`

**Issue:** Two fields can contain market analysis data.

| Field | Source |
|-------|--------|
| `comparableDataAnalysis` | Comparable property analysis results |
| `marketAnalysis` | General market analysis |

**Resolution:** Check both in transformer:
```typescript
// Backend saves to market_analysis column but accepts both
JSON.stringify(
  valuationData.comparableDataAnalysis || 
  valuationData.marketAnalysis || 
  {}
)
```

---

## ExtractedData Paths

The `extractedData` JSONB field contains AI-extracted data that may use either naming convention. Always use `getValueFromPaths` for reliability.

### Common Path Patterns

#### Sub-Parcel Value
```typescript
getValueFromPaths(data, [
  "extractedData.subParcel",
  "extractedData.sub_parcel",
  "extractedData.land_registry.subParcel",
  "extractedData.land_registry.sub_parcel",
  "land_registry.sub_chelka",
  "subParcel"
])
```

#### Gush (Block Number)
```typescript
getValueFromPaths(data, [
  "extractedData.gush",
  "extractedData.land_registry.gush",
  "land_registry.gush",
  "gush"
])
```

#### Chelka/Parcel
```typescript
getValueFromPaths(data, [
  "extractedData.chelka",
  "extractedData.parcel",
  "extractedData.land_registry.chelka",
  "extractedData.land_registry.parcel",
  "chelka",
  "parcel"
])
```

#### Registered Area
```typescript
getValueFromPaths(data, [
  "extractedData.registeredArea",
  "extractedData.registered_area",
  "extractedData.apartment_registered_area",
  "extractedData.land_registry.registeredArea",
  "extractedData.land_registry.registered_area",
  "registeredArea"
])
```

#### Building Floors
```typescript
getValueFromPaths(data, [
  "extractedData.buildingFloors",
  "extractedData.building_floors",
  "extractedData.shared_building.buildingFloors",
  "extractedData.shared_building.building_floors",
  "buildingFloors"
])
```

#### Building Units
```typescript
getValueFromPaths(data, [
  "extractedData.buildingUnits",
  "extractedData.building_units",
  "extractedData.shared_building.buildingUnits",
  "extractedData.shared_building.building_units",
  "buildingUnits"
])
```

#### Ownership Type
```typescript
getValueFromPaths(data, [
  "extractedData.ownershipType",
  "extractedData.ownership_type",
  "extractedData.land_registry.ownershipType",
  "extractedData.land_registry.ownership_type",
  "ownershipType",
  "ownership_type"
])
```

#### Registration Office
```typescript
getValueFromPaths(data, [
  "extractedData.registrationOffice",
  "extractedData.registry_office",
  "extractedData.land_registry.registry_office",
  "extractedData.land_registry.registrationOffice",
  "registrationOffice",
  "registryOffice"
])
```

#### Building Condition
```typescript
getValueFromPaths(data, [
  "extractedData.buildingCondition",
  "extractedData.building_condition",
  "extractedData.exterior_analysis.buildingCondition",
  "extractedData.exterior_analysis.building_condition",
  "buildingCondition"
])
```

#### Finish Standard/Level
```typescript
getValueFromPaths(data, [
  "extractedData.finishStandard",
  "extractedData.finish_standard",
  "extractedData.finishLevel",
  "extractedData.finish_level",
  "finishStandard",
  "finishLevel"
])
```

#### Permitted Use
```typescript
getValueFromPaths(data, [
  "extractedData.permittedUse",
  "extractedData.permitted_use",
  "extractedData.building_permit.permittedUse",
  "extractedData.building_permit.permitted_use",
  "permittedUse"
])
```

#### Common Parts / Shared Areas
```typescript
getValueFromPaths(data, [
  "extractedData.commonParts",
  "extractedData.common_parts",
  "extractedData.sharedAreas",
  "extractedData.shared_areas",
  "extractedData.land_registry.commonParts",
  "extractedData.land_registry.common_parts",
  "commonParts",
  "sharedAreas"
])
```

#### Plot Boundaries
```typescript
// North
getValueFromPaths(data, [
  "extractedData.plotBoundaryNorth",
  "extractedData.plot_boundary_north",
  "extractedData.boundary_north"
])
// South, East, West follow same pattern
```

---

## Best Practices

### When Adding New Fields

1. **Define in TypeScript first** (`frontend/src/types/valuation.ts`)
   - Use camelCase
   - Add to appropriate interface (ValuationData or ExtractedData)

2. **Add database column** (if needed)
   - Use snake_case in migration
   - Add to `_saveShumaTable` INSERT and UPDATE queries in ShumaDB.js

3. **Update transformer** (if non-standard)
   - Add special handling in `valuation-transformer.ts` if needed
   - Most fields auto-convert via `keysToSnakeCase`/`keysToCamelCase`

4. **Add path lookup** (for ExtractedData)
   - Add both naming variants to `getValueFromPaths` calls
   - Consider nested paths (e.g., `land_registry.field`)

### Code Examples

#### Reading a field safely
```typescript
// GOOD: Use multi-path lookup
const subParcel = getValueFromPaths(data, [
  "extractedData.subParcel",
  "extractedData.sub_parcel",
  "subParcel"
]);

// BAD: Direct access may miss data
const subParcel = data.extractedData?.subParcel; // Misses sub_parcel
```

#### Sending to backend
```typescript
// GOOD: Use transformer
const backendData = transformToBackend(frontendData);
await api.post('/sessions', { action: 'save_to_db', data: backendData });

// BAD: Manual conversion is error-prone
const data = { building_number: frontendData.buildingNumber }; // Incomplete
```

#### Receiving from backend
```typescript
// GOOD: Use transformer
const response = await api.get(`/session/${sessionId}`);
const frontendData = transformFromBackend(response.data);

// BAD: Direct use mixes conventions
const data = response.data; // Contains snake_case fields
```

---

## Quick Reference

### Key Files

| File | Purpose |
|------|---------|
| `frontend/src/types/valuation.ts` | TypeScript interfaces (camelCase) |
| `backend/src/models/ShumaDB.js` | Database operations (snake_case) |
| `frontend/src/lib/transformers/valuation-transformer.ts` | Conversion functions |
| `frontend/src/lib/pdf/utils/data-resolvers.ts` | Multi-path value resolution |

### Utility Functions

```typescript
// From valuation-transformer.ts
toSnakeCase(str)        // "buildingNumber" -> "building_number"
toCamelCase(str)        // "building_number" -> "buildingNumber"
transformToBackend(data)    // Full object conversion to snake_case
transformFromBackend(data)  // Full object conversion to camelCase
getValueFromPaths(obj, paths, default)  // Multi-path lookup

// From data-resolvers.ts
getValueFromPaths(obj, paths)  // Returns first non-empty value
getSubParcelValue(data)        // Specialized sub-parcel lookup
getAddress(data)               // Formatted address string
formatOwnership(data)          // Ownership type string
summarizeAttachments(data)     // Attachment summary
```

### Common Mistakes to Avoid

| Mistake | Solution |
|---------|----------|
| Direct field access in extractedData | Use `getValueFromPaths` |
| Manual snake_case conversion | Use `transformToBackend` |
| Assuming single naming convention | Check both camelCase and snake_case |
| Forgetting nested paths | Include `land_registry.field`, `shared_building.field`, etc. |
| Not handling null/undefined | Use default values in `getValueFromPaths` |

---

## Related Documentation

- `CLAUDE.md` - Main project documentation
- `docs/ARCHITECTURE.md` - System architecture details
- `.beads/issues.jsonl` - Open issues including naming standardization tasks

---

*Last updated: 2026-01-14*
