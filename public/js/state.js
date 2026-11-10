/**
 * UI Layer - Client State Store
 * Manages localized user session, cart persistence, active filters, and catalog cache.
 */

class Store {
  constructor() {
    this.state = {
      user: null,
      cart: JSON.parse(localStorage.getItem('bw_cart') || '[]'),
      books: [],
      categories: [],
      activeCategory: 'all',
      searchQuery: '',
      sortBy: 'featured'
    };
    this.listeners = [];
  }

  getState() {
    return this.state;
  }

  setState(partial) {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  notify() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  // Cart helper operations
  addToCart(book) {
    const cart = [...this.state.cart];
    const existing = cart.find((item) => item.book_id === book.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({
        book_id: book.id,
        title: book.title,
        price: book.price,
        cover_image: book.cover_image,
        author: book.author,
        quantity: 1
      });
    }

    this.saveCart(cart);
  }

  updateCartQuantity(bookId, delta) {
    let cart = [...this.state.cart];
    const item = cart.find((i) => i.book_id === bookId);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
      cart = cart.filter((i) => i.book_id !== bookId);
    }

    this.saveCart(cart);
  }

  removeFromCart(bookId) {
    const cart = this.state.cart.filter((i) => i.book_id !== bookId);
    this.saveCart(cart);
  }

  clearCart() {
    this.saveCart([]);
  }

  saveCart(cart) {
    localStorage.setItem('bw_cart', JSON.stringify(cart));
    this.setState({ cart });
  }

  getCartTotals() {
    const totalItems = this.state.cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalCost = this.state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return { totalItems, totalCost: parseFloat(totalCost.toFixed(2)) };
  }
}

// Global Store Instance
window.store = new Store();
