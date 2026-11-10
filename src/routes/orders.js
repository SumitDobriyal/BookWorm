const express = require('express');
const { query } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/orders/checkout
 * Processes order checkout, saves to SQL database, updates stock, and confirms order
 */
router.post('/checkout', authenticateToken, async (req, res, next) => {
  try {
    const { items, shipping_address, payment_method } = req.body;
    const userId = req.user.id;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Checkout requires at least one item in the cart' });
    }

    if (!shipping_address || shipping_address.trim().length < 5) {
      return res.status(400).json({ error: 'A valid shipping address is required' });
    }

    if (!payment_method) {
      return res.status(400).json({ error: 'Payment method is required' });
    }

    let calculatedTotalCost = 0;
    let calculatedTotalItems = 0;
    const verifiedItems = [];

    // Verify all items and pricing against SQL database to prevent client manipulation
    for (const item of items) {
      const book = await query.get(`SELECT id, title, price, stock_quantity FROM books WHERE id = ?`, [item.book_id]);
      if (!book) {
        return res.status(400).json({ error: `Book ID ${item.book_id} is no longer available in repository` });
      }

      const qty = parseInt(item.quantity, 10);
      if (qty <= 0) {
        return res.status(400).json({ error: `Invalid quantity for book "${book.title}"` });
      }

      if (book.stock_quantity < qty) {
        return res.status(400).json({
          error: `Insufficient stock for "${book.title}". Available: ${book.stock_quantity}, Requested: ${qty}`
        });
      }

      calculatedTotalItems += qty;
      calculatedTotalCost += book.price * qty;
      verifiedItems.push({
        book_id: book.id,
        title: book.title,
        quantity: qty,
        unit_price: book.price
      });
    }

    // Insert order record
    const orderResult = await query.run(
      `INSERT INTO orders (user_id, total_items, total_cost, shipping_address, payment_method, status)
       VALUES (?, ?, ?, ?, ?, 'CONFIRMED')`,
      [userId, calculatedTotalItems, parseFloat(calculatedTotalCost.toFixed(2)), shipping_address.trim(), payment_method]
    );

    const orderId = orderResult.lastID;

    // Insert order items and deduct stock
    for (const item of verifiedItems) {
      await query.run(
        `INSERT INTO order_items (order_id, book_id, quantity, unit_price) VALUES (?, ?, ?, ?)`,
        [orderId, item.book_id, item.quantity, item.unit_price]
      );

      await query.run(
        `UPDATE books SET stock_quantity = stock_quantity - ? WHERE id = ?`,
        [item.quantity, item.book_id]
      );
    }

    res.status(201).json({
      success: true,
      message: 'Order placed successfully! Thank you for your purchase.',
      order: {
        id: orderId,
        order_number: `ORD-${String(orderId).padStart(6, '0')}`,
        customer_name: req.user.full_name,
        customer_email: req.user.email,
        total_items: calculatedTotalItems,
        total_cost: parseFloat(calculatedTotalCost.toFixed(2)),
        shipping_address: shipping_address.trim(),
        payment_method,
        items: verifiedItems,
        status: 'CONFIRMED',
        created_at: new Date().toISOString()
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/orders/my-orders
 * Retrieves orders for the logged-in customer
 */
router.get('/my-orders', authenticateToken, async (req, res, next) => {
  try {
    const orders = await query.all(
      `SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`,
      [req.user.id]
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

    res.json({ orders });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
