const { getSupabaseServiceClient } = require('../utils/supabase');

// Helper function to determine if user is online (active in last 30 minutes)
const isUserOnline = (lastSignInAt) => {
  if (!lastSignInAt) return false;
  const lastActivity = new Date(lastSignInAt);
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  return lastActivity > thirtyMinutesAgo;
};

const getActiveUsers = async (req, res) => {
  try {
    console.log('Attempting to fetch active users from Supabase...');
    
    const supabase = getSupabaseServiceClient();
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .not('last_sign_in_at', 'is', null);
      
    if (error) {
      console.error('Supabase error:', error);
      return res.status(400).json({ error: error.message });
    }
    
    // Filter for users active in the last 30 minutes and transform data
    const activeUsers = data
      .filter(profile => {
        const lastSignIn = profile.last_sign_in_at || profile.created_at;
        return isUserOnline(lastSignIn);
      })
      .map(profile => ({
        id: profile.id,
        email: profile.email,
        name: profile.full_name || 'Unknown User',
        role: profile.role || 'user',
        lastLogin: profile.last_sign_in_at || profile.created_at,
        status: 'online',
        lastActivity: profile.last_sign_in_at || profile.created_at
      }));
    
    console.log('Successfully fetched active users:', activeUsers.length);
    res.json(activeUsers);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getUsers = async (req, res) => {
    try {
        console.log('Attempting to fetch users from Supabase...');
        
        // Create a fresh Supabase client each time
        const supabase = getSupabaseServiceClient();
        
        const { data, error } = await supabase
            .from('profiles')
            .select('*');
            
        if (error) {
            console.error('Supabase error:', error);
            return res.status(400).json({ error: error.message });
        }
        
        // Transform the data to match the expected format
        const users = data.map(profile => {
          const lastSignIn = profile.last_sign_in_at || profile.created_at;
          return {
            id: profile.id,
            email: profile.email,
            name: profile.full_name || 'Unknown User',
            role: profile.role || 'user',
            lastLogin: lastSignIn,
            status: isUserOnline(lastSignIn) ? 'online' : 'offline',
            lastActivity: lastSignIn
          };
        });
        
        console.log('Successfully fetched users:', users);
        res.json(users);
    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, status } = req.body;
        
        console.log(`Updating user ${id} with role: ${role}, status: ${status}`);
        
        const supabase = getSupabaseServiceClient();
        
        // Update the profile
        const { data, error } = await supabase
            .from('profiles')
            .update({ role })
            .eq('id', id)
            .select()
            .single();
            
        if (error) {
            console.error('Supabase error:', error);
            return res.status(400).json({ error: error.message });
        }
        
        console.log('Successfully updated user:', data);
        res.json({ success: true, data });
    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log(`Deleting user ${id}`);
        
        const supabase = getSupabaseServiceClient();
        
        // Delete the profile
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', id);
            
        if (error) {
            console.error('Supabase error:', error);
            return res.status(400).json({ error: error.message });
        }
        
        console.log('Successfully deleted user');
        res.json({ success: true });
    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { getUsers, getActiveUsers, updateUser, deleteUser };