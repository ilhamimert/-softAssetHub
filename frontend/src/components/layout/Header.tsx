import { useRef, useState } from 'react';
import { Bell, Search, Menu, RefreshCw, Server } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { alertApi, assetApi } from '@/api/client';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onToggleSidebar: () => void;
  title?: string;
}

export function Header({ onToggleSidebar, title }: HeaderProps) {
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const stats = alertData?.data?.stats;
  const unresolvedCount = stats?.totalUnresolved ?? 0;
  const criticalCount = stats?.criticalCount ?? 0;

  const now = new Date().toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <header className="h-12 flex items-center gap-3 px-4 bg-[#070B14] border-b border-[#1E2D45] flex-shrink-0">
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
      <span className="hidden md:flex items-center gap-1.5 text-[10px] font-mono-val text-[#3D5275]">
        <span className="w-1 h-1 rounded-full bg-green-400 pulse-dot" />
        {now}
      </span>

      {/* Search toggle */}
      <button
        onClick={() => setSearchOpen(!searchOpen)}
        className="p-1.5 rounded text-[#6B84A3] hover:text-[#E2EAF4] hover:bg-[#131C2E] transition-colors"
      >
        <Search size={14} />
      </button>

      {/* Refresh */}
      <button
        className="p-1.5 rounded text-[#6B84A3] hover:text-cyan-400 hover:bg-[#131C2E] transition-colors"
        title="Yenile"
        onClick={() => window.location.reload()}
      >
        <RefreshCw size={14} />
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

      {/* Search overlay */}
      {searchOpen && (
        <div className="absolute inset-x-0 top-0 z-50">
          {/* Bar */}
          <div className="h-12 flex items-center px-4 gap-3 bg-[#0D1421] border-b border-[#1E2D45]">
            <Search size={14} className="text-[#6B84A3]" />
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Varlık, seri no veya kanal ara..."
              className="flex-1 bg-transparent text-sm text-[#E2EAF4] placeholder-[#3D5275] outline-none font-mono-val"
              onBlur={() => setTimeout(closeSearch, 150)}
              onKeyDown={(e) => e.key === 'Escape' && closeSearch()}
            />
            <kbd className="text-[10px] text-[#3D5275] border border-[#1E2D45] px-1.5 py-0.5 rounded">ESC</kbd>
          </div>
          {/* Dropdown */}
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
                  <span className="text-[9px] text-[#3D5275] font-mono-val flex-shrink-0">{a.assetType}</span>
                </button>
              )) : (
                <p className="px-4 py-3 text-xs text-[#3D5275] font-mono-val text-center">Sonuç bulunamadı</p>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
