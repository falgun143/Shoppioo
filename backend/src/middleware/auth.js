'use strict';

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');

/**
 * Protect routes — verify JWT from cookie or Authorization header
 */
const protect = async (req, res, next) => {
  let token;

  // Check Authorization header first
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    // Fallback to cookie
    token = req.cookies.token;
  }

  if (!token) {
    return next(new ErrorResponse('Access denied. No token provided. Please log in.', 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('+isActive +role');

    if (!user) {
      return next(new ErrorResponse('User belonging to this token no longer exists.', 401));
    }

    if (!user.isActive) {
      return next(
        new ErrorResponse('Your account has been suspended. Please contact support.', 403)
      );
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new ErrorResponse('Your session has expired. Please log in again.', 401));
    }
    if (err.name === 'JsonWebTokenError') {
      return next(new ErrorResponse('Invalid authentication token. Please log in again.', 401));
    }
    return next(new ErrorResponse('Authentication failed. Please log in again.', 401));
  }
};

/**
 * Authorize specific roles
 * @param {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorResponse('Authentication required.', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `Role '${req.user.role}' is not authorized to access this resource.`,
          403
        )
      );
    }

    next();
  };
};

/**
 * Optional auth — attach user if token present, but don't block if not
 */
const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('+isActive');
    if (user && user.isActive) {
      req.user = user;
    }
  } catch (_) {
    // Silently ignore invalid tokens for optional auth
  }

  next();
};

module.exports = { protect, authorize, optionalAuth };
