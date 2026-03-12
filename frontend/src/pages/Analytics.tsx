import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Zap, TrendingUp, DollarSign, Wrench } from 'lucide-react';
import { analyticsApi } from '@/api/client';
import { formatCurrency } from '@/lib/utils';

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
  const today = new Date();
  // Yayın günü dün 21:00'dan bugün 20:59'a kadar (Türkiye saati)
  const from = new Date(today); from.setDate(from.getDate() - 1); from.setHours(21, 0, 0, 0);
  const to = new Date(today); to.setHours(20, 59, 59, 999);

  const { data: powerData } = useQuery({
    queryKey: ['power-chart-3h', today.toDateString()],
    queryFn: () => analyticsApi.getPowerConsumption({
      groupBy: '3hour',
      from: from.toISOString(),
      to: to.toISOString(),
    }),
    refetchInterval: 60 * 60 * 1000, // saatte bir otomatik yenile
    staleTime: 60 * 60 * 1000,
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
  const totalCost = budget.reduce((s, b) => s + (b.totalPurchaseCost ?? 0), 0);
  const totalValue = budget.reduce((s, b) => s + (b.totalCurrentValue ?? 0), 0);
  const totalMaint = budget.reduce((s, b) => s + (b.totalMaintenanceCost ?? 0), 0);

  const todayLabel = today.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="space-y-4 fade-in-up">

      {/* Budget Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Toplam Satın Alma Maliyeti', value: formatCurrency(totalCost), icon: DollarSign, color: 'cyan' },
          { label: 'Güncel Toplam Değer', value: formatCurrency(totalValue), icon: TrendingUp, color: 'green' },
          { label: 'Toplam Bakım Maliyeti', value: formatCurrency(totalMaint), icon: Wrench, color: 'amber' },
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
        <SectionTitle icon={Zap} title="Güç Tüketimi Trendi" sub={`${todayLabel} — 3 Saatlik Ortalama Watt`} />
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
              <Line type="monotone" dataKey="totalkWh" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3, fill: '#F59E0B' }} name="Watt" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-[#3D5275] text-xs font-mono-val">
            Yeterli monitoring verisi yok
          </div>
        )}
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

        {/* Asset Health by Channel */}
        <div className="card p-4">
          <SectionTitle icon={TrendingUp} title="Kanal Sağlık Durumu" sub="Aktif / Bakım / Arızalı" />
          {health.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={health.reduce((acc: any[], curr: any) => {
                  const ex = acc.find(x => x.channel === curr.channelName);
                  if (ex) {
                    ex.aktif += curr.activeCount ?? 0;
                    ex.bakim += curr.maintenanceCount ?? 0;
                    ex.arizali += curr.faultyCount ?? 0;
                  } else {
                    acc.push({ channel: curr.channelName?.slice(0, 8), aktif: curr.activeCount ?? 0, bakim: curr.maintenanceCount ?? 0, arizali: curr.faultyCount ?? 0 });
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
                <Bar dataKey="aktif" stackId="a" fill="#10B981" name="Aktif" />
                <Bar dataKey="bakim" stackId="a" fill="#F59E0B" name="Bakım" />
                <Bar dataKey="arizali" stackId="a" fill="#EF4444" radius={[2, 2, 0, 0]} name="Arızalı" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-[#3D5275] text-xs font-mono-val">Veri yok</div>
          )}
        </div>

        {/* Budget by channel */}
        <div className="card p-4">
          <SectionTitle icon={DollarSign} title="Kanal Bütçe Analizi" sub="Maliyet / Güncel Değer" />
          {budget.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={budget.reduce((acc: any[], curr: any) => {
                  const ex = acc.find(x => x.channel === curr.channelName);
                  if (ex) {
                    ex.maliyet += curr.totalPurchaseCost ?? 0;
                    ex.deger += curr.totalCurrentValue ?? 0;
                  } else {
                    acc.push({ channel: curr.channelName?.slice(0, 8), maliyet: curr.totalPurchaseCost ?? 0, deger: curr.totalCurrentValue ?? 0 });
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
                <Bar dataKey="maliyet" fill="#22D3EE" radius={[2, 2, 0, 0]} name="Satın Alma" />
                <Bar dataKey="deger" fill="#10B981" radius={[2, 2, 0, 0]} name="Güncel Değer" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-[#3D5275] text-xs font-mono-val">Veri yok</div>
          )}
        </div>
      </div>

      {/* Maintenance forecast */}
      <div className="card p-4">
        <SectionTitle icon={Wrench} title="Yaklaşan Bakımlar" sub="Sonraki 90 Gün" />
        {forecast.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-[#1E2D45]">
                  {['Varlık', 'Tür', 'Kanal', 'Bina', 'Bakım Tarihi', 'Kalan Gün', 'Garanti Bitiş'].map(h => (
                    <th key={h} className="py-2 px-3 text-left text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {forecast.slice(0, 15).map((f: any) => (
                  <tr key={f.assetId} className="border-b border-[#1E2D45] hover:bg-[#131C2E] transition-colors">
                    <td className="py-2.5 px-3 text-xs text-[#E2EAF4]">{f.assetName}</td>
                    <td className="py-2.5 px-3 text-xs text-[#6B84A3]">{f.maintenanceType ?? '-'}</td>
                    <td className="py-2.5 px-3 text-xs text-[#6B84A3]">{f.channelName}</td>
                    <td className="py-2.5 px-3 text-xs text-[#6B84A3]">{f.buildingName}</td>
                    <td className="py-2.5 px-3 text-[10px] text-amber-400 font-mono-val">
                      {f.nextMaintenanceDate ? new Date(f.nextMaintenanceDate).toLocaleDateString('tr-TR') : '-'}
                    </td>
                    <td className="py-2.5 px-3">
                      {f.daysUntilMaintenance != null && (
                        <span className={`text-[10px] font-mono-val font-semibold px-2 py-0.5 rounded ${f.daysUntilMaintenance <= 7 ? 'text-red-400 bg-red-400/10' :
                            f.daysUntilMaintenance <= 30 ? 'text-amber-400 bg-amber-400/10' :
                              'text-green-400 bg-green-400/10'
                          }`}>
                          {f.daysUntilMaintenance}g
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-[10px] text-[#6B84A3] font-mono-val">
                      {f.warrantyEndDate ? new Date(f.warrantyEndDate).toLocaleDateString('tr-TR') : '-'}
                      {f.daysUntilWarrantyExpiry != null && f.daysUntilWarrantyExpiry <= 90 && (
                        <span className="ml-1 text-red-400">(!)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-[#3D5275] text-sm font-mono-val py-8">
            Yaklaşan bakım yok (90 gün)
          </p>
        )}
      </div>
    </div>
  );
}
