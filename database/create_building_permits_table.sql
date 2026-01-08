-- Building Permits Database Table
-- For Hebrew building permit documents (היתרים מילוליים)

CREATE TABLE IF NOT EXISTS building_permit_extracts (
    -- Primary key and metadata
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Document identification
    document_filename VARCHAR(255),
    document_path TEXT,
    
    -- Building permit fields (היתר בנייה מילולי)
    permit_number VARCHAR(50),
    permit_number_confidence INTEGER DEFAULT 0,
    permit_number_context TEXT,
    
    permit_date DATE,
    permit_date_confidence INTEGER DEFAULT 0,
    permit_date_context TEXT,
    
    permitted_usage TEXT,
    permitted_usage_confidence INTEGER DEFAULT 0,
    permitted_usage_context TEXT,
    
    permit_issue_date DATE,
    permit_issue_date_confidence INTEGER DEFAULT 0,
    permit_issue_date_context TEXT,
    
    local_committee_name TEXT,
    local_committee_name_confidence INTEGER DEFAULT 0,
    local_committee_name_context TEXT,
    
    -- Processing metadata
    processing_method VARCHAR(50), -- 'regex' or 'openai'
    overall_confidence DECIMAL(5,2),
    processing_time_ms INTEGER,
    
    -- Raw content storage
    markdown_content TEXT,
    markdown_path TEXT,
    
    -- Extraction timestamp
    extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_building_permits_permit_number ON building_permit_extracts(permit_number);
CREATE INDEX IF NOT EXISTS idx_building_permits_committee ON building_permit_extracts(local_committee_name);
CREATE INDEX IF NOT EXISTS idx_building_permits_created ON building_permit_extracts(created_at);
CREATE INDEX IF NOT EXISTS idx_building_permits_confidence ON building_permit_extracts(overall_confidence);

-- View for easy querying of high-confidence extractions
CREATE OR REPLACE VIEW building_permits_reliable AS
SELECT 
    id,
    document_filename,
    permit_number,
    permit_date,
    permitted_usage,
    permit_issue_date,
    local_committee_name,
    overall_confidence,
    created_at
FROM building_permit_extracts 
WHERE overall_confidence >= 70
ORDER BY created_at DESC;

-- Comments for field documentation
COMMENT ON TABLE building_permit_extracts IS 'Stores extracted data from Hebrew building permit documents (היתרים מילוליים)';
COMMENT ON COLUMN building_permit_extracts.permit_number IS 'Building permit number (היתר בנייה - מספר)';
COMMENT ON COLUMN building_permit_extracts.permit_date IS 'Building permit date (היתר בנייה - תאריך)';
COMMENT ON COLUMN building_permit_extracts.permitted_usage IS 'Permitted usage (מותר)';
COMMENT ON COLUMN building_permit_extracts.permit_issue_date IS 'Permit issue date (תאריך הפקת היתר)';
COMMENT ON COLUMN building_permit_extracts.local_committee_name IS 'Local committee name (שם הוועדה המקומית)';