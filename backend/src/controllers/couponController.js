'use strict';

const Coupon = require('../models/Coupon');
const Cart = require('../models/Cart');
const ErrorResponse = require('../utils/errorResponse');
const logger = require('../utils/logger');

// @desc    Validate a coupon code for current cart
// @route   POST /api/v1/coupons/validate
// @access  Private
exports.validateCoupon = async (req, res, next) => {
  try {
    const { code, orderAmount } = req.body;

    if (!code) {
      return next(new ErrorResponse('Coupon code is required.', 400));
    }

    const coupon = await Coupon.findOne({ code: code.trim().toUpperCase() });

    if (!coupon) {
      return next(new ErrorResponse('Invalid coupon code.', 400));
    }

    // Use provided order amount or fetch from cart
    let amount = orderAmount;
    if (!amount) {
      const cart = await Cart.findOne({ user: req.user._id });
      amount = cart ? cart.subtotal : 0;
    }

    const { valid, message, discount } = coupon.isValid(req.user._id, Number(amount));

    if (!valid) {
      return res.status(400).json({
        success: false,
        message,
        valid: false,
      });
    }

    res.status(200).json({
      success: true,
      valid: true,
      message,
      coupon: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        discount,
        description: coupon.description,
        expiresAt: coupon.expiresAt,
      },
      discount,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create coupon
// @route   POST /api/v1/coupons
// @access  Private (Admin)
exports.createCoupon = async (req, res, next) => {
  try {
    const {
      code, description, type, value, minOrderAmount, maxDiscount,
      usageLimit, totalUsageLimit, isActive, expiresAt, startsAt,
      applicableCategories, applicableProducts,
    } = req.body;

    if (!code || !type || !value || !expiresAt) {
      return next(new ErrorResponse('Code, type, value and expiry date are required.', 400));
    }

    const existingCoupon = await Coupon.findOne({ code: code.trim().toUpperCase() });
    if (existingCoupon) {
      return next(new ErrorResponse('A coupon with this code already exists.', 409));
    }

    const coupon = await Coupon.create({
      code: code.trim().toUpperCase(),
      description,
      type,
      value: Number(value),
      minOrderAmount: minOrderAmount ? Number(minOrderAmount) : 0,
      maxDiscount: maxDiscount ? Number(maxDiscount) : undefined,
      usageLimit: usageLimit ? Number(usageLimit) : 1,
      totalUsageLimit: totalUsageLimit ? Number(totalUsageLimit) : null,
      isActive: isActive !== false,
      expiresAt: new Date(expiresAt),
      startsAt: startsAt ? new Date(startsAt) : new Date(),
      applicableCategories: applicableCategories || [],
      applicableProducts: applicableProducts || [],
      createdBy: req.user._id,
    });

    logger.info(`Coupon created: ${coupon.code} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Coupon created successfully.',
      coupon,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all coupons (Admin)
// @route   GET /api/v1/coupons
// @access  Private (Admin)
exports.getAllCoupons = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }
    if (req.query.type) {
      filter.type = req.query.type;
    }
    if (req.query.search) {
      filter.code = { $regex: req.query.search.toUpperCase(), $options: 'i' };
    }

    const [coupons, total] = await Promise.all([
      Coupon.find(filter)
        .populate('createdBy', 'name email')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .select('-users'),
      Coupon.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: coupons.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      coupons,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update coupon
// @route   PUT /api/v1/coupons/:id
// @access  Private (Admin)
exports.updateCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return next(new ErrorResponse('Coupon not found.', 404));
    }

    const {
      code, description, type, value, minOrderAmount, maxDiscount,
      usageLimit, totalUsageLimit, isActive, expiresAt, startsAt,
    } = req.body;
    if (code !== undefined) coupon.code = code;
    if (description !== undefined) coupon.description = description;
    if (type !== undefined) coupon.type = type;
    if (value !== undefined) coupon.value = Number(value);
    if (minOrderAmount !== undefined) coupon.minOrderAmount = Number(minOrderAmount);
    if (maxDiscount !== undefined) coupon.maxDiscount = Number(maxDiscount);
    if (usageLimit !== undefined) coupon.usageLimit = Number(usageLimit);
    if (totalUsageLimit !== undefined) coupon.totalUsageLimit = Number(totalUsageLimit);
    if (isActive !== undefined) coupon.isActive = isActive;
    if (expiresAt !== undefined) coupon.expiresAt = new Date(expiresAt);
    if (startsAt !== undefined) coupon.startsAt = new Date(startsAt);

    await coupon.save();

    logger.info(`Coupon updated: ${coupon.code} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Coupon updated successfully.',
      coupon,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete coupon
// @route   DELETE /api/v1/coupons/:id
// @access  Private (Admin)
exports.deleteCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return next(new ErrorResponse('Coupon not found.', 404));
    }

    await coupon.deleteOne();

    logger.info(`Coupon deleted: ${coupon.code} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Coupon deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
