const { getSupabaseClient, getSupabaseServiceClient } = require('../utils/supabase');

// Authentication middleware to verify Supabase JWT tokens
const authenticateToken = async (req, res, next) => {
  try {
    // Get the authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    console.log('Auth middleware - Authorization header:', authHeader ? 'Present' : 'Missing');
    console.log('Auth middleware - Token length:', token ? token.length : 0);
    console.log('Auth middleware - Token prefix:', token ? token.substring(0, 20) + '...' : 'None');

    if (!token) {
      console.log('Auth middleware - No token provided');
      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify the token using Supabase (use regular client for user authentication)
    const supabase = getSupabaseClient();
    
    // Verify the JWT token
    console.log('Auth middleware - Attempting to verify token with Supabase...');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('Token verification failed:', error);
      console.log('Auth middleware - Token verification failed for user:', user);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    console.log('Auth middleware - Token verified successfully for user:', user.email);

    // Check if user profile exists, create if it doesn't
    const supabaseService = getSupabaseServiceClient();
    
    try {
      // Try to get the user profile
      const { data: profile, error: profileError } = await supabaseService
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching user profile:', profileError);
      }
      
      // If profile doesn't exist, create it
      if (!profile) {
        console.log('Creating user profile for:', user.email);
        
        const { data: newProfile, error: createError } = await supabaseService
          .from('profiles')
          .insert({
            id: user.id,
            full_name: user.user_metadata?.full_name || user.email.split('@')[0],
            role: 'user'
          })
          .select()
          .single();
        
        if (createError) {
          console.error('Failed to create user profile:', createError);
          // Don't fail the request if profile creation fails, just continue without profile
        } else {
          console.log('User profile created successfully:', newProfile);
        }
      }
    } catch (profileError) {
      console.error('Profile check error:', profileError);
      // Continue without profile if there's an error
    }

    // Attach user information to the request
    req.user = {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || null
    };

    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

// Optional authentication middleware - allows requests without tokens
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const supabase = getSupabaseClient();
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (!error && user) {
        req.user = {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || null
        };
      }
    }

    // Continue without authentication if token is invalid or missing
    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next();
  }
};

// Admin role check middleware
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Check if user is admin (admin@example.com)
  if (req.user.email !== 'admin@example.com') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireAdmin
};