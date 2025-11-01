-- Fix Storage RLS Policies for Item Images Bucket
-- This script addresses the "must be owner of table objects" error and "has_role() function" error
-- Updated to work with "item-images" bucket instead of "post-images"

-- IMPORTANT: This script must be run with a service role account
-- In Supabase SQL Editor, select "Run with security definer" option

-- ==============================================
-- SECTION 1: CLEANUP EXISTING POLICIES
-- ==============================================

-- Drop all existing storage policies to start fresh
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can insert objects" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view own objects" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update own objects" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own objects" ON storage.objects;
DROP POLICY IF EXISTS "Storage public access" ON storage.objects;
DROP POLICY IF EXISTS "Allow all authenticated users to access storage" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated access to post-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated storage access" ON storage.objects;
DROP POLICY IF EXISTS "Service role bypass" ON storage.objects;

-- ==============================================
-- SECTION 2: CREATE CORRECTED RLS POLICIES FOR item-images
-- ==============================================

-- Ensure RLS is enabled on storage.objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create simplified policy that allows authenticated users to access item-images bucket
-- This policy avoids complex conditions that might cause "must be owner" errors
CREATE POLICY "Allow authenticated access to item-images" ON storage.objects
FOR ALL USING (
    bucket_id = 'item-images' AND
    auth.role() = 'authenticated'
);

-- Alternative: More permissive policy if the above doesn't work
-- This allows all authenticated users to access any storage object
-- Use this as a fallback if the specific bucket policy fails
CREATE POLICY "Allow authenticated storage access" ON storage.objects
FOR ALL USING (
    auth.role() = 'authenticated'
);

-- ==============================================
-- SECTION 3: SERVICE ROLE BYPASS POLICY (FIXED)
-- ==============================================

-- Create a policy that allows service role to bypass RLS checks
-- FIXED: Use proper Supabase authentication functions instead of has_role()
CREATE POLICY "Service role bypass" ON storage.objects
FOR ALL USING (
    auth.role() = 'service_role'
);

-- ==============================================
-- SECTION 4: ITEM_IMAGES TABLE SETUP
-- ==============================================

-- Drop existing item_images table if it exists (to ensure clean structure)
DROP TABLE IF EXISTS item_images CASCADE;

-- Create item_images table with correct structure (matching unified items system)
CREATE TABLE IF NOT EXISTS item_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_id UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
    storage_path TEXT NOT NULL,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on item_images table
ALTER TABLE item_images ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for item_images table
-- Allow authenticated users to insert images for their own items
CREATE POLICY "Users can insert images for their items" ON item_images
FOR INSERT WITH CHECK (
    auth.uid() = (SELECT user_id FROM items WHERE id = item_id)
);

-- Allow authenticated users to view images
CREATE POLICY "Users can view images" ON item_images
FOR SELECT USING (true);

-- Allow authenticated users to update their own images
CREATE POLICY "Users can update their own images" ON item_images
FOR UPDATE USING (
    auth.uid() = (SELECT user_id FROM items WHERE id = item_id)
);

-- Allow authenticated users to delete their own images
CREATE POLICY "Users can delete their own images" ON item_images
FOR DELETE USING (
    auth.uid() = (SELECT user_id FROM items WHERE id = item_id)
);

-- ==============================================
-- SECTION 5: PERFORMANCE OPTIMIZATIONS
-- ==============================================

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_item_images_item_id ON item_images(item_id);
CREATE INDEX IF NOT EXISTS idx_item_images_created_at ON item_images(created_at);
CREATE INDEX IF NOT EXISTS idx_item_images_storage_path ON item_images(storage_path);

-- Grant permissions on item_images table
GRANT SELECT ON item_images TO authenticated;
GRANT INSERT ON item_images TO authenticated;
GRANT UPDATE ON item_images TO authenticated;
GRANT DELETE ON item_images TO authenticated;

-- ==============================================
-- SECTION 6: HELPER FUNCTIONS
-- ==============================================

