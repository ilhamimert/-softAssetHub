// ============================================================
// CORE ENTITY TYPES
// Hierarchy: Holding -> Channel -> AssetGroup -> Asset -> Component
// ============================================================

export interface Holding {
  holdingId: number;
  holdingName: string;
  description?: string;
  website?: string;
  contactEmail?: string;
  logoUrl?: string;
  createdDate: string;
  updatedDate?: string;
  isActive: boolean;
  channelCount?: number;
  totalAssets?: number;
}

export interface Channel {
  channelId: number;
  holdingId?: number;
  holdingName?: string;
  channelName: string;
  description?: string;
  logoUrl?: string;
  establishedYear?: number;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  isActive: boolean;
  createdDate: string;
  assetCount?: number;
  groupCount?: number;
}

export type AssetGroupType = 'Playout' | 'Encoding' | 'Transmission' | 'Archive' | 'Storage' | 'General';
export type AssetGroupStatus = 'operational' | 'degraded' | 'failed';

export interface AssetGroup {
  assetGroupId: number;
  channelId: number;
  channelName?: string;
  groupName: string;
  groupType: AssetGroupType;
  description?: string;
  status: AssetGroupStatus;
  createdDate: string;
  updatedDate?: string;
  isActive: boolean;
  assetCount?: number;
  activeCount?: number;
  maintenanceCount?: number;
  faultyCount?: number;
  // Live monitoring aggregates
  avgCpu?: number;
  avgTemperature?: number;
  avgPower?: number;
}

export type AssetType = 'GPU' | 'DisplayCard' | 'Server' | 'Disk' | 'Network' | 'Encoder' | 'Router';
export type AssetStatus = 'Active' | 'Inactive' | 'Maintenance' | 'Retired' | 'Faulty';

export interface Asset {
  assetId: number;
  assetGroupId: number;
  channelId: number;
  roomId?: number;
  groupName?: string;
  groupType?: AssetGroupType;
  channelName?: string;
  holdingId?: number;
  holdingName?: string;
  assetName: string;
  assetCode?: string;
  assetType: AssetType;
  model?: string;
  serialNumber?: string;
  manufacturer?: string;
  supplier?: string;
  purchaseDate?: string;
  warrantyEndDate?: string;
  warrantyMonths?: number;
  purchaseCost?: number;
  currentValue?: number;
  depreciationRate?: number;
  rackPosition?: string;
  ipAddress?: string;
  macAddress?: string;
  firmwareVersion?: string;
  driverVersion?: string;
  status: AssetStatus;
  imageUrl?: string;
  notes?: string;
  createdDate: string;
  updatedDate: string;
  isActive: boolean;
  // From monitoring join
  lastTemperature?: number;
  lastPowerConsumption?: number;
  isOnline?: boolean;
}

export type ComponentType = 'GPU' | 'RAM' | 'NIC' | 'Storage' | 'PSU' | 'Cooling' | 'HDD' | 'SSD';
export type ComponentStatus = 'Active' | 'Faulty' | 'Replaced';

export interface AssetComponent {
  componentId: number;
  assetId: number;
  assetGroupId: number;
  channelId: number;
  assetName?: string;
  groupName?: string;
  groupType?: AssetGroupType;
  channelName?: string;
  componentName: string;
  componentType: ComponentType;
  model?: string;
  serialNumber?: string;
  manufacturer?: string;
  specifications?: string; // JSON
  purchaseDate?: string;
  warrantyEndDate?: string;
  status: ComponentStatus;
  notes?: string;
  createdDate: string;
  updatedDate?: string;
  isActive: boolean;
}

// DurumBilgisi — asset'in anlık durum bilgisi (live monitoring)
export interface DurumBilgisi {
  status: 'online' | 'offline' | 'degraded';
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
  temperature: number;
  uptime: number;
  alerts: string[];
  lastUpdated: string;
}

export interface AssetMonitoring {
  monitoringId: number;
  assetId: number;
  assetName?: string;
  assetType?: string;
  status?: string;
  groupName?: string;
  groupType?: string;
  channelName?: string;
  monitoringTime: string;
  cpuUsage?: number;
  ramUsage?: number;
  diskUsage?: number;
  gpuUsage?: number;
  temperature?: number;
  cpuTemperature?: number;
  powerConsumption?: number;
  fanSpeed?: number;
  memoryUsedGb?: number;
  memoryTotalGb?: number;
  networkInMbps?: number;
  networkOutMbps?: number;
  networkLatency?: number;
  uptime?: number;
  isOnline: boolean;
  errorCount?: number;
  performanceScore?: number;
  signalStrength?: number;
}

export interface MaintenanceRecord {
  maintenanceId: number;
  assetId: number;
  assetName?: string;
  assetCode?: string;
  channelName?: string;
  buildingName?: string;
  maintenanceDate: string;
  maintenanceType?: string;
  description?: string;
  technicianName?: string;
  technicianEmail?: string;
  costAmount?: number;
  status: 'Completed' | 'Pending' | 'Scheduled' | 'Cancelled';
  nextMaintenanceDate?: string;
  maintenanceInterval?: number;
  daysUntilMaintenance?: number;
  documentUrl?: string;
  notes?: string;
  createdDate: string;
}

export type AlertType = 'Critical' | 'Warning' | 'Info';

