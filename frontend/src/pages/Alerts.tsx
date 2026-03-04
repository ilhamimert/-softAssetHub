import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, AlertTriangle, Info, CheckCircle, Trash2, Clock } from 'lucide-react';
import { alertApi } from '@/api/client';
import { cn, alertBg, formatDateTime, timeAgo } from '@/lib/utils';
import type { Alert, AlertType } from '@/types';

const TYPE_ICONS: Record<AlertType, React.ReactNode> = {
  Critical: <AlertCircle size={14} className="text-red-400" />,
  Warning:  <AlertTriangle size={14} className="text-amber-400" />,
  Info:     <Info size={14} className="text-cyan-400" />,
};

const SEVERITY_BARS = (n: number) => (
  <div className="flex items-end gap-0.5 h-4">
    {Array.from({ length: 5 }, (_, i) => (
      <div
        key={i}
        className={cn(
          'w-1 rounded-sm',
          i < n ? (n >= 4 ? 'bg-red-400' : n >= 3 ? 'bg-amber-400' : 'bg-cyan-400') : 'bg-[#1E2D45]'
        )}
        style={{ height: `${(i + 1) * 3 + 4}px` }}
      />
    ))}
  </div>
);

export function Alerts() {
  const qc = useQueryClient();
  const [tab,       setTab]       = useState<'unresolved' | 'all'>('unresolved');
  const [typeFilter, setTypeFilter] = useState('');
  const [selected,  setSelected]  = useState<number[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['alerts', { tab, typeFilter }],
    queryFn: () => alertApi.getAll({
      isResolved: tab === 'unresolved' ? 0 : undefined,
      alertType:  typeFilter || undefined,
      limit: 100,
    }),
    refetchInterval: 20000,
  });

  const resolveMut = useMutation({
    mutationFn: (id: number) => alertApi.resolve(id, 'Dashboard üzerinden çözüldü'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => alertApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const alerts: Alert[] = data?.data?.data ?? [];

  const stats = {
    critical: alerts.filter(a => a.AlertType === 'Critical').length,
    warning:  alerts.filter(a => a.AlertType === 'Warning').length,
    info:     alerts.filter(a => a.AlertType === 'Info').length,
  };

  const toggleSelect = (id: number) =>
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  return (
    <div className="space-y-4 fade-in-up">
      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Kritik', count: stats.critical, color: 'red',   icon: <AlertCircle size={16} className="text-red-400" /> },
          { label: 'Uyarı',  count: stats.warning,  color: 'amber', icon: <AlertTriangle size={16} className="text-amber-400" /> },
          { label: 'Bilgi',  count: stats.info,      color: 'cyan',  icon: <Info size={16} className="text-cyan-400" /> },
        ].map(({ label, count, color, icon }) => (
          <div key={label} className={cn(
            'card p-3 flex items-center gap-3',
            `border border-${color}-500/20 bg-${color}-500/5`
          )}>
            {icon}
            <div>
              <p className={`font-display font-bold text-2xl text-${color}-400 leading-none`}>{count}</p>
              <p className="text-[10px] text-[#6B84A3] font-mono-val uppercase tracking-wider mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="card p-3 flex items-center gap-3">
        {/* Tabs */}
        <div className="flex gap-1 bg-[#131C2E] rounded p-0.5">
          {(['unresolved', 'all'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-3 py-1.5 rounded text-xs font-mono-val transition-all',
                tab === t
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                  : 'text-[#6B84A3] hover:text-[#E2EAF4]'
              )}
            >
              {t === 'unresolved' ? 'Açık Uyarılar' : 'Tümü'}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="bg-[#131C2E] border border-[#1E2D45] rounded text-xs text-[#E2EAF4] px-2 py-1.5 outline-none"
        >
          <option value="">Tüm Türler</option>
          <option value="Critical">Kritik</option>
          <option value="Warning">Uyarı</option>
          <option value="Info">Bilgi</option>
        </select>

        <div className="flex-1" />

        {selected.length > 0 && (
          <button
            onClick={() => { selected.forEach(id => resolveMut.mutate(id)); setSelected([]); }}
            className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded bg-green-500/10 border border-green-500/25 text-green-400 hover:bg-green-500/20 font-mono-val"
          >
            <CheckCircle size={11} />
            {selected.length} UYARIYI ÇÖZ
          </button>
        )}
      </div>

      {/* Alert list */}
      <div className="space-y-2">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-4 h-16 animate-pulse bg-[#131C2E]" />
          ))
          : alerts.length === 0
          ? (
            <div className="card p-12 text-center">
              <CheckCircle size={32} className="text-green-400 mx-auto mb-3" />
              <p className="text-sm text-[#6B84A3] font-mono-val">Tüm uyarılar çözüldü</p>
            </div>
          )
          : alerts.map(alert => (
            <div
              key={alert.AlertID}
              className={cn(
                'card p-3 border flex items-start gap-3 transition-all',
                alertBg(alert.AlertType),
                alert.IsResolved && 'opacity-50',
                selected.includes(alert.AlertID) && 'ring-1 ring-amber-500/40'
              )}
            >
              {/* Checkbox */}
              {!alert.IsResolved && (
                <input
                  type="checkbox"
                  checked={selected.includes(alert.AlertID)}
                  onChange={() => toggleSelect(alert.AlertID)}
                  className="mt-0.5 accent-amber-500 cursor-pointer"
                />
              )}

              {/* Icon */}
              <div className="mt-0.5 flex-shrink-0">
                {TYPE_ICONS[alert.AlertType]}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm leading-snug">{alert.AlertMessage}</p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {SEVERITY_BARS(alert.AlertSeverity)}
                    {!alert.IsResolved && (
                      <>
                        <button
                          onClick={() => resolveMut.mutate(alert.AlertID)}
                          className="p-1 rounded hover:bg-green-500/20 text-green-400/60 hover:text-green-400 transition-colors"
                          title="Çöz"
                        >
                          <CheckCircle size={13} />
                        </button>
                        <button
                          onClick={() => deleteMut.mutate(alert.AlertID)}
                          className="p-1 rounded hover:bg-red-500/20 text-red-400/40 hover:text-red-400 transition-colors"
                          title="Sil"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[10px] opacity-70 font-mono-val">
                  {alert.AssetName && <span>{alert.AssetName}</span>}
                  {alert.ChannelName && <span>·  {alert.ChannelName}</span>}
                  {alert.AlertCategory && <span>· {alert.AlertCategory}</span>}
                  <span className="flex items-center gap-1">
                    <Clock size={9} />
                    {timeAgo(alert.TriggeredTime)}
                  </span>
                  {alert.IsResolved && alert.ResolvedTime && (
                    <span className="text-green-400">✓ {formatDateTime(alert.ResolvedTime)}</span>
                  )}
                </div>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}
