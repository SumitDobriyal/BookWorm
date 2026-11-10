const express = require('express');
const authRoutes = require('./auth.routes');
const bookRoutes = require('./book.routes');
const categoryRoutes = require('./category.routes');
const orderRoutes = require('./order.routes');
const adminRoutes = require('./admin.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/books', bookRoutes);
router.use('/categories', categoryRoutes);
router.use('/orders', orderRoutes);
router.use('/admin', adminRoutes);

router.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'BookWorm eCommerce API (Layered Architecture)'
  });
});

module.exports = router;
