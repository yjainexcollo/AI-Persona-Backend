-- Drop the invites table and its related constraints
-- This migration removes the invite functionality from the system

-- Drop the invites table (this will also drop the foreign key constraints)
DROP TABLE IF EXISTS "invites"; 