import { newShape, newText, type AnyElement } from "@/store/editor";

/* SmartArt-like diagrams. Every generator returns plain native elements
   (shapes + texts) sharing a groupId: the diagram is selected and moved
   as one, yet each part stays individually editable on the slide. */

const INK = "#0a0f1f";
const FONT = "Inter";

type Box = { x: number; y: number; w: number; h: number };

const label = (o: Box & { text: string; size?: number; color?: string; weight?: number }) =>
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
    align: "center",
    lineHeight: 1.15,
  });

const plate = (
  o: Box & { fill: string; shape?: "rect" | "circle" | "trapezoid" | "ring" | "chevron"; radius?: number },
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
  });

function pyramid(items: string[]): AnyElement[] {
  const widths = [980, 760, 540];
  const fills = ["#2b6bff", "#5b8bff", "#8fb0ff"];
  const els: AnyElement[] = [];
  items.slice(0, 3).forEach((item, i) => {
    const w = widths[i];
    const y = 380 + i * 140;
    els.push(plate({ x: 960 - w / 2, y, w, h: 120, fill: fills[i], shape: "trapezoid" }));
    els.push(label({ x: 960 - w / 2, y: y + 36, w, h: 48, text: item, size: 40, color: "#ffffff" }));
  });
  return els;
}

function cycle(items: string[]): AnyElement[] {
  const els: AnyElement[] = [];
  const centers = [
    [960, 210],
    [1290, 540],
    [960, 870],
    [630, 540],
  ];
  const fills = ["#2b6bff", "#7c5cff", "#00b8a9", "#ff8a3d"];
  els.push(plate({ x: 900, y: 480, w: 120, h: 120, fill: "#eef2ff", shape: "circle" }));
  items.slice(0, 4).forEach((item, i) => {
    const cx = centers[i][0];
    const cy = centers[i][1];
    els.push(plate({ x: cx - 110, y: cy - 110, w: 220, h: 220, fill: fills[i], shape: "circle" }));
    els.push(
      label({ x: cx - 90, y: cy - 56, w: 180, h: 112, text: i + 1 + ". " + item, size: 32, color: "#ffffff" }),
    );
  });
  return els;
}

function timeline(items: string[]): AnyElement[] {
  const els: AnyElement[] = [];
  els.push(plate({ x: 260, y: 534, w: 1400, h: 8, fill: "#cbd5e1" }));
  items.slice(0, 4).forEach((item, i) => {
    const cx = 340 + i * 420;
    els.push(plate({ x: cx - 21, y: 517, w: 42, h: 42, fill: "#2b6bff", shape: "circle" }));
    const above = i % 2 === 0;
    els.push(label({ x: cx - 170, y: above ? 390 : 620, w: 340, h: 90, text: item, size: 34 }));
  });
  return els;
}

function orgchart(root: string, children: string[]): AnyElement[] {
  const els: AnyElement[] = [];
  els.push(plate({ x: 780, y: 200, w: 360, h: 110, fill: "#2b6bff", radius: 12 }));
  els.push(label({ x: 780, y: 236, w: 360, h: 48, text: root, size: 38, color: "#ffffff" }));
  els.push(plate({ x: 957, y: 310, w: 6, h: 96, fill: "#94a3b8" }));
  const kids = children.slice(0, 4);
  const cw = 300;
  const gap = 60;
  const total = kids.length * cw + (kids.length - 1) * gap;
  const x0 = (1920 - total) / 2;
  if (kids.length > 1) {
    els.push(plate({ x: x0 + cw / 2, y: 402, w: total - cw, h: 6, fill: "#94a3b8" }));
  }
  kids.forEach((kid, i) => {
    const x = x0 + i * (cw + gap);
    const cx = x + cw / 2;
    els.push(plate({ x: cx - 3, y: 402, w: 6, h: 118, fill: "#94a3b8" }));
    els.push(plate({ x, y: 520, w: cw, h: 100, fill: "#eef2ff", radius: 12 }));
    els.push(label({ x, y: 556, w: cw, h: 48, text: kid, size: 34 }));
  });
  return els;
}

function process(items: string[]): AnyElement[] {
  const els: AnyElement[] = [];
  const fills = ["#2b6bff", "#5b8bff", "#8fb0ff", "#b8caff"];
  items.slice(0, 4).forEach((item, i) => {
    const x = 200 + i * 400;
    els.push(plate({ x, y: 470, w: 340, h: 140, fill: fills[i], shape: "chevron" }));
    els.push(label({ x: x + 90, y: 512, w: 220, h: 56, text: item, size: 32, color: "#ffffff" }));
  });
  return els;
}

function funnel(items: string[]): AnyElement[] {
  const els: AnyElement[] = [];
  const widths = [1040, 780, 520];
  const fills = ["#2b6bff", "#5b8bff", "#8fb0ff"];
  items.slice(0, 3).forEach((item, i) => {
    const w = widths[i];
    const y = 360 + i * 150;
    els.push(
      newShape("trapezoid", {
        x: 960 - w / 2,
        y,
        width: w,
        height: 130,
        rotation: 180,
        fill: fills[i],
        stroke: "transparent",
        strokeWidth: 0,
      }),
    );
    els.push(label({ x: 960 - w / 2, y: y + 42, w, h: 48, text: item, size: 36, color: "#ffffff" }));
  });
  return els;
}

function matrix(items: string[]): AnyElement[] {
  const els: AnyElement[] = [];
  const fills = ["#2b6bff", "#7c5cff", "#00b8a9", "#ff8a3d"];
  items.slice(0, 4).forEach((item, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 500 + col * 480;
    const y = 320 + row * 320;
    els.push(plate({ x, y, w: 440, h: 280, fill: fills[i], radius: 16 }));
    els.push(label({ x, y: y + 106, w: 440, h: 60, text: item, size: 36, color: "#ffffff" }));
  });
  return els;
}

export type SmartArtPreset = {
  id: string;
  label: string;
  hint: string;
  build: () => AnyElement[];
};

export const SMARTART_PRESETS: SmartArtPreset[] = [
  {
    id: "pyramid",
    label: "Pyramid",
    hint: "3 priority levels",
    build: () => pyramid(["Strategy", "Execution", "Results"]),
  },
  {
    id: "cycle",
    label: "Cycle",
    hint: "4-step loop",
    build: () => cycle(["Plan", "Build", "Launch", "Learn"]),
  },
  {
    id: "timeline",
    label: "Timeline",
    hint: "4 milestones",
    build: () => timeline(["Kickoff", "Design", "Build", "Ship"]),
  },
  {
    id: "orgchart",
    label: "Org chart",
    hint: "Tree hierarchy",
    build: () => orgchart("CEO", ["Product", "Design", "Engineering"]),
  },
  {
    id: "process",
    label: "Process",
    hint: "4-step chevron flow",
    build: () => process(["Discover", "Design", "Develop", "Deliver"]),
  },
  {
    id: "funnel",
    label: "Funnel",
    hint: "3 narrowing stages",
    build: () => funnel(["Leads", "Qualified", "Won"]),
  },
  {
    id: "matrix",
    label: "Matrix 2x2",
    hint: "Four quadrants",
    build: () => matrix(["Do now", "Plan", "Delegate", "Drop"]),
  },
];