# SHAMAY.AI Database Documentation

## Overview

This directory contains all database schemas, migrations, and setup scripts for the SHAMAY.AI platform.

## Database Structure

### Primary Database: `shamay_land_registry`

**Connection Details:**
- **Host**: localhost
- **Port**: 5432
- **Database**: shamay_land_registry
- **Users**:
  - `postgres` (superuser)
  - `shamay_user` (application user)

---

## Tables

### 1. `shuma` - Main Valuation Sessions Table

Stores complete valuation data for each property assessment session.

**Key Fields:**
- `id` - Primary key
- `session_id` - Unique session identifier
- `organization_id` - Multi-tenant organization ID
- `user_id` - User who created the valuation
- Property information (street, city, rooms, area, etc.)
- Legal status (gush, parcel, ownership, etc.)
- Analysis data (JSONB: propertyAnalysis, marketAnalysis, etc.)
- Extracted data (JSONB: AI-extracted information)
- Uploads (JSONB: file metadata)
- GIS data (JSONB: analysis and screenshots)
- Garmushka measurements (JSONB: floor plan measurements)

**Indexes:**
- `idx_shuma_session_id` - Fast session lookups
- `idx_shuma_organization_id` - Multi-tenant queries
- `idx_shuma_user_id` - User-specific valuations
- `idx_shuma_city` - Location-based searches
- `idx_shuma_gush_parcel` - Land registry lookups

---

### 2. `land_registry_extracts` - Tabu Document Extractions

Stores AI-extracted data from Land Registry (Tabu) documents.

**Key Fields:**
- `shuma_id` - Foreign key to shuma table
- `session_id` - Session identifier
- `gush`, `parcel`, `sub_parcel` - Property identifiers
- `registration_office` - Land registry office
- `registered_area` - Official registered area
- `ownership_type` - Type of ownership
- `attachments` - Parking, storage, etc.
- Confidence scores for each field (0-1)
- `raw_extraction` - Complete JSON response from AI

**Purpose**: Track extraction provenance and confidence levels for audit purposes.

---

### 3. `building_permit_extracts` - Building Permit Extractions

Stores AI-extracted data from Building Permit documents.

**Key Fields:**
- `shuma_id` - Foreign key to shuma table
- `permit_number` - Building permit number
- `permit_date` - Issue date
- `built_area` - Permitted built area
- `construction_year` - Year of construction
- `permitted_use` - Permitted usage type
- Confidence scores for each field
- `raw_extraction` - Complete JSON response from AI

---

### 4. `shared_building_order` - Condominium Order Extractions

Stores AI-extracted data from Shared Building Order (צו בית משותף) documents.

**Key Fields:**
- `shuma_id` - Foreign key to shuma table
- `building_description` - Building description
- `number_of_floors` - Total floors
- `number_of_units` - Total units
- `common_areas` - Description of common areas
- Confidence scores for each field

---

### 5. `images` - Image Storage

Stores all images related to valuations (GIS screenshots, property photos, etc.).

**Key Fields:**
- `shuma_id` - Foreign key to shuma table
- `image_type` - Type: 'gis_screenshot', 'property', 'interior', 'garmushka'
- `image_data` - Base64 encoded image or file path
- `image_url` - Public URL if available
- `metadata` - JSONB for additional image metadata

---

### 6. `garmushka` - Floor Plan Measurements

Stores interactive floor plan measurements.

**Key Fields:**
- `shuma_id` - Foreign key to shuma table
- `measurement_table` - JSONB array of measurements
- `meters_per_pixel` - Calibration ratio
- `is_calibrated` - Whether calibration is complete
- `png_export` - Base64 PNG snapshot with annotations

---

### 7. `comparable_data` - Market Comparable Sales

Stores comparable sales data for market analysis.

**Key Fields:**
- `sale_date` - Date of sale
- `address` - Property address
- `gush`, `chelka`, `sub_chelka` - Land registry identifiers
- `rooms` - Number of rooms
- `apartment_area_sqm` - Area in square meters
- `declared_price` - Sale price
- `price_per_sqm_rounded` - Price per square meter
- `data_quality_score` - Quality indicator (0-1)

**Indexes:**
- `idx_comparable_data_gush` - Fast gush lookups
- `idx_comparable_data_city` - City-based searches
- `idx_comparable_data_sale_date` - Time-based queries

---

## Database Setup

### Option 1: Automated Setup (Recommended)

Run the all-in-one startup script:

```bash
./start-all.sh
```

This script will:
1. ✅ Check prerequisites (Node.js, PostgreSQL, npm)
2. ✅ Start PostgreSQL if not running
3. ✅ Create database `shamay_land_registry`
4. ✅ Create application user `shamay_user`
5. ✅ Initialize all tables with proper indexes
6. ✅ Grant appropriate permissions
7. ✅ Insert sample data for development
8. ✅ Create `.env.local` if missing
9. ✅ Install npm dependencies
10. ✅ Start the frontend application

### Option 2: Manual Setup

#### Step 1: Create Database

```bash
psql -U postgres
CREATE DATABASE shamay_land_registry;
\q
```

#### Step 2: Run Initialization Script

```bash
psql -U postgres -d shamay_land_registry -f database/init_complete_database.sql
```

#### Step 3: Verify Setup

```bash
psql -U postgres -d shamay_land_registry

-- List all tables
\dt

-- Check shuma table structure
\d shuma

-- View sample data
SELECT * FROM session_summary;

\q
```

---

## Database Users

### 1. `postgres` (Superuser)
- **Password**: Set during PostgreSQL installation
- **Purpose**: Database administration
- **Usage**: Schema migrations, backups

### 2. `shamay_user` (Application User)
- **Password**: `shamay_secure_2024` (change in production!)
- **Purpose**: Application database access
- **Permissions**: Full access to all tables and sequences

