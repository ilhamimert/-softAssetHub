import { Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Toast {
  id: number;
  msg: string;
  ok: boolean;
}

interface ToastStackProps {
  toasts: Toast[];
}

export function ToastStack({ toasts }: ToastStackProps) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono-val border shadow-lg',
            t.ok
              ? 'bg-[#0D2018] text-green-400 border-green-500/30'
              : 'bg-[#1F0D0D] text-red-400 border-red-500/30',
          )}
        >
          {t.ok ? <Check size={11} /> : <AlertCircle size={11} />}
          {t.msg}
        </div>
      ))}
    </div>
  );
}
