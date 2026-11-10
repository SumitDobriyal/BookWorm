const bookRepository = require('../repositories/book.repository');
const ratingRepository = require('../repositories/rating.repository');
const { ROLES } = require('../config/constants');

class BookService {
  async getBooks({ category, search, sort }) {
    const books = await bookRepository.findAll({ category, search, sort });
    return { count: books.length, books };
  }

  async getBookById(id) {
    const book = await bookRepository.findById(id);
    if (!book) {
      const err = new Error('Book not found');
      err.status = 404;
      throw err;
    }
    return book;
  }

  async createBook(currentUser, bookData) {
    const { title, author, price, category_id, description, cover_image, stock_quantity, isbn } = bookData;

    if (!title || !price || !category_id) {
      const err = new Error('Title, price, and category are required');
      err.status = 400;
      throw err;
    }

    const authorName = author && author.trim().length > 0 ? author.trim() : currentUser.full_name;
    const authorId = currentUser.role === ROLES.AUTHOR ? currentUser.id : null;

    const newBook = await bookRepository.createBook({
      title,
      author: authorName,
      author_id: authorId,
      description,
      price,
      category_id,
      cover_image,
      stock_quantity,
      isbn
    });

    return { message: 'Book created successfully in repository', book: newBook };
  }

  async updateBook(currentUser, bookId, updateData) {
    const book = await bookRepository.findById(bookId);
    if (!book) {
      const err = new Error('Book not found');
      err.status = 404;
      throw err;
    }

    if (currentUser.role === ROLES.AUTHOR && book.author_id !== currentUser.id) {
      const err = new Error('Forbidden: You can only edit books that you published.');
      err.status = 403;
      throw err;
    }

    const updated = await bookRepository.updateBook(bookId, updateData);
    return { message: 'Book updated successfully', book: updated };
  }

  async deleteBook(currentUser, bookId) {
    const book = await bookRepository.findById(bookId);
    if (!book) {
      const err = new Error('Book not found');
      err.status = 404;
      throw err;
    }

    if (currentUser.role === ROLES.AUTHOR && book.author_id !== currentUser.id) {
      const err = new Error('Forbidden: You can only remove books that you published.');
      err.status = 403;
      throw err;
    }

    await bookRepository.deleteBook(bookId);
    return { message: `Book "${book.title}" deleted successfully.` };
  }

  async rateBook(currentUser, bookId, rating) {
    const numRating = parseInt(rating, 10);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      const err = new Error('Rating must be an integer between 1 and 5');
      err.status = 400;
      throw err;
    }

    const book = await bookRepository.findById(bookId);
    if (!book) {
      const err = new Error('Book not found');
      err.status = 404;
      throw err;
    }

    const stats = await ratingRepository.saveOrUpdateRating(bookId, currentUser.id, numRating);
    const newAvg = parseFloat(stats.avg_rating.toFixed(1));
    const totalCount = stats.total_ratings;

    await bookRepository.updateRatingStats(bookId, newAvg, totalCount);

    return {
      message: `Thank you for rating "${book.title}"!`,
      rating: newAvg,
      rating_count: totalCount,
      user_rating: numRating
    };
  }
}

module.exports = new BookService();
