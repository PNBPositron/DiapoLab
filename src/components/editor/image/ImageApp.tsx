import { useRef, useState, type ChangeEvent, type PointerEvent as RPointerEvent } from "react";
import { useEditor, type AnyElement, type ImageFilters, DEFAULT_FILTERS } from "@/store/editor";
import type { PluginApp } from "@/lib/plugins";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Image as ImageIcon,
  Upload,
  RotateCw,
  RotateCcw,
  FlipHorizontal2,
  FlipVertical2,
  Crop,
  Check,
  Eye,
  Move,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Image app — the built-in advanced image editor.                     */
/* Filters & presets, draggable zoom/pan crop, free rotation, flips,  */
/* rounded corners, border, vignette, drop shadow, before/after        */
/* compare, multiple export formats — then insert on the slide.        */
/* ------------------------------------------------------------------ */

const SLIDERS: Array<{
  key: keyof ImageFilters;
  label: string;
  min: number;
  max: number;
  step: number;
}> = [
  { key: "brightness", label: "Bright", min: 0, max: 200, step: 1 },
  { key: "contrast", label: "Contrast", min: 0, max: 200, step: 1 },
  { key: "saturate", label: "Sat", min: 0, max: 200, step: 1 },
  { key: "blur", label: "Blur", min: 0, max: 20, step: 0.5 },
  { key: "grayscale", label: "B&W", min: 0, max: 100, step: 1 },
  { key: "sepia", label: "Sepia", min: 0, max: 100, step: 1 },
  { key: "hueRotate", label: "Hue", min: 0, max: 360, step: 1 },
  { key: "invert", label: "Invert", min: 0, max: 100, step: 1 },
];

const PRESETS: Array<{ id: string; label: string; f: Partial<ImageFilters> }> = [
  { id: "original", label: "Original", f: {} },
  { id: "vivid", label: "Vivid", f: { saturate: 145, contrast: 115 } },
  { id: "noir", label: "Noir", f: { grayscale: 100, contrast: 125 } },
  { id: "warm", label: "Warm", f: { temperature: 40, brightness: 105 } },
  { id: "cool", label: "Cool", f: { temperature: -40 } },
  { id: "gold", label: "Gold", f: { temperature: 45, tintColor: "#ffd700", tintOpacity: 14 } },
  { id: "cyber", label: "Cyber", f: { temperature: -35, tintColor: "#ff00ff", tintOpacity: 16, saturate: 140 } },
  { id: "to", label: "T/O", f: { temperature: 25, tintColor: "#00b3b3", tintOpacity: 12, saturate: 120, contrast: 110 } },
  { id: "vintage", label: "Vintage", f: { sepia: 55, contrast: 90, brightness: 105 } },
  { id: "fade", label: "Fade", f: { contrast: 82, brightness: 112, saturate: 75 } },
  { id: "xray", label: "X-Ray", f: { invert: 100, grayscale: 40 } },
  { id: "punch", label: "Punch", f: { saturate: 160, contrast: 130 } },
  { id: "crisp", label: "Crisp", f: { contrast: 140, saturate: 110 } },
  { id: "silver", label: "Silver", f: { grayscale: 100, brightness: 112, contrast: 105 } },
  { id: "charcoal", label: "Charcoal", f: { grayscale: 100, contrast: 160, brightness: 92 } },
  { id: "mono", label: "Mono", f: { grayscale: 100, contrast: 110 } },
  { id: "golden", label: "Golden", f: { temperature: 50, tintColor: "#f5a623", tintOpacity: 18 } },
  { id: "sunset", label: "Sunset", f: { temperature: 55, tintColor: "#ff6b6b", tintOpacity: 15, saturate: 115 } },
  { id: "arctic", label: "Arctic", f: { temperature: -55, brightness: 108 } },
  { id: "sepia", label: "Sepia", f: { sepia: 80, contrast: 105 } },
  { id: "retro", label: "Retro", f: { sepia: 35, saturate: 130, contrast: 110, hueRotate: 10 } },
  { id: "pastel", label: "Pastel", f: { saturate: 70, brightness: 115, contrast: 90 } },
  { id: "dreamy", label: "Dreamy", f: { blur: 1.5, brightness: 112, saturate: 120 } },
  { id: "bleach", label: "Bleach", f: { saturate: 45, contrast: 130, brightness: 115 } },
  { id: "pop", label: "Pop", f: { saturate: 180, contrast: 125 } },
  { id: "duoblue", label: "Duo blue", f: { grayscale: 100, tintColor: "#2563eb", tintOpacity: 45 } },
  { id: "duoteal", label: "Duo teal", f: { grayscale: 100, tintColor: "#14b8a6", tintOpacity: 45 } },
  { id: "duopink", label: "Duo pink", f: { grayscale: 100, tintColor: "#ec4899", tintOpacity: 45 } },
  { id: "lavender", label: "Lavender", f: { tintColor: "#a78bfa", tintOpacity: 25 } },
  { id: "peach", label: "Peach", f: { tintColor: "#ffb4a2", tintOpacity: 22, temperature: 25 } },
  { id: "mint", label: "Mint", f: { tintColor: "#99f6e4", tintOpacity: 20, temperature: -20 } },
  { id: "steel", label: "Steel", f: { grayscale: 100, tintColor: "#94a3b8", tintOpacity: 35, contrast: 115 } },
  { id: "blueprint", label: "Blueprint", f: { invert: 95, grayscale: 100, tintColor: "#1d4ed8", tintOpacity: 40 } },
  { id: "glitch", label: "Glitch", f: { contrast: 125, saturate: 160, glitch: 72 } },
  { id: "glitchplus", label: "Glitch+", f: { glitch: 95, contrast: 125 } },
  { id: "vhs", label: "VHS", f: { glitch: 35, saturate: 135, contrast: 112, hueRotate: -8 } },
  { id: "poster", label: "Poster", f: { posterize: 4 } },
  { id: "posterplus", label: "Poster+", f: { posterize: 6, temperature: 30 } },
  { id: "comic", label: "Comic", f: { posterize: 6, contrast: 140, saturate: 160 } },
  { id: "pixel", label: "Pixel", f: { pixelate: 10 } },
  { id: "8bit", label: "8-bit", f: { pixelate: 12, grayscale: 100, contrast: 145, brightness: 105 } },
  { id: "mosaic", label: "Mosaic", f: { pixelate: 20 } },
];

