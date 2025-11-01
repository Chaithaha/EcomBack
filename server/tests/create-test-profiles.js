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

async function createTestProfiles() {
  try {
    console.log('Creating test user profiles...');
    
    // Test user data - these are the users that should have profiles created
    const testUsers = [
      {
        id: '2f7abc57-b529-4b42-85d3-744b3bb8dc27',
        email: 'user123@testdomain.com',
        full_name: 'Test User'
      },
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
    
    for (const user of testUsers) {
      console.log(`Creating profile for ${user.email}...`);
      
      try {
        // Try to create the profile using the service role key
        const { data, error } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            full_name: user.full_name,
            role: 'user'
          })
          .select()
          .single();
        
        if (error) {
          console.log(`Could not create profile for ${user.email}:`, error.message);
          
          // Check if profile already exists
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
          if (existingProfile) {
            console.log(`Profile for ${user.email} already exists:`, existingProfile);
          }
        } else {
          console.log(`Successfully created profile for ${user.email}:`, data);
        }
      } catch (err) {
        console.error(`Error creating profile for ${user.email}:`, err);
      }
    }
    
    console.log('Profile creation completed!');
    
    // Verify all profiles were created
    console.log('\nVerifying created profiles...');
    const { data: allProfiles, error: verifyError } = await supabase
      .from('profiles')
      .select('*');
    
    if (verifyError) {
      console.error('Error verifying profiles:', verifyError);
    } else {
      console.log('All profiles in database:', allProfiles);
    }
    
  } catch (err) {
    console.error('Error:', err);
  }
}

createTestProfiles();