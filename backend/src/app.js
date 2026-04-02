'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const path = require('path');

const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Route imports
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const wishlistRoutes = require('./routes/wishlist');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payment');
const reviewRoutes = require('./routes/reviews');
const categoryRoutes = require('./routes/categories');
const couponRoutes = require('./routes/coupons');
const shippingRoutes = require('./routes/shipping');
const adminRoutes = require('./routes/admin');

const app = express();

// Trust proxy (needed for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'https://shoppioo.in',
      'http://localhost:3000',
      'http://localhost:5173',
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Compression
app.use(compression());

// HTTP request logger
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(
    morgan('combined', {
      stream: {
        write: (message) => logger.info(message.trim()),
      },
    })
  );
}

// Razorpay webhook needs raw body — must be before express.json()
app.use(
  '/api/v1/payment/webhook',
  express.raw({ type: 'application/json' })
);

// Cookie parser
app.use(cookieParser());

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Data sanitization against NoSQL injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent HTTP parameter pollution
app.use(
  hpp({
    whitelist: ['price', 'rating', 'sort', 'fields', 'page', 'limit', 'category', 'brand'],
  })
);

// Static files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Apply general rate limiter to all API routes
// generalLimiter removed — reintroduce once behind a reverse proxy with proper IP trust

// Health check (no rate limit)
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Shoppioo API is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    pid: process.pid,
  });
});

// Mount routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/wishlist', wishlistRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/payment', paymentRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/coupons', couponRoutes);
app.use('/api/v1/shipping', shippingRoutes);
app.use('/api/v1/admin', adminRoutes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global error handler (must be last)
app.use(errorHandler);

module.exports = app;
