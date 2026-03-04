import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { monitoringApi } from '@/api/client';
import { cn, tempColor, usageColor } from '@/lib/utils';
import { Wifi, WifiOff, Zap, Thermometer, Activity } from 'lucide-react';

function GaugeBar({ value, label, unit = '%', max = 100 }: { value?: number; label: string; unit?: string; max?: number }) {
  const pct = value != null ? Math.min((value / max) * 100, 100) : 0;
  const color =
    pct >= 90 ? 'bg-red-500'    :
    pct >= 75 ? 'bg-amber-500'  :
    pct >= 50 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-[#6B84A3] font-mono-val uppercase tracking-wider">{label}</span>
        <span className={cn('text-xs font-mono-val font-semibold', value != null ? (
          pct >= 90 ? 'text-red-400' : pct >= 75 ? 'text-amber-400' : pct >= 50 ? 'text-yellow-400' : 'text-green-400'
        ) : 'text-[#3D5275]')}>
          {value != null ? `${value.toFixed(1)}${unit}` : '-'}
        </span>
      </div>
      <div className="h-1.5 bg-[#1E2D45] rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Monitoring() {
  const wsRef = useRef<WebSocket | null>(null);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [liveData, setLiveData] = useState<Map<number, any>>(new Map());

  const { data: heatmapData, refetch } = useQuery({
    queryKey: ['heatmap-monitor'],
    queryFn: () => monitoringApi.getHeatmap(),
    refetchInterval: 10000,
  });

  const assets: any[] = heatmapData?.data?.data ?? [];

  // WebSocket connection
  useEffect(() => {
    const wsUrl = `ws://${window.location.hostname}:5000/monitoring/realtime`;
    setWsStatus('connecting');

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsStatus('connected');
        ws.send(JSON.stringify({ type: 'SUBSCRIBE' }));
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'ASSET_UPDATE') {
            setLiveData(prev => new Map(prev).set(msg.assetId, msg.data));
          } else if (msg.type === 'BATCH_UPDATE' && Array.isArray(msg.data)) {
            setLiveData(prev => {
              const next = new Map(prev);
              msg.data.forEach((d: any) => next.set(d.AssetID, d));
              return next;
            });
          }
        } catch { /* ignore */ }
      };

      ws.onclose  = () => setWsStatus('disconnected');
      ws.onerror  = () => setWsStatus('disconnected');
    } catch {
      setWsStatus('disconnected');
    }

    return () => {
      wsRef.current?.close();
    };
  }, []);

  const getAssetData = (assetId: number) => liveData.get(assetId);

  return (
    <div className="space-y-4 fade-in-up">
      {/* WS Status */}
      <div className="flex items-center gap-3">
        <div className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-mono-val',
          wsStatus === 'connected'    ? 'bg-green-500/10 border-green-500/25 text-green-400' :
          wsStatus === 'connecting'   ? 'bg-amber-500/10 border-amber-500/25 text-amber-400' :
          'bg-red-500/10 border-red-500/25 text-red-400'
        )}>
          {wsStatus === 'connected' ? <Wifi size={12} /> : <WifiOff size={12} />}
          <span className={cn('w-1.5 h-1.5 rounded-full', wsStatus === 'connected' ? 'bg-green-400 pulse-dot' : 'bg-red-400')} />
          {wsStatus === 'connected' ? 'WEBSOCKET BAĞLI — CANLI VERİ' : wsStatus === 'connecting' ? 'BAĞLANIYOR...' : 'WEBSOCKET BAĞLANTISI YOK — POLLING MOD'}
        </div>
        <span className="text-[10px] text-[#3D5275] font-mono-val">{assets.length} cihaz izleniyor</span>
      </div>

      {/* Asset grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {assets.map(asset => {
          const live = getAssetData(asset.AssetID) ?? asset;
          const isOnline = live.IsOnline !== false;

          return (
            <div
              key={asset.AssetID}
              className={cn(
                'card p-4 border transition-all',
                !isOnline ? 'border-red-500/30 bg-red-500/5' : 'border-[#1E2D45]'
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'w-2 h-2 rounded-full flex-shrink-0',
                      isOnline ? 'bg-green-400 pulse-dot' : 'bg-red-400'
                    )} />
                    <p className="text-xs text-[#E2EAF4] font-medium truncate">{asset.AssetName}</p>
                  </div>
                  <p className="text-[10px] text-[#3D5275] font-mono-val mt-0.5 truncate">
                    {asset.ChannelName} · {asset.RoomName}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/15 font-mono-val">
                    {asset.AssetType}
                  </span>
                </div>
              </div>

              {/* Metrics */}
              {isOnline ? (
                <div className="space-y-2.5">
                  {live.GPUUsage   != null && <GaugeBar value={live.GPUUsage}   label="GPU" />}
                  {live.CPUUsage   != null && <GaugeBar value={live.CPUUsage}   label="CPU" />}
                  {live.RAMUsage   != null && <GaugeBar value={live.RAMUsage}   label="RAM" />}
                  {live.DiskUsage  != null && <GaugeBar value={live.DiskUsage}  label="Disk" />}

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1E2D45]">
                    {live.Temperature != null && (
                      <div className="flex items-center gap-1.5">
                        <Thermometer size={11} className="text-[#6B84A3]" />
                        <span className={cn('text-xs font-mono-val font-semibold', tempColor(live.Temperature))}>
                          {live.Temperature}°C
                        </span>
                      </div>
                    )}
                    {live.PowerConsumption != null && (
                      <div className="flex items-center gap-1.5">
                        <Zap size={11} className="text-amber-400/60" />
                        <span className="text-xs font-mono-val text-amber-400">{live.PowerConsumption}W</span>
                      </div>
                    )}
                    {live.PerformanceScore != null && (
                      <div className="flex items-center gap-1.5 col-span-2">
                        <Activity size={11} className="text-[#6B84A3]" />
                        <span className="text-[10px] text-[#6B84A3] font-mono-val">Perf: </span>
                        <span className="text-[10px] font-mono-val text-cyan-400">{live.PerformanceScore?.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 py-4 text-red-400">
                  <WifiOff size={14} />
                  <span className="text-xs font-mono-val">OFFLINE</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {assets.length === 0 && (
        <div className="card p-12 text-center">
          <Activity size={32} className="text-[#1E2D45] mx-auto mb-3" />
          <p className="text-sm text-[#3D5275] font-mono-val">Monitoring verisi bulunamadı</p>
          <p className="text-xs text-[#3D5275] font-mono-val mt-1">Cihazların veri göndermesi bekleniyor...</p>
        </div>
      )}
    </div>
  );
}
