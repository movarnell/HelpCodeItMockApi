// routes/dynamic.js
const express = require('express');
const router = express.Router();
const dynamicController = require('../controllers/dynamicController');
const authenticateToken = require('../middleware/auth');

// All dynamic routes will be under /api/:endpoint_name
router.use('/api/:endpoint_name', authenticateToken, dynamicController.handleRequest);

module.exports = router;