export interface Alert {
  alertId: number;
  assetId?: number;
  assetName?: string;
  assetCode?: string;
  channelName?: string;
  groupName?: string;
  groupType?: string;
  alertType: AlertType;
  alertCategory?: string;
  alertMessage: string;
  alertSeverity: number;
  thresholdValue?: number;
  currentValue?: number;
  triggeredTime: string;
  resolvedTime?: string;
  isResolved: boolean;
  isNotified: boolean;
  resolutionNotes?: string;
}

export interface User {
  userId: number;
  username: string;
  email: string;
  fullName: string;
  role: 'Admin' | 'Manager' | 'Technician' | 'Viewer';
  channelId?: number;
  channelName?: string;
  phone?: string;
  department?: string;
  isActive: boolean;
  lastLogin?: string;
  createdDate: string;
}

// ============================================================
// ANALYTICS TYPES
// ============================================================

export interface HealthRecord {
  channelName: string;
  groupType?: string;
  assetType?: string;
  totalAssets?: number;
  activeCount: number;
  maintenanceCount: number;
  faultyCount: number;
}

export interface BudgetRecord {
  channelName: string;
  totalPurchaseCost: number;
  totalCurrentValue: number;
  totalMaintenanceCost: number;
}

export interface ForecastRecord {
  assetId: number;
  assetName: string;
  maintenanceType?: string;
  channelName: string;
  buildingName?: string;
  nextMaintenanceDate?: string;
  daysUntilMaintenance?: number;
  warrantyEndDate?: string;
  daysUntilWarrantyExpiry?: number;
}

export interface ActivityLog {
  logId: number;
  userId?: number;
  username?: string;
  fullName?: string;
  action: string;
  entityType?: string;
  entityId?: number;
  entityName?: string;
  details?: string;
  ipAddress?: string;
  newValue?: string;
  oldValue?: string;
  timestamp: string;
}

export interface AssetFormData {
  assetName: string;
  assetType: string;
  assetCode?: string;
  model?: string;
  serialNumber?: string;
  manufacturer?: string;
  supplier?: string;
  ipAddress?: string;
  macAddress?: string;
  firmwareVersion?: string;
  rackPosition?: string;
  status: string;
  purchaseCost?: number | string;
  currentValue?: number | string;
  depreciationRate?: number | string;
  purchaseDate?: string;
  warrantyEndDate?: string;
  notes?: string;
}

export interface HeatmapAsset {
  assetId: number;
  assetName: string;
  channelName?: string;
  roomName?: string;
  temperature?: number;
  cpuUsage?: number;
  gpuUsage?: number;
  powerConsumption?: number;
  isOnline: boolean;
  lastMonitoringTime?: string;
}

export interface MonitoringAsset extends Partial<AssetMonitoring> {
  assetId: number;
  assetName: string;
  assetCode?: string;
  groupName?: string;
  groupType?: string;
  channelName?: string;
  _alerts: number;
  _cpuHist: number[];
  _lastUpdated?: Date;
  _lastSeen?: Date | null;
}

export interface UserFormBody {
  email: string;
  fullName: string;
  role: string;
  channelId: number | null;
  phone?: string;
  department?: string;
  isActive: number;
  username?: string;
  password?: string;
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  total?: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DashboardKPI {
  totalAssets: number;
  activeAssets: number;
  maintenanceAssets: number;
  faultyAssets: number;
  criticalAlerts: number;
  totalAlerts: number;
  totalGroups: number;
}

export interface AlertStats {
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  totalUnresolved: number;
}

export interface ChannelStats {
  totalAssets: number;
  activeAssets: number;
  maintenanceAssets: number;
  offlineAssets: number;
  totalGroups: number;
  avgTemperature: number;
  totalPowerConsumption: number;
  avgPerformanceScore: number;
}

export interface License {
  licenseId: number;
  assetId: number;
  assetName?: string;
  assetCode?: string;
  channelName?: string;
  applicationName: string;
  licenseKey?: string;
  licenseType?: string;
  vendor?: string;
  description?: string;
  featureFlags?: string;
  externalLicenseUrl?: string;
  macId?: string;
  purchaseDate?: string;
  expiryDate?: string;
  daysLeft?: number;
  maxUsers?: number;
  notes?: string;
  isActive: boolean;
  createdDate: string;
}

// ============================================================
// TREE NODE TYPE — yeni hiyerarşi
// ============================================================

export interface TreeNode {
  id: string;
  label: string;
  type: 'holding' | 'channel' | 'assetgroup' | 'asset' | 'component';
  data: Holding | Channel | AssetGroup | Asset | AssetComponent;
  children?: TreeNode[];
  isLoading?: boolean;
  isExpanded?: boolean;
}

// Hiyerarşik yol (C# HiyerarşikYol karşılığı)
export interface HierarchicalPath {
  holdingId?: number;
  channelId?: number;
  assetGroupId?: number;
  assetId?: number;
  componentId?: number;
}

// ============================================================
// AUTH
// ============================================================

export interface AuthUser {
  userId: number;
  username: string;
  email: string;
  fullName: string;
  role: 'Admin' | 'Manager' | 'Technician' | 'Viewer';
  channelId?: number;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface LicenseRequest {
  requestId: number;
  assetId: number;
  assetName?: string;
  requestedBy: number;
  requesterName?: string;
  licenseType: string;
  quantity: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: number;
  reviewerName?: string;
  reviewedAt?: string;
  reviewNote?: string;
  createdAt: string;
  updatedAt: string;
}
