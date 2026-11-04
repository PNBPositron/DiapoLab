import { newShape, newText, type AnyElement } from "@/store/editor";

/* SmartArt-like diagrams. Every generator returns plain native elements
   (shapes + texts) sharing a groupId: the diagram is selected and moved
   as one, yet each part stays individually editable on the slide.
   Preset styling: saturated gradients, soft shadows, glass cards and
   polished typography — a deck-ready look out of the box. */

const INK = "#0a0f1f";
const FONT = "Inter";

type Grad = { from: string; to: string; angle: number };
type Shadow = { x: number; y: number; blur: number; color: string };

/* Gradient pairs ordered dark → vivid; picked per step index. */
const GRADS: Grad[] = [
  { from: "#312e81", to: "#6366f1", angle: 135 },
  { from: "#1d4ed8", to: "#38bdf8", angle: 135 },
  { from: "#6d28d9", to: "#a78bfa", angle: 135 },
  { from: "#0f766e", to: "#2dd4bf", angle: 135 },
  { from: "#b45309", to: "#fbbf24", angle: 135 },
  { from: "#be123c", to: "#fb7185", angle: 135 },
];

const gradFor = (i: number, n: number): Grad =>
  GRADS[Math.round((i * (GRADS.length - 1)) / Math.max(n - 1, 1))];

const SOFT_SHADOW: Shadow = { x: 0, y: 14, blur: 34, color: "rgba(15,23,42,0.22)" };
const CARD_SHADOW: Shadow = { x: 0, y: 8, blur: 24, color: "rgba(15,23,42,0.12)" };
const TEXT_ON_GRAD: Shadow = { x: 0, y: 2, blur: 10, color: "rgba(0,0,0,0.35)" };

type Box = { x: number; y: number; w: number; h: number };

const clampCount = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const label = (
  o: Box & {
    text: string;
    size?: number;
    color?: string;
    weight?: number;
    align?: "left" | "center" | "right";
    shadow?: Shadow;
  },
) =>
  newText({
    x: o.x,
    y: o.y,
    width: o.w,
    height: o.h,
    text: o.text,
    fontSize: o.size ?? 36,
    color: o.color ?? INK,
    fontWeight: o.weight ?? 700,
    fontFamily: FONT,
    align: o.align ?? "center",
    lineHeight: 1.15,
    letterSpacing: -0.02,
    ...(o.shadow ? { shadow: o.shadow } : {}),
  });

const plate = (
  o: Box & {
    fill?: string;
    grad?: Grad;
    shape?: "rect" | "circle" | "trapezoid" | "arrow";
    radius?: number;
    opacity?: number;
    stroke?: string;
    strokeWidth?: number;
    shadow?: Shadow;
  },
) =>
  newShape(o.shape ?? "rect", {
    x: o.x,
    y: o.y,
    width: o.w,
    height: o.h,
    fill: o.fill ?? "#ffffff",
    stroke: o.stroke ?? "transparent",
    strokeWidth: o.strokeWidth ?? 0,
    ...(o.grad ? { gradient: o.grad } : {}),
    ...(o.radius ? { cornerRadius: o.radius } : {}),
    ...(o.opacity !== undefined ? { opacity: o.opacity } : {}),
    ...(o.shadow ? { shadow: o.shadow } : {}),
  });

/* Pyramid: gradient levels stacked widest at the base. */
function pyramid(items: string[]): AnyElement[] {
  const n = clampCount(items.length, 2, 5);
  const els: AnyElement[] = [];
  const lh = 110;
  const gap = 18;
  const total = n * lh + (n - 1) * gap;
  const y0 = (1080 - total) / 2;
  items.slice(0, n).forEach((item, i) => {
    const w = 420 + (i * 580) / (n - 1);
    const y = y0 + i * (lh + gap);
    els.push(
      plate({
        x: 960 - w / 2, y, w, h: lh,
        grad: gradFor(i, n - 1), shape: "trapezoid",
        shadow: SOFT_SHADOW,
      }),
    );
    els.push(
      label({
        x: 960 - w / 2, y: y + lh / 2 - 26, w, h: 52,
        text: item, size: 38, color: "#ffffff", weight: 800,
        shadow: TEXT_ON_GRAD,
      }),
    );
  });
  return els;
}

