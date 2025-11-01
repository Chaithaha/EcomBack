const express = require('express');
require('dotenv').config();

const app = express();
app.use(express.json());

// Basic test endpoint
app.get('/test', (req, res) => {
  res.json({ success: true, message: 'Minimal server working' });
});

// Simple auth endpoint
app.post('/api/auth/login', (req, res) => {
  console.log('Login request received:', req.body);
  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: 'test-id',
        email: req.body.email,
        role: 'admin'
      },
      token: 'test-token'
    }
  });
});

// Simple items endpoint
app.get('/api/items', (req, res) => {
  res.json([
    { id: '1', title: 'Test Item 1', status: 'active' },
    { id: '2', title: 'Test Item 2', status: 'active' }
  ]);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Minimal server running on port ${PORT}`);
});