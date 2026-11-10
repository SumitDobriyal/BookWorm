/**
 * UI Layer - API Client Gateway
 * Encapsulates network communication, JSON serialization, and Auth token headers.
 */

const API_BASE_URL = '/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('bw_token') || null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('bw_token', token);
    } else {
      localStorage.removeItem('bw_token');
    }
  }

  getHeaders(isJson = true) {
    const headers = {};
    if (isJson) {
      headers['Content-Type'] = 'application/json';
    }
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const isJson = options.body && typeof options.body === 'object' && !(options.body instanceof FormData);

    const config = {
      ...options,
      headers: {
        ...this.getHeaders(isJson),
        ...options.headers
      }
    };

    if (isJson) {
      config.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.error || 'API Request failed');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  // Auth Endpoints
  login(email, password) {
    return this.request('/auth/login', { method: 'POST', body: { email, password } });
  }

  register({ full_name, email, password, role, bio }) {
    return this.request('/auth/register', { method: 'POST', body: { full_name, email, password, role, bio } });
  }

  getMe() {
    return this.request('/auth/me', { method: 'GET' });
  }

  getDemoUsers() {
    return this.request('/auth/demo-users', { method: 'GET' });
  }

  // Categories Endpoints
  getCategories() {
    return this.request('/categories', { method: 'GET' });
  }

  // Books Endpoints
  getBooks({ category, search, sort }) {
    const params = new URLSearchParams();
    if (category && category !== 'all') params.append('category', category);
    if (search) params.append('search', search);
    if (sort) params.append('sort', sort);

    return this.request(`/books?${params.toString()}`, { method: 'GET' });
  }

  getBookById(id) {
    return this.request(`/books/${id}`, { method: 'GET' });
  }

  createBook(bookData) {
    return this.request('/books', { method: 'POST', body: bookData });
  }

  updateBook(id, bookData) {
    return this.request(`/books/${id}`, { method: 'PUT', body: bookData });
  }

  deleteBook(id) {
    return this.request(`/books/${id}`, { method: 'DELETE' });
  }

  rateBook(id, rating) {
    return this.request(`/books/${id}/rate`, { method: 'POST', body: { rating } });
  }

  // Orders Endpoints
  checkout({ items, shipping_address, payment_method }) {
    return this.request('/orders/checkout', {
      method: 'POST',
      body: { items, shipping_address, payment_method }
    });
  }

  getMyOrders() {
    return this.request('/orders/my-orders', { method: 'GET' });
  }

  // Admin Endpoints
  getAuthors() {
    return this.request('/admin/authors', { method: 'GET' });
  }

  approveAuthor(authorId) {
    return this.request(`/admin/authors/${authorId}/approve`, { method: 'POST' });
  }

  rejectAuthor(authorId) {
    return this.request(`/admin/authors/${authorId}/reject`, { method: 'POST' });
  }

  createAuthor(authorData) {
    return this.request('/admin/authors', { method: 'POST', body: authorData });
  }

  updateAuthor(authorId, authorData) {
    return this.request(`/admin/authors/${authorId}`, { method: 'PUT', body: authorData });
  }

  removeAuthor(authorId) {
    return this.request(`/admin/authors/${authorId}`, { method: 'DELETE' });
  }
}

// Global API Client Instance
window.api = new ApiClient();
