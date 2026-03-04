import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronRight, ChevronDown, Layers, Server, Cpu,
  Wifi, HardDrive, Monitor, Thermometer, Zap, Activity,
  Calendar, DollarSign, Shield, Clock, Package
} from 'lucide-react';
import { channelApi, assetGroupApi, assetApi, componentApi, monitoringApi, maintenanceApi } from '@/api/client';
import { cn, statusBg, tempColor, usageColor, formatCurrency, formatDate, formatDateTime, assetTypeLabel, formatUptime, statusLabel, maintenanceStatusLabel } from '@/lib/utils';
import type { Channel, AssetGroup, Asset, AssetComponent, AssetMonitoring, MaintenanceRecord } from '@/types';

// ─── Group type colors ────────────────────────────────────────
const groupTypeConfig: Record<string, { color: string; dot: string }> = {
  Playout:      { color: 'text-blue-400',   dot: 'bg-blue-400'   },
  Encoding:     { color: 'text-green-400',  dot: 'bg-green-400'  },
  Transmission: { color: 'text-amber-400',  dot: 'bg-amber-400'  },
  Archive:      { color: 'text-purple-400', dot: 'bg-purple-400' },
  Storage:      { color: 'text-cyan-400',   dot: 'bg-cyan-400'   },
  General:      { color: 'text-gray-400',   dot: 'bg-gray-400'   },
};

// ─── Asset type icon ─────────────────────────────────────────
function AssetTypeIcon({ type, size = 14 }: { type: string; size?: number }) {
  const icons: Record<string, any> = {
    GPU: Cpu, DisplayCard: Monitor, Server, Disk: HardDrive, Network: Wifi,
  };
  const Icon = icons[type] ?? Server;
  return <Icon size={size} />;
}

// ─── Tree Node component ──────────────────────────────────────
interface TreeItemProps {
  label: string;
  icon: React.ReactNode;
  isExpanded: boolean;
  isSelected: boolean;
  hasChildren: boolean;
  onToggle: () => void;
  onSelect: () => void;
  level: number;
  badge?: number;
  status?: string;
  labelColor?: string;
}

function TreeItem({ label, icon, isExpanded, isSelected, hasChildren, onToggle, onSelect, level, badge, status, labelColor }: TreeItemProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer transition-all text-xs group',
        'hover:bg-[#131C2E]',
        isSelected ? 'bg-amber-500/10 text-amber-400 border border-amber-500/15' : 'text-[#E2EAF4]'
      )}
      style={{ paddingLeft: `${level * 12 + 8}px` }}
      onClick={() => {
        onSelect();
        if (hasChildren) onToggle();
      }}
    >
      {hasChildren ? (
        <button
          onClick={e => { e.stopPropagation(); onToggle(); }}
          className="text-[#6B84A3] hover:text-[#E2EAF4] transition-colors flex-shrink-0 w-3"
        >
          {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        </button>
      ) : (
        <span className="w-3 flex-shrink-0" />
      )}
      <span className={cn('flex-shrink-0', isSelected ? 'text-amber-400' : (labelColor ?? 'text-[#6B84A3]'))}>
        {icon}
      </span>
      <span className={cn('flex-1 truncate text-[11px]', labelColor && !isSelected && labelColor)}>{label}</span>
      {status && (
        <span className={cn(
          'w-1.5 h-1.5 rounded-full flex-shrink-0',
          status === 'Active' ? 'bg-green-400' :
            status === 'Maintenance' ? 'bg-amber-400' :
              status === 'Faulty' ? 'bg-red-400' : 'bg-[#3D5275]'
        )} />
      )}
      {badge != null && badge > 0 && (
        <span className="text-[9px] font-mono-val px-1.5 py-0.5 rounded bg-[#1E2D45] text-[#6B84A3]">{badge}</span>
      )}
    </div>
  );
}

