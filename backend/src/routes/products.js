'use strict';

const express = require('express');
const router = express.Router();

const {
  getProducts,
  getFeaturedProducts,
  getTopProducts,
  searchProducts,
  getProduct,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
  getBrands,
} = require('../controllers/productController');

const { protect, authorize } = require('../middleware/auth');
const { uploadProductImages } = require('../middleware/upload');
// Public routes
router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/top', getTopProducts);
router.get('/brands', getBrands);
router.get('/search', searchProducts);
router.get('/category/:categorySlug', getProductsByCategory);
router.get('/id/:id', protect, authorize('admin', 'vendor'), getProductById);
router.get('/:slug', getProduct);

// Admin/Vendor routes
router.post(
  '/',
  protect,
  authorize('admin', 'vendor'),
  uploadProductImages,
  createProduct
);

router.put(
  '/:id',
  protect,
  authorize('admin', 'vendor'),
  uploadProductImages,
  updateProduct
);

router.delete(
  '/:id',
  protect,
  authorize('admin'),
  deleteProduct
);

module.exports = router;
