const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const config = {
  PORT: parseInt(process.env.PORT, 10) || 3000,
  // Security rule: Exclusively bind to localhost (127.0.0.1)
  HOST: '127.0.0.1',
  JWT_SECRET: process.env.JWT_SECRET || 'bookworm-secret-demo-key-2026',
  JWT_EXPIRES_IN: '12h',
  DB_PATH: path.join(__dirname, '../../database.sqlite')
};

module.exports = config;
