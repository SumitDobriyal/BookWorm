const bookService = require('../services/book.service');

class BookController {
  async getAll(req, res, next) {
    try {
      const { category, search, sort } = req.query;
      const result = await bookService.getBooks({ category, search, sort });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const book = await bookService.getBookById(req.params.id);
      res.json({ book });
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const result = await bookService.createBook(req.user, req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const result = await bookService.updateBook(req.user, req.params.id, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await bookService.deleteBook(req.user, req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async rate(req, res, next) {
    try {
      const { rating } = req.body;
      const result = await bookService.rateBook(req.user, req.params.id, rating);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new BookController();
