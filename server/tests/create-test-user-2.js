const { createClient } = require('@supabase/supabase-js');

// Use the same configuration as the server
const supabaseUrl = 'https://ckoybdoellolyxqjkoil.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrb3liZG9lbGxvbHl4cWprb2lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MDQzNjcsImV4cCI6MjA3NTI4MDM2N30.T8S27COehsYT5v2GrqJNQe5HKL2dvjqIHUEhwWZLUtw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestUser() {
  try {
    // Try with a different email format
    const { data, error } = await supabase.auth.signUp({
      email: 'user123@testdomain.com',
      password: 'test123456',
      options: {
        data: {
          full_name: 'Test User'
        }
      }
    });

    if (error) {
      console.error('Error creating user:', error.message);
      return;
    }

    console.log('User created successfully!');
    console.log('User data:', data.user);
    
    if (data.session) {
      console.log('Access Token:', data.session.access_token);
      console.log('Refresh Token:', data.session.refresh_token);
      
      // Save the token to a file for testing
      const fs = require('fs');
      fs.writeFileSync('test-token.txt', data.session.access_token);
      console.log('Token saved to test-token.txt');
    } else {
      console.log('Please check your email to verify your account, then run the script again to get the token.');
    }
    
  } catch (err) {
    console.error('Error:', err);
  }
}

createTestUser();