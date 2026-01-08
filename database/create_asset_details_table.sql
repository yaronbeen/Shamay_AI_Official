-- Asset Details Table Schema
-- Per-asset cached data (replaces CSV-based comparable-data storage)
-- This is the new source of truth for asset-specific detailed information

CREATE TABLE IF NOT EXISTS asset_details (
    -- Primary key
    id SERIAL PRIMARY KEY,
    
    -- Foreign key to property/valuation
    property_id INTEGER,                           -- Link to property/valuation record
    
    -- Screenshot/visual data
    screenshot_path TEXT,                          -- Path to screenshot file
    screenshot_url TEXT,                           -- Public URL to screenshot
    
    -- Core identifiers
    area VARCHAR(100),                             -- אזור
    parcel_id VARCHAR(100),                        -- מזהה חלקה
    transaction_date DATE,                         -- תאריך עסקה
    
    -- Address information
    city VARCHAR(200),                             -- עיר
    street VARCHAR(200),                           -- רחוב
    house_number INTEGER,                          -- מספר בית
    entrance INTEGER,                              -- כניסה
    apartment_number INTEGER,                      -- מספר דירה
    
    -- Price information (ILS and USD)
    declared_price_ils NUMERIC(15,2),             -- מחיר מוצהר בש"ח
    declared_price_usd NUMERIC(15,2),             -- מחיר מוצהר בדולר
    estimated_price_ils NUMERIC(15,2),            -- מחיר משוער בש"ח
    estimated_price_usd NUMERIC(15,2),            -- מחיר משוער בדולר
    
    -- Calculated prices
    price_per_room NUMERIC(15,2),                 -- מחיר לחדר
    price_per_sqm NUMERIC(15,2),                  -- מחיר למ"ר
    
    -- Area measurements
    arnona_area_sqm NUMERIC(10,2),                -- שטח ארנונה במ"ר
    registered_area_sqm NUMERIC(10,2),            -- שטח רשום במ"ר
    
    -- Property characteristics
    year_built INTEGER,                            -- שנת בנייה
    room_count NUMERIC(4,1),                       -- מספר חדרים (supports half rooms)
    floor INTEGER,                                 -- קומה
    total_floors INTEGER,                          -- סה"כ קומות בבניין
    apartments_in_building INTEGER,                -- מספר דירות בבניין
    
    -- Amenities (parking, elevator, etc.)
    parking_spaces INTEGER,                        -- מספר חניות
    elevator VARCHAR(50),                          -- מעלית (כן/לא/מתוכנן)
    roof INTEGER,                                  -- גג (1=yes, 0=no)
    storage INTEGER,                               -- מחסן (1=yes, 0=no)
    yard INTEGER,                                  -- חצר (1=yes, 0=no)
    plot INTEGER,                                  -- מגרש (1=yes, 0=no)
    gallery INTEGER,                               -- גלריה (1=yes, 0=no)
    
    -- Transaction type and function
    transaction_type VARCHAR(100),                 -- סוג עסקה
    building_function VARCHAR(200),                -- ייעוד מבנה
    unit_function VARCHAR(200),                    -- ייעוד יחידה
    
    -- Legal information
    shares VARCHAR(100),                           -- מניות
    rights TEXT,                                   -- זכויות
    parcel_records_count VARCHAR(50),             -- מספר רישומי חלקה
    zoning_plan TEXT,                              -- תכנית זונינג
    rights_nature TEXT,                            -- מהות זכויות
    
    -- Data isolation fields
    organization_id TEXT,                          -- For multi-tenant isolation
    user_id TEXT,                                  -- For user-level data isolation
    session_id TEXT,                               -- Link to wizard session
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_source TEXT DEFAULT 'manual',             -- Source of data (manual, import, api, extraction)
    
    -- Constraints
    CONSTRAINT positive_areas CHECK (
        (arnona_area_sqm IS NULL OR arnona_area_sqm > 0) AND
        (registered_area_sqm IS NULL OR registered_area_sqm > 0)
    ),
    CONSTRAINT positive_prices CHECK (
        (declared_price_ils IS NULL OR declared_price_ils >= 0) AND
        (declared_price_usd IS NULL OR declared_price_usd >= 0) AND
        (estimated_price_ils IS NULL OR estimated_price_ils >= 0) AND
        (estimated_price_usd IS NULL OR estimated_price_usd >= 0)
    ),
    CONSTRAINT valid_year_built CHECK (
        year_built IS NULL OR (year_built BETWEEN 1800 AND 2030)
    ),
    CONSTRAINT valid_room_count CHECK (
        room_count IS NULL OR room_count > 0
    )
);

-- ==============================================
-- PERFORMANCE INDEXES (Critical for 250K+ rows!)
-- ==============================================

-- INDEX 1: parcel_id (MOST CRITICAL for gush searches!)
-- Format: "006154-0330-004-00" → enables fast search by "006154"
-- Uses text_pattern_ops for efficient LIKE queries
CREATE INDEX IF NOT EXISTS idx_asset_details_parcel_id 
ON asset_details(parcel_id text_pattern_ops) 
WHERE parcel_id IS NOT NULL;

-- INDEX 2: city (enables fast city-based searches)
CREATE INDEX IF NOT EXISTS idx_asset_details_city 
ON asset_details(city) 
WHERE city IS NOT NULL;

-- INDEX 3: transaction_date (enables fast date range queries, recent first)
CREATE INDEX IF NOT EXISTS idx_asset_details_transaction_date 
ON asset_details(transaction_date DESC) 
WHERE transaction_date IS NOT NULL;

