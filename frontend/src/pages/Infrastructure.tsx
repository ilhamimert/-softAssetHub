import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { channelApi, buildingApi, roomApi, assetApi } from '@/api/client';
import type { Asset, Channel } from '@/types';
import {
  Building2, ChevronDown, ChevronRight, Plus, Edit, Trash2,
  DoorOpen, MapPin, Layers, LayoutGrid, Monitor,
} from 'lucide-react';
import { cn, inputCls } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { FormField } from '@/components/ui/FormField';

// ─── Types ────────────────────────────────────────────────────
interface Building {
  buildingId: number;
  buildingName: string;
  city: string;
  address: string;
  channelId: number;
  isActive: boolean;
  createdDate?: string;
  roomCount?: number;
  assetCount?: number;
}

interface Room {
  roomId: number;
  buildingId: number;
  roomName: string;
  floor: number;
  roomType: string;
  isActive: boolean;
  assetCount?: number;
}

// ─── Forms ────────────────────────────────────────────────────
interface BuildingForm { buildingName: string; city: string; address: string; channelId: string; }
interface RoomForm     { roomName: string; floor: string; roomType: string; buildingId: string; }

const EMPTY_BLDG: BuildingForm = { buildingName: '', city: '', address: '', channelId: '' };
const EMPTY_ROOM: RoomForm     = { roomName: '', floor: '1', roomType: 'ServerRoom', buildingId: '' };

const ROOM_TYPES = ['ServerRoom', 'ControlRoom', 'Studio', 'Archive', 'Storage', 'Office', 'Other'];

// ─── Room type badge ──────────────────────────────────────────
function RoomTypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    ServerRoom:  'bg-blue-500/10   text-blue-400   border-blue-500/20',
    ControlRoom: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    Studio:      'bg-amber-500/10  text-amber-400  border-amber-500/20',
    Archive:     'bg-cyan-500/10   text-cyan-400   border-cyan-500/20',
    Storage:     'bg-green-500/10  text-green-400  border-green-500/20',
    Office:      'bg-slate-500/10  text-slate-400  border-slate-500/20',
    Other:       'bg-gray-500/10   text-gray-400   border-gray-500/20',
  };
  const labels: Record<string, string> = {
    ServerRoom: 'Sunucu Odası', ControlRoom: 'Kontrol Odası', Studio: 'Stüdyo',
    Archive: 'Arşiv', Storage: 'Depolama', Office: 'Ofis', Other: 'Diğer',
  };
  return (
    <span className={cn('text-[10px] px-2 py-0.5 rounded border font-mono-val', map[type] ?? map.Other)}>
      {labels[type] ?? type}
    </span>
  );
}

// ─── Status badge ─────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Active:      'text-green-400 bg-green-500/10 border-green-500/20',
    Maintenance: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    Faulty:      'text-red-400 bg-red-500/10 border-red-500/20',
    Inactive:    'text-slate-400 bg-slate-500/10 border-slate-500/20',
    Reserved:    'text-blue-400 bg-blue-500/10 border-blue-500/20',
  };
  const labels: Record<string, string> = {
    Active: 'Aktif', Maintenance: 'Bakım', Faulty: 'Arızalı', Inactive: 'Pasif', Reserved: 'Rezerve',
  };
  return (
    <span className={cn('text-[9px] px-1.5 py-0.5 rounded border font-mono-val', map[status] ?? map.Inactive)}>
      {labels[status] ?? status}
    </span>
  );
}

// ─── Group type badge ──────────────────────────────────────────
function GroupTypeBadge({ type }: { type?: string }) {
  if (!type) return null;
  const map: Record<string, string> = {
    Playout:      'text-violet-400 bg-violet-500/10 border-violet-500/20',
    Encoding:     'text-blue-400 bg-blue-500/10 border-blue-500/20',
    Transmission: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    Archive:      'text-amber-400 bg-amber-500/10 border-amber-500/20',
    Storage:      'text-green-400 bg-green-500/10 border-green-500/20',
    General:      'text-slate-400 bg-slate-500/10 border-slate-500/20',
  };
  return (
    <span className={cn('text-[9px] px-1.5 py-0.5 rounded border font-mono-val', map[type] ?? map.General)}>
      {type}
    </span>
  );
}

