import { useEffect, useRef, useState } from "react";
import { useEditor, type AnyElement } from "@/store/editor";
import type { PluginApp } from "@/lib/plugins";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Brush,
  Eraser,
  Minus,
  Square,
  Circle,
  MoveUpRight,
  Trash2,
  Undo2,
  Redo2,
  Check,
  Droplets,
  PaintBucket,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Paint app — the built-in drawing studio shipped by the Paint plugin */
/* Brush, eraser, line, rectangle, ellipse and arrow tools with live   */
/* preview, opacity, fill mode, undo/redo and custom colors. The      */
/* doodle is rasterized to a PNG and inserted as an image element.     */
/* ------------------------------------------------------------------ */

type Tool = "brush" | "eraser" | "line" | "rect" | "ellipse" | "arrow";
const SHAPE_TOOLS: Tool[] = ["line", "rect", "ellipse", "arrow"];

type Stroke = {
  tool: Tool;
  color: string;
  size: number;
  opacity: number;
  filled: boolean;
  erase: boolean;
  points: Array<{ x: number; y: number }>;
};

const DEFAULT_COLORS = ["#0a0f1f", "#2563eb", "#ff0080", "#ffd84a", "#059669", "#7c3aed"];
const DEFAULT_SIZES = [4, 8, 16, 28, 48];

const TOOLS: Array<{ tool: Tool; label: string; Icon: typeof Brush }> = [
  { tool: "brush", label: "Brush", Icon: Brush },
  { tool: "eraser", label: "Eraser", Icon: Eraser },
  { tool: "line", label: "Line", Icon: Minus },
  { tool: "rect", label: "Rectangle", Icon: Square },
  { tool: "ellipse", label: "Ellipse", Icon: Circle },
  { tool: "arrow", label: "Arrow", Icon: MoveUpRight },
];

/** Paints one stroke onto a 2D context at the given scale. */
function paintStroke(ctx: CanvasRenderingContext2D, s: Stroke, sx: number, sy: number) {
  if (s.points.length === 0) return;
  ctx.save();
  ctx.globalCompositeOperation = s.erase ? "destination-out" : "source-over";
  ctx.globalAlpha = s.opacity;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = s.color;
  ctx.fillStyle = s.color;
  ctx.lineWidth = s.size * sx;
  const p0 = s.points[0];
  const p1 = s.points[s.points.length - 1];
  ctx.beginPath();
  if (s.tool === "brush" || s.tool === "eraser") {
    ctx.moveTo(p0.x * sx, p0.y * sy);
    for (const p of s.points.slice(1)) ctx.lineTo(p.x * sx, p.y * sy);
    ctx.stroke();
  } else if (s.tool === "line" || s.tool === "arrow") {
    ctx.moveTo(p0.x * sx, p0.y * sy);
    ctx.lineTo(p1.x * sx, p1.y * sy);
    ctx.stroke();
    if (s.tool === "arrow") {
      // arrow head
      const ang = Math.atan2(p1.y - p0.y, p1.x - p0.x);
      const head = Math.max(12, s.size * 2.5) * sx;
      ctx.beginPath();
      ctx.moveTo(p1.x * sx, p1.y * sy);
      ctx.lineTo(p1.x * sx - head * Math.cos(ang - Math.PI / 6), p1.y * sy - head * Math.sin(ang - Math.PI / 6));
      ctx.moveTo(p1.x * sx, p1.y * sy);
      ctx.lineTo(p1.x * sx - head * Math.cos(ang + Math.PI / 6), p1.y * sy - head * Math.sin(ang + Math.PI / 6));
      ctx.stroke();
    }
  } else if (s.tool === "rect") {
    const x = Math.min(p0.x, p1.x) * sx;
    const y = Math.min(p0.y, p1.y) * sy;
    const w = Math.abs(p1.x - p0.x) * sx;
    const h = Math.abs(p1.y - p0.y) * sy;
    if (s.filled) ctx.fillRect(x, y, w, h);
    else ctx.strokeRect(x, y, w, h);
  } else if (s.tool === "ellipse") {
    const cx = ((p0.x + p1.x) / 2) * sx;
    const cy = ((p0.y + p1.y) / 2) * sy;
    ctx.ellipse(cx, cy, (Math.abs(p1.x - p0.x) / 2) * sx, (Math.abs(p1.y - p0.y) / 2) * sy, 0, 0, Math.PI * 2);
    if (s.filled) ctx.fill();
    else ctx.stroke();
  }
  ctx.restore();
}

