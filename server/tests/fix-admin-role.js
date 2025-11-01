const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixAdminRole() {
  console.log('Fixing admin user role...');

  try {
    // First get the user from auth, then find their profile
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@example.com',
      password: 'admin@123'
    });
    
    if (authError) {
      console.error('Error authenticating admin user:', authError);
      return;
    }

    const adminUserId = authData.user.id;
    console.log('Found admin user ID:', adminUserId);
    
    if (authError) {
      console.error('Error authenticating admin user:', authError);
      return;
    }

    if (!authData.user) {
      console.log('Admin user not found');
      return;
    }

    console.log('Found admin user ID:', adminUserId);

    // Update admin user's role in profiles table
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', adminUserId);

    if (updateError) {
      console.error('Error updating admin role:', updateError);
    } else {
      console.log('✅ Admin role updated successfully');
    }

    // Verify the update
    const { data: updatedProfile, error: verifyError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', adminUserId)
      .single();

    if (verifyError) {
      console.error('Error verifying admin role:', verifyError);
    } else {
      console.log('✅ Verified admin role:', updatedProfile.role);
    }

    console.log('\nAdmin user setup completed!');
    console.log('Email: admin@example.com');
    console.log('Password: admin@123');
    console.log('Role: admin');

  } catch (error) {
    console.error('Setup failed:', error);
  }
}

// Run fix
fixAdminRole();