// ============================================================
// CORE ENTITY TYPES
// Hierarchy: Holding -> Channel -> AssetGroup -> Asset -> Component
// ============================================================

export interface Holding {
  HoldingID: number;
  HoldingName: string;
  Description?: string;
  Website?: string;
  ContactEmail?: string;
  LogoUrl?: string;
  CreatedDate: string;
  UpdatedDate?: string;
  IsActive: boolean;
  ChannelCount?: number;
  TotalAssets?: number;
}

export interface Channel {
  ChannelID: number;
  HoldingID?: number;
  HoldingName?: string;
  ChannelName: string;
  Description?: string;
  LogoUrl?: string;
  EstablishedYear?: number;
  ContactEmail?: string;
  ContactPhone?: string;
  Website?: string;
  IsActive: boolean;
  CreatedDate: string;
  AssetCount?: number;
  GroupCount?: number;
}

export type AssetGroupType = 'Playout' | 'Encoding' | 'Transmission' | 'Archive' | 'Storage' | 'General';
export type AssetGroupStatus = 'operational' | 'degraded' | 'failed';

export interface AssetGroup {
  AssetGroupID: number;
  ChannelID: number;
  ChannelName?: string;
  GroupName: string;
  GroupType: AssetGroupType;
  Description?: string;
  Status: AssetGroupStatus;
  CreatedDate: string;
  UpdatedDate?: string;
  IsActive: boolean;
  AssetCount?: number;
  ActiveCount?: number;
  MaintenanceCount?: number;
  FaultyCount?: number;
  // Live monitoring aggregates
  AvgCPU?: number;
  AvgTemperature?: number;
  AvgPower?: number;
}

export type AssetType = 'GPU' | 'DisplayCard' | 'Server' | 'Disk' | 'Network' | 'Encoder' | 'Router';
export type AssetStatus = 'Active' | 'Inactive' | 'Maintenance' | 'Retired' | 'Faulty';

export interface Asset {
  AssetID: number;
  AssetGroupID: number;
  ChannelID: number;
  GroupName?: string;
  GroupType?: AssetGroupType;
  ChannelName?: string;
  HoldingID?: number;
  HoldingName?: string;
  AssetName: string;
  AssetCode?: string;
  AssetType: AssetType;
  Model?: string;
  SerialNumber?: string;
  Manufacturer?: string;
  Supplier?: string;
  PurchaseDate?: string;
  WarrantyEndDate?: string;
  WarrantyMonths?: number;
  PurchaseCost?: number;
  CurrentValue?: number;
  DepreciationRate?: number;
  RackPosition?: string;
  IPAddress?: string;
  MACAddress?: string;
  FirmwareVersion?: string;
  DriverVersion?: string;
  Status: AssetStatus;
  ImageUrl?: string;
  Notes?: string;
  CreatedDate: string;
  UpdatedDate: string;
  IsActive: boolean;
  // From monitoring join
  LastTemperature?: number;
  LastPowerConsumption?: number;
  IsOnline?: boolean;
}

export type ComponentType = 'GPU' | 'RAM' | 'NIC' | 'Storage' | 'PSU' | 'Cooling' | 'HDD' | 'SSD';
export type ComponentStatus = 'Active' | 'Faulty' | 'Replaced';

export interface AssetComponent {
  ComponentID: number;
  AssetID: number;
  AssetGroupID: number;
  ChannelID: number;
  AssetName?: string;
  GroupName?: string;
  GroupType?: AssetGroupType;
  ChannelName?: string;
  ComponentName: string;
  ComponentType: ComponentType;
  Model?: string;
  SerialNumber?: string;
  Manufacturer?: string;
  Specifications?: string; // JSON
  PurchaseDate?: string;
  WarrantyEndDate?: string;
  Status: ComponentStatus;
  Notes?: string;
  CreatedDate: string;
  UpdatedDate?: string;
  IsActive: boolean;
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
  MonitoringID: number;
  AssetID: number;
  AssetName?: string;
  AssetType?: string;
  Status?: string;
  GroupName?: string;
  GroupType?: string;
  ChannelName?: string;
  MonitoringTime: string;
  CPUUsage?: number;
  RAMUsage?: number;
  DiskUsage?: number;
  GPUUsage?: number;
  Temperature?: number;
  CPUTemperature?: number;
  PowerConsumption?: number;
  FanSpeed?: number;
  MemoryUsedGB?: number;
  MemoryTotalGB?: number;
  NetworkInMbps?: number;
  NetworkOutMbps?: number;
  NetworkLatency?: number;
  Uptime?: number;
  IsOnline: boolean;
  ErrorCount?: number;
  PerformanceScore?: number;
  SignalStrength?: number;
}

export interface MaintenanceRecord {
  MaintenanceID: number;
  AssetID: number;
  AssetName?: string;
  AssetCode?: string;
  MaintenanceDate: string;
  MaintenanceType?: string;
  Description?: string;
  TechnicianName?: string;
  TechnicianEmail?: string;
  CostAmount?: number;
  Status: 'Completed' | 'Pending' | 'Scheduled' | 'Cancelled';
  NextMaintenanceDate?: string;
  MaintenanceInterval?: number;
  DocumentURL?: string;
  Notes?: string;
  CreatedDate: string;
}

export type AlertType = 'Critical' | 'Warning' | 'Info';

export interface Alert {
  AlertID: number;
  AssetID?: number;
  AssetName?: string;
  AssetCode?: string;
  ChannelName?: string;
  GroupName?: string;
  GroupType?: string;
  AlertType: AlertType;
  AlertCategory?: string;
  AlertMessage: string;
  AlertSeverity: number;
  ThresholdValue?: number;
  CurrentValue?: number;
  TriggeredTime: string;
  ResolvedTime?: string;
  IsResolved: boolean;
  IsNotified: boolean;
  ResolutionNotes?: string;
}

export interface User {
  UserID: number;
  Username: string;
  Email: string;
  FullName: string;
  Role: 'Admin' | 'Manager' | 'Technician' | 'Viewer';
  ChannelID?: number;
  ChannelName?: string;
  Phone?: string;
  Department?: string;
  IsActive: boolean;
  LastLogin?: string;
  CreatedDate: string;
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
  TotalAssets: number;
  ActiveAssets: number;
  MaintenanceAssets: number;
  FaultyAssets: number;
  CriticalAlerts: number;
  TotalAlerts: number;
  TotalGroups: number;
}

export interface AlertStats {
  CriticalCount: number;
  WarningCount: number;
  InfoCount: number;
  TotalUnresolved: number;
}

export interface ChannelStats {
  TotalAssets: number;
  ActiveAssets: number;
  MaintenanceAssets: number;
  OfflineAssets: number;
  TotalGroups: number;
  AvgTemperature: number;
  TotalPowerConsumption: number;
  AvgPerformanceScore: number;
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
