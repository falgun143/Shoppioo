'use strict';

const crypto = require('crypto');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const { sendTokenResponse } = require('../utils/generateToken');
const { sendSMS } = require('../utils/sms');
const cloudinary = require('../config/cloudinary');
const logger = require('../utils/logger');

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return next(new ErrorResponse('Name, email and password are required.', 400));
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return next(new ErrorResponse('An account with this email already exists.', 409));
    }

    // Check if phone already exists (if provided)
    if (phone) {
      const phoneExists = await User.findOne({ phone });
      if (phoneExists) {
        return next(new ErrorResponse('An account with this phone number already exists.', 409));
      }
    }

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phone ? phone.trim() : undefined,
    });

    // Send welcome SMS (non-blocking)
    if (user.phone) {
      sendSMS(user.phone, 'welcome', { name: user.name })
        .catch((err) => logger.error(`Welcome SMS failed for ${user.phone}: ${err.message}`));
    }

    logger.info(`New user registered: ${user.email} (ID: ${user._id})`);

    sendTokenResponse(user, 201, res, 'Registration successful! Welcome to Shoppioo.');
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password, rememberMe = false } = req.body;

    if (!email || !password) {
      return next(new ErrorResponse('Please provide email and password.', 400));
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password +isActive');

    if (!user) {
      return next(new ErrorResponse('Invalid email or password.', 401));
    }

    // Check if account is active
    if (!user.isActive) {
      return next(
        new ErrorResponse(
          'Your account has been suspended. Please contact support at support@shoppioo.in.',
          403
        )
      );
    }

    // Verify password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return next(new ErrorResponse('Invalid email or password.', 401));
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    logger.info(`User logged in: ${user.email} from IP: ${req.ip}`);

    sendTokenResponse(user, 200, res, 'Logged in successfully.', rememberMe);
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user / Clear cookie
// @route   POST /api/v1/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 5 * 1000), // 5 seconds
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    });

    logger.info(`User logged out: ${req.user ? req.user.email : 'unknown'}`);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged-in user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return next(new ErrorResponse('User not found.', 404));
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile (name, phone, addresses)
// @route   PUT /api/v1/auth/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, addresses } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return next(new ErrorResponse('User not found.', 404));
    }

    // Update basic fields
    if (name) user.name = name.trim();
    if (phone !== undefined) {
      if (phone && phone !== user.phone) {
        const phoneExists = await User.findOne({ phone, _id: { $ne: user._id } });
        if (phoneExists) {
          return next(new ErrorResponse('This phone number is already in use.', 409));
        }
      }
      user.phone = phone;
    }

    if (addresses !== undefined) {
      user.addresses = addresses;
    }

    // Handle avatar upload
    if (req.file) {
      // Delete old avatar from Cloudinary if it's not the default
      if (user.avatar && user.avatar.public_id && user.avatar.public_id !== '') {
        try {
          await cloudinary.uploader.destroy(user.avatar.public_id);
        } catch (err) {
          logger.warn(`Failed to delete old avatar: ${err.message}`);
        }
      }

      user.avatar = {
        public_id: req.file.public_id || req.file.filename,
        url: req.file.path || req.file.secure_url,
      };
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update password
// @route   PUT /api/v1/auth/password
// @access  Private
exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return next(new ErrorResponse('Please provide current and new password.', 400));
    }

    if (newPassword.length < 8) {
      return next(new ErrorResponse('New password must be at least 8 characters.', 400));
    }

    if (currentPassword === newPassword) {
      return next(new ErrorResponse('New password must be different from current password.', 400));
    }

    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return next(new ErrorResponse('User not found.', 404));
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return next(new ErrorResponse('Current password is incorrect.', 400));
    }

    user.password = newPassword;
    await user.save();

    logger.info(`Password updated for user: ${user.email}`);

    sendTokenResponse(user, 200, res, 'Password updated successfully.');
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password - Send OTP via SMS to registered phone number
// @route   POST /api/v1/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return next(new ErrorResponse('Please provide your registered phone number.', 400));
    }

    // Normalize phone: strip country code, keep 10 digits
    const normalized = phone.toString().replace(/\D/g, '');
    const tenDigit =
      normalized.length === 12 && normalized.startsWith('91')
        ? normalized.slice(2)
        : normalized.length === 10
        ? normalized
        : null;

    if (!tenDigit) {
      return next(new ErrorResponse('Please provide a valid 10-digit Indian phone number.', 400));
    }

    const user = await User.findOne({ phone: { $regex: tenDigit + '$' } });

    // Always return success to prevent phone enumeration
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If a Shoppioo account exists for this number, an OTP has been sent.',
      });
    }

    // Generate 6-digit OTP
    const otp = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const isDev = process.env.NODE_ENV !== 'production';

    if (!isDev) {
      // Production: send real SMS
      const result = await sendSMS(tenDigit, 'passwordResetOTP', { otp });
      if (!result.success && !result.skipped) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save({ validateBeforeSave: false });
        return next(new ErrorResponse('Failed to send OTP. Please try again in a moment.', 500));
      }
      logger.info(`Password reset OTP sent via SMS to: ${tenDigit}`);
    } else {
      logger.info(`[DEV] Password reset OTP for ${tenDigit}: ${otp}`);
    }

    res.status(200).json({
      success: true,
      message: 'If a Shoppioo account exists for this number, an OTP has been sent.',
      ...(isDev && { otp }), // expose OTP in response for dev/testing only
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP (without consuming it)
// @route   POST /api/v1/auth/verify-otp
// @access  Public
exports.verifyOtp = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return next(new ErrorResponse('Phone and OTP are required.', 400));
    }

    const hashedOTP = crypto.createHash('sha256').update(otp.toString()).digest('hex');

    const digits = phone.toString().replace(/\D/g, '');
    const tenDigit = digits.length === 10 ? digits
      : digits.length === 12 && digits.startsWith('91') ? digits.slice(2)
      : digits.length === 11 && digits.startsWith('0') ? digits.slice(1)
      : null;

    if (!tenDigit) {
      return next(new ErrorResponse('Invalid phone number.', 400));
    }

    const user = await User.findOne({
      phone: { $regex: tenDigit + '$' },
      resetPasswordToken: hashedOTP,
      resetPasswordExpire: { $gt: new Date() },
    }).select('+resetPasswordToken +resetPasswordExpire');

    if (!user) {
      return next(new ErrorResponse('Invalid or expired OTP. Please request a new one.', 400));
    }

    res.status(200).json({ success: true, message: 'OTP verified successfully.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password using OTP
// @route   POST /api/v1/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { phone, otp, newPassword } = req.body;

    if (!phone || !otp || !newPassword) {
      return next(new ErrorResponse('Phone, OTP and new password are required.', 400));
    }

    if (newPassword.length < 8) {
      return next(new ErrorResponse('Password must be at least 8 characters.', 400));
    }

    const digits = phone.toString().replace(/\D/g, '');
    const tenDigit = digits.length === 10 ? digits
      : digits.length === 12 && digits.startsWith('91') ? digits.slice(2)
      : digits.length === 11 && digits.startsWith('0') ? digits.slice(1)
      : null;

    if (!tenDigit) {
      return next(new ErrorResponse('Invalid phone number.', 400));
    }

    // Hash the OTP to compare with stored hash
    const hashedOTP = crypto.createHash('sha256').update(otp.toString()).digest('hex');

    const user = await User.findOne({
      phone: { $regex: tenDigit + '$' },
      resetPasswordToken: hashedOTP,
      resetPasswordExpire: { $gt: new Date() },
    }).select('+resetPasswordToken +resetPasswordExpire +password');

    if (!user) {
      return next(new ErrorResponse('Invalid or expired OTP. Please request a new one.', 400));
    }

    // Update password
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    logger.info(`Password reset successful for: ${user.email}`);

    sendTokenResponse(user, 200, res, 'Password reset successful. You are now logged in.');
  } catch (error) {
    next(error);
  }
};

// @desc    Add or update user address
// @route   POST /api/v1/auth/addresses
// @access  Private
exports.addAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (user.addresses.length >= 5) {
      return next(new ErrorResponse('You can save a maximum of 5 addresses.', 400));
    }

    const newAddress = req.body;

    if (newAddress.isDefault) {
      user.addresses.forEach((addr) => (addr.isDefault = false));
    }

    user.addresses.push(newAddress);
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Address added successfully.',
      addresses: user.addresses,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all addresses for logged-in user
// @route   GET /api/v1/auth/addresses
// @access  Private
exports.getAddresses = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('addresses');
    res.status(200).json({ success: true, addresses: user.addresses });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a user address
// @route   PUT /api/v1/auth/addresses/:addressId
// @access  Private
exports.updateAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const address = user.addresses.id(req.params.addressId);

    if (!address) return next(new ErrorResponse('Address not found.', 404));

    if (req.body.isDefault) {
      user.addresses.forEach((addr) => (addr.isDefault = false));
    }

    Object.assign(address, req.body);
    await user.save();

    res.status(200).json({ success: true, addresses: user.addresses });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user address
// @route   DELETE /api/v1/auth/addresses/:addressId
// @access  Private
exports.deleteAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const addressId = req.params.addressId;

    const addressIndex = user.addresses.findIndex(
      (addr) => addr._id.toString() === addressId
    );

    if (addressIndex === -1) {
      return next(new ErrorResponse('Address not found.', 404));
    }

    user.addresses.splice(addressIndex, 1);

    // Set new default if deleted was default
    if (user.addresses.length > 0) {
      const hasDefault = user.addresses.some((a) => a.isDefault);
      if (!hasDefault) {
        user.addresses[0].isDefault = true;
      }
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Address deleted successfully.',
      addresses: user.addresses,
    });
  } catch (error) {
    next(error);
  }
};
