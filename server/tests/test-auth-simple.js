const express = require('express');
const { getSupabaseServiceClient } = require('../utils/supabase');
require('dotenv').config();

const app = express();
app.use(express.json());

// Test login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('Login attempt:', req.body);
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const supabase = getSupabaseServiceClient();
    
    // Sign in with Supabase auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('Login error:', error);
      return res.status(401).json({ error: error.message });
    }
    
    // Get user profile with role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', data.user.id)
      .single();
    
    if (profileError) {
      console.error('Profile fetch error:', profileError);
      // Continue without profile data
    }
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          full_name: profile?.full_name || data.user.user_metadata?.full_name || email.split('@')[0],
          role: profile?.role || 'user'
        },
        session: data.session,
        token: data.session.access_token
      }
    });
  } catch (error) {
    console.error('Login server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(5000, () => {
  console.log('Simple auth test server running on port 5000');
  console.log('Testing admin login...');
  
  // Test admin login
  const testLogin = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'admin@example.com',
          password: 'admin@123'
        })
      });
      
      const result = await response.json();
      console.log('Login result:', result);
    } catch (error) {
      console.error('Login test error:', error);
    }
  };
  
  setTimeout(testLogin, 1000);
});