import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Search, AlertTriangle, CheckCircle2, Clock, XCircle, ExternalLink, Copy, Check, Plus, X, ClipboardList } from 'lucide-react';
import { licenseApi, licenseRequestApi, assetApi } from '@/api/client';
import type { License, LicenseRequest } from '@/types';
import type { TFunction } from 'i18next';
import { useAuthStore } from '@/store/authStore';

type StatusFilter = 'all' | 'active' | 'inactive' | 'expiring' | 'expired';
type Tab = 'licenses' | 'requests';

function expiryColor(daysLeft: number | null, isActive: boolean): string {
  if (!isActive) return 'text-[#555d6e]';
  if (daysLeft === null) return 'text-[#8b919e]';
  if (daysLeft < 0) return 'text-red-400';
  if (daysLeft <= 7) return 'text-red-400';
  if (daysLeft <= 60) return 'text-amber-400';
  return 'text-green-400';
}

function expiryBadge(daysLeft: number | null, isActive: boolean, t: TFunction) {
  if (!isActive) return null;
  if (daysLeft === null) return null;
  if (daysLeft < 0) return { label: t('licenses.expiry.expired'), cls: 'bg-red-500/10 border-red-500/20 text-red-400' };
  if (daysLeft <= 7) return { label: t('licenses.expiry.days_left', { days: daysLeft }), cls: 'bg-red-500/10 border-red-500/20 text-red-400' };
  if (daysLeft <= 60) return { label: t('licenses.expiry.days_left', { days: daysLeft }), cls: 'bg-amber-500/10 border-amber-500/20 text-amber-400' };
  return null;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="ml-1 p-0.5 rounded text-[#555d6e] hover:text-[#5b8fd5] transition-colors flex-shrink-0"
      title="Kopyala"
    >
      {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
    </button>
  );
}

