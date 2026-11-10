const express = require('express');
const authController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/login', (req, res, next) => authController.login(req, res, next));
router.post('/register', (req, res, next) => authController.register(req, res, next));
router.get('/me', authenticateToken, (req, res, next) => authController.getMe(req, res, next));
router.get('/demo-users', (req, res) => authController.getDemoUsers(req, res));

module.exports = router;
