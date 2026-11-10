const orderRepository = require('../repositories/order.repository');
const bookRepository = require('../repositories/book.repository');
const { ROLES } = require('../config/constants');

class OrderService {
  async checkout(currentUser, { items, shipping_address, payment_method }) {
    // Super Admin purchase restriction policy
    if (currentUser && currentUser.role === ROLES.SUPERADMIN) {
      const err = new Error('Super Admin accounts are for platform governance and management only, and cannot purchase books. Please sign in with a Customer account to place orders.');
      err.status = 403;
      throw err;
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      const err = new Error('Checkout requires at least one item in the cart');
      err.status = 400;
      throw err;
    }

    if (!shipping_address || shipping_address.trim().length < 5) {
      const err = new Error('A valid shipping address is required (minimum 5 characters)');
      err.status = 400;
      throw err;
    }

    if (!payment_method) {
      const err = new Error('Payment method is required');
      err.status = 400;
      throw err;
    }

    let calculatedTotalCost = 0;
    let calculatedTotalItems = 0;
    const verifiedItems = [];

    // Verify all books and inventory strictly against SQL database
    for (const item of items) {
      const book = await bookRepository.findById(item.book_id);
      if (!book) {
        const err = new Error(`Book ID ${item.book_id} is no longer available in repository`);
        err.status = 400;
        throw err;
      }

      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        const err = new Error(`Invalid quantity for book "${book.title}"`);
        err.status = 400;
        throw err;
      }

      if (book.stock_quantity < qty) {
        const err = new Error(`Insufficient stock for "${book.title}". Available: ${book.stock_quantity}, Requested: ${qty}`);
        err.status = 400;
        throw err;
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

    const totalCost = parseFloat(calculatedTotalCost.toFixed(2));

    const orderId = await orderRepository.createOrder({
      user_id: currentUser.id,
      total_items: calculatedTotalItems,
      total_cost: totalCost,
      shipping_address: shipping_address.trim(),
      payment_method,
      status: 'CONFIRMED'
    });

    for (const item of verifiedItems) {
      await orderRepository.createOrderItem({
        order_id: orderId,
        book_id: item.book_id,
        quantity: item.quantity,
        unit_price: item.unit_price
      });

      await bookRepository.deductStock(item.book_id, item.quantity);
    }

    return {
      success: true,
      message: 'Order placed successfully! Thank you for your purchase.',
      order: {
        id: orderId,
        order_number: `ORD-${String(orderId).padStart(6, '0')}`,
        customer_name: currentUser.full_name,
        customer_email: currentUser.email,
        total_items: calculatedTotalItems,
        total_cost: totalCost,
        shipping_address: shipping_address.trim(),
        payment_method,
        items: verifiedItems,
        status: 'CONFIRMED',
        created_at: new Date().toISOString()
      }
    };
  }

  async getUserOrders(userId) {
    return orderRepository.findOrdersByUserId(userId);
  }
}

module.exports = new OrderService();
