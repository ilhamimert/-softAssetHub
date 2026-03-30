import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, CheckCircle, AlertCircle, Info,
  Server, Zap, AlertTriangle, Activity, Sparkles, Loader2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api, analyticsApi, alertApi, monitoringApi } from '@/api/client';
import { cn, alertBg, timeAgo, getLocalSlots, aggregatePowerData, CHART_TOOLTIP_STYLE, REFETCH } from '@/lib/utils';
import type { Alert, DashboardKPI, HeatmapAsset, HealthRecord } from '@/types';

// ─── AI Insight Panel ────────────────────────────────────────
function AIInsightPanel() {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const res = await api.post('/ai/analyze-alerts');
      setAnalysis(res.data.data.analysis);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'AI analizi başarısız oldu.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-4 fade-in-up delay-500 lg:col-span-2">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-[#5b8fd5]" />
          <p className="text-[11px] text-[#8b919e] uppercase tracking-widest font-mono-val">AI Alert Analizi</p>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono-val bg-[#5b8fd5]/10 text-[#5b8fd5] border border-[#5b8fd5]/20 hover:bg-[#5b8fd5]/20 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {loading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
          {loading ? 'Analiz ediliyor...' : 'Analiz Et'}
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-400 font-mono-val bg-red-500/10 rounded px-3 py-2">{error}</p>
      )}
      {analysis && (
        <pre className="text-xs text-[#e4e7ec] font-mono-val whitespace-pre-wrap leading-relaxed bg-[#22262e] rounded p-3 max-h-64 overflow-y-auto">
          {analysis}
        </pre>
      )}
      {!analysis && !error && !loading && (
        <p className="text-xs text-[#555d6e] font-mono-val">
          Son 24 saatin çözülmemiş alertlarını AI ile analiz et, kök neden ve öneri al.
        </p>
      )}
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────
interface KPICardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accent?: string;
  delay?: string;
}

