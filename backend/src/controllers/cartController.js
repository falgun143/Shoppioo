'use strict';

const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get user's cart
// @route   GET /api/v1/cart
// @access  Private
exports.getCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id }).populate(
      'items.product',
      'name images price discountPrice stock isActive slug'
    );

    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    // Sync prices and check stock availability
    let cartModified = false;
    const unavailableItems = [];

    for (let i = cart.items.length - 1; i >= 0; i--) {
      const item = cart.items[i];
      const product = item.product;

      if (!product || !product.isActive) {
        unavailableItems.push(item.name);
        cart.items.splice(i, 1);
        cartModified = true;
        continue;
      }

      const currentPrice = product.discountPrice || product.price;
      if (item.price !== currentPrice) {
        item.price = currentPrice;
        cartModified = true;
      }

      if (item.quantity > product.stock) {
        item.quantity = product.stock;
        if (item.quantity === 0) {
          unavailableItems.push(item.name);
          cart.items.splice(i, 1);
        }
        cartModified = true;
      }
    }

    if (cartModified) {
      await cart.save();
    }

    res.status(200).json({
      success: true,
      cart,
      subtotal: cart.subtotal,
      total: cart.total,
      itemCount: cart.itemCount,
      discount: cart.discount,
      couponCode: cart.couponCode,
      ...(unavailableItems.length > 0 && {
        notice: `Some items were removed or updated: ${unavailableItems.join(', ')}`,
      }),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add item to cart
// @route   POST /api/v1/cart/add
// @access  Private
exports.addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return next(new ErrorResponse('Product ID is required.', 400));
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1) {
      return next(new ErrorResponse('Quantity must be a positive integer.', 400));
    }

    const product = await Product.findById(productId);
    if (!product) {
      return next(new ErrorResponse('Product not found.', 404));
    }

    if (!product.isActive) {
      return next(new ErrorResponse('This product is currently unavailable.', 400));
    }

    if (product.stock < qty) {
      return next(
        new ErrorResponse(
          product.stock === 0
            ? 'This product is out of stock.'
            : `Only ${product.stock} unit(s) available in stock.`,
          400
        )
      );
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    const existingItemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );

    if (existingItemIndex > -1) {
      const newQty = cart.items[existingItemIndex].quantity + qty;
      if (newQty > 10) {
        return next(new ErrorResponse('Cannot add more than 10 of the same item.', 400));
      }
      if (newQty > product.stock) {
        return next(new ErrorResponse(`Only ${product.stock} unit(s) available in stock.`, 400));
      }
      cart.items[existingItemIndex].quantity = newQty;
      cart.items[existingItemIndex].price = product.discountPrice || product.price;
    } else {
      if (cart.items.length >= 20) {
        return next(new ErrorResponse('Cart can hold a maximum of 20 different products.', 400));
      }

      const defaultImage =
        product.images.find((img) => img.isDefault)?.url || product.images[0]?.url || '';

      cart.items.push({
        product: productId,
        quantity: qty,
        price: product.discountPrice || product.price,
        name: product.name,
        image: defaultImage,
        sku: product.sku,
      });
    }

    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Item added to cart.',
      itemCount: cart.itemCount,
      subtotal: cart.subtotal,
      total: cart.total,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update cart item quantity
// @route   PUT /api/v1/cart/update
// @access  Private
exports.updateCartItem = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId || quantity === undefined) {
      return next(new ErrorResponse('Product ID and quantity are required.', 400));
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 0) {
      return next(new ErrorResponse('Quantity must be a non-negative integer.', 400));
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return next(new ErrorResponse('Cart not found.', 404));
    }

    const itemIndex = cart.items.findIndex((item) => item.product.toString() === productId);

    if (itemIndex === -1) {
      return next(new ErrorResponse('Item not found in cart.', 404));
    }

    if (qty === 0) {
      // Remove item
      cart.items.splice(itemIndex, 1);
    } else {
      // Check stock
      const product = await Product.findById(productId).select('stock isActive');
      if (!product || !product.isActive) {
        return next(new ErrorResponse('Product is no longer available.', 400));
      }
      if (qty > product.stock) {
        return next(new ErrorResponse(`Only ${product.stock} unit(s) available.`, 400));
      }
      if (qty > 10) {
        return next(new ErrorResponse('Cannot add more than 10 of the same item.', 400));
      }
      cart.items[itemIndex].quantity = qty;
    }

    await cart.save();

    res.status(200).json({
      success: true,
      message: qty === 0 ? 'Item removed from cart.' : 'Cart updated.',
      itemCount: cart.itemCount,
      subtotal: cart.subtotal,
      total: cart.total,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/v1/cart/remove/:productId
// @access  Private
exports.removeFromCart = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return next(new ErrorResponse('Cart not found.', 404));
    }

    const itemIndex = cart.items.findIndex((item) => item.product.toString() === productId);

    if (itemIndex === -1) {
      return next(new ErrorResponse('Item not found in cart.', 404));
    }

    cart.items.splice(itemIndex, 1);
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Item removed from cart.',
      itemCount: cart.itemCount,
      subtotal: cart.subtotal,
      total: cart.total,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear entire cart
// @route   DELETE /api/v1/cart/clear
// @access  Private
exports.clearCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(200).json({ success: true, message: 'Cart is already empty.' });
    }

    cart.items = [];
    cart.coupon = null;
    cart.couponCode = null;
    cart.discount = 0;
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Cart cleared.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Apply coupon to cart
// @route   POST /api/v1/cart/coupon
// @access  Private
exports.applyCoupon = async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      return next(new ErrorResponse('Coupon code is required.', 400));
    }

    const coupon = await Coupon.findOne({ code: code.trim().toUpperCase() });

    if (!coupon) {
      return next(new ErrorResponse('Invalid coupon code.', 400));
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart || cart.items.length === 0) {
      return next(new ErrorResponse('Your cart is empty.', 400));
    }

    const subtotal = cart.subtotal;
    const { valid, message, discount } = coupon.isValid(req.user._id, subtotal);

    if (!valid) {
      return next(new ErrorResponse(message, 400));
    }

    cart.coupon = coupon._id;
    cart.couponCode = coupon.code;
    cart.discount = discount;
    await cart.save();

    res.status(200).json({
      success: true,
      message,
      couponCode: coupon.code,
      discount,
      subtotal,
      total: cart.total,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove coupon from cart
// @route   DELETE /api/v1/cart/coupon
// @access  Private
exports.removeCoupon = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return next(new ErrorResponse('Cart not found.', 404));
    }

    cart.coupon = null;
    cart.couponCode = null;
    cart.discount = 0;
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Coupon removed.',
      subtotal: cart.subtotal,
      total: cart.total,
    });
  } catch (error) {
    next(error);
  }
};
