'use strict';

const express = require('express');
const router = express.Router();

const {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  updatePassword,
  forgotPassword,
  verifyOtp,
  resetPassword,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
} = require('../controllers/authController');

const { protect } = require('../middleware/auth');
const { uploadProfileImage } = require('../middleware/upload');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);

// Protected routes
router.use(protect); // Apply protect middleware to all routes below

router.post('/logout', logout);
router.get('/me', getMe);
router.put('/profile', uploadProfileImage, updateProfile);
router.put('/password', updatePassword);

// Address management
router.get('/addresses', getAddresses);
router.post('/addresses', addAddress);
router.put('/addresses/:addressId', updateAddress);
router.delete('/addresses/:addressId', deleteAddress);

module.exports = router;
