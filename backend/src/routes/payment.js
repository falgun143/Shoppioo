'use strict';

const express = require('express');
const router = express.Router();

const {
  createRazorpayOrder,
  verifyRazorpayPayment,
  razorpayWebhook,
  getPaymentDetails,
} = require('../controllers/paymentController');

const { protect, authorize } = require('../middleware/auth');
// Webhook — public, no auth (must use raw body — set in app.js)
router.post('/webhook', razorpayWebhook);

// Protected routes
router.use(protect);

router.post('/create-order', createRazorpayOrder);
router.post('/verify', verifyRazorpayPayment);
router.get('/:paymentId', authorize('admin'), getPaymentDetails);

module.exports = router;
