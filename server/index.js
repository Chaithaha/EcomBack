
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Debug logging to track environment variables
console.log('Environment Variables Loaded:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? '***SET***' : '***NOT SET***');
console.log('PORT:', process.env.PORT);
console.log('CLIENT_URL:', process.env.CLIENT_URL);

const app = express();
const port = process.env.PORT || 5000;

// Test endpoint for basic functionality (placed before any middleware)
app.get('/test', (req, res) => {
  console.log('Test endpoint hit');
  res.json({ success: true, message: 'Test endpoint working' });
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for test uploads
const testStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `test-${uniqueSuffix}${ext}`);
    }
});

const testUpload = multer({
    storage: testStorage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 5 // Maximum 5 files
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    }
});

// Enhanced middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "http://localhost:3000", '${import.meta.env.REACT_APP_API_URL}'],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  }
}));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static('uploads'));

const usersRouter = require('./routes/users');
const postsRouter = require('./routes/posts');
const itemsRouter = require('./routes/items');
const imagesRouter = require('./routes/images');
const testImagesRouter = require('./routes/test-images');
const authRouter = require('./routes/auth');
const diagnosticsRouter = require('./routes/diagnostics');
const marketValueRouter = require('./routes/marketValue');
const { authenticateToken } = require('./middleware/auth');

// Public routes (no authentication required)
app.use('/api/auth', authRouter);

// Protected routes (authentication required)
app.use('/api/users', authenticateToken, usersRouter);
app.use('/api/images', authenticateToken, imagesRouter.router);

// Routes that handle their own authentication per endpoint
app.use('/api/posts', postsRouter);
app.use('/api/items', itemsRouter);
app.use('/api/diagnostics', diagnosticsRouter);
app.use('/api/market-value', marketValueRouter);

// Test route for image upload without authentication
app.use('/api/images/test', testImagesRouter);

// Base API route - provides information about available endpoints
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'E-Commerce API Server',
    version: '1.0.0',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Register new user',
        'POST /api/auth/login': 'User login',
        'POST /api/auth/logout': 'User logout',
        'GET /api/auth/me': 'Get current user info'
      },
      public: {
        'GET /api/products': 'Get all products',
        'GET /api/products/:id': 'Get specific product',
        'GET /api/posts': 'Get all posts (public)',
        'GET /api/posts/:id': 'Get specific post (public)',
        'GET /api/items': 'Get all items (public)',
        'GET /api/items/:id': 'Get specific item (public)'
      },
      protected: {
        'GET /api/users': 'Get all users (auth required)',
        'PUT /api/users/:id': 'Update user (auth required)',
        'DELETE /api/users/:id': 'Delete user (auth required)',
        'POST /api/posts': 'Create post (auth required)',
        'PUT /api/posts/:id': 'Update post (auth required)',
        'DELETE /api/posts/:id': 'Delete post (auth required)',
        'POST /api/items': 'Create item (auth required)',
        'PUT /api/items/:id': 'Update item (auth required)',
        'DELETE /api/items/:id': 'Delete item (auth required)',
        'GET /api/images/:postId': 'Get images for post (auth required)',
        'POST /api/images/store-metadata': 'Store image metadata (auth required)',
        'DELETE /api/images/:id': 'Delete image (auth required)',
        'POST /api/diagnostics': 'Create diagnostic report (auth required)',
        'PUT /api/diagnostics/:id': 'Update diagnostic report (auth required)',
        'DELETE /api/diagnostics/:id': 'Delete diagnostic report (auth required)',
        'POST /api/market-value/data': 'Add market data (auth required)'
      },
      mixed: {
        'GET /api/diagnostics/product/:product_id': 'Get diagnostic reports for product (public)',
        'GET /api/diagnostics/:id': 'Get specific diagnostic report (public)',
        'GET /api/market-value/calculate/:product_id': 'Calculate market value for product (public)',
        'GET /api/market-value/data': 'Get market data (public, filterable)',
        'GET /api/market-value/analysis/:product_id': 'Get market analysis for product (public)'
      },
      test: {
        'GET /test': 'Basic connectivity test',
        'GET /api/verify-supabase': 'Verify Supabase configuration',
        'POST /api/images/test/test-upload': 'Test image upload (no auth)'
      }
    },
    authentication: {
      type: 'Bearer Token',
      header: 'Authorization: Bearer <token>',
      login: 'POST /api/auth/login'
    }
  });
});

// Test endpoint for Supabase configuration verification
app.get('/api/verify-supabase', async (req, res) => {
  try {
    const { getSupabaseClient, getSupabaseServiceClient } = require('./utils/supabase');
    
    // Check environment variables
    const envStatus = {
      SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'NOT SET',
      SUPABASE_KEY: process.env.SUPABASE_KEY ? 'SET' : 'NOT SET',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET'
    };
    
    // Test regular client
    let clientStatus = 'FAILED';
    let clientError = null;
    try {
      const client = getSupabaseClient();
      const { data, error } = await client.from('profiles').select('id').limit(1);
      if (error) throw error;
      clientStatus = 'SUCCESS';
    } catch (error) {
      clientError = error.message;
    }
    
    // Test service client
    let serviceClientStatus = 'FAILED';
    let serviceClientError = null;
    try {
      const serviceClient = getSupabaseServiceClient();
      const { data, error } = await serviceClient.from('profiles').select('id').limit(1);
      if (error) throw error;
      serviceClientStatus = 'SUCCESS';
    } catch (error) {
      serviceClientError = error.message;
    }
    
    res.json({
      success: true,
      environment: envStatus,
      clientConnection: {
        status: clientStatus,
        error: clientError
      },
      serviceClientConnection: {
        status: serviceClientStatus,
        error: serviceClientError
      },
      overall: clientStatus === 'SUCCESS' && serviceClientStatus === 'SUCCESS' ? 'SUCCESS' : 'FAILED'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Test endpoint for basic functionality
app.get('/test', (req, res) => {
  console.log('Test endpoint hit');
  res.json({ success: true, message: 'Test endpoint working' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});
