const authService = require('../services/auth.service');

class AuthController {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async register(req, res, next) {
    try {
      const { full_name, email, password, role, bio } = req.body;
      const result = await authService.register({ full_name, email, password, role, bio });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getMe(req, res, next) {
    try {
      const user = await authService.getProfile(req.user.id);
      res.json({ user });
    } catch (err) {
      next(err);
    }
  }

  getDemoUsers(req, res) {
    const accounts = authService.getDemoUsers();
    res.json({ accounts });
  }
}

module.exports = new AuthController();
