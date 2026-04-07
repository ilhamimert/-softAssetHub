import { cn, tempColor, usageColor } from '@/lib/utils';
import type { MonitoringAsset } from '@/types';
import { Sparkline } from './Sparkline';

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 5) return 'şimdi';
  if (s < 60) return `${s}sn`;
  if (s < 3600) return `${Math.floor(s / 60)}dk`;
  if (s < 86400) return `${Math.floor(s / 3600)}sa`;
  return `${Math.floor(s / 86400)}g`;
}

const barColor = (pct: number) =>
  pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-green-500';

export function MonitoringRow({ asset }: { asset: MonitoringAsset }) {
  const isOnline = asset.isOnline !== false;
  const cpuPct = Math.min(asset.cpuUsage ?? 0, 100);

  return (
    <tr className={cn('border-b border-[#2e333d] hover:bg-[#1a1d23]/60 transition-colors', !isOnline && 'bg-red-500/5')}>
      <td className="py-2 px-3">
        <div className="flex items-center gap-2">
          <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', isOnline ? 'bg-green-400 pulse-dot' : 'bg-red-400')} />
          <span className="text-xs text-[#e4e7ec] font-medium">{asset.assetName}</span>
          {asset._alerts > 0 && (
            <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
              {asset._alerts}⚠
            </span>
          )}
        </div>
        <p className="text-[10px] text-[#555d6e] font-mono-val pl-3.5 mt-0.5">{asset.channelName} · {asset.groupName}</p>
      </td>
      <td className="py-2 px-3">
        <span className={cn('text-[10px] font-mono-val font-bold tracking-wider', isOnline ? 'text-green-400' : 'text-red-400')}>
          {isOnline ? 'ONL' : 'OFF'}
        </span>
      </td>
      <td className="py-2 px-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-[#2e333d] rounded-full overflow-hidden w-16">
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
          ? <Sparkline data={asset._cpuHist} color="#5b9bd5" width={48} height={14} />
          : <span className="text-[9px] text-[#555d6e]">—</span>
        }
      </td>
      <td className="py-2 px-3 text-right">
        <span className="text-[9px] font-mono-val text-[#555d6e]">
          {asset._lastUpdated ? timeAgo(asset._lastUpdated) : '—'}
        </span>
      </td>
    </tr>
  );
}
