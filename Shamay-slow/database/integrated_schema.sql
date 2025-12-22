-- INTEGRATED DATABASE SCHEMA FOR SHAMAY.AI
-- This script creates the complete database structure integrating:
-- 1. Authentication & Organization system (Prisma)
-- 2. Existing business tables (Land Registry, Comparable Data, Garmushka)
-- 3. New valuation system with session management
-- 4. File storage and asset management

-- ==============================================
-- PART 1: AUTHENTICATION & ORGANIZATION SYSTEM
-- ==============================================

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Memberships table
CREATE TABLE IF NOT EXISTS memberships (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('OWNER', 'ORG_ADMIN', 'APPRAISER', 'CLIENT_VIEWER')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, organization_id)
);

-- ==============================================
-- PART 2: VALUATION SYSTEM WITH SESSION MANAGEMENT
-- ==============================================

-- Main valuations table
CREATE TABLE IF NOT EXISTS valuations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'IN_PROGRESS', 'READY', 'SIGNED', 'ARCHIVED')),
    address_full TEXT NOT NULL,
    block TEXT,
    parcel TEXT,
    subparcel TEXT,
    meta JSONB,
    created_by_id TEXT NOT NULL REFERENCES users(id),
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Wizard step data
    step1_data JSONB,
    step2_data JSONB,
    step3_data JSONB,
    step4_data JSONB,
    step5_data JSONB,
    
    -- GIS data
    gis_screenshots JSONB,
    gis_analysis JSONB,
    
    -- Garmushka data
    garmushka_measurements JSONB,
    garmushka_images JSONB,
    
    -- Final results
    final_valuation DECIMAL(12,2),
    price_per_sqm DECIMAL(10,2),
    comparable_data JSONB,
    property_analysis JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Session management for wizard
CREATE TABLE IF NOT EXISTS valuation_sessions (
    id TEXT PRIMARY KEY,
    session_id TEXT UNIQUE NOT NULL,
    valuation_id TEXT REFERENCES valuations(id) ON DELETE SET NULL,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'ABANDONED', 'EXPIRED')),
    step_data JSONB,
    wizard_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- ==============================================
-- PART 3: DOCUMENT & FILE MANAGEMENT
-- ==============================================

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    valuation_id TEXT REFERENCES valuations(id) ON DELETE CASCADE,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    doc_type TEXT NOT NULL CHECK (doc_type IN ('TABU', 'CONDO', 'PERMIT', 'PLANNING_INFO', 'GARMUSHKA', 'GIS_SCREENSHOT', 'PROPERTY_IMAGE', 'OTHER')),
    file_name TEXT NOT NULL,
    storage_key TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('USER_UPLOAD', 'APP_GENERATED', 'AI_EXTRACTED')),
    extracted JSONB,
    uploaded_by_id TEXT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(valuation_id, doc_type, sha256)
);

-- Images table
CREATE TABLE IF NOT EXISTS images (
    id TEXT PRIMARY KEY,
    valuation_id TEXT REFERENCES valuations(id) ON DELETE CASCADE,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    storage_key TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    room_type TEXT CHECK (room_type IN ('LIVING', 'KITCHEN', 'BATH', 'BEDROOM', 'EXTERIOR', 'OTHER')),
    features JSONB,
    finish_level TEXT CHECK (finish_level IN ('BASIC', 'STANDARD', 'PREMIUM')),
    uploaded_by_id TEXT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Assets table
CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    valuation_id TEXT REFERENCES valuations(id) ON DELETE CASCADE,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('PDF', 'DOCX', 'CSV', 'JSON', 'IMAGE')),
    file_name TEXT NOT NULL,
    storage_key TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    slug TEXT,
    generated_by_id TEXT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- PART 4: ACTIVITY LOGGING & AUDIT
-- ==============================================

-- Activity logs
CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subject_type TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    action TEXT NOT NULL,
    actor_id TEXT NOT NULL REFERENCES users(id),
    payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Outbox pattern for event processing
CREATE TABLE IF NOT EXISTS outbox (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- PART 5: EXISTING BUSINESS TABLES (PRESERVED)
-- ==============================================

-- Keep all existing tables from your database folder
-- These will be linked to the new valuation system

-- ==============================================
-- PART 6: INDEXES FOR PERFORMANCE
-- ==============================================

-- Organization indexes
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);
CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON organizations(created_at);

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Membership indexes
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_organization_id ON memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_memberships_role ON memberships(role);

