import type { PhysNode } from './types';

export const authFetch = (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('accessToken');
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
};

export function matchesSearch(node: PhysNode, term: string): boolean {
  if (node.name.toLowerCase().includes(term.toLowerCase())) return true;
  return node.children?.some(c => matchesSearch(c, term)) ?? false;
}

export function filterTree(nodes: PhysNode[], term: string): PhysNode[] {
  if (!term) return nodes;
  return nodes
    .filter(n => matchesSearch(n, term))
    .map(n => ({ ...n, children: filterTree(n.children ?? [], term) }));
}

export function collectAllIds(nodes: PhysNode[]): string[] {
  const ids: string[] = [];
  for (const n of nodes) {
    ids.push(n.id);
    if (n.children?.length) ids.push(...collectAllIds(n.children));
  }
  return ids;
}

export function findNode(nodes: PhysNode[], id: string): PhysNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findNode(n.children ?? [], id);
    if (found) return found;
  }
  return null;
}
