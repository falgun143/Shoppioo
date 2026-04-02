'use strict';

const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const cloudinary = require('../config/cloudinary');
const ErrorResponse = require('../utils/errorResponse');
const logger = require('../utils/logger');

// @desc    Get reviews for a product
// @route   GET /api/v1/reviews/product/:productId
// @access  Public
exports.getProductReviews = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const skip = (page - 1) * limit;

    const product = await Product.findById(productId);
    if (!product) {
      return next(new ErrorResponse('Product not found.', 404));
    }

    const filter = { product: productId, isApproved: true };
    if (req.query.rating) {
      filter.rating = parseInt(req.query.rating, 10);
    }

    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      helpful: { helpful: -1 },
      'rating-high': { rating: -1 },
      'rating-low': { rating: 1 },
    };
    const sort = sortMap[req.query.sort] || { createdAt: -1 };

    const [reviews, total, ratingStats] = await Promise.all([
      Review.find(filter)
        .populate('user', 'name avatar')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Review.countDocuments(filter),
      Review.aggregate([
        { $match: { product: product._id, isApproved: true } },
        {
          $group: {
            _id: '$rating',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Build rating distribution
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratingStats.forEach(({ _id, count }) => {
      ratingDistribution[_id] = count;
    });

    res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
      averageRating: product.ratings,
      totalReviews: product.numReviews,
      ratingDistribution,
      reviews,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create review (must have purchased the product)
// @route   POST /api/v1/reviews
// @access  Private
exports.createReview = async (req, res, next) => {
  try {
    const { productId, rating, title, comment } = req.body;

    if (!productId || !rating || !comment) {
      return next(new ErrorResponse('Product ID, rating and comment are required.', 400));
    }

    const ratingNum = parseInt(rating, 10);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return next(new ErrorResponse('Rating must be between 1 and 5.', 400));
    }

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return next(new ErrorResponse('Product not found.', 404));
    }

    // Check if already reviewed
    const existingReview = await Review.findOne({ product: productId, user: req.user._id });
    if (existingReview) {
      return next(new ErrorResponse('You have already reviewed this product.', 400));
    }

    // Check if user has purchased this product
    const hasPurchased = await Order.findOne({
      user: req.user._id,
      'items.product': productId,
      orderStatus: 'delivered',
    });

    // Process review images
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map((file) => ({
        public_id: file.public_id || file.filename,
        url: file.path || file.secure_url,
      }));
    }

    const review = await Review.create({
      product: productId,
      user: req.user._id,
      rating: ratingNum,
      title: title?.trim(),
      comment: comment.trim(),
      images,
      isVerifiedPurchase: !!hasPurchased,
    });

    await review.populate('user', 'name avatar');

    logger.info(`Review created for product ${productId} by user ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully.',
      review,
    });
  } catch (error) {
    // Cleanup uploaded images on error
    if (req.files && req.files.length > 0) {
      req.files.forEach(async (file) => {
        const pid = file.public_id || file.filename;
        if (pid) { try { await cloudinary.uploader.destroy(pid); } catch (_) {} }
      });
    }
    next(error);
  }
};

// @desc    Update review
// @route   PUT /api/v1/reviews/:id
// @access  Private
exports.updateReview = async (req, res, next) => {
  try {
    const { rating, title, comment } = req.body;

    const review = await Review.findById(req.params.id);
    if (!review) {
      return next(new ErrorResponse('Review not found.', 404));
    }

    if (review.user.toString() !== req.user._id.toString()) {
      return next(new ErrorResponse('Not authorized to update this review.', 403));
    }

    if (rating !== undefined) {
      const r = parseInt(rating, 10);
      if (isNaN(r) || r < 1 || r > 5) {
        return next(new ErrorResponse('Rating must be between 1 and 5.', 400));
      }
      review.rating = r;
    }

    if (title !== undefined) review.title = title.trim();
    if (comment !== undefined) {
      if (comment.trim().length < 5) {
        return next(new ErrorResponse('Review comment must be at least 5 characters.', 400));
      }
      review.comment = comment.trim();
    }

    await review.save();
    await review.populate('user', 'name avatar');

    logger.info(`Review ${review._id} updated by user ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Review updated successfully.',
      review,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete review
// @route   DELETE /api/v1/reviews/:id
// @access  Private
exports.deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return next(new ErrorResponse('Review not found.', 404));
    }

    // Allow reviewer or admin to delete
    if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to delete this review.', 403));
    }

    // Delete review images from Cloudinary
    if (review.images && review.images.length > 0) {
      await Promise.allSettled(
        review.images.map((img) =>
          cloudinary.uploader.destroy(img.public_id).catch((err) =>
            logger.warn(`Failed to delete review image ${img.public_id}: ${err.message}`)
          )
        )
      );
    }

    const productId = review.product;
    await review.deleteOne();

    // Recalculate ratings
    await Review.calcAverageRating(productId);

    logger.info(`Review ${req.params.id} deleted by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark review as helpful / unhelpful (toggle)
// @route   PUT /api/v1/reviews/:id/helpful
// @access  Private
exports.markHelpful = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return next(new ErrorResponse('Review not found.', 404));
    }

    // Cannot mark own review as helpful
    if (review.user.toString() === req.user._id.toString()) {
      return next(new ErrorResponse('You cannot mark your own review as helpful.', 400));
    }

    const userId = req.user._id;
    const alreadyMarked = review.helpful.some((id) => id.toString() === userId.toString());

    if (alreadyMarked) {
      review.helpful = review.helpful.filter((id) => id.toString() !== userId.toString());
    } else {
      review.helpful.push(userId);
    }

    await review.save();

    res.status(200).json({
      success: true,
      message: alreadyMarked ? 'Removed helpful mark.' : 'Marked as helpful.',
      helpfulCount: review.helpful.length,
      isHelpful: !alreadyMarked,
    });
  } catch (error) {
    next(error);
  }
};
