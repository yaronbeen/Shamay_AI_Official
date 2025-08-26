-- Images Table Schema
-- For storing property-related images with different categories

CREATE TABLE IF NOT EXISTS images (
    -- Primary key and metadata
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Image identification and categorization
    image_type VARCHAR(100) NOT NULL,              -- Type of image (see ENUM below)
    title VARCHAR(200),                            -- Image title/description
    
    -- File information
    filename VARCHAR(255) NOT NULL,                -- Original filename
    file_path TEXT NOT NULL,                       -- Full path to image file
    file_size BIGINT,                              -- File size in bytes
    mime_type VARCHAR(100),                        -- MIME type (image/jpeg, image/png, etc.)
    
    -- Image properties
    width INTEGER,                                 -- Image width in pixels
    height INTEGER,                                -- Image height in pixels
    
    -- Relations
    property_assessment_id INTEGER,                -- Link to property assessment (optional)
    building_permit_id INTEGER,                    -- Link to building permit (optional)
    shared_building_order_id INTEGER,             -- Link to shared building order (optional)
    land_registry_id INTEGER,                     -- Link to land registry (optional)
    
    -- Additional metadata
    captured_date DATE,                           -- When the image was captured/taken
    notes TEXT,                                   -- Additional notes about the image
    tags TEXT[],                                  -- Array of tags for categorization
    
    -- System metadata
    uploaded_by VARCHAR(100),                     -- User who uploaded the image
    status VARCHAR(50) DEFAULT 'active',          -- active, archived, deleted
    
    -- Create foreign key constraints (optional - depends on if IDs exist)
    CONSTRAINT fk_property_assessment 
        FOREIGN KEY (property_assessment_id) 
        REFERENCES property_assessments(id) 
        ON DELETE SET NULL,
        
    -- Add constraints for valid image types
    CONSTRAINT valid_image_type CHECK (
        image_type IN (
            'תמונה חיצונית',                    -- External photo
            'סקרין שוט GOVMAP',                -- GOVMAP screenshot  
            'סקרין שוט תצ״א',                   -- Aerial photo screenshot
            'סקרין שוט תצ״א 2',                 -- Aerial photo screenshot 2
            'תמונות פנימיות',                   -- Interior photos
            'סקרין שוט מהצו בית משותף',         -- Shared building order screenshot
            'צילום תשריט מהתב״ע'                 -- Zoning plan screenshot
        )
    ),
    
    CONSTRAINT valid_status CHECK (
        status IN ('active', 'archived', 'deleted')
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_images_type ON images(image_type);
CREATE INDEX IF NOT EXISTS idx_images_property_assessment ON images(property_assessment_id);
CREATE INDEX IF NOT EXISTS idx_images_created_at ON images(created_at);
CREATE INDEX IF NOT EXISTS idx_images_status ON images(status);
CREATE INDEX IF NOT EXISTS idx_images_filename ON images(filename);

-- Create index for full-text search on tags
CREATE INDEX IF NOT EXISTS idx_images_tags ON images USING GIN(tags);

-- Create view for active images with readable info
CREATE OR REPLACE VIEW active_images AS
SELECT 
    id,
    image_type,
    title,
    filename,
    file_size,
    CASE 
        WHEN width IS NOT NULL AND height IS NOT NULL 
        THEN CONCAT(width, 'x', height)
        ELSE 'Unknown'
    END as dimensions,
    property_assessment_id,
    captured_date,
    uploaded_by,
    created_at
FROM images
WHERE status = 'active'
ORDER BY created_at DESC;

-- Create view for images by type
CREATE OR REPLACE VIEW images_by_type AS
SELECT 
    image_type,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE status = 'active') as active_count,
    AVG(file_size) as avg_file_size,
    MAX(created_at) as latest_upload
FROM images
GROUP BY image_type
ORDER BY total_count DESC;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_images_updated_at 
    BEFORE UPDATE ON images 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE images IS 'Storage for property-related images with categorization';
COMMENT ON COLUMN images.image_type IS 'Type of image - must be one of predefined categories';
COMMENT ON COLUMN images.filename IS 'Original filename of uploaded image';
COMMENT ON COLUMN images.file_path IS 'Full path to stored image file';
COMMENT ON COLUMN images.property_assessment_id IS 'Optional link to property assessment record';
COMMENT ON COLUMN images.captured_date IS 'Date when image was captured/taken';
COMMENT ON COLUMN images.tags IS 'Array of tags for flexible categorization';

-- Insert example record to verify schema
-- INSERT INTO images (
--     image_type, title, filename, file_path, 
--     mime_type, property_assessment_id, uploaded_by
-- ) VALUES (
--     'תמונה חיצונית', 'חזית הבניין', 'building_front.jpg', '/uploads/images/building_front.jpg',
--     'image/jpeg', 1, 'demo-user'
-- );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON images TO postgres;
GRANT USAGE, SELECT ON SEQUENCE images_id_seq TO postgres;