import { useRef, useState, type ChangeEvent } from "react";
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
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Image app — the built-in advanced image editor.                     */
/* Upload a picture, tune filters (brightness, contrast, saturation,   */
/* blur, grayscale, sepia, hue, invert), crop to a ratio, rotate by    */
/* 90° steps, flip, pick the export size — then insert it on the       */
/* slide. The crop/rotation is baked into the exported PNG while the   */
/* filters stay live-editable on the element.                          */
/* ------------------------------------------------------------------ */

const SLIDERS: Array<{
  key: keyof ImageFilters;
  label: string;
  min: number;
  max: number;
  step: number;
}> = [
  { key: "brightness", label: "Brightness", min: 0, max: 200, step: 1 },
  { key: "contrast", label: "Contrast", min: 0, max: 200, step: 1 },
  { key: "saturate", label: "Saturation", min: 0, max: 200, step: 1 },
  { key: "blur", label: "Blur", min: 0, max: 20, step: 0.5 },
  { key: "grayscale", label: "Grayscale", min: 0, max: 100, step: 1 },
  { key: "sepia", label: "Sepia", min: 0, max: 100, step: 1 },
  { key: "hueRotate", label: "Hue", min: 0, max: 360, step: 1 },
  { key: "invert", label: "Invert", min: 0, max: 100, step: 1 },
];

const ASPECTS: Array<{ id: string; label: string; ratio: number | null }> = [
  { id: "original", label: "Original", ratio: null },
  { id: "1:1", label: "1:1", ratio: 1 },
  { id: "4:3", label: "4:3", ratio: 4 / 3 },
  { id: "16:9", label: "16:9", ratio: 16 / 9 },
  { id: "9:16", label: "9:16", ratio: 9 / 16 },
];

const SIZES = [480, 720, 960, 1280];

const filterCss = (f: ImageFilters) =>
  `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturate}%) blur(${f.blur}px) grayscale(${f.grayscale}%) sepia(${f.sepia}%) hue-rotate(${f.hueRotate}deg) invert(${f.invert}%)`;

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
  const [rot, setRot] = useState(0);
  const [flipX, setFlipX] = useState(false);
  const [flipY, setFlipY] = useState(false);
  const [aspect, setAspect] = useState("original");
  const [outWidth, setOutWidth] = useState(960);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
  };

  const css = filterCss({ ...DEFAULT_FILTERS, ...filters });
  const ratio = ASPECTS.find((a) => a.id === aspect)?.ratio ?? null;
  const dirty =
    JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS) || rot !== 0 || flipX || flipY || ratio !== null;

  const insert = () => {
    const img = imgRef.current;
    if (!img || !src) return;
    // crop rect (centered) in natural coordinates
    let cw = img.naturalWidth;
    let ch = img.naturalHeight;
    if (ratio) {
      if (cw / ch > ratio) cw = Math.round(ch * ratio);
      else ch = Math.round(cw / ratio);
    }
    const cx = (img.naturalWidth - cw) / 2;
    const cy = (img.naturalHeight - ch) / 2;
    const w = Math.min(outWidth, 1600);
    const h = Math.round((w * ch) / cw);
    const swap = rot === 90 || rot === 270;
    const c = document.createElement("canvas");
    c.width = swap ? h : w;
    c.height = swap ? w : h;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.filter = css;
    ctx.translate(c.width / 2, c.height / 2);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
    ctx.drawImage(img, cx, cy, cw, ch, -w / 2, -h / 2, w, h);
    ctx.restore();
    const dataUrl = c.toDataURL("image/png");
    const ew = Math.min(w, Math.round(canvasW * 0.5));
    const eh = Math.round((ew * c.height) / c.width);
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
      filters: { ...DEFAULT_FILTERS, ...filters },
    } as unknown as AnyElement);
    onOpenChange(false);
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
              {/* live preview — crop via aspect-ratio box, filter/rotate via CSS */}
              <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-[repeating-conic-gradient(#f1f5f9_0%_25%,#ffffff_0%_50%)_50%/16px_16px] p-2">
                <div
                  className="overflow-hidden rounded-lg"
                  style={{ aspectRatio: String(ratio ?? natural.w / natural.h), maxHeight: 208, maxWidth: "100%" }}
                >
                  <img
                    src={src}
                    alt={fileName}
                    className="h-full w-full object-cover"
                    style={{
                      filter: css,
                      transform: `rotate(${rot}deg) scaleX(${flipX ? -1 : 1}) scaleY(${flipY ? -1 : 1})`,
                    }}
                  />
                </div>
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
                <span className="mx-1 h-6 w-px bg-slate-200" />
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
                <button
                  onClick={() => {
                    setFilters({ ...DEFAULT_FILTERS });
                    setRot(0);
                    setFlipX(false);
                    setFlipY(false);
                    setAspect("original");
                  }}
                  title="Reset adjustments"
                  className="ml-auto grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:border-rose-300 hover:text-rose-500"
                >
                  <RotateCcw className="size-3.5" />
                </button>
              </div>

              {/* filters */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-xl border border-slate-200 p-2.5">
                {SLIDERS.map(({ key, label, min, max, step }) => (
                  <label key={key} className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-400">
                    <span className="w-16 shrink-0 text-right">{label}</span>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      step={step}
                      value={filters[key]}
                      onChange={(e) =>
                        setFilters((f) => ({ ...f, [key]: Number(e.target.value) }))
                      }
                      className="h-1 flex-1 cursor-pointer accent-indigo-600"
                    />
                    <span className="w-8 tabular-nums">
                      {key === "hueRotate" ? filters[key] + "°" : filters[key]}
                    </span>
                  </label>
                ))}
              </div>

              {/* export size */}
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
                <span className="ml-1 truncate text-[9px] text-slate-400" title={fileName}>
                  {fileName} · {natural.w}×{natural.h}
                </span>
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
                Crop, rotation and flips are baked into the inserted picture; the filter values
                {dirty ? "" : " (currently untouched)"} stay editable from the element panel.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
