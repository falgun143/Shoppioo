'use strict';

const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
wishlistSchema.index({ user: 1 });

// Virtual: product count
wishlistSchema.virtual('productCount').get(function () {
  return this.products ? this.products.length : 0;
});

module.exports = mongoose.model('Wishlist', wishlistSchema);
