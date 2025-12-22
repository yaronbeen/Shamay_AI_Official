-- Comparable Data Table Schema
-- For storing CSV imported data with property sale information

CREATE TABLE IF NOT EXISTS comparable_data (
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

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_comparable_data_city_rooms ON comparable_data(city, rooms);
CREATE INDEX IF NOT EXISTS idx_comparable_data_area_price ON comparable_data(apartment_area_sqm, price_per_sqm_rounded);

-- Create view for active comparable data with calculated fields
CREATE OR REPLACE VIEW active_comparable_data AS
SELECT 
    id,
    sale_date,
    address,
    CONCAT(city, ' - ', street_name, ' ', house_number) as full_address,
    gush_chelka_sub,
    gush,
    chelka,
    sub_chelka,
    rooms,
    floor_number,
    apartment_area_sqm,
    parking_spaces,
    construction_year,
    declared_price,
    price_per_sqm_rounded,
    calculated_price_per_sqm,
    CASE 
        WHEN apartment_area_sqm > 0 AND declared_price > 0 
        THEN ROUND(declared_price / apartment_area_sqm, 2)
        ELSE NULL
    END as verified_price_per_sqm,
    data_quality_score,
    created_at
FROM comparable_data
WHERE status = 'active' AND is_valid = TRUE
ORDER BY sale_date DESC;

-- Create view for statistics and analysis
CREATE OR REPLACE VIEW comparable_data_stats AS
SELECT 
    city,
    FLOOR(rooms) as room_category,
    COUNT(*) as total_sales,
    AVG(apartment_area_sqm) as avg_area,
    AVG(declared_price) as avg_price,
    AVG(price_per_sqm_rounded) as avg_price_per_sqm,
    MIN(sale_date) as earliest_sale,
    MAX(sale_date) as latest_sale,
    AVG(construction_year) as avg_construction_year
FROM comparable_data
WHERE status = 'active' AND is_valid = TRUE 
      AND apartment_area_sqm IS NOT NULL 
      AND declared_price IS NOT NULL
GROUP BY city, FLOOR(rooms)
ORDER BY city, room_category;

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_comparable_data_updated_at 
    BEFORE UPDATE ON comparable_data 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add trigger to calculate price per sqm and validate data
CREATE OR REPLACE FUNCTION validate_comparable_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate price per sqm for verification
    IF NEW.apartment_area_sqm > 0 AND NEW.declared_price > 0 THEN
        NEW.calculated_price_per_sqm := ROUND(NEW.declared_price / NEW.apartment_area_sqm, 2);
        
        -- Calculate difference between declared and calculated price per sqm
        IF NEW.price_per_sqm_rounded IS NOT NULL THEN
            NEW.price_difference := ABS(NEW.calculated_price_per_sqm - NEW.price_per_sqm_rounded);
        END IF;
    END IF;
    
    -- Basic data quality scoring
    NEW.data_quality_score := 0;
    
    -- Add points for complete data
    IF NEW.sale_date IS NOT NULL THEN NEW.data_quality_score := NEW.data_quality_score + 15; END IF;
    IF NEW.address IS NOT NULL AND LENGTH(NEW.address) > 5 THEN NEW.data_quality_score := NEW.data_quality_score + 15; END IF;
    IF NEW.rooms IS NOT NULL THEN NEW.data_quality_score := NEW.data_quality_score + 10; END IF;
    IF NEW.apartment_area_sqm IS NOT NULL THEN NEW.data_quality_score := NEW.data_quality_score + 15; END IF;
    IF NEW.declared_price IS NOT NULL THEN NEW.data_quality_score := NEW.data_quality_score + 15; END IF;
    IF NEW.construction_year IS NOT NULL THEN NEW.data_quality_score := NEW.data_quality_score + 10; END IF;
    IF NEW.gush_chelka_sub IS NOT NULL THEN NEW.data_quality_score := NEW.data_quality_score + 10; END IF;
    IF NEW.price_per_sqm_rounded IS NOT NULL THEN NEW.data_quality_score := NEW.data_quality_score + 10; END IF;
    
    -- Validate reasonableness
    NEW.is_valid := TRUE;
    NEW.validation_notes := '';
    
    IF NEW.apartment_area_sqm IS NOT NULL AND (NEW.apartment_area_sqm < 20 OR NEW.apartment_area_sqm > 500) THEN
        NEW.is_valid := FALSE;
        NEW.validation_notes := NEW.validation_notes || 'Unusual apartment area; ';
    END IF;
    
    IF NEW.declared_price IS NOT NULL AND (NEW.declared_price < 100000 OR NEW.declared_price > 50000000) THEN
        NEW.is_valid := FALSE;
        NEW.validation_notes := NEW.validation_notes || 'Unusual price range; ';
    END IF;
    
    IF NEW.rooms IS NOT NULL AND (NEW.rooms < 1 OR NEW.rooms > 10) THEN
        NEW.is_valid := FALSE;
        NEW.validation_notes := NEW.validation_notes || 'Unusual room count; ';
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER validate_comparable_data_trigger
    BEFORE INSERT OR UPDATE ON comparable_data
    FOR EACH ROW
    EXECUTE FUNCTION validate_comparable_data();

-- Comments for documentation
COMMENT ON TABLE comparable_data IS 'Storage for CSV imported comparable property sales data';
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

-- Insert example record to verify schema
-- INSERT INTO comparable_data (
--     csv_filename, sale_date, address, gush_chelka_sub, rooms, floor_number,
--     apartment_area_sqm, parking_spaces, construction_year, declared_price,
--     price_per_sqm_rounded, imported_by
-- ) VALUES (
--     'sales_data_2024.csv', '2024-01-15', 'רחוב הרצל 123, תל אביב', '9905/88/8',
--     3.5, '2', 85.5, 1, 2010, 2850000, 33300, 'demo-user'
-- );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON comparable_data TO postgres;
GRANT USAGE, SELECT ON SEQUENCE comparable_data_id_seq TO postgres;