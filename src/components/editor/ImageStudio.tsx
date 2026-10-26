// Image Studio — DiapoLab's own built-in image editor. No third-party app:
// everything runs on local canvases inside the dialog.
//
//  - Loads the image selected on the slide (or any local file)
//  - Tools: brush / eraser / crop, rotate 90°, flip H/V (baked into pixels)
//  - Live adjustments: brightness, contrast, saturation, hue, blur,
//    grayscale, sepia, invert (CSS filter string applied to the 2D context)
//  - Undo / redo (snapshot stack of the working canvas)
//  - "Importer sur le canvas" exports a PNG (with adjustments + crop baked)
//    and drops it on the slide as a new image element

import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { newImage, useEditor } from "@/store/editor";
import {
  Brush,
  Crop,
  Eraser,
  FlipHorizontal,
  FlipVertical,
  ImageDown,
  RotateCw,
  Undo2,
  Redo2,
  Upload,
  WandSparkles,
} from "lucide-react";

type Adjust = {
  brightness: number;
  contrast: number;
  saturate: number;
  hue: number;
  blur: number;
  grayscale: number;
  sepia: number;
  invert: number;
};

const DEFAULT_ADJUST: Adjust = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  hue: 0,
  blur: 0,
  grayscale: 0,
  sepia: 0,
  invert: 0,
};

type Tool = "brush" | "eraser" | "crop";
type Rect = { x: number; y: number; w: number; h: number }; // normalized 0..1
type Pt = { x: number; y: number; nx: number; ny: number };

function filterCss(a: Adjust): string {
  return `brightness(${a.brightness}%) contrast(${a.contrast}%) saturate(${a.saturate}%) hue-rotate(${a.hue}deg) blur(${a.blur}px) grayscale(${a.grayscale}%) sepia(${a.sepia}%) invert(${a.invert}%)`;
}

function SliderRow({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        <span>{label}</span>
        <span className="font-normal text-slate-400">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-fuchsia-600"
      />
    </label>
  );
}

