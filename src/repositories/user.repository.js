const { query } = require('../database/connection');

class UserRepository {
  async findByEmail(email) {
    return query.get(
      `SELECT u.id, u.full_name, u.email, u.password_hash, u.role_id, u.status, u.bio, u.created_at,
              r.name AS role, r.display_name AS role_display
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE LOWER(u.email) = LOWER(?)`,
      [email.trim()]
    );
  }

  async findById(id) {
    return query.get(
      `SELECT u.id, u.full_name, u.email, u.role_id, u.status, u.bio, u.created_at,
              r.name AS role, r.display_name AS role_display
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [id]
    );
  }

  async createUser({ full_name, email, password_hash, role_id, status, bio }) {
    const result = await query.run(
      `INSERT INTO users (full_name, email, password_hash, role_id, status, bio)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [full_name.trim(), email.trim().toLowerCase(), password_hash, role_id, status, bio || '']
    );
    return this.findById(result.lastID);
  }

  async findAllAuthors() {
    return query.all(`
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
  }

  async updateAuthorStatus(authorId, status) {
    await query.run(`UPDATE users SET status = ? WHERE id = ? AND role_id = 2`, [status, authorId]);
    return this.findById(authorId);
  }

  async updateAuthorProfile(authorId, { full_name, bio, status }) {
    await query.run(
      `UPDATE users SET 
        full_name = COALESCE(?, full_name), 
        bio = COALESCE(?, bio), 
        status = COALESCE(?, status) 
       WHERE id = ? AND role_id = 2`,
      [full_name ? full_name.trim() : null, bio !== undefined ? bio.trim() : null, status || null, authorId]
    );
    return this.findById(authorId);
  }

  async deleteAuthor(authorId) {
    return query.run(`DELETE FROM users WHERE id = ? AND role_id = 2`, [authorId]);
  }
}

module.exports = new UserRepository();
