const { createClient } = require('@supabase/supabase-js');

// Use the same configuration as the server
const supabaseUrl = 'https://ckoybdoellolyxqjkoil.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrb3liZG9lbGxvbHl4cWprb2lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MDQzNjcsImV4cCI6MjA3NTI4MDM2N30.T8S27COehsYT5v2GrqJNQe5HKL2dvjqIHUEhwWZLUtw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateTestToken() {
  try {
    // Sign in with admin@example.com (we'll use a simple password)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@example.com',
      password: 'admin123' // Simple password for testing
    });

    if (error) {
      console.error('Error signing in:', error.message);
      return;
    }

    console.log('Access Token:', data.session?.access_token);
    console.log('Refresh Token:', data.session?.refresh_token);
    console.log('User:', data.session?.user);
    
    // Save the token to a file for testing
    const fs = require('fs');
    fs.writeFileSync('test-token.txt', data.session?.access_token || '');
    console.log('Token saved to test-token.txt');
    
  } catch (err) {
    console.error('Error:', err);
  }
}

generateTestToken();