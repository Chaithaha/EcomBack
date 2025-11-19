const router = require('express').Router();
const { getPosts, createPost, updatePostStatus, deletePost, updatePost, getPostById } = require('../controllers/posts');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// GET /api/posts - Get all posts (optional auth)
router.route('/').get(optionalAuth, getPosts);

// POST /api/posts - Create new post (requires auth)
router.route('/').post(authenticateToken, createPost);

// PUT /api/posts/:id/status - Update post status (requires auth)
router.route('/:id/status').put(authenticateToken, updatePostStatus);

// PUT /api/posts/:id - Update post (requires auth)
router.route('/:id').put(authenticateToken, updatePost);

// GET /api/posts/:id - Get specific post (optional auth)
router.route('/:id').get(optionalAuth, getPostById);

// DELETE /api/posts/:id - Delete post (requires auth)
router.route('/:id').delete(authenticateToken, deletePost);

module.exports = router;