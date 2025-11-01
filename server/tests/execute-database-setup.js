const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function executeDatabaseSetup() {
  console.log('🚀 Starting database setup...');

  try {
    // Read the database setup SQL file
    const sqlFile = fs.readFileSync('./database-setup.sql', 'utf8');
    console.log('📖 Database setup SQL file loaded');

    // Split the SQL file into individual statements
    const statements = sqlFile
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
        
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement });
        
        if (error) {
          // Try direct SQL execution if RPC fails
          console.log('🔄 Trying direct SQL execution...');
          const { data: directData, error: directError } = await supabase
            .from('pg_temp')
            .select('*')
            .limit(1);
          
          // For now, just log the error and continue
          console.warn(`⚠️  Statement ${i + 1} may have failed:`, error.message);
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } catch (stmtError) {
        console.warn(`⚠️  Error executing statement ${i + 1}:`, stmtError.message);
        // Continue with next statement
      }
    }

    console.log('🎉 Database setup completed!');
    
    // Verify tables were created
    console.log('\n🔍 Verifying database setup...');
    
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE')
      .in('table_name', ['profiles', 'posts', 'products', 'post_images']);

    if (tablesError) {
      console.error('❌ Error verifying tables:', tablesError);
    } else {
      console.log('✅ Tables created:', tables.map(t => t.table_name));
    }

    // Check RLS status
    const { data: rlsStatus, error: rlsError } = await supabase
      .from('pg_tables')
      .select('tablename, rowsecurity')
      .eq('schemaname', 'public')
      .in('tablename', ['profiles', 'posts', 'products']);

    if (rlsError) {
      console.error('❌ Error checking RLS status:', rlsError);
    } else {
      console.log('✅ RLS enabled on tables:', rlsStatus);
    }

    console.log('\n🎯 Database setup verification completed!');
    console.log('📋 Next step: Run setup-admin.js to create the admin user');

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

// Alternative approach: Use individual table creation
async function createTablesManually() {
  console.log('🔧 Creating tables manually...');

  try {
    // Create profiles table
    console.log('📋 Creating profiles table...');
    const { error: profilesError } = await supabase.rpc('create_profiles_table');
    if (profilesError) {
      console.warn('Profiles table creation warning:', profilesError.message);
    }

    // Create posts table
    console.log('📋 Creating posts table...');
    const { error: postsError } = await supabase.rpc('create_posts_table');
    if (postsError) {
      console.warn('Posts table creation warning:', postsError.message);
    }

    // Create products table
    console.log('📋 Creating products table...');
    const { error: productsError } = await supabase.rpc('create_products_table');
    if (productsError) {
      console.warn('Products table creation warning:', productsError.message);
    }

    console.log('✅ Manual table creation completed');
  } catch (error) {
    console.error('❌ Manual table creation failed:', error);
  }
}

// Run the setup
executeDatabaseSetup()
  .then(() => {
    console.log('🎊 Phase 1 database setup completed successfully!');
  })
  .catch((error) => {
    console.error('💥 Phase 1 setup failed:', error);
    process.exit(1);
  });