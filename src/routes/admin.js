const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../database/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Apply superadmin guard to all admin routes
router.use(authenticateToken, requireRole('superadmin'));

/**
 * GET /api/admin/authors
 * Lists all book authors with approval statuses and published book counts
 */
router.get('/authors', async (req, res, next) => {
  try {
    const authors = await query.all(`
      SELECT u.id, u.full_name, u.email, u.status, u.bio, u.created_at,
             COUNT(b.id) AS published_books_count
      FROM users u
      LEFT JOIN books b ON b.author_id = u.id
      WHERE u.role_id = 2 -- Book Author
      GROUP BY u.id
      ORDER BY 
        CASE u.status 
          WHEN 'PENDING' THEN 1 
          WHEN 'APPROVED' THEN 2 
          ELSE 3 
        END,
        u.created_at DESC
    `);

    res.json({ count: authors.length, authors });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/authors/:id/approve
 * Approves a pending author application
 */
router.post('/authors/:id/approve', async (req, res, next) => {
  try {
    const author = await query.get(
      `SELECT * FROM users WHERE id = ? AND role_id = 2`,
      [req.params.id]
    );

    if (!author) {
      return res.status(404).json({ error: 'Author account not found' });
    }

    await query.run(
      `UPDATE users SET status = 'APPROVED' WHERE id = ?`,
      [req.params.id]
    );

    res.json({
      message: `Author "${author.full_name}" has been approved successfully! They can now manage books.`,
      author_id: author.id,
      status: 'APPROVED'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/authors/:id/reject
 * Rejects an author application
 */
router.post('/authors/:id/reject', async (req, res, next) => {
  try {
    const author = await query.get(
      `SELECT * FROM users WHERE id = ? AND role_id = 2`,
      [req.params.id]
    );

    if (!author) {
      return res.status(404).json({ error: 'Author account not found' });
    }

    await query.run(
      `UPDATE users SET status = 'REJECTED' WHERE id = ?`,
      [req.params.id]
    );

    res.json({
      message: `Author application for "${author.full_name}" has been rejected.`,
      author_id: author.id,
      status: 'REJECTED'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/authors
 * Super Admin directly creates a verified author
 */
router.post('/authors', async (req, res, next) => {
  try {
    const { full_name, email, password, bio } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'Full name, email, and password are required' });
    }

    const existing = await query.get(`SELECT id FROM users WHERE LOWER(email) = LOWER(?)`, [email.trim()]);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const result = await query.run(
      `INSERT INTO users (full_name, email, password_hash, role_id, status, bio) VALUES (?, ?, ?, 2, 'APPROVED', ?)`,
      [full_name.trim(), email.trim().toLowerCase(), password_hash, bio || '']
    );

    res.status(201).json({
      message: `Author "${full_name}" created and verified successfully`,
      author: {
        id: result.lastID,
        full_name: full_name.trim(),
        email: email.trim().toLowerCase(),
        role: 'author',
        status: 'APPROVED',
        bio: bio || ''
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/admin/authors/:id
 * Super Admin edits author details
 */
router.put('/authors/:id', async (req, res, next) => {
  try {
    const { full_name, bio, status } = req.body;

    const author = await query.get(`SELECT id FROM users WHERE id = ? AND role_id = 2`, [req.params.id]);
    if (!author) {
      return res.status(404).json({ error: 'Author not found' });
    }

    await query.run(
      `UPDATE users SET full_name = COALESCE(?, full_name), bio = COALESCE(?, bio), status = COALESCE(?, status) WHERE id = ?`,
      [full_name ? full_name.trim() : null, bio !== undefined ? bio.trim() : null, status || null, req.params.id]
    );

    const updated = await query.get(
      `SELECT id, full_name, email, status, bio FROM users WHERE id = ?`,
      [req.params.id]
    );

    res.json({ message: 'Author updated successfully', author: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/admin/authors/:id
 * Super Admin removes an author
 */
router.delete('/authors/:id', async (req, res, next) => {
  try {
    const author = await query.get(`SELECT id, full_name FROM users WHERE id = ? AND role_id = 2`, [req.params.id]);
    if (!author) {
      return res.status(404).json({ error: 'Author not found' });
    }

    await query.run(`DELETE FROM users WHERE id = ?`, [req.params.id]);
    res.json({ message: `Author "${author.full_name}" removed from platform.` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
