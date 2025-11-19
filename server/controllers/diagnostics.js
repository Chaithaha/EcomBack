const { getSupabaseServiceClient } = require('../utils/supabase');

const createDiagnosticReport = async (req, res) => {
    try {
        const { product_id, hardware_tests, battery_health, performance_score, overall_condition, notes } = req.body;
        const user_id = req.user.id;

        console.log('Creating diagnostic report for product:', product_id);

        const supabase = getSupabaseServiceClient();

        const { data, error } = await supabase
            .from('diagnostic_reports')
            .insert([{
                product_id,
                user_id,
                hardware_tests,
                battery_health,
                performance_score,
                overall_condition,
                notes,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) {
            console.error('Supabase error:', error);
            return res.status(400).json({ error: error.message });
        }

        console.log('Successfully created diagnostic report:', data);
        res.status(201).json(data);
    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getDiagnosticReportsByProduct = async (req, res) => {
    try {
        const { product_id } = req.params;

        console.log('Fetching diagnostic reports for product:', product_id);

        const supabase = getSupabaseServiceClient();

        const { data, error } = await supabase
            .from('diagnostic_reports')
            .select(`
                *,
                users (
                    username,
                    email
                )
            `)
            .eq('product_id', product_id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase error:', error);
            return res.status(400).json({ error: error.message });
        }

        console.log('Successfully fetched diagnostic reports:', data);
        res.json(data);
    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getDiagnosticReportById = async (req, res) => {
    try {
        const { id } = req.params;

        console.log('Fetching diagnostic report with ID:', id);

        const supabase = getSupabaseServiceClient();

        const { data, error } = await supabase
            .from('diagnostic_reports')
            .select(`
                *,
                users (
                    username,
                    email
                ),
                products (
                    name,
                    brand,
                    model
                )
            `)
            .eq('id', id)
            .single();

        if (error) {
            console.error('Supabase error:', error);
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Diagnostic report not found' });
            }
            return res.status(400).json({ error: error.message });
        }

        if (!data) {
            return res.status(404).json({ error: 'Diagnostic report not found' });
        }

        console.log('Successfully fetched diagnostic report:', data);
        res.json(data);
    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateDiagnosticReport = async (req, res) => {
    try {
        const { id } = req.params;
        const { hardware_tests, battery_health, performance_score, overall_condition, notes } = req.body;
        const user_id = req.user.id;

        console.log('Updating diagnostic report with ID:', id);

        const supabase = getSupabaseServiceClient();

        const { data, error } = await supabase
            .from('diagnostic_reports')
            .update({
                hardware_tests,
                battery_health,
                performance_score,
                overall_condition,
                notes,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('user_id', user_id)
            .select()
            .single();

        if (error) {
            console.error('Supabase error:', error);
            return res.status(400).json({ error: error.message });
        }

        console.log('Successfully updated diagnostic report:', data);
        res.json(data);
    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const deleteDiagnosticReport = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user.id;

        console.log('Deleting diagnostic report with ID:', id);

        const supabase = getSupabaseServiceClient();

        const { error } = await supabase
            .from('diagnostic_reports')
            .delete()
            .eq('id', id)
            .eq('user_id', user_id);

        if (error) {
            console.error('Supabase error:', error);
            return res.status(400).json({ error: error.message });
        }

        console.log('Successfully deleted diagnostic report');
        res.status(204).send();
    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    createDiagnosticReport,
    getDiagnosticReportsByProduct,
    getDiagnosticReportById,
    updateDiagnosticReport,
    deleteDiagnosticReport
};