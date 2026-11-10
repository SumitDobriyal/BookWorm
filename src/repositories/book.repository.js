const { query } = require('../database/connection');

class BookRepository {
  async findAll({ category, search, sort }) {
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

    return query.all(sql, params);
  }

  async findById(id) {
    return query.get(
      `SELECT b.*, c.name AS category_name
       FROM books b
       JOIN categories c ON b.category_id = c.id
       WHERE b.id = ?`,
      [id]
    );
  }

  async createBook({ title, author, author_id, description, price, category_id, cover_image, stock_quantity, isbn }) {
    const result = await query.run(
      `INSERT INTO books (title, author, author_id, description, price, category_id, cover_image, rating, rating_count, stock_quantity, isbn)
       VALUES (?, ?, ?, ?, ?, ?, ?, 5.0, 1, ?, ?)`,
      [
        title.trim(),
        author.trim(),
        author_id || null,
        description || '',
        parseFloat(price),
        parseInt(category_id, 10),
        cover_image || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
        stock_quantity ? parseInt(stock_quantity, 10) : 50,
        isbn || 'N/A'
      ]
    );
    return this.findById(result.lastID);
  }

  async updateBook(id, { title, author, description, price, category_id, cover_image, stock_quantity }) {
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
        id
      ]
    );
    return this.findById(id);
  }

  async deleteBook(id) {
    return query.run(`DELETE FROM books WHERE id = ?`, [id]);
  }

  async deductStock(bookId, quantity) {
    return query.run(`UPDATE books SET stock_quantity = stock_quantity - ? WHERE id = ?`, [quantity, bookId]);
  }

  async updateRatingStats(bookId, avgRating, ratingCount) {
    return query.run(
      `UPDATE books SET rating = ?, rating_count = ? WHERE id = ?`,
      [avgRating, ratingCount, bookId]
    );
  }
}

module.exports = new BookRepository();
