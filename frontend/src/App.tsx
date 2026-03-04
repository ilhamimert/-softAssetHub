import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { Layout } from '@/components/layout/Layout';
import { Login }      from '@/pages/Login';
import { Dashboard }  from '@/pages/Dashboard';
import { Assets }     from '@/pages/Assets';
import { AssetList }  from '@/pages/AssetList';
import { Monitoring } from '@/pages/Monitoring';
import { Alerts }     from '@/pages/Alerts';
import { Maintenance } from '@/pages/Maintenance';
import { Analytics }  from '@/pages/Analytics';
import { Settings }   from '@/pages/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index              element={<Dashboard />}  />
            <Route path="assets"      element={<Assets />}     />
            <Route path="asset-list"  element={<AssetList />}  />
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
