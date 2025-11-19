const express = require('express');
const router = express.Router();
const { authenticateToken: requireAuth } = require('../middleware/auth');
const {
    calculateMarketValue,
    getMarketData,
    addMarketData,
    getProductAnalysis
} = require('../controllers/marketValue');

// Calculate market value for a specific product
router.get('/calculate/:product_id', calculateMarketValue);

// Get market data (optionally filtered by category and brand)
router.get('/data', getMarketData);

// Add new market data point (admin only)
router.post('/data', requireAuth, addMarketData);

// Get stored market analysis for a product
router.get('/analysis/:product_id', getProductAnalysis);

module.exports = router;