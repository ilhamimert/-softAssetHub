import { useRef, useState, useEffect } from 'react';
import { Bell, Search, Menu, Server, LogOut, ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { alertApi, assetApi } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onToggleSidebar: () => void;
  title?: string;
}

export function Header({ onToggleSidebar, title }: HeaderProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'tr' ? 'en' : 'tr');
  };

  const [now, setNow] = useState(new Date().toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }));

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date().toLocaleString(i18n.language === 'tr' ? 'tr-TR' : 'en-US', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }));
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const { data: alertData } = useQuery({
    queryKey: ['alerts-dashboard'],
    queryFn: () => alertApi.getDashboard(),
    refetchInterval: 30000,
  });

  const { data: searchRes } = useQuery({
    queryKey: ['asset-search', debounced],
    queryFn: () => assetApi.getAll({ search: debounced, limit: 8 }),
    enabled: debounced.length >= 2,
    staleTime: 10000,
  });
  const searchResults: any[] = searchRes?.data?.data ?? [];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebounced(val), 300);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
    setDebounced('');
  };

  const handleSelect = (id: number) => {
    navigate(`/assets/${id}`);
    closeSearch();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const stats = alertData?.data?.stats;
  const unresolvedCount = stats?.totalUnresolved ?? 0;
  const criticalCount = stats?.criticalCount ?? 0;

  return (
    <header className="h-12 flex items-center gap-3 px-4 bg-[#070B14] border-b border-[#1E2D45] flex-shrink-0 relative">
      {/* Toggle */}
      <button
        onClick={onToggleSidebar}
        className="text-[#6B84A3] hover:text-[#E2EAF4] transition-colors p-1 rounded hover:bg-[#131C2E]"
      >
        <Menu size={16} />
      </button>

      {/* Title */}
      {title && (
        <h1 className="font-display font-semibold text-base text-white tracking-wide hidden sm:block">
          {title}
        </h1>
      )}

      <div className="flex-1" />

      {/* Time */}
      <span className="hidden lg:flex items-center gap-1.5 text-[10px] font-mono-val text-[#3D5275]">
        <span className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
        {now}
      </span>

      {/* Language Toggle */}
      <button
        onClick={toggleLanguage}
        className="px-2 py-1 rounded border border-[#1E2D45] bg-[#0D1421] text-[10px] font-mono-val text-amber-500 hover:text-amber-400 hover:border-amber-500/30 transition-all font-bold"
        title={i18n.language === 'tr' ? 'Switch to English' : 'Türkçeye Geç'}
      >
        {i18n.language === 'tr' ? 'TR' : 'EN'}
      </button>

      {/* Search toggle */}
      <button
        onClick={() => setSearchOpen(!searchOpen)}
        className="p-1.5 rounded text-[#6B84A3] hover:text-[#E2EAF4] hover:bg-[#131C2E] transition-colors"
      >
        <Search size={14} />
      </button>

      {/* Alerts bell */}
      <button className="relative p-1.5 rounded hover:bg-[#131C2E] transition-colors">
        <Bell
          size={14}
          className={cn(
            criticalCount > 0 ? 'text-red-400' : unresolvedCount > 0 ? 'text-amber-400' : 'text-[#6B84A3]'
          )}
        />
        {unresolvedCount > 0 && (
          <span className={cn(
            'absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-0.5 rounded-full text-[9px] font-bold flex items-center justify-center font-mono-val',
            criticalCount > 0 ? 'bg-red-500 text-white' : 'bg-amber-500 text-black'
          )}>
            {unresolvedCount > 99 ? '99+' : unresolvedCount}
          </span>
        )}
      </button>

      {/* Divider */}
      <div className="w-px h-6 bg-[#1E2D45] mx-1" />

      {/* User Profile Dropdown */}
      <div className="relative">
        <button
          onClick={() => setProfileOpen(!profileOpen)}
          className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-[#131C2E] transition-all group"
        >
          <div className="text-right hidden sm:block">
            <p className="text-[11px] font-bold text-[#E2EAF4] leading-tight uppercase">{user?.fullName}</p>
            <p className="text-[9px] text-amber-500 font-mono-val leading-tight">{user?.role === 'Admin' ? t('common.system_admin') : user?.role}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-amber-500/10 group-hover:scale-105 transition-transform">
            {user?.fullName?.charAt(0) || 'U'}
          </div>
          <ChevronDown size={12} className={cn("text-[#3D5275] transition-transform", profileOpen && "rotate-180")} />
        </button>

        {profileOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
            <div className="absolute right-0 mt-2 w-48 bg-[#0D1421] border border-[#1E2D45] rounded-xl shadow-2xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-200">
               <div className="px-3 py-2 border-b border-[#1E2D45] mb-1">
                  <p className="text-[10px] text-[#3D5275] font-mono-val uppercase tracking-widest mb-0.5">{t('header.logged_in_as')}</p>
                  <p className="text-xs text-[#E2EAF4] truncate font-medium">{user?.email}</p>
               </div>
               <button
                 onClick={() => { setProfileOpen(false); navigate('/settings'); }}
                 className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#6B84A3] hover:text-[#E2EAF4] hover:bg-[#131C2E] transition-colors"
               >
                 {t('header.profile_settings')}
               </button>
               <button
                 onClick={handleLogout}
                 className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-400/10 transition-colors"
               >
                 <LogOut size={12} />
                 {t('common.logout')}
               </button>
            </div>
          </>
        )}
      </div>

      {/* Search overlay (Omitted similar logic to original but ensuring it works with new layout) */}
      {searchOpen && (
        <div className="absolute inset-x-0 top-0 z-50">
          <div className="h-12 flex items-center px-4 gap-3 bg-[#0D1421] border-b border-[#1E2D45]">
            <Search size={14} className="text-[#6B84A3]" />
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder={t('header.search_placeholder')}
              className="flex-1 bg-transparent text-sm text-[#E2EAF4] placeholder-[#3D5275] outline-none font-mono-val"
              onBlur={() => setTimeout(closeSearch, 150)}
              onKeyDown={(e) => e.key === 'Escape' && closeSearch()}
            />
            <kbd className="text-[10px] text-[#3D5275] border border-[#1E2D45] px-1.5 py-0.5 rounded">ESC</kbd>
          </div>
          {debounced.length >= 2 && (
            <div className="bg-[#0D1421] border-b border-x border-[#1E2D45] shadow-2xl rounded-b overflow-hidden">
              {searchResults.length > 0 ? searchResults.map((a: any) => (
                <button
                  key={a.assetId}
                  onMouseDown={() => handleSelect(a.assetId)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#131C2E] transition-colors text-left"
                >
                  <Server size={12} className="text-[#6B84A3] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#E2EAF4] truncate">{a.assetName}</p>
                    <p className="text-[10px] text-[#3D5275] font-mono-val">{a.assetCode} · {a.channelName}</p>
                  </div>
                </button>
              )) : (
                <p className="px-4 py-3 text-xs text-[#3D5275] font-mono-val text-center">{t('header.no_results')}</p>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
