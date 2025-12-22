-- Report System Tables for SHAMAY.AI
-- Implements the complete data model for report generation with provenance tracking
-- DO NOT modify without understanding the TA_ID contract

-- ===== CORE REPORT TABLE =====
CREATE TABLE IF NOT EXISTS report (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Report metadata
  type TEXT NOT NULL DEFAULT 'residential_apartment', -- enum: residential_apartment, commercial, land
  purpose TEXT NOT NULL DEFAULT 'market_value', -- enum: market_value, tax, inheritance, divorce
  
  -- Dates (TA11, TA20, TA21)
  date_created DATE NOT NULL DEFAULT CURRENT_DATE,
  visit_date DATE NOT NULL,
  determining_date DATE NOT NULL,
  determining_date_reason TEXT, -- Required if determining_date != visit_date
  
  -- Client info (TA10)
  client_name TEXT NOT NULL,
  
  -- Reference (TA12 - auto generated)
  reference_code TEXT NOT NULL UNIQUE,
  
  -- Address components (TA3-6)
  address_street TEXT NOT NULL,
  address_building_no TEXT NOT NULL,
  address_neighborhood TEXT,
  address_city TEXT NOT NULL,
  
  -- Property essence (TA23)
  essence_text TEXT NOT NULL,
  
  -- User/org linkage
  created_by_user_id TEXT,
  organization_id TEXT,
  
  CONSTRAINT visit_date_not_future CHECK (visit_date <= CURRENT_DATE),
  CONSTRAINT determining_date_not_future CHECK (determining_date <= CURRENT_DATE)
);

-- ===== PARCEL TABLE (TA24-25, TA57) =====
CREATE TABLE IF NOT EXISTS parcel (
  report_id UUID PRIMARY KEY REFERENCES report(id) ON DELETE CASCADE,
  
  block INTEGER NOT NULL, -- TA24
  number INTEGER NOT NULL, -- TA25
  area_sqm NUMERIC(10, 2) NOT NULL,
  buildings_count INTEGER,
  
  -- Boundaries (TA42-46)
  boundary_north TEXT,
  boundary_south TEXT,
  boundary_east TEXT,
  boundary_west TEXT,
  
  -- Additional fields from Tabu
  shape_description TEXT,
  surface_description TEXT,
  
  CONSTRAINT block_positive CHECK (block > 0),
  CONSTRAINT parcel_positive CHECK (number > 0),
  CONSTRAINT area_positive CHECK (area_sqm > 0)
);

-- ===== SUB-PARCEL TABLE (TA26-27, TA59) =====
CREATE TABLE IF NOT EXISTS subparcel (
  report_id UUID PRIMARY KEY REFERENCES report(id) ON DELETE CASCADE,
  
  number TEXT NOT NULL, -- TA26
  floor INTEGER NOT NULL,
  building_number TEXT,
  registered_area_sqm NUMERIC(10, 2) NOT NULL, -- TA27
  additional_areas TEXT, -- e.g., "מרפסת 40 מ\"ר"
  common_parts TEXT, -- e.g., "4/896"
  
  -- Extracted from Condo or Tabu
  unit_description TEXT,
  
  CONSTRAINT registered_area_positive CHECK (registered_area_sqm > 0)
);

-- ===== RIGHTS TABLE (TA30) =====
CREATE TABLE IF NOT EXISTS rights (
  report_id UUID PRIMARY KEY REFERENCES report(id) ON DELETE CASCADE,
  
  ownership_type TEXT NOT NULL DEFAULT 'private_ownership', -- enum: private_ownership, leasehold, etc.
  
  source JSONB NOT NULL DEFAULT '{"source": "tabu", "file_id": null, "page": null, "low_confidence": false}'::jsonb
);

-- ===== ATTACHMENTS TABLE (TA29, TA60) =====
CREATE TABLE IF NOT EXISTS attachment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES report(id) ON DELETE CASCADE,
  
  type TEXT NOT NULL, -- e.g., "חניה", "מחסן", "מרפסת"
  size_sqm NUMERIC(10, 2),
  symbol TEXT, -- Letter on plan (e.g., "א'")
  color TEXT, -- Color on plan (e.g., "אדום")
  
  source JSONB NOT NULL,
  
  CONSTRAINT size_positive CHECK (size_sqm IS NULL OR size_sqm > 0)
);

