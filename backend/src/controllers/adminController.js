'use strict';

const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const ErrorResponse = require('../utils/errorResponse');
const logger = require('../utils/logger');

// @desc    Get dashboard stats
// @route   GET /api/v1/admin/dashboard
// @access  Private (Admin)
exports.getDashboardStats = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const last12Months = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const [
      totalRevenue,
      totalOrders,
      totalUsers,
      totalProducts,
      thisMonthRevenue,
      lastMonthRevenue,
      thisMonthOrders,
      lastMonthOrders,
      ordersByStatus,
      revenueByMonth,
      topProducts,
      recentOrders,
      newUsersThisMonth,
    ] = await Promise.all([
      // Total revenue (all time)
      Order.aggregate([
        { $match: { isPaid: true } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } },
      ]),

      // Total orders
      Order.countDocuments(),

      // Total users
      User.countDocuments({ role: 'customer' }),

      // Total active products
      Product.countDocuments({ isActive: true }),

      // This month revenue
      Order.aggregate([
        { $match: { isPaid: true, createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } },
      ]),

      // Last month revenue
      Order.aggregate([
        { $match: { isPaid: true, createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } },
      ]),

      // This month orders
      Order.countDocuments({ createdAt: { $gte: startOfMonth } }),

      // Last month orders
      Order.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),

      // Orders by status
      Order.aggregate([
        { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Revenue by month (last 12 months)
      Order.aggregate([
        { $match: { isPaid: true, createdAt: { $gte: last12Months } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            revenue: { $sum: '$totalPrice' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),

      // Top selling products
      Order.aggregate([
        { $match: { orderStatus: { $in: ['delivered', 'shipped', 'processing'] } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            name: { $first: '$items.name' },
            image: { $first: '$items.image' },
            totalSold: { $sum: '$items.quantity' },
            totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          },
        },
        { $sort: { totalSold: -1 } },
        { $limit: 10 },
      ]),

      // Recent orders
      Order.find()
        .populate('user', 'name email')
        .sort('-createdAt')
        .limit(10)
        .select('orderNumber orderStatus totalPrice paymentMethod createdAt user'),

      // New users this month
      User.countDocuments({ role: 'customer', createdAt: { $gte: startOfMonth } }),
    ]);

    // Format revenue by month
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const revenueChartData = revenueByMonth.map((item) => ({
      month: `${monthNames[item._id.month - 1]} ${item._id.year}`,
      year: item._id.year,
      monthNum: item._id.month,
      revenue: Math.round(item.revenue),
      orders: item.orders,
    }));

    // Calculate growth percentages
    const thisMonthRev = thisMonthRevenue[0]?.total || 0;
    const lastMonthRev = lastMonthRevenue[0]?.total || 0;
    const revenueGrowth = lastMonthRev > 0
      ? Math.round(((thisMonthRev - lastMonthRev) / lastMonthRev) * 100)
      : thisMonthRev > 0 ? 100 : 0;

    const orderGrowth = lastMonthOrders > 0
      ? Math.round(((thisMonthOrders - lastMonthOrders) / lastMonthOrders) * 100)
      : thisMonthOrders > 0 ? 100 : 0;

    // Format orders by status
    const statusMap = {};
    ordersByStatus.forEach((s) => { statusMap[s._id] = s.count; });

    res.status(200).json({
      success: true,
      stats: {
        totalRevenue: Math.round(totalRevenue[0]?.total || 0),
        totalOrders,
        totalUsers,
        totalProducts,
        newUsersThisMonth,
        thisMonth: {
          revenue: Math.round(thisMonthRev),
          orders: thisMonthOrders,
          revenueGrowth,
          orderGrowth,
        },
        ordersByStatus: statusMap,
        revenueByMonth: revenueChartData,
        topProducts,
        recentOrders,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create user (Admin)
// @route   POST /api/v1/admin/users
// @access  Private (Admin)
exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, phone, role = 'customer' } = req.body;

    if (!name || !email || !password) {
      return next(new ErrorResponse('Name, email and password are required.', 400));
    }

    if (password.length < 8) {
      return next(new ErrorResponse('Password must be at least 8 characters.', 400));
    }

    const emailExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (emailExists) {
      return next(new ErrorResponse('An account with this email already exists.', 409));
    }

    if (phone) {
      const phoneExists = await User.findOne({ phone: phone.trim() });
      if (phoneExists) {
        return next(new ErrorResponse('An account with this phone number already exists.', 409));
      }
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phone ? phone.trim() : undefined,
      role: ['customer', 'admin', 'vendor'].includes(role) ? role : 'customer',
    });

    logger.info(`User ${user.email} created by admin ${req.user.email}`);

    const userResponse = await User.findById(user._id).select('-password -resetPasswordToken -resetPasswordExpire');
    res.status(201).json({ success: true, message: 'User created successfully.', user: userResponse });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users
// @route   GET /api/v1/admin/users
// @access  Private (Admin)
exports.getUsers = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { phone: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .select('-password -resetPasswordToken -resetPasswordExpire -emailVerifyToken'),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
      users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user by ID
// @route   GET /api/v1/admin/users/:id
// @access  Private (Admin)
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select(
      '-password -resetPasswordToken -resetPasswordExpire -emailVerifyToken'
    );

    if (!user) {
      return next(new ErrorResponse('User not found.', 404));
    }

    // Get user's order stats
    const orderStats = await Order.aggregate([
      { $match: { user: user._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: { $cond: ['$isPaid', '$totalPrice', 0] } },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$orderStatus', 'delivered'] }, 1, 0] },
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      user,
      orderStats: orderStats[0] || { totalOrders: 0, totalSpent: 0, completedOrders: 0 },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user details (Admin)
// @route   PUT /api/v1/admin/users/:id
// @access  Private (Admin)
exports.updateUser = async (req, res, next) => {
  try {
    const { name, email, phone, role } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return next(new ErrorResponse('User not found.', 404));
    }

    // Prevent admin from demoting themselves
    if (req.user._id.toString() === req.params.id && role && role !== 'admin') {
      return next(new ErrorResponse('You cannot change your own admin role.', 400));
    }

    if (name !== undefined) user.name = name.trim();
    if (phone !== undefined) user.phone = phone;
    if (role !== undefined && ['customer', 'admin', 'vendor'].includes(role)) {
      user.role = role;
    }

    if (email !== undefined && email !== user.email) {
      const emailExists = await User.findOne({ email: email.toLowerCase(), _id: { $ne: user._id } });
      if (emailExists) {
        return next(new ErrorResponse('Email already in use.', 409));
      }
      user.email = email.toLowerCase().trim();
      user.emailVerified = false;
    }

    await user.save();

    logger.info(`User ${user.email} updated by admin ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'User updated successfully.',
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Block/Unblock user
// @route   PUT /api/v1/admin/users/:id/block
// @access  Private (Admin)
exports.blockUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(new ErrorResponse('User not found.', 404));
    }

    if (user.role === 'admin') {
      return next(new ErrorResponse('Admin accounts cannot be blocked.', 403));
    }

    // Prevent admin from blocking themselves
    if (req.user._id.toString() === req.params.id) {
      return next(new ErrorResponse('You cannot block your own account.', 400));
    }

    user.isActive = !user.isActive;
    await user.save();

    const action = user.isActive ? 'unblocked' : 'blocked';
    logger.info(`User ${user.email} ${action} by admin ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: `User account has been ${action} successfully.`,
      isActive: user.isActive,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/v1/admin/users/:id
// @access  Private (Admin)
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(new ErrorResponse('User not found.', 404));
    }

    if (user.role === 'admin') {
      return next(new ErrorResponse('Admin accounts cannot be deleted.', 403));
    }

    if (req.user._id.toString() === req.params.id) {
      return next(new ErrorResponse('You cannot delete your own account.', 400));
    }

    await user.deleteOne();

    logger.info(`User ${user.email} deleted by admin ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all orders (admin)
// @route   GET /api/v1/admin/orders
// @access  Private (Admin)
exports.getAdminOrders = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 15, 100);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status) filter.orderStatus = req.query.status;
    if (req.query.dateFrom || req.query.dateTo) {
      filter.createdAt = {};
      if (req.query.dateFrom) filter.createdAt.$gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) {
        const end = new Date(req.query.dateTo);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }
    if (req.query.search) {
      const userMatches = await User.find({
        name: { $regex: req.query.search, $options: 'i' },
      }).select('_id');
      filter.$or = [
        { orderNumber: { $regex: req.query.search, $options: 'i' } },
        ...(userMatches.length > 0 ? [{ user: { $in: userMatches.map((u) => u._id) } }] : []),
      ];
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('user', 'name email')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .select('orderNumber orderStatus totalPrice paymentMethod isPaid createdAt user items'),
      Order.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      orders,
      total,
      totalPages: Math.ceil(total / limit),
      page,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status (admin)
// @route   PUT /api/v1/admin/orders/:id/status
// @access  Private (Admin)
exports.updateAdminOrderStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
    if (!validStatuses.includes(status)) {
      return next(new ErrorResponse('Invalid order status.', 400));
    }

    const order = await Order.findById(req.params.id);
    if (!order) return next(new ErrorResponse('Order not found.', 404));

    order.orderStatus = status;
    await order.save();

    logger.info(`Order ${order.orderNumber} status → ${status} by admin ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}.`,
      order,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get sales report
// @route   GET /api/v1/admin/reports/sales
// @access  Private (Admin)
exports.getSalesReport = async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    const filter = { isPaid: true };

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    } else {
      // Default: last 30 days
      filter.createdAt = { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
    }

    let groupByFormat;
    switch (groupBy) {
      case 'week':
        groupByFormat = {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' },
        };
        break;
      case 'month':
        groupByFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        };
        break;
      default: // day
        groupByFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
        };
    }

    const [revenueData, topProducts, paymentStats, orderStatusStats] = await Promise.all([
      // Revenue grouped by time period
      Order.aggregate([
        { $match: filter },
        {
          $group: {
            _id: groupByFormat,
            revenue: { $sum: '$totalPrice' },
            orders: { $sum: 1 },
            avgOrderValue: { $avg: '$totalPrice' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ]),

      // Top selling products in date range
      Order.aggregate([
        { $match: { ...filter, isPaid: true } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            name: { $first: '$items.name' },
            image: { $first: '$items.image' },
            totalSold: { $sum: '$items.quantity' },
            totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          },
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 10 },
      ]),

      // Payment method breakdown
      Order.aggregate([
        { $match: { ...filter } },
        {
          $group: {
            _id: '$paymentMethod',
            count: { $sum: 1 },
            revenue: { $sum: { $cond: ['$isPaid', '$totalPrice', 0] } },
          },
        },
      ]),

      // Order status breakdown
      Order.aggregate([
        { $match: { createdAt: filter.createdAt } },
        { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
      ]),
    ]);

    // Summary stats
    const totalRevenue = revenueData.reduce((sum, d) => sum + d.revenue, 0);
    const totalOrdersCount = revenueData.reduce((sum, d) => sum + d.orders, 0);
    const avgOrderValue = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;

    res.status(200).json({
      success: true,
      report: {
        period: {
          startDate: filter.createdAt?.$gte || 'All time',
          endDate: filter.createdAt?.$lte || new Date(),
          groupBy,
        },
        summary: {
          totalRevenue: Math.round(totalRevenue),
          totalOrders: totalOrdersCount,
          avgOrderValue: Math.round(avgOrderValue),
        },
        revenueData,
        topProducts,
        paymentStats,
        orderStatusStats,
      },
    });
  } catch (error) {
    next(error);
  }
};