-- INDEX 4: year_built (enables fast construction year filtering)
CREATE INDEX IF NOT EXISTS idx_asset_details_year_built 
ON asset_details(year_built) 
WHERE year_built IS NOT NULL;

-- INDEX 5: Composite index for common query patterns (date + year + area)
CREATE INDEX IF NOT EXISTS idx_asset_details_common_filters 
ON asset_details(transaction_date DESC, year_built, registered_area_sqm) 
WHERE transaction_date IS NOT NULL 
  AND year_built IS NOT NULL
  AND registered_area_sqm IS NOT NULL
  AND declared_price_ils IS NOT NULL;

-- INDEX 6: Price calculations (speeds up price per sqm calculations)
CREATE INDEX IF NOT EXISTS idx_asset_details_price_calculations 
ON asset_details(declared_price_ils, registered_area_sqm) 
WHERE declared_price_ils IS NOT NULL 
  AND registered_area_sqm IS NOT NULL
  AND registered_area_sqm > 0;

-- INDEX 7: Recent transactions (partial index for last 24 months)
CREATE INDEX IF NOT EXISTS idx_asset_details_recent_transactions 
ON asset_details(transaction_date DESC, city, year_built) 
WHERE transaction_date >= CURRENT_DATE - INTERVAL '24 months'
  AND registered_area_sqm IS NOT NULL
  AND declared_price_ils IS NOT NULL;

-- Optional: property_id lookup
CREATE INDEX IF NOT EXISTS idx_asset_details_property_id 
ON asset_details(property_id) 
WHERE property_id IS NOT NULL;

-- Optional: session_id lookup (for wizard flow)
CREATE INDEX IF NOT EXISTS idx_asset_details_session_id 
ON asset_details(session_id) 
WHERE session_id IS NOT NULL;

-- Optional: Data isolation indexes (uncomment if using multi-tenant)
-- CREATE INDEX IF NOT EXISTS idx_asset_details_organization_id 
-- ON asset_details(organization_id) 
-- WHERE organization_id IS NOT NULL;

-- CREATE INDEX IF NOT EXISTS idx_asset_details_user_id 
-- ON asset_details(user_id) 
-- WHERE user_id IS NOT NULL;

-- ==============================================
-- TRIGGERS FOR AUTO-UPDATE
-- ==============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_asset_details_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_asset_details_updated_at
    BEFORE UPDATE ON asset_details
    FOR EACH ROW
    EXECUTE FUNCTION update_asset_details_updated_at();

-- Auto-calculate price_per_sqm if not provided
CREATE OR REPLACE FUNCTION calculate_asset_price_per_sqm()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate price_per_sqm from declared_price_ils and registered_area_sqm if available
    IF NEW.price_per_sqm IS NULL AND NEW.declared_price_ils IS NOT NULL 
       AND NEW.registered_area_sqm IS NOT NULL AND NEW.registered_area_sqm > 0 THEN
        NEW.price_per_sqm = ROUND(NEW.declared_price_ils::NUMERIC / NEW.registered_area_sqm::NUMERIC, 2);
    END IF;
    
    -- Calculate price_per_room if not provided
    IF NEW.price_per_room IS NULL AND NEW.declared_price_ils IS NOT NULL 
       AND NEW.room_count IS NOT NULL AND NEW.room_count > 0 THEN
        NEW.price_per_room = ROUND(NEW.declared_price_ils::NUMERIC / NEW.room_count::NUMERIC, 2);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_asset_prices
    BEFORE INSERT OR UPDATE ON asset_details
    FOR EACH ROW
    EXECUTE FUNCTION calculate_asset_price_per_sqm();

-- ==============================================
-- UPDATE STATISTICS (Critical after index creation!)
-- ==============================================
ANALYZE asset_details;

-- ==============================================
-- COMMENTS FOR DOCUMENTATION
-- ==============================================
COMMENT ON TABLE asset_details IS 'Asset-specific detailed data - replaces CSV-based comparable-data storage';
COMMENT ON COLUMN asset_details.property_id IS 'Link to property/valuation record';
COMMENT ON COLUMN asset_details.parcel_id IS 'Parcel identifier in format: 006154-0330-004-00 (gush-chelka-sub-subsub)';
COMMENT ON COLUMN asset_details.declared_price_ils IS 'מחיר מוצהר בש"ח';
COMMENT ON COLUMN asset_details.price_per_sqm IS 'מחיר למ"ר - calculated automatically if not provided';
COMMENT ON COLUMN asset_details.registered_area_sqm IS 'שטח רשום במ"ר';
COMMENT ON COLUMN asset_details.session_id IS 'Link to wizard session for current workflow';

COMMENT ON INDEX idx_asset_details_parcel_id IS 'Critical for block_number (גוש) filtering - enables fast LIKE queries on parcel_id';
COMMENT ON INDEX idx_asset_details_city IS 'Enables fast city-based searches';
COMMENT ON INDEX idx_asset_details_transaction_date IS 'Enables fast date range queries (recent transactions first)';
COMMENT ON INDEX idx_asset_details_year_built IS 'Enables fast filtering by construction year';
COMMENT ON INDEX idx_asset_details_common_filters IS 'Optimizes most common query pattern (date + year + area together)';
COMMENT ON INDEX idx_asset_details_price_calculations IS 'Speeds up price per sqm calculations';
COMMENT ON INDEX idx_asset_details_recent_transactions IS 'Partial index optimized for recent data queries (last 24 months)';

