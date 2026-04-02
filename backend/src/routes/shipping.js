'use strict';

const express = require('express');
const router = express.Router();

const {
  calculateShipping,
  createShipment,
  trackShipment,
} = require('../controllers/shippingController');

const { protect, authorize } = require('../middleware/auth');

// Public route — anyone can calculate shipping or track
router.post('/calculate', calculateShipping);
router.get('/track/:waybill', trackShipment);

// Admin route — create shipment on Delhivery
router.post('/create', protect, authorize('admin'), createShipment);

module.exports = router;
