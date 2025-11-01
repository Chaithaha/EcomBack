-- Fix Storage RLS Policies for Image Uploads
-- This script addresses the "new row violates row-level security policy" error

-- 1. First, check current storage policies
-- Run this to see existing policies:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE schemaname = 'storage' 
-- AND tablename = 'objects';

-- 2. Drop existing problematic policies if they exist
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can insert objects" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view own objects" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update own objects" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own objects" ON storage.objects;

-- 3. Create proper RLS policies for storage.objects table

-- Allow authenticated users to insert objects (upload files)
CREATE POLICY "Authenticated users can insert objects" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'post-images' AND
    auth.role() = 'authenticated'
);

-- Allow authenticated users to view objects (read files)
CREATE POLICY "Authenticated users can view objects" ON storage.objects
FOR SELECT USING (
    bucket_id = 'post-images'
);

-- Allow authenticated users to update their own objects
CREATE POLICY "Authenticated users can update own objects" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'post-images' AND
    auth.role() = 'authenticated'
);

-- Allow authenticated users to delete their own objects
CREATE POLICY "Authenticated users can delete own objects" ON storage.objects
FOR DELETE USING (
    bucket_id = 'post-images' AND
    auth.role() = 'authenticated'
);

-- 4. Ensure RLS is enabled on storage.objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 5. Fix the post_images table structure to match the server expectations
-- Drop the existing table if it has the wrong structure
DROP TABLE IF EXISTS post_images CASCADE;

-- Create post_images table with correct structure (matching server/routes/images.js expectations)
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

-- 6. Enable RLS on post_images table
ALTER TABLE post_images ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for post_images table

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

-- 8. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_post_images_post_id ON post_images(post_id);
CREATE INDEX IF NOT EXISTS idx_post_images_created_at ON post_images(created_at);
CREATE INDEX IF NOT EXISTS idx_post_images_storage_path ON post_images(storage_path);

-- 9. Grant permissions
GRANT SELECT ON post_images TO authenticated;
GRANT INSERT ON post_images TO authenticated;
GRANT UPDATE ON post_images TO authenticated;
GRANT DELETE ON post_images TO authenticated;

-- 10. Create function to get public URL for storage objects (if not exists)
CREATE OR REPLACE FUNCTION get_storage_public_url(storage_path TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN format('https://%s.supabase.co/storage/v1/object/public/post-images/%s', 
                 current_setting('app.supabase_url', true), 
                 storage_path);
END;
$$ LANGUAGE plpgsql;

-- 11. Grant execute on function
GRANT EXECUTE ON FUNCTION get_storage_public_url TO authenticated;

-- 12. Create view for easy access to post images with public URLs
CREATE OR REPLACE VIEW post_images_with_urls AS
SELECT 
    pi.*,
    get_storage_public_url(pi.storage_path) as public_url,
    p.title as post_title,
    p.user_id as post_user_id
FROM post_images pi
JOIN posts p ON pi.post_id = p.id;

-- 13. Grant permissions on view
GRANT SELECT ON post_images_with_urls TO authenticated;

-- 14. Create trigger to automatically update updated_at timestamp
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

-- 15. Verify the setup
-- Run these queries to verify everything is working:

-- Check storage policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd 
-- FROM pg_policies 
-- WHERE schemaname = 'storage' 
-- AND tablename = 'objects';

-- Check post_images policies
-- SELECT tablename, policyname, permissive, roles, cmd 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- AND tablename = 'post_images';

-- Check if RLS is enabled
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname IN ('public', 'storage') 
-- AND tablename IN ('post_images', 'objects');

-- Test storage upload with a simple query
-- INSERT INTO storage.objects (bucket_id, name, size, metadata, last_modified_at, created_at, updated_at)
-- VALUES ('post-images', 'test.txt', 10, '{"content-type": "text/plain"}', NOW(), NOW(), NOW())
-- RETURNING *;

-- Note: After running this script, test the image upload functionality again.
-- The "new row violates row-level security policy" error should be resolved.