import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const WIDTHS = {
  sm: 'max-w-sm',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-5xl',
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: keyof typeof WIDTHS;
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={cn(
        'relative bg-[#1a1d23] border border-[#2e333d] rounded-lg shadow-2xl w-full max-h-[90vh] overflow-y-auto fade-in-up',
        WIDTHS[size],
      )}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2e333d] sticky top-0 bg-[#1a1d23] z-10">
          <h2 className="font-display font-bold text-base text-white tracking-wide">{title}</h2>
          <button onClick={onClose} className="p-1 rounded text-[#8b919e] hover:text-white hover:bg-[#2e333d] transition-colors">
            <X size={15} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
