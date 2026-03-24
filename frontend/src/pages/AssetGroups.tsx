import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assetGroupApi, channelApi } from '@/api/client';
import {
  Layers, Plus, Edit, Trash2, Server, HardDrive, Wifi, Archive, Database,
  CheckCircle, AlertTriangle, Wrench,
} from 'lucide-react';
import { cn, inputCls } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { FormField } from '@/components/ui/FormField';
import { groupTypeConfig } from '@/lib/constants';

// ─── Types ────────────────────────────────────────────────────
interface AssetGroup {
  assetGroupId: number;
  channelId: number;
  channelName: string;
  groupName: string;
  groupType: string;
  description: string;
  status: string;
  assetCount: number;
  activeCount?: number;
  maintenanceCount?: number;
  faultyCount?: number;
  createdDate?: string;
}

interface GroupForm {
  channelId: string;
  groupName: string;
  groupType: string;
  description: string;
}

const EMPTY_FORM: GroupForm = { channelId: '', groupName: '', groupType: 'Playout', description: '' };

const GROUP_TYPES = ['Playout', 'Encoding', 'Transmission', 'Archive', 'Storage', 'General'];

const GROUP_TYPE_ICONS: Record<string, React.ElementType> = {
  Playout:      Server,
  Encoding:     HardDrive,
  Transmission: Wifi,
  Archive:      Archive,
  Storage:      Database,
  General:      Layers,
};

const GROUP_TYPE_LABELS: Record<string, string> = {
  Playout: 'Playout', Encoding: 'Encoding', Transmission: 'İletim',
  Archive: 'Arşiv', Storage: 'Depolama', General: 'Genel',
};

