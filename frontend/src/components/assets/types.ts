// ─── Shared types for Assets feature ─────────────────────────

export interface PhysNode {
  id: string;
  name: string;
  path: string;
  parentId?: string;
  linkedAssetId?: number | null;
  payload?: Record<string, unknown>;
  children: PhysNode[];
}

export interface SqlAsset {
  assetId: number;
  assetCode: string;
  assetName: string;
  isOnline?: boolean;
  status?: string;
}

export interface DragState {
  nodeId: string;
  level: PhysLevel;
}

export const PHYS_LEVELS = ['holding', 'kanal', 'bina', 'oda', 'bilgisayar', 'eklenti'] as const;
export type PhysLevel = typeof PHYS_LEVELS[number];

export const CHILD_OF: Partial<Record<PhysLevel, PhysLevel>> = {
  holding: 'kanal',
  kanal: 'bina',
  bina: 'oda',
  oda: 'bilgisayar',
  bilgisayar: 'eklenti',
};
