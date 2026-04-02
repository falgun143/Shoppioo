'use strict';

const crypto = require('crypto');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const razorpay = require('../config/razorpay');
const ErrorResponse = require('../utils/errorResponse');
const { sendSMS } = require('../utils/sms');
const logger = require('../utils/logger');

const TAX_RATE = 0.18; // 18% GST

// @desc    Create order (Razorpay or COD)
// @route   POST /api/v1/orders
// @access  Private
exports.createOrder = async (req, res, next) => {
  try {
    const { shippingAddress, paymentMethod, couponCode, notes } = req.body;

    if (!shippingAddress || !paymentMethod) {
      return next(new ErrorResponse('Shipping address and payment method are required.', 400));
    }

    if (!['razorpay', 'cod'].includes(paymentMethod)) {
      return next(new ErrorResponse('Payment method must be razorpay or cod.', 400));
    }

    // Get cart
    const cart = await Cart.findOne({ user: req.user._id }).populate(
      'items.product',
      'name price discountPrice stock isActive images sku'
    );

    if (!cart || cart.items.length === 0) {
      return next(new ErrorResponse('Your cart is empty. Add items before placing an order.', 400));
    }

    // Validate stock and build order items
    const orderItems = [];
    const stockUpdates = [];

    for (const item of cart.items) {
      const product = item.product;

      if (!product || !product.isActive) {
        return next(
          new ErrorResponse(`Product "${item.name}" is no longer available.`, 400)
        );
      }

      if (product.stock < item.quantity) {
        return next(
          new ErrorResponse(
            product.stock === 0
              ? `"${product.name}" is out of stock.`
              : `Only ${product.stock} unit(s) of "${product.name}" are available.`,
            400
          )
        );
      }

      const currentPrice = product.discountPrice || product.price;
      const defaultImage =
        product.images.find((img) => img.isDefault)?.url || product.images[0]?.url || '';

      orderItems.push({
        product: product._id,
        name: product.name,
        image: defaultImage,
        price: currentPrice,
        quantity: item.quantity,
        sku: product.sku,
      });

      stockUpdates.push({
        id: product._id,
        quantity: item.quantity,
      });
    }

    // Calculate prices
    const itemsPrice = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shippingPrice = 0;
    const taxPrice = Math.round(itemsPrice * TAX_RATE);

    // Handle coupon
    let discount = 0;
    let couponDoc = null;

    if (couponCode || cart.couponCode) {
      const code = couponCode || cart.couponCode;
      couponDoc = await Coupon.findOne({ code: code.toUpperCase() });

      if (couponDoc) {
        const { valid, discount: couponDiscount } = couponDoc.isValid(req.user._id, itemsPrice);
        if (valid) {
          discount = couponDiscount;
        }
      }
    }

    const totalPrice = Math.max(itemsPrice + shippingPrice + taxPrice - discount, 0);

    // Create order document
    const order = new Order({
      user: req.user._id,
      items: orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice: Math.round(itemsPrice),
      shippingPrice,
      taxPrice,
      totalPrice: Math.round(totalPrice),
      coupon: couponDoc ? couponDoc._id : null,
      couponCode: couponDoc ? couponDoc.code : null,
      discount,
      notes,
      orderStatus: 'pending',
    });

    // For Razorpay: create payment order
    if (paymentMethod === 'razorpay') {
      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(totalPrice) * 100, // in paise
        currency: 'INR',
        receipt: `receipt_${Date.now()}`,
        notes: {
          userId: req.user._id.toString(),
          userEmail: req.user.email,
        },
      });

      order.paymentResult = {
        razorpayOrderId: razorpayOrder.id,
        status: 'pending',
      };

      await order.save();

      // Deduct stock
      await deductStock(stockUpdates);

      // Clear cart
      await clearUserCart(req.user._id);

      // Update coupon usage
      if (couponDoc) {
        await updateCouponUsage(couponDoc, req.user._id);
      }

      logger.info(`Razorpay order created: ${order.orderNumber} for user ${req.user.email}`);

      return res.status(201).json({
        success: true,
        message: 'Order created. Please complete payment.',
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          totalPrice: order.totalPrice,
        },
        razorpayOrderId: razorpayOrder.id,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
      });
    }

    // COD order
    order.orderStatus = 'confirmed';
    await order.save();

    // Deduct stock
    await deductStock(stockUpdates);

    // Clear cart
    await clearUserCart(req.user._id);

    // Update coupon usage
    if (couponDoc) {
      await updateCouponUsage(couponDoc, req.user._id);
    }

    // Send COD order confirmation SMS (non-blocking)
    if (req.user.phone) {
      sendSMS(req.user.phone, 'orderPlacedCOD', {
        orderNumber: order.orderNumber,
        totalPrice: order.totalPrice,
      }).catch((err) => logger.error(`COD order SMS failed: ${err.message}`));
    }

    logger.info(`COD order created: ${order.orderNumber} for user ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully.',
      order,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Razorpay payment and confirm order
// @route   POST /api/v1/orders/verify-payment
// @access  Private
exports.verifyPayment = async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return next(new ErrorResponse('Payment verification data is incomplete.', 400));
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      return next(new ErrorResponse('Payment signature verification failed. Possible fraud attempt.', 400));
    }

    // Find and update order
    const order = await Order.findOne({
      'paymentResult.razorpayOrderId': razorpayOrderId,
      user: req.user._id,
    });

    if (!order) {
      return next(new ErrorResponse('Order not found.', 404));
    }

    if (order.isPaid) {
      return res.status(200).json({
        success: true,
        message: 'Payment already verified.',
        order,
      });
    }

    order.isPaid = true;
    order.paidAt = new Date();
    order.orderStatus = 'confirmed';
    order.paymentResult = {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      status: 'captured',
    };

    await order.save();

    // Populate order to get user phone
    const populatedOrder = await Order.findById(order._id).populate('user', 'name phone');

    // Send payment confirmed SMS (non-blocking)
    if (populatedOrder.user?.phone) {
      sendSMS(populatedOrder.user.phone, 'orderConfirmedRazorpay', {
        orderNumber: order.orderNumber,
        totalPrice: order.totalPrice,
      }).catch((err) => logger.error(`Payment confirm SMS failed: ${err.message}`));
    }

    logger.info(`Payment verified for order: ${order.orderNumber}`);

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully. Order confirmed.',
      order,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged-in user's orders (paginated)
// @route   GET /api/v1/orders
// @access  Private
exports.getMyOrders = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const skip = (page - 1) * limit;

    const filter = { user: req.user._id };
    if (req.query.status) {
      filter.orderStatus = req.query.status;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .select('-statusHistory'),
      Order.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
      orders,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single order by ID
// @route   GET /api/v1/orders/:id
// @access  Private
exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return next(new ErrorResponse('Order not found.', 404));
    }

    // Users can only view their own orders
    if (req.user.role !== 'admin' && order.user.toString() !== req.user._id.toString()) {
      return next(new ErrorResponse('Not authorized to view this order.', 403));
    }

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel order
// @route   PUT /api/v1/orders/:id/cancel
// @access  Private
exports.cancelOrder = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return next(new ErrorResponse('Order not found.', 404));
    }

    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to cancel this order.', 403));
    }

    const cancellableStatuses = ['pending', 'confirmed', 'processing'];
    if (!cancellableStatuses.includes(order.orderStatus)) {
      return next(
        new ErrorResponse(
          `Cannot cancel order with status '${order.orderStatus}'. Orders can only be cancelled before shipping.`,
          400
        )
      );
    }

    // Restore stock
    for (const item of order.items) {
      if (item.status === 'active') {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity },
        });
      }
    }

    // Initiate refund if paid
    let refundInitiated = false;
    if (order.isPaid && order.paymentResult?.razorpayPaymentId) {
      try {
        const refund = await razorpay.payments.refund(order.paymentResult.razorpayPaymentId, {
          amount: order.totalPrice * 100, // in paise
          notes: { reason: reason || 'Cancelled by customer', orderId: order._id.toString() },
        });

        order.paymentResult.refundId = refund.id;
        order.paymentResult.refundAmount = order.totalPrice;
        order.paymentResult.refundedAt = new Date();
        order.paymentResult.status = 'refunded';
        order.orderStatus = 'refunded';
        refundInitiated = true;

        logger.info(`Refund initiated for order: ${order.orderNumber}, refundId: ${refund.id}`);
      } catch (refundErr) {
        logger.error(`Refund failed for order ${order.orderNumber}: ${refundErr.message}`);
        // Still cancel the order, handle refund manually
      }
    }

    order.orderStatus = refundInitiated ? 'refunded' : 'cancelled';
    order.cancelReason = reason || 'Cancelled by customer';
    await order.save();

    // Send cancellation SMS (non-blocking)
    if (req.user.phone) {
      sendSMS(req.user.phone, 'orderCancelled', {
        orderNumber: order.orderNumber,
        refundAmount: order.isPaid ? order.totalPrice : 0,
      }).catch((err) => logger.error(`Cancel SMS failed: ${err.message}`));
    }

    res.status(200).json({
      success: true,
      message: refundInitiated
        ? 'Order cancelled and refund initiated.'
        : 'Order cancelled successfully.',
      order,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Request return for delivered order
// @route   PUT /api/v1/orders/:id/return
// @access  Private
exports.requestReturn = async (req, res, next) => {
  try {
    const { reason } = req.body;

    if (!reason || reason.trim().length < 10) {
      return next(new ErrorResponse('Please provide a valid return reason (min 10 characters).', 400));
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return next(new ErrorResponse('Order not found.', 404));
    }

    if (order.user.toString() !== req.user._id.toString()) {
      return next(new ErrorResponse('Not authorized.', 403));
    }

    if (order.orderStatus !== 'delivered') {
      return next(new ErrorResponse('Return can only be requested for delivered orders.', 400));
    }

    // Check return window (7 days from delivery)
    const returnWindow = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - new Date(order.deliveredAt).getTime() > returnWindow) {
      return next(new ErrorResponse('Return window of 7 days has expired.', 400));
    }

    if (order.returnReason) {
      return next(new ErrorResponse('Return has already been requested for this order.', 400));
    }

    order.returnReason = reason.trim();
    order.returnRequestedAt = new Date();
    order.orderStatus = 'processing'; // Will be reviewed by admin
    order.statusHistory.push({
      status: 'processing',
      timestamp: new Date(),
      message: `Return requested: ${reason.trim()}`,
    });
    await order.save();

    logger.info(`Return requested for order: ${order.orderNumber} by user ${req.user.email}`);

    // Send return initiated SMS (non-blocking)
    if (req.user.phone) {
      sendSMS(req.user.phone, 'returnInitiated', {
        orderNumber: order.orderNumber,
      }).catch((err) => logger.error(`Return SMS failed: ${err.message}`));
    }

    res.status(200).json({
      success: true,
      message: 'Return request submitted. Our team will review it within 24-48 hours.',
      order,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all orders (Admin)
// @route   GET /api/v1/orders/admin/all
// @access  Private (Admin)
exports.getAllOrders = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.status) filter.orderStatus = req.query.status;
    if (req.query.paymentMethod) filter.paymentMethod = req.query.paymentMethod;
    if (req.query.isPaid !== undefined) filter.isPaid = req.query.isPaid === 'true';

    // Date range filter
    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) filter.createdAt.$gte = new Date(req.query.startDate);
      if (req.query.endDate) {
        const endDate = new Date(req.query.endDate);
        endDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDate;
      }
    }

    // Order number search
    if (req.query.search) {
      filter.$or = [
        { orderNumber: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const sortOptions = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      'amount-high': { totalPrice: -1 },
      'amount-low': { totalPrice: 1 },
    };
    const sort = sortOptions[req.query.sort] || { createdAt: -1 };

    const [orders, total, totalRevenue] = await Promise.all([
      Order.find(filter)
        .populate('user', 'name email phone')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('-statusHistory -paymentResult.razorpaySignature'),
      Order.countDocuments(filter),
      Order.aggregate([
        { $match: { ...filter, isPaid: true } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      totalRevenue: totalRevenue[0]?.total || 0,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
      orders,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status (Admin)
// @route   PUT /api/v1/orders/admin/:id/status
// @access  Private (Admin)
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status, message, delhiveryWaybill, trackingUrl, estimatedDelivery } = req.body;

    const validStatuses = ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    if (!validStatuses.includes(status)) {
      return next(new ErrorResponse(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400));
    }

    const order = await Order.findById(req.params.id).populate('user', 'name email');

    if (!order) {
      return next(new ErrorResponse('Order not found.', 404));
    }

    // Status transition validation
    const allowedTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered'],
      delivered: [],
      cancelled: [],
      refunded: [],
    };

    if (!allowedTransitions[order.orderStatus]?.includes(status)) {
      return next(
        new ErrorResponse(
          `Cannot transition from '${order.orderStatus}' to '${status}'.`,
          400
        )
      );
    }

    order.orderStatus = status;
    order.statusHistory.push({
      status,
      timestamp: new Date(),
      message: message || getAdminStatusMessage(status),
      updatedBy: req.user._id,
    });

    if (status === 'delivered') {
      order.isDelivered = true;
      order.deliveredAt = new Date();
    }

    if (status === 'shipped' && delhiveryWaybill) {
      order.delhiveryWaybill = delhiveryWaybill;
      order.trackingUrl = trackingUrl || `https://www.delhivery.com/track/package/${delhiveryWaybill}`;
      if (estimatedDelivery) {
        order.estimatedDelivery = new Date(estimatedDelivery);
      }
    }

    await order.save();

    // Send status update SMS (non-blocking)
    const userPhone = order.user?.phone || order.shippingAddress?.phone;
    if (userPhone) {
      if (status === 'shipped') {
        sendSMS(userPhone, 'orderShipped', {
          orderNumber: order.orderNumber,
          waybill: delhiveryWaybill || 'N/A',
          trackingUrl: order.trackingUrl || `https://shoppioo.in/orders/${order._id}`,
        }).catch((err) => logger.error(`Shipped SMS failed: ${err.message}`));
      } else if (status === 'delivered') {
        sendSMS(userPhone, 'orderDelivered', {
          orderNumber: order.orderNumber,
        }).catch((err) => logger.error(`Delivered SMS failed: ${err.message}`));
      } else if (status === 'refunded') {
        sendSMS(userPhone, 'refundProcessed', {
          orderNumber: order.orderNumber,
          refundAmount: order.totalPrice,
        }).catch((err) => logger.error(`Refund SMS failed: ${err.message}`));
      }
    }

    logger.info(`Order ${order.orderNumber} status updated to ${status} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: `Order status updated to '${status}'.`,
      order,
    });
  } catch (error) {
    next(error);
  }
};

// --- Helper functions ---

async function deductStock(stockUpdates) {
  const promises = stockUpdates.map(({ id, quantity }) =>
    Product.findByIdAndUpdate(id, {
      $inc: { stock: -quantity, soldCount: quantity },
    })
  );
  await Promise.all(promises);
}

async function clearUserCart(userId) {
  await Cart.findOneAndUpdate(
    { user: userId },
    { $set: { items: [], coupon: null, couponCode: null, discount: 0 } }
  );
}

async function updateCouponUsage(coupon, userId) {
  const userIndex = coupon.users.findIndex((u) => u.userId.toString() === userId.toString());
  if (userIndex > -1) {
    coupon.users[userIndex].usedCount += 1;
  } else {
    coupon.users.push({ userId, usedCount: 1, usedAt: new Date() });
  }
  coupon.totalUsed += 1;
  await coupon.save();
}

function getAdminStatusMessage(status) {
  const messages = {
    confirmed: 'Your order has been confirmed by our team.',
    processing: 'Your order is being processed and packed.',
    shipped: 'Your order has been shipped.',
    delivered: 'Your order has been delivered.',
    cancelled: 'Your order has been cancelled by admin.',
    refunded: 'Refund has been processed.',
  };
  return messages[status] || `Order status updated to ${status}`;
}
