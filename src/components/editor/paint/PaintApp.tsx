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
  Trash2,
  Undo2,
  Check,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Paint app — freehand drawing pad shipped by plugins (type "paint")  */
/* The doodle is rasterized to a PNG and inserted as an image element. */
/* ------------------------------------------------------------------ */

type Stroke = {
  color: string;
  size: number;
  erase: boolean;
  points: Array<{ x: number; y: number }>;
};

const DEFAULT_COLORS = ["#0a0f1f", "#2563eb", "#ff0080", "#ffd84a", "#059669", "#7c3aed"];
const DEFAULT_SIZES = [4, 8, 14, 24];

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
  // paint resolution in slide pixels (default 16:9 half-slide)
  const outW = cfg.width ?? Math.round(canvasW / 2);
  const outH = cfg.height ?? Math.round((outW * canvasH) / canvasW);
  const bg = cfg.bg && cfg.bg !== "transparent" ? cfg.bg : null;

  const [color, setColor] = useState(cfg.defaultColor ?? colors[0]);
  const [size, setSize] = useState(sizes[Math.floor(sizes.length / 2)] ?? 8);
  const [eraser, setEraser] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const drawing = useRef(false);
  const padRef = useRef<HTMLCanvasElement>(null);

  // display resolution of the pad (CSS px) — 16:9-ish, capped to dialog width
  const dispW = 640;
  const dispH = Math.round((dispW * outH) / outW);

  const redraw = () => {
    const pad = padRef.current;
    if (!pad) return;
    const ctx = pad.getContext("2d");
    if (!ctx) return;
    const sx = outW / dispW;
    const sy = outH / dispH;
    ctx.clearRect(0, 0, pad.width, pad.height);
    if (bg) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, pad.width, pad.height);
    }
    for (const s of strokes) {
      if (s.points.length === 0) continue;
      ctx.globalCompositeOperation = s.erase ? "destination-out" : "source-over";
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.size * sx;
      ctx.beginPath();
      ctx.moveTo(s.points[0].x * sx, s.points[0].y * sy);
      for (const p of s.points.slice(1)) ctx.lineTo(p.x * sx, p.y * sy);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
  };

  useEffect(redraw, [strokes, open, bg, outW, outH]);

  const pos = (e: React.PointerEvent) => {
    const pad = padRef.current!;
    const r = pad.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (dispW / r.width), y: (e.clientY - r.top) * (dispH / r.height) };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    drawing.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setStrokes((prev) => [...prev, { color, size, erase: eraser, points: [pos(e)] }]);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const p = pos(e);
    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      return [...prev.slice(0, -1), { ...last, points: [...last.points, p] }];
    });
  };
  const onPointerUp = () => {
    drawing.current = false;
  };

  const insert = () => {
    // rasterize at full slide resolution
    const out = document.createElement("canvas");
    out.width = outW;
    out.height = outH;
    const ctx = out.getContext("2d");
    if (!ctx) return;
    if (bg) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, outW, outH);
    }
    for (const s of strokes) {
      if (s.points.length === 0) continue;
      ctx.globalCompositeOperation = s.erase ? "destination-out" : "source-over";
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.size;
      ctx.beginPath();
      ctx.moveTo(s.points[0].x * (outW / dispW), s.points[0].y * (outH / dispH));
      for (const p of s.points.slice(1)) ctx.lineTo(p.x * (outW / dispW), p.y * (outH / dispH));
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0 sm:rounded-3xl">
        <DialogHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-indigo-50/50 px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <span className="grid size-8 place-items-center rounded-xl bg-indigo-600 text-white shadow-[0_6px_14px_rgba(79,70,229,0.35)]">
              <Brush className="size-4" />
            </span>
            {app.name}
            {app.description && (
              <span className="truncate text-[11px] font-medium text-slate-400">
                — {app.description}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 p-5">
          {/* toolbar */}
          <div className="flex w-12 shrink-0 flex-col items-center gap-2">
            <button
              title="Brush"
              onClick={() => setEraser(false)}
              className={`grid size-10 place-items-center rounded-xl border transition-all ${
                !eraser
                  ? "border-indigo-600 bg-indigo-600 text-white shadow-[0_6px_14px_rgba(79,70,229,0.4)]"
                  : "border-slate-200 bg-white text-slate-500 hover:border-indigo-300"
              }`}
            >
              <Brush className="size-4" />
            </button>
            <button
              title="Eraser"
              onClick={() => setEraser(true)}
              className={`grid size-10 place-items-center rounded-xl border transition-all ${
                eraser
                  ? "border-indigo-600 bg-indigo-600 text-white shadow-[0_6px_14px_rgba(79,70,229,0.4)]"
                  : "border-slate-200 bg-white text-slate-500 hover:border-indigo-300"
              }`}
            >
              <Eraser className="size-4" />
            </button>
            <button
              title="Undo stroke"
              disabled={strokes.length === 0}
              onClick={() => setStrokes((s) => s.slice(0, -1))}
              className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:border-indigo-300 disabled:opacity-40"
            >
              <Undo2 className="size-4" />
            </button>
            <button
              title="Clear all"
              disabled={strokes.length === 0}
              onClick={() => setStrokes([])}
              className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:border-rose-300 hover:text-rose-500 disabled:opacity-40"
            >
              <Trash2 className="size-4" />
            </button>
            <div className="my-1 h-px w-8 bg-slate-200" />
            {sizes.map((s) => (
              <button
                key={s}
                title={`Brush ${s}px`}
                onClick={() => setSize(s)}
                className={`grid size-10 place-items-center rounded-xl border transition-all ${
                  size === s
                    ? "border-indigo-600 bg-indigo-50"
                    : "border-slate-200 bg-white hover:border-indigo-300"
                }`}
              >
                <span
                  className="rounded-full bg-slate-800"
                  style={{ width: Math.min(18, 4 + s * 0.5), height: Math.min(18, 4 + s * 0.5) }}
                />
              </button>
            ))}
          </div>

          {/* pad + palette */}
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <canvas
              ref={padRef}
              width={dispW}
              height={dispH}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
              className={`w-full touch-none rounded-2xl border-2 border-dashed border-slate-300 bg-white shadow-inner ${
                eraser ? "cursor-cell" : "cursor-crosshair"
              }`}
              style={{ background: bg ?? "repeating-conic-gradient(#f1f5f9 0% 25%, #ffffff 0% 50%) 50% / 24px 24px" }}
            />
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {colors.map((c) => (
                  <button
                    key={c}
                    title={c}
                    onClick={() => {
                      setColor(c);
                      setEraser(false);
                    }}
                    className={`size-7 rounded-full border-2 transition-transform hover:scale-110 ${
                      color === c && !eraser ? "border-indigo-600 ring-2 ring-indigo-200" : "border-white shadow"
                    }`}
                    style={{ background: c }}
                  />
                ))}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
