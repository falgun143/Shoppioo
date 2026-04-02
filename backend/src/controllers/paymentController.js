'use strict';

const crypto = require('crypto');
const razorpay = require('../config/razorpay');
const Order = require('../models/Order');
const ErrorResponse = require('../utils/errorResponse');
const logger = require('../utils/logger');

// @desc    Create Razorpay order
// @route   POST /api/v1/payment/create-order
// @access  Private
exports.createRazorpayOrder = async (req, res, next) => {
  try {
    const { amount, currency = 'INR', receipt } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return next(new ErrorResponse('Valid amount is required.', 400));
    }

    const amountInPaise = Math.round(Number(amount) * 100);

    const options = {
      amount: amountInPaise,
      currency,
      receipt: receipt || `rcpt_${req.user._id}_${Date.now()}`,
      notes: {
        userId: req.user._id.toString(),
        userEmail: req.user.email,
      },
    };

    const order = await razorpay.orders.create(options);

    logger.info(`Razorpay order created: ${order.id} for user ${req.user.email}`);

    res.status(201).json({
      success: true,
      razorpayOrderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    logger.error(`Razorpay order creation failed: ${error.message}`);
    next(new ErrorResponse('Failed to create payment order. Please try again.', 500));
  }
};

// @desc    Verify Razorpay payment signature
// @route   POST /api/v1/payment/verify
// @access  Private
exports.verifyRazorpayPayment = async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return next(new ErrorResponse('Incomplete payment verification data.', 400));
    }

    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    const isValid = expectedSignature === razorpaySignature;

    if (!isValid) {
      logger.warn(`Invalid Razorpay signature for order: ${razorpayOrderId}`);
      return next(new ErrorResponse('Payment verification failed. Invalid signature.', 400));
    }

    logger.info(`Payment verified: ${razorpayPaymentId}`);

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully.',
      verified: true,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Handle Razorpay webhooks
// @route   POST /api/v1/payment/webhook
// @access  Public (webhook)
exports.razorpayWebhook = async (req, res, next) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (webhookSecret) {
      // Verify webhook signature
      const signature = req.headers['x-razorpay-signature'];
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(req.body) // raw body
        .digest('hex');

      if (signature !== expectedSignature) {
        logger.warn('Invalid Razorpay webhook signature');
        return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
      }
    }

    const event = JSON.parse(req.body);
    logger.info(`Razorpay webhook received: ${event.event}`);

    switch (event.event) {
      case 'payment.captured': {
        const payment = event.payload.payment.entity;
        const razorpayOrderId = payment.order_id;

        const order = await Order.findOne({ 'paymentResult.razorpayOrderId': razorpayOrderId });

        if (order && !order.isPaid) {
          order.isPaid = true;
          order.paidAt = new Date();
          order.orderStatus = 'confirmed';
          order.paymentResult.razorpayPaymentId = payment.id;
          order.paymentResult.status = 'captured';
          await order.save();
          logger.info(`Order ${order.orderNumber} marked as paid via webhook`);
        }
        break;
      }

      case 'payment.failed': {
        const payment = event.payload.payment.entity;
        const razorpayOrderId = payment.order_id;

        const order = await Order.findOne({ 'paymentResult.razorpayOrderId': razorpayOrderId });

        if (order && order.orderStatus === 'pending') {
          order.paymentResult.status = 'failed';
          order.orderStatus = 'cancelled';
          order.cancelReason = `Payment failed: ${payment.error_description || 'Unknown error'}`;
          await order.save();

          // Restore stock
          for (const item of order.items) {
            await require('../models/Product').findByIdAndUpdate(item.product, {
              $inc: { stock: item.quantity, soldCount: -item.quantity },
            });
          }

          logger.warn(`Payment failed for order: ${order?.orderNumber}`);
        }
        break;
      }

      case 'refund.processed': {
        const refund = event.payload.refund.entity;
        const order = await Order.findOne({
          'paymentResult.refundId': refund.id,
        });

        if (order) {
          order.orderStatus = 'refunded';
          order.paymentResult.status = 'refunded';
          await order.save();
          logger.info(`Refund processed for order: ${order.orderNumber}`);
        }
        break;
      }

      default:
        logger.info(`Unhandled webhook event: ${event.event}`);
    }

    res.status(200).json({ success: true, received: true });
  } catch (error) {
    logger.error(`Webhook processing error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
};

// @desc    Get payment details from Razorpay
// @route   GET /api/v1/payment/:paymentId
// @access  Private (Admin)
exports.getPaymentDetails = async (req, res, next) => {
  try {
    const { paymentId } = req.params;

    const payment = await razorpay.payments.fetch(paymentId);

    res.status(200).json({
      success: true,
      payment,
    });
  } catch (error) {
    logger.error(`Failed to fetch payment details: ${error.message}`);
    next(new ErrorResponse('Failed to retrieve payment details.', 500));
  }
};
