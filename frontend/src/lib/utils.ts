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

// Para formatlama
export function formatCurrency(value?: number, currency = '$'): string {
  if (value == null) return '-';
  return `${currency}${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
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
