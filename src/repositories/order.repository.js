const { query } = require('../database/connection');

class OrderRepository {
  async createOrder({ user_id, total_items, total_cost, shipping_address, payment_method, status = 'CONFIRMED' }) {
    const result = await query.run(
      `INSERT INTO orders (user_id, total_items, total_cost, shipping_address, payment_method, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user_id, total_items, total_cost, shipping_address, payment_method, status]
    );
    return result.lastID;
  }

  async createOrderItem({ order_id, book_id, quantity, unit_price }) {
    return query.run(
      `INSERT INTO order_items (order_id, book_id, quantity, unit_price)
       VALUES (?, ?, ?, ?)`,
      [order_id, book_id, quantity, unit_price]
    );
  }

  async findOrdersByUserId(userId) {
    const orders = await query.all(
      `SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );

    for (const order of orders) {
      order.items = await query.all(
        `SELECT oi.*, b.title, b.cover_image
         FROM order_items oi
         JOIN books b ON oi.book_id = b.id
         WHERE oi.order_id = ?`,
        [order.id]
      );
    }

    return orders;
  }

  async findOrderById(orderId) {
    const order = await query.get(`SELECT * FROM orders WHERE id = ?`, [orderId]);
    if (!order) return null;

    order.items = await query.all(
      `SELECT oi.*, b.title, b.cover_image
       FROM order_items oi
       JOIN books b ON oi.book_id = b.id
       WHERE oi.order_id = ?`,
      [order.id]
    );
    return order;
  }
}

module.exports = new OrderRepository();
