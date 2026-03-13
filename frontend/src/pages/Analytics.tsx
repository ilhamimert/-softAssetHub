import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Zap, TrendingUp, DollarSign, Wrench } from 'lucide-react';
import { analyticsApi } from '@/api/client';
import { cn, formatCurrency } from '@/lib/utils';

function SectionTitle({ icon: Icon, title, sub }: { icon: any; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
        <Icon size={14} className="text-amber-400" />
      </div>
      <div>
        <p className="text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val">{sub}</p>
        <p className="text-sm font-display font-semibold text-white">{title}</p>
      </div>
    </div>
  );
}

// Yayın günü slotları: 21:00 → 00:00 → ... → 18:00
const BROADCAST_SLOTS = ['21:00', '00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00'];

export function Analytics() {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(1);
  const limit = 10;

  const today = new Date();
  const { data: powerData } = useQuery({
    queryKey: ['power-chart-12h', Math.floor(Date.now() / (3 * 60 * 60 * 1000))],
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
    refetchInterval: 5 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const { data: healthData } = useQuery({
    queryKey: ['asset-health'],
    queryFn: () => analyticsApi.getAssetHealth(),
  });

  const { data: budgetData } = useQuery({
    queryKey: ['budget'],
    queryFn: () => analyticsApi.getBudget(),
  });

  const { data: forecastData } = useQuery({
    queryKey: ['maintenance-forecast'],
    queryFn: () => analyticsApi.getMaintenanceForecast({ days: 90 }),
  });

  // 3'er saatlik bucket — yayın günü sırası: 21→00→03→...→18
  const power: any[] = (() => {
    const map = new Map<string, { totalkWh: number; sumPow: number; n: number }>();
    for (const r of (powerData?.data?.data ?? [])) {
      const label = (r.period ?? '').slice(-5); // "21:00", "00:00" vb.
      const e = map.get(label) ?? { totalkWh: 0, sumPow: 0, n: 0 };
      e.totalkWh += r.totalKwh ?? 0;
      e.sumPow += r.avgPowerW ?? 0;
      e.n += 1;
      map.set(label, e);
    }
    return BROADCAST_SLOTS
      .filter(slot => map.has(slot))
      .map(slot => {
        const e = map.get(slot)!;
        return { label: slot, totalkWh: Math.round(e.totalkWh), avgPowerW: Math.round(e.sumPow / e.n) };
      });
  })();

  const health: any[] = healthData?.data?.data ?? [];
  const budget: any[] = budgetData?.data?.data ?? [];
  const forecast: any[] = forecastData?.data?.data ?? [];

  // Budget totals
  const totalCost = budget.reduce((s, b) => s + Number(b.totalPurchaseCost ?? 0), 0);
  const totalValue = budget.reduce((s, b) => s + Number(b.totalCurrentValue ?? 0), 0);
  const totalMaint = budget.reduce((s, b) => s + Number(b.totalMaintenanceCost ?? 0), 0);

  const totalForecast = forecast.length;
  const totalPages = Math.ceil(totalForecast / limit);

  const todayLabel = today.toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="space-y-4 fade-in-up">

      {/* Budget Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t('analytics.finance.purchase_cost'), value: formatCurrency(totalCost), icon: DollarSign, color: 'cyan' },
          { label: t('analytics.finance.current_value'), value: formatCurrency(totalValue), icon: TrendingUp, color: 'green' },
          { label: t('analytics.finance.maintenance_cost'), value: formatCurrency(totalMaint), icon: Wrench, color: 'amber' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`card p-4 border border-${color}-500/20`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val">{label}</p>
              <Icon size={13} className={`text-${color}-400`} />
            </div>
            <p className={`font-display font-bold text-2xl text-${color}-400`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Power chart */}
      <div className="card p-4">
        <SectionTitle icon={Zap} title={t('analytics.charts.power_trend')} sub={`${todayLabel} — ${i18n.language === 'tr' ? 'Son 12 Saat — 3 Saatlik Dilimler' : 'Last 12 Hours — 3H Slots'}`} />
        {power.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={power} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2D45" />
              <XAxis
                dataKey="label"
                tick={{ fill: '#3D5275', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                tickLine={false} axisLine={false}
              />
              <YAxis tick={{ fill: '#3D5275', fontSize: 10, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: '#0D1421', border: '1px solid #1E2D45', borderRadius: 6, fontSize: 11, fontFamily: 'JetBrains Mono' }}
                labelStyle={{ color: '#6B84A3' }}
              />
              <Line type="monotone" dataKey="avgPowerW" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3, fill: '#F59E0B' }} name={t('analytics.charts.avg_power')} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-[#3D5275] text-xs font-mono-val">
            {i18n.language === 'tr' ? 'Yeterli monitoring verisi yok' : 'Not enough monitoring data'}
          </div>
        )}
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

        {/* Asset Health by Channel */}
        <div className="card p-4">
          <SectionTitle icon={TrendingUp} title={t('dashboard.charts.channel_health')} sub={t('analytics.charts.health_sub')} />
          {health.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={health.reduce((acc: any[], curr: any) => {
                  const name = curr.channelName || 'Bilinmeyen';
                  const ex = acc.find(x => x.channel === name.slice(0, 8));
                  if (ex) {
                    ex.aktif += curr.activeCount ?? 0;
                    ex.bakim += curr.maintenanceCount ?? 0;
                    ex.arizali += curr.faultyCount ?? 0;
                  } else {
                    acc.push({ channel: name.slice(0, 8), aktif: curr.activeCount ?? 0, bakim: curr.maintenanceCount ?? 0, arizali: curr.faultyCount ?? 0 });
                  }
                  return acc;
                }, [])}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2D45" vertical={false} />
                <XAxis dataKey="channel" tick={{ fill: '#3D5275', fontSize: 9, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#3D5275', fontSize: 10, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'rgba(30,45,69,0.45)' }} contentStyle={{ background: '#0D1421', border: '1px solid #1E2D45', borderRadius: 6, fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: '#6B84A3' }} />
                <Bar dataKey="aktif" stackId="a" fill="#10B981" name={t('common.active')} />
                <Bar dataKey="bakim" stackId="a" fill="#F59E0B" name={t('common.maintenance')} />
                <Bar dataKey="arizali" stackId="a" fill="#EF4444" radius={[2, 2, 0, 0]} name={i18n.language === 'tr' ? 'Arızalı' : 'Faulty'} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-[#3D5275] text-xs font-mono-val">Veri yok</div>
          )}
        </div>

        {/* Budget by channel */}
        <div className="card p-4">
          <SectionTitle icon={DollarSign} title={t('analytics.charts.budget_analysis')} sub={t('analytics.charts.cost_vs_value')} />
          {budget.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={budget.reduce((acc: any[], curr: any) => {
                  const name = curr.channelName || 'Bilinmeyen';
                  const ex = acc.find(x => x.channel === name.slice(0, 8));
                  if (ex) {
                    ex.maliyet += Number(curr.totalPurchaseCost ?? 0);
                    ex.deger += Number(curr.totalCurrentValue ?? 0);
                  } else {
                    acc.push({ channel: name.slice(0, 8), maliyet: Number(curr.totalPurchaseCost ?? 0), deger: Number(curr.totalCurrentValue ?? 0) });
                  }
                  return acc;
                }, [])}
                margin={{ top: 4, right: 4, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2D45" vertical={false} />
                <XAxis dataKey="channel" tick={{ fill: '#3D5275', fontSize: 9, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#3D5275', fontSize: 9, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false}
                  tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  cursor={{ fill: 'rgba(30,45,69,0.45)' }}
                  contentStyle={{ background: '#0D1421', border: '1px solid #1E2D45', borderRadius: 6, fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  formatter={(v: any) => [`$${Number(v).toLocaleString()}`]}
                />
                <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: '#6B84A3' }} />
                <Bar dataKey="maliyet" fill="#22D3EE" radius={[2, 2, 0, 0]} name={i18n.language === 'tr' ? 'Satın Alma' : 'Purchase'} />
                <Bar dataKey="deger" fill="#10B981" radius={[2, 2, 0, 0]} name={t('analytics.charts.cost_vs_value').split('/')[1].trim()} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-[#3D5275] text-xs font-mono-val">Veri yok</div>
          )}
        </div>
      </div>

      {/* Maintenance forecast */}
      <div className="card p-4">
        <SectionTitle icon={Wrench} title={t('analytics.maintenance.upcoming')} sub={t('analytics.maintenance.next_90_days')} />
        {forecast.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-[#1E2D45]">
                  <th className="py-2 px-3 text-left text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val">{t('analytics.maintenance.table.asset')}</th>
                  <th className="py-2 px-3 text-left text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val">{t('analytics.maintenance.table.type')}</th>
                  <th className="py-2 px-3 text-left text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val">{t('analytics.maintenance.table.channel')}</th>
                  <th className="py-2 px-3 text-left text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val">{t('analytics.maintenance.table.building')}</th>
                  <th className="py-2 px-3 text-left text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val">{t('analytics.maintenance.table.date')}</th>
                  <th className="py-2 px-3 text-left text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val">{t('analytics.maintenance.table.days_left')}</th>
                  <th className="py-2 px-3 text-left text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val">{t('analytics.maintenance.table.warranty')}</th>
                </tr>
              </thead>
              <tbody>
                {forecast.slice((page - 1) * limit, page * limit).map((f: any) => (
                  <tr key={f.assetId} className="border-b border-[#1E2D45] hover:bg-[#131C2E] transition-colors">
                    <td className="py-2.5 px-3 text-xs text-[#E2EAF4]">{f.assetName}</td>
                    <td className="py-2.5 px-3 text-xs text-[#6B84A3]">{f.maintenanceType ?? '-'}</td>
                    <td className="py-2.5 px-3 text-xs text-[#6B84A3]">{f.channelName}</td>
                    <td className="py-2.5 px-3 text-xs text-[#6B84A3]">{f.buildingName}</td>
                    <td className="py-2.5 px-3 text-[10px] text-amber-400 font-mono-val">
                      {f.nextMaintenanceDate ? new Date(f.nextMaintenanceDate).toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : 'en-US') : '-'}
                    </td>
                    <td className="py-2.5 px-3">
                      {f.daysUntilMaintenance != null && (
                        <span className={`text-[10px] font-mono-val font-semibold px-2 py-0.5 rounded ${f.daysUntilMaintenance <= 7 ? 'text-red-400 bg-red-400/10' :
                            f.daysUntilMaintenance <= 30 ? 'text-amber-400 bg-amber-400/10' :
                              'text-green-400 bg-green-400/10'
                          }`}>
                          {f.daysUntilMaintenance}{i18n.language === 'tr' ? 'g' : 'd'}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-[10px] text-[#6B84A3] font-mono-val">
                      {f.warrantyEndDate ? new Date(f.warrantyEndDate).toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : 'en-US') : '-'}
                      {f.daysUntilWarrantyExpiry != null && f.daysUntilWarrantyExpiry <= 90 && (
                        <span className="ml-1 text-red-400">(!)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#1E2D45]">
              <span className="text-[10px] text-[#3D5275] font-mono-val">
                {t('common.page')} {page} / {totalPages} · {i18n.language === 'tr' ? `Toplam ${totalForecast} bakım` : `Total ${totalForecast} maintenance`}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-2.5 py-1 rounded text-[10px] font-mono-val bg-[#131C2E] border border-[#1E2D45] text-[#6B84A3] hover:text-[#E2EAF4] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ‹ Önceki
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                  if (p < 1 || p > totalPages) return null;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={cn(
                        'w-7 h-7 rounded text-[10px] font-mono-val border transition-colors',
                        p === page
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                          : 'bg-[#131C2E] border-[#1E2D45] text-[#6B84A3] hover:text-[#E2EAF4]'
                      )}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-2.5 py-1 rounded text-[10px] font-mono-val bg-[#131C2E] border border-[#1E2D45] text-[#6B84A3] hover:text-[#E2EAF4] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {t('common.next')} ›
                </button>
              </div>
            </div>
          )}
          </>
        ) : (
          <p className="text-center text-[#3D5275] text-sm font-mono-val py-8">
            {t('analytics.maintenance.no_maintenance')}
          </p>
        )}
      </div>
    </div>
  );
}
