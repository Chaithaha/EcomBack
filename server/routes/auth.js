const router = require('express').Router();
const { getSupabaseClient, getSupabaseServiceClient } = require('../utils/supabase');

// Check if email confirmation should be bypassed for testing
const bypassEmailConfirm = process.env.BYPASS_EMAIL_CONFIRM === 'true';

// POST /api/auth/register - User registration
router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    let data, error;
    
    if (bypassEmailConfirm) {
      // Use service client to bypass email confirmation for testing
      const supabaseService = getSupabaseServiceClient();
      const result = await supabaseService.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: full_name || email.split('@')[0]
        }
      });
      data = result.data;
      error = result.error;
    } else {
      // Use regular client for production
      const supabase = getSupabaseClient();
      const result = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: full_name || email.split('@')[0]
          }
        }
      });
      data = result.data;
      error = result.error;
    }
    
if (error) {
      console.error('Registration error:', error);
      return res.status(400).json({ error: error.message });
    }
    
    // Create user profile
    const supabaseService = getSupabaseServiceClient();
    const { error: profileInsertError } = await supabaseService
      .from('profiles')
      .insert({
        id: data.user.id,
        full_name: full_name || email.split('@')[0],
        role: 'user'
      });
    
    if (profileInsertError) {
      console.error('Profile creation error:', profileInsertError);
      // Don't return error here as user was created in auth
    }

    // For testing with bypass, ensure user is fully confirmed
    if (bypassEmailConfirm && data.user?.id) {
      try {
        await supabaseService.auth.admin.updateUserById(data.user.id, {
          email_confirm: true
        });
        console.log('Email confirmation bypassed for testing');
      } catch (confirmError) {
        console.error('Error bypassing email confirmation:', confirmError);
      }
    }

    // Manually confirm the user email for testing
    try {
      await supabaseService.auth.admin.updateUserById(data.user.id, {
        email_confirm: true
      });
      console.log('User email confirmed manually for testing');
    } catch (confirmError) {
      console.error('Error confirming email:', confirmError);
    }
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        id: data.user.id,
        email: data.user.email,
        full_name: full_name || email.split('@')[0]
      }
    });
  } catch (error) {
    console.error('Registration server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login - User login
router.post('/login', async (req, res) => {
  try {
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
    
    // If login fails due to email confirmation and we're in bypass mode, try to confirm and retry
    if (error && error.message.includes('Email not confirmed') && bypassEmailConfirm) {
      console.log('Email confirmation bypass activated for testing');
      
      // Try to get the user and confirm their email
      try {
        const { data: userList } = await supabase.auth.admin.listUsers();
        const user = userList.users.find(u => u.email === email);
        
        if (user && user.id) {
          await supabase.auth.admin.updateUserById(user.id, {
            email_confirm: true
          });
          
          // Retry login after confirmation
          const retryResult = await supabase.auth.signInWithPassword({
            email,
            password
          });
          
          if (!retryResult.error) {
            data = retryResult.data;
            error = null;
            console.log('Login successful after email confirmation bypass');
          }
        }
      } catch (bypassError) {
        console.error('Email confirmation bypass failed:', bypassError);
      }
    }
    
    if (error) {
      console.error('Login error:', error);
      return res.status(401).json({ error: error.message });
    }
    
    // Get user profile with role
    const { data: profile, error: profileFetchError } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', data.user.id)
      .single();
    
    if (profileFetchError) {
      console.error('Profile fetch error:', profileFetchError);
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

// POST /api/auth/logout - User logout
router.post('/logout', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required for logout' });
    }
    
    const supabase = getSupabaseServiceClient();
    
    // Sign out with Supabase auth
    const { error } = await supabase.auth.admin.signOut(token);
    
    if (error) {
      console.error('Logout error:', error);
      return res.status(400).json({ error: error.message });
    }
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me - Get current user info (requires token)
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }
    
    const supabase = getSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    // Get user profile with role
    const supabaseService = getSupabaseServiceClient();
    const { data: profile, error: profileFetchError } = await supabaseService
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single();
    
    if (profileFetchError) {
      console.error('Profile fetch error:', profileFetchError);
      // Continue without profile data
    }
    
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        full_name: profile?.full_name || user.user_metadata?.full_name || user.email.split('@')[0],
        role: profile?.role || 'user'
      }
    });
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;