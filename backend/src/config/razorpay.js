'use strict';

const Razorpay = require('razorpay');
const logger = require('../utils/logger');

let razorpayInstance = null;

const getRazorpay = () => {
  if (razorpayInstance) return razorpayInstance;

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    logger.error('Razorpay credentials are not defined in environment variables');
    throw new Error('Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
  }

  razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  return razorpayInstance;
};

// Proxy so callers can use `razorpay.orders.create(...)` directly
module.exports = new Proxy(
  {},
  {
    get(_, prop) {
      return getRazorpay()[prop];
    },
  }
);
