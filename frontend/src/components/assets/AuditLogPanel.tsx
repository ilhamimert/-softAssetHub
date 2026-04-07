import { History, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuditEntry {
  timestamp: string;
  action: string;
  nodeType: string;
  nodeName: string;
}

interface AuditLogPanelProps {
  showAudit: boolean;
  onToggle: () => void;
  auditData: AuditEntry[] | undefined;
}

const ACTION_STYLES: Record<string, string> = {
  create: 'bg-green-500/10 text-green-400',
  delete: 'bg-red-500/10 text-red-400',
  move:   'bg-blue-500/10 text-blue-400',
  link:   'bg-purple-500/10 text-purple-400',
  unlink: 'bg-orange-500/10 text-orange-400',
  demo:   'bg-amber-500/10 text-amber-400',
  rename: 'bg-yellow-500/10 text-yellow-400',
};

export function AuditLogPanel({ showAudit, onToggle, auditData }: AuditLogPanelProps) {
  return (
    <div className="card flex-shrink-0">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 w-full text-left"
      >
        <History size={11} className="text-[#8b919e]" />
        <span className="text-[10px] text-[#8b919e] uppercase tracking-widest font-mono-val flex-1">
          Değişiklik Geçmişi
        </span>
        <ChevronRight size={10} className={cn('text-[#555d6e] transition-transform', showAudit && 'rotate-90')} />
      </button>

      {showAudit && (
        <div className="mt-3 max-h-48 overflow-y-auto space-y-1">
          {!auditData || auditData.length === 0 ? (
            <p className="text-[10px] text-[#555d6e] font-mono-val py-4 text-center">
              Henüz değişiklik yok
            </p>
          ) : auditData.map((e, i) => (
            <div key={i} className="flex items-center gap-3 py-1.5 border-b border-[#2e333d] last:border-0">
              <span className="text-[9px] text-[#555d6e] font-mono-val flex-shrink-0 w-36">
                {new Date(e.timestamp).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'medium' })}
              </span>
              <span className={cn(
                'text-[9px] px-1.5 py-0.5 rounded font-mono-val flex-shrink-0',
                ACTION_STYLES[e.action] ?? 'bg-[#2e333d] text-[#8b919e]',
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
  );
}
