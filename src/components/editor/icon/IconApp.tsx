import { useMemo, useState } from "react";
import { useEditor, type AnyElement } from "@/store/editor";
import type { PluginApp } from "@/lib/plugins";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import * as Lucide from "lucide-react";
import { Shapes, Check, Search, Sparkles } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Icon app — the built-in icon maker.                                  */
/* Two sources: built-in shapes, or ANY Lucide icon (searchable).      */
/* Tune the icon/plate colors, stroke weight, padding, export size —   */
/* then insert it on the slide as a crisp PNG.                          */
/* ------------------------------------------------------------------ */

type ShapeDef = { id: string; label: string; path: string };

/** All paths live in a 0–100 viewBox, centered and normalized. */
const SHAPES: ShapeDef[] = [
  { id: "square", label: "Square", path: "M10 10 H90 V90 H10 Z" },
  { id: "rounded", label: "Rounded", path: "M32 10 H68 A22 22 0 0 1 90 32 V68 A22 22 0 0 1 68 90 H32 A22 22 0 0 1 10 68 V32 A22 22 0 0 1 32 10 Z" },
  { id: "circle", label: "Circle", path: "M50 8 A42 42 0 1 1 49.9 8 Z" },
  { id: "triangle", label: "Triangle", path: "M50 8 L92 88 H8 Z" },
  { id: "diamond", label: "Diamond", path: "M50 6 L94 50 L50 94 L6 50 Z" },
  { id: "hexagon", label: "Hexagon", path: "M28 10 H72 L94 50 L72 90 H28 L6 50 Z" },
  { id: "pentagon", label: "Pentagon", path: "M50 6 L94 39 L77 91 H23 L6 39 Z" },
  { id: "star", label: "Star", path: "M50 4 L61 37 L96 37 L68 58 L79 92 L50 70 L21 92 L32 58 L4 37 L39 37 Z" },
  { id: "heart", label: "Heart", path: "M50 92 C18 68 6 48 6 32 C6 18 17 8 30 8 C39 8 47 13 50 21 C53 13 61 8 70 8 C83 8 94 18 94 32 C94 48 82 68 50 92 Z" },
  { id: "bolt", label: "Bolt", path: "M58 4 L20 56 H46 L38 96 L80 40 H52 Z" },
  { id: "shield", label: "Shield", path: "M50 4 L90 16 V52 C90 76 72 90 50 96 C28 90 10 76 10 52 V16 Z" },
  { id: "cross", label: "Cross", path: "M38 8 H62 V38 H92 V62 H62 V92 H38 V62 H8 V38 H38 Z" },
  { id: "arrow", label: "Arrow", path: "M8 42 H62 V22 L94 50 L62 78 V58 H8 Z" },
  { id: "moon", label: "Moon", path: "M62 6 A44 44 0 1 0 62 94 A36 36 0 1 1 62 6 Z" },
  { id: "drop", label: "Drop", path: "M50 4 C78 34 92 54 92 66 C92 82 73 96 50 96 C27 96 8 82 8 66 C8 54 22 34 50 4 Z" },
  { id: "flower", label: "Flower", path: "M50 6 C60 6 68 14 68 24 C76 20 86 26 86 38 C86 48 78 54 70 54 L60 52 C68 60 74 72 66 82 C58 90 46 88 40 80 C34 88 22 88 14 80 C6 70 12 58 22 52 L14 54 C6 54 0 46 0 38 C0 26 10 20 18 24 C18 14 26 6 36 6 C42 6 47 9 50 14 C53 9 46 6 50 6 Z" },
  { id: "pin", label: "Pin", path: "M50 4 C68 4 82 18 82 36 C82 58 50 96 50 96 C50 96 18 58 18 36 C18 18 32 4 50 4 Z M50 26 A10 10 0 1 0 50.1 26 Z" },
  { id: "ticket", label: "Ticket", path: "M8 26 A8 8 0 0 0 16 34 A8 8 0 0 1 16 66 A8 8 0 0 0 8 74 H40 V66 H60 V74 H92 A8 8 0 0 0 84 66 A8 8 0 0 1 84 34 A8 8 0 0 0 92 26 Z" },
];

