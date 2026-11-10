const express = require('express');
const { query } = require('../database/db');
const {
  authenticateToken,
  requireRole,
  requireApprovedAuthorOrSuperAdmin
} = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/books
 * Retrieves book catalog with category filter, search query, and sorting
 */
router.get('/', async (req, res, next) => {
  try {
    const { category, search, sort } = req.query;

    let sql = `
      SELECT b.id, b.title, b.author, b.author_id, b.description, b.price, b.cover_image,
             b.rating, b.rating_count, b.stock_quantity, b.isbn, b.category_id,
             c.name AS category_name
      FROM books b
      JOIN categories c ON b.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (category && category !== 'all') {
      sql += ` AND b.category_id = ?`;
      params.push(Number(category));
    }

    if (search && search.trim() !== '') {
      sql += ` AND (LOWER(b.title) LIKE ? OR LOWER(b.author) LIKE ? OR LOWER(b.description) LIKE ?)`;
      const term = `%${search.trim().toLowerCase()}%`;
      params.push(term, term, term);
    }

    if (sort === 'price_asc') {
      sql += ` ORDER BY b.price ASC`;
    } else if (sort === 'price_desc') {
      sql += ` ORDER BY b.price DESC`;
    } else if (sort === 'rating') {
      sql += ` ORDER BY b.rating DESC`;
    } else {
      sql += ` ORDER BY b.id ASC`;
    }

    const books = await query.all(sql, params);
    res.json({ count: books.length, books });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/books/:id
 * Retrieves single book by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const book = await query.get(
      `SELECT b.*, c.name AS category_name
       FROM books b
       JOIN categories c ON b.category_id = c.id
       WHERE b.id = ?`,
      [req.params.id]
    );

    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    res.json({ book });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/books
 * Creates a new book (Super Admin or Approved Author)
 */
router.post('/', authenticateToken, requireApprovedAuthorOrSuperAdmin, async (req, res, next) => {
  try {
    const { title, author, description, price, category_id, cover_image, stock_quantity, isbn } = req.body;

    if (!title || !price || !category_id) {
      return res.status(400).json({ error: 'Title, price, and category are required' });
    }

    const authorName = author && author.trim().length > 0 ? author.trim() : req.user.full_name;
    const authorId = req.user.role === 'author' ? req.user.id : null;

    const result = await query.run(
      `INSERT INTO books (title, author, author_id, description, price, category_id, cover_image, rating, rating_count, stock_quantity, isbn)
       VALUES (?, ?, ?, ?, ?, ?, ?, 5.0, 1, ?, ?)`,
      [
        title.trim(),
        authorName,
        authorId,
        description || '',
        parseFloat(price),
        parseInt(category_id, 10),
        cover_image || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
        stock_quantity ? parseInt(stock_quantity, 10) : 50,
        isbn || 'N/A'
      ]
    );

    const newBook = await query.get(`SELECT * FROM books WHERE id = ?`, [result.lastID]);
    res.status(201).json({ message: 'Book created successfully in repository', book: newBook });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/books/:id
 * Updates book information (Super Admin or Author who created the book)
 */
router.put('/:id', authenticateToken, requireApprovedAuthorOrSuperAdmin, async (req, res, next) => {
  try {
    const book = await query.get(`SELECT * FROM books WHERE id = ?`, [req.params.id]);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Role check: Super Admin can edit any book; Author can only edit their own books
    if (req.user.role === 'author' && book.author_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: You can only edit books that you published.' });
    }

    const { title, author, description, price, category_id, cover_image, stock_quantity } = req.body;

    await query.run(
      `UPDATE books SET 
        title = COALESCE(?, title),
        author = COALESCE(?, author),
        description = COALESCE(?, description),
        price = COALESCE(?, price),
        category_id = COALESCE(?, category_id),
        cover_image = COALESCE(?, cover_image),
        stock_quantity = COALESCE(?, stock_quantity)
       WHERE id = ?`,
      [
        title ? title.trim() : null,
        author ? author.trim() : null,
        description !== undefined ? description : null,
        price ? parseFloat(price) : null,
        category_id ? parseInt(category_id, 10) : null,
        cover_image ? cover_image.trim() : null,
        stock_quantity !== undefined ? parseInt(stock_quantity, 10) : null,
        req.params.id
      ]
    );

    const updated = await query.get(`SELECT * FROM books WHERE id = ?`, [req.params.id]);
    res.json({ message: 'Book updated successfully', book: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/books/:id
 * Removes a book from repository (Super Admin or Author who created the book)
 */
router.delete('/:id', authenticateToken, requireApprovedAuthorOrSuperAdmin, async (req, res, next) => {
  try {
    const book = await query.get(`SELECT * FROM books WHERE id = ?`, [req.params.id]);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    if (req.user.role === 'author' && book.author_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: You can only remove books that you published.' });
    }

    await query.run(`DELETE FROM books WHERE id = ?`, [req.params.id]);
    res.json({ message: `Book "${book.title}" deleted successfully.` });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/books/:id/rate
 * Allows General Customer to rate a book (1 to 5 stars)
 */
router.post('/:id/rate', authenticateToken, async (req, res, next) => {
  try {
    const { rating } = req.body;
    const bookId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    const numRating = parseInt(rating, 10);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
    }

    const book = await query.get(`SELECT id, title FROM books WHERE id = ?`, [bookId]);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Insert or replace customer rating
    await query.run(
      `INSERT INTO book_ratings (book_id, user_id, rating) VALUES (?, ?, ?)
       ON CONFLICT(book_id, user_id) DO UPDATE SET rating = excluded.rating, created_at = CURRENT_TIMESTAMP`,
      [bookId, userId, numRating]
    );

    // Recalculate average rating for this book
    const stats = await query.get(
      `SELECT AVG(rating) AS avg_rating, COUNT(id) AS total_ratings FROM book_ratings WHERE book_id = ?`,
      [bookId]
    );

    const newAvg = parseFloat(stats.avg_rating.toFixed(1));
    const totalCount = stats.total_ratings;

    await query.run(
      `UPDATE books SET rating = ?, rating_count = ? WHERE id = ?`,
      [newAvg, totalCount, bookId]
    );

    res.json({
      message: `Thank you for rating "${book.title}"!`,
      rating: newAvg,
      rating_count: totalCount,
      user_rating: numRating
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
