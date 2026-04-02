'use strict';

const jwt = require('jsonwebtoken');

/**
 * Generate JWT token, set as httpOnly cookie, and return token string
 * @param {Object} user - Mongoose user document
 * @param {number} statusCode - HTTP status code for response
 * @param {Object} res - Express response object
 * @param {string} [message] - Optional response message
 */
const sendTokenResponse = (user, statusCode, res, message = 'Success', rememberMe = true) => {
  const token = user.getSignedJwtToken(rememberMe);

  const cookieExpireDays = rememberMe ? 30 : 1;

  const cookieOptions = {
    expires: new Date(Date.now() + cookieExpireDays * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
  };

  const userResponse = {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    avatar: user.avatar,
    emailVerified: user.emailVerified,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };

  res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      message,
      token,
      user: userResponse,
    });
};

/**
 * Generate a raw JWT token string (without setting cookie)
 * @param {string} id - User ID
 * @returns {string} JWT token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

module.exports = { sendTokenResponse, generateToken };
