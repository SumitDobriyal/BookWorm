const categoryService = require('../services/category.service');

class CategoryController {
  async getAll(req, res, next) {
    try {
      const result = await categoryService.getAllCategories();
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CategoryController();
