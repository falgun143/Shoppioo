'use strict';

const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
      max: [10, 'Cannot add more than 10 of the same item'],
      validate: {
        validator: Number.isInteger,
        message: 'Quantity must be a whole number',
      },
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative'],
    },
    name: { type: String, required: true, trim: true },
    image: { type: String, default: '' },
    sku: { type: String },
  },
  { _id: true }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon',
      default: null,
    },
    couponCode: { type: String, default: null },
    discount: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
cartSchema.index({ user: 1 });

// Virtual: subtotal (before discount)
cartSchema.virtual('subtotal').get(function () {
  return this.items.reduce((total, item) => total + item.price * item.quantity, 0);
});

// Virtual: total (after discount)
cartSchema.virtual('total').get(function () {
  const subtotal = this.subtotal;
  return Math.max(subtotal - this.discount, 0);
});

// Virtual: item count
cartSchema.virtual('itemCount').get(function () {
  return this.items.reduce((count, item) => count + item.quantity, 0);
});

// Virtual: unique product count
cartSchema.virtual('uniqueItemCount').get(function () {
  return this.items.length;
});

module.exports = mongoose.model('Cart', cartSchema);
