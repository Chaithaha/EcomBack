const router = require('express').Router();
const { 
    getItems, 
    createItem, 
    updateItemStatus, 
    deleteItem, 
    updateItem, 
    getItemById 
} = require('../controllers/items');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// GET /api/items - Get all items (optional auth, supports filtering)
// Query parameters: status, category, user_id, limit, offset
router.route('/').get(optionalAuth, getItems);

// POST /api/items - Create new item (requires auth)
// Admin items auto-approve, user items start as pending
router.route('/').post(authenticateToken, createItem);

// PUT /api/items/:id/status - Update item status (requires auth)
// Admins can update any item status, users can only update their own
router.route('/:id/status').put(authenticateToken, updateItemStatus);

// PUT /api/items/:id - Update item (requires auth)
// Admins can update any item, users can only update their own
router.route('/:id').put(authenticateToken, updateItem);

// GET /api/items/:id - Get specific item (optional auth)
router.route('/:id').get(optionalAuth, getItemById);

// DELETE /api/items/:id - Delete item (requires auth)
// Admins can delete any item, users can only delete their own
router.route('/:id').delete(authenticateToken, deleteItem);

module.exports = router;