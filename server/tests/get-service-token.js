const { createClient } = require('@supabase/supabase-js');

// Use the service role key (bypasses email confirmation)
const supabaseUrl = 'https://ckoybdoellolyxqjkoil.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrb3liZG9lbGxvbHl4cWprb2lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MDQzNjcsImV4cCI6MjA3NTI4MDM2N30.T8S27COehsYT5v2GrqJNQe5HKL2dvjqIHUEhwWZLUtw';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function getServiceToken() {
  try {
    // Use the service role key to create a JWT token for the test user
    // We'll manually create a JWT token with the user's claims
    
    // For now, let's create a mock token that has the correct structure
    // In a real scenario, you'd use the service role key to create proper tokens
    
    console.log('Service Role Key available for creating tokens');
    console.log('Test User ID: 2f7abc57-b529-4b42-85d3-744b3bb8dc27');
    
    // Let's create a simple JWT-like token for testing
    const jwt = require('jsonwebtoken');
    
    // Create a test token with the user's ID
    const testToken = jwt.sign(
      {
        sub: '2f7abc57-b529-4b42-85d3-744b3bb8dc27',
        email: 'user123@testdomain.com',
        role: 'authenticated',
        full_name: 'Test User'
      },
      serviceRoleKey, // Use service role key as secret
      { expiresIn: '1h' }
    );
    
    console.log('Test JWT Token:', testToken);
    
    // Save the token to a file for testing
    const fs = require('fs');
    fs.writeFileSync('test-token.txt', testToken);
    console.log('Token saved to test-token.txt');
    
    // Test the token with the authentication middleware
    console.log('\nTesting token with authentication middleware...');
    
    // Simulate the authentication middleware logic
    const { data: { user }, error } = await supabase.auth.getUser(testToken);
    
    if (error) {
      console.log('Token verification failed (expected for JWT created this way):', error.message);
    } else {
      console.log('Token verified successfully:', user);
    }
    
  } catch (err) {
    console.error('Error:', err);
  }
}

getServiceToken();