function StatusBadge({ status }: { status: LicenseRequest['status'] }) {
  const map = {
    pending:  { cls: 'bg-amber-500/10 border-amber-500/20 text-amber-400',  label: 'Bekliyor' },
    approved: { cls: 'bg-green-500/10 border-green-500/20 text-green-400',  label: 'Onaylandı' },
    rejected: { cls: 'bg-red-500/10 border-red-500/20 text-red-400',        label: 'Reddedildi' },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-mono ${s.cls}`}>
      <span className="w-1 h-1 rounded-full bg-current" />
      {s.label}
    </span>
  );
}

// ── New Request Modal ──────────────────────────────────────────────────────────
function NewRequestModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [assetId, setAssetId]     = useState('');
  const [licenseType, setLicType] = useState('');
  const [quantity, setQuantity]   = useState(1);
  const [reason, setReason]       = useState('');

  const { data: assetsData } = useQuery({
    queryKey: ['assets-list'],
    queryFn: () => assetApi.getAll({ limit: 500 }).then(r => r.data.data as { assetId: number; assetName: string }[]),
    staleTime: 60000,
  });

  const mutation = useMutation({
    mutationFn: () => licenseRequestApi.create({ assetId: parseInt(assetId), licenseType, quantity, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['license-requests'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1d23] border border-[#2e333d] rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2e333d]">
          <h2 className="text-sm font-semibold text-[#e4e7ec]">Yeni Lisans Talebi</h2>
          <button onClick={onClose} className="text-[#555d6e] hover:text-[#e4e7ec] transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {/* Asset */}
          <div>
            <label className="block text-[10px] font-mono text-[#555d6e] mb-1.5">Varlık *</label>
            <select
              value={assetId}
              onChange={e => setAssetId(e.target.value)}
              className="w-full px-3 py-2 bg-[#111318] border border-[#2e333d] rounded text-xs text-[#e4e7ec] focus:outline-none focus:border-[#5b8fd5]/40"
            >
              <option value="">Seçiniz...</option>
              {(assetsData ?? []).map(a => (
                <option key={a.assetId} value={a.assetId}>{a.assetName}</option>
              ))}
            </select>
          </div>
          {/* License Type */}
          <div>
            <label className="block text-[10px] font-mono text-[#555d6e] mb-1.5">Lisans Türü *</label>
            <input
              value={licenseType}
              onChange={e => setLicType(e.target.value)}
              placeholder="ör. Adobe Premiere Pro, Windows Server..."
              className="w-full px-3 py-2 bg-[#111318] border border-[#2e333d] rounded text-xs text-[#e4e7ec] placeholder-[#555d6e] focus:outline-none focus:border-[#5b8fd5]/40"
            />
          </div>
          {/* Quantity */}
          <div>
            <label className="block text-[10px] font-mono text-[#555d6e] mb-1.5">Miktar</label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2 bg-[#111318] border border-[#2e333d] rounded text-xs text-[#e4e7ec] focus:outline-none focus:border-[#5b8fd5]/40"
            />
          </div>
          {/* Reason */}
          <div>
            <label className="block text-[10px] font-mono text-[#555d6e] mb-1.5">Gerekçe</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              placeholder="Neden gerekli olduğunu açıklayın..."
              className="w-full px-3 py-2 bg-[#111318] border border-[#2e333d] rounded text-xs text-[#e4e7ec] placeholder-[#555d6e] focus:outline-none focus:border-[#5b8fd5]/40 resize-none"
            />
          </div>
          {mutation.isError && (
            <p className="text-[10px] text-red-400 font-mono">Hata oluştu, tekrar deneyin.</p>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#2e333d]">
          <button onClick={onClose} className="px-3 py-1.5 rounded border border-[#2e333d] text-xs text-[#8b919e] hover:text-[#e4e7ec] transition-colors">
            İptal
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!assetId || !licenseType.trim() || mutation.isPending}
            className="px-3 py-1.5 rounded bg-[#5b8fd5] text-xs text-white font-medium hover:bg-[#5b8fd5]/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {mutation.isPending ? 'Gönderiliyor...' : 'Talep Oluştur'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Review Modal ───────────────────────────────────────────────────────────────
function ReviewModal({ request, onClose }: { request: LicenseRequest; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');

  const mutation = useMutation({
    mutationFn: (status: 'approved' | 'rejected') =>
      licenseRequestApi.review(request.requestId, { status, reviewNote: note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['license-requests'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1d23] border border-[#2e333d] rounded-lg w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2e333d]">
          <h2 className="text-sm font-semibold text-[#e4e7ec]">Talep İncele</h2>
          <button onClick={onClose} className="text-[#555d6e] hover:text-[#e4e7ec] transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="bg-[#111318] rounded p-3 space-y-1.5 text-xs">
            <p className="text-[#8b919e]"><span className="text-[#555d6e]">Varlık:</span> {request.assetName}</p>
            <p className="text-[#8b919e]"><span className="text-[#555d6e]">Lisans:</span> {request.licenseType}</p>
            <p className="text-[#8b919e]"><span className="text-[#555d6e]">Miktar:</span> {request.quantity}</p>
            {request.reason && <p className="text-[#8b919e]"><span className="text-[#555d6e]">Gerekçe:</span> {request.reason}</p>}
          </div>
          <div>
            <label className="block text-[10px] font-mono text-[#555d6e] mb-1.5">Not (opsiyonel)</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-[#111318] border border-[#2e333d] rounded text-xs text-[#e4e7ec] placeholder-[#555d6e] focus:outline-none focus:border-[#5b8fd5]/40 resize-none"
            />
          </div>
          {mutation.isError && (
            <p className="text-[10px] text-red-400 font-mono">Hata oluştu.</p>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#2e333d]">
          <button onClick={onClose} className="px-3 py-1.5 rounded border border-[#2e333d] text-xs text-[#8b919e] hover:text-[#e4e7ec] transition-colors">
            İptal
          </button>
          <button
            onClick={() => mutation.mutate('rejected')}
            disabled={mutation.isPending}
            className="px-3 py-1.5 rounded bg-red-500/20 border border-red-500/30 text-xs text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-40"
          >
            Reddet
          </button>
          <button
            onClick={() => mutation.mutate('approved')}
            disabled={mutation.isPending}
            className="px-3 py-1.5 rounded bg-green-500/20 border border-green-500/30 text-xs text-green-400 hover:bg-green-500/30 transition-colors disabled:opacity-40"
          >
            Onayla
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Requests Tab ───────────────────────────────────────────────────────────────
function RequestsTab() {
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [showNew, setShowNew] = useState(false);
  const [reviewing, setReviewing] = useState<LicenseRequest | null>(null);
  const user = useAuthStore(s => s.user);
  const isManager = user?.role === 'Admin' || user?.role === 'Manager';

  const params: Record<string, string> = {};
  if (statusFilter !== 'all') params.status = statusFilter;

  const { data, isLoading } = useQuery({
    queryKey: ['license-requests', statusFilter],
    queryFn: () => licenseRequestApi.getAll(params).then(r => r.data.data as LicenseRequest[]),
    staleTime: 30000,
  });

  const requests = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        {/* Status filters */}
        <div className="flex gap-1">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1.5 rounded border text-[10px] font-mono transition-all ${statusFilter === s
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-[#1a1d23] border-[#2e333d] text-[#8b919e] hover:text-[#e4e7ec]'
              }`}
            >
              {s === 'all' ? 'Tümü' : s === 'pending' ? 'Bekliyor' : s === 'approved' ? 'Onaylı' : 'Reddedildi'}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#5b8fd5]/10 border border-[#5b8fd5]/30 text-xs text-[#5b8fd5] hover:bg-[#5b8fd5]/20 transition-colors"
        >
          <Plus size={13} />
          Yeni Talep
        </button>
      </div>

      {isLoading ? (
        <div className="card p-8 text-center">
          <div className="w-6 h-6 border-2 border-[#5b8fd5]/30 border-t-[#5b8fd5] rounded-full animate-spin mx-auto" />
        </div>
      ) : requests.length === 0 ? (
        <div className="card p-12 text-center">
          <ClipboardList size={28} className="text-[#2e333d] mx-auto mb-3" />
          <p className="text-sm text-[#555d6e] font-mono">Talep bulunamadı.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#2e333d]">
                <th className="px-4 py-2.5 text-left text-[10px] font-mono text-[#555d6e]">Varlık</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-mono text-[#555d6e]">Lisans Türü</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-mono text-[#555d6e]">Miktar</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-mono text-[#555d6e]">Talep Eden</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-mono text-[#555d6e]">Durum</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-mono text-[#555d6e]">Tarih</th>
                {isManager && <th className="px-4 py-2.5 text-left text-[10px] font-mono text-[#555d6e]"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2e333d]/60">
              {requests.map(r => (
                <tr key={r.requestId} className="hover:bg-[#1a1d23]/60 transition-colors">
                  <td className="px-4 py-3 text-[#8b919e] font-mono-val">{r.assetName ?? `#${r.assetId}`}</td>
                  <td className="px-4 py-3 text-[#e4e7ec]">{r.licenseType}</td>
                  <td className="px-4 py-3 text-[#8b919e] font-mono-val">{r.quantity}</td>
                  <td className="px-4 py-3 text-[#8b919e]">{r.requesterName}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-[#555d6e] font-mono text-[10px]">
                    {new Date(r.createdAt).toLocaleDateString('tr-TR')}
                  </td>
                  {isManager && (
                    <td className="px-4 py-3">
                      {r.status === 'pending' && (
                        <button
                          onClick={() => setReviewing(r)}
                          className="px-2 py-1 rounded border border-[#2e333d] text-[10px] text-[#8b919e] hover:text-[#e4e7ec] hover:border-[#383e4a] transition-colors"
                        >
                          İncele
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNew && <NewRequestModal onClose={() => setShowNew(false)} />}
      {reviewing && <ReviewModal request={reviewing} onClose={() => setReviewing(null)} />}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function Licenses() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('licenses');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(val), 300);
  };

  const params: Record<string, string> = {};
  if (debouncedSearch) params.search = debouncedSearch;
  if (status !== 'all') params.status = status;

  const { data, isLoading } = useQuery({
    queryKey: ['licenses-all', debouncedSearch, status],
    queryFn: () => licenseApi.getAll(params).then(r => r.data.data as License[]),
    staleTime: 30000,
    enabled: activeTab === 'licenses',
  });

  const licenses = data ?? [];

  const statusButtons: { key: StatusFilter; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: t('common.all'), icon: <KeyRound size={12} /> },
    { key: 'active', label: t('common.active'), icon: <CheckCircle2 size={12} /> },
    { key: 'expiring', label: t('licenses.filter.expiring'), icon: <Clock size={12} /> },
    { key: 'expired', label: t('licenses.filter.expired'), icon: <XCircle size={12} /> },
    { key: 'inactive', label: t('common.passive'), icon: <AlertTriangle size={12} /> },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <KeyRound size={15} className="text-amber-400" />
          </div>
          <div>
            <h1 className="font-display text-base font-semibold text-[#e4e7ec] tracking-wide">
              {t('licenses.title')}
            </h1>
            <p className="text-[10px] text-[#555d6e] font-mono tracking-wider">
              {activeTab === 'licenses'
                ? (isLoading ? '...' : `${licenses.length} ${t('common.licenses').toLowerCase()}`)
                : 'Lisans talepleri'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#2e333d] pb-0">
        <button
          onClick={() => setActiveTab('licenses')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono border-b-2 transition-all -mb-px ${
            activeTab === 'licenses'
              ? 'border-[#5b8fd5] text-[#5b8fd5]'
              : 'border-transparent text-[#555d6e] hover:text-[#e4e7ec]'
          }`}
        >
          <KeyRound size={12} />
          Lisanslar
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono border-b-2 transition-all -mb-px ${
            activeTab === 'requests'
              ? 'border-[#5b8fd5] text-[#5b8fd5]'
              : 'border-transparent text-[#555d6e] hover:text-[#e4e7ec]'
          }`}
        >
          <ClipboardList size={12} />
          Talepler
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'requests' ? (
        <RequestsTab />
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-48 max-w-xs">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#555d6e]" />
              <input
                value={search}
                onChange={e => handleSearch(e.target.value)}
                placeholder={t('licenses.toolbar.search_placeholder')}
                className="w-full pl-8 pr-3 py-1.5 bg-[#1a1d23] border border-[#2e333d] rounded text-xs text-[#e4e7ec] placeholder-[#555d6e] focus:outline-none focus:border-[#5b8fd5]/40"
              />
            </div>
            <div className="flex gap-1">
              {statusButtons.map(btn => (
                <button
                  key={btn.key}
                  onClick={() => setStatus(btn.key)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-[10px] font-mono transition-all ${status === btn.key
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-[#1a1d23] border-[#2e333d] text-[#8b919e] hover:text-[#e4e7ec] hover:border-[#383e4a]'
                  }`}
                >
                  {btn.icon}
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="card p-8 text-center">
              <div className="w-6 h-6 border-2 border-[#5b8fd5]/30 border-t-[#5b8fd5] rounded-full animate-spin mx-auto" />
            </div>
          ) : licenses.length === 0 ? (
            <div className="card p-12 text-center">
              <KeyRound size={28} className="text-[#2e333d] mx-auto mb-3" />
              <p className="text-sm text-[#555d6e] font-mono-val">{t('licenses.no_licenses')}</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#2e333d]">
                    <th className="px-4 py-2.5 text-left text-[10px] font-mono text-[#555d6e] tracking-wider">{t('licenses.table.app')}</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-mono text-[#555d6e] tracking-wider">{t('licenses.table.asset')}</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-mono text-[#555d6e] tracking-wider">{t('licenses.table.key')}</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-mono text-[#555d6e] tracking-wider">{t('licenses.table.mac')}</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-mono text-[#555d6e] tracking-wider">{t('licenses.table.expiry')}</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-mono text-[#555d6e] tracking-wider">{t('licenses.table.features')}</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-mono text-[#555d6e] tracking-wider">{t('licenses.table.status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2e333d]/60">
                  {licenses.map((lic: License) => {
                    const daysLeft = lic.daysLeft ?? null;
                    const badge = expiryBadge(daysLeft, lic.isActive, t);
                    const flags: string[] = (() => {
                      try { return lic.featureFlags ? JSON.parse(lic.featureFlags) : []; }
                      catch { return []; }
                    })();

                    return (
                      <tr key={lic.licenseId} className="hover:bg-[#1a1d23]/60 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-amber-500/10 border border-amber-500/15 flex items-center justify-center flex-shrink-0">
                              <KeyRound size={10} className="text-amber-400" />
                            </div>
                            <div>
                              <p className="text-[#e4e7ec] font-mono-val font-medium">{lic.applicationName}</p>
                              {lic.description && (
                                <p className="text-[9px] text-[#555d6e] truncate max-w-[140px]">{lic.description}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => navigate(`/assets/${lic.assetId}`)}
                            className="text-[#8b919e] hover:text-[#5b8fd5] transition-colors font-mono-val text-left"
                          >
                            {lic.assetName}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          {lic.licenseKey ? (
                            <div className="flex items-center gap-1 max-w-[160px]">
                              <span className="font-mono text-[10px] text-[#8b919e] truncate">
                                {lic.licenseKey.length > 20
                                  ? `${lic.licenseKey.substring(0, 10)}...${lic.licenseKey.slice(-6)}`
                                  : lic.licenseKey}
                              </span>
                              <CopyButton text={lic.licenseKey} />
                              {lic.externalLicenseUrl && (
                                <a
                                  href={lic.externalLicenseUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#555d6e] hover:text-cyan-400 transition-colors flex-shrink-0"
                                  title="Harici URL"
                                >
                                  <ExternalLink size={10} />
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-[#383e4a] font-mono">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {lic.macId ? (
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-[10px] text-[#8b919e]">{lic.macId}</span>
                              <CopyButton text={lic.macId} />
                            </div>
                          ) : (
                            <span className="text-[#383e4a] font-mono">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {lic.expiryDate ? (
                            <div className="space-y-0.5">
                              <p className={`font-mono-val text-[11px] ${expiryColor(daysLeft, lic.isActive)}`}>
                                {new Date(lic.expiryDate).toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : 'en-US')}
                              </p>
                              {badge && (
                                <span className={`inline-flex px-1.5 py-0.5 rounded border text-[9px] font-mono ${badge.cls}`}>
                                  {badge.label}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[#383e4a] font-mono">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {flags.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-[180px]">
                              {flags.map((f: string) => (
                                <span key={f} className="px-1 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-[8px] text-cyan-400 font-mono">
                                  {f}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[#383e4a] font-mono">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-mono ${lic.isActive
                            ? 'bg-green-500/10 border-green-500/20 text-green-400'
                            : 'bg-[#2e333d]/40 border-[#2e333d] text-[#555d6e]'
                          }`}>
                            <span className={`w-1 h-1 rounded-full ${lic.isActive ? 'bg-green-400' : 'bg-[#555d6e]'}`} />
                            {lic.isActive ? t('common.active') : t('common.passive')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