// ─── Group card ───────────────────────────────────────────────
function GroupCard({
  group, onEdit, onDelete,
}: { group: AssetGroup; onEdit: (g: AssetGroup) => void; onDelete: (g: AssetGroup) => void }) {
  const cfg = groupTypeConfig[group.groupType] ?? groupTypeConfig['General'];
  const Icon = GROUP_TYPE_ICONS[group.groupType] ?? Layers;
  const active = group.activeCount ?? 0;
  const maint  = group.maintenanceCount ?? 0;
  const faulty = group.faultyCount ?? 0;

  return (
    <div className="bg-[#0D1525] border border-[#1E2D45] rounded-lg p-4 hover:border-[#2D4060] transition-colors group">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn('w-8 h-8 rounded flex items-center justify-center flex-shrink-0', cfg.bg, cfg.border, 'border')}>
            <Icon size={14} className={cfg.color} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-display font-semibold text-[#E2EAF4] truncate">{group.groupName}</p>
            <p className="text-[10px] text-[#6B84A3] truncate">{group.channelName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={() => onEdit(group)}
            className="p-1.5 text-[#6B84A3] hover:text-amber-400 hover:bg-amber-400/10 rounded transition-colors">
            <Edit size={12} />
          </button>
          <button onClick={() => onDelete(group)}
            className="p-1.5 text-[#6B84A3] hover:text-red-400 hover:bg-red-400/10 rounded transition-colors">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mb-3">
        <span className={cn('text-[10px] px-2 py-0.5 rounded border font-mono-val', cfg.bg, cfg.color, cfg.border)}>
          {GROUP_TYPE_LABELS[group.groupType] ?? group.groupType}
        </span>
      </div>

      {group.description && (
        <p className="text-[11px] text-[#6B84A3] mb-3 line-clamp-2">{group.description}</p>
      )}

      <div className="flex items-center gap-3 pt-2 border-t border-[#1E2D45]">
        <span className="text-[10px] text-[#6B84A3] font-mono-val">{group.assetCount} varlık</span>
        {active > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-green-400">
            <CheckCircle size={9} /> {active}
          </span>
        )}
        {maint > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-amber-400">
            <Wrench size={9} /> {maint}
          </span>
        )}
        {faulty > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-red-400">
            <AlertTriangle size={9} /> {faulty}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export function AssetGroups() {
  const qc = useQueryClient();

  const [channelFilter, setChannelFilter] = useState('');
  const [typeFilter, setTypeFilter]       = useState('');
  const [showForm, setShowForm]           = useState(false);
  const [editGroup, setEditGroup]         = useState<AssetGroup | null>(null);
  const [form, setForm]                   = useState<GroupForm>(EMPTY_FORM);
  const [formError, setFormError]         = useState('');

  const { data: channelsData } = useQuery({
    queryKey: ['channels'],
    queryFn: () => channelApi.getAll(),
  });
  const channels: any[] = channelsData?.data?.data ?? [];

  const { data: groupsData, isLoading } = useQuery({
    queryKey: ['assetgroups', channelFilter, typeFilter],
    queryFn: () => assetGroupApi.getAll({
      channelId: channelFilter || undefined,
      groupType: typeFilter || undefined,
    }),
  });
  const groups: AssetGroup[] = groupsData?.data?.data ?? [];

  const saveGroup = useMutation({
    mutationFn: (data: object) =>
      editGroup ? assetGroupApi.update(editGroup.assetGroupId, data) : assetGroupApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assetgroups'] });
      setShowForm(false);
      setEditGroup(null);
      setForm(EMPTY_FORM);
    },
    onError: (e: any) => setFormError(e?.response?.data?.message ?? 'Hata'),
  });

  const deleteGroup = useMutation({
    mutationFn: (id: number) => assetGroupApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assetgroups'] }),
    onError: (e: any) => alert(e?.response?.data?.message ?? 'Silinemedi'),
  });

  function openAdd() {
    setEditGroup(null);
    setForm({ ...EMPTY_FORM, channelId: channelFilter });
    setFormError('');
    setShowForm(true);
  }

  function openEdit(g: AssetGroup) {
    setEditGroup(g);
    setForm({ channelId: String(g.channelId), groupName: g.groupName, groupType: g.groupType, description: g.description ?? '' });
    setFormError('');
    setShowForm(true);
  }

  function submit() {
    if (!form.groupName.trim()) { setFormError('Grup adı zorunludur'); return; }
    if (!form.channelId)        { setFormError('Kanal seçiniz'); return; }
    saveGroup.mutate({
      channelId:   parseInt(form.channelId),
      groupName:   form.groupName.trim(),
      groupType:   form.groupType,
      description: form.description.trim() || undefined,
    });
  }

  // Stats per type
  const typeCounts = GROUP_TYPES.reduce<Record<string, number>>((acc, t) => {
    acc[t] = groups.filter(g => g.groupType === t).length;
    return acc;
  }, {});
  const totalAssets = groups.reduce((s, g) => s + (g.assetCount ?? 0), 0);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-display font-bold text-[#E2EAF4] flex items-center gap-2">
            <Layers size={18} className="text-amber-400" />
            Varlık Grupları
          </h1>
          <p className="text-[11px] text-[#6B84A3] mt-0.5">Kanal bazlı grup yönetimi</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono-val rounded border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all"
        >
          <Plus size={13} /> Grup Ekle
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="bg-[#0D1525] border border-[#1E2D45] rounded-lg px-4 py-3">
          <p className="text-xl font-display font-bold text-[#E2EAF4]">{groups.length}</p>
          <p className="text-[10px] text-[#6B84A3] uppercase tracking-wider">Toplam Grup</p>
        </div>
        <div className="bg-[#0D1525] border border-[#1E2D45] rounded-lg px-4 py-3">
          <p className="text-xl font-display font-bold text-[#E2EAF4]">{totalAssets}</p>
          <p className="text-[10px] text-[#6B84A3] uppercase tracking-wider">Toplam Varlık</p>
        </div>
        <div className="bg-[#0D1525] border border-[#1E2D45] rounded-lg px-4 py-3">
          <p className="text-xl font-display font-bold text-[#E2EAF4]">{channels.length}</p>
          <p className="text-[10px] text-[#6B84A3] uppercase tracking-wider">Kanal</p>
        </div>
        <div className="bg-[#0D1525] border border-[#1E2D45] rounded-lg px-4 py-3">
          <p className="text-xl font-display font-bold text-[#E2EAF4]">{GROUP_TYPES.filter(t => typeCounts[t] > 0).length}</p>
          <p className="text-[10px] text-[#6B84A3] uppercase tracking-wider">Aktif Tip</p>
        </div>
      </div>

      {/* Type chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setTypeFilter('')}
          className={cn('px-3 py-1 text-[10px] rounded border font-mono-val transition-colors',
            !typeFilter ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-[#0D1525] text-[#6B84A3] border-[#1E2D45] hover:border-[#2D4060]')}
        >
          Tümü ({groups.length})
        </button>
        {GROUP_TYPES.map(t => {
          const cfg = groupTypeConfig[t] ?? groupTypeConfig['General'];
          return (
            <button
              key={t}
              onClick={() => setTypeFilter(t === typeFilter ? '' : t)}
              className={cn('px-3 py-1 text-[10px] rounded border font-mono-val transition-colors',
                typeFilter === t ? cn(cfg.bg, cfg.color, cfg.border) : 'bg-[#0D1525] text-[#6B84A3] border-[#1E2D45] hover:border-[#2D4060]')}
            >
              {GROUP_TYPE_LABELS[t]} ({typeCounts[t]})
            </button>
          );
        })}
      </div>

      {/* Channel filter */}
      <div className="flex items-center gap-3">
        <select
          value={channelFilter}
          onChange={e => setChannelFilter(e.target.value)}
          className="text-xs bg-[#0D1525] border border-[#1E2D45] rounded px-3 py-1.5 text-[#E2EAF4] focus:outline-none focus:border-amber-500/50"
        >
          <option value="">Tüm Kanallar</option>
          {channels.map(c => <option key={c.channelId} value={String(c.channelId)}>{c.channelName}</option>)}
        </select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <p className="text-xs text-[#6B84A3]">Yükleniyor...</p>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Layers size={32} className="text-[#1E2D45] mb-3" />
          <p className="text-sm text-[#6B84A3]">Henüz grup yok</p>
          <button onClick={openAdd} className="mt-3 text-xs text-amber-400 hover:underline">+ Grup ekle</button>
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map(g => (
            <GroupCard
              key={g.assetGroupId}
              group={g}
              onEdit={openEdit}
              onDelete={grp => {
                if (confirm(`"${grp.groupName}" silinsin mi? Bu gruptaki varlıklar silinmez.`))
                  deleteGroup.mutate(grp.assetGroupId);
              }}
            />
          ))}
        </div>
      )}

      {/* Form modal */}
      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditGroup(null); }}
        title={editGroup ? 'Grup Düzenle' : 'Yeni Varlık Grubu'}
      >
        <div className="space-y-3">
          <FormField label="Kanal *">
            <select className={inputCls} value={form.channelId}
              onChange={e => setForm(f => ({ ...f, channelId: e.target.value }))}
              disabled={!!editGroup}>
              <option value="">Kanal seçin</option>
              {channels.map(c => <option key={c.channelId} value={String(c.channelId)}>{c.channelName}</option>)}
            </select>
          </FormField>
          <FormField label="Grup Adı *">
            <input className={inputCls} value={form.groupName}
              onChange={e => setForm(f => ({ ...f, groupName: e.target.value }))}
              placeholder="TRT Playout Grubu" />
          </FormField>
          <FormField label="Grup Tipi *">
            <select className={inputCls} value={form.groupType}
              onChange={e => setForm(f => ({ ...f, groupType: e.target.value }))}>
              {GROUP_TYPES.map(t => <option key={t} value={t}>{GROUP_TYPE_LABELS[t]}</option>)}
            </select>
          </FormField>
          <FormField label="Açıklama">
            <textarea className={cn(inputCls, 'resize-none')} rows={2} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="İsteğe bağlı açıklama..." />
          </FormField>
          {formError && <p className="text-xs text-red-400">{formError}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={submit} disabled={saveGroup.isPending}
              className="flex-1 py-2 text-xs font-mono-val rounded bg-amber-500/10 text-amber-400 border border-amber-500/25 hover:bg-amber-500/20 transition-all disabled:opacity-50">
              {saveGroup.isPending ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
            <button onClick={() => { setShowForm(false); setEditGroup(null); }}
              className="px-4 py-2 text-xs font-mono-val rounded border border-[#1E2D45] text-[#6B84A3] hover:text-[#E2EAF4] hover:bg-[#131C2E] transition-all">
              İptal
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
