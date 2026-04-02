'use strict';

const Wishlist = require('../models/Wishlist');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get user's wishlist
// @route   GET /api/v1/wishlist
// @access  Private
exports.getWishlist = async (req, res, next) => {
  try {
    let wishlist = await Wishlist.findOne({ user: req.user._id }).populate(
      'products',
      'name images price discountPrice ratings numReviews stock isActive slug brand'
    );

    if (!wishlist) {
      wishlist = await Wishlist.create({ user: req.user._id, products: [] });
    }

    // Filter out inactive products
    const activeProducts = wishlist.products.filter((p) => p && p.isActive);

    res.status(200).json({
      success: true,
      productCount: activeProducts.length,
      products: activeProducts,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add product to wishlist
// @route   POST /api/v1/wishlist/add
// @access  Private
exports.addToWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return next(new ErrorResponse('Product ID is required.', 400));
    }

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return next(new ErrorResponse('Product not found or unavailable.', 404));
    }

    let wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist) {
      wishlist = new Wishlist({ user: req.user._id, products: [] });
    }

    // Check if product already in wishlist
    const alreadyIn = wishlist.products.some((p) => p.toString() === productId);
    if (alreadyIn) {
      return res.status(200).json({
        success: true,
        message: 'Product is already in your wishlist.',
        productCount: wishlist.products.length,
      });
    }

    if (wishlist.products.length >= 50) {
      return next(new ErrorResponse('Wishlist can hold a maximum of 50 products.', 400));
    }

    wishlist.products.push(productId);
    await wishlist.save();

    res.status(200).json({
      success: true,
      message: 'Product added to wishlist.',
      productCount: wishlist.products.length,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle product in wishlist (add if not present, remove if present)
// @route   POST /api/v1/wishlist/toggle/:productId
// @access  Private
exports.toggleWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return next(new ErrorResponse('Product not found or unavailable.', 404));
    }

    let wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist) {
      wishlist = new Wishlist({ user: req.user._id, products: [] });
    }

    const index = wishlist.products.findIndex((p) => p.toString() === productId);
    let added;

    if (index > -1) {
      wishlist.products.splice(index, 1);
      added = false;
    } else {
      if (wishlist.products.length >= 50) {
        return next(new ErrorResponse('Wishlist can hold a maximum of 50 products.', 400));
      }
      wishlist.products.push(productId);
      added = true;
    }

    await wishlist.save();

    res.status(200).json({
      success: true,
      added,
      message: added ? 'Product added to wishlist.' : 'Product removed from wishlist.',
      productCount: wishlist.products.length,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove product from wishlist
// @route   DELETE /api/v1/wishlist/remove/:productId
// @access  Private
exports.removeFromWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist) {
      return next(new ErrorResponse('Wishlist not found.', 404));
    }

    const index = wishlist.products.findIndex((p) => p.toString() === productId);
    if (index === -1) {
      return next(new ErrorResponse('Product not found in wishlist.', 404));
    }

    wishlist.products.splice(index, 1);
    await wishlist.save();

    res.status(200).json({
      success: true,
      message: 'Product removed from wishlist.',
      productCount: wishlist.products.length,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Move product from wishlist to cart
// @route   POST /api/v1/wishlist/move-to-cart/:productId
// @access  Private
exports.moveToCart = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const quantity = parseInt(req.body.quantity, 10) || 1;

    // Check product availability
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return next(new ErrorResponse('Product not found or unavailable.', 404));
    }

    if (product.stock < quantity) {
      return next(
        new ErrorResponse(
          product.stock === 0
            ? 'This product is out of stock.'
            : `Only ${product.stock} unit(s) available.`,
          400
        )
      );
    }

    // Remove from wishlist
    const wishlist = await Wishlist.findOne({ user: req.user._id });
    if (wishlist) {
      const index = wishlist.products.findIndex((p) => p.toString() === productId);
      if (index > -1) {
        wishlist.products.splice(index, 1);
        await wishlist.save();
      }
    }

    // Add to cart
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    const existingIndex = cart.items.findIndex((item) => item.product.toString() === productId);

    if (existingIndex > -1) {
      const newQty = cart.items[existingIndex].quantity + quantity;
      cart.items[existingIndex].quantity = Math.min(newQty, Math.min(product.stock, 10));
      cart.items[existingIndex].price = product.discountPrice || product.price;
    } else {
      const defaultImage =
        product.images.find((img) => img.isDefault)?.url || product.images[0]?.url || '';
      cart.items.push({
        product: productId,
        quantity: Math.min(quantity, Math.min(product.stock, 10)),
        price: product.discountPrice || product.price,
        name: product.name,
        image: defaultImage,
        sku: product.sku,
      });
    }

    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Product moved to cart.',
      cartItemCount: cart.itemCount,
      wishlistProductCount: wishlist ? wishlist.products.length : 0,
    });
  } catch (error) {
    next(error);
  }
};
