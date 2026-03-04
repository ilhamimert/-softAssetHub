import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Server, Zap, AlertTriangle, Activity,
  TrendingUp, CheckCircle, AlertCircle, Info,
} from 'lucide-react';
import { analyticsApi, alertApi, monitoringApi } from '@/api/client';
import { cn, alertBg, timeAgo, statusBg } from '@/lib/utils';
import type { Alert, DashboardKPI } from '@/types';

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
    amber: { border: 'border-amber-500/25', text: 'text-amber-400',  bg: 'bg-amber-500/8'  },
    cyan:  { border: 'border-cyan-500/25',  text: 'text-cyan-400',   bg: 'bg-cyan-500/8'   },
    green: { border: 'border-green-500/25', text: 'text-green-400',  bg: 'bg-green-500/8'  },
    red:   { border: 'border-red-500/25',   text: 'text-red-400',    bg: 'bg-red-500/8'    },
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
          <p className="text-[11px] text-[#6B84A3] uppercase tracking-widest font-mono-val">{label}</p>
          <div className={cn('w-7 h-7 rounded flex items-center justify-center', a.bg, `border ${a.border}`)}>
            <Icon size={13} className={a.text} />
          </div>
        </div>
        <p className={cn('font-display font-bold text-3xl leading-none mb-1', a.text)}>
          {value}
        </p>
        {sub && <p className="text-[11px] text-[#3D5275] font-mono-val mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Alert Row ───────────────────────────────────────────────
function AlertRow({ alert }: { alert: Alert }) {
  const icons = {
    Critical: <AlertCircle size={12} className="text-red-400 flex-shrink-0" />,
    Warning:  <AlertTriangle size={12} className="text-amber-400 flex-shrink-0" />,
    Info:     <Info size={12} className="text-cyan-400 flex-shrink-0" />,
  };

  return (
    <div className={cn(
      'flex items-start gap-2.5 p-2.5 rounded border text-xs',
      alertBg(alert.AlertType)
    )}>
      {icons[alert.AlertType]}
      <div className="flex-1 min-w-0">
        <p className="leading-snug line-clamp-1">{alert.AlertMessage}</p>
        <p className="mt-0.5 opacity-60 font-mono-val text-[10px]">
          {alert.AssetName ?? 'Sistem'} · {timeAgo(alert.TriggeredTime)}
        </p>
      </div>
    </div>
  );
}

// ─── Heatmap cell ────────────────────────────────────────────
function HeatCell({ value, label, unit = '' }: { value?: number; label: string; unit?: string }) {
  const pct = value ?? 0;
  const color =
    pct >= 90 ? 'bg-red-500'   :
    pct >= 75 ? 'bg-amber-500' :
    pct >= 50 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={cn('w-10 h-10 rounded flex items-center justify-center text-[10px] font-mono-val font-semibold text-black', color)}>
        {value != null ? `${Math.round(pct)}${unit}` : '-'}
      </div>
      <span className="text-[9px] text-[#3D5275] text-center leading-tight">{label}</span>
    </div>
  );
}

// ─── Pie label ───────────────────────────────────────────────
const PIE_COLORS = ['#22D3EE','#F59E0B','#10B981','#EF4444','#6B84A3'];

