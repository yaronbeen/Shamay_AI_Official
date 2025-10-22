-- SHAMAY.AI Users Management Queries
-- Quick reference for user-related database operations

-- ============================================
-- VIEW ALL USERS
-- ============================================

SELECT 
  u.id,
  u.email,
  u.name,
  u.primary_role,
  o.name as organization_name,
  u.is_active,
  u.last_login,
  u.created_at
FROM users u
LEFT JOIN organizations o ON u.primary_organization_id = o.id
ORDER BY u.created_at DESC;

-- ============================================
-- VIEW SPECIFIC USER
-- ============================================

SELECT 
  u.*,
  o.name as organization_name,
  o.slug as organization_slug
FROM users u
LEFT JOIN organizations o ON u.primary_organization_id = o.id
WHERE u.email = 'admin@shamay.ai';

-- ============================================
-- VIEW USER'S ORGANIZATIONS
-- ============================================

SELECT 
  u.email,
  u.name as user_name,
  o.name as organization_name,
  om.role,
  om.joined_at
FROM users u
JOIN organization_memberships om ON u.id = om.user_id
JOIN organizations o ON om.organization_id = o.id
WHERE u.email = 'admin@shamay.ai';

-- ============================================
-- CREATE NEW USER
-- ============================================

-- Note: Password hash should be generated using bcrypt
-- Example using bcryptjs in Node.js: bcrypt.hashSync('password', 10)

INSERT INTO users (
  email,
  name,
  password_hash,
  primary_organization_id,
  primary_role,
  is_active
) VALUES (
  'newuser@shamay.ai',
  'New User',
  '$2a$10$HASH_HERE', -- Replace with actual bcrypt hash
  'default-org',
  'user',
  TRUE
);

-- Add user to organization
INSERT INTO organization_memberships (user_id, organization_id, role)
VALUES (
  (SELECT id FROM users WHERE email = 'newuser@shamay.ai'),
  'default-org',
  'user'
);

-- ============================================
-- UPDATE USER PASSWORD
-- ============================================

UPDATE users 
SET 
  password_hash = '$2a$10$NEW_HASH_HERE', -- Replace with actual bcrypt hash
  updated_at = CURRENT_TIMESTAMP
WHERE email = 'admin@shamay.ai';

-- ============================================
-- UPDATE USER ROLE
-- ============================================

UPDATE users 
SET 
  primary_role = 'admin', -- or 'appraiser', 'user'
  updated_at = CURRENT_TIMESTAMP
WHERE email = 'user@shamay.ai';

-- Also update in organization memberships
UPDATE organization_memberships
SET role = 'admin'
WHERE user_id = (SELECT id FROM users WHERE email = 'user@shamay.ai')
  AND organization_id = 'default-org';

-- ============================================
-- DEACTIVATE USER
-- ============================================

UPDATE users 
SET 
  is_active = FALSE,
  updated_at = CURRENT_TIMESTAMP
WHERE email = 'user@shamay.ai';

-- ============================================
-- ACTIVATE USER
-- ============================================

UPDATE users 
SET 
  is_active = TRUE,
  updated_at = CURRENT_TIMESTAMP
WHERE email = 'user@shamay.ai';

-- ============================================
-- DELETE USER (CAREFUL!)
-- ============================================

-- This will cascade delete:
-- - organization_memberships
-- - Any shuma records created by this user (if foreign key is set)

DELETE FROM users WHERE email = 'user@shamay.ai';

-- ============================================
-- VIEW USER'S VALUATIONS
-- ============================================

SELECT 
  u.email,
  u.name,
  s.session_id,
  s.full_address,
  s.final_valuation,
  s.is_complete,
  s.created_at,
  s.updated_at
FROM users u
JOIN shuma s ON u.id = s.user_id
WHERE u.email = 'admin@shamay.ai'
ORDER BY s.updated_at DESC;

-- ============================================
-- COUNT VALUATIONS PER USER
-- ============================================

SELECT 
  u.email,
  u.name,
  COUNT(s.id) as total_valuations,
  COUNT(CASE WHEN s.is_complete THEN 1 END) as completed_valuations,
  COUNT(CASE WHEN NOT s.is_complete THEN 1 END) as in_progress_valuations
FROM users u
LEFT JOIN shuma s ON u.id = s.user_id
GROUP BY u.id, u.email, u.name
ORDER BY total_valuations DESC;

-- ============================================
-- VIEW USERS BY ORGANIZATION
-- ============================================

SELECT 
  o.name as organization_name,
  u.email,
  u.name as user_name,
  u.primary_role,
  om.role as membership_role,
  u.is_active
FROM organizations o
JOIN organization_memberships om ON o.id = om.organization_id
JOIN users u ON om.user_id = u.id
WHERE o.id = 'default-org'
ORDER BY u.created_at DESC;

-- ============================================
-- CREATE NEW ORGANIZATION
-- ============================================

INSERT INTO organizations (name, slug, settings)
VALUES (
  'New Organization',
  'new-org',
  '{"features": ["valuations", "reports"]}'::jsonb
);

-- ============================================
-- ADD USER TO ORGANIZATION
-- ============================================

INSERT INTO organization_memberships (user_id, organization_id, role)
VALUES (
  (SELECT id FROM users WHERE email = 'user@shamay.ai'),
  (SELECT id FROM organizations WHERE slug = 'new-org'),
  'user' -- or 'owner', 'admin', 'appraiser'
);

-- ============================================
-- REMOVE USER FROM ORGANIZATION
-- ============================================

DELETE FROM organization_memberships
WHERE user_id = (SELECT id FROM users WHERE email = 'user@shamay.ai')
  AND organization_id = (SELECT id FROM organizations WHERE slug = 'new-org');

-- ============================================
-- UPDATE USER PROFILE
-- ============================================

UPDATE users 
SET 
  name = 'Updated Name',
  phone = '+972-50-123-4567',
  license_number = 'ISR-12345',
  updated_at = CURRENT_TIMESTAMP
WHERE email = 'user@shamay.ai';

-- ============================================
-- SEARCH USERS
-- ============================================

-- By email
SELECT * FROM users WHERE email LIKE '%@shamay.ai%';

-- By name
SELECT * FROM users WHERE name ILIKE '%john%';

-- By role
SELECT * FROM users WHERE primary_role = 'admin';

-- Active users only
SELECT * FROM users WHERE is_active = TRUE;

-- ============================================
-- AUDIT: USER LOGIN ACTIVITY
-- ============================================

SELECT 
  email,
  name,
  last_login,
  CASE 
    WHEN last_login IS NULL THEN 'Never logged in'
    WHEN last_login < NOW() - INTERVAL '30 days' THEN 'Inactive (30+ days)'
    WHEN last_login < NOW() - INTERVAL '7 days' THEN 'Recently inactive'
    ELSE 'Active'
  END as activity_status
FROM users
ORDER BY last_login DESC NULLS LAST;

-- ============================================
-- CLEANUP: REMOVE INACTIVE USERS
-- ============================================

-- View users who never logged in and created > 90 days ago
SELECT 
  email,
  name,
  created_at,
  last_login
FROM users
WHERE last_login IS NULL 
  AND created_at < NOW() - INTERVAL '90 days'
  AND email != 'admin@shamay.ai'; -- Protect admin

-- DELETE (uncomment to execute - CAREFUL!)
-- DELETE FROM users
-- WHERE last_login IS NULL 
--   AND created_at < NOW() - INTERVAL '90 days'
--   AND email != 'admin@shamay.ai';

