-- =============================================
-- Database Migration: Posts/Products → Unified Items
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- CREATE UNIFIED ITEMS TABLE
-- =============================================

-- Drop existing items table if it exists (for re-running migration)
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS item_images CASCADE;

-- Create items table (unified replacement for posts and products)
CREATE TABLE IF NOT EXISTS items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'rejected')),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create item_images table (for multi-image support)
CREATE TABLE IF NOT EXISTS item_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  storage_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Items table indexes
CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at);
CREATE INDEX IF NOT EXISTS idx_items_price ON items(price);

-- Item_images table indexes
CREATE INDEX IF NOT EXISTS idx_item_images_item_id ON item_images(item_id);
CREATE INDEX IF NOT EXISTS idx_item_images_created_at ON item_images(created_at);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on items table
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_images ENABLE ROW LEVEL SECURITY;

-- Items table policies
CREATE POLICY "Anyone can view active items" ON items
  FOR SELECT USING (status = 'active');

CREATE POLICY "Users can view own items" ON items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all items" ON items
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can insert own items" ON items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can insert items with auto-approval" ON items
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'admin' AND 
    (status = 'active' OR status = 'pending')
  );

CREATE POLICY "Users can update own items" ON items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any item" ON items
  FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can delete own items" ON items
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any item" ON items
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- Item_images table policies
CREATE POLICY "Anyone can view images for active items" ON item_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM items 
      WHERE items.id = item_images.item_id 
      AND items.status = 'active'
    )
  );

CREATE POLICY "Users can view own item images" ON item_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM items 
      WHERE items.id = item_images.item_id 
      AND items.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all item images" ON item_images
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can insert images for own items" ON item_images
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM items 
      WHERE items.id = item_images.item_id 
      AND items.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert images for any item" ON item_images
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can update own item images" ON item_images
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM items 
      WHERE items.id = item_images.item_id 
      AND items.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update any item images" ON item_images
  FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can delete own item images" ON item_images
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM items 
      WHERE items.id = item_images.item_id 
      AND items.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete any item images" ON item_images
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to handle item creation with admin auto-approval
CREATE OR REPLACE FUNCTION create_item_with_approval(
  item_title TEXT,
  item_price DECIMAL(10,2),
  item_category TEXT,
  item_description TEXT DEFAULT NULL,
  item_user_id UUID DEFAULT NULL,
  item_image_url TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  price DECIMAL(10,2),
  category TEXT,
  status TEXT,
  user_id UUID,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  user_role TEXT;
  item_status TEXT := 'pending';
BEGIN
  -- Get user role if user_id is provided
  IF item_user_id IS NOT NULL THEN
    SELECT role INTO user_role FROM profiles WHERE id = item_user_id;
    
    -- Auto-approve if user is admin
    IF user_role = 'admin' THEN
      item_status := 'active';
    END IF;
  END IF;

  -- Insert the item
  RETURN QUERY
  INSERT INTO items (title, price, category, description, status, user_id, image_url)
  VALUES (item_title, item_price, item_category, item_description, item_status, item_user_id, item_image_url)
  RETURNING id, title, price, category, description, status, user_id, image_url, created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update item status with timestamp
CREATE OR REPLACE FUNCTION update_item_status(
  item_id UUID,
  new_status TEXT
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  status TEXT,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  UPDATE items
  SET status = new_status, updated_at = NOW()
  WHERE id = item_id
  RETURNING id, title, status, updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- VALIDATION QUERIES
-- =============================================

-- Uncomment these queries to validate the setup after execution

-- Check tables exist
-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_type = 'BASE TABLE'
-- AND table_name IN ('items', 'item_images');

-- Check RLS status
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('items', 'item_images');

-- Check policies
-- SELECT tablename, policyname, permissive, roles, cmd 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('items', 'item_images');

-- Check indexes
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('items', 'item_images')
-- ORDER BY tablename, indexname;

-- =============================================
-- END OF MIGRATION SCRIPT
-- =============================================

-- To execute this script:
-- 1. Copy the entire content above
-- 2. Paste into Supabase SQL Editor
-- 3. Click "Run" to execute
-- 4. Run the data migration script next