import { cn } from '@/lib/utils';

export function GaugeBar({ value, label, unit = '%', max = 100, variant: _variant = 'cpu' }: {
  value?: number; label: string; unit?: string; max?: number;
  variant?: 'cpu' | 'gpu' | 'ram' | 'disk';
}) {
  const pct = value != null ? Math.min((value / max) * 100, 100) : 0;
  const bar = pct >= 90 ? 'bg-red-500' : 'bg-indigo-500/70';
  const text = pct >= 90 ? 'text-red-400' : pct >= 75 ? 'text-amber-400' : 'text-slate-300';

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-[#8b919e] font-mono-val uppercase tracking-wider">{label}</span>
        <span className={cn('text-xs font-mono-val font-semibold', value != null ? text : 'text-[#555d6e]')}>
          {value != null ? `${value.toFixed(1)}${unit}` : '—'}
        </span>
      </div>
      <div className="h-1.5 bg-[#2e333d] rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500', bar)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
