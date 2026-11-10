const { query } = require('../database/connection');

class RatingRepository {
  async saveOrUpdateRating(bookId, userId, rating) {
    await query.run(
      `INSERT INTO book_ratings (book_id, user_id, rating) VALUES (?, ?, ?)
       ON CONFLICT(book_id, user_id) DO UPDATE SET rating = excluded.rating, created_at = CURRENT_TIMESTAMP`,
      [bookId, userId, rating]
    );

    return this.getRatingStats(bookId);
  }

  async getRatingStats(bookId) {
    return query.get(
      `SELECT AVG(rating) AS avg_rating, COUNT(id) AS total_ratings FROM book_ratings WHERE book_id = ?`,
      [bookId]
    );
  }

  async getUserRatingForBook(bookId, userId) {
    return query.get(
      `SELECT rating FROM book_ratings WHERE book_id = ? AND user_id = ?`,
      [bookId, userId]
    );
  }
}

module.exports = new RatingRepository();