/* Cycle: gradient steps around a glass hub. */
function cycle(items: string[]): AnyElement[] {
  const n = clampCount(items.length, 2, 6);
  const els: AnyElement[] = [];
  const R = n <= 4 ? 330 : 280;
  const d = n <= 3 ? 240 : n === 4 ? 220 : 170;
  const size = n <= 4 ? 32 : 24;
  els.push(
    plate({
      x: 910, y: 490, w: 100, h: 100,
      fill: "#ffffff", shape: "circle",
      stroke: "#e2e8f0", strokeWidth: 2,
      shadow: CARD_SHADOW,
    }),
  );
  items.slice(0, n).forEach((item, i) => {
    const angle = (-90 + (i * 360) / n) * (Math.PI / 180);
    const cx = 960 + R * Math.cos(angle);
    const cy = 540 + R * Math.sin(angle);
    els.push(
      plate({
        x: cx - d / 2, y: cy - d / 2, w: d, h: d,
        grad: gradFor(i, n - 1), shape: "circle",
        shadow: SOFT_SHADOW,
      }),
    );
    els.push(
      label({
        x: cx - d / 2 + 10, y: cy - d / 2 + (d - size * 1.6) / 2, w: d - 20, h: size * 1.6,
        text: i + 1 + ". " + item, size, color: "#ffffff", weight: 800,
        shadow: TEXT_ON_GRAD,
      }),
    );
  });
  return els;
}

/* Timeline: gradient rail, ringed milestone nodes, alternating labels. */
function timeline(items: string[]): AnyElement[] {
  const n = clampCount(items.length, 2, 6);
  const els: AnyElement[] = [];
  els.push(
    plate({
      x: 260, y: 534, w: 1400, h: 10,
      grad: { from: "#64748b", to: "#38bdf8", angle: 90 },
    }),
  );
  const x0 = 320;
  const x1 = 1600;
  items.slice(0, n).forEach((item, i) => {
    const cx = n === 1 ? (x0 + x1) / 2 : x0 + (i * (x1 - x0)) / (n - 1);
    els.push(
      plate({
        x: cx - 27, y: 512, w: 54, h: 54,
        fill: "#ffffff", shape: "circle",
        stroke: "#e2e8f0", strokeWidth: 2,
        shadow: CARD_SHADOW,
      }),
    );
    els.push(
      plate({
        x: cx - 17, y: 522, w: 34, h: 34,
        grad: gradFor(i, n - 1), shape: "circle",
      }),
    );
    const above = i % 2 === 0;
    els.push(
      label({
        x: cx - 170, y: above ? 390 : 620, w: 340, h: 90,
        text: item, size: n <= 4 ? 34 : 28, weight: 800,
      }),
    );
  });
  return els;
}

/* Org chart: gradient root, glass child cards, slate connectors. */
function orgchart(items: string[]): AnyElement[] {
  const kids = items.slice(1);
  const n = clampCount(kids.length, 1, 6);
  const els: AnyElement[] = [];
  els.push(
    plate({
      x: 780, y: 200, w: 360, h: 110,
      grad: GRADS[0], radius: 14,
      shadow: SOFT_SHADOW,
    }),
  );
  els.push(
    label({
      x: 780, y: 236, w: 360, h: 48,
      text: items[0] ?? "Root", size: 38, color: "#ffffff", weight: 800,
      shadow: TEXT_ON_GRAD,
    }),
  );
  els.push(plate({ x: 957, y: 310, w: 6, h: 96, fill: "#94a3b8" }));
  const gap = 50;
  const cw = Math.min(280, (1800 - (n - 1) * gap) / n);
  const total = n * cw + (n - 1) * gap;
  const x0 = (1920 - total) / 2;
  if (n > 1) els.push(plate({ x: x0 + cw / 2, y: 402, w: total - cw, h: 6, fill: "#94a3b8" }));
  kids.slice(0, n).forEach((kid, i) => {
    const x = x0 + i * (cw + gap);
    const cx = x + cw / 2;
    els.push(plate({ x: cx - 3, y: 402, w: 6, h: 118, fill: "#94a3b8" }));
    els.push(
      plate({
        x, y: 520, w: cw, h: 100,
        fill: "#ffffff", radius: 14,
        stroke: "#e2e8f0", strokeWidth: 2,
        shadow: CARD_SHADOW,
      }),
    );
    els.push(label({ x, y: 556, w: cw, h: 48, text: kid, size: cw < 280 ? 30 : 34 }));
  });
  return els;
}

