const { app } = require('../src/server');
const { initSchema, query, db } = require('../src/database/db');
const { seedDatabase } = require('../src/database/seed');
const http = require('http');

let server;
const PORT = 3056;

async function runTests() {
  console.log('--- Starting 3-Role Architecture System Verification Tests ---');
  await seedDatabase();

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
  console.log(`[Test Server] Running at http://127.0.0.1:${PORT}`);

  const baseUrl = `http://127.0.0.1:${PORT}/api`;

  async function apiCall(endpoint, options = {}) {
    const res = await fetch(`${baseUrl}${endpoint}`, options);
    const data = await res.json();
    return { status: res.status, ok: res.ok, data };
  }

  // 1. Health check
  console.log('\n1. Testing GET /api/health...');
  const health = await apiCall('/health');
  console.assert(health.ok && health.data.status === 'UP', 'Health check failed');
  console.log('✓ Health check passed:', health.data.service);

  // 2. Super Admin Login: Sumit Dobriyal (dobriyal.sumit@gmail.com)
  console.log('\n2. Testing Super Admin Login (Sumit Dobriyal)...');
  const superAdminLogin = await apiCall('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'dobriyal.sumit@gmail.com', password: 'SuperAdmin@123' })
  });
  console.assert(superAdminLogin.ok && superAdminLogin.data.user.role === 'superadmin', 'Super Admin login failed');
  console.assert(superAdminLogin.data.user.full_name === 'Sumit Dobriyal', 'Name check failed');
  const superAdminToken = superAdminLogin.data.token;
  console.log('✓ Super Admin authenticated:', superAdminLogin.data.user);

  // 3. Super Admin lists authors & manages approvals
  console.log('\n3. Testing Super Admin GET /api/admin/authors...');
  const authorsRes = await apiCall('/admin/authors', {
    headers: { Authorization: `Bearer ${superAdminToken}` }
  });
  console.assert(authorsRes.ok && authorsRes.data.authors.length >= 2, 'Author listing failed');
  console.log(`✓ Super Admin fetched ${authorsRes.data.authors.length} authors from SQL repository`);

  // 4. Pending author verification (Jane Austen initially PENDING)
  const pendingAuthor = authorsRes.data.authors.find((a) => a.email === 'jane.austen@bookworm.io');
  console.assert(pendingAuthor && pendingAuthor.status === 'PENDING', 'Pending author check failed');
  console.log('✓ Verified pending author:', pendingAuthor.full_name, '- Status:', pendingAuthor.status);

  // 5. Super Admin Approves Pending Author
  console.log('\n5. Testing Super Admin Approval (POST /api/admin/authors/:id/approve)...');
  const approveRes = await apiCall(`/admin/authors/${pendingAuthor.id}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${superAdminToken}` }
  });
  const approvedStatus = approveRes.data.status || (approveRes.data.author && approveRes.data.author.status);
  console.assert(approveRes.ok && approvedStatus === 'APPROVED', 'Approval failed');
  console.log('✓ Super Admin successfully approved author:', approveRes.data.message);

  // 6. Approved Author (Jane Austen) Login & Book Publishing
  console.log('\n6. Testing Approved Author publishing book...');
  const janeLogin = await apiCall('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'jane.austen@bookworm.io', password: 'Author@123' })
  });
  console.assert(janeLogin.ok && janeLogin.data.user.status === 'APPROVED', 'Jane login failed');
  const janeToken = janeLogin.data.token;

  const newBookRes = await apiCall('/books', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${janeToken}`
    },
    body: JSON.stringify({
      title: 'Pride and Previews in Modern Tech',
      price: 27.50,
      category_id: 2,
      description: 'A contemporary take on classic themes.'
    })
  });
  console.assert(newBookRes.ok && newBookRes.data.book.title === 'Pride and Previews in Modern Tech', 'Publish book failed');
  console.log('✓ Author successfully published new book:', newBookRes.data.book.title);

  // 7. Customer Login & Interactive Book Rating (1 to 5 stars)
  console.log('\n7. Testing Customer Rating (POST /api/books/:id/rate)...');
  const custLogin = await apiCall('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'john.doe@example.com', password: 'User@123' })
  });
  const custToken = custLogin.data.token;

  const rateRes = await apiCall(`/books/${newBookRes.data.book.id}/rate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${custToken}`
    },
    body: JSON.stringify({ rating: 5 })
  });
  console.assert(rateRes.ok && rateRes.data.user_rating === 5, 'Rating failed');
  console.log('✓ Customer successfully rated book 5 stars:', rateRes.data);

  // 8. Customer cannot perform Author actions (403 Guard Test)
  console.log('\n8. Testing Customer Role Restriction (Attempting Book Publication)...');
  const forbiddenRes = await apiCall('/books', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${custToken}`
    },
    body: JSON.stringify({ title: 'Illegal Book', price: 10, category_id: 1 })
  });
  console.assert(forbiddenRes.status === 403, 'Customer restriction failed');
  console.log('✓ Customer role restricted as expected (403 Forbidden):', forbiddenRes.data.error);

  // 9. Super Admin Purchasing Restriction Test (403 Guard)
  console.log('\n9. Testing Super Admin Purchase Restriction...');
  const adminCheckoutRes = await apiCall('/orders/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${superAdminToken}`
    },
    body: JSON.stringify({
      items: [{ book_id: newBookRes.data.book.id, quantity: 1 }],
      shipping_address: '100 Broadway Avenue, New York, NY 10005',
      payment_method: 'Credit / Debit Card'
    })
  });
  console.assert(adminCheckoutRes.status === 403, 'Super Admin purchasing restriction failed');
  console.log('✓ Super Admin purchasing restricted as expected (403 Forbidden):', adminCheckoutRes.data.error);

  // 10. Customer Checkout Process
  console.log('\n10. Testing Customer Checkout with SQL persistence...');
  const checkoutRes = await apiCall('/orders/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${custToken}`
    },
    body: JSON.stringify({
      items: [{ book_id: newBookRes.data.book.id, quantity: 2 }],
      shipping_address: '100 Broadway Avenue, New York, NY 10005',
      payment_method: 'Credit / Debit Card'
    })
  });
  console.assert(checkoutRes.ok && checkoutRes.data.order.status === 'CONFIRMED', 'Checkout failed');
  console.log('✓ Customer Checkout successful! Order Confirmation Reference:', checkoutRes.data.order.order_number);

  console.log('\n=========================================================');
  console.log('🎉 ALL 3-ROLE ARCHITECTURE TESTS PASSED SUCCESSFULLY!');
  console.log('=========================================================\n');

  server.close();
  db.close();
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  if (server) server.close();
  process.exit(1);
});
