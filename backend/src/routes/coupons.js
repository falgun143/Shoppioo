'use strict';

const express = require('express');
const router = express.Router();

const {
  validateCoupon,
  createCoupon,
  getAllCoupons,
  updateCoupon,
  deleteCoupon,
} = require('../controllers/couponController');

const { protect, authorize } = require('../middleware/auth');

// Validate coupon — requires auth (needs user context)
router.post('/validate', protect, validateCoupon);

// Admin routes
router.use(protect, authorize('admin'));

router.get('/', getAllCoupons);
router.post('/', createCoupon);
router.put('/:id', updateCoupon);
router.delete('/:id', deleteCoupon);

module.exports = router;
