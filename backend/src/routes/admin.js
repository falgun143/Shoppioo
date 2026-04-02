'use strict';

const express = require('express');
const router = express.Router();

const {
  getDashboardStats,
  getAdminOrders,
  updateAdminOrderStatus,
  createUser,
  getUsers,
  getUserById,
  updateUser,
  blockUser,
  deleteUser,
  getSalesReport,
} = require('../controllers/adminController');

const { protect, authorize } = require('../middleware/auth');

// All admin routes require auth and admin role
router.use(protect, authorize('admin'));

// Dashboard
router.get('/dashboard', getDashboardStats);

// Reports
router.get('/reports/sales', getSalesReport);

// Orders
router.get('/orders', getAdminOrders);
router.put('/orders/:id/status', updateAdminOrderStatus);

// User management
router.post('/users', createUser);
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.put('/users/:id/block', blockUser);
router.delete('/users/:id', deleteUser);

module.exports = router;
