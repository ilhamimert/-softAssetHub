import { useRef } from 'react';
import {
  RefreshCw, Search, X, Plus, Link2, Check, Activity, AlertCircle, Boxes,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CHILD_OF, LEVEL_CFG } from './constants';
import { type PhysNode, type PhysLevel, type DragState } from './types';
import { TreeNode } from './TreeNode';

interface PhysTreePanelProps {
  filteredHoldings: PhysNode[];
  isLoading: boolean;
  isError: boolean;
  searchTerm: string;
  onSearchChange: (v: string) => void;
  expanded: Set<string>;
  selectedId: string | null;
  multiSel: Set<string>;
  onlineMap: Map<number, boolean>;
  dragState: DragState | null;
  dropTargetId: string | null;
  treeAddTo: { parentId: string; level: PhysLevel } | null;
  treeAddName: string;
  onTreeAddNameChange: (v: string) => void;
  showRootForm: boolean;
  addRootName: string;
  onAddRootNameChange: (v: string) => void;
  onRefetch: () => void;
  onLoadDemo: () => void;
  onAutoLink: () => void;
  onToggleRootForm: () => void;
  onAddRoot: (name: string) => void;
  onToggle: (id: string) => void;
  onSelect: (node: PhysNode, level: PhysLevel) => void;
  onDelete: (id: string, level: PhysLevel, name: string) => void;
  onAddChild: (parentId: string, level: PhysLevel) => void;
  onMultiToggle: (id: string, level: PhysLevel) => void;
  onDragStart: (e: React.DragEvent, node: PhysNode, level: PhysLevel) => void;
  onDragEnter: (e: React.DragEvent, node: PhysNode, level: PhysLevel) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, node: PhysNode, level: PhysLevel) => void;
  onRename: (id: string, level: PhysLevel, newName: string) => Promise<void>;
  onSubmitTreeAdd: () => void;
  onCancelTreeAdd: () => void;
}

