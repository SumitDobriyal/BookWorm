const orderService = require('../services/order.service');

class OrderController {
  async checkout(req, res, next) {
    try {
      const result = await orderService.checkout(req.user, req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getMyOrders(req, res, next) {
    try {
      const orders = await orderService.getUserOrders(req.user.id);
      res.json({ orders });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new OrderController();
