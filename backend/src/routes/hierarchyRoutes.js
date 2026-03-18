const express = require('express');
const router = express.Router();
const hierarchyController = require('../controllers/hierarchyController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireAdmin, requireRole } = require('../middleware/roleMiddleware');

// Tüm hierarchy endpoint'leri kimlik doğrulaması gerektirir
router.use(authenticate);

// Tree Operations (okuma — tüm roller)
router.get('/tree', hierarchyController.getTree);

// Move Operations (Manager+)
router.post('/move', requireRole('Manager'), hierarchyController.moveNode);

// SQL Asset Linking Operation (Technician+)
router.post('/bilgisayar/:id/link', requireRole('Technician'), hierarchyController.linkNode);

// Audit Log Fetching (Manager+)
router.get('/audit-log', requireRole('Manager'), hierarchyController.getAuditLog);

// PostgreSQL Demo Data — TEHLIKELI: tüm ağacı siler (Admin only)
router.post('/demo', requireAdmin, hierarchyController.loadDemoData);

// Auto-Link (Admin only — toplu değişiklik yapar)
router.post('/auto-link', requireAdmin, hierarchyController.autoLinkNodes);

// Update Payload (Metadata) (Technician+)
router.patch('/:type/:id/payload', requireRole('Technician'), hierarchyController.updatePayload);

// Rename Node (Technician+)
router.patch('/:type/:id', requireRole('Technician'), hierarchyController.renameNode);

// Delete Nodes (Admin only)
router.delete('/:type/:id', requireAdmin, hierarchyController.deleteNode);

// Node Operations (Create) — IMPORTANT: Must be at the bottom among posts to prevent overriding
router.post('/:nodeType', requireRole('Technician'), hierarchyController.createNode);

module.exports = router;
