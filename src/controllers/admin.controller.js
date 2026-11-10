const adminService = require('../services/admin.service');

class AdminController {
  async getAuthors(req, res, next) {
    try {
      const result = await adminService.getAuthors();
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async approveAuthor(req, res, next) {
    try {
      const result = await adminService.approveAuthor(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async rejectAuthor(req, res, next) {
    try {
      const result = await adminService.rejectAuthor(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async createAuthor(req, res, next) {
    try {
      const result = await adminService.createAuthor(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async updateAuthor(req, res, next) {
    try {
      const result = await adminService.updateAuthor(req.params.id, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async removeAuthor(req, res, next) {
    try {
      const result = await adminService.removeAuthor(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminController();
