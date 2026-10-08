import type { AnyElement } from "@/store/editor";

export type LayoutId = "centered" | "left-stack" | "split" | "grid" | "hero";

export type Suggestion = { id: LayoutId; label: string; hint: string };

export const SUGGESTIONS: Suggestion[] = [
  { id: "centered", label: "Centered", hint: "stacked, middle of canvas" },
  { id: "left-stack", label: "Left stack", hint: "title-led, ragged left" },
  { id: "split", label: "Split", hint: "text left · visuals right" },
  { id: "grid", label: "Grid", hint: "even card grid" },
  { id: "hero", label: "Hero", hint: "one big headline, rest below" },
];

const isTextish = (e: AnyElement): e is Extract<AnyElement, { type: "text" }> => e.type === "text";

/** Deterministic auto-layout: keeps content, restyles composition. */
export function applyLayout(
  els: AnyElement[],
  layout: LayoutId,
  W: number,
  H: number,
): AnyElement[] {
  if (els.length === 0) return els;
  const M = Math.round(Math.min(W, H) * 0.08);
  const texts = els.filter(isTextish);
  const others = els.filter((e) => !isTextish(e));

  const place = (e: AnyElement, x: number, y: number, w: number, h: number): AnyElement => ({
    ...e,
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(Math.max(24, w)),
    height: Math.round(Math.max(24, h)),
  });

  if (layout === "centered" || layout === "left-stack") {
    const colW = layout === "centered" ? Math.round(W * 0.7) : Math.round(W * 0.56);
    const x = layout === "centered" ? (W - colW) / 2 : M;
    const gap = Math.round(H * 0.03);
    const ordered = [...texts, ...others];
    const totalH = ordered.reduce((a, e) => a + e.height, 0) + gap * (ordered.length - 1);
    const startY = layout === "centered" ? Math.max(M, (H - totalH) / 2) : M;
    let y = startY;
    const out: AnyElement[] = [];
    for (const e of ordered) {
      const w = Math.min(colW, e.width === 0 ? colW : Math.max(e.width, colW * 0.5));
      const h = e.height;
      const ex = layout === "centered" ? x + (colW - w) / 2 : x;
      const next = place(e, ex, y, w, h);
      out.push(
        next.type === "text" ? { ...next, align: layout === "centered" ? "center" : "left" } : next,
      );
      y += h + gap;
    }
    return out;
  }

  if (layout === "split") {
    const half = (W - M * 3) / 2;
    const gap = Math.round(H * 0.03);
    let ly = M;
    let ry = M;
    return els.map((e) => {
      if (isTextish(e)) {
        const n = { ...place(e, M, ly, half, e.height), align: "left" as const } as AnyElement;
        ly += e.height + gap;
        return n;
      }
      const n = place(e, M * 2 + half, ry, half, e.height);
      ry += e.height + gap;
      return n;
    });
  }

  if (layout === "grid") {
    const cols = els.length <= 2 ? els.length : els.length <= 6 ? 3 : 4;
    const rows = Math.ceil(els.length / cols);
    const gap = Math.round(Math.min(W, H) * 0.035);
    const cw = (W - M * 2 - gap * (cols - 1)) / cols;
    const ch = (H - M * 2 - gap * (rows - 1)) / rows;
    return els.map((e, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      return place(e, M + c * (cw + gap), M + r * (ch + gap), cw, ch);
    });
  }

  // hero: biggest text huge on top, everything else in a row underneath
  const hero =
    texts
      .slice()
      .sort(
        (a, b) => (b.type === "text" ? b.fontSize : 0) - (a.type === "text" ? a.fontSize : 0),
      )[0] ?? els[0];
  const rest = els.filter((e) => e.id !== hero.id);
  const heroH = Math.round(H * 0.4);
  const out: AnyElement[] = [
    hero.type === "text"
      ? ({
          ...place(hero, M, M, W - M * 2, heroH),
          fontSize: Math.round(Math.min(H * 0.16, hero.fontSize * 1.6)),
          align: "left" as const,
        } as AnyElement)
      : place(hero, M, M, W - M * 2, heroH),
  ];
  const gap = Math.round(W * 0.03);
  const cw = rest.length ? (W - M * 2 - gap * (rest.length - 1)) / rest.length : 0;
  rest.forEach((e, i) => {
    out.push(place(e, M + i * (cw + gap), M + heroH + gap, cw, H - heroH - gap - M * 2));
  });
  return out;
}
