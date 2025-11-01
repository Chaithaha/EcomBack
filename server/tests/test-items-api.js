/**
 * Comprehensive Test Suite for Items API
 * Tests the unified items endpoint with admin features
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Test configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api`;

// Test data
let adminToken = null;
let userToken = null;
let adminUserId = null;
let userUserId = null;
let createdItemId = null;
let adminCreatedItemId = null;

// Helper functions
const makeRequest = async (method, endpoint, data = null, token = null) => {
  try {
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500,
    };
  }
};

const logTest = (testName, passed, details = '') => {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${testName}${details ? ': ' + details : ''}`);
};

const logSection = (sectionName) => {
  console.log(`\n=== ${sectionName} ===`);
};

// Test functions
const testAuthentication = async () => {
  logSection('Authentication Tests');

  // Test admin login
  const adminLogin = await makeRequest('POST', '/auth/login', {
    email: 'admin@example.com',
    password: 'admin@123'
  });

  if (adminLogin.success && adminLogin.data.data && adminLogin.data.data.token) {
    adminToken = adminLogin.data.data.token;
    adminUserId = adminLogin.data.data.user.id;
    logTest('Admin login', true, `User ID: ${adminUserId}`);
  } else {
    logTest('Admin login', false, JSON.stringify(adminLogin.error));
    console.log('Full admin login response:', JSON.stringify(adminLogin, null, 2));
    return false;
  }

  // Create a test user with a different email
  const randomNum = Math.floor(Math.random() * 10000);
  const testEmail = `testuser${randomNum}@gmail.com`;
  const createUser = await makeRequest('POST', '/auth/register', {
    email: testEmail,
    password: 'test123',
    full_name: 'Test User'
  });

  if (createUser.success) {
    console.log('User creation response:', JSON.stringify(createUser.data, null, 2));
    // Login as the test user
    const userLogin = await makeRequest('POST', '/auth/login', {
      email: testEmail,
      password: 'test123'
    });

    if (userLogin.success && userLogin.data.data) {
      userToken = userLogin.data.data.token;
      userUserId = userLogin.data.data.user.id;
      logTest('User creation and login', true, `User ID: ${userUserId}`);
    } else {
      logTest('User login after creation', false, JSON.stringify(userLogin.error));
      return false;
    }
  } else {
    logTest('User creation', false, JSON.stringify(createUser.error));
    return false;
  }

  return true;
};

const testItemsCreation = async () => {
  logSection('Items Creation Tests');

  const testItem = {
    title: 'Test Item for API',
    description: 'This is a test item created via API',
    price: 99.99,
    category: 'electronics',
    images: []
  };

  // Test admin item creation (should auto-approve)
  const adminItem = await makeRequest('POST', '/items', testItem, adminToken);
  if (adminItem.success && adminItem.data.status === 'active') {
    adminCreatedItemId = adminItem.data.id;
    logTest('Admin item creation', true, `Auto-approved, ID: ${adminCreatedItemId}`);
  } else {
    logTest('Admin item creation', false, adminItem.error);
  }

  // Test user item creation (should be pending)
  const userItem = await makeRequest('POST', '/items', testItem, userToken);
  if (userItem.success && userItem.data.data && userItem.data.data.status === 'pending') {
    createdItemId = userItem.data.data.id;
    logTest('User item creation', true, `Pending approval, ID: ${createdItemId}`);
  } else {
    logTest('User item creation', false, JSON.stringify(userItem.error));
  }

  // Test unauthenticated item creation
  const unauthItem = await makeRequest('POST', '/items', testItem);
  logTest('Unauthenticated item creation', !unauthItem.success, 'Should fail');

  return true;
};

const testItemsRetrieval = async () => {
  logSection('Items Retrieval Tests');

  // Test public items retrieval (should only show active items)
  const publicItems = await makeRequest('GET', '/items');
  if (publicItems.success && Array.isArray(publicItems.data)) {
    const hasOnlyActive = publicItems.data.every(item => item.status === 'active');
    logTest('Public items retrieval', hasOnlyActive, `Found ${publicItems.data.length} active items`);
  } else {
    logTest('Public items retrieval', false, publicItems.error);
  }

  // Test authenticated items retrieval
  const authItems = await makeRequest('GET', '/items', null, userToken);
  if (authItems.success && Array.isArray(authItems.data)) {
    logTest('Authenticated items retrieval', true, `Found ${authItems.data.length} items`);
  } else {
    logTest('Authenticated items retrieval', false, authItems.error);
  }

  // Test admin items retrieval
  const adminItems = await makeRequest('GET', '/items', null, adminToken);
  if (adminItems.success && Array.isArray(adminItems.data)) {
    logTest('Admin items retrieval', true, `Found ${adminItems.data.length} items`);
  } else {
    logTest('Admin items retrieval', false, adminItems.error);
  }

  // Test filtering by status
  const pendingItems = await makeRequest('GET', '/items?status=pending', null, adminToken);
  if (pendingItems.success) {
    const hasOnlyPending = pendingItems.data.every(item => item.status === 'pending');
    logTest('Items filtering by status', hasOnlyPending, `Found ${pendingItems.data.length} pending items`);
  } else {
    logTest('Items filtering by status', false, pendingItems.error);
  }

  // Test filtering by user
  const userItems = await makeRequest('GET', `/items?user_id=${userUserId}`, null, adminToken);
  if (userItems.success) {
    const hasCorrectUser = userItems.data.every(item => item.user?.id === userUserId);
    logTest('Items filtering by user', hasCorrectUser, `Found ${userItems.data.length} user items`);
  } else {
    logTest('Items filtering by user', false, userItems.error);
  }

  // Test specific item retrieval
  if (createdItemId) {
    const specificItem = await makeRequest('GET', `/items/${createdItemId}`);
    if (specificItem.success && specificItem.data.id === createdItemId) {
      logTest('Specific item retrieval', true, `Item: ${specificItem.data.title}`);
    } else {
      logTest('Specific item retrieval', false, specificItem.error);
    }
  }

  return true;
};

const testItemsUpdate = async () => {
  logSection('Items Update Tests');

  if (!createdItemId) {
    logTest('Items update tests', false, 'No test item available');
    return false;
  }

  const updateData = {
    title: 'Updated Test Item',
    description: 'This item has been updated',
    price: 149.99
  };

  // Test user updating own item
  const userUpdate = await makeRequest('PUT', `/items/${createdItemId}`, updateData, userToken);
  if (userUpdate.success) {
    logTest('User updating own item', true, 'Title updated successfully');
  } else {
    logTest('User updating own item', false, userUpdate.error);
  }

  // Test admin updating user item
  const adminUpdate = await makeRequest('PUT', `/items/${createdItemId}`, {
    category: 'updated-category'
  }, adminToken);
  if (adminUpdate.success) {
    logTest('Admin updating user item', true, 'Category updated successfully');
  } else {
    logTest('Admin updating user item', false, adminUpdate.error);
  }

  // Test user updating another user's item (should fail)
  const otherUserUpdate = await makeRequest('PUT', `/items/${adminCreatedItemId}`, {
    title: 'Should not work'
  }, userToken);
  logTest('User updating another user item', !otherUserUpdate.success, 'Should fail');

  return true;
};

const testItemsStatusUpdate = async () => {
  logSection('Items Status Update Tests');

  if (!createdItemId) {
    logTest('Items status update tests', false, 'No test item available');
    return false;
  }

  // Test admin approving user item
  const approveItem = await makeRequest('PUT', `/items/${createdItemId}/status`, {
    status: 'active'
  }, adminToken);
  if (approveItem.success) {
    logTest('Admin approving item', true, 'Status changed to active');
  } else {
    logTest('Admin approving item', false, approveItem.error);
  }

  // Test admin rejecting item
  const rejectItem = await makeRequest('PUT', `/items/${createdItemId}/status`, {
    status: 'rejected'
  }, adminToken);
  if (rejectItem.success) {
    logTest('Admin rejecting item', true, 'Status changed to rejected');
  } else {
    logTest('Admin rejecting item', false, rejectItem.error);
  }

  // Test user updating status (should fail)
  const userStatusUpdate = await makeRequest('PUT', `/items/${createdItemId}/status`, {
    status: 'active'
  }, userToken);
  logTest('User updating item status', !userStatusUpdate.success, 'Should fail');

  return true;
};

const testItemsDeletion = async () => {
  logSection('Items Deletion Tests');

  if (!createdItemId || !adminCreatedItemId) {
    logTest('Items deletion tests', false, 'No test items available');
    return false;
  }

  // Test user deleting own item
  const userDelete = await makeRequest('DELETE', `/items/${createdItemId}`, null, userToken);
  if (userDelete.success) {
    logTest('User deleting own item', true, 'Item deleted successfully');
  } else {
    logTest('User deleting own item', false, userDelete.error);
  }

  // Test admin deleting any item
  const adminDelete = await makeRequest('DELETE', `/items/${adminCreatedItemId}`, null, adminToken);
  if (adminDelete.success) {
    logTest('Admin deleting any item', true, 'Item deleted successfully');
  } else {
    logTest('Admin deleting any item', false, adminDelete.error);
  }

  // Test user deleting another user's item (should fail)
  const otherUserDelete = await makeRequest('DELETE', `/items/${createdItemId}`, null, userToken);
  logTest('User deleting another user item', !otherUserDelete.success, 'Should fail');

  return true;
};

const testErrorHandling = async () => {
  logSection('Error Handling Tests');

  // Test invalid item ID
  const invalidItem = await makeRequest('GET', '/items/invalid-uuid');
  logTest('Invalid item ID', !invalidItem.success, 'Should return 404');

  // Test invalid status update
  const invalidStatus = await makeRequest('PUT', `/items/${createdItemId}/status`, {
    status: 'invalid-status'
  }, adminToken);
  logTest('Invalid status update', !invalidStatus.success, 'Should reject invalid status');

  // Test missing required fields
  const missingFields = await makeRequest('POST', '/items', {
    title: 'Missing fields'
  }, adminToken);
  logTest('Missing required fields', !missingFields.success, 'Should reject incomplete data');

  // Test invalid price
  const invalidPrice = await makeRequest('POST', '/items', {
    title: 'Invalid Price',
    price: 'not-a-number',
    category: 'test'
  }, adminToken);
  logTest('Invalid price format', !invalidPrice.success, 'Should reject invalid price');

  return true;
};

const generateTestReport = (results) => {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length
    },
    tests: results
  };

  const reportPath = path.join(__dirname, `test-report-items-${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📊 Test report saved to: ${reportPath}`);

  return report;
};

// Main test runner
const runAllTests = async () => {
  console.log('🚀 Starting Items API Test Suite\n');
  console.log(`Testing against: ${API_BASE}`);

  const results = [];

  try {
    // Run all test suites
    const authSuccess = await testAuthentication();
    if (!authSuccess) {
      console.log('❌ Authentication tests failed. Stopping test suite.');
      return;
    }

    await testItemsCreation();
    await testItemsRetrieval();
    await testItemsUpdate();
    await testItemsStatusUpdate();
    await testItemsDeletion();
    await testErrorHandling();

    // Generate and display summary
    const report = generateTestReport(results);
    
    console.log('\n=== Test Summary ===');
    console.log(`Total Tests: ${report.summary.total}`);
    console.log(`Passed: ${report.summary.passed}`);
    console.log(`Failed: ${report.summary.failed}`);
    console.log(`Success Rate: ${((report.summary.passed / report.summary.total) * 100).toFixed(1)}%`);

    if (report.summary.failed === 0) {
      console.log('\n🎉 All tests passed!');
    } else {
      console.log('\n⚠️  Some tests failed. Check the report for details.');
    }

  } catch (error) {
    console.error('❌ Test suite crashed:', error.message);
  }
};

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  runAllTests,
  testAuthentication,
  testItemsCreation,
  testItemsRetrieval,
  testItemsUpdate,
  testItemsStatusUpdate,
  testItemsDeletion,
  testErrorHandling
};