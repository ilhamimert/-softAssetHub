import { Plus, Trash2, Search, Link2, Unlink, Boxes } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LEVEL_CFG, PAYLOAD_FIELDS } from './constants';
import { CHILD_OF, type PhysNode, type PhysLevel, type SqlAsset } from './types';

interface NodeDetailPanelProps {
  sel: { node: PhysNode; level: PhysLevel } | null;
  liveNode: PhysNode | null;
  onlineMap: Map<number, boolean>;
  linkedAsset: SqlAsset | null;
  linkSearch: string;
  onLinkSearchChange: (v: string) => void;
  linkSearchResults: SqlAsset[];
  addChildName: string;
  onAddChildNameChange: (v: string) => void;
  payloadForm: Record<string, string | number | boolean>;
  onPayloadFormChange: (form: Record<string, string | number | boolean>) => void;
  payloadSaving: boolean;
  onDelete: (id: string, level: PhysLevel, name: string) => void;
  onLink: (pcId: string, assetId: number | null) => void;
  onSubmitRightAdd: () => void;
  onSavePayload: () => void;
  onSelectChild: (child: PhysNode, level: PhysLevel) => void;
  onExpandNode: (id: string) => void;
  onDeleteChild: (id: string, level: PhysLevel, name: string) => void;
}

