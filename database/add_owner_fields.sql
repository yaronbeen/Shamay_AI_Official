-- Add owner fields to existing land_registry_extracts table
-- Run this script to add owner extraction capabilities

\c shamay_land_registry;

-- Add owner fields to the existing table
ALTER TABLE land_registry_extracts 
ADD COLUMN owners JSONB,  -- Store array of owner objects with name, id, share
ADD COLUMN owners_confidence DECIMAL(5,2),
ADD COLUMN owners_context TEXT,
ADD COLUMN owners_count INTEGER DEFAULT 0;

-- Create index for JSONB owners field for efficient querying
CREATE INDEX idx_land_registry_owners ON land_registry_extracts USING GIN (owners);

-- Create index for owner count
CREATE INDEX idx_land_registry_owners_count ON land_registry_extracts(owners_count);

-- Create a view for easy owner queries
CREATE VIEW property_owners AS
SELECT 
    id,
    document_filename,
    gush,
    chelka,
    sub_chelka,
    owners,
    owners_count,
    owners_confidence,
    created_at
FROM land_registry_extracts
WHERE owners IS NOT NULL;

-- Create a view to extract individual owners from JSONB
CREATE VIEW individual_owners AS
SELECT 
    lr.id as property_id,
    lr.document_filename,
    lr.gush,
    lr.chelka,
    lr.sub_chelka,
    owner_data->>'hebrew_name' as hebrew_name,
    owner_data->>'english_name' as english_name,
    owner_data->>'id_number' as id_number,
    owner_data->>'share' as ownership_share,
    lr.created_at
FROM land_registry_extracts lr,
     jsonb_array_elements(lr.owners) as owner_data
WHERE lr.owners IS NOT NULL;

COMMENT ON COLUMN land_registry_extracts.owners IS 'JSONB array of owner objects: [{hebrew_name, english_name, id_number, share}]';
COMMENT ON COLUMN land_registry_extracts.owners_confidence IS 'Confidence score for owner extraction (0-100)';
COMMENT ON COLUMN land_registry_extracts.owners_context IS 'Text context where owners were found';
COMMENT ON COLUMN land_registry_extracts.owners_count IS 'Number of owners found';

COMMENT ON VIEW property_owners IS 'View showing properties with their owners information';
COMMENT ON VIEW individual_owners IS 'View showing individual owners extracted from JSONB data';

-- Display the updated table structure
\d land_registry_extracts;