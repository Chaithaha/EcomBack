const router = require('express').Router();
const { getUsers, getActiveUsers, updateUser, deleteUser } = require('../controllers/users');

// GET /api/users - Get all users (requires auth)
router.route('/').get(getUsers);

// GET /api/users/active - Get currently active users (requires auth)
router.route('/active').get(getActiveUsers);

// PUT /api/users/:id - Update user (requires auth)
router.route('/:id').put(updateUser);

// DELETE /api/users/:id - Delete user (requires auth)
router.route('/:id').delete(deleteUser);

module.exports = router;