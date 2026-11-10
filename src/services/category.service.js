const categoryRepository = require('../repositories/category.repository');

class CategoryService {
  async getAllCategories() {
    const categories = await categoryRepository.findAllWithCounts();
    return { categories };
  }
}

module.exports = new CategoryService();
