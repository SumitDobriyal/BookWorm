/**
 * UI Layer - Presentation Controller & View Binder
 * Coordinates state changes, API calls, modal dialogs, and DOM updates.
 */

document.addEventListener('DOMContentLoaded', async () => {
  initIcons();
  setupEventListeners();

  // Subscribe UI components to Store changes
  window.store.subscribe((state) => {
    renderCartBadge(state.cart);
  });

  await checkAuth();
  await loadCategories();
  await loadBooks();
  updateCartDrawerUI();
});

function initIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// ======================= EVENT LISTENERS =======================

function setupEventListeners() {
  // Brand Logo Click -> Reset filters & scroll top
  document.getElementById('brand-logo').addEventListener('click', () => {
    resetFilters();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Hero Buttons
  document.getElementById('explore-books-btn').addEventListener('click', () => {
    document.querySelector('.store-container').scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('quick-demo-accounts-btn').addEventListener('click', () => {
    openAuthModal('login');
  });

  // Search input & debounce
  const searchInput = document.getElementById('search-input');
  const searchClearBtn = document.getElementById('search-clear-btn');

  let debounceTimer;
  searchInput.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    if (val.length > 0) {
      searchClearBtn.classList.remove('hidden');
    } else {
      searchClearBtn.classList.add('hidden');
    }
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      window.store.setState({ searchQuery: val });
      loadBooks();
    }, 300);
  });

  searchClearBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchClearBtn.classList.add('hidden');
    window.store.setState({ searchQuery: '' });
    loadBooks();
  });

  // Sort dropdown
  document.getElementById('sort-select').addEventListener('change', (e) => {
    window.store.setState({ sortBy: e.target.value });
    loadBooks();
  });

  // Reset filter button in empty state
  document.getElementById('reset-filter-btn').addEventListener('click', resetFilters);

  // Cart Drawer Triggers
  document.getElementById('cart-btn').addEventListener('click', openCartDrawer);
  document.getElementById('close-cart-btn').addEventListener('click', closeCartDrawer);
  document.getElementById('cart-shop-now-btn').addEventListener('click', closeCartDrawer);
  document.getElementById('cart-drawer-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'cart-drawer-overlay') closeCartDrawer();
  });

  // Checkout Triggers
  document.getElementById('proceed-to-checkout-btn').addEventListener('click', handleProceedToCheckout);
  document.getElementById('close-checkout-btn').addEventListener('click', closeCheckoutModal);
  document.getElementById('checkout-modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'checkout-modal-overlay') closeCheckoutModal();
  });

  // Payment Options Radio Selector Highlighting
  document.querySelectorAll('input[name="payment_method"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
      document.querySelectorAll('.payment-option').forEach((opt) => opt.classList.remove('selected'));
      e.target.closest('.payment-option').classList.add('selected');
    });
  });

  // Place Order Button
  document.getElementById('place-order-btn').addEventListener('click', submitOrderCheckout);

  // Thanks Modal Continue
  document.getElementById('thanks-continue-btn').addEventListener('click', closeThanksModal);
  document.getElementById('thanks-modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'thanks-modal-overlay') closeThanksModal();
  });

  // Auth Modals
  document.getElementById('login-btn').addEventListener('click', () => openAuthModal('login'));
  document.getElementById('close-auth-btn').addEventListener('click', closeAuthModal);
  document.getElementById('auth-modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'auth-modal-overlay') closeAuthModal();
  });

  // Auth Tabs (Login vs Register)
  document.getElementById('tab-login').addEventListener('click', () => switchAuthTab('login'));
  document.getElementById('tab-register').addEventListener('click', () => switchAuthTab('register'));

  // Signup Role Radio Cards
  document.querySelectorAll('input[name="signup_role"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
      document.querySelectorAll('.role-radio-card').forEach((card) => card.classList.remove('selected'));
      e.target.closest('.role-radio-card').classList.add('selected');

      const bioField = document.getElementById('author-bio-field');
      if (e.target.value === 'author') {
        bioField.classList.remove('hidden');
      } else {
        bioField.classList.add('hidden');
      }
    });
  });

  // Quick 3-Role Demo User Pills
  document.querySelectorAll('.demo-user-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      const email = pill.getAttribute('data-email');
      const pass = pill.getAttribute('data-pass');
      document.getElementById('login-email').value = email;
      document.getElementById('login-password').value = pass;
      switchAuthTab('login');
      showToast(`Filled demo credentials for ${email}`, 'info');
    });
  });

  // Auth Forms Submit
  document.getElementById('login-form').addEventListener('submit', handleLoginSubmit);
  document.getElementById('register-form').addEventListener('submit', handleRegisterSubmit);
  document.getElementById('logout-btn').addEventListener('click', handleLogout);

  // Super Admin Author Management Panel
  document.getElementById('superadmin-authors-btn').addEventListener('click', openSuperAdminAuthorsModal);
  document.getElementById('close-superadmin-modal-btn').addEventListener('click', closeSuperAdminAuthorsModal);
  document.getElementById('superadmin-modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'superadmin-modal-overlay') closeSuperAdminAuthorsModal();
  });
  document.getElementById('admin-create-author-btn').addEventListener('click', handleSuperAdminCreateAuthorPrompt);

  // Author & SuperAdmin Book Publishing Modal
  document.getElementById('author-add-book-btn').addEventListener('click', () => openBookModal());
  document.getElementById('close-author-book-modal-btn').addEventListener('click', closeBookModal);
  document.getElementById('author-book-modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'author-book-modal-overlay') closeBookModal();
  });
  document.getElementById('author-book-form').addEventListener('submit', handleBookFormSubmit);
}

