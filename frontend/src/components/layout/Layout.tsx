import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

const pageTitles: Record<string, string> = {
  '/':            'Dashboard',
  '/assets':      'Varlık Yönetimi',
  '/asset-list':  'Varlık Listesi',
  '/monitoring':  'Canlı İzleme',
  '/alerts':      'Uyarılar',
  '/maintenance': 'Bakım Yönetimi',
  '/analytics':   'Analitik & Raporlar',
  '/settings':    'Ayarlar',
};

export function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const title = pageTitles[location.pathname] ?? 'Broadcast Asset Management';

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
