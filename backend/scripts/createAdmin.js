'use strict';

/**
 * Admin User Seeder
 * Usage: node scripts/createAdmin.js
 *
 * Run this ONCE after setting up your .env to create the first admin account.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const readline = require('readline');

const User = require('../src/models/User');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

async function main() {
  console.log('\n========================================');
  console.log('   Shoppioo — Create Admin Account');
  console.log('========================================\n');

  // Connect to MongoDB
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB\n');
  } catch (err) {
    console.error('✗ MongoDB connection failed:', err.message);
    console.error('\nMake sure MONGO_URI is set correctly in backend/.env');
    process.exit(1);
  }

  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log(`⚠  Admin already exists: ${existingAdmin.email}`);
      const overwrite = await ask('Create another admin? (y/n): ');
      if (overwrite.toLowerCase() !== 'y') {
        console.log('\nExiting. Use the existing admin account to log in.\n');
        process.exit(0);
      }
    }

    // Collect admin details
    const name     = (await ask('Admin name     : ')).trim();
    const email    = (await ask('Admin email    : ')).trim().toLowerCase();
    const phone    = (await ask('Mobile number  : ')).trim();
    const password = (await ask('Password       : ')).trim();

    if (!name || !email || !phone || !password) {
      console.error('\n✗ All fields are required.');
      process.exit(1);
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      console.error('\n✗ Enter a valid 10-digit mobile number.');
      process.exit(1);
    }

    if (password.length < 8) {
      console.error('\n✗ Password must be at least 8 characters.');
      process.exit(1);
    }

    // Check for duplicates
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      console.error(`\n✗ Email ${email} is already registered.`);
      process.exit(1);
    }

    // Create admin
    const admin = await User.create({
      name,
      email,
      phone,
      password,          // hashed by pre-save hook in User model
      role: 'admin',
      isActive: true,
      emailVerified: true,
    });

    console.log('\n========================================');
    console.log('✓ Admin account created successfully!');
    console.log('========================================');
    console.log(`  Name  : ${admin.name}`);
    console.log(`  Email : ${admin.email}`);
    console.log(`  Phone : ${admin.phone}`);
    console.log(`  Role  : ${admin.role}`);
    console.log('\n  Login at: http://localhost:5173/login');
    console.log('  Admin panel: http://localhost:5173/admin');
    console.log('========================================\n');

  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      console.error(`\n✗ ${field} already exists.`);
    } else {
      console.error('\n✗ Error creating admin:', err.message);
    }
    process.exit(1);
  } finally {
    rl.close();
    await mongoose.disconnect();
  }
}

main();
