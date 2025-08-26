-- Property Assessment User Input Table Schema
-- For storing user-provided property assessment data (שומות שווי)

CREATE TABLE IF NOT EXISTS property_assessments (
    -- Primary key and metadata
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Basic property information (USER INPUT)
    assessment_type VARCHAR(100),                 -- סוג שומה
    street_name VARCHAR(200),                     -- רחוב
    house_number VARCHAR(20),                     -- מספר
    neighborhood VARCHAR(100),                    -- שכונה
    city VARCHAR(100),                            -- עיר
    
    -- Client and visit information (USER INPUT)
    client_name VARCHAR(200),                     -- שם הלקוח
    visit_date DATE,                              -- תאריך ביקור
    visitor_name VARCHAR(200),                    -- המבקר
    presenter_name VARCHAR(200),                  -- המציג
    
    -- Property details (USER INPUT)
    rooms INTEGER,                                -- חדרים
    floor_number VARCHAR(50),                     -- קומה
    free_text_additions TEXT,                     -- טקסט חופשי להשלמות
    
    -- Directional information (USER INPUT)
    air_directions TEXT,                          -- כיווני אוויר
    north_description TEXT,                       -- תיאור חופשי - צפון
    south_description TEXT,                       -- תיאור חופשי - דרום
    east_description TEXT,                        -- תיאור חופשי - מזרח
    west_description TEXT,                        -- תיאור חופשי - מערב
    
    -- Planning and assessment data (USER INPUT)
    relevant_plans_table TEXT,                    -- טבלת ריכוז תוכניות רלוונטיות
    user_sections_count INTEGER,                  -- מספר סעיפים למילוי על ידי היוזר
    eco_coefficient DECIMAL(10,4),                -- מקדם אקו
    
    -- System metadata
    created_by VARCHAR(100),                      -- User who created the record
    updated_by VARCHAR(100),                      -- User who last updated
    notes TEXT,                                   -- Internal notes
    status VARCHAR(50) DEFAULT 'draft'            -- draft, completed, reviewed, approved
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_property_assessments_client ON property_assessments(client_name);
CREATE INDEX IF NOT EXISTS idx_property_assessments_address ON property_assessments(street_name, house_number, city);
CREATE INDEX IF NOT EXISTS idx_property_assessments_visit_date ON property_assessments(visit_date);
CREATE INDEX IF NOT EXISTS idx_property_assessments_status ON property_assessments(status);
CREATE INDEX IF NOT EXISTS idx_property_assessments_created_at ON property_assessments(created_at);

-- Create view for easy summary queries
CREATE OR REPLACE VIEW property_assessments_summary AS
SELECT 
    id,
    assessment_type,
    CONCAT(street_name, ' ', house_number, ', ', city) as full_address,
    client_name,
    visit_date,
    visitor_name,
    rooms,
    floor_number,
    status,
    created_at,
    updated_at
FROM property_assessments
ORDER BY created_at DESC;

-- Create view for completed assessments
CREATE OR REPLACE VIEW completed_property_assessments AS
SELECT 
    id,
    assessment_type,
    client_name,
    CONCAT(street_name, ' ', house_number, ', ', neighborhood, ', ', city) as property_address,
    visit_date,
    visitor_name,
    presenter_name,
    rooms,
    floor_number,
    eco_coefficient,
    created_at
FROM property_assessments
WHERE status = 'completed'
ORDER BY visit_date DESC;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_property_assessments_updated_at 
    BEFORE UPDATE ON property_assessments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE property_assessments IS 'Storage for user-provided property assessment data (שומות שווי)';
COMMENT ON COLUMN property_assessments.assessment_type IS 'סוג שומה - Type of property assessment';
COMMENT ON COLUMN property_assessments.street_name IS 'רחוב - Street name';
COMMENT ON COLUMN property_assessments.house_number IS 'מספר - House number';
COMMENT ON COLUMN property_assessments.neighborhood IS 'שכונה - Neighborhood';
COMMENT ON COLUMN property_assessments.city IS 'עיר - City';
COMMENT ON COLUMN property_assessments.client_name IS 'שם הלקוח - Client name';
COMMENT ON COLUMN property_assessments.visit_date IS 'תאריך ביקור - Visit date';
COMMENT ON COLUMN property_assessments.visitor_name IS 'המבקר - Visitor name';
COMMENT ON COLUMN property_assessments.presenter_name IS 'המציג - Presenter name';
COMMENT ON COLUMN property_assessments.rooms IS 'חדרים - Number of rooms';
COMMENT ON COLUMN property_assessments.floor_number IS 'קומה - Floor number';
COMMENT ON COLUMN property_assessments.free_text_additions IS 'טקסט חופשי להשלמות - Free text additions';
COMMENT ON COLUMN property_assessments.air_directions IS 'כיווני אוויר - Air directions';
COMMENT ON COLUMN property_assessments.north_description IS 'תיאור חופשי - צפון - Free description - North';
COMMENT ON COLUMN property_assessments.south_description IS 'תיאור חופשי - דרום - Free description - South';
COMMENT ON COLUMN property_assessments.east_description IS 'תיאור חופשי - מזרח - Free description - East';
COMMENT ON COLUMN property_assessments.west_description IS 'תיאור חופשי - מערב - Free description - West';
COMMENT ON COLUMN property_assessments.relevant_plans_table IS 'טבלת ריכוז תוכניות רלוונטיות - Relevant plans summary table';
COMMENT ON COLUMN property_assessments.user_sections_count IS 'מספר סעיפים למילוי על ידי היוזר - Number of sections for user completion';
COMMENT ON COLUMN property_assessments.eco_coefficient IS 'מקדם אקו - Eco coefficient';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON property_assessments TO postgres;
GRANT USAGE, SELECT ON SEQUENCE property_assessments_id_seq TO postgres;

-- Insert a test record to verify schema
-- INSERT INTO property_assessments (
--     assessment_type, street_name, house_number, city, client_name, 
--     visit_date, visitor_name, rooms, status, created_by
-- ) VALUES (
--     'שומת שווי מלאה', 'רחוב הרצל', '123', 'תל אביב', 'יוסי כהן',
--     CURRENT_DATE, 'שמואל לוי', 4, 'draft', 'system'
-- );