function KPICard({ label, value, sub, icon: Icon, accent = 'amber', delay = '0' }: KPICardProps) {
  const accentMap: Record<string, { border: string; text: string; bg: string }> = {
    amber: { border: 'border-amber-500/25', text: 'text-amber-400', bg: 'bg-amber-500/8' },
    cyan: { border: 'border-cyan-500/25', text: 'text-cyan-400', bg: 'bg-cyan-500/8' },
    green: { border: 'border-green-500/25', text: 'text-green-400', bg: 'bg-green-500/8' },
    red: { border: 'border-red-500/25', text: 'text-red-400', bg: 'bg-red-500/8' },
  };
  const a = accentMap[accent] ?? accentMap.amber;

  return (
    <div
      className={cn(
        'card p-4 fade-in-up relative overflow-hidden',
        `border ${a.border}`,
        `delay-${delay}`
      )}
    >
      {/* Background glow */}
      <div className={cn('absolute -top-4 -right-4 w-20 h-20 rounded-full blur-xl opacity-20', a.bg)} />
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <p className="text-[11px] text-[#8b919e] uppercase tracking-widest font-mono-val">{label}</p>
          <div className={cn('w-7 h-7 rounded flex items-center justify-center', a.bg, `border ${a.border}`)}>
            <Icon size={13} className={a.text} />
          </div>
        </div>
        <p className={cn('font-display font-bold text-3xl leading-none mb-1', a.text)}>
          {value}
        </p>
        {sub && <p className="text-[11px] text-[#555d6e] font-mono-val mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Alert Row ───────────────────────────────────────────────
function AlertRow({ alert }: { alert: Alert }) {
  const icons = {
    Critical: <AlertCircle size={12} className="text-red-400 flex-shrink-0" />,
    Warning: <AlertTriangle size={12} className="text-amber-400 flex-shrink-0" />,
    Info: <Info size={12} className="text-cyan-400 flex-shrink-0" />,
  };

  return (
    <div className={cn(
      'flex items-start gap-2.5 p-2.5 rounded border text-xs',
      alertBg(alert.alertType)
    )}>
      {icons[alert.alertType]}
      <div className="flex-1 min-w-0">
        <p className="leading-snug line-clamp-1">{alert.alertMessage}</p>
        <p className="mt-0.5 opacity-60 font-mono-val text-[10px]">
          {alert.assetName ?? 'Sistem'} · {timeAgo(alert.triggeredTime)}
        </p>
      </div>
    </div>
  );
}

// ─── Heatmap cell ────────────────────────────────────────────
function HeatCell({ value, label, unit = '' }: { value?: number; label: string; unit?: string }) {
  const pct = value ?? 0;
  const color =
    pct >= 90 ? 'bg-red-500' :
      pct >= 75 ? 'bg-amber-500' :
        pct >= 50 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={cn('w-10 h-10 rounded flex items-center justify-center text-[10px] font-mono-val font-semibold text-black', color)}>
        {value != null ? `${Math.round(pct)}${unit}` : '-'}
      </div>
      <span className="text-[9px] text-[#555d6e] text-center leading-tight">{label}</span>
    </div>
  );
}

// ─── Pie label ───────────────────────────────────────────────
const PIE_COLORS = ['#5b9bd5', '#e09f3e', '#4caf82', '#d9534f', '#8b7dc5', '#d97a3e', '#6ec49e', '#5b8fd5', '#c76b8a', '#e0b53e'];

// ─── Dashboard ───────────────────────────────────────────────
export function Dashboard() {
  const { t, i18n } = useTranslation();
  const { data: kpiData, isError: kpiError } = useQuery({
    queryKey: ['dashboard-kpi'],
    queryFn: () => analyticsApi.getDashboardKPI(),
    refetchInterval: REFETCH.SLOW,
  });

  const { data: alertData } = useQuery({
    queryKey: ['alerts-dashboard'],
    queryFn: () => alertApi.getDashboard(),
    refetchInterval: REFETCH.NORMAL,
  });

  const _today = new Date();
  // Yayın günü: dün 21:00 → bugün 20:59
  const todayLabel = _today.toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const [powerSlotKey] = useState(() => Math.floor(Date.now() / (3 * 60 * 60 * 1000)));
  const { data: powerData, dataUpdatedAt: powerUpdatedAt } = useQuery({
    queryKey: ['power-consumption-12h', powerSlotKey],
    queryFn: () => {
      const slot = 3 * 60 * 60 * 1000;
      const toMs = Math.floor(Date.now() / slot) * slot;
      const to = new Date(toMs);
      const from = new Date(toMs - 12 * 60 * 60 * 1000);
      return analyticsApi.getPowerConsumption({
        groupBy: '3hour',
        from: from.toISOString(),
        to: to.toISOString(),
      });
    },
    refetchInterval: REFETCH.POWER,
    staleTime: REFETCH.POWER,
    refetchOnWindowFocus: false,
  });

  const { data: healthData } = useQuery({
    queryKey: ['asset-health'],
    queryFn: () => analyticsApi.getAssetHealth(),
    refetchInterval: REFETCH.VERY_SLOW,
  });

  const { data: physicalDistData } = useQuery({
    queryKey: ['physical-node-distribution'],
    queryFn: () => analyticsApi.getPhysicalNodeDistribution(),
    refetchInterval: REFETCH.VERY_SLOW,
  });

  const { data: heatmapData } = useQuery({
    queryKey: ['heatmap'],
    queryFn: () => monitoringApi.getHeatmap(),
    refetchInterval: REFETCH.FAST,
  });

  const kpi: DashboardKPI = kpiData?.data?.data ?? {
    totalAssets: 0, activeAssets: 0, maintenanceAssets: 0, criticalAlerts: 0, totalAlerts: 0, faultyAssets: 0, totalGroups: 0,
  };

  const alerts: Alert[] = alertData?.data?.data ?? [];
  const alertStats = alertData?.data?.stats ?? {};

  const powerChart = useMemo(() => {
    const slots = getLocalSlots();
    return aggregatePowerData(powerData?.data?.data ?? [], slots)
      .map(r => ({ date: r.label, power: r.avgPowerW, kwh: r.totalKwh }));
  }, [powerData]);

  // Pie chart — fiziksel ağaç node_type dağılımı (physical_nodes öncelikli, yoksa assets fallback)
  const physicalNodes = (physicalDistData?.data?.data ?? []) as { nodeType: string; count: number }[];
  const health: HealthRecord[] = (healthData?.data?.data ?? []) as HealthRecord[];
  const pieData = physicalNodes.length > 0
    ? physicalNodes.map(n => ({ name: n.nodeType, value: n.count }))
    : (() => {
        const typeMap: Record<string, number> = {};
        health.forEach(h => { if (h.assetType) typeMap[h.assetType] = (typeMap[h.assetType] ?? 0) + (h.totalAssets ?? 0); });
        return Object.entries(typeMap).map(([name, value]) => ({ name, value }));
      })();

  // Heatmap sample (top 12 by temperature)
  const heatAssets: HeatmapAsset[] = ((heatmapData?.data?.data ?? []) as HeatmapAsset[])
    .slice(0, 12);

  const uptime = kpi.totalAssets > 0
    ? ((kpi.activeAssets / kpi.totalAssets) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-4">

      {/* API hata banner */}
      {kpiError && (
        <div className="bg-red-500/10 border border-red-500/25 rounded px-3 py-2 text-xs text-red-400 font-mono-val">
          {t('common.data_load_error') || 'KPI verileri yüklenemedi — sunucu bağlantısını kontrol edin.'}
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard label={t('dashboard.kpi.total_assets')} value={kpi.totalAssets} icon={Server} accent="cyan" delay="100" />
        <KPICard label={t('dashboard.kpi.active_devices')} value={kpi.activeAssets} icon={CheckCircle} accent="green" delay="200" />
        <KPICard label={t('dashboard.kpi.in_maintenance')} value={kpi.maintenanceAssets} icon={Activity} accent="amber" delay="300"
          sub={kpi.totalAssets > 0 ? `%${((kpi.maintenanceAssets / kpi.totalAssets) * 100).toFixed(1)}` : undefined}
        />
        <KPICard label={t('dashboard.kpi.critical_alerts')} value={kpi.criticalAlerts} icon={AlertCircle} accent="red" delay="400" />
        <KPICard label={t('dashboard.kpi.total_alerts')} value={kpi.totalAlerts} icon={AlertTriangle} accent="amber" delay="500" />
        <KPICard label={t('dashboard.kpi.system_uptime')} value={`%${uptime}`} icon={TrendingUp} accent="cyan" delay="500"
          sub={`${kpi.activeAssets} / ${kpi.totalAssets} ${t('common.assets').toLowerCase()}`}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* Power consumption area chart */}
        <div className="card p-4 lg:col-span-2 fade-in-up delay-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] text-[#8b919e] uppercase tracking-widest font-mono-val">{t('dashboard.charts.power_consumption')}</p>
              <p className="text-sm font-display font-semibold text-white mt-0.5">{todayLabel} — {i18n.language === 'tr' ? 'Son 12 Saat — 3 Saatlik Dilimler' : 'Last 12 Hours — 3H Slots'}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Zap size={14} className="text-amber-400" />
              {powerUpdatedAt > 0 && (
                <span className="text-[9px] text-[#555d6e] font-mono-val">
                  {i18n.language === 'tr' ? 'Güncellendi' : 'Updated'}{' '}
                  {new Date(powerUpdatedAt).toLocaleTimeString(i18n.language === 'tr' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
          {powerChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={powerChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="powerGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e09f3e" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#e09f3e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2e333d" />
                <XAxis dataKey="date" tick={{ fill: '#555d6e', fontSize: 10, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#555d6e', fontSize: 10, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
                <Tooltip {...CHART_TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="power" stroke="#e09f3e" strokeWidth={1.5} fill="url(#powerGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-[#555d6e] text-xs font-mono-val">
              Monitoring verisi bekleniyor...
            </div>
          )}
        </div>

        {/* Asset type pie */}
        <div className="card p-4 fade-in-up delay-300">
          <div className="mb-4">
            <p className="text-[11px] text-[#8b919e] uppercase tracking-widest font-mono-val">{t('dashboard.charts.asset_distribution')}</p>
            <p className="text-sm font-display font-semibold text-white mt-0.5">{physicalNodes.length > 0 ? (i18n.language === 'tr' ? 'Fiziksel Ağaç Node Türleri' : 'Physical Tree Node Types') : (i18n.language === 'tr' ? 'Ekipman Türlerine Göre' : 'By Equipment Types')}</p>
          </div>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60}
                    dataKey="value" stroke="none" paddingAngle={2}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...CHART_TOOLTIP_STYLE} itemStyle={{ color: '#e4e7ec' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-1">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-[#8b919e] flex-1 truncate">{d.name}</span>
                    <span className="font-mono-val text-[#e4e7ec]">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-40 flex items-center justify-center text-[#555d6e] text-xs font-mono-val">
              Veri yok
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

        {/* Active alerts */}
        <div className="card p-4 fade-in-up delay-300">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[11px] text-[#8b919e] uppercase tracking-widest font-mono-val">{t('dashboard.charts.active_alerts')}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-xs text-red-400">
                  <span className="font-mono-val font-semibold">{alertStats.criticalCount ?? 0}</span> {t('dashboard.alerts.critical')}
                </span>
                <span className="flex items-center gap-1 text-xs text-amber-400">
                  <span className="font-mono-val font-semibold">{alertStats.warningCount ?? 0}</span> {t('dashboard.alerts.warning')}
                </span>
                <span className="flex items-center gap-1 text-xs text-cyan-400">
                  <span className="font-mono-val font-semibold">{alertStats.infoCount ?? 0}</span> {t('dashboard.alerts.info')}
                </span>
              </div>
            </div>
          </div>
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {alerts.length > 0
              ? alerts.slice(0, 8).map(a => <AlertRow key={a.alertId} alert={a} />)
              : <p className="text-center text-[#555d6e] text-xs font-mono-val py-6">{t('dashboard.alerts.no_alerts')}</p>
            }
          </div>
        </div>

        {/* Heatmap */}
        <div className="card p-4 fade-in-up delay-400">
          <div className="mb-3">
            <p className="text-[11px] text-[#8b919e] uppercase tracking-widest font-mono-val">{t('dashboard.charts.heatmap')}</p>
            <p className="text-sm font-display font-semibold text-white mt-0.5">{t('dashboard.charts.live_metrics')}</p>
          </div>
          {heatAssets.length > 0 ? (
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {heatAssets.map((a: HeatmapAsset) => (
                <div key={a.assetId} className="flex items-center gap-3 p-2 rounded bg-[#22262e] border border-[#2e333d]">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#e4e7ec] truncate leading-tight">{a.assetName}</p>
                    <p className="text-[10px] text-[#555d6e] font-mono-val truncate">{a.channelName} · {a.roomName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <HeatCell value={a.temperature} label="°C" />
                    <HeatCell value={a.cpuUsage ?? a.gpuUsage} label="Kull." unit="%" />
                    <HeatCell value={a.powerConsumption ? Math.min((a.powerConsumption / 1000) * 100, 100) : undefined} label="Güç" unit="%" />
                  </div>
                  <span className={cn(
                    'w-1.5 h-1.5 rounded-full flex-shrink-0',
                    a.isOnline ? 'bg-green-400 pulse-dot' : 'bg-red-400'
                  )} />
                </div>
              ))}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-[#555d6e] text-xs font-mono-val">
              Monitoring verisi bekleniyor...
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#2e333d]">
            {[
              { color: 'bg-green-500', label: '< 50%' },
              { color: 'bg-yellow-500', label: '50-74%' },
              { color: 'bg-amber-500', label: '75-89%' },
              { color: 'bg-red-500', label: '≥ 90%' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-[10px] text-[#555d6e]">
                <span className={cn('w-2.5 h-2.5 rounded-sm', color)} />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Channel health bar chart */}
      {health.length > 0 && (
        <div className="card p-4 fade-in-up delay-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] text-[#8b919e] uppercase tracking-widest font-mono-val">{t('dashboard.charts.channel_health')}</p>
              <p className="text-sm font-display font-semibold text-white mt-0.5">{i18n.language === 'tr' ? 'Kanal Bazlı Aktif / Bakım / Arızalı' : 'Channel-based Active / Maintenance / Faulty'}</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              data={health.reduce((acc: { channel: string; aktif: number; bakim: number; arizali: number }[], curr: HealthRecord) => {
                const ex = acc.find(x => x.channel === curr.channelName);
                if (ex) {
                  ex.aktif += curr.activeCount ?? 0;
                  ex.bakim += curr.maintenanceCount ?? 0;
                  ex.arizali += curr.faultyCount ?? 0;
                } else {
                  acc.push({ channel: curr.channelName, aktif: curr.activeCount ?? 0, bakim: curr.maintenanceCount ?? 0, arizali: curr.faultyCount ?? 0 });
                }
                return acc;
              }, [])}
              margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#2e333d" vertical={false} />
              <XAxis dataKey="channel" tick={{ fill: '#555d6e', fontSize: 9, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#555d6e', fontSize: 10, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: 'rgba(30,45,69,0.45)' }} {...CHART_TOOLTIP_STYLE} />
              <Bar dataKey="aktif" stackId="a" fill="#4caf82" radius={[0, 0, 0, 0]} name="Aktif" />
              <Bar dataKey="bakim" stackId="a" fill="#e09f3e" name="Bakım" />
              <Bar dataKey="arizali" stackId="a" fill="#d9534f" radius={[2, 2, 0, 0]} name="Arızalı" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* AI Insight Panel */}
      <AIInsightPanel />
    </div>
  );
}