// ======================= AUTHENTICATION =======================

async function checkAuth() {
  if (!window.api.token) {
    renderAuthState(null);
    return;
  }

  try {
    const data = await window.api.getMe();
    window.store.setState({ user: data.user });
    renderAuthState(data.user);
  } catch (err) {
    console.error('Auth verification error:', err);
    handleLogout();
  }
}

function renderAuthState(user) {
  const loginBtn = document.getElementById('login-btn');
  const userProfileMenu = document.getElementById('user-profile-menu');
  const superadminBtn = document.getElementById('superadmin-authors-btn');
  const authorAddBookBtn = document.getElementById('author-add-book-btn');
  const pendingBanner = document.getElementById('author-pending-banner');

  if (user) {
    loginBtn.classList.add('hidden');
    userProfileMenu.classList.remove('hidden');

    document.getElementById('user-name').textContent = user.full_name;
    document.getElementById('user-email').textContent = user.email;

    const roleBadge = document.getElementById('user-role-badge');
    roleBadge.textContent = user.role === 'superadmin' ? 'Super Admin' : user.role === 'author' ? 'Book Author' : 'Customer';
    roleBadge.className = `role-badge role-${user.role}`;

    document.getElementById('dropdown-role-text').textContent = `Role: ${user.role_display || user.role}`;
    document.getElementById('dropdown-status-text').textContent = `Status: ${user.status}`;

    // Initials Avatar
    const initials = user.full_name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    document.getElementById('user-avatar').textContent = initials;

    if (user.role === 'superadmin') {
      superadminBtn.classList.remove('hidden');
      authorAddBookBtn.classList.remove('hidden');
      pendingBanner.classList.add('hidden');
    } else if (user.role === 'author') {
      superadminBtn.classList.add('hidden');
      if (user.status === 'APPROVED') {
        authorAddBookBtn.classList.remove('hidden');
        pendingBanner.classList.add('hidden');
      } else {
        authorAddBookBtn.classList.add('hidden');
        pendingBanner.classList.remove('hidden');
      }
    } else {
      superadminBtn.classList.add('hidden');
      authorAddBookBtn.classList.add('hidden');
      pendingBanner.classList.add('hidden');
    }
  } else {
    loginBtn.classList.remove('hidden');
    userProfileMenu.classList.add('hidden');
    superadminBtn.classList.add('hidden');
    authorAddBookBtn.classList.add('hidden');
    pendingBanner.classList.add('hidden');
  }

  initIcons();
  renderBooksGrid();
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const data = await window.api.login(email, password);
    window.api.setToken(data.token);
    window.store.setState({ user: data.user });

    renderAuthState(data.user);
    closeAuthModal();
    showToast(`Welcome back, ${data.user.full_name}! (${data.user.role_display || data.user.role})`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  const full_name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const roleRadio = document.querySelector('input[name="signup_role"]:checked');
  const role = roleRadio ? roleRadio.value : 'customer';
  const bio = document.getElementById('reg-bio').value;

  try {
    const data = await window.api.register({ full_name, email, password, role, bio });
    window.api.setToken(data.token);
    window.store.setState({ user: data.user });

    renderAuthState(data.user);
    closeAuthModal();
    showToast(data.message, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function handleLogout() {
  window.api.setToken(null);
  window.store.setState({ user: null });
  renderAuthState(null);
  showToast('Signed out successfully', 'info');
}

function openAuthModal(tab = 'login') {
  document.getElementById('auth-modal-overlay').classList.remove('hidden');
  switchAuthTab(tab);
}

function closeAuthModal() {
  document.getElementById('auth-modal-overlay').classList.add('hidden');
}

function switchAuthTab(tab) {
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const modalTitle = document.getElementById('auth-modal-title');

  if (tab === 'login') {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    modalTitle.textContent = 'Sign In to BookWorm';
  } else {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    modalTitle.textContent = 'Create Account';
  }
}

// ======================= CATEGORIES & BOOKS =======================

async function loadCategories() {
  try {
    const data = await window.api.getCategories();
    window.store.setState({ categories: data.categories || [] });

    renderCategoryPills();
    populateCategorySelects();
  } catch (err) {
    console.error('Failed to load categories:', err);
  }
}

function renderCategoryPills() {
  const { categories, activeCategory } = window.store.getState();
  const container = document.getElementById('category-pills');

  container.innerHTML = `
    <button class="pill ${activeCategory === 'all' ? 'active' : ''}" data-category="all">
      <i data-lucide="layers"></i>
      <span>All Books</span>
    </button>
  `;

  categories.forEach((cat) => {
    const btn = document.createElement('button');
    btn.className = `pill ${activeCategory === String(cat.id) ? 'active' : ''}`;
    btn.setAttribute('data-category', cat.id);
    btn.innerHTML = `
      <i data-lucide="${getCategoryIconName(cat.icon)}"></i>
      <span>${cat.name} (${cat.book_count})</span>
    `;
    btn.addEventListener('click', () => {
      window.store.setState({ activeCategory: String(cat.id) });
      renderCategoryPills();
      loadBooks();
    });
    container.appendChild(btn);
  });

  container.querySelector('[data-category="all"]').addEventListener('click', () => {
    window.store.setState({ activeCategory: 'all' });
    renderCategoryPills();
    loadBooks();
  });

  initIcons();
}

function getCategoryIconName(icon) {
  const map = {
    cpu: 'cpu',
    'book-open': 'book-open',
    zap: 'zap',
    'trending-up': 'trending-up',
    'pen-tool': 'pen-tool'
  };
  return map[icon] || 'book';
}

function populateCategorySelects() {
  const { categories } = window.store.getState();
  const catSelect = document.getElementById('book-category');
  if (catSelect) {
    catSelect.innerHTML = categories
      .map((c) => `<option value="${c.id}">${c.name}</option>`)
      .join('');
  }
}

async function loadBooks() {
  try {
    const { activeCategory, searchQuery, sortBy } = window.store.getState();
    const data = await window.api.getBooks({
      category: activeCategory,
      search: searchQuery,
      sort: sortBy
    });

    window.store.setState({ books: data.books || [] });
    renderBooksGrid();
  } catch (err) {
    console.error('Failed to load books:', err);
    showToast('Failed to load books from server', 'error');
  }
}

function renderBooksGrid() {
  const { books, user } = window.store.getState();
  const grid = document.getElementById('books-grid');
  const countLabel = document.getElementById('books-count-label');
  const emptyState = document.getElementById('no-books-found');

  grid.innerHTML = '';
  countLabel.textContent = `Showing ${books.length} ${books.length === 1 ? 'book' : 'books'}`;

  if (books.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  books.forEach((book) => {
    const isSuperAdmin = user && user.role === 'superadmin';
    const isOwnerOrSuperAdmin =
      user && (user.role === 'superadmin' || (user.role === 'author' && user.id === book.author_id));

    const card = document.createElement('div');
    card.className = 'book-card';
    card.innerHTML = `
      <div class="book-cover-wrap">
        <img src="${book.cover_image}" alt="${book.title}" class="book-cover-img" loading="lazy">
        <span class="book-category-tag">${book.category_name || 'Book'}</span>
        <div class="book-rating">
          <i data-lucide="star"></i>
          <span>${book.rating ? book.rating.toFixed(1) : '5.0'}</span>
        </div>
      </div>
      <div class="book-info">
        <h3 class="book-title" title="${book.title}">${book.title}</h3>
        <p class="book-author">by ${book.author}</p>

        <!-- Customer Rating Stars -->
        <div class="rating-interactive" data-book-id="${book.id}">
          <span class="small-text text-muted">Rate:</span>
          ${[1, 2, 3, 4, 5]
            .map(
              (star) => `
            <button class="star-btn ${star <= Math.round(book.rating || 5) ? 'filled' : ''}"
                    onclick="submitBookRating(${book.id}, ${star})"
                    title="Rate ${star} Stars">
              <i data-lucide="star"></i>
            </button>
          `
            )
            .join('')}
          <span class="rating-count-text">(${book.rating_count || 1})</span>
        </div>

        <p class="book-desc">${book.description || ''}</p>
        <div class="book-footer">
          <div class="book-price-wrap">
            <span class="price-label">Price</span>
            <span class="book-price">$${book.price.toFixed(2)}</span>
          </div>
          
          <div class="book-actions-group">
            ${
              isOwnerOrSuperAdmin
                ? `
              <button class="btn-icon-action" onclick="openBookModal(${book.id})" title="Edit Book">
                <i data-lucide="edit-3"></i>
              </button>
              <button class="btn-icon-action" onclick="deleteBook(${book.id})" title="Delete Book">
                <i data-lucide="trash-2"></i>
              </button>
            `
                : ''
            }
            ${
              !isSuperAdmin
                ? `
              <button class="btn-add-cart" data-book-id="${book.id}">
                <i data-lucide="plus"></i>
                <span>Add to Cart</span>
              </button>
            `
                : `
              <span class="role-tag-sm superadmin" title="Super Admin role - Purchasing disabled">
                Governance View
              </span>
            `
            }
          </div>
        </div>
      </div>
    `;

    const addCartBtn = card.querySelector('.btn-add-cart');
    if (addCartBtn) {
      addCartBtn.addEventListener('click', () => {
        window.store.addToCart(book);
        showToast(`Added "${book.title}" to your cart`, 'success');
        updateCartDrawerUI();
      });
    }

    grid.appendChild(card);
  });

  initIcons();
}

function resetFilters() {
  window.store.setState({
    activeCategory: 'all',
    searchQuery: '',
    sortBy: 'featured'
  });

  document.getElementById('search-input').value = '';
  document.getElementById('search-clear-btn').classList.add('hidden');
  document.getElementById('sort-select').value = 'featured';

  renderCategoryPills();
  loadBooks();
}

// ======================= CUSTOMER RATINGS =======================

async function submitBookRating(bookId, rating) {
  if (!window.store.getState().user) {
    openAuthModal('login');
    showToast('Please sign in to rate this book', 'info');
    return;
  }

  try {
    const data = await window.api.rateBook(bookId, rating);
    showToast(data.message, 'success');
    await loadBooks();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
window.submitBookRating = submitBookRating;

// ======================= SHOPPING CART =======================

function renderCartBadge(cart) {
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartCounter = document.getElementById('cart-counter');
  cartCounter.textContent = totalItems;
  cartCounter.style.display = totalItems > 0 ? 'flex' : 'none';
}

function updateCartDrawerUI() {
  const { totalItems, totalCost } = window.store.getCartTotals();
  const { cart } = window.store.getState();

  document.getElementById('drawer-items-count').textContent = `${totalItems} ${totalItems === 1 ? 'item' : 'items'}`;
  document.getElementById('cart-total-items-qty').textContent = totalItems;
  document.getElementById('cart-subtotal-price').textContent = `$${totalCost.toFixed(2)}`;
  document.getElementById('cart-total-price').textContent = `$${totalCost.toFixed(2)}`;

  const itemsContainer = document.getElementById('cart-items-container');
  const emptyMessage = document.getElementById('cart-empty-message');
  const cartFooter = document.getElementById('cart-footer');

  if (cart.length === 0) {
    itemsContainer.innerHTML = '';
    emptyMessage.classList.remove('hidden');
    cartFooter.classList.add('hidden');
  } else {
    emptyMessage.classList.add('hidden');
    cartFooter.classList.remove('hidden');

    itemsContainer.innerHTML = cart
      .map(
        (item) => `
        <div class="cart-item-card">
          <img src="${item.cover_image}" alt="${item.title}" class="cart-item-img">
          <div class="cart-item-details">
            <div>
              <h4 class="cart-item-title">${item.title}</h4>
              <p class="small-text text-muted">by ${item.author || 'Author'}</p>
            </div>
            <div class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
            <div class="cart-qty-ctrls">
              <button class="qty-btn" onclick="updateCartItemQuantity(${item.book_id}, -1)">-</button>
              <span class="qty-number">${item.quantity}</span>
              <button class="qty-btn" onclick="updateCartItemQuantity(${item.book_id}, 1)">+</button>
              <button class="cart-remove-btn" onclick="removeFromCart(${item.book_id})" title="Remove item">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </div>
        </div>
      `
      )
      .join('');
  }

  initIcons();
}

function updateCartItemQuantity(bookId, delta) {
  window.store.updateCartQuantity(bookId, delta);
  updateCartDrawerUI();
}
window.updateCartItemQuantity = updateCartItemQuantity;

function removeFromCart(bookId) {
  window.store.removeFromCart(bookId);
  updateCartDrawerUI();
  showToast('Item removed from cart', 'info');
}
window.removeFromCart = removeFromCart;

function openCartDrawer() {
  document.getElementById('cart-drawer-overlay').classList.remove('hidden');
  updateCartDrawerUI();
}

function closeCartDrawer() {
  document.getElementById('cart-drawer-overlay').classList.add('hidden');
}

// ======================= CHECKOUT & ORDERS =======================

function handleProceedToCheckout() {
  const { cart, user } = window.store.getState();

  if (cart.length === 0) {
    showToast('Your cart is empty', 'error');
    return;
  }

  if (!user) {
    closeCartDrawer();
    openAuthModal('login');
    showToast('Please sign in or use a demo account to checkout', 'info');
    return;
  }

  if (user.role === 'superadmin') {
    showToast('Super Admins cannot purchase books. Please switch to a Customer account to place orders.', 'error');
    return;
  }

  closeCartDrawer();
  openCheckoutModal();
}

function openCheckoutModal() {
  const { totalItems, totalCost } = window.store.getCartTotals();
  const { user, cart } = window.store.getState();

  document.getElementById('checkout-user-name').textContent = user.full_name;
  document.getElementById('checkout-user-email').textContent = user.email;
  document.getElementById('checkout-user-role').textContent = (user.role_display || user.role).toUpperCase();

  document.getElementById('summary-total-items-qty').textContent = `${totalItems} ${totalItems === 1 ? 'item' : 'items'}`;
  document.getElementById('summary-subtotal-cost').textContent = `$${totalCost.toFixed(2)}`;
  document.getElementById('summary-grand-total').textContent = `$${totalCost.toFixed(2)}`;

  const listContainer = document.getElementById('checkout-items-list');
  listContainer.innerHTML = cart
    .map(
      (item) => `
      <div class="mini-item">
        <span>${item.quantity}x ${item.title}</span>
        <strong>$${(item.price * item.quantity).toFixed(2)}</strong>
      </div>
    `
    )
    .join('');

  document.getElementById('checkout-modal-overlay').classList.remove('hidden');
  initIcons();
}

function closeCheckoutModal() {
  document.getElementById('checkout-modal-overlay').classList.add('hidden');
}

async function submitOrderCheckout() {
  const address = document.getElementById('checkout-address').value;
  const paymentMethodRadio = document.querySelector('input[name="payment_method"]:checked');
  const payment_method = paymentMethodRadio ? paymentMethodRadio.value : 'Credit / Debit Card';
  const { cart } = window.store.getState();

  if (!address || address.trim().length < 5) {
    showToast('Please provide a complete shipping address', 'error');
    return;
  }

  const btn = document.getElementById('place-order-btn');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span>Processing Order...</span>`;

  try {
    const payload = {
      items: cart.map((item) => ({
        book_id: item.book_id,
        quantity: item.quantity
      })),
      shipping_address: address.trim(),
      payment_method
    };

    const data = await window.api.checkout(payload);

    window.store.clearCart();
    updateCartDrawerUI();

    closeCheckoutModal();
    openThanksModal(data.order);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
    initIcons();
  }
}

function openThanksModal(order) {
  document.getElementById('receipt-order-id').textContent = order.order_number;
  document.getElementById('receipt-customer-name').textContent = order.customer_name;
  document.getElementById('receipt-total-items').textContent = `${order.total_items} Books`;
  document.getElementById('receipt-total-cost').textContent = `$${order.total_cost.toFixed(2)}`;
  document.getElementById('receipt-payment-method').textContent = order.payment_method;
  document.getElementById('receipt-address').textContent = order.shipping_address;

  document.getElementById('thanks-modal-overlay').classList.remove('hidden');
  initIcons();
}

function closeThanksModal() {
  document.getElementById('thanks-modal-overlay').classList.add('hidden');
  loadBooks();
}

// ======================= SUPER ADMIN AUTHOR MANAGEMENT =======================

async function openSuperAdminAuthorsModal() {
  document.getElementById('superadmin-modal-overlay').classList.remove('hidden');
  await loadAuthorsTable();
}

function closeSuperAdminAuthorsModal() {
  document.getElementById('superadmin-modal-overlay').classList.add('hidden');
}

async function loadAuthorsTable() {
  try {
    const data = await window.api.getAuthors();
    const authors = data.authors || [];
    document.getElementById('authors-table-count').textContent = `Authors (${authors.length})`;

    const tbody = document.getElementById('authors-table-body');
    if (authors.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No authors registered yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = authors
      .map((a) => {
        const statusClass =
          a.status === 'APPROVED' ? 'status-approved' : a.status === 'PENDING' ? 'status-pending' : 'status-rejected';

        return `
          <tr>
            <td><strong>${a.full_name}</strong></td>
            <td>${a.email}</td>
            <td class="small-text">${a.bio || 'No bio provided'}</td>
            <td><strong>${a.published_books_count || 0}</strong> books</td>
            <td>
              <span class="status-badge ${statusClass}">
                ${a.status === 'APPROVED' ? '✓ Approved' : a.status === 'PENDING' ? '⏳ Pending' : '✕ Rejected'}
              </span>
            </td>
            <td>
              <div class="table-actions">
                ${
                  a.status !== 'APPROVED'
                    ? `<button class="btn btn-sm btn-success" onclick="approveAuthor(${a.id})" title="Approve Author">Approve</button>`
                    : ''
                }
                ${
                  a.status !== 'REJECTED'
                    ? `<button class="btn btn-sm btn-outline" onclick="rejectAuthor(${a.id})" title="Reject Author">Reject</button>`
                    : ''
                }
                <button class="btn btn-sm btn-danger" onclick="removeAuthor(${a.id})" title="Remove Author">Remove</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    initIcons();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function approveAuthor(authorId) {
  try {
    const data = await window.api.approveAuthor(authorId);
    showToast(data.message, 'success');
    await loadAuthorsTable();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
window.approveAuthor = approveAuthor;

async function rejectAuthor(authorId) {
  try {
    const data = await window.api.rejectAuthor(authorId);
    showToast(data.message, 'info');
    await loadAuthorsTable();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
window.rejectAuthor = rejectAuthor;

async function removeAuthor(authorId) {
  if (!confirm('Are you sure you want to remove this author from the platform?')) return;

  try {
    const data = await window.api.removeAuthor(authorId);
    showToast(data.message, 'info');
    await loadAuthorsTable();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
window.removeAuthor = removeAuthor;

async function handleSuperAdminCreateAuthorPrompt() {
  const name = prompt('Enter Author Full Name:');
  if (!name) return;
  const email = prompt('Enter Author Email:');
  if (!email) return;
  const password = prompt('Enter Initial Password (min. 6 chars):', 'Author@123');
  if (!password) return;
  const bio = prompt('Enter Author Bio / Genre:', 'Technology & Software Publishing');

  try {
    const data = await window.api.createAuthor({ full_name: name, email, password, bio });
    showToast(data.message, 'success');
    await loadAuthorsTable();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ======================= AUTHOR & SUPER ADMIN BOOK CRUD =======================

function openBookModal(bookId = null) {
  const heading = document.getElementById('book-modal-heading');
  const submitBtn = document.getElementById('submit-book-btn');
  const form = document.getElementById('author-book-form');
  const editIdInput = document.getElementById('edit-book-id');
  const { books, user } = window.store.getState();

  form.reset();
  editIdInput.value = '';

  if (bookId) {
    const book = books.find((b) => b.id === bookId);
    if (!book) return;

    heading.textContent = 'Edit Book Details';
    submitBtn.innerHTML = `<i data-lucide="check"></i><span>Update Book Information</span>`;
    editIdInput.value = book.id;

    document.getElementById('book-title').value = book.title;
    document.getElementById('book-author').value = book.author;
    document.getElementById('book-category').value = book.category_id;
    document.getElementById('book-price').value = book.price;
    document.getElementById('book-desc').value = book.description || '';
    document.getElementById('book-cover').value = book.cover_image || '';
  } else {
    heading.textContent = 'Publish New Book';
    submitBtn.innerHTML = `<i data-lucide="check"></i><span>Save & Publish to SQL Repository</span>`;
    if (user && user.role === 'author') {
      document.getElementById('book-author').value = user.full_name;
    }
  }

  document.getElementById('author-book-modal-overlay').classList.remove('hidden');
  initIcons();
}
window.openBookModal = openBookModal;

function closeBookModal() {
  document.getElementById('author-book-modal-overlay').classList.add('hidden');
}

async function handleBookFormSubmit(e) {
  e.preventDefault();
  const editId = document.getElementById('edit-book-id').value;
  const title = document.getElementById('book-title').value;
  const author = document.getElementById('book-author').value;
  const category_id = document.getElementById('book-category').value;
  const price = document.getElementById('book-price').value;
  const description = document.getElementById('book-desc').value;
  const cover_image = document.getElementById('book-cover').value;

  const payload = {
    title,
    author: author || undefined,
    category_id,
    price,
    description,
    cover_image: cover_image || undefined
  };

  try {
    const data = editId ? await window.api.updateBook(editId, payload) : await window.api.createBook(payload);

    showToast(data.message, 'success');
    closeBookModal();
    await loadCategories();
    await loadBooks();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteBook(bookId) {
  if (!confirm('Are you sure you want to remove this book from the repository?')) return;

  try {
    const data = await window.api.deleteBook(bookId);
    showToast(data.message, 'info');
    await loadCategories();
    await loadBooks();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
window.deleteBook = deleteBook;

// ======================= TOAST NOTIFICATIONS =======================

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const iconName = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-triangle' : 'info';

  toast.innerHTML = `
    <i data-lucide="${iconName}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  initIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
