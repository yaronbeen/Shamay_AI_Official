-- Complete Database Setup for SHAMAY.AI
-- This script creates all necessary tables and inserts sample data

-- Drop existing tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS property_assessments CASCADE;
DROP TABLE IF EXISTS comparable_data CASCADE;
DROP TABLE IF EXISTS land_registry_extracts_comprehensive CASCADE;
DROP TABLE IF EXISTS building_permits CASCADE;
DROP TABLE IF EXISTS shared_building_orders CASCADE;
DROP TABLE IF EXISTS property_images CASCADE;
DROP TABLE IF EXISTS garmushka CASCADE;
DROP TABLE IF EXISTS miscellaneous CASCADE;
DROP TABLE IF EXISTS environment_analyses CASCADE;

-- Create comparable_data table (most important for Step 4)
CREATE TABLE IF NOT EXISTS comparable_data (
    -- Primary key and metadata
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- CSV file information
    csv_filename VARCHAR(255),
    csv_import_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    row_number INTEGER,
    
    -- Data fields from CSV headers
    sale_date DATE,
    address TEXT,
    gush_chelka_sub VARCHAR(50),
    rooms DECIMAL(3,1),
    floor_number VARCHAR(20),
    apartment_area_sqm DECIMAL(10,2),
    parking_spaces INTEGER,
    construction_year INTEGER,
    declared_price DECIMAL(12,2),
    price_per_sqm_rounded DECIMAL(10,2),
    
    -- Parsed/processed fields for better querying
    gush INTEGER,
    chelka INTEGER,
    sub_chelka INTEGER,
    
    -- Address parsing
    city VARCHAR(100),
    street_name VARCHAR(200),
    house_number VARCHAR(20),
    
    -- Calculated fields
    calculated_price_per_sqm DECIMAL(10,2),
    price_difference DECIMAL(10,2),
    
    -- Data quality fields
    data_quality_score INTEGER DEFAULT 0,
    validation_notes TEXT,
    is_valid BOOLEAN DEFAULT TRUE,
    
    -- Relations
    property_assessment_id INTEGER,
    
    -- System metadata
    imported_by VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    notes TEXT,
    
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

-- Create property_assessments table
CREATE TABLE IF NOT EXISTS property_assessments (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Basic property information
    address TEXT NOT NULL,
    client_name VARCHAR(255),
    valuation_date DATE,
    shamay_name VARCHAR(255),
    shamay_serial_number VARCHAR(100),
    
    -- Property characteristics
    rooms INTEGER,
    floor INTEGER,
    area DECIMAL(10,2),
    balcony DECIMAL(10,2),
    parking BOOLEAN DEFAULT FALSE,
    elevator BOOLEAN DEFAULT FALSE,
    
    -- Valuation results
    final_valuation DECIMAL(12,2),
    price_per_sqm DECIMAL(10,2),
    
    -- Analysis data from Step 3
    property_analysis JSONB,
    market_analysis JSONB,
    risk_assessment JSONB,
    recommendations TEXT[],
    
    -- Images and documents
    selected_image_preview TEXT, -- Base64 image data
    selected_image_name VARCHAR(255),
    selected_image_index INTEGER,
    total_images INTEGER,
    signature_preview TEXT, -- Base64 signature data
    
    -- Status
    status VARCHAR(50) DEFAULT 'draft',
    notes TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_comparable_data_sale_date ON comparable_data(sale_date);
CREATE INDEX IF NOT EXISTS idx_comparable_data_city ON comparable_data(city);
CREATE INDEX IF NOT EXISTS idx_comparable_data_rooms ON comparable_data(rooms);
CREATE INDEX IF NOT EXISTS idx_comparable_data_price_per_sqm ON comparable_data(price_per_sqm_rounded);
CREATE INDEX IF NOT EXISTS idx_comparable_data_area ON comparable_data(apartment_area_sqm);
CREATE INDEX IF NOT EXISTS idx_comparable_data_status ON comparable_data(status);
CREATE INDEX IF NOT EXISTS idx_comparable_data_quality ON comparable_data(data_quality_score);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_comparable_data_city_rooms ON comparable_data(city, rooms);
CREATE INDEX IF NOT EXISTS idx_comparable_data_area_price ON comparable_data(apartment_area_sqm, price_per_sqm_rounded);

-- Insert comprehensive sample data for comparable_data
INSERT INTO comparable_data (
    address, rooms, floor_number, apartment_area_sqm, parking_spaces,
    construction_year, declared_price, price_per_sqm_rounded, sale_date,
    city, street_name, house_number, gush_chelka_sub, gush, chelka, sub_chelka,
    imported_by, status, is_valid, data_quality_score
) VALUES 
-- Tel Aviv properties
('רחוב הרצל 125, תל אביב', 3.5, '2', 85.5, 1, 2010, 2850000, 33333, '2024-01-15', 'תל אביב', 'רחוב הרצל', '125', '9905/88/10', 9905, 88, 10, 'system', 'active', true, 85),
('רחוב בן יהודה 50, תל אביב', 4, '3', 92.0, 1, 2015, 3200000, 34782, '2024-01-10', 'תל אביב', 'רחוב בן יהודה', '50', '9905/89/5', 9905, 89, 5, 'system', 'active', true, 90),
('רחוב דיזנגוף 100, תל אביב', 3, '1', 75.0, 0, 2008, 2400000, 32000, '2024-01-05', 'תל אביב', 'רחוב דיזנגוף', '100', '9905/90/3', 9905, 90, 3, 'system', 'active', true, 80),
('רחוב אלנבי 200, תל אביב', 3.5, '4', 88.0, 1, 2012, 2950000, 33523, '2023-12-20', 'תל אביב', 'רחוב אלנבי', '200', '9905/91/7', 9905, 91, 7, 'system', 'active', true, 88),
('רחוב רוטשילד 15, תל אביב', 4, '5', 95.0, 2, 2018, 3800000, 40000, '2023-12-15', 'תל אביב', 'רחוב רוטשילד', '15', '9905/92/12', 9905, 92, 12, 'system', 'active', true, 92),

-- Jerusalem properties
('רחוב יפו 300, ירושלים', 3, '2', 78.0, 0, 2005, 1800000, 23077, '2024-01-12', 'ירושלים', 'רחוב יפו', '300', '1234/56/8', 1234, 56, 8, 'system', 'active', true, 82),
('רחוב בן יהודה 45, ירושלים', 3.5, '3', 82.0, 1, 2010, 2100000, 25610, '2024-01-08', 'ירושלים', 'רחוב בן יהודה', '45', '1234/57/9', 1234, 57, 9, 'system', 'active', true, 85),
('רחוב המלך ג׳ורג׳ 25, ירושלים', 4, '1', 90.0, 1, 2015, 2500000, 27778, '2023-12-30', 'ירושלים', 'רחוב המלך ג׳ורג׳', '25', '1234/58/10', 1234, 58, 10, 'system', 'active', true, 87),

-- Haifa properties
('רחוב הרצל 80, חיפה', 3, '2', 76.0, 0, 2008, 1500000, 19737, '2024-01-18', 'חיפה', 'רחוב הרצל', '80', '5678/90/15', 5678, 90, 15, 'system', 'active', true, 78),
('רחוב בלפור 120, חיפה', 3.5, '4', 85.0, 1, 2012, 1800000, 21176, '2024-01-14', 'חיפה', 'רחוב בלפור', '120', '5678/91/16', 5678, 91, 16, 'system', 'active', true, 83),

-- Rishon LeZion properties
('רחוב הרצל 150, ראשון לציון', 3, '1', 72.0, 0, 2006, 1200000, 16667, '2024-01-20', 'ראשון לציון', 'רחוב הרצל', '150', '9999/10/20', 9999, 10, 20, 'system', 'active', true, 75),
('רחוב הרצל 200, ראשון לציון', 3.5, '2', 80.0, 1, 2014, 1400000, 17500, '2024-01-16', 'ראשון לציון', 'רחוב הרצל', '200', '9999/11/21', 9999, 11, 21, 'system', 'active', true, 80),

-- Petah Tikva properties
('רחוב הרצל 300, פתח תקווה', 3, '1', 74.0, 0, 2007, 1100000, 14865, '2024-01-22', 'פתח תקווה', 'רחוב הרצל', '300', '8888/20/30', 8888, 20, 30, 'system', 'active', true, 73),
('רחוב הרצל 350, פתח תקווה', 4, '3', 88.0, 1, 2016, 1600000, 18182, '2024-01-18', 'פתח תקווה', 'רחוב הרצל', '350', '8888/21/31', 8888, 21, 31, 'system', 'active', true, 85);

-- Create views for easier querying
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
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP; 
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_comparable_data_updated_at 
    BEFORE UPDATE ON comparable_data 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_assessments_updated_at 
    BEFORE UPDATE ON property_assessments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON comparable_data TO postgres;
GRANT SELECT, INSERT, UPDATE ON property_assessments TO postgres;
GRANT USAGE, SELECT ON SEQUENCE comparable_data_id_seq TO postgres;
GRANT USAGE, SELECT ON SEQUENCE property_assessments_id_seq TO postgres;

-- Comments for documentation
COMMENT ON TABLE comparable_data IS 'Storage for comparable property sales data';
COMMENT ON TABLE property_assessments IS 'Storage for property valuation assessments';
COMMENT ON COLUMN comparable_data.sale_date IS 'יום מכירה - Date of property sale';
COMMENT ON COLUMN comparable_data.address IS 'כתובת - Property address';
COMMENT ON COLUMN comparable_data.rooms IS 'חדרים - Number of rooms';
COMMENT ON COLUMN comparable_data.apartment_area_sqm IS 'שטח דירה במ"ר - Apartment area in square meters';
COMMENT ON COLUMN comparable_data.declared_price IS 'מחיר מוצהר - Declared sale price';
COMMENT ON COLUMN comparable_data.price_per_sqm_rounded IS 'מחיר למ"ר, במעוגל - Price per square meter, rounded';
