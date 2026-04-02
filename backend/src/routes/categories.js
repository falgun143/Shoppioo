'use strict';

const express = require('express');
const router = express.Router();

const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');

const { protect, authorize } = require('../middleware/auth');
const { uploadCategoryImage } = require('../middleware/upload');

// Public routes
router.get('/', getCategories);
router.get('/:slug', getCategory);

// Admin routes
router.post('/', protect, authorize('admin'), uploadCategoryImage, createCategory);
router.put('/:id', protect, authorize('admin'), uploadCategoryImage, updateCategory);
router.delete('/:id', protect, authorize('admin'), deleteCategory);

module.exports = router;
