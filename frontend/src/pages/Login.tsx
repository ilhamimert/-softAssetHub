import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react';

export function Login() {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { login, isLoading } = useAuthStore();
  const location = useLocation();
  const queryClient = useQueryClient();

  const from = location.state?.from?.pathname || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(username, password);
      queryClient.clear();
      window.location.replace(from || '/');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error?.response?.data?.message || t('login.error'));
    }
  };

  return (
    <div className="min-h-screen bg-[#111318] flex items-center justify-center p-4 relative overflow-hidden">

      <div className="w-full max-w-md animate-fade-in relative z-10">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-5">
            <img src="/logo.svg" alt="isoft" className="h-14 w-auto rounded-xl" />
          </div>
          <p className="text-[#8b919e] text-sm font-medium">{t('login.subtitle')}</p>
        </div>

        <div className="bg-[#1a1d23] border border-[#2e333d] p-8 rounded-2xl shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[11px] font-mono-val text-[#8b919e] uppercase tracking-widest mb-2 px-1">
                {t('login.username')}
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#555d6e] group-focus-within:text-[#5b8fd5] transition-colors">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full bg-[#22262e] border border-[#2e333d] rounded-lg py-3 pl-10 pr-3 text-[#e4e7ec] placeholder-[#555d6e] focus:outline-none focus:ring-2 focus:ring-[#5b8fd5]/40 focus:border-[#5b8fd5]/40 transition-all sm:text-sm"
                  placeholder={t('login.username').toLowerCase() + '...'}
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono-val text-[#8b919e] uppercase tracking-widest mb-2 px-1">
                {t('login.password')}
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#555d6e] group-focus-within:text-[#5b8fd5] transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full bg-[#22262e] border border-[#2e333d] rounded-lg py-3 pl-10 pr-12 text-[#e4e7ec] placeholder-[#555d6e] focus:outline-none focus:ring-2 focus:ring-[#5b8fd5]/40 focus:border-[#5b8fd5]/40 transition-all sm:text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#555d6e] hover:text-[#e4e7ec] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-[#d9534f]/10 border border-[#d9534f]/20 rounded-lg p-3 flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#d9534f]" />
                <p className="text-xs text-[#d9534f] font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#5b8fd5] hover:bg-[#4a7ec4] text-white font-semibold py-3.5 rounded-lg focus:ring-2 focus:ring-[#5b8fd5]/50 ring-offset-2 ring-offset-[#111318] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                t('login.button')
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#2e333d] flex items-center justify-between">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#4caf82]" />
                <span className="text-[10px] text-[#8b919e] font-mono-val uppercase tracking-tighter">{t('login.server_active')}</span>
             </div>
             <span className="text-[10px] text-[#555d6e] font-mono-val">v1.2.4-kararlı</span>
          </div>
        </div>
      </div>
    </div>
  );
}
