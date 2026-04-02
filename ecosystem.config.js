// PM2 Production Config
// Usage: pm2 start ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'shoppioo-backend',
      script: './backend/server.js',
      cwd: '/var/www/shoppioo',
      instances: 'max',       // use all CPU cores
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '500M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      error_file: './backend/logs/pm2-error.log',
      out_file: './backend/logs/pm2-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
