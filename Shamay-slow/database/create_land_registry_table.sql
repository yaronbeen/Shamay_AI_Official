-- PostgreSQL database schema for land registry extracted data
-- Based on the field extractors in src/lib/field-extractors.js

CREATE DATABASE shamay_land_registry;

\c shamay_land_registry;

-- Main table for land registry document extractions
CREATE TABLE land_registry_extracts (
    id SERIAL PRIMARY KEY,
    
    -- Document metadata
    document_filename VARCHAR(255),
    processing_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processing_time_ms INTEGER,
    overall_confidence DECIMAL(5,2), -- Overall confidence score (0-100)
    
    -- Core land registry fields
    gush INTEGER, -- Block number (גוש)
    gush_confidence DECIMAL(5,2),
    gush_context TEXT,
    gush_pattern TEXT,
    gush_alternatives TEXT[], -- Array of alternative values found
    
    chelka INTEGER, -- Plot number (חלקה)
    chelka_confidence DECIMAL(5,2),
    chelka_context TEXT,
    chelka_pattern TEXT,
    chelka_alternatives TEXT[],
    
    sub_chelka INTEGER, -- Sub-plot number (תת חלקה)
    sub_chelka_confidence DECIMAL(5,2),
    sub_chelka_context TEXT,
    sub_chelka_pattern TEXT,
    sub_chelka_alternatives TEXT[],
    
    -- Area information
    apartment_area DECIMAL(10,2), -- Apartment area in square meters
    apartment_area_confidence DECIMAL(5,2),
    apartment_area_context TEXT,
    apartment_area_pattern TEXT,
    apartment_area_alternatives DECIMAL(10,2)[],
    
    -- Attachments (stored as JSONB for flexibility)
    attachments JSONB, -- Array of {type, area, context} objects
    attachments_confidence DECIMAL(5,2),
    
    -- Full extracted text for reference
    raw_text TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX idx_land_registry_gush ON land_registry_extracts(gush);
CREATE INDEX idx_land_registry_chelka ON land_registry_extracts(chelka);
CREATE INDEX idx_land_registry_gush_chelka ON land_registry_extracts(gush, chelka);
CREATE INDEX idx_land_registry_processing_timestamp ON land_registry_extracts(processing_timestamp);
CREATE INDEX idx_land_registry_overall_confidence ON land_registry_extracts(overall_confidence);
CREATE INDEX idx_land_registry_filename ON land_registry_extracts(document_filename);

-- GIN index for JSONB attachments field
CREATE INDEX idx_land_registry_attachments ON land_registry_extracts USING GIN (attachments);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_land_registry_extracts_updated_at 
    BEFORE UPDATE ON land_registry_extracts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Sample view for high-confidence extractions
CREATE VIEW high_confidence_extracts AS
SELECT 
    id,
    document_filename,
    gush,
    chelka,
    sub_chelka,
    apartment_area,
    attachments,
    overall_confidence,
    processing_timestamp
FROM land_registry_extracts
WHERE overall_confidence >= 80;

-- Sample view for problematic extractions that need review
CREATE VIEW low_confidence_extracts AS
SELECT 
    id,
    document_filename,
    overall_confidence,
    CASE 
        WHEN gush_confidence < 70 THEN 'gush'
        WHEN chelka_confidence < 70 THEN 'chelka' 
        WHEN apartment_area_confidence < 70 THEN 'apartment_area'
        ELSE 'other'
    END as problematic_field,
    processing_timestamp
FROM land_registry_extracts
WHERE overall_confidence < 70;

-- Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE ON land_registry_extracts TO app_user;
-- GRANT USAGE ON SEQUENCE land_registry_extracts_id_seq TO app_user;