# AI Extraction Data Flow & Database Mapping

## Overview
This document maps the data flow from AI extraction APIs through the application to the database tables.

---

## 1. Land Registry Analysis API

### API Endpoint
`POST /api/session/[sessionId]/land-registry-analysis`

### AI API Response Fields (from backend)
```json
{
  "success": true,
  "gush": "9905",
  "registration_office": "נתניה",
  "chelka": "88",
  "ownership_type": "מכר ללא תמורה",
  "attachments": "חניה",
  "confidence": 98,
  "extracted_at": "2025-10-24T21:10:49.625Z"
}
```

### Step2Documents.tsx Mapping
```javascript
extractLandRegistryData() returns:
{
  registrationOffice: result.registration_office,  // "נתניה"
  gush: result.gush,                              // "9905"
  parcel: result.chelka,                          // "88" (chelka → parcel)
  ownershipType: result.ownership_type,            // "מכר ללא תמורה"
  attachments: result.attachments,                 // "חניה"
  balconyArea: result.balcony_area || 0,          // NEW
  buildingNumber: result.building_number || '',    // NEW
  registeredArea: result.registered_area || 0      // NEW
}
```

### Database Table: `land_registry_extracts`
```sql
INSERT INTO land_registry_extracts (
  shuma_id, session_id,
  gush, gush_confidence,
  parcel, parcel_confidence,              -- ✅ FIXED: was "chelka"
  sub_parcel, sub_parcel_confidence,      -- ✅ FIXED: was "sub_chelka"
  registered_area, registered_area_confidence,  -- ✅ FIXED: was "apartment_area"
  registration_office, registration_office_confidence,
  ownership_type, ownership_type_confidence,
  attachments, attachments_confidence
)
```

**Key Fix**: Changed `chelka` → `parcel`, `sub_chelka` → `sub_parcel`, `apartment_area` → `registered_area`

---

## 2. Building Permit Analysis API

### API Endpoint
`POST /api/session/[sessionId]/building-permit-analysis`

### AI API Response Fields (from backend)
```json
{
  "success": true,
  "building_year": "2015",
  "permitted_description": "בניית דירת מגורים בקומה 3",
  "permitted_use": "מגורים",
  "built_area": "85",
  "building_description": "דירת 3 חדרים בקומה 3",
  "permit_number": "12345/21",
  "permit_date": "2015-03-15",
  "building_floors": "5",
  "building_units": "20",
  "confidence": 90,
  "extracted_at": "2025-10-24T21:10:49.625Z"
}
```

### Step2Documents.tsx Mapping
```javascript
extractBuildingPermitData() returns:
{
  buildingYear: result.building_year,              // "2015"
  buildingRights: result.permitted_description,     // "בניית דירת מגורים..."
  permittedUse: result.permitted_use,               // "מגורים"
  builtArea: result.built_area,                     // "85"
  buildingDescription: result.building_description, // "דירת 3 חדרים..."
  buildingPermitNumber: result.permit_number,       // NEW "12345/21"
  buildingPermitDate: result.permit_date,           // NEW "2015-03-15"
  buildingFloors: result.building_floors,           // NEW "5"
  buildingUnits: result.building_units,             // NEW "20"
  buildingDetails: result.building_details || ''    // NEW
}
```

### Database Table: `building_permit_extracts`
```sql
INSERT INTO building_permit_extracts (
  shuma_id, session_id,
  permit_number, permit_number_confidence,
  permit_date, permit_date_confidence,
  building_year, building_year_confidence,
  building_description, building_description_confidence,
  building_floors, building_floors_confidence,
  building_units, building_units_confidence,
  permitted_use, permitted_use_confidence,
  built_area, built_area_confidence
)
```

---

## 3. Shared Building Analysis API

### API Endpoint
`POST /api/session/[sessionId]/shared-building-analysis`

