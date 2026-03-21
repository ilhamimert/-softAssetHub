import { useState, useRef, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronRight, ChevronDown, Server, Package,
  Building2, Radio, Boxes, Trash2, Plus, DoorOpen,
  Activity, RefreshCw, Check, X, AlertCircle,
  GripVertical, Search, Link2, Unlink, History,
} from 'lucide-react';
import { assetApi } from '@/api/client';
import { cn } from '@/lib/utils';

// ─── API ──────────────────────────────────────────────────────
const PHYS_API = '/api/v1/hierarchy';

const authFetch = (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('accessToken');
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
};

// ─── Types ────────────────────────────────────────────────────
interface PhysNode {
  id: string;
  name: string;
  path: string;
  parentId?: string;
  linkedAssetId?: number | null;
  payload?: Record<string, unknown>;
  children: PhysNode[];
}

interface SqlAsset {
  assetId: number;
  assetCode: string;
  assetName: string;
  isOnline?: boolean;
  status?: string;
}

interface DragState {
  nodeId: string;
  level: PhysLevel;
}

const PHYS_LEVELS = ['holding', 'kanal', 'bina', 'oda', 'bilgisayar', 'eklenti'] as const;
type PhysLevel = typeof PHYS_LEVELS[number];

const CHILD_OF: Partial<Record<PhysLevel, PhysLevel>> = {
  holding: 'kanal', kanal: 'bina', bina: 'oda', oda: 'bilgisayar', bilgisayar: 'eklenti',
};

// ─── Level config ─────────────────────────────────────────────
type LevelCfg = {
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  label: string;
  bg: string;
  border: string;
};

const LEVEL_CFG: Record<PhysLevel, LevelCfg> = {
  holding: { Icon: Building2, color: 'text-amber-400', label: 'Holding', bg: 'bg-amber-500/10', border: 'border-amber-500/25' },
  kanal: { Icon: Radio, color: 'text-blue-400', label: 'Kanal', bg: 'bg-blue-500/10', border: 'border-blue-500/25' },
  bina: { Icon: Building2, color: 'text-purple-400', label: 'Bina', bg: 'bg-purple-500/10', border: 'border-purple-500/25' },
  oda: { Icon: DoorOpen, color: 'text-green-400', label: 'Oda', bg: 'bg-green-500/10', border: 'border-green-500/25' },
  bilgisayar: { Icon: Server, color: 'text-cyan-400', label: 'Bilgisayar', bg: 'bg-cyan-500/10', border: 'border-cyan-500/25' },
  eklenti: { Icon: Package, color: 'text-gray-400', label: 'Eklenti', bg: 'bg-gray-500/10', border: 'border-gray-500/25' },
};

// ─── Payload fields ───────────────────────────────────────────
type PayloadField = { key: string; label: string; type: 'text' | 'number' | 'boolean' };
const PAYLOAD_FIELDS: Partial<Record<PhysLevel, PayloadField[]>> = {
  holding: [
    { key: 'vergiNo', label: 'Vergi No', type: 'text' },
    { key: 'merkez',  label: 'Merkez',   type: 'text' },
    { key: 'sektor',  label: 'Sektör',   type: 'text' },
  ],
  kanal: [
    { key: 'frekans',   label: 'Frekans',      type: 'text' },
    { key: 'yayinTipi', label: 'Yayın Tipi',   type: 'text' },
    { key: 'lisansNo',  label: 'Lisans No',    type: 'text' },
    { key: 'kurulus',   label: 'Kuruluş Yılı', type: 'number' },
  ],
  bina: [
    { key: 'adres',   label: 'Adres',      type: 'text' },
    { key: 'kat',     label: 'Kat Sayısı', type: 'number' },
    { key: 'tip',     label: 'Bina Tipi',  type: 'text' },
    { key: 'telefon', label: 'Telefon',    type: 'text' },
  ],
  oda: [
    { key: 'odaNo',         label: 'Oda No',         type: 'text' },
    { key: 'kat',           label: 'Kat',            type: 'number' },
    { key: 'tip',           label: 'Oda Tipi',       type: 'text' },
    { key: 'kapasite',      label: 'Kapasite',       type: 'number' },
    { key: 'iklimlendirme', label: 'İklimlendirme',  type: 'boolean' },
  ],
};

// ─── Highlight ────────────────────────────────────────────────
function Highlight({ text, term }: { text: string; term: string }) {
  if (!term) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-amber-500/30 text-amber-300 rounded px-0.5">{text.slice(idx, idx + term.length)}</mark>
      {text.slice(idx + term.length)}
    </>
  );
}

