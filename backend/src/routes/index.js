const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin, requireRole } = require('../middleware/auth');

const authCtrl = require('../controllers/authController');
const holdingCtrl = require('../controllers/holdingCtrl');
const channelCtrl = require('../controllers/channelCtrl');
const buildingCtrl = require('../controllers/buildingController');
const roomCtrl = require('../controllers/roomController');
const assetCtrl = require('../controllers/assetController');

router.post('/auth/login', authCtrl.login);
router.get('/auth/me', authenticate, authCtrl.getMe);

router.get('/holdings', authenticate, holdingCtrl.getAll);
router.get('/channels', authenticate, channelCtrl.getAll);

router.get('/channels/:channelId/buildings', authenticate, buildingCtrl.getByChannel);
router.get('/buildings/:id', authenticate, buildingCtrl.getById);
router.post('/buildings', authenticate, requireAdmin, buildingCtrl.create);
router.put('/buildings/:id', authenticate, requireAdmin, buildingCtrl.update);
router.delete('/buildings/:id', authenticate, requireAdmin, buildingCtrl.remove);

router.get('/buildings/:buildingId/rooms', authenticate, roomCtrl.getByBuilding);
router.get('/rooms/:id', authenticate, roomCtrl.getById);
router.post('/rooms', authenticate, requireRole('Manager'), roomCtrl.create);
router.put('/rooms/:id', authenticate, requireRole('Manager'), roomCtrl.update);
router.delete('/rooms/:id', authenticate, requireAdmin, roomCtrl.remove);

router.get('/assets', authenticate, assetCtrl.getAll);
router.get('/assets/:id/tree', authenticate, assetCtrl.getTree);
router.post('/assets', authenticate, assetCtrl.create);
router.put('/assets/:id', authenticate, assetCtrl.update);
router.delete('/assets/:id', authenticate, assetCtrl.remove);

module.exports = router;
