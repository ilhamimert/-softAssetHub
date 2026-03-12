import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from '@/components/layout/Layout';
import { Dashboard }  from '@/pages/Dashboard';
import { Assets }     from '@/pages/Assets';
import { AssetList }  from '@/pages/AssetList';
import { Monitoring } from '@/pages/Monitoring';
import { Alerts }     from '@/pages/Alerts';
import { Maintenance } from '@/pages/Maintenance';
import { Analytics }  from '@/pages/Analytics';
import { Settings }    from '@/pages/Settings';
import { AssetDetail } from '@/pages/AssetDetail';
import { Licenses }    from '@/pages/Licenses';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/" element={<Layout />}>
            <Route index              element={<Dashboard />}  />
            <Route path="assets"      element={<Assets />}     />
            <Route path="assets/:id"  element={<AssetDetail />} />
            <Route path="asset-list"  element={<AssetList />}  />
            <Route path="licenses"    element={<Licenses />}   />
            <Route path="monitoring"  element={<Monitoring />} />
            <Route path="alerts"      element={<Alerts />}     />
            <Route path="maintenance" element={<Maintenance />} />
            <Route path="analytics"   element={<Analytics />}  />
            <Route path="settings"    element={<Settings />}   />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
