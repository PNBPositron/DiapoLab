import React, { useEffect, useState } from "react";
import {
  useEditor,
  DEFAULT_FILTERS,
  UI_STYLE_THEMES,
  chartStylePatch,
  quizStylePatch,
  tableStylePatch,
  type ImageFilters,
  type ElementShadow,
  type ShapeElement,
  type ShapeGradient,
  type HoverEffect,
  type QuizElement,
  type QuizOption,
  type ChartElement,
  type TableElement,
  type ButtonElement,
  type ChartKind,
  type ButtonAction,
  type UiStyle,
  type UiKind,
  KEYFRAME_EASINGS,
  type ElementKeyframe,
} from "@/store/editor";
import { useSettings } from "@/store/settings";
import { prepareImage } from "@/lib/image-assets";
import { toEmbedSrc } from "@/store/editor";
import { ELEMENT_ANIMATION_LABELS } from "@/lib/motion-catalog";
import { ColorPicker } from "./ColorPicker";
import { Dropdown } from "./ui/Dropdown";
import {
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  RotateCcw,
  Plus,
  Check,
  Upload,
  MoreHorizontal,
  Palette,
  Play,
  ChevronDown,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Italic,
  Underline,
  Bold,
  List,
  Link2,
  Sliders,
  Type,
  Maximize2,
  Eye,
  EyeOff,
  X,
  ChartColumn,
  ChartLine,
  ChartArea,
  ChartPie,
  Circle,
  FlipHorizontal,
  FlipVertical,
  MousePointer2,
  Hash,
  Crop,
  SlidersHorizontal,
  Lock,
  LockOpen,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
} from "lucide-react";
import { FONTS } from "./panels/TextPanel";
import { OptionGrid, SegmentedControl, ToggleGrid, PanelHeader } from "./ui/selectors";
import { isSafeBrowserUrl } from "@/lib/url-safety";
import { ensureFontFamily } from "@/lib/fontLoader";
import { Button } from "@/components/ui/button";
import { pathFor } from "./ShapeRender";

/** Rotoscope editor: paint a mask over the image, or outline a shape
 *  point by point to cut it out (keep inside / hide outside). Red =
 *  hidden on the slide. The original image is never modified; Apply
 *  stores the mask on the element (re-editable at any time). */
function RotoscopeEditor({
  src,
  initialMask,
  onApply,
  onCancel,
}: {
  src: string;
  initialMask?: string;
  onApply: (maskDataUrl: string) => void;
  onCancel: () => void;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const imgRef = React.useRef<HTMLImageElement | null>(null);
  const maskRef = React.useRef<HTMLCanvasElement | null>(null);
  const tintRef = React.useRef<HTMLCanvasElement | null>(null);
  const drawingRef = React.useRef(false);
  const lastRef = React.useRef<{ x: number; y: number } | null>(null);
  const [brush, setBrush] = useState(40);
  const [mode, setMode] = useState<"erase" | "restore">("erase");
  const [outlineMode, setOutlineMode] = useState(false);
  const [pointCount, setPointCount] = useState(0);
  const pointsRef = React.useRef<{ x: number; y: number }[]>([]);
  const [outlineKeep, setOutlineKeep] = useState(true);

  // composite: original image + red tint of the mask (erase = red)
  const render = () => {
    const c = canvasRef.current;
    const img = imgRef.current;
    const mask = maskRef.current;
    const tint = tintRef.current;
    if (!c || !img || !mask || !tint) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const tctx = tint.getContext("2d");
    if (!tctx) return;
    tctx.globalCompositeOperation = "source-over";
    tctx.clearRect(0, 0, tint.width, tint.height);
    tctx.drawImage(mask, 0, 0);
    tctx.globalCompositeOperation = "source-in";
    tctx.fillStyle = "rgba(244,63,94,0.55)";
    tctx.fillRect(0, 0, tint.width, tint.height);
    ctx.drawImage(tint, 0, 0);
    const pts = pointsRef.current;
    if (pts.length > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      ctx.fillStyle = "rgba(244,63,94,0.30)";
      ctx.fill();
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
      for (const p of pts) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.strokeStyle = "rgba(244,63,94,0.9)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
    }
  };

  React.useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = canvasRef.current;
      if (!c) return;
      const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (ctx) ctx.drawImage(img, 0, 0, w, h);
      imgRef.current = img;
      const mask = maskRef.current ?? document.createElement("canvas");
      mask.width = w;
      mask.height = h;
      maskRef.current = mask;
      const tint = tintRef.current ?? document.createElement("canvas");
      tint.width = w;
      tint.height = h;
      tintRef.current = tint;
      const mctx = mask.getContext("2d");
      if (!mctx) return;
      mctx.clearRect(0, 0, w, h);
      if (initialMask) {
        const m = new Image();
        m.crossOrigin = "anonymous";
        m.onload = () => {
          mctx.drawImage(m, 0, 0, w, h);
          render();
        };
        m.src = initialMask;
      }
      render();
    };
    img.src = src;
  }, [src, initialMask]);

  const paintTo = (clientX: number, clientY: number) => {
    const c = canvasRef.current;
    const mask = maskRef.current;
    if (!c || !mask) return;
    const r = c.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * c.width;
    const y = ((clientY - r.top) / r.height) * c.height;
    const rad = Math.max(1, (brush * (c.width / Math.max(1, r.width))) / 2);
    const mctx = mask.getContext("2d");
    if (!mctx) return;
    mctx.save();
    if (mode === "restore") mctx.globalCompositeOperation = "destination-out";
    const from = lastRef.current ?? { x, y };
    mctx.strokeStyle = "#ffffff";
    mctx.beginPath();
    mctx.moveTo(from.x, from.y);
    mctx.lineTo(x, y);
    mctx.lineWidth = rad * 2;
    mctx.lineCap = "round";
    mctx.lineJoin = "round";
    mctx.stroke();
    mctx.restore();
    lastRef.current = { x, y };
    render();
  };

  const addPoint = (clientX: number, clientY: number) => {
    const c = canvasRef.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * c.width;
    const y = ((clientY - r.top) / r.height) * c.height;
    pointsRef.current = pointsRef.current.concat([{ x, y }]);
    setPointCount(pointsRef.current.length);
    render();
  };

  const undoPoint = () => {
    pointsRef.current = pointsRef.current.slice(0, -1);
    setPointCount(pointsRef.current.length);
    render();
  };

  const closeOutline = () => {
    const mask = maskRef.current;
    const pts = pointsRef.current;
    if (!mask || pts.length < 3) return;
    const mctx = mask.getContext("2d");
    if (!mctx) return;
    mctx.save();
    if (outlineKeep) {
      mctx.globalCompositeOperation = "source-over";
      mctx.fillStyle = "#ffffff";
      mctx.fillRect(0, 0, mask.width, mask.height);
      mctx.globalCompositeOperation = "destination-out";
    } else {
      mctx.globalCompositeOperation = "source-over";
      mctx.fillStyle = "#ffffff";
    }
    mctx.beginPath();
    mctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) mctx.lineTo(pts[i].x, pts[i].y);
    mctx.closePath();
    mctx.fill();
    mctx.restore();
    pointsRef.current = [];
    setPointCount(0);
    render();
  };

  const reset = () => {
    const mask = maskRef.current;
    if (!mask) return;
    mask.getContext("2d")?.clearRect(0, 0, mask.width, mask.height);
    pointsRef.current = [];
    setPointCount(0);
    render();
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex flex-col gap-3 bg-slate-950/95 p-4"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-300">
          Rotoscope mask
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setOutlineMode((v) => !v);
              drawingRef.current = false;
              lastRef.current = null;
            }}
            className={
              "rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition " +
              (outlineMode
                ? "border-amber-400 bg-amber-500/20 text-amber-300"
                : "border-slate-600 text-slate-300 hover:border-slate-400")
            }
          >
            Outline (points)
          </button>
          {outlineMode && (
            <>
              <button
                type="button"
                onClick={() => setOutlineKeep(true)}
                className={
                  "rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition " +
                  (outlineKeep
                    ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                    : "border-slate-600 text-slate-300 hover:border-slate-400")
                }
              >
                Keep shape
              </button>
              <button
                type="button"
                onClick={() => setOutlineKeep(false)}
                className={
                  "rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition " +
                  (!outlineKeep
                    ? "border-rose-400 bg-rose-500/20 text-rose-300"
                    : "border-slate-600 text-slate-300 hover:border-slate-400")
                }
              >
                Hide area
              </button>
              <button
                type="button"
                onClick={undoPoint}
                disabled={pointCount === 0}
                className="rounded-lg border border-slate-600 px-3 py-1.5 text-[11px] font-semibold text-slate-300 transition hover:border-slate-400 disabled:opacity-40"
              >
                Undo point
              </button>
              <button
                type="button"
                onClick={closeOutline}
                disabled={pointCount < 3}
                className="rounded-lg border border-emerald-400 bg-emerald-500/20 px-3 py-1.5 text-[11px] font-semibold text-emerald-300 transition disabled:opacity-40"
              >
                {outlineKeep ? "Cut out shape" : "Hide area"}
              </button>
            </>
          )}
          {!outlineMode && (
            <>
              <button
                type="button"
                onClick={() => setMode("erase")}
                className={
                  "rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition " +
                  (mode === "erase"
                    ? "border-sky-400 bg-sky-500/20 text-sky-300"
                    : "border-slate-600 text-slate-300 hover:border-slate-400")
                }
              >
                Erase
              </button>
              <button
                type="button"
                onClick={() => setMode("restore")}
                className={
                  "rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition " +
                  (mode === "restore"
                    ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                    : "border-slate-600 text-slate-300 hover:border-slate-400")
                }
              >
                Restore
              </button>
              <label className="flex items-center gap-2 text-[10px] font-medium text-slate-300">
                Brush
                <input
                  type="range"
                  min={4}
                  max={200}
                  value={brush}
                  onChange={(e) => setBrush(Number(e.target.value))}
                  className="w-32 accent-sky-500"
                />
              </label>
            </>
          )}
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-slate-600 px-3 py-1.5 text-[11px] font-semibold text-slate-300 transition hover:border-slate-400"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-600 px-3 py-1.5 text-[11px] font-semibold text-slate-300 transition hover:border-slate-400"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              const mask = maskRef.current;
              if (mask) onApply(mask.toDataURL("image/png"));
            }}
            className="rounded-lg bg-sky-600 px-4 py-1.5 text-[11px] font-bold text-white transition hover:bg-sky-500"
          >
            Apply mask
          </button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl border border-slate-700 bg-[repeating-conic-gradient(#1e293b_0%_25%,#0f172a_0%_50%)] bg-[length:24px_24px]">
        <canvas
          ref={canvasRef}
          className="max-h-full max-w-full cursor-crosshair touch-none"
          onPointerDown={(e) => {
            if (outlineMode) {
              e.preventDefault();
              addPoint(e.clientX, e.clientY);
              return;
            }
            e.currentTarget.setPointerCapture(e.pointerId);
            drawingRef.current = true;
            lastRef.current = null;
            paintTo(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (drawingRef.current) paintTo(e.clientX, e.clientY);
          }}
          onPointerUp={() => {
            drawingRef.current = false;
            lastRef.current = null;
          }}
          onPointerLeave={() => {
            drawingRef.current = false;
            lastRef.current = null;
          }}
        />
      </div>
      <p className="text-center text-[10px] text-slate-400">
        Brush mode: paint with Erase (red = hidden on the slide) or Restore to bring pixels back.
        Outline mode: click to drop points around the shape, then Cut out shape to keep the outlined
        area and hide everything outside (or switch to Hide area to hide the outlined zone instead).
        Use Reset to start over, then Apply mask. The original image is kept.
      </p>
    </div>
  );
}

const FONT_FAMILIES: string[] = Array.from(
  new Set(["Inter", "Orbitron", "JetBrains Mono", "Georgia", ...FONTS.map((f) => f.family)]),
).sort();

/** UI kinds whose "items" list carries editable text (tabs, sidebar entries, lines…). */
const UI_ITEMS_KINDS = new Set([
  "list",
  "pricing",
  "window",
  "browser",
  "terminal",
  "phone",
  "modal",
  "tabs",
  "toggle",
  "login",
  "taskbar",
  "vtabs",
  "timeline",
  "rating",
]);
/** Single chrome captions per UI kind (search pill, new-tab button, submit button). */
const UI_CAPTION_DEFAULTS: Partial<Record<UiKind, string>> = {
  taskbar: "Search",
  vtabs: "+ New tab",
  login: "Continue",
};

const MASK_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "None" },
  { value: "circle", label: "Circle" },
  { value: "squircle", label: "Squircle" },
  { value: "arch", label: "Arch" },
  { value: "hexagon", label: "Hexagon" },
  { value: "pentagon", label: "Pentagon" },
  { value: "octagon", label: "Octagon" },
  { value: "triangle", label: "Triangle" },
  { value: "diamond", label: "Diamond" },
  { value: "star", label: "Star" },
  { value: "heart", label: "Heart" },
  { value: "blob", label: "Blob" },
  { value: "moon", label: "Moon" },
  { value: "leaf", label: "Leaf" },
  { value: "shield", label: "Shield" },
  { value: "capsule", label: "Capsule" },
  { value: "wave", label: "Wave" },
  { value: "cloud", label: "Cloud" },
];

