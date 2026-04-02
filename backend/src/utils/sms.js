'use strict';

/**
 * SMS Utility — Fast2SMS (India)
 *
 * Provider: Fast2SMS (fast2sms.com)
 * Cost: ~₹0.20–0.25/SMS | Free ₹50 credits on signup
 * DLT: Register templates on DLT portal before going live
 *      (Jio/Airtel/Vi DLT — mandatory for transactional SMS in India)
 *
 * Routes:
 *   q  = Quick/Transactional (OTP, order alerts) — requires DLT in production
 *   p  = Promotional (offers, marketing)
 */

const axios = require('axios');
const logger = require('./logger');

const FAST2SMS_URL = 'https://www.fast2sms.com/dev/bulkV2';

/**
 * Sanitize Indian phone number → 10 digits
 * Accepts: 9876543210, +919876543210, 919876543210, 09876543210
 */
const sanitizePhone = (phone) => {
  if (!phone) return null;
  const digits = phone.toString().replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 13 && digits.startsWith('091')) return digits.slice(3);
  return null;
};

/**
 * Core send function
 * @param {string|string[]} numbers - phone number(s)
 * @param {string} message - SMS text (max 160 chars per segment)
 * @param {string} route - 'q' (transactional) | 'p' (promotional)
 */
const sendRaw = async (numbers, message, route = 'q') => {
  const apiKey = process.env.FAST2SMS_API_KEY;

  if (!apiKey) {
    logger.warn('FAST2SMS_API_KEY not set — SMS skipped');
    return { skipped: true };
  }

  const phoneList = Array.isArray(numbers) ? numbers : [numbers];
  const sanitized = phoneList.map(sanitizePhone).filter(Boolean);

  if (sanitized.length === 0) {
    logger.warn('SMS skipped: no valid phone numbers');
    return { skipped: true };
  }

  try {
    const response = await axios.get(FAST2SMS_URL, {
      headers: { authorization: apiKey },
      params: {
        route,
        message: message.trim(),
        numbers: sanitized.join(','),
        flash: 0,
      },
      timeout: 8000,
    });

    if (response.data?.return === true) {
      logger.info(`SMS sent to ${sanitized.join(', ')} | Route: ${route}`);
      return { success: true, data: response.data };
    } else {
      logger.error(`SMS API error: ${JSON.stringify(response.data)}`);
      return { success: false, data: response.data };
    }
  } catch (err) {
    logger.error(`SMS send failed: ${err.message}`);
    return { success: false, error: err.message };
  }
};

// ─── SMS Templates ────────────────────────────────────────────────────────────
// Keep messages under 160 chars to avoid multi-part SMS charges.
// Register each template on your DLT portal with Sender ID (e.g., SHPPOO).

const smsTemplates = {
  /**
   * OTP for phone verification on registration
   * DLT Template: "Your Shoppioo verification OTP is {#var#}. Valid for 10 minutes. Do not share."
   */
  phoneVerifyOTP: ({ otp }) =>
    `Your Shoppioo verification OTP is ${otp}. Valid for 10 minutes. Do not share with anyone. -Shoppioo`,

  /**
   * OTP for password reset
   * DLT Template: "Your Shoppioo password reset OTP is {#var#}. Valid 10 min. If not requested ignore."
   */
  passwordResetOTP: ({ otp }) =>
    `Your Shoppioo password reset OTP is ${otp}. Valid for 10 minutes. If you did not request this, ignore. -Shoppioo`,

  /**
   * Welcome SMS after registration
   * DLT Template: "Welcome to Shoppioo, {#var#}! Shop the best deals at shoppioo.in"
   */
  welcome: ({ name }) =>
    `Welcome to Shoppioo, ${name}! Shop the best deals at shoppioo.in. Happy Shopping! -Shoppioo`,

  /**
   * Order placed (COD)
   * DLT Template: "Order {#var#} placed for Rs.{#var#} (COD). Track at shoppioo.in/orders -Shoppioo"
   */
  orderPlacedCOD: ({ orderNumber, totalPrice }) =>
    `Order ${orderNumber} placed for Rs.${totalPrice} (Cash on Delivery). Track at shoppioo.in/orders -Shoppioo`,

  /**
   * Order confirmed after Razorpay payment
   * DLT Template: "Payment of Rs.{#var#} received. Order {#var#} confirmed. Track: shoppioo.in/orders"
   */
  orderConfirmedRazorpay: ({ orderNumber, totalPrice }) =>
    `Payment of Rs.${totalPrice} received! Order ${orderNumber} confirmed. Track: shoppioo.in/orders -Shoppioo`,

  /**
   * Order shipped with tracking
   * DLT Template: "Order {#var#} shipped via Delhivery. AWB: {#var#}. Track: {#var#} -Shoppioo"
   */
  orderShipped: ({ orderNumber, waybill, trackingUrl }) =>
    `Order ${orderNumber} shipped via Delhivery! AWB: ${waybill}. Track: ${trackingUrl || 'shoppioo.in/orders'} -Shoppioo`,

  /**
   * Order delivered
   * DLT Template: "Order {#var#} delivered! Rate your experience at shoppioo.in -Shoppioo"
   */
  orderDelivered: ({ orderNumber }) =>
    `Order ${orderNumber} has been delivered! We hope you love it. Rate your purchase at shoppioo.in/orders -Shoppioo`,

  /**
   * Order cancelled
   * DLT Template: "Order {#var#} cancelled. Refund of Rs.{#var#} will reflect in 5-7 days. -Shoppioo"
   */
  orderCancelled: ({ orderNumber, refundAmount }) =>
    refundAmount > 0
      ? `Order ${orderNumber} cancelled. Refund of Rs.${refundAmount} will be credited in 5-7 business days. -Shoppioo`
      : `Order ${orderNumber} has been cancelled. Visit shoppioo.in for more. -Shoppioo`,

  /**
   * Return request confirmed
   * DLT Template: "Return for Order {#var#} initiated. Pickup in 24-48hrs. Refund after inspection. -Shoppioo"
   */
  returnInitiated: ({ orderNumber }) =>
    `Return for Order ${orderNumber} initiated! Pickup within 24-48 hrs. Refund after quality check. -Shoppioo`,

  /**
   * Refund processed
   * DLT Template: "Refund of Rs.{#var#} for Order {#var#} processed. Reflect in 5-7 days. -Shoppioo"
   */
  refundProcessed: ({ orderNumber, refundAmount }) =>
    `Refund of Rs.${refundAmount} for Order ${orderNumber} has been processed. Expect in 5-7 business days. -Shoppioo`,
};

/**
 * Send a templated SMS
 * @param {string} phone - recipient phone number
 * @param {string} templateKey - key from smsTemplates
 * @param {Object} data - template variables
 * @param {string} route - 'q' (transactional, default) | 'p' (promotional)
 */
const sendSMS = async (phone, templateKey, data = {}, route = 'q') => {
  const templateFn = smsTemplates[templateKey];
  if (!templateFn) {
    logger.error(`SMS template '${templateKey}' not found`);
    return { success: false, error: 'Template not found' };
  }

  const message = templateFn(data);
  return sendRaw(phone, message, route);
};

/**
 * Send a bulk SMS (e.g., promotional campaigns)
 * @param {string[]} phones - array of phone numbers
 * @param {string} message - raw message text
 */
const sendBulkSMS = async (phones, message) => {
  return sendRaw(phones, message, 'p');
};

module.exports = { sendSMS, sendBulkSMS, sanitizePhone, smsTemplates };
