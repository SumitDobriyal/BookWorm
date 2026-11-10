const express = require('express');
const categoryController = require('../controllers/category.controller');

const router = express.Router();

router.get('/', (req, res, next) => categoryController.getAll(req, res, next));

module.exports = router;