**Security Note**: Change the default password in production:
```sql
ALTER USER shamay_user WITH PASSWORD 'your_secure_password_here';
```

---

## Database Views

### `valuations_with_extracts`
Combines shuma data with extracted information from documents.

```sql
SELECT * FROM valuations_with_extracts WHERE city = 'תל אביב-יפו';
```

### `session_summary`
Quick overview of all valuation sessions.

```sql
SELECT * FROM session_summary ORDER BY updated_at DESC LIMIT 10;
```

---

## Common Queries

### Get All Valuations for a User

```sql
SELECT 
  session_id,
  full_address,
  final_valuation,
  is_complete,
  created_at
FROM shuma
WHERE user_id = 'admin@shamay.ai'
ORDER BY created_at DESC;
```

### Find Valuations by Location

```sql
SELECT 
  session_id,
  street,
  building_number,
  city,
  final_valuation
FROM shuma
WHERE city LIKE '%תל אביב%'
  AND final_valuation IS NOT NULL;
```

### Get Extraction Confidence Summary

```sql
SELECT 
  s.session_id,
  s.full_address,
  lr.gush_confidence,
  lr.parcel_confidence,
  bp.built_area_confidence
FROM shuma s
LEFT JOIN land_registry_extracts lr ON s.id = lr.shuma_id
LEFT JOIN building_permit_extracts bp ON s.id = bp.shuma_id
WHERE s.session_id = 'your-session-id';
```

### Search Comparable Sales

```sql
SELECT 
  address,
  rooms,
  apartment_area_sqm,
  declared_price,
  price_per_sqm_rounded,
  sale_date
FROM comparable_data
WHERE city = 'תל אביב-יפו'
  AND rooms BETWEEN 3 AND 4
  AND sale_date > CURRENT_DATE - INTERVAL '1 year'
ORDER BY sale_date DESC;
```

---

## Backup & Restore

### Create Backup

```bash
# Full database backup
pg_dump -U postgres shamay_land_registry > shamay_backup_$(date +%Y%m%d).sql

# Compressed backup
pg_dump -U postgres shamay_land_registry | gzip > shamay_backup_$(date +%Y%m%d).sql.gz

# Specific table backup
pg_dump -U postgres -t shuma shamay_land_registry > shuma_backup_$(date +%Y%m%d).sql
```

### Restore Backup

```bash
# Restore from SQL file
psql -U postgres shamay_land_registry < shamay_backup_20231215.sql

# Restore from compressed file
gunzip -c shamay_backup_20231215.sql.gz | psql -U postgres shamay_land_registry
```

### Automated Daily Backup (Recommended for Production)

Create a cron job:

```bash
crontab -e
```

Add this line for daily backups at 2 AM:

```
0 2 * * * pg_dump -U postgres shamay_land_registry | gzip > /backups/shamay_backup_$(date +\%Y\%m\%d).sql.gz
```

---

## Migrations

All migration scripts are in the `migrations/` directory.

### Running Migrations

```bash
cd database/migrations
./run-migrations.sh
```

### Creating a New Migration

1. Create a new SQL file: `YYYYMMDD_description.sql`
2. Add your schema changes
3. Test on development database first
4. Run migration script

**Example Migration:**

```sql
-- 20231215_add_balcony_area.sql

BEGIN;

ALTER TABLE shuma ADD COLUMN IF NOT EXISTS balcony_area DECIMAL(10,2);

CREATE INDEX IF NOT EXISTS idx_shuma_balcony_area ON shuma(balcony_area);

COMMIT;
```

---

## Performance Optimization

### Vacuum and Analyze

Run regularly to maintain performance:

```sql
VACUUM ANALYZE shuma;
VACUUM ANALYZE land_registry_extracts;
VACUUM ANALYZE building_permit_extracts;
```

### Check Table Sizes

```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Check Index Usage

```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan AS index_scans
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;
```

---

## Troubleshooting

### Connection Issues

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql  # Linux
brew services list | grep postgresql  # macOS

# Test connection
psql -U postgres -h localhost -p 5432
```

### Reset Database (⚠️ Destructive)

```sql
-- Drop and recreate database
DROP DATABASE shamay_land_registry;
CREATE DATABASE shamay_land_registry;

-- Then run initialization script
\q
psql -U postgres -d shamay_land_registry -f database/init_complete_database.sql
```

### Check Locks

```sql
SELECT 
  pid,
  usename,
  pg_blocking_pids(pid) as blocked_by,
  query
FROM pg_stat_activity
WHERE cardinality(pg_blocking_pids(pid)) > 0;
```

### Kill Blocking Queries

```sql
-- Find blocking PID
SELECT pg_terminate_backend(12345);  -- Replace with actual PID
```

---

## Security Best Practices

1. **Change Default Passwords**
   ```sql
   ALTER USER shamay_user WITH PASSWORD 'strong_random_password';
   ```

2. **Use SSL Connections** (Production)
   ```sql
   ALTER SYSTEM SET ssl = on;
   ```

3. **Limit Remote Access**
   Edit `pg_hba.conf`:
   ```
   # Only allow local connections
   host    all    all    127.0.0.1/32    md5
   ```

4. **Regular Backups**
   Set up automated daily backups (see Backup section)

5. **Monitor Logs**
   ```bash
   tail -f /var/log/postgresql/postgresql-14-main.log
   ```

---

## Support

For database issues or questions:
- Check PostgreSQL logs: `/var/log/postgresql/`
- Review error messages in application logs
- Refer to [Installation Guide](../INSTALLATION_GUIDE.md)
- Contact: support@shamay.ai

---

**Last Updated**: 2024
**Database Version**: PostgreSQL 14+
**Application**: SHAMAY.AI v1.0

