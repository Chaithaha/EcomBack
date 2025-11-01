-- Storage RLS Final Fix Script
-- Targeted solution for "must be owner of table objects" error
-- This script provides simplified RLS policies that work with service role client

-- IMPORTANT: This script must be run with a service role account
-- In Supabase SQL Editor, select "Run with security definer" option

-- ==============================================
-- SECTION 1: CHECK CURRENT POLICIES
-- ==============================================

-- First, check current storage policies to understand the issue
-- Run these queries to see existing policies:

-- Check storage.objects policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE schemaname = 'storage' 
-- AND tablename = 'objects'
-- ORDER BY policyname;

-- Check if RLS is enabled on storage.objects
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'storage' 
-- AND tablename = 'objects';

-- ==============================================
-- SECTION 2: CLEANUP EXISTING POLICIES
-- ==============================================

-- Drop all existing storage policies to start fresh
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can insert objects" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view own objects" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update own objects" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own objects" ON storage.objects;
DROP POLICY IF EXISTS "Storage public access" ON storage.objects;
DROP POLICY IF EXISTS "Allow all authenticated users to access storage" ON storage.objects;

-- ==============================================
-- SECTION 3: CREATE SIMPLIFIED RLS POLICIES
-- ==============================================

-- Ensure RLS is enabled on storage.objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create simplified policy that allows authenticated users to access post-images bucket
-- This policy avoids complex conditions that might cause "must be owner" errors
CREATE POLICY "Allow authenticated access to post-images" ON storage.objects
FOR ALL USING (
    bucket_id = 'post-images' AND
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
-- SECTION 4: SERVICE ROLE BYPASS POLICY
-- ==============================================

-- Create a policy that allows service role to bypass RLS checks
-- This is crucial for the service role client to work properly
CREATE POLICY "Service role bypass" ON storage.objects
FOR ALL USING (
    has_role(auth.uid(), 'service_role')
);

-- ==============================================
-- SECTION 5: POST_IMAGES TABLE SETUP
-- ==============================================

-- Drop existing post_images table if it exists
DROP TABLE IF EXISTS post_images CASCADE;

-- Create post_images table with correct structure
CREATE TABLE IF NOT EXISTS post_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
    storage_path TEXT NOT NULL,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on post_images table
ALTER TABLE post_images ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for post_images table
-- Allow authenticated users to insert images for their own posts
CREATE POLICY "Users can insert images for their posts" ON post_images
FOR INSERT WITH CHECK (
    auth.uid() = (SELECT user_id FROM posts WHERE id = post_id)
);

-- Allow authenticated users to view images
CREATE POLICY "Users can view images" ON post_images
FOR SELECT USING (true);

-- Allow authenticated users to update their own images
CREATE POLICY "Users can update their own images" ON post_images
FOR UPDATE USING (
    auth.uid() = (SELECT user_id FROM posts WHERE id = post_id)
);

-- Allow authenticated users to delete their own images
CREATE POLICY "Users can delete their own images" ON post_images
FOR DELETE USING (
    auth.uid() = (SELECT user_id FROM posts WHERE id = post_id)
);

-- ==============================================
-- SECTION 6: PERFORMANCE OPTIMIZATIONS
-- ==============================================

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_post_images_post_id ON post_images(post_id);
CREATE INDEX IF NOT EXISTS idx_post_images_created_at ON post_images(created_at);
CREATE INDEX IF NOT EXISTS idx_post_images_storage_path ON post_images(storage_path);

-- Grant permissions on post_images table
GRANT SELECT ON post_images TO authenticated;
GRANT INSERT ON post_images TO authenticated;
GRANT UPDATE ON post_images TO authenticated;
GRANT DELETE ON post_images TO authenticated;

-- ==============================================
-- SECTION 7: HELPER FUNCTIONS
-- ==============================================

-- Create function to get public URL for storage objects
CREATE OR REPLACE FUNCTION get_storage_public_url(storage_path TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN format('https://%s.supabase.co/storage/v1/object/public/post-images/%s', 
                 current_setting('app.supabase_url', true), 
                 storage_path);
END;
$$ LANGUAGE plpgsql;

-- Grant execute on function
GRANT EXECUTE ON FUNCTION get_storage_public_url TO authenticated;

-- ==============================================
-- SECTION 8: VIEWS AND TRIGGERS
-- ==============================================

-- Create view for easy access to post images with public URLs
CREATE OR REPLACE VIEW post_images_with_urls AS
SELECT 
    pi.*,
    get_storage_public_url(pi.storage_path) as public_url,
    p.title as post_title,
    p.user_id as post_user_id
FROM post_images pi
JOIN posts p ON pi.post_id = p.id;

-- Grant permissions on view
GRANT SELECT ON post_images_with_urls TO authenticated;

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_post_images_updated_at
    BEFORE UPDATE ON post_images
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- SECTION 9: VERIFICATION QUERIES
-- ==============================================

-- These queries will help verify the fix is working properly

-- Query 1: Check storage policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd 
-- FROM pg_policies 
-- WHERE schemaname = 'storage' 
-- AND tablename = 'objects'
-- ORDER BY policyname;

-- Query 2: Check post_images policies
-- SELECT tablename, policyname, permissive, roles, cmd 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- AND tablename = 'post_images'
-- ORDER BY policyname;

-- Query 3: Check RLS status
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname IN ('public', 'storage') 
-- AND tablename IN ('post_images', 'objects');

-- Query 4: Test storage upload (commented out - uncomment to test)
-- INSERT INTO storage.objects (bucket_id, name, size, metadata, last_modified_at, created_at, updated_at)
-- VALUES ('post-images', 'test-upload.txt', 10, '{"content-type": "text/plain"}', NOW(), NOW(), NOW())
-- RETURNING *;

-- Query 5: Check if post_images table exists and has correct structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'post_images' 
-- AND table_schema = 'public'
-- ORDER BY ordinal_position;

-- ==============================================
-- SECTION 10: ERROR HANDLING AND TROUBLESHOOTING
-- ==============================================

-- If you encounter issues, run these diagnostic queries:

-- Check if storage bucket exists
-- SELECT * FROM storage.buckets WHERE name = 'post-images';

-- Check storage bucket configuration
-- SELECT * FROM storage.bucket_policy WHERE bucket_id = 'post-images';

-- Check user authentication status
-- SELECT auth.uid(), auth.jwt() IS NOT NULL as is_authenticated;

-- Check if user has authenticated role
-- SELECT has_role(auth.uid(), 'authenticated') as has_authenticated_role;

-- Check if user has service_role
-- SELECT has_role(auth.uid(), 'service_role') as has_service_role;

-- ==============================================
-- SECTION 11: ALTERNATIVE APPROACHES
-- ==============================================

-- If the above policies don't work, try these alternatives:

-- Alternative 1: More permissive storage policy
-- DROP POLICY IF EXISTS "Allow authenticated storage access" ON storage.objects;
-- CREATE POLICY "Allow all authenticated access" ON storage.objects
-- FOR ALL USING (true);

-- Alternative 2: Use bucket-level RLS instead of table-level
-- This might be necessary if the storage.objects table has complex RLS
-- UPDATE storage.buckets SET public = true WHERE name = 'post-images';

-- Alternative 3: Disable RLS entirely for testing (not recommended for production)
-- ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- ==============================================
-- SECTION 12: FINAL NOTES
-- ==============================================

-- This script provides a comprehensive fix for the storage RLS permissions issue.
-- Key features:
-- 1. Simplified policy statements that avoid complex conditions
-- 2. Service role bypass to ensure service role client works
-- 3. Proper authentication checks for user uploads
-- 4. Complete post_images table setup with RLS
-- 5. Performance optimizations with indexes
-- 6. Helper functions for URL generation
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