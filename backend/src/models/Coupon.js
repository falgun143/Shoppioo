'use strict';

const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [20, 'Coupon code cannot exceed 20 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Description cannot exceed 200 characters'],
    },
    type: {
      type: String,
      enum: { values: ['percentage', 'fixed'], message: 'Type must be percentage or fixed' },
      required: [true, 'Coupon type is required'],
    },
    value: {
      type: Number,
      required: [true, 'Coupon value is required'],
      min: [0, 'Coupon value cannot be negative'],
      validate: {
        validator: function (v) {
          if (this.type === 'percentage') {
            return v > 0 && v <= 100;
          }
          return v > 0;
        },
        message: 'Percentage coupon value must be between 1 and 100',
      },
    },
    minOrderAmount: {
      type: Number,
      default: 0,
      min: [0, 'Minimum order amount cannot be negative'],
    },
    maxDiscount: {
      type: Number,
      min: [0, 'Maximum discount cannot be negative'],
      comment: 'Only applicable for percentage type coupons',
    },
    usageLimit: {
      type: Number,
      default: 1,
      min: [1, 'Usage limit must be at least 1'],
      comment: 'Number of times a single user can use this coupon',
    },
    totalUsageLimit: {
      type: Number,
      default: null,
      comment: 'Total number of times this coupon can be used across all users',
    },
    totalUsed: { type: Number, default: 0 },
    users: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        usedCount: { type: Number, default: 1 },
        usedAt: { type: Date, default: Date.now },
        _id: false,
      },
    ],
    isActive: { type: Boolean, default: true },
    expiresAt: {
      type: Date,
      required: [true, 'Coupon expiry date is required'],
    },
    startsAt: {
      type: Date,
      default: Date.now,
    },
    applicableCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
    applicableProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
couponSchema.index({ code: 1 });
couponSchema.index({ isActive: 1, expiresAt: 1 });

// Virtual: is expired
couponSchema.virtual('isExpired').get(function () {
  return this.expiresAt < new Date();
});

// Virtual: is not yet started
couponSchema.virtual('isStarted').get(function () {
  return this.startsAt <= new Date();
});

/**
 * Check if a coupon is valid for a given user and order amount
 * @param {string} userId
 * @param {number} orderAmount
 * @returns {{ valid: boolean, message: string, discount: number }}
 */
couponSchema.methods.isValid = function (userId, orderAmount) {
  // Check active status
  if (!this.isActive) {
    return { valid: false, message: 'This coupon is no longer active.', discount: 0 };
  }

  // Check if started
  if (this.startsAt > new Date()) {
    return { valid: false, message: 'This coupon is not yet active.', discount: 0 };
  }

  // Check expiry
  if (this.expiresAt < new Date()) {
    return { valid: false, message: 'This coupon has expired.', discount: 0 };
  }

  // Check total usage limit
  if (this.totalUsageLimit && this.totalUsed >= this.totalUsageLimit) {
    return { valid: false, message: 'This coupon has reached its usage limit.', discount: 0 };
  }

  // Check minimum order amount
  if (orderAmount < this.minOrderAmount) {
    return {
      valid: false,
      message: `Minimum order amount of ₹${this.minOrderAmount.toLocaleString('en-IN')} required.`,
      discount: 0,
    };
  }

  // Check user-specific usage limit
  const userUsage = this.users.find((u) => u.userId.toString() === userId.toString());
  if (userUsage && userUsage.usedCount >= this.usageLimit) {
    return {
      valid: false,
      message: `You have already used this coupon ${this.usageLimit} time(s).`,
      discount: 0,
    };
  }

  // Calculate discount
  let discount = 0;
  if (this.type === 'percentage') {
    discount = (orderAmount * this.value) / 100;
    if (this.maxDiscount) {
      discount = Math.min(discount, this.maxDiscount);
    }
  } else {
    discount = Math.min(this.value, orderAmount);
  }

  return { valid: true, message: 'Coupon applied successfully!', discount: Math.round(discount) };
};

module.exports = mongoose.model('Coupon', couponSchema);
