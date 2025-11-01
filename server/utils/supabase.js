
const { createClient } = require('@supabase/supabase-js');

// Create a function that returns a new Supabase client each time
const getSupabaseClient = () => {
  // Environment variables are already loaded in index.js
  // No need to call dotenv.config() again here
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  
  // Debug logging to track environment variable values
  console.log('Supabase Client Creation Debug:');
  console.log('SUPABASE_URL:', supabaseUrl);
  console.log('SUPABASE_KEY:', supabaseKey ? '***SET***' : '***NOT SET***');
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL and Key must be set in environment variables');
  }
  
  return createClient(supabaseUrl, supabaseKey);
};

// Create a function that returns a new Supabase service client each time
const getSupabaseServiceClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  // Debug logging to track environment variable values
  console.log('Supabase Service Client Creation Debug:');
  console.log('SUPABASE_URL:', supabaseUrl);
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceRoleKey ? '***SET***' : '***NOT SET***');
  
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Supabase URL and Service Role Key must be set in environment variables');
  }
  
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

// Export both functions for backward compatibility
module.exports = { getSupabaseClient, getSupabaseServiceClient };
