const express = require('express');
const router = express.Router();
const hierarchyController = require('../controllers/hierarchyController');

// Tree Operations
router.get('/tree', hierarchyController.getTree);

// Move Operations
router.post('/move', hierarchyController.moveNode);

// SQL Asset Linking Operation
router.post('/bilgisayar/:id/link', hierarchyController.linkNode);

// Detailed Mock Packet
router.get('/packet/:id', hierarchyController.getPacket);

// Audit Log Fetching
router.get('/audit-log', hierarchyController.getAuditLog);

// PostgreSQL Veri Yükleme Demostrasyonu
router.post('/demo', hierarchyController.loadDemoData);

// Delete Nodes
router.delete('/:type/:id', hierarchyController.deleteNode);

// Node Operations (Create) - IMPORTANT: Must be at the bottom among posts to prevent overriding
router.post('/:nodeType', hierarchyController.createNode);

module.exports = router;
