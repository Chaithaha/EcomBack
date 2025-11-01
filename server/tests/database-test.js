const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_KEY must be set in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test results storage
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

// Utility function to run tests
async function runTest(testName, testFunction) {
  try {
    console.log(`\n🧪 Running test: ${testName}`);
    const result = await testFunction();
    if (result) {
      testResults.passed++;
      testResults.tests.push({ name: testName, status: 'PASSED' });
      console.log(`✅ ${testName} - PASSED`);
      return true;
    } else {
      testResults.failed++;
      testResults.tests.push({ name: testName, status: 'FAILED' });
      console.log(`❌ ${testName} - FAILED`);
      return false;
    }
  } catch (error) {
    testResults.failed++;
    testResults.tests.push({ name: testName, status: 'FAILED', error: error.message });
    console.log(`❌ ${testName} - FAILED: ${error.message}`);
    return false;
  }
}

// Test 1: Check if tables exist
async function testTablesExist() {
  try {
    // First check what tables actually exist
    const { data: allTables, error: allTablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (allTablesError) {
      console.error('Error checking all tables:', allTablesError);
      return false;
    }

    const existingTables = allTables.map(row => row.table_name);
    console.log('Found tables:', existingTables);

    // Check for expected tables
    const expectedTables = ['profiles', 'posts', 'products'];
    const missingTables = expectedTables.filter(table => !existingTables.includes(table));

    if (missingTables.length > 0) {
      console.log('Missing tables:', missingTables);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in testTablesExist:', error);
    return false;
  }
}

// Test 2: Check RLS status
async function testRLSEnabled() {
  const { data, error } = await supabase
    .from('pg_tables')
    .select('tablename, rowsecurity')
    .in('tablename', ['profiles', 'posts', 'products']);

  if (error) {
    console.error('Error checking RLS:', error);
    return false;
  }

  const allRLSEnabled = data.every(table => table.rowsecurity === true);
  console.log('RLS status:', data);
  return allRLSEnabled;
}

// Test 3: Check if indexes exist
async function testIndexesExist() {
  const { data, error } = await supabase
    .from('pg_indexes')
    .select('indexname, tablename')
    .in('tablename', ['profiles', 'posts', 'products']);

  if (error) {
    console.error('Error checking indexes:', error);
    return false;
  }

  const expectedIndexes = [
    'idx_profiles_role',
    'idx_profiles_created_at',
    'idx_posts_user_id',
    'idx_posts_status',
    'idx_posts_category',
    'idx_posts_created_at',
    'idx_products_category',
    'idx_products_price',
    'idx_products_created_at'
  ];

  const foundIndexes = data.map(row => row.indexname);
  const allIndexesExist = expectedIndexes.every(index => foundIndexes.includes(index));

  console.log('Found indexes:', foundIndexes);
  return allIndexesExist;
}

// Test 4: Check if policies exist
async function testPoliciesExist() {
  const { data, error } = await supabase
    .from('pg_policies')
    .select('tablename, policyname')
    .in('tablename', ['profiles', 'posts', 'products']);

  if (error) {
    console.error('Error checking policies:', error);
    return false;
  }

  const expectedPolicies = [
    'Users can view own profile',
    'Users can update own profile',
    'Admins can view all profiles',
    'Admins can update any profile',
    'Users can view own posts',
    'Users can insert own posts',
    'Users can update own posts',
    'Users can delete own posts',
    'Admins can view all posts',
    'Admins can update any post',
    'Admins can delete any post',
    'Users can view products',
    'Admins can insert products',
    'Admins can update products',
    'Admins can delete products'
  ];

  const foundPolicies = data.map(row => `${row.tablename}.${row.policyname}`);
  const allPoliciesExist = expectedPolicies.every(policy => {
    const [table, policyName] = policy.split('.');
    return data.some(p => p.tablename === table && p.policyname === policyName);
  });

  console.log('Found policies:', foundPolicies);
  return allPoliciesExist;
}

// Test 5: Test products API endpoint
async function testProductsAPI() {
  try {
    const response = await fetch('http://localhost:5000/api/products');
    if (!response.ok) {
      console.log(`Products API returned status: ${response.status}`);
      return false;
    }
    const data = await response.json();
    console.log('Products API response:', data);
    return Array.isArray(data);
  } catch (error) {
    console.log('Products API error:', error.message);
    return false;
  }
}

// Test 6: Test posts API endpoint (unauthenticated)
async function testPostsAPIUnauthenticated() {
  try {
    const response = await fetch('http://localhost:5000/api/posts');
    if (!response.ok) {
      console.log(`Posts API returned status: ${response.status}`);
      return false;
    }
    const data = await response.json();
    console.log('Posts API (unauthenticated) response:', data);
    return Array.isArray(data);
  } catch (error) {
    console.log('Posts API error:', error.message);
    return false;
  }
}

// Test 7: Insert test product
async function testInsertProduct() {
  try {
    const { data, error } = await supabase
      .from('products')
      .insert({
        title: 'Test Product',
        description: 'Test product for validation',
        price: 19.99,
        category: 'test',
        image_url: 'https://example.com/test.jpg'
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting test product:', error);
      return false;
    }

    console.log('Inserted test product:', data);
    
    // Clean up - delete the test product
    await supabase
      .from('products')
      .delete()
      .eq('id', data.id);

    return true;
  } catch (error) {
    console.error('Error in test insert product:', error);
    return false;
  }
}

// Test 8: Test data constraints
async function testDataConstraints() {
  try {
    // Test invalid price (should fail)
    const { error: invalidPriceError } = await supabase
      .from('products')
      .insert({
        title: 'Invalid Product',
        description: 'Product with invalid price',
        price: -10.00, // Invalid price
        category: 'test'
      });

    if (!invalidPriceError) {
      console.log('❌ Invalid price constraint not working');
      return false;
    }

    console.log('✅ Invalid price constraint working');

    // Test valid data (should succeed)
    const { data: validData, error: validError } = await supabase
      .from('products')
      .insert({
        title: 'Valid Product',
        description: 'Product with valid data',
        price: 25.99,
        category: 'test'
      })
      .select()
      .single();

    if (validError) {
      console.error('Error inserting valid product:', validError);
      return false;
    }

    // Clean up
    await supabase
      .from('products')
      .delete()
      .eq('id', validData.id);

    console.log('✅ Valid data insertion working');
    return true;
  } catch (error) {
    console.error('Error in data constraints test:', error);
    return false;
  }
}

// Test 9: Check if functions exist
async function testFunctionsExist() {
  try {
    const { data, error } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_schema', 'public')
      .in('routine_name', ['handle_new_user', 'update_post_status']);

    if (error) {
      console.error('Error checking functions:', error);
      return false;
    }

    const foundFunctions = data.map(row => row.routine_name);
    const expectedFunctions = ['handle_new_user', 'update_post_status'];
    const allFunctionsExist = expectedFunctions.every(func => foundFunctions.includes(func));

    console.log('Found functions:', foundFunctions);
    return allFunctionsExist;
  } catch (error) {
    console.error('Error in functions test:', error);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Database Schema Tests...\n');

  // Test suite 1: Database Structure
  await runTest('Tables Exist', testTablesExist);
  await runTest('RLS Enabled', testRLSEnabled);
  await runTest('Indexes Exist', testIndexesExist);
  await runTest('Policies Exist', testPoliciesExist);
  await runTest('Functions Exist', testFunctionsExist);

  // Test suite 2: Data Operations
  await runTest('Insert Product', testInsertProduct);
  await runTest('Data Constraints', testDataConstraints);

  // Test suite 3: API Endpoints
  await runTest('Products API', testProductsAPI);
  await runTest('Posts API (Unauthenticated)', testPostsAPIUnauthenticated);

  // Generate test report
  console.log('\n📊 Test Results Summary:');
  console.log(`=====================================`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📝 Total: ${testResults.passed + testResults.failed}`);
  console.log(`=====================================`);

  if (testResults.failed === 0) {
    console.log('🎉 All tests passed! Database schema is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the test results above.');
  }

  // Save detailed results
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      passed: testResults.passed,
      failed: testResults.failed,
      total: testResults.passed + testResults.failed
    },
    details: testResults.tests
  };

  console.log('\n📄 Detailed Test Report:');
  console.log(JSON.stringify(report, null, 2));

  return testResults.failed === 0;
}

// Execute tests if this file is run directly
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { runAllTests, testResults };