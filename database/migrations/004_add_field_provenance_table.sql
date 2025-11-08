-- ============================================
-- FIELD PROVENANCE TABLE
-- Stores source information for each extracted field
-- ============================================

DROP TABLE IF EXISTS field_provenance CASCADE;

CREATE TABLE field_provenance (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys
  shuma_id INTEGER REFERENCES shuma(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL,
  
  -- Field Identification
  field_path TEXT NOT NULL, -- e.g., 'gush', 'land_registry.registration_office', 'extractedData.chelka'
  field_value TEXT, -- Current value of the field
  
  -- Document Source
  document_id TEXT, -- ID from uploads array or document reference
  document_name TEXT, -- Name of the source document
  document_type TEXT, -- 'tabu', 'permit', 'condo', etc.
  document_url TEXT, -- URL or path to the document
  
  -- Location Information
  page_number INTEGER NOT NULL DEFAULT 1,
  bbox JSONB, -- {x: number, y: number, width: number, height: number} - NULL initially for AI extractions, user can correct
  
  -- Confidence & Quality
  confidence DECIMAL(5,4) DEFAULT 0, -- 0.0 to 1.0
  extraction_method TEXT, -- 'ai_auto', 'manual', 'user_corrected'
  model_used TEXT, -- AI model used (e.g., 'claude-3-5-sonnet')
  
  -- Versioning
  is_active BOOLEAN DEFAULT TRUE, -- false if field value was manually changed
  version_number INTEGER DEFAULT 1, -- Track provenance versions for same field
  
  -- Metadata
  created_by TEXT DEFAULT 'system', -- User or system that created this provenance
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_field_provenance_session_id ON field_provenance(session_id);
CREATE INDEX idx_field_provenance_shuma_id ON field_provenance(shuma_id);
CREATE INDEX idx_field_provenance_field_path ON field_provenance(field_path);
CREATE INDEX idx_field_provenance_session_field ON field_provenance(session_id, field_path);
CREATE INDEX idx_field_provenance_document_id ON field_provenance(document_id);
CREATE INDEX idx_field_provenance_page ON field_provenance(page_number);
CREATE INDEX idx_field_provenance_active ON field_provenance(is_active);
CREATE INDEX idx_field_provenance_confidence ON field_provenance(confidence DESC);

-- Composite index for common queries (session + field + active)
CREATE INDEX idx_field_provenance_session_field_active ON field_provenance(session_id, field_path, is_active);

-- GIN index for bbox JSONB queries
CREATE INDEX idx_field_provenance_bbox_gin ON field_provenance USING gin (bbox);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_field_provenance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_field_provenance_timestamp
  BEFORE UPDATE ON field_provenance
  FOR EACH ROW
  EXECUTE FUNCTION update_field_provenance_updated_at();

-- Comments for documentation
COMMENT ON TABLE field_provenance IS 'Stores provenance (source document, page, bbox) for each extracted field in the valuation wizard';
COMMENT ON COLUMN field_provenance.field_path IS 'Path to field in extractedData structure (e.g., gush, land_registry.chelka)';
COMMENT ON COLUMN field_provenance.bbox IS 'Bounding box coordinates: {x, y, width, height} in PDF coordinate space';
COMMENT ON COLUMN field_provenance.is_active IS 'TRUE if this provenance is current; FALSE if field value was manually changed';
COMMENT ON COLUMN field_provenance.version_number IS 'Version number for tracking provenance history when field is edited';

