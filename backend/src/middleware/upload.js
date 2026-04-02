'use strict';

const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const ErrorResponse = require('../utils/errorResponse');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ErrorResponse(
        'Invalid file type. Only JPEG, JPG, PNG and WebP images are allowed.',
        400
      ),
      false
    );
  }
};

// Product images storage — up to 6 images
const productStorage = new CloudinaryStorage({  
  cloudinary,
  params: async (req, file) => {
    const ext = file.mimetype.split('/')[1];
    return {
      folder: 'shoppioo/products',
      format: ext === 'webp' ? 'webp' : 'jpg',
      transformation: [
        { width: 1200, height: 1200, crop: 'limit', quality: 'auto:good' },
        { fetch_format: 'auto' },
      ],
      public_id: `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  },
});

// Profile image storage — 1 image
const profileStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const userId = req.user ? req.user._id.toString() : 'unknown';
    return {
      folder: 'shoppioo/profiles',
      format: 'jpg',
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face', quality: 'auto:good' },
      ],
      public_id: `profile_${userId}_${Date.now()}`,
    };
  },
});

// Category image storage
const categoryStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'shoppioo/categories',
    format: 'jpg',
    transformation: [{ width: 800, height: 600, crop: 'fill', quality: 'auto:good' }],
    public_id: `category_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  }),
});

// Review image storage
const reviewStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'shoppioo/reviews',
    format: 'jpg',
    transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto:good' }],
    public_id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  }),
});

const productImages = multer({
  storage: productStorage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    fieldSize: 10 * 1024 * 1024,
    files: 6,
  },
}).array('images', 6);

const profileImage = multer({
  storage: profileStorage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
}).single('avatar');

const categoryImage = multer({
  storage: categoryStorage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
}).single('image');

const reviewImages = multer({
  storage: reviewStorage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 4,
  },
}).array('images', 4);

// Wrap multer to handle errors gracefully
const handleUpload = (uploadFn) => (req, res, next) => {
  uploadFn(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new ErrorResponse('File too large. Maximum size is 5MB per image.', 400));
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return next(new ErrorResponse('Too many files. Maximum 6 images allowed.', 400));
        }
        if (err.code === 'LIMIT_FIELD_VALUE') {
          return next(new ErrorResponse('Text field too long. Please shorten your description or other text fields.', 400));
        }
        return next(new ErrorResponse(`Upload error: ${err.message}`, 400));
      }
      return next(err);
    }
    next();
  });
};

module.exports = {
  uploadProductImages: handleUpload(productImages),
  uploadProfileImage: handleUpload(profileImage),
  uploadCategoryImage: handleUpload(categoryImage),
  uploadReviewImages: handleUpload(reviewImages),
};