const NON_ICONS = new Set([
  "Icon",
  "DynamicIcon",
  "createLucideIcon",
  "LucideIcon",
  "LucideProps",
  "icons",
]);

/** Every Lucide icon component, name-sorted (PascalCase names only). */
const LUCIDE_LIST: Array<{ name: string; Comp: React.ComponentType<{ size?: number | string; strokeWidth?: number | string; className?: string; style?: React.CSSProperties }> }> = Object.entries(Lucide)
  .filter(
    ([name, val]) =>
      typeof val === "function" &&
      /^[A-Z]/.test(name) &&
      !NON_ICONS.has(name),
  )
  .map(([name, Comp]) => ({ name, Comp: Comp as never }))
  .sort((a, b) => a.name.localeCompare(b.name));

const FG_DEFAULT = "#2563eb";
const BG_SWATCHES = ["transparent", "#f8fafc", "#0a0f1f", "#2563eb", "#ff0080", "#ffd84a", "#059669", "#7c3aed"];
const FG_SWATCHES = ["#ffffff", "#0a0f1f", "#2563eb", "#7df9ff", "#ff0080", "#ffd84a", "#059669", "#7c3aed"];
const EXPORT_SIZES = [128, 256, 512, 1024];

export function IconAppDialog({
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

  const [mode, setMode] = useState<"lucide" | "shape">("lucide");
  const [query, setQuery] = useState("");
  const [iconName, setIconName] = useState("Sparkles");
  const [shapeId, setShapeId] = useState("rounded");
  const [fg, setFg] = useState(FG_DEFAULT);
  const [bg, setBg] = useState<string | "transparent">("transparent");
  const [strokeW, setStrokeW] = useState(2);
  const [padPct, setPadPct] = useState(10);
  const [outSize, setOutSize] = useState(512);

  const shape = SHAPES.find((s) => s.id === shapeId) ?? SHAPES[0];
  const LucideIcon = useMemo(
    () => LUCIDE_LIST.find((i) => i.name === iconName)?.Comp ?? Sparkles,
    [iconName],
  );
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? LUCIDE_LIST.filter((i) => i.name.toLowerCase().includes(q))
      : LUCIDE_LIST;
    return list.slice(0, 96);
  }, [query]);

  /** Paint the plate + the prepared image on a square canvas → PNG. */
  const placeOnPlate = (draw: (ctx: CanvasRenderingContext2D) => void, done: (url: string) => void) => {
    const c = document.createElement("canvas");
    c.width = outSize;
    c.height = outSize;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    if (bg !== "transparent") {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, outSize, outSize);
    }
    draw(ctx);
    done(c.toDataURL("image/png"));
  };

  const insert = () => {
    const place = (dataUrl: string) => {
      const w = Math.min(480, Math.round(canvasW * 0.25));
      add({
        type: "image",
        id: crypto.randomUUID(),
        x: Math.round((canvasW - w) / 2),
        y: Math.round((canvasH - w) / 2),
        width: w,
        height: w,
        rotation: 0,
        src: dataUrl,
        fit: "contain",
      } as unknown as AnyElement);
      onOpenChange(false);
    };

    if (mode === "shape") {
      placeOnPlate((ctx) => {
        const inner = outSize * (1 - padPct / 100);
        const scale = inner / 100;
        const off = (outSize - inner) / 2;
        ctx.save();
        ctx.translate(off, off);
        ctx.scale(scale, scale);
        ctx.fillStyle = fg;
        ctx.fill(new Path2D(shape.path));
        ctx.restore();
      }, place);
      return;
    }

    // Lucide: serialize the live preview SVG, rasterize it onto the plate.
    const svgEl = previewRef.current?.querySelector("svg");
    if (!svgEl) return;
    const clone = svgEl.cloneNode(true) as SVGElement;
    clone.setAttribute("stroke", fg);
    clone.setAttribute("color", fg);
    clone.setAttribute("width", "512");
    clone.setAttribute("height", "512");
    clone.removeAttribute("class");
    const svgStr = new XMLSerializer().serializeToString(clone);
    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgStr);
    const img = new Image();
    img.onload = () => {
      placeOnPlate((ctx) => {
        const inner = outSize * (1 - padPct / 100);
        const off = (outSize - inner) / 2;
        ctx.drawImage(img, off, off, inner, inner);
      }, place);
    };
    img.src = url;
  };

  const previewRef = useRef<HTMLDivElement>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-xl gap-0 overflow-y-auto p-0 sm:rounded-3xl">
        <DialogHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-indigo-50/50 px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-[0_6px_14px_rgba(79,70,229,0.35)]">
              <Shapes className="size-4" />
            </span>
            Icon
            {app.description && (
              <span className="truncate text-[11px] font-medium text-slate-400">
                — {app.description}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 p-4">
          {/* live preview (also the SVG source for the Lucide rasterizer) */}
          <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-[repeating-conic-gradient(#f1f5f9_0%_25%,#ffffff_0%_50%)_50%/16px_16px] p-4">
            <div
              ref={previewRef}
              className="grid place-items-center"
              style={{
                width: 128,
                height: 128,
                background: bg === "transparent" ? undefined : bg,
                borderRadius: bg === "transparent" ? 0 : 16,
              }}
            >
              {mode === "lucide" ? (
                <LucideIcon size={128 * (1 - padPct / 100)} strokeWidth={strokeW} style={{ color: fg }} />
              ) : (
                <svg viewBox="0 0 100 100" width={128} height={128}>
                  <g transform={`translate(${padPct / 2} ${padPct / 2}) scale(${(100 - padPct) / 100})`}>
                    <path d={shape.path} fill={fg} />
                  </g>
                </svg>
              )}
            </div>
          </div>

          {/* mode tabs */}
          <div className="flex items-center gap-1.5">
            {(["lucide", "shape"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-all ${
                  mode === m
                    ? "border-indigo-600 bg-indigo-50 text-indigo-600"
                    : "border-slate-200 bg-white text-slate-500 hover:border-indigo-300"
                }`}
              >
                {m === "lucide" ? `Lucide icons (${LUCIDE_LIST.length})` : "Shapes"}
              </button>
            ))}
          </div>

          {mode === "lucide" ? (
            <>
              {/* search */}
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5">
                <Search className="size-3.5 shrink-0 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search ${LUCIDE_LIST.length} icons… (rocket, check, star, play…)`}
                  className="w-full bg-transparent text-[11px] font-medium text-slate-700 outline-none placeholder:text-slate-300"
                />
                <span className="shrink-0 text-[9px] font-semibold text-slate-400 tabular-nums">
                  {matches.length}+
                </span>
              </label>

              {/* icon grid */}
              <div className="grid max-h-40 grid-cols-8 gap-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
                {matches.map(({ name, Comp }) => (
                  <button
                    key={name}
                    title={name}
                    onClick={() => setIconName(name)}
                    className={`grid aspect-square place-items-center rounded-lg border transition-all ${
                      iconName === name
                        ? "border-indigo-600 bg-indigo-50 text-indigo-600"
                        : "border-transparent text-slate-400 hover:border-slate-200 hover:text-slate-600"
                    }`}
                  >
                    <Comp size={16} strokeWidth={strokeW} />
                  </button>
                ))}
              </div>
            </>
          ) : (
            /* shape grid */
            <div className="grid grid-cols-6 gap-1.5 rounded-xl border border-slate-200 p-2.5">
              {SHAPES.map((s) => (
                <button
                  key={s.id}
                  title={s.label}
                  onClick={() => setShapeId(s.id)}
                  className={`grid aspect-square place-items-center rounded-lg border p-1.5 transition-all ${
                    shapeId === s.id
                      ? "border-indigo-600 bg-indigo-50"
                      : "border-slate-200 bg-white hover:border-indigo-300"
                  }`}
                >
                  <svg viewBox="0 0 100 100" className="size-full">
                    <path d={s.path} fill={shapeId === s.id ? "#4f46e5" : "#94a3b8"} />
                  </svg>
                </button>
              ))}
            </div>
          )}

          {/* colors */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Icon</span>
              {FG_SWATCHES.map((c) => (
                <button
                  key={c}
                  title={c}
                  onClick={() => setFg(c)}
                  className={`size-6 rounded-full border-2 transition-transform hover:scale-110 ${
                    fg === c ? "border-indigo-600 ring-2 ring-indigo-200" : "border-white shadow"
                  }`}
                  style={{ background: c }}
                />
              ))}
              <label
                title="Custom icon color"
                className="relative grid size-6 cursor-pointer place-items-center rounded-full border-2 border-white shadow transition-transform hover:scale-110"
                style={{ background: "conic-gradient(red, orange, yellow, green, cyan, blue, magenta, red)" }}
              >
                <input
                  type="color"
                  value={fg}
                  onChange={(e) => setFg(e.target.value)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Plate</span>
              {BG_SWATCHES.map((c) => (
                <button
                  key={c}
                  title={c === "transparent" ? "No background" : c}
                  onClick={() => setBg(c)}
                  className={`size-6 rounded-full border-2 transition-transform hover:scale-110 ${
                    bg === c ? "border-indigo-600 ring-2 ring-indigo-200" : "border-white shadow"
                  }`}
                  style={{
                    background:
                      c === "transparent"
                        ? "repeating-conic-gradient(#e2e8f0 0% 25%, #ffffff 0% 50%) 50% / 8px 8px"
                        : c,
                  }}
                />
              ))}
              <label
                title="Custom plate color"
                className="relative grid size-6 cursor-pointer place-items-center rounded-full border-2 border-white shadow transition-transform hover:scale-110"
                style={{ background: "conic-gradient(red, orange, yellow, green, cyan, blue, magenta, red)" }}
              >
                <input
                  type="color"
                  value={bg === "transparent" ? "#ffffff" : bg}
                  onChange={(e) => setBg(e.target.value)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>
            </span>
          </div>

          {/* stroke + padding + export size */}
          <div className="flex flex-wrap items-center gap-3">
            {mode === "lucide" && (
              <label className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                Stroke
                <input
                  type="range"
                  min={1}
                  max={4}
                  step={0.25}
                  value={strokeW}
                  onChange={(e) => setStrokeW(Number(e.target.value))}
                  className="h-1 w-16 cursor-pointer accent-indigo-600"
                />
                <span className="w-6 tabular-nums">{strokeW}</span>
              </label>
            )}
            <label className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
              Padding
              <input
                type="range"
                min={0}
                max={40}
                value={padPct}
                onChange={(e) => setPadPct(Number(e.target.value))}
                className="h-1 w-20 cursor-pointer accent-indigo-600"
              />
              <span className="w-7 tabular-nums">{padPct}%</span>
            </label>
            <span className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Export</span>
              {EXPORT_SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => setOutSize(s)}
                  className={`rounded-lg border px-2 py-1.5 text-[10px] font-semibold transition-all ${
                    outSize === s
                      ? "border-indigo-600 bg-indigo-50 text-indigo-600"
                      : "border-slate-200 bg-white text-slate-500 hover:border-indigo-300"
                  }`}
                >
                  {s}px
                </button>
              ))}
            </span>
            <button
              onClick={insert}
              className="ml-auto flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2 text-xs font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,0.35)] transition-transform hover:-translate-y-0.5"
            >
              <Check className="size-3.5" />
              Insert on slide
            </button>
          </div>
          <p className="text-[9px] leading-relaxed text-slate-400">
            {mode === "lucide"
              ? `Selected: ${iconName}. The `
              : "The "}
            icon is exported as a crisp {outSize}×{outSize} PNG — it stays sharp at any size on the slide.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
