import { useState, useRef } from 'react';
import {
  ChevronRight, ChevronDown, GripVertical, Plus, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PHYS_LEVELS, CHILD_OF, type PhysLevel, type PhysNode } from './types';
import { LEVEL_CFG } from './constants';
import { Highlight } from './Highlight';

interface TreeNodeProps {
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
}

export function TreeNode({
  node, depth, expanded, selectedId, searchTerm,
  onToggle, onSelect, onDelete, onAddChild,
  multiSel, onMultiToggle,
  onlineMap, dragLevel, dropTargetId,
  onDragStart, onDragEnter, onDragLeave, onDrop, onRename,
}: TreeNodeProps) {
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
  const canDrag = level === 'bilgisayar' || level === 'eklenti';
  const isDropTarget = dropTargetId === node.id;

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
            ? 'bg-[#162032] text-[#e4e7ec] border border-[#383e4a]'
            : isMulti
              ? 'bg-blue-500/10 text-[#e4e7ec] border border-blue-500/20'
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
          <span className="opacity-0 group-hover:opacity-50 text-[#555d6e] cursor-grab active:cursor-grabbing flex-shrink-0">
            <GripVertical size={9} />
          </span>
        )}

        {/* Expand arrow */}
        <span className="w-4 flex items-center justify-center flex-shrink-0">
          {hasKids ? (
            <button
              onClick={e => { e.stopPropagation(); onToggle(node.id); }}
              className="text-[#4A6080] hover:text-[#A0B4CC] transition-colors"
            >
              {isOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            </button>
          ) : null}
        </span>

        {/* Icon */}
        <span className={cn('flex-shrink-0 transition-colors', isSel ? color : 'text-[#555d6e]')}>
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
            className="flex-1 min-w-0 text-[11px] bg-[#111318] border border-amber-500/50 rounded px-1 py-0 text-[#e4e7ec] font-mono-val focus:outline-none"
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
          <span className="text-[9px] font-mono-val px-1 rounded bg-[#2e333d] text-[#4A6080] opacity-0 group-hover:opacity-100 transition-opacity mr-0.5">
            {node.children.length}
          </span>
        )}

        {/* Add child btn */}
        {canAdd && (
          <button
            onClick={e => { e.stopPropagation(); onAddChild(node.id, level); }}
            title={`${LEVEL_CFG[CHILD_OF[level]!].label} ekle`}
            className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:bg-blue-500/20 text-[#555d6e] hover:text-blue-400 transition-all"
          >
            <Plus size={9} />
          </button>
        )}

        {/* Delete btn */}
        <button
          onClick={e => { e.stopPropagation(); onDelete(node.id, level, node.name); }}
          title={`${label} sil`}
          className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:bg-red-500/20 text-[#555d6e] hover:text-red-400 transition-all"
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
