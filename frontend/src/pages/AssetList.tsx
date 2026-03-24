import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Search, Filter, Download, ChevronUp, ChevronDown, ChevronsUpDown,
  Eye, Edit, Trash2, Server, Cpu, Wifi, HardDrive, Monitor, Save,
} from 'lucide-react';
import { assetApi, channelApi } from '@/api/client';
import {
  cn, statusBg, tempColor, formatCurrency, formatDate,
  assetTypeLabel, statusLabel, inputCls,
} from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { FormField } from '@/components/ui/FormField';
import type { Asset } from '@/types';

const PAGE_SIZES = [10, 25, 50];

// ─── Sort icon ────────────────────────────────────────────────
function SortIcon({ col, sortBy, sortOrder }: { col: string; sortBy: string; sortOrder: string }) {
  if (sortBy !== col) return <ChevronsUpDown size={11} className="text-[#3D5275]" />;
  return sortOrder === 'ASC'
    ? <ChevronUp size={11} className="text-amber-400" />
    : <ChevronDown size={11} className="text-amber-400" />;
}

// ─── Sortable table header ─────────────────────────────────────
function Th({ label, col, className = '', sortBy, sortOrder, onSort }: {
  label: string; col?: string; className?: string;
  sortBy: string; sortOrder: string; onSort: (col: string) => void;
}) {
  return (
    <th
      className={cn('py-2 px-3 text-left text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val whitespace-nowrap', col && 'cursor-pointer hover:text-[#E2EAF4] select-none', className)}
      onClick={col ? () => onSort(col) : undefined}
    >
      <span className="flex items-center gap-1">
        {label}{col && <SortIcon col={col} sortBy={sortBy} sortOrder={sortOrder} />}
      </span>
    </th>
  );
}

// ─── Asset type icon ──────────────────────────────────────────
function AssetTypeIcon({ type, size = 14 }: { type: string; size?: number }) {
  const icons: Record<string, any> = { GPU: Cpu, DisplayCard: Monitor, Server, Disk: HardDrive, Network: Wifi };
  const Icon = icons[type] ?? Server;
  return <Icon size={size} />;
}

// ─── Info row ─────────────────────────────────────────────────
function InfoRow({ label, value, mono }: { label: string; value?: string | number | null; mono?: boolean }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-[#131C2E] last:border-0">
      <span className="text-[10px] text-[#6B84A3] uppercase tracking-wider font-mono-val w-32 flex-shrink-0 pt-0.5">{label}</span>
      <span className={cn('text-xs text-[#E2EAF4] flex-1', mono && 'font-mono-val')}>{value ?? '-'}</span>
    </div>
  );
}


