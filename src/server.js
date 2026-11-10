const express = require('express');
const cors = require('cors');
const path = require('path');
const { PORT, HOST } = require('./config/env');
const { initSchema } = require('./database/schema');
const { requestLogger } = require('./middleware/logger.middleware');
const { errorHandler } = require('./middleware/error.middleware');
const apiRoutes = require('./routes');

const app = express();

// Security & Transport Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Structured Request Logger Middleware
app.use(requestLogger);

// UI / Presentation Static Assets
app.use(express.static(path.join(__dirname, '../public')));

// Mount API Transport Layer
app.use('/api', apiRoutes);

// Central Sanitized Error Handler Middleware
app.use(errorHandler);

// Bootstrap & Initialization
async function startServer() {
  try {
    await initSchema();
    const serverInstance = app.listen(PORT, HOST, () => {
      console.log(`===========================================================`);
      console.log(`  BookWorm Server running in Scalable Layered Architecture `);
      console.log(`  URL: http://${HOST}:${PORT}                             `);
      console.log(`  Bound strictly to localhost (${HOST})                   `);
      console.log(`===========================================================`);
    });
    return serverInstance;
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
