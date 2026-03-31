import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from '@/components/layout/Layout';
import { useAuthStore } from '@/store/authStore';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

// ── Lazy page chunks ────────────────────────────────────────────
const Login       = lazy(() => import('@/pages/Login').then(m => ({ default: m.Login })));
const Dashboard   = lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Assets      = lazy(() => import('@/pages/Assets').then(m => ({ default: m.Assets })));
const AssetList   = lazy(() => import('@/pages/AssetList').then(m => ({ default: m.AssetList })));
const AssetDetail = lazy(() => import('@/pages/AssetDetail').then(m => ({ default: m.AssetDetail })));
const Monitoring  = lazy(() => import('@/pages/Monitoring').then(m => ({ default: m.Monitoring })));
const Alerts      = lazy(() => import('@/pages/Alerts').then(m => ({ default: m.Alerts })));
const Maintenance = lazy(() => import('@/pages/Maintenance').then(m => ({ default: m.Maintenance })));
const Analytics   = lazy(() => import('@/pages/Analytics').then(m => ({ default: m.Analytics })));
const Settings    = lazy(() => import('@/pages/Settings').then(m => ({ default: m.Settings })));
const Licenses    = lazy(() => import('@/pages/Licenses').then(m => ({ default: m.Licenses })));
const Logs           = lazy(() => import('@/pages/Logs').then(m => ({ default: m.Logs })));
const AssetGroups    = lazy(() => import('@/pages/AssetGroups').then(m => ({ default: m.AssetGroups })));
const Reports        = lazy(() => import('@/pages/Reports').then(m => ({ default: m.Reports })));

// ── Fallback ────────────────────────────────────────────────────
const PageLoader = () => (
  <div className="flex h-screen items-center justify-center bg-[#111318]">
    <span className="w-5 h-5 border-2 border-[#5b8fd5]/30 border-t-[#5b8fd5] rounded-full animate-spin" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60 * 1000,        // 1 dk: eski veri yerine cache'i kullan
      gcTime: 5 * 60 * 1000,       // 5 dk: kullanılmayan cache'i bellekten temizle
      refetchOnWindowFocus: true,  // sekme değişince verileri yenile
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const { isAuthenticated, refreshUser, user } = useAuthStore();

  // Startup: token varsa user'ı yükle (enabled: user?.role koşulları için şart)
  useEffect(() => {
    if (isAuthenticated && !user) refreshUser();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route
              path="/login"
              element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
            />
            <Route path="/" element={<ProtectedRoute><ErrorBoundary><Layout /></ErrorBoundary></ProtectedRoute>}>
              <Route index              element={<Dashboard />}   />
              <Route path="assets"      element={<Assets />}      />
              <Route path="assets/:id"  element={<AssetDetail />} />
              <Route path="asset-list"  element={<AssetList />}   />
              <Route path="licenses"    element={<Licenses />}    />
              <Route path="monitoring"  element={<Monitoring />}  />
              <Route path="alerts"      element={<Alerts />}      />
              <Route path="maintenance" element={<Maintenance />} />
              <Route path="analytics"   element={<Analytics />}   />
              <Route path="settings"    element={<Settings />}    />
              <Route path="logs"           element={<Logs />}           />
              <Route path="asset-groups"   element={<AssetGroups />}     />
              <Route path="reports"        element={<Reports />}         />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
