'use strict';

const nodemailer = require('nodemailer');
const logger = require('./logger');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: parseInt(process.env.SMTP_PORT, 10) === 465,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateLimit: 10,
  });
};

const getBaseTemplate = (content, previewText = '') => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <title>Shoppioo</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f4; color: #333333; }
    .wrapper { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #ff6b35, #f7c59f); padding: 30px 40px; text-align: center; }
    .header h1 { color: #ffffff; font-size: 28px; font-weight: 800; letter-spacing: 2px; }
    .header p { color: rgba(255,255,255,0.9); font-size: 13px; margin-top: 4px; }
    .body { padding: 40px; }
    .body h2 { color: #ff6b35; font-size: 22px; margin-bottom: 16px; }
    .body p { font-size: 15px; line-height: 1.7; color: #555; margin-bottom: 12px; }
    .btn { display: inline-block; background: #ff6b35; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px; margin: 16px 0; }
    .otp-box { background: #fff3ee; border: 2px dashed #ff6b35; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; }
    .otp-box .otp { font-size: 40px; font-weight: 800; color: #ff6b35; letter-spacing: 8px; }
    .otp-box p { font-size: 13px; color: #888; margin-top: 8px; }
    .order-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .order-table th { background: #ff6b35; color: #fff; padding: 10px 14px; text-align: left; font-size: 13px; }
    .order-table td { padding: 10px 14px; border-bottom: 1px solid #eee; font-size: 14px; color: #444; }
    .order-table tr:last-child td { border-bottom: none; }
    .summary-box { background: #f9f9f9; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .summary-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: #555; }
    .summary-row.total { font-size: 16px; font-weight: 700; color: #333; border-top: 1px solid #ddd; padding-top: 12px; margin-top: 6px; }
    .tracking-box { background: #e8f5e9; border-left: 4px solid #4caf50; border-radius: 0 8px 8px 0; padding: 16px 20px; margin: 20px 0; }
    .tracking-box p { color: #2e7d32; font-weight: 600; }
    .tracking-box span { font-family: monospace; font-size: 16px; color: #1b5e20; }
    .alert-box { background: #fff8e1; border-left: 4px solid #ffc107; border-radius: 0 8px 8px 0; padding: 16px 20px; margin: 20px 0; }
    .footer { background: #1a1a2e; color: #aaa; padding: 30px 40px; text-align: center; }
    .footer a { color: #ff6b35; text-decoration: none; }
    .footer p { font-size: 12px; margin-top: 8px; }
    .social-links { margin: 12px 0; }
    .social-links a { color: #aaa; text-decoration: none; margin: 0 8px; font-size: 12px; }
    .divider { height: 1px; background: #eee; margin: 24px 0; }
  </style>
</head>
<body>
  ${previewText ? `<div style="display:none;max-height:0;overflow:hidden;">${previewText}</div>` : ''}
  <div class="wrapper">
    <div class="header">
      <h1>SHOPPIOO</h1>
      <p>Your Premium Shopping Destination</p>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Shoppioo. All rights reserved.</p>
      <div class="social-links">
        <a href="${process.env.FRONTEND_URL || 'https://shoppioo.in'}">Website</a>
        <a href="mailto:support@shoppioo.in">Support</a>
      </div>
      <p style="font-size:11px; color:#666; margin-top:10px;">
        You received this email because you have an account with Shoppioo.<br/>
        <a href="${process.env.FRONTEND_URL || 'https://shoppioo.in'}/unsubscribe">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

const templates = {
  welcome: (data) => ({
    subject: `Welcome to Shoppioo, ${data.name}! 🎉`,
    html: getBaseTemplate(
      `
      <h2>Welcome aboard, ${data.name}!</h2>
      <p>We're thrilled to have you join the Shoppioo family. You now have access to thousands of premium products delivered right to your doorstep.</p>
      <p>Here's what you can do:</p>
      <ul style="padding-left:20px; color:#555; font-size:15px; line-height:2;">
        <li>Browse thousands of curated products</li>
        <li>Get exclusive member-only deals</li>
        <li>Track your orders in real-time</li>
        <li>Easy returns and refunds</li>
      </ul>
      <div style="text-align:center; margin:28px 0;">
        <a href="${process.env.FRONTEND_URL || 'https://shoppioo.in'}" class="btn">Start Shopping</a>
      </div>
      <div class="divider"></div>
      <p style="font-size:13px; color:#888;">If you didn't create this account, please <a href="mailto:support@shoppioo.in" style="color:#ff6b35;">contact us</a> immediately.</p>
      `,
      `Welcome to Shoppioo, ${data.name}!`
    ),
  }),

  orderConfirmation: (data) => ({
    subject: `Order Confirmed! #${data.orderNumber} – Shoppioo`,
    html: getBaseTemplate(
      `
      <h2>Your Order is Confirmed! ✅</h2>
      <p>Hi ${data.name}, thank you for your order. We've received it and are getting it ready for you.</p>
      <div class="alert-box">
        <p style="color:#f57f17; margin:0;">Order Number: <strong>${data.orderNumber}</strong></p>
        <p style="color:#888; font-size:13px; margin-top:4px;">Placed on ${new Date(data.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>
      <table class="order-table">
        <thead>
          <tr><th>Product</th><th>Qty</th><th>Price</th></tr>
        </thead>
        <tbody>
          ${data.items
            .map(
              (item) => `
            <tr>
              <td>${item.name}</td>
              <td>${item.quantity}</td>
              <td>₹${item.price.toLocaleString('en-IN')}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
      <div class="summary-box">
        <div class="summary-row"><span>Subtotal</span><span>₹${data.itemsPrice.toLocaleString('en-IN')}</span></div>
        <div class="summary-row"><span>Shipping</span><span>${data.shippingPrice === 0 ? 'FREE' : '₹' + data.shippingPrice.toLocaleString('en-IN')}</span></div>
        <div class="summary-row"><span>Tax (GST)</span><span>₹${data.taxPrice.toLocaleString('en-IN')}</span></div>
        ${data.discount > 0 ? `<div class="summary-row"><span>Discount</span><span style="color:#4caf50;">-₹${data.discount.toLocaleString('en-IN')}</span></div>` : ''}
        <div class="summary-row total"><span>Total</span><span>₹${data.totalPrice.toLocaleString('en-IN')}</span></div>
      </div>
      <p><strong>Shipping to:</strong><br/>${data.shippingAddress.name}<br/>${data.shippingAddress.addressLine1}, ${data.shippingAddress.city}, ${data.shippingAddress.state} - ${data.shippingAddress.pincode}</p>
      <p><strong>Payment Method:</strong> ${data.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment (Razorpay)'}</p>
      <div style="text-align:center; margin:28px 0;">
        <a href="${process.env.FRONTEND_URL || 'https://shoppioo.in'}/orders/${data.orderId}" class="btn">Track Your Order</a>
      </div>
      `,
      `Order #${data.orderNumber} confirmed!`
    ),
  }),

  passwordResetOTP: (data) => ({
    subject: `Password Reset OTP – Shoppioo`,
    html: getBaseTemplate(
      `
      <h2>Reset Your Password</h2>
      <p>Hi ${data.name}, you requested a password reset for your Shoppioo account. Use the OTP below to reset your password.</p>
      <div class="otp-box">
        <p style="color:#888; font-size:13px; margin-bottom:10px;">Your One-Time Password</p>
        <div class="otp">${data.otp}</div>
        <p>This OTP is valid for <strong>10 minutes</strong> only.</p>
      </div>
      <div class="alert-box">
        <p style="color:#e65100; margin:0; font-size:13px;">⚠️ Never share this OTP with anyone. Shoppioo will never ask for your OTP.</p>
      </div>
      <p>If you didn't request a password reset, please ignore this email or <a href="mailto:support@shoppioo.in" style="color:#ff6b35;">contact us</a> if you're concerned.</p>
      `,
      'Your Shoppioo password reset OTP'
    ),
  }),

  orderShipped: (data) => ({
    subject: `Your Order #${data.orderNumber} is On the Way! 🚚`,
    html: getBaseTemplate(
      `
      <h2>Your Order is Shipped! 🚚</h2>
      <p>Hi ${data.name}, great news! Your order <strong>#${data.orderNumber}</strong> has been shipped and is on its way to you.</p>
      <div class="tracking-box">
        <p>Tracking Number (Delhivery)</p>
        <span>${data.waybill}</span>
      </div>
      <div style="text-align:center; margin:28px 0;">
        <a href="${data.trackingUrl || (process.env.FRONTEND_URL + '/track/' + data.waybill)}" class="btn">Track Shipment</a>
      </div>
      <p>Estimated delivery: <strong>${data.estimatedDelivery || '3–5 business days'}</strong></p>
      <div class="divider"></div>
      <p style="font-size:13px; color:#888;">Shipping to: ${data.shippingAddress.name}, ${data.shippingAddress.city}, ${data.shippingAddress.state}</p>
      `,
      `Your order #${data.orderNumber} is on the way!`
    ),
  }),

  orderDelivered: (data) => ({
    subject: `Your Order #${data.orderNumber} has been Delivered! 🎁`,
    html: getBaseTemplate(
      `
      <h2>Your Order has been Delivered! 🎁</h2>
      <p>Hi ${data.name}, your order <strong>#${data.orderNumber}</strong> has been successfully delivered. We hope you love your purchase!</p>
      <div class="tracking-box">
        <p style="margin-bottom:4px;">Delivered on</p>
        <span>${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
      </div>
      <p>We'd love to hear your feedback! Leave a review for the products you purchased and help other shoppers make great decisions.</p>
      <div style="text-align:center; margin:28px 0;">
        <a href="${process.env.FRONTEND_URL || 'https://shoppioo.in'}/orders/${data.orderId}" class="btn">Write a Review</a>
      </div>
      <p style="font-size:13px; color:#888;">If you have any issues with your delivery, please <a href="mailto:support@shoppioo.in" style="color:#ff6b35;">contact our support team</a> within 7 days.</p>
      `,
      `Your order #${data.orderNumber} has been delivered!`
    ),
  }),

  orderCancelled: (data) => ({
    subject: `Order #${data.orderNumber} Cancelled – Shoppioo`,
    html: getBaseTemplate(
      `
      <h2>Order Cancelled</h2>
      <p>Hi ${data.name}, your order <strong>#${data.orderNumber}</strong> has been cancelled as requested.</p>
      ${
        data.refundAmount > 0
          ? `
        <div class="tracking-box">
          <p>Refund of ₹${data.refundAmount.toLocaleString('en-IN')} will be credited to your original payment method within 5–7 business days.</p>
        </div>
      `
          : ''
      }
      <p>Reason: ${data.reason || 'Cancelled by customer'}</p>
      <div style="text-align:center; margin:28px 0;">
        <a href="${process.env.FRONTEND_URL || 'https://shoppioo.in'}/products" class="btn">Continue Shopping</a>
      </div>
      `,
      `Order #${data.orderNumber} cancelled`
    ),
  }),
};

/**
 * Send an email using Nodemailer
 * @param {Object} options - { to, subject, html, template, templateData }
 */
const sendEmail = async (options) => {
  const transporter = createTransporter();

  let subject = options.subject;
  let html = options.html;

  if (options.template && templates[options.template]) {
    const compiled = templates[options.template](options.templateData || {});
    subject = compiled.subject;
    html = compiled.html;
  }

  const mailOptions = {
    from: `"${process.env.FROM_NAME || 'Shoppioo'}" <${process.env.FROM_EMAIL || 'noreply@shoppioo.in'}>`,
    to: options.to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent to ${options.to}: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Email send failed to ${options.to}: ${error.message}`);
    throw error;
  } finally {
    transporter.close();
  }
};

module.exports = { sendEmail, templates };
