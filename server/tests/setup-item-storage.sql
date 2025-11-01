-- Supabase Storage Setup for Item Images (Unified System)

-- 1. Create Storage Bucket for Item Images
-- This should be done through the Supabase Dashboard:
-- Storage → New bucket → Name: "item-images" → Public: true

-- 2. Create RLS Policy for Public Access to Storage
-- Allow public read access to all images in the item-images bucket
CREATE POLICY IF NOT EXISTS "Public Access to Item Images" ON storage.objects
FOR SELECT USING (bucket_id = 'item-images');

-- 3. Create item_images table for metadata (already exists in migration script)
-- This is included for completeness - the table should already exist from migrate-to-items.sql

-- 4. Create indexes for better performance (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_item_images_item_id ON item_images(item_id);
CREATE INDEX IF NOT EXISTS idx_item_images_created_at ON item_images(created_at);
CREATE INDEX IF NOT EXISTS idx_item_images_storage_path ON item_images(storage_path);

-- 5. Enable RLS on item_images table (if not already enabled)
ALTER TABLE item_images ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies for item_images table

-- Allow anyone to view images for active items
CREATE POLICY IF NOT EXISTS "Public can view images for active items" ON item_images
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM items 
    WHERE items.id = item_images.item_id 
    AND items.status = 'active'
  )
);

-- Allow authenticated users to view images for their own items
CREATE POLICY IF NOT EXISTS "Users can view own item images" ON item_images
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM items 
    WHERE items.id = item_images.item_id 
    AND items.user_id = auth.uid()
  )
);

-- Allow authenticated users to insert images for their own items
CREATE POLICY IF NOT EXISTS "Users can insert images for own items" ON item_images
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM items 
    WHERE items.id = item_images.item_id 
    AND items.user_id = auth.uid()
  )
);

-- Allow admins to insert images for any item
CREATE POLICY IF NOT EXISTS "Admins can insert images for any item" ON item_images
FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Allow authenticated users to update their own item images
CREATE POLICY IF NOT EXISTS "Users can update own item images" ON item_images
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM items 
    WHERE items.id = item_images.item_id 
    AND items.user_id = auth.uid()
  )
);

-- Allow admins to update any item images
CREATE POLICY IF NOT EXISTS "Admins can update any item images" ON item_images
FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

-- Allow authenticated users to delete their own item images
CREATE POLICY IF NOT EXISTS "Users can delete own item images" ON item_images
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM items 
    WHERE items.id = item_images.item_id 
    AND items.user_id = auth.uid()
  )
);

-- Allow admins to delete any item images
CREATE POLICY IF NOT EXISTS "Admins can delete any item images" ON item_images
FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- 7. Create function to automatically update item with primary image
CREATE OR REPLACE FUNCTION update_item_primary_image()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the item with the first uploaded image as primary
    UPDATE items 
    SET image_url = (
        SELECT image_url 
        FROM item_images 
        WHERE item_id = NEW.item_id 
        ORDER BY created_at ASC 
        LIMIT 1
    )
    WHERE items.id = NEW.item_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create trigger to automatically update item when image is uploaded
CREATE TRIGGER IF NOT EXISTS on_item_image_insert
    AFTER INSERT OR UPDATE ON item_images
    FOR EACH ROW
    EXECUTE FUNCTION update_item_primary_image();

-- 9. Create function to get public URL for storage objects
CREATE OR REPLACE FUNCTION get_item_storage_public_url(storage_path TEXT)
RETURNS TEXT AS $$
BEGIN
    -- This will be handled by Supabase's built-in URL generation
    -- The actual URL format is: https://[project-ref].supabase.co/storage/v1/object/public/item-images/[storage-path]
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 10. Create view for easy access to item images with public URLs
CREATE OR REPLACE VIEW item_images_with_urls AS
SELECT 
    ii.*,
    i.title as item_title,
    i.user_id as item_user_id,
    i.status as item_status
FROM item_images ii
JOIN items i ON ii.item_id = i.id;

-- 11. Grant permissions
GRANT SELECT ON item_images TO authenticated;
GRANT INSERT ON item_images TO authenticated;
GRANT UPDATE ON item_images TO authenticated;
GRANT DELETE ON item_images TO authenticated;

-- 12. Grant permissions on view
GRANT SELECT ON item_images_with_urls TO authenticated;

-- 13. Create function to clean up orphaned storage objects
CREATE OR REPLACE FUNCTION cleanup_orphaned_item_storage_objects()
RETURNS void AS $$
BEGIN
    -- Delete storage objects that don't have corresponding database records
    -- Note: This requires the storage.objects table to be accessible
    -- You may need to adjust this based on your Supabase setup
    DELETE FROM storage.objects 
    WHERE bucket_id = 'item-images' 
    AND name NOT IN (
        SELECT filename FROM item_images
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Create function to validate image uploads
CREATE OR REPLACE FUNCTION validate_item_image_upload(file_size BIGINT, mime_type TEXT)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Create function to get image statistics for an item
CREATE OR REPLACE FUNCTION get_item_image_stats(item_id UUID)
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
    FROM item_images 
    WHERE item_id = $1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16. Grant execute on functions
GRANT EXECUTE ON FUNCTION validate_item_image_upload TO authenticated;
GRANT EXECUTE ON FUNCTION get_item_image_stats TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_orphaned_item_storage_objects TO authenticated;

-- 17. Create comments for documentation
COMMENT ON TABLE item_images IS 'Stores metadata for uploaded item images in Supabase Storage';
COMMENT ON COLUMN item_images.storage_path IS 'Path to the image in Supabase Storage bucket';
COMMENT ON COLUMN item_images.filename IS 'Generated filename for the stored image';
COMMENT ON COLUMN item_images.original_filename IS 'Original filename as uploaded by user';
COMMENT ON COLUMN item_images.file_size IS 'Size of the image in bytes';
COMMENT ON COLUMN item_images.mime_type IS 'MIME type of the image';

-- 18. Create sample data for testing (optional)
-- Uncomment the following lines to insert sample test data
-- You'll need to replace the user_id with a real user ID from your auth.users table

/*
-- Insert a test item (replace USER_ID_HERE with a real user ID)
INSERT INTO items (title, description, price, category, user_id, status) VALUES
('Test Item with Images', 'This is a test item for image upload functionality', 25.99, 'Electronics', 'USER_ID_HERE', 'active')
RETURNING id;

-- After getting the item ID from the above insert, you can add sample image metadata
-- Replace ITEM_ID_HERE with the actual item ID returned
INSERT INTO item_images (item_id, storage_path, filename, original_filename, file_size, mime_type, image_url) VALUES
('ITEM_ID_HERE', 'ITEM_ID_HERE/test-image-1.jpg', 'test-image-1.jpg', 'original-test-image.jpg', 1024000, 'image/jpeg', 'https://your-project.supabase.co/storage/v1/object/public/item-images/ITEM_ID_HERE/test-image-1.jpg');
*/

-- End of setup script

-- IMPORTANT: After running this SQL script, you need to:
-- 1. Create the "item-images" bucket in Supabase Dashboard (Storage → New bucket)
-- 2. Set the bucket to public
-- 3. Upload some test images or use the API to upload images
-- 4. Test the image loading functionality