# Comprehensive Debugging Tests for 400 Bad Request Error

This directory contains a comprehensive set of tests designed to diagnose and identify the root cause of the 400 Bad Request error when accessing `http://localhost:5000/api/posts`.

## 🎯 Problem Statement

The `/api/posts` endpoint is returning a 400 Bad Request error, and we need to systematically identify whether the issue is related to:
- Authentication token verification
- CORS configuration
- Environment variable mismatches
- Server configuration
- Something else entirely

## 📁 Test Files

### 1. `test1-authentication-token.js`
**Purpose**: Authentication Token Verification Test
- Checks what token the client is actually sending
- Verifies the token format and structure
- Tests token validation on the server side
- Includes logging to show the exact token being sent and received

**Key Tests**:
- Rejects requests without authentication token
- Rejects requests with malformed token
- Rejects requests with expired token
- Accepts requests with valid token for protected routes
- Verifies Supabase service role key configuration
- Verifies Supabase regular key configuration

### 2. `test2-cors-configuration.js`
**Purpose**: CORS Configuration Test
- Tests the server's CORS configuration with different origins
- Checks if the request headers are properly handled
- Verifies if preflight requests are working correctly

**Key Tests**:
- Handles requests from localhost:3000 (default client URL)
- Handles requests from localhost:5000 (same origin)
- Handles requests from different origins with proper CORS headers
- Handles preflight OPTIONS requests
- Handles preflight requests with different methods
- Handles requests with custom headers
- Handles requests without Origin header (same-origin request)
- Handles requests with credentials

### 3. `test3-environment-variables.js`
**Purpose**: Environment Variable Validation Test
- Compares client and server environment variables
- Tests if the Supabase configuration is consistent
- Validates that all required environment variables are set

**Key Tests**:
- Validates server environment variables
- Validates client environment variables
- Compares server and client Supabase configurations
- Validates API URL consistency
- Validates CORS configuration
- Validates Supabase service role key
- Validates environment variable completeness

### 4. `test4-api-endpoint.js`
**Purpose**: API Endpoint Test
- Tests the `/api/posts` endpoint directly with curl-like requests
- Tests with and without authentication tokens
- Checks the exact error response from the server

**Key Tests**:
- GET /api/posts without authentication (optional auth)
- GET /api/posts with authentication
- POST /api/posts without authentication
- POST /api/posts with invalid authentication
- POST /api/posts with missing required fields
- POST /api/posts with invalid price
- POST /api/posts with valid data
- GET /api/posts/:id for non-existent post
- PUT /api/posts/:id without authentication
- DELETE /api/posts/:id without authentication
- Server endpoints (/test, 404 handling)
- CORS preflight tests

### 5. `test5-server-logging.js`
**Purpose**: Server Logging Test
- Adds enhanced logging to track requests
- Logs the exact error when the 400 occurs
- Includes request headers and body in the logs

**Key Tests**:
- Captures environment variable loading logs
- Captures authentication middleware logs
- Captures Supabase client creation logs
- Captures request/response logs
- Captures error logs
- Captures detailed request information
- Analyzes log patterns and identifies issues

### 6. `run-all-tests.js`
**Purpose**: Comprehensive Test Runner Script
- Runs all tests sequentially
- Generates detailed reports
- Provides diagnosis recommendations
- Includes curl-based API endpoint tests

## 🚀 How to Run the Tests

### Prerequisites
1. Ensure your server is running on `http://localhost:5000`
2. Install required dependencies:
   ```bash
   cd server
   npm install
   npm install --save-dev supertest jest
   ```

### Running Individual Tests

#### Test 1: Authentication Token Verification
```bash
cd server/tests
npx jest test1-authentication-token.js --verbose
```

#### Test 2: CORS Configuration
```bash
cd server/tests
npx jest test2-cors-configuration.js --verbose
```

#### Test 3: Environment Variable Validation
```bash
cd server/tests
npx jest test3-environment-variables.js --verbose
```

#### Test 4: API Endpoint Test
```bash
cd server/tests
npx jest test4-api-endpoint.js --verbose
```

#### Test 5: Server Logging Test
```bash
cd server/tests
npx jest test5-server-logging.js --verbose
```

### Running All Tests (Recommended)
```bash
cd server/tests
node run-all-tests.js
```

This will:
1. Run all Jest tests sequentially
2. Execute curl-based API endpoint tests
3. Generate a comprehensive report
4. Provide diagnosis recommendations

### Alternative: Using the Test Runner Script
```bash
cd server/tests
chmod +x run-all-tests.js
./run-all-tests.js
```

## 📊 Understanding the Results

### Test Status Indicators
- ✅ **PASSED**: The test completed successfully without errors
- ❌ **FAILED**: The test encountered errors or issues
- 🔍 **ANALYSIS**: The test found specific issues that need attention

### Common Failure Patterns and Their Meanings

#### Authentication Issues
- **"No token provided"**: Client is not sending Authorization header
- **"Invalid token"**: Token format is incorrect or token is malformed
- **"Token expired"**: JWT token has expired
- **"Token verification failed"**: Supabase service role key is invalid or database connection failed

#### CORS Issues
- **"No 'Access-Control-Allow-Origin' header"**: Server is not configured to accept requests from client origin
- **"Preflight request failed"**: OPTIONS requests are not being handled properly
- **"Credentials not allowed"**: Server is not configured to accept credentials