// ─── Detail Tab Panel ─────────────────────────────────────────
function TabPanel({ children, active }: { children: React.ReactNode; active: boolean }) {
  if (!active) return null;
  return <div className="fade-in-up">{children}</div>;
}

function InfoRow({ label, value, mono = false }: { label: string; value?: string | number | null; mono?: boolean }) {
  return (
    <div className="flex items-start gap-2 py-2 border-b border-[#131C2E]">
      <span className="text-[10px] text-[#6B84A3] uppercase tracking-wider font-mono-val w-32 flex-shrink-0 pt-0.5">{label}</span>
      <span className={cn('text-xs text-[#E2EAF4] flex-1', mono && 'font-mono-val')}>{value ?? '-'}</span>
    </div>
  );
}

// ─── Assets Page ──────────────────────────────────────────────
type Selection =
  | { type: 'channel'; id: number }
  | { type: 'assetgroup'; id: number }
  | { type: 'asset'; id: number }
  | null;

export function Assets() {
  const [expandedChannels, setExpandedChannels]  = useState<Set<number>>(new Set());
  const [expandedGroups, setExpandedGroups]       = useState<Set<number>>(new Set());
  const [selection, setSelection]                 = useState<Selection>(null);
  const [tab, setTab]                             = useState(0);

  // Channels
  const { data: channelsData } = useQuery({
    queryKey: ['channels'],
    queryFn: () => channelApi.getAll(),
  });

  // AssetGroups — load all, filter client-side
  const { data: groupsData } = useQuery({
    queryKey: ['assetgroups-all'],
    queryFn: () => assetGroupApi.getAll(),
    enabled: (channelsData?.data?.data?.length ?? 0) > 0,
  });

  // All assets
  const { data: assetsData } = useQuery({
    queryKey: ['assets-tree'],
    queryFn: () => assetApi.getAll({ limit: 500 }),
  });

  // Selected asset detail
  const selectedAssetId = selection?.type === 'asset' ? selection.id : undefined;

  const { data: assetDetailData } = useQuery({
    queryKey: ['asset-detail', selectedAssetId],
    queryFn: () => assetApi.getById(selectedAssetId!),
    enabled: !!selectedAssetId,
  });

  const { data: monitoringData } = useQuery({
    queryKey: ['monitoring-current', selectedAssetId],
    queryFn: () => monitoringApi.getCurrent(selectedAssetId!),
    enabled: !!selectedAssetId,
    refetchInterval: 10000,
  });

  const { data: maintenanceData } = useQuery({
    queryKey: ['maintenance-asset', selectedAssetId],
    queryFn: () => maintenanceApi.getByAsset(selectedAssetId!),
    enabled: !!selectedAssetId,
  });

  const { data: componentsData } = useQuery({
    queryKey: ['components-asset', selectedAssetId],
    queryFn: () => componentApi.getByAsset(selectedAssetId!),
    enabled: !!selectedAssetId,
  });

  const channels: Channel[]         = channelsData?.data?.data ?? [];
  const allGroups: AssetGroup[]     = groupsData?.data?.data ?? [];
  const allAssets: Asset[]          = assetsData?.data?.data ?? [];
  const selectedAsset: Asset        = assetDetailData?.data?.data;
  const monitoring: AssetMonitoring = monitoringData?.data?.data;
  const maintenanceList: MaintenanceRecord[] = maintenanceData?.data?.data ?? [];
  const componentList: AssetComponent[]      = componentsData?.data?.data ?? [];

  const groupsForChannel   = (cid: number) => allGroups.filter(g => g.ChannelID === cid);
  const assetsForGroup     = (gid: number) => allAssets.filter(a => a.AssetGroupID === gid);

  const TABS = ['Genel Bilgiler', 'Canlı Durum', 'Bakım', 'İstatistik', 'Eklentiler'];

  return (
    <div className="flex gap-3 h-[calc(100vh-8rem)]">
      {/* Tree view */}
      <div className="w-64 flex-shrink-0 card overflow-y-auto">
        <div className="p-3 border-b border-[#1E2D45]">
          <p className="text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val">Varlık Hiyerarşisi</p>
          <p className="text-[9px] text-[#3D5275] font-mono-val mt-0.5">Kanal → Grup → Varlık</p>
        </div>
        <div className="p-1.5 space-y-0.5">
          {channels.map(channel => {
            const groups = groupsForChannel(channel.ChannelID);
            return (
              <div key={channel.ChannelID}>
                <TreeItem
                  label={channel.ChannelName}
                  icon={<Layers size={11} />}
                  isExpanded={expandedChannels.has(channel.ChannelID)}
                  isSelected={selection?.type === 'channel' && selection.id === channel.ChannelID}
                  hasChildren={groups.length > 0}
                  onToggle={() => setExpandedChannels(s => {
                    const n = new Set(s);
                    n.has(channel.ChannelID) ? n.delete(channel.ChannelID) : n.add(channel.ChannelID);
                    return n;
                  })}
                  onSelect={() => { setSelection({ type: 'channel', id: channel.ChannelID }); setTab(0); }}
                  level={0}
                  badge={channel.AssetCount ?? 0}
                />

                {expandedChannels.has(channel.ChannelID) && groups.map(group => {
                  const cfg = groupTypeConfig[group.GroupType] ?? groupTypeConfig.General;
                  const assets = assetsForGroup(group.AssetGroupID);
                  return (
                    <div key={group.AssetGroupID}>
                      <TreeItem
                        label={`${group.GroupName}`}
                        icon={<span className={cn('w-2 h-2 rounded-sm inline-block', cfg.dot.replace('bg-', 'bg-').replace('-400', '-400'))} />}
                        isExpanded={expandedGroups.has(group.AssetGroupID)}
                        isSelected={selection?.type === 'assetgroup' && selection.id === group.AssetGroupID}
                        hasChildren={assets.length > 0}
                        onToggle={() => setExpandedGroups(s => {
                          const n = new Set(s);
                          n.has(group.AssetGroupID) ? n.delete(group.AssetGroupID) : n.add(group.AssetGroupID);
                          return n;
                        })}
                        onSelect={() => { setSelection({ type: 'assetgroup', id: group.AssetGroupID }); setTab(0); }}
                        level={1}
                        badge={assets.length}
                        labelColor={cfg.color}
                      />

                      {expandedGroups.has(group.AssetGroupID) && assets.map(asset => (
                        <TreeItem
                          key={asset.AssetID}
                          label={asset.AssetName}
                          icon={<AssetTypeIcon type={asset.AssetType} size={10} />}
                          isExpanded={false}
                          isSelected={selection?.type === 'asset' && selection.id === asset.AssetID}
                          hasChildren={false}
                          onToggle={() => {}}
                          onSelect={() => { setSelection({ type: 'asset', id: asset.AssetID }); setTab(0); }}
                          level={2}
                          status={asset.Status}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail panel */}
      <div className="flex-1 min-w-0 card overflow-y-auto">
        {!selection ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Server size={40} className="text-[#1E2D45] mb-4" />
            <p className="text-sm text-[#3D5275] font-mono-val">Sol menüden bir varlık seçin</p>
          </div>
        ) : selection.type === 'asset' && selectedAsset ? (
          <div className="p-4">
            {/* Asset header */}
            <div className="flex items-start gap-4 mb-4 pb-4 border-b border-[#1E2D45]">
              <div className="w-12 h-12 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
                <AssetTypeIcon type={selectedAsset.AssetType} size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-display font-bold text-lg text-white">{selectedAsset.AssetName}</h2>
                  <span className={cn('text-[10px] px-2 py-0.5 rounded border font-mono-val', statusBg(selectedAsset.Status))}>
                    {statusLabel(selectedAsset.Status)}
                  </span>
                  {monitoring && (
                    <span className={cn(
                      'w-2 h-2 rounded-full',
                      monitoring.IsOnline ? 'bg-green-400 pulse-dot' : 'bg-red-400'
                    )} />
                  )}
                </div>
                <p className="text-xs text-[#6B84A3] mt-1 font-mono-val">
                  {selectedAsset.ChannelName}
                  {selectedAsset.GroupName && (
                    <> › <span className={cn(groupTypeConfig[selectedAsset.GroupType ?? '']?.color ?? 'text-[#6B84A3]')}>
                      {selectedAsset.GroupName}
                    </span></>
                  )}
                </p>
                {selectedAsset.AssetCode && (
                  <p className="text-[10px] text-amber-400 font-mono-val mt-0.5">{selectedAsset.AssetCode}</p>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 bg-[#131C2E] rounded p-0.5 flex-wrap">
              {TABS.map((t, i) => (
                <button
                  key={t}
                  onClick={() => setTab(i)}
                  className={cn(
                    'px-3 py-1.5 rounded text-[11px] font-mono-val transition-all',
                    tab === i
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                      : 'text-[#6B84A3] hover:text-[#E2EAF4]'
                  )}
                >
                  {t}
                  {t === 'Eklentiler' && componentList.length > 0 && (
                    <span className="ml-1 text-[9px] bg-[#1E2D45] px-1 rounded">{componentList.length}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab 0: General */}
            <TabPanel active={tab === 0}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val mb-2">Varlık Bilgileri</p>
                  <InfoRow label="Model" value={selectedAsset.Model} />
                  <InfoRow label="Seri No" value={selectedAsset.SerialNumber} mono />
                  <InfoRow label="Tür" value={assetTypeLabel(selectedAsset.AssetType)} />
                  <InfoRow label="Üretici" value={selectedAsset.Manufacturer} />
                  <InfoRow label="Tedarikçi" value={selectedAsset.Supplier} />
                  <InfoRow label="IP Adresi" value={selectedAsset.IPAddress} mono />
                  <InfoRow label="MAC Adresi" value={selectedAsset.MACAddress} mono />
                  <InfoRow label="Firmware" value={selectedAsset.FirmwareVersion} mono />
                  <InfoRow label="Rack Pozisyon" value={selectedAsset.RackPosition} mono />
                </div>
                <div>
                  <p className="text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val mb-2">Mali Bilgiler</p>
                  <InfoRow label="Satın Alma" value={formatDate(selectedAsset.PurchaseDate ?? undefined)} />
                  <InfoRow label="Garanti Bitiş" value={formatDate(selectedAsset.WarrantyEndDate ?? undefined)} />
                  <InfoRow label="Maliyet" value={formatCurrency(selectedAsset.PurchaseCost ?? undefined)} />
                  <InfoRow label="Güncel Değer" value={formatCurrency(selectedAsset.CurrentValue ?? undefined)} />
                  <InfoRow label="Amortisman" value={selectedAsset.DepreciationRate != null ? `%${selectedAsset.DepreciationRate} / Yıl` : null} />
                  {selectedAsset.Notes && (
                    <div className="mt-3">
                      <p className="text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val mb-1">Notlar</p>
                      <p className="text-xs text-[#E2EAF4] bg-[#131C2E] rounded p-2 leading-relaxed">{selectedAsset.Notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </TabPanel>

            {/* Tab 1: Real-time */}
            <TabPanel active={tab === 1}>
              {monitoring ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Sıcaklık', value: monitoring.Temperature != null ? `${monitoring.Temperature}°C` : '-', icon: Thermometer, color: monitoring.Temperature != null ? tempColor(monitoring.Temperature) : 'text-[#3D5275]' },
                      { label: 'Güç Tüketimi', value: monitoring.PowerConsumption != null ? `${monitoring.PowerConsumption}W` : '-', icon: Zap, color: 'text-amber-400' },
                      { label: 'GPU / CPU', value: monitoring.GPUUsage != null ? `%${Math.round(monitoring.GPUUsage)}` : monitoring.CPUUsage != null ? `%${Math.round(monitoring.CPUUsage)}` : '-', icon: Activity, color: monitoring.GPUUsage != null ? usageColor(monitoring.GPUUsage) : 'text-cyan-400' },
                      { label: 'Bellek', value: monitoring.MemoryUsedGB != null ? `${monitoring.MemoryUsedGB.toFixed(1)}/${monitoring.MemoryTotalGB?.toFixed(0)}GB` : '-', icon: HardDrive, color: 'text-cyan-400' },
                    ].map(({ label, value, icon: Icon, color }) => (
                      <div key={label} className="card p-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Icon size={12} className="text-[#6B84A3]" />
                          <p className="text-[10px] text-[#6B84A3] uppercase tracking-wider font-mono-val">{label}</p>
                        </div>
                        <p className={cn('font-display font-bold text-2xl', color)}>{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <InfoRow label="RAM Kullanım" value={monitoring.RAMUsage != null ? `%${Math.round(monitoring.RAMUsage)}` : null} />
                    <InfoRow label="Disk Kullanım" value={monitoring.DiskUsage != null ? `%${Math.round(monitoring.DiskUsage)}` : null} />
                    <InfoRow label="Fan Hızı" value={monitoring.FanSpeed != null ? `${monitoring.FanSpeed} RPM` : null} mono />
                    <InfoRow label="Uptime" value={formatUptime(monitoring.Uptime ?? undefined)} mono />
                    <InfoRow label="Ağ Gecikmesi" value={monitoring.NetworkLatency != null ? `${monitoring.NetworkLatency}ms` : null} mono />
                    <InfoRow label="Hata Sayısı" value={monitoring.ErrorCount} mono />
                    <InfoRow label="Perf. Skoru" value={monitoring.PerformanceScore != null ? `${monitoring.PerformanceScore.toFixed(1)}/100` : null} />
                    <InfoRow label="Sinyal" value={monitoring.SignalStrength != null ? `${monitoring.SignalStrength}/5` : null} />
                    <InfoRow label="Son Güncelleme" value={formatDateTime(monitoring.MonitoringTime)} />
                  </div>
                </div>
              ) : (
                <p className="text-center text-[#3D5275] text-sm font-mono-val py-12">
                  Monitoring verisi bulunamadı
                </p>
              )}
            </TabPanel>

            {/* Tab 2: Maintenance */}
            <TabPanel active={tab === 2}>
              <div className="space-y-2">
                {maintenanceList.length > 0 ? maintenanceList.map(m => (
                  <div key={m.MaintenanceID} className="card p-3 bg-[#131C2E] border-[#1E2D45]">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'text-[10px] px-2 py-0.5 rounded font-mono-val border',
                            m.Status === 'Completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                              m.Status === 'Scheduled' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                'bg-[#1E2D45] text-[#6B84A3] border-[#1E2D45]'
                          )}>
                            {maintenanceStatusLabel(m.Status)}
                          </span>
                          <span className="text-xs text-[#E2EAF4]">{m.MaintenanceType ?? 'Bakım'}</span>
                        </div>
                        {m.Description && <p className="text-xs text-[#6B84A3] mt-1">{m.Description}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[10px] font-mono-val text-amber-400">{formatDate(m.MaintenanceDate)}</p>
                        {m.TechnicianName && <p className="text-[10px] text-[#6B84A3]">{m.TechnicianName}</p>}
                      </div>
                    </div>
                    {m.NextMaintenanceDate && (
                      <p className="text-[10px] text-[#3D5275] font-mono-val mt-2 flex items-center gap-1">
                        <Calendar size={9} /> Sonraki: {formatDate(m.NextMaintenanceDate)}
                      </p>
                    )}
                  </div>
                )) : (
                  <p className="text-center text-[#3D5275] text-sm font-mono-val py-12">
                    Bakım kaydı bulunamadı
                  </p>
                )}
              </div>
            </TabPanel>

            {/* Tab 3: Stats */}
            <TabPanel active={tab === 3}>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: 'Ort. Kullanım', value: monitoring?.GPUUsage != null ? `%${monitoring.GPUUsage.toFixed(1)}` : '-', icon: Activity },
                  { label: 'Maks Sıcaklık', value: monitoring?.Temperature != null ? `${monitoring.Temperature}°C` : '-', icon: Thermometer },
                  { label: 'Toplam Uptime', value: formatUptime(monitoring?.Uptime ?? undefined), icon: Clock },
                  { label: 'Bakım Sayısı', value: maintenanceList.length, icon: Calendar },
                  { label: 'Toplam Maliyet', value: formatCurrency(selectedAsset.PurchaseCost ?? undefined), icon: DollarSign },
                  { label: 'Garanti Durumu', value: selectedAsset.WarrantyEndDate ? (new Date(selectedAsset.WarrantyEndDate) > new Date() ? 'Aktif' : 'Süresi Doldu') : '-', icon: Shield },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="card p-3 bg-[#131C2E]">
                    <Icon size={12} className="text-[#6B84A3] mb-2" />
                    <p className="font-display font-bold text-xl text-white">{value}</p>
                    <p className="text-[10px] text-[#3D5275] font-mono-val mt-0.5 uppercase tracking-wider">{label}</p>
                  </div>
                ))}
              </div>
            </TabPanel>

            {/* Tab 4: Components (Eklentiler) */}
            <TabPanel active={tab === 4}>
              {componentList.length > 0 ? (
                <div className="space-y-2">
                  {componentList.map(comp => (
                    <div key={comp.ComponentID} className="card p-3 bg-[#131C2E] border-[#1E2D45]">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded bg-[#1E2D45] border border-[#2A3F5F] flex items-center justify-center flex-shrink-0">
                            <Package size={14} className="text-[#6B84A3]" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-[#E2EAF4]">{comp.ComponentName}</p>
                            <p className="text-[10px] text-[#6B84A3] font-mono-val">{comp.ComponentType}</p>
                            {comp.Model && <p className="text-[10px] text-[#3D5275]">{comp.Model}</p>}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className={cn(
                            'text-[10px] px-2 py-0.5 rounded font-mono-val border',
                            comp.Status === 'Active' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                              comp.Status === 'Faulty' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                'bg-[#1E2D45] text-[#6B84A3] border-[#1E2D45]'
                          )}>
                            {comp.Status}
                          </span>
                        </div>
                      </div>
                      {(comp.SerialNumber || comp.Manufacturer) && (
                        <div className="mt-2 pt-2 border-t border-[#1E2D45] grid grid-cols-2 gap-1">
                          {comp.Manufacturer && <p className="text-[10px] text-[#6B84A3]">Üretici: <span className="text-[#E2EAF4]">{comp.Manufacturer}</span></p>}
                          {comp.SerialNumber && <p className="text-[10px] text-[#6B84A3] font-mono-val">S/N: <span className="text-[#E2EAF4]">{comp.SerialNumber}</span></p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Package size={32} className="text-[#1E2D45] mb-3" />
                  <p className="text-sm text-[#3D5275] font-mono-val">Bu varlığa ait eklenti bulunamadı</p>
                </div>
              )}
            </TabPanel>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <Layers size={32} className="text-[#1E2D45] mb-3" />
            <p className="text-sm text-[#3D5275] font-mono-val">
              {selection.type === 'channel' ? 'Kanal seçildi — bir varlık grubu veya varlık seçin' :
                selection.type === 'assetgroup' ? 'Grup seçildi — bir varlık seçin' :
                  'Sol menüden bir varlık seçin'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
