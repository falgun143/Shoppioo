/**
 * Bulk create 100 customer accounts
 * Emails:  user2@gmail.com … user101@gmail.com
 * Password: admin@123
 * Phone:   unique 10-digit Indian numbers starting at 9100000002
 *
 * Usage:
 *   node scripts/bulkCreateUsers.js
 *
 * Set ADMIN_EMAIL / ADMIN_PASSWORD env vars if your super-admin credentials differ.
 */

const axios = require('axios');

const BASE_URL    = process.env.API_URL       || 'http://localhost:5000/api/v1';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL   || 'admin@gmail.com';
const ADMIN_PASS  = process.env.ADMIN_PASSWORD || 'admin@123';

const START_INDEX = 2;   // user2 … user101
const COUNT       = 100;
const PASSWORD    = 'user@123';
// Phones: 9100000002 … 9100000101  (different range from admin script)
const BASE_PHONE  = 9100000002n;

async function login() {
  const res = await axios.post(`${BASE_URL}/auth/login`, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASS,
  });
  return res.data.token;
}

async function createUser(token, index) {
  const email = `user${index}@gmail.com`;
  const phone = String(BASE_PHONE + BigInt(index - START_INDEX));
  const name  = `User ${index}`;

  try {
    await axios.post(
      `${BASE_URL}/admin/users`,
      { name, email, password: PASSWORD, phone, role: 'customer' },
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
  console.log('Logged in. Creating 100 users…\n');

  for (let i = START_INDEX; i < START_INDEX + COUNT; i++) {
    await createUser(token, i);
  }

  console.log('\nDone.');
}

main();
