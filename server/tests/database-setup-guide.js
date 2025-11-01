const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDatabaseStatus() {
  console.log('🔍 Checking current database status...');

  try {
    // Check if tables exist
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE');

    if (tablesError) {
      console.error('❌ Error checking tables:', tablesError.message);
      return false;
    }

    const requiredTables = ['profiles', 'posts', 'products', 'post_images'];
    const existingTables = tables.map(t => t.table_name);
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));

    if (missingTables.length === 0) {
      console.log('✅ All required tables exist:', existingTables);
      return true;
    } else {
      console.log('⚠️  Missing tables:', missingTables);
      console.log('📋 Existing tables:', existingTables);
      return false;
    }

  } catch (error) {
    console.error('❌ Database status check failed:', error);
    return false;
  }
}

async function setupDatabase() {
  console.log('🚀 Phase 1: Database Setup');
  console.log('================================');

  // Check current database status
  const isSetupComplete = await checkDatabaseStatus();

  if (isSetupComplete) {
    console.log('✅ Database is already set up!');
    console.log('🎯 Proceeding to admin user creation...');
    await createAdminUser();
    return;
  }

  console.log('\n📋 MANUAL SETUP REQUIRED');
  console.log('========================');
  console.log('Please follow these steps to set up the database:');
  console.log('');
  console.log('1. Open your Supabase dashboard: https://app.supabase.com');
  console.log('2. Select your project: ckoybdoellolyxqjkoil');
  console.log('3. Go to the SQL Editor tab');
  console.log('4. Copy the entire content from database-setup.sql');
  console.log('5. Paste it into the SQL Editor');
  console.log('6. Click "Run" to execute the script');
  console.log('');
  console.log('📄 The database-setup.sql file contains:');
  console.log('   • Table creation (profiles, posts, products, post_images)');
  console.log('   • Row Level Security (RLS) policies');
  console.log('   • Indexes for performance');
  console.log('   • Helper functions and triggers');
  console.log('   • Sample data');
  console.log('');
  console.log('⚡ After running the SQL script, run this command again:');
  console.log('   node database-setup-guide.js');
  console.log('');

  // Read and display the SQL file content for easy copying
  try {
    const fs = require('fs');
    const sqlContent = fs.readFileSync('./database-setup.sql', 'utf8');
    console.log('📝 SQL File Content (copy this):');
    console.log('================================');
    console.log('```sql');
    console.log(sqlContent);
    console.log('```');
  } catch (error) {
    console.error('❌ Could not read database-setup.sql file:', error.message);
  }
}

async function createAdminUser() {
  console.log('\n👤 Creating admin user...');

  try {
    // Create the admin user
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
      console.error('❌ Error creating admin user:', adminError.message);
      return false;
    }

    console.log('✅ Admin user created or already exists');

    // Update the admin user's role in profiles table
    if (adminUser?.user?.id) {
      console.log('🔧 Setting admin role...');
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', adminUser.user.id);

      if (updateError) {
        console.error('❌ Error updating admin role:', updateError.message);
        return false;
      }

      console.log('✅ Admin role set successfully');
    }

    console.log('\n🎉 Phase 1 completed successfully!');
    console.log('================================');
    console.log('✅ Database schema created');
    console.log('✅ Admin user created');
    console.log('');
    console.log('🔑 Admin Login Credentials:');
    console.log('   Email: admin@example.com');
    console.log('   Password: admin@123');
    console.log('');
    console.log('🎯 Ready for Phase 2: Remove mock authentication');

    return true;

  } catch (error) {
    console.error('❌ Admin user creation failed:', error);
    return false;
  }
}

// Run the setup
setupDatabase()
  .then((success) => {
    if (success) {
      console.log('🎊 Phase 1 setup completed successfully!');
    } else {
      console.log('⚠️  Phase 1 setup requires manual steps');
    }
  })
  .catch((error) => {
    console.error('💥 Phase 1 setup failed:', error);
    process.exit(1);
  });