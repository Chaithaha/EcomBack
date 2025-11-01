-- Supabase Storage Setup for Image Uploads

-- 1. Create Storage Bucket for Post Images
-- This should be done through the Supabase Dashboard:
-- Storage → New bucket → Name: "post-images" → Public: true

-- 2. Create RLS Policy for Public Access to Storage
-- Allow public read access to all images in the post-images bucket
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'post-images');

-- 3. Create post_images table for metadata
CREATE TABLE IF NOT EXISTS post_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
    storage_path TEXT NOT NULL,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_post_images_post_id ON post_images(post_id);
CREATE INDEX IF NOT EXISTS idx_post_images_created_at ON post_images(created_at);
CREATE INDEX IF NOT EXISTS idx_post_images_storage_path ON post_images(storage_path);

-- 5. Enable RLS on post_images table
ALTER TABLE post_images ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies for post_images table

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

-- 7. Create function to automatically update post with primary image
CREATE OR REPLACE FUNCTION update_post_primary_image()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the post with the first uploaded image as primary
    UPDATE posts 
    SET image_url = storage.public_url || storage.path
    FROM (
        SELECT storage_path, 
               storage.folder || '/' || storage.name || storage.extension AS path
        FROM storage.objects 
        WHERE bucket_id = 'post-images' 
        AND storage_path = NEW.storage_path
        LIMIT 1
    ) AS storage
    WHERE posts.id = NEW.post_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger to automatically update post when image is uploaded
CREATE TRIGGER on_post_image_insert
    AFTER INSERT ON post_images
    FOR EACH ROW
    EXECUTE FUNCTION update_post_primary_image();

-- 9. Create function to get public URL for storage objects
CREATE OR REPLACE FUNCTION get_storage_public_url(storage_path TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN format('https://%s.supabase.co/storage/v1/object/public/post-images/%s', 
                 current_setting('app.supabase_url', true), 
                 storage_path);
END;
$$ LANGUAGE plpgsql;

-- 10. Create view for easy access to post images with public URLs
CREATE OR REPLACE VIEW post_images_with_urls AS
SELECT 
    pi.*,
    get_storage_public_url(pi.storage_path) as public_url,
    p.title as post_title,
    p.user_id as post_user_id
FROM post_images pi
JOIN posts p ON pi.post_id = p.id;

-- 11. Grant permissions
GRANT SELECT ON post_images TO authenticated;
GRANT INSERT ON post_images TO authenticated;
GRANT UPDATE ON post_images TO authenticated;
GRANT DELETE ON post_images TO authenticated;

-- 12. Grant permissions on view
GRANT SELECT ON post_images_with_urls TO authenticated;

-- 13. Create sample data for testing (optional)
-- Uncomment the following lines to insert sample test data

-- Insert a test post (you'll need to replace the user_id with a real user ID)
/*
INSERT INTO posts (title, description, price, category, user_id) VALUES
('Test Post with Images', 'This is a test post for image upload functionality', 25.99, 'Electronics', 'USER_ID_HERE')
RETURNING id;
*/

-- Note: The actual image files need to be uploaded through the API
-- This SQL script only sets up the database structure and policies

-- 14. Create function to clean up orphaned storage objects
CREATE OR REPLACE FUNCTION cleanup_orphaned_storage_objects()
RETURNS void AS $$
BEGIN
    -- Delete storage objects that don't have corresponding database records
    DELETE FROM storage.objects 
    WHERE bucket_id = 'post-images' 
    AND name NOT IN (
        SELECT filename FROM post_images
    );
END;
$$ LANGUAGE plpgsql;

-- 15. Create function to validate image uploads
CREATE OR REPLACE FUNCTION validate_image_upload(file_size BIGINT, mime_type TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Check file size (5MB limit)
    IF file_size > 5 * 1024 * 1024 THEN
        RETURN 'File size exceeds 5MB limit';
    END IF;
    
    -- Check mime type
    IF mime_type NOT IN ('image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp') THEN
        RETURN 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed';
    END IF;
    
    RETURN NULL; -- No errors
END;
$$ LANGUAGE plpgsql;

-- 16. Create function to compress image metadata
CREATE OR REPLACE FUNCTION compress_image_metadata()
RETURNS TRIGGER AS $$
BEGIN
    -- Compress filename if it's too long
    IF LENGTH(NEW.filename) > 100 THEN
        NEW.filename := substr(NEW.filename, 1, 50) || '_' || substr(md5(NEW.filename), 1, 8) || substr(NEW.filename, -4);
    END IF;
    
    -- Update timestamp
    NEW.updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 17. Create trigger for metadata compression
CREATE TRIGGER on_post_image_metadata_compression
    BEFORE INSERT OR UPDATE ON post_images
    FOR EACH ROW
    EXECUTE FUNCTION compress_image_metadata();

-- 18. Create function to get image statistics
CREATE OR REPLACE FUNCTION get_image_stats(post_id UUID)
RETURNS TABLE(
    total_images BIGINT,
    total_size BIGINT,
    average_size BIGINT,
    file_types TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT,
        COALESCE(SUM(file_size), 0)::BIGINT,
        COALESCE(AVG(file_size), 0)::BIGINT,
        ARRAY_AGG(DISTINCT mime_type)
    FROM post_images 
    WHERE post_id = $1;
END;
$$ LANGUAGE plpgsql;

-- 19. Grant execute on functions
GRANT EXECUTE ON FUNCTION get_storage_public_url TO authenticated;
GRANT EXECUTE ON FUNCTION validate_image_upload TO authenticated;
GRANT EXECUTE ON FUNCTION get_image_stats TO authenticated;

-- 20. Create comment for the table
COMMENT ON TABLE post_images IS 'Stores metadata for uploaded post images in Supabase Storage';

-- 21. Create comments for columns
COMMENT ON COLUMN post_images.storage_path IS 'Path to the image in Supabase Storage';
COMMENT ON COLUMN post_images.filename IS 'Generated filename for the stored image';
COMMENT ON COLUMN post_images.original_filename IS 'Original filename as uploaded by user';
COMMENT ON COLUMN post_images.file_size IS 'Size of the image in bytes';
COMMENT ON COLUMN post_images.mime_type IS 'MIME type of the image';

-- End of setup script