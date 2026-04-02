'use strict';

const mongoose = require('mongoose');
const slugify = require('slugify');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [200, 'Product name cannot exceed 200 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    shortDescription: {
      type: String,
      maxlength: [300, 'Short description cannot exceed 300 characters'],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Product category is required'],
    },
    brand: {
      type: String,
      trim: true,
      maxlength: [100, 'Brand name cannot exceed 100 characters'],
    },
    images: [
      {
        public_id: { type: String, required: true },
        url: { type: String, required: true },
        isDefault: { type: Boolean, default: false },
      },
    ],
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price cannot be negative'],
    },
    discountPrice: {
      type: Number,
      min: [0, 'Discount price cannot be negative'],
      validate: {
        validator: function (v) {
          return v === undefined || v === null || v < this.price;
        },
        message: 'Discount price must be less than regular price',
      },
    },
    stock: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      default: 0,
      min: [0, 'Stock cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Stock must be a whole number',
      },
    },
    specifications: [
      {
        key: { type: String, required: true, trim: true },
        value: { type: String, required: true, trim: true },
        _id: false,
      },
    ],
    highlights: [{ type: String, trim: true }],
    tags: [{ type: String, trim: true, lowercase: true }],
    ratings: { type: Number, default: 0, min: 0, max: 5 },
    numReviews: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    weight: {
      type: Number,
      min: [0, 'Weight cannot be negative'],
      comment: 'Weight in grams',
    },
    sku: {
      type: String,
      unique: true,
      trim: true,
      sparse: true,
      uppercase: true,
    },
    warranty: {
      type: String,
      trim: true,
      maxlength: [100, 'Warranty info cannot exceed 100 characters'],
    },
    returnPolicy: {
      type: String,
      trim: true,
      default: '7 days return policy',
    },
    metaTitle: { type: String, trim: true },
    metaDescription: { type: String, trim: true },
    soldCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
productSchema.index({ slug: 1 });
productSchema.index({ category: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ price: 1 });
productSchema.index({ ratings: -1 });
productSchema.index({ isFeatured: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ tags: 1 });
productSchema.index({ sku: 1 }, { sparse: true });
productSchema.index({ name: 'text', description: 'text', brand: 'text', tags: 'text' });
productSchema.index({ vendor: 1 });
productSchema.index({ createdAt: -1 });

// Virtual: discount percentage
productSchema.virtual('discountPercent').get(function () {
  if (this.discountPrice && this.price > 0) {
    return Math.round(((this.price - this.discountPrice) / this.price) * 100);
  }
  return 0;
});

// Virtual: effective price (discounted or original)
productSchema.virtual('effectivePrice').get(function () {
  return this.discountPrice || this.price;
});

// Virtual: in stock
productSchema.virtual('inStock').get(function () {
  return this.stock > 0;
});

// Pre-save: auto-generate slug and SKU
productSchema.pre('save', async function (next) {
  if (this.isModified('name')) {
    let slug = slugify(this.name, { lower: true, strict: true });
    const existing = await this.constructor.findOne({ slug, _id: { $ne: this._id } });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }
    this.slug = slug;
  }

  // Auto-generate SKU if not provided
  if (!this.sku) {
    const prefix = this.name ? this.name.substring(0, 3).toUpperCase() : 'SKU';
    this.sku = `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  }

  // Ensure at least one image is marked as default
  if (this.images && this.images.length > 0) {
    const hasDefault = this.images.some((img) => img.isDefault);
    if (!hasDefault) {
      this.images[0].isDefault = true;
    }
  }

  next();
});

module.exports = mongoose.model('Product', productSchema);