-- Valuation indexes
CREATE INDEX IF NOT EXISTS idx_valuations_organization_id ON valuations(organization_id);
CREATE INDEX IF NOT EXISTS idx_valuations_status ON valuations(status);
CREATE INDEX IF NOT EXISTS idx_valuations_created_by_id ON valuations(created_by_id);
CREATE INDEX IF NOT EXISTS idx_valuations_address_full ON valuations(address_full);
CREATE INDEX IF NOT EXISTS idx_valuations_block_parcel ON valuations(block, parcel);
CREATE INDEX IF NOT EXISTS idx_valuations_created_at ON valuations(created_at);

-- Session indexes
CREATE INDEX IF NOT EXISTS idx_valuation_sessions_session_id ON valuation_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_valuation_sessions_valuation_id ON valuation_sessions(valuation_id);
CREATE INDEX IF NOT EXISTS idx_valuation_sessions_organization_id ON valuation_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_valuation_sessions_status ON valuation_sessions(status);
CREATE INDEX IF NOT EXISTS idx_valuation_sessions_expires_at ON valuation_sessions(expires_at);

-- Document indexes
CREATE INDEX IF NOT EXISTS idx_documents_organization_id ON documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_valuation_id ON documents(valuation_id);
CREATE INDEX IF NOT EXISTS idx_documents_doc_type ON documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_documents_sha256 ON documents(sha256);
CREATE INDEX IF NOT EXISTS idx_documents_source ON documents(source);

-- Image indexes
CREATE INDEX IF NOT EXISTS idx_images_organization_id ON images(organization_id);
CREATE INDEX IF NOT EXISTS idx_images_valuation_id ON images(valuation_id);
CREATE INDEX IF NOT EXISTS idx_images_room_type ON images(room_type);
CREATE INDEX IF NOT EXISTS idx_images_sha256 ON images(sha256);

-- Asset indexes
CREATE INDEX IF NOT EXISTS idx_assets_organization_id ON assets(organization_id);
CREATE INDEX IF NOT EXISTS idx_assets_valuation_id ON assets(valuation_id);
CREATE INDEX IF NOT EXISTS idx_assets_asset_type ON assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_assets_sha256 ON assets(sha256);

