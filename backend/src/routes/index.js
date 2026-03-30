const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { requireAdmin, requireRole, requireChannelAccess } = require('../middleware/roleMiddleware');

const authCtrl = require('../controllers/authController');
const holdingCtrl = require('../controllers/holdingController');
const channelCtrl = require('../controllers/channelController');
const buildingCtrl = require('../controllers/buildingController');
const roomCtrl = require('../controllers/roomController');
const assetCtrl = require('../controllers/assetController');
const groupCtrl = require('../controllers/assetGroupController');
const componentCtrl = require('../controllers/componentController');
const monitorCtrl = require('../controllers/monitoringController');
const maintCtrl = require('../controllers/maintenanceController');
const alertCtrl = require('../controllers/alertController');
const analyticsCtrl = require('../controllers/analyticsController');
const userCtrl = require('../controllers/userController');
const licenseCtrl = require('../controllers/licenseController');
const qrCtrl      = require('../controllers/qrController');
const reportCtrl  = require('../controllers/reportController');

const hierarchyRoutes = require('./hierarchyRoutes');

// ── Auth ──────────────────────────────────────────────────────────────────────
router.post('/auth/login', authCtrl.login);
router.post('/auth/refresh', authCtrl.refresh);
router.get('/auth/me', authenticate, authCtrl.getMe);
router.post('/auth/logout', authenticate, authCtrl.logout);

// ── Hierarchy (Physical Tree Server Migration) ────────────────────────────────
router.use('/hierarchy', hierarchyRoutes);

// ── Holdings ──────────────────────────────────────────────────────────────────
router.get('/holdings', authenticate, holdingCtrl.getAll);
router.get('/holdings/:id', authenticate, holdingCtrl.getById);
router.post('/holdings', authenticate, requireAdmin, holdingCtrl.create);
router.put('/holdings/:id', authenticate, requireAdmin, holdingCtrl.update);
router.delete('/holdings/:id', authenticate, requireAdmin, holdingCtrl.remove);

// ── Channels ──────────────────────────────────────────────────────────────────
router.get('/channels', authenticate, channelCtrl.getAll);
router.get('/channels/:id', authenticate, channelCtrl.getById);
router.post('/channels', authenticate, requireAdmin, channelCtrl.create);
router.put('/channels/:id', authenticate, requireAdmin, channelCtrl.update);
router.delete('/channels/:id', authenticate, requireAdmin, channelCtrl.remove);

// ── Asset Groups ──────────────────────────────────────────────────────────────
router.get('/assetgroups', authenticate, groupCtrl.getAll);
router.get('/assetgroups/:id', authenticate, groupCtrl.getById);
router.get('/channels/:channelId/groups', authenticate, requireChannelAccess('channelId'), groupCtrl.getByChannel);
router.post('/assetgroups', authenticate, requireRole('Manager'), groupCtrl.create);
router.put('/assetgroups/:id', authenticate, requireRole('Manager'), groupCtrl.update);
router.delete('/assetgroups/:id', authenticate, requireAdmin, groupCtrl.remove);

// ── Buildings ─────────────────────────────────────────────────────────────────
router.get('/channels/:channelId/buildings', authenticate, requireChannelAccess('channelId'), buildingCtrl.getByChannel);
router.get('/buildings/:id', authenticate, buildingCtrl.getById);
router.post('/buildings', authenticate, requireAdmin, buildingCtrl.create);
router.put('/buildings/:id', authenticate, requireAdmin, buildingCtrl.update);
router.delete('/buildings/:id', authenticate, requireAdmin, buildingCtrl.remove);

// ── Rooms ─────────────────────────────────────────────────────────────────────
router.get('/buildings/:buildingId/rooms', authenticate, roomCtrl.getByBuilding);
router.get('/rooms/:id', authenticate, roomCtrl.getById);
router.post('/rooms', authenticate, requireRole('Manager'), roomCtrl.create);
router.put('/rooms/:id', authenticate, requireRole('Manager'), roomCtrl.update);
router.delete('/rooms/:id', authenticate, requireAdmin, roomCtrl.remove);

// ── Assets ────────────────────────────────────────────────────────────────────
router.get('/assets', authenticate, assetCtrl.getAll);
router.get('/assets/export', authenticate, assetCtrl.exportCsv);
router.get('/assets/warranty-expiring', authenticate, assetCtrl.getWarrantyExpiring);
router.post('/assets/bulk-status', authenticate, requireRole('Technician'), assetCtrl.bulkUpdateStatus);
router.post('/assets/bulk-import', authenticate, requireRole('Technician'), assetCtrl.bulkImport);
router.get('/assets/:id/tree', authenticate, assetCtrl.getTree);
router.get('/assets/:id/qrcode', authenticate, qrCtrl.getAssetQR);
router.get('/assets/:id', authenticate, assetCtrl.getById);
router.post('/assets', authenticate, requireRole('Technician'), assetCtrl.create);
router.put('/assets/:id', authenticate, requireRole('Technician'), assetCtrl.update);
router.delete('/assets/:id', authenticate, requireAdmin, assetCtrl.remove);

