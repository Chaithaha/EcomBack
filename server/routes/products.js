
const router = require('express').Router();
const { getProducts, getProductById } = require('../controllers/products');

router.route('/').get(getProducts);
router.route('/:id').get(getProductById);

module.exports = router;
