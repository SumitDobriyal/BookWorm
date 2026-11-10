const express = require('express');
const bookController = require('../controllers/book.controller');
const { authenticateToken, requireApprovedAuthorOrSuperAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/', (req, res, next) => bookController.getAll(req, res, next));
router.get('/:id', (req, res, next) => bookController.getById(req, res, next));
router.post('/', authenticateToken, requireApprovedAuthorOrSuperAdmin, (req, res, next) => bookController.create(req, res, next));
router.put('/:id', authenticateToken, requireApprovedAuthorOrSuperAdmin, (req, res, next) => bookController.update(req, res, next));
router.delete('/:id', authenticateToken, requireApprovedAuthorOrSuperAdmin, (req, res, next) => bookController.delete(req, res, next));
router.post('/:id/rate', authenticateToken, (req, res, next) => bookController.rate(req, res, next));

module.exports = router;
