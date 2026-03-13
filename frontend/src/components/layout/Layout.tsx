import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function Layout() {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const getTitle = () => {
    switch (location.pathname) {
      case '/': return t('layout.titles.dashboard');
      case '/assets': return t('layout.titles.assets');
      case '/asset-list': return t('layout.titles.assetList');
      case '/monitoring': return t('layout.titles.monitoring');
      case '/alerts': return t('layout.titles.alerts');
      case '/maintenance': return t('layout.titles.maintenance');
      case '/analytics': return t('layout.titles.analytics');
      case '/settings': return t('layout.titles.settings');
      case '/licenses': return t('layout.titles.licenses');
      default: return t('layout.titles.default');
    }
  };

  const title = getTitle();

  return (
    <div className="flex h-screen overflow-hidden bg-[#070B14]">
      <Sidebar collapsed={collapsed} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header
          onToggleSidebar={() => setCollapsed(!collapsed)}
          title={title}
        />
        <main className="flex-1 overflow-y-auto p-4 space-y-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
