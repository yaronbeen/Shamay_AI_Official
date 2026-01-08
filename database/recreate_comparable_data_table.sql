-- Recreate Comparable Data Table
-- Includes organization_id and user_id columns for data isolation

-- Drop existing table if it exists
DROP TABLE IF EXISTS comparable_data CASCADE;

-- Create the table with all columns
CREATE TABLE comparable_data (
    -- Primary key and metadata
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- CSV file information
    csv_filename VARCHAR(255),                          -- Source CSV file name
    csv_import_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    row_number INTEGER,                                 -- Row number in original CSV
    
    -- Data fields from CSV headers (יום מכירה, כתובת, גו"ח, etc.)
    sale_date DATE,                                     -- יום מכירה - Sale date
    address TEXT,                                       -- כתובת - Address
    gush_chelka_sub VARCHAR(50),                       -- גו"ח - Gush/Chelka/Sub reference
    rooms DECIMAL(3,1),                                -- חדרים - Number of rooms
    floor_number VARCHAR(20),                          -- קומה - Floor number
    apartment_area_sqm DECIMAL(10,2),                 -- שטח דירה במ"ר - Apartment area in sqm
    parking_spaces INTEGER,                            -- חניות - Parking spaces
    construction_year INTEGER,                         -- שנת בניה - Construction year
    declared_price DECIMAL(12,2),                     -- מחיר מוצהר - Declared price
    price_per_sqm_rounded DECIMAL(10,2),              -- מחיר למ"ר, במעוגל - Price per sqm, rounded
    
    -- Parsed/processed fields for better querying
    gush INTEGER,                                      -- Parsed gush from גו"ח
    chelka INTEGER,                                    -- Parsed chelka from גו"ח
    sub_chelka INTEGER,                                -- Parsed sub_chelka from גו"ח
    
    -- Address parsing
    city VARCHAR(100),                                 -- Parsed city
    street_name VARCHAR(200),                          -- Parsed street name
    house_number VARCHAR(20),                          -- Parsed house number
    
    -- Calculated fields
    calculated_price_per_sqm DECIMAL(10,2),           -- Calculated price per sqm (for verification)
    price_difference DECIMAL(10,2),                    -- Difference between declared and calculated price per sqm
    
    -- Data quality fields
    data_quality_score INTEGER DEFAULT 0,              -- Quality score (0-100)
    validation_notes TEXT,                             -- Data validation notes
    is_valid BOOLEAN DEFAULT TRUE,                     -- Whether record passed validation
    
    -- Relations
    property_assessment_id INTEGER,                    -- Link to property assessment (optional)
    
    -- System metadata
    imported_by VARCHAR(100),                          -- User who imported the data
    status VARCHAR(50) DEFAULT 'active',               -- active, archived, deleted, invalid
    notes TEXT,                                        -- Additional notes
    
    -- CRITICAL: Organization and User separation for data isolation
    organization_id TEXT,                              -- Organization/Company ID that owns this data
    user_id TEXT,                                      -- User ID who imported/created this record
    
    -- Constraints
    CONSTRAINT valid_comparable_data_status CHECK (
        status IN ('active', 'archived', 'deleted', 'invalid')
    ),
    
    CONSTRAINT positive_values CHECK (
        (declared_price IS NULL OR declared_price >= 0) AND
        (apartment_area_sqm IS NULL OR apartment_area_sqm > 0) AND
        (price_per_sqm_rounded IS NULL OR price_per_sqm_rounded >= 0) AND
        (rooms IS NULL OR rooms >= 0) AND
        (parking_spaces IS NULL OR parking_spaces >= 0) AND
        (construction_year IS NULL OR construction_year BETWEEN 1800 AND 2030)
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_comparable_data_sale_date ON comparable_data(sale_date);
CREATE INDEX IF NOT EXISTS idx_comparable_data_gush_chelka ON comparable_data(gush, chelka);
CREATE INDEX IF NOT EXISTS idx_comparable_data_city ON comparable_data(city);
CREATE INDEX IF NOT EXISTS idx_comparable_data_rooms ON comparable_data(rooms);
CREATE INDEX IF NOT EXISTS idx_comparable_data_price_per_sqm ON comparable_data(price_per_sqm_rounded);
CREATE INDEX IF NOT EXISTS idx_comparable_data_construction_year ON comparable_data(construction_year);
CREATE INDEX IF NOT EXISTS idx_comparable_data_area ON comparable_data(apartment_area_sqm);
CREATE INDEX IF NOT EXISTS idx_comparable_data_status ON comparable_data(status);
CREATE INDEX IF NOT EXISTS idx_comparable_data_quality ON comparable_data(data_quality_score);

-- CRITICAL: Indexes for organization and user isolation
CREATE INDEX IF NOT EXISTS idx_comparable_data_organization_id ON comparable_data(organization_id);
CREATE INDEX IF NOT EXISTS idx_comparable_data_user_id ON comparable_data(user_id);
CREATE INDEX IF NOT EXISTS idx_comparable_data_org_user ON comparable_data(organization_id, user_id);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_comparable_data_city_rooms ON comparable_data(city, rooms);
CREATE INDEX IF NOT EXISTS idx_comparable_data_area_price ON comparable_data(apartment_area_sqm, price_per_sqm_rounded);

-- Add comments
COMMENT ON TABLE comparable_data IS 'Storage for CSV imported comparable property sales data with organization/user isolation';
COMMENT ON COLUMN comparable_data.organization_id IS 'Organization/Company ID that owns this data';
COMMENT ON COLUMN comparable_data.user_id IS 'User ID who imported/created this record';
COMMENT ON COLUMN comparable_data.sale_date IS 'יום מכירה - Date of property sale';
COMMENT ON COLUMN comparable_data.address IS 'כתובת - Property address';
COMMENT ON COLUMN comparable_data.gush_chelka_sub IS 'גו"ח - Gush/Chelka/Sub reference';
COMMENT ON COLUMN comparable_data.rooms IS 'חדרים - Number of rooms';
COMMENT ON COLUMN comparable_data.floor_number IS 'קומה - Floor number';
COMMENT ON COLUMN comparable_data.apartment_area_sqm IS 'שטח דירה במ"ר - Apartment area in square meters';
COMMENT ON COLUMN comparable_data.parking_spaces IS 'חניות - Number of parking spaces';
COMMENT ON COLUMN comparable_data.construction_year IS 'שנת בניה - Year of construction';
COMMENT ON COLUMN comparable_data.declared_price IS 'מחיר מוצהר - Declared sale price';
COMMENT ON COLUMN comparable_data.price_per_sqm_rounded IS 'מחיר למ"ר, במעוגל - Price per square meter, rounded';

-- Grant permissions (only if postgres role exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON comparable_data TO postgres;
        GRANT USAGE, SELECT ON SEQUENCE comparable_data_id_seq TO postgres;
    END IF;
END $$;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ comparable_data table recreated successfully with organization_id and user_id columns!';
END $$;

