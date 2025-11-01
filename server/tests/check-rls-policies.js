const { createClient } = require('@supabase/supabase-js');

// Use the service role key to check RLS policies
const supabaseUrl = 'https://ckoybdoellolyxqjkoil.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrb3liZG9lbGxvbHl4cWprb2lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MDQzNjcsImV4cCI6MjA3NTI4MDM2N30.T8S27COehsYT5v2GrqJNQe5HKL2dvjqIHUEhwWZLUtw';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkRLSPolicies() {
  try {
    console.log('Checking RLS policies...');
    
    // Check RLS status for profiles table
    const { data: rlsStatus, error: rlsError } = await supabase
      .from('pg_tables')
      .select('schemaname, tablename, rowsecurity')
      .eq('schemaname', 'public')
      .eq('tablename', 'profiles');
    
    if (rlsError) {
      console.error('Error checking RLS status:', rlsError);
    } else {
      console.log('RLS status for profiles table:', rlsStatus);
    }
    
    // Check policies for profiles table
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('schemaname', 'public')
      .eq('tablename', 'profiles');
    
    if (policiesError) {
      console.error('Error checking policies:', policiesError);
    } else {
      console.log('Current policies for profiles table:', policies);
    }
    
    // Try to insert a profile with service role key (should work if policies are correct)
    console.log('\nTesting profile creation with service role key...');
    
    const testUserId = '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: testUserId,
        full_name: 'Service Role Test User',
        role: 'user'
      })
      .select()
      .single();
    
    if (insertError) {
      console.log('Profile creation failed even with service role key:', insertError);
      
      // Check if the profile already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', testUserId)
        .single();
        
      if (existingProfile) {
        console.log('Profile already exists:', existingProfile);
      }
    } else {
      console.log('Profile creation succeeded with service role key:', newProfile);
    }
    
  } catch (err) {
    console.error('Error:', err);
  }
}

checkRLSPolicies();