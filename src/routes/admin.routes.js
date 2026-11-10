const express = require('express');
const adminController = require('../controllers/admin.controller');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');
const { ROLES } = require('../config/constants');

const router = express.Router();

router.use(authenticateToken, requireRole(ROLES.SUPERADMIN));

router.get('/authors', (req, res, next) => adminController.getAuthors(req, res, next));
router.post('/authors', (req, res, next) => adminController.createAuthor(req, res, next));
router.post('/authors/:id/approve', (req, res, next) => adminController.approveAuthor(req, res, next));
router.post('/authors/:id/reject', (req, res, next) => adminController.rejectAuthor(req, res, next));
router.put('/authors/:id', (req, res, next) => adminController.updateAuthor(req, res, next));
router.delete('/authors/:id', (req, res, next) => adminController.removeAuthor(req, res, next));

module.exports = router;