#### Environment Variable Issues
- **"Missing environment variables"**: Required variables are not set in .env files
- **"URL mismatch"**: Server and client Supabase URLs don't match
- **"Key mismatch"**: Server and client Supabase keys don't match

#### API Endpoint Issues
- **"Missing required fields"**: Request body is missing required fields (title, price, category)
- **"Invalid price"**: Price field is not a valid positive number
- **"Authentication required"**: Protected endpoint needs valid token
- **"Post not found"**: Requested post ID doesn't exist

#### Logging Issues
- **"No logs captured"**: Console logging is not working properly
- **"Error logs missing"**: Error handling is not functioning correctly

## 🔍 Diagnosis Workflow

### Step 1: Run All Tests
```bash
cd server/tests
node run-all-tests.js
```

### Step 2: Review the Report
The test runner will generate a comprehensive report showing:
- Which tests passed/failed
- Error messages and stack traces
- Key findings from each test
- Specific recommendations for fixing issues

### Step 3: Focus on Failed Tests
Based on the failed tests, identify the category of the problem:

#### If Authentication Tests Fail:
1. Check if Supabase service role key is correctly configured
2. Verify that the client is sending valid JWT tokens
3. Ensure the token format is correct (Bearer <token>)
4. Check if the token has expired

#### If CORS Tests Fail:
1. Verify that `CLIENT_URL` environment variable matches the client URL
2. Check if the server is running on the correct port
3. Ensure preflight requests are being handled
4. Verify that proper CORS headers are being sent

#### If Environment Variable Tests Fail:
1. Compare server and client .env files
2. Ensure all required variables are set
3. Check for URL and key consistency
4. Validate that API URLs match between client and server

#### If API Endpoint Tests Fail:
1. Check if the request body has all required fields
2. Verify data types and formats
3. Ensure authentication is properly configured
4. Check if the endpoint exists and is properly routed

#### If Logging Tests Fail:
1. Check if console logging is enabled
2. Verify that error handling is working
3. Ensure detailed request logging is configured
4. Check if the server is capturing logs properly

### Step 4: Run Individual Tests for Detailed Debugging
```bash
# Test authentication specifically
npx jest test1-authentication-token.js --verbose

# Test CORS specifically
npx jest test2-cors-configuration.js --verbose

# Test environment variables specifically
npx jest test3-environment-variables.js --verbose

# Test API endpoints specifically
npx jest test4-api-endpoint.js --verbose

# Test logging specifically
npx jest test5-server-logging.js --verbose
```

### Step 5: Check Server Logs During Test Execution
While tests are running, monitor the server console output for:
- Environment variable loading messages
- Authentication middleware logs
- Supabase client creation messages
- Request/response logs
- Error messages

## 🛠️ Common Fixes

### Authentication Issues
```bash
# Check if Supabase service role key is set
echo $SUPABASE_SERVICE_ROLE_KEY

# Verify token format in client requests
# Should be: Authorization: Bearer <jwt-token>
```

### CORS Issues
```bash
# Check CLIENT_URL environment variable
echo $CLIENT_URL

# Ensure it matches the client application URL
# Should be: http://localhost:3000 or your actual client URL
```

### Environment Variable Issues
```bash
# Compare server and client environment variables
cat server/.env
cat client/.env

# Ensure SUPABASE_URL and keys match between server and client
```

### API Endpoint Issues
```bash
# Test the endpoint manually with curl
curl -X GET http://localhost:5000/api/posts -v

# Check if required fields are included in POST requests
curl -X POST http://localhost:5000/api/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <valid-token>" \
  -d '{"title":"test","price":10,"category":"test"}' \
  -v
```

## 📝 Additional Debugging Commands

### Manual Testing with curl
```bash
# Test basic endpoint access
curl -X GET http://localhost:5000/api/posts -v

# Test with authentication
curl -X GET http://localhost:5000/api/posts \
  -H "Authorization: Bearer <your-token>" \
  -v

# Test with invalid authentication
curl -X GET http://localhost:5000/api/posts \
  -H "Authorization: Bearer invalid-token" \
  -v

# Test CORS preflight
curl -X OPTIONS http://localhost:5000/api/posts \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization" \
  -v
```

### Server Status Check
```bash
# Check if server is running
curl -X GET http://localhost:5000/test -v

# Check server environment variables
curl -X GET http://localhost:5000/api/posts -v 2>&1 | grep -i "environment"
```

## 🎯 Expected Outcomes

After running these tests, you should be able to:

1. **Identify the exact cause** of the 400 Bad Request error
2. **Understand the specific issue** (authentication, CORS, environment variables, etc.)
3. **Get actionable recommendations** for fixing the problem
4. **Verify that your fix works** by re-running the tests
5. **Prevent similar issues** in the future by understanding the root cause

## 📞 Support

If you encounter issues running these tests or need help interpreting the results:

1. Check the server console output for detailed error messages
2. Review the generated test report for specific recommendations
3. Run individual tests to isolate the problem
4. Ensure all prerequisites are met (server running, dependencies installed)

The comprehensive nature of these tests should help you pinpoint and resolve the 400 Bad Request error efficiently.