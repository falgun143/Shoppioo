'use strict';

const express = require('express');
const router = express.Router();

const {
  createOrder,
  verifyPayment,
  getMyOrders,
  getOrder,
  cancelOrder,
  requestReturn,
  getAllOrders,
  updateOrderStatus,
} = require('../controllers/orderController');

const { protect, authorize } = require('../middleware/auth');

// All order routes require authentication
router.use(protect);

// Admin routes (must be defined before /:id to avoid conflicts)
router.get('/admin/all', authorize('admin'), getAllOrders);
router.put('/admin/:id/status', authorize('admin'), updateOrderStatus);

// Customer routes
router.post('/', createOrder);
router.post('/verify-payment', verifyPayment);
router.get('/', getMyOrders);
router.get('/:id', getOrder);
router.put('/:id/cancel', cancelOrder);
router.put('/:id/return', requestReturn);

module.exports = router;
