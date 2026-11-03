import { newShape, newText, type AnyElement } from "@/store/editor";

/* SmartArt-like diagrams. Every generator returns plain native elements
   (shapes + texts) sharing a groupId: the diagram is selected and moved
   as one, yet each part stays individually editable on the slide.
   All generators are parametrized by their item labels, so the panel can
   build a custom-sized diagram before inserting it. */

const INK = "#0a0f1f";
const FONT = "Inter";
const FILLS = ["#1e40af", "#2b6bff", "#5b8bff", "#8fb0ff", "#c6d6ff"];

type Box = { x: number; y: number; w: number; h: number };

const clampCount = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const fillFor = (i: number, n: number) => FILLS[Math.round((i * (FILLS.length - 1)) / Math.max(n - 1, 1))];

const label = (
  o: Box & { text: string; size?: number; color?: string; weight?: number; align?: "left" | "center" | "right" },
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
  });

const plate = (
  o: Box & { fill: string; shape?: "rect" | "circle" | "trapezoid" | "arrow"; radius?: number; opacity?: number },
) =>
  newShape(o.shape ?? "rect", {
    x: o.x,
    y: o.y,
    width: o.w,
    height: o.h,
    fill: o.fill,
    stroke: "transparent",
    strokeWidth: 0,
    ...(o.radius ? { cornerRadius: o.radius } : {}),
    ...(o.opacity !== undefined ? { opacity: o.opacity } : {}),
  });

/* Pyramid: levels stacked widest at the base. */
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
    const fi = Math.round((i * (FILLS.length - 1)) / (n - 1));
    els.push(plate({ x: 960 - w / 2, y, w, h: lh, fill: fillFor(i, n), shape: "trapezoid" }));
    els.push(
      label({
        x: 960 - w / 2, y: y + lh / 2 - 24, w, h: 48,
        text: item, size: 38,
        color: fi <= 2 ? "#ffffff" : INK,
      }),
    );
  });
  return els;
}

/* Cycle: steps around a hub. */
function cycle(items: string[]): AnyElement[] {
  const n = clampCount(items.length, 2, 6);
  const els: AnyElement[] = [];
  const R = n <= 4 ? 330 : 280;
  const d = n <= 3 ? 240 : n === 4 ? 220 : 170;
  const size = n <= 4 ? 32 : 24;
  els.push(plate({ x: 910, y: 490, w: 100, h: 100, fill: "#eef2ff", shape: "circle" }));
  items.slice(0, n).forEach((item, i) => {
    const angle = (-90 + (i * 360) / n) * (Math.PI / 180);
    const cx = 960 + R * Math.cos(angle);
    const cy = 540 + R * Math.sin(angle);
    els.push(plate({ x: cx - d / 2, y: cy - d / 2, w: d, h: d, fill: fillFor(i, n - 1), shape: "circle" }));
    els.push(
      label({
        x: cx - d / 2 + 10, y: cy - d / 2 + (d - size * 1.6) / 2, w: d - 20, h: size * 1.6,
        text: i + 1 + ". " + item, size, color: "#ffffff",
      }),
    );
  });
  return els;
}

/* Timeline: milestones along a horizontal line, labels alternating. */
function timeline(items: string[]): AnyElement[] {
  const n = clampCount(items.length, 2, 6);
  const els: AnyElement[] = [];
  els.push(plate({ x: 260, y: 534, w: 1400, h: 8, fill: "#cbd5e1" }));
  const x0 = 320;
  const x1 = 1600;
  items.slice(0, n).forEach((item, i) => {
    const cx = n === 1 ? (x0 + x1) / 2 : x0 + (i * (x1 - x0)) / (n - 1);
    els.push(plate({ x: cx - 21, y: 517, w: 42, h: 42, fill: fillFor(i, n - 1), shape: "circle" }));
    const above = i % 2 === 0;
    els.push(
      label({
        x: cx - 170, y: above ? 390 : 620, w: 340, h: 90,
        text: item, size: n <= 4 ? 34 : 28,
      }),
    );
  });
  return els;
}

/* Org chart: first item is the root, the rest are its children. */
function orgchart(items: string[]): AnyElement[] {
  const kids = items.slice(1);
  const n = clampCount(kids.length, 1, 6);
  const els: AnyElement[] = [];
  els.push(plate({ x: 780, y: 200, w: 360, h: 110, fill: FILLS[0], radius: 12 }));
  els.push(label({ x: 780, y: 236, w: 360, h: 48, text: items[0] ?? "Root", size: 38, color: "#ffffff" }));
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
    els.push(plate({ x, y: 520, w: cw, h: 100, fill: "#eef2ff", radius: 12 }));
    els.push(label({ x, y: 556, w: cw, h: 48, text: kid, size: cw < 280 ? 30 : 34 }));
  });
  return els;
}

/* Process: arrow flow left to right. */
function process(items: string[]): AnyElement[] {
  const n = clampCount(items.length, 2, 5);
  const els: AnyElement[] = [];
  const aw = 360;
  const ah = 160;
  const step = (1920 - aw) / (n - 1) - 0; // spread across the canvas
  const total = aw + (n - 1) * step;
  const x0 = (1920 - total) / 2;
  items.slice(0, n).forEach((item, i) => {
    const x = x0 + i * step;
    els.push(plate({ x, y: 460, w: aw, h: ah, fill: fillFor(i, n - 1), shape: "arrow" }));
    els.push(
      label({
        x: x + 50, y: 512, w: 200, h: 56,
        text: i + 1 + ". " + item, size: 30, color: "#ffffff",
      }),
    );
  });
  return els;
}

/* Funnel: narrowing levels with labels on the right. */
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
    els.push(plate({ x: 700 - w / 2, y, w, h: lh, fill: fillFor(i, n - 1), shape: "trapezoid" }));
    els.push(
      label({
        x: 1210, y: y + lh / 2 - 26, w: 560, h: 52,
        text: i + 1 + ". " + item, size: 34, align: "left",
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