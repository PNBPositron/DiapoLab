// Reusable user blocks ("bibliothèque de composants"): any selection of
// elements can be saved as a named block (header, footer, FlowCraft group…)
// and re-inserted anywhere. Blocks live in localStorage so they survive
// reloads and are available across every design in the same browser.

import type { AnyElement } from "@/store/editor";

export type UserBlock = {
  id: string;
  name: string;
  createdAt: number;
  elements: AnyElement[];
};

const STORAGE_KEY = "diapolab.user-blocks.v1";
const MAX_BLOCKS = 60;

const uid = () => Math.random().toString(36).slice(2, 10);

export function loadBlocks(): UserBlock[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as UserBlock[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((b) => b && Array.isArray(b.elements) && b.elements.length > 0);
  } catch {
    return [];
  }
}

function persist(blocks: UserBlock[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks.slice(0, MAX_BLOCKS)));
  } catch {
    /* storage full or unavailable — blocks stay in memory for this session */
  }
}

/** Save a copy of the given elements as a new named block. */
export function saveBlock(name: string, elements: AnyElement[]): UserBlock | null {
  if (!elements || elements.length === 0) return null;
  const block: UserBlock = {
    id: uid(),
    name: name.trim() || `Block ${loadBlocks().length + 1}`,
    createdAt: Date.now(),
    elements: JSON.parse(JSON.stringify(elements)) as AnyElement[],
  };
  const next = [block, ...loadBlocks()];
  persist(next);
  return block;
}

export function deleteBlock(id: string) {
  persist(loadBlocks().filter((b) => b.id !== id));
}

/** Deep-clone a block's elements with fresh ids (groupId links preserved). */
export function cloneBlockElements(block: UserBlock): AnyElement[] {
  const clones = JSON.parse(JSON.stringify(block.elements)) as AnyElement[];
  const groupRemap = new Map<string, string>();
  return clones.map((el) => {
    el.id = uid();
    if (el.groupId) {
      if (!groupRemap.has(el.groupId)) groupRemap.set(el.groupId, uid());
      el.groupId = groupRemap.get(el.groupId);
    }
    return el;
  });
}

/** Short human summary of a block's content, e.g. "text + shape + chart". */
export function describeBlock(block: UserBlock): string {
  const counts = new Map<string, number>();
  for (const el of block.elements) counts.set(el.type, (counts.get(el.type) ?? 0) + 1);
  const parts = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([type, n]) => (n > 1 ? `${type}×${n}` : type));
  const label = parts.slice(0, 3).join(" + ");
  return `${block.elements.length} élément${block.elements.length > 1 ? "s" : ""} · ${label}${parts.length > 3 ? "…" : ""}`;
}