CREATE INDEX idx_attachment_report ON attachment(report_id);

-- ===== OWNERSHIP TABLE (TA61) =====
CREATE TABLE IF NOT EXISTS ownership (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES report(id) ON DELETE CASCADE,
  
  owner_name TEXT NOT NULL,
  id_type TEXT NOT NULL DEFAULT 'ת.ז', -- e.g., "ת.ז", "ח.פ", "דרכון"
  id_number TEXT NOT NULL,
  fraction TEXT NOT NULL, -- e.g., "1/2", "שלמות"
  
  source JSONB NOT NULL
);

CREATE INDEX idx_ownership_report ON ownership(report_id);

-- ===== MORTGAGE TABLE (TA62) =====
CREATE TABLE IF NOT EXISTS mortgage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES report(id) ON DELETE CASCADE,
  
  rank TEXT NOT NULL, -- e.g., "ראשונה", "שנייה"
  beneficiary TEXT NOT NULL, -- e.g., "בנק הפועלים"
  amount_nis NUMERIC(12, 2),
  fraction TEXT, -- Share in property
  date DATE,
  
  source JSONB NOT NULL,
  
  CONSTRAINT amount_positive CHECK (amount_nis IS NULL OR amount_nis > 0)
);

CREATE INDEX idx_mortgage_report ON mortgage(report_id);

-- ===== NOTES TABLE (TA63) =====
CREATE TABLE IF NOT EXISTS note (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES report(id) ON DELETE CASCADE,
  
  action_type TEXT NOT NULL, -- e.g., "עיקול", "הערה"
  date DATE,
  beneficiary TEXT,
  extra TEXT, -- Additional details
  
  source JSONB NOT NULL
);

CREATE INDEX idx_note_report ON note(report_id);

-- ===== TABU METADATA TABLE (TA31, TA56) =====
CREATE TABLE IF NOT EXISTS tabu_meta (
  report_id UUID PRIMARY KEY REFERENCES report(id) ON DELETE CASCADE,
  
  registrar_office TEXT NOT NULL, -- TA56
  extract_date DATE NOT NULL, -- TA31
  
  -- Additional metadata
  file_id UUID,
  
  source JSONB NOT NULL,
  
  CONSTRAINT extract_date_not_future CHECK (extract_date <= CURRENT_DATE)
);

-- ===== CONDO ORDER TABLE (TA64-67) =====
CREATE TABLE IF NOT EXISTS condo (
  report_id UUID PRIMARY KEY REFERENCES report(id) ON DELETE CASCADE,
  
  order_date DATE, -- TA64
  building_desc JSONB, -- TA65: {buildings: [{no, floors, units}], total_units, etc.}
  subparcel_desc JSONB, -- TA66: sub-parcel details from condo order
  
  source JSONB NOT NULL
);

-- ===== PERMITS TABLE (TA51-52) =====
CREATE TABLE IF NOT EXISTS permit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES report(id) ON DELETE CASCADE,
  
  number TEXT NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  is_latest BOOLEAN NOT NULL DEFAULT FALSE,
  has_completion_certificate BOOLEAN NOT NULL DEFAULT FALSE,
  
  source JSONB NOT NULL,
  
  CONSTRAINT permit_date_not_future CHECK (date <= CURRENT_DATE)
);

CREATE INDEX idx_permit_report ON permit(report_id);
CREATE INDEX idx_permit_latest ON permit(report_id, is_latest) WHERE is_latest = TRUE;

-- ===== AI-GENERATED TEXT TABLE (TA34, TA38-39, TA47-49) =====
CREATE TABLE IF NOT EXISTS ai_text (
  report_id UUID NOT NULL REFERENCES report(id) ON DELETE CASCADE,
  key TEXT NOT NULL, -- e.g., "neighborhood_desc", "parcel_desc", "building_desc", "subject_desc", "internal_layout"
  
  content TEXT NOT NULL,
  model TEXT, -- e.g., "gpt-4", "claude-3"
  prompt TEXT,
  
  source JSONB NOT NULL,
  
  PRIMARY KEY (report_id, key)
);

