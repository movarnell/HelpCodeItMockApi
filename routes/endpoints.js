// routes/endpoints.js
const express = require('express');
const router = express.Router();
const endpointController = require('../controllers/endpointController');
const authenticateToken = require('../middleware/auth');

// Create a new API endpoint
router.post('/', authenticateToken, endpointController.createEndpoint);

// Get all API endpoints for the authenticated user
router.get('/', authenticateToken, endpointController.getEndpoints);

// Get a specific API endpoint
router.get('/:id', authenticateToken, endpointController.getEndpointById);

// Update an API endpoint
router.put('/:id', authenticateToken, endpointController.updateEndpoint);

// Delete an API endpoint
router.delete('/:id', authenticateToken, endpointController.deleteEndpoint);

// Add fields to an API endpoint
router.post('/:id/fields', authenticateToken, endpointController.addFields);

// Get fields of an API endpoint
router.get('/:id/fields', authenticateToken, endpointController.getFields);

// Update a field
router.put('/:id/fields/:fieldId', authenticateToken, endpointController.updateField);

// Delete a field
router.delete('/:id/fields/:fieldId', authenticateToken, endpointController.deleteField);

module.exports = router;