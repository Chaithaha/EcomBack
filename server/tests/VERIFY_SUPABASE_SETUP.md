# Supabase Configuration Verification Guide

This guide explains how to use the Supabase configuration verification script to ensure your environment variables are properly set up and troubleshoot any issues.

## Overview

The `verify-supabase-config.js` script helps you:

1. ✅ Check if required environment variables are set
2. ✅ Verify that variables are properly loaded in your code
3. ✅ Test Supabase connections
4. ✅ Identify configuration issues that might cause RLS permission problems
5. ✅ Provide setup instructions for missing variables

## Prerequisites

- Node.js installed
- Your Supabase project credentials
- Existing `.env` files (or `.env.example` templates)

## Usage

### 1. Run the Verification Script

```bash
# Navigate to the server directory
cd server

# Run the verification script
node verify-supabase-config.js
```

### 2. Test Endpoint

After adding the test endpoint to `server/index.js`, you can also test it directly:

```bash
# Start your server
npm run dev

# Test the endpoint in your browser or with curl
curl http://localhost:5000/api/verify-supabase
```

## What the Script Checks

### Server Environment Variables
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_KEY` - Your Supabase anon/public API key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

### Client Environment Variables
- `REACT_APP_SUPABASE_URL` - Client-side Supabase URL
- `REACT_APP_SUPABASE_KEY` - Client-side Supabase API key

### Configuration Files
- `server/.env` - Server environment variables
- `client/.env` - Client environment variables
- `server/utils/supabase.js` - Server-side Supabase configuration
- `client/src/utils/supabase.js` - Client-side Supabase configuration

### Connection Tests
- Regular Supabase client connection
- Service role client connection
- Basic database query execution

## Getting Your Supabase Credentials

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Settings > API**
4. Copy the following:
   - **Project URL** - Use for `SUPABASE_URL` and `REACT_APP_SUPABASE_URL`
   - **anon public** key - Use for `SUPABASE_KEY` and `REACT_APP_SUPABASE_KEY`
   - **service_role** key - Use for `SUPABASE_SERVICE_ROLE_KEY`

## Setting Up Environment Variables

### Server Configuration

Create or update `server/.env`:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-service-role-key
PORT=5000
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

### Client Configuration

Create or update `client/.env`:

```env
# API Configuration
REACT_APP_API_URL=http://localhost:5000
NODE_ENV=development

# Supabase Configuration
REACT_APP_SUPABASE_URL=https://your-project-ref.supabase.co
REACT_APP_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-anon-key
```

## Common Issues and Solutions

### 1. Missing Environment Variables

**Problem:** Script shows "NOT SET" for required variables

**Solution:**
- Create `.env` files with the correct values
- Ensure you're using the correct key names
- Restart your server after making changes

### 2. Placeholder Values

**Problem:** Script detects placeholder values like `your_supabase_project_url`

**Solution:**
- Replace placeholder values with your actual Supabase credentials
- Get fresh credentials from your Supabase dashboard if needed

### 3. Connection Failures

**Problem:** Connection test fails even with correct variables

**Solutions:**
- Check your internet connection
- Verify the Supabase project is active
- Ensure the API keys haven't expired
- Check if there are any network restrictions

### 4. RLS Permission Issues

**Problem:** Environment variables are correct but still getting permission errors

**Solutions:**
- Check Row Level Security (RLS) policies in your Supabase dashboard
- Ensure users are properly authenticated
- Verify RLS policies allow the operations you're trying to perform
- Check if you're using the correct client (regular vs service role)

## Troubleshooting Steps

1. **Run the verification script** to identify issues
2. **Check environment variables** in your `.env` files
3. **Verify credentials** in your Supabase dashboard
4. **Test connections** using the provided test endpoint
5. **Check RLS policies** if environment variables are correct
6. **Restart services** after making changes

## Adding the Test Endpoint

The script provides code to add a test endpoint to `server/index.js`. This endpoint allows you to:

- Check environment variable status
- Test Supabase connections
- Get detailed error information

To add it:

1. Copy the test endpoint code from the script output
2. Add it to `server/index.js` before the 404 handler
3. Restart your server
4. Access it at `http://localhost:5000/api/verify-supabase`

## Interpreting Results

### Success
- All environment variables are set
- Both regular and service role connections work
- No errors in connection tests

### Partial Success
- Environment variables are set
- Some connections may fail
- Check specific error messages for details

### Failure
- Missing environment variables
- Invalid credentials
- Connection issues
- Configuration problems

## Next Steps

If the verification script passes but you're still experiencing issues:

1. **Check RLS Policies** in your Supabase dashboard
2. **Verify User Authentication** is working correctly
3. **Test Database Operations** directly in the Supabase SQL editor
4. **Review Application Code** for proper error handling
5. **Check Network Configuration** for any restrictions

## Support

If you continue to experience issues:

1. Check the [Supabase Documentation](https://supabase.com/docs)
2. Review your project settings in the Supabase dashboard
3. Ensure all dependencies are properly installed
4. Check for any recent changes to your database schema

---

This verification script should help you quickly identify and resolve Supabase configuration issues that might be contributing to RLS permission problems.