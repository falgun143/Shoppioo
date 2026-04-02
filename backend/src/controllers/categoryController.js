'use strict';

const Category = require('../models/Category');
const Product = require('../models/Product');
const cloudinary = require('../config/cloudinary');
const ErrorResponse = require('../utils/errorResponse');
const logger = require('../utils/logger');

// @desc    Get all categories in tree structure
// @route   GET /api/v1/categories
// @access  Public
exports.getCategories = async (req, res, next) => {
  try {
    const { flat, activeOnly = true } = req.query;

    const filter = {};
    if (activeOnly !== 'false') filter.isActive = true;

    const [allCategories, productCounts] = await Promise.all([
      Category.find(filter).sort({ sortOrder: 1, name: 1 }).select('-__v'),
      Product.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
    ]);

    const countMap = {};
    productCounts.forEach((p) => { countMap[p._id.toString()] = p.count; });

    if (flat === 'true') {
      return res.status(200).json({
        success: true,
        count: allCategories.length,
        categories: allCategories.map((cat) => ({
          ...cat.toObject(),
          productCount: countMap[cat._id.toString()] || 0,
        })),
      });
    }

    // Build tree structure
    const categoryMap = {};
    allCategories.forEach((cat) => {
      categoryMap[cat._id.toString()] = {
        ...cat.toObject(),
        productCount: countMap[cat._id.toString()] || 0,
        children: [],
      };
    });

    const tree = [];
    allCategories.forEach((cat) => {
      if (cat.parent) {
        const parent = categoryMap[cat.parent.toString()];
        if (parent) {
          parent.children.push(categoryMap[cat._id.toString()]);
        }
      } else {
        tree.push(categoryMap[cat._id.toString()]);
      }
    });

    res.status(200).json({
      success: true,
      count: tree.length,
      categories: tree,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single category by slug
// @route   GET /api/v1/categories/:slug
// @access  Public
exports.getCategory = async (req, res, next) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug })
      .populate('parent', 'name slug')
      .populate({
        path: 'subcategories',
        match: { isActive: true },
        select: 'name slug image sortOrder',
      });

    if (!category) {
      return next(new ErrorResponse('Category not found.', 404));
    }

    // Get product count for this category
    const productCount = await Product.countDocuments({
      category: category._id,
      isActive: true,
    });

    res.status(200).json({
      success: true,
      category: {
        ...category.toObject(),
        productCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create category
// @route   POST /api/v1/categories
// @access  Private (Admin)
exports.createCategory = async (req, res, next) => {
  try {
    const { name, description, parent, isActive, sortOrder, metaTitle, metaDescription } = req.body;

    if (!name) {
      return next(new ErrorResponse('Category name is required.', 400));
    }

    // Validate parent category
    if (parent) {
      const parentCat = await Category.findById(parent);
      if (!parentCat) {
        return next(new ErrorResponse('Parent category not found.', 404));
      }
    }

    let image = {};
    if (req.file) {
      image = {
        public_id: req.file.public_id || req.file.filename,
        url: req.file.path || req.file.secure_url,
      };
    }

    const category = await Category.create({
      name: name.trim(),
      description: description?.trim(),
      parent: parent || null,
      image,
      isActive: isActive !== false,
      sortOrder: sortOrder ? Number(sortOrder) : 0,
      metaTitle,
      metaDescription,
    });

    logger.info(`Category created: ${category.name} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      category,
    });
  } catch (error) {
    // Cleanup image on error
    if (req.file && (req.file.public_id || req.file.filename)) {
      cloudinary.uploader.destroy(req.file.public_id || req.file.filename).catch(() => {});
    }
    next(error);
  }
};

// @desc    Update category
// @route   PUT /api/v1/categories/:id
// @access  Private (Admin)
exports.updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return next(new ErrorResponse('Category not found.', 404));
    }

    const { name, description, parent, isActive, sortOrder, metaTitle, metaDescription } = req.body;

    if (name !== undefined) category.name = name.trim();
    if (description !== undefined) category.description = description?.trim();
    if (isActive !== undefined) category.isActive = isActive === 'true' || isActive === true;
    if (sortOrder !== undefined) category.sortOrder = Number(sortOrder);
    if (metaTitle !== undefined) category.metaTitle = metaTitle;
    if (metaDescription !== undefined) category.metaDescription = metaDescription;

    if (parent !== undefined) {
      if (parent && parent !== req.params.id) {
        const parentCat = await Category.findById(parent);
        if (!parentCat) {
          return next(new ErrorResponse('Parent category not found.', 404));
        }
        category.parent = parent;
      } else {
        category.parent = null;
      }
    }

    // Handle image update
    if (req.file) {
      // Delete old image
      if (category.image && category.image.public_id) {
        await cloudinary.uploader.destroy(category.image.public_id).catch((err) =>
          logger.warn(`Failed to delete category image: ${err.message}`)
        );
      }
      category.image = {
        public_id: req.file.public_id || req.file.filename,
        url: req.file.path || req.file.secure_url,
      };
    }

    await category.save();

    logger.info(`Category updated: ${category.name} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Category updated successfully.',
      category,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete category
// @route   DELETE /api/v1/categories/:id
// @access  Private (Admin)
exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return next(new ErrorResponse('Category not found.', 404));
    }

    // Check if category has products
    const productCount = await Product.countDocuments({ category: category._id });
    if (productCount > 0) {
      return next(
        new ErrorResponse(
          `Cannot delete category with ${productCount} associated product(s). Please move or delete the products first.`,
          400
        )
      );
    }

    // Check if category has subcategories
    const subCount = await Category.countDocuments({ parent: category._id });
    if (subCount > 0) {
      return next(
        new ErrorResponse(
          `Cannot delete category with ${subCount} subcategorie(s). Delete subcategories first.`,
          400
        )
      );
    }

    // Delete image from Cloudinary
    if (category.image && category.image.public_id) {
      await cloudinary.uploader.destroy(category.image.public_id).catch((err) =>
        logger.warn(`Failed to delete category image: ${err.message}`)
      );
    }

    await category.deleteOne();

    logger.info(`Category deleted: ${category.name} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