### Step2Documents.tsx Mapping
```javascript
extractSharedBuildingData() returns:
{
  sharedAreas: result.common_areas,          // "מעלית, חדר כביסה, מחסן"
  buildingDescription: result.building_description
}
```

---

## 4. Image Analysis APIs

### Interior Analysis
`POST /api/session/[sessionId]/interior-analysis`

### Exterior Analysis
`POST /api/session/[sessionId]/exterior-analysis`

### Step2Documents.tsx Mapping
```javascript
extractImageAnalysisData() returns:
{
  propertyLayoutDescription: interior.property_layout_description,
  roomAnalysis: interior.room_analysis,
  conditionAssessment: interior.condition_assessment,
  buildingCondition: exterior.building_condition,
  buildingFeatures: exterior.building_features,
  buildingType: exterior.building_type,
  overallAssessment: exterior.overall_assessment
}
```

---

## Data Flow Summary

```
┌─────────────────────────┐
│  AI Backend Service     │
│  (Python/OpenAI)        │
└──────────┬──────────────┘
           │ Returns snake_case fields
           │ (e.g., "chelka", "building_year")
           ▼
┌─────────────────────────┐
│  Next.js API Route      │
│  /api/session/.../      │
│  -analysis              │
└──────────┬──────────────┘
           │ Returns snake_case fields
           ▼
┌─────────────────────────┐
│  Step2Documents.tsx     │
│  extractXxxData()       │
└──────────┬──────────────┘
           │ Maps to camelCase
           │ (e.g., "parcel", "buildingYear")
           ▼
┌─────────────────────────┐
│  extractedData object   │
│  (flat structure)       │
└──────────┬──────────────┘
           │ Stored in ValuationData
           │ as extractedData: {}
           ▼
┌─────────────────────────┐
│  ShumaDB.js             │
│  saveShumaFromSession() │
└──────────┬──────────────┘
           │ Saves to:
           ├─► shuma.extracted_data (JSONB - full snapshot)
           ├─► land_registry_extracts (normalized)
           ├─► building_permit_extracts (normalized)
           └─► shared_building_order (normalized)
```

---

## Important Notes

### ⚠️ Cost Considerations
- Each AI API call costs approximately **$0.50-2.00** per document
- API calls should only be made when user explicitly clicks "עבד מסמכים" (Process Documents)
- Data is stored in BOTH:
  1. **`shuma.extracted_data`** (JSONB) - Complete snapshot for quick access
  2. **Individual extraction tables** - Normalized with confidence scores for analysis

### 🔧 Recent Fixes (2025-10-24)
1. **Fixed column name mismatches**:
   - `chelka` → `parcel`
   - `sub_chelka` → `sub_parcel`
   - `apartment_area` → `registered_area`

2. **Added missing fields to extraction**:
   - `balconyArea`, `buildingNumber`, `registeredArea` (from land registry)
   - `buildingPermitNumber`, `buildingPermitDate`, `buildingFloors`, `buildingUnits`, `buildingDetails` (from building permit)

3. **Database consistency**:
   - All INSERT statements now match the actual database schema
   - Confidence values are properly validated (0-100 range)
   - `shuma_id` and `session_id` are correctly included in all extraction table inserts

---

## Validation Checklist

Before running AI extraction:
- ✅ Database columns match code field names
- ✅ Confidence values are in range 0-100
- ✅ All required fields have fallback values
- ✅ Date fields are properly formatted (YYYY-MM-DD)
- ✅ Numeric fields are parsed correctly
- ✅ JSONB fields are stringified before insert

---

## Testing Extracted Data

To verify data was saved correctly:

```sql
-- Check extracted data in shuma table
SELECT session_id, extracted_data 
FROM shuma 
WHERE session_id = 'YOUR_SESSION_ID';

-- Check normalized land registry data
SELECT * FROM land_registry_extracts 
WHERE session_id = 'YOUR_SESSION_ID';

-- Check normalized building permit data
SELECT * FROM building_permit_extracts 
WHERE session_id = 'YOUR_SESSION_ID';
```

