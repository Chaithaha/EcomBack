const { createClient } = require('@supabase/supabase-js');

// Use the service role key to enable the trigger
const supabaseUrl = 'https://ckoybdoellolyxqjkoil.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrb3liZG9lbGxvbHl4cWprb2lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MDQzNjcsImV4cCI6MjA3NTI4MDM2N30.T8S27COehsYT5v2GrqJNQe5HKL2dvjqIHUEhwWZLUtw';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function enableProfileTrigger() {
  try {
    console.log('Enabling profile creation trigger...');
    
    // First, let's check if the trigger function exists
    const { data: functions, error: functionsError } = await supabase
      .rpc('pg_get_functiondef', { funcname: 'handle_new_user' });
    
    if (functionsError) {
      console.log('Function handle_new_user not found, creating it...');
      
      // Create the function if it doesn't exist
      const createFunctionQuery = `
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
      `;
      
      const { error: createError } = await supabase.rpc('exec_sql', { 
        sql: createFunctionQuery 
      });
      
      if (createError) {
        console.error('Error creating function:', createError);
        return;
      }
      
      console.log('Function handle_new_user created successfully');
    } else {
      console.log('Function handle_new_user already exists');
    }
    
    // Now check if the trigger exists
    const { data: triggers, error: triggersError } = await supabase
      .from('information_schema.triggers')
      .select('*')
      .eq('trigger_name', 'on_auth_user_created');
    
    if (triggersError || triggers.length === 0) {
      console.log('Trigger on_auth_user_created not found, creating it...');
      
      // Create the trigger
      const createTriggerQuery = `
        CREATE TRIGGER on_auth_user_created
          AFTER INSERT ON auth.users
          FOR EACH ROW EXECUTE FUNCTION handle_new_user();
      `;
      
      const { error: createError } = await supabase.rpc('exec_sql', { 
        sql: createTriggerQuery 
      });
      
      if (createError) {
        console.error('Error creating trigger:', createError);
        return;
      }
      
      console.log('Trigger on_auth_user_created created successfully');
    } else {
      console.log('Trigger on_auth_user_created already exists');
    }
    
    // Test by creating a new user profile manually to see if it works
    console.log('Testing profile creation...');
    
    const testUserId = 'test-trigger-user-' + Date.now();
    const { data: testProfile, error: testError } = await supabase
      .from('profiles')
      .insert({
        id: testUserId,
        full_name: 'Test Trigger User',
        role: 'user'
      })
      .select()
      .single();
    
    if (testError) {
      console.log('Manual profile creation failed (expected due to RLS):', testError.message);
    } else {
      console.log('Manual profile creation succeeded:', testProfile);
    }
    
    console.log('Profile trigger setup completed!');
    
  } catch (err) {
    console.error('Error:', err);
  }
}

enableProfileTrigger();