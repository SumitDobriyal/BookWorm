const express = require('express');
const { query } = require('../database/db');

const router = express.Router();

/**
 * GET /api/categories
 * Returns list of categories with book count
 */
router.get('/', async (req, res, next) => {
  try {
    const categories = await query.all(`
      SELECT c.id, c.name, c.description, c.icon, COUNT(b.id) AS book_count
      FROM categories c
      LEFT JOIN books b ON b.category_id = c.id
      GROUP BY c.id
      ORDER BY c.id ASC
    `);

    res.json({ categories });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