export function PhysTreePanel({
  filteredHoldings, isLoading, isError, searchTerm, onSearchChange,
  expanded, selectedId, multiSel, onlineMap, dragState, dropTargetId,
  treeAddTo, treeAddName, onTreeAddNameChange,
  showRootForm, addRootName, onAddRootNameChange,
  onRefetch, onLoadDemo, onAutoLink, onToggleRootForm, onAddRoot,
  onToggle, onSelect, onDelete, onAddChild, onMultiToggle,
  onDragStart, onDragEnter, onDragLeave, onDrop, onRename,
  onSubmitTreeAdd, onCancelTreeAdd,
}: PhysTreePanelProps) {
  const treeInputRef = useRef<HTMLInputElement>(null);

  const handleAddChild = (parentId: string, level: PhysLevel) => {
    onAddChild(parentId, level);
    setTimeout(() => treeInputRef.current?.focus(), 50);
  };

  return (
    <div className="w-72 flex-shrink-0 card overflow-hidden flex flex-col">

      {/* Header */}
      <div className="px-3 pt-3 pb-2 border-b border-[#2e333d] flex-shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[#8b919e] uppercase tracking-widest font-mono-val">
            Fiziksel Hiyerarşi
          </span>
          <button
            onClick={onRefetch}
            title="Yenile"
            className="p-1 rounded text-[#555d6e] hover:text-[#8b919e] hover:bg-[#2e333d] transition-all"
          >
            <RefreshCw size={10} />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#555d6e]" />
          <input
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Ara..."
            className="w-full pl-6 pr-2 py-1.5 text-[10px] bg-[#111318] border border-[#2e333d] rounded-md text-[#e4e7ec] placeholder:text-[#555d6e] font-mono-val focus:outline-none focus:border-[#383e4a]"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#555d6e] hover:text-[#8b919e]"
            >
              <X size={9} />
            </button>
          )}
        </div>

        <p className="text-[9px] text-[#383e4a] font-mono-val">
          Holding → Kanal → Bina → Oda → Bilgisayar → Eklenti
        </p>

        {/* Actions */}
        <div className="flex gap-1">
          <button
            onClick={onLoadDemo}
            className="flex-1 text-[9px] font-mono-val py-1.5 rounded bg-[#22262e] text-[#8b919e] hover:text-[#5b8fd5] hover:bg-[#5b8fd5]/10 border border-[#2e333d] hover:border-[#5b8fd5]/20 transition-all"
          >
            Gerçek Veri Yükle
          </button>
          <button
            onClick={onAutoLink}
            title="Bilgisayarları SQL Assets ile isim benzerliğine göre otomatik eşleştir"
            className="flex-1 text-[9px] font-mono-val py-1.5 rounded bg-[#22262e] text-[#8b919e] hover:text-green-400 hover:bg-green-500/10 border border-[#2e333d] hover:border-green-500/20 transition-all flex items-center justify-center gap-1"
          >
            <Link2 size={8} /> Otomatik Eşleştir
          </button>
          <button
            onClick={() => {
              onToggleRootForm();
              setTimeout(() => document.getElementById('rootInput')?.focus(), 50);
            }}
            className="px-2.5 py-1.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-[#5b8fd5]/20 transition-all text-[9px] font-mono-val flex items-center gap-1"
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
              onChange={e => onAddRootNameChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') onAddRoot(addRootName);
                if (e.key === 'Escape') { onToggleRootForm(); onAddRootNameChange(''); }
              }}
              placeholder="Holding adı..."
              className="flex-1 text-[10px] bg-[#111318] border border-amber-500/30 rounded px-2 py-1 text-[#e4e7ec] placeholder:text-[#555d6e] font-mono-val focus:outline-none"
            />
            <button
              onClick={() => onAddRoot(addRootName)}
              className="p-1.5 rounded bg-amber-500/15 text-amber-400 hover:bg-[#5b8fd5]/25"
            >
              <Check size={10} />
            </button>
            <button
              onClick={() => { onToggleRootForm(); onAddRootNameChange(''); }}
              className="p-1.5 rounded text-[#555d6e] hover:text-[#8b919e]"
            >
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
            <p className="text-[10px] text-[#555d6e] font-mono-val leading-relaxed">
              Fiziksel ağaç verisi yüklenemedi<br />
              <span className="text-[#383e4a]">Backend bağlantısını kontrol edin</span>
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Activity size={14} className="animate-pulse text-[#555d6e]" />
          </div>
        ) : filteredHoldings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
            <Boxes size={26} className="text-[#2e333d]" />
            <p className="text-[10px] text-[#555d6e] font-mono-val leading-relaxed">
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
              selectedId={selectedId}
              searchTerm={searchTerm}
              onToggle={onToggle}
              onSelect={onSelect}
              onDelete={onDelete}
              onAddChild={handleAddChild}
              multiSel={multiSel}
              onMultiToggle={onMultiToggle}
              onlineMap={onlineMap}
              dragLevel={dragState?.level ?? null}
              dropTargetId={dropTargetId}
              onDragStart={onDragStart}
              onDragEnter={onDragEnter}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onRename={onRename}
            />
          ))
        )}

        {/* Inline add form */}
        {treeAddTo && (
          <div className="mx-1 mt-2 p-2 rounded-lg border border-blue-500/20 bg-[#0D1A2D]">
            <p className="text-[9px] text-blue-400/70 font-mono-val mb-1.5">
              + {LEVEL_CFG[CHILD_OF[treeAddTo.level]!]?.label} Ekle
            </p>
            <div className="flex gap-1">
              <input
                ref={treeInputRef}
                value={treeAddName}
                onChange={e => onTreeAddNameChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') onSubmitTreeAdd();
                  if (e.key === 'Escape') onCancelTreeAdd();
                }}
                placeholder="Ad..."
                className="flex-1 text-[10px] bg-[#111318] border border-blue-500/30 rounded px-2 py-1 text-[#e4e7ec] placeholder:text-[#555d6e] font-mono-val focus:outline-none"
              />
              <button
                onClick={onSubmitTreeAdd}
                className="p-1.5 rounded bg-blue-500/15 text-blue-400 hover:bg-blue-500/25"
              >
                <Check size={10} />
              </button>
              <button
                onClick={onCancelTreeAdd}
                className="p-1.5 rounded text-[#555d6e] hover:text-[#8b919e]"
              >
                <X size={10} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
