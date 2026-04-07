import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { monitoringApi, alertApi } from '@/api/client';
import type { AssetMonitoring, HeatmapAsset, Alert, MonitoringAsset } from '@/types';
import { cn, tempColor } from '@/lib/utils';
import { Wifi, WifiOff, Zap, Thermometer, Activity, List, LayoutGrid, Search } from 'lucide-react';
import { MonitoringCard } from '@/components/monitoring/MonitoringCard';
import { MonitoringRow } from '@/components/monitoring/MonitoringRow';

const WS_DELAYS = [2000, 4000, 8000, 16000, 30000];
const WS_MAX_RECONNECTS = 10;

export function Monitoring() {
  const { t } = useTranslation();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCount = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevOnline = useRef<Map<number, boolean>>(new Map());

  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [wsAttempt, setWsAttempt] = useState(0);
  const [liveData, setLiveData] = useState<Map<number, AssetMonitoring>>(new Map());
  const [lastUpdated, setLastUpdated] = useState<Map<number, Date>>(new Map());
  const [cpuHistory, setCpuHistory] = useState<Map<number, number[]>>(new Map());
  const [flashOffline, setFlashOffline] = useState<Set<number>>(new Set());

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

  const assets: HeatmapAsset[] = heatmapRes?.data?.data ?? [];

  const alertsByAsset = useMemo(() => {
    const map = new Map<number, number>();
    (alertRes?.data?.data ?? []).forEach((al: Alert) => {
      if (!al.isResolved && al.assetId != null) {
        map.set(al.assetId, (map.get(al.assetId) ?? 0) + 1);
      }
    });
    return map;
  }, [alertRes]);

  const channels = [...new Set(assets.map((a) => a.channelName))].filter(Boolean).sort() as string[];

  // ── Seed CPU history from initial heatmap ────────────────────
  useEffect(() => {
    if (assets.length === 0) return;
    setCpuHistory((prev) => {
      const next = new Map(prev);
      assets.forEach((a) => {
        if (!next.has(a.assetId) && a.cpuUsage != null) next.set(a.assetId, [a.cpuUsage]);
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets.length]);

  // ── WebSocket with auto-reconnect ────────────────────────────
  const connectWs = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    const wsProto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${wsProto}://${window.location.host}/monitoring/realtime`;
    setWsStatus('connecting');
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsStatus('connected');
        reconnectCount.current = 0;
        setWsAttempt(0);
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
            if (msg.data.cpuUsage != null) {
              setCpuHistory((p) => {
                const hist = [...(p.get(id) ?? []), msg.data.cpuUsage];
                if (hist.length > 20) hist.shift();
                return new Map(p).set(id, hist);
              });
            }
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
              msg.data.forEach((d: AssetMonitoring) => next.set(d.assetId, d));
              return next;
            });
            setLastUpdated((p) => {
              const next = new Map(p);
              msg.data.forEach((d: AssetMonitoring) => next.set(d.assetId, now));
              return next;
            });
          }
        } catch { /* ignore parse errors */ }
      };

      ws.onclose = () => {
        setWsStatus('disconnected');
        if (reconnectCount.current >= WS_MAX_RECONNECTS) {
          console.warn('[WS] Maksimum yeniden bağlanma denemesi aşıldı.');
          return;
        }
        const delay = WS_DELAYS[Math.min(reconnectCount.current, WS_DELAYS.length - 1)];
        reconnectCount.current++;
        setWsAttempt(reconnectCount.current);
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
  const enriched = useMemo(() => assets.map((a) => {
    const live = liveData.get(a.assetId) ?? a;
    return {
      ...a,
      ...live,
      _alerts: alertsByAsset.get(a.assetId) ?? 0,
      _lastUpdated: lastUpdated.get(a.assetId),
      _lastSeen: lastUpdated.get(a.assetId) ?? (a.lastMonitoringTime ? new Date(a.lastMonitoringTime) : null),
      _cpuHist: cpuHistory.get(a.assetId) ?? [],
    };
  }), [assets, liveData, alertsByAsset, lastUpdated, cpuHistory]);

  // ── Filter & sort ─────────────────────────────────────────────
  const filtered = enriched
    .filter((a) => (filterChannel ? a.channelName === filterChannel : true))
    .filter((a) => {
      const on = a.isOnline !== false;
      if (filterStatus === 'online') return on;
      if (filterStatus === 'offline') return !on;
      return true;
    })
    .filter((a) => searchQuery ? (a.assetName ?? '').toLowerCase().includes(searchQuery.toLowerCase()) : true)
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

  const groups = groupByChannel
    ? channels.map((ch) => ({ label: ch, items: filtered.filter((a) => a.channelName === ch) })).filter((g) => g.items.length > 0)
    : [{ label: '', items: filtered }];

  return (
    <div className="space-y-4 fade-in-up">

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { label: t('common.online'), value: onlineCount, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
          { label: t('common.offline'), value: offlineCount, color: offlineCount > 0 ? 'text-red-400' : 'text-[#8b919e]', bg: offlineCount > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-[#2e333d]/30 border-[#2e333d]' },
          { label: t('monitoring.stats.total_power'), value: `${totalPowerKW.toFixed(1)} kW`, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: t('monitoring.stats.avg_temp'), value: avgTemp > 0 ? `${avgTemp.toFixed(1)}°C` : '—', color: tempColor(avgTemp), bg: 'bg-[#2e333d]/30 border-[#2e333d]' },
          { label: t('dashboard.charts.active_alert_short'), value: totalAlerts, color: totalAlerts > 0 ? 'text-red-400' : 'text-[#8b919e]', bg: totalAlerts > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-[#2e333d]/30 border-[#2e333d]' },
        ].map((s) => (
          <div key={s.label} className={cn('card px-3 py-2.5 border', s.bg)}>
            <p className="text-[9px] text-[#8b919e] font-mono-val uppercase tracking-wider mb-0.5">{s.label}</p>
            <p className={cn('text-xl font-display font-bold', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
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
          {wsStatus === 'connected'
            ? t('common.live')
            : wsStatus === 'connecting'
              ? `${t('common.connecting')}${wsAttempt > 0 ? ` (${wsAttempt}/${WS_MAX_RECONNECTS})` : ''}`
              : wsAttempt >= WS_MAX_RECONNECTS ? 'Bağlantı kesildi' : t('common.no_connection')
          }
        </div>

        <div className="relative">
          <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#555d6e]" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('monitoring.toolbar.search_placeholder')}
            className="pl-6 pr-2 py-1.5 text-xs bg-[#1a1d23] border border-[#2e333d] rounded text-[#e4e7ec] placeholder-[#555d6e] focus:outline-none focus:border-[#5b8fd5]/40 w-36"
          />
        </div>

        <select
          value={filterChannel}
          onChange={(e) => setFilterChannel(e.target.value)}
          className="px-2 py-1.5 text-xs bg-[#1a1d23] border border-[#2e333d] rounded text-[#e4e7ec] focus:outline-none focus:border-[#5b8fd5]/40"
        >
          <option value="">{t('monitoring.toolbar.all_channels')}</option>
          {channels.map((ch) => <option key={ch} value={ch}>{ch}</option>)}
        </select>

        <div className="flex rounded border border-[#2e333d] overflow-hidden">
          {(['all', 'online', 'offline'] as const).map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={cn('px-2.5 py-1.5 text-[10px] font-mono-val uppercase transition-colors',
                filterStatus === s ? 'bg-amber-500/20 text-amber-400' : 'text-[#8b919e] hover:text-[#e4e7ec]'
              )}>
              {s === 'all' ? t('monitoring.toolbar.all') : s === 'online' ? t('common.online') : t('common.offline')}
            </button>
          ))}
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="px-2 py-1.5 text-xs bg-[#1a1d23] border border-[#2e333d] rounded text-[#e4e7ec] focus:outline-none focus:border-[#5b8fd5]/40"
        >
          <option value="status">{t('monitoring.toolbar.sort_status')}</option>
          <option value="cpu">{t('monitoring.toolbar.sort_cpu')}</option>
          <option value="temp">{t('monitoring.toolbar.sort_temp')}</option>
          <option value="power">{t('monitoring.toolbar.sort_power')}</option>
          <option value="name">{t('monitoring.toolbar.sort_name')}</option>
        </select>

        <button onClick={() => setGroupByChannel((v) => !v)}
          className={cn('px-2.5 py-1.5 text-[10px] font-mono-val rounded border transition-colors',
            groupByChannel ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' : 'border-[#2e333d] text-[#8b919e] hover:text-[#e4e7ec]'
          )}>
          {t('monitoring.toolbar.channel_group')}
        </button>

        <div className="ml-auto flex rounded border border-[#2e333d] overflow-hidden">
          <button onClick={() => setViewMode('grid')}
            className={cn('p-1.5 transition-colors', viewMode === 'grid' ? 'bg-amber-500/20 text-amber-400' : 'text-[#8b919e] hover:text-[#e4e7ec]')}
          ><LayoutGrid size={14} /></button>
          <button onClick={() => setViewMode('list')}
            className={cn('p-1.5 transition-colors', viewMode === 'list' ? 'bg-amber-500/20 text-amber-400' : 'text-[#8b919e] hover:text-[#e4e7ec]')}
          ><List size={14} /></button>
        </div>

        <span className="text-[10px] text-[#555d6e] font-mono-val">{filtered.length}/{enriched.length} cihaz</span>
      </div>

      {/* Content groups */}
      {groups.map((group) => (
        <div key={group.label || 'all'} className="space-y-3">
          {groupByChannel && group.label && (
            <h3 className="text-[10px] font-mono-val text-[#8b919e] uppercase tracking-widest pb-1.5 border-b border-[#2e333d]">
              {group.label}
              <span className="ml-2 text-[#555d6e]">— {group.items.length} cihaz</span>
            </h3>
          )}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {group.items.map((asset) => (
                <MonitoringCard key={asset.assetId} asset={asset as MonitoringAsset} isFlash={flashOffline.has(asset.assetId)} />
              ))}
            </div>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-[#2e333d]">
                    <th className="py-2 px-3 text-[9px] font-mono-val text-[#555d6e] uppercase tracking-wider text-left">{t('monitoring.table.device')}</th>
                    <th className="py-2 px-3 text-[9px] font-mono-val text-[#555d6e] uppercase tracking-wider text-left">{t('monitoring.table.status')}</th>
                    <th className="py-2 px-3 text-[9px] font-mono-val text-[#555d6e] uppercase tracking-wider text-left">{t('monitoring.table.cpu')}</th>
                    <th className="py-2 px-3 text-[9px] font-mono-val text-[#555d6e] uppercase tracking-wider text-left">{t('monitoring.table.temp')}</th>
                    <th className="py-2 px-3 text-[9px] font-mono-val text-[#555d6e] uppercase tracking-wider text-left">{t('monitoring.table.power')}</th>
                    <th className="py-2 px-3 text-[9px] font-mono-val text-[#555d6e] uppercase tracking-wider text-left">{t('monitoring.table.ram')}</th>
                    <th className="py-2 px-3 text-[9px] font-mono-val text-[#555d6e] uppercase tracking-wider text-left">{t('monitoring.table.trend')}</th>
                    <th className="py-2 px-3 text-[9px] font-mono-val text-[#555d6e] uppercase tracking-wider text-right">{t('monitoring.table.update')}</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((asset) => (
                    <MonitoringRow key={asset.assetId} asset={asset as MonitoringAsset} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="card p-12 text-center">
          <Activity size={32} className="text-[#2e333d] mx-auto mb-3" />
          <p className="text-sm text-[#555d6e] font-mono-val">Eşleşen cihaz bulunamadı</p>
          <p className="text-xs text-[#555d6e] font-mono-val mt-1">Filtrelerinizi değiştirmeyi deneyin</p>
        </div>
      )}
    </div>
  );
}