// ── Components ────────────────────────────────────────────────────────────────
router.get('/assets/:assetId/components', authenticate, componentCtrl.getByAsset);
router.get('/components/:id', authenticate, componentCtrl.getById);
router.post('/components', authenticate, requireRole('Technician'), componentCtrl.create);
router.put('/components/:id', authenticate, requireRole('Technician'), componentCtrl.update);
router.delete('/components/:id', authenticate, requireRole('Manager'), componentCtrl.remove);

// ── Asset Maintenance ─────────────────────────────────────────────────────────
router.get('/assets/:assetId/maintenance', authenticate, maintCtrl.getByAsset);

// ── Monitoring ────────────────────────────────────────────────────────────────
router.get('/monitoring/:assetId/current', authenticate, monitorCtrl.getCurrent);
router.get('/monitoring/:assetId/history', authenticate, monitorCtrl.getHistory);
router.post('/monitoring/:assetId', authenticate, requireRole('Technician'), monitorCtrl.pushData);
router.get('/monitoring/stats/channel/:channelId', authenticate, requireChannelAccess('channelId'), monitorCtrl.getChannelStats);
router.get('/monitoring/heatmap', authenticate, monitorCtrl.getHeatmap);

// ── Maintenance ───────────────────────────────────────────────────────────────
router.get('/maintenance/scheduled', authenticate, maintCtrl.getScheduled);
router.get('/maintenance/:id', authenticate, maintCtrl.getById);
router.post('/maintenance', authenticate, requireRole('Technician'), maintCtrl.create);
router.put('/maintenance/:id', authenticate, requireRole('Technician'), maintCtrl.update);
router.delete('/maintenance/:id', authenticate, requireAdmin, maintCtrl.remove);

// ── Alerts ────────────────────────────────────────────────────────────────────
router.get('/alerts', authenticate, alertCtrl.getAll);
router.get('/alerts/dashboard', authenticate, alertCtrl.getDashboard);
router.post('/alerts', authenticate, alertCtrl.create);
router.post('/alerts/bulk-resolve', authenticate, alertCtrl.bulkResolve);
router.put('/alerts/:id/resolve', authenticate, alertCtrl.resolve);
router.delete('/alerts/:id', authenticate, requireAdmin, alertCtrl.remove);

// ── Analytics ─────────────────────────────────────────────────────────────────
router.get('/analytics/dashboard-kpi', authenticate, analyticsCtrl.getDashboardKPI);
router.get('/analytics/dashboard-kpi/channels', authenticate, analyticsCtrl.getDashboardKPIByChannel);
router.get('/analytics/power-consumption', authenticate, analyticsCtrl.getPowerConsumption);
router.get('/analytics/asset-health', authenticate, analyticsCtrl.getAssetHealth);
router.get('/analytics/budget', authenticate, analyticsCtrl.getBudget);
router.get('/analytics/maintenance-forecast',       authenticate, analyticsCtrl.getMaintenanceForecast);
router.get('/analytics/physical-node-distribution', authenticate, analyticsCtrl.getPhysicalNodeDistribution);

// ── Users ─────────────────────────────────────────────────────────────────────
router.get('/users', authenticate, userCtrl.getAll); // userCtrl handles inside
router.get('/users/:id', authenticate, userCtrl.getById);
router.post('/users', authenticate, requireAdmin, userCtrl.create);
router.put('/users/:id', authenticate, userCtrl.update);
router.put('/users/:id/password', authenticate, userCtrl.changePassword);
router.delete('/users/:id', authenticate, requireAdmin, userCtrl.remove);

// ── Licenses ──────────────────────────────────────────────────────────────────
router.get('/licenses', authenticate, licenseCtrl.getAll);
router.get('/assets/:assetId/licenses', authenticate, licenseCtrl.getByAsset);
router.get('/licenses/:id', authenticate, licenseCtrl.getById);
router.post('/licenses', authenticate, requireRole('Technician'), licenseCtrl.create);
router.put('/licenses/:id', authenticate, requireRole('Technician'), licenseCtrl.update);
router.delete('/licenses/:id', authenticate, requireAdmin, licenseCtrl.remove);

// ── Reports ───────────────────────────────────────────────────────────────────
router.get('/reports', authenticate, reportCtrl.getAll);
router.get('/reports/:id', authenticate, reportCtrl.getById);
router.post('/reports', authenticate, requireRole('Manager'), reportCtrl.create);
router.delete('/reports/:id', authenticate, requireAdmin, reportCtrl.remove);

// ── Logs ──────────────────────────────────────────────────────────────────────
router.get('/logs/activity', authenticate, requireAdmin, userCtrl.getActivityLog);

module.exports = router;