// ─── Tree Node ────────────────────────────────────────────────
function TreeNode({
  node, depth, expanded, selectedId, searchTerm,
  onToggle, onSelect, onDelete, onAddChild,
  multiSel, onMultiToggle,
  onlineMap, dragLevel, dropTargetId,
  onDragStart, onDragEnter, onDragLeave, onDrop, onRename,
}: {
  node: PhysNode;
  depth: number;
  expanded: Set<string>;
  selectedId: string | null;
  searchTerm: string;
  onToggle: (id: string) => void;
  onSelect: (node: PhysNode, level: PhysLevel) => void;
  onDelete: (id: string, level: PhysLevel, name: string) => void;
  onAddChild: (parentId: string, level: PhysLevel) => void;
  multiSel: Set<string>;
  onMultiToggle: (id: string, level: PhysLevel) => void;
  onlineMap: Map<number, boolean>;
  dragLevel: PhysLevel | null;
  dropTargetId: string | null;
  onDragStart: (e: React.DragEvent, node: PhysNode, level: PhysLevel) => void;
  onDragEnter: (e: React.DragEvent, node: PhysNode, level: PhysLevel) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, node: PhysNode, level: PhysLevel) => void;
  onRename: (id: string, level: PhysLevel, newName: string) => Promise<void>;
}) {
  const level = PHYS_LEVELS[depth] ?? 'eklenti';
  const [isEditing, setIsEditing] = useState(false);
  const [editVal, setEditVal] = useState('');
  const editRef = useRef<HTMLInputElement>(null);

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditVal(node.name);
    setIsEditing(true);
    setTimeout(() => editRef.current?.focus(), 10);
  };

  const submitEdit = async () => {
    if (!editVal.trim() || editVal.trim() === node.name) { setIsEditing(false); return; }
    await onRename(node.id, level, editVal.trim());
    setIsEditing(false);
  };

  const cancelEdit = () => { setIsEditing(false); setEditVal(''); };
  const { Icon, color, label } = LEVEL_CFG[level];
  const isOpen = expanded.has(node.id);
  const isSel = selectedId === node.id;
  const isMulti = multiSel.has(node.id);
  const hasKids = (node.children?.length ?? 0) > 0;
  const canAdd = !!CHILD_OF[level];

  // Can this node be dragged?
  const canDrag = level === 'bilgisayar' || level === 'eklenti';

  // Is this node a valid drop target?
  const isDropTarget = dropTargetId === node.id;

  // Online status dot for bilgisayar linked to SQL asset
  const isOnline = level === 'bilgisayar' && node.linkedAssetId != null
    ? onlineMap.get(node.linkedAssetId)
    : undefined;

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1.5 py-[5px] pr-1.5 rounded-md cursor-pointer select-none',
          'text-[11px] transition-colors group',
          isSel
            ? 'bg-[#162032] text-[#E2EAF4] border border-[#2A3F5F]'
            : isMulti
              ? 'bg-blue-500/10 text-[#E2EAF4] border border-blue-500/20'
              : isDropTarget
                ? 'bg-amber-500/10 border border-amber-500/30'
                : 'hover:bg-[#0F1A2E] text-[#A0B4CC]',
        )}
        style={{ paddingLeft: `${depth * 16 + 6}px` }}
        draggable={canDrag}
        onDragStart={e => canDrag && onDragStart(e, node, level)}
        onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
        onDragEnter={e => onDragEnter(e, node, level)}
        onDragLeave={onDragLeave}
        onDrop={e => onDrop(e, node, level)}
        onClick={e => {
          if (e.ctrlKey || e.metaKey) {
            onMultiToggle(node.id, level);
          } else {
            onSelect(node, level);
            if (hasKids) onToggle(node.id);
          }
        }}
      >
        {/* Drag handle */}
        {canDrag && (
          <span className="opacity-0 group-hover:opacity-50 text-[#3D5275] cursor-grab active:cursor-grabbing flex-shrink-0">
            <GripVertical size={9} />
          </span>
        )}

        {/* Expand arrow */}
        <span className="w-4 flex items-center justify-center flex-shrink-0">
          {hasKids
            ? <button
              onClick={e => { e.stopPropagation(); onToggle(node.id); }}
              className="text-[#4A6080] hover:text-[#A0B4CC] transition-colors"
            >
              {isOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            </button>
            : null
          }
        </span>

        {/* Icon */}
        <span className={cn('flex-shrink-0 transition-colors', isSel ? color : 'text-[#3D5275]')}>
          <Icon size={11} />
        </span>

        {/* Name */}
        {isEditing ? (
          <input
            ref={editRef}
            value={editVal}
            onChange={e => setEditVal(e.target.value)}
            onKeyDown={e => {
              e.stopPropagation();
              if (e.key === 'Enter') { e.preventDefault(); submitEdit(); }
              if (e.key === 'Escape') cancelEdit();
            }}
            onBlur={submitEdit}
            onClick={e => e.stopPropagation()}
            className="flex-1 min-w-0 text-[11px] bg-[#070B14] border border-amber-500/50 rounded px-1 py-0 text-[#E2EAF4] font-mono-val focus:outline-none"
          />
        ) : (
          <span className="flex-1 truncate" onDoubleClick={startEdit} title="Çift tıkla: Yeniden adlandır">
            <Highlight text={node.name} term={searchTerm} />
          </span>
        )}

        {/* Online status dot */}
        {isOnline !== undefined && (
          <span
            title={isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
            className={cn(
              'w-1.5 h-1.5 rounded-full flex-shrink-0',
              isOnline ? 'bg-green-400' : 'bg-red-400',
            )}
          />
        )}

        {/* Child count */}
        {hasKids && (
          <span className="text-[9px] font-mono-val px-1 rounded bg-[#1E2D45] text-[#4A6080] opacity-0 group-hover:opacity-100 transition-opacity mr-0.5">
            {node.children.length}
          </span>
        )}

        {/* Add child btn */}
        {canAdd && (
          <button
            onClick={e => { e.stopPropagation(); onAddChild(node.id, level); }}
            title={`${LEVEL_CFG[CHILD_OF[level]!].label} ekle`}
            className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:bg-blue-500/20 text-[#3D5275] hover:text-blue-400 transition-all"
          >
            <Plus size={9} />
          </button>
        )}

        {/* Delete btn */}
        <button
          onClick={e => { e.stopPropagation(); onDelete(node.id, level, node.name); }}
          title={`${label} sil`}
          className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:bg-red-500/20 text-[#3D5275] hover:text-red-400 transition-all"
        >
          <Trash2 size={9} />
        </button>
      </div>

      {/* Children */}
      {isOpen && node.children?.map(child => (
        <TreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          expanded={expanded}
          selectedId={selectedId}
          searchTerm={searchTerm}
          onToggle={onToggle}
          onSelect={onSelect}
          onDelete={onDelete}
          onAddChild={onAddChild}
          multiSel={multiSel}
          onMultiToggle={onMultiToggle}
          onlineMap={onlineMap}
          dragLevel={dragLevel}
          dropTargetId={dropTargetId}
          onDragStart={onDragStart}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onRename={onRename}
        />
      ))}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────
function matchesSearch(node: PhysNode, term: string): boolean {
  if (node.name.toLowerCase().includes(term.toLowerCase())) return true;
  return node.children?.some(c => matchesSearch(c, term)) ?? false;
}

function filterTree(nodes: PhysNode[], term: string): PhysNode[] {
  if (!term) return nodes;
  return nodes
    .filter(n => matchesSearch(n, term))
    .map(n => ({ ...n, children: filterTree(n.children ?? [], term) }));
}

function collectAllIds(nodes: PhysNode[]): string[] {
  const ids: string[] = [];
  for (const n of nodes) {
    ids.push(n.id);
    if (n.children?.length) ids.push(...collectAllIds(n.children));
  }
  return ids;
}

// ─── Assets Page ──────────────────────────────────────────────
export function Assets() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sel, setSel] = useState<{ node: PhysNode; level: PhysLevel } | null>(null);
  const [addChildName, setAddChildName] = useState('');
  const [treeAddTo, setTreeAddTo] = useState<{ parentId: string; level: PhysLevel } | null>(null);
  const [treeAddName, setTreeAddName] = useState('');
  const [addRootName, setAddRootName] = useState('');
  const [showRootForm, setShowRootForm] = useState(false);

  // New feature states
  const [searchTerm, setSearchTerm] = useState('');
  const [multiSel, setMultiSel] = useState<Set<string>>(new Set());
  const [multiLvl, setMultiLvl] = useState<PhysLevel | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [linkSearch, setLinkSearch] = useState('');
  const [showAudit, setShowAudit] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: number; msg: string; ok: boolean }>>([]);
  const [payloadForm, setPayloadForm] = useState<Record<string, string | number | boolean>>({});
  const [payloadSaving, setPayloadSaving] = useState(false);

  const treeInputRef = useRef<HTMLInputElement>(null);

  const toast = (msg: string, ok = true) => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, ok }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  };
  const qc = useQueryClient();

  // ── Queries ─────────────────────────────────────────────────
  const { data: physTree, isLoading, isError, refetch } = useQuery<PhysNode[]>({
    queryKey: ['phys-tree'],
    queryFn: () =>
      authFetch(`${PHYS_API}/tree`).then(r => {
        if (!r.ok) throw new Error('API hatası');
        return r.json();
      }),
    refetchInterval: 10000,
    retry: 1,
  });

  const { data: sqlAssetsData } = useQuery({
    queryKey: ['sql-assets-all'],
    queryFn: () => assetApi.getAll({ limit: 500 }).then(r => r.data?.data ?? []),
    refetchInterval: 30000,
  });

  const { data: auditData } = useQuery({
    queryKey: ['phys-audit'],
    queryFn: () => authFetch(`${PHYS_API}/audit-log`).then(r => r.json()),
    enabled: showAudit,
    refetchInterval: showAudit ? 5000 : false,
  });

  const holdings: PhysNode[] = physTree ?? [];
  const sqlAssets: SqlAsset[] = sqlAssetsData ?? [];

  // Online map: assetId -> bool
  const onlineMap = useMemo(() => {
    const m = new Map<number, boolean>();
    for (const a of sqlAssets) m.set(a.assetId, a.isOnline ?? false);
    return m;
  }, [sqlAssets]);

  // Filtered tree for search
  const filteredHoldings = useMemo(
    () => filterTree(holdings, searchTerm),
    [holdings, searchTerm],
  );

  // Auto-expand all on search
  useEffect(() => {
    if (searchTerm) {
      setExpanded(new Set(collectAllIds(holdings)));
    }
  }, [searchTerm]);

  // Live node from current tree
  const findNode = (nodes: PhysNode[], id: string): PhysNode | null => {
    for (const n of nodes) {
      if (n.id === id) return n;
      const found = findNode(n.children ?? [], id);
      if (found) return found;
    }
    return null;
  };

  const liveNode = sel ? (findNode(holdings, sel.node.id) ?? sel.node) : null;

  // Sync payload form when selected node changes
  useEffect(() => {
    if (liveNode?.payload && typeof liveNode.payload === 'object') {
      setPayloadForm(liveNode.payload as Record<string, string | number | boolean>);
    } else {
      setPayloadForm({});
    }
  }, [liveNode?.id]);

  // Linked SQL asset
  const linkedAsset = useMemo(
    () => liveNode?.linkedAssetId != null
      ? sqlAssets.find(a => a.assetId === liveNode.linkedAssetId) ?? null
      : null,
    [liveNode, sqlAssets],
  );

  // Link search results
  const linkSearchResults = useMemo(() => {
    if (!linkSearch.trim()) return [];
    const q = linkSearch.toLowerCase();
    return sqlAssets.filter(a =>
      a.assetName?.toLowerCase().includes(q) || a.assetCode?.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [linkSearch, sqlAssets]);

  // ── Helpers ─────────────────────────────────────────────────
  const expand = (id: string) =>
    setExpanded(s => { const n = new Set(s); n.add(id); return n; });

  const toggle = (id: string) =>
    setExpanded(s => { const n = new Set(s); if (n.has(id)) { n.delete(id); } else { n.add(id); } return n; });

  const select = (node: PhysNode, level: PhysLevel) => {
    setSel({ node, level });
    setMultiSel(new Set());
    setAddChildName('');
    setTreeAddTo(null);
    setLinkSearch('');
  };

  const multiToggle = (id: string, level: PhysLevel) => {
    setMultiSel(s => {
      const n = new Set(s);
      if (n.has(id)) { n.delete(id); if (n.size === 0) setMultiLvl(null); }
      else { n.add(id); setMultiLvl(level); }
      return n;
    });
    setSel(null);
  };

  // ── API actions ─────────────────────────────────────────────
  const doDelete = async (id: string, level: PhysLevel, name: string) => {
    if (!confirm(`"${name}" ve tüm alt öğeler silinecek. Onaylıyor musunuz?`)) return;
    try {
      const r = await authFetch(`${PHYS_API}/${level}/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error();
      if (sel?.node.id === id) setSel(null);
      qc.invalidateQueries({ queryKey: ['phys-tree'] });
      qc.invalidateQueries({ queryKey: ['phys-audit'] });
      toast(`"${name}" silindi`);
    } catch {
      toast('Silme başarısız', false);
    }
  };

  const doBulkDelete = async () => {
    if (!multiLvl || multiSel.size === 0) return;
    if (!confirm(`${multiSel.size} öğe silinecek. Onaylıyor musunuz?`)) return;
    for (const id of multiSel) {
      const node = findNode(holdings, id);
      if (node) await authFetch(`${PHYS_API}/${multiLvl}/${id}`, { method: 'DELETE' });
    }
    setMultiSel(new Set());
    setMultiLvl(null);
    qc.invalidateQueries({ queryKey: ['phys-tree'] });
    qc.invalidateQueries({ queryKey: ['phys-audit'] });
  };

  const doAdd = async (parentId: string, parentLevel: PhysLevel, name: string) => {
    const endpoint = CHILD_OF[parentLevel];
    if (!endpoint || !name.trim()) return;
    try {
      const r = await authFetch(`${PHYS_API}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId, name: name.trim() }),
      });
      if (!r.ok) throw new Error();
      expand(parentId);
      qc.invalidateQueries({ queryKey: ['phys-tree'] });
      qc.invalidateQueries({ queryKey: ['phys-audit'] });
      toast(`${LEVEL_CFG[endpoint].label} eklendi`);
    } catch {
      toast('Ekleme başarısız', false);
    }
  };

  const doAddRoot = async (name: string) => {
    if (!name.trim()) return;
    try {
      const r = await authFetch(`${PHYS_API}/holding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!r.ok) throw new Error();
      setAddRootName('');
      setShowRootForm(false);
      qc.invalidateQueries({ queryKey: ['phys-tree'] });
      qc.invalidateQueries({ queryKey: ['phys-audit'] });
      toast('Holding eklendi');
    } catch {
      toast('Holding eklenemedi', false);
    }
  };

  const loadDemo = async () => {
    await authFetch(`${PHYS_API}/demo`, { method: 'POST' });
    qc.invalidateQueries({ queryKey: ['phys-tree'] });
    qc.invalidateQueries({ queryKey: ['phys-audit'] });
  };

  const doAutoLink = async () => {
    try {
      const r = await authFetch(`${PHYS_API}/auto-link`, { method: 'POST' });
      if (!r.ok) {
        const text = await r.text().catch(() => '');
        console.error('[auto-link]', r.status, text);
        throw new Error(`HTTP ${r.status}`);
      }
      const data = await r.json();
      qc.invalidateQueries({ queryKey: ['phys-tree'] });
      qc.invalidateQueries({ queryKey: ['phys-audit'] });
      qc.invalidateQueries({ queryKey: ['sql-assets-all'] });
      toast(`${data.matched} bilgisayar eşleştirildi`);
    } catch (err) {
      console.error('[auto-link]', err);
      toast(`Eşleştirme başarısız: ${err instanceof Error ? err.message : String(err)}`, false);
    }
  };

  const doMove = async (nodeId: string, level: PhysLevel, newParentId: string) => {
    try {
      const r = await authFetch(`${PHYS_API}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeType: level, nodeId, newParentId }),
      });
      if (!r.ok) throw new Error();
      qc.invalidateQueries({ queryKey: ['phys-tree'] });
      qc.invalidateQueries({ queryKey: ['phys-audit'] });
      toast('Taşındı');
    } catch {
      toast('Taşıma başarısız', false);
    }
  };

  const doLink = async (pcId: string, assetId: number | null) => {
    try {
      const r = await authFetch(`${PHYS_API}/bilgisayar/${pcId}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId }),
      });
      if (!r.ok) throw new Error();
      setLinkSearch('');
      qc.invalidateQueries({ queryKey: ['phys-tree'] });
      qc.invalidateQueries({ queryKey: ['phys-audit'] });
      toast(assetId ? 'Bağlantı kuruldu' : 'Bağlantı kaldırıldı');
    } catch {
      toast('Bağlantı işlemi başarısız', false);
    }
  };

  const doRename = async (id: string, level: PhysLevel, newName: string) => {
    try {
      const r = await authFetch(`${PHYS_API}/${level}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      if (!r.ok) throw new Error();
      qc.invalidateQueries({ queryKey: ['phys-tree'] });
      qc.invalidateQueries({ queryKey: ['phys-audit'] });
      toast('Ad güncellendi');
    } catch {
      toast('Yeniden adlandırma başarısız', false);
    }
  };

  const savePayload = async () => {
    if (!liveNode || !sel) return;
    setPayloadSaving(true);
    try {
      const r = await authFetch(`${PHYS_API}/${sel.level}/${liveNode.id}/payload`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: payloadForm }),
      });
      if (!r.ok) throw new Error();
      qc.invalidateQueries({ queryKey: ['phys-tree'] });
      toast('Metadata kaydedildi');
    } catch {
      toast('Kayıt başarısız', false);
    } finally {
      setPayloadSaving(false);
    }
  };

  // ── Drag & Drop handlers ─────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, node: PhysNode, level: PhysLevel) => {
    e.dataTransfer.effectAllowed = 'move';
    setDragState({ nodeId: node.id, level });
  };

  const handleDragEnter = (e: React.DragEvent, node: PhysNode, level: PhysLevel) => {
    e.preventDefault();
    if (!dragState) return;
    // bilgisayar can drop into oda; eklenti can drop into bilgisayar
    const validDrop =
      (dragState.level === 'bilgisayar' && level === 'oda') ||
      (dragState.level === 'eklenti' && level === 'bilgisayar');
    if (validDrop && node.id !== dragState.nodeId) setDropTargetId(node.id);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTargetId(null);
  };

  const handleDrop = (e: React.DragEvent, node: PhysNode, _level: PhysLevel) => {
    e.preventDefault();
    if (!dragState || dropTargetId !== node.id) { setDragState(null); setDropTargetId(null); return; }
    doMove(dragState.nodeId, dragState.level, node.id);
    setDragState(null);
    setDropTargetId(null);
  };

  // ── Tree inline add ──────────────────────────────────────────
  const startTreeAdd = (parentId: string, level: PhysLevel) => {
    setTreeAddTo({ parentId, level });
    setTreeAddName('');
    expand(parentId);
    setTimeout(() => treeInputRef.current?.focus(), 50);
  };

  const submitTreeAdd = async () => {
    if (!treeAddTo) return;
    await doAdd(treeAddTo.parentId, treeAddTo.level, treeAddName);
    setTreeAddTo(null);
    setTreeAddName('');
  };

  // ── Right panel add ──────────────────────────────────────────
  const submitRightAdd = async () => {
    if (!sel || !liveNode || !addChildName.trim()) return;
    await doAdd(liveNode.id, sel.level, addChildName);
    setAddChildName('');
  };

  const childLevel = sel ? CHILD_OF[sel.level] : undefined;

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-8rem)]">

      {/* Bulk actions bar */}
      {multiSel.size > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs font-mono-val flex-shrink-0">
          <span className="text-blue-400">{multiSel.size} öğe seçildi</span>
          <button
            onClick={doBulkDelete}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25 transition-all"
          >
            <Trash2 size={11} /> Seçilileri Sil
          </button>
          <button
            onClick={() => { setMultiSel(new Set()); setMultiLvl(null); }}
            className="ml-auto text-[#3D5275] hover:text-[#6B84A3]"
          >
            <X size={12} />
          </button>
        </div>
      )}

      <div className="flex gap-3 flex-1 min-h-0">

        {/* ═══════════════════════════════════════════════════════
            LEFT — Fiziksel Ağaç
        ═══════════════════════════════════════════════════════ */}
        <div className="w-72 flex-shrink-0 card overflow-hidden flex flex-col">

          {/* Header */}
          <div className="px-3 pt-3 pb-2 border-b border-[#1E2D45] flex-shrink-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val">
                Fiziksel Hiyerarşi
              </span>
              <button
                onClick={() => refetch()}
                title="Yenile"
                className="p-1 rounded text-[#3D5275] hover:text-[#6B84A3] hover:bg-[#1E2D45] transition-all"
              >
                <RefreshCw size={10} />
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#3D5275]" />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Ara..."
                className="w-full pl-6 pr-2 py-1.5 text-[10px] bg-[#070B14] border border-[#1E2D45] rounded-md text-[#E2EAF4] placeholder:text-[#3D5275] font-mono-val focus:outline-none focus:border-[#2A3F5F]"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#3D5275] hover:text-[#6B84A3]"
                >
                  <X size={9} />
                </button>
              )}
            </div>

            <p className="text-[9px] text-[#2A3F5F] font-mono-val">
              Holding → Kanal → Bina → Oda → Bilgisayar → Eklenti
            </p>

            {/* Actions */}
            <div className="flex gap-1">
              <button
                onClick={loadDemo}
                className="flex-1 text-[9px] font-mono-val py-1.5 rounded bg-[#111827] text-[#6B84A3] hover:text-amber-400 hover:bg-amber-500/10 border border-[#1E2D45] hover:border-amber-500/20 transition-all"
              >
                Gerçek Veri Yükle
              </button>
              <button
                onClick={doAutoLink}
                title="Bilgisayarları SQL Assets ile isim benzerliğine göre otomatik eşleştir"
                className="flex-1 text-[9px] font-mono-val py-1.5 rounded bg-[#111827] text-[#6B84A3] hover:text-green-400 hover:bg-green-500/10 border border-[#1E2D45] hover:border-green-500/20 transition-all flex items-center justify-center gap-1"
              >
                <Link2 size={8} /> Otomatik Eşleştir
              </button>
              <button
                onClick={() => {
                  setShowRootForm(v => !v);
                  setTimeout(() => document.getElementById('rootInput')?.focus(), 50);
                }}
                className="px-2.5 py-1.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all text-[9px] font-mono-val flex items-center gap-1"
              >
                <Plus size={9} /> Holding
              </button>
            </div>

            {/* Root holding form */}
            {showRootForm && (
              <div className="flex gap-1">
                <input
                  id="rootInput"
                  value={addRootName}
                  onChange={e => setAddRootName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') doAddRoot(addRootName);
                    if (e.key === 'Escape') { setShowRootForm(false); setAddRootName(''); }
                  }}
                  placeholder="Holding adı..."
                  className="flex-1 text-[10px] bg-[#070B14] border border-amber-500/30 rounded px-2 py-1 text-[#E2EAF4] placeholder:text-[#3D5275] font-mono-val focus:outline-none"
                />
                <button onClick={() => doAddRoot(addRootName)} className="p-1.5 rounded bg-amber-500/15 text-amber-400 hover:bg-amber-500/25">
                  <Check size={10} />
                </button>
                <button onClick={() => { setShowRootForm(false); setAddRootName(''); }} className="p-1.5 rounded text-[#3D5275] hover:text-[#6B84A3]">
                  <X size={10} />
                </button>
              </div>
            )}
          </div>

          {/* Tree body */}
          <div className="flex-1 overflow-y-auto py-1.5 px-1 space-y-0.5">
            {isError ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-3 gap-2">
                <AlertCircle size={22} className="text-red-400/40" />
                <p className="text-[10px] text-[#3D5275] font-mono-val leading-relaxed">
                  Fiziksel ağaç verisi yüklenemedi<br />
                  <span className="text-[#2A3F5F]">Backend bağlantısını kontrol edin</span>
                </p>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Activity size={14} className="animate-pulse text-[#3D5275]" />
              </div>
            ) : filteredHoldings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                <Boxes size={26} className="text-[#1E2D45]" />
                <p className="text-[10px] text-[#3D5275] font-mono-val leading-relaxed">
                  {searchTerm ? 'Eşleşen öğe yok.' : 'Veri yok.\nDemo yükle veya holding ekle.'}
                </p>
              </div>
            ) : (
              filteredHoldings.map(h => (
                <TreeNode
                  key={h.id}
                  node={h}
                  depth={0}
                  expanded={expanded}
                  selectedId={sel?.node.id ?? null}
                  searchTerm={searchTerm}
                  onToggle={toggle}
                  onSelect={select}
                  onDelete={doDelete}
                  onAddChild={startTreeAdd}
                  multiSel={multiSel}
                  onMultiToggle={multiToggle}
                  onlineMap={onlineMap}
                  dragLevel={dragState?.level ?? null}
                  dropTargetId={dropTargetId}
                  onDragStart={handleDragStart}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onRename={doRename}
                />
              ))
            )}

            {/* Inline add form (triggered from tree + button) */}
            {treeAddTo && (
              <div className="mx-1 mt-2 p-2 rounded-lg border border-blue-500/20 bg-[#0D1A2D]">
                <p className="text-[9px] text-blue-400/70 font-mono-val mb-1.5">
                  + {LEVEL_CFG[CHILD_OF[treeAddTo.level]!]?.label} Ekle
                </p>
                <div className="flex gap-1">
                  <input
                    ref={treeInputRef}
                    value={treeAddName}
                    onChange={e => setTreeAddName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') submitTreeAdd();
                      if (e.key === 'Escape') { setTreeAddTo(null); setTreeAddName(''); }
                    }}
                    placeholder="Ad..."
                    className="flex-1 text-[10px] bg-[#070B14] border border-blue-500/30 rounded px-2 py-1 text-[#E2EAF4] placeholder:text-[#3D5275] font-mono-val focus:outline-none"
                  />
                  <button onClick={submitTreeAdd} className="p-1.5 rounded bg-blue-500/15 text-blue-400 hover:bg-blue-500/25">
                    <Check size={10} />
                  </button>
                  <button onClick={() => { setTreeAddTo(null); setTreeAddName(''); }} className="p-1.5 rounded text-[#3D5275] hover:text-[#6B84A3]">
                    <X size={10} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            RIGHT — Detay Paneli
        ═══════════════════════════════════════════════════════ */}
        <div className="flex-1 min-w-0 card overflow-y-auto">

          {/* Empty state */}
          {!sel || !liveNode ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-3">
              <Boxes size={48} className="text-[#1E2D45]" />
              <p className="text-[#3D5275] font-mono-val text-sm">Sol menüden bir öğe seçin</p>
              <p className="text-[#2A3F5F] font-mono-val text-[10px]">
                Ctrl+Tık ile çoklu seçim • Sürükle-Bırak ile taşıma
              </p>
            </div>
          ) : (
            <div className="p-5 space-y-6">

              {/* ── Node header ─────────────────────────────── */}
              <div className="flex items-start gap-4 pb-5 border-b border-[#1E2D45]">
                {/* Big icon */}
                <div className={cn(
                  'w-14 h-14 rounded-xl border-2 flex items-center justify-center flex-shrink-0',
                  LEVEL_CFG[sel.level].bg,
                  LEVEL_CFG[sel.level].border,
                )}>
                  {(() => { const { Icon, color } = LEVEL_CFG[sel.level]; return <Icon size={26} className={color} />; })()}
                </div>

                {/* Name + path */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h2 className="font-display font-bold text-xl text-white">{liveNode.name}</h2>
                    <span className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full border font-mono-val',
                      LEVEL_CFG[sel.level].color,
                      LEVEL_CFG[sel.level].bg,
                      LEVEL_CFG[sel.level].border,
                    )}>
                      {LEVEL_CFG[sel.level].label}
                    </span>
                    {/* Live status badge for bilgisayar */}
                    {sel.level === 'bilgisayar' && liveNode.linkedAssetId != null && (() => {
                      const online = onlineMap.get(liveNode.linkedAssetId);
                      return (
                        <span className={cn(
                          'flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-mono-val',
                          online
                            ? 'text-green-400 bg-green-500/10 border-green-500/25'
                            : 'text-red-400 bg-red-500/10 border-red-500/25',
                        )}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', online ? 'bg-green-400' : 'bg-red-400')} />
                          {online ? 'Çevrimiçi' : 'Çevrimdışı'}
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-[10px] text-[#3D5275] font-mono-val break-all leading-relaxed">{liveNode.path}</p>
                  <p className="text-[10px] text-[#4A6080] font-mono-val mt-1">
                    {liveNode.children?.length ?? 0} alt öğe
                  </p>
                </div>

                {/* Delete */}
                <button
                  onClick={() => doDelete(liveNode.id, sel.level, liveNode.name)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono-val bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all flex-shrink-0"
                >
                  <Trash2 size={11} /> Sil
                </button>
              </div>

              {/* ── Metadata (holding / kanal / bina / oda) ── */}
              {PAYLOAD_FIELDS[sel.level] && (
                <div>
                  <p className="text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val mb-3">
                    Metadata
                  </p>
                  <div className="space-y-2">
                    {PAYLOAD_FIELDS[sel.level]!.map(field => (
                      <div key={field.key}>
                        <label className="text-[10px] text-[#6B84A3] uppercase tracking-wider font-mono-val block mb-1">
                          {field.label}
                        </label>
                        {field.type === 'boolean' ? (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!payloadForm[field.key]}
                              onChange={e => setPayloadForm(f => ({ ...f, [field.key]: e.target.checked }))}
                              className="rounded"
                            />
                            <span className="text-xs text-[#E2EAF4] font-mono-val">
                              {payloadForm[field.key] ? 'Evet' : 'Hayır'}
                            </span>
                          </label>
                        ) : (
                          <input
                            type={field.type}
                            value={(payloadForm[field.key] ?? '') as string | number}
                            onChange={e => setPayloadForm(f => ({
                              ...f,
                              [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value,
                            }))}
                            className="w-full px-3 py-2 text-sm bg-[#0D1525] border border-[#1E2D45] focus:border-[#3D5275] rounded-lg text-[#E2EAF4] font-mono-val focus:outline-none transition-colors placeholder:text-[#3D5275]"
                          />
                        )}
                      </div>
                    ))}
                    <button
                      onClick={savePayload}
                      disabled={payloadSaving}
                      className="w-full mt-2 py-2 text-xs font-mono-val rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 hover:bg-indigo-500/20 transition-all disabled:opacity-50"
                    >
                      {payloadSaving ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── SQL Asset Bağlantısı (Bilgisayar only) ── */}
              {sel.level === 'bilgisayar' && (
                <div>
                  <p className="text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val mb-3">
                    SQL Varlık Bağlantısı
                  </p>
                  {linkedAsset ? (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                      <Link2 size={14} className="text-green-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#E2EAF4] font-medium truncate">{linkedAsset.assetName}</p>
                        <p className="text-[10px] text-[#3D5275] font-mono-val">{linkedAsset.assetCode} · ID: {linkedAsset.assetId}</p>
                      </div>
                      <button
                        onClick={() => doLink(liveNode.id, null)}
                        title="Bağlantıyı kaldır"
                        className="p-1.5 rounded hover:bg-red-500/10 text-[#3D5275] hover:text-red-400 transition-all"
                      >
                        <Unlink size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#3D5275]" />
                        <input
                          value={linkSearch}
                          onChange={e => setLinkSearch(e.target.value)}
                          placeholder="Varlık adı veya kodu..."
                          className="w-full pl-8 pr-3 py-2 text-sm bg-[#0D1525] border border-[#1E2D45] focus:border-[#3D5275] rounded-lg text-[#E2EAF4] placeholder:text-[#3D5275] font-mono-val focus:outline-none transition-colors"
                        />
                      </div>
                      {linkSearchResults.length > 0 && (
                        <div className="rounded-lg border border-[#1E2D45] overflow-hidden">
                          {linkSearchResults.map(a => (
                            <button
                              key={a.assetId}
                              onClick={() => doLink(liveNode.id, a.assetId)}
                              className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[#0F1A2E] border-b border-[#1E2D45] last:border-0 transition-colors"
                            >
                              <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', onlineMap.get(a.assetId) ? 'bg-green-400' : 'bg-red-400')} />
                              <span className="flex-1 min-w-0">
                                <span className="text-xs text-[#E2EAF4] block truncate">{a.assetName}</span>
                                <span className="text-[10px] text-[#3D5275] font-mono-val">{a.assetCode}</span>
                              </span>
                              <Link2 size={10} className="text-[#3D5275] flex-shrink-0" />
                            </button>
                          ))}
                        </div>
                      )}
                      {!linkSearch && (
                        <p className="text-[10px] text-[#2A3F5F] font-mono-val">
                          SQL Assets tablosundaki varlıkları arayın ve bağlayın
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}


              {/* ── Alt öğe ekle ────────────────────────────── */}
              {childLevel && (
                <div>
                  <p className="text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val mb-2">
                    Yeni {LEVEL_CFG[childLevel].label}
                  </p>
                  <div className="flex gap-2">
                    <input
                      value={addChildName}
                      onChange={e => setAddChildName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') submitRightAdd();
                        if (e.key === 'Escape') setAddChildName('');
                      }}
                      placeholder={`${LEVEL_CFG[childLevel].label} adı girin...`}
                      className="flex-1 text-sm bg-[#0D1525] border border-[#1E2D45] focus:border-[#3D5275] rounded-lg px-3 py-2 text-[#E2EAF4] placeholder:text-[#3D5275] font-mono-val focus:outline-none transition-colors"
                    />
                    <button
                      onClick={submitRightAdd}
                      disabled={!addChildName.trim()}
                      className={cn(
                        'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-mono-val border transition-all disabled:opacity-40',
                        LEVEL_CFG[childLevel].color,
                        LEVEL_CFG[childLevel].bg,
                        LEVEL_CFG[childLevel].border,
                        'hover:brightness-125',
                      )}
                    >
                      <Plus size={13} /> Ekle
                    </button>
                  </div>
                </div>
              )}

              {/* ── Children grid ───────────────────────────── */}
              {(liveNode.children?.length ?? 0) > 0 && (
                <div>
                  <p className="text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val mb-3">
                    {childLevel ? LEVEL_CFG[childLevel].label : 'Alt Öğe'}ler{' '}
                    <span className="text-[#3D5275] normal-case">({liveNode.children.length})</span>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {liveNode.children.map(child => {
                      const cLvl = childLevel ?? 'eklenti';
                      const { Icon, color, bg, border, label } = LEVEL_CFG[cLvl];
                      const childOnline = cLvl === 'bilgisayar' && (child as PhysNode & { linkedAssetId?: number }).linkedAssetId != null
                        ? onlineMap.get((child as PhysNode & { linkedAssetId?: number }).linkedAssetId!)
                        : undefined;
                      return (
                        <div
                          key={child.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-[#0D1525] border border-[#1A2540] cursor-pointer hover:border-[#2A3F5F] hover:bg-[#111827] transition-all group"
                          onClick={() => {
                            select(child, cLvl);
                            expand(liveNode.id);
                          }}
                        >
                          {/* Icon */}
                          <div className={cn('w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 relative', bg, border)}>
                            <Icon size={14} className={color} />
                            {childOnline !== undefined && (
                              <span className={cn(
                                'absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#0D1525]',
                                childOnline ? 'bg-green-400' : 'bg-red-400',
                              )} />
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-[#E2EAF4] font-medium truncate">{child.name}</p>
                            <p className="text-[10px] text-[#3D5275] font-mono-val">{label}</p>
                            {(child.children?.length ?? 0) > 0 && (
                              <p className="text-[10px] text-[#4A6080] font-mono-val">{child.children.length} alt öğe</p>
                            )}
                          </div>

                          {/* Delete */}
                          <button
                            onClick={e => { e.stopPropagation(); doDelete(child.id, cLvl, child.name); }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-500/20 text-[#3D5275] hover:text-red-400 transition-all"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}


            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          BOTTOM — Değişiklik Geçmişi (Audit Log)
      ═══════════════════════════════════════════════════════ */}
      <div className="card flex-shrink-0">
        <button
          onClick={() => setShowAudit(v => !v)}
          className="flex items-center gap-2 w-full text-left"
        >
          <History size={11} className="text-[#6B84A3]" />
          <span className="text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val flex-1">
            Değişiklik Geçmişi
          </span>
          <ChevronRight size={10} className={cn('text-[#3D5275] transition-transform', showAudit && 'rotate-90')} />
        </button>

        {showAudit && (
          <div className="mt-3 max-h-48 overflow-y-auto space-y-1">
            {!auditData || auditData.length === 0 ? (
              <p className="text-[10px] text-[#3D5275] font-mono-val py-4 text-center">Henüz değişiklik yok</p>
            ) : auditData.map((e: { timestamp: string; action: string; nodeType: string; nodeName: string }, i: number) => (
              <div key={i} className="flex items-center gap-3 py-1.5 border-b border-[#1E2D45] last:border-0">
                <span className="text-[9px] text-[#3D5275] font-mono-val flex-shrink-0 w-36">
                  {new Date(e.timestamp).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'medium' })}
                </span>
                <span className={cn(
                  'text-[9px] px-1.5 py-0.5 rounded font-mono-val flex-shrink-0',
                  e.action === 'create' && 'bg-green-500/10 text-green-400',
                  e.action === 'delete' && 'bg-red-500/10 text-red-400',
                  e.action === 'move' && 'bg-blue-500/10 text-blue-400',
                  e.action === 'link' && 'bg-purple-500/10 text-purple-400',
                  e.action === 'unlink' && 'bg-orange-500/10 text-orange-400',
                  e.action === 'demo' && 'bg-amber-500/10 text-amber-400',
                  e.action === 'rename' && 'bg-yellow-500/10 text-yellow-400',
                )}>
                  {e.action}
                </span>
                <span className="text-[9px] text-[#4A6080] font-mono-val flex-shrink-0">{e.nodeType}</span>
                <span className="text-[10px] text-[#A0B4CC] font-mono-val truncate">{e.nodeName}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toast bildirimler */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50 pointer-events-none">
          {toasts.map(t => (
            <div key={t.id} className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono-val border shadow-lg',
              t.ok
                ? 'bg-[#0D2018] text-green-400 border-green-500/30'
                : 'bg-[#1F0D0D] text-red-400 border-red-500/30',
            )}>
              {t.ok ? <Check size={11} /> : <AlertCircle size={11} />}
              {t.msg}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
