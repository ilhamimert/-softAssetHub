import { Thermometer, Zap, WifiOff } from 'lucide-react';
import { cn, tempColor } from '@/lib/utils';
import type { MonitoringAsset } from '@/types';
import { GaugeBar } from './GaugeBar';
import { Sparkline } from './Sparkline';

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 5) return 'şimdi';
  if (s < 60) return `${s}sn`;
  if (s < 3600) return `${Math.floor(s / 60)}dk`;
  if (s < 86400) return `${Math.floor(s / 3600)}sa`;
  return `${Math.floor(s / 86400)}g`;
}

export function MonitoringCard({ asset, isFlash }: { asset: MonitoringAsset; isFlash: boolean }) {
  const isOnline = asset.isOnline !== false;

  return (
    <div className={cn(
      'card p-4 border transition-all duration-300',
      isOnline ? 'border-[#2e333d]' : 'border-red-500/40 bg-red-500/5',
      isFlash && 'animate-pulse !border-red-500/80'
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('w-2 h-2 rounded-full flex-shrink-0', isOnline ? 'bg-green-400 pulse-dot' : 'bg-red-400')} />
            <p className="text-xs text-[#e4e7ec] font-medium truncate">{asset.assetName}</p>
            {asset._alerts > 0 && (
              <span className="flex-shrink-0 px-1 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                {asset._alerts}⚠
              </span>
            )}
          </div>
          <div className="flex items-center justify-between mt-0.5 pl-4">
            <p className="text-[10px] text-[#555d6e] font-mono-val truncate">
              {asset.channelName} · {asset.groupName}
            </p>
            {asset._lastUpdated && (
              <span className="text-[9px] text-[#555d6e] font-mono-val flex-shrink-0 ml-1">
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

          <div className="grid grid-cols-3 gap-1 pt-2 border-t border-[#2e333d] items-center">
            {asset.temperature != null && (
              <div className="flex items-center gap-1">
                <Thermometer size={10} className="text-[#8b919e]" />
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
                <Sparkline data={asset._cpuHist} color="#5b9bd5" />
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
            <span className="text-[10px] text-[#8b919e] font-mono-val">
              Son görülme: {timeAgo(asset._lastSeen)} önce
            </span>
          )}
        </div>
      )}
    </div>
  );
}
