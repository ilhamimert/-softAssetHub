import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  ArrowLeft, Server, Activity, Wrench, AlertCircle, AlertTriangle, Info,
  Wifi, WifiOff, Thermometer, Zap, DollarSign, User, Clock,
  CheckCircle, MapPin, Tag, KeyRound, Plus, X, Edit2, Trash2, Copy,
} from 'lucide-react';
import { assetApi, monitoringApi, maintenanceApi, alertApi, licenseApi } from '@/api/client';
import {
  cn, formatDate, formatCurrency, formatDateTime, timeAgo,
  statusBg, statusLabel, tempColor, maintenanceStatusLabel,
} from '@/lib/utils';
import type { MaintenanceRecord, Alert, License } from '@/types';

// ── Sabitler ───────────────────────────────────────────────────────────────────
const FEATURE_FLAGS = ['GPI', 'VTR CONTROL', 'A/B', 'LORES', 'DEV VIZ', 'SHOT BOX', 'LGOP', 'HD', 'UHD'] as const;

// ── Küçük yardımcılar ──────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex gap-3 py-2 border-b border-[#1E2D45] last:border-0">
      <span className="w-36 flex-shrink-0 text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val">{label}</span>
      <span className="text-xs text-[#E2EAF4] font-mono-val break-all">{String(value)}</span>
    </div>
  );
}

