-- Miscellaneous Table Schema
-- For storing miscellaneous property valuation data with Hebrew fields

CREATE TABLE IF NOT EXISTS miscellaneous (
    -- Primary key and metadata
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Hebrew valuation fields
    today_date DATE,                                        -- תאריך של היום - Today's date
    appraisal_id VARCHAR(100),                             -- ID שומה - Appraisal ID
    opinion_types TEXT,                                     -- סוגי חוות דעת - Types of opinions
    land_form TEXT,                                        -- צורת הקרקע - Shape/form of land
    land_surface TEXT,                                     -- פני הקרקע - Land surface conditions
    value_per_sqm DECIMAL(12,2),                          -- שווי למטר - Value per square meter
    ecological_area DECIMAL(10,2),                        -- שטח אקו - Ecological area
    property_value DECIMAL(15,2),                         -- שווי נכס - Property value
    property_value_in_words TEXT,                         -- שווי הנכס במילים - Property value in words
    environment_description_prompt TEXT,                   -- פרומפט תיאור סביבה - Environment description prompt
    plot_description_prompt TEXT,                         -- פרומפט תיאור חלקה - Plot description prompt
    internal_property_description TEXT,                   -- תיאור הנכס הפנימי - Internal property description
    
    -- Relations to other tables
    property_assessment_id INTEGER,                       -- Link to property assessment
    
    -- System metadata
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    status VARCHAR(50) DEFAULT 'draft',                   -- draft, completed, reviewed, approved
    notes TEXT,                                          -- Additional notes
    
    -- Constraints
    CONSTRAINT valid_miscellaneous_status CHECK (
        status IN ('draft', 'completed', 'reviewed', 'approved', 'archived')
    ),
    
    CONSTRAINT positive_values CHECK (
        (value_per_sqm IS NULL OR value_per_sqm >= 0) AND
        (ecological_area IS NULL OR ecological_area >= 0) AND
        (property_value IS NULL OR property_value >= 0)
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_miscellaneous_property_assessment ON miscellaneous(property_assessment_id);
CREATE INDEX IF NOT EXISTS idx_miscellaneous_appraisal_id ON miscellaneous(appraisal_id);
CREATE INDEX IF NOT EXISTS idx_miscellaneous_today_date ON miscellaneous(today_date);
CREATE INDEX IF NOT EXISTS idx_miscellaneous_status ON miscellaneous(status);
CREATE INDEX IF NOT EXISTS idx_miscellaneous_created_at ON miscellaneous(created_at);
CREATE INDEX IF NOT EXISTS idx_miscellaneous_property_value ON miscellaneous(property_value);

-- Create view for easy querying
CREATE OR REPLACE VIEW miscellaneous_summary AS
SELECT 
    id,
    today_date,
    appraisal_id,
    opinion_types,
    land_form,
    land_surface,
    value_per_sqm,
    ecological_area,
    property_value,
    CASE 
        WHEN ecological_area IS NOT NULL AND value_per_sqm IS NOT NULL 
        THEN ROUND((ecological_area * value_per_sqm), 2)
        ELSE NULL
    END as calculated_value,
    property_assessment_id,
    status,
    created_at
FROM miscellaneous
ORDER BY created_at DESC;

-- Create view for completed miscellaneous records
CREATE OR REPLACE VIEW completed_miscellaneous AS
SELECT 
    id,
    today_date,
    appraisal_id,
    opinion_types,
    property_value,
    property_value_in_words,
    CONCAT(
        COALESCE(environment_description_prompt, ''),
        ' | ',
        COALESCE(plot_description_prompt, ''),
        ' | ',
        COALESCE(internal_property_description, '')
    ) as full_description,
    property_assessment_id,
    created_at
FROM miscellaneous
WHERE status = 'completed'
ORDER BY today_date DESC;

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_miscellaneous_updated_at 
    BEFORE UPDATE ON miscellaneous 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add trigger to validate and process data
CREATE OR REPLACE FUNCTION validate_miscellaneous_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Set today_date to current date if not provided
    IF NEW.today_date IS NULL THEN
        NEW.today_date := CURRENT_DATE;
    END IF;
    
    -- Validate property value matches calculated value
    IF NEW.ecological_area IS NOT NULL AND NEW.value_per_sqm IS NOT NULL THEN
        IF NEW.property_value IS NULL THEN
            NEW.property_value := ROUND((NEW.ecological_area * NEW.value_per_sqm), 2);
        END IF;
    END IF;
    
    -- Basic validation for required fields
    IF NEW.status = 'completed' THEN
        IF NEW.appraisal_id IS NULL OR NEW.property_value IS NULL THEN
            RAISE EXCEPTION 'Appraisal ID and property value are required for completed status';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER validate_miscellaneous_data_trigger
    BEFORE INSERT OR UPDATE ON miscellaneous
    FOR EACH ROW
    EXECUTE FUNCTION validate_miscellaneous_data();

-- Comments for documentation
COMMENT ON TABLE miscellaneous IS 'Storage for miscellaneous property valuation data';
COMMENT ON COLUMN miscellaneous.today_date IS 'תאריך של היום - Today''s date';
COMMENT ON COLUMN miscellaneous.appraisal_id IS 'ID שומה - Appraisal ID';
COMMENT ON COLUMN miscellaneous.opinion_types IS 'סוגי חוות דעת - Types of opinions';
COMMENT ON COLUMN miscellaneous.land_form IS 'צורת הקרקע - Shape/form of land';
COMMENT ON COLUMN miscellaneous.land_surface IS 'פני הקרקע - Land surface conditions';
COMMENT ON COLUMN miscellaneous.value_per_sqm IS 'שווי למטר - Value per square meter';
COMMENT ON COLUMN miscellaneous.ecological_area IS 'שטח אקו - Ecological area';
COMMENT ON COLUMN miscellaneous.property_value IS 'שווי נכס - Property value';
COMMENT ON COLUMN miscellaneous.property_value_in_words IS 'שווי הנכס במילים - Property value in words';
COMMENT ON COLUMN miscellaneous.environment_description_prompt IS 'פרומפט תיאור סביבה - Environment description prompt';
COMMENT ON COLUMN miscellaneous.plot_description_prompt IS 'פרומפט תיאור חלקה - Plot description prompt';
COMMENT ON COLUMN miscellaneous.internal_property_description IS 'תיאור הנכס הפנימי - Internal property description';

-- Insert example record to verify schema
-- INSERT INTO miscellaneous (
--     appraisal_id, opinion_types, land_form, land_surface, value_per_sqm,
--     ecological_area, property_value, property_value_in_words,
--     environment_description_prompt, plot_description_prompt,
--     internal_property_description, property_assessment_id, created_by, status
-- ) VALUES (
--     'AP-2024-001', 'שומה מלאה, הערכת שווי', 'מלבנית', 'שטוח', 50000.00,
--     120.50, 6025000.00, 'שישה מיליון עשרים וחמישה אלף שקלים',
--     'אזור מגורים שקט ויוקרתי', 'חלקה פינתית עם נגישות מעולה',
--     'דירה בת 4 חדרים מחולקת היטב', 1, 'demo-user', 'completed'
-- );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON miscellaneous TO postgres;
GRANT USAGE, SELECT ON SEQUENCE miscellaneous_id_seq TO postgres;