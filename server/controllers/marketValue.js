const { getSupabaseServiceClient } = require('../utils/supabase');

const calculateMarketValue = async (req, res) => {
    try {
        const { product_id } = req.params;

        console.log('Calculating market value for product:', product_id);

        const supabase = getSupabaseServiceClient();

        // Get product details
        const { data: product, error: productError } = await supabase
            .from('products')
            .select('*')
            .eq('id', product_id)
            .single();

        if (productError) {
            console.error('Product error:', productError);
            return res.status(404).json({ error: 'Product not found' });
        }

        // Get diagnostic reports for this product
        const { data: diagnostics, error: diagError } = await supabase
            .from('diagnostic_reports')
            .select('*')
            .eq('product_id', product_id)
            .order('created_at', { ascending: false })
            .limit(1);

        if (diagError) {
            console.error('Diagnostics error:', diagError);
            // Continue without diagnostics data
        }

        // Get market data for similar products
        const { data: marketData, error: marketError } = await supabase
            .from('market_data')
            .select('*')
            .eq('category', product.category)
            .eq('brand', product.brand)
            .order('created_at', { ascending: false })
            .limit(10);

        if (marketError) {
            console.error('Market data error:', marketError);
            // Continue without market data
        }

        // Calculate base market value
        let baseMarketValue = product.price || 0;
        let marketAverage = 0;
        let marketRange = { min: 0, max: 0 };

        if (marketData && marketData.length > 0) {
            marketAverage = marketData.reduce((sum, item) => sum + item.market_price, 0) / marketData.length;
            marketRange.min = Math.min(...marketData.map(item => item.market_price));
            marketRange.max = Math.max(...marketData.map(item => item.market_price));
            baseMarketValue = marketAverage;
        }

        // Calculate condition multiplier based on diagnostics
        let conditionMultiplier = 1.0;
        let diagnosticScore = 100;

        if (diagnostics && diagnostics.length > 0) {
            const latestDiag = diagnostics[0];
            diagnosticScore = latestDiag.performance_score;

            // Adjust multiplier based on condition
            switch (latestDiag.overall_condition) {
                case 'excellent':
                    conditionMultiplier = 1.1;
                    break;
                case 'good':
                    conditionMultiplier = 1.0;
                    break;
                case 'fair':
                    conditionMultiplier = 0.85;
                    break;
                case 'poor':
                    conditionMultiplier = 0.7;
                    break;
            }

            // Further adjust based on battery health
            const batteryMultiplier = latestDiag.battery_health / 100;
            conditionMultiplier *= Math.max(0.5, batteryMultiplier);
        }

        // Calculate final market value
        const calculatedValue = baseMarketValue * conditionMultiplier;

        // Calculate price confidence (based on data availability)
        let confidence = 0.5; // Default confidence
        if (marketData && marketData.length > 0) {
            confidence = Math.min(0.9, 0.5 + (marketData.length * 0.05));
        }
        if (diagnostics && diagnostics.length > 0) {
            confidence += 0.2;
        }

        // Generate price breakdown
        const priceBreakdown = {
            baseMarketValue: Math.round(baseMarketValue),
            conditionAdjustment: Math.round(baseMarketValue * (conditionMultiplier - 1)),
            finalValue: Math.round(calculatedValue),
            marketAverage: Math.round(marketAverage),
            marketRange: {
                min: Math.round(marketRange.min),
                max: Math.round(marketRange.max)
            },
            confidence: Math.round(confidence * 100),
            factors: {
                condition: conditionMultiplier,
                batteryHealth: diagnostics && diagnostics.length > 0 ? diagnostics[0].battery_health : null,
                performanceScore: diagnosticScore
            }
        };

        // Store the analysis result
        const { data: analysis, error: analysisError } = await supabase
            .from('market_analysis')
            .insert([{
                product_id,
                calculated_value: calculatedValue,
                confidence_score: confidence,
                market_average: marketAverage,
                condition_multiplier: conditionMultiplier,
                price_breakdown: priceBreakdown,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (analysisError) {
            console.error('Analysis storage error:', analysisError);
            // Continue even if storage fails
        }

        console.log('Successfully calculated market value:', priceBreakdown);
        res.json(priceBreakdown);
    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getMarketData = async (req, res) => {
    try {
        const { category, brand } = req.query;

        console.log('Fetching market data for:', { category, brand });

        const supabase = getSupabaseServiceClient();

        let query = supabase
            .from('market_data')
            .select('*')
            .order('created_at', { ascending: false });

        if (category) {
            query = query.eq('category', category);
        }

        if (brand) {
            query = query.eq('brand', brand);
        }

        const { data, error } = await query.limit(50);

        if (error) {
            console.error('Supabase error:', error);
            return res.status(400).json({ error: error.message });
        }

        console.log('Successfully fetched market data:', data?.length || 0, 'records');
        res.json(data || []);
    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const addMarketData = async (req, res) => {
    try {
        const { category, brand, model, market_price, source, condition } = req.body;

        console.log('Adding market data:', { category, brand, model });

        const supabase = getSupabaseServiceClient();

        const { data, error } = await supabase
            .from('market_data')
            .insert([{
                category,
                brand,
                model,
                market_price,
                source,
                condition,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) {
            console.error('Supabase error:', error);
            return res.status(400).json({ error: error.message });
        }

        console.log('Successfully added market data:', data);
        res.status(201).json(data);
    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getProductAnalysis = async (req, res) => {
    try {
        const { product_id } = req.params;

        console.log('Fetching market analysis for product:', product_id);

        const supabase = getSupabaseServiceClient();

        const { data, error } = await supabase
            .from('market_analysis')
            .select('*')
            .eq('product_id', product_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Market analysis not found' });
            }
            console.error('Supabase error:', error);
            return res.status(400).json({ error: error.message });
        }

        console.log('Successfully fetched market analysis:', data);
        res.json(data);
    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    calculateMarketValue,
    getMarketData,
    addMarketData,
    getProductAnalysis
};