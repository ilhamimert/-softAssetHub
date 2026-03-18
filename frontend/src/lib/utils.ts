import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { AssetStatus, AlertType } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Durum renkleri
export function statusColor(status: AssetStatus): string {
  const map: Record<AssetStatus, string> = {
    Active:      'text-green-400',
    Inactive:    'text-slate-400',
    Maintenance: 'text-amber-400',
    Retired:     'text-slate-600',
    Faulty:      'text-red-400',
  };
  return map[status] ?? 'text-slate-400';
}

export function statusBg(status: AssetStatus): string {
  const map: Record<AssetStatus, string> = {
    Active:      'bg-green-400/10 text-green-400 border-green-400/20',
    Inactive:    'bg-slate-400/10 text-slate-400 border-slate-400/20',
    Maintenance: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
    Retired:     'bg-slate-600/10 text-slate-600 border-slate-600/20',
    Faulty:      'bg-red-400/10 text-red-400 border-red-400/20',
  };
  return map[status] ?? 'bg-slate-400/10 text-slate-400';
}

export function alertColor(type: AlertType): string {
  const map: Record<AlertType, string> = {
    Critical: 'text-red-400',
    Warning:  'text-amber-400',
    Info:     'text-cyan-400',
  };
  return map[type];
}

export function alertBg(type: AlertType): string {
  const map: Record<AlertType, string> = {
    Critical: 'bg-red-400/10 text-red-400 border-red-400/20',
    Warning:  'bg-amber-400/10 text-amber-400 border-amber-400/20',
    Info:     'bg-cyan-400/10 text-cyan-400 border-cyan-400/20',
  };
  return map[type];
}

// Sıcaklık rengi (Celsius)
export function tempColor(temp: number): string {
  if (temp >= 90) return 'text-red-500';
  if (temp >= 80) return 'text-red-400';
  if (temp >= 70) return 'text-amber-400';
  if (temp >= 60) return 'text-yellow-400';
  return 'text-green-400';
}

// Kullanım yüzdesi rengi
export function usageColor(pct: number): string {
  if (pct >= 95) return 'text-red-400';
  if (pct >= 80) return 'text-amber-400';
  if (pct >= 60) return 'text-yellow-400';
  return 'text-green-400';
}

// Para formatlama (Türkçe locale, varsayılan ₺)
export function formatCurrency(value?: number, currency = 'TRY'): string {
  if (value == null) return '-';
  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${value.toLocaleString('tr-TR')} ${currency}`;
  }
}

// Uptime (saniye -> gün saat)
export function formatUptime(seconds?: number): string {
  if (!seconds) return '-';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}g ${h}s`;
  if (h > 0) return `${h}s ${m}d`;
  return `${m}d`;
}

// Tarih formatlama
export function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

export function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function timeAgo(dateStr?: string): string {
  if (!dateStr) return '-';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'Az önce';
  if (mins < 60)  return `${mins} dakika önce`;
  if (hours < 24) return `${hours} saat önce`;
  return `${days} gün önce`;
}

// Asset type label
export function assetTypeLabel(type: string): string {
  const map: Record<string, string> = {
    GPU: 'GPU Kartı', DisplayCard: 'Görüntü Kartı',
    Server: 'Sunucu', Disk: 'Disk', Network: 'Ağ Ekipmanı',
  };
  return map[type] ?? type;
}

// Asset status label (Türkçe)
export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    Active:      'Aktif',
    Inactive:    'İnaktif',
    Maintenance: 'Bakımda',
    Faulty:      'Arızalı',
    Retired:     'Kullanım Dışı',
  };
  return map[status] ?? status;
}

// Maintenance status label (Türkçe)
export function maintenanceStatusLabel(status: string): string {
  const map: Record<string, string> = {
    Completed:  'Tamamlandı',
    Scheduled:  'Planlandı',
    InProgress: 'Devam Ediyor',
    Cancelled:  'İptal Edildi',
  };
  return map[status] ?? status;
}

// Role label (Türkçe)
export function roleLabel(role: string): string {
  const map: Record<string, string> = {
    Admin:      'Admin',
    Manager:    'Yönetici',
    Technician: 'Teknisyen',
    Viewer:     'Görüntüleyici',
  };
  return map[role] ?? role;
}

// Performans skoru rengi
export function perfColor(score?: number): string {
  if (!score) return 'text-slate-500';
  if (score >= 90) return 'text-green-400';
  if (score >= 70) return 'text-yellow-400';
  if (score >= 50) return 'text-amber-400';
  return 'text-red-400';
}

// ─── Power chart helpers ──────────────────────────────────────

/** UTC period string (e.g. "2024-03-15 18:00") → local HH:MM */
export function toLocal(period: string): string {
  const d = new Date(period.replace(' ', 'T') + ':00Z');
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Generate 5 local-time slot labels snapped to 3-hour boundaries */
export function getLocalSlots(): string[] {
  const s = 3 * 60 * 60 * 1000;
  const toMs = Math.floor(Date.now() / s) * s;
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(toMs - (4 - i) * s);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
}

/** Aggregate raw power API rows into chart-ready data */
export function aggregatePowerData(
  rows: Array<{ period?: string; avgPowerW?: number; totalKwh?: number }>,
  slots: string[],
): Array<{ label: string; avgPowerW: number; totalKwh: number }> {
  const map = new Map<string, { sumPow: number; totalKwh: number; n: number }>();
  for (const r of rows) {
    const label = toLocal(r.period ?? '');
    const e = map.get(label) ?? { sumPow: 0, totalKwh: 0, n: 0 };
    e.sumPow += r.avgPowerW ?? 0;
    e.totalKwh += r.totalKwh ?? 0;
    e.n += 1;
    map.set(label, e);
  }
  return slots
    .filter(slot => map.has(slot))
    .map(slot => {
      const e = map.get(slot)!;
      return { label: slot, avgPowerW: Math.round(e.sumPow / e.n), totalKwh: Math.round(e.totalKwh) };
    });
}

/** Shared form input className */
export const inputCls = 'w-full bg-[#131C2E] border border-[#1E2D45] rounded text-xs text-[#E2EAF4] placeholder-[#3D5275] px-3 py-2 outline-none focus:border-amber-500/50 transition-colors';

/** Shared Recharts tooltip content style */
export const CHART_TOOLTIP_STYLE = {
  contentStyle: { background: '#0D1421', border: '1px solid #1E2D45', borderRadius: 6, fontSize: 11, fontFamily: 'JetBrains Mono' },
  labelStyle: { color: '#6B84A3' },
  itemStyle: { color: '#F59E0B' },
} as const;

/** Refetch intervals (ms) */
export const REFETCH = {
  FAST: 15_000,
  NORMAL: 30_000,
  SLOW: 60_000,
  VERY_SLOW: 300_000,
  POWER: 5 * 60 * 1000,
} as const;
