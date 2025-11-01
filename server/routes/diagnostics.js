const express = require('express');
const router = express.Router();
const { authenticateToken: requireAuth } = require('../middleware/auth');
const {
    createDiagnosticReport,
    getDiagnosticReportsByProduct,
    getDiagnosticReportById,
    updateDiagnosticReport,
    deleteDiagnosticReport
} = require('../controllers/diagnostics');

// Create a new diagnostic report
router.post('/', requireAuth, createDiagnosticReport);

// Get all diagnostic reports for a specific product
router.get('/product/:product_id', getDiagnosticReportsByProduct);

// Get a specific diagnostic report by ID
router.get('/:id', getDiagnosticReportById);

// Update a diagnostic report
router.put('/:id', requireAuth, updateDiagnosticReport);

// Delete a diagnostic report
router.delete('/:id', requireAuth, deleteDiagnosticReport);

module.exports = router;