function MetricBar({ label, value, unit = '%', max = 100 }: {
  label: string; value?: number | null; unit?: string; max?: number;
}) {
  const pct = value != null ? Math.min((value / max) * 100, 100) : 0;
  const bar = pct >= 90 ? 'bg-red-500' : 'bg-indigo-500/70';
  const text = pct >= 90 ? 'text-red-400' : pct >= 75 ? 'text-amber-400' : 'text-slate-300';
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-[10px] text-[#6B84A3] font-mono-val uppercase tracking-wider">{label}</span>
        <span className={cn('text-xs font-mono-val font-semibold', value != null ? text : 'text-[#3D5275]')}>
          {value != null ? `${value.toFixed(1)}${unit}` : '—'}
        </span>
      </div>
      <div className="h-1.5 bg-[#1E2D45] rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500', bar)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function expiryColor(dateStr?: string | null) {
  if (!dateStr) return 'text-[#6B84A3]';
  const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (days < 0) return 'text-red-400';
  if (days <= 7) return 'text-red-400';
  if (days <= 60) return 'text-amber-400';
  return 'text-green-400';
}

function expiryLabel(dateStr?: string | null) {
  if (!dateStr) return null;
  const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (days < 0) return `${Math.abs(days)} gün önce sona erdi`;
  if (days === 0) return 'Bugün sona eriyor';
  if (days <= 60) return `${days} gün kaldı`;
  return formatDate(dateStr);
}

const CHART_STYLE = {
  contentStyle: { background: '#0D1421', border: '1px solid #1E2D45', borderRadius: 6, fontSize: 11, fontFamily: 'JetBrains Mono' },
  tickStyle: { fill: '#3D5275', fontSize: 9, fontFamily: 'JetBrains Mono' },
};

const TABS = [
  { key: 'overview', label: 'Genel Bakış', Icon: Server },
  { key: 'monitoring', label: 'Monitoring', Icon: Activity },
  { key: 'maintenance', label: 'Bakım', Icon: Wrench },
  { key: 'alerts', label: 'Uyarılar', Icon: AlertCircle },
  { key: 'licenses', label: 'Lisanslar', Icon: KeyRound },
] as const;
type Tab = typeof TABS[number]['key'];

// ── Lisans formu başlangıç değerleri ──────────────────────────────────────────
const EMPTY_FORM = {
  applicationName: '',
  licenseKey: '',
  macId: '',
  expiryDate: '',
  featureFlags: [] as string[],
  description: '',
  externalLicenseUrl: '',
};

// ── Ana Bileşen ────────────────────────────────────────────────────────────────
export function AssetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('overview');
  const assetId = parseInt(id ?? '0');

  // Lisans modal state
  const [licenseModal, setLicenseModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [copyMsg, setCopyMsg] = useState<number | null>(null); // licenseId

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: assetRes, isLoading } = useQuery({
    queryKey: ['asset', assetId],
    queryFn: () => assetApi.getById(assetId),
    enabled: assetId > 0,
  });

  const { data: histRes } = useQuery({
    queryKey: ['monitoring-history', assetId],
    queryFn: () => monitoringApi.getHistory(assetId, { limit: 48 }),
    enabled: assetId > 0 && tab === 'monitoring',
    refetchInterval: 60000,
  });

  const { data: maintRes } = useQuery({
    queryKey: ['maintenance-asset', assetId],
    queryFn: () => maintenanceApi.getByAsset(assetId),
    enabled: assetId > 0 && tab === 'maintenance',
  });

  const { data: alertsRes } = useQuery({
    queryKey: ['alerts-asset', assetId],
    queryFn: () => alertApi.getAll({ assetId, limit: 50 }),
    enabled: assetId > 0 && tab === 'alerts',
  });

  const { data: licensesRes } = useQuery({
    queryKey: ['licenses', assetId],
    queryFn: () => licenseApi.getByAsset(assetId),
    enabled: assetId > 0 && tab === 'licenses',
  });

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const invalidateLicenses = () => qc.invalidateQueries({ queryKey: ['licenses', assetId] });

  const createLicense = useMutation({
    mutationFn: (data: object) => licenseApi.create(data),
    onSuccess: () => { invalidateLicenses(); closeModal(); },
  });

  const updateLicense = useMutation({
    mutationFn: ({ lid, data }: { lid: number; data: object }) => licenseApi.update(lid, data),
    onSuccess: () => { invalidateLicenses(); closeModal(); },
  });

  const deleteLicense = useMutation({
    mutationFn: (lid: number) => licenseApi.delete(lid),
    onSuccess: invalidateLicenses,
  });

  // ── Modal helpers ─────────────────────────────────────────────────────────────
  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, macId: asset?.macAddress ?? '' });
    setLicenseModal(true);
  }

  function openEdit(lic: License) {
    setEditingId(lic.licenseId);
    setForm({
      applicationName: lic.applicationName ?? '',
      licenseKey: lic.licenseKey ?? '',
      macId: lic.macId ?? '',
      expiryDate: lic.expiryDate ? lic.expiryDate.split('T')[0] : '',
      featureFlags: lic.featureFlags ? JSON.parse(lic.featureFlags) : [],
      description: lic.description ?? '',
      externalLicenseUrl: lic.externalLicenseUrl ?? '',
    });
    setLicenseModal(true);
  }

  function closeModal() {
    setLicenseModal(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
  }

  function toggleFlag(flag: string) {
    setForm(f => ({
      ...f,
      featureFlags: f.featureFlags.includes(flag)
        ? f.featureFlags.filter(x => x !== flag)
        : [...f.featureFlags, flag],
    }));
  }

  function submitLicense(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      assetId,
      applicationName: form.applicationName,
      licenseKey: form.licenseKey || undefined,
      macId: form.macId || undefined,
      expiryDate: form.expiryDate || undefined,
      featureFlags: form.featureFlags.length > 0 ? form.featureFlags : undefined,
      description: form.description || undefined,
      externalLicenseUrl: form.externalLicenseUrl || undefined,
    };
    if (editingId) {
      updateLicense.mutate({ lid: editingId, data: payload });
    } else {
      createLicense.mutate(payload);
    }
  }

  function copyKey(lic: License) {
    navigator.clipboard.writeText(lic.licenseKey ?? '').then(() => {
      setCopyMsg(lic.licenseId);
      setTimeout(() => setCopyMsg(null), 1500);
    });
  }

  // ── Data ──────────────────────────────────────────────────────────────────────
  const asset = assetRes?.data?.data;
  const history = [...(histRes?.data?.data ?? [])].reverse();
  const records: MaintenanceRecord[] = maintRes?.data?.data ?? [];
  const assetAlerts: Alert[] = alertsRes?.data?.data ?? [];
  const licenses: License[] = licensesRes?.data?.data ?? [];
  const isOnline = asset?.isOnline === true || asset?.isOnline === 1;
  const hasMonitoring = asset?.cpuUsage != null || asset?.temperature != null;

  // ── Loading / 404 ─────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-4 fade-in-up">
        <div className="h-32 card animate-pulse" />
        <div className="h-12 card animate-pulse" />
        <div className="h-64 card animate-pulse" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="card p-16 text-center">
        <Server size={36} className="text-[#1E2D45] mx-auto mb-3" />
        <p className="text-sm text-[#3D5275] font-mono-val mb-4">Varlık bulunamadı</p>
        <button onClick={() => navigate(-1)} className="text-xs text-amber-400 hover:underline font-mono-val">← Geri dön</button>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 fade-in-up">

      {/* ── Başlık kartı ──────────────────────────────────────────────────────── */}
      <div className="card p-4 space-y-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex-shrink-0 p-1.5 rounded text-[#6B84A3] hover:text-[#E2EAF4] hover:bg-[#1E2D45] transition-colors mt-0.5"
          >
            <ArrowLeft size={15} />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-display font-bold text-white">{asset.assetName}</h1>
              <span className={cn('text-[10px] px-2 py-0.5 rounded font-mono-val border', statusBg(asset.status))}>
                {statusLabel(asset.status)}
              </span>
              <span className={cn(
                'flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-mono-val border',
                hasMonitoring
                  ? isOnline
                    ? 'text-green-400 bg-green-500/10 border-green-500/20'
                    : 'text-red-400 bg-red-500/10 border-red-500/20'
                  : 'text-[#6B84A3] bg-[#1E2D45] border-[#1E2D45]'
              )}>
                {hasMonitoring ? (isOnline ? <Wifi size={9} /> : <WifiOff size={9} />) : null}
                {hasMonitoring ? (isOnline ? 'ONLİNE' : 'OFFLİNE') : 'VERİ YOK'}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {asset.assetCode && (
                <span className="flex items-center gap-1 text-[10px] text-cyan-400 font-mono-val">
                  <Tag size={9} />{asset.assetCode}
                </span>
              )}
              {(asset.channelName || asset.buildingName || asset.roomName) && (
                <span className="flex items-center gap-1 text-[10px] text-[#6B84A3] font-mono-val">
                  <MapPin size={9} />
                  {[asset.channelName, asset.buildingName, asset.roomName].filter(Boolean).join(' · ')}
                </span>
              )}
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1E2D45] text-[#6B84A3] font-mono-val border border-[#253550]">
                {asset.assetType}
              </span>
            </div>
          </div>
        </div>

        {/* Canlı metrik çubukları */}
        {hasMonitoring && isOnline && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-[#1E2D45]">
            <MetricBar label="CPU" value={asset.cpuUsage} />
            <MetricBar label="RAM" value={asset.ramUsage} />
            <MetricBar label="GPU" value={asset.gpuUsage} />
            <MetricBar label="Disk" value={asset.diskUsage} />
          </div>
        )}

        {/* Sıcaklık + Güç satırı */}
        {hasMonitoring && (
          <div className="flex gap-6 pt-1">
            {asset.temperature != null && (
              <span className="flex items-center gap-1.5 text-sm">
                <Thermometer size={13} className="text-[#6B84A3]" />
                <span className={cn('font-mono-val font-semibold', tempColor(asset.temperature))}>
                  {asset.temperature}°C
                </span>
              </span>
            )}
            {asset.powerConsumption != null && (
              <span className="flex items-center gap-1.5 text-sm">
                <Zap size={13} className="text-amber-400/60" />
                <span className="font-mono-val font-semibold text-amber-400">{asset.powerConsumption}W</span>
              </span>
            )}
            {asset.lastMonitoringTime && (
              <span className="flex items-center gap-1.5 text-[10px] text-[#3D5275] font-mono-val ml-auto">
                <Clock size={9} />Son: {timeAgo(asset.lastMonitoringTime)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Sekmeler ──────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-[#0D1421] rounded-lg p-1 border border-[#1E2D45]">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center justify-center gap-1.5 px-3 py-2 rounded text-xs font-mono-val transition-all flex-1',
              tab === key
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                : 'text-[#6B84A3] hover:text-[#E2EAF4]'
            )}
          >
            <Icon size={12} />{label}
          </button>
        ))}
      </div>

      {/* ── Genel Bakış ───────────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card p-4">
            <p className="text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val mb-3">Cihaz Bilgileri</p>
            <InfoRow label="Varlık Adı" value={asset.assetName} />
            <InfoRow label="Kod" value={asset.assetCode} />
            <InfoRow label="Tür" value={asset.assetType} />
            <InfoRow label="Seri No" value={asset.serialNumber} />
            <InfoRow label="Model" value={asset.model} />
            <InfoRow label="Üretici" value={asset.manufacturer} />
            <InfoRow label="IP Adresi" value={asset.ipAddress} />
            <InfoRow label="MAC Adresi" value={asset.macAddress} />
            <InfoRow label="Yazılım Ver." value={asset.softwareVersion} />
            <InfoRow label="Firmware Ver." value={asset.firmwareVersion} />
          </div>

          <div className="space-y-4">
            <div className="card p-4">
              <p className="text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val mb-3">Konum</p>
              <InfoRow label="Holding" value={asset.holdingName} />
              <InfoRow label="Kanal" value={asset.channelName} />
              <InfoRow label="Bina" value={asset.buildingName} />
              <InfoRow label="Oda" value={asset.roomName} />
              <InfoRow label="Grup" value={asset.groupName} />
            </div>
            <div className="card p-4">
              <p className="text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val mb-3">Finansal / Tarih</p>
              <InfoRow label="Alış Tarihi" value={formatDate(asset.purchaseDate)} />
              <InfoRow label="Alış Maliyeti" value={asset.purchaseCost ? formatCurrency(asset.purchaseCost) : null} />
              <InfoRow label="Güncel Değer" value={asset.currentValue ? formatCurrency(asset.currentValue) : null} />
              <InfoRow label="Garanti Bitiş" value={formatDate(asset.warrantyEndDate)} />
              <InfoRow label="Tedarikçi" value={asset.supplier} />
              <InfoRow label="Eklenme" value={formatDateTime(asset.createdDate)} />
            </div>
          </div>
        </div>
      )}

      {/* ── Monitoring ────────────────────────────────────────────────────────── */}
      {tab === 'monitoring' && (
        <div className="space-y-4">
          {history.length > 0 ? (
            <>
              <div className="card p-4">
                <p className="text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val mb-3">
                  CPU Kullanımı — Son {history.length} Kayıt
                </p>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={history} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E2D45" />
                    <XAxis dataKey="monitoringTime"
                      tickFormatter={(v) => new Date(v).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      tick={CHART_STYLE.tickStyle} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} tick={CHART_STYLE.tickStyle} tickLine={false} axisLine={false} />
                    <Tooltip {...CHART_STYLE.contentStyle && { contentStyle: CHART_STYLE.contentStyle }}
                      formatter={(v: number | string | undefined) => [`${Number(v ?? 0).toFixed(1)}%`, 'CPU']}
                      labelFormatter={(l) => new Date(l).toLocaleString('tr-TR')} />
                    <Line type="monotone" dataKey="cpuUsage" stroke="#22D3EE" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="card p-4">
                  <p className="text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val mb-3">Sıcaklık (°C)</p>
                  <ResponsiveContainer width="100%" height={140}>
                    <LineChart data={history} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E2D45" />
                      <XAxis dataKey="monitoringTime"
                        tickFormatter={(v) => new Date(v).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        tick={CHART_STYLE.tickStyle} tickLine={false} axisLine={false} />
                      <YAxis tick={CHART_STYLE.tickStyle} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={CHART_STYLE.contentStyle}
                        formatter={(v: number | string | undefined) => [`${Number(v ?? 0).toFixed(1)}°C`, 'Sıcaklık']}
                        labelFormatter={(l) => new Date(l).toLocaleString('tr-TR')} />
                      <Line type="monotone" dataKey="temperature" stroke="#F59E0B" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="card p-4">
                  <p className="text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val mb-3">Güç Tüketimi (W)</p>
                  <ResponsiveContainer width="100%" height={140}>
                    <LineChart data={history} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E2D45" />
                      <XAxis dataKey="monitoringTime"
                        tickFormatter={(v) => new Date(v).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        tick={CHART_STYLE.tickStyle} tickLine={false} axisLine={false} />
                      <YAxis tick={CHART_STYLE.tickStyle} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={CHART_STYLE.contentStyle}
                        formatter={(v: number | string | undefined) => [`${Number(v ?? 0).toFixed(0)}W`, 'Güç']}
                        labelFormatter={(l) => new Date(l).toLocaleString('tr-TR')} />
                      <Line type="monotone" dataKey="powerConsumption" stroke="#10B981" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          ) : (
            <div className="card p-16 text-center">
              <Activity size={32} className="text-[#1E2D45] mx-auto mb-3" />
              <p className="text-sm text-[#3D5275] font-mono-val">Monitoring verisi yok</p>
            </div>
          )}
        </div>
      )}

      {/* ── Bakım Kayıtları ───────────────────────────────────────────────────── */}
      {tab === 'maintenance' && (
        <div className="card overflow-hidden">
          {records.length > 0 ? (
            <div className="divide-y divide-[#1E2D45]">
              {records.map(r => (
                <div key={r.maintenanceId} className="p-3 hover:bg-[#131C2E] transition-colors">
                  <div className="flex items-start gap-3">
                    <span className={cn(
                      'flex-shrink-0 text-[10px] font-mono-val px-2 py-1 rounded border',
                      r.status === 'Completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        r.status === 'Scheduled' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          r.status === 'Pending' ? 'bg-cyan-500/10  text-cyan-400  border-cyan-500/20' :
                            'bg-[#1E2D45] text-[#6B84A3] border-[#1E2D45]'
                    )}>
                      {maintenanceStatusLabel(r.status)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[#E2EAF4]">{r.maintenanceType ?? 'Bakım'}</p>
                      {r.description && <p className="text-[10px] text-[#6B84A3] mt-0.5 line-clamp-2">{r.description}</p>}
                      <div className="flex gap-4 mt-1.5">
                        {r.technicianName && (
                          <span className="flex items-center gap-1 text-[10px] text-[#6B84A3]">
                            <User size={9} />{r.technicianName}
                          </span>
                        )}
                        {r.costAmount != null && (
                          <span className="flex items-center gap-1 text-[10px] text-[#6B84A3]">
                            <DollarSign size={9} />{formatCurrency(r.costAmount)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[10px] text-amber-400 font-mono-val">{formatDate(r.maintenanceDate)}</p>
                      {r.nextMaintenanceDate && (
                        <p className="text-[10px] text-[#6B84A3] font-mono-val mt-0.5">
                          Sonraki: {formatDate(r.nextMaintenanceDate)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-16 text-center">
              <Wrench size={32} className="text-[#1E2D45] mx-auto mb-3" />
              <p className="text-sm text-[#3D5275] font-mono-val">Bakım kaydı yok</p>
            </div>
          )}
        </div>
      )}

      {/* ── Uyarılar ──────────────────────────────────────────────────────────── */}
      {tab === 'alerts' && (
        <div className="space-y-2">
          {assetAlerts.length > 0 ? assetAlerts.map(al => {
            const Icon = al.alertType === 'Critical' ? AlertCircle
              : al.alertType === 'Warning' ? AlertTriangle
                : Info;
            const iconCls = al.alertType === 'Critical' ? 'text-red-400'
              : al.alertType === 'Warning' ? 'text-amber-400'
                : 'text-cyan-400';
            const cardCls = al.alertType === 'Critical' ? 'border-red-500/20 bg-red-500/5'
              : al.alertType === 'Warning' ? 'border-amber-500/20 bg-amber-500/5'
                : 'border-[#1E2D45]';
            return (
              <div key={al.alertId} className={cn('card p-3 border flex items-start gap-3', cardCls, al.isResolved && 'opacity-50')}>
                <Icon size={14} className={cn(iconCls, 'mt-0.5 flex-shrink-0')} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#E2EAF4] leading-snug">{al.alertMessage}</p>
                  <div className="flex gap-3 mt-1 text-[10px] text-[#6B84A3] font-mono-val flex-wrap">
                    <span className="flex items-center gap-1"><Clock size={9} />{timeAgo(al.triggeredTime)}</span>
                    {al.alertCategory && <span>{al.alertCategory}</span>}
                    {al.isResolved && (
                      <span className="text-green-400 flex items-center gap-1">
                        <CheckCircle size={9} />Çözüldü · {al.resolvedTime ? timeAgo(al.resolvedTime) : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="card p-16 text-center">
              <CheckCircle size={32} className="text-green-400/30 mx-auto mb-3" />
              <p className="text-sm text-[#3D5275] font-mono-val">Bu varlık için uyarı kaydı yok</p>
            </div>
          )}
        </div>
      )}

      {/* ── Lisanslar ─────────────────────────────────────────────────────────── */}
      {tab === 'licenses' && (
        <div className="space-y-3">
          {/* Başlık + Ekle butonu */}
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val">
              {licenses.length} lisans
            </p>
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors font-mono-val"
            >
              <Plus size={12} />Lisans Ekle
            </button>
          </div>

          {/* Lisans kartları */}
          {licenses.length > 0 ? licenses.map(lic => {
            const flags: string[] = lic.featureFlags ? JSON.parse(lic.featureFlags) : [];
            const expColor = expiryColor(lic.expiryDate);
            const expLabel = expiryLabel(lic.expiryDate);
            return (
              <div key={lic.licenseId} className="card p-4 space-y-3">
                {/* Üst satır: uygulama adı + aksiyon butonları */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <KeyRound size={14} className="text-amber-400 flex-shrink-0" />
                    <span className="text-sm font-display font-semibold text-white">{lic.applicationName}</span>
                    {!lic.isActive && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1E2D45] text-[#6B84A3] border border-[#253550] font-mono-val">
                        PASİF
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEdit(lic)}
                      className="p-1.5 rounded text-[#6B84A3] hover:text-amber-400 hover:bg-[#1E2D45] transition-colors"
                      title="Düzenle"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`"${lic.applicationName}" lisansını silmek istiyor musunuz?`)) {
                          deleteLicense.mutate(lic.licenseId);
                        }
                      }}
                      className="p-1.5 rounded text-[#6B84A3] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Sil"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Lisans anahtarı */}
                {lic.licenseKey && (
                  <div className="flex items-center gap-2 bg-[#0D1421] rounded p-2 border border-[#1E2D45]">
                    <code className="text-[10px] text-cyan-400 font-mono-val flex-1 break-all line-clamp-2">
                      {lic.licenseKey}
                    </code>
                    <button
                      onClick={() => copyKey(lic)}
                      className="flex-shrink-0 p-1 rounded text-[#6B84A3] hover:text-cyan-400 transition-colors"
                      title="Kopyala"
                    >
                      {copyMsg === lic.licenseId
                        ? <CheckCircle size={12} className="text-green-400" />
                        : <Copy size={12} />
                      }
                    </button>
                  </div>
                )}

                {/* Alt detaylar */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-[10px] font-mono-val">
                  {lic.macId && (
                    <div>
                      <span className="text-[#6B84A3] uppercase tracking-widest block mb-0.5">MAC ID</span>
                      <span className="text-[#E2EAF4]">{lic.macId}</span>
                    </div>
                  )}
                  {lic.expiryDate && (
                    <div>
                      <span className="text-[#6B84A3] uppercase tracking-widest block mb-0.5">Bitiş</span>
                      <span className={cn('font-semibold', expColor)}>{expLabel}</span>
                    </div>
                  )}
                  {lic.description && (
                    <div className="col-span-2">
                      <span className="text-[#6B84A3] uppercase tracking-widest block mb-0.5">Açıklama</span>
                      <span className="text-[#E2EAF4]">{lic.description}</span>
                    </div>
                  )}
                </div>

                {/* Özellik bayrakları */}
                {flags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {flags.map(f => (
                      <span key={f} className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 font-mono-val">
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          }) : (
            <div className="card p-16 text-center">
              <KeyRound size={32} className="text-[#1E2D45] mx-auto mb-3" />
              <p className="text-sm text-[#3D5275] font-mono-val">Henüz lisans eklenmemiş</p>
              <button
                onClick={openCreate}
                className="mt-3 text-xs text-amber-400 hover:underline font-mono-val"
              >
                + İlk lisansı ekle
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Lisans Modal ──────────────────────────────────────────────────────── */}
      {licenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0D1421] border border-[#1E2D45] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-[#1E2D45]">
              <h2 className="text-sm font-display font-bold text-white">
                {editingId ? 'Lisansı Düzenle' : 'Yeni Lisans Ekle'}
              </h2>
              <button onClick={closeModal} className="p-1.5 rounded text-[#6B84A3] hover:text-white hover:bg-[#1E2D45] transition-colors">
                <X size={14} />
              </button>
            </div>

            <form onSubmit={submitLicense} className="p-4 space-y-4">
              {/* Uygulama Adı */}
              <div>
                <label className="text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val block mb-1.5">
                  Uygulama Adı <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.applicationName}
                  onChange={e => setForm(f => ({ ...f, applicationName: e.target.value }))}
                  placeholder="XPression, AvP, CasparCG..."
                  className="w-full bg-[#131C2E] border border-[#1E2D45] rounded px-3 py-2 text-xs text-white font-mono-val focus:outline-none focus:border-amber-500/50 placeholder:text-[#3D5275]"
                />
              </div>

              {/* Lisans Anahtarı */}
              <div>
                <label className="text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val block mb-1.5">
                  Lisans Anahtarı
                </label>
                <textarea
                  value={form.licenseKey}
                  onChange={e => setForm(f => ({ ...f, licenseKey: e.target.value }))}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  rows={2}
                  className="w-full bg-[#131C2E] border border-[#1E2D45] rounded px-3 py-2 text-xs text-cyan-400 font-mono-val focus:outline-none focus:border-amber-500/50 placeholder:text-[#3D5275] resize-none"
                />
              </div>

              {/* MAC ID + Bitiş Tarihi */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val block mb-1.5">
                    MAC ID
                  </label>
                  <input
                    type="text"
                    value={form.macId}
                    onChange={e => setForm(f => ({ ...f, macId: e.target.value }))}
                    placeholder="AA:BB:CC:DD:EE:FF"
                    className="w-full bg-[#131C2E] border border-[#1E2D45] rounded px-3 py-2 text-xs text-white font-mono-val focus:outline-none focus:border-amber-500/50 placeholder:text-[#3D5275]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val block mb-1.5">
                    Bitiş Tarihi
                  </label>
                  <input
                    type="date"
                    value={form.expiryDate}
                    onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))}
                    className="w-full bg-[#131C2E] border border-[#1E2D45] rounded px-3 py-2 text-xs text-white font-mono-val focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              {/* Özellik Bayrakları */}
              <div>
                <label className="text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val block mb-2">
                  Özellik Bayrakları
                </label>
                <div className="flex flex-wrap gap-2">
                  {FEATURE_FLAGS.map(flag => (
                    <button
                      key={flag}
                      type="button"
                      onClick={() => toggleFlag(flag)}
                      className={cn(
                        'text-[10px] px-2.5 py-1 rounded border font-mono-val transition-colors',
                        form.featureFlags.includes(flag)
                          ? 'bg-indigo-500/25 text-indigo-300 border-indigo-500/40'
                          : 'bg-[#131C2E] text-[#6B84A3] border-[#1E2D45] hover:border-[#3D5275]'
                      )}
                    >
                      {flag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Açıklama */}
              <div>
                <label className="text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val block mb-1.5">
                  Açıklama
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full bg-[#131C2E] border border-[#1E2D45] rounded px-3 py-2 text-xs text-white font-mono-val focus:outline-none focus:border-amber-500/50 placeholder:text-[#3D5275] resize-none"
                />
              </div>

              {/* Harici API URL */}
              <div>
                <label className="text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val block mb-1.5">
                  API URL <span className="text-[#3D5275] normal-case">— ileride kullanılacak</span>
                </label>
                <input
                  type="url"
                  value={form.externalLicenseUrl}
                  onChange={e => setForm(f => ({ ...f, externalLicenseUrl: e.target.value }))}
                  placeholder="https://license.example.com/api/..."
                  className="w-full bg-[#131C2E] border border-[#1E2D45] rounded px-3 py-2 text-xs text-white font-mono-val focus:outline-none focus:border-amber-500/50 placeholder:text-[#3D5275]"
                />
              </div>

              {/* Butonlar */}
              <div className="flex justify-end gap-2 pt-2 border-t border-[#1E2D45]">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-xs rounded border border-[#1E2D45] text-[#6B84A3] hover:text-white hover:bg-[#1E2D45] transition-colors font-mono-val"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={createLicense.isPending || updateLicense.isPending}
                  className="px-4 py-2 text-xs rounded bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30 transition-colors font-mono-val disabled:opacity-50"
                >
                  {createLicense.isPending || updateLicense.isPending ? 'Kaydediliyor...' : editingId ? 'Güncelle' : 'Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
