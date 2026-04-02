'use strict';

const axios = require('axios');
const ErrorResponse = require('../utils/errorResponse');
const Order = require('../models/Order');
const logger = require('../utils/logger');

const EXPRESS_SHIPPING_CHARGE = 99;

// @desc    Calculate shipping charges
// @route   POST /api/v1/shipping/calculate
// @access  Public
exports.calculateShipping = async (req, res, next) => {
  try {
    const { pincode, weight = 500, orderAmount = 0 } = req.body;

    if (!pincode || !/^\d{6}$/.test(pincode)) {
      return next(new ErrorResponse('Valid 6-digit pincode is required.', 400));
    }

    // Try Delhivery API for serviceability check
    let delhiveryData = null;
    const delhiveryToken = process.env.DELHIVERY_TOKEN;
    const delhiveryBaseUrl = process.env.DELHIVERY_BASE_URL || 'https://track.delhivery.com';

    if (delhiveryToken) {
      try {
        const response = await axios.get(
          `${delhiveryBaseUrl}/c/api/pin-codes/json/?filter_codes=${pincode}`,
          {
            headers: {
              Authorization: `Token ${delhiveryToken}`,
              'Content-Type': 'application/json',
            },
            timeout: 5000,
          }
        );

        if (response.data && response.data.delivery_codes && response.data.delivery_codes.length > 0) {
          const pincodeData = response.data.delivery_codes[0];
          delhiveryData = {
            serviceable: pincodeData.postal_code?.cod === 'Y' || pincodeData.postal_code?.pre_paid === 'Y',
            cod: pincodeData.postal_code?.cod === 'Y',
            prepaid: pincodeData.postal_code?.pre_paid === 'Y',
            city: pincodeData.postal_code?.city,
            state: pincodeData.postal_code?.state_code,
          };
        }
      } catch (err) {
        logger.warn(`Delhivery API check failed for pincode ${pincode}: ${err.message}`);
        // Fall through to default calculation
      }
    }

    // Determine if serviceable
    const isServiceable = delhiveryData ? delhiveryData.serviceable : true; // Assume serviceable if API fails

    if (!isServiceable) {
      return res.status(200).json({
        success: true,
        serviceable: false,
        message: 'Delivery is not available at this pincode. Please try a different address.',
        pincode,
      });
    }

    // Calculate shipping charges
    const orderAmt = Number(orderAmount);
    let standardShipping = 0;
    const expressShipping = EXPRESS_SHIPPING_CHARGE;
    const codAvailable = delhiveryData ? delhiveryData.cod : true;

    // Weight-based surcharge (for heavy items > 5kg)
    const weightKg = weight / 1000;
    if (weightKg > 5) {
      const extraWeight = Math.ceil(weightKg - 5);
      standardShipping += extraWeight * 20; // ₹20 per extra kg
    }

    res.status(200).json({
      success: true,
      serviceable: true,
      pincode,
      city: delhiveryData?.city,
      state: delhiveryData?.state,
      codAvailable,
      shippingOptions: [
        {
          id: 'standard',
          name: 'Standard Delivery',
          charge: standardShipping,
          estimatedDays: '4-7 business days',
          free: standardShipping === 0,
        },
        {
          id: 'express',
          name: 'Express Delivery',
          charge: expressShipping,
          estimatedDays: '1-3 business days',
          free: false,
        },
      ],
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create shipment on Delhivery
// @route   POST /api/v1/shipping/create
// @access  Private (Admin)
exports.createShipment = async (req, res, next) => {
  try {
    const { orderId, pickupLocation = 'Primary' } = req.body;

    if (!orderId) {
      return next(new ErrorResponse('Order ID is required.', 400));
    }

    const order = await Order.findById(orderId).populate('user', 'name email phone');
    if (!order) {
      return next(new ErrorResponse('Order not found.', 404));
    }

    if (!['confirmed', 'processing'].includes(order.orderStatus)) {
      return next(
        new ErrorResponse('Shipment can only be created for confirmed or processing orders.', 400)
      );
    }

    const delhiveryToken = process.env.DELHIVERY_TOKEN;
    const delhiveryBaseUrl = process.env.DELHIVERY_BASE_URL || 'https://track.delhivery.com';

    if (!delhiveryToken) {
      return next(new ErrorResponse('Delhivery API token not configured.', 500));
    }

    // Prepare shipment data for Delhivery
    const shipmentData = {
      format: 'json',
      data: JSON.stringify({
        shipments: [
          {
            name: order.shippingAddress.name,
            add: `${order.shippingAddress.addressLine1} ${order.shippingAddress.addressLine2 || ''}`.trim(),
            city: order.shippingAddress.city,
            state: order.shippingAddress.state,
            country: order.shippingAddress.country || 'India',
            pin: order.shippingAddress.pincode,
            phone: order.shippingAddress.phone,
            order: order.orderNumber,
            payment_mode: order.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
            cod_amount: order.paymentMethod === 'cod' ? order.totalPrice.toString() : '0',
            total_amount: order.totalPrice.toString(),
            quantity: order.items.reduce((sum, item) => sum + item.quantity, 0).toString(),
            weight: '500', // default 500g, should come from product
            products_desc: order.items.map((i) => i.name).join(', ').substring(0, 200),
            seller_name: 'Shoppioo',
            seller_add: 'Shoppioo Warehouse, India',
            seller_inv: order.orderNumber,
            shipment_dimensions: { length: 10, breadth: 10, height: 10 },
          },
        ],
        pickup_location: { name: pickupLocation },
      }),
    };

    const response = await axios.post(
      `${delhiveryBaseUrl}/api/cmu/create.json`,
      new URLSearchParams(shipmentData).toString(),
      {
        headers: {
          Authorization: `Token ${delhiveryToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000,
      }
    );

    const result = response.data;

    if (result.packages && result.packages.length > 0 && result.packages[0].waybill) {
      const waybill = result.packages[0].waybill;
      const trackingUrl = `https://www.delhivery.com/track/package/${waybill}`;

      // Update order with waybill
      order.delhiveryWaybill = waybill;
      order.trackingUrl = trackingUrl;
      order.orderStatus = 'shipped';
      order.statusHistory.push({
        status: 'shipped',
        timestamp: new Date(),
        message: `Shipment created with waybill: ${waybill}`,
        updatedBy: req.user._id,
      });
      await order.save();

      logger.info(`Shipment created for order ${order.orderNumber}: waybill ${waybill}`);

      res.status(200).json({
        success: true,
        message: 'Shipment created successfully.',
        waybill,
        trackingUrl,
        delhiveryResponse: result,
      });
    } else {
      logger.error(`Delhivery shipment creation failed: ${JSON.stringify(result)}`);
      return next(
        new ErrorResponse(
          `Failed to create shipment: ${result.rmk || result.error || 'Unknown error from Delhivery'}`,
          500
        )
      );
    }
  } catch (error) {
    if (error.response) {
      logger.error(`Delhivery API error: ${JSON.stringify(error.response.data)}`);
      return next(new ErrorResponse('Delhivery API error. Please check logs.', 502));
    }
    next(error);
  }
};

// @desc    Track shipment by waybill
// @route   GET /api/v1/shipping/track/:waybill
// @access  Public
exports.trackShipment = async (req, res, next) => {
  try {
    const { waybill } = req.params;

    if (!waybill || waybill.trim().length < 5) {
      return next(new ErrorResponse('Valid waybill number is required.', 400));
    }

    const delhiveryToken = process.env.DELHIVERY_TOKEN;
    const delhiveryBaseUrl = process.env.DELHIVERY_BASE_URL || 'https://track.delhivery.com';

    if (!delhiveryToken) {
      // Return basic info from order if Delhivery not configured
      const order = await Order.findOne({ delhiveryWaybill: waybill })
        .select('orderNumber orderStatus statusHistory trackingUrl estimatedDelivery')
        .populate('user', 'name');

      if (!order) {
        return next(new ErrorResponse('Shipment not found.', 404));
      }

      return res.status(200).json({
        success: true,
        waybill,
        trackingUrl: order.trackingUrl,
        status: order.orderStatus,
        statusHistory: order.statusHistory,
        message: 'Delhivery tracking not configured. Showing order status.',
      });
    }

    // Fetch from Delhivery API
    const response = await axios.get(
      `${delhiveryBaseUrl}/api/v1/packages/json/?waybill=${waybill}&verbose=1`,
      {
        headers: {
          Authorization: `Token ${delhiveryToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 8000,
      }
    );

    const data = response.data;

    if (!data || !data.ShipmentData || data.ShipmentData.length === 0) {
      return next(new ErrorResponse('No tracking data found for this waybill.', 404));
    }

    const shipment = data.ShipmentData[0].Shipment;

    res.status(200).json({
      success: true,
      waybill,
      trackingUrl: `https://www.delhivery.com/track/package/${waybill}`,
      shipment: {
        status: shipment.Status?.Status,
        statusDetail: shipment.Status?.Instructions,
        currentLocation: shipment.Status?.PickUpLocation,
        expectedDelivery: shipment.expectedDate,
        consigneeName: shipment.Consignee?.Name,
        destination: shipment.Destination,
        origin: shipment.Origin,
        trackingHistory: (shipment.Scans || []).map((scan) => ({
          status: scan.ScanDetail?.Scan,
          location: scan.ScanDetail?.ScannedLocation,
          timestamp: scan.ScanDetail?.ScanDateTime,
          instruction: scan.ScanDetail?.Instructions,
        })),
      },
    });
  } catch (error) {
    if (error.response) {
      logger.error(`Delhivery tracking error: ${JSON.stringify(error.response.data)}`);
      return next(new ErrorResponse('Failed to fetch tracking data from Delhivery.', 502));
    }
    next(error);
  }
};
