-- Phase 1 Database Schema Updates for ForOranges Refurbished Electronics Marketplace
-- This script adds the necessary tables for diagnostic reports and market value analysis

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create diagnostic_reports table
CREATE TABLE IF NOT EXISTS diagnostic_reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hardware_tests JSONB DEFAULT '{}',
    battery_health INTEGER DEFAULT 100 CHECK (battery_health >= 0 AND battery_health <= 100),
    performance_score INTEGER DEFAULT 100 CHECK (performance_score >= 0 AND performance_score <= 100),
    overall_condition VARCHAR(20) DEFAULT 'good' CHECK (overall_condition IN ('excellent', 'good', 'fair', 'poor')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create market_data table for storing market reference data
CREATE TABLE IF NOT EXISTS market_data (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100),
    market_price DECIMAL(10,2) NOT NULL,
    source VARCHAR(100),
    condition VARCHAR(20) DEFAULT 'refurbished' CHECK (condition IN ('new', 'refurbished', 'used')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create market_analysis table for storing calculated market values
CREATE TABLE IF NOT EXISTS market_analysis (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    calculated_value DECIMAL(10,2) NOT NULL,
    confidence_score DECIMAL(5,2) DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1),
    market_average DECIMAL(10,2),
    condition_multiplier DECIMAL(5,2) DEFAULT 1.0,
    price_breakdown JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_diagnostic_reports_product_id ON diagnostic_reports(product_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_reports_user_id ON diagnostic_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_reports_created_at ON diagnostic_reports(created_at);

CREATE INDEX IF NOT EXISTS idx_market_data_category ON market_data(category);
CREATE INDEX IF NOT EXISTS idx_market_data_brand ON market_data(brand);
CREATE INDEX IF NOT EXISTS idx_market_data_created_at ON market_data(created_at);

CREATE INDEX IF NOT EXISTS idx_market_analysis_product_id ON market_analysis(product_id);
CREATE INDEX IF NOT EXISTS idx_market_analysis_created_at ON market_analysis(created_at);

-- Create updated_at trigger function for diagnostic_reports
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for diagnostic_reports
DROP TRIGGER IF EXISTS update_diagnostic_reports_updated_at ON diagnostic_reports;
CREATE TRIGGER update_diagnostic_reports_updated_at
    BEFORE UPDATE ON diagnostic_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample market data for common refurbished electronics categories
INSERT INTO market_data (category, brand, model, market_price, source, condition) VALUES
-- Smartphones
('Smartphone', 'Apple', 'iPhone 12', 499.99, 'refurbished_market', 'refurbished'),
('Smartphone', 'Apple', 'iPhone 12 Pro', 649.99, 'refurbished_market', 'refurbished'),
('Smartphone', 'Apple', 'iPhone 11', 399.99, 'refurbished_market', 'refurbished'),
('Smartphone', 'Samsung', 'Galaxy S21', 549.99, 'refurbished_market', 'refurbished'),
('Smartphone', 'Samsung', 'Galaxy S20', 429.99, 'refurbished_market', 'refurbished'),
('Smartphone', 'Google', 'Pixel 6', 449.99, 'refurbished_market', 'refurbished'),
('Smartphone', 'Google', 'Pixel 5', 349.99, 'refurbished_market', 'refurbished'),

-- Laptops
('Laptop', 'Apple', 'MacBook Air M1', 899.99, 'refurbished_market', 'refurbished'),
('Laptop', 'Apple', 'MacBook Pro 13"', 1099.99, 'refurbished_market', 'refurbished'),
('Laptop', 'Dell', 'XPS 13', 799.99, 'refurbished_market', 'refurbished'),
('Laptop', 'Lenovo', 'ThinkPad X1 Carbon', 849.99, 'refurbished_market', 'refurbished'),
('Laptop', 'HP', 'Spectre x360', 749.99, 'refurbished_market', 'refurbished'),

-- Tablets
('Tablet', 'Apple', 'iPad Pro 11"', 649.99, 'refurbished_market', 'refurbished'),
('Tablet', 'Apple', 'iPad Air', 499.99, 'refurbished_market', 'refurbished'),
('Tablet', 'Samsung', 'Galaxy Tab S7', 549.99, 'refurbished_market', 'refurbished'),
('Tablet', 'Microsoft', 'Surface Pro 7', 699.99, 'refurbished_market', 'refurbished'),

-- Smartwatches
('Smartwatch', 'Apple', 'Apple Watch Series 6', 299.99, 'refurbished_market', 'refurbished'),
('Smartwatch', 'Apple', 'Apple Watch SE', 199.99, 'refurbished_market', 'refurbished'),
('Smartwatch', 'Samsung', 'Galaxy Watch 4', 249.99, 'refurbished_market', 'refurbished'),

-- Headphones
('Headphones', 'Apple', 'AirPods Pro', 179.99, 'refurbished_market', 'refurbished'),
('Headphones', 'Sony', 'WH-1000XM4', 279.99, 'refurbished_market', 'refurbished'),
('Headphones', 'Bose', 'QuietComfort 45', 249.99, 'refurbished_market', 'refurbished'),

-- Gaming
('Gaming Console', 'Sony', 'PlayStation 5', 499.99, 'refurbished_market', 'refurbished'),
('Gaming Console', 'Microsoft', 'Xbox Series X', 479.99, 'refurbished_market', 'refurbished'),
('Gaming Console', 'Nintendo', 'Switch', 249.99, 'refurbished_market', 'refurbished');

-- Create RLS (Row Level Security) policies for diagnostic_reports
ALTER TABLE diagnostic_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all diagnostic reports
CREATE POLICY "Users can view diagnostic reports" ON diagnostic_reports
    FOR SELECT USING (true);

-- Policy: Users can insert their own diagnostic reports
CREATE POLICY "Users can insert own diagnostic reports" ON diagnostic_reports
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Policy: Users can update their own diagnostic reports
CREATE POLICY "Users can update own diagnostic reports" ON diagnostic_reports
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Policy: Users can delete their own diagnostic reports
CREATE POLICY "Users can delete own diagnostic reports" ON diagnostic_reports
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- Create RLS policies for market_analysis
ALTER TABLE market_analysis ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view market analysis
CREATE POLICY "Everyone can view market analysis" ON market_analysis
    FOR SELECT USING (true);

-- Create RLS policies for market_data
ALTER TABLE market_data ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view market data
CREATE POLICY "Everyone can view market data" ON market_data
    FOR SELECT USING (true);

-- Policy: Authenticated users can insert market data (admin functionality)
CREATE POLICY "Authenticated users can insert market data" ON market_data
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON diagnostic_reports TO authenticated;
GRANT ALL ON market_data TO authenticated;
GRANT ALL ON market_analysis TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE diagnostic_reports IS 'Stores hardware diagnostic reports for refurbished electronics';
COMMENT ON TABLE market_data IS 'Stores market reference data for price analysis';
COMMENT ON TABLE market_analysis IS 'Stores calculated market value analysis results';

COMMENT ON COLUMN diagnostic_reports.hardware_tests IS 'JSON object containing results of various hardware tests';
COMMENT ON COLUMN diagnostic_reports.battery_health IS 'Battery health percentage (0-100)';
COMMENT ON COLUMN diagnostic_reports.performance_score IS 'Overall performance score (0-100)';
COMMENT ON COLUMN diagnostic_reports.overall_condition IS 'Overall condition assessment (excellent, good, fair, poor)';

COMMENT ON COLUMN market_data.market_price IS 'Reference market price for comparison';
COMMENT ON COLUMN market_data.source IS 'Source of the market data';
COMMENT ON COLUMN market_data.condition IS 'Condition of the reference item';

COMMENT ON COLUMN market_analysis.calculated_value IS 'Final calculated market value';
COMMENT ON COLUMN market_analysis.confidence_score IS 'Confidence score for the calculation (0-1)';
COMMENT ON COLUMN market_analysis.condition_multiplier IS 'Multiplier applied based on product condition';
COMMENT ON COLUMN market_analysis.price_breakdown IS 'JSON object containing detailed price breakdown';