import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, List, Bell, BarChart3,
  Wrench, Settings, LogOut, ChevronRight, Wifi, Layers, Building2, KeyRound, ScrollText, FileText,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { groupTypeConfig } from '@/lib/constants';

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ collapsed, mobileOpen, onMobileClose }: SidebarProps) {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();

  const navItems = [
    { to: '/',           icon: LayoutDashboard, label: t('common.dashboard'), exact: true },
    { to: '/assets',     icon: Layers,          label: t('common.assets')  },
    { to: '/asset-list', icon: List,            label: t('common.assetList') },
    { to: '/licenses',   icon: KeyRound,        label: t('common.licenses')      },
    { to: '/monitoring', icon: Wifi,            label: t('common.monitoring')     },
    { to: '/alerts',     icon: Bell,            label: t('common.alerts')       },
    { to: '/maintenance',    icon: Wrench,       label: t('common.maintenance')     },
    { to: '/analytics',     icon: BarChart3,    label: t('common.analytics')       },
    { to: '/asset-groups',  icon: Layers,       label: t('common.assetGroups')     },
    { to: '/reports',       icon: FileText,     label: t('common.reports')         },
    ...(user?.role === 'Admin' ? [{ to: '/logs', icon: ScrollText, label: t('common.logs') }] : []),
    { to: '/settings',      icon: Settings,     label: t('common.settings')        },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={onMobileClose}
        />
      )}
    <aside
      className={cn(
        'flex flex-col h-full transition-all duration-300 ease-in-out',
        'bg-[#111318] border-r border-[#2e333d]',
        // Mobile: fixed overlay, sağdan kaymaz soldan gelir
        'fixed inset-y-0 left-0 z-50 w-56',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
        // Desktop: relative, flex içinde yer kaplar
        'md:relative md:inset-auto md:z-auto md:translate-x-0',
        collapsed ? 'md:w-14' : 'md:w-56',
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center justify-center border-b border-[#2e333d]',
        collapsed ? 'px-2 py-3' : 'p-0'
      )}>
        {collapsed ? (
          <img src="/logo.svg" alt="isoft" className="w-8 h-8 rounded object-cover object-left" />
        ) : (
          <img src="/logo.svg" alt="isoft" className="w-full h-auto rounded-none" />
        )}
      </div>

      {/* Hiyerarşi göstergesi */}
      {!collapsed && (
        <div className="px-3 pt-2 pb-1">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-[#4caf82]/5 border border-[#4caf82]/15 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4caf82] animate-pulse flex-shrink-0" />
            <span className="text-[10px] text-[#4caf82] font-mono tracking-wider">{t('sidebar.live_monitoring')}</span>
          </div>
          <div className="flex items-center gap-1 px-1 py-1">
            <Building2 size={9} className="text-[#555d6e]" />
            <span className="text-[9px] text-[#555d6e] tracking-wider">
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
            onClick={onMobileClose}
            className={({ isActive }) => cn(
              'group flex items-center gap-3 px-2.5 py-2 rounded text-sm transition-all duration-150 relative',
              isActive
                ? 'bg-[#22262e] text-[#5b8fd5] border-l-2 border-l-[#5b8fd5] border border-[#2e333d]'
                : 'text-[#8b919e] hover:text-[#e4e7ec] hover:bg-[#1a1d23]',
              collapsed && 'justify-center px-0 w-10 mx-auto'
            )}
            title={collapsed ? label : undefined}
          >
            {({ isActive }) => (
              <>
                <Icon size={15} className="flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate">{label}</span>
                    {isActive && <ChevronRight size={12} className="text-[#5b8fd5]/60" />}
                  </>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className={cn(
        'border-t border-[#2e333d] p-2',
        collapsed && 'flex justify-center'
      )}>
        {!collapsed ? (
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 group transition-all duration-200">
            <div className="w-8 h-8 rounded-lg bg-[#5b8fd5] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
              {user?.fullName?.charAt(0) ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-display font-bold text-[#e4e7ec] truncate leading-tight uppercase tracking-tight">{user?.fullName}</p>
              <p className="text-[9px] text-[#5b8fd5] font-mono-val truncate leading-tight mt-0.5 uppercase">
                {user?.role === 'Admin' ? t('common.system_admin') : user?.role}
              </p>
            </div>
            <button
              onClick={() => logout()}
              className="opacity-0 group-hover:opacity-100 transition-all text-[#8b919e] hover:text-[#d9534f] p-1.5 hover:bg-[#d9534f]/10 rounded-lg"
              title={t('common.logout')}
            >
              <LogOut size={12} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => logout()}
            className="p-2 text-[#8b919e] hover:text-[#d9534f] transition-colors rounded hover:bg-[#1a1d23]"
            title={t('common.logout')}
          >
            <LogOut size={15} />
          </button>
        )}
      </div>
    </aside>
    </>
  );
}