const ASPECTS: Array<{ id: string; label: string; ratio: number | null }> = [
  { id: "original", label: "Free", ratio: null },
  { id: "1:1", label: "1:1", ratio: 1 },
  { id: "4:3", label: "4:3", ratio: 4 / 3 },
  { id: "16:9", label: "16:9", ratio: 16 / 9 },
  { id: "9:16", label: "9:16", ratio: 9 / 16 },
];

const SIZES = [480, 720, 960, 1280];
const FORMATS = [
  { id: "png", label: "PNG", mime: "image/png" },
  { id: "jpeg", label: "JPEG", mime: "image/jpeg" },
  { id: "webp", label: "WebP", mime: "image/webp" },
] as const;

const filterCss = (f: ImageFilters) => {
  const temp = f.temperature ?? 0;
  return [
    `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturate}%) blur(${f.blur}px) grayscale(${f.grayscale}%) sepia(${f.sepia}%) hue-rotate(${f.hueRotate}deg) invert(${f.invert}%)`,
    temp > 0 ? `sepia(${(temp * 0.35).toFixed(1)}%) saturate(106%)` : "",
    temp < 0 ? `hue-rotate(${(temp * 0.15).toFixed(1)}deg) saturate(110%)` : "",
  ]
    .filter(Boolean)
    .join(" ");
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function ImageAppDialog({
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

  const [src, setSrc] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [natural, setNatural] = useState({ w: 1, h: 1 });
  const [filters, setFilters] = useState<ImageFilters>({ ...DEFAULT_FILTERS });
  const [rot, setRot] = useState(0); // free angle, deg
  const [flipX, setFlipX] = useState(false);
  const [flipY, setFlipY] = useState(false);
  const [aspect, setAspect] = useState("original");
  const [zoom, setZoom] = useState(1); // 1..3
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // pan, -1..1
  const [radius, setRadius] = useState(0); // rounded corners %
  const [borderW, setBorderW] = useState(0); // px
  const [borderColor, setBorderColor] = useState("#ffffff");
  const [vignette, setVignette] = useState(0); // 0..100
  const [shadow, setShadow] = useState(false);
  const [glitch, setGlitch] = useState(0);
  const [outWidth, setOutWidth] = useState(960);
  const [format, setFormat] = useState<(typeof FORMATS)[number]["id"]>("png");
  const [quality, setQuality] = useState(92);
  const [compare, setCompare] = useState(false);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (src) URL.revokeObjectURL(src);
    const url = URL.createObjectURL(f);
    const probe = new Image();
    probe.onload = () => {
      setNatural({ w: probe.naturalWidth, h: probe.naturalHeight });
      imgRef.current = probe;
      setOutWidth(Math.min(960, probe.naturalWidth));
    };
    probe.src = url;
    setSrc(url);
    setFileName(f.name);
    setFilters({ ...DEFAULT_FILTERS });
    setRot(0);
    setFlipX(false);
    setFlipY(false);
    setAspect("original");
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setRadius(0);
    setBorderW(0);
    setVignette(0);
    setShadow(false);
    setGlitch(0);
    setFormat("png");
  };

  const css = filterCss({ ...DEFAULT_FILTERS, ...filters });
  const ratio = ASPECTS.find((a) => a.id === aspect)?.ratio ?? null;
  const styled =
    radius > 0 || borderW > 0 || vignette > 0 || shadow ||
    JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS) || glitch > 0 || rot !== 0 || flipX || flipY || ratio !== null || zoom !== 1;

  /** Pan the crop by dragging the preview (active when zoomed in). */
  const onPanDown = (e: RPointerEvent) => {
    if (zoom <= 1) return;
    panRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPanMove = (e: RPointerEvent) => {
    const p = panRef.current;
    const el = frameRef.current;
    if (!p || !el) return;
    const r = el.getBoundingClientRect();
    const dx = (e.clientX - p.x) / r.width;
    const dy = (e.clientY - p.y) / r.height;
    const span = Math.max(0.001, 1 - 1 / zoom); // pan freedom at this zoom
    setOffset({
      x: clamp(p.ox - dx * 2, -span, span),
      y: clamp(p.oy - dy * 2, -span, span),
    });
  };
  const onPanUp = () => {
    panRef.current = null;
  };

  const applyPreset = (f: Partial<ImageFilters>) => {
    const { glitch: g, ...rest } = f;
    setFilters({ ...DEFAULT_FILTERS, ...rest });
    setGlitch(g ?? 0);
  };

  const resetAll = () => {
    setFilters({ ...DEFAULT_FILTERS });
    setRot(0);
    setFlipX(false);
    setFlipY(false);
    setAspect("original");
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setRadius(0);
    setBorderW(0);
    setVignette(0);
    setShadow(false);
    setGlitch(0);
  };

  /** Renders the edited picture and returns a data URL. */
  const render = (): string | null => {
    const img = imgRef.current;
    if (!img) return null;
    // base crop rect (centered) for the chosen ratio, in natural coords
    let bw = img.naturalWidth;
    let bh = img.naturalHeight;
    if (ratio) {
      if (bw / bh > ratio) bw = Math.round(bh * ratio);
      else bh = Math.round(bw / ratio);
    }
    // zoom crop window + pan offset
    const cz = clamp(zoom, 1, 3);
    const cw = bw / cz;
    const ch = bh / cz;
    const cx = clamp(((img.naturalWidth - cw) / 2) * (1 + offset.x), 0, img.naturalWidth - cw);
    const cy = clamp(((img.naturalHeight - ch) / 2) * (1 + offset.y), 0, img.naturalHeight - ch);
    // output
    const w = Math.min(outWidth, 1600);
    const h = Math.round((w * bh) / bw);
    const margin = shadow ? Math.round(Math.min(w, h) * 0.14) : 0;
    const c = document.createElement("canvas");
    c.width = w + margin * 2;
    c.height = h + margin * 2;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    const r = Math.round((radius / 100) * Math.min(w, h) / 2);
    const path = new Path2D();
    path.roundRect(margin, margin, w, h, r);
    // soft drop shadow under the (rounded) picture
    if (shadow) {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = margin * 0.7;
      ctx.shadowOffsetY = Math.round(margin * 0.3);
      ctx.fillStyle = "#ffffff";
      ctx.fill(path);
      ctx.restore();
    }
    // picture (clipped by the rounded frame)
    // NOTE: filters & grading are NOT baked here — they are passed to the
    // element as live ImageFilters so they stay editable on the slide.
    ctx.save();
    ctx.clip(path);
    ctx.translate(margin + w / 2, margin + h / 2);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
    // overscale so a rotated picture still covers the frame
    const t = (rot * Math.PI) / 180;
    const cover = Math.abs(Math.cos(t)) + Math.abs(Math.sin(t));
    if (glitch > 0) {
      const slices = Math.max(4, Math.round(glitch / 8));
      const sliceH = Math.max(1, Math.round(h / slices));
      for (let i = 0; i < slices; i++) {
        const sy = Math.round((i / slices) * ch);
        const sh = Math.max(1, Math.round(ch / slices));
        const shift = Math.round((Math.random() - 0.5) * w * (glitch / 100) * 0.22);
        ctx.drawImage(img, cx, cy + sy, cw, sh, (-w * cover) / 2 + shift, (-h * cover) / 2 + i * sliceH, w * cover, sliceH + 1);
        if (i % 3 === 0) { ctx.globalCompositeOperation = "screen"; ctx.globalAlpha = 0.22; ctx.fillStyle = i % 2 ? "#ff1744" : "#00e5ff"; ctx.fillRect((-w * cover) / 2 + shift, (-h * cover) / 2 + i * sliceH, w * cover, 1); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; }
      }
    } else {
      ctx.drawImage(img, cx, cy, cw, ch, (-w * cover) / 2, (-h * cover) / 2, w * cover, h * cover);
    }
    // vignette
    if (vignette > 0) {
      const g = ctx.createRadialGradient(
        margin + w / 2, margin + h / 2, Math.min(w, h) * 0.35,
        margin + w / 2, margin + h / 2, Math.max(w, h) * 0.75,
      );
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, `rgba(0,0,0,${(vignette / 100).toFixed(2)})`);
      ctx.fillStyle = g;
      ctx.fill(path);
    }
    ctx.restore();
    // bake pixelate (mosaic) into the bitmap
    const pxSize = Math.round(filters.pixelate ?? 0);
    if (pxSize >= 2) {
      try {
        const tmp = document.createElement("canvas");
        tmp.width = Math.max(1, Math.round(c.width / pxSize));
        tmp.height = Math.max(1, Math.round(c.height / pxSize));
        const tctx = tmp.getContext("2d");
        if (tctx) {
          tctx.imageSmoothingEnabled = false;
          tctx.drawImage(c, 0, 0, tmp.width, tmp.height);
          ctx.clearRect(0, 0, c.width, c.height);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(tmp, 0, 0, c.width, c.height);
          ctx.imageSmoothingEnabled = true;
        }
      } catch {
        /* tainted canvas — skip fx */
      }
    }
    // bake posterize (flat color bands)
    const levels = Math.round(filters.posterize ?? 0);
    if (levels >= 2 && levels <= 16) {
      try {
        const region = ctx.getImageData(margin, margin, w, h);
        const step = 255 / (levels - 1);
        const d = region.data;
        for (let i = 0; i < d.length; i += 4) {
          d[i] = Math.round(Math.round(d[i] / step) * step);
          d[i + 1] = Math.round(Math.round(d[i + 1] / step) * step);
          d[i + 2] = Math.round(Math.round(d[i + 2] / step) * step);
        }
        ctx.putImageData(region, margin, margin);
      } catch {
        /* tainted canvas — skip fx */
      }
    }
    // border on top of everything
    if (borderW > 0) {
      ctx.save();
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = borderW;
      ctx.stroke(path);
      ctx.restore();
    }
    const mime = FORMATS.find((f) => f.id === format)?.mime ?? "image/png";
    return c.toDataURL(mime, quality / 100);
  };

  const insert = () => {
    const dataUrl = render();
    if (!dataUrl || !src) return;
    const probe = new Image();
    probe.onload = () => {
      const ew = Math.min(probe.naturalWidth, Math.round(canvasW * 0.55));
      const eh = Math.round((ew * probe.naturalHeight) / probe.naturalWidth);
      // glitch / pixelate / posterize are already baked into the bitmap —
      // don't pass them as live element filters too.
      const live: ImageFilters = { ...DEFAULT_FILTERS, ...filters };
      delete live.glitch;
      delete live.pixelate;
      delete live.posterize;
      add({
        type: "image",
        id: crypto.randomUUID(),
        x: Math.round((canvasW - ew) / 2),
        y: Math.round((canvasH - eh) / 2),
        width: ew,
        height: eh,
        rotation: 0,
        src: dataUrl,
        fit: "contain",
        filters: live,
      } as unknown as AnyElement);
      onOpenChange(false);
    };
    probe.src = dataUrl;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-xl gap-0 overflow-y-auto p-0 sm:rounded-3xl">
        <DialogHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-indigo-50/50 px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-[0_6px_14px_rgba(79,70,229,0.35)]">
              <ImageIcon className="size-4" />
            </span>
            Image
            {app.description && (
              <span className="truncate text-[11px] font-medium text-slate-400">
                — {app.description}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 p-4">
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />

          {!src ? (
            <button
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 py-12 text-center transition-all hover:border-indigo-400 hover:bg-indigo-50/40"
            >
              <span className="grid size-11 place-items-center rounded-xl bg-white text-indigo-600 shadow-sm">
                <Upload className="size-5" />
              </span>
              <span className="text-xs font-semibold text-slate-700">Upload an image</span>
              <span className="text-[10px] text-slate-400">PNG, JPG, WebP, GIF… — stays on your device</span>
            </button>
          ) : (
            <>
              {/* live preview — drag to pan when zoomed */}
              <div
                ref={frameRef}
                onPointerDown={onPanDown}
                onPointerMove={onPanMove}
                onPointerUp={onPanUp}
                onPointerLeave={onPanUp}
                className="flex items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-[repeating-conic-gradient(#f1f5f9_0%_25%,#ffffff_0%_50%)_50%/16px_16px] p-2"
                style={{
                  position: "relative",
                  aspectRatio: String(ratio ?? natural.w / natural.h),
                  maxHeight: 200,
                  borderRadius: Math.round((radius / 100) * 40) + 8,
                  boxShadow: shadow ? "0 14px 30px rgba(0,0,0,0.35)" : undefined,
                  outline: borderW > 0 ? `${borderW}px solid ${borderColor}` : undefined,
                  outlineOffset: -2,
                }}
              >
                <img
                  src={src}
                  alt={fileName}
                  draggable={false}
                  className="h-full w-full select-none object-cover"
                  style={{
                    filter: compare ? "none" : css,
                    transform: `translate(${offset.x * 100}%, ${offset.y * 100}%) rotate(${rot}deg) scale(${zoom * (flipX ? -1 : 1)}, ${zoom * (flipY ? -1 : 1)})`,
                    clipPath: glitch > 0 ? `polygon(0 ${Math.round(2 + glitch / 8)}%, 100% 0, 100% ${Math.round(98 - glitch / 10)}%, 0 100%)` : undefined,
                    cursor: zoom > 1 ? "grab" : "default",
                  }}
                />
                {(filters.tintColor ?? "") !== "" && (filters.tintOpacity ?? 0) > 0 && !compare && (
                  <div
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      inset: 0,
                      pointerEvents: "none",
                      background: filters.tintColor,
                      opacity: (filters.tintOpacity ?? 0) / 100,
                      mixBlendMode: "multiply",
                    }}
                  />
                )}
              </div>

              {/* transforms */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setRot((r) => (r + 90) % 360)}
                  title="Rotate 90°"
                  className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-300"
                >
                  <RotateCw className="size-3.5" />
                </button>
                <button
                  onClick={() => setFlipX((f) => !f)}
                  title="Flip horizontal"
                  className={`grid size-8 place-items-center rounded-lg border transition ${
                    flipX ? "border-indigo-600 bg-indigo-50 text-indigo-600" : "border-slate-200 bg-white text-slate-500 hover:border-indigo-300"
                  }`}
                >
                  <FlipHorizontal2 className="size-3.5" />
                </button>
                <button
                  onClick={() => setFlipY((f) => !f)}
                  title="Flip vertical"
                  className={`grid size-8 place-items-center rounded-lg border transition ${
                    flipY ? "border-indigo-600 bg-indigo-50 text-indigo-600" : "border-slate-200 bg-white text-slate-500 hover:border-indigo-300"
                  }`}
                >
                  <FlipVertical2 className="size-3.5" />
                </button>
                <label className="flex items-center gap-1 text-[9px] font-semibold text-slate-400">
                  angle
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={rot}
                    onChange={(e) => setRot(Number(e.target.value))}
                    className="h-1 w-20 cursor-pointer accent-indigo-600"
                  />
                  <span className="w-8 tabular-nums">{rot}°</span>
                </label>
                <button
                  onMouseDown={() => setCompare(true)}
                  onMouseUp={() => setCompare(false)}
                  onMouseLeave={() => setCompare(false)}
                  onTouchStart={() => setCompare(true)}
                  onTouchEnd={() => setCompare(false)}
                  title="Hold to see the original"
                  className={`grid size-8 place-items-center rounded-lg border transition ${
                    compare ? "border-indigo-600 bg-indigo-50 text-indigo-600" : "border-slate-200 bg-white text-slate-500 hover:border-indigo-300"
                  }`}
                >
                  <Eye className="size-3.5" />
                </button>
              </div>

              {/* crop: ratio + zoom */}
              <div className="flex flex-wrap items-center gap-1.5">
                <Crop className="size-3 text-slate-400" />
                {ASPECTS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAspect(a.id)}
                    className={`rounded-lg border px-2 py-1.5 text-[10px] font-semibold transition-all ${
                      aspect === a.id
                        ? "border-indigo-600 bg-indigo-50 text-indigo-600"
                        : "border-slate-200 bg-white text-slate-500 hover:border-indigo-300"
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
                <label className="ml-1 flex items-center gap-1 text-[9px] font-semibold text-slate-400">
                  <Move className="size-2.5" /> zoom
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.05}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="h-1 w-16 cursor-pointer accent-indigo-600"
                  />
                  <span className="w-9 tabular-nums">{zoom.toFixed(2)}×</span>
                </label>
              </div>

              {/* presets — horizontally scrollable */}
              <div className="flex flex-nowrap items-center gap-1 overflow-x-auto pb-1.5 [scrollbar-width:thin]">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => applyPreset(p.f)}
                    className="shrink-0 whitespace-nowrap rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[9px] font-bold text-slate-500 transition-all hover:border-indigo-400 hover:text-indigo-600"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* filter sliders */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-xl border border-slate-200 p-2.5">
                {SLIDERS.map(({ key, label, min, max, step }) => (
                  <label key={key} className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-400">
                    <span className="w-12 shrink-0 text-right">{label}</span>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      step={step}
                      value={filters[key]}
                      onChange={(e) => setFilters((f) => ({ ...f, [key]: Number(e.target.value) }))}
                      className="h-1 flex-1 cursor-pointer accent-indigo-600"
                    />
                    <span className="w-8 tabular-nums">{filters[key]}</span>
                  </label>
                ))}
              </div>

              {/* pixel & glitch fx — baked into the picture on insert */}
              <div className="grid grid-cols-3 gap-x-3 gap-y-1.5 rounded-xl border border-slate-200 p-2.5">
                <label className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-400">
                  <span className="w-12 shrink-0 text-right">glitch</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={glitch}
                    onChange={(e) => setGlitch(Number(e.target.value))}
                    className="h-1 flex-1 cursor-pointer accent-indigo-600"
                  />
                  <span className="w-7 tabular-nums">{glitch}</span>
                </label>
                <label className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-400">
                  <span className="w-12 shrink-0 text-right">pixelate</span>
                  <input
                    type="range"
                    min={0}
                    max={40}
                    value={filters.pixelate ?? 0}
                    onChange={(e) => setFilters((f) => ({ ...f, pixelate: Number(e.target.value) }))}
                    className="h-1 flex-1 cursor-pointer accent-indigo-600"
                  />
                  <span className="w-7 tabular-nums">{filters.pixelate ?? 0}</span>
                </label>
                <label className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-400">
                  <span className="w-12 shrink-0 text-right">posterize</span>
                  <input
                    type="range"
                    min={0}
                    max={16}
                    value={filters.posterize ?? 0}
                    onChange={(e) => setFilters((f) => ({ ...f, posterize: Number(e.target.value) }))}
                    className="h-1 flex-1 cursor-pointer accent-indigo-600"
                  />
                  <span className="w-7 tabular-nums">{filters.posterize ?? 0}</span>
                </label>
              </div>

              {/* color grading */}
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-2.5">
                <label className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-400">
                  temp
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    value={filters.temperature ?? 0}
                    onChange={(e) => setFilters((f) => ({ ...f, temperature: Number(e.target.value) }))}
                    className="h-1 w-20 cursor-pointer accent-indigo-600"
                  />
                  <span className="w-8 tabular-nums">{filters.temperature ?? 0}</span>
                </label>
                <label className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-400">
                  tint
                  <input
                    type="color"
                    value={filters.tintColor ?? "#2563eb"}
                    onChange={(e) => setFilters((f) => ({ ...f, tintColor: e.target.value }))}
                    className="size-4 cursor-pointer rounded border border-slate-200"
                  />
                  <input
                    type="range"
                    min={0}
                    max={60}
                    value={filters.tintOpacity ?? 0}
                    onChange={(e) => setFilters((f) => ({ ...f, tintOpacity: Number(e.target.value) }))}
                    className="h-1 w-16 cursor-pointer accent-indigo-600"
                  />
                  <span className="w-7 tabular-nums">{filters.tintOpacity ?? 0}</span>
                </label>
              </div>

              {/* styling: corners, border, vignette, shadow */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-xl border border-slate-200 p-2.5">
                <label className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-400">
                  corners
                  <input
                    type="range"
                    min={0}
                    max={50}
                    value={radius}
                    onChange={(e) => setRadius(Number(e.target.value))}
                    className="h-1 flex-1 cursor-pointer accent-indigo-600"
                  />
                  <span className="w-7 tabular-nums">{radius}%</span>
                </label>
                <label className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-400">
                  border
                  <input
                    type="range"
                    min={0}
                    max={16}
                    value={borderW}
                    onChange={(e) => setBorderW(Number(e.target.value))}
                    className="h-1 flex-1 cursor-pointer accent-indigo-600"
                  />
                  <input
                    type="color"
                    value={borderColor}
                    onChange={(e) => setBorderColor(e.target.value)}
                    className="size-4 cursor-pointer rounded border border-slate-200"
                  />
                </label>
                <label className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-400">
                  vignette
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={vignette}
                    onChange={(e) => setVignette(Number(e.target.value))}
                    className="h-1 flex-1 cursor-pointer accent-indigo-600"
                  />
                  <span className="w-7 tabular-nums">{vignette}</span>
                </label>
                <button
                  onClick={() => setShadow((s) => !s)}
                  className={`rounded-lg border px-2 py-1.5 text-[9px] font-bold uppercase tracking-wide transition-all ${
                    shadow
                      ? "border-indigo-600 bg-indigo-50 text-indigo-600"
                      : "border-slate-200 bg-white text-slate-400 hover:border-indigo-300"
                  }`}
                >
                  Drop shadow {shadow ? "on" : "off"}
                </button>
              </div>

              {/* export */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Export</span>
                {SIZES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setOutWidth(s)}
                    className={`rounded-lg border px-2 py-1.5 text-[10px] font-semibold transition-all ${
                      outWidth === s
                        ? "border-indigo-600 bg-indigo-50 text-indigo-600"
                        : "border-slate-200 bg-white text-slate-500 hover:border-indigo-300"
                    }`}
                  >
                    {s}px
                  </button>
                ))}
                <span className="mx-0.5 h-4 w-px bg-slate-200" />
                {FORMATS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFormat(f.id)}
                    className={`rounded-lg border px-2 py-1.5 text-[10px] font-semibold transition-all ${
                      format === f.id
                        ? "border-indigo-600 bg-indigo-50 text-indigo-600"
                        : "border-slate-200 bg-white text-slate-500 hover:border-indigo-300"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
                {format !== "png" && (
                  <label className="flex items-center gap-1 text-[9px] font-semibold text-slate-400">
                    quality
                    <input
                      type="range"
                      min={50}
                      max={100}
                      value={quality}
                      onChange={(e) => setQuality(Number(e.target.value))}
                      className="h-1 w-14 cursor-pointer accent-indigo-600"
                    />
                    <span className="w-7 tabular-nums">{quality}</span>
                  </label>
                )}
                <button
                  onClick={resetAll}
                  title="Reset everything"
                  className="ml-auto grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:border-rose-300 hover:text-rose-500"
                >
                  <RotateCcw className="size-3.5" />
                </button>
              </div>

              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-500 transition hover:border-indigo-300"
                >
                  Change image
                </button>
                <button
                  onClick={insert}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2 text-xs font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,0.35)] transition-transform hover:-translate-y-0.5"
                >
                  <Check className="size-3.5" />
                  Insert on slide
                </button>
              </div>
              <p className="text-[9px] leading-relaxed text-slate-400">
                Crop{zoom > 1 ? " & zoom" : ""}, rotation, corners, border, shadow, glitch, pixelate
                and posterize are baked into the inserted picture{styled ? "" : " (untouched so far)"}
                (pixelate & posterize are not visible in the preview above); ALL other filters &
                color grading stay live on the slide — editable from the element panel at any time.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
