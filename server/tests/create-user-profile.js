const { createClient } = require('@supabase/supabase-js');

// Use the service role key to create user profiles
const supabaseUrl = 'https://ckoybdoellolyxqjkoil.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrb3liZG9lbGxvbHl4cWprb2lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MDQzNjcsImV4cCI6MjA3NTI4MDM2N30.T8S27COehsYT5v2GrqJNQe5HKL2dvjqIHUEhwWZLUtw';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createUserProfile() {
  try {
    console.log('Creating user profiles...');
    
    // Test user data
    const testUser = {
      id: '2f7abc57-b529-4b42-85d3-744b3bb8dc27',
      email: 'user123@testdomain.com',
      full_name: 'Test User'
    };
    
    // Insert the user profile
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: testUser.id,
        full_name: testUser.full_name,
        role: 'user'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating user profile:', error);
      return;
    }
    
    console.log('User profile created successfully:', data);
    
    // Create a few more test profiles for testing
    const additionalUsers = [
      {
        id: 'test-user-1',
        email: 'user1@test.com',
        full_name: 'Test User 1'
      },
      {
        id: 'test-user-2', 
        email: 'user2@test.com',
        full_name: 'Test User 2'
      }
    ];
    
    for (const user of additionalUsers) {
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          full_name: user.full_name,
          role: 'user'
        })
        .select()
        .single();
      
      if (userError) {
        console.log(`Could not create profile for ${user.email}:`, userError.message);
      } else {
        console.log(`Created profile for ${user.email}:`, userData);
      }
    }
    
    console.log('User profile creation completed!');
    
  } catch (err) {
    console.error('Error:', err);
  }
}

createUserProfile();