/** Visual grid picker for image/shape/text masks — real SVG previews per shape. */
function MaskPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-6 gap-1.5">
      {MASK_OPTIONS.map((opt) => {
        const active = value === opt.value;
        const d = opt.value ? pathFor(opt.value as never) : null;
        const fill = active ? "#0284c7" : "#475569";
        return (
          <button
            key={opt.label}
            type="button"
            title={opt.label}
            aria-label={"Shape mask: " + opt.label}
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={
              "grid aspect-square place-items-center rounded-lg border transition " +
              (active
                ? "border-sky-500 bg-sky-50/60 ring-2 ring-sky-500/20"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50")
            }
          >
            {!opt.value ? (
              <svg viewBox="0 0 100 100" className="size-5" aria-hidden="true">
                <rect
                  x="10"
                  y="10"
                  width="80"
                  height="80"
                  rx="10"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="7"
                  strokeDasharray="12 10"
                />
              </svg>
            ) : d ? (
              <svg viewBox="0 0 100 100" className="size-5" aria-hidden="true">
                <path d={d} fill={fill} />
              </svg>
            ) : opt.value === "circle" ? (
              <svg viewBox="0 0 100 100" className="size-5" aria-hidden="true">
                <circle cx="50" cy="50" r="46" fill={fill} />
              </svg>
            ) : opt.value === "triangle" ? (
              <svg viewBox="0 0 100 100" className="size-5" aria-hidden="true">
                <polygon points="50,4 96,96 4,96" fill={fill} />
              </svg>
            ) : (
              <svg viewBox="0 0 100 100" className="size-5" aria-hidden="true">
                <polygon
                  points="50,3 61,35 98,35 68,57 79,97 50,73 21,97 32,57 2,35 39,35"
                  fill={fill}
                />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}

const SHAPE_EFFECTS: Array<{ value: ShapeElement["effect"]; label: string }> = [
  { value: "none", label: "None" },
  { value: "liquid_glass", label: "Liquid Glass" },
  { value: "neon", label: "Neon" },
  { value: "soft_shadow", label: "Soft Shadow" },
  { value: "inner_glow", label: "Inner Glow" },
];

const IMAGE_FILTER_PRESETS: Array<{
  name: string;
  description: string;
  filters: ImageFilters;
  preview: string;
}> = [
  { name: "Original", description: "Clean", filters: { ...DEFAULT_FILTERS }, preview: "none" },
  {
    name: "Noir",
    description: "High contrast",
    filters: { ...DEFAULT_FILTERS, grayscale: 100, contrast: 135, brightness: 92 },
    preview: "grayscale(1) contrast(1.35) brightness(.92)",
  },
  {
    name: "Vintage",
    description: "Warm film",
    filters: { ...DEFAULT_FILTERS, sepia: 42, contrast: 108, saturate: 82, brightness: 104 },
    preview: "sepia(.42) contrast(1.08) saturate(.82) brightness(1.04)",
  },
  {
    name: "Faded",
    description: "Soft light",
    filters: { ...DEFAULT_FILTERS, contrast: 82, saturate: 70, brightness: 116 },
    preview: "contrast(.82) saturate(.7) brightness(1.16)",
  },
  {
    name: "Crisp",
    description: "Punchy detail",
    filters: { ...DEFAULT_FILTERS, contrast: 132, saturate: 122, brightness: 98 },
    preview: "contrast(1.32) saturate(1.22) brightness(.98)",
  },
  {
    name: "Sunset",
    description: "Warm glow",
    filters: { ...DEFAULT_FILTERS, sepia: 24, hueRotate: -12, saturate: 135, brightness: 106 },
    preview: "sepia(.24) hue-rotate(-12deg) saturate(1.35) brightness(1.06)",
  },
  {
    name: "Glitch",
    description: "RGB split & distort",
    filters: { ...DEFAULT_FILTERS, glitch: 55 },
    preview: "none",
  },
  {
    name: "VHS",
    description: "Retro tape",
    filters: { ...DEFAULT_FILTERS, glitch: 35, saturate: 135, contrast: 112, hueRotate: -8 },
    preview: "saturate(1.35) contrast(1.12) hue-rotate(-8deg)",
  },
  {
    name: "Golden",
    description: "Golden hour",
    filters: { ...DEFAULT_FILTERS, temperature: 60, saturate: 118, brightness: 103 },
    preview: "sepia(.21) saturate(1.18) brightness(1.03)",
  },
];

const BLEND_MODES = ["normal", "multiply", "screen", "overlay", "darken", "lighten", "soft-light"];

const ASPECT_RATIOS: Array<{ label: string; value: number }> = [
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "16:9", value: 16 / 9 },
  { label: "9:16", value: 9 / 16 },
  { label: "4:5", value: 4 / 5 },
];

const SWATCHES = [
  "#000000",
  "#ffffff",
  "#0ea5e9",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#10b981",
  "#06b6d4",
  "#64748b",
];

// Compact color control for tight rows (gradients): a swatch button that
// opens the full app ColorPicker in a popover — replaces the native
// input[type=color] everywhere.
function ColorSwatchPopover({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (hex: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={() => setOpen((o) => !o)}
        className="size-6 shrink-0 cursor-pointer rounded-md border border-slate-200 shadow-2xs"
        style={{ background: value }}
      />
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 z-50 mb-1.5 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
            <ColorPicker value={value} onChange={onChange} />
          </div>
        </>
      )}
    </div>
  );
}

// --- MODERN UI PRIMITIVES ---

function Section({
  title,
  defaultOpen = true,
  badge,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="inspector-section border-b border-selector-border pb-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-3.5 py-2.5 text-left transition hover:bg-slate-50/80"
      >
        <span className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-slate-700">
          {title}
        </span>
        <div className="flex items-center gap-2">
          {badge}
          <ChevronDown
            className={`size-3.5 text-slate-400 transition-transform duration-200 ${
              open ? "rotate-180 text-slate-600" : ""
            }`}
          />
        </div>
      </button>
      {open && <div className="space-y-3.5 border-t border-slate-100 p-3.5">{children}</div>}
    </div>
  );
}

function Field({
  label,
  children,
  inline = false,
}: {
  label: string;
  children: React.ReactNode;
  inline?: boolean;
}) {
  if (inline) {
    return (
      <div className="flex items-center justify-between gap-3">
        <label className="text-[11px] font-medium text-slate-600">{label}</label>
        <div className="flex items-center">{children}</div>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium text-slate-600">{label}</label>
      <div>{children}</div>
    </div>
  );
}

function SliderWithInput({
  label,
  min,
  max,
  step = 1,
  value,
  unit = "",
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  unit?: string;
  onChange: (val: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-medium text-slate-600">{label}</span>
        <div className="flex items-center rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-700 shadow-2xs">
          <span>{value}</span>
          <span className="ml-0.5 text-slate-400">{unit}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(+e.target.value)}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-sky-600 transition hover:bg-slate-300"
        />
      </div>
    </div>
  );
}

function ModernColorPicker({
  value,
  onChange,
  label,
  opacity,
  onOpacityChange,
}: {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  opacity?: number;
  onOpacityChange?: (v: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasOpacity = opacity !== undefined && !!onOpacityChange;
  return (
    <div className="space-y-2">
      {label && <label className="text-[11px] font-medium text-slate-600">{label}</label>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`size-8 shrink-0 rounded-lg border shadow-2xs transition ${
            open ? "border-sky-500 ring-2 ring-sky-500/20" : "border-slate-200 hover:border-sky-400"
          }`}
          style={{ backgroundColor: value || "#000000", opacity: opacity ?? 1 }}
          title="Open color picker"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="h-8 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 font-mono text-xs text-slate-800 shadow-2xs focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
        />
        {hasOpacity && (
          <div className="flex items-center rounded-md border border-slate-200 bg-white px-1.5 py-1 font-mono text-[10px] text-slate-700 shadow-2xs">
            <input
              type="number"
              min={0}
              max={100}
              value={Math.round((opacity ?? 1) * 100)}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (Number.isFinite(val)) onOpacityChange!(Math.min(1, Math.max(0, val / 100)));
              }}
              className="w-9 border-0 bg-transparent text-center outline-none"
            />
            <span className="text-slate-400">%</span>
          </div>
        )}
      </div>
      {open && (
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
          <ColorPicker
            value={value}
            onChange={onChange}
            opacity={opacity}
            onOpacityChange={onOpacityChange}
          />
          <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2.5">
            {SWATCHES.map((swatch) => (
              <button
                key={swatch}
                type="button"
                onClick={() => onChange(swatch)}
                className={`size-5 rounded-md border border-slate-200/80 transition ${
                  value.toLowerCase() === swatch.toLowerCase()
                    ? "ring-2 ring-blue-600 ring-offset-1"
                    : "hover:border-slate-400"
                }`}
                style={{ backgroundColor: swatch }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- MAIN PROPERTIES COMPONENT ---

export function PropertiesPanel() {
  const {
    elements,
    selectedId,
    update,
    remove,
    duplicate,
    bringForward,
    sendBackward,
    alignSelected,
    distributeSelected,
  } = useEditor();
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [colorPaletteOpen, setColorPaletteOpen] = useState(false);
  const [imageFilterOpen, setImageFilterOpen] = useState(false);
  const [rotoscopeOpen, setRotoscopeOpen] = useState(false);
  const [jsonDraft, setJsonDraft] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [jsonDirty, setJsonDirty] = useState(false);
  const [ratioLock, setRatioLock] = useState(true);
  const [selectedKf, setSelectedKf] = useState<string | null>(null);
  const [kfDrag, setKfDrag] = useState<string | null>(null);
  const kfTrackRef = React.useRef<HTMLDivElement | null>(null);
  const croppingId = useEditor((s) => s.croppingId);

  const el = elements.find((e) => e.id === selectedId);

  // Double-clicking an element on the canvas opens this inspector.
  useEffect(() => {
    const onOpen = () => setAdvancedOpen(true);
    window.addEventListener("diapolab:open-inspector", onOpen);
    return () => window.removeEventListener("diapolab:open-inspector", onOpen);
  }, []);

  // Reset popovers + JSON draft ONLY when the selection changes — not on
  // every property edit. Reading the element via getState() avoids putting
  // `el` in the deps (a new object reference on each update would re-run
  // this effect and collapse the inspector while editing).
  useEffect(() => {
    setAdvancedOpen(false);
    setColorPaletteOpen(false);
    setImageFilterOpen(false);
    setJsonError(null);
    const current = useEditor.getState().elements.find((e) => e.id === selectedId);
    setJsonDraft(current ? JSON.stringify(current, null, 2) : "");
    setJsonDirty(false);
  }, [selectedId]);

  // Keep the JSON draft in sync while the user is not editing it, so changes
  // made from the regular controls also show up in the JSON view.
  useEffect(() => {
    if (jsonDirty || !el) return;
    const next = JSON.stringify(el, null, 2);
    setJsonDraft((draft) => (draft === next ? draft : next));
  }, [el, jsonDirty]);

  if (!el) return null;

  // ---- Element JSON: explicit apply instead of per-keystroke updates ----
  const applyJson = () => {
    try {
      const parsed = JSON.parse(jsonDraft) as Record<string, unknown>;
      if (typeof parsed !== "object" || parsed === null) throw new Error("Expected a JSON object");
      if (parsed.id !== el.id || parsed.type !== el.type)
        throw new Error("id and type cannot be changed");
      const { id: _id, type: _type, ...patch } = parsed;
      update(el.id, patch as Partial<typeof el>);
      setJsonError(null);
      setJsonDirty(false);
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : "Invalid JSON");
    }
  };
  const formatJson = () => {
    try {
      setJsonDraft(JSON.stringify(JSON.parse(jsonDraft), null, 2));
      setJsonError(null);
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : "Invalid JSON");
    }
  };
  const resetJson = () => {
    setJsonDraft(JSON.stringify(el, null, 2));
    setJsonDirty(false);
    setJsonError(null);
  };

  // ---- Keyframe animation helpers ----
  const kfs = (el.keyframes ?? []) as ElementKeyframe[];
  const setKfs = (next: ElementKeyframe[]) =>
    update(el.id, { keyframes: next.length ? next : undefined } as never);
  const captureState = (t: number): ElementKeyframe => {
    // Full JSON snapshot of the element (single source of truth for
    // "Go to"): every property is captured and restored, whatever the
    // object type. Keyframe metadata is stripped to avoid recursion.
    const snapshot = JSON.parse(JSON.stringify(el)) as Record<string, unknown>;
    delete snapshot.keyframes;
    delete snapshot.keyframeDuration;
    // make "no shadow" explicit so Go to can also remove a shadow
    snapshot.shadow = el.shadow ? { ...el.shadow } : undefined;
    return {
      id: crypto.randomUUID(),
      t,
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.height,
      rotation: el.rotation,
      opacity: (el as { opacity?: number }).opacity ?? 1,
      easing: sortedKfs[sortedKfs.length - 1]?.easing,
      shadow: el.shadow ? { ...el.shadow } : undefined,
      filters:
        "filters" in el && (el as { filters?: Partial<ImageFilters> }).filters
          ? { ...DEFAULT_FILTERS, ...(el as { filters?: Partial<ImageFilters> }).filters }
          : undefined,
      effect: "effect" in el ? (el as { effect?: ElementKeyframe["effect"] }).effect : undefined,
      snapshot,
    };
  };
  const sortedKfs = [...kfs].sort((a, b) => a.t - b.t);
  const kfTotal =
    el.keyframeDuration ?? Math.max(2000, sortedKfs.length ? sortedKfs[sortedKfs.length - 1].t : 0);
  const kfTimeAt = (clientX: number) => {
    const rect = kfTrackRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.round((pct * kfTotal) / 50) * 50;
  };
  // Quick Bar (floating, contextual & immediate)
  const floatingHUD = (
    <div className="pointer-events-none fixed left-1/2 top-[3.75rem] z-30 -translate-x-1/2 animate-in slide-in-from-top-2 duration-200">
      <div className="floating-hud studio-dock pointer-events-auto flex items-center gap-1 px-2 py-1">
        {/* Type tag */}
        <span className="px-2 py-0.5 text-xs font-semibold capitalize text-slate-600">
          {el.type}
        </span>

        {el.type === "text" && (
          <>
            {/* Color */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setColorPaletteOpen(!colorPaletteOpen)}
                className={`grid size-7 place-items-center rounded-md transition ${
                  colorPaletteOpen ? "!bg-slate-100 ring-2 ring-blue-600/20" : ""
                }`}
                title="Text color"
              >
                <div
                  className="size-4 rounded border border-slate-300"
                  style={{ backgroundColor: el.color, opacity: el.opacity ?? 1 }}
                />
              </button>
              {colorPaletteOpen && (
                <div className="absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 shadow-xl animate-in slide-in-from-top-2 duration-150">
                  <ModernColorPicker
                    value={el.color}
                    onChange={(c) => update(el.id, { color: c })}
                    opacity={el.opacity ?? 1}
                    onOpacityChange={(v) => update(el.id, { opacity: v })}
                  />
                </div>
              )}
            </div>

            {/* Bold / Italic */}
            <div className="flex h-7 items-center gap-0.5 rounded-md bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() =>
                  update(el.id, { fontWeight: (el.fontWeight ?? 400) >= 700 ? 400 : 700 })
                }
                className={`grid size-6 place-items-center rounded text-slate-500 transition hover:text-slate-900 ${
                  (el.fontWeight ?? 400) >= 700 ? "bg-white text-slate-900 shadow-2xs" : ""
                }`}
                title="Bold"
              >
                <Bold className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => update(el.id, { italic: !el.italic })}
                className={`grid size-6 place-items-center rounded text-slate-500 transition hover:text-slate-900 ${
                  el.italic ? "bg-white text-slate-900 shadow-2xs" : ""
                }`}
                title="Italic"
              >
                <Italic className="size-3.5" />
              </button>
            </div>

            {/* Align */}
            <div className="flex h-7 items-center gap-0.5 rounded-md bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => update(el.id, { align: "left" })}
                className={`grid size-6 place-items-center rounded text-slate-500 transition hover:text-slate-900 ${
                  (el.align ?? "left") === "left" ? "bg-white text-slate-900 shadow-2xs" : ""
                }`}
                title="Align left"
              >
                <AlignLeft className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => update(el.id, { align: "center" })}
                className={`grid size-6 place-items-center rounded text-slate-500 transition hover:text-slate-900 ${
                  (el.align ?? "left") === "center" ? "bg-white text-slate-900 shadow-2xs" : ""
                }`}
                title="Align center"
              >
                <AlignCenter className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => update(el.id, { align: "right" })}
                className={`grid size-6 place-items-center rounded text-slate-500 transition hover:text-slate-900 ${
                  (el.align ?? "left") === "right" ? "bg-white text-slate-900 shadow-2xs" : ""
                }`}
                title="Align right"
              >
                <AlignRight className="size-3.5" />
              </button>
            </div>

            {/* Font size stepper */}
            <div className="flex h-7 items-center rounded-md bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => update(el.id, { fontSize: Math.max(12, el.fontSize - 1) })}
                className="grid size-6 place-items-center rounded text-slate-500 hover:bg-white hover:text-slate-900"
              >
                <Minus className="size-3" />
              </button>
              <input
                type="number"
                min={12}
                max={240}
                value={el.fontSize}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (Number.isFinite(val))
                    update(el.id, { fontSize: Math.min(240, Math.max(12, val)) });
                }}
                className="w-9 appearance-none border-0 bg-transparent text-center font-mono text-xs font-semibold text-slate-800 outline-none"
              />
              <button
                type="button"
                onClick={() => update(el.id, { fontSize: Math.min(240, el.fontSize + 1) })}
                className="grid size-6 place-items-center rounded text-slate-500 hover:bg-white hover:text-slate-900"
              >
                <Plus className="size-3" />
              </button>
            </div>
          </>
        )}

        {el.type === "shape" && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setColorPaletteOpen(!colorPaletteOpen)}
              className={`grid size-8 place-items-center rounded-md transition hover:bg-slate-100 ${colorPaletteOpen ? "bg-slate-100 ring-2 ring-blue-500/20" : ""}`}
              title="Shape color"
            >
              <div
                className="size-4 rounded-sm border border-slate-300 shadow-xs"
                style={{ backgroundColor: el.fill ?? "#0ea5e9", opacity: el.opacity ?? 1 }}
              />
            </button>
            {colorPaletteOpen && (
              <div className="absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                <ModernColorPicker
                  value={el.fill ?? "#0ea5e9"}
                  onChange={(color) => update(el.id, { fill: color })}
                  opacity={el.opacity ?? 1}
                  onOpacityChange={(opacity) => update(el.id, { opacity })}
                />
              </div>
            )}
          </div>
        )}

        {el.type === "image" && (
          <>
            <button
              type="button"
              onClick={() =>
                useEditor.getState().setCroppingId(croppingId === el.id ? null : el.id)
              }
              className={`grid size-8 place-items-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 ${croppingId === el.id ? "bg-blue-100 text-blue-700 ring-2 ring-blue-500/30" : ""}`}
              title="Crop image (double-click to enter crop mode)"
            >
              <Crop className="size-3.5" />
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setImageFilterOpen(!imageFilterOpen)}
                className={`grid size-8 place-items-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 ${imageFilterOpen ? "bg-slate-100 ring-2 ring-blue-500/20" : ""}`}
                title="Image filter"
              >
                <SlidersHorizontal className="size-3.5" />
              </button>
              {imageFilterOpen && (
                <div className="absolute left-1/2 top-full z-50 mt-2 grid w-44 -translate-x-1/2 grid-cols-2 gap-1.5 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                  {IMAGE_FILTER_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        update(el.id, { filters: { ...DEFAULT_FILTERS, ...preset.filters } });
                        setImageFilterOpen(false);
                      }}
                      className="rounded-md border border-slate-100 px-2 py-1.5 text-left text-[10px] text-slate-600 hover:border-blue-300 hover:bg-blue-50"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Universal actions */}
        {/* Layer order */}
        <button
          onClick={() => bringForward(el.id)}
          className="grid size-8 place-items-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          title="Bring forward"
        >
          <ArrowUp className="size-3.5" />
        </button>
        <button
          onClick={() => sendBackward(el.id)}
          className="grid size-8 place-items-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          title="Send backward"
        >
          <ArrowDown className="size-3.5" />
        </button>

        <button
          onClick={() => duplicate(el.id)}
          className="grid size-8 place-items-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          title="Duplicate"
        >
          <Copy className="size-3.5" />
        </button>

        <button
          onClick={() => update(el.id, { rotation: (el.rotation + 90) % 360 })}
          className="grid size-8 place-items-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          title="Rotate 90°"
        >
          <RotateCcw className="size-3.5" />
        </button>

        <button
          onClick={() => update(el.id, { locked: !el.locked } as never)}
          className={`grid size-8 place-items-center rounded-md transition ${
            el.locked
              ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          }`}
          title={
            el.locked ? "Unlock element (allow drag & resize)" : "Lock element (no drag, no resize)"
          }
        >
          {el.locked ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}
        </button>

        <button
          onClick={() => remove(el.id)}
          className="grid size-8 place-items-center rounded-md text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
          title="Delete"
        >
          <Trash2 className="size-3.5" />
        </button>

        <div className="mx-0.5 h-5 w-px bg-slate-200" />

        <button
          onClick={() => setAdvancedOpen(!advancedOpen)}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
            advancedOpen
              ? "bg-slate-900 text-white hover:bg-slate-800"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          <Sliders className="size-3.5" />
          <span>{advancedOpen ? "Hide" : "Inspector"}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {floatingHUD}

      {advancedOpen && (
        <aside className="editor-inspector fixed right-3 top-[4.75rem] bottom-3 z-40 flex w-[280px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_18px_40px_-14px_rgba(15,23,42,0.16)] transition-all duration-200">
          <div className="px-3 pt-3">
            <PanelHeader
              title={
                el.type === "ui"
                  ? "UI Properties"
                  : `${el.type.charAt(0).toUpperCase()}${el.type.slice(1)} Properties`
              }
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 rounded-md text-selector-subtle"
                aria-label="Close inspector"
                title="Close inspector"
                onClick={() => setAdvancedOpen(false)}
              >
                <X />
              </Button>
            </PanelHeader>
          </div>

          {/* Body */}
          <div className="flex-1 space-y-3 overflow-y-auto p-3.5 text-xs text-slate-700">
            {/* POSITION & SIZE — numeric transform, all element types */}
            <Section title="Position & Size">
              <div className="grid grid-cols-2 gap-2">
                {(["x", "y"] as const).map((key) => (
                  <label
                    key={key}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 shadow-2xs"
                  >
                    <span className="w-3 text-[10px] font-bold uppercase text-slate-400">
                      {key}
                    </span>
                    <input
                      type="number"
                      value={Math.round(el[key] as number)}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (Number.isFinite(val)) update(el.id, { [key]: val } as never);
                      }}
                      className="w-full min-w-0 border-0 bg-transparent text-right font-mono text-[11px] text-slate-800 outline-none"
                    />
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 shadow-2xs">
                  <span className="w-3 text-[10px] font-bold uppercase text-slate-400">w</span>
                  <input
                    type="number"
                    min={20}
                    value={Math.round(el.width)}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (!Number.isFinite(val) || val < 20) return;
                      if (ratioLock)
                        update(el.id, {
                          width: val,
                          height: Math.max(20, Math.round((val * el.height) / el.width)),
                        } as never);
                      else update(el.id, { width: val } as never);
                    }}
                    className="w-full min-w-0 border-0 bg-transparent text-right font-mono text-[11px] text-slate-800 outline-none"
                  />
                </label>
                <label className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 shadow-2xs">
                  <span className="w-3 text-[10px] font-bold uppercase text-slate-400">h</span>
                  <input
                    type="number"
                    min={20}
                    value={Math.round(el.height)}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (!Number.isFinite(val) || val < 20) return;
                      if (ratioLock)
                        update(el.id, {
                          height: val,
                          width: Math.max(20, Math.round((val * el.width) / el.height)),
                        } as never);
                      else update(el.id, { height: val } as never);
                    }}
                    className="w-full min-w-0 border-0 bg-transparent text-right font-mono text-[11px] text-slate-800 outline-none"
                  />
                </label>
              </div>
              <SliderWithInput
                label="Rotation"
                min={-180}
                max={180}
                value={Math.round(el.rotation)}
                unit="°"
                onChange={(val) => update(el.id, { rotation: val } as never)}
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-[11px] font-medium text-slate-600">
                  <input
                    type="checkbox"
                    checked={ratioLock}
                    onChange={(e) => setRatioLock(e.target.checked)}
                    className="accent-sky-600"
                  />
                  Lock aspect ratio
                </label>
                <button
                  type="button"
                  onClick={() => update(el.id, { rotation: 0 } as never)}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Reset rotation
                </button>
              </div>
            </Section>

            {/* UI ELEMENTS */}
            {el.type === "ui" && (
              <Section title="Appearance & Content">
                <Field label="Theme Presets">
                  <div className="grid grid-cols-3 gap-1.5">
                    {(Object.keys(UI_STYLE_THEMES) as UiStyle[]).map((s) => {
                      const t = UI_STYLE_THEMES[s];
                      const active = el.uiStyle === s;
                      return (
                        <button
                          key={s}
                          onClick={() => update(el.id, { uiStyle: s, accentColor: t.accent })}
                          className={`rounded-lg border px-2 py-2 text-[10px] font-semibold transition ${
                            active
                              ? "border-sky-500 bg-sky-50/50 text-sky-700 ring-2 ring-sky-500/20"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </Field>
                <Field label="Card Title">
                  <input
                    type="text"
                    value={el.title}
                    onChange={(e) => update(el.id, { title: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-sky-500 focus:outline-none"
                  />
                </Field>
                <Field label="Body Description">
                  <textarea
                    rows={2}
                    value={el.body}
                    onChange={(e) => update(el.id, { body: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-sky-500 focus:outline-none"
                  />
                </Field>
                {(el.items.length > 0 || UI_ITEMS_KINDS.has(el.kind)) && (
                  <Field label="Items (list entries, tabs, lines…)">
                    <div className="space-y-1.5">
                      {el.items.map((it, index) => (
                        <div key={index} className="flex items-center gap-1.5">
                          <input
                            type="text"
                            aria-label={`Item ${index + 1}`}
                            value={it}
                            onChange={(e) =>
                              update(el.id, {
                                items: el.items.map((x, j) => (j === index ? e.target.value : x)),
                              } as never)
                            }
                            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            aria-label="Remove item"
                            onClick={() =>
                              update(el.id, {
                                items: el.items.filter((_, j) => j !== index),
                              } as never)
                            }
                            className="rounded p-1 text-slate-400 hover:text-rose-600"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          update(el.id, {
                            items: [...el.items, `Item ${el.items.length + 1}`],
                          } as never)
                        }
                        className="w-full rounded-lg border border-dashed border-slate-300 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                      >
                        + Add item
                      </button>
                    </div>
                  </Field>
                )}
                {UI_CAPTION_DEFAULTS[el.kind] !== undefined && (
                  <Field
                    label={
                      el.kind === "taskbar"
                        ? "Search label"
                        : el.kind === "vtabs"
                          ? "New tab label"
                          : "Button label"
                    }
                  >
                    <input
                      type="text"
                      value={el.files?.[0] ?? UI_CAPTION_DEFAULTS[el.kind]}
                      onChange={(e) => update(el.id, { files: [e.target.value] } as never)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-sky-500 focus:outline-none"
                    />
                  </Field>
                )}
                {el.kind === "progress" && (
                  <SliderWithInput
                    label="Progress Value"
                    min={0}
                    max={100}
                    value={el.value}
                    unit="%"
                    onChange={(val) => update(el.id, { value: val })}
                  />
                )}
                {el.kind === "stat" && (
                  <Field label="Statistic value">
                    <input
                      type="number"
                      value={el.value}
                      onChange={(e) => update(el.id, { value: Number(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono text-xs tabular-nums focus:border-sky-500 focus:outline-none"
                    />
                  </Field>
                )}
                {el.kind === "clock" && (
                  <>
                    <Field label="Clock display">
                      <div className="grid grid-cols-2 gap-1.5">
                        {(["digital", "analog"] as const).map((mode) => {
                          const active =
                            (el.files?.[0] === "analog" ? "analog" : "digital") === mode;
                          return (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => {
                                const next = [...(el.files ?? ["digital", "24h", "on", "Local"])];
                                next[0] = mode;
                                update(el.id, { files: next } as never);
                              }}
                              className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold capitalize transition ${
                                active
                                  ? "border-sky-500 bg-sky-50/50 text-sky-700"
                                  : "border-slate-200 text-slate-600 hover:border-slate-300"
                              }`}
                            >
                              {mode}
                            </button>
                          );
                        })}
                      </div>
                    </Field>
                    <Field label="Time format & seconds">
                      <div className="grid grid-cols-3 gap-1.5">
                        {(["24h", "12h"] as const).map((fmt) => {
                          const active = (el.files?.[1] === "12h" ? "12h" : "24h") === fmt;
                          return (
                            <button
                              key={fmt}
                              type="button"
                              onClick={() => {
                                const next = [...(el.files ?? ["digital", "24h", "on", "Local"])];
                                next[1] = fmt;
                                update(el.id, { files: next } as never);
                              }}
                              className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition ${
                                active
                                  ? "border-sky-500 bg-sky-50/50 text-sky-700"
                                  : "border-slate-200 text-slate-600 hover:border-slate-300"
                              }`}
                            >
                              {fmt}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...(el.files ?? ["digital", "24h", "on", "Local"])];
                            next[2] = next[2] === "off" ? "on" : "off";
                            update(el.id, { files: next } as never);
                          }}
                          className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition ${
                            el.files?.[2] !== "off"
                              ? "border-sky-500 bg-sky-50/50 text-sky-700"
                              : "border-slate-200 text-slate-600 hover:border-slate-300"
                          }`}
                        >
                          {el.files?.[2] !== "off" ? "Sec on" : "Sec off"}
                        </button>
                      </div>
                    </Field>
                    <Field label="Timezone">
                      <select
                        value={el.files?.[3] || "Local"}
                        onChange={(e) => {
                          const next = [...(el.files ?? ["digital", "24h", "on", "Local"])];
                          next[3] = e.target.value;
                          update(el.id, { files: next } as never);
                        }}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:border-sky-500 focus:outline-none"
                      >
                        <option value="Local">Local browser time</option>
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">New York (ET)</option>
                        <option value="America/Los_Angeles">Los Angeles (PT)</option>
                        <option value="Europe/London">London (GMT/BST)</option>
                        <option value="Europe/Paris">Paris (CET)</option>
                        <option value="Asia/Tokyo">Tokyo (JST)</option>
                        <option value="Australia/Sydney">Sydney (AEST)</option>
                      </select>
                    </Field>
                  </>
                )}
                {el.kind === "timer" && (
                  <Field label="Countdown duration (seconds)">
                    <div className="space-y-1.5">
                      <input
                        type="number"
                        min={10}
                        max={7200}
                        step={15}
                        value={el.value}
                        onChange={(e) =>
                          update(el.id, { value: Math.max(10, Number(e.target.value) || 60) })
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono text-xs tabular-nums focus:border-sky-500 focus:outline-none"
                      />
                      <div className="grid grid-cols-5 gap-1">
                        {[
                          { label: "1m", sec: 60 },
                          { label: "3m", sec: 180 },
                          { label: "5m", sec: 300 },
                          { label: "10m", sec: 600 },
                          { label: "15m", sec: 900 },
                        ].map((preset) => (
                          <button
                            key={preset.sec}
                            type="button"
                            onClick={() => update(el.id, { value: preset.sec })}
                            className={`rounded-md border py-1 text-[10px] font-semibold transition ${
                              el.value === preset.sec
                                ? "border-sky-500 bg-sky-50/50 text-sky-700"
                                : "border-slate-200 text-slate-600 hover:border-slate-300"
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </Field>
                )}
                {el.kind === "counter" && (
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Initial count">
                      <input
                        type="number"
                        value={el.value}
                        onChange={(e) => update(el.id, { value: Number(e.target.value) || 0 })}
                        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 font-mono text-xs tabular-nums focus:border-sky-500 focus:outline-none"
                      />
                    </Field>
                    <Field label="Step">
                      <input
                        type="number"
                        min={1}
                        value={Number(el.files?.[0]) || 1}
                        onChange={(e) =>
                          update(el.id, {
                            files: [String(Math.max(1, Number(e.target.value) || 1))],
                          } as never)
                        }
                        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 font-mono text-xs tabular-nums focus:border-sky-500 focus:outline-none"
                      />
                    </Field>
                  </div>
                )}
                {el.kind === "rating" && (
                  <SliderWithInput
                    label="Default rating"
                    min={1}
                    max={5}
                    value={Math.max(1, Math.min(5, Math.round(el.value || 4)))}
                    unit=" ★"
                    onChange={(val) => update(el.id, { value: val })}
                  />
                )}
                <ModernColorPicker
                  label="Accent Color"
                  value={el.accentColor ?? "#0ea5e9"}
                  onChange={(c) => update(el.id, { accentColor: c })}
                />
              </Section>
            )}

            {/* QR ELEMENT */}
            {el.type === "qr" && (
              <Section title="QR code">
                <Field label="Value / link">
                  <textarea
                    value={el.value}
                    onChange={(e) => update(el.id, { value: e.target.value } as never)}
                    rows={2}
                    className="w-full resize-none rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-sky-500 focus:outline-none"
                  />
                </Field>
                <ModernColorPicker
                  label="Code color"
                  value={el.fgColor}
                  onChange={(c) => update(el.id, { fgColor: c } as never)}
                />
                <ModernColorPicker
                  label="Background"
                  value={el.bgColor}
                  onChange={(c) => update(el.id, { bgColor: c } as never)}
                />
                <Field label="Center logo">
                  <div className="flex items-center gap-2">
                    <label className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-1.5 text-[11px] font-medium text-slate-600 transition hover:border-sky-400 hover:text-sky-700">
                      <Upload className="size-3.5" />
                      {el.centerImage ? "Replace logo" : "Upload logo"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f)
                            void prepareImage(f).then((src) =>
                              update(el.id, { centerImage: src } as never),
                            );
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {el.centerImage && (
                      <button
                        type="button"
                        onClick={() => update(el.id, { centerImage: undefined } as never)}
                        className="grid size-8 place-items-center rounded-lg border border-rose-200 text-rose-500 transition hover:bg-rose-50"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                </Field>
                <p className="text-[10px] leading-snug text-slate-400">
                  Keep the logo small and the contrast high so scanners still read the code.
                </p>
              </Section>
            )}

            {/* CHART ELEMENT */}
            {el.type === "chart" &&
              (() => {
                const ch = el as ChartElement;
                const kinds: Array<{ value: ChartKind; label: string; icon: typeof ChartColumn }> =
                  [
                    { value: "bar", label: "Bars", icon: ChartColumn },
                    { value: "line", label: "Line", icon: ChartLine },
                    { value: "area", label: "Area", icon: ChartArea },
                    { value: "pie", label: "Pie", icon: ChartPie },
                    { value: "donut", label: "Donut", icon: Circle },
                  ];
                return (
                  <Section title="Chart">
                    <Field label="Chart type">
                      <div className="grid grid-cols-5 gap-1.5">
                        {kinds.map(({ value, label, icon: Icon }) => (
                          <button
                            key={value}
                            title={label}
                            onClick={() => update(ch.id, { chart: value } as never)}
                            className={`grid place-items-center rounded-lg border py-2 transition ${
                              ch.chart === value
                                ? "border-sky-500 bg-sky-50/50 text-sky-700 ring-2 ring-sky-500/20"
                                : "border-slate-200 text-slate-500 hover:border-slate-300"
                            }`}
                          >
                            <Icon className="size-4" />
                          </button>
                        ))}
                      </div>
                    </Field>
                    <Field label="Style pack">
                      <div className="grid grid-cols-3 gap-1.5">
                        {(Object.keys(UI_STYLE_THEMES) as UiStyle[]).map((s) => {
                          const t = UI_STYLE_THEMES[s];
                          const active = ch.uiStyle === s;
                          return (
                            <button
                              key={s}
                              onClick={() => update(ch.id, chartStylePatch(s) as never)}
                              className={`rounded-lg border px-2 py-2 text-[10px] font-semibold transition ${
                                active
                                  ? "border-sky-500 bg-sky-50/50 text-sky-700 ring-2 ring-sky-500/20"
                                  : "border-slate-200 hover:border-slate-300"
                              }`}
                            >
                              {t.label}
                            </button>
                          );
                        })}
                      </div>
                    </Field>
                    <Field label="Title">
                      <input
                        type="text"
                        value={ch.title ?? ""}
                        onChange={(e) => update(ch.id, { title: e.target.value } as never)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-sky-500 focus:outline-none"
                      />
                    </Field>
                    <Field label="Data">
                      <div className="space-y-1.5">
                        {ch.data.map((d, i) => (
                          <div key={i} className="flex items-center gap-1">
                            <span
                              className="size-3 shrink-0 rounded-sm border border-slate-200"
                              style={{ background: ch.colors[i % ch.colors.length] }}
                            />
                            <input
                              type="text"
                              aria-label={`Label ${i + 1}`}
                              value={d.label}
                              onChange={(e) =>
                                update(ch.id, {
                                  data: ch.data.map((p, j) =>
                                    j === i ? { ...p, label: e.target.value } : p,
                                  ),
                                } as never)
                              }
                              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-1.5 py-1 text-[11px] focus:border-sky-500 focus:outline-none"
                            />
                            <input
                              type="number"
                              aria-label={`Value ${i + 1}`}
                              value={d.value}
                              onChange={(e) =>
                                update(ch.id, {
                                  data: ch.data.map((p, j) =>
                                    j === i ? { ...p, value: Number(e.target.value) } : p,
                                  ),
                                } as never)
                              }
                              className="w-14 shrink-0 rounded-lg border border-slate-200 px-1.5 py-1 text-right font-mono text-[11px] focus:border-sky-500 focus:outline-none"
                            />
                            <button
                              type="button"
                              aria-label="Remove data point"
                              disabled={ch.data.length <= 1}
                              onClick={() =>
                                update(ch.id, { data: ch.data.filter((_, j) => j !== i) } as never)
                              }
                              className="rounded p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            update(ch.id, {
                              data: [
                                ...ch.data,
                                { label: `Item ${ch.data.length + 1}`, value: 10 },
                              ],
                            } as never)
                          }
                          className="w-full rounded-lg border border-dashed border-slate-300 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                        >
                          + Add data point
                        </button>
                      </div>
                    </Field>
                    <Field label="Options">
                      <div className="flex flex-wrap gap-3">
                        <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
                          <input
                            type="checkbox"
                            checked={!!ch.showValues}
                            onChange={(e) =>
                              update(ch.id, { showValues: e.target.checked } as never)
                            }
                            className="accent-sky-600"
                          />
                          Show values
                        </label>
                        <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
                          <input
                            type="checkbox"
                            checked={!!ch.showAxes}
                            onChange={(e) => update(ch.id, { showAxes: e.target.checked } as never)}
                            className="accent-sky-600"
                          />
                          Show axes
                        </label>
                      </div>
                    </Field>
                  </Section>
                );
              })()}

            {/* TABLE ELEMENT */}
            {el.type === "table" &&
              (() => {
                const tb = el as TableElement;
                return (
                  <Section title="Table">
                    <Field label="Theme Presets">
                      <div className="grid grid-cols-3 gap-1.5">
                        {(Object.keys(UI_STYLE_THEMES) as UiStyle[]).map((s) => {
                          const t = UI_STYLE_THEMES[s];
                          const active = tb.tableStyle === s;
                          return (
                            <button
                              key={s}
                              onClick={() => update(tb.id, tableStylePatch(s) as never)}
                              className={`rounded-lg border px-2 py-2 text-[10px] font-semibold transition ${
                                active
                                  ? "border-sky-500 bg-sky-50/50 text-sky-700 ring-2 ring-sky-500/20"
                                  : "border-slate-200 hover:border-slate-300"
                              }`}
                            >
                              {t.label}
                            </button>
                          );
                        })}
                      </div>
                    </Field>
                    <Field label="Options">
                      <div className="flex flex-wrap gap-3">
                        <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
                          <input
                            type="checkbox"
                            checked={tb.headerRow}
                            onChange={(e) =>
                              update(tb.id, { headerRow: e.target.checked } as never)
                            }
                            className="accent-sky-600"
                          />
                          Header row
                        </label>
                        <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
                          <input
                            type="checkbox"
                            checked={tb.zebra}
                            onChange={(e) => update(tb.id, { zebra: e.target.checked } as never)}
                            className="accent-sky-600"
                          />
                          Zebra rows
                        </label>
                        <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
                          <input
                            type="checkbox"
                            checked={tb.firstColBold}
                            onChange={(e) =>
                              update(tb.id, { firstColBold: e.target.checked } as never)
                            }
                            className="accent-sky-600"
                          />
                          Bold first column
                        </label>
                      </div>
                    </Field>
                    <Field label="Cells">
                      <div className="space-y-1.5">
                        {tb.rows.map((row, ri) => (
                          <div key={ri} className="flex items-center gap-1">
                            {row.map((cell, ci) => (
                              <input
                                key={ci}
                                type="text"
                                aria-label={`Row ${ri + 1} column ${ci + 1}`}
                                value={cell}
                                onChange={(e) =>
                                  update(tb.id, {
                                    rows: tb.rows.map((r, i) =>
                                      i === ri
                                        ? r.map((c2, j) => (j === ci ? e.target.value : c2))
                                        : r,
                                    ),
                                  } as never)
                                }
                                className="min-w-0 flex-1 rounded-lg border border-slate-200 px-1.5 py-1 text-[11px] focus:border-sky-500 focus:outline-none"
                              />
                            ))}
                            <button
                              type="button"
                              aria-label="Remove row"
                              disabled={tb.rows.length <= 1}
                              onClick={() =>
                                update(tb.id, { rows: tb.rows.filter((_, i) => i !== ri) } as never)
                              }
                              className="rounded p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        ))}
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              update(tb.id, {
                                rows: [...tb.rows, tb.rows[0].map(() => "")],
                              } as never)
                            }
                            className="flex-1 rounded-lg border border-dashed border-slate-300 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                          >
                            + Add row
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              update(tb.id, { rows: tb.rows.map((r) => [...r, ""]) } as never)
                            }
                            className="flex-1 rounded-lg border border-dashed border-slate-300 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                          >
                            + Add column
                          </button>
                          <button
                            type="button"
                            aria-label="Remove last column"
                            disabled={tb.rows[0].length <= 1}
                            onClick={() =>
                              update(tb.id, { rows: tb.rows.map((r) => r.slice(0, -1)) } as never)
                            }
                            className="rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                          >
                            − Col
                          </button>
                        </div>
                      </div>
                    </Field>
                    <SliderWithInput
                      label="Font size"
                      min={10}
                      max={40}
                      value={tb.fontSize}
                      unit="px"
                      onChange={(val) => update(tb.id, { fontSize: val } as never)}
                    />
                    <SliderWithInput
                      label="Cell padding"
                      min={2}
                      max={24}
                      value={tb.cellPadding ?? 12}
                      unit="px"
                      onChange={(val) => update(tb.id, { cellPadding: val } as never)}
                    />
                    <SliderWithInput
                      label="Grid width"
                      min={0}
                      max={3}
                      value={tb.gridWidth ?? 1}
                      unit="px"
                      onChange={(val) => update(tb.id, { gridWidth: val } as never)}
                    />
                    <ModernColorPicker
                      label="Background"
                      value={tb.bgColor}
                      onChange={(c) => update(tb.id, { bgColor: c } as never)}
                    />
                    <ModernColorPicker
                      label="Text"
                      value={tb.fgColor}
                      onChange={(c) => update(tb.id, { fgColor: c } as never)}
                    />
                    <ModernColorPicker
                      label="Header"
                      value={tb.accentColor}
                      onChange={(c) => update(tb.id, { accentColor: c } as never)}
                    />
                  </Section>
                );
              })()}

            {/* QUIZ ELEMENT */}
            {el.type === "quiz" &&
              (() => {
                const q = el as QuizElement;
                const setOpts = (options: QuizElement["options"], correctId = q.correctId) =>
                  update(q.id, { options, correctId } as never);
                return (
                  <Section title="Quiz">
                    <Field label="Mode">
                      <SegmentedControl
                        label="Quiz mode"
                        value={q.mode ?? "quiz"}
                        onChange={(mode) => update(q.id, { mode } as never)}
                        options={[
                          { value: "quiz", label: "Quiz" },
                          { value: "poll", label: "Live poll" },
                        ]}
                      />
                    </Field>
                    <Field label="Visual style">
                      <div className="grid grid-cols-3 gap-1.5">
                        {(Object.keys(UI_STYLE_THEMES) as UiStyle[]).map((style) => (
                          <button
                            key={style}
                            type="button"
                            onClick={() => update(q.id, { ...quizStylePatch(style) } as never)}
                            className={`rounded-lg border px-2 py-2 text-[10px] font-semibold transition ${q.uiStyle === style ? "border-sky-500 bg-sky-50 text-sky-700 ring-2 ring-sky-500/20" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
                          >
                            {UI_STYLE_THEMES[style].label}
                          </button>
                        ))}
                      </div>
                    </Field>
                    <Field label="Effect">
                      <select
                        value={q.effect ?? "none"}
                        onChange={(e) => update(q.id, { effect: e.target.value } as never)}
                        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                      >
                        {SHAPE_EFFECTS.map((effect) => (
                          <option key={effect.value} value={effect.value}>
                            {effect.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Question">
                      <textarea
                        rows={2}
                        aria-label="Quiz question"
                        value={q.question}
                        onChange={(e) => update(q.id, { question: e.target.value } as never)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-sky-500 focus:outline-none"
                      />
                    </Field>
                    <Field
                      label={
                        (q.mode ?? "quiz") === "quiz" ? "Answers (pick the correct one)" : "Options"
                      }
                    >
                      <div className="space-y-1.5">
                        {q.options.map((o, index) => (
                          <div key={o.id} className="flex items-center gap-1.5">
                            {(q.mode ?? "quiz") === "quiz" && (
                              <input
                                type="radio"
                                aria-label={`Correct answer ${index + 1}`}
                                checked={q.correctId === o.id}
                                onChange={() => update(q.id, { correctId: o.id } as never)}
                              />
                            )}
                            <input
                              type="text"
                              aria-label={`Answer ${index + 1}`}
                              value={o.text}
                              onChange={(e) =>
                                setOpts(
                                  q.options.map((x) =>
                                    x.id === o.id ? { ...x, text: e.target.value } : x,
                                  ),
                                )
                              }
                              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none"
                            />
                            <button
                              aria-label="Remove option"
                              disabled={q.options.length <= 2}
                              onClick={() => {
                                const rest = q.options.filter((x) => x.id !== o.id);
                                setOpts(rest, q.correctId === o.id ? rest[0].id : q.correctId);
                              }}
                              className="rounded p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        ))}
                        {q.options.length < 6 && (
                          <button
                            onClick={() =>
                              setOpts([
                                ...q.options,
                                { id: crypto.randomUUID(), text: `Option ${q.options.length + 1}` },
                              ])
                            }
                            className="w-full rounded-lg border border-dashed border-slate-300 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                          >
                            + Add option
                          </button>
                        )}
                      </div>
                    </Field>
                    <ModernColorPicker
                      label="Background"
                      value={q.bgColor}
                      onChange={(c) => update(q.id, { bgColor: c } as never)}
                    />
                    <ModernColorPicker
                      label="Text"
                      value={q.fgColor}
                      onChange={(c) => update(q.id, { fgColor: c } as never)}
                    />
                    <ModernColorPicker
                      label="Accent"
                      value={q.accentColor}
                      onChange={(c) => update(q.id, { accentColor: c } as never)}
                    />
                  </Section>
                );
              })()}

            {/* TEXT ELEMENT */}
            {el.type === "text" && (
              <>
                <Section title="Typography">
                  <Field label="Synced text style">
                    <div className="grid grid-cols-4 gap-1.5">
                      {(
                        [
                          ["none", "None"],
                          ["title", "Title"],
                          ["subtitle", "Sub"],
                          ["body", "Body"],
                        ] as const
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          onClick={() => {
                            if (value === "none") {
                              update(el.id, { textRole: undefined } as never);
                              return;
                            }
                            update(el.id, {
                              textRole: value,
                              ...useSettings.getState().textStyles[value],
                            } as never);
                          }}
                          className={`rounded-lg border px-1 py-1.5 text-[9px] font-semibold transition ${
                            el.textRole === value
                              ? "border-sky-500 bg-sky-50/50 text-sky-700 ring-2 ring-sky-500/20"
                              : "border-slate-200 text-slate-500 hover:border-slate-300"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {el.textRole && (
                      <button
                        onClick={() =>
                          useEditor.getState().restyleTextRole(el.textRole!, {
                            fontFamily: el.fontFamily,
                            fontSize: el.fontSize,
                            fontWeight: el.fontWeight,
                            color: el.color,
                          })
                        }
                        className="w-full rounded-lg border border-blue-200 bg-blue-50 py-1.5 text-[10px] font-semibold text-blue-700 transition hover:bg-blue-100"
                      >
                        Push this style to all &ldquo;{el.textRole}&rdquo; text
                      </button>
                    )}
                  </Field>
                  <Field label="Content">
                    <textarea
                      rows={3}
                      value={el.text}
                      onChange={(e) => update(el.id, { text: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                  </Field>
                  <Field label="Font Family">
                    <Dropdown
                      value={el.fontFamily}
                      options={FONT_FAMILIES}
                      onChange={(v) => {
                        void ensureFontFamily(v);
                        update(el.id, { fontFamily: v });
                      }}
                    />
                  </Field>
                  <SliderWithInput
                    label="Font Size"
                    min={12}
                    max={240}
                    value={el.fontSize}
                    unit="px"
                    onChange={(val) => update(el.id, { fontSize: val })}
                  />
                  <SliderWithInput
                    label="Font Weight"
                    min={100}
                    max={900}
                    step={100}
                    value={el.fontWeight}
                    onChange={(val) => update(el.id, { fontWeight: val })}
                  />
                  <SliderWithInput
                    label="Line Height"
                    min={80}
                    max={250}
                    value={Math.round((el.lineHeight ?? 1.15) * 100)}
                    unit="%"
                    onChange={(val) => update(el.id, { lineHeight: val / 100 })}
                  />
                  <SliderWithInput
                    label="Letter Spacing"
                    min={-10}
                    max={40}
                    value={Math.round((el.letterSpacing ?? -0.02) * 100)}
                    unit="em"
                    onChange={(val) => update(el.id, { letterSpacing: val / 100 })}
                  />
                  <Field label="Typewriter (presentation)">
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() =>
                          update(el.id, { typeSpeed: el.typeSpeed ? undefined : 28 } as never)
                        }
                        className={
                          "w-full rounded-lg border px-2 py-1.5 text-[10px] font-semibold transition " +
                          (el.typeSpeed
                            ? "border-sky-300 bg-sky-50 text-sky-700"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")
                        }
                      >
                        {el.typeSpeed ? "Typewriter on" : "Typewriter off"}
                      </button>
                      {el.typeSpeed && (
                        <SliderWithInput
                          label="Speed"
                          min={5}
                          max={120}
                          step={1}
                          unit="cps"
                          value={el.typeSpeed}
                          onChange={(v) => update(el.id, { typeSpeed: v } as never)}
                        />
                      )}
                    </div>
                  </Field>
                  <Field label="Count-up (presentation)">
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() =>
                          update(el.id, {
                            countUp: el.countUp ? undefined : { duration: 1500 },
                          } as never)
                        }
                        className={
                          "w-full rounded-lg border px-2 py-1.5 text-[10px] font-semibold transition " +
                          (el.countUp
                            ? "border-sky-300 bg-sky-50 text-sky-700"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")
                        }
                      >
                        {el.countUp ? "Count-up on" : "Count-up off"}
                      </button>
                      {el.countUp && (
                        <>
                          <SliderWithInput
                            label="Duration"
                            min={300}
                            max={6000}
                            step={100}
                            unit="ms"
                            value={el.countUp.duration}
                            onChange={(v) =>
                              update(el.id, { countUp: { ...el.countUp!, duration: v } } as never)
                            }
                          />
                          <SliderWithInput
                            label="Decimals"
                            min={0}
                            max={3}
                            step={1}
                            unit=""
                            value={el.countUp.decimals ?? 0}
                            onChange={(v) =>
                              update(el.id, { countUp: { ...el.countUp!, decimals: v } } as never)
                            }
                          />
                          <p className="text-[10px] leading-snug text-slate-400">
                            Animates the first number found in the text up to its final value (KPI,
                            stats).
                          </p>
                        </>
                      )}
                    </div>
                  </Field>
                </Section>

                <Section title="Style & Alignment">
                  <Field label="Text Alignment">
                    <SegmentedControl
                      value={el.align ?? "left"}
                      onChange={(align) => update(el.id, { align })}
                      options={[
                        { value: "left", label: <AlignLeft className="size-3.5" /> },
                        { value: "center", label: <AlignCenter className="size-3.5" /> },
                        { value: "right", label: <AlignRight className="size-3.5" /> },
                      ]}
                    />
                  </Field>
                  <Field label="Formatting">
                    <ToggleGrid
                      columns={3}
                      label="Text formatting"
                      options={[
                        {
                          id: "italic",
                          label: "Italic",
                          icon: Italic,
                          checked: !!el.italic,
                          onChange: () => update(el.id, { italic: !el.italic }),
                        },
                        {
                          id: "underline",
                          label: "Underline",
                          icon: Underline,
                          checked: !!el.underline,
                          onChange: () => update(el.id, { underline: !el.underline }),
                        },
                        {
                          id: "bullet",
                          label: "Bullets",
                          icon: List,
                          checked: !!el.bullet,
                          onChange: () => update(el.id, { bullet: !el.bullet }),
                        },
                      ]}
                    />
                  </Field>
                  <Field label="Fill">
                    <SegmentedControl
                      value={el.fillSource ?? "color"}
                      onChange={(fillSource) => update(el.id, { fillSource })}
                      options={[
                        { value: "color", label: "Solid" },
                        { value: "slide-bg", label: "Slide BG" },
                      ]}
                    />
                  </Field>
                  {(el.fillSource ?? "color") === "color" && (
                    <ModernColorPicker
                      label="Text Color"
                      value={el.color}
                      onChange={(c) => update(el.id, { color: c })}
                      opacity={el.opacity ?? 1}
                      onOpacityChange={(v) => update(el.id, { opacity: v })}
                    />
                  )}
                  <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-600">Gradient fill</span>
                      <button
                        type="button"
                        onClick={() =>
                          update(el.id, {
                            gradient: el.gradient
                              ? undefined
                              : { from: el.color, to: "#6366f1", angle: 90, type: "linear" },
                          })
                        }
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 transition hover:border-sky-300 hover:text-sky-700"
                      >
                        {el.gradient ? "Remove" : "Add"}
                      </button>
                    </div>
                    {el.gradient && (
                      <>
                        <SegmentedControl
                          value={el.gradient.type ?? "linear"}
                          onChange={(type) =>
                            update(el.id, {
                              gradient: { ...el.gradient!, type: type as ShapeGradient["type"] },
                            })
                          }
                          options={[
                            { value: "linear", label: "Linear" },
                            { value: "radial", label: "Radial" },
                          ]}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-1.5 text-[10px] text-slate-500">
                            <ColorSwatchPopover
                              value={el.gradient.from}
                              onChange={(from) =>
                                update(el.id, { gradient: { ...el.gradient!, from } })
                              }
                              label="Gradient start color"
                            />
                            Start
                          </label>
                          <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-1.5 text-[10px] text-slate-500">
                            <ColorSwatchPopover
                              value={el.gradient.to}
                              onChange={(to) =>
                                update(el.id, { gradient: { ...el.gradient!, to } })
                              }
                              label="Gradient end color"
                            />
                            End
                          </label>
                        </div>
                        {(el.gradient.type ?? "linear") === "linear" && (
                          <SliderWithInput
                            label="Angle"
                            min={0}
                            max={360}
                            value={el.gradient.angle}
                            unit="°"
                            onChange={(angle) =>
                              update(el.id, { gradient: { ...el.gradient!, angle } })
                            }
                          />
                        )}
                      </>
                    )}
                  </div>
                  <Field label="Blend mode">
                    <Dropdown
                      value={el.blendMode ?? "normal"}
                      options={BLEND_MODES}
                      onChange={(v) =>
                        update(el.id, { blendMode: v === "normal" ? undefined : v } as never)
                      }
                    />
                  </Field>
                  <Field label="Image fill (inside letters)">
                    <div className="flex items-center gap-1.5">
                      <label className="flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:bg-sky-50">
                        <Upload className="size-3.5" aria-hidden="true" />
                        {el.imageOverlay ? "Replace image" : "Choose an image"}
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={async (event) => {
                            const file = event.target.files?.[0];
                            event.currentTarget.value = "";
                            if (!file) return;
                            try {
                              const src = await prepareImage(file);
                              update(el.id, { imageOverlay: src });
                            } catch (error) {
                              window.alert(
                                error instanceof Error
                                  ? error.message
                                  : "Could not import this image.",
                              );
                            }
                          }}
                        />
                      </label>
                      {el.imageOverlay && (
                        <button
                          type="button"
                          onClick={() => update(el.id, { imageOverlay: undefined })}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-semibold text-rose-500 transition hover:border-rose-300 hover:bg-rose-50"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="mt-1 text-[10px] leading-snug text-slate-400">
                      The image fills the letters of the text.
                    </p>
                  </Field>

                  <Field label="Shape Mask">
                    <Dropdown
                      value={el.maskShape ?? ""}
                      options={MASK_OPTIONS}
                      onChange={(v) =>
                        update(el.id, { maskShape: (v || undefined) as typeof el.maskShape })
                      }
                    />
                  </Field>
                  <Field label="Hyperlink URL">
                    <div className="flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20">
                      <Link2 className="mr-1.5 size-3.5 text-slate-400" />
                      <input
                        type="url"
                        placeholder="https://..."
                        value={el.href ?? ""}
                        onChange={(e) => update(el.id, { href: e.target.value })}
                        className="w-full text-xs text-slate-700 outline-none"
                      />
                    </div>
                  </Field>
                </Section>
              </>
            )}

            {/* SHAPES */}
            {el.type === "shape" && (
              <Section title="Shape Appearance">
                <Field label="Effect">
                  <Dropdown
                    value={el.effect ?? "none"}
                    options={SHAPE_EFFECTS.map((option) => ({
                      ...option,
                      value: option.value ?? "none",
                    }))}
                    onChange={(v) => update(el.id, { effect: v as ShapeElement["effect"] })}
                  />
                </Field>
                <Field label="Fill">
                  <SegmentedControl
                    value={el.fillSource ?? "color"}
                    onChange={(fillSource) => update(el.id, { fillSource })}
                    options={[
                      { value: "color", label: "Solid" },
                      { value: "slide-bg", label: "Slide BG" },
                    ]}
                  />
                </Field>
                {(el.fillSource ?? "color") === "color" && (
                  <>
                    <ModernColorPicker
                      label="Fill Color"
                      value={el.fill}
                      onChange={(c) => update(el.id, { fill: c })}
                      opacity={el.opacity ?? 1}
                      onOpacityChange={(v) => update(el.id, { opacity: v })}
                    />
                    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-slate-600">
                          Gradient fill
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            update(el.id, {
                              gradient: el.gradient
                                ? undefined
                                : { from: el.fill, to: "#6366f1", angle: 90, type: "linear" },
                            })
                          }
                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 transition hover:border-sky-300 hover:text-sky-700"
                        >
                          {el.gradient ? "Remove" : "Add"}
                        </button>
                      </div>
                      {el.gradient && (
                        <>
                          <SegmentedControl
                            value={el.gradient.type ?? "linear"}
                            onChange={(type) =>
                              update(el.id, {
                                gradient: { ...el.gradient!, type: type as ShapeGradient["type"] },
                              })
                            }
                            options={[
                              { value: "linear", label: "Linear" },
                              { value: "radial", label: "Radial" },
                            ]}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-1.5 text-[10px] text-slate-500">
                              <ColorSwatchPopover
                                value={el.gradient.from}
                                onChange={(from) =>
                                  update(el.id, { gradient: { ...el.gradient!, from } })
                                }
                                label="Gradient start color"
                              />
                              Start
                            </label>
                            <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-1.5 text-[10px] text-slate-500">
                              <ColorSwatchPopover
                                value={el.gradient.to}
                                onChange={(to) =>
                                  update(el.id, { gradient: { ...el.gradient!, to } })
                                }
                                label="Gradient end color"
                              />
                              End
                            </label>
                          </div>
                          {(el.gradient.type ?? "linear") === "linear" && (
                            <SliderWithInput
                              label="Angle"
                              min={0}
                              max={360}
                              value={el.gradient.angle}
                              unit="°"
                              onChange={(angle) =>
                                update(el.id, { gradient: { ...el.gradient!, angle } })
                              }
                            />
                          )}
                        </>
                      )}
                    </div>
                  </>
                )}
                <ModernColorPicker
                  label="Stroke Color"
                  value={el.stroke}
                  onChange={(c) => update(el.id, { stroke: c })}
                />
                <SliderWithInput
                  label="Stroke Width"
                  min={0}
                  max={24}
                  value={el.strokeWidth}
                  unit="px"
                  onChange={(val) => update(el.id, { strokeWidth: val })}
                />
                <Field label="Shape Mask">
                  <Dropdown
                    value={el.maskShape ?? ""}
                    options={MASK_OPTIONS}
                    onChange={(v) =>
                      update(el.id, { maskShape: (v || undefined) as typeof el.maskShape })
                    }
                  />
                </Field>
                {el.shape === "rect" && (
                  <SliderWithInput
                    label="Corner Radius"
                    min={0}
                    max={Math.floor(Math.min(el.width, el.height) / 2)}
                    value={el.cornerRadius ?? 0}
                    unit="px"
                    onChange={(val) => update(el.id, { cornerRadius: val })}
                  />
                )}
                <SliderWithInput
                  label="Feather (soft edge)"
                  min={0}
                  max={40}
                  value={el.feather ?? 0}
                  unit="px"
                  onChange={(val) => update(el.id, { feather: val } as never)}
                />
                <Field label="Blend mode">
                  <Dropdown
                    value={el.blendMode ?? "normal"}
                    options={BLEND_MODES}
                    onChange={(v) =>
                      update(el.id, { blendMode: v === "normal" ? undefined : v } as never)
                    }
                  />
                </Field>
              </Section>
            )}

            {/* WEB EMBED */}
            {el.type === "embed" && (
              <Section title="Web embed">
                <Field label="Embed URL">
                  <div className="flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20">
                    <Link2 className="mr-1.5 size-3.5 text-slate-400" />
                    <input
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=…"
                      value={el.src}
                      onChange={(e) => update(el.id, { src: toEmbedSrc(e.target.value) })}
                      className="w-full text-xs text-slate-700 outline-none"
                    />
                  </div>
                  <p className="mt-1.5 text-[10px] leading-snug text-slate-400">
                    Collez un lien YouTube, Spotify, SoundCloud, Google Maps, Figma ou Vimeo — il
                    est converti en lecteur intégré.
                  </p>
                </Field>
                <Field label="Titre (fallback export)">
                  <input
                    value={el.title ?? ""}
                    onChange={(e) => update(el.id, { title: e.target.value })}
                    placeholder="Ex : Notre produit en vidéo"
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-sky-500"
                  />
                </Field>
                <button
                  type="button"
                  onClick={() => {
                    const safeUrl = isSafeBrowserUrl(el.src);
                    if (safeUrl) window.open(safeUrl, "_blank", "noopener,noreferrer");
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                >
                  Ouvrir dans un nouvel onglet ↗
                </button>
                <p className="text-[10px] leading-snug text-slate-400">
                  Les exports PDF / PPTX remplacent l'embed par une carte cliquable.
                </p>
              </Section>
            )}

            {/* ICON ELEMENT */}
            {el.type === "icon" && (
              <Section title="Icon styling">
                <ModernColorPicker
                  label="Icon Color"
                  value={el.color}
                  onChange={(color) => update(el.id, { color })}
                />
                <SliderWithInput
                  label="Stroke Width"
                  min={0.5}
                  max={6}
                  step={0.5}
                  value={el.strokeWidth}
                  unit="px"
                  onChange={(strokeWidth) => update(el.id, { strokeWidth })}
                />
                <Field label="Animation">
                  <div className="grid grid-cols-5 gap-1.5">
                    {(
                      [
                        ["none", "None"],
                        ["pulse", "Pulse"],
                        ["spin", "Spin"],
                        ["bounce", "Bounce"],
                        ["draw", "Draw"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        onClick={() => update(el.id, { iconAnim: value } as never)}
                        className={`rounded-lg border px-1 py-1.5 text-[9px] font-semibold transition ${
                          (el.iconAnim ?? "none") === value
                            ? "border-sky-500 bg-sky-50/50 text-sky-700 ring-2 ring-sky-500/20"
                            : "border-slate-200 text-slate-500 hover:border-slate-300"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </Field>
              </Section>
            )}

            {/* IMAGE ELEMENT */}
            {el.type === "image" && (
              <>
                <Section title="Image">
                  <Field label="Shape Mask">
                    <MaskPicker
                      value={el.maskShape ?? ""}
                      onChange={(v) =>
                        update(el.id, { maskShape: (v || undefined) as typeof el.maskShape })
                      }
                    />
                  </Field>

                  <Field label="Fit (containance)">
                    <SegmentedControl
                      value={el.fit ?? "cover"}
                      onChange={(fit) => update(el.id, { fit })}
                      options={[
                        {
                          value: "cover",
                          label: "Cover",
                          title: "Remplit la zone, rogne l'excédent",
                        },
                        {
                          value: "contain",
                          label: "Contain",
                          title: "Image entière visible, letterbox",
                        },
                        {
                          value: "fill",
                          label: "Fill",
                          title: "Étirée pour remplir (peut déformer)",
                        },
                      ]}
                    />
                  </Field>

                  <Field label="Crop">
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() =>
                          useEditor.getState().setCroppingId(croppingId === el.id ? null : el.id)
                        }
                        className={`w-full rounded-lg px-2 py-2 text-[11px] font-semibold transition ${croppingId === el.id ? "bg-sky-600 text-white hover:bg-sky-500" : "bg-slate-900 text-white hover:bg-slate-700"}`}
                      >
                        {croppingId === el.id ? "Terminer le recadrage" : "Recadrer sur le canvas"}
                      </button>
                      {croppingId === el.id && (
                        <p className="text-[10px] leading-snug text-slate-400">
                          Glissez l'image dans son cadre pour la déplacer, molette pour zoomer,
                          Échap pour terminer.
                        </p>
                      )}
                      <SliderWithInput
                        label="Zoom"
                        min={100}
                        max={400}
                        step={5}
                        unit="%"
                        value={Math.round((el.cropZoom ?? 1) * 100)}
                        onChange={(v) => update(el.id, { cropZoom: v / 100 })}
                      />
                      <SliderWithInput
                        label="Horizontal"
                        min={0}
                        max={100}
                        unit="%"
                        value={el.cropX ?? 50}
                        onChange={(v) => update(el.id, { cropX: v })}
                      />
                      <SliderWithInput
                        label="Vertical"
                        min={0}
                        max={100}
                        unit="%"
                        value={el.cropY ?? 50}
                        onChange={(v) => update(el.id, { cropY: v })}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          update(el.id, {
                            cropZoom: undefined,
                            cropX: undefined,
                            cropY: undefined,
                            cropRect: undefined,
                          })
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Reset crop
                      </button>
                      <SliderWithInput
                        label="Fine rotation"
                        min={-180}
                        max={180}
                        step={0.1}
                        unit="deg"
                        value={Number((el.rotation % 360).toFixed(1))}
                        onChange={(v) => update(el.id, { rotation: v } as never)}
                      />
                    </div>
                  </Field>

                  <Field label="Rotoscope mask">
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setRotoscopeOpen(true)}
                        className="w-full rounded-lg bg-slate-900 px-2 py-2 text-[11px] font-semibold text-white transition hover:bg-slate-700"
                      >
                        {el.rotoscopeMask ? "Edit rotoscope mask" : "Open rotoscope editor"}
                      </button>
                      {el.rotoscopeMask && (
                        <button
                          type="button"
                          onClick={() => update(el.id, { rotoscopeMask: undefined } as never)}
                          className="w-full rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-[10px] font-semibold text-rose-600 transition hover:bg-rose-100"
                        >
                          Remove mask
                        </button>
                      )}
                      <p className="text-[10px] leading-snug text-slate-400">
                        Paint the background away (red = hidden). The original image is kept and the
                        mask stays editable.
                      </p>
                    </div>
                  </Field>

                  <Field label="Replace image">
                    <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50">
                      <Upload className="size-3.5" />
                      <span>Choose a photo or video</span>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (!file) return;
                          try {
                            if (file.type.startsWith("video/")) {
                              if (file.size > 25 * 1024 * 1024)
                                throw new Error("Video too large (max 25 MB).");
                              const src = await new Promise<string>((resolve, reject) => {
                                const reader = new FileReader();
                                reader.onload = () => resolve(String(reader.result));
                                reader.onerror = () =>
                                  reject(new Error("Could not read this file."));
                                reader.readAsDataURL(file);
                              });
                              // Morph the image into a video in place: same id, box and mask,
                              // so group membership (photo grids) is preserved.
                              update(el.id, {
                                type: "video",
                                src,
                                muted: true,
                                loop: true,
                                fit: "cover",
                                cropZoom: undefined,
                                cropX: undefined,
                                cropY: undefined,
                                cropRect: undefined,
                                filters: undefined,
                              } as never);
                            } else {
                              const src = await prepareImage(file);
                              update(el.id, {
                                src,
                                cropZoom: undefined,
                                cropX: undefined,
                                cropY: undefined,
                                cropRect: undefined,
                              });
                            }
                          } catch (err) {
                            window.alert(
                              err instanceof Error ? err.message : "Could not load this file.",
                            );
                          }
                        }}
                      />
                    </label>
                    <p className="mt-1 text-[10px] leading-snug text-slate-400">
                      La position, la taille et le masque sont conservés ; le recadrage est
                      réinitialisé. Une vidéo (max 25 Mo) remplace l\'image sur place, en muet avec
                      boucle.
                    </p>
                  </Field>

                  <Field label="Transform">
                    <ToggleGrid
                      label="Image transforms"
                      options={[
                        {
                          id: "flipX",
                          label: "Flip H",
                          icon: FlipHorizontal,
                          checked: !!el.flipX,
                          onChange: () => update(el.id, { flipX: !el.flipX }),
                        },
                        {
                          id: "flipY",
                          label: "Flip V",
                          icon: FlipVertical,
                          checked: !!el.flipY,
                          onChange: () => update(el.id, { flipY: !el.flipY }),
                        },
                      ]}
                    />
                  </Field>

                  <Field label="Aspect ratio">
                    <div className="grid grid-cols-5 gap-1.5">
                      {ASPECT_RATIOS.map((r) => (
                        <button
                          key={r.label}
                          type="button"
                          onClick={() =>
                            update(el.id, {
                              height: Math.max(20, Math.round(el.width / r.value)),
                            } as never)
                          }
                          className="rounded-lg border border-slate-200 bg-white px-1 py-1.5 text-[10px] font-semibold text-slate-600 transition hover:border-sky-400 hover:text-sky-700"
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </Field>
                </Section>
                <Section title="Image Filters" defaultOpen={false}>
                  <Field label="Presets">
                    <div className="grid grid-cols-4 gap-1.5">
                      {IMAGE_FILTER_PRESETS.map((preset) => (
                        <button
                          key={preset.name}
                          onClick={() =>
                            update(el.id, { filters: { ...DEFAULT_FILTERS, ...preset.filters } })
                          }
                          className="flex flex-col items-center rounded-lg border border-slate-200 p-1 transition hover:border-sky-500 hover:bg-slate-50"
                        >
                          <div
                            className="h-7 w-full rounded-sm bg-linear-to-tr from-sky-400 to-indigo-600"
                            style={{ filter: preset.preview }}
                          />
                          <span className="mt-1 text-[9px] font-medium text-slate-600">
                            {preset.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </Field>

                  <SliderWithInput
                    label="Brightness"
                    min={0}
                    max={200}
                    value={el.filters?.brightness ?? 100}
                    unit="%"
                    onChange={(val) =>
                      update(el.id, {
                        filters: { ...DEFAULT_FILTERS, ...el.filters, brightness: val },
                      })
                    }
                  />
                  <SliderWithInput
                    label="Contrast"
                    min={0}
                    max={200}
                    value={el.filters?.contrast ?? 100}
                    unit="%"
                    onChange={(val) =>
                      update(el.id, {
                        filters: { ...DEFAULT_FILTERS, ...el.filters, contrast: val },
                      })
                    }
                  />
                  <SliderWithInput
                    label="Saturation"
                    min={0}
                    max={200}
                    value={el.filters?.saturate ?? 100}
                    unit="%"
                    onChange={(val) =>
                      update(el.id, {
                        filters: { ...DEFAULT_FILTERS, ...el.filters, saturate: val },
                      })
                    }
                  />
                  <SliderWithInput
                    label="Hue Rotate"
                    min={0}
                    max={360}
                    value={el.filters?.hueRotate ?? 0}
                    unit="°"
                    onChange={(val) =>
                      update(el.id, {
                        filters: { ...DEFAULT_FILTERS, ...el.filters, hueRotate: val },
                      })
                    }
                  />
                  <SliderWithInput
                    label="Temperature"
                    min={-100}
                    max={100}
                    value={el.filters?.temperature ?? 0}
                    unit=""
                    onChange={(val) =>
                      update(el.id, {
                        filters: { ...DEFAULT_FILTERS, ...el.filters, temperature: val },
                      })
                    }
                  />
                  <Field label="Tint">
                    <div className="flex items-center gap-2.5">
                      <ColorPicker
                        value={el.filters?.tintColor ?? "#7aa2ff"}
                        onChange={(hex) =>
                          update(el.id, {
                            filters: {
                              ...DEFAULT_FILTERS,
                              ...el.filters,
                              tintColor: hex,
                              tintOpacity: el.filters?.tintOpacity ?? 35,
                            },
                          })
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <SliderWithInput
                          label="Tint strength"
                          min={0}
                          max={100}
                          value={el.filters?.tintOpacity ?? 0}
                          unit="%"
                          onChange={(val) =>
                            update(el.id, {
                              filters: {
                                ...DEFAULT_FILTERS,
                                ...el.filters,
                                tintOpacity: val,
                                tintColor: el.filters?.tintColor ?? "#7aa2ff",
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  </Field>
                  <SliderWithInput
                    label="Blur"
                    min={0}
                    max={20}
                    step={0.5}
                    value={el.filters?.blur ?? 0}
                    unit="px"
                    onChange={(val) =>
                      update(el.id, { filters: { ...DEFAULT_FILTERS, ...el.filters, blur: val } })
                    }
                  />
                  <SliderWithInput
                    label="Grayscale"
                    min={0}
                    max={100}
                    value={el.filters?.grayscale ?? 0}
                    unit="%"
                    onChange={(val) =>
                      update(el.id, {
                        filters: { ...DEFAULT_FILTERS, ...el.filters, grayscale: val },
                      })
                    }
                  />
                  <SliderWithInput
                    label="Sepia"
                    min={0}
                    max={100}
                    value={el.filters?.sepia ?? 0}
                    unit="%"
                    onChange={(val) =>
                      update(el.id, { filters: { ...DEFAULT_FILTERS, ...el.filters, sepia: val } })
                    }
                  />
                  <SliderWithInput
                    label="Invert"
                    min={0}
                    max={100}
                    value={el.filters?.invert ?? 0}
                    unit="%"
                    onChange={(val) =>
                      update(el.id, { filters: { ...DEFAULT_FILTERS, ...el.filters, invert: val } })
                    }
                  />
                  <SliderWithInput
                    label="Glitch"
                    min={0}
                    max={100}
                    value={el.filters?.glitch ?? 0}
                    unit="%"
                    onChange={(val) =>
                      update(el.id, { filters: { ...DEFAULT_FILTERS, ...el.filters, glitch: val } })
                    }
                  />
                  <SliderWithInput
                    label="Noise"
                    min={0}
                    max={100}
                    value={el.filters?.noise ?? 0}
                    unit="%"
                    onChange={(val) =>
                      update(el.id, { filters: { ...DEFAULT_FILTERS, ...el.filters, noise: val } })
                    }
                  />
                  <SliderWithInput
                    label="Pixelate"
                    min={0}
                    max={40}
                    value={el.filters?.pixelate ?? 0}
                    unit="px"
                    onChange={(val) =>
                      update(el.id, {
                        filters: { ...DEFAULT_FILTERS, ...el.filters, pixelate: val },
                      })
                    }
                  />
                  <SliderWithInput
                    label="Posterize"
                    min={0}
                    max={16}
                    value={el.filters?.posterize ?? 0}
                    unit=" lvl"
                    onChange={(val) =>
                      update(el.id, {
                        filters: { ...DEFAULT_FILTERS, ...el.filters, posterize: val },
                      })
                    }
                  />
                  <button
                    type="button"
                    onClick={() => update(el.id, { filters: { ...DEFAULT_FILTERS } })}
                    className="w-full rounded-lg border border-dashed border-slate-300 py-1 text-[10px] font-medium text-slate-500 hover:border-rose-400 hover:text-rose-600"
                  >
                    Reset filters
                  </button>
                </Section>
                <Section title="Image Style" defaultOpen={false}>
                  <SliderWithInput
                    label="Corner Radius"
                    min={0}
                    max={Math.floor(Math.min(el.width, el.height) / 2)}
                    value={el.cornerRadius ?? 0}
                    unit="px"
                    onChange={(val) => update(el.id, { cornerRadius: val })}
                  />

                  <SliderWithInput
                    label="Opacity"
                    min={0}
                    max={100}
                    value={Math.round((el.opacity ?? 1) * 100)}
                    unit="%"
                    onChange={(val) => update(el.id, { opacity: val / 100 })}
                  />

                  <Field label="Border">
                    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
                      <SliderWithInput
                        label="Border Width"
                        min={0}
                        max={24}
                        value={el.borderWidth ?? 0}
                        unit="px"
                        onChange={(val) => update(el.id, { borderWidth: val })}
                      />
                      {(el.borderWidth ?? 0) > 0 && (
                        <ModernColorPicker
                          label="Border Color"
                          value={el.borderColor ?? "#000000"}
                          onChange={(c) => update(el.id, { borderColor: c })}
                        />
                      )}
                    </div>
                  </Field>

                  <Field label="Blend mode">
                    <Dropdown
                      value={el.blendMode ?? "normal"}
                      options={BLEND_MODES}
                      onChange={(v) =>
                        update(el.id, { blendMode: v === "normal" ? undefined : v } as never)
                      }
                    />
                  </Field>
                </Section>
              </>
            )}

            {/* VIDEO ELEMENT */}
            {el.type === "video" && (
              <Section title="Video">
                <Field label="Fit">
                  <SegmentedControl
                    value={el.fit ?? "cover"}
                    onChange={(fit) => update(el.id, { fit } as never)}
                    options={[
                      {
                        value: "cover",
                        label: "Cover",
                        title: "Remplit la zone, rogne l'excédent",
                      },
                      {
                        value: "contain",
                        label: "Contain",
                        title: "Vidéo entière visible, letterbox",
                      },
                      {
                        value: "fill",
                        label: "Fill",
                        title: "Étirée pour remplir (peut déformer)",
                      },
                    ]}
                  />
                </Field>
                <Field label="Poster (cover image)">
                  <div className="space-y-2">
                    {el.poster && (
                      <img
                        src={el.poster}
                        alt=""
                        className="h-20 w-full rounded-lg border border-slate-200 object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const v = document.createElement("video");
                        v.src = el.src;
                        v.muted = true;
                        v.playsInline = true;
                        v.onloadedmetadata = () => {
                          v.currentTime = Math.min((v.duration || 1) * 0.1, 1);
                        };
                        v.onseeked = () => {
                          try {
                            const c = document.createElement("canvas");
                            c.width = v.videoWidth;
                            c.height = v.videoHeight;
                            c.getContext("2d")!.drawImage(v, 0, 0);
                            update(el.id, { poster: c.toDataURL("image/jpeg", 0.85) } as never);
                          } catch {
                            window.alert("Could not capture a frame from this video.");
                          }
                        };
                        v.onerror = () => window.alert("Could not load this video.");
                      }}
                      className="w-full rounded-lg bg-slate-900 px-2 py-2 text-[11px] font-semibold text-white transition hover:bg-slate-700"
                    >
                      Capture current frame as poster
                    </button>
                    {el.poster && (
                      <button
                        type="button"
                        onClick={() => update(el.id, { poster: undefined } as never)}
                        className="w-full rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-[10px] font-semibold text-rose-600 transition hover:bg-rose-100"
                      >
                        Remove poster
                      </button>
                    )}
                    <p className="text-[10px] leading-snug text-slate-400">
                      The poster is the image shown before the video plays (thumbnails, exports).
                    </p>
                  </div>
                </Field>
              </Section>
            )}

            {/* SHADOW (all elements) */}
            <Section title="Shadow" defaultOpen={!!el.shadow}>
              <ToggleGrid
                label="Shadow"
                options={[
                  {
                    id: "shadow",
                    label: "Enable shadow",
                    icon: Layers,
                    checked: !!el.shadow,
                    onChange: (checked) =>
                      update(el.id, {
                        shadow: checked
                          ? { x: 0, y: 12, blur: 24, color: "rgba(0,0,0,0.35)" }
                          : undefined,
                      } as never),
                  },
                ]}
              />
              {el.shadow &&
                (() => {
                  const s = el.shadow as ElementShadow;
                  const set = (p: Partial<ElementShadow>) =>
                    update(el.id, { shadow: { ...s, ...p } } as never);
                  return (
                    <>
                      <SliderWithInput
                        label="Offset X"
                        min={-60}
                        max={60}
                        value={s.x}
                        unit="px"
                        onChange={(v) => set({ x: v })}
                      />
                      <SliderWithInput
                        label="Offset Y"
                        min={-60}
                        max={60}
                        value={s.y}
                        unit="px"
                        onChange={(v) => set({ y: v })}
                      />
                      <SliderWithInput
                        label="Blur"
                        min={0}
                        max={100}
                        value={s.blur}
                        unit="px"
                        onChange={(v) => set({ blur: v })}
                      />
                      <ModernColorPicker
                        label="Color"
                        value={s.color.startsWith("#") ? s.color : "#000000"}
                        onChange={(c) => set({ color: c })}
                      />
                    </>
                  );
                })()}
            </Section>

            {/* KEYFRAME ANIMATION — custom motion path */}
            <Section title="Keyframe Animation" defaultOpen={false}>
              <p className="text-[10px] leading-snug text-slate-500">
                Build a custom animation: place the object, capture a keyframe, move or restyle it,
                capture the next. It plays while presenting.
              </p>
              {sortedKfs.length > 0 && sortedKfs.length < 2 && (
                <p className="text-[10px] font-medium text-amber-600">
                  Add at least 2 keyframes to animate.
                </p>
              )}
              <div className="space-y-2">
                {/* Toolbar: count, total time, preview & clear */}
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                    {sortedKfs.length} keyframe{sortedKfs.length === 1 ? "" : "s"} ·{" "}
                    {(kfTotal / 1000).toFixed(1)} s
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={sortedKfs.length < 2}
                      onClick={() =>
                        window.dispatchEvent(
                          new CustomEvent("diapolab:preview-keyframes", { detail: { id: el.id } }),
                        )
                      }
                      title="Play the animation on the canvas"
                      className="flex items-center gap-1 rounded-md bg-slate-900 px-2 py-1 text-[9px] font-bold text-white transition hover:bg-slate-700 disabled:opacity-30"
                    >
                      <Play className="size-3" /> Preview
                    </button>
                    {sortedKfs.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setKfs([]);
                          setSelectedKf(null);
                        }}
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[9px] font-semibold text-rose-500 transition hover:border-rose-300"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
                {/* Timeline track: click the line to add, drag diamonds to move */}
                <div className="flex items-center justify-between px-0.5 text-[9px] font-mono text-slate-400">
                  <span>0 ms</span>
                  <span>{kfTotal} ms</span>
                </div>
                <div
                  ref={kfTrackRef}
                  title="Click the line to add a keyframe at that time"
                  onClick={(e) => {
                    const t = kfTimeAt(e.clientX);
                    const nk = captureState(t);
                    setKfs([...kfs, nk]);
                    setSelectedKf(nk.id);
                  }}
                  className="relative h-10 cursor-copy rounded-lg border border-slate-200 bg-slate-50 transition hover:border-sky-300 hover:bg-sky-50/60"
                >
                  <div className="pointer-events-none absolute inset-x-1.5 top-1/2 h-0.5 -translate-y-1/2 rounded bg-gradient-to-r from-sky-300 to-indigo-300" />
                  {sortedKfs.map((k, i) => (
                    <button
                      key={k.id}
                      type="button"
                      title={`Keyframe #${i + 1} at ${k.t} ms`}
                      aria-label={`Keyframe ${i + 1} at ${k.t} milliseconds`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedKf(k.id);
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                        setKfDrag(k.id);
                        setSelectedKf(k.id);
                      }}
                      onPointerMove={(e) => {
                        if (kfDrag !== k.id) return;
                        const t = kfTimeAt(e.clientX);
                        setKfs(kfs.map((x) => (x.id === k.id ? { ...x, t } : x)));
                      }}
                      onPointerUp={() => setKfDrag(null)}
                      onPointerCancel={() => setKfDrag(null)}
                      className="absolute top-1/2 z-10 size-3.5 -translate-x-1/2 -translate-y-1/2 rotate-45 cursor-grab rounded-[3px] border shadow-sm transition-transform hover:scale-125 active:cursor-grabbing"
                      style={{
                        left: `${(k.t / kfTotal) * 100}%`,
                        backgroundColor: selectedKf === k.id ? "#0284c7" : "#ffffff",
                        borderColor: selectedKf === k.id ? "#0369a1" : "#64748b",
                      }}
                    />
                  ))}
                </div>
                <p className="text-[9px] leading-snug text-slate-400">
                  Click the line to add a keyframe · drag the diamonds to move them in time · click
                  one to edit it below.
                </p>

                {/* Inline editor for the selected keyframe */}
                {(() => {
                  const k = sortedKfs.find((x) => x.id === selectedKf) ?? sortedKfs[0];
                  if (!k) return null;
                  const i = sortedKfs.indexOf(k);
                  return (
                    <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-sky-700">
                          Keyframe #{i + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            step={50}
                            value={k.t}
                            aria-label="Keyframe time in ms"
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              if (Number.isFinite(v) && v >= 0)
                                setKfs(kfs.map((x) => (x.id === k.id ? { ...x, t: v } : x)));
                            }}
                            className="w-16 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-right font-mono text-[10px] text-slate-700 outline-none"
                          />
                          <span className="text-[9px] text-slate-400">ms</span>
                          <span className="font-mono text-[9px] text-slate-400">
                            ({(k.t / 1000).toFixed(2)} s)
                          </span>
                        </div>
                      </div>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                          Easing in
                        </span>
                        <select
                          value={k.easing ?? "linear"}
                          aria-label="Easing into this keyframe"
                          onChange={(e) =>
                            setKfs(
                              kfs.map((x) =>
                                x.id === k.id
                                  ? { ...x, easing: e.target.value as ElementKeyframe["easing"] }
                                  : x,
                              ),
                            )
                          }
                          className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[10px] font-medium text-slate-700 outline-none focus:border-sky-400"
                        >
                          {KEYFRAME_EASINGS.map((e) => (
                            <option key={e.value} value={e.value}>
                              {e.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="mt-1.5 grid grid-cols-4 gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setKfs(
                              kfs.map((x) =>
                                x.id === k.id ? { ...captureState(k.t), id: k.id } : x,
                              ),
                            );
                          }}
                          className="rounded-md border border-slate-200 bg-white px-1 py-1 text-[9px] font-semibold text-slate-600 transition hover:border-sky-400 hover:text-sky-700"
                        >
                          Capture
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const snap = { ...(k.snapshot ?? {}) } as Record<string, unknown>;
                            delete snap.id;
                            delete snap.keyframes;
                            delete snap.keyframeDuration;
                            update(el.id, {
                              ...snap,
                              x: k.x ?? el.x,
                              y: k.y ?? el.y,
                              width: k.width ?? el.width,
                              height: k.height ?? el.height,
                              rotation: k.rotation ?? el.rotation,
                              opacity: k.opacity ?? (el as { opacity?: number }).opacity,
                              shadow:
                                "shadow" in snap
                                  ? (snap as { shadow?: ElementShadow }).shadow
                                  : (k.shadow ?? el.shadow),
                              ...("filters" in el || "filters" in snap
                                ? {
                                    filters:
                                      (snap as { filters?: ImageFilters }).filters ??
                                      k.filters ??
                                      (el as { filters?: ImageFilters }).filters,
                                  }
                                : {}),
                              ...("effect" in el || "effect" in snap
                                ? {
                                    effect:
                                      (snap as { effect?: ElementKeyframe["effect"] }).effect ??
                                      k.effect ??
                                      (el as { effect?: ElementKeyframe["effect"] }).effect,
                                  }
                                : {}),
                            } as never);
                          }}
                          className="rounded-md border border-slate-200 bg-white px-1 py-1 text-[9px] font-semibold text-slate-600 transition hover:border-sky-400 hover:text-sky-700"
                        >
                          Go to
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const copy = {
                              ...k,
                              id: crypto.randomUUID(),
                              t: Math.min(kfTotal, k.t + 250),
                            };
                            setKfs([...kfs, copy]);
                            setSelectedKf(copy.id);
                          }}
                          className="rounded-md border border-slate-200 bg-white px-1 py-1 text-[9px] font-semibold text-slate-600 transition hover:border-sky-400 hover:text-sky-700"
                        >
                          Duplicate
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setKfs(kfs.filter((x) => x.id !== k.id));
                            setSelectedKf(null);
                          }}
                          className="rounded-md border border-slate-200 bg-white px-1 py-1 text-[9px] font-semibold text-rose-500 transition hover:border-rose-300"
                        >
                          Delete
                        </button>
                      </div>
                      <p className="mt-1 truncate text-[9px] text-slate-400">
                        {Math.round(k.x ?? el.x)},{Math.round(k.y ?? el.y)} ·{" "}
                        {Math.round(k.width ?? el.width)}×{Math.round(k.height ?? el.height)} ·{" "}
                        {Math.round(k.rotation ?? 0)}° · {Math.round((k.opacity ?? 1) * 100)}%
                      </p>
                    </div>
                  );
                })()}
              </div>
              <button
                type="button"
                onClick={() => {
                  const last = sortedKfs[sortedKfs.length - 1];
                  setKfs([...kfs, captureState(last ? last.t + 500 : 500)]);
                }}
                className="w-full rounded-lg border border-dashed border-slate-300 py-1.5 text-[11px] font-medium text-slate-600 transition hover:border-sky-400 hover:text-sky-700"
              >
                + Add keyframe at current position
              </button>
              {sortedKfs.length >= 2 && (
                <SliderWithInput
                  label="Duration"
                  min={200}
                  max={10000}
                  step={100}
                  value={el.keyframeDuration ?? sortedKfs[sortedKfs.length - 1].t}
                  unit="ms"
                  onChange={(v) => update(el.id, { keyframeDuration: v } as never)}
                />
              )}
            </Section>

            {/* ANIMATION & INTERACTION */}
            <Section title="Animation & Interaction" defaultOpen={false}>
              <Field label="Entrance animation">
                <Dropdown
                  value={el.animation ?? "none"}
                  options={ELEMENT_ANIMATION_LABELS}
                  onChange={(v) => update(el.id, { animation: v as any })}
                />
              </Field>
              <Field label="Motion path (presentation)">
                <div className="space-y-2">
                  <div className="grid grid-cols-5 gap-1.5">
                    {(["line", "arc", "s-curve", "zigzag", "orbit"] as const).map((s) => (
                      <button
                        key={s}
                        title={"Motion path: " + s}
                        onClick={() =>
                          update(el.id, {
                            motionPath:
                              el.motionPath?.shape === s
                                ? undefined
                                : { shape: s, dx: 320, dy: 0, duration: 1200, easing: "expo-out" },
                          } as never)
                        }
                        className={
                          "rounded-lg border px-1 py-1.5 text-[9px] font-semibold capitalize transition " +
                          (el.motionPath?.shape === s
                            ? "border-sky-500 bg-sky-50/50 text-sky-700 ring-2 ring-sky-500/20"
                            : "border-slate-200 text-slate-500 hover:border-slate-300")
                        }
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  {el.motionPath && (
                    <>
                      <SliderWithInput
                        label="End X"
                        min={-1200}
                        max={1200}
                        step={10}
                        unit="px"
                        value={el.motionPath.dx}
                        onChange={(v) =>
                          update(el.id, { motionPath: { ...el.motionPath!, dx: v } } as never)
                        }
                      />
                      <SliderWithInput
                        label="End Y"
                        min={-1200}
                        max={1200}
                        step={10}
                        unit="px"
                        value={el.motionPath.dy}
                        onChange={(v) =>
                          update(el.id, { motionPath: { ...el.motionPath!, dy: v } } as never)
                        }
                      />
                      <SliderWithInput
                        label="Duration"
                        min={200}
                        max={8000}
                        step={100}
                        unit="ms"
                        value={el.motionPath.duration}
                        onChange={(v) =>
                          update(el.id, { motionPath: { ...el.motionPath!, duration: v } } as never)
                        }
                      />
                      <SliderWithInput
                        label="Delay"
                        min={0}
                        max={6000}
                        step={100}
                        unit="ms"
                        value={el.motionPath.delay ?? 0}
                        onChange={(v) =>
                          update(el.id, { motionPath: { ...el.motionPath!, delay: v } } as never)
                        }
                      />
                      {el.motionPath.shape === "orbit" && (
                        <SliderWithInput
                          label="Loops"
                          min={1}
                          max={5}
                          step={1}
                          unit=""
                          value={el.motionPath.loops ?? 1}
                          onChange={(v) =>
                            update(el.id, { motionPath: { ...el.motionPath!, loops: v } } as never)
                          }
                        />
                      )}
                      <label className="flex items-center gap-2 text-[10px] font-medium text-slate-600">
                        <input
                          type="checkbox"
                          checked={!!el.motionPath.rotateAlong}
                          onChange={(e) =>
                            update(el.id, {
                              motionPath: { ...el.motionPath!, rotateAlong: e.target.checked },
                            } as never)
                          }
                        />
                        Rotate along the path
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            window.dispatchEvent(
                              new CustomEvent("diapolab:preview-keyframes", {
                                detail: { id: el.id },
                              }),
                            )
                          }
                          className="rounded-lg border border-slate-200 bg-white py-1.5 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => update(el.id, { motionPath: undefined } as never)}
                          className="rounded-lg border border-rose-200 bg-rose-50 py-1.5 text-[10px] font-semibold text-rose-600 transition hover:bg-rose-100"
                        >
                          Remove path
                        </button>
                      </div>
                      <p className="text-[10px] leading-snug text-slate-400">
                        The element travels from its position to the End X/Y offset while
                        presenting.
                      </p>
                    </>
                  )}
                </div>
              </Field>
              <Field label="Audio cue (s)">
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={(el as { audioCue?: number }).audioCue ?? 0}
                  onChange={(e) =>
                    update(el.id, {
                      audioCue: Number(e.target.value) > 0 ? Number(e.target.value) : undefined,
                    } as never)
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-700 outline-none focus:border-sky-400"
                />
                <p className="mt-1 text-[10px] leading-snug text-slate-400">
                  Entrance, keyframes and motion path wait for this timestamp of the slide (and of
                  its background music).
                </p>
              </Field>
              <Field label="Hover effect (while presenting)">
                <Dropdown
                  value={el.interaction?.hoverEffect ?? "none"}
                  options={[
                    { value: "none", label: "None" },
                    { value: "glitch", label: "Glitch" },
                    { value: "color", label: "Color shift" },
                    { value: "gradient", label: "Gradient" },
                  ]}
                  onChange={(v) =>
                    update(el.id, {
                      interaction: { ...el.interaction, hoverEffect: v as HoverEffect },
                    } as never)
                  }
                />
              </Field>
              {el.interaction?.hoverEffect === "color" && (
                <ModernColorPicker
                  label="Hover color"
                  value={el.interaction?.hoverColor ?? "#2b6bff"}
                  onChange={(c) =>
                    update(el.id, { interaction: { ...el.interaction, hoverColor: c } } as never)
                  }
                />
              )}
            </Section>

            {/* ALIGN & DISTRIBUTE */}
            <Section title="Align & Distribute">
              <div className="grid grid-cols-6 gap-1.5">
                <button
                  type="button"
                  title="Align left"
                  aria-label="Align left"
                  onClick={() => alignSelected("left")}
                  className="grid aspect-square place-items-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <AlignStartHorizontal className="size-4" />
                </button>
                <button
                  type="button"
                  title="Align horizontal center"
                  aria-label="Align horizontal center"
                  onClick={() => alignSelected("center-h")}
                  className="grid aspect-square place-items-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <AlignCenterHorizontal className="size-4" />
                </button>
                <button
                  type="button"
                  title="Align right"
                  aria-label="Align right"
                  onClick={() => alignSelected("right")}
                  className="grid aspect-square place-items-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <AlignEndHorizontal className="size-4" />
                </button>
                <button
                  type="button"
                  title="Align top"
                  aria-label="Align top"
                  onClick={() => alignSelected("top")}
                  className="grid aspect-square place-items-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <AlignStartVertical className="size-4" />
                </button>
                <button
                  type="button"
                  title="Align vertical center"
                  aria-label="Align vertical center"
                  onClick={() => alignSelected("middle")}
                  className="grid aspect-square place-items-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <AlignCenterVertical className="size-4" />
                </button>
                <button
                  type="button"
                  title="Align bottom"
                  aria-label="Align bottom"
                  onClick={() => alignSelected("bottom")}
                  className="grid aspect-square place-items-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <AlignEndVertical className="size-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  title="Distribute horizontally (3+ objects)"
                  aria-label="Distribute horizontally"
                  onClick={() => distributeSelected("h")}
                  className="flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white py-1.5 text-[11px] font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <AlignHorizontalDistributeCenter className="size-4" /> Horizontal
                </button>
                <button
                  type="button"
                  title="Distribute vertically (3+ objects)"
                  aria-label="Distribute vertically"
                  onClick={() => distributeSelected("v")}
                  className="flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white py-1.5 text-[11px] font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <AlignVerticalDistributeCenter className="size-4" /> Vertical
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                One object aligns to the slide. Select several (Shift+click) to align to the
                selection or distribute evenly.
              </p>
            </Section>

            {/* LAYER ORDER ACTIONS */}
            <Section title="Layer Management">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => bringForward(el.id)}
                  className="flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <ArrowUp className="size-3.5" /> Forward
                </button>
                <button
                  type="button"
                  onClick={() => sendBackward(el.id)}
                  className="flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <ArrowDown className="size-3.5" /> Backward
                </button>
                <button
                  type="button"
                  onClick={() => duplicate(el.id)}
                  className="flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Copy className="size-3.5" /> Duplicate
                </button>
                <button
                  type="button"
                  onClick={() => remove(el.id)}
                  className="flex items-center justify-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 py-2 text-xs font-medium text-rose-600 hover:bg-rose-100"
                >
                  <Trash2 className="size-3.5" /> Delete
                </button>
              </div>
            </Section>

            <Section title="Element JSON" defaultOpen={false}>
              <p className="text-[10px] leading-relaxed text-slate-500">
                Edit the raw properties of the selected element. The id and type are locked. Apply
                with the button or ⌘/Ctrl + ↵.
              </p>
              <textarea
                value={jsonDraft}
                onChange={(event) => {
                  setJsonDraft(event.target.value);
                  setJsonDirty(true);
                  setJsonError(null);
                }}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                    event.preventDefault();
                    applyJson();
                  }
                }}
                spellCheck={false}
                aria-label="Selected element JSON"
                className="min-h-48 w-full resize-y rounded-lg border border-slate-200 bg-slate-950 p-3 font-mono text-[10px] leading-relaxed text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              {jsonError && <p className="text-[10px] font-medium text-rose-500">{jsonError}</p>}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={applyJson}
                  disabled={!jsonDirty}
                  className="flex-1 rounded-md bg-blue-600 py-1.5 text-[11px] font-semibold text-white transition hover:bg-blue-700 disabled:opacity-40"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={formatJson}
                  className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Format
                </button>
                <button
                  type="button"
                  onClick={resetJson}
                  disabled={!jsonDirty}
                  className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                >
                  Reset
                </button>
              </div>
            </Section>
            {rotoscopeOpen && el.type === "image" && (
              <RotoscopeEditor
                src={el.src}
                initialMask={el.rotoscopeMask}
                onApply={(mask) => {
                  update(el.id, { rotoscopeMask: mask } as never);
                  setRotoscopeOpen(false);
                }}
                onCancel={() => setRotoscopeOpen(false)}
              />
            )}
          </div>
        </aside>
      )}
    </>
  );
}
