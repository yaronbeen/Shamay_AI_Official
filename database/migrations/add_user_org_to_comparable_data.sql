-- Migration: Add user and organization separation to comparable_data table
-- This ensures that comparable data is isolated per user/company

-- Add organization_id and user_id columns
ALTER TABLE comparable_data 
ADD COLUMN IF NOT EXISTS organization_id TEXT,
ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_comparable_data_organization_id ON comparable_data(organization_id);
CREATE INDEX IF NOT EXISTS idx_comparable_data_user_id ON comparable_data(user_id);
CREATE INDEX IF NOT EXISTS idx_comparable_data_org_user ON comparable_data(organization_id, user_id);

-- Add foreign key constraints (optional - if organizations table exists)
-- ALTER TABLE comparable_data 
-- ADD CONSTRAINT fk_comparable_data_organization 
-- FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Update existing records to have default values (migration data)
-- Note: You may want to set these based on your business logic
-- UPDATE comparable_data 
-- SET organization_id = 'default-org', user_id = 'system'
-- WHERE organization_id IS NULL OR user_id IS NULL;

-- Add comments
COMMENT ON COLUMN comparable_data.organization_id IS 'Organization/Company ID that owns this data';
COMMENT ON COLUMN comparable_data.user_id IS 'User ID who imported/created this record';

