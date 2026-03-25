import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { maintenanceApi, assetApi, channelApi } from '@/api/client';
import {
  Calendar, Clock, User, DollarSign, Plus, CheckCircle,
  AlertTriangle, Wrench, Trash2, Edit, Filter,
} from 'lucide-react';
import { cn, formatDate, formatCurrency, maintenanceStatusLabel, inputCls } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { FormField } from '@/components/ui/FormField';
import type { MaintenanceRecord, Asset, Channel } from '@/types';

// ─── Status badge ─────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Completed: 'bg-green-500/10 text-green-400 border-green-500/20',
    Scheduled: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    InProgress: 'bg-cyan-500/10  text-cyan-400  border-cyan-500/20',
    Cancelled: 'bg-red-500/10   text-red-400   border-red-500/20',
    Pending: 'bg-[#1E2D45]    text-[#6B84A3] border-[#1E2D45]',
  };
  return (
    <span className={cn('text-[10px] px-2 py-0.5 rounded font-mono-val border', map[status] ?? map.Pending)}>
      {maintenanceStatusLabel(status)}
    </span>
  );
}

// ─── Maintenance Page ─────────────────────────────────────────
interface MaintenanceForm {
  assetId: string;
  maintenanceDate: string;
  maintenanceType: string;
  description: string;
  technicianName: string;
  technicianEmail: string;
  costAmount: string;
  status: string;
  nextMaintenanceDate: string;
  maintenanceInterval: string;
  notes: string;
}

const EMPTY_FORM: MaintenanceForm = {
  assetId: '', maintenanceDate: '', maintenanceType: '', description: '',
  technicianName: '', technicianEmail: '', costAmount: '', status: 'Completed',
  nextMaintenanceDate: '', maintenanceInterval: '', notes: '',
};

