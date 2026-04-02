'use strict';

const Product = require('../models/Product');
const Category = require('../models/Category');
const cloudinary = require('../config/cloudinary');
const ErrorResponse = require('../utils/errorResponse');
const APIFeatures = require('../utils/apiFeatures');
const logger = require('../utils/logger');

// @desc    Get all products with filters, sorting, pagination
// @route   GET /api/v1/products
// @access  Public
exports.getProducts = async (req, res, next) => {
  try {
    // Build base filter — handle params that need pre-processing
    const baseFilter = { isActive: true };
    const cleanQuery = { ...req.query };

    // Category: frontend sends slug(s) as comma-joined string → resolve to ObjectIds
    if (req.query.category) {
      const slugs = req.query.category.split(',').map((s) => s.trim()).filter(Boolean);
      const cats = await Category.find({ slug: { $in: slugs }, isActive: true }).select('_id');
      if (cats.length > 0) {
        baseFilter.category = { $in: cats.map((c) => c._id) };
      } else {
        // No matching categories — return empty
        return res.status(200).json({
          success: true, count: 0, total: 0,
          pagination: { page: 1, limit: 12, totalPages: 0, hasNextPage: false, hasPrevPage: false },
          products: [],
        });
      }
      delete cleanQuery.category;
    }

    // Price range: frontend sends minPrice/maxPrice
    if (req.query.minPrice || req.query.maxPrice) {
      baseFilter.price = {};
      if (req.query.minPrice) baseFilter.price.$gte = Number(req.query.minPrice);
      if (req.query.maxPrice) baseFilter.price.$lte = Number(req.query.maxPrice);
      delete cleanQuery.minPrice;
      delete cleanQuery.maxPrice;
    }

    // Min rating
    if (req.query.minRating) {
      baseFilter.ratings = { $gte: Number(req.query.minRating) };
      delete cleanQuery.minRating;
    }

    // Min discount: filter products where discountPrice gives >= minDiscount%
    if (req.query.minDiscount) {
      const pct = Number(req.query.minDiscount) / 100;
      baseFilter.$expr = {
        $gte: [{ $divide: [{ $subtract: ['$price', '$discountPrice'] }, '$price'] }, pct],
      };
      delete cleanQuery.minDiscount;
    }

    const features = new APIFeatures(
      Product.find(baseFilter).populate('category', 'name slug'),
      cleanQuery
    )
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const [products, total] = await Promise.all([
      features.query,
      Product.countDocuments(baseFilter),
    ]);

    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 12, 100);
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      pagination: {
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      products,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get featured products
// @route   GET /api/v1/products/featured
// @access  Public
exports.getFeaturedProducts = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 8, 20);

    const products = await Product.find({ isFeatured: true, isActive: true })
      .populate('category', 'name slug')
      .sort('-ratings -soldCount')
      .limit(limit)
      .select('-description -specifications -highlights');

    res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get top-rated products
// @route   GET /api/v1/products/top
// @access  Public
exports.getTopProducts = async (req, res, next) => {
  try {
    const products = await Product.find({ isActive: true, numReviews: { $gte: 1 } })
      .populate('category', 'name slug')
      .sort('-ratings -numReviews -soldCount')
      .limit(10)
      .select('-description -specifications');

    res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search products
// @route   GET /api/v1/products/search
// @access  Public
exports.searchProducts = async (req, res, next) => {
  try {
    const { q, page = 1, limit = 12, category } = req.query;

    if (!q || q.trim().length < 2) {
      return next(new ErrorResponse('Search query must be at least 2 characters.', 400));
    }

    const searchQuery = q.trim();
    const pageNum = Math.max(parseInt(page, 10), 1);
    const limitNum = Math.min(parseInt(limit, 10), 50);
    const skip = (pageNum - 1) * limitNum;

    const searchFilter = {
      isActive: true,
      $or: [
        { name: { $regex: searchQuery, $options: 'i' } },
        { brand: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } },
      ],
    };

    if (category) {
      const cat = await Category.findOne({ slug: category, isActive: true }).select('_id');
      if (cat) searchFilter.category = cat._id;
    }

    const [products, total] = await Promise.all([
      Product.find(searchFilter)
        .populate('category', 'name slug')
        .sort({ ratings: -1 })
        .skip(skip)
        .limit(limitNum)
        .select('-description -specifications'),
      Product.countDocuments(searchFilter),
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;
    res.status(200).json({
      success: true,
      query: searchQuery,
      count: products.length,
      total,
      totalPages,
      products,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get products by category slug (including subcategories)
// @route   GET /api/v1/products/category/:categorySlug
// @access  Public
exports.getProductsByCategory = async (req, res, next) => {
  try {
    const { categorySlug } = req.params;

    // Find the category
    const category = await Category.findOne({ slug: categorySlug, isActive: true });
    if (!category) {
      return next(new ErrorResponse(`Category '${categorySlug}' not found.`, 404));
    }

    // Get subcategories recursively (one level deep)
    const subcategories = await Category.find({ parent: category._id, isActive: true }).select('_id');
    const categoryIds = [category._id, ...subcategories.map((s) => s._id)];

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 12, 100);
    const skip = (page - 1) * limit;

    // Build filter
    const filter = { category: { $in: categoryIds }, isActive: true };

    // Price filter
    if (req.query['price[gte]'] || req.query['price[lte]']) {
      filter.price = {};
      if (req.query['price[gte]']) filter.price.$gte = Number(req.query['price[gte]']);
      if (req.query['price[lte]']) filter.price.$lte = Number(req.query['price[lte]']);
    }

    // Brand filter
    if (req.query.brand) {
      filter.brand = { $regex: new RegExp(req.query.brand, 'i') };
    }

    // Sort
    const sortMap = {
      'price-asc': { price: 1 },
      'price-desc': { price: -1 },
      rating: { ratings: -1 },
      newest: { createdAt: -1 },
      popular: { soldCount: -1 },
    };
    const sort = sortMap[req.query.sort] || { createdAt: -1 };

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name slug')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('-description -specifications'),
      Product.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      category: { name: category.name, slug: category.slug },
      count: products.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
      products,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product by slug
// @route   GET /api/v1/products/:slug
// @access  Public
exports.getProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug, isActive: true })
      .populate('category', 'name slug parent')
      .populate('vendor', 'name');

    if (!product) {
      return next(new ErrorResponse(`Product not found.`, 404));
    }

    res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product by ID (admin/vendor use)
// @route   GET /api/v1/products/id/:id
// @access  Private (Admin/Vendor)
exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name slug')
      .populate('vendor', 'name');

    if (!product) {
      return next(new ErrorResponse('Product not found.', 404));
    }

    res.status(200).json({ success: true, product });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new product
// @route   POST /api/v1/products
// @access  Private (Admin/Vendor)
exports.createProduct = async (req, res, next) => {
  try {
    const {
      name, description, shortDescription, category, brand,
      price, discountPrice, stock, specifications, highlights,
      tags, isFeatured, weight, sku, warranty, returnPolicy,
      metaTitle, metaDescription,
    } = req.body;

    // Validate category
    const categoryDoc = await Category.findById(category);
    if (!categoryDoc) {
      return next(new ErrorResponse('Category not found.', 404));
    }

    // Process uploaded images
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map((file, index) => ({
        public_id: file.public_id || file.filename,
        url: file.path || file.secure_url,
        isDefault: index === 0,
      }));
    }

    // Parse JSON fields if sent as strings
    const parseField = (field) => {
      if (typeof field === 'string') {
        try { return JSON.parse(field); } catch { return field; }
      }
      return field;
    };

    // Convert specs: frontend sends {key: value} object, model needs [{key, value}] array
    const parseSpecs = (specs) => {
      const parsed = parseField(specs);
      if (!parsed) return [];
      if (Array.isArray(parsed)) return parsed.filter((s) => s.key && s.value);
      return Object.entries(parsed)
        .filter(([k, v]) => k && v)
        .map(([k, v]) => ({ key: k, value: v }));
    };

    const product = await Product.create({
      name,
      description,
      shortDescription,
      category,
      brand,
      price: Number(price),
      discountPrice: discountPrice ? Number(discountPrice) : undefined,
      stock: Number(stock) || 0,
      specifications: parseSpecs(specifications),
      highlights: parseField(highlights) || [],
      tags: parseField(tags) || [],
      images,
      isFeatured: isFeatured === 'true' || isFeatured === true,
      weight: weight ? Number(weight) : undefined,
      sku,
      warranty,
      returnPolicy,
      metaTitle,
      metaDescription,
      vendor: req.user.role === 'vendor' ? req.user._id : undefined,
    });

    await product.populate('category', 'name slug');

    logger.info(`Product created: ${product.name} (ID: ${product._id}) by ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      product,
    });
  } catch (error) {
    // If product creation fails, clean up uploaded images
    if (req.files && req.files.length > 0) {
      req.files.forEach(async (file) => {
        const publicId = file.public_id || file.filename;
        if (publicId) {
          try { await cloudinary.uploader.destroy(publicId); } catch (_) {}
        }
      });
    }
    next(error);
  }
};

// @desc    Update product
// @route   PUT /api/v1/products/:id
// @access  Private (Admin/Vendor)
exports.updateProduct = async (req, res, next) => {
  try {
    let product = await Product.findById(req.params.id);

    if (!product) {
      return next(new ErrorResponse('Product not found.', 404));
    }

    // Vendor can only update their own products
    if (req.user.role === 'vendor' && product.vendor?.toString() !== req.user._id.toString()) {
      return next(new ErrorResponse('Not authorized to update this product.', 403));
    }

    const {
      name, description, shortDescription, category, brand,
      price, discountPrice, stock, specifications, highlights,
      tags, isFeatured, isActive, weight, warranty,
      returnPolicy, metaTitle, metaDescription,
      existingImages, defaultImage,
    } = req.body;

    const parseField = (field) => {
      if (typeof field === 'string') {
        try { return JSON.parse(field); } catch { return field; }
      }
      return field;
    };

    const parseSpecs = (specs) => {
      const parsed = parseField(specs);
      if (!parsed) return [];
      if (Array.isArray(parsed)) return parsed.filter((s) => s.key && s.value);
      return Object.entries(parsed)
        .filter(([k, v]) => k && v)
        .map(([k, v]) => ({ key: k, value: v }));
    };

    // Handle image removals — frontend sends URLs to KEEP; delete the rest from Cloudinary
    const keepUrls = parseField(existingImages);
    if (Array.isArray(keepUrls)) {
      const imagesToRemove = product.images.filter((img) => !keepUrls.includes(img.url));
      for (const img of imagesToRemove) {
        try {
          await cloudinary.uploader.destroy(img.public_id);
          logger.info(`Deleted image from Cloudinary: ${img.public_id}`);
        } catch (err) {
          logger.warn(`Failed to delete image ${img.public_id}: ${err.message}`);
        }
      }
      product.images = product.images.filter((img) => keepUrls.includes(img.url));
    }

    // Handle new image uploads
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file) => ({
        public_id: file.public_id || file.filename,
        url: file.path || file.secure_url,
        isDefault: false,
      }));
      product.images = [...product.images, ...newImages];
    }

    // Set default image — frontend sends the URL of whichever image is marked default
    if (defaultImage) {
      product.images.forEach((img) => {
        img.isDefault = img.url === defaultImage;
      });
    }

    // Fallback: if no default is set, make the first image default
    if (product.images.length > 0 && !product.images.some((img) => img.isDefault)) {
      product.images[0].isDefault = true;
    }

    // Update fields
    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (shortDescription !== undefined) product.shortDescription = shortDescription;
    if (category !== undefined) product.category = category;
    if (brand !== undefined) product.brand = brand;
    if (price !== undefined) product.price = Number(price);
    if (discountPrice !== undefined) product.discountPrice = discountPrice ? Number(discountPrice) : undefined;
    if (stock !== undefined) product.stock = Number(stock);
    if (specifications !== undefined) product.specifications = parseSpecs(specifications);
    if (highlights !== undefined) product.highlights = parseField(highlights);
    if (tags !== undefined) product.tags = parseField(tags);
    if (isFeatured !== undefined) product.isFeatured = isFeatured === 'true' || isFeatured === true;
    if (isActive !== undefined) product.isActive = isActive === 'true' || isActive === true;
    if (weight !== undefined) product.weight = Number(weight);
    if (warranty !== undefined) product.warranty = warranty;
    if (returnPolicy !== undefined) product.returnPolicy = returnPolicy;
    if (metaTitle !== undefined) product.metaTitle = metaTitle;
    if (metaDescription !== undefined) product.metaDescription = metaDescription;

    await product.save();
    await product.populate('category', 'name slug');

    logger.info(`Product updated: ${product.name} (ID: ${product._id}) by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Product updated successfully.',
      product,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete product
// @route   DELETE /api/v1/products/:id
// @access  Private (Admin only)
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return next(new ErrorResponse('Product not found.', 404));
    }

    // Delete all images from Cloudinary
    if (product.images && product.images.length > 0) {
      const deletePromises = product.images.map((img) =>
        cloudinary.uploader.destroy(img.public_id).catch((err) =>
          logger.warn(`Failed to delete image ${img.public_id}: ${err.message}`)
        )
      );
      await Promise.allSettled(deletePromises);
    }

    await product.deleteOne();

    logger.info(`Product deleted: ${product.name} (ID: ${product._id}) by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get distinct brands from active products (for filters)
// @route   GET /api/v1/products/brands
// @access  Public
exports.getBrands = async (req, res, next) => {
  try {
    const { category } = req.query;
    const match = { isActive: true, brand: { $exists: true, $ne: '' } };

    if (category) {
      const cat = await Category.findOne({ slug: category });
      if (cat) match.category = cat._id;
    }

    const brands = await Product.distinct('brand', match);
    const sorted = brands.filter(Boolean).sort((a, b) => a.localeCompare(b));

    res.status(200).json({ success: true, brands: sorted });
  } catch (error) {
    next(error);
  }
};
