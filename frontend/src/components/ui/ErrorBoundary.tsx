import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; message: string; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(err: unknown): State {
    return {
      hasError: true,
      message: err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.',
    };
  }

  componentDidCatch(err: unknown, info: unknown) {
    console.error('[ErrorBoundary]', err, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
        <AlertTriangle size={40} className="text-red-400 mb-4" />
        <p className="text-sm font-display font-semibold text-[#e4e7ec] mb-1">Sayfa Yüklenemedi</p>
        <p className="text-xs text-[#8b919e] font-mono-val mb-5 max-w-md">{this.state.message}</p>
        <button
          onClick={() => this.setState({ hasError: false, message: '' })}
          className="px-4 py-2 text-xs rounded bg-amber-500/10 border border-amber-500/25 text-amber-400 hover:bg-[#5b8fd5]/20 transition-colors"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }
}