// ─── Room row with asset expansion ────────────────────────────
function RoomRow({
  room, onEdit, onDelete,
}: {
  room: Room;
  onEdit: (r: Room) => void;
  onDelete: (r: Room) => void;
}) {
  const [open, setOpen] = useState(false);

  const { data: assetsData, isLoading: assetsLoading } = useQuery({
    queryKey: ['room-assets', room.roomId],
    queryFn: () => assetApi.getAll({ roomId: room.roomId, limit: 100 }),
    enabled: open,
    staleTime: 60_000,
  });
  const assets: Asset[] = assetsData?.data?.data ?? [];

  return (
    <>
      <div
        className="flex items-center gap-3 px-8 py-2.5 border-b border-[#2e333d]/50 last:border-b-0 hover:bg-[#0D1829]/50 group"
      >
        <button
          onClick={() => setOpen(v => !v)}
          className="text-[#555d6e] hover:text-[#8b919e] flex-shrink-0"
        >
          {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        </button>
        <DoorOpen size={12} className="text-[#8b919e] flex-shrink-0" />
        <span className="text-xs text-[#e4e7ec] flex-1 truncate">{room.roomName}</span>
        <span className="text-[10px] text-[#8b919e] font-mono-val">Kat {room.floor}</span>
        <RoomTypeBadge type={room.roomType} />
        <span className="text-[10px] text-[#8b919e] font-mono-val ml-2">{room.assetCount ?? assets.length} varlık</span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(room)}
            className="p-1 text-[#8b919e] hover:text-[#5b8fd5] hover:bg-amber-400/10 rounded"
          ><Edit size={11} /></button>
          <button
            onClick={() => onDelete(room)}
            className="p-1 text-[#8b919e] hover:text-red-400 hover:bg-red-400/10 rounded"
          ><Trash2 size={11} /></button>
        </div>
      </div>

      {open && (
        <div className="bg-[#060D18] border-b border-[#2e333d]/50">
          {assetsLoading ? (
            <div className="px-14 py-2 space-y-1">
              {[1,2,3].map(i => <div key={i} className="h-6 bg-[#2e333d]/30 rounded animate-pulse" />)}
            </div>
          ) : assets.length === 0 ? (
            <p className="px-14 py-2 text-[10px] text-[#555d6e] italic">Bu odada varlık yok</p>
          ) : (
            assets.map((asset: Asset) => (
              <div
                key={asset.assetId}
                className="flex items-center gap-2 px-14 py-2 border-b border-[#2e333d]/30 last:border-b-0 hover:bg-[#0D1829]/40"
              >
                <Monitor size={11} className="text-[#555d6e] flex-shrink-0" />
                <span className="text-[11px] text-[#C4D4E8] flex-1 truncate">{asset.assetName}</span>
                <span className="text-[9px] text-[#555d6e] font-mono-val hidden sm:block">{asset.assetType}</span>
                {asset.groupType && <GroupTypeBadge type={asset.groupType} />}
                {asset.groupName && (
                  <span className="text-[9px] text-[#555d6e] font-mono-val truncate max-w-[80px] hidden md:block">
                    {asset.groupName}
                  </span>
                )}
                <StatusBadge status={asset.status} />
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
}

// ─── Building row ─────────────────────────────────────────────
function BuildingRow({
  building, onEdit, onDelete, onAddRoom: _onAddRoom,
}: {
  building: Building;
  onEdit: (b: Building) => void;
  onDelete: (b: Building) => void;
  onAddRoom: (b: Building) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [roomForm, setRoomForm] = useState<RoomForm>(EMPTY_ROOM);
  const [roomError, setRoomError] = useState('');
  const qc = useQueryClient();

  const { data: roomsData } = useQuery({
    queryKey: ['rooms', building.buildingId],
    queryFn: () => roomApi.getByBuilding(building.buildingId),
    enabled: open,
  });
  const rooms: Room[] = (roomsData?.data?.data ?? []);

  const saveRoom = useMutation({
    mutationFn: (data: object) =>
      editRoom
        ? roomApi.update(editRoom.roomId, data)
        : roomApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms', building.buildingId] });
      qc.invalidateQueries({ queryKey: ['buildings'] });
      setShowRoomForm(false);
      setEditRoom(null);
      setRoomForm(EMPTY_ROOM);
    },
    onError: (e: { response?: { data?: { message?: string } } }) => setRoomError(e?.response?.data?.message ?? 'Hata'),
  });

  const deleteRoom = useMutation({
    mutationFn: (id: number) => roomApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms', building.buildingId] });
      qc.invalidateQueries({ queryKey: ['buildings'] });
    },
  });

  function openAddRoom() {
    setEditRoom(null);
    setRoomForm({ ...EMPTY_ROOM, buildingId: String(building.buildingId) });
    setRoomError('');
    setShowRoomForm(true);
    setOpen(true);
  }

  function openEditRoom(r: Room) {
    setEditRoom(r);
    setRoomForm({ roomName: r.roomName, floor: String(r.floor), roomType: r.roomType, buildingId: String(r.buildingId) });
    setRoomError('');
    setShowRoomForm(true);
  }

  function submitRoom() {
    if (!roomForm.roomName.trim()) { setRoomError('Oda adı zorunludur'); return; }
    saveRoom.mutate({
      buildingId: parseInt(roomForm.buildingId) || building.buildingId,
      roomName: roomForm.roomName.trim(),
      floor: parseInt(roomForm.floor) || 1,
      roomType: roomForm.roomType,
    });
  }

  return (
    <div className="border border-[#2e333d] rounded-lg overflow-hidden bg-[#0A1220]">
      {/* Building header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#0D1829] hover:bg-[#111E30] transition-colors">
        <button onClick={() => setOpen(v => !v)} className="text-[#8b919e] hover:text-[#e4e7ec]">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <Building2 size={14} className="text-amber-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-display font-semibold text-[#e4e7ec] truncate">{building.buildingName}</p>
          <p className="text-[10px] text-[#8b919e] truncate flex items-center gap-1 mt-0.5">
            <MapPin size={8} /> {building.city}{building.address ? ` — ${building.address}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0 text-[10px] text-[#8b919e] font-mono-val">
          <span className="flex items-center gap-1"><DoorOpen size={10} /> {building.roomCount ?? rooms.length} oda</span>
          <span className="flex items-center gap-1"><Layers size={10} /> {building.assetCount ?? 0} varlık</span>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={openAddRoom}
            className="p-1.5 text-[#8b919e] hover:text-green-400 hover:bg-green-400/10 rounded transition-colors"
            title="Oda Ekle"
          ><Plus size={12} /></button>
          <button
            onClick={() => onEdit(building)}
            className="p-1.5 text-[#8b919e] hover:text-[#5b8fd5] hover:bg-amber-400/10 rounded transition-colors"
            title="Düzenle"
          ><Edit size={12} /></button>
          <button
            onClick={() => onDelete(building)}
            className="p-1.5 text-[#8b919e] hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
            title="Sil"
          ><Trash2 size={12} /></button>
        </div>
      </div>

      {/* Rooms list */}
      {open && (
        <div className="border-t border-[#2e333d]">
          {rooms.length === 0 ? (
            <p className="px-8 py-3 text-[11px] text-[#8b919e] italic">Henüz oda yok</p>
          ) : (
            rooms.map(room => (
              <RoomRow
                key={room.roomId}
                room={room}
                onEdit={openEditRoom}
                onDelete={r => { if (confirm(`"${r.roomName}" silinsin mi?`)) deleteRoom.mutate(r.roomId); }}
              />
            ))
          )}
        </div>
      )}

      {/* Room form modal */}
      <Modal
        open={showRoomForm}
        onClose={() => { setShowRoomForm(false); setEditRoom(null); }}
        title={editRoom ? 'Oda Düzenle' : 'Yeni Oda'}
      >
        <div className="space-y-3">
          <FormField label="Oda Adı *">
            <input className={inputCls} value={roomForm.roomName}
              onChange={e => setRoomForm(f => ({ ...f, roomName: e.target.value }))}
              placeholder="Sunucu Odası" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Kat">
              <input className={inputCls} type="number" value={roomForm.floor}
                onChange={e => setRoomForm(f => ({ ...f, floor: e.target.value }))} />
            </FormField>
            <FormField label="Oda Tipi">
              <select className={inputCls} value={roomForm.roomType}
                onChange={e => setRoomForm(f => ({ ...f, roomType: e.target.value }))}>
                {ROOM_TYPES.map(t => (
                  <option key={t} value={t}>{t === 'ServerRoom' ? 'Sunucu Odası' : t === 'ControlRoom' ? 'Kontrol Odası' : t === 'Studio' ? 'Stüdyo' : t === 'Archive' ? 'Arşiv' : t === 'Storage' ? 'Depolama' : t === 'Office' ? 'Ofis' : 'Diğer'}</option>
                ))}
              </select>
            </FormField>
          </div>
          {roomError && <p className="text-xs text-red-400">{roomError}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={submitRoom} disabled={saveRoom.isPending}
              className="flex-1 py-2 text-xs font-mono-val rounded bg-amber-500/10 text-amber-400 border border-amber-500/25 hover:bg-[#5b8fd5]/20 transition-all disabled:opacity-50">
              {saveRoom.isPending ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
            <button onClick={() => { setShowRoomForm(false); setEditRoom(null); }}
              className="px-4 py-2 text-xs font-mono-val rounded border border-[#2e333d] text-[#8b919e] hover:text-[#e4e7ec] hover:bg-[#22262e] transition-all">
              İptal
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export function Infrastructure() {
  const qc = useQueryClient();

  const [channelFilter, setChannelFilter] = useState('');
  const [showBldgForm, setShowBldgForm] = useState(false);
  const [editBldg, setEditBldg] = useState<Building | null>(null);
  const [bldgForm, setBldgForm] = useState<BuildingForm>(EMPTY_BLDG);
  const [bldgError, setBldgError] = useState('');

  const { data: channelsData } = useQuery({
    queryKey: ['channels'],
    queryFn: () => channelApi.getAll(),
  });
  const channels: Channel[] = channelsData?.data?.data ?? [];

  // Fetch buildings for the selected channel, or all channels
  const filteredChannels = channelFilter
    ? channels.filter(c => String(c.channelId) === channelFilter)
    : channels;

  const buildingQueries = useQuery({
    queryKey: ['buildings', channelFilter],
    queryFn: async () => {
      const targets = filteredChannels;
      const results = await Promise.all(targets.map(c => buildingApi.getByChannel(c.channelId)));
      return results.flatMap((r: { data?: { data?: Building[] } }) => r.data?.data ?? []);
    },
    enabled: filteredChannels.length > 0,
  });
  const buildings: Building[] = buildingQueries.data ?? [];

  const saveBldg = useMutation({
    mutationFn: (data: object) =>
      editBldg ? buildingApi.update(editBldg.buildingId, data) : buildingApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['buildings'] });
      setShowBldgForm(false);
      setEditBldg(null);
      setBldgForm(EMPTY_BLDG);
    },
    onError: (e: { response?: { data?: { message?: string } } }) => setBldgError(e?.response?.data?.message ?? 'Hata'),
  });

  const deleteBldg = useMutation({
    mutationFn: (id: number) => buildingApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['buildings'] }),
  });

  function openAddBldg() {
    setEditBldg(null);
    setBldgForm({ ...EMPTY_BLDG, channelId: channelFilter });
    setBldgError('');
    setShowBldgForm(true);
  }

  function openEditBldg(b: Building) {
    setEditBldg(b);
    setBldgForm({ buildingName: b.buildingName, city: b.city ?? '', address: b.address ?? '', channelId: String(b.channelId) });
    setBldgError('');
    setShowBldgForm(true);
  }

  function submitBldg() {
    if (!bldgForm.buildingName.trim()) { setBldgError('Bina adı zorunludur'); return; }
    if (!bldgForm.channelId) { setBldgError('Kanal seçiniz'); return; }
    saveBldg.mutate({
      channelId: parseInt(bldgForm.channelId),
      buildingName: bldgForm.buildingName.trim(),
      city: bldgForm.city.trim(),
      address: bldgForm.address.trim(),
    });
  }

  // Stats
  const totalRooms = buildings.reduce((s, b) => s + (b.roomCount ?? 0), 0);
  const totalAssets = buildings.reduce((s, b) => s + (b.assetCount ?? 0), 0);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-display font-bold text-[#e4e7ec] flex items-center gap-2">
            <Building2 size={18} className="text-amber-400" />
            Altyapı Yönetimi
          </h1>
          <p className="text-[11px] text-[#8b919e] mt-0.5">Binalar ve odalar</p>
        </div>
        <button
          onClick={openAddBldg}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono-val rounded border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-[#5b8fd5]/20 transition-all"
        >
          <Plus size={13} /> Bina Ekle
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Toplam Bina', value: buildings.length, icon: Building2, color: 'text-amber-400' },
          { label: 'Toplam Oda', value: totalRooms, icon: DoorOpen, color: 'text-cyan-400' },
          { label: 'Toplam Varlık', value: totalAssets, icon: Layers, color: 'text-green-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-[#1a1d23] border border-[#2e333d] rounded-lg p-4 flex items-center gap-3">
            <div className={cn('w-8 h-8 rounded flex items-center justify-center bg-current/10', color)}>
              <Icon size={15} className={color} />
            </div>
            <div>
              <p className="text-xl font-display font-bold text-[#e4e7ec]">{value}</p>
              <p className="text-[10px] text-[#8b919e] uppercase tracking-wider">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <LayoutGrid size={13} className="text-[#8b919e]" />
        <select
          value={channelFilter}
          onChange={e => setChannelFilter(e.target.value)}
          className="text-xs bg-[#1a1d23] border border-[#2e333d] rounded px-3 py-1.5 text-[#e4e7ec] focus:outline-none focus:border-[#5b8fd5]/40"
        >
          <option value="">Tüm Kanallar</option>
          {channels.map(c => (
            <option key={c.channelId} value={String(c.channelId)}>{c.channelName}</option>
          ))}
        </select>
      </div>

      {/* Buildings */}
      {buildingQueries.isLoading ? (
        <p className="text-xs text-[#8b919e]">Yükleniyor...</p>
      ) : buildings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 size={32} className="text-[#2e333d] mb-3" />
          <p className="text-sm text-[#8b919e]">Henüz bina yok</p>
          <button onClick={openAddBldg} className="mt-3 text-xs text-amber-400 hover:underline">+ Bina ekle</button>
        </div>
      ) : (
        <div className="space-y-3">
          {buildings.map(b => (
            <BuildingRow
              key={b.buildingId}
              building={b}
              onEdit={openEditBldg}
              onDelete={bld => { if (confirm(`"${bld.buildingName}" silinsin mi?`)) deleteBldg.mutate(bld.buildingId); }}
              onAddRoom={() => {}}
            />
          ))}
        </div>
      )}

      {/* Building form modal */}
      <Modal
        open={showBldgForm}
        onClose={() => { setShowBldgForm(false); setEditBldg(null); }}
        title={editBldg ? 'Bina Düzenle' : 'Yeni Bina'}
      >
        <div className="space-y-3">
          <FormField label="Kanal *">
            <select className={inputCls} value={bldgForm.channelId}
              onChange={e => setBldgForm(f => ({ ...f, channelId: e.target.value }))}>
              <option value="">Kanal seçin</option>
              {channels.map(c => <option key={c.channelId} value={String(c.channelId)}>{c.channelName}</option>)}
            </select>
          </FormField>
          <FormField label="Bina Adı *">
            <input className={inputCls} value={bldgForm.buildingName}
              onChange={e => setBldgForm(f => ({ ...f, buildingName: e.target.value }))}
              placeholder="TRT Teknik Merkezi" />
          </FormField>
          <FormField label="Şehir">
            <input className={inputCls} value={bldgForm.city}
              onChange={e => setBldgForm(f => ({ ...f, city: e.target.value }))}
              placeholder="Ankara" />
          </FormField>
          <FormField label="Adres">
            <input className={inputCls} value={bldgForm.address}
              onChange={e => setBldgForm(f => ({ ...f, address: e.target.value }))}
              placeholder="Oran Mah. No:62" />
          </FormField>
          {bldgError && <p className="text-xs text-red-400">{bldgError}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={submitBldg} disabled={saveBldg.isPending}
              className="flex-1 py-2 text-xs font-mono-val rounded bg-amber-500/10 text-amber-400 border border-amber-500/25 hover:bg-[#5b8fd5]/20 transition-all disabled:opacity-50">
              {saveBldg.isPending ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
            <button onClick={() => { setShowBldgForm(false); setEditBldg(null); }}
              className="px-4 py-2 text-xs font-mono-val rounded border border-[#2e333d] text-[#8b919e] hover:text-[#e4e7ec] hover:bg-[#22262e] transition-all">
              İptal
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
