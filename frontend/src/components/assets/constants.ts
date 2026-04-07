import {
  Server, Package, Building2, Radio, DoorOpen,
} from 'lucide-react';
import type { PhysLevel } from './types';

export const PHYS_API = '/api/v1/hierarchy';

// ─── Level config ─────────────────────────────────────────────
export type LevelCfg = {
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  label: string;
  bg: string;
  border: string;
};

export const LEVEL_CFG: Record<PhysLevel, LevelCfg> = {
  holding:    { Icon: Building2, color: 'text-amber-400',  label: 'Holding',    bg: 'bg-amber-500/10',  border: 'border-amber-500/25' },
  kanal:      { Icon: Radio,     color: 'text-blue-400',   label: 'Kanal',      bg: 'bg-blue-500/10',   border: 'border-blue-500/25' },
  bina:       { Icon: Building2, color: 'text-purple-400', label: 'Bina',       bg: 'bg-purple-500/10', border: 'border-purple-500/25' },
  oda:        { Icon: DoorOpen,  color: 'text-green-400',  label: 'Oda',        bg: 'bg-green-500/10',  border: 'border-green-500/25' },
  bilgisayar: { Icon: Server,    color: 'text-cyan-400',   label: 'Bilgisayar', bg: 'bg-cyan-500/10',   border: 'border-cyan-500/25' },
  eklenti:    { Icon: Package,   color: 'text-gray-400',   label: 'Eklenti',    bg: 'bg-gray-500/10',   border: 'border-gray-500/25' },
};

// ─── Payload fields ───────────────────────────────────────────
export type PayloadField = { key: string; label: string; type: 'text' | 'number' | 'boolean' };

export const PAYLOAD_FIELDS: Partial<Record<PhysLevel, PayloadField[]>> = {
  holding: [
    { key: 'vergiNo', label: 'Vergi No', type: 'text' },
    { key: 'merkez',  label: 'Merkez',   type: 'text' },
    { key: 'sektor',  label: 'Sektör',   type: 'text' },
  ],
  kanal: [
    { key: 'frekans',   label: 'Frekans',      type: 'text' },
    { key: 'yayinTipi', label: 'Yayın Tipi',   type: 'text' },
    { key: 'lisansNo',  label: 'Lisans No',    type: 'text' },
    { key: 'kurulus',   label: 'Kuruluş Yılı', type: 'number' },
  ],
  bina: [
    { key: 'adres',   label: 'Adres',      type: 'text' },
    { key: 'kat',     label: 'Kat Sayısı', type: 'number' },
    { key: 'tip',     label: 'Bina Tipi',  type: 'text' },
    { key: 'telefon', label: 'Telefon',    type: 'text' },
  ],
  oda: [
    { key: 'odaNo',         label: 'Oda No',        type: 'text' },
    { key: 'kat',           label: 'Kat',           type: 'number' },
    { key: 'tip',           label: 'Oda Tipi',      type: 'text' },
    { key: 'kapasite',      label: 'Kapasite',      type: 'number' },
    { key: 'iklimlendirme', label: 'İklimlendirme', type: 'boolean' },
  ],
};