-- Create function to get public URL for storage objects (updated for item-images)
CREATE OR REPLACE FUNCTION get_item_storage_public_url(storage_path TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN format('https://%s.supabase.co/storage/v1/object/public/item-images/%s', 
                 current_setting('app.supabase_url', true), 
                 storage_path);
END;
$$ LANGUAGE plpgsql;

-- Grant execute on function
GRANT EXECUTE ON FUNCTION get_item_storage_public_url TO authenticated;

-- ==============================================
-- SECTION 7: VIEWS AND TRIGGERS
-- ==============================================

-- Create view for easy access to item images with public URLs
CREATE OR REPLACE VIEW item_images_with_urls AS
SELECT 
    ii.*,
    get_item_storage_public_url(ii.storage_path) as public_url,
    i.title as item_title,
    i.user_id as item_user_id
FROM item_images ii
JOIN items i ON ii.item_id = i.id;

-- Grant permissions on view
GRANT SELECT ON item_images_with_urls TO authenticated;

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_item_images_updated_at
    BEFORE UPDATE ON item_images
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- SECTION 8: VERIFICATION QUERIES
-- ==============================================

-- These queries will help verify the fix is working properly

-- Query 1: Check storage policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd 
-- FROM pg_policies 
-- WHERE schemaname = 'storage' 
-- AND tablename = 'objects'
-- ORDER BY policyname;

-- Query 2: Check item_images policies
-- SELECT tablename, policyname, permissive, roles, cmd 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- AND tablename = 'item_images'
-- ORDER BY policyname;

-- Query 3: Check RLS status
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname IN ('public', 'storage') 
-- AND tablename IN ('item_images', 'objects');

-- Query 4: Test storage upload (commented out - uncomment to test)
-- INSERT INTO storage.objects (bucket_id, name, size, metadata, last_modified_at, created_at, updated_at)
-- VALUES ('item-images', 'test-upload.txt', 10, '{"content-type": "text/plain"}', NOW(), NOW(), NOW())
-- RETURNING *;

-- Query 5: Check if item_images table exists and has correct structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'item_images' 
-- AND table_schema = 'public'
-- ORDER BY ordinal_position;

-- ==============================================
-- SECTION 9: ERROR HANDLING AND TROUBLESHOOTING
-- ==============================================

-- If you encounter issues, run these diagnostic queries:

-- Check if storage bucket exists
-- SELECT * FROM storage.buckets WHERE name = 'item-images';

-- Check storage bucket configuration
-- SELECT * FROM storage.bucket_policy WHERE bucket_id = 'item-images';

-- Check user authentication status
-- SELECT auth.uid(), auth.jwt() IS NOT NULL as is_authenticated;

-- Check if user has authenticated role
-- SELECT auth.role() = 'authenticated' as has_authenticated_role;

-- Check if user has service_role
-- SELECT auth.role() = 'service_role' as has_service_role;

-- ==============================================
-- SECTION 10: ALTERNATIVE APPROACHES
-- ==============================================

-- If the above policies don't work, try these alternatives:

-- Alternative 1: More permissive storage policy
-- DROP POLICY IF EXISTS "Allow authenticated storage access" ON storage.objects;
-- CREATE POLICY "Allow all authenticated access" ON storage.objects
-- FOR ALL USING (true);

-- Alternative 2: Use bucket-level RLS instead of table-level
-- This might be necessary if the storage.objects table has complex RLS
-- UPDATE storage.buckets SET public = true WHERE name = 'item-images';

-- Alternative 3: Disable RLS entirely for testing (not recommended for production)
-- ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- ==============================================
-- SECTION 11: FINAL NOTES
-- ==============================================

-- This script provides a comprehensive fix for the storage RLS permissions issue.
-- Key features:
-- 1. Simplified policy statements that avoid complex conditions
-- 2. Service role bypass to ensure service role client works (FIXED has_role() error)
-- 3. Proper authentication checks for user uploads
-- 4. Complete item_images table setup with RLS (updated from post_images)
-- 5. Performance optimizations with indexes
-- 6. Helper functions for URL generation (updated for item-images)
-- 7. Comprehensive verification queries

-- After running this script:
-- 1. Test image upload functionality
-- 2. Verify that the "must be owner of table objects" error is resolved
-- 3. Check that both service role and authenticated users can access storage
-- 4. Monitor for any permission-related errors

-- For production use, consider:
-- - Adding more specific security constraints
-- - Implementing file size limits
-- - Adding file type validation
-- - Setting up proper error handling and logging

-- End of script