-- Comprehensive Land Registry Schema
-- Drop existing table and create new comprehensive structure

DROP TABLE IF EXISTS land_registry_extracts_comprehensive;

CREATE TABLE land_registry_extracts_comprehensive (
    -- Primary Key
    id SERIAL PRIMARY KEY,
    
    -- Document Information
    registration_office VARCHAR(255), -- לשכת רישום מקרקעין
    issue_date DATE, -- תאריך הפקה
    tabu_extract_date DATE, -- מתי הופק נסח טאבו
    document_filename VARCHAR(255),
    
    -- Core Property Identifiers
    gush INTEGER, -- גוש
    chelka INTEGER, -- חלקה
    sub_chelka INTEGER, -- תת חלקה
    
    -- Property Details
    total_plot_area DECIMAL(12,2), -- שטח קרקע של כל החלקה
    regulation_type VARCHAR(50), -- תקנון (מוסכם/לא מוסכם/מצוי)
    sub_plots_count INTEGER, -- תתי חלקות (כמה יש)
    buildings_count INTEGER, -- כמה מבנים
    address_from_tabu TEXT, -- כתובת (מהנסח טאבו AS IS)
    
    -- Unit/Apartment Information
    unit_description TEXT, -- תיאור הדירה
    floor VARCHAR(50), -- קומה
    registered_area DECIMAL(10,2), -- שטח רשום
    apartment_registered_area DECIMAL(10,2), -- שטח דירה רשום
    balcony_area DECIMAL(10,2), -- שטח מרפסת
    shared_property VARCHAR(100), -- רכוש משותף
    building_number VARCHAR(20), -- מבנה (מספר מבנה)
    additional_areas JSONB, -- שטחים נוספים (array of objects)
    
    -- Attachments (הצמדות)
    attachments JSONB, -- Complete attachments data
    attachments_symbol VARCHAR(20), -- הצמדות - סימן בתשריט
    attachments_color VARCHAR(50), -- הצמדות - צבע בתשריט
    attachments_description TEXT, -- הצמדות - תיאור הצמדה
    attachments_area DECIMAL(10,2), -- הצמדות - שטח במטר
    
    -- Ownership (בעלויות)
    owners JSONB, -- Complete owners data (array)
    owners_count INTEGER DEFAULT 0, -- Number of owners
    ownership_type VARCHAR(100), -- סוג הבעלות
    rights TEXT, -- זכויות
    
    -- Notes and Comments (הערות)
    plot_notes TEXT, -- הערות לכל החלקה
    notes_action_type VARCHAR(200), -- הערות - מהות פעולה
    notes_beneficiary VARCHAR(200), -- הערות - שם המוטב
    
    -- Easements (זיקות הנאה)
    easements_essence TEXT, -- זיקות הנאה - מהות
    easements_description TEXT, -- זיקות הנאה - תיאור
    
    -- Mortgages (משכנתאות)
    mortgages JSONB, -- Complete mortgages data (array)
    mortgage_essence VARCHAR(100), -- משכנתאות - מהות (primary mortgage)
    mortgage_rank VARCHAR(50), -- משכנתאות - דרגה (primary mortgage)
    mortgage_lenders TEXT, -- משכנתאות - בעלי המשכנתא (primary mortgage)
    mortgage_borrowers TEXT, -- משכנתאות - שם הלווים (primary mortgage)
    mortgage_amount DECIMAL(12,2), -- משכנתאות - סכום (primary mortgage)
    mortgage_property_share VARCHAR(100), -- משכנתאות - חלק בנכס (primary mortgage)
    
    -- Confidence Scores
    confidence_document_info DECIMAL(5,4) DEFAULT 0,
    confidence_property_info DECIMAL(5,4) DEFAULT 0,
    confidence_unit_info DECIMAL(5,4) DEFAULT 0,
    confidence_ownership DECIMAL(5,4) DEFAULT 0,
    confidence_attachments DECIMAL(5,4) DEFAULT 0,
    confidence_notes DECIMAL(5,4) DEFAULT 0,
    confidence_easements DECIMAL(5,4) DEFAULT 0,
    confidence_mortgages DECIMAL(5,4) DEFAULT 0,
    confidence_overall DECIMAL(5,4) DEFAULT 0,
    
    -- Processing Metadata
    extraction_method VARCHAR(50),
    model_used VARCHAR(100),
    text_length INTEGER,
    raw_text TEXT,
    raw_response TEXT,
    
    -- Timestamps
    extracted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_comprehensive_gush ON land_registry_extracts_comprehensive(gush);
CREATE INDEX idx_comprehensive_chelka ON land_registry_extracts_comprehensive(chelka);
CREATE INDEX idx_comprehensive_gush_chelka ON land_registry_extracts_comprehensive(gush, chelka);
CREATE INDEX idx_comprehensive_sub_chelka ON land_registry_extracts_comprehensive(sub_chelka);
CREATE INDEX idx_comprehensive_registration_office ON land_registry_extracts_comprehensive(registration_office);
CREATE INDEX idx_comprehensive_issue_date ON land_registry_extracts_comprehensive(issue_date);
CREATE INDEX idx_comprehensive_owners_count ON land_registry_extracts_comprehensive(owners_count);
CREATE INDEX idx_comprehensive_confidence_overall ON land_registry_extracts_comprehensive(confidence_overall);
CREATE INDEX idx_comprehensive_created_at ON land_registry_extracts_comprehensive(created_at);

-- JSONB indexes for complex data
CREATE INDEX idx_comprehensive_owners_gin ON land_registry_extracts_comprehensive USING gin (owners);
CREATE INDEX idx_comprehensive_attachments_gin ON land_registry_extracts_comprehensive USING gin (attachments);
CREATE INDEX idx_comprehensive_mortgages_gin ON land_registry_extracts_comprehensive USING gin (mortgages);
CREATE INDEX idx_comprehensive_additional_areas_gin ON land_registry_extracts_comprehensive USING gin (additional_areas);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP; 
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_comprehensive_updated_at 
    BEFORE UPDATE ON land_registry_extracts_comprehensive 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE land_registry_extracts_comprehensive IS 'Comprehensive Hebrew land registry document extractions with all fields';
COMMENT ON COLUMN land_registry_extracts_comprehensive.registration_office IS 'לשכת רישום מקרקעין - Land Registry Office';
COMMENT ON COLUMN land_registry_extracts_comprehensive.issue_date IS 'תאריך הפקה - Issue Date';
COMMENT ON COLUMN land_registry_extracts_comprehensive.tabu_extract_date IS 'מתי הופק נסח טאבו - Tabu Extract Date';
COMMENT ON COLUMN land_registry_extracts_comprehensive.gush IS 'גוש - Block Number';
COMMENT ON COLUMN land_registry_extracts_comprehensive.chelka IS 'חלקה - Plot Number';
COMMENT ON COLUMN land_registry_extracts_comprehensive.sub_chelka IS 'תת חלקה - Sub-plot Number';
COMMENT ON COLUMN land_registry_extracts_comprehensive.total_plot_area IS 'שטח קרקע של כל החלקה - Total Plot Area';
COMMENT ON COLUMN land_registry_extracts_comprehensive.regulation_type IS 'תקנון - Regulation Type (מוסכם/לא מוסכם/מצוי)';
COMMENT ON COLUMN land_registry_extracts_comprehensive.owners IS 'בעלויות - Complete ownership data';
COMMENT ON COLUMN land_registry_extracts_comprehensive.mortgages IS 'משכנתאות - Complete mortgage data';

-- Create views for easier querying
CREATE VIEW property_summary AS
SELECT 
    id,
    registration_office,
    gush,
    chelka,
    sub_chelka,
    address_from_tabu,
    unit_description,
    apartment_registered_area,
    owners_count,
    confidence_overall,
    created_at
FROM land_registry_extracts_comprehensive
ORDER BY created_at DESC;

CREATE VIEW mortgage_summary AS
SELECT 
    id,
    gush,
    chelka,
    sub_chelka,
    mortgage_essence,
    mortgage_amount,
    mortgage_lenders,
    mortgage_borrowers,
    created_at
FROM land_registry_extracts_comprehensive
WHERE mortgages IS NOT NULL
ORDER BY created_at DESC;