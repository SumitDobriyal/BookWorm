const express = require('express');
const orderController = require('../controllers/order.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/checkout', authenticateToken, (req, res, next) => orderController.checkout(req, res, next));
router.get('/my-orders', authenticateToken, (req, res, next) => orderController.getMyOrders(req, res, next));

module.exports = router;
