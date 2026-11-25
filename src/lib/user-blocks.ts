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

export function renameBlock(id: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  persist(loadBlocks().map((b) => (b.id === id ? { ...b, name: trimmed } : b)));
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
  return `${block.elements.length} element${block.elements.length > 1 ? "s" : ""} · ${label}${parts.length > 3 ? "…" : ""}`;
}

// ---- Whole-slide blocks: save a full page (background + elements) and
// re-insert it as a new page in any design. ----

export type SlideBlock = {
  id: string;
  name: string;
  createdAt: number;
  bgColor: string;
  bgImage?: string;
  bgFit?: "cover" | "contain";
  canvasW: number;
  canvasH: number;
  elements: AnyElement[];
};

const SLIDE_KEY = "diapolab.slide-blocks.v1";
const MAX_SLIDE_BLOCKS = 40;

export function loadSlideBlocks(): SlideBlock[] {
  try {
    const raw = localStorage.getItem(SLIDE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SlideBlock[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((b) => b && Array.isArray(b.elements));
  } catch {
    return [];
  }
}

function persistSlides(blocks: SlideBlock[]) {
  try {
    localStorage.setItem(SLIDE_KEY, JSON.stringify(blocks.slice(0, MAX_SLIDE_BLOCKS)));
  } catch {
    /* storage full — slide blocks stay in memory for this session */
  }
}

export function saveSlideBlock(
  name: string,
  page: { bgColor: string; bgImage?: string; bgFit?: "cover" | "contain"; elements: AnyElement[] },
  canvasW: number,
  canvasH: number,
): SlideBlock | null {
  if (!page || !Array.isArray(page.elements)) return null;
  const block: SlideBlock = {
    id: uid(),
    name: name.trim() || `Slide ${loadSlideBlocks().length + 1}`,
    createdAt: Date.now(),
    bgColor: page.bgColor,
    bgImage: page.bgImage,
    bgFit: page.bgFit,
    canvasW,
    canvasH,
    elements: JSON.parse(JSON.stringify(page.elements)) as AnyElement[],
  };
  persistSlides([block, ...loadSlideBlocks()]);
  return block;
}

export function deleteSlideBlock(id: string) {
  persistSlides(loadSlideBlocks().filter((b) => b.id !== id));
}

/** Deep-clone a slide block: fresh element ids, groupId links remapped. */
export function cloneSlideBlock(block: SlideBlock) {
  const clones = JSON.parse(JSON.stringify(block.elements)) as AnyElement[];
  const groupRemap = new Map<string, string>();
  const elements = clones.map((el) => {
    el.id = uid();
    if (el.groupId) {
      if (!groupRemap.has(el.groupId)) groupRemap.set(el.groupId, uid());
      el.groupId = groupRemap.get(el.groupId);
    }
    return el;
  });
  return {
    bgColor: block.bgColor,
    bgImage: block.bgImage,
    bgFit: block.bgFit,
    canvasW: block.canvasW,
    canvasH: block.canvasH,
    elements,
  };
}