/* Process: gradient arrow flow left to right. */
function process(items: string[]): AnyElement[] {
  const n = clampCount(items.length, 2, 5);
  const els: AnyElement[] = [];
  const aw = 360;
  const ah = 160;
  const step = (1920 - aw) / (n - 1);
  const total = aw + (n - 1) * step;
  const x0 = (1920 - total) / 2;
  items.slice(0, n).forEach((item, i) => {
    const x = x0 + i * step;
    els.push(
      plate({
        x, y: 460, w: aw, h: ah,
        grad: gradFor(i, n - 1), shape: "arrow",
        shadow: SOFT_SHADOW,
      }),
    );
    els.push(
      label({
        x: x + 50, y: 512, w: 200, h: 56,
        text: i + 1 + ". " + item, size: 30, color: "#ffffff", weight: 800,
        shadow: TEXT_ON_GRAD,
      }),
    );
  });
  return els;
}

/* Funnel: gradient narrowing stages, labels on the right. */
function funnel(items: string[]): AnyElement[] {
  const n = clampCount(items.length, 2, 5);
  const els: AnyElement[] = [];
  const lh = 110;
  const gap = 16;
  const total = n * lh + (n - 1) * gap;
  const y0 = (1080 - total) / 2;
  items.slice(0, n).forEach((item, i) => {
    const w = 900 - (i * 600) / (n - 1);
    const y = y0 + i * (lh + gap);
    els.push(
      plate({
        x: 700 - w / 2, y, w, h: lh,
        grad: gradFor(i, n - 1), shape: "trapezoid",
        shadow: SOFT_SHADOW,
      }),
    );
    els.push(
      label({
        x: 1210, y: y + lh / 2 - 26, w: 560, h: 52,
        text: i + 1 + ". " + item, size: 34, align: "left", weight: 800,
      }),
    );
  });
  return els;
}

export type SmartArtPreset = {
  id: string;
  label: string;
  hint: string;
  minItems: number;
  maxItems: number;
  defaultItems: string[];
  build: (items: string[]) => AnyElement[];
};

export const SMARTART_PRESETS: SmartArtPreset[] = [
  {
    id: "pyramid",
    label: "Pyramid",
    hint: "Priority levels",
    minItems: 2,
    maxItems: 5,
    defaultItems: ["Strategy", "Execution", "Results"],
    build: pyramid,
  },
  {
    id: "cycle",
    label: "Cycle",
    hint: "Looping steps",
    minItems: 2,
    maxItems: 6,
    defaultItems: ["Plan", "Build", "Launch", "Learn"],
    build: cycle,
  },
  {
    id: "timeline",
    label: "Timeline",
    hint: "Milestones",
    minItems: 2,
    maxItems: 6,
    defaultItems: ["Kickoff", "Design", "Build", "Ship"],
    build: timeline,
  },
  {
    id: "orgchart",
    label: "Org chart",
    hint: "Root + children",
    minItems: 2,
    maxItems: 7,
    defaultItems: ["CEO", "Product", "Design", "Engineering"],
    build: orgchart,
  },
  {
    id: "process",
    label: "Process",
    hint: "Arrow flow",
    minItems: 2,
    maxItems: 5,
    defaultItems: ["Draft", "Review", "Approve"],
    build: process,
  },
  {
    id: "funnel",
    label: "Funnel",
    hint: "Narrowing stages",
    minItems: 2,
    maxItems: 5,
    defaultItems: ["Visitors", "Leads", "Customers"],
    build: funnel,
  },
];