function ToolButton({
  title,
  active,
  disabled,
  onClick,
  children,
}: {
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`grid size-9 place-items-center rounded-lg border transition ${
        active
          ? "border-fuchsia-500 bg-fuchsia-50 text-fuchsia-700"
          : "border-slate-200 bg-white text-slate-600 hover:border-fuchsia-300 hover:text-fuchsia-600"
      } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
    >
      {children}
    </button>
  );
}

export function ImageStudioDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const add = useEditor((s) => s.add);
  const selectedId = useEditor((s) => s.selectedId);
  const elements = useEditor((s) => s.elements);

  const workRef = useRef<HTMLCanvasElement | null>(null); // working pixels
  const dispRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const undoRef = useRef<string[]>([]);
  const redoRef = useRef<string[]>([]);
  const strokeLast = useRef<Pt | null>(null);
  const cropStart = useRef<{ nx: number; ny: number } | null>(null);

  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [fitSize, setFitSize] = useState({ w: 0, h: 0 });
  const [hasDoc, setHasDoc] = useState(false);
  const [tool, setTool] = useState<Tool>("brush");
  const [color, setColor] = useState("#f43f5e");
  const [brushSize, setBrushSize] = useState(12);
  const [adjust, setAdjust] = useState<Adjust>(DEFAULT_ADJUST);
  const [crop, setCrop] = useState<Rect | null>(null);
  const [hist, setHist] = useState({ u: 0, r: 0 });
  const [status, setStatus] = useState<string | null>(null);

  const selected = elements.find((e) => e.id === selectedId);
  const selectedImage =
    selected?.type === "image" && typeof selected.src === "string" ? selected.src : null;

  // ---- working-canvas helpers --------------------------------------------

  const replaceWork = (c: HTMLCanvasElement) => {
    workRef.current = c;
    setDims({ w: c.width, h: c.height });
  };

  const loadSrc = useCallback((src: string) => {
    const attempt = (cors: boolean) => {
      const im = new Image();
      if (cors) im.crossOrigin = "anonymous";
      im.onload = () => {
        const c = document.createElement("canvas");
        c.width = im.naturalWidth || 1;
        c.height = im.naturalHeight || 1;
        c.getContext("2d")!.drawImage(im, 0, 0);
        undoRef.current = [];
        redoRef.current = [];
        setHist({ u: 0, r: 0 });
        setAdjust(DEFAULT_ADJUST);
        setCrop(null);
        replaceWork(c);
        setHasDoc(true);
        setStatus(null);
      };
      im.onerror = () => {
        if (cors) attempt(false);
        else setStatus("Impossible de charger cette image.");
      };
      im.src = src;
    };
    attempt(/^https?:/i.test(src));
  }, []);

  // Load the image selected on the slide when the dialog opens.
  useEffect(() => {
    if (open && selectedImage && !hasDoc) loadSrc(selectedImage);
  }, [open, selectedImage, hasDoc, loadSrc]);

  useEffect(() => {
    if (!open) {
      setHasDoc(false);
      setStatus(null);
      workRef.current = null;
      undoRef.current = [];
      redoRef.current = [];
    }
  }, [open]);

  // Fit the display canvas into the available space.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !dims.w || !dims.h) {
      setFitSize({ w: 0, h: 0 });
      return;
    }
    const compute = () => {
      const box = el.getBoundingClientRect();
      const s = Math.min(box.width / dims.w, box.height / dims.h);
      setFitSize({ w: Math.max(1, Math.floor(dims.w * s)), h: Math.max(1, Math.floor(dims.h * s)) });
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [dims]);

  const renderNow = useCallback(() => {
    const work = workRef.current;
    const disp = dispRef.current;
    if (!work || !disp || !fitSize.w || !fitSize.h) return;
    disp.width = fitSize.w;
    disp.height = fitSize.h;
    const dctx = disp.getContext("2d")!;
    dctx.clearRect(0, 0, fitSize.w, fitSize.h);
    dctx.filter = filterCss(adjust);
    dctx.drawImage(work, 0, 0, fitSize.w, fitSize.h);
    dctx.filter = "none";
    if (crop && crop.w > 0.002 && crop.h > 0.002) {
      dctx.save();
      dctx.strokeStyle = "#f59e0b";
      dctx.lineWidth = 2;
      dctx.setLineDash([8, 5]);
      dctx.strokeRect(crop.x * fitSize.w, crop.y * fitSize.h, crop.w * fitSize.w, crop.h * fitSize.h);
      dctx.restore();
    }
  }, [fitSize, adjust, crop]);

  useEffect(() => {
    renderNow();
  }, [renderNow]);

  // ---- history -------------------------------------------------------------

  const pushHistory = () => {
    const work = workRef.current;
    if (!work) return;
    try {
      undoRef.current.push(work.toDataURL("image/png"));
      if (undoRef.current.length > 25) undoRef.current.shift();
      redoRef.current = [];
      setHist({ u: undoRef.current.length, r: 0 });
    } catch {
      setStatus("Historique indisponible (image distante protégée) — réimportez le fichier localement.");
    }
  };

  const restoreUrl = (url: string) => {
    const work = workRef.current;
    if (!work) return;
    const im = new Image();
    im.onload = () => {
      const c = document.createElement("canvas");
      c.width = work.width;
      c.height = work.height;
      c.getContext("2d")!.drawImage(im, 0, 0);
      workRef.current = c;
      setDims({ w: c.width, h: c.height });
      setHist({ u: undoRef.current.length, r: redoRef.current.length });
    };
    im.src = url;
  };

  const undo = () => {
    const work = workRef.current;
    const url = undoRef.current.pop();
    if (!work || !url) return;
    try {
      redoRef.current.push(work.toDataURL("image/png"));
    } catch {
      /* ignore */
    }
    restoreUrl(url);
  };

  const redo = () => {
    const work = workRef.current;
    const url = redoRef.current.pop();
    if (!work || !url) return;
    try {
      undoRef.current.push(work.toDataURL("image/png"));
    } catch {
      /* ignore */
    }
    restoreUrl(url);
  };

  // ---- transforms (baked into the working pixels) --------------------------

  const rotate90 = () => {
    const work = workRef.current;
    if (!work) return;
    pushHistory();
    const c = document.createElement("canvas");
    c.width = work.height;
    c.height = work.width;
    const cx = c.getContext("2d")!;
    cx.translate(c.width / 2, c.height / 2);
    cx.rotate(Math.PI / 2);
    cx.drawImage(work, -work.width / 2, -work.height / 2);
    replaceWork(c);
    setCrop(null);
  };

  const flip = (axis: "x" | "y") => {
    const work = workRef.current;
    if (!work) return;
    pushHistory();
    const c = document.createElement("canvas");
    c.width = work.width;
    c.height = work.height;
    const cx = c.getContext("2d")!;
    cx.translate(axis === "x" ? c.width : 0, axis === "y" ? c.height : 0);
    cx.scale(axis === "x" ? -1 : 1, axis === "y" ? -1 : 1);
    cx.drawImage(work, 0, 0);
    replaceWork(c);
    setCrop(null);
  };

  const applyCrop = () => {
    const work = workRef.current;
    if (!work || !crop || crop.w < 0.01 || crop.h < 0.01) return;
    pushHistory();
    const sx = Math.max(0, Math.floor(crop.x * dims.w));
    const sy = Math.max(0, Math.floor(crop.y * dims.h));
    const sw = Math.max(1, Math.min(dims.w - sx, Math.floor(crop.w * dims.w)));
    const sh = Math.max(1, Math.min(dims.h - sy, Math.floor(crop.h * dims.h)));
    const c = document.createElement("canvas");
    c.width = sw;
    c.height = sh;
    c.getContext("2d")!.drawImage(work, sx, sy, sw, sh, 0, 0, sw, sh);
    replaceWork(c);
    setCrop(null);
    setStatus("✓ Recadrage appliqué");
  };

  // ---- pointer interactions -------------------------------------------------

  const toWork = (e: React.PointerEvent<HTMLCanvasElement>): Pt => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * dims.w;
    const y = ((e.clientY - rect.top) / rect.height) * dims.h;
    return { x, y, nx: x / dims.w, ny: y / dims.h };
  };

  const strokeDraw = (a: Pt, b: Pt) => {
    const work = workRef.current;
    if (!work) return;
    const ctx = work.getContext("2d")!;
    ctx.save();
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
    renderNow();
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!hasDoc) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = toWork(e);
    if (tool === "crop") {
      cropStart.current = { nx: pt.nx, ny: pt.ny };
      setCrop({ x: pt.nx, y: pt.ny, w: 0, h: 0 });
    } else {
      pushHistory();
      strokeLast.current = pt;
      strokeDraw(pt, pt);
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!hasDoc) return;
    const pt = toWork(e);
    if (tool === "crop") {
      const s = cropStart.current;
      if (!s) return;
      setCrop({
        x: Math.min(s.nx, pt.nx),
        y: Math.min(s.ny, pt.ny),
        w: Math.abs(pt.nx - s.nx),
        h: Math.abs(pt.ny - s.ny),
      });
    } else {
      const last = strokeLast.current;
      if (!last) return;
      strokeDraw(last, pt);
      strokeLast.current = pt;
    }
  };

  const onPointerUp = () => {
    strokeLast.current = null;
    cropStart.current = null;
  };

  // ---- import / export -------------------------------------------------------

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => loadSrc(String(reader.result));
    reader.readAsDataURL(file);
  };

  const exportToCanvas = () => {
    const work = workRef.current;
    if (!work) return;
    try {
      let sx = 0;
      let sy = 0;
      let cw = dims.w;
      let ch = dims.h;
      if (crop && crop.w > 0.002 && crop.h > 0.002) {
        sx = crop.x * dims.w;
        sy = crop.y * dims.h;
        cw = crop.w * dims.w;
        ch = crop.h * dims.h;
      }
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(cw));
      c.height = Math.max(1, Math.round(ch));
      const cx = c.getContext("2d")!;
      cx.filter = filterCss(adjust);
      cx.drawImage(work, sx, sy, cw, ch, 0, 0, c.width, c.height);
      const dataUrl = c.toDataURL("image/png");
      const s = Math.min(960 / c.width, 540 / c.height, 1.5);
      add(
        newImage(dataUrl, {
          width: Math.round(c.width * s),
          height: Math.round(c.height * s),
        }),
      );
      setStatus("✓ Image importée sur le canvas");
    } catch {
      setStatus("Export impossible (image distante protégée) — réimportez le fichier localement puis réessayez.");
    }
  };

  // ---- UI --------------------------------------------------------------------

  const cursor = hasDoc && (tool === "brush" || tool === "eraser" || tool === "crop") ? "crosshair" : "default";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92vh] max-w-[96vw] flex-col gap-0 overflow-hidden border-slate-200 bg-white p-0 text-slate-900 shadow-2xl">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-800">
            <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-indigo-600 text-white">
              <WandSparkles className="size-3.5" />
            </span>
            Image Studio
            <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700">
              intégré
            </span>
          </DialogTitle>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-sky-500 hover:text-sky-700"
            >
              <Upload className="size-3" /> Ouvrir une image
            </button>
            <button
              type="button"
              onClick={exportToCanvas}
              disabled={!hasDoc}
              className={`flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-3.5 py-1.5 text-[11px] font-bold text-white shadow-md transition ${
                hasDoc ? "hover:brightness-110" : "cursor-not-allowed opacity-40"
              }`}
            >
              <ImageDown className="size-3.5" /> Importer sur le canvas
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1">
          {/* Toolbar */}
          <div className="flex w-14 flex-col items-center gap-1.5 border-r border-slate-200 bg-slate-50 py-3">
            <ToolButton title="Pinceau" active={tool === "brush"} disabled={!hasDoc} onClick={() => setTool("brush")}>
              <Brush className="size-4" />
            </ToolButton>
            <ToolButton title="Gomme" active={tool === "eraser"} disabled={!hasDoc} onClick={() => setTool("eraser")}>
              <Eraser className="size-4" />
            </ToolButton>
            <ToolButton title="Recadrer (tracer un cadre)" active={tool === "crop"} disabled={!hasDoc} onClick={() => setTool("crop")}>
              <Crop className="size-4" />
            </ToolButton>
            <div className="my-1 h-px w-8 bg-slate-200" />
            <ToolButton title="Pivoter de 90°" disabled={!hasDoc} onClick={rotate90}>
              <RotateCw className="size-4" />
            </ToolButton>
            <ToolButton title="Miroir horizontal" disabled={!hasDoc} onClick={() => flip("x")}>
              <FlipHorizontal className="size-4" />
            </ToolButton>
            <ToolButton title="Miroir vertical" disabled={!hasDoc} onClick={() => flip("y")}>
              <FlipVertical className="size-4" />
            </ToolButton>
            <div className="my-1 h-px w-8 bg-slate-200" />
            <ToolButton title="Annuler" disabled={hist.u === 0} onClick={undo}>
              <Undo2 className="size-4" />
            </ToolButton>
            <ToolButton title="Rétablir" disabled={hist.r === 0} onClick={redo}>
              <Redo2 className="size-4" />
            </ToolButton>
          </div>

          {/* Canvas */}
          <div ref={containerRef} className="relative min-h-0 flex-1 overflow-hidden bg-slate-200/70 p-4">
            {hasDoc ? (
              <div className="grid h-full place-items-center">
                <canvas
                  ref={dispRef}
                  style={{ cursor }}
                  className="block max-h-full max-w-full rounded-lg bg-white shadow-md"
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                />
              </div>
            ) : (
              <div className="grid h-full place-items-center">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex max-w-[380px] flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-white/60 px-10 py-12 text-slate-500 transition hover:border-fuchsia-400 hover:text-fuchsia-600"
                >
                  <Upload className="size-7" />
                  <span className="text-sm font-semibold">Ouvrir une image pour l'éditer</span>
                  <span className="text-center text-[11px] leading-relaxed text-slate-400">
                    Sélectionnez une image sur la slide avant d'ouvrir le studio pour la charger
                    automatiquement, ou importez n'importe quel fichier local.
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="w-60 shrink-0 space-y-5 overflow-y-auto border-l border-slate-200 bg-slate-50 p-4">
            {(tool === "brush" || tool === "eraser") && (
              <section className="space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {tool === "brush" ? "Pinceau" : "Gomme"}
                </h3>
                {tool === "brush" && (
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Couleur</span>
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="h-8 w-full cursor-pointer rounded border border-slate-200 bg-white p-0.5"
                    />
                  </label>
                )}
                <SliderRow label="Taille" value={brushSize} min={1} max={100} unit=" px" onChange={setBrushSize} />
              </section>
            )}

            {tool === "crop" && (
              <section className="space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recadrage</h3>
                <p className="text-[10px] leading-relaxed text-slate-400">
                  Tracez un cadre sur l'image, puis appliquez.
                </p>
                <button
                  type="button"
                  onClick={applyCrop}
                  disabled={!crop || crop.w < 0.01 || crop.h < 0.01}
                  className={`w-full rounded-lg bg-fuchsia-600 px-2 py-1.5 text-[11px] font-bold text-white transition ${
                    crop && crop.w >= 0.01 && crop.h >= 0.01 ? "hover:brightness-110" : "cursor-not-allowed opacity-40"
                  }`}
                >
                  Appliquer le recadrage
                </button>
                <button
                  type="button"
                  onClick={() => setCrop(null)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
                >
                  Annuler le cadre
                </button>
              </section>
            )}

            <section className="space-y-3">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ajustements</h3>
              <SliderRow label="Luminosité" value={adjust.brightness} min={0} max={200} unit="%" onChange={(v) => setAdjust({ ...adjust, brightness: v })} />
              <SliderRow label="Contraste" value={adjust.contrast} min={0} max={200} unit="%" onChange={(v) => setAdjust({ ...adjust, contrast: v })} />
              <SliderRow label="Saturation" value={adjust.saturate} min={0} max={200} unit="%" onChange={(v) => setAdjust({ ...adjust, saturate: v })} />
              <SliderRow label="Teinte" value={adjust.hue} min={0} max={360} unit="°" onChange={(v) => setAdjust({ ...adjust, hue: v })} />
              <SliderRow label="Flou" value={adjust.blur} min={0} max={20} unit=" px" onChange={(v) => setAdjust({ ...adjust, blur: v })} />
              <SliderRow label="Noir et blanc" value={adjust.grayscale} min={0} max={100} unit="%" onChange={(v) => setAdjust({ ...adjust, grayscale: v })} />
              <SliderRow label="Sépia" value={adjust.sepia} min={0} max={100} unit="%" onChange={(v) => setAdjust({ ...adjust, sepia: v })} />
              <SliderRow label="Négatif" value={adjust.invert} min={0} max={100} unit="%" onChange={(v) => setAdjust({ ...adjust, invert: v })} />
              <button
                type="button"
                onClick={() => setAdjust(DEFAULT_ADJUST)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
              >
                Réinitialiser les ajustements
              </button>
            </section>
          </div>
        </div>

        {status && (
          <div className="border-t border-slate-200 bg-slate-50 px-5 py-2 text-center text-[11px] font-medium text-slate-600">
            {status}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
