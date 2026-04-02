'use strict';

const express = require('express');
const router = express.Router();

const {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  markHelpful,
} = require('../controllers/reviewController');

const { protect, authorize } = require('../middleware/auth');
const { uploadReviewImages } = require('../middleware/upload');

// Public routes
router.get('/product/:productId', getProductReviews);

// Protected routes
router.post('/', protect, uploadReviewImages, createReview);
router.put('/:id', protect, updateReview);
router.delete('/:id', protect, deleteReview);
router.put('/:id/helpful', protect, markHelpful);

module.exports = router;
