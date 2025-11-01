const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupDatabase() {
  console.log('Setting up database...');

  try {
    // Create the admin user if it doesn't exist
    console.log('Creating admin user...');
    const { data: adminUser, error: adminError } = await supabase.auth.admin.createUser({
      email: 'admin@example.com',
      password: 'admin@123',
      email_confirm: true,
      user_metadata: {
        full_name: 'Admin User',
        role: 'admin'
      }
    });

    if (adminError && !adminError.message.includes('already registered')) {
      console.error('Error creating admin user:', adminError);
    } else {
      console.log('Admin user created or already exists');
    }

    // Update the admin user's role in profiles table
    if (adminUser?.user?.id) {
      console.log('Setting admin role...');
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', adminUser.user.id);

      if (updateError) {
        console.error('Error updating admin role:', updateError);
      } else {
        console.log('Admin role set successfully');
      }
    }

    // Create some sample posts for testing
    console.log('Creating sample posts...');
    const samplePosts = [
      {
        title: 'iPhone 13 Pro',
        description: 'Excellent condition iPhone 13 Pro, barely used',
        price: 899.99,
        category: 'Electronics',
        status: 'pending'
      },
      {
        title: 'Vintage Camera',
        description: 'Classic film camera in great condition',
        price: 199.99,
        category: 'Electronics',
        status: 'pending'
      },
      {
        title: 'Designer Handbag',
        description: 'Authentic designer handbag, like new',
        price: 299.99,
        category: 'Clothing',
        status: 'pending'
      }
    ];

    // Get the admin user ID for sample posts
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', 'admin@example.com')
      .single();

    if (adminProfile) {
      const postsWithUserId = samplePosts.map(post => ({
        ...post,
        user_id: adminProfile.id
      }));

      const { error: postsError } = await supabase
        .from('posts')
        .insert(postsWithUserId);

      if (postsError) {
        console.error('Error creating sample posts:', postsError);
      } else {
        console.log('Sample posts created successfully');
      }
    }

    console.log('Database setup completed successfully!');
    console.log('You can now log in with:');
    console.log('Email: admin@example.com');
    console.log('Password: admin@123');

  } catch (error) {
    console.error('Setup failed:', error);
  }
}

// Run the setup
setupDatabase();