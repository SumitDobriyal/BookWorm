const bcrypt = require('bcryptjs');
const { query, initSchema, db } = require('./db');

async function seedDatabase() {
  console.log('[Seed] Dropping and re-initializing schema for clean 3-role state...');
  await query.exec(`
    DROP TABLE IF EXISTS book_ratings;
    DROP TABLE IF EXISTS order_items;
    DROP TABLE IF EXISTS orders;
    DROP TABLE IF EXISTS books;
    DROP TABLE IF EXISTS categories;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS roles;
  `);

  await initSchema();

  console.log('[Seed] Seeding 3 exact roles: superadmin, author, customer...');
  await query.run(`
    INSERT INTO roles (id, name, display_name, description) VALUES 
    (1, 'superadmin', 'Super Admin', 'Super Administrator with full power to manage and approve authors'),
    (2, 'author', 'Book Author', 'Book Author who can publish, edit, and manage books after approval'),
    (3, 'customer', 'General Customer', 'General customer who can browse, buy, and rate books')
  `);

  console.log('[Seed] Seeding users with hashed passwords...');
  const salt = await bcrypt.genSalt(10);
  const superAdminPass = await bcrypt.hash('SuperAdmin@123', salt);
  const authorPass = await bcrypt.hash('Author@123', salt);
  const customerPass = await bcrypt.hash('User@123', salt);

  // 1. Super Admin: Sumit Dobriyal (dobriyal.sumit@gmail.com)
  await query.run(
    `INSERT INTO users (id, full_name, email, password_hash, role_id, status, bio) VALUES 
     (1, 'Sumit Dobriyal', 'dobriyal.sumit@gmail.com', ?, 1, 'APPROVED', 'Platform Super Administrator and Head of Bookstore Operations')`,
    [superAdminPass]
  );

  // 2. Approved Book Author
  await query.run(
    `INSERT INTO users (id, full_name, email, password_hash, role_id, status, bio) VALUES 
     (2, 'Sam Newman', 'sam.newman@bookworm.io', ?, 2, 'APPROVED', 'Distributed systems architect & bestselling tech author')`,
    [authorPass]
  );

  // 3. Pending Book Author (Awaiting Super Admin approval)
  await query.run(
    `INSERT INTO users (id, full_name, email, password_hash, role_id, status, bio) VALUES 
     (3, 'Jane Austen', 'jane.austen@bookworm.io', ?, 2, 'PENDING', 'Novelist and creative fiction writer seeking publisher approval')`,
    [authorPass]
  );

  // 4. General Customer
  await query.run(
    `INSERT INTO users (id, full_name, email, password_hash, role_id, status, bio) VALUES 
     (4, 'John Doe', 'john.doe@example.com', ?, 3, 'APPROVED', 'Book enthusiast and software practitioner')`,
    [customerPass]
  );

  console.log('[Seed] Seeding categories...');
  const categories = [
    { id: 1, name: 'Science & Technology', description: 'Computing, Artificial Intelligence, and Modern Science', icon: 'cpu' },
    { id: 2, name: 'Fiction & Literature', description: 'Bestselling novels, classics, and literary fiction', icon: 'book-open' },
    { id: 3, name: 'Self-Help & Mindset', description: 'Personal development, productivity, and mindfulness', icon: 'zap' },
    { id: 4, name: 'Business & Finance', description: 'Leadership, economics, investing, and entrepreneurship', icon: 'trending-up' },
    { id: 5, name: 'Design & UX', description: 'Digital product design, user research, and typography', icon: 'pen-tool' }
  ];

  for (const cat of categories) {
    await query.run(
      `INSERT INTO categories (id, name, description, icon) VALUES (?, ?, ?, ?)`,
      [cat.id, cat.name, cat.description, cat.icon]
    );
  }

  console.log('[Seed] Seeding books with author linkages...');
  const books = [
    {
      id: 1,
      title: 'Designing Data-Intensive Applications',
      author: 'Martin Kleppmann',
      author_id: 2,
      description: 'The big ideas behind reliable, scalable, and maintainable systems in modern cloud architectures.',
      price: 44.99,
      category_id: 1,
      cover_image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
      rating: 4.9,
      rating_count: 142,
      stock_quantity: 45,
      isbn: '978-1449373320'
    },
    {
      id: 2,
      title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
      author: 'Robert C. Martin',
      author_id: 2,
      description: 'Even bad code can function. But if code isn’t clean, it can bring a development organization to its knees.',
      price: 38.50,
      category_id: 1,
      cover_image: 'https://images.unsplash.com/photo-1532012164546-f432f2e3edd4?auto=format&fit=crop&w=600&q=80',
      rating: 4.8,
      rating_count: 98,
      stock_quantity: 60,
      isbn: '978-0132350884'
    },
    {
      id: 3,
      title: 'Atomic Habits',
      author: 'James Clear',
      author_id: 2,
      description: 'An easy and proven way to build good habits, break bad ones, and achieve remarkable results.',
      price: 19.99,
      category_id: 3,
      cover_image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80',
      rating: 4.9,
      rating_count: 310,
      stock_quantity: 120,
      isbn: '978-0735211292'
    },
    {
      id: 4,
      title: 'The Psychology of Money',
      author: 'Morgan Housel',
      author_id: 2,
      description: 'Timeless lessons on wealth, greed, and happiness doing well with money.',
      price: 21.50,
      category_id: 4,
      cover_image: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?auto=format&fit=crop&w=600&q=80',
      rating: 4.7,
      rating_count: 85,
      stock_quantity: 80,
      isbn: '978-0857197689'
    },
    {
      id: 5,
      title: 'The Design of Everyday Things',
      author: 'Don Norman',
      author_id: 2,
      description: 'A powerful primer on human-centered design and making intuitive products.',
      price: 26.95,
      category_id: 5,
      cover_image: 'https://images.unsplash.com/photo-1507842229451-9f01079ca4b5?auto=format&fit=crop&w=600&q=80',
      rating: 4.8,
      rating_count: 72,
      stock_quantity: 35,
      isbn: '978-0465050659'
    },
    {
      id: 6,
      title: 'Project Hail Mary',
      author: 'Andy Weir',
      author_id: 2,
      description: 'A lone astronaut must save the earth from disaster in this interstellar scientific triumph.',
      price: 24.00,
      category_id: 2,
      cover_image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
      rating: 4.9,
      rating_count: 195,
      stock_quantity: 50,
      isbn: '978-0593135204'
    },
    {
      id: 7,
      title: 'Refactoring: Improving Design of Existing Code',
      author: 'Martin Fowler',
      author_id: 2,
      description: 'Guides software developers in understanding and applying techniques to improve software architecture.',
      price: 49.99,
      category_id: 1,
      cover_image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80',
      rating: 4.8,
      rating_count: 64,
      stock_quantity: 30,
      isbn: '978-0134757599'
    },
    {
      id: 8,
      title: 'Deep Work: Rules for Focused Success',
      author: 'Cal Newport',
      author_id: 2,
      description: 'Mastering the ability to focus without distraction on a cognitively demanding task.',
      price: 18.25,
      category_id: 3,
      cover_image: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=600&q=80',
      rating: 4.6,
      rating_count: 53,
      stock_quantity: 75,
      isbn: '978-1455586691'
    },
    {
      id: 9,
      title: 'Zero to One: Notes on Startups',
      author: 'Peter Thiel',
      author_id: 2,
      description: 'How to build companies that create new things and innovate rather than copy.',
      price: 22.00,
      category_id: 4,
      cover_image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80',
      rating: 4.5,
      rating_count: 40,
      stock_quantity: 40,
      isbn: '978-0804139298'
    },
    {
      id: 10,
      title: 'Don’t Make Me Think, Revisited',
      author: 'Steve Krug',
      author_id: 2,
      description: 'A common sense approach to Web and Mobile usability, essential for developers and UX teams.',
      price: 29.99,
      category_id: 5,
      cover_image: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=600&q=80',
      rating: 4.7,
      rating_count: 58,
      stock_quantity: 55,
      isbn: '978-0321965516'
    }
  ];

  for (const b of books) {
    await query.run(
      `INSERT INTO books (id, title, author, author_id, description, price, category_id, cover_image, rating, rating_count, stock_quantity, isbn)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [b.id, b.title, b.author, b.author_id, b.description, b.price, b.category_id, b.cover_image, b.rating, b.rating_count, b.stock_quantity, b.isbn]
    );
  }

  // Seed sample initial ratings from customer (user_id 4)
  await query.run(
    `INSERT INTO book_ratings (book_id, user_id, rating) VALUES (1, 4, 5), (3, 4, 5), (4, 4, 4)`
  );

  console.log('[Seed] Database seeding completed successfully with 3-role system!');
}

if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('[Seed] Done. Closing connection.');
      db.close();
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seed] Error seeding database:', err);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
