const { createClient } = require('@supabase/supabase-js');

// Use the service role key to check user profiles
const supabaseUrl = 'https://ckoybdoellolyxqjkoil.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrb3liZG9lbGxvbHl4cWprb2lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MDQzNjcsImV4cCI6MjA3NTI4MDM2N30.T8S27COehsYT5v2GrqJNQe5HKL2dvjqIHUEhwWZLUtw';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkUserProfile() {
  try {
    console.log('Checking user profiles in the database...');
    
    // Check if the profiles table exists and has data
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(10);
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return;
    }
    
    console.log('Found profiles:', profiles);
    
    // Check if our test user has a profile
    const testUserId = '2f7abc57-b529-4b42-85d3-744b3bb8dc27';
    const { data: testProfile, error: testProfileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', testUserId)
      .single();
    
    if (testProfileError) {
      console.error('Test user profile not found:', testProfileError);
      console.log('This means the trigger for profile creation might not have fired');
    } else {
      console.log('Test user profile found:', testProfile);
    }
    
    // Check auth.users table
    const { data: authUsers, error: authUsersError } = await supabase.auth.admin.listUsers();
    
    if (authUsersError) {
      console.error('Error fetching auth users:', authUsersError);
    } else {
      console.log('Auth users:', authUsers.users);
    }
    
  } catch (err) {
    console.error('Error:', err);
  }
}

checkUserProfile();