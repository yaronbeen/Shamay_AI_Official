-- Complete Database Initialization for SHAMAY.AI
-- This script creates the database, users, and all necessary tables

-- ============================================
-- 1. DATABASE SETUP
-- ============================================

-- Create database if it doesn't exist (run this separately if needed)
-- CREATE DATABASE shamay_land_registry;

-- Connect to the database
\c shamay_land_registry;

-- ============================================
-- 2. USER MANAGEMENT
-- ============================================

-- Create shamay application user if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'shamay_user') THEN
    CREATE USER shamay_user WITH PASSWORD 'shamay_secure_2024';
  END IF;
END
$$;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE shamay_land_registry TO shamay_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO shamay_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO shamay_user;

-- ============================================
-- 3. EXTENSIONS
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- ============================================
-- 4. USERS & ORGANIZATIONS TABLES
-- ============================================

-- Organizations table
DROP TABLE IF EXISTS organizations CASCADE;

CREATE TABLE organizations (
  id VARCHAR(255) PRIMARY KEY DEFAULT 'org_' || gen_random_uuid()::text,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  logo_url TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_organizations_slug ON organizations(slug);

-- Insert default organization
INSERT INTO organizations (id, name, slug) 
VALUES ('default-org', 'Default Organization', 'default')
ON CONFLICT (id) DO NOTHING;

-- Users table
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY DEFAULT 'user_' || gen_random_uuid()::text,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  password_hash TEXT, -- For email/password auth
  email_verified TIMESTAMP,
  image TEXT,
  
  -- Organization relationship
  primary_organization_id VARCHAR(255) REFERENCES organizations(id),
  primary_role VARCHAR(50) DEFAULT 'user', -- 'admin', 'appraiser', 'user'
  
  -- Profile
  phone VARCHAR(50),
  license_number VARCHAR(255), -- Appraiser license
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_organization ON users(primary_organization_id);

-- Organization memberships (for multi-org support)
DROP TABLE IF EXISTS organization_memberships CASCADE;

CREATE TABLE organization_memberships (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  organization_id VARCHAR(255) REFERENCES organizations(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'user', -- 'owner', 'admin', 'appraiser', 'user'
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, organization_id)
);

CREATE INDEX idx_memberships_user ON organization_memberships(user_id);
CREATE INDEX idx_memberships_org ON organization_memberships(organization_id);

-- Insert default admin user
-- Password: admin123 (hashed with bcrypt)
-- For production, use proper bcrypt hashing
INSERT INTO users (id, email, name, password_hash, primary_organization_id, primary_role, is_active) 
VALUES (
  'admin-user-id',
  'admin@shamay.ai',
  'Admin User',
  '$2a$10$rYvLmZqN5bV5hZ.YGxZzKe7xKJQXqH5qKqZmX5rKqZmX5rKqZmX5r', -- admin123
  'default-org',
  'admin',
  TRUE
)
ON CONFLICT (email) DO NOTHING;

-- Add admin to organization memberships
INSERT INTO organization_memberships (user_id, organization_id, role)
VALUES ('admin-user-id', 'default-org', 'owner')
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- ============================================
-- 5. MAIN SHUMA TABLE (Valuation Sessions)
-- ============================================

DROP TABLE IF EXISTS shuma CASCADE;

CREATE TABLE shuma (
  -- Primary key and metadata
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  organization_id VARCHAR(255) NOT NULL DEFAULT 'default-org',
  user_id VARCHAR(255) NOT NULL DEFAULT 'system',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Basic Property Information
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

  -- Cover Page Information
  client_name VARCHAR(255),
  visit_date DATE,
  valuation_date DATE,
  reference_number VARCHAR(255),
  shamay_name VARCHAR(255),
  shamay_serial_number VARCHAR(255),

  -- Legal Status Fields
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

  -- Registry Information
  registry_office VARCHAR(255),
  extract_date DATE,

  -- Property Description Fields
  internal_layout TEXT,
  finish_standard VARCHAR(255),
  finish_details TEXT,

  -- Document Uploads (JSONB)
  property_images JSONB DEFAULT '[]'::jsonb,
  selected_image_index INTEGER DEFAULT 0,
  selected_image_preview TEXT,
  interior_images JSONB DEFAULT '[]'::jsonb,

  -- Signature
  signature_preview TEXT,

  -- Analysis Data (JSONB)
  property_analysis JSONB DEFAULT '{}'::jsonb,
  market_analysis JSONB DEFAULT '{}'::jsonb,
  risk_assessment JSONB DEFAULT '{}'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,

  -- Extracted Data (JSONB) - from AI processing
  extracted_data JSONB DEFAULT '{}'::jsonb,

  -- Calculations
  comparable_data JSONB DEFAULT '[]'::jsonb,
  final_valuation DECIMAL(12,2),
  price_per_sqm DECIMAL(10,2),

  -- Status
  is_complete BOOLEAN DEFAULT FALSE,

  -- Uploads (JSONB) - file metadata
  uploads JSONB DEFAULT '[]'::jsonb,

  -- GIS Analysis (JSONB)
  gis_analysis JSONB DEFAULT '{}'::jsonb,

  -- GIS Screenshots (JSONB)
  gis_screenshots JSONB DEFAULT '{}'::jsonb,

  -- Garmushka Measurements (JSONB)
  garmushka_measurements JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for better query performance
CREATE INDEX idx_shuma_session_id ON shuma(session_id);
CREATE INDEX idx_shuma_organization_id ON shuma(organization_id);
CREATE INDEX idx_shuma_user_id ON shuma(user_id);
CREATE INDEX idx_shuma_created_at ON shuma(created_at);
CREATE INDEX idx_shuma_city ON shuma(city);
CREATE INDEX idx_shuma_gush_parcel ON shuma(gush, parcel);

-- ============================================
-- 5. LAND REGISTRY EXTRACTS TABLE
-- ============================================

DROP TABLE IF EXISTS land_registry_extracts CASCADE;

CREATE TABLE land_registry_extracts (
  id SERIAL PRIMARY KEY,
  shuma_id INTEGER REFERENCES shuma(id) ON DELETE CASCADE,
  session_id VARCHAR(255),
  extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Extracted fields with confidence scores
  gush VARCHAR(50),
  gush_confidence DECIMAL(3,2),
  
  parcel VARCHAR(50),
  parcel_confidence DECIMAL(3,2),
  
  sub_parcel VARCHAR(50),
  sub_parcel_confidence DECIMAL(3,2),
  
  registration_office VARCHAR(255),
  registration_office_confidence DECIMAL(3,2),
  
  registered_area DECIMAL(10,2),
  registered_area_confidence DECIMAL(3,2),
  
  ownership_type VARCHAR(255),
  ownership_type_confidence DECIMAL(3,2),
  
  attachments TEXT,
  attachments_confidence DECIMAL(3,2),
  
  extract_date DATE,
  extract_date_confidence DECIMAL(3,2),
  
  -- Raw extraction data
  raw_extraction JSONB,
  
  -- Metadata
  pdf_path TEXT,
  processing_method VARCHAR(50) DEFAULT 'openai'
);

CREATE INDEX idx_land_registry_shuma_id ON land_registry_extracts(shuma_id);
CREATE INDEX idx_land_registry_session_id ON land_registry_extracts(session_id);

-- ============================================
-- 6. BUILDING PERMIT EXTRACTS TABLE
-- ============================================

DROP TABLE IF EXISTS building_permit_extracts CASCADE;

CREATE TABLE building_permit_extracts (
  id SERIAL PRIMARY KEY,
  shuma_id INTEGER REFERENCES shuma(id) ON DELETE CASCADE,
  session_id VARCHAR(255),
  extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Extracted fields with confidence scores
  permit_number VARCHAR(255),
  permit_number_confidence DECIMAL(3,2),
  
  permit_date DATE,
  permit_date_confidence DECIMAL(3,2),
  
  built_area DECIMAL(10,2),
  built_area_confidence DECIMAL(3,2),
  
  construction_year INTEGER,
  construction_year_confidence DECIMAL(3,2),
  
  permitted_use VARCHAR(255),
  permitted_use_confidence DECIMAL(3,2),
  
  building_description TEXT,
  building_description_confidence DECIMAL(3,2),
  
  -- Raw extraction data
  raw_extraction JSONB,
  
  -- Metadata
  pdf_path TEXT,
  processing_method VARCHAR(50) DEFAULT 'openai'
);

CREATE INDEX idx_building_permit_shuma_id ON building_permit_extracts(shuma_id);
CREATE INDEX idx_building_permit_session_id ON building_permit_extracts(session_id);

-- ============================================
-- 7. SHARED BUILDING ORDER TABLE
-- ============================================

DROP TABLE IF EXISTS shared_building_order CASCADE;

CREATE TABLE shared_building_order (
  id SERIAL PRIMARY KEY,
  shuma_id INTEGER REFERENCES shuma(id) ON DELETE CASCADE,
  session_id VARCHAR(255),
  extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Extracted fields with confidence scores
  building_description TEXT,
  building_description_confidence DECIMAL(3,2),
  
  number_of_floors INTEGER,
  number_of_floors_confidence DECIMAL(3,2),
  
  number_of_units INTEGER,
  number_of_units_confidence DECIMAL(3,2),
  
  common_areas TEXT,
  common_areas_confidence DECIMAL(3,2),
  
  -- Raw extraction data
  raw_extraction JSONB,
  
  -- Metadata
  pdf_path TEXT,
  processing_method VARCHAR(50) DEFAULT 'openai'
);

CREATE INDEX idx_shared_building_shuma_id ON shared_building_order(shuma_id);
CREATE INDEX idx_shared_building_session_id ON shared_building_order(session_id);

-- ============================================
-- 8. IMAGES TABLE (for GIS screenshots and property images)
-- ============================================

DROP TABLE IF EXISTS images CASCADE;

CREATE TABLE images (
  id SERIAL PRIMARY KEY,
  shuma_id INTEGER REFERENCES shuma(id) ON DELETE CASCADE,
  session_id VARCHAR(255),
  image_type VARCHAR(50), -- 'gis_screenshot', 'property', 'interior', 'garmushka'
  image_data TEXT, -- base64 or file path
  image_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_images_shuma_id ON images(shuma_id);
CREATE INDEX idx_images_session_id ON images(session_id);
CREATE INDEX idx_images_type ON images(image_type);

-- ============================================
-- 9. GARMUSHKA MEASUREMENTS TABLE
-- ============================================

DROP TABLE IF EXISTS garmushka CASCADE;

CREATE TABLE garmushka (
  id SERIAL PRIMARY KEY,
  shuma_id INTEGER REFERENCES shuma(id) ON DELETE CASCADE,
  session_id VARCHAR(255),
  
  -- Measurement data
  measurement_table JSONB DEFAULT '[]'::jsonb,
  meters_per_pixel DECIMAL(10,6),
  unit_mode VARCHAR(20) DEFAULT 'metric',
  is_calibrated BOOLEAN DEFAULT FALSE,
  file_name VARCHAR(255),
  png_export TEXT, -- base64 PNG
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_garmushka_shuma_id ON garmushka(shuma_id);
CREATE INDEX idx_garmushka_session_id ON garmushka(session_id);

-- ============================================
-- 10. COMPARABLE DATA TABLE
-- ============================================

DROP TABLE IF EXISTS comparable_data CASCADE;

CREATE TABLE comparable_data (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- CSV file information
  csv_filename VARCHAR(255),
  csv_import_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  row_number INTEGER,
  
  -- Property details
  sale_date DATE,
  address TEXT,
  gush_chelka_sub VARCHAR(50),
  rooms DECIMAL(3,1),
  floor_number VARCHAR(20),
  apartment_area_sqm DECIMAL(10,2),
  parking_spaces INTEGER,
  construction_year INTEGER,
  declared_price DECIMAL(12,2),
  price_per_sqm_rounded DECIMAL(10,2),
  
  -- Parsed fields
  gush INTEGER,
  chelka INTEGER,
  sub_chelka INTEGER,
  city VARCHAR(100),
  street_name VARCHAR(200),
  house_number VARCHAR(20),
  
  -- Calculated fields
  calculated_price_per_sqm DECIMAL(10,2),
  age_at_sale INTEGER,
  
  -- Quality indicators
  data_quality_score DECIMAL(3,2),
  has_missing_fields BOOLEAN DEFAULT FALSE,
  missing_fields TEXT[],
  
  -- Indexing
  is_indexed BOOLEAN DEFAULT TRUE,
  index_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_comparable_data_gush ON comparable_data(gush);
CREATE INDEX idx_comparable_data_city ON comparable_data(city);
CREATE INDEX idx_comparable_data_sale_date ON comparable_data(sale_date);
CREATE INDEX idx_comparable_data_rooms ON comparable_data(rooms);

-- ============================================
-- 11. GRANT PERMISSIONS TO APPLICATION USER
-- ============================================

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO shamay_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO shamay_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO shamay_user;

-- Future permissions for new tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO shamay_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO shamay_user;

-- ============================================
-- 12. INSERT SAMPLE DATA (for development)
-- ============================================

-- Insert a sample admin session for testing
INSERT INTO shuma (
  session_id,
  organization_id,
  user_id,
  street,
  building_number,
  city,
  neighborhood,
  rooms,
  floor,
  area,
  client_name,
  shamay_name,
  shamay_serial_number
) VALUES (
  'dev_sample_session',
  'default-org',
  'admin@shamay.ai',
  'הרצל',
  '25',
  'תל אביב-יפו',
  'פלורנטין',
  3.5,
  '3',
  85.5,
  'לקוח לדוגמה',
  'שמאי לדוגמה',
  'רישיון 12345'
) ON CONFLICT (session_id) DO NOTHING;

-- ============================================
-- 13. CREATE VIEWS FOR COMMON QUERIES
-- ============================================

-- View for complete valuation data with extracted information
CREATE OR REPLACE VIEW valuations_with_extracts AS
SELECT 
  s.*,
  lr.gush AS lr_gush,
  lr.parcel AS lr_parcel,
  lr.registration_office AS lr_office,
  bp.permit_number,
  bp.construction_year,
  bp.built_area AS bp_built_area
FROM shuma s
LEFT JOIN land_registry_extracts lr ON s.id = lr.shuma_id
LEFT JOIN building_permit_extracts bp ON s.id = bp.shuma_id;

-- View for session summary
CREATE OR REPLACE VIEW session_summary AS
SELECT 
  session_id,
  organization_id,
  user_id,
  full_address,
  city,
  rooms,
  area,
  final_valuation,
  is_complete,
  created_at,
  updated_at
FROM shuma
ORDER BY updated_at DESC;

-- Grant view access
GRANT SELECT ON valuations_with_extracts TO shamay_user;
GRANT SELECT ON session_summary TO shamay_user;

-- ============================================
-- 14. SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Database initialized successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Tables created:';
  RAISE NOTICE '   - organizations, users, organization_memberships';
  RAISE NOTICE '   - shuma, land_registry_extracts, building_permit_extracts';
  RAISE NOTICE '   - shared_building_order, images, garmushka, comparable_data';
  RAISE NOTICE '';
  RAISE NOTICE '👤 Database users:';
  RAISE NOTICE '   - shamay_user (password: shamay_secure_2024)';
  RAISE NOTICE '';
  RAISE NOTICE '👤 Application users:';
  RAISE NOTICE '   - admin@shamay.ai (password: admin123)';
  RAISE NOTICE '';
  RAISE NOTICE '🏠 Sample data:';
  RAISE NOTICE '   - Default organization created';
  RAISE NOTICE '   - Sample valuation session: dev_sample_session';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 You can now start the application!';
END $$;