-- ===== COMPARABLES TABLE (TA90) =====
CREATE TABLE IF NOT EXISTS comp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES report(id) ON DELETE CASCADE,
  
  sale_date DATE NOT NULL,
  address TEXT NOT NULL,
  block INTEGER,
  parcel INTEGER,
  rooms INTEGER,
  floor INTEGER,
  built_area_sqm NUMERIC(10, 2) NOT NULL,
  build_year INTEGER,
  price_nis NUMERIC(12, 2) NOT NULL,
  price_psm NUMERIC(10, 2) NOT NULL, -- Computed: price_nis / built_area_sqm
  
  included BOOLEAN NOT NULL DEFAULT TRUE, -- User can exclude outliers
  
  source JSONB NOT NULL DEFAULT '{"source": "manual", "file_id": null, "page": null, "low_confidence": false}'::jsonb,
  
  CONSTRAINT built_area_positive CHECK (built_area_sqm > 0),
  CONSTRAINT price_positive CHECK (price_nis > 0)
);

CREATE INDEX idx_comp_report ON comp(report_id);
CREATE INDEX idx_comp_included ON comp(report_id, included) WHERE included = TRUE;

-- ===== CALCULATION TABLE (TA92-97) =====
CREATE TABLE IF NOT EXISTS calc (
  report_id UUID PRIMARY KEY REFERENCES report(id) ON DELETE CASCADE,
  
  -- Inputs
  area_built NUMERIC(10, 2) NOT NULL, -- TA28
  area_balcony NUMERIC(10, 2) NOT NULL DEFAULT 0,
  
  -- Computed from comps (TA91-92)
  eq_psm NUMERIC(10, 2) NOT NULL, -- Equivalent price per sqm
  eq_coefficient NUMERIC(5, 3) DEFAULT 0.5, -- Balcony coefficient (default 0.5)
  
  -- Computed values
  eq_area NUMERIC(10, 2) NOT NULL, -- area_built + (area_balcony * eq_coefficient)
  asset_value NUMERIC(12, 2) NOT NULL, -- TA95: CEIL(eq_area * eq_psm) rounded to thousands
  
  -- Metadata (TA97)
  vat_included BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT, -- TA96: Property description for calc table
  
  -- Provenance
  eq_psm_source TEXT, -- 'average' or 'median'
  
  CONSTRAINT area_built_positive CHECK (area_built > 0),
  CONSTRAINT eq_psm_positive CHECK (eq_psm > 0),
  CONSTRAINT eq_area_positive CHECK (eq_area > 0),
  CONSTRAINT asset_value_positive CHECK (asset_value > 0)
);

-- ===== PLANNING TABLE =====
CREATE TABLE IF NOT EXISTS planning (
  report_id UUID PRIMARY KEY REFERENCES report(id) ON DELETE CASCADE,
  
  authority_name TEXT, -- TA50
  
  -- Rights summary (TA71) - 6 core fields
  usage TEXT, -- ייעוד
  min_lot_size TEXT, -- שטח מגרש מינימלי
  build_percentage TEXT, -- אחוזי בנייה
  max_floors TEXT, -- קומות מותרות
  max_units TEXT, -- יח"ד מותרות
  building_lines TEXT, -- קווי בניין
  
  source JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- ===== PLANNING SCHEMES TABLE (TA70) =====
CREATE TABLE IF NOT EXISTS planning_scheme (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES report(id) ON DELETE CASCADE,
  
  plan_number TEXT NOT NULL,
  plan_name TEXT,
  status TEXT NOT NULL DEFAULT 'בתוקף',
  publication_date DATE,
  
  source JSONB NOT NULL DEFAULT '{"source": "manual", "file_id": null, "page": null, "low_confidence": false}'::jsonb
);

CREATE INDEX idx_planning_scheme_report ON planning_scheme(report_id);

-- ===== FACTORS/CONSIDERATIONS TABLE (TA74-89) =====
CREATE TABLE IF NOT EXISTS factor_bullet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES report(id) ON DELETE CASCADE,
  
  category TEXT NOT NULL, -- 'environment', 'rights', 'planning', 'valuation'
  content TEXT NOT NULL,
  is_auto BOOLEAN NOT NULL DEFAULT FALSE, -- Auto-generated from data vs manual entry
  display_order INTEGER NOT NULL,
  
  source JSONB NOT NULL,
  
  CONSTRAINT content_min_length CHECK (char_length(content) >= 3)
);

CREATE INDEX idx_factor_report ON factor_bullet(report_id, category, display_order);