export function NodeDetailPanel({
  sel, liveNode, onlineMap,
  linkedAsset, linkSearch, onLinkSearchChange, linkSearchResults,
  addChildName, onAddChildNameChange,
  payloadForm, onPayloadFormChange, payloadSaving,
  onDelete, onLink, onSubmitRightAdd, onSavePayload,
  onSelectChild, onExpandNode, onDeleteChild,
}: NodeDetailPanelProps) {
  const childLevel = sel ? CHILD_OF[sel.level] : undefined;

  if (!sel || !liveNode) {
    return (
      <div className="flex-1 min-w-0 card overflow-y-auto">
        <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-3">
          <Boxes size={48} className="text-[#2e333d]" />
          <p className="text-[#555d6e] font-mono-val text-sm">Sol menüden bir öğe seçin</p>
          <p className="text-[#383e4a] font-mono-val text-[10px]">
            Ctrl+Tık ile çoklu seçim • Sürükle-Bırak ile taşıma
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 card overflow-y-auto">
      <div className="p-5 space-y-6">

        {/* ── Node header ──────────────────────────────── */}
        <div className="flex items-start gap-4 pb-5 border-b border-[#2e333d]">
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
            <p className="text-[10px] text-[#555d6e] font-mono-val break-all leading-relaxed">{liveNode.path}</p>
            <p className="text-[10px] text-[#4A6080] font-mono-val mt-1">
              {liveNode.children?.length ?? 0} alt öğe
            </p>
          </div>

          {/* Delete */}
          <button
            onClick={() => onDelete(liveNode.id, sel.level, liveNode.name)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono-val bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all flex-shrink-0"
          >
            <Trash2 size={11} /> Sil
          </button>
        </div>

        {/* ── Metadata (holding / kanal / bina / oda) ── */}
        {PAYLOAD_FIELDS[sel.level] && (
          <div>
            <p className="text-[10px] text-[#8b919e] uppercase tracking-widest font-mono-val mb-3">
              {sel.level === 'holding'
                ? 'Holding Bilgileri'
                : sel.level === 'kanal'
                  ? 'Kanal Bilgileri'
                  : sel.level === 'bina'
                    ? 'Bina Bilgileri'
                    : 'Oda Bilgileri'}
            </p>
            <div className="space-y-2">
              {PAYLOAD_FIELDS[sel.level]!.map(field => (
                <div key={field.key}>
                  <label className="text-[10px] text-[#8b919e] uppercase tracking-wider font-mono-val block mb-1">
                    {field.label}
                  </label>
                  {field.type === 'boolean' ? (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!payloadForm[field.key]}
                        onChange={e => onPayloadFormChange({ ...payloadForm, [field.key]: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-xs text-[#e4e7ec] font-mono-val">
                        {payloadForm[field.key] ? 'Evet' : 'Hayır'}
                      </span>
                    </label>
                  ) : (
                    <input
                      type={field.type}
                      value={(payloadForm[field.key] ?? '') as string | number}
                      onChange={e => onPayloadFormChange({
                        ...payloadForm,
                        [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value,
                      })}
                      className="w-full px-3 py-2 text-sm bg-[#1a1d23] border border-[#2e333d] focus:border-[#555d6e] rounded-lg text-[#e4e7ec] font-mono-val focus:outline-none transition-colors placeholder:text-[#555d6e]"
                    />
                  )}
                </div>
              ))}
              <button
                onClick={onSavePayload}
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
            <p className="text-[10px] text-[#8b919e] uppercase tracking-widest font-mono-val mb-3">
              SQL Varlık Bağlantısı
            </p>
            {linkedAsset ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                <Link2 size={14} className="text-green-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#e4e7ec] font-medium truncate">{linkedAsset.assetName}</p>
                  <p className="text-[10px] text-[#555d6e] font-mono-val">
                    {linkedAsset.assetCode} · ID: {linkedAsset.assetId}
                  </p>
                </div>
                <button
                  onClick={() => onLink(liveNode.id, null)}
                  title="Bağlantıyı kaldır"
                  className="p-1.5 rounded hover:bg-red-500/10 text-[#555d6e] hover:text-red-400 transition-all"
                >
                  <Unlink size={12} />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#555d6e]" />
                  <input
                    value={linkSearch}
                    onChange={e => onLinkSearchChange(e.target.value)}
                    placeholder="Varlık adı veya kodu..."
                    className="w-full pl-8 pr-3 py-2 text-sm bg-[#1a1d23] border border-[#2e333d] focus:border-[#555d6e] rounded-lg text-[#e4e7ec] placeholder:text-[#555d6e] font-mono-val focus:outline-none transition-colors"
                  />
                </div>
                {linkSearchResults.length > 0 && (
                  <div className="rounded-lg border border-[#2e333d] overflow-hidden">
                    {linkSearchResults.map(a => (
                      <button
                        key={a.assetId}
                        onClick={() => onLink(liveNode.id, a.assetId)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[#0F1A2E] border-b border-[#2e333d] last:border-0 transition-colors"
                      >
                        <span className={cn(
                          'w-1.5 h-1.5 rounded-full flex-shrink-0',
                          onlineMap.get(a.assetId) ? 'bg-green-400' : 'bg-red-400',
                        )} />
                        <span className="flex-1 min-w-0">
                          <span className="text-xs text-[#e4e7ec] block truncate">{a.assetName}</span>
                          <span className="text-[10px] text-[#555d6e] font-mono-val">{a.assetCode}</span>
                        </span>
                        <Link2 size={10} className="text-[#555d6e] flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
                {!linkSearch && (
                  <p className="text-[10px] text-[#383e4a] font-mono-val">
                    SQL Assets tablosundaki varlıkları arayın ve bağlayın
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Alt öğe ekle ─────────────────────────────── */}
        {childLevel && (
          <div>
            <p className="text-[10px] text-[#8b919e] uppercase tracking-widest font-mono-val mb-2">
              Yeni {LEVEL_CFG[childLevel].label}
            </p>
            <div className="flex gap-2">
              <input
                value={addChildName}
                onChange={e => onAddChildNameChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') onSubmitRightAdd();
                  if (e.key === 'Escape') onAddChildNameChange('');
                }}
                placeholder={`${LEVEL_CFG[childLevel].label} adı girin...`}
                className="flex-1 text-sm bg-[#1a1d23] border border-[#2e333d] focus:border-[#555d6e] rounded-lg px-3 py-2 text-[#e4e7ec] placeholder:text-[#555d6e] font-mono-val focus:outline-none transition-colors"
              />
              <button
                onClick={onSubmitRightAdd}
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

        {/* ── Children grid ─────────────────────────────── */}
        {(liveNode.children?.length ?? 0) > 0 && (
          <div>
            <p className="text-[10px] text-[#8b919e] uppercase tracking-widest font-mono-val mb-3">
              {childLevel ? LEVEL_CFG[childLevel].label : 'Alt Öğe'}ler{' '}
              <span className="text-[#555d6e] normal-case">({liveNode.children.length})</span>
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
                    className="flex items-center gap-3 p-3 rounded-lg bg-[#1a1d23] border border-[#2e333d] cursor-pointer hover:border-[#383e4a] hover:bg-[#22262e] transition-all group"
                    onClick={() => {
                      onSelectChild(child, cLvl);
                      onExpandNode(liveNode.id);
                    }}
                  >
                    {/* Icon */}
                    <div className={cn('w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 relative', bg, border)}>
                      <Icon size={14} className={color} />
                      {childOnline !== undefined && (
                        <span className={cn(
                          'absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#1a1d23]',
                          childOnline ? 'bg-green-400' : 'bg-red-400',
                        )} />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[#e4e7ec] font-medium truncate">{child.name}</p>
                      <p className="text-[10px] text-[#555d6e] font-mono-val">{label}</p>
                      {(child.children?.length ?? 0) > 0 && (
                        <p className="text-[10px] text-[#4A6080] font-mono-val">{child.children.length} alt öğe</p>
                      )}
                    </div>

                    {/* Delete */}
                    <button
                      onClick={e => { e.stopPropagation(); onDeleteChild(child.id, cLvl, child.name); }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-500/20 text-[#555d6e] hover:text-red-400 transition-all"
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
    </div>
  );
}
