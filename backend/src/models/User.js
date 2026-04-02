'use strict';
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');


const addressSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Address name is required'], trim: true },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian phone number'],
    },
    addressLine1: { type: String, required: [true, 'Address line 1 is required'], trim: true },
    addressLine2: { type: String, trim: true, default: '' },
    city: { type: String, required: [true, 'City is required'], trim: true },
    state: { type: String, required: [true, 'State is required'], trim: true },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      match: [/^\d{6}$/, 'Please enter a valid 6-digit pincode'],
    },
    country: { type: String, default: 'India', trim: true },
    isDefault: { type: Boolean, default: false },
    addressType: { type: String, enum: ['home', 'work', 'other'], default: 'home' },
  },
  { _id: true }
);


const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian phone number'],
      sparse: true,
    },
    role: {
      type: String,
      enum: { values: ['customer', 'admin', 'vendor'], message: 'Role must be customer, admin, or vendor' },
      default: 'customer',
    },
    avatar: {
      public_id: { type: String, default: '' },
      url: { type: String, default: 'https://res.cloudinary.com/shoppioo/image/upload/v1/shoppioo/profiles/default_avatar.png' },
    },
    addresses: {
      type: [addressSchema],
      validate: {
        validator: function (v) {
          return v.length <= 5;
        },
        message: 'You can save a maximum of 5 addresses',
      },
    },
    isActive: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
    emailVerifyToken: { type: String, select: false },
    emailVerifyExpire: { type: Date, select: false },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpire: { type: Date, select: false },
    lastLogin: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 }, { sparse: true });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Ensure only one default address
userSchema.pre('save', function (next) {
  if (this.isModified('addresses')) {
    const defaults = this.addresses.filter((a) => a.isDefault);
    if (defaults.length > 1) {
      // Keep only last set default
      this.addresses.forEach((a, i) => {
        if (i !== this.addresses.length - 1) a.isDefault = false;
      });
    } else if (defaults.length === 0 && this.addresses.length > 0) {
      this.addresses[0].isDefault = true;
    }
  }
  next();
});

// Match entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Generate signed JWT token
userSchema.methods.getSignedJwtToken = function (rememberMe = true) {
  return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
    expiresIn: rememberMe ? '30d' : '1d',
  });
};

// Generate and hash password reset OTP
userSchema.methods.getResetPasswordToken = function () {
  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Hash OTP and set to resetPasswordToken
  this.resetPasswordToken = crypto.createHash('sha256').update(otp).digest('hex');

  // Set OTP expiry (10 minutes)
  this.resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000);

  return otp;
};


// Virtual: is account locked
userSchema.virtual('isLocked').get(function () {
  return this.lockUntil && this.lockUntil > Date.now();
});


module.exports = mongoose.model('User', userSchema);
