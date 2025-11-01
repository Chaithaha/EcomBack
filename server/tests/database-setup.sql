  -- =============================================
  -- Complete Database Schema for Supabase
  -- =============================================

  -- Enable required extensions
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

  -- =============================================
  -- PROFILES TABLE
  -- =============================================

  -- Drop existing table if it exists
  DROP TABLE IF EXISTS profiles CASCADE;

  -- Create profiles table
  CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- =============================================
  -- POSTS TABLE
  -- =============================================

  -- Drop existing table if it exists
  DROP TABLE IF EXISTS posts CASCADE;

  -- Create posts table
  CREATE TABLE IF NOT EXISTS posts (
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

  -- =============================================
  -- PRODUCTS TABLE
  -- =============================================

  -- Drop existing table if it exists
  DROP TABLE IF EXISTS products CASCADE;

  -- Create products table
  CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- =============================================
  -- ROW LEVEL SECURITY (RLS) POLICIES
  -- =============================================

  -- Enable RLS on all tables
  ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
  ALTER TABLE products ENABLE ROW LEVEL SECURITY;

  -- Profiles table policies
  CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

  CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

  CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

  CREATE POLICY "Admins can update any profile" ON profiles
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

  -- Posts table policies
  CREATE POLICY "Users can view own posts" ON posts
    FOR SELECT USING (auth.uid() = user_id);

  CREATE POLICY "Users can insert own posts" ON posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can update own posts" ON posts
    FOR UPDATE USING (auth.uid() = user_id);

  CREATE POLICY "Users can delete own posts" ON posts
    FOR DELETE USING (auth.uid() = user_id);

  CREATE POLICY "Admins can view all posts" ON posts
    FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

  CREATE POLICY "Admins can update any post" ON posts
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

  CREATE POLICY "Admins can delete any post" ON posts
    FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

  -- Products table policies
  CREATE POLICY "Users can view products" ON products
    FOR SELECT USING (true);

  CREATE POLICY "Admins can insert products" ON products
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');

  CREATE POLICY "Admins can update products" ON products
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

  CREATE POLICY "Admins can delete products" ON products
    FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

  -- =============================================
  -- INDEXES FOR PERFORMANCE OPTIMIZATION
  -- =============================================

  -- Profiles table indexes
  CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
  CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);

  -- Posts table indexes
  CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
  CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
  CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
  CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);

  -- Products table indexes
  CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
  CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
  CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);

  -- =============================================
  -- HELPER FUNCTIONS
  -- =============================================

  -- Function to handle new user signups
  CREATE OR REPLACE FUNCTION handle_new_user()
  RETURNS TRIGGER AS $$
  BEGIN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
      'user'
    );
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  -- Trigger for new user signups
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

  -- Function to update post status with timestamp
  CREATE OR REPLACE FUNCTION update_post_status(
    post_id UUID,
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
    UPDATE posts
    SET status = new_status, updated_at = NOW()
    WHERE id = post_id
    RETURNING id, title, status, updated_at;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  -- =============================================
  -- SAMPLE DATA FOR TESTING
  -- =============================================

  -- Insert sample products (admin required)
  INSERT INTO products (title, description, price, category, image_url) VALUES
  ('Wireless Bluetooth Headphones', 'High-quality wireless headphones with noise cancellation and 30-hour battery life', 99.99, 'electronics', 'https://example.com/headphones.jpg'),
  ('Premium Cotton T-Shirt', 'Comfortable 100% organic cotton t-shirt available in multiple colors', 24.99, 'clothing', 'https://example.com/tshirt.jpg'),
  ('JavaScript Programming Guide', 'Comprehensive guide to modern JavaScript development and best practices', 39.99, 'books', 'https://example.com/book.jpg'),
  ('Stainless Steel Water Bottle', 'Insulated water bottle that keeps drinks cold for 24 hours', 19.99, 'home', 'https://example.com/bottle.jpg'),
  ('Yoga Exercise Mat', 'Non-slip exercise mat perfect for yoga, pilates, and general fitness', 34.99, 'sports', 'https://example.com/yoga-mat.jpg')
  ON CONFLICT (id) DO NOTHING;

  -- =============================================
  -- VALIDATION QUERIES
  -- =============================================

  -- Uncomment these queries to validate the setup after execution

  -- Check tables exist
  -- SELECT table_name 
  -- FROM information_schema.tables 
  -- WHERE table_schema = 'public' 
  -- AND table_type = 'BASE TABLE'
  -- AND table_name IN ('profiles', 'posts', 'products');

  -- Check RLS status
  -- SELECT schemaname, tablename, rowsecurity 
  -- FROM pg_tables 
  -- WHERE schemaname = 'public' 
  -- AND tablename IN ('profiles', 'posts', 'products');

  -- Check policies
  -- SELECT tablename, policyname, permissive, roles, cmd 
  -- FROM pg_policies 
  -- WHERE schemaname = 'public' 
  -- AND tablename IN ('profiles', 'posts', 'products');

  -- Check indexes
  -- SELECT indexname, indexdef 
  -- FROM pg_indexes 
  -- WHERE schemaname = 'public' 
  -- AND tablename IN ('profiles', 'posts', 'products')
  -- ORDER BY tablename, indexname;

  -- Check functions
  -- SELECT routine_name, routine_type 
  -- FROM information_schema.routines 
  -- WHERE routine_schema = 'public' 
  -- AND routine_name IN ('handle_new_user', 'update_post_status');

  -- =============================================
  -- POST IMAGES TABLE
  -- =============================================

  -- Drop existing table if it exists
  DROP TABLE IF EXISTS post_images CASCADE;

  -- Create post_images table
  CREATE TABLE IF NOT EXISTS post_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Index for faster queries
  CREATE INDEX IF NOT EXISTS idx_post_images_post_id ON post_images(post_id);
  CREATE INDEX IF NOT EXISTS idx_post_images_created_at ON post_images(created_at);

  -- =============================================
  -- END OF SCRIPT
  -- =============================================

  -- To execute this script:
  -- 1. Copy the entire content above
  -- 2. Paste into Supabase SQL Editor
  -- 3. Click "Run" to execute
  -- 4. Check the validation queries at the bottom to confirm setup