-- ===== AUDIT LOG TABLE =====
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES report(id) ON DELETE CASCADE,
  
  field_path TEXT NOT NULL, -- e.g., "parcel.block", "client_name"
  old_value JSONB,
  new_value JSONB,
  
  changed_by TEXT NOT NULL, -- User ID or email
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  source JSONB NOT NULL
);

CREATE INDEX idx_audit_report ON audit_log(report_id, ts DESC);
CREATE INDEX idx_audit_field ON audit_log(field_path);

-- ===== TA BINDING TABLE (Optional QA helper) =====
CREATE TABLE IF NOT EXISTS ta_binding (
  report_id UUID NOT NULL REFERENCES report(id) ON DELETE CASCADE,
  ta_id TEXT NOT NULL, -- e.g., "TA24"
  value_path TEXT NOT NULL, -- e.g., "parcel.block"
  
  PRIMARY KEY (report_id, ta_id)
);

-- ===== MEDIA/FILES TABLE =====
CREATE TABLE IF NOT EXISTS report_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES report(id) ON DELETE CASCADE,
  
  type TEXT NOT NULL, -- 'cover_photo', 'govmap', 'gis', 'interior', 'plan_excerpt', 'condo_screenshot', etc.
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  
  -- Metadata
  caption TEXT,
  page_number INTEGER, -- If extracted from PDF
  
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  source JSONB NOT NULL
);

CREATE INDEX idx_media_report ON report_media(report_id, type);

-- ===== VALIDATION STATES TABLE =====
CREATE TABLE IF NOT EXISTS field_validation (
  report_id UUID NOT NULL REFERENCES report(id) ON DELETE CASCADE,
  field_path TEXT NOT NULL,
  
  status TEXT NOT NULL, -- 'valid', 'warning', 'error'
  message TEXT,
  
  validated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  PRIMARY KEY (report_id, field_path)
);

-- ===== UPDATE TIMESTAMP TRIGGER =====
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_report_updated_at
  BEFORE UPDATE ON report
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===== INDEXES FOR PERFORMANCE =====
CREATE INDEX idx_report_created_at ON report(created_at DESC);
CREATE INDEX idx_report_user ON report(created_by_user_id);
CREATE INDEX idx_report_org ON report(organization_id);
CREATE INDEX idx_report_reference ON report(reference_code);

-- ===== COMMENTS FOR DOCUMENTATION =====
COMMENT ON TABLE report IS 'Core report entity with client info, dates, and address (TA10-12, TA3-6, TA20-21)';
COMMENT ON TABLE parcel IS 'Parcel/land information from Tabu extract (TA24-25, TA42-46)';
COMMENT ON TABLE subparcel IS 'Sub-parcel/unit information (TA26-27, TA59)';
COMMENT ON TABLE attachment IS 'Legal attachments: parking, storage, balconies (TA29, TA60)';
COMMENT ON TABLE ownership IS 'Ownership records with ID and shares (TA61)';
COMMENT ON TABLE mortgage IS 'Mortgage/lien records (TA62)';
COMMENT ON TABLE note IS 'Legal notes/remarks from registrar (TA63)';
COMMENT ON TABLE tabu_meta IS 'Tabu extract metadata (TA31, TA56)';
COMMENT ON TABLE condo IS 'Condo order details (TA64-67)';
COMMENT ON TABLE permit IS 'Building permits (TA51-52)';
COMMENT ON TABLE ai_text IS 'AI-generated descriptions (TA34, TA38-39, TA47-49)';
COMMENT ON TABLE comp IS 'Comparable sales data (TA90)';
COMMENT ON TABLE calc IS 'Valuation calculations (TA92-97)';
COMMENT ON TABLE audit_log IS 'Full audit trail for all changes';
COMMENT ON TABLE ta_binding IS 'TA_ID to field path mapping for QA';

COMMENT ON COLUMN report.determining_date_reason IS 'Required if user overrides determining_date != visit_date';
COMMENT ON COLUMN attachment.source IS 'JSONB: {source: tabu|condo|permit|manual|ai, file_id: uuid, page: int, low_confidence: bool}';
COMMENT ON COLUMN ownership.source IS 'JSONB: {source: tabu|condo|permit|manual|ai, file_id: uuid, page: int, low_confidence: bool}';
COMMENT ON COLUMN mortgage.source IS 'JSONB: {source: tabu|condo|permit|manual|ai, file_id: uuid, page: int, low_confidence: bool}';