-- Activity log indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_organization_id ON activity_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_subject ON activity_logs(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor_id ON activity_logs(actor_id);

-- Outbox indexes
CREATE INDEX IF NOT EXISTS idx_outbox_processed ON outbox(processed);
CREATE INDEX IF NOT EXISTS idx_outbox_event_type ON outbox(event_type);

-- ==============================================
-- PART 7: JSONB INDEXES FOR COMPLEX QUERIES
-- ==============================================

-- Valuation step data indexes
CREATE INDEX IF NOT EXISTS idx_valuations_step1_data_gin ON valuations USING gin (step1_data);
CREATE INDEX IF NOT EXISTS idx_valuations_step2_data_gin ON valuations USING gin (step2_data);
CREATE INDEX IF NOT EXISTS idx_valuations_step3_data_gin ON valuations USING gin (step3_data);
CREATE INDEX IF NOT EXISTS idx_valuations_step4_data_gin ON valuations USING gin (step4_data);
CREATE INDEX IF NOT EXISTS idx_valuations_step5_data_gin ON valuations USING gin (step5_data);

-- GIS and Garmushka data indexes
CREATE INDEX IF NOT EXISTS idx_valuations_gis_screenshots_gin ON valuations USING gin (gis_screenshots);
CREATE INDEX IF NOT EXISTS idx_valuations_gis_analysis_gin ON valuations USING gin (gis_analysis);
CREATE INDEX IF NOT EXISTS idx_valuations_garmushka_measurements_gin ON valuations USING gin (garmushka_measurements);
CREATE INDEX IF NOT EXISTS idx_valuations_garmushka_images_gin ON valuations USING gin (garmushka_images);

-- Session data indexes
CREATE INDEX IF NOT EXISTS idx_valuation_sessions_step_data_gin ON valuation_sessions USING gin (step_data);
CREATE INDEX IF NOT EXISTS idx_valuation_sessions_wizard_data_gin ON valuation_sessions USING gin (wizard_data);

-- Document extracted data indexes
CREATE INDEX IF NOT EXISTS idx_documents_extracted_gin ON documents USING gin (extracted);

-- Image features indexes
CREATE INDEX IF NOT EXISTS idx_images_features_gin ON images USING gin (features);

-- Activity log payload indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_payload_gin ON activity_logs USING gin (payload);

-- Outbox payload indexes
CREATE INDEX IF NOT EXISTS idx_outbox_payload_gin ON outbox USING gin (payload);

-- ==============================================
-- PART 8: TRIGGERS FOR AUTOMATIC UPDATES
-- ==============================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP; 
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_memberships_updated_at BEFORE UPDATE ON memberships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_valuations_updated_at BEFORE UPDATE ON valuations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_valuation_sessions_updated_at BEFORE UPDATE ON valuation_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_images_updated_at BEFORE UPDATE ON images FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_outbox_updated_at BEFORE UPDATE ON outbox FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- PART 9: VIEWS FOR COMMON QUERIES
-- ==============================================

-- Active valuations view
CREATE OR REPLACE VIEW active_valuations AS
SELECT 
    v.id,
    v.title,
    v.status,
    v.address_full,
    v.block,
    v.parcel,
    v.subparcel,
    v.final_valuation,
    v.price_per_sqm,
    v.created_at,
    u.name as created_by_name,
    o.name as organization_name
FROM valuations v
JOIN users u ON v.created_by_id = u.id
JOIN organizations o ON v.organization_id = o.id
WHERE v.status IN ('DRAFT', 'IN_PROGRESS', 'READY')
ORDER BY v.updated_at DESC;

-- Session summary view
CREATE OR REPLACE VIEW active_sessions AS
SELECT 
    vs.id,
    vs.session_id,
    vs.status,
    vs.created_at,
    vs.expires_at,
    v.title as valuation_title,
    u.name as user_name,
    o.name as organization_name
FROM valuation_sessions vs
JOIN users u ON vs.user_id = u.id
JOIN organizations o ON vs.organization_id = o.id
LEFT JOIN valuations v ON vs.valuation_id = v.id
WHERE vs.status = 'ACTIVE'
ORDER BY vs.created_at DESC;

-- Document summary view
CREATE OR REPLACE VIEW document_summary AS
SELECT 
    d.id,
    d.doc_type,
    d.file_name,
    d.source,
    d.created_at,
    v.title as valuation_title,
    u.name as uploaded_by_name
FROM documents d
JOIN users u ON d.uploaded_by_id = u.id
LEFT JOIN valuations v ON d.valuation_id = v.id
ORDER BY d.created_at DESC;

-- ==============================================
-- PART 10: SAMPLE DATA FOR TESTING
-- ==============================================

-- Insert sample organization
INSERT INTO organizations (id, name) VALUES 
('org_1', 'Shamay.AI - Demo Organization')
ON CONFLICT (id) DO NOTHING;

-- Insert sample admin user
INSERT INTO users (id, email, name) VALUES 
('user_1', 'admin@shamay.ai', 'Admin User')
ON CONFLICT (id) DO NOTHING;

-- Insert sample membership
INSERT INTO memberships (id, user_id, organization_id, role) VALUES 
('membership_1', 'user_1', 'org_1', 'OWNER')
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- ==============================================
-- PART 11: PERMISSIONS AND SECURITY
-- ==============================================

-- Grant permissions to postgres user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres;

-- Comments for documentation
COMMENT ON TABLE organizations IS 'Organizations using the Shamay.AI platform';
COMMENT ON TABLE users IS 'Users with access to the platform';
COMMENT ON TABLE memberships IS 'User-organization relationships with roles';
COMMENT ON TABLE valuations IS 'Property valuations with complete wizard data';
COMMENT ON TABLE valuation_sessions IS 'Active wizard sessions for valuations';
COMMENT ON TABLE documents IS 'Documents associated with valuations';
COMMENT ON TABLE images IS 'Images associated with valuations';
COMMENT ON TABLE assets IS 'Generated assets from valuations';
COMMENT ON TABLE activity_logs IS 'Audit trail for all system activities';
COMMENT ON TABLE outbox IS 'Event processing queue for system events';