export function PaintAppDialog({
  app,
  open,
  onOpenChange,
}: {
  app: PluginApp;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const add = useEditor((s) => s.add);
  const canvasW = useEditor((s) => s.canvasW);
  const canvasH = useEditor((s) => s.canvasH);

  const cfg = app.config ?? {};
  const colors = cfg.colors && cfg.colors.length ? cfg.colors : DEFAULT_COLORS;
  const sizes = cfg.brushSizes && cfg.brushSizes.length ? cfg.brushSizes : DEFAULT_SIZES;
  const outW = cfg.width ?? Math.round(canvasW / 2);
  const outH = cfg.height ?? Math.round((outW * canvasH) / canvasW);
  const defaultBg = cfg.bg && cfg.bg !== "transparent" ? cfg.bg : "#ffffff";
  const [bg, setBg] = useState(defaultBg);
  const transparent = bg === "transparent";

  const [tool, setTool] = useState<Tool>("brush");
  const [color, setColor] = useState(cfg.defaultColor ?? colors[0]);
  const [size, setSize] = useState(sizes[Math.floor(sizes.length / 2)] ?? 8);
  const [opacity, setOpacity] = useState(100);
  const [filled, setFilled] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const drawing = useRef(false);
  const padRef = useRef<HTMLCanvasElement>(null);
  const startRef = useRef({ x: 0, y: 0 });
  const [freehand, setFreehand] = useState<Array<{ x: number; y: number }>>([]);

  const dispW = 640;
  const dispH = Math.round((dispW * outH) / outW);

  const liveStroke = (to: { x: number; y: number }): Stroke => ({
    tool,
    color,
    size,
    opacity: opacity / 100,
    filled,
    erase: tool === "eraser",
    points: SHAPE_TOOLS.includes(tool) ? [startRef.current, to] : [...freehand, to],
  });

  const redraw = (preview?: Stroke | null) => {
    const pad = padRef.current;
    if (!pad) return;
    const ctx = pad.getContext("2d");
    if (!ctx) return;
    const sx = outW / dispW;
    const sy = outH / dispH;
    ctx.clearRect(0, 0, pad.width, pad.height);
    if (!transparent) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, pad.width, pad.height);
    }
    for (const s of strokes) paintStroke(ctx, s, sx, sy);
    if (preview) paintStroke(ctx, preview, sx, sy);
  };

  useEffect(() => redraw(drag ? liveStroke(drag) : null), [strokes, drag, open, bg, outW, outH]);

  const pos = (e: React.PointerEvent) => {
    const pad = padRef.current!;
    const r = pad.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (dispW / r.width), y: (e.clientY - r.top) * (dispH / r.height) };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    drawing.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const p = pos(e);
    startRef.current = p;
    if (SHAPE_TOOLS.includes(tool)) {
      setDrag(p);
    } else {
      setFreehand([p]);
    }
    setRedoStack([]);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const p = pos(e);
    if (SHAPE_TOOLS.includes(tool)) {
      setDrag(p);
    } else {
      setFreehand((prev) => [...prev, p]);
    }
  };
  const onPointerUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (SHAPE_TOOLS.includes(tool)) {
      if (drag) setStrokes((prev) => [...prev, liveStroke(drag)]);
      setDrag(null);
    } else {
      if (freehand.length > 0)
        setStrokes((prev) => [
          ...prev,
          { tool, color, size, opacity: opacity / 100, filled, erase: tool === "eraser", points: freehand },
        ]);
      setFreehand([]);
    }
  };

  const undo = () => {
    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      setRedoStack((r) => [...r, prev[prev.length - 1]]);
      return prev.slice(0, -1);
    });
  };
  const redo = () => {
    setRedoStack((r) => {
      if (r.length === 0) return r;
      const s = r[r.length - 1];
      setStrokes((prev) => [...prev, s]);
      return r.slice(0, -1);
    });
  };

  const insert = () => {
    const out = document.createElement("canvas");
    out.width = outW;
    out.height = outH;
    const ctx = out.getContext("2d");
    if (!ctx) return;
    if (!transparent) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, outW, outH);
    }
    for (const s of strokes) paintStroke(ctx, s, outW / dispW, outH / dispH);
    const src = out.toDataURL("image/png");
    add({
      type: "image",
      id: crypto.randomUUID(),
      x: Math.round((canvasW - outW) / 2),
      y: Math.round((canvasH - outH) / 2),
      width: outW,
      height: outH,
      rotation: 0,
      src,
      fit: "contain",
    } as unknown as AnyElement);
    onOpenChange(false);
  };

  const clearAll = () => {
    setStrokes([]);
    setRedoStack([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-xl gap-0 overflow-y-auto p-0 sm:rounded-3xl">
        <DialogHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-indigo-50/50 px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-[0_6px_14px_rgba(79,70,229,0.35)]">
              <Brush className="size-4" />
            </span>
            Paint
            {app.description && (
              <span className="truncate text-[11px] font-medium text-slate-400">
                — {app.description}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 p-4">
          {/* Tools row */}
          <div className="flex flex-wrap items-center gap-1.5">
            {TOOLS.map(({ tool: t, label, Icon }) => (
              <button
                key={t}
                title={label}
                onClick={() => setTool(t)}
                className={`grid size-9 place-items-center rounded-lg border transition-all ${
                  tool === t
                    ? "border-indigo-600 bg-indigo-600 text-white shadow-[0_4px_10px_rgba(79,70,229,0.4)]"
                    : "border-slate-200 bg-white text-slate-500 hover:border-indigo-300"
                }`}
              >
                <Icon className="size-4" />
              </button>
            ))}
            <button
              title={filled ? "Shape fill: ON" : "Shape fill: OFF"}
              disabled={tool === "line" || tool === "arrow" || tool === "brush" || tool === "eraser"}
              onClick={() => setFilled((f) => !f)}
              className={`grid size-9 place-items-center rounded-lg border transition-all disabled:opacity-30 ${
                filled
                  ? "border-indigo-600 bg-indigo-50 text-indigo-600"
                  : "border-slate-200 bg-white text-slate-500 hover:border-indigo-300"
              }`}
            >
              <PaintBucket className="size-4" />
            </button>
            <span className="mx-1 h-6 w-px bg-slate-200" />
            {/* Brush sizes inline */}
            {sizes.map((s) => (
              <button
                key={s}
                title={`Size ${s}px`}
                onClick={() => setSize(s)}
                className={`grid size-9 place-items-center rounded-lg border transition-all ${
                  size === s ? "border-indigo-600 bg-indigo-50" : "border-slate-200 bg-white hover:border-indigo-300"
                }`}
              >
                <span
                  className="rounded-full bg-slate-800"
                  style={{ width: Math.min(18, 3 + s * 0.38), height: Math.min(18, 3 + s * 0.38) }}
                />
              </button>
            ))}
            <span className="mx-1 h-6 w-px bg-slate-200" />
            <button
              title="Undo"
              disabled={strokes.length === 0}
              onClick={undo}
              className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:border-indigo-300 disabled:opacity-40"
            >
              <Undo2 className="size-4" />
            </button>
            <button
              title="Redo"
              disabled={redoStack.length === 0}
              onClick={redo}
              className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:border-indigo-300 disabled:opacity-40"
            >
              <Redo2 className="size-4" />
            </button>
            <button
              title="Clear all"
              disabled={strokes.length === 0}
              onClick={clearAll}
              className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:border-rose-300 hover:text-rose-500 disabled:opacity-40"
            >
              <Trash2 className="size-4" />
            </button>
          </div>

          {/* Pad — height capped so the dialog always fits the screen */}
          <div className="mx-auto w-full" style={{ maxWidth: Math.round(300 * (outW / outH)) }}>
            <canvas
              ref={padRef}
              width={dispW}
              height={dispH}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
              className={`block w-full touch-none rounded-xl border-2 border-dashed border-slate-300 bg-white shadow-inner ${
                tool === "eraser" ? "cursor-cell" : "cursor-crosshair"
              }`}
              style={{ background: transparent ? "repeating-conic-gradient(#f1f5f9 0% 25%, #ffffff 0% 50%) 50% / 24px 24px" : undefined }}
            />
          </div>

          {/* Palette + actions */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {colors.map((c) => (
                <button
                  key={c}
                  title={c}
                  onClick={() => {
                    setColor(c);
                    if (tool === "eraser") setTool("brush");
                  }}
                  className={`size-6 rounded-full border-2 transition-transform hover:scale-110 ${
                    color === c && tool !== "eraser" ? "border-indigo-600 ring-2 ring-indigo-200" : "border-white shadow"
                  }`}
                  style={{ background: c }}
                />
              ))}
              <label
                title="Custom color"
                className="relative grid size-6 cursor-pointer place-items-center rounded-full border-2 border-white shadow transition-transform hover:scale-110"
                style={{ background: "conic-gradient(red, orange, yellow, green, cyan, blue, magenta, red)" }}
              >
                <input
                  type="color"
                  value={color}
                  onChange={(e) => {
                    setColor(e.target.value);
                    if (tool === "eraser") setTool("brush");
                  }}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>
              {/* opacity */}
              <span className="ml-1.5 flex items-center gap-1 text-[10px] font-semibold text-slate-400" title="Opacity">
                <Droplets className="size-3" />
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="h-1 w-16 cursor-pointer accent-indigo-600"
                />
                <span className="w-7 tabular-nums">{opacity}%</span>
              </span>
              {/* background toggle */}
              <button
                title={transparent ? "Background: transparent" : "Background: " + bg + " — click for transparent"}
                onClick={() => setBg((b) => (b === "transparent" ? defaultBg : "transparent"))}
                className={`ml-1 grid size-6 place-items-center rounded-md border transition-all ${
                  transparent ? "border-indigo-600 bg-indigo-50 text-indigo-600" : "border-slate-200 bg-white text-slate-400"
                }`}
              >
                <span
                  className="size-3 rounded"
                  style={{ background: transparent ? "repeating-conic-gradient(#e2e8f0 0% 25%, #ffffff 0% 50%) 50% / 8px 8px" : bg }}
                />
              </button>
            </div>
            <button
              onClick={insert}
              disabled={strokes.length === 0}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2 text-xs font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,0.35)] transition-transform hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
            >
              <Check className="size-3.5" />
              Insert on slide
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