export function Maintenance() {
  const qc = useQueryClient();

  // Filters
  const [channelFilter, setChannelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [daysFilter, setDaysFilter] = useState('90');

  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editRecord, setEditRecord] = useState<MaintenanceRecord | null>(null);
  const [form, setForm] = useState<MaintenanceForm>(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  // Queries
  const { data, isLoading } = useQuery({
    queryKey: ['maintenance-scheduled', daysFilter, channelFilter, statusFilter],
    queryFn: () => maintenanceApi.getScheduled({
      days: parseInt(daysFilter),
      channelId: channelFilter || undefined,
    }),
  });

  const { data: allMaintData } = useQuery({
    queryKey: ['maintenance-all'],
    queryFn: async () => {
      // Fetch all recent maintenance (last 200)
      const res = await maintenanceApi.getScheduled({ days: 9999 });
      return res;
    },
  });

  const { data: assetsData } = useQuery({
    queryKey: ['assets-dropdown'],
    queryFn: () => assetApi.getAll({ limit: 5000 }),
  });

  const { data: channelsData } = useQuery({
    queryKey: ['channels'],
    queryFn: () => channelApi.getAll(),
  });

  const records: MaintenanceRecord[] = data?.data?.data ?? [];
  const allAssets: Asset[] = assetsData?.data?.data ?? [];
  const channels: Channel[] = channelsData?.data?.data ?? [];

  // Filtered records
  const filteredRecords = records.filter(r => {
    if (statusFilter && r.status !== statusFilter) return false;
    return true;
  });

  // Stats
  const activeStatuses = ['Scheduled', 'Pending', 'InProgress'];
  const activeRecords = records.filter(r => activeStatuses.includes(r.status));
  
  const urgent = activeRecords.filter(r => r.daysUntilMaintenance != null && r.daysUntilMaintenance <= 7).length;
  const soon = activeRecords.filter(r => r.daysUntilMaintenance != null && r.daysUntilMaintenance <= 30).length;
  const total = activeRecords.length;
  const completed = (allMaintData?.data?.data ?? []).filter((r: MaintenanceRecord) => r.status === 'Completed').length;

  // Mutations
  const createMut = useMutation({
    mutationFn: (body: object) => maintenanceApi.create(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['maintenance'] }); closeModal(); },
    onError: (e: { response?: { data?: { message?: string } } }) => setFormError(e?.response?.data?.message ?? 'Bir hata oluştu.'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) => maintenanceApi.update(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['maintenance'] }); closeModal(); },
    onError: (e: { response?: { data?: { message?: string } } }) => setFormError(e?.response?.data?.message ?? 'Bir hata oluştu.'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => maintenanceApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['maintenance'] }),
  });

  // Form helpers
  const openCreate = () => {
    setEditRecord(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (r: MaintenanceRecord) => {
    setEditRecord(r);
    setForm({
      assetId: String(r.assetId ?? ''),
      maintenanceDate: r.maintenanceDate?.slice(0, 10) ?? '',
      maintenanceType: r.maintenanceType ?? '',
      description: r.description ?? '',
      technicianName: r.technicianName ?? '',
      technicianEmail: r.technicianEmail ?? '',
      costAmount: String(r.costAmount ?? ''),
      status: r.status ?? 'Completed',
      nextMaintenanceDate: r.nextMaintenanceDate?.slice(0, 10) ?? '',
      maintenanceInterval: String(r.maintenanceInterval ?? ''),
      notes: r.notes ?? '',
    });
    setFormError('');
    setShowForm(true);
  };

  const closeModal = () => { setShowForm(false); setEditRecord(null); setForm(EMPTY_FORM); setFormError(''); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.assetId || !form.maintenanceDate) {
      setFormError('Varlık ve bakım tarihi zorunludur.');
      return;
    }
    if (form.nextMaintenanceDate && form.nextMaintenanceDate <= form.maintenanceDate) {
      setFormError('Sonraki bakım tarihi, bakım tarihinden sonra olmalıdır.');
      return;
    }
    const body = {
      assetId: parseInt(form.assetId),
      maintenanceDate: form.maintenanceDate,
      maintenanceType: form.maintenanceType || undefined,
      description: form.description || undefined,
      technicianName: form.technicianName || undefined,
      technicianEmail: form.technicianEmail || undefined,
      costAmount: form.costAmount ? parseFloat(form.costAmount) : undefined,
      status: form.status,
      nextMaintenanceDate: form.nextMaintenanceDate || undefined,
      maintenanceInterval: form.maintenanceInterval ? parseInt(form.maintenanceInterval) : undefined,
      notes: form.notes || undefined,
    };
    if (editRecord) {
      updateMut.mutate({ id: editRecord.maintenanceId, body });
    } else {
      createMut.mutate(body);
    }
  };

  const setField = (key: keyof MaintenanceForm, val: string) =>
    setForm(f => ({ ...f, [key]: val }));

  const getDaysColor = (days: number) =>
    days <= 7 ? 'text-red-400 bg-red-400/10 border border-red-400/20' :
      days <= 30 ? 'text-amber-400 bg-amber-400/10 border border-amber-400/20' :
        'text-green-400 bg-green-400/10 border border-green-400/20';

  return (
    <div className="space-y-4 fade-in-up">

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Acil (≤7 gün)',  count: urgent,    card: 'border border-red-500/20 bg-red-500/5',     text: 'text-red-400',   icon: <AlertTriangle size={16} className="text-red-400" /> },
          { label: 'Yakın (≤30 gün)', count: soon,      card: 'border border-amber-500/20 bg-amber-500/5', text: 'text-amber-400', icon: <Clock size={16} className="text-amber-400" /> },
          { label: 'Toplam Planlı',   count: total,     card: 'border border-cyan-500/20 bg-cyan-500/5',   text: 'text-cyan-400',  icon: <Calendar size={16} className="text-cyan-400" /> },
          { label: 'Tamamlanan',      count: completed, card: 'border border-green-500/20 bg-green-500/5', text: 'text-green-400', icon: <CheckCircle size={16} className="text-green-400" /> },
        ].map(({ label, count, card, text, icon }) => (
          <div key={label} className={cn('card p-4 flex items-center gap-3', card)}>
            {icon}
            <div>
              <p className={`font-display font-bold text-2xl leading-none ${text}`}>{count}</p>
              <p className="text-[10px] text-[#6B84A3] font-mono-val uppercase tracking-wider mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="card p-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-[11px] text-[#6B84A3] font-mono-val">
          <Filter size={12} /> Filtrele:
        </div>

        <select
          value={channelFilter}
          onChange={e => setChannelFilter(e.target.value)}
          className={inputCls + ' w-40'}
        >
          <option value="">Tüm Kanallar</option>
          {channels.map(c => <option key={c.channelId} value={String(c.channelId)}>{c.channelName}</option>)}
        </select>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className={inputCls + ' w-40'}
        >
          <option value="">Tüm Durumlar</option>
          <option value="Scheduled">Planlandı</option>
          <option value="Pending">Beklemede</option>
          <option value="Completed">Tamamlandı</option>
          <option value="InProgress">Devam Ediyor</option>
          <option value="Cancelled">İptal</option>
        </select>

        <select
          value={daysFilter}
          onChange={e => setDaysFilter(e.target.value)}
          className={inputCls + ' w-36'}
        >
          <option value="30">Son 30 Gün</option>
          <option value="60">Son 60 Gün</option>
          <option value="90">Son 90 Gün</option>
          <option value="180">Son 180 Gün</option>
          <option value="9999">Tümü</option>
        </select>

        <div className="flex-1" />

        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 text-xs font-mono-val transition-all"
        >
          <Plus size={13} /> YENİ BAKIM KAYDI
        </button>
      </div>

      {/* Records list */}
      <div className="card overflow-hidden">
        <div className="p-3 border-b border-[#1E2D45] bg-[#131C2E] flex items-center justify-between">
          <p className="text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val">
            Bakım Kayıtları — {filteredRecords.length} kayıt
          </p>
        </div>

        <div className="divide-y divide-[#1E2D45]">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 h-20 animate-pulse bg-[#131C2E]/50" />
            ))
            : filteredRecords.length === 0
              ? (
                <div className="py-16 flex flex-col items-center gap-3">
                  <Wrench size={32} className="text-[#1E2D45]" />
                  <p className="text-sm text-[#3D5275] font-mono-val">Yaklaşan bakım kaydı yok</p>
                  <button
                    onClick={openCreate}
                    className="mt-2 text-xs text-amber-400 hover:underline font-mono-val"
                  >
                    + Yeni bakım kaydı oluştur
                  </button>
                </div>
              )
              : filteredRecords.map(r => (
                <div
                  key={`${r.assetId}-${r.maintenanceId ?? r.nextMaintenanceDate}`}
                  className="p-3 hover:bg-[#131C2E] transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    {/* Days badge */}
                    <div className={cn(
                      'flex-shrink-0 text-[10px] font-mono-val font-bold px-2 py-1.5 rounded min-w-[3rem] text-center',
                      r.daysUntilMaintenance != null
                        ? getDaysColor(r.daysUntilMaintenance)
                        : 'text-[#6B84A3] bg-[#1E2D45] border border-[#1E2D45]'
                    )}>
                      {r.daysUntilMaintenance != null ? `${r.daysUntilMaintenance}g` : '—'}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs text-[#E2EAF4] font-medium">{r.assetName}</p>
                        <span className="text-[10px] font-mono-val text-cyan-400">{r.assetCode}</span>
                        <StatusBadge status={r.status} />
                        {r.maintenanceType && (
                          <span className="text-[10px] text-amber-400">{r.maintenanceType}</span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#6B84A3] font-mono-val mt-0.5">
                        {r.channelName} · {r.buildingName}
                      </p>
                      {r.description && (
                        <p className="text-[10px] text-[#3D5275] mt-0.5 line-clamp-1">{r.description}</p>
                      )}
                      <div className="flex flex-wrap gap-4 mt-1.5">
                        {r.technicianName && (
                          <span className="flex items-center gap-1 text-[10px] text-[#6B84A3]">
                            <User size={9} />{r.technicianName}
                          </span>
                        )}
                        {r.costAmount != null && (
                          <span className="flex items-center gap-1 text-[10px] text-[#6B84A3]">
                            <DollarSign size={9} />{formatCurrency(r.costAmount)}
                          </span>
                        )}
                        {r.maintenanceInterval && (
                          <span className="flex items-center gap-1 text-[10px] text-[#6B84A3]">
                            <Clock size={9} />Her {r.maintenanceInterval}g
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Date */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-mono-val text-amber-400 flex items-center gap-1 justify-end">
                        <Calendar size={10} />
                        {formatDate(r.nextMaintenanceDate ?? r.maintenanceDate)}
                      </p>
                      {r.nextMaintenanceDate && r.maintenanceDate && (
                        <p className="text-[10px] text-[#3D5275] font-mono-val mt-0.5">
                          Son: {formatDate(r.maintenanceDate)}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(r)}
                        className="p-1.5 rounded text-[#6B84A3] hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                        title="Düzenle"
                      >
                        <Edit size={12} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Bu bakım kaydını silmek istiyor musunuz?')) {
                            deleteMut.mutate(r.maintenanceId);
                          }
                        }}
                        className="p-1.5 rounded text-[#6B84A3] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Sil"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
          }
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={showForm}
        onClose={closeModal}
        title={editRecord ? 'Bakım Kaydını Düzenle' : 'Yeni Bakım Kaydı'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-2">
              <FormField label="Varlık" required>
                <select
                  className={inputCls}
                  value={form.assetId}
                  onChange={e => setField('assetId', e.target.value)}
                  required
                >
                  <option value="">— Varlık Seç —</option>
                  {allAssets.map(a => (
                    <option key={a.assetId} value={String(a.assetId)}>
                      {a.assetName} {a.assetCode ? `(${a.assetCode})` : ''} — {a.channelName}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <FormField label="Bakım Tarihi" required>
              <input
                type="date"
                className={inputCls}
                value={form.maintenanceDate}
                onChange={e => setField('maintenanceDate', e.target.value)}
                required
              />
            </FormField>

            <FormField label="Durum">
              <select
                className={inputCls}
                value={form.status}
                onChange={e => setField('status', e.target.value)}
              >
                <option value="Scheduled">Planlandı</option>
                <option value="Pending">Beklemede</option>
                <option value="InProgress">Devam Ediyor</option>
                <option value="Completed">Tamamlandı</option>
                <option value="Cancelled">İptal Edildi</option>
              </select>
            </FormField>

            <FormField label="Bakım Türü">
              <select
                className={inputCls}
                value={form.maintenanceType}
                onChange={e => setField('maintenanceType', e.target.value)}
              >
                <option value="">— Seç —</option>
                <option value="Preventive">Periyodik Bakım</option>
                <option value="Corrective">Arıza Giderme</option>
                <option value="Routine">Yazılım Güncelleme</option>
                <option value="Predictive">Donanım Değişimi</option>
                <option value="Emergency">Acil Müdahale</option>
                <option value="Other">Diğer</option>
              </select>
            </FormField>

            <FormField label="Maliyet (₺)">
              <input
                type="number"
                step="0.01"
                min="0"
                className={inputCls}
                value={form.costAmount}
                onChange={e => setField('costAmount', e.target.value)}
                placeholder="0.00"
              />
            </FormField>

            <FormField label="Teknisyen Adı">
              <input
                type="text"
                className={inputCls}
                value={form.technicianName}
                onChange={e => setField('technicianName', e.target.value)}
                placeholder="Ad Soyad"
              />
            </FormField>

            <FormField label="Teknisyen E-posta">
              <input
                type="email"
                className={inputCls}
                value={form.technicianEmail}
                onChange={e => setField('technicianEmail', e.target.value)}
                placeholder="email@domain.com"
              />
            </FormField>

            <FormField label="Sonraki Bakım Tarihi">
              <input
                type="date"
                className={inputCls}
                value={form.nextMaintenanceDate}
                onChange={e => setField('nextMaintenanceDate', e.target.value)}
              />
            </FormField>

            <FormField label="Bakım Aralığı (Gün)">
              <input
                type="number"
                min="1"
                className={inputCls}
                value={form.maintenanceInterval}
                onChange={e => setField('maintenanceInterval', e.target.value)}
                placeholder="Örn: 30"
              />
            </FormField>

            <div className="col-span-2">
              <FormField label="Açıklama">
                <textarea
                  rows={2}
                  className={inputCls + ' resize-none'}
                  value={form.description}
                  onChange={e => setField('description', e.target.value)}
                  placeholder="Bakım açıklaması..."
                />
              </FormField>
            </div>

            <div className="col-span-2">
              <FormField label="Notlar">
                <textarea
                  rows={2}
                  className={inputCls + ' resize-none'}
                  value={form.notes}
                  onChange={e => setField('notes', e.target.value)}
                  placeholder="Ek notlar..."
                />
              </FormField>
            </div>
          </div>

          {formError && (
            <div className="bg-red-500/10 border border-red-500/25 rounded px-3 py-2 text-xs text-red-400 font-mono-val">
              {formError}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#1E2D45]">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 rounded text-xs text-[#6B84A3] hover:text-[#E2EAF4] border border-[#1E2D45] hover:border-[#253550] transition-colors font-mono-val"
            >
              İPTAL
            </button>
            <button
              type="submit"
              disabled={createMut.isPending || updateMut.isPending}
              className="px-4 py-2 rounded text-xs bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 disabled:opacity-50 font-mono-val transition-all flex items-center gap-2"
            >
              {(createMut.isPending || updateMut.isPending) && (
                <span className="w-3 h-3 border border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
              )}
              {editRecord ? 'GÜNCELLE' : 'OLUŞTUR'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
