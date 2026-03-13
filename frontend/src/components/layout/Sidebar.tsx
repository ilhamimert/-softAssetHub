import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Server, List, Bell, BarChart3,
  Wrench, Settings, LogOut, ChevronRight, Wifi, Layers, Building2, KeyRound,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

// Hiyerarşi seviyelerine göre renk/ikon
export const groupTypeConfig: Record<string, { color: string; bg: string; border: string }> = {
  Playout:      { color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20'   },
  Encoding:     { color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20'  },
  Transmission: { color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20'  },
  Archive:      { color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  Storage:      { color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/20'   },
  General:      { color: 'text-gray-400',   bg: 'bg-gray-500/10',   border: 'border-gray-500/20'   },
};

interface SidebarProps {
  collapsed: boolean;
}

export function Sidebar({ collapsed }: SidebarProps) {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();

  const navItems = [
    { to: '/',           icon: LayoutDashboard, label: t('common.dashboard'), exact: true },
    { to: '/assets',     icon: Layers,          label: t('common.assets')  },
    { to: '/asset-list', icon: List,            label: t('common.assetList') },
    { to: '/licenses',   icon: KeyRound,        label: t('common.licenses')      },
    { to: '/monitoring', icon: Wifi,            label: t('common.monitoring')     },
    { to: '/alerts',     icon: Bell,            label: t('common.alerts')       },
    { to: '/maintenance',icon: Wrench,          label: t('common.maintenance')           },
    { to: '/analytics',  icon: BarChart3,       label: t('common.analytics')       },
    { to: '/settings',   icon: Settings,        label: t('common.settings')        },
  ];

  return (
    <aside
      className={cn(
        'flex flex-col h-full transition-all duration-300 ease-in-out',
        'bg-[#070B14] border-r border-[#1E2D45]',
        collapsed ? 'w-14' : 'w-56'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 px-3 py-4 border-b border-[#1E2D45]',
        collapsed && 'justify-center px-0'
      )}>
        <div className="flex-shrink-0 w-8 h-8 rounded bg-amber-500/15 border border-amber-500/30 flex items-center justify-center glow-amber">
          <span className="text-amber-400 font-display font-bold text-sm">BC</span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-display font-semibold text-sm text-white leading-tight tracking-wide truncate">
              BROADCAST
            </p>
            <p className="text-[10px] text-[#6B84A3] tracking-widest uppercase leading-tight truncate">
              Asset Management
            </p>
          </div>
        )}
      </div>

      {/* Hiyerarşi göstergesi */}
      {!collapsed && (
        <div className="px-3 pt-2 pb-1">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-green-500/5 border border-green-500/15 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 pulse-dot flex-shrink-0" />
            <span className="text-[10px] text-green-400 font-mono tracking-wider">{t('sidebar.live_monitoring')}</span>
          </div>
          <div className="flex items-center gap-1 px-1 py-1">
            <Building2 size={9} className="text-[#3D5275]" />
            <span className="text-[9px] text-[#3D5275] tracking-wider">
              {t('sidebar.hierarchy')}
            </span>
          </div>
        </div>
      )}

      {/* Grup tipi renk rehberi (collapsed değilken) */}
      {!collapsed && (
        <div className="px-3 pb-2">
          <div className="grid grid-cols-3 gap-1">
            {Object.entries(groupTypeConfig).slice(0, 5).map(([type, cfg]) => (
              <div
                key={type}
                className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded border text-[8px]', cfg.bg, cfg.border, cfg.color)}
              >
                <span className="w-1 h-1 rounded-full bg-current flex-shrink-0" />
                <span className="truncate font-mono">{type.substring(0, 4)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) => cn(
              'group flex items-center gap-3 px-2.5 py-2 rounded text-sm transition-all duration-150 relative',
              isActive
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                : 'text-[#6B84A3] hover:text-[#E2EAF4] hover:bg-[#131C2E]',
              collapsed && 'justify-center px-0 w-10 mx-auto'
            )}
            title={collapsed ? label : undefined}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-amber-400 rounded-r" />
                )}
                <Icon size={15} className="flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate">{label}</span>
                    {isActive && <ChevronRight size={12} className="text-amber-400/60" />}
                  </>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className={cn(
        'border-t border-[#1E2D45] p-2',
        collapsed && 'flex justify-center'
      )}>
        {!collapsed ? (
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 group transition-all duration-200">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
              {user?.fullName?.charAt(0) ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-display font-bold text-[#E2EAF4] truncate leading-tight uppercase tracking-tight">{user?.fullName}</p>
              <p className="text-[9px] text-amber-500 font-mono-val truncate leading-tight mt-0.5 uppercase">
                {user?.role === 'Admin' ? t('common.system_admin') : user?.role}
              </p>
            </div>
            <button
              onClick={() => logout()}
              className="opacity-0 group-hover:opacity-100 transition-all text-[#6B84A3] hover:text-red-400 p-1.5 hover:bg-red-400/10 rounded-lg"
              title={t('common.logout')}
            >
              <LogOut size={12} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => logout()}
            className="p-2 text-[#6B84A3] hover:text-red-400 transition-colors rounded hover:bg-[#131C2E]"
            title={t('common.logout')}
          >
            <LogOut size={15} />
          </button>
        )}
      </div>
    </aside>
  );
}
