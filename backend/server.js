'use strict';

require('dotenv').config();

const logger = require('./src/utils/logger');
const app = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    const server = app.listen(PORT, () => {
      logger.info(`Server started on port ${PORT}`);
    });

    process.on('unhandledRejection', (err) => {
      logger.error(`Unhandled Rejection: ${err.message}`);
      server.close(() => process.exit(1));
    });

    process.on('uncaughtException', (err) => {
      logger.error(`Uncaught Exception: ${err.message}`);
      server.close(() => process.exit(1));
    });

    process.on('SIGTERM', () => server.close(() => process.exit(0)));
  })
  .catch((err) => {
    logger.error(`Failed to connect to DB: ${err.message}`);
    process.exit(1);
  });
