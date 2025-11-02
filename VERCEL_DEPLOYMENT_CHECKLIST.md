# Vercel Deployment Checklist

## ✅ Completed Changes

### 1. Server Configuration (`server/index.js`)
- [x] Removed `app.listen()` call (lines 255-257)
- [x] Added `module.exports = app` for Vercel serverless functions
- [x] Removed duplicate `/test` endpoint
- [x] Fixed CSP configuration to remove template syntax

### 2. Vercel Configuration (`server/vercel.json`)
- [x] Added `functions` configuration with 30-second timeout
- [x] Simplified routing to catch all requests with `/(.*)`
- [x] Configured install command for dependencies
- [x] Removed conflicting route configurations that may cause 404s

## 📋 Environment Variables for Vercel

### Required Variables
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_KEY` - Your Supabase service role key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `CLIENT_URL` - Your frontend URL (e.g., https://your-app.vercel.app)

### Optional Variables
- `NODE_ENV` - Set to "production" for Vercel
- `PORT` - Not required for Vercel (uses port 3000 automatically)
- `BYPASS_EMAIL_CONFIRM` - Set to "true" for testing

## 🚀 Deployment Steps

### 1. Install Vercel CLI
```bash
npm i -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy to Vercel
```bash
# From the server directory
cd server
vercel
```

### 4. Set Environment Variables
In Vercel dashboard:
1. Go to your project
2. Settings → Environment Variables
3. Add all required variables from your `.env` file

### 5. Redeploy after changes
```bash
vercel --prod
```

## 🔍 Testing After Deployment

### 1. Test Basic Connectivity
```bash
curl https://your-project.vercel.app/test
# Expected: {"success":true,"message":"Test endpoint working"}
```

### 2. Test API Endpoints
```bash
curl https://your-project.vercel.app/api
# Expected: API information with all endpoints
```

### 3. Test Supabase Connection
```bash
curl https://your-project.vercel.app/api/verify-supabase
# Expected: Connection status information
```

## ⚠️ Troubleshooting

### 404 Errors
- Ensure `vercel.json` has correct routing
- Check that all environment variables are set
- Verify the `module.exports = app` is at the end of `index.js`

### Serverless Function Timeouts
- The timeout is set to 30 seconds in `vercel.json`
- For longer operations, consider background jobs

### Environment Issues
- Double-check that all Supabase credentials are correct
- Ensure `CLIENT_URL` matches your deployed frontend URL

### Persistent 404 Errors
If you're still getting 404 errors after deployment:
1. **Redeploy with `--force`**: `vercel --prod --force`
2. **Check Vercel logs**: Go to Vercel dashboard → Functions → View logs
3. **Verify file paths**: Ensure all paths in `vercel.json` match your actual file structure
4. **Clear cache**: Sometimes Vercel caches old configurations
5. **Test with simple endpoint**: Try accessing `https://your-project.vercel.app/test` first

## 📝 Notes

- The server now works with Vercel's serverless functions
- Each request is independent (no persistent server state)
- The `uploads` directory is reset on each deployment
- Consider using Vercel's Blob Storage for file uploads in production

## 🔄 Maintenance

- Update dependencies regularly: `npm update`
- Monitor Vercel deployment logs for errors
- Test new features in staging before production deployment