// ─── Dashboard ───────────────────────────────────────────────
export function Dashboard() {
  const { data: kpiData } = useQuery({
    queryKey: ['dashboard-kpi'],
    queryFn: () => analyticsApi.getDashboardKPI(),
    refetchInterval: 60000,
  });

  const { data: alertData } = useQuery({
    queryKey: ['alerts-dashboard'],
    queryFn: () => alertApi.getDashboard(),
    refetchInterval: 30000,
  });

  const { data: powerData } = useQuery({
    queryKey: ['power-consumption'],
    queryFn: () => analyticsApi.getPowerConsumption({ groupBy: 'day' }),
    refetchInterval: 300000,
  });

  const { data: healthData } = useQuery({
    queryKey: ['asset-health'],
    queryFn: () => analyticsApi.getAssetHealth(),
    refetchInterval: 300000,
  });

  const { data: heatmapData } = useQuery({
    queryKey: ['heatmap'],
    queryFn: () => monitoringApi.getHeatmap(),
    refetchInterval: 15000,
  });

  const kpi: DashboardKPI = kpiData?.data?.data ?? {
    TotalAssets: 0, ActiveAssets: 0, MaintenanceAssets: 0, CriticalAlerts: 0, TotalAlerts: 0,
  };

  const alerts: Alert[] = alertData?.data?.data ?? [];
  const alertStats       = alertData?.data?.stats ?? {};

  // Power chart data (son 7 günü al)
  const rawPower: any[] = powerData?.data?.data ?? [];
  const powerChart = rawPower.slice(0, 14).reverse().map((r: any) => ({
    date:  r.Period?.slice(5),  // MM-DD
    power: Math.round(r.AvgPowerW ?? 0),
    kwh:   Math.round(r.TotalkWh ?? 0),
  }));

  // Pie chart — asset type distribution from health data
  const health: any[] = healthData?.data?.data ?? [];
  const typeMap: Record<string, number> = {};
  health.forEach((h: any) => {
    typeMap[h.AssetType] = (typeMap[h.AssetType] ?? 0) + (h.TotalAssets ?? 0);
  });
  const pieData = Object.entries(typeMap).map(([name, value]) => ({ name, value }));

  // Heatmap sample (top 12 by temperature)
  const heatAssets: any[] = (heatmapData?.data?.data ?? [])
    .slice(0, 12);

  const uptime = kpi.TotalAssets > 0
    ? ((kpi.ActiveAssets / kpi.TotalAssets) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-4">

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard label="Toplam Varlık"   value={kpi.TotalAssets}      icon={Server}        accent="cyan"  delay="100" />
        <KPICard label="Aktif Cihazlar"  value={kpi.ActiveAssets}     icon={CheckCircle}   accent="green" delay="200" />
        <KPICard label="Bakımda"          value={kpi.MaintenanceAssets} icon={Activity}     accent="amber" delay="300"
          sub={kpi.TotalAssets > 0 ? `%${((kpi.MaintenanceAssets/kpi.TotalAssets)*100).toFixed(1)}` : undefined}
        />
        <KPICard label="Kritik Uyarı"   value={kpi.CriticalAlerts}   icon={AlertCircle}   accent="red"   delay="400" />
        <KPICard label="Toplam Uyarı"   value={kpi.TotalAlerts}      icon={AlertTriangle} accent="amber" delay="500" />
        <KPICard label="Sistem Uptime"  value={`%${uptime}`}         icon={TrendingUp}    accent="cyan"  delay="500"
          sub={`${kpi.ActiveAssets} / ${kpi.TotalAssets} cihaz`}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* Power consumption area chart */}
        <div className="card p-4 lg:col-span-2 fade-in-up delay-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] text-[#6B84A3] uppercase tracking-widest font-mono-val">Güç Tüketimi</p>
              <p className="text-sm font-display font-semibold text-white mt-0.5">Son 14 Gün — Ortalama Watt</p>
            </div>
            <Zap size={14} className="text-amber-400" />
          </div>
          {powerChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={powerChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="powerGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#F59E0B" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2D45" />
                <XAxis dataKey="date" tick={{ fill: '#3D5275', fontSize: 10, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#3D5275', fontSize: 10, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: '#0D1421', border: '1px solid #1E2D45', borderRadius: 6, fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  labelStyle={{ color: '#6B84A3' }}
                  itemStyle={{ color: '#F59E0B' }}
                />
                <Area type="monotone" dataKey="power" stroke="#F59E0B" strokeWidth={1.5} fill="url(#powerGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-[#3D5275] text-xs font-mono-val">
              Monitoring verisi bekleniyor...
            </div>
          )}
        </div>

        {/* Asset type pie */}
        <div className="card p-4 fade-in-up delay-300">
          <div className="mb-4">
            <p className="text-[11px] text-[#6B84A3] uppercase tracking-widest font-mono-val">Varlık Dağılımı</p>
            <p className="text-sm font-display font-semibold text-white mt-0.5">Ekipman Türlerine Göre</p>
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
                  <Tooltip
                    contentStyle={{ background: '#0D1421', border: '1px solid #1E2D45', borderRadius: 6, fontSize: 11, fontFamily: 'JetBrains Mono' }}
                    itemStyle={{ color: '#E2EAF4' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-1">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-[#6B84A3] flex-1 truncate">{d.name}</span>
                    <span className="font-mono-val text-[#E2EAF4]">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-40 flex items-center justify-center text-[#3D5275] text-xs font-mono-val">
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
              <p className="text-[11px] text-[#6B84A3] uppercase tracking-widest font-mono-val">Aktif Uyarılar</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-xs text-red-400">
                  <span className="font-mono-val font-semibold">{alertStats.CriticalCount ?? 0}</span> Kritik
                </span>
                <span className="flex items-center gap-1 text-xs text-amber-400">
                  <span className="font-mono-val font-semibold">{alertStats.WarningCount ?? 0}</span> Uyarı
                </span>
                <span className="flex items-center gap-1 text-xs text-cyan-400">
                  <span className="font-mono-val font-semibold">{alertStats.InfoCount ?? 0}</span> Bilgi
                </span>
              </div>
            </div>
          </div>
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {alerts.length > 0
              ? alerts.slice(0, 8).map(a => <AlertRow key={a.AlertID} alert={a} />)
              : <p className="text-center text-[#3D5275] text-xs font-mono-val py-6">✓ Aktif uyarı yok</p>
            }
          </div>
        </div>

        {/* Heatmap */}
        <div className="card p-4 fade-in-up delay-400">
          <div className="mb-3">
            <p className="text-[11px] text-[#6B84A3] uppercase tracking-widest font-mono-val">Sıcaklık & Kullanım Haritası</p>
            <p className="text-sm font-display font-semibold text-white mt-0.5">Anlık Cihaz Metrikleri</p>
          </div>
          {heatAssets.length > 0 ? (
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {heatAssets.map((a: any) => (
                <div key={a.AssetID} className="flex items-center gap-3 p-2 rounded bg-[#131C2E] border border-[#1E2D45]">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#E2EAF4] truncate leading-tight">{a.AssetName}</p>
                    <p className="text-[10px] text-[#3D5275] font-mono-val truncate">{a.ChannelName} · {a.RoomName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <HeatCell value={a.Temperature} label="°C" />
                    <HeatCell value={a.CPUUsage ?? a.GPUUsage} label="Kull." unit="%" />
                    <HeatCell value={a.PowerConsumption ? Math.min((a.PowerConsumption / 1000) * 100, 100) : undefined} label="Güç" unit="%" />
                  </div>
                  <span className={cn(
                    'w-1.5 h-1.5 rounded-full flex-shrink-0',
                    a.IsOnline ? 'bg-green-400 pulse-dot' : 'bg-red-400'
                  )} />
                </div>
              ))}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-[#3D5275] text-xs font-mono-val">
              Monitoring verisi bekleniyor...
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#1E2D45]">
            {[
              { color: 'bg-green-500', label: '< 50%' },
              { color: 'bg-yellow-500', label: '50-74%' },
              { color: 'bg-amber-500', label: '75-89%' },
              { color: 'bg-red-500', label: '≥ 90%' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-[10px] text-[#3D5275]">
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
              <p className="text-[11px] text-[#6B84A3] uppercase tracking-widest font-mono-val">Kanal Sağlık Durumu</p>
              <p className="text-sm font-display font-semibold text-white mt-0.5">Kanal Bazlı Aktif / Bakım / Arızalı</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              data={health.reduce((acc: any[], curr: any) => {
                const ex = acc.find(x => x.channel === curr.ChannelName);
                if (ex) {
                  ex.aktif    += curr.ActiveCount ?? 0;
                  ex.bakim    += curr.MaintenanceCount ?? 0;
                  ex.arizali  += curr.FaultyCount ?? 0;
                } else {
                  acc.push({ channel: curr.ChannelName, aktif: curr.ActiveCount ?? 0, bakim: curr.MaintenanceCount ?? 0, arizali: curr.FaultyCount ?? 0 });
                }
                return acc;
              }, [])}
              margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2D45" vertical={false} />
              <XAxis dataKey="channel" tick={{ fill: '#3D5275', fontSize: 9, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#3D5275', fontSize: 10, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: '#0D1421', border: '1px solid #1E2D45', borderRadius: 6, fontSize: 11, fontFamily: 'JetBrains Mono' }}
                labelStyle={{ color: '#6B84A3' }}
              />
              <Bar dataKey="aktif"   stackId="a" fill="#10B981" radius={[0,0,0,0]} name="Aktif" />
              <Bar dataKey="bakim"   stackId="a" fill="#F59E0B" name="Bakım" />
              <Bar dataKey="arizali" stackId="a" fill="#EF4444" radius={[2,2,0,0]} name="Arızalı" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
