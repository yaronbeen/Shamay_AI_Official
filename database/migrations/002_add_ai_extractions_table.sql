-- ============================================
-- AI EXTRACTIONS TABLE
-- Stores original AI-extracted data before user edits
-- ============================================

DROP TABLE IF EXISTS ai_extractions CASCADE;

CREATE TABLE ai_extractions (
  id SERIAL PRIMARY KEY,
  shuma_id INTEGER REFERENCES shuma(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL,
  
  -- Extraction metadata
  extraction_type VARCHAR(50) NOT NULL, -- 'land_registry', 'building_permit', 'shared_building', 'interior_images', 'exterior_images', 'combined'
  extraction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Original AI response (full JSON)
  raw_ai_response JSONB NOT NULL,
  
  -- Parsed extracted data (for quick access)
  extracted_fields JSONB NOT NULL,
  
  -- AI processing metadata
  ai_model VARCHAR(100), -- e.g., 'gpt-4-vision-preview'
  processing_cost DECIMAL(10,4), -- cost in USD
  confidence_score DECIMAL(3,2), -- overall confidence 0-100
  processing_time_ms INTEGER, -- processing time in milliseconds
  
  -- Document reference
  document_filename VARCHAR(255),
  document_path TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE, -- false if user has overridden
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_ai_extractions_shuma_id ON ai_extractions(shuma_id);
CREATE INDEX idx_ai_extractions_session_id ON ai_extractions(session_id);
CREATE INDEX idx_ai_extractions_type ON ai_extractions(extraction_type);
CREATE INDEX idx_ai_extractions_date ON ai_extractions(extraction_date DESC);
CREATE INDEX idx_ai_extractions_active ON ai_extractions(is_active);

-- Composite index for common queries
CREATE INDEX idx_ai_extractions_session_type ON ai_extractions(session_id, extraction_type);

COMMENT ON TABLE ai_extractions IS 'Stores original AI-extracted data before user modifications. Allows users to revert to AI suggestions.';
COMMENT ON COLUMN ai_extractions.extraction_type IS 'Type of extraction: land_registry, building_permit, shared_building, interior_images, exterior_images, or combined';
COMMENT ON COLUMN ai_extractions.raw_ai_response IS 'Complete unmodified response from AI service';
COMMENT ON COLUMN ai_extractions.extracted_fields IS 'Parsed fields in standard format for UI display';
COMMENT ON COLUMN ai_extractions.is_active IS 'False if user has overridden these values with manual edits';

