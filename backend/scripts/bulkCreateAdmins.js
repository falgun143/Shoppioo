/**
 * Bulk create 100 admin accounts
 * Emails:  admin2@gmail.com … admin101@gmail.com
 * Password: admin@123
 * Phone:   unique 10-digit Indian numbers starting at 9000000002
 *
 * Usage:
 *   node scripts/bulkCreateAdmins.js
 *
 * Set ADMIN_EMAIL / ADMIN_PASSWORD env vars if your super-admin credentials differ.
 */

const axios = require('axios');

const BASE_URL   = process.env.API_URL   || 'http://localhost:5000/api/v1';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL   || 'admin@gmail.com';
const ADMIN_PASS  = process.env.ADMIN_PASSWORD || 'admin@123';

const START_INDEX = 2;   // admin2 … admin101
const COUNT       = 100;
const PASSWORD    = 'admin@123';
// Phones: 9000000002 … 9000000101  (valid Indian mobile range)
const BASE_PHONE  = 9000000002n;

async function login() {
  const res = await axios.post(`${BASE_URL}/auth/login`, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASS,
  });
  return res.data.token;
}

async function createAdmin(token, index) {
  const email = `admin${index}@gmail.com`;
  const phone = String(BASE_PHONE + BigInt(index - START_INDEX));
  const name  = `Admin ${index}`;

  try {
    await axios.post(
      `${BASE_URL}/admin/users`,
      { name, email, password: PASSWORD, phone, role: 'admin' },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log(`[OK]  ${email}  ${phone}`);
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    console.error(`[FAIL] ${email} — ${msg}`);
  }
}

async function main() {
  console.log('Logging in as', ADMIN_EMAIL, '…');
  let token;
  try {
    token = await login();
  } catch (err) {
    console.error('Login failed:', err.response?.data?.message || err.message);
    process.exit(1);
  }
  console.log('Logged in. Creating 100 admins…\n');

  for (let i = START_INDEX; i < START_INDEX + COUNT; i++) {
    await createAdmin(token, i);
  }

  console.log('\nDone.');
}

main();
