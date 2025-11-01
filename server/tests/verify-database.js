const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyDatabaseSetup() {
  console.log('🔍 Verifying Database Setup');
  console.log('===========================');

  try {
    // Test basic connection
    console.log('🔗 Testing Supabase connection...');
    const { data, error } = await supabase.from('_test_connection').select('*').limit(1);
    
    // Check if we can access auth system
    console.log('👤 Testing auth system...');
    const { data: adminUser, error: authError } = await supabase.auth.admin.getUserById(
      '00000000-0000-0000-0000-000000000000' // Dummy ID to test auth
    );
    
    if (authError && !authError.message.includes('not found')) {
      console.warn('Auth system test warning:', authError.message);
    } else {
      console.log('✅ Auth system is accessible');
    }

    // Check if admin user exists
    console.log('\n👑 Checking admin user...');
    try {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: 'admin@example.com',
        password: 'admin@123'
      });

      if (signInError) {
        console.error('❌ Admin user login failed:', signInError.message);
      } else {
        console.log('✅ Admin user exists and can login');
        console.log(`   User ID: ${signInData.user.id}`);
        console.log(`   Email: ${signInData.user.email}`);
      }
    } catch (loginError) {
      console.error('❌ Admin user verification failed:', loginError.message);
    }

    // Try to check tables using a different approach
    console.log('\n📋 Checking database tables...');
    
    const tablesToCheck = ['profiles', 'posts', 'products', 'post_images'];
    const tableStatus = {};

    for (const tableName of tablesToCheck) {
      try {
        // Try a simple select to see if table exists
        const { data: tableData, error: tableError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (tableError) {
          if (tableError.message.includes('relation') && tableError.message.includes('does not exist')) {
            tableStatus[tableName] = '❌ Does not exist';
          } else {
            tableStatus[tableName] = `⚠️  Error: ${tableError.message}`;
          }
        } else {
          tableStatus[tableName] = '✅ Exists';
        }
      } catch (err) {
        tableStatus[tableName] = `❌ Error: ${err.message}`;
      }
    }

    // Display table status
    for (const [table, status] of Object.entries(tableStatus)) {
      console.log(`   ${table}: ${status}`);
    }

    // Check if any tables exist
    const existingTables = Object.entries(tableStatus)
      .filter(([_, status]) => status.includes('✅'))
      .map(([table, _]) => table);

    if (existingTables.length > 0) {
      console.log(`\n✅ Found ${existingTables.length} existing tables: ${existingTables.join(', ')}`);
    } else {
      console.log('\n⚠️  No tables found - database needs to be set up');
    }

    // Try to create a simple test to verify database functionality
    console.log('\n🧪 Testing database functionality...');
    
    if (existingTables.includes('profiles')) {
      try {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .limit(5);

        if (profilesError) {
          console.warn('⚠️  Profiles table query error:', profilesError.message);
        } else {
          console.log(`✅ Profiles table accessible (${profiles.length} records)`);
        }
      } catch (err) {
        console.warn('⚠️  Profiles table test failed:', err.message);
      }
    }

    console.log('\n📊 Database Verification Summary');
    console.log('==================================');
    
    if (existingTables.length === tablesToCheck.length) {
      console.log('✅ All required tables exist - Database is ready!');
      console.log('🎯 Ready for Phase 2: Remove mock authentication');
      return true;
    } else if (existingTables.length > 0) {
      console.log(`⚠️  Partial setup: ${existingTables.length}/${tablesToCheck.length} tables exist`);
      console.log('📋 Recommendation: Run the complete database-setup.sql in Supabase dashboard');
      return false;
    } else {
      console.log('❌ No tables found - Database setup required');
      console.log('📋 Next steps:');
      console.log('   1. Go to https://app.supabase.com');
      console.log('   2. Select project: ckoybdoellolyxqjkoil');
      console.log('   3. Go to SQL Editor');
      console.log('   4. Run database-setup.sql');
      return false;
    }

  } catch (error) {
    console.error('❌ Database verification failed:', error);
    return false;
  }
}

// Run verification
verifyDatabaseSetup()
  .then((isReady) => {
    if (isReady) {
      console.log('\n🎉 Phase 1 completed successfully!');
      console.log('🚀 Ready to proceed with Phase 2: Remove mock authentication');
    } else {
      console.log('\n⚠️  Phase 1 requires manual completion');
      console.log('📋 Please complete the database setup manually');
    }
  })
  .catch((error) => {
    console.error('💥 Verification failed:', error);
    process.exit(1);
  });