// ─── View Modal ───────────────────────────────────────────────
function ViewModal({ asset, onClose, onEdit }: { asset: Asset | null; onClose: () => void; onEdit: () => void }) {
  const { t } = useTranslation();
  if (!asset) return null;
  return (
    <Modal open={!!asset} onClose={onClose} title={asset.assetName} size="lg">
      {/* Header */}
      <div className="flex items-start gap-4 mb-5 pb-4 border-b border-[#1E2D45]">
        <div className="w-14 h-14 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
          <AssetTypeIcon type={asset.assetType} size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-bold text-xl text-white">{asset.assetName}</h3>
            <span className={cn('text-[10px] px-2 py-0.5 rounded border font-mono-val', statusBg(asset.status))}>
              {statusLabel(asset.status)}
            </span>
            <span className={cn(
              'w-2 h-2 rounded-full',
              asset.isOnline === false ? 'bg-red-400' : 'bg-green-400 pulse-dot'
            )} />
          </div>
          <p className="text-xs text-[#6B84A3] mt-1 font-mono-val">
            {asset.channelName}{asset.groupName ? ` › ${asset.groupName}` : ''}
          </p>
          {asset.assetCode && (
            <p className="text-[10px] text-amber-400 font-mono-val mt-0.5">{asset.assetCode}</p>
          )}
        </div>
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-amber-500/10 border border-amber-500/25 text-amber-400 hover:bg-amber-500/20 font-mono-val transition-all"
        >
          <Edit size={11} /> {t('common.edit').toUpperCase()}
        </button>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val mb-2">{t('assets.details.device_info')}</p>
          <InfoRow label={t('assets.details.type')} value={assetTypeLabel(asset.assetType)} />
          <InfoRow label={t('assets.details.model')} value={asset.model} />
          <InfoRow label={t('assets.details.serial_no')} value={asset.serialNumber} mono />
          <InfoRow label={t('assets.details.manufacturer')} value={asset.manufacturer} />
          <InfoRow label={t('assets.details.supplier')} value={asset.supplier} />
          <InfoRow label={t('assets.details.ip_address')} value={asset.ipAddress} mono />
          <InfoRow label={t('assets.details.mac_address')} value={asset.macAddress} mono />
          <InfoRow label={t('assets.details.firmware')} value={asset.firmwareVersion} mono />
          <InfoRow label={t('assets.details.rack')} value={asset.rackPosition} mono />
        </div>
        <div>
          <p className="text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val mb-2">{t('assets.details.finance_info')}</p>
          <InfoRow label={t('assets.details.purchase')} value={formatDate(asset.purchaseDate ?? undefined)} />
          <InfoRow label={t('assets.details.warranty')} value={formatDate(asset.warrantyEndDate ?? undefined)} />
          <InfoRow label={t('assets.details.cost')} value={formatCurrency(asset.purchaseCost ?? undefined)} />
          <InfoRow label={t('assets.details.value')} value={formatCurrency(asset.currentValue ?? undefined)} />
          <InfoRow label={t('assets.details.depreciation')} value={asset.depreciationRate != null ? `%${asset.depreciationRate}${t('analytics.charts.health_sub').includes('/') ? ' / Yıl' : ' / Year'}` : null} />

          {/* Live stats if available */}
          {asset.lastTemperature != null && (
            <>
              <p className="text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val mb-2 mt-4">{t('assets.details.live_status')}</p>
              <InfoRow label={t('monitoring.table.temp')} value={`${asset.lastTemperature}°C`} mono />
              {asset.lastPowerConsumption != null && (
                <InfoRow label={t('monitoring.table.power')} value={`${asset.lastPowerConsumption}W`} mono />
              )}
            </>
          )}

          {asset.notes && (
            <div className="mt-3">
              <p className="text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val mb-1">{t('assets.details.notes')}</p>
              <p className="text-xs text-[#E2EAF4] bg-[#131C2E] rounded p-2 leading-relaxed">{asset.notes}</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────
function EditModal({ asset, onClose }: { asset: Asset | null; onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(
    asset ? {
      assetName: asset.assetName,
      assetType: asset.assetType,
      assetCode: asset.assetCode,
      model: asset.model,
      serialNumber: asset.serialNumber,
      manufacturer: asset.manufacturer,
      supplier: asset.supplier,
      ipAddress: asset.ipAddress,
      macAddress: asset.macAddress,
      firmwareVersion: asset.firmwareVersion,
      rackPosition: asset.rackPosition,
      status: asset.status,
      purchaseCost: asset.purchaseCost,
      currentValue: asset.currentValue,
      depreciationRate: asset.depreciationRate,
      purchaseDate: asset.purchaseDate?.slice(0, 10),
      warrantyEndDate: asset.warrantyEndDate?.slice(0, 10),
      notes: asset.notes,
    } as any : { assetName: '', assetType: 'Server', status: 'Active' }
  );
  const [error, setError] = useState('');

  const updateMut = useMutation({
    mutationFn: (body: object) => assetApi.update(asset!.assetId, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assets'] }); onClose(); },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Bir hata oluştu.'),
  });

  const setField = (key: string, val: any) => setForm((f: any) => ({ ...f, [key]: val }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    updateMut.mutate({
      assetName: form.assetName,
      assetCode: form.assetCode || undefined,
      assetType: form.assetType,
      model: (form as any).model || undefined,
      serialNumber: (form as any).serialNumber || undefined,
      manufacturer: (form as any).manufacturer || undefined,
      supplier: (form as any).supplier || undefined,
      ipAddress: (form as any).ipAddress || undefined,
      macAddress: (form as any).macAddress || undefined,
      firmwareVersion: (form as any).firmwareVersion || undefined,
      rackPosition: (form as any).rackPosition || undefined,
      status: form.status,
      purchaseCost: (form as any).purchaseCost ? parseFloat(String((form as any).purchaseCost)) : undefined,
      currentValue: (form as any).currentValue ? parseFloat(String((form as any).currentValue)) : undefined,
      depreciationRate: (form as any).depreciationRate ? parseFloat(String((form as any).depreciationRate)) : undefined,
      purchaseDate: (form as any).purchaseDate || undefined,
      warrantyEndDate: (form as any).warrantyEndDate || undefined,
      notes: (form as any).notes || undefined,
    });
  };

  if (!asset) return null;
  return (
    <Modal open={!!asset} onClose={onClose} title={`${t('common.edit')}: ${asset.assetName}`} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={t('assets.toolbar.search_placeholder').split(':')[1]?.split(',')[0]?.trim() || 'Varlık Adı'} required>
            <input className={inputCls} value={(form as any).assetName ?? ''} onChange={e => setField('assetName', e.target.value)} required />
          </FormField>
          <FormField label={t('dashboard.charts.heatmap').includes('Sıcaklık') ? 'Varlık Kodu' : 'Asset Code'}>
            <input className={inputCls} value={(form as any).assetCode ?? ''} onChange={e => setField('assetCode', e.target.value)} placeholder="BC-001" />
          </FormField>
          <FormField label={t('assets.details.type')} required>
            <select className={inputCls} value={(form as any).assetType} onChange={e => setField('assetType', e.target.value)} required>
              <option value="GPU">GPU Kartı</option>
              <option value="DisplayCard">Görüntü Kartı</option>
              <option value="Server">Sunucu</option>
              <option value="Disk">Disk</option>
              <option value="Network">Ağ Ekipmanı</option>
            </select>
          </FormField>
          <FormField label={t('common.status')}>
            <select className={inputCls} value={(form as any).status} onChange={e => setField('status', e.target.value)}>
              <option value="Active">{t('common.active')}</option>
              <option value="Inactive">{t('common.inactive')}</option>
              <option value="Maintenance">{t('common.maintenance_short')}</option>
              <option value="Faulty">{t('common.faulty')}</option>
              <option value="Retired">{t('common.retired')}</option>
            </select>
          </FormField>
          <FormField label="Model">
            <input className={inputCls} value={(form as any).model ?? ''} onChange={e => setField('model', e.target.value)} />
          </FormField>
          <FormField label="Seri No">
            <input className={inputCls} value={(form as any).serialNumber ?? ''} onChange={e => setField('serialNumber', e.target.value)} />
          </FormField>
          <FormField label="Üretici">
            <input className={inputCls} value={(form as any).manufacturer ?? ''} onChange={e => setField('manufacturer', e.target.value)} />
          </FormField>
          <FormField label="Tedarikçi">
            <input className={inputCls} value={(form as any).supplier ?? ''} onChange={e => setField('supplier', e.target.value)} />
          </FormField>
          <FormField label="IP Adresi">
            <input className={inputCls} value={(form as any).ipAddress ?? ''} onChange={e => setField('ipAddress', e.target.value)} placeholder="192.168.1.1" />
          </FormField>
          <FormField label="MAC Adresi">
            <input className={inputCls} value={(form as any).macAddress ?? ''} onChange={e => setField('macAddress', e.target.value)} placeholder="AA:BB:CC:DD:EE:FF" />
          </FormField>
          <FormField label="Firmware Versiyonu">
            <input className={inputCls} value={(form as any).firmwareVersion ?? ''} onChange={e => setField('firmwareVersion', e.target.value)} />
          </FormField>
          <FormField label={t('assets.details.rack')}>
            <input className={inputCls} value={(form as any).rackPosition ?? ''} onChange={e => setField('rackPosition', e.target.value)} placeholder="U1-U2" />
          </FormField>

          <p className="col-span-2 text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val pt-2 border-t border-[#1E2D45]">{t('assets.details.finance_info')}</p>

          <FormField label="Satın Alma Tarihi">
            <input type="date" className={inputCls} value={(form as any).purchaseDate ?? ''} onChange={e => setField('purchaseDate', e.target.value)} />
          </FormField>
          <FormField label="Garanti Bitiş Tarihi">
            <input type="date" className={inputCls} value={(form as any).warrantyEndDate ?? ''} onChange={e => setField('warrantyEndDate', e.target.value)} />
          </FormField>
          <FormField label="Satın Alma Maliyeti ($)">
            <input type="number" step="0.01" min="0" className={inputCls} value={(form as any).purchaseCost ?? ''} onChange={e => setField('purchaseCost', e.target.value)} />
          </FormField>
          <FormField label="Güncel Değer ($)">
            <input type="number" step="0.01" min="0" className={inputCls} value={(form as any).currentValue ?? ''} onChange={e => setField('currentValue', e.target.value)} />
          </FormField>
          <FormField label="Amortisman Oranı (% / Yıl)">
            <input type="number" step="0.1" min="0" max="100" className={inputCls} value={(form as any).depreciationRate ?? ''} onChange={e => setField('depreciationRate', e.target.value)} />
          </FormField>

          <div className="col-span-2">
            <FormField label="Notlar">
              <textarea rows={2} className={inputCls + ' resize-none'} value={(form as any).notes ?? ''} onChange={e => setField('notes', e.target.value)} />
            </FormField>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/25 rounded px-3 py-2 text-xs text-red-400 font-mono-val">{error}</div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#1E2D45]">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded text-xs text-[#6B84A3] hover:text-[#E2EAF4] border border-[#1E2D45] transition-colors font-mono-val">
            {t('common.cancel').toUpperCase()}
          </button>
          <button
            type="submit"
            disabled={updateMut.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded text-xs bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 disabled:opacity-50 font-mono-val transition-all"
          >
            {updateMut.isPending && <span className="w-3 h-3 border border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />}
            <Save size={11} /> {t('common.save').toUpperCase()}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────
function DeleteModal({ asset, onClose }: { asset: Asset | null; onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const deleteMut = useMutation({
    mutationFn: () => assetApi.delete(asset!.assetId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assets'] }); onClose(); },
  });
  if (!asset) return null;
  return (
    <Modal open={!!asset} onClose={onClose} title={t('assets.delete.title')} size="sm">
      <div className="space-y-4 text-center">
        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
          <Trash2 size={22} className="text-red-400" />
        </div>
        <div>
          <p className="text-sm text-[#E2EAF4] font-medium">{asset.assetName}</p>
          <p className="text-[11px] text-[#6B84A3] mt-1 font-mono-val">
            {t('assets.delete.confirm')}<br />
            {t('assets.delete.warning')}
          </p>
        </div>
        {deleteMut.isError && (
          <div className="bg-red-500/10 border border-red-500/25 rounded px-3 py-2 text-xs text-red-400 font-mono-val">
            Silme işlemi başarısız oldu.
          </div>
        )}
        <div className="flex items-center justify-center gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded text-xs text-[#6B84A3] hover:text-[#E2EAF4] border border-[#1E2D45] transition-colors font-mono-val">
            {t('common.cancel').toUpperCase()}
          </button>
          <button
            onClick={() => deleteMut.mutate()}
            disabled={deleteMut.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded text-xs bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 disabled:opacity-50 font-mono-val transition-all"
          >
            {deleteMut.isPending && <span className="w-3 h-3 border border-red-400/30 border-t-red-400 rounded-full animate-spin" />}
            {t('assets.delete.yes')}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── AssetList Page ───────────────────────────────────────────
export function AssetList() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const page      = Number(searchParams.get('page')      ?? '1');
  const limit     = Number(searchParams.get('limit')     ?? '25');
  const searchQ   = searchParams.get('q')                ?? '';
  const status    = searchParams.get('status')           ?? '';
  const assetType = searchParams.get('type')             ?? '';
  const channelId = searchParams.get('channel')          ?? '';
  const sortBy    = searchParams.get('sortBy')           ?? 'AssetName';
  const sortOrder = (searchParams.get('sortOrder')       ?? 'ASC') as 'ASC' | 'DESC';

  const [search, setSearch] = useState(searchQ);

  const sp = (updates: Record<string, string | number>) =>
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(updates)) {
        const s = String(v);
        if (s) next.set(k, s); else next.delete(k);
      }
      return next;
    }, { replace: true });

  // Modals
  const [viewAsset, setViewAsset] = useState<Asset | null>(null);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [deleteAsset, setDeleteAsset] = useState<Asset | null>(null);

  const { data: channelsData } = useQuery({
    queryKey: ['channels'],
    queryFn: () => channelApi.getAll(),
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['assets', { page, limit, searchQ, status, assetType, channelId, sortBy, sortOrder }],
    queryFn: () => assetApi.getAll({ page, limit, search: searchQ, status, assetType, channelId, sortBy, sortOrder }),
    placeholderData: (prev) => prev,
  });

  const assets: Asset[] = data?.data?.data ?? [];
  const pagination = data?.data?.pagination ?? { page: 1, limit, total: 0, totalPages: 1 };
  const channels = channelsData?.data?.data ?? [];

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); sp({ q: search, page: '' }); };
  const toggleSort = (col: string) => {
    sp(sortBy === col
      ? { sortOrder: sortOrder === 'ASC' ? 'DESC' : 'ASC', page: '' }
      : { sortBy: col, sortOrder: 'ASC', page: '' }
    );
  };

  // CSV export
  const handleExport = () => {
    const headers = ['Varlık Adı', 'Kod', 'Tür', 'Model', 'Kanal', 'Grup', 'Durum', 'Sıcaklık', 'Güç', 'Satın Alma', 'Maliyet'];
    const rows = assets.map(a => [
      a.assetName, a.assetCode ?? '', assetTypeLabel(a.assetType), a.model ?? '',
      a.channelName ?? '', a.groupName ?? '',
      statusLabel(a.status), a.lastTemperature != null ? `${a.lastTemperature}°C` : '',
      a.lastPowerConsumption != null ? `${a.lastPowerConsumption}W` : '',
      formatDate(a.purchaseDate ?? undefined), formatCurrency(a.purchaseCost ?? undefined),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `varliklar_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3 fade-in-up">
      {/* Toolbar */}
      <div className="card p-3 flex flex-wrap items-center gap-2">
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 min-w-0 max-w-xs">
          <div className="relative flex-1">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#3D5275]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('assets.toolbar.search_placeholder')}
              className="w-full bg-[#131C2E] border border-[#1E2D45] rounded text-xs text-[#E2EAF4] placeholder-[#3D5275] pl-7 pr-3 py-2 outline-none focus:border-amber-500/40"
            />
          </div>
          <button type="submit" className="text-[10px] px-2.5 py-2 rounded bg-amber-500/10 border border-amber-500/25 text-amber-400 hover:bg-amber-500/20 font-mono-val">
            {t('common.search').includes('...') ? t('common.search').replace('...', '').toUpperCase() : t('common.search').toUpperCase()}
          </button>
        </form>

        <div className="flex items-center gap-1.5"><Filter size={12} className="text-[#3D5275]" /></div>

        {[
          {
            value: channelId, onChange: (v: string) => sp({ channel: v, page: '' }),
            options: [{ value: '', label: t('assets.toolbar.all_channels') }, ...channels.map((c: any) => ({ value: String(c.channelId), label: c.channelName }))],
          },
          {
            value: status, onChange: (v: string) => sp({ status: v, page: '' }),
            options: [
              { value: '', label: t('assets.toolbar.all_statuses') }, { value: 'Active', label: t('common.active') },
              { value: 'Maintenance', label: t('common.maintenance_short') }, { value: 'Inactive', label: t('common.inactive') },
              { value: 'Faulty', label: t('common.faulty') }, { value: 'Retired', label: t('common.retired') },
            ],
          },
          {
            value: assetType, onChange: (v: string) => sp({ type: v, page: '' }),
            options: [
              { value: '', label: t('assets.toolbar.all_types') }, { value: 'GPU', label: 'GPU' }, { value: 'DisplayCard', label: t('monitoring.charts.heatmap').includes('Sıcaklık') ? 'Görüntü Kartı' : 'Display Card' },
              { value: 'Server', label: t('monitoring.charts.heatmap').includes('Sıcaklık') ? 'Sunucu' : 'Server' }, { value: 'Disk', label: 'Disk' }, { value: 'Network', label: t('monitoring.charts.heatmap').includes('Sıcaklık') ? 'Ağ' : 'Network' },
            ],
          },
        ].map((sel, i) => (
          <select
            key={i}
            value={sel.value}
            onChange={e => sel.onChange(e.target.value)}
            className="bg-[#131C2E] border border-[#1E2D45] rounded text-xs text-[#E2EAF4] px-2 py-2 outline-none focus:border-amber-500/40"
          >
            {sel.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ))}

        <div className="flex-1" />

        <select
          value={limit}
          onChange={e => sp({ limit: e.target.value, page: '' })}
          className="bg-[#131C2E] border border-[#1E2D45] rounded text-xs text-[#6B84A3] px-2 py-2 outline-none"
        >
          {PAGE_SIZES.map(s => <option key={s} value={s}>{s} {t('assets.toolbar.rows')}</option>)}
        </select>

        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 text-[10px] px-2.5 py-2 rounded bg-[#131C2E] border border-[#1E2D45] text-[#6B84A3] hover:text-[#E2EAF4] transition-colors font-mono-val"
        >
          <Download size={11} /> {t('assets.toolbar.export')}
        </button>
      </div>

      {/* Count */}
      <div className="flex items-center gap-2 px-1">
        <span className="text-[11px] text-[#3D5275] font-mono-val">
          {pagination.total.toLocaleString()} {t('assets.toolbar.found')}
        </span>
        {isFetching && <span className="w-3 h-3 border border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="border-b border-[#1E2D45] bg-[#131C2E]">
              <tr>
                <Th label="#" className="w-10" sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort} />
                <Th label={t('common.dashboard').includes('Dashboard') ? 'Asset Name' : 'Varlık Adı'} col="AssetName" sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort} />
                <Th label={t('common.dashboard').includes('Dashboard') ? 'Code' : 'Kod'} col="AssetCode" sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort} />
                <Th label={t('assets.details.type')} col="AssetType" sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort} />
                <Th label={t('assets.details.model')} sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort} />
                <Th label={i18n.language === 'tr' ? 'Kanal/Konum' : 'Channel/Location'} sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort} />
                <Th label={t('common.status')} col="Status" sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort} />
                <Th label={t('monitoring.table.temp')} sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort} />
                <Th label={t('monitoring.table.power')} sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort} />
                <Th label={t('assets.details.purchase')} col="PurchaseDate" sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort} />
                <Th label={t('assets.details.cost')} col="PurchaseCost" sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort} />
                <Th label="" className="w-24" sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort} />
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#1E2D45]">
                    {Array.from({ length: 12 }).map((_, j) => (
                      <td key={j} className="py-3 px-3"><div className="h-3 bg-[#131C2E] rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
                : assets.map((asset, i) => (
                  <tr
                    key={asset.assetId}
                    className="border-b border-[#1E2D45] hover:bg-[#131C2E]/60 transition-colors group cursor-pointer"
                    onClick={() => setViewAsset(asset)}
                  >
                    <td className="py-2.5 px-3 text-[10px] text-[#3D5275] font-mono-val">
                      {(page - 1) * limit + i + 1}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', asset.isOnline === false ? 'bg-red-400' : 'bg-green-400 pulse-dot')} />
                        <span className="text-xs text-[#E2EAF4] font-medium">{asset.assetName}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-[10px] text-[#6B84A3] font-mono-val whitespace-nowrap">{asset.assetCode ?? '-'}</td>
                    <td className="py-2.5 px-3">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono-val whitespace-nowrap">
                        {assetTypeLabel(asset.assetType)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-xs text-[#6B84A3] whitespace-nowrap">{asset.model ?? '-'}</td>
                    <td className="py-2.5 px-3">
                      <p className="text-[10px] text-[#E2EAF4] truncate max-w-[140px]">{asset.channelName}</p>
                      <p className="text-[10px] text-[#3D5275] font-mono-val truncate max-w-[140px]">{asset.groupName ?? '-'}</p>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={cn('text-[10px] px-2 py-0.5 rounded border font-mono-val whitespace-nowrap', statusBg(asset.status))}>
                        {statusLabel(asset.status)}
                      </span>
                    </td>
                    <td className={cn('py-2.5 px-3 text-xs font-mono-val whitespace-nowrap', asset.lastTemperature ? tempColor(asset.lastTemperature) : 'text-[#3D5275]')}>
                      {asset.lastTemperature != null ? `${asset.lastTemperature}°C` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-xs font-mono-val text-[#6B84A3] whitespace-nowrap">
                      {asset.lastPowerConsumption != null ? `${asset.lastPowerConsumption}W` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-[10px] text-[#6B84A3] font-mono-val whitespace-nowrap">
                      {formatDate(asset.purchaseDate ?? undefined)}
                    </td>
                    <td className="py-2.5 px-3 text-xs font-mono-val text-[#E2EAF4] whitespace-nowrap">
                      {formatCurrency(asset.purchaseCost ?? undefined)}
                    </td>
                    <td className="py-2.5 px-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setViewAsset(asset)}
                          className="p-1.5 rounded text-[#6B84A3] hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                          title="Görüntüle"
                        >
                          <Eye size={12} />
                        </button>
                        <button
                          onClick={() => setEditAsset(asset)}
                          className="p-1.5 rounded text-[#6B84A3] hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                          title="Düzenle"
                        >
                          <Edit size={12} />
                        </button>
                        <button
                          onClick={() => setDeleteAsset(asset)}
                          className="p-1.5 rounded text-[#6B84A3] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Sil"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              }

              {!isLoading && assets.length === 0 && (
                <tr>
                  <td colSpan={12} className="py-16 text-center">
                    <Server size={32} className="text-[#1E2D45] mx-auto mb-3" />
                    <p className="text-sm text-[#3D5275] font-mono-val">
                      {i18n.language === 'tr' ? 'Varlık bulunamadı' : 'No assets found'}
                    </p>
                    {(searchQ || status || assetType || channelId) && (
                      <p className="text-xs text-[#3D5275] font-mono-val mt-1 opacity-60">
                        {i18n.language === 'tr' ? 'Filtrelerinizi temizlemeyi deneyin' : 'Try clearing your filters'}
                      </p>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination — always visible */}
        {(
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#1E2D45] bg-[#070B14]">
            <span className="text-[10px] text-[#3D5275] font-mono-val">
              {t('common.page')} {pagination.page} / {pagination.totalPages} · {pagination.total.toLocaleString()} {i18n.language === 'tr' ? 'kayıt' : 'records'}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => sp({ page: Math.max(1, page - 1) })}
                disabled={page === 1}
                className="px-2.5 py-1 rounded text-[10px] font-mono-val bg-[#131C2E] border border-[#1E2D45] text-[#6B84A3] hover:text-[#E2EAF4] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ‹ {t('common.previous')}
              </button>
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(pagination.totalPages - 4, page - 2)) + i;
                return (
                  <button
                    key={p}
                    onClick={() => sp({ page: p })}
                    className={cn(
                      'w-7 h-7 rounded text-[10px] font-mono-val border transition-colors',
                      p === page
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                        : 'bg-[#131C2E] border-[#1E2D45] text-[#6B84A3] hover:text-[#E2EAF4]'
                    )}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => sp({ page: Math.min(pagination.totalPages, page + 1) })}
                disabled={page === pagination.totalPages}
                className="px-2.5 py-1 rounded text-[10px] font-mono-val bg-[#131C2E] border border-[#1E2D45] text-[#6B84A3] hover:text-[#E2EAF4] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {t('common.next')} ›
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {viewAsset && (
        <ViewModal
          asset={viewAsset}
          onClose={() => setViewAsset(null)}
          onEdit={() => { setEditAsset(viewAsset); setViewAsset(null); }}
        />
      )}
      {editAsset && <EditModal asset={editAsset} onClose={() => setEditAsset(null)} />}
      {deleteAsset && <DeleteModal asset={deleteAsset} onClose={() => setDeleteAsset(null)} />}
    </div>
  );
}
