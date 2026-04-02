'use strict';

const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: { type: String, required: true, trim: true },
    image: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    sku: { type: String },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'returned'],
      default: 'active',
    },
  },
  { _id: true }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    addressLine1: { type: String, required: true, trim: true },
    addressLine2: { type: String, trim: true, default: '' },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    country: { type: String, default: 'India', trim: true },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    message: { type: String, trim: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (v) => v && v.length > 0,
        message: 'Order must have at least one item',
      },
    },
    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: { values: ['razorpay', 'cod'], message: 'Payment method must be razorpay or cod' },
      required: true,
    },
    paymentResult: {
      razorpayOrderId: { type: String },
      razorpayPaymentId: { type: String },
      razorpaySignature: { type: String },
      status: { type: String, enum: ['pending', 'captured', 'failed', 'refunded'], default: 'pending' },
      refundId: { type: String },
      refundAmount: { type: Number },
      refundedAt: { type: Date },
    },
    itemsPrice: { type: Number, required: true, min: 0 },
    shippingPrice: { type: Number, required: true, default: 0, min: 0 },
    taxPrice: { type: Number, required: true, default: 0, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', default: null },
    couponCode: { type: String, default: null },
    discount: { type: Number, default: 0, min: 0 },
    orderStatus: {
      type: String,
      enum: {
        values: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
        message: 'Invalid order status',
      },
      default: 'pending',
    },
    statusHistory: [statusHistorySchema],
    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },
    isDelivered: { type: Boolean, default: false },
    deliveredAt: { type: Date },
    delhiveryWaybill: { type: String, trim: true },
    trackingUrl: { type: String, trim: true },
    estimatedDelivery: { type: Date },
    cancelReason: { type: String, trim: true },
    returnReason: { type: String, trim: true },
    returnRequestedAt: { type: Date },
    notes: { type: String, trim: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ 'paymentResult.razorpayOrderId': 1 });
orderSchema.index({ isPaid: 1 });
orderSchema.index({ createdAt: -1 });

// Auto-generate order number before saving
orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments();
    const paddedCount = String(count + 1).padStart(6, '0');
    this.orderNumber = `SHP-${year}-${paddedCount}`;
  }

  // Add to status history if status changed
  if (this.isModified('orderStatus')) {
    this.statusHistory = this.statusHistory || [];
    this.statusHistory.push({
      status: this.orderStatus,
      timestamp: new Date(),
      message: getStatusMessage(this.orderStatus),
    });
  }

  next();
});

function getStatusMessage(status) {
  const messages = {
    pending: 'Order placed successfully. Awaiting payment confirmation.',
    confirmed: 'Order confirmed and is being prepared.',
    processing: 'Your order is being packed.',
    shipped: 'Your order has been shipped.',
    delivered: 'Your order has been delivered.',
    cancelled: 'Order has been cancelled.',
    refunded: 'Refund has been initiated.',
  };
  return messages[status] || `Order status updated to ${status}`;
}

// Virtual: active items only
orderSchema.virtual('activeItems').get(function () {
  return this.items.filter((item) => item.status === 'active');
});

module.exports = mongoose.model('Order', orderSchema);
