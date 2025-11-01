
const { getSupabaseServiceClient } = require('../utils/supabase');

const getProducts = async (req, res) => {
    try {
        console.log('Attempting to fetch products from Supabase...');
        console.log('Supabase URL:', process.env.SUPABASE_URL);
        console.log('Supabase Key (first 20 chars):', process.env.SUPABASE_KEY ? process.env.SUPABASE_KEY.substring(0, 20) + '...' : 'undefined');
        
        // Create a fresh Supabase client each time
        const supabase = getSupabaseServiceClient();
        
        const { data, error } = await supabase
            .from('products')
            .select('*');
            
        if (error) {
            console.error('Supabase error:', error);
            return res.status(400).json({ error: error.message });
        }
        
        console.log('Successfully fetched products:', data);
        res.json(data);
    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`Fetching product with ID: ${id}`);
        
        // Create a fresh Supabase client each time
        const supabase = getSupabaseServiceClient();
        
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single();
            
        if (error) {
            console.error('Supabase error:', error);
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Product not found' });
            }
            return res.status(400).json({ error: error.message });
        }
        
        if (!data) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        console.log('Successfully fetched product:', data);
        res.json(data);
    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { getProducts, getProductById };
