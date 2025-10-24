# 🗄️ Database Schema Reference - EXACT Column Names

## ⚠️ **CRITICAL: Always Use These Exact Column Names**

This document lists the **exact** column names in each table. **DO NOT GUESS** column names.  
Always refer to this document before writing any INSERT or UPDATE queries.

---

## 1. `building_permit_extracts` Table

### Columns (19 total):
```sql
id                              integer PRIMARY KEY
shuma_id                        integer REFERENCES shuma(id)
session_id                      varchar(255)
extracted_at                    timestamp DEFAULT CURRENT_TIMESTAMP

permit_number                   varchar(255)
permit_number_confidence        numeric(3,2)

permit_date                     date
permit_date_confidence          numeric(3,2)

built_area                      numeric(10,2)
built_area_confidence           numeric(3,2)

construction_year               integer
construction_year_confidence    numeric(3,2)

permitted_use                   varchar(255)      ⚠️ NOT "permitted_usage"
permitted_use_confidence        numeric(3,2)

building_description            text
building_description_confidence numeric(3,2)

raw_extraction                  jsonb
pdf_path                        text
processing_method               varchar(50) DEFAULT 'openai'
```

### ❌ Common Mistakes:
- ❌ `permitted_usage` → ✅ `permitted_use`
- ❌ Missing `shuma_id` and `session_id`
- ❌ Using `overall_confidence` (doesn't exist)

### ✅ Correct INSERT Example:
```sql
INSERT INTO building_permit_extracts (
  shuma_id, session_id,
  permit_number, permit_number_confidence,
  permit_date, permit_date_confidence,
  permitted_use, permitted_use_confidence,
  building_description, building_description_confidence,
  pdf_path, processing_method
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
```

---

## 2. `land_registry_extracts` Table

### Columns (23 total):
```sql
id                             integer PRIMARY KEY
shuma_id                       integer REFERENCES shuma(id)
session_id                     varchar(255)
extracted_at                   timestamp DEFAULT CURRENT_TIMESTAMP

gush                           varchar(50)
gush_confidence                numeric(3,2)

parcel                         varchar(50)        ⚠️ NOT "chelka"
parcel_confidence              numeric(3,2)

sub_parcel                     varchar(50)        ⚠️ NOT "sub_chelka"
sub_parcel_confidence          numeric(3,2)

registration_office            varchar(255)
registration_office_confidence numeric(3,2)

registered_area                numeric(10,2)      ⚠️ NOT "apartment_area"
registered_area_confidence     numeric(3,2)

ownership_type                 varchar(255)
ownership_type_confidence      numeric(3,2)

attachments                    text
attachments_confidence         numeric(3,2)

extract_date                   date
extract_date_confidence        numeric(3,2)

raw_extraction                 jsonb
pdf_path                       text
processing_method              varchar(50) DEFAULT 'openai'
```

### ❌ Common Mistakes:
- ❌ `chelka` → ✅ `parcel`
- ❌ `sub_chelka` → ✅ `sub_parcel`
- ❌ `apartment_area` → ✅ `registered_area`

### ✅ Correct INSERT Example:
```sql
INSERT INTO land_registry_extracts (
  shuma_id, session_id,
  gush, gush_confidence,
  parcel, parcel_confidence,
  sub_parcel, sub_parcel_confidence,
  registration_office, registration_office_confidence,
  registered_area, registered_area_confidence,
  ownership_type, ownership_type_confidence,
  attachments, attachments_confidence,
  pdf_path
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
```

---

## 3. `shared_building_order` Table

### Columns (15 total):
```sql
id                              integer PRIMARY KEY
shuma_id                        integer REFERENCES shuma(id)
session_id                      varchar(255)
extracted_at                    timestamp DEFAULT CURRENT_TIMESTAMP

building_description            text
building_description_confidence numeric(3,2)

number_of_floors                integer        ⚠️ NOT "building_floors"
number_of_floors_confidence     numeric(3,2)

number_of_units                 integer        ⚠️ NOT "building_units"
number_of_units_confidence      numeric(3,2)

common_areas                    text
common_areas_confidence         numeric(3,2)

raw_extraction                  jsonb
pdf_path                        text
processing_method               varchar(50) DEFAULT 'openai'
```

### ❌ Common Mistakes:
- ❌ `building_floors` → ✅ `number_of_floors`
- ❌ `building_units` → ✅ `number_of_units`
- ❌ `building_address` (doesn't exist in this table)
- ❌ `total_sub_plots` (doesn't exist)

### ✅ Correct INSERT Example:
```sql
INSERT INTO shared_building_order (
  shuma_id, session_id,
  building_description, building_description_confidence,
  number_of_floors, number_of_floors_confidence,
  number_of_units, number_of_units_confidence,
  common_areas, common_areas_confidence,
  pdf_path
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
```

---

## 4. `images` Table

### Columns (8 total):
```sql
id          integer PRIMARY KEY
shuma_id    integer REFERENCES shuma(id)
session_id  varchar(255)
image_type  varchar(50)
image_data  text                    ⚠️ For base64 data
image_url   text                    ⚠️ For file paths
metadata    jsonb DEFAULT '{}'
created_at  timestamp DEFAULT CURRENT_TIMESTAMP
```

### ✅ Correct INSERT Example:
```sql
INSERT INTO images (
  shuma_id, session_id,
  image_type, image_data, image_url,
  metadata
) VALUES ($1, $2, $3, $4, $5, $6)
```

---

## 5. `garmushka` Table

### Columns (10 total):
```sql
id                 integer PRIMARY KEY
shuma_id           integer REFERENCES shuma(id)
session_id         varchar(255)
measurement_table  jsonb DEFAULT '[]'
meters_per_pixel   numeric(10,6)
unit_mode          varchar(20) DEFAULT 'metric'
is_calibrated      boolean DEFAULT FALSE
file_name          varchar(255)
png_export         text                      ⚠️ Base64 PNG
created_at         timestamp DEFAULT CURRENT_TIMESTAMP
updated_at         timestamp DEFAULT CURRENT_TIMESTAMP
```

### ✅ Correct INSERT Example:
```sql
INSERT INTO garmushka (
  shuma_id, session_id,
  file_name, measurement_table,
  meters_per_pixel, unit_mode, is_calibrated,
  png_export
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
```

---

## 6. `ai_extractions` Table

### Columns (16 total):
```sql
id                 integer PRIMARY KEY
shuma_id           integer REFERENCES shuma(id)
session_id         varchar(255) NOT NULL
extraction_type    varchar(50) NOT NULL
extraction_date    timestamp DEFAULT CURRENT_TIMESTAMP
raw_ai_response    jsonb NOT NULL
extracted_fields   jsonb NOT NULL
ai_model           varchar(100)
processing_cost    numeric(10,4)
confidence_score   numeric(3,2)
processing_time_ms integer
document_filename  varchar(255)
document_path      text
is_active          boolean DEFAULT TRUE
created_at         timestamp DEFAULT CURRENT_TIMESTAMP
updated_at         timestamp DEFAULT CURRENT_TIMESTAMP
```

### ✅ Correct INSERT Example:
```sql
INSERT INTO ai_extractions (
  shuma_id, session_id,
  extraction_type,
  raw_ai_response, extracted_fields,
  ai_model, processing_cost, confidence_score, processing_time_ms,
  document_filename, document_path,
  is_active
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
```

---

## 💡 **Best Practices**

### 1. Always Include Required Foreign Keys:
```sql
✅ INSERT INTO building_permit_extracts (shuma_id, session_id, ...)
❌ INSERT INTO building_permit_extracts (permit_number, ...)
```

### 2. Confidence Values are 0-1 (decimal):
```sql
✅ 0.95  (for 95% confidence)
❌ 95    (this will be rejected or misinterpreted)
```

### 3. Date Format:
```sql
✅ '2025-10-24'         (YYYY-MM-DD)
✅ formatDateForDB(dateString)
❌ '24/10/2025'
❌ '10-24-2025'
```

### 4. Check Column Exists Before INSERT:
```bash
# Always verify before coding:
psql -U postgres -d shamay_land_registry -c "\d table_name"
```

### 5. Use This Document as Single Source of Truth:
- ✅ Copy column names from this document
- ❌ Never guess or rely on memory
- ❌ Never assume similar tables have identical column names

---

## 🔍 Quick Reference Commands

### Check Table Schema:
```bash
psql -U postgres -d shamay_land_registry -c "\d building_permit_extracts"
psql -U postgres -d shamay_land_registry -c "\d land_registry_extracts"
psql -U postgres -d shamay_land_registry -c "\d shared_building_order"
psql -U postgres -d shamay_land_registry -c "\d images"
psql -U postgres -d shamay_land_registry -c "\d garmushka"
psql -U postgres -d shamay_land_registry -c "\d ai_extractions"
```

### List All Columns:
```bash
psql -U postgres -d shamay_land_registry -c "
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'building_permit_extracts'
ORDER BY ordinal_position;"
```

---

## ⚠️ **ALWAYS REMEMBER**

1. **Column names are case-sensitive in queries** (though PostgreSQL normalizes them)
2. **Underscores matter**: `permitted_use` ≠ `permitted_usage`
3. **Check confidence decimal places**: `numeric(3,2)` means max value is 0.99 (not 99)
4. **Foreign keys are required**: Always include `shuma_id` and `session_id`
5. **When in doubt, run `\d table_name` first!**

---

**Last Updated**: 2025-10-24  
**Status**: ✅ Production Schema Reference  
**Update this document whenever the schema changes!**

