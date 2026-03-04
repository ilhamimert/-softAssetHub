import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Tv2, Lock, User, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

export function Login() {
  const navigate   = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(username, password);
      navigate('/');
    } catch (err: any) {
      setError(
        err?.response?.data?.message ?? 'Giriş başarısız. Bilgilerinizi kontrol edin.'
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] flex items-center justify-center p-4 relative overflow-hidden">

      {/* Background grid */}
      <div className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(rgba(34,211,238,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      {/* Glow blob */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />

      {/* Card */}
      <div className="relative w-full max-w-sm">
        {/* Corner decorations */}
        <div className="absolute -top-px -left-px w-6 h-6 border-t-2 border-l-2 border-amber-500/60 rounded-tl-sm" />
        <div className="absolute -top-px -right-px w-6 h-6 border-t-2 border-r-2 border-amber-500/60 rounded-tr-sm" />
        <div className="absolute -bottom-px -left-px w-6 h-6 border-b-2 border-l-2 border-amber-500/60 rounded-bl-sm" />
        <div className="absolute -bottom-px -right-px w-6 h-6 border-b-2 border-r-2 border-amber-500/60 rounded-br-sm" />

        <div className="bg-[#0D1421] border border-[#1E2D45] rounded-lg p-8 fade-in-up">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center mx-auto mb-4 glow-amber">
              <Tv2 size={26} className="text-amber-400" />
            </div>
            <h1 className="font-display font-bold text-2xl text-white tracking-widest uppercase mb-1">
              BROADCAST
            </h1>
            <p className="text-xs text-[#6B84A3] tracking-widest uppercase font-mono-val">
              Asset Management System
            </p>
            <div className="flex items-center gap-2 justify-center mt-3">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 pulse-dot" />
              <span className="text-[10px] text-green-400 font-mono-val tracking-wider">SYSTEM ONLINE</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] text-[#6B84A3] uppercase tracking-widest mb-1.5 font-mono-val">
                Kullanıcı Adı / E-posta
              </label>
              <div className="relative">
                <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3D5275]" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                  autoComplete="username"
                  className={cn(
                    'w-full bg-[#131C2E] border border-[#1E2D45] rounded text-sm text-[#E2EAF4]',
                    'pl-9 pr-3 py-2.5 outline-none transition-all',
                    'focus:border-amber-500/60 focus:bg-[#0D1421] placeholder-[#3D5275]'
                  )}
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-[#6B84A3] uppercase tracking-widest mb-1.5 font-mono-val">
                Şifre
              </label>
              <div className="relative">
                <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3D5275]" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className={cn(
                    'w-full bg-[#131C2E] border border-[#1E2D45] rounded text-sm text-[#E2EAF4]',
                    'pl-9 pr-10 py-2.5 outline-none transition-all',
                    'focus:border-amber-500/60 focus:bg-[#0D1421] placeholder-[#3D5275]'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3D5275] hover:text-[#6B84A3] transition-colors"
                >
                  {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-2.5 rounded bg-red-500/10 border border-red-500/20">
                <AlertCircle size={13} className="text-red-400 flex-shrink-0" />
                <span className="text-xs text-red-400">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                'w-full py-2.5 rounded font-display font-semibold text-sm tracking-widest uppercase transition-all',
                'bg-amber-500/15 border border-amber-500/40 text-amber-400',
                'hover:bg-amber-500/25 hover:border-amber-500/60 hover:glow-amber',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'mt-2'
              )}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                  Giriş yapılıyor...
                </span>
              ) : (
                'Giriş Yap'
              )}
            </button>
          </form>

          {/* Footer hint */}
          <div className="mt-6 pt-4 border-t border-[#1E2D45] text-center">
            <p className="text-[10px] text-[#3D5275] font-mono-val">
              v1.0.0 · Broadcast Asset Management System
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
