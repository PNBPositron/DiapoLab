import type { AnyElement } from "@/store/editor";

/* Designer: slide-aware layout suggestions. Each suggestion rearranges the
   existing elements (position + size only — content and styles are untouched).
   Placement is content-aware: media keeps its aspect ratio (fit + center),
   and text boxes keep their font size while their height grows when the
   width shrinks, so nothing gets squashed or clipped.
   Undo with Ctrl+Z after applying. */

export type PreviewBox = { x: number; y: number; w: number; h: number; kind: "title" | "body" | "media" };
export type LayoutPatch = { id: string; x: number; y: number; width: number; height: number };
export type LayoutSuggestion = {
  id: string;
  label: string;
  description: string;
  preview: PreviewBox[];
  patches: LayoutPatch[];
};

const M = 120;
const W = 1920 - 2 * M;

const box = (x: number, y: number, w: number, h: number, kind: PreviewBox["kind"]): PreviewBox => ({
  x: Math.round(x),
  y: Math.round(y),
  w: Math.round(w),
  h: Math.round(h),
  kind,
});

function stack(
  x: number,
  y: number,
  w: number,
  h: number,
  kinds: PreviewBox["kind"][],
  gap: number,
): PreviewBox[] {
  const n = kinds.length;
  if (n === 0) return [];
  const each = (h - (n - 1) * gap) / n;
  return kinds.map((kind, i) => box(x, y + i * (each + gap), w, each, kind));
}

function grid(
  x: number,
  y: number,
  w: number,
  h: number,
  kinds: PreviewBox["kind"][],
  gap: number,
): PreviewBox[] {
  const n = kinds.length;
  if (n === 0) return [];
  const cols = n <= 1 ? 1 : n <= 4 ? 2 : 3;
  const rows = Math.ceil(n / cols);
  const cw = (w - (cols - 1) * gap) / cols;
  const ch = (h - (rows - 1) * gap) / rows;
  return kinds.map((kind, i) =>
    box(x + (i % cols) * (cw + gap), y + Math.floor(i / cols) * (ch + gap), cw, ch, kind),
  );
}

/* Content-aware placement inside a target region:
   - media (images/videos): contain-fit, aspect ratio preserved, centered
   - text: keep the font size untouched — width becomes the region width
     and the height grows proportionally when the width shrinks, so the
     extra wrapped lines stay visible (capped by the region height)
   - everything else: fill the region exactly */
function place(el: AnyElement, region: PreviewBox): LayoutPatch {
  if (el.type === "image" || el.type === "video") {
    if (el.width <= 0 || el.height <= 0) {
      return { id: el.id, x: region.x, y: region.y, width: region.w, height: region.h };
    }
    const scale = Math.min(region.w / el.width, region.h / el.height);
    const w = Math.round(el.width * scale);
    const h = Math.round(el.height * scale);
    return {
      id: el.id,
      x: region.x + Math.round((region.w - w) / 2),
      y: region.y + Math.round((region.h - h) / 2),
      width: w,
      height: h,
    };
  }
  if (el.type === "text") {
    const grow = el.width > 0 ? el.height * (el.width / region.w) : el.height;
    const h = Math.min(Math.max(el.height, Math.round(grow)), region.h);
    return { id: el.id, x: region.x, y: region.y, width: region.w, height: h };
  }
  return { id: el.id, x: region.x, y: region.y, width: region.w, height: region.h };
}

export function suggestLayouts(elements: AnyElement[]): LayoutSuggestion[] {
  if (elements.length === 0) return [];
  const texts = elements.filter((el) => el.type === "text");
  const title = texts.length
    ? texts.reduce((a, b) => ((b.fontSize ?? 0) > (a.fontSize ?? 0) ? b : a))
    : null;
  const others = elements
    .filter((el) => el !== title)
    .slice()
    .sort((a, b) => b.width * b.height - a.width * a.height);
  const kindOf = (el: AnyElement): PreviewBox["kind"] =>
    el.type === "image" || el.type === "video" ? "media" : "body";
  const kinds = others.map(kindOf);

  const templates: Array<{
    id: string;
    label: string;
    description: string;
    title: PreviewBox;
    cells: PreviewBox[];
  }> = [
    {
      id: "hero-split",
      label: "Hero split",
      description: "Title left, content column right",
      title: box(M, 160, 920, 220, "title"),
      cells: stack(1160, 160, 640, 820, kinds, 24),
    },
    {
      id: "grid",
      label: "Grid",
      description: "Title on top, card grid below",
      title: box(M, 110, W, 150, "title"),
      cells: grid(M, 300, W, 660, kinds, 28),
    },
    {
      id: "centered",
      label: "Centered",
      description: "Centered title and stacked content",
      title: box(360, 200, 1200, 200, "title"),
      cells: stack(460, 470, 1000, 470, kinds, 24),
    },
    {
      id: "rows",
      label: "List rows",
      description: "Full-width rows under the title",
      title: box(M, 140, 1200, 200, "title"),
      cells: stack(M, 420, W, 540, kinds, 24),
    },
    {
      id: "media-hero",
      label: "Media hero",
      description: "Big visual on top, title band below",
      title: box(M, 830, W, 150, "title"),
      cells: grid(M, 120, W, 640, kinds.map(() => "media" as const), 28),
    },
    {
      id: "columns",
      label: "Columns",
      description: "Side-by-side vertical columns",
      title: box(M, 120, W, 160, "title"),
      cells: (() => {
        const cols = Math.min(Math.max(others.length, 1), 3);
        const cw = (W - (cols - 1) * 40) / cols;
        return kinds.map((kind, i) => box(M + i * (cw + 40), 320, cw, 640, kind));
      })(),
    },
  ];

  return templates.map((t) => {
    const patches: LayoutPatch[] = [];
    const preview: PreviewBox[] = [];
    if (title) {
      const p = place(title, t.title);
      patches.push(p);
      preview.push({ x: p.x, y: p.y, w: p.width, h: p.height, kind: "title" });
    }
    others.forEach((el, i) => {
      const region = t.cells[i];
      if (!region) return;
      const p = place(el, region);
      patches.push(p);
      preview.push({ x: p.x, y: p.y, w: p.width, h: p.height, kind: kindOf(el) });
    });
    return {
      id: t.id,
      label: t.label,
      description: t.description,
      preview,
      patches,
    };
  });
}