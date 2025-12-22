-- Migration: Add settings JSONB column to users table
-- This allows storing user-specific settings like logos, signature, company info, etc.

-- Add settings column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- Add index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_users_settings ON users USING GIN (settings);

-- Add comment
COMMENT ON COLUMN users.settings IS 'User-specific settings including company logos, signature, contact info, etc.';

