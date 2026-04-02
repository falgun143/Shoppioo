'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');

const MAX_RETRIES = 5;
const RETRY_INTERVAL_MS = 5000;

let retryCount = 0;

const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI;

  if (!mongoURI) {
    logger.error('MONGO_URI is not defined in environment variables');
    process.exit(1);
  }

  const options = {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    heartbeatFrequencyMS: 10000,
    retryWrites: true,
    retryReads: true,
  };

  const attemptConnect = async () => {
    try {
      const conn = await mongoose.connect(mongoURI, options);
      logger.info(
        `MongoDB connected: ${conn.connection.host} (DB: ${conn.connection.name}) [Worker ${process.pid}]`
      );
      retryCount = 0;
      return conn;
    } catch (error) {
      retryCount++;
      logger.error(
        `MongoDB connection failed (attempt ${retryCount}/${MAX_RETRIES}): ${error.message}`
      );

      if (retryCount < MAX_RETRIES) {
        logger.info(`Retrying connection in ${RETRY_INTERVAL_MS / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL_MS));
        return attemptConnect();
      } else {
        logger.error('Max MongoDB connection retries reached. Exiting.');
        process.exit(1);
      }
    }
  };

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected. Attempting to reconnect...');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected successfully');
  });

  mongoose.connection.on('error', (err) => {
    logger.error(`MongoDB connection error: ${err.message}`);
  });

  process.on('SIGINT', async () => {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed due to app termination');
    process.exit(0);
  });

  return attemptConnect();
};

module.exports = connectDB;
