'use strict';

const express = require('express');
const router = express.Router();

const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  toggleWishlist,
  moveToCart,
} = require('../controllers/wishlistController');

const { protect } = require('../middleware/auth');

// All wishlist routes require authentication
router.use(protect);

router.get('/', getWishlist);
router.post('/add', addToWishlist);
router.post('/toggle/:productId', toggleWishlist);
router.delete('/remove/:productId', removeFromWishlist);
router.post('/move-to-cart/:productId', moveToCart);

module.exports = router;
