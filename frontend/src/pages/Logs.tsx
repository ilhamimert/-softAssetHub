import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/api/client';
import type { ActivityLog } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { ScrollText, Search, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

const ACTION_COLORS: Record<string, string> = {
  create:         'text-green-400 bg-green-500/10 border-green-500/20',
  update:         'text-blue-400 bg-blue-500/10 border-blue-500/20',
  delete:         'text-red-400 bg-red-500/10 border-red-500/20',
  login:          'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  logout:         'text-slate-400 bg-slate-500/10 border-slate-500/20',
  bulk_import:    'text-purple-400 bg-purple-500/10 border-purple-500/20',
  export:         'text-amber-400 bg-amber-500/10 border-amber-500/20',
  status_change:  'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
};

function actionCls(action: string) {
  const key = Object.keys(ACTION_COLORS).find(k => action?.toLowerCase().includes(k));
  return key ? ACTION_COLORS[key] : 'text-[#8b919e] bg-[#2e333d]/50 border-[#2e333d]';
}

const PAGE_SIZE = 50;

export function Logs() {
  const { t } = useTranslation();
  const [page, setPage]               = useState(1);
  const [search, setSearch]           = useState('');
  const [entityType, setEntityType]   = useState('');

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['activity-log', page, entityType],
    queryFn: () => api.get('/logs/activity', { params: { page, limit: PAGE_SIZE, entityType: entityType || undefined } }),
    staleTime: 30_000,
  });

  const logs: ActivityLog[] = data?.data?.data ?? [];

  // Client-side name/action filter
  const filtered = search
    ? logs.filter(l =>
        (l.action ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (l.fullName ?? l.username ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (l.entityName ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  const entityTypes = ['asset', 'user', 'maintenance', 'alert', 'license', 'hierarchy'];

  return (
    <div className="space-y-4 fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ScrollText size={16} className="text-amber-400 flex-shrink-0" />
        <div>
          <h1 className="text-base font-display font-bold text-[#e4e7ec]">{t('common.logs')}</h1>
          <p className="text-[10px] text-[#555d6e] font-mono-val">{t('logs.subtitle')}</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="ml-auto p-2 rounded border border-[#2e333d] text-[#8b919e] hover:text-[#5b8fd5] hover:border-[#5b8fd5]/30 transition-colors disabled:opacity-50"
          title={t('logs.refresh')}
        >
          <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#555d6e]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('logs.search_placeholder')}
            className="pl-6 pr-3 py-1.5 text-xs bg-[#1a1d23] border border-[#2e333d] rounded text-[#e4e7ec] placeholder-[#555d6e] focus:outline-none focus:border-[#5b8fd5]/40 w-52"
          />
        </div>

        <select
          value={entityType}
          onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
          className="px-2 py-1.5 text-xs bg-[#1a1d23] border border-[#2e333d] rounded text-[#e4e7ec] focus:outline-none focus:border-[#5b8fd5]/40"
        >
          <option value="">{t('logs.all_types')}</option>
          {entityTypes.map(et => (
            <option key={et} value={et}>{et.charAt(0).toUpperCase() + et.slice(1)}</option>
          ))}
        </select>

        <span className="ml-auto text-[10px] text-[#555d6e] font-mono-val self-center">
          {t('logs.count', { count: filtered.length, page })}
        </span>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-8 bg-[#2e333d]/40 rounded animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ScrollText size={32} className="text-[#2e333d] mb-3" />
            <p className="text-sm text-[#555d6e] font-mono-val">{t('logs.no_records')}</p>
          </div>
        ) : (
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-[#2e333d]">
                <th className="py-2 px-3 text-[9px] font-mono-val text-[#555d6e] uppercase tracking-wider text-left">{t('logs.table.date')}</th>
                <th className="py-2 px-3 text-[9px] font-mono-val text-[#555d6e] uppercase tracking-wider text-left">{t('logs.table.user')}</th>
                <th className="py-2 px-3 text-[9px] font-mono-val text-[#555d6e] uppercase tracking-wider text-left">{t('logs.table.action')}</th>
                <th className="py-2 px-3 text-[9px] font-mono-val text-[#555d6e] uppercase tracking-wider text-left">{t('logs.table.type')}</th>
                <th className="py-2 px-3 text-[9px] font-mono-val text-[#555d6e] uppercase tracking-wider text-left">{t('logs.table.record')}</th>
                <th className="py-2 px-3 text-[9px] font-mono-val text-[#555d6e] uppercase tracking-wider text-left">{t('logs.table.detail')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log: ActivityLog) => (
                <tr key={log.logId} className="border-b border-[#2e333d]/50 hover:bg-[#1a1d23]/60 transition-colors">
                  <td className="py-2 px-3">
                    <span className="text-[10px] text-[#8b919e] font-mono-val whitespace-nowrap">
                      {formatDateTime(log.timestamp)}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <span className="text-xs text-[#e4e7ec] font-medium">{log.fullName ?? log.username ?? '—'}</span>
                  </td>
                  <td className="py-2 px-3">
                    <span className={cn('text-[10px] font-mono-val px-1.5 py-0.5 rounded border', actionCls(log.action))}>
                      {log.action ?? '—'}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <span className="text-[10px] text-[#8b919e] font-mono-val">{log.entityType ?? '—'}</span>
                  </td>
                  <td className="py-2 px-3">
                    <span className="text-xs text-[#e4e7ec] font-mono-val">
                      {log.entityId ? `#${log.entityId}` : '—'}
                    </span>
                  </td>
                  <td className="py-2 px-3 max-w-[260px]">
                    <span className="text-[10px] text-[#8b919e] font-mono-val truncate block"
                      title={log.newValue ?? log.oldValue ?? ''}>
                      {log.newValue ?? log.oldValue ?? '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          className="flex items-center gap-1 px-3 py-1.5 text-xs rounded border border-[#2e333d] text-[#8b919e] hover:text-[#5b8fd5] hover:border-[#5b8fd5]/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={13} /> {t('common.previous')}
        </button>
        <span className="text-[10px] text-[#555d6e] font-mono-val">{t('common.page')} {page}</span>
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={logs.length < PAGE_SIZE}
          className="flex items-center gap-1 px-3 py-1.5 text-xs rounded border border-[#2e333d] text-[#8b919e] hover:text-[#5b8fd5] hover:border-[#5b8fd5]/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t('common.next')} <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}
