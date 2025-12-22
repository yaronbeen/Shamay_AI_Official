-- Garmushka Table Schema
-- For storing Garmushka documents with measurement data

CREATE TABLE IF NOT EXISTS garmushka (
    -- Primary key and metadata
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Document identification
    document_filename VARCHAR(255),
    document_path TEXT,
    
    -- Garmushka image/document (גרמושקה)
    garmushka_image_path TEXT,                          -- Path to the garmushka image/document
    garmushka_filename VARCHAR(255),                    -- Garmushka document filename
    
    -- Measurement fields (Measurment type data)
    garmushka_issue_date DATE,                          -- מתי הופקה הגרמושקה
    garmushka_issue_date_confidence NUMERIC(3,2) DEFAULT 0,
    garmushka_issue_date_context TEXT,
    
    built_area DECIMAL(10,2),                           -- שטח בנוי
    built_area_confidence NUMERIC(3,2) DEFAULT 0,
    built_area_context TEXT,
    built_area_units VARCHAR(10) DEFAULT 'מ"ר',        -- Units (square meters)
    
    property_areas_screenshot_path TEXT,                -- צילום מסך של השטחים המשוייכים לנכס
    property_areas_screenshot_filename VARCHAR(255),   -- Screenshot filename
    
    apartment_area DECIMAL(10,2),                       -- שטח דירה
    apartment_area_confidence NUMERIC(3,2) DEFAULT 0,
    apartment_area_context TEXT,
    apartment_area_units VARCHAR(10) DEFAULT 'מ"ר',
    
    balcony_area DECIMAL(10,2),                         -- שטח מרפסת
    balcony_area_confidence NUMERIC(3,2) DEFAULT 0,
    balcony_area_context TEXT,
    balcony_area_units VARCHAR(10) DEFAULT 'מ"ר',
    
    -- Relations to other tables
    property_assessment_id INTEGER,                     -- Link to property assessment
    building_permit_id INTEGER,                         -- Link to building permit
    
    -- Processing metadata
    processing_method VARCHAR(50),                      -- 'manual', 'ai', 'hybrid'
    overall_confidence NUMERIC(3,2) DEFAULT 0,
    extraction_notes TEXT,
    
    -- System metadata
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    status VARCHAR(50) DEFAULT 'draft',                 -- draft, completed, reviewed, approved
    
    -- Foreign key constraints
    CONSTRAINT fk_garmushka_property_assessment 
        FOREIGN KEY (property_assessment_id) 
        REFERENCES property_assessments(id) 
        ON DELETE SET NULL,
        
    -- Constraints
    CONSTRAINT valid_garmushka_status CHECK (
        status IN ('draft', 'completed', 'reviewed', 'approved', 'archived')
    ),
    
    CONSTRAINT positive_areas CHECK (
        (built_area IS NULL OR built_area >= 0) AND
        (apartment_area IS NULL OR apartment_area >= 0) AND
        (balcony_area IS NULL OR balcony_area >= 0)
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_garmushka_property_assessment ON garmushka(property_assessment_id);
CREATE INDEX IF NOT EXISTS idx_garmushka_building_permit ON garmushka(building_permit_id);
CREATE INDEX IF NOT EXISTS idx_garmushka_issue_date ON garmushka(garmushka_issue_date);
CREATE INDEX IF NOT EXISTS idx_garmushka_status ON garmushka(status);
CREATE INDEX IF NOT EXISTS idx_garmushka_created_at ON garmushka(created_at);
CREATE INDEX IF NOT EXISTS idx_garmushka_confidence ON garmushka(overall_confidence);

-- Create view for easy querying
CREATE OR REPLACE VIEW garmushka_summary AS
SELECT 
    id,
    document_filename,
    garmushka_issue_date,
    built_area,
    apartment_area,
    balcony_area,
    CASE 
        WHEN built_area IS NOT NULL AND apartment_area IS NOT NULL 
        THEN ROUND((apartment_area / built_area * 100), 2)
        ELSE NULL
    END as apartment_to_built_ratio,
    property_assessment_id,
    building_permit_id,
    overall_confidence,
    status,
    created_at
FROM garmushka
ORDER BY created_at DESC;

-- Create view for completed garmushka records
CREATE OR REPLACE VIEW completed_garmushka AS
SELECT 
    id,
    document_filename,
    garmushka_issue_date,
    built_area,
    apartment_area,
    balcony_area,
    (built_area + COALESCE(balcony_area, 0)) as total_area,
    property_assessment_id,
    overall_confidence,
    created_at
FROM garmushka
WHERE status = 'completed'
ORDER BY garmushka_issue_date DESC;

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_garmushka_updated_at 
    BEFORE UPDATE ON garmushka 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE garmushka IS 'Storage for Garmushka documents with measurement data';
COMMENT ON COLUMN garmushka.garmushka_image_path IS 'גרמושקה - Path to the garmushka image/document';
COMMENT ON COLUMN garmushka.garmushka_issue_date IS 'מתי הופקה הגרמושקה - When the garmushka was issued';
COMMENT ON COLUMN garmushka.built_area IS 'שטח בנוי - Built area in square meters';
COMMENT ON COLUMN garmushka.property_areas_screenshot_path IS 'צילום מסך של השטחים המשוייכים לנכס - Screenshot of property areas';
COMMENT ON COLUMN garmushka.apartment_area IS 'שטח דירה - Apartment area in square meters';
COMMENT ON COLUMN garmushka.balcony_area IS 'שטח מרפסת - Balcony area in square meters';

-- Insert example record to verify schema
-- INSERT INTO garmushka (
--     document_filename, garmushka_issue_date, built_area, apartment_area, balcony_area,
--     property_assessment_id, processing_method, overall_confidence, created_by, status
-- ) VALUES (
--     'garmushka_demo.pdf', '2024-01-15', 120.50, 95.30, 15.20,
--     1, 'manual', 0.95, 'demo-user', 'completed'
-- );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON garmushka TO postgres;
GRANT USAGE, SELECT ON SEQUENCE garmushka_id_seq TO postgres;