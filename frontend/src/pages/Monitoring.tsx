import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { monitoringApi, alertApi } from '@/api/client';
import { cn, tempColor, usageColor } from '@/lib/utils';
import {
  Wifi, WifiOff, Zap, Thermometer, Activity,
  List, LayoutGrid, Search,
} from 'lucide-react';

// ─── Mini SVG Sparkline ────────────────────────────────────────────
function Sparkline({ data, color = '#22D3EE', width = 52, height = 16 }: {
  data: number[]; color?: string; width?: number; height?: number;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={width} height={height} className="opacity-50">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Gauge Bar ────────────────────────────────────────────────────
function GaugeBar({ value, label, unit = '%', max = 100, variant = 'cpu' }: {
  value?: number; label: string; unit?: string; max?: number;
  variant?: 'cpu' | 'gpu' | 'ram' | 'disk';
}) {
  const pct = value != null ? Math.min((value / max) * 100, 100) : 0;

  // Bar: hepsi aynı sakin indigo — sadece %90+ kritik eşiğinde kırmızıya döner
  const bar = pct >= 90 ? 'bg-red-500' : 'bg-indigo-500/70';

  // Değer metni: threshold bazlı renk — bar'dan bağımsız, hızlı okuma için
  const text = pct >= 90 ? 'text-red-400' : pct >= 75 ? 'text-amber-400' : 'text-slate-300';

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
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

// ─── Helpers ──────────────────────────────────────────────────────
const barColor = (pct: number) =>
  pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-green-500';

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 5) return 'şimdi';
  if (s < 60) return `${s}sn`;
  if (s < 3600) return `${Math.floor(s / 60)}dk`;
  if (s < 86400) return `${Math.floor(s / 3600)}sa`;
  return `${Math.floor(s / 86400)}g`;
}

const WS_DELAYS = [2000, 4000, 8000, 16000, 30000];

// ─── Main Component ───────────────────────────────────────────────
export function Monitoring() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCount = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevOnline = useRef<Map<number, boolean>>(new Map());

  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [liveData, setLiveData] = useState<Map<number, any>>(new Map());
  const [lastUpdated, setLastUpdated] = useState<Map<number, Date>>(new Map());
  const [cpuHistory, setCpuHistory] = useState<Map<number, number[]>>(new Map());
  const [flashOffline, setFlashOffline] = useState<Set<number>>(new Set());

  // Toolbar state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'status' | 'cpu' | 'temp' | 'power' | 'name'>('status');
  const [filterChannel, setFilterChannel] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'online' | 'offline'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [groupByChannel, setGroupByChannel] = useState(false);

  // ── Queries ──────────────────────────────────────────────────
  const { data: heatmapRes } = useQuery({
    queryKey: ['heatmap-monitor'],
    queryFn: () => monitoringApi.getHeatmap(),
    refetchInterval: 10_000,
  });
  const { data: alertRes } = useQuery({
    queryKey: ['alerts-monitor-dashboard'],
    queryFn: () => alertApi.getDashboard(),
    refetchInterval: 30_000,
  });

  const assets: any[] = heatmapRes?.data?.data ?? [];

  // Alert count per asset
  const alertsByAsset = new Map<number, number>();
  (alertRes?.data?.data ?? []).forEach((al: any) => {
    if (!al.isResolved) {
      alertsByAsset.set(al.assetId, (alertsByAsset.get(al.assetId) ?? 0) + 1);
    }
  });

  const channels = [...new Set(assets.map((a) => a.channelName))].filter(Boolean).sort() as string[];

  // ── Seed CPU history from initial heatmap load ────────────────
  useEffect(() => {
    if (assets.length === 0) return;
    setCpuHistory((prev) => {
      const next = new Map(prev);
      assets.forEach((a) => {
        if (!next.has(a.assetId) && a.cpuUsage != null) {
          next.set(a.assetId, [a.cpuUsage]);
        }
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets.length]);

  // ── WebSocket with auto-reconnect ─────────────────────────────
  const connectWs = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    const url = `ws://${window.location.hostname}:5000/monitoring/realtime`;
    setWsStatus('connecting');
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsStatus('connected');
        reconnectCount.current = 0;
        // Önce JWT ile kimlik doğrula, ardından abone ol
        const token = localStorage.getItem('accessToken');
        ws.send(JSON.stringify({ type: 'AUTH', token }));
        ws.send(JSON.stringify({ type: 'SUBSCRIBE' }));
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          const now = new Date();

          if (msg.type === 'ASSET_UPDATE') {
            const id: number = msg.assetId;
            setLiveData((p) => new Map(p).set(id, msg.data));
            setLastUpdated((p) => new Map(p).set(id, now));

            // CPU history (circular buffer, max 20)
            if (msg.data.cpuUsage != null) {
              setCpuHistory((p) => {
                const hist = [...(p.get(id) ?? []), msg.data.cpuUsage];
                if (hist.length > 20) hist.shift();
                return new Map(p).set(id, hist);
              });
            }

            // Offline flash
            const wasOnline = prevOnline.current.get(id);
            const isNowOnline = msg.data.isOnline !== false;
            if (wasOnline === true && !isNowOnline) {
              setFlashOffline((p) => new Set(p).add(id));
              setTimeout(() => setFlashOffline((p) => { const s = new Set(p); s.delete(id); return s; }), 2500);
            }
            prevOnline.current.set(id, isNowOnline);

          } else if (msg.type === 'BATCH_UPDATE' && Array.isArray(msg.data)) {
            setLiveData((p) => {
              const next = new Map(p);
              msg.data.forEach((d: any) => next.set(d.assetId, d));
              return next;
            });
            setLastUpdated((p) => {
              const next = new Map(p);
              msg.data.forEach((d: any) => next.set(d.assetId, now));
              return next;
            });
          }
        } catch { /* ignore parse errors */ }
      };

      ws.onclose = () => {
        setWsStatus('disconnected');
        const delay = WS_DELAYS[Math.min(reconnectCount.current, WS_DELAYS.length - 1)];
        reconnectCount.current++;
        reconnectTimer.current = setTimeout(connectWs, delay);
      };

      ws.onerror = () => ws.close();
    } catch {
      setWsStatus('disconnected');
    }
  }, []);

  useEffect(() => {
    connectWs();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connectWs]);

  // ── Enrich assets with live data ──────────────────────────────
  const enriched = assets.map((a) => {
    const live = liveData.get(a.assetId) ?? a;
    return {
      ...a,
      ...live,
      _alerts: alertsByAsset.get(a.assetId) ?? 0,
      _lastUpdated: lastUpdated.get(a.assetId),
      _lastSeen: lastUpdated.get(a.assetId) ?? (a.lastMonitoringTime ? new Date(a.lastMonitoringTime) : null),
      _cpuHist: cpuHistory.get(a.assetId) ?? [],
    };
  });

  // ── Filter ────────────────────────────────────────────────────
  const filtered = enriched
    .filter((a) => (filterChannel ? a.channelName === filterChannel : true))
    .filter((a) => {
      const on = a.isOnline !== false;
      if (filterStatus === 'online') return on;
      if (filterStatus === 'offline') return !on;
      return true;
    })
    .filter((a) =>
      searchQuery ? (a.assetName ?? '').toLowerCase().includes(searchQuery.toLowerCase()) : true
    )
    .sort((a, b) => {
      if (sortBy === 'status') return (a.isOnline !== false ? 1 : 0) - (b.isOnline !== false ? 1 : 0);
      if (sortBy === 'cpu') return (b.cpuUsage ?? 0) - (a.cpuUsage ?? 0);
      if (sortBy === 'temp') return (b.temperature ?? 0) - (a.temperature ?? 0);
      if (sortBy === 'power') return (b.powerConsumption ?? 0) - (a.powerConsumption ?? 0);
      return (a.assetName ?? '').localeCompare(b.assetName ?? '');
    });

  // ── Stats ─────────────────────────────────────────────────────
  const onlineCount = enriched.filter((a) => a.isOnline !== false).length;
  const offlineCount = enriched.length - onlineCount;
  const totalPowerKW = enriched.reduce((s, a) => s + (a.powerConsumption ?? 0), 0) / 1000;
  const tempsArr = enriched.filter((a) => a.temperature != null).map((a) => a.temperature as number);
  const avgTemp = tempsArr.length ? tempsArr.reduce((s, v) => s + v, 0) / tempsArr.length : 0;
  const totalAlerts = [...alertsByAsset.values()].reduce((s, v) => s + v, 0);

  // ── Groups ────────────────────────────────────────────────────
  const groups = groupByChannel
    ? channels
      .map((ch) => ({ label: ch, items: filtered.filter((a) => a.channelName === ch) }))
      .filter((g) => g.items.length > 0)
    : [{ label: '', items: filtered }];

  // ── Card renderer ─────────────────────────────────────────────
  const renderCard = (asset: any) => {
    const isOnline = asset.isOnline !== false;
    const isFlash = flashOffline.has(asset.assetId);
    return (
      <div
        key={asset.assetId}
        className={cn(
          'card p-4 border transition-all duration-300',
          isOnline ? 'border-[#1E2D45]' : 'border-red-500/40 bg-red-500/5',
          isFlash && 'animate-pulse !border-red-500/80'
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('w-2 h-2 rounded-full flex-shrink-0', isOnline ? 'bg-green-400 pulse-dot' : 'bg-red-400')} />
              <p className="text-xs text-[#E2EAF4] font-medium truncate">{asset.assetName}</p>
              {asset._alerts > 0 && (
                <span className="flex-shrink-0 px-1 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                  {asset._alerts}⚠
                </span>
              )}
            </div>
            <div className="flex items-center justify-between mt-0.5 pl-4">
              <p className="text-[10px] text-[#3D5275] font-mono-val truncate">
                {asset.channelName} · {asset.groupName}
              </p>
              {asset._lastUpdated && (
                <span className="text-[9px] text-[#3D5275] font-mono-val flex-shrink-0 ml-1">
                  {timeAgo(asset._lastUpdated)}
                </span>
              )}
            </div>
          </div>
          <span className="flex-shrink-0 ml-2 text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/15 font-mono-val">
            {asset.assetType}
          </span>
        </div>

        {/* Metrics */}
        {isOnline ? (
          <div className="space-y-2.5">
            {asset.gpuUsage != null && <GaugeBar value={asset.gpuUsage} label="GPU" variant="gpu" />}
            {asset.cpuUsage != null && <GaugeBar value={asset.cpuUsage} label="CPU" variant="cpu" />}
            {asset.ramUsage != null && <GaugeBar value={asset.ramUsage} label="RAM" variant="ram" />}
            {asset.diskUsage != null && <GaugeBar value={asset.diskUsage} label="Disk" variant="disk" />}

            <div className="grid grid-cols-3 gap-1 pt-2 border-t border-[#1E2D45] items-center">
              {asset.temperature != null && (
                <div className="flex items-center gap-1">
                  <Thermometer size={10} className="text-[#6B84A3]" />
                  <span className={cn('text-xs font-mono-val font-semibold', tempColor(asset.temperature))}>
                    {asset.temperature}°C
                  </span>
                </div>
              )}
              {asset.powerConsumption != null && (
                <div className="flex items-center gap-1">
                  <Zap size={10} className="text-amber-400/60" />
                  <span className="text-xs font-mono-val text-amber-400">{asset.powerConsumption}W</span>
                </div>
              )}
              {asset._cpuHist.length >= 2 && (
                <div className="flex justify-end">
                  <Sparkline data={asset._cpuHist} color="#22D3EE" />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-1.5 py-5 text-red-400">
            <div className="flex items-center gap-2">
              <WifiOff size={14} />
              <span className="text-xs font-mono-val font-bold tracking-widest">OFFLINE</span>
            </div>
            {asset._lastSeen && (
              <span className="text-[10px] text-[#6B84A3] font-mono-val">
                Son görülme: {timeAgo(asset._lastSeen)} önce
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  // ── List row renderer ─────────────────────────────────────────
  const renderRow = (asset: any) => {
    const isOnline = asset.isOnline !== false;
    const cpuPct = Math.min(asset.cpuUsage ?? 0, 100);
    return (
      <tr key={asset.assetId} className={cn('border-b border-[#1E2D45] hover:bg-[#0D1421]/60 transition-colors', !isOnline && 'bg-red-500/5')}>
        <td className="py-2 px-3">
          <div className="flex items-center gap-2">
            <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', isOnline ? 'bg-green-400 pulse-dot' : 'bg-red-400')} />
            <span className="text-xs text-[#E2EAF4] font-medium">{asset.assetName}</span>
            {asset._alerts > 0 && (
              <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                {asset._alerts}⚠
              </span>
            )}
          </div>
          <p className="text-[10px] text-[#3D5275] font-mono-val pl-3.5 mt-0.5">{asset.channelName} · {asset.groupName}</p>
        </td>
        <td className="py-2 px-3">
          <span className={cn('text-[10px] font-mono-val font-bold tracking-wider', isOnline ? 'text-green-400' : 'text-red-400')}>
            {isOnline ? 'ONL' : 'OFF'}
          </span>
        </td>
        <td className="py-2 px-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-[#1E2D45] rounded-full overflow-hidden w-16">
              <div className={cn('h-full rounded-full', barColor(cpuPct))} style={{ width: `${cpuPct}%` }} />
            </div>
            <span className={cn('text-xs font-mono-val w-8 text-right', usageColor(cpuPct))}>
              {asset.cpuUsage != null ? `${asset.cpuUsage.toFixed(0)}%` : '—'}
            </span>
          </div>
        </td>
        <td className="py-2 px-3 text-right">
          <span className={cn('text-xs font-mono-val', tempColor(asset.temperature ?? 0))}>
            {asset.temperature != null ? `${asset.temperature}°C` : '—'}
          </span>
        </td>
        <td className="py-2 px-3 text-right">
          <span className="text-xs font-mono-val text-amber-400">
            {asset.powerConsumption != null ? `${asset.powerConsumption}W` : '—'}
          </span>
        </td>
        <td className="py-2 px-3 text-right">
          <span className={cn('text-xs font-mono-val', usageColor(asset.ramUsage ?? 0))}>
            {asset.ramUsage != null ? `${asset.ramUsage.toFixed(0)}%` : '—'}
          </span>
        </td>
        <td className="py-2 px-3 text-right">
          {asset._cpuHist.length >= 2
            ? <Sparkline data={asset._cpuHist} color="#22D3EE" width={48} height={14} />
            : <span className="text-[9px] text-[#3D5275]">—</span>
          }
        </td>
        <td className="py-2 px-3 text-right">
          <span className="text-[9px] font-mono-val text-[#3D5275]">
            {asset._lastUpdated ? timeAgo(asset._lastUpdated) : '—'}
          </span>
        </td>
      </tr>
    );
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-4 fade-in-up">

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { label: 'ONLİNE', value: onlineCount, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
          { label: 'OFFLİNE', value: offlineCount, color: offlineCount > 0 ? 'text-red-400' : 'text-[#6B84A3]', bg: offlineCount > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-[#1E2D45]/30 border-[#1E2D45]' },
          { label: 'TOPLAM GÜÇ', value: `${totalPowerKW.toFixed(1)} kW`, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'ORT. SICAKLIK', value: avgTemp > 0 ? `${avgTemp.toFixed(1)}°C` : '—', color: tempColor(avgTemp), bg: 'bg-[#1E2D45]/30 border-[#1E2D45]' },
          { label: 'AKTİF ALERT', value: totalAlerts, color: totalAlerts > 0 ? 'text-red-400' : 'text-[#6B84A3]', bg: totalAlerts > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-[#1E2D45]/30 border-[#1E2D45]' },
        ].map((s) => (
          <div key={s.label} className={cn('card px-3 py-2.5 border', s.bg)}>
            <p className="text-[9px] text-[#6B84A3] font-mono-val uppercase tracking-wider mb-0.5">{s.label}</p>
            <p className={cn('text-xl font-display font-bold', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* WS status pill */}
        <div className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-[10px] font-mono-val',
          wsStatus === 'connected' ? 'bg-green-500/10 border-green-500/25 text-green-400' :
            wsStatus === 'connecting' ? 'bg-amber-500/10 border-amber-500/25 text-amber-400' :
              'bg-red-500/10 border-red-500/25 text-red-400'
        )}>
          {wsStatus === 'connected' ? <Wifi size={11} /> : <WifiOff size={11} />}
          <span className={cn('w-1.5 h-1.5 rounded-full',
            wsStatus === 'connected' ? 'bg-green-400 pulse-dot' :
              wsStatus === 'connecting' ? 'bg-amber-400 pulse-dot' : 'bg-red-400'
          )} />
          {wsStatus === 'connected' ? 'CANLI' : wsStatus === 'connecting' ? 'BAĞLANIYOR...' : 'BAĞLANTI YOK'}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#3D5275]" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cihaz ara..."
            className="pl-6 pr-2 py-1.5 text-xs bg-[#0D1421] border border-[#1E2D45] rounded text-[#E2EAF4] placeholder-[#3D5275] focus:outline-none focus:border-amber-500/50 w-36"
          />
        </div>

        {/* Channel filter */}
        <select
          value={filterChannel}
          onChange={(e) => setFilterChannel(e.target.value)}
          className="px-2 py-1.5 text-xs bg-[#0D1421] border border-[#1E2D45] rounded text-[#E2EAF4] focus:outline-none focus:border-amber-500/50"
        >
          <option value="">Tüm Kanallar</option>
          {channels.map((ch) => <option key={ch} value={ch}>{ch}</option>)}
        </select>

        {/* Status filter */}
        <div className="flex rounded border border-[#1E2D45] overflow-hidden">
          {(['all', 'online', 'offline'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn(
                'px-2.5 py-1.5 text-[10px] font-mono-val uppercase transition-colors',
                filterStatus === s ? 'bg-amber-500/20 text-amber-400' : 'text-[#6B84A3] hover:text-[#E2EAF4]'
              )}
            >
              {s === 'all' ? 'Tümü' : s === 'online' ? 'Online' : 'Offline'}
            </button>
          ))}
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-2 py-1.5 text-xs bg-[#0D1421] border border-[#1E2D45] rounded text-[#E2EAF4] focus:outline-none focus:border-amber-500/50"
        >
          <option value="status">Offline Önce</option>
          <option value="cpu">En Yüksek CPU</option>
          <option value="temp">En Yüksek Sıcaklık</option>
          <option value="power">En Yüksek Güç</option>
          <option value="name">İsim A–Z</option>
        </select>

        {/* Group by channel */}
        <button
          onClick={() => setGroupByChannel((v) => !v)}
          className={cn(
            'px-2.5 py-1.5 text-[10px] font-mono-val rounded border transition-colors',
            groupByChannel ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' : 'border-[#1E2D45] text-[#6B84A3] hover:text-[#E2EAF4]'
          )}
        >
          KANAL GRUBU
        </button>

        {/* View toggle */}
        <div className="ml-auto flex rounded border border-[#1E2D45] overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={cn('p-1.5 transition-colors', viewMode === 'grid' ? 'bg-amber-500/20 text-amber-400' : 'text-[#6B84A3] hover:text-[#E2EAF4]')}
          ><LayoutGrid size={14} /></button>
          <button
            onClick={() => setViewMode('list')}
            className={cn('p-1.5 transition-colors', viewMode === 'list' ? 'bg-amber-500/20 text-amber-400' : 'text-[#6B84A3] hover:text-[#E2EAF4]')}
          ><List size={14} /></button>
        </div>

        <span className="text-[10px] text-[#3D5275] font-mono-val">{filtered.length}/{enriched.length} cihaz</span>
      </div>

      {/* Content groups */}
      {groups.map((group) => (
        <div key={group.label || 'all'} className="space-y-3">
          {groupByChannel && group.label && (
            <h3 className="text-[10px] font-mono-val text-[#6B84A3] uppercase tracking-widest pb-1.5 border-b border-[#1E2D45]">
              {group.label}
              <span className="ml-2 text-[#3D5275]">— {group.items.length} cihaz</span>
            </h3>
          )}

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {group.items.map(renderCard)}
            </div>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-[#1E2D45]">
                    {['CİHAZ', 'DURUM', 'CPU', 'SICAKLIK', 'GÜÇ', 'RAM', 'TREND', 'GÜNCELLEME'].map((h) => (
                      <th key={h} className="py-2 px-3 text-[9px] font-mono-val text-[#3D5275] uppercase tracking-wider text-left last:text-right">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>{group.items.map(renderRow)}</tbody>
              </table>
            </div>
          )}
        </div>
      ))}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="card p-12 text-center">
          <Activity size={32} className="text-[#1E2D45] mx-auto mb-3" />
          <p className="text-sm text-[#3D5275] font-mono-val">Eşleşen cihaz bulunamadı</p>
          <p className="text-xs text-[#3D5275] font-mono-val mt-1">Filtrelerinizi değiştirmeyi deneyin</p>
        </div>
      )}
    </div>
  );
}
