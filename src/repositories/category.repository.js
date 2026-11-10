const { query } = require('../database/connection');

class CategoryRepository {
  async findAllWithCounts() {
    return query.all(`
      SELECT c.id, c.name, c.description, c.icon, COUNT(b.id) AS book_count
      FROM categories c
      LEFT JOIN books b ON b.category_id = c.id
      GROUP BY c.id
      ORDER BY c.id ASC
    `);
  }

  async findById(id) {
    return query.get(`SELECT * FROM categories WHERE id = ?`, [id]);
  }
}

module.exports = new CategoryRepository();
