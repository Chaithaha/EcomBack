-- =============================================
-- Data Migration: Posts/Products → Items
-- =============================================
-- This script migrates existing data from posts and products tables to the new unified items table
-- Run this AFTER executing migrate-to-items.sql

-- =============================================
-- STEP 1: MIGRATE POSTS TO ITEMS
-- =============================================

-- First, let's see what we're migrating
SELECT 'Posts to migrate:' as info;
SELECT COUNT(*) as post_count FROM posts;
SELECT 'Sample posts:' as info;
SELECT id, title, price, category, status, user_id, image_url, created_at FROM posts LIMIT 3;

-- Migrate posts to items table
INSERT INTO items (
    id, 
    title, 
    description, 
    price, 
    category, 
    status, 
    user_id, 
    image_url, 
    created_at, 
    updated_at
)
SELECT 
    id, 
    title, 
    description, 
    price, 
    category, 
    status, 
    user_id, 
    image_url, 
    created_at, 
    updated_at 
FROM posts
ON CONFLICT (id) DO NOTHING;

-- Verify posts migration
SELECT 'Posts migrated:' as info;
SELECT COUNT(*) as migrated_posts FROM items WHERE user_id IS NOT NULL;

-- =============================================
-- STEP 2: MIGRATE POST_IMAGES TO ITEM_IMAGES
-- =============================================

-- First, let's see what post images we have
SELECT 'Post images to migrate:' as info;
SELECT COUNT(*) as post_images_count FROM post_images;
SELECT 'Sample post images:' as info;
SELECT id, post_id, image_url, filename, original_filename, storage_path, file_size, mime_type, created_at FROM post_images LIMIT 3;

-- Migrate post_images to item_images table
INSERT INTO item_images (
    id,
    item_id,
    image_url,
    filename,
    original_filename,
    file_size,
    mime_type,
    storage_path,
    created_at,
    updated_at
)
SELECT 
    id,
    post_id as item_id,
    image_url,
    filename,
    original_filename,
    file_size,
    mime_type,
    storage_path,
    created_at,
    updated_at
FROM post_images
ON CONFLICT (id) DO NOTHING;

-- Verify post images migration
SELECT 'Post images migrated:' as info;
SELECT COUNT(*) as migrated_post_images FROM item_images;

-- =============================================
-- STEP 3: MIGRATE PRODUCTS TO ITEMS (ASSIGN TO ADMIN)
-- =============================================

-- First, let's see what products we have
SELECT 'Products to migrate:' as info;
SELECT COUNT(*) as product_count FROM products;
SELECT 'Sample products:' as info;
SELECT id, title, price, category, image_url, created_at FROM products LIMIT 3;

-- Find admin user to assign products to
SELECT 'Finding admin user:' as info;
SELECT id, full_name, role FROM profiles WHERE role = 'admin' LIMIT 1;

-- Migrate products to items table (assign to admin user)
-- We'll use a subquery to find the admin user
INSERT INTO items (
    title, 
    description, 
    price, 
    category, 
    status, 
    user_id, 
    image_url, 
    created_at, 
    updated_at
)
SELECT 
    p.title, 
    p.description, 
    p.price, 
    p.category, 
    'active' as status,  -- Products are always active
    (
        SELECT id FROM profiles WHERE role = 'admin' LIMIT 1
    ) as user_id,  -- Assign to admin user
    p.image_url, 
    p.created_at, 
    p.updated_at 
FROM products p
ON CONFLICT DO NOTHING;

-- Verify products migration
SELECT 'Products migrated:' as info;
SELECT COUNT(*) as migrated_products FROM items WHERE user_id IN (SELECT id FROM profiles WHERE role = 'admin');

-- =============================================
-- STEP 4: VERIFICATION
-- =============================================

-- Final verification of all data
SELECT '=== MIGRATION VERIFICATION ===' as info;

-- Total items count
SELECT 'Total items after migration:' as info;
SELECT COUNT(*) as total_items FROM items;

-- Items by status
SELECT 'Items by status:' as info;
SELECT status, COUNT(*) as count FROM items GROUP BY status;

-- Items by user type
SELECT 'Items by user type:' as info;
SELECT 
    CASE 
        WHEN p.role = 'admin' THEN 'Admin Items'
        ELSE 'User Items'
    END as item_type,
    COUNT(*) as count
FROM items i
JOIN profiles p ON i.user_id = p.id
GROUP BY p.role;

-- Item images count
SELECT 'Total item images after migration:' as info;
SELECT COUNT(*) as total_item_images FROM item_images;

-- Sample of migrated data
SELECT 'Sample migrated items:' as info;
SELECT 
    i.id,
    i.title,
    i.price,
    i.category,
    i.status,
    p.full_name as owner_name,
    p.role as owner_role,
    i.created_at
FROM items i
JOIN profiles p ON i.user_id = p.id
ORDER BY i.created_at DESC
LIMIT 5;

-- Sample of migrated images
SELECT 'Sample migrated item images:' as info;
SELECT 
    ii.id,
    ii.item_id,
    ii.filename,
    ii.original_filename,
    i.title as item_title,
    p.full_name as item_owner
FROM item_images ii
JOIN items i ON ii.item_id = i.id
JOIN profiles p ON i.user_id = p.id
LIMIT 5;

-- =============================================
-- STEP 5: CLEANUP (OPTIONAL - UNCOMMENT WHEN READY)
-- =============================================

-- WARNING: Only run these commands AFTER you've verified the migration is successful
-- and you're ready to permanently remove the old tables

/*
-- Drop old tables (UNCOMMENT WHEN READY)
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS post_images CASCADE;
DROP TABLE IF EXISTS products CASCADE;

-- Verify old tables are gone
SELECT 'Old tables dropped:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
AND table_name IN ('posts', 'post_images', 'products');
*/

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

SELECT '=== MIGRATION COMPLETE ===' as info;
SELECT 'Next steps:' as info;
SELECT '1. Verify all data has been migrated correctly' as step1;
SELECT '2. Test the new /api/items endpoints' as step2;
SELECT '3. Update frontend to use /api/items' as step3;
SELECT '4. Run cleanup script when ready' as step4;