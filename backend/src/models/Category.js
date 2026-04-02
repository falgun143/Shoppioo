'use strict';

const mongoose = require('mongoose');
const slugify = require('slugify');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      unique: true,
      trim: true,
      maxlength: [100, 'Category name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    image: {
      public_id: { type: String, default: '' },
      url: {
        type: String,
        default: 'https://res.cloudinary.com/shoppioo/image/upload/v1/shoppioo/categories/default.jpg',
      },
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    metaTitle: { type: String, trim: true },
    metaDescription: { type: String, trim: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
categorySchema.index({ slug: 1 });
categorySchema.index({ parent: 1 });
categorySchema.index({ isActive: 1 });
categorySchema.index({ sortOrder: 1 });

// Auto-generate slug from name
categorySchema.pre('save', async function (next) {
  if (!this.isModified('name')) return next();

  let slug = slugify(this.name, { lower: true, strict: true });

  // Ensure slug uniqueness
  const existing = await this.constructor.findOne({ slug, _id: { $ne: this._id } });
  if (existing) {
    slug = `${slug}-${Date.now()}`;
  }

  this.slug = slug;
  next();
});

// Virtual: subcategories
categorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parent',
});

// Virtual: product count
categorySchema.virtual('productCount', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'category',
  count: true,
});

module.exports = mongoose.model('Category', categorySchema);
