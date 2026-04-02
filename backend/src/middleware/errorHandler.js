'use strict';

const ErrorResponse = require('../utils/errorResponse');
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Log errors
  if (error.statusCode >= 500) {
    logger.error(`${err.name}: ${err.message}`, {
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      stack: err.stack,
    });
  } else {
    logger.warn(`${err.name || 'Error'}: ${err.message}`, {
      url: req.originalUrl,
      method: req.method,
      statusCode: error.statusCode,
    });
  }

  // Mongoose bad ObjectId (CastError)
  if (err.name === 'CastError') {
    const message = `Resource not found with id: ${err.value}`;
    error = new ErrorResponse(message, 404);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const value = err.keyValue ? err.keyValue[field] : '';
    const message = `Duplicate value: '${value}' already exists for ${field}. Please use a different value.`;
    error = new ErrorResponse(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    const message = messages.join('. ');
    error = new ErrorResponse(message, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new ErrorResponse('Invalid token. Please log in again.', 401);
  }

  if (err.name === 'TokenExpiredError') {
    error = new ErrorResponse('Your session has expired. Please log in again.', 401);
  }

  if (err.name === 'NotBeforeError') {
    error = new ErrorResponse('Token not yet active. Please try again later.', 401);
  }

  // Razorpay errors
  if (err.statusCode === 400 && err.error && err.error.reason) {
    error = new ErrorResponse(`Payment error: ${err.error.description || 'Payment failed'}`, 400);
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = new ErrorResponse('File size too large. Maximum allowed size is 5MB.', 400);
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    error = new ErrorResponse('Too many files uploaded. Maximum allowed is 6 files.', 400);
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = new ErrorResponse(`Unexpected file field: ${err.field}`, 400);
  }

  // CORS error
  if (err.message && err.message.includes('Not allowed by CORS')) {
    error = new ErrorResponse('CORS policy: Origin not allowed.', 403);
  }

  // MongoDB connection errors
  if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
    error = new ErrorResponse('Database connection error. Please try again later.', 503);
  }

  const isDev = process.env.NODE_ENV === 'development';

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal Server Error',
    ...(isDev && {
      error: err.name,
      stack: err.stack,
      originalError: err,
    }),
  });
};

module.exports = errorHandler;
