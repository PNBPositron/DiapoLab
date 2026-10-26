// Image Studio — DiapoLab's own built-in image editor (mini-Photoshop).
// No third-party app: everything runs on local canvases inside the dialog.
//
//  - Document = stack of layers (raster / text / shape), composed each frame
//  - Tools: select/move, brush, eraser, text, rect, ellipse, line, crop, hand
//  - Viewport: zoom (wheel / buttons), pan (hand tool / middle-drag), fit
//  - Per-layer filters: adjustments (live via ctx.filter) + baked effects
//    (pixelate, glitch, wave deformation) + a real tone-curve editor
//  - Layer panel: visibility, opacity, reorder, duplicate, merge down, delete
//  - Menu bar: Fichier / Édition / Image / Filtre / Calque / Affichage
//  - Filter menu (à la Photopea): Flou (gaussien/mouvement/radial), Netteté,
//    Accentuation, Distorsion (onde/tourbillon/glitch), Mosaïque, Bruit,
//    Style (contours/relief/posterisation/seuil), Rendu (nuages) — each with
//    a live-preview dialog, plus "Répéter le dernier filtre" (Ctrl+F)
//  - Precise image resize (pixels), document crop, rotate 90°, flips
//  - Undo / redo (document snapshots), PNG download, export to the slide

import { useEffect, useRef, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { newImage, useEditor } from "@/store/editor";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  Brush,
  ChevronDown,
  ChevronRight,
  Circle,
  Copy,
  Crop,
  Eraser,
  Eye,
  EyeOff,
  Hand,
  ImageDown,
  Layers,
  Maximize,
  Minus,
  Move,
  Plus,
  Redo2,
  Square,
  Trash2,
  Type,
  Undo2,
  Upload,
  WandSparkles,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

type Fx = {
  brightness: number;
  contrast: number;
  saturate: number;
  hue: number;
  blur: number;
  grayscale: number;
  sepia: number;
  invert: number;
  /** baked effects */
  pixelate: number; // px block size, 0 = off
  glitch: number; // rgb channel shift px, 0 = off
  wave: number; // wave deformation amplitude px, 0 = off
  curve: number[] | null; // 5 control points 0..1, null = off
};

type BaseLayer = {
  id: string;
  name: string;
  visible: boolean;
  opacity: number; // 0..1
  fx: Fx;
};

type RasterLayer = BaseLayer & {
  kind: "raster";
  canvas: HTMLCanvasElement;
  x: number;
  y: number;
  /** bumped whenever pixels change, to invalidate the baked-fx cache */
  version: number;
};

type TextLayer = BaseLayer & {
  kind: "text";
  text: string;
  x: number;
  y: number;
  size: number;
  color: string;
  font: string;
  bold: boolean;
  italic: boolean;
};

type ShapeKind = "rect" | "ellipse" | "line";
type ShapeLayer = BaseLayer & {
  kind: "shape";
  shape: ShapeKind;
  x: number;
  y: number;
  w: number;
  h: number;
  diag: 1 | -1; // line orientation within the bbox
  fill: string | null;
  stroke: string | null;
  strokeWidth: number;
};

type Layer = RasterLayer | TextLayer | ShapeLayer;
type Tool = "select" | "hand" | "brush" | "eraser" | "text" | "rect" | "ellipse" | "line" | "crop";
type View = { zoom: number; x: number; y: number };
type Snap = { w: number; h: number; selId: string | null; layers: unknown[] };
type CropFrame = { x: number; y: number; w: number; h: number }; // doc px
type MenuEntry = { label: string; action?: () => void; disabled?: boolean; sep?: boolean; sub?: MenuEntry[] };

// ---------------------------------------------------------------------------
// Filter engine (menu Filtre) — destructive filters with a live preview
// ---------------------------------------------------------------------------

type FilterParam = { key: string; label: string; min: number; max: number; def: number; unit?: string };
type FilterDef = {
  id: string;
  label: string;
  group: string;
  params: FilterParam[];
  apply: (src: HTMLCanvasElement, p: Record<string, number>) => HTMLCanvasElement;
};

function convolve(src: HTMLCanvasElement, kernel: number[], mix = 1): HTMLCanvasElement {
  const w = src.width;
  const h = src.height;
  const side = Math.round(Math.sqrt(kernel.length));
  const half = Math.floor(side / 2);
  const c = newCanvas(w, h);
  const s = src.getContext("2d")!.getImageData(0, 0, w, h);
  const out = c.getContext("2d")!.createImageData(w, h);
  const sd = s.data;
  const d = out.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let ky = 0; ky < side; ky++) {
        for (let kx = 0; kx < side; kx++) {
          const k = kernel[ky * side + kx];
          if (!k) continue;
          const px = Math.min(w - 1, Math.max(0, x + kx - half));
          const py = Math.min(h - 1, Math.max(0, y + ky - half));
          const i = (py * w + px) * 4;
          r += sd[i] * k;
          g += sd[i + 1] * k;
          b += sd[i + 2] * k;
        }
      }
      const i = (y * w + x) * 4;
      d[i] = sd[i] + (r - sd[i]) * mix;
      d[i + 1] = sd[i + 1] + (g - sd[i + 1]) * mix;
      d[i + 2] = sd[i + 2] + (b - sd[i + 2]) * mix;
      d[i + 3] = sd[i + 3];
    }
  }
  c.getContext("2d")!.putImageData(out, 0, 0);
  return c;
}

function unsharpCanvas(src: HTMLCanvasElement, amount: number, radius: number): HTMLCanvasElement {
  const blurC = newCanvas(src.width, src.height);
  const bcx = blurC.getContext("2d")!;
  bcx.filter = `blur(${Math.max(0.1, radius)}px)`;
  bcx.drawImage(src, 0, 0);
  const s = src.getContext("2d")!.getImageData(0, 0, src.width, src.height).data;
  const b = bcx.getImageData(0, 0, blurC.width, blurC.height).data;
  const c = newCanvas(src.width, src.height);
  const out = c.getContext("2d")!.createImageData(src.width, src.height);
  const k = amount / 100;
  for (let i = 0; i < s.length; i += 4) {
    out.data[i] = s[i] + (s[i] - b[i]) * k;
    out.data[i + 1] = s[i + 1] + (s[i + 1] - b[i + 1]) * k;
    out.data[i + 2] = s[i + 2] + (s[i + 2] - b[i + 2]) * k;
    out.data[i + 3] = s[i + 3];
  }
  c.getContext("2d")!.putImageData(out, 0, 0);
  return c;
}

function motionBlurCanvas(src: HTMLCanvasElement, len: number, angleDeg: number): HTMLCanvasElement {
  const c = newCanvas(src.width, src.height);
  const cx = c.getContext("2d")!;
  const a = (angleDeg * Math.PI) / 180;
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const steps = Math.max(1, Math.round(len));
  cx.globalAlpha = 1 / steps;
  for (let i = 0; i < steps; i++) {
    const t = i - (steps - 1) / 2;
    cx.drawImage(src, t * dx, t * dy);
  }
  return c;
}

function spinBlurCanvas(src: HTMLCanvasElement, deg: number): HTMLCanvasElement {
  const c = newCanvas(src.width, src.height);
  const cx = c.getContext("2d")!;
  const steps = 16;
  cx.globalAlpha = 1 / steps;
  for (let i = 0; i < steps; i++) {
    const a = (deg * (i / (steps - 1) - 0.5) * Math.PI) / 180;
    cx.save();
    cx.translate(c.width / 2, c.height / 2);
    cx.rotate(a);
    cx.drawImage(src, -c.width / 2, -c.height / 2);
    cx.restore();
  }
  return c;
}

function waveFCanvas(src: HTMLCanvasElement, amp: number, freq: number): HTMLCanvasElement {
  const c = newCanvas(src.width, src.height);
  const cx = c.getContext("2d")!;
  const rows = Math.max(1, Math.round(src.height / 2));
  const rh = src.height / rows;
  const wavelength = Math.max(8, src.height / Math.max(1, freq));
  for (let r = 0; r < rows; r++) {
    const y = r * rh;
    const dx = Math.sin((y / wavelength) * Math.PI * 2) * amp;
    cx.drawImage(src, 0, y, src.width, rh, dx, y, src.width, rh);
  }
  return c;
}

function twirlCanvas(src: HTMLCanvasElement, angle: number): HTMLCanvasElement {
  const w = src.width;
  const h = src.height;
  const c = newCanvas(w, h);
  const s = src.getContext("2d")!.getImageData(0, 0, w, h);
  const out = c.getContext("2d")!.createImageData(w, h);
  const cx0 = w / 2;
  const cy0 = h / 2;
  const rmax = Math.hypot(cx0, cy0);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx0;
      const dy = y - cy0;
      const r = Math.hypot(dx, dy);
      const t = Math.max(0, 1 - r / rmax);
      const a = Math.atan2(dy, dx) + (angle * Math.PI * 0.01) * t * t;
      const sxp = Math.round(cx0 + Math.cos(a) * r);
      const syp = Math.round(cy0 + Math.sin(a) * r);
      const si = (Math.min(h - 1, Math.max(0, syp)) * w + Math.min(w - 1, Math.max(0, sxp))) * 4;
      const i = (y * w + x) * 4;
      out.data[i] = s.data[si];
      out.data[i + 1] = s.data[si + 1];
      out.data[i + 2] = s.data[si + 2];
      out.data[i + 3] = s.data[si + 3];
    }
  }
  c.getContext("2d")!.putImageData(out, 0, 0);
  return c;
}

function noiseCanvas(src: HTMLCanvasElement, amount: number): HTMLCanvasElement {
  const c = newCanvas(src.width, src.height);
  const cx = c.getContext("2d")!;
  cx.drawImage(src, 0, 0);
  const data = cx.getImageData(0, 0, c.width, c.height);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() * 2 - 1) * amount;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  cx.putImageData(data, 0, 0);
  return c;
}

function edgesCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const w = src.width;
  const h = src.height;
  const c = newCanvas(w, h);
  const s = src.getContext("2d")!.getImageData(0, 0, w, h).data;
  const out = c.getContext("2d")!.createImageData(w, h);
  const lum = new Float32Array(w * h);
  for (let i = 0, j = 0; i < lum.length; i++, j += 4) lum[i] = 0.299 * s[j] + 0.587 * s[j + 1] + 0.114 * s[j + 2];
  const at = (x: number, y: number) => lum[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const gx = -at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1) + at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1);
      const gy = -at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1) + at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1);
      const m = Math.min(255, Math.hypot(gx, gy));
      const i = (y * w + x) * 4;
      out.data[i] = m;
      out.data[i + 1] = m;
      out.data[i + 2] = m;
      out.data[i + 3] = 255;
    }
  }
  c.getContext("2d")!.putImageData(out, 0, 0);
  return c;
}

function posterizeCanvas(src: HTMLCanvasElement, levels: number): HTMLCanvasElement {
  const c = newCanvas(src.width, src.height);
  const cx = c.getContext("2d")!;
  cx.drawImage(src, 0, 0);
  const data = cx.getImageData(0, 0, c.width, c.height);
  const d = data.data;
  const n = Math.max(2, Math.round(levels)) - 1;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.round((Math.round((d[i] / 255) * n) / n) * 255);
    d[i + 1] = Math.round((Math.round((d[i + 1] / 255) * n) / n) * 255);
    d[i + 2] = Math.round((Math.round((d[i + 2] / 255) * n) / n) * 255);
  }
  cx.putImageData(data, 0, 0);
  return c;
}

function thresholdCanvas(src: HTMLCanvasElement, t: number): HTMLCanvasElement {
  const c = newCanvas(src.width, src.height);
  const cx = c.getContext("2d")!;
  cx.drawImage(src, 0, 0);
  const data = cx.getImageData(0, 0, c.width, c.height);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2] > t ? 255 : 0;
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
  }
  cx.putImageData(data, 0, 0);
  return c;
}

function cloudsCanvas(w: number, h: number, scale: number): HTMLCanvasElement {
  const c = newCanvas(w, h);
  const cx = c.getContext("2d")!;
  cx.fillStyle = "#808080";
  cx.fillRect(0, 0, w, h);
  let cell = Math.max(2, scale);
  let alpha = 0.6;
  for (let oct = 0; oct < 5; oct++) {
    const gw = Math.max(1, Math.ceil(w / cell));
    const gh = Math.max(1, Math.ceil(h / cell));
    const nc = newCanvas(gw, gh);
    const nx = nc.getContext("2d")!;
    const img = nx.createImageData(gw, gh);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    nx.putImageData(img, 0, 0);
    cx.globalAlpha = alpha;
    cx.imageSmoothingEnabled = true;
    cx.drawImage(nc, 0, 0, w, h);
    cell /= 2;
    alpha *= 0.55;
  }
  cx.globalAlpha = 1;
  return c;
}

const FILTERS: FilterDef[] = [
  {
    id: "gaussian",
    label: "Flou gaussien…",
    group: "Flou",
    params: [{ key: "radius", label: "Rayon", min: 0, max: 40, def: 4, unit: " px" }],
    apply: (src, p) => {
      const c = newCanvas(src.width, src.height);
      const cx = c.getContext("2d")!;
      cx.filter = `blur(${p.radius}px)`;
      cx.drawImage(src, 0, 0);
      return c;
    },
  },
  {
    id: "motion",
    label: "Flou de mouvement…",
    group: "Flou",
    params: [
      { key: "len", label: "Longueur", min: 1, max: 100, def: 20, unit: " px" },
      { key: "angle", label: "Angle", min: 0, max: 360, def: 0, unit: "°" },
    ],
    apply: (src, p) => motionBlurCanvas(src, p.len, p.angle),
  },
  {
    id: "spin",
    label: "Flou radial (rotation)…",
    group: "Flou",
    params: [{ key: "deg", label: "Angle", min: 1, max: 180, def: 30, unit: "°" }],
    apply: (src, p) => spinBlurCanvas(src, p.deg),
  },
  {
    id: "sharpen",
    label: "Netteté…",
    group: "Netteté",
    params: [{ key: "strength", label: "Intensité", min: 0, max: 100, def: 50, unit: " %" }],
    apply: (src, p) => convolve(src, [0, -1, 0, -1, 5, -1, 0, -1, 0], p.strength / 100),
  },
  {
    id: "unsharp",
    label: "Accentuation…",
    group: "Netteté",
    params: [
      { key: "amount", label: "Intensité", min: 0, max: 200, def: 100, unit: " %" },
      { key: "radius", label: "Rayon", min: 0.5, max: 20, def: 2, unit: " px" },
    ],
    apply: (src, p) => unsharpCanvas(src, p.amount, p.radius),
  },
  {
    id: "wavef",
    label: "Onde…",
    group: "Distorsion",
    params: [
      { key: "amp", label: "Amplitude", min: 1, max: 80, def: 15, unit: " px" },
      { key: "freq", label: "Fréquence", min: 1, max: 20, def: 4 },
    ],
    apply: (src, p) => waveFCanvas(src, p.amp, p.freq),
  },
  {
    id: "twirl",
    label: "Tourbillon…",
    group: "Distorsion",
    params: [{ key: "angle", label: "Angle", min: -720, max: 720, def: 120, unit: "°" }],
    apply: (src, p) => twirlCanvas(src, p.angle),
  },
  {
    id: "glitchf",
    label: "Glitch RGB…",
    group: "Distorsion",
    params: [{ key: "n", label: "Décalage", min: 1, max: 50, def: 8, unit: " px" }],
    apply: (src, p) => glitchCanvas(src, p.n),
  },
  {
    id: "mosaic",
    label: "Mosaïque…",
    group: "Pixelisation",
    params: [{ key: "px", label: "Taille de bloc", min: 2, max: 80, def: 12, unit: " px" }],
    apply: (src, p) => pixelateCanvas(src, p.px),
  },
  {
    id: "noise",
    label: "Ajouter du bruit…",
    group: "Bruit",
    params: [{ key: "amount", label: "Intensité", min: 1, max: 128, def: 24 }],
    apply: (src, p) => noiseCanvas(src, p.amount),
  },
  {
    id: "edges",
    label: "Détection de contours",
    group: "Style",
    params: [],
    apply: (src) => edgesCanvas(src),
  },
  {
    id: "emboss",
    label: "Relief (emboss)…",
    group: "Style",
    params: [{ key: "strength", label: "Intensité", min: 10, max: 200, def: 100, unit: " %" }],
    apply: (src, p) => convolve(src, [-2, -1, 0, -1, 1, 1, 0, 1, 2], p.strength / 100),
  },
  {
    id: "posterize",
    label: "Posterisation…",
    group: "Style",
    params: [{ key: "levels", label: "Niveaux", min: 2, max: 32, def: 6 }],
    apply: (src, p) => posterizeCanvas(src, p.levels),
  },
  {
    id: "threshold",
    label: "Seuil (noir & blanc)…",
    group: "Style",
    params: [{ key: "t", label: "Seuil", min: 0, max: 255, def: 128 }],
    apply: (src, p) => thresholdCanvas(src, p.t),
  },
  {
    id: "clouds",
    label: "Nuages",
    group: "Rendu",
    params: [{ key: "scale", label: "Échelle", min: 8, max: 128, def: 32, unit: " px" }],
    apply: (src, p) => cloudsCanvas(src.width, src.height, p.scale),
  },
];

const FILTER_GROUP_ORDER = ["Flou", "Netteté", "Distorsion", "Pixelisation", "Bruit", "Style", "Rendu"];

const DEFAULT_FX: Fx = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  hue: 0,
  blur: 0,
  grayscale: 0,
  sepia: 0,
  invert: 0,
  pixelate: 0,
  glitch: 0,
  wave: 0,
  curve: null,
};

const FONTS = ["Arial", "Georgia", "Times New Roman", "Courier New", "Impact", "Verdana"];
let scratchCtx: CanvasRenderingContext2D | null = null;
function getScratch(): CanvasRenderingContext2D {
  if (!scratchCtx) {
    const c = document.createElement("canvas");
    c.width = 8;
    c.height = 8;
    scratchCtx = c.getContext("2d")!;
  }
  return scratchCtx;
}

function newCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

function filterCss(fx: Fx): string {
  return `brightness(${fx.brightness}%) contrast(${fx.contrast}%) saturate(${fx.saturate}%) hue-rotate(${fx.hue}deg) blur(${fx.blur}px) grayscale(${fx.grayscale}%) sepia(${fx.sepia}%) invert(${fx.invert}%)`;
}

function lutFromPoints(p: number[]): Uint8ClampedArray {
  const xs = [0, 0.25, 0.5, 0.75, 1];
  const lut = new Uint8ClampedArray(256);
  let seg = 0;
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    while (seg < 4 && t > xs[seg + 1]) seg++;
    const a = xs[seg];
    const b = xs[seg + 1];
    const u = b === a ? 0 : (t - a) / (b - a);
    const v = p[seg] + (p[seg + 1] - p[seg]) * u;
    lut[i] = Math.max(0, Math.min(255, Math.round(v * 255)));
  }
  return lut;
}

// ---------------------------------------------------------------------------
// Baked effects (pixelate / glitch / wave / curve) with per-layer cache
// ---------------------------------------------------------------------------

type BakeCacheEntry = { key: string; canvas: HTMLCanvasElement };
const bakeCache = new Map<string, BakeCacheEntry>();

function applyLut(src: HTMLCanvasElement, points: number[]): HTMLCanvasElement {
  const c = newCanvas(src.width, src.height);
  const cx = c.getContext("2d")!;
  cx.drawImage(src, 0, 0);
  const lut = lutFromPoints(points);
  const data = cx.getImageData(0, 0, c.width, c.height);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = lut[d[i]];
    d[i + 1] = lut[d[i + 1]];
    d[i + 2] = lut[d[i + 2]];
  }
  cx.putImageData(data, 0, 0);
  return c;
}

function waveCanvas(src: HTMLCanvasElement, amp: number): HTMLCanvasElement {
  const c = newCanvas(src.width, src.height);
  const cx = c.getContext("2d")!;
  const rows = Math.max(1, Math.round(src.height / 2));
  const rh = src.height / rows;
  for (let r = 0; r < rows; r++) {
    const y = r * rh;
    const dx = Math.sin((y / 120) * Math.PI * 2) * amp;
    cx.drawImage(src, 0, y, src.width, rh, dx, y, src.width, rh);
  }
  return c;
}

function pixelateCanvas(src: HTMLCanvasElement, px: number): HTMLCanvasElement {
  const small = newCanvas(src.width / px, src.height / px);
  const sx = small.getContext("2d")!;
  sx.imageSmoothingEnabled = true;
  sx.drawImage(src, 0, 0, small.width, small.height);
  const c = newCanvas(src.width, src.height);
  const cx = c.getContext("2d")!;
  cx.imageSmoothingEnabled = false;
  cx.drawImage(small, 0, 0, c.width, c.height);
  return c;
}

function channelCanvas(src: HTMLCanvasElement, color: string): HTMLCanvasElement {
  const c = newCanvas(src.width, src.height);
  const cx = c.getContext("2d")!;
  cx.drawImage(src, 0, 0);
  cx.globalCompositeOperation = "multiply";
  cx.fillStyle = color;
  cx.fillRect(0, 0, c.width, c.height);
  return c;
}

function glitchCanvas(src: HTMLCanvasElement, n: number): HTMLCanvasElement {
  const c = newCanvas(src.width, src.height);
  const cx = c.getContext("2d")!;
  cx.fillStyle = "#000";
  cx.fillRect(0, 0, c.width, c.height);
  cx.globalCompositeOperation = "lighter";
  cx.drawImage(channelCanvas(src, "#ff0000"), -n, 0);
  cx.drawImage(channelCanvas(src, "#00ff00"), 0, Math.round(n / 2));
  cx.drawImage(channelCanvas(src, "#0000ff"), n, 0);
  return c;
}

function bakeRaster(l: RasterLayer): HTMLCanvasElement {
  const key = JSON.stringify([l.version, l.fx.pixelate, l.fx.glitch, l.fx.wave, l.fx.curve]);
  const hit = bakeCache.get(l.id);
  if (hit && hit.key === key) return hit.canvas;
  let cur = l.canvas;
  if (l.fx.curve) cur = applyLut(cur, l.fx.curve);
  if (l.fx.wave >= 1) cur = waveCanvas(cur, l.fx.wave);
  if (l.fx.pixelate >= 2) cur = pixelateCanvas(cur, l.fx.pixelate);
  if (l.fx.glitch >= 1) cur = glitchCanvas(cur, l.fx.glitch);
  bakeCache.set(l.id, { key, canvas: cur });
  return cur;
}

// ---------------------------------------------------------------------------
// Small UI atoms
// ---------------------------------------------------------------------------

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
      <div className="mb-0.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-500">
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
      className={`grid size-8 place-items-center rounded-lg border transition ${
        active
          ? "border-fuchsia-500 bg-fuchsia-50 text-fuchsia-700"
          : "border-slate-200 bg-white text-slate-600 hover:border-fuchsia-300 hover:text-fuchsia-600"
      } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
    >
      {children}
    </button>
  );
}

function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{title}</h3>
      {children}
    </section>
  );
}

/** Draggable tone-curve editor: 5 points on a fixed grid, vertical drag. */
function CurveEditor({ points, onChange }: { points: number[]; onChange: (p: number[]) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dragIdx = useRef<number | null>(null);

  const draw = useCallback(() => {
    const c = ref.current;
    if (!c) return;
    const S = 160;
    if (c.width !== S) {
      c.width = S;
      c.height = S;
    }
    const cx = c.getContext("2d")!;
    cx.clearRect(0, 0, S, S);
    cx.fillStyle = "#fff";
    cx.fillRect(0, 0, S, S);
    cx.strokeStyle = "#e2e8f0";
    cx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      cx.beginPath();
      cx.moveTo((i * S) / 4, 0);
      cx.lineTo((i * S) / 4, S);
      cx.moveTo(0, (i * S) / 4);
      cx.lineTo(S, (i * S) / 4);
      cx.stroke();
    }
    cx.strokeStyle = "#d926a9";
    cx.lineWidth = 2;
    cx.beginPath();
    points.forEach((v, i) => {
      const x = (i * S) / 4;
      const y = (1 - v) * S;
      if (i === 0) cx.moveTo(x, y);
      else cx.lineTo(x, y);
    });
    cx.stroke();
    cx.fillStyle = "#d926a9";
    points.forEach((v, i) => {
      cx.beginPath();
      cx.arc((i * S) / 4, (1 - v) * S, 4, 0, Math.PI * 2);
      cx.fill();
    });
  }, [points]);

  useEffect(() => {
    draw();
  }, [draw]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = (e.clientY - rect.top) / rect.height;
    return Math.max(0, Math.min(1, 1 - y));
  };

  return (
    <canvas
      ref={ref}
      className="w-full cursor-crosshair rounded border border-slate-200"
      onPointerDown={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const idx = Math.round(((e.clientX - rect.left) / rect.width) * 4);
        dragIdx.current = Math.max(0, Math.min(4, idx));
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (dragIdx.current == null) return;
        const next = [...points];
        next[dragIdx.current] = pos(e);
        onChange(next);
      }}
      onPointerUp={() => {
        dragIdx.current = null;
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Main dialog
// ---------------------------------------------------------------------------

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

  const dispRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const undoRef = useRef<Snap[]>([]);
  const redoRef = useRef<Snap[]>([]);
  const idc = useRef(0);
  const layersRef = useRef<Layer[]>([]);
  const docRef = useRef<HTMLCanvasElement | null>(null);
  const lastPaint = useRef<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{
    kind: "pan" | "move" | "shape" | "crop" | "paint";
    startX: number;
    startY: number;
    layerId?: string;
    orig?: { x: number; y: number };
  } | null>(null);
  const histTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFilterRef = useRef<{ id: string; params: Record<string, number> } | null>(null);
  const filterPreviewRef = useRef<HTMLCanvasElement>(null);

  const [layers, setLayers] = useState<Layer[]>([]);
  const [docSize, setDocSize] = useState({ w: 0, h: 0 });
  const [selId, setSelId] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>("select");
  const [view, setView] = useState<View>({ zoom: 1, x: 0, y: 0 });
  const [crop, setCrop] = useState<CropFrame | null>(null);
  const [color, setColor] = useState("#f43f5e");
  const [brushSize, setBrushSize] = useState(12);
  const [strokeColor, setStrokeColor] = useState("#0f172a");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [fillOn, setFillOn] = useState(true);
  const [hist, setHist] = useState({ u: 0, r: 0 });
  const [histWarned, setHistWarned] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [resizeOpen, setResizeOpen] = useState(false);
  const [resize, setResize] = useState({ w: 0, h: 0, link: true });
  const [filterDlg, setFilterDlg] = useState<{ def: FilterDef; params: Record<string, number> } | null>(null);
  const [tick, setTick] = useState(0);
  const bump = useCallback(() => setTick((t) => t + 1), []);

  layersRef.current = layers;
  const docW = docSize.w;
  const docH = docSize.h;
  const sel = layers.find((l) => l.id === selId) ?? null;

  const selected = elements.find((e) => e.id === selectedId);
  const selectedImage =
    selected?.type === "image" && typeof selected.src === "string" ? selected.src : null;

  // ---- helpers -------------------------------------------------------------

  const uid = () => `L${++idc.current}`;
  const baseLayer = (name: string): BaseLayer => ({
    id: uid(),
    name,
    visible: true,
    opacity: 1,
    fx: { ...DEFAULT_FX, curve: null },
  });

  const setLayersBoth = (ls: Layer[]) => {
    layersRef.current = ls;
    setLayers(ls);
  };

  const patchLayer = (id: string, patch: Partial<Layer>) => {
    setLayersBoth(layersRef.current.map((l) => (l.id === id ? ({ ...l, ...patch } as Layer) : l)));
  };

  const patchFx = (id: string, patch: Partial<Fx>) => {
    setLayersBoth(
      layersRef.current.map((l) => (l.id === id ? ({ ...l, fx: { ...l.fx, ...patch } } as Layer) : l))
    );
  };

  // ---- history ---------------------------------------------------------------

  const serialize = (): Snap | null => {
    try {
      return {
        w: docW,
        h: docH,
        selId,
        layers: layersRef.current.map((l) => {
          if (l.kind === "raster") {
            return {
              ...l,
              canvas: undefined,
              cw: l.canvas.width,
              ch: l.canvas.height,
              png: l.canvas.toDataURL("image/png"),
            };
          }
          return { ...l };
        }),
      };
    } catch {
      if (!histWarned) {
        setHistWarned(true);
        setStatus("Historique limité (image distante protégée) — réimportez le fichier localement.");
      }
      return null;
    }
  };

  const pushHistory = () => {
    const snap = serialize();
    if (!snap) return;
    undoRef.current.push(snap);
    if (undoRef.current.length > 15) undoRef.current.shift();
    redoRef.current = [];
    setHist({ u: undoRef.current.length, r: 0 });
  };

  /** throttled history for slider-style edits */
  const pushSoon = () => {
    if (histTimer.current) clearTimeout(histTimer.current);
    histTimer.current = setTimeout(() => {
      histTimer.current = null;
      pushHistory();
    }, 700);
  };

  const restore = (snap: Snap) => {
    Promise.all(
      (snap.layers as Record<string, unknown>[]).map(
        (l) =>
          new Promise<Layer>((resolve) => {
            if (l.kind === "raster") {
              const c = newCanvas(l.cw as number, l.ch as number);
              const im = new Image();
              im.onload = () => {
                c.getContext("2d")!.drawImage(im, 0, 0);
                const rest = { ...l } as unknown as RasterLayer;
                rest.canvas = c;
                resolve(rest);
              };
              im.onerror = () => resolve({ ...l } as unknown as Layer);
              im.src = l.png as string;
            } else {
              resolve(l as unknown as Layer);
            }
          }),
      ),
    ).then((ls) => {
      setLayersBoth(ls);
      setDocSize({ w: snap.w, h: snap.h });
      setSelId(snap.selId);
      bump();
    });
  };

  const undo = () => {
    const snap = undoRef.current.pop();
    if (!snap) return;
    const cur = serialize();
    if (cur) redoRef.current.push(cur);
    restore(snap);
    setHist({ u: undoRef.current.length, r: redoRef.current.length });
  };

  const redo = () => {
    const snap = redoRef.current.pop();
    if (!snap) return;
    const cur = serialize();
    if (cur) undoRef.current.push(cur);
    restore(snap);
    setHist({ u: undoRef.current.length, r: redoRef.current.length });
  };

  // ---- document setup ---------------------------------------------------------

  const fitView = useCallback(() => {
    const el = containerRef.current;
    if (!el || !docW || !docH) return;
    const box = el.getBoundingClientRect();
    const pad = 48;
    const z = Math.min((box.width - pad) / docW, (box.height - pad) / docH);
    setView({
      zoom: z,
      x: (box.width - docW * z) / 2,
      y: (box.height - docH * z) / 2,
    });
  }, [docW, docH]);

  const loadDocFromSrc = useCallback((src: string) => {
    const attempt = (cors: boolean) => {
      const im = new Image();
      if (cors) im.crossOrigin = "anonymous";
      im.onload = () => {
        const c = newCanvas(im.naturalWidth || 1, im.naturalHeight || 1);
        c.getContext("2d")!.drawImage(im, 0, 0);
        const l: RasterLayer = { ...baseLayer("Fond"), kind: "raster", canvas: c, x: 0, y: 0, version: 0 };
        undoRef.current = [];
        redoRef.current = [];
        setHist({ u: 0, r: 0 });
        bakeCache.clear();
        setLayersBoth([l]);
        setDocSize({ w: c.width, h: c.height });
        setSelId(l.id);
        setCrop(null);
        setStatus(null);
      };
      im.onerror = () => {
        if (cors) attempt(false);
        else setStatus("Impossible de charger cette image.");
      };
      im.src = src;
    };
    attempt(/^https?:/i.test(src));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const newBlankDoc = useCallback(() => {
    const c = newCanvas(1280, 720);
    const cx = c.getContext("2d")!;
    cx.fillStyle = "#ffffff";
    cx.fillRect(0, 0, c.width, c.height);
    const l: RasterLayer = { ...baseLayer("Fond"), kind: "raster", canvas: c, x: 0, y: 0, version: 0 };
    undoRef.current = [];
    redoRef.current = [];
    setHist({ u: 0, r: 0 });
    bakeCache.clear();
    setLayersBoth([l]);
    setDocSize({ w: c.width, h: c.height });
    setSelId(l.id);
    setCrop(null);
    setStatus(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) return;
    if (layersRef.current.length === 0) {
      if (selectedImage) loadDocFromSrc(selectedImage);
      else newBlankDoc();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedImage]);

  useEffect(() => {
    if (!open) {
      setLayersBoth([]);
      setDocSize({ w: 0, h: 0 });
      setSelId(null);
      setCrop(null);
      setStatus(null);
      setMenuOpen(null);
      setResizeOpen(false);
      undoRef.current = [];
      redoRef.current = [];
      setHist({ u: 0, r: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    fitView();
  }, [fitView]);

  // ---- compositing -------------------------------------------------------------

  const drawLayerTo = (ctx: CanvasRenderingContext2D, l: Layer) => {
    if (!l.visible || l.opacity <= 0) return;
    ctx.save();
    ctx.globalAlpha = l.opacity;
    ctx.filter = filterCss(l.fx);
    if (l.kind === "raster") {
      ctx.drawImage(bakeRaster(l), l.x, l.y);
    } else if (l.kind === "text") {
      ctx.font = `${l.italic ? "italic " : ""}${l.bold ? "700 " : "400 "}${l.size}px ${l.font}`;
      ctx.fillStyle = l.color;
      ctx.textBaseline = "top";
      l.text.split("\n").forEach((ln, i) => ctx.fillText(ln, l.x, l.y + i * l.size * 1.25));
    } else {
      ctx.beginPath();
      if (l.shape === "rect") {
        ctx.rect(l.x, l.y, l.w, l.h);
      } else if (l.shape === "ellipse") {
        ctx.ellipse(l.x + l.w / 2, l.y + l.h / 2, Math.abs(l.w) / 2, Math.abs(l.h) / 2, 0, 0, Math.PI * 2);
      } else {
        const x1 = l.diag > 0 ? l.x : l.x + l.w;
        const y1 = l.diag > 0 ? l.y : l.y + l.h;
        const x2 = l.diag > 0 ? l.x + l.w : l.x;
        const y2 = l.diag > 0 ? l.y + l.h : l.y;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
      if (l.fill) {
        ctx.fillStyle = l.fill;
        ctx.fill();
      }
      if (l.stroke && l.strokeWidth > 0) {
        ctx.strokeStyle = l.stroke;
        ctx.lineWidth = l.strokeWidth;
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  const compositeDoc = (): HTMLCanvasElement | null => {
    if (!docW || !docH) return null;
    let c = docRef.current;
    if (!c || c.width !== docW || c.height !== docH) {
      c = newCanvas(docW, docH);
      docRef.current = c;
    }
    const cx = c.getContext("2d")!;
    cx.clearRect(0, 0, docW, docH);
    for (const l of layersRef.current) drawLayerTo(cx, l);
    return c;
  };

  const layerBBox = (l: Layer): { x: number; y: number; w: number; h: number } | null => {
    if (l.kind === "raster") return { x: l.x, y: l.y, w: l.canvas.width, h: l.canvas.height };
    if (l.kind === "text") {
      const cx = getScratch();
      cx.font = `${l.italic ? "italic " : ""}${l.bold ? "700 " : "400 "}${l.size}px ${l.font}`;
      const lines = l.text.split("\n");
      let w = 0;
      for (const ln of lines) w = Math.max(w, cx.measureText(ln || " ").width);
      return { x: l.x, y: l.y, w, h: lines.length * l.size * 1.25 };
    }
    return { x: l.x, y: l.y, w: l.w, h: l.h };
  };

  const renderNow = useCallback(() => {
    const disp = dispRef.current;
    const el = containerRef.current;
    if (!disp || !el) return;
    const box = el.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (disp.width !== Math.round(box.width * dpr) || disp.height !== Math.round(box.height * dpr)) {
      disp.width = Math.round(box.width * dpr);
      disp.height = Math.round(box.height * dpr);
    }
    const dctx = disp.getContext("2d")!;
    dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dctx.clearRect(0, 0, box.width, box.height);
    const doc = compositeDoc();
    if (!doc) return;

    // checkerboard under the document
    const zx = view.x;
    const zy = view.y;
    const zw = docW * view.zoom;
    const zh = docH * view.zoom;
    const cell = 8;
    dctx.save();
    dctx.beginPath();
    dctx.rect(zx, zy, zw, zh);
    dctx.clip();
    dctx.fillStyle = "#fff";
    dctx.fillRect(zx, zy, zw, zh);
    dctx.fillStyle = "#e2e8f0";
    for (let y = 0; y * cell < zh; y++) {
      for (let x = 0; x * cell < zw; x++) {
        if ((x + y) % 2 === 0) dctx.fillRect(zx + x * cell, zy + y * cell, cell, cell);
      }
    }
    dctx.restore();

    dctx.imageSmoothingEnabled = view.zoom < 3;
    dctx.drawImage(doc, zx, zy, zw, zh);

    // selection outline
    const sl = layersRef.current.find((l) => l.id === selId);
    if (sl) {
      const b = layerBBox(sl);
      if (b) {
        dctx.save();
        dctx.strokeStyle = "#6366f1";
        dctx.lineWidth = 1.5;
        dctx.setLineDash([6, 4]);
        dctx.strokeRect(zx + b.x * view.zoom, zy + b.y * view.zoom, b.w * view.zoom, b.h * view.zoom);
        dctx.restore();
      }
    }

    // crop frame + dimming outside
    if (crop && crop.w > 2 && crop.h > 2) {
      dctx.save();
      dctx.fillStyle = "rgba(15,23,42,0.35)";
      dctx.fillRect(zx, zy, zw, zh);
      dctx.globalCompositeOperation = "destination-over";
      dctx.fillStyle = "#000";
      dctx.fillRect(0, 0, box.width, box.height);
      dctx.restore();
      dctx.save();
      dctx.globalCompositeOperation = "destination-out";
      dctx.fillStyle = "#fff";
      dctx.fillRect(zx + crop.x * view.zoom, zy + crop.y * view.zoom, crop.w * view.zoom, crop.h * view.zoom);
      dctx.restore();
      dctx.save();
      dctx.strokeStyle = "#f59e0b";
      dctx.lineWidth = 2;
      dctx.setLineDash([8, 5]);
      dctx.strokeRect(zx + crop.x * view.zoom, zy + crop.y * view.zoom, crop.w * view.zoom, crop.h * view.zoom);
      dctx.restore();
    }
  }, [view, docW, docH, selId, crop]);

  useEffect(() => {
    renderNow();
  }, [renderNow, tick, layers, docSize]);

  // ---- pointer interactions -----------------------------------------------------

  const toDoc = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - view.x) / view.zoom,
      y: (e.clientY - rect.top - view.y) / view.zoom,
    };
  };

  const hitLayer = (px: number, py: number): Layer | null => {
    for (let i = layersRef.current.length - 1; i >= 0; i--) {
      const l = layersRef.current[i];
      if (!l.visible) continue;
      const b = layerBBox(l);
      if (b && px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) return l;
    }
    return null;
  };

  const ensureRaster = (): RasterLayer => {
    const s = layersRef.current.find((l) => l.id === selId);
    if (s && s.kind === "raster") return s;
    const c = newCanvas(docW, docH);
    const l: RasterLayer = { ...baseLayer("Peinture"), kind: "raster", canvas: c, x: 0, y: 0, version: 0 };
    setLayersBoth([...layersRef.current, l]);
    setSelId(l.id);
    return l;
  };

  const paintSeg = (l: RasterLayer, a: { x: number; y: number }, b: { x: number; y: number }, erase: boolean) => {
    const ctx = l.canvas.getContext("2d")!;
    ctx.save();
    ctx.globalCompositeOperation = erase ? "destination-out" : "source-over";
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(a.x - l.x, a.y - l.y);
    ctx.lineTo(b.x - l.x, b.y - l.y);
    ctx.stroke();
    ctx.restore();
    l.version++;
    bakeCache.delete(l.id);
    bump();
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!docW) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toDoc(e);

    if (tool === "hand" || e.button === 1) {
      dragRef.current = { kind: "pan", startX: e.clientX, startY: e.clientY };
      return;
    }
    if (e.button !== 0) return;

    switch (tool) {
      case "select": {
        const hit = hitLayer(p.x, p.y);
        setSelId(hit ? hit.id : null);
        if (hit) {
          pushHistory();
          dragRef.current = { kind: "move", startX: p.x, startY: p.y, layerId: hit.id, orig: { x: hit.x, y: hit.y } };
        }
        break;
      }
      case "brush":
      case "eraser": {
        if (tool === "eraser") {
          const s = layersRef.current.find((l) => l.id === selId);
          if (!s || s.kind !== "raster") {
            setStatus("Sélectionnez un calque raster à effacer.");
            return;
          }
        }
        pushHistory();
        const l = ensureRaster();
        paintSeg(l, p, p, tool === "eraser");
        dragRef.current = { kind: "paint", startX: 0, startY: 0, layerId: l.id };
        break;
      }
      case "text": {
        pushHistory();
        const l: TextLayer = {
          ...baseLayer("Texte"),
          kind: "text",
          text: "Votre texte",
          x: p.x,
          y: p.y,
          size: 48,
          color,
          font: FONTS[0],
          bold: false,
          italic: false,
        };
        setLayersBoth([...layersRef.current, l]);
        setSelId(l.id);
        setTool("select");
        break;
      }
      case "rect":
      case "ellipse":
      case "line": {
        pushHistory();
        const l: ShapeLayer = {
          ...baseLayer(tool === "line" ? "Ligne" : tool === "rect" ? "Rectangle" : "Ellipse"),
          kind: "shape",
          shape: tool,
          x: p.x,
          y: p.y,
          w: 0,
          h: 0,
          diag: 1,
          fill: tool === "line" || !fillOn ? null : color,
          stroke: strokeColor,
          strokeWidth,
        };
        setLayersBoth([...layersRef.current, l]);
        setSelId(l.id);
        dragRef.current = { kind: "shape", startX: p.x, startY: p.y, layerId: l.id };
        break;
      }
      case "crop": {
        dragRef.current = { kind: "crop", startX: p.x, startY: p.y };
        setCrop({ x: p.x, y: p.y, w: 0, h: 0 });
        break;
      }
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = dragRef.current;
    if (!d || !docW) return;
    if (d.kind === "pan") {
      setView((v) => ({ ...v, x: v.x + (e.clientX - d.startX), y: v.y + (e.clientY - d.startY) }));
      dragRef.current = { ...d, startX: e.clientX, startY: e.clientY };
      return;
    }
    const p = toDoc(e);
    if (d.kind === "move" && d.layerId) {
      const l = layersRef.current.find((x) => x.id === d.layerId);
      if (l && d.orig) {
        patchLayer(l.id, { x: d.orig.x + (p.x - d.startX), y: d.orig.y + (p.y - d.startY) } as Partial<Layer>);
      }
    } else if (d.kind === "paint" && d.layerId) {
      const l = layersRef.current.find((x) => x.id === d.layerId);
      if (l && l.kind === "raster") {
        paintSeg(l, lastPaint.current ?? p, p, tool === "eraser");
      }
    } else if (d.kind === "shape" && d.layerId) {
      const l = layersRef.current.find((x) => x.id === d.layerId);
      if (l && l.kind === "shape") {
        patchLayer(l.id, {
          x: Math.min(d.startX, p.x),
          y: Math.min(d.startY, p.y),
          w: Math.abs(p.x - d.startX),
          h: Math.abs(p.y - d.startY),
          diag: (p.x >= d.startX === (p.y >= d.startY) ? 1 : -1) as 1 | -1,
        } as Partial<Layer>);
      }
    } else if (d.kind === "crop") {
      setCrop({
        x: Math.max(0, Math.min(d.startX, p.x)),
        y: Math.max(0, Math.min(d.startY, p.y)),
        w: Math.min(docW, Math.abs(p.x - d.startX)),
        h: Math.min(docH, Math.abs(p.y - d.startY)),
      });
    }
    if (d.kind === "paint") lastPaint.current = p;
  };

  const onPointerUp = () => {
    dragRef.current = null;
    lastPaint.current = null;
  };

  // wheel zoom (non-passive)
  useEffect(() => {
    const disp = dispRef.current;
    if (!disp || !open) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = disp.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setView((v) => {
        const z = Math.max(0.05, Math.min(8, v.zoom * (1 - e.deltaY * 0.0015)));
        return { zoom: z, x: mx - (mx - v.x) * (z / v.zoom), y: my - (my - v.y) * (z / v.zoom) };
      });
    };
    disp.addEventListener("wheel", onWheel, { passive: false });
    return () => disp.removeEventListener("wheel", onWheel);
  }, [open, docW]);

  // ---- document operations --------------------------------------------------------

  const applyCrop = () => {
    if (!crop || crop.w < 2 || crop.h < 2) return;
    pushHistory();
    const cx0 = Math.max(0, Math.floor(crop.x));
    const cy0 = Math.max(0, Math.floor(crop.y));
    const cw = Math.max(1, Math.min(docW - cx0, Math.floor(crop.w)));
    const ch = Math.max(1, Math.min(docH - cy0, Math.floor(crop.h)));
    bakeCache.clear();
    const ls = layersRef.current.map((l) => {
      if (l.kind === "raster") {
        const c = newCanvas(cw, ch);
        c.getContext("2d")!.drawImage(l.canvas, cx0 - l.x, cy0 - l.y, cw, ch, 0, 0, cw, ch);
        return { ...l, canvas: c, x: 0, y: 0, version: l.version + 1 } as Layer;
      }
      const b = l as TextLayer | ShapeLayer;
      return { ...l, x: b.x - cx0, y: b.y - cy0 } as Layer;
    });
    setLayersBoth(ls);
    setDocSize({ w: cw, h: ch });
    setCrop(null);
    setStatus("✓ Recadrage appliqué");
  };

  const rotateDoc = () => {
    if (!docW) return;
    pushHistory();
    bakeCache.clear();
    const ls = layersRef.current.map((l) => {
      if (l.kind === "raster") {
        const c = newCanvas(l.canvas.height, l.canvas.width);
        const cx = c.getContext("2d")!;
        cx.translate(c.width / 2, c.height / 2);
        cx.rotate(Math.PI / 2);
        cx.drawImage(l.canvas, -l.canvas.width / 2, -l.canvas.height / 2);
        return { ...l, canvas: c, x: docH - (l.y + l.canvas.height), y: l.x, version: l.version + 1 } as Layer;
      }
      if (l.kind === "text") {
        return { ...l, x: docH - l.y, y: l.x } as Layer;
      }
      return { ...l, x: docH - (l.y + l.h), y: l.x, w: l.h, h: l.w, diag: (l.diag > 0 ? -1 : 1) as 1 | -1 } as Layer;
    });
    setLayersBoth(ls);
    setDocSize({ w: docH, h: docW });
    setCrop(null);
  };

  const flipDoc = (axis: "x" | "y") => {
    if (!docW) return;
    pushHistory();
    bakeCache.clear();
    const ls = layersRef.current.map((l) => {
      if (l.kind === "raster") {
        const c = newCanvas(l.canvas.width, l.canvas.height);
        const cx = c.getContext("2d")!;
        if (axis === "x") {
          cx.translate(c.width, 0);
          cx.scale(-1, 1);
        } else {
          cx.translate(0, c.height);
          cx.scale(1, -1);
        }
        cx.drawImage(l.canvas, 0, 0);
        return {
          ...l,
          canvas: c,
          x: axis === "x" ? docW - (l.x + c.width) : l.x,
          y: axis === "y" ? docH - (l.y + c.height) : l.y,
          version: l.version + 1,
        } as Layer;
      }
      if (l.kind === "text") {
        return { ...l, x: axis === "x" ? docW - l.x : l.x, y: axis === "y" ? docH - l.y : l.y } as Layer;
      }
      return {
        ...l,
        x: axis === "x" ? docW - (l.x + l.w) : l.x,
        y: axis === "y" ? docH - (l.y + l.h) : l.y,
        diag: axis === "x" ? ((l.diag > 0 ? -1 : 1) as 1 | -1) : l.diag,
      } as Layer;
    });
    setLayersBoth(ls);
    setCrop(null);
  };

  const openResize = () => {
    setResize({ w: docW, h: docH, link: true });
    setResizeOpen(true);
  };

  const applyResize = () => {
    if (!docW || resize.w < 1 || resize.h < 1) return;
    pushHistory();
    bakeCache.clear();
    const sx = resize.w / docW;
    const sy = resize.h / docH;
    const ls = layersRef.current.map((l) => {
      if (l.kind === "raster") {
        const c = newCanvas(l.canvas.width * sx, l.canvas.height * sy);
        const cx = c.getContext("2d")!;
        cx.imageSmoothingQuality = "high";
        cx.drawImage(l.canvas, 0, 0, c.width, c.height);
        return { ...l, canvas: c, x: l.x * sx, y: l.y * sy, version: l.version + 1 } as Layer;
      }
      if (l.kind === "text") {
        return { ...l, x: l.x * sx, y: l.y * sy, size: Math.max(4, Math.round(l.size * Math.min(sx, sy))) } as Layer;
      }
      return { ...l, x: l.x * sx, y: l.y * sy, w: l.w * sx, h: l.h * sy } as Layer;
    });
    setLayersBoth(ls);
    setDocSize({ w: Math.round(resize.w), h: Math.round(resize.h) });
    setResizeOpen(false);
  };

  // ---- layer operations -----------------------------------------------------------

  const addLayer = () => {
    if (!docW) return;
    pushHistory();
    const c = newCanvas(docW, docH);
    const l: RasterLayer = { ...baseLayer("Calque de peinture"), kind: "raster", canvas: c, x: 0, y: 0, version: 0 };
    setLayersBoth([...layersRef.current, l]);
    setSelId(l.id);
  };

  const deleteLayer = () => {
    if (!selId || layersRef.current.length <= 1) return;
    pushHistory();
    bakeCache.delete(selId);
    const ls = layersRef.current.filter((l) => l.id !== selId);
    setLayersBoth(ls);
    setSelId(ls[ls.length - 1]?.id ?? null);
  };

  const duplicateLayer = () => {
    const s = layersRef.current.find((l) => l.id === selId);
    if (!s) return;
    pushHistory();
    let copy: Layer;
    if (s.kind === "raster") {
      const c = newCanvas(s.canvas.width, s.canvas.height);
      c.getContext("2d")!.drawImage(s.canvas, 0, 0);
      copy = { ...s, id: uid(), name: `${s.name} copie`, canvas: c, version: 0 };
    } else {
      copy = { ...s, id: uid(), name: `${s.name} copie` };
    }
    const ls = [...layersRef.current, copy];
    setLayersBoth(ls);
    setSelId(copy.id);
  };

  const moveLayer = (dir: 1 | -1) => {
    if (!selId) return;
    const i = layersRef.current.findIndex((l) => l.id === selId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= layersRef.current.length) return;
    pushSoon();
    const ls = [...layersRef.current];
    [ls[i], ls[j]] = [ls[j], ls[i]];
    setLayersBoth(ls);
  };

  const mergeDown = () => {
    const i = layersRef.current.findIndex((l) => l.id === selId);
    if (i <= 0 || !docW) return;
    pushHistory();
    const top = layersRef.current[i];
    const bottom = layersRef.current[i - 1];
    const c = newCanvas(docW, docH);
    const cx = c.getContext("2d")!;
    drawLayerTo(cx, bottom);
    drawLayerTo(cx, top);
    const merged: RasterLayer = { ...baseLayer(bottom.name), kind: "raster", canvas: c, x: 0, y: 0, version: 0 };
    const ls = [...layersRef.current];
    ls.splice(i - 1, 2, merged);
    bakeCache.clear();
    setLayersBoth(ls);
    setSelId(merged.id);
  };

  const clearLayer = () => {
    const s = layersRef.current.find((l) => l.id === selId);
    if (!s || s.kind !== "raster") return;
    pushHistory();
    s.canvas.getContext("2d")!.clearRect(0, 0, s.canvas.width, s.canvas.height);
    s.version++;
    bakeCache.delete(s.id);
    bump();
  };

  // ---- filter menu (destructive filters with live preview) -------------------------

  const openFilterDialog = (def: FilterDef) => {
    const l = layersRef.current.find((x) => x.id === selId);
    if (!l || l.kind !== "raster") {
      setStatus("Sélectionnez d'abord un calque raster (pixels) pour appliquer un filtre.");
      return;
    }
    const params: Record<string, number> = {};
    def.params.forEach((p) => {
      params[p.key] = p.def;
    });
    setFilterDlg({ def, params });
  };

  /** apply a filter destructively to a raster layer, with history + last-filter memory */
  const bakeFilterOn = (l: RasterLayer, def: FilterDef, params: Record<string, number>) => {
    pushHistory();
    let out: HTMLCanvasElement;
    try {
      out = def.apply(l.canvas, params);
    } catch {
      setStatus("Filtre impossible (calque distant protégé) — réimportez le fichier localement.");
      return;
    }
    const cx = l.canvas.getContext("2d")!;
    cx.save();
    cx.globalCompositeOperation = "source-over";
    cx.clearRect(0, 0, l.canvas.width, l.canvas.height);
    cx.drawImage(out, 0, 0);
    cx.restore();
    l.version++;
    bakeCache.delete(l.id);
    bump();
    lastFilterRef.current = { id: def.id, params: { ...params } };
    setStatus(`✓ ${def.label.replace("…", "")} appliqué au calque « ${l.name} »`);
  };

  const applyFilterDialog = () => {
    if (!filterDlg) return;
    const l = layersRef.current.find((x) => x.id === selId);
    if (!l || l.kind !== "raster") return;
    bakeFilterOn(l, filterDlg.def, filterDlg.params);
    setFilterDlg(null);
  };

  const repeatLastFilter = () => {
    const last = lastFilterRef.current;
    if (!last) return;
    const def = FILTERS.find((f) => f.id === last.id);
    const l = layersRef.current.find((x) => x.id === selId);
    if (!def || !l || l.kind !== "raster") {
      setStatus("Sélectionnez un calque raster pour répéter le filtre.");
      return;
    }
    bakeFilterOn(l, def, last.params);
  };

  // live preview inside the filter dialog (downscaled for speed)
  useEffect(() => {
    if (!filterDlg) return;
    const pv = filterPreviewRef.current;
    const l = layersRef.current.find((x) => x.id === selId);
    if (!pv || !l || l.kind !== "raster") return;
    const src = l.canvas;
    const s = Math.min(1, 420 / Math.max(src.width, src.height));
    const small = newCanvas(Math.max(1, src.width * s), Math.max(1, src.height * s));
    const scx = small.getContext("2d")!;
    scx.imageSmoothingQuality = "high";
    scx.drawImage(src, 0, 0, small.width, small.height);
    let out = small;
    try {
      out = filterDlg.def.apply(small, filterDlg.params);
    } catch {
      /* keep unfiltered preview */
    }
    pv.width = out.width;
    pv.height = out.height;
    const pcx = pv.getContext("2d")!;
    pcx.clearRect(0, 0, pv.width, pv.height);
    pcx.drawImage(out, 0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterDlg, selId]);

  // ---- import / export ---------------------------------------------------------------

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result);
      if (layersRef.current.length === 0) loadDocFromSrc(src);
      else {
        // add as a new layer on top of the current document
        const im = new Image();
        im.onload = () => {
          const c = newCanvas(im.naturalWidth, im.naturalHeight);
          c.getContext("2d")!.drawImage(im, 0, 0);
          const l: RasterLayer = {
            ...baseLayer(file.name.replace(/\.[^.]+$/, "")),
            kind: "raster",
            canvas: c,
            x: 0,
            y: 0,
            version: 0,
          };
          setLayersBoth([...layersRef.current, l]);
          setSelId(l.id);
        };
        im.src = src;
      }
    };
    reader.readAsDataURL(file);
  };

  const exportToCanvas = () => {
    const doc = compositeDoc();
    if (!doc) return;
    try {
      const dataUrl = doc.toDataURL("image/png");
      const s = Math.min(960 / doc.width, 540 / doc.height, 1.5);
      add(
        newImage(dataUrl, {
          width: Math.round(doc.width * s),
          height: Math.round(doc.height * s),
        }),
      );
      setStatus("✓ Image importée sur le canvas");
    } catch {
      setStatus("Export impossible (calque distant protégé) — réimportez le fichier localement puis réessayez.");
    }
  };

  const downloadPng = () => {
    const doc = compositeDoc();
    if (!doc) return;
    try {
      const a = document.createElement("a");
      a.href = doc.toDataURL("image/png");
      a.download = "diapolab-image.png";
      a.click();
      setStatus("✓ PNG téléchargé");
    } catch {
      setStatus("Téléchargement impossible (calque distant protégé).");
    }
  };

  // ---- keyboard ------------------------------------------------------------------

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(null);
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.key.toLowerCase() === "z" && e.shiftKey) || e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        repeatLastFilter();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ---- menus -----------------------------------------------------------------------

  const menuDefs: Record<string, MenuEntry[]> = {
    Fichier: [
      { label: "Ouvrir une image…", action: () => fileRef.current?.click() },
      { label: "Nouveau document vierge", action: newBlankDoc },
      { label: "Télécharger PNG", action: downloadPng, sep: true },
      { label: "Importer sur le canvas", action: exportToCanvas },
    ],
    "Édition": [
      { label: "Annuler (Ctrl+Z)", action: undo, disabled: hist.u === 0 },
      { label: "Rétablir (Ctrl+Y)", action: redo, disabled: hist.r === 0 },
      { label: "Vider le calque sélectionné", action: clearLayer, sep: true },
    ],
    Image: [
      { label: "Taille de l'image…", action: openResize },
      { label: "Recadrer selon le cadre", action: applyCrop, disabled: !crop || crop.w < 2 },
      { label: "Pivoter de 90°", action: rotateDoc, sep: true },
      { label: "Miroir horizontal", action: () => flipDoc("x") },
      { label: "Miroir vertical", action: () => flipDoc("y") },
    ],
    Filtre: [
      { label: "Répéter le dernier filtre (Ctrl+F)", action: repeatLastFilter, disabled: !lastFilterRef.current },
      ...FILTER_GROUP_ORDER.map((g, gi) => ({
        label: g,
        sep: gi === 0,
        sub: FILTERS.filter((f) => f.group === g).map((f) => ({
          label: f.label,
          disabled: !sel || sel.kind !== "raster",
          action: () => openFilterDialog(f),
        })),
      })),
    ],
    Calque: [
      { label: "Nouveau calque de peinture", action: addLayer },
      { label: "Dupliquer le calque", action: duplicateLayer, disabled: !selId },
      { label: "Fusionner vers le bas", action: mergeDown, disabled: !selId, sep: true },
      { label: "Supprimer le calque", action: deleteLayer, disabled: !selId || layers.length <= 1 },
    ],
    Affichage: [
      { label: "Zoom avant", action: () => setView((v) => ({ ...v, zoom: Math.min(8, v.zoom * 1.25) })) },
      { label: "Zoom arrière", action: () => setView((v) => ({ ...v, zoom: Math.max(0.05, v.zoom / 1.25) })) },
      { label: "Zoom 100 %", action: () => setView((v) => ({ ...v, zoom: 1 })), sep: true },
      { label: "Ajuster à l'écran", action: fitView },
    ],
  };

  const toolCursors: Record<Tool, string> = {
    select: "default",
    hand: "grab",
    brush: "crosshair",
    eraser: "crosshair",
    text: "text",
    rect: "crosshair",
    ellipse: "crosshair",
    line: "crosshair",
    crop: "crosshair",
  };

  /** recursive menu renderer — supports hover submenus (menu Filtre) */
  const renderMenuList = (items: MenuEntry[], depth = 0): React.ReactNode =>
    items.map((it, i) => (
      <div key={`${depth}-${it.label}-${i}`}>
        {it.sep && i > 0 && <div className="my-1 h-px bg-slate-100" />}
        {it.sub && it.sub.length > 0 ? (
          <div className="group/submenu relative">
            <div
              className={`flex w-full cursor-default items-center justify-between px-3 py-1.5 text-[11px] ${
                it.disabled ? "text-slate-300" : "text-slate-700 hover:bg-fuchsia-50 hover:text-fuchsia-700"
              }`}
            >
              {it.label}
              <ChevronRight className="size-2.5" />
            </div>
            <div className="invisible absolute left-full top-[-4px] z-30 min-w-[220px] rounded-lg border border-slate-200 bg-white py-1 shadow-xl group-hover/submenu:visible">
              {renderMenuList(it.sub, depth + 1)}
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={it.disabled}
            onClick={() => {
              setMenuOpen(null);
              it.action?.();
            }}
            className={`w-full px-3 py-1.5 text-left text-[11px] ${
              it.disabled
                ? "cursor-not-allowed text-slate-300"
                : "text-slate-700 hover:bg-fuchsia-50 hover:text-fuchsia-700"
            }`}
          >
            {it.label}
          </button>
        )}
      </div>
    ));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92vh] max-w-[96vw] flex-col gap-0 overflow-hidden border-slate-200 bg-white p-0 text-slate-900 shadow-2xl">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
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
              disabled={!docW}
              className={`flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-3.5 py-1.5 text-[11px] font-bold text-white shadow-md transition ${
                docW ? "hover:brightness-110" : "cursor-not-allowed opacity-40"
              }`}
            >
              <ImageDown className="size-3.5" /> Importer sur le canvas
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
          </div>
        </DialogHeader>

        {/* Menu bar */}
        <div className="relative z-20 flex items-center gap-0.5 border-b border-slate-200 bg-white px-2 py-1">
          {Object.keys(menuDefs).map((m) => (
            <div key={m} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen(menuOpen === m ? null : m)}
                className={`flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-medium transition ${
                  menuOpen === m ? "bg-fuchsia-50 text-fuchsia-700" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {m}
                <ChevronDown className="size-2.5" />
              </button>
              {menuOpen === m && (
                <div className="absolute left-0 top-full mt-1 min-w-[200px] rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
                  {renderMenuList(menuDefs[m])}
                </div>
              )}
            </div>
          ))}
          <div className="ml-auto flex items-center gap-1 text-[11px] text-slate-500">
            <button type="button" title="Annuler" onClick={undo} disabled={hist.u === 0} className="rounded p-1 hover:bg-slate-100 disabled:opacity-30">
              <Undo2 className="size-3.5" />
            </button>
            <button type="button" title="Rétablir" onClick={redo} disabled={hist.r === 0} className="rounded p-1 hover:bg-slate-100 disabled:opacity-30">
              <Redo2 className="size-3.5" />
            </button>
            <span className="tabular-nums">{docW ? `${docW} × ${docH} px` : ""}</span>
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* Toolbar */}
          <div className="flex w-12 flex-col items-center gap-1 border-r border-slate-200 bg-slate-50 py-2">
            <ToolButton title="Sélection / déplacement" active={tool === "select"} onClick={() => setTool("select")}>
              <Move className="size-4" />
            </ToolButton>
            <ToolButton title="Main (déplacer la vue)" active={tool === "hand"} onClick={() => setTool("hand")}>
              <Hand className="size-4" />
            </ToolButton>
            <div className="my-0.5 h-px w-7 bg-slate-200" />
            <ToolButton title="Pinceau" active={tool === "brush"} onClick={() => setTool("brush")}>
              <Brush className="size-4" />
            </ToolButton>
            <ToolButton title="Gomme" active={tool === "eraser"} onClick={() => setTool("eraser")}>
              <Eraser className="size-4" />
            </ToolButton>
            <ToolButton title="Texte" active={tool === "text"} onClick={() => setTool("text")}>
              <Type className="size-4" />
            </ToolButton>
            <div className="my-0.5 h-px w-7 bg-slate-200" />
            <ToolButton title="Rectangle" active={tool === "rect"} onClick={() => setTool("rect")}>
              <Square className="size-4" />
            </ToolButton>
            <ToolButton title="Ellipse" active={tool === "ellipse"} onClick={() => setTool("ellipse")}>
              <Circle className="size-4" />
            </ToolButton>
            <ToolButton title="Ligne" active={tool === "line"} onClick={() => setTool("line")}>
              <Minus className="size-4" />
            </ToolButton>
            <div className="my-0.5 h-px w-7 bg-slate-200" />
            <ToolButton title="Recadrer (tracer un cadre)" active={tool === "crop"} onClick={() => setTool("crop")}>
              <Crop className="size-4" />
            </ToolButton>
          </div>

          {/* Canvas viewport */}
          <div ref={containerRef} className="relative min-h-0 flex-1 overflow-hidden bg-slate-300/60">
            <canvas
              ref={dispRef}
              style={{ cursor: toolCursors[tool] }}
              className="block h-full w-full touch-none"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            />
            {/* zoom HUD */}
            <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-lg border border-slate-200 bg-white/95 px-1.5 py-1 shadow-md">
              <button
                type="button"
                title="Zoom arrière"
                onClick={() => setView((v) => ({ ...v, zoom: Math.max(0.05, v.zoom / 1.25) }))}
                className="rounded p-1 text-slate-600 hover:bg-slate-100"
              >
                <ZoomOut className="size-3.5" />
              </button>
              <span className="w-12 text-center text-[11px] font-semibold tabular-nums text-slate-600">
                {Math.round(view.zoom * 100)} %
              </span>
              <button
                type="button"
                title="Zoom avant"
                onClick={() => setView((v) => ({ ...v, zoom: Math.min(8, v.zoom * 1.25) }))}
                className="rounded p-1 text-slate-600 hover:bg-slate-100"
              >
                <ZoomIn className="size-3.5" />
              </button>
              <button
                type="button"
                title="Zoom 100 %"
                onClick={() => setView((v) => ({ ...v, zoom: 1 }))}
                className="rounded px-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-100"
              >
                100%
              </button>
              <button type="button" title="Ajuster à l'écran" onClick={fitView} className="rounded p-1 text-slate-600 hover:bg-slate-100">
                <Maximize className="size-3.5" />
              </button>
            </div>
            {tool === "crop" && (
              <div className="absolute bottom-3 right-3 flex gap-1.5 rounded-lg border border-slate-200 bg-white/95 px-2 py-1.5 shadow-md">
                <button
                  type="button"
                  onClick={applyCrop}
                  disabled={!crop || crop.w < 2}
                  className={`rounded-lg bg-fuchsia-600 px-2.5 py-1 text-[11px] font-bold text-white ${
                    crop && crop.w >= 2 ? "hover:brightness-110" : "cursor-not-allowed opacity-40"
                  }`}
                >
                  Appliquer
                </button>
                <button
                  type="button"
                  onClick={() => setCrop(null)}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
                >
                  Annuler
                </button>
              </div>
            )}

            {/* resize dialog */}
            {resizeOpen && (
              <div className="absolute inset-0 z-30 grid place-items-center bg-slate-900/30">
                <div className="w-64 space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xl">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700">Taille de l'image</h3>
                  <label className="flex items-center justify-between text-[11px] font-medium text-slate-600">
                    Largeur
                    <input
                      type="number"
                      min={1}
                      value={resize.w}
                      onChange={(e) => {
                        const w = Math.max(1, Math.round(Number(e.target.value) || 1));
                        setResize((r) => ({ ...r, w, h: r.link ? Math.round((w / docW) * docH) : r.h }));
                      }}
                      className="w-20 rounded border border-slate-200 px-2 py-1 text-right"
                    />
                  </label>
                  <label className="flex items-center justify-between text-[11px] font-medium text-slate-600">
                    Hauteur
                    <input
                      type="number"
                      min={1}
                      value={resize.h}
                      onChange={(e) => {
                        const h = Math.max(1, Math.round(Number(e.target.value) || 1));
                        setResize((r) => ({ ...r, h, w: r.link ? Math.round((h / docH) * docW) : r.w }));
                      }}
                      className="w-20 rounded border border-slate-200 px-2 py-1 text-right"
                    />
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
                    <input type="checkbox" checked={resize.link} onChange={(e) => setResize((r) => ({ ...r, link: e.target.checked }))} />
                    Conserver les proportions
                  </label>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={applyResize}
                      className="flex-1 rounded-lg bg-fuchsia-600 py-1.5 text-[11px] font-bold text-white hover:brightness-110"
                    >
                      Appliquer
                    </button>
                    <button
                      type="button"
                      onClick={() => setResizeOpen(false)}
                      className="flex-1 rounded-lg border border-slate-200 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* filter dialog with live preview */}
            {filterDlg && (
              <div className="absolute inset-0 z-40 grid place-items-center bg-slate-900/30">
                <div className="w-72 space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xl">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700">
                    {filterDlg.def.label.replace("…", "")}
                  </h3>
                  <div className="grid place-items-center overflow-hidden rounded border border-slate-200 bg-[repeating-conic-gradient(#f1f5f9_0%_25%,#ffffff_0%_50%)] bg-[length:16px_16px]">
                    <canvas
                      ref={filterPreviewRef}
                      className="max-h-40 max-w-full object-contain"
                      style={{ maxHeight: 160 }}
                    />
                  </div>
                  {filterDlg.def.params.map((p) => (
                    <SliderRow
                      key={p.key}
                      label={p.label}
                      value={filterDlg.params[p.key]}
                      min={p.min}
                      max={p.max}
                      unit={p.unit ?? ""}
                      onChange={(v) => setFilterDlg((d) => (d ? { ...d, params: { ...d.params, [p.key]: v } } : d))}
                    />
                  ))}
                  {filterDlg.def.params.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setFilterDlg((d) => {
                          if (!d) return d;
                          const params: Record<string, number> = {};
                          d.def.params.forEach((p) => {
                            params[p.key] = p.def;
                          });
                          return { ...d, params };
                        })
                      }
                      className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
                    >
                      Réinitialiser
                    </button>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={applyFilterDialog}
                      className="flex-1 rounded-lg bg-fuchsia-600 py-1.5 text-[11px] font-bold text-white hover:brightness-110"
                    >
                      Appliquer
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterDlg(null)}
                      className="flex-1 rounded-lg border border-slate-200 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="flex w-64 shrink-0 flex-col border-l border-slate-200 bg-slate-50">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
              {/* tool options */}
              {(tool === "brush" || tool === "eraser") && (
                <PanelSection title={tool === "brush" ? "Pinceau" : "Gomme"}>
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
                  <SliderRow label="Taille" value={brushSize} min={1} max={200} unit=" px" onChange={setBrushSize} />
                </PanelSection>
              )}

              {(tool === "rect" || tool === "ellipse" || tool === "line") && (
                <PanelSection title="Formes">
                  <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    <input type="checkbox" checked={fillOn} onChange={(e) => setFillOn(e.target.checked)} /> Remplir les formes
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Couleur de contour</span>
                    <input
                      type="color"
                      value={strokeColor}
                      onChange={(e) => setStrokeColor(e.target.value)}
                      className="h-8 w-full cursor-pointer rounded border border-slate-200 bg-white p-0.5"
                    />
                  </label>
                  <SliderRow label="Épaisseur" value={strokeWidth} min={1} max={40} unit=" px" onChange={setStrokeWidth} />
                </PanelSection>
              )}

              {/* selected text layer editor */}
              {sel?.kind === "text" && (
                <PanelSection title="Texte">
                  <textarea
                    value={sel.text}
                    onChange={(e) => {
                      pushSoon();
                      patchLayer(sel.id, { text: e.target.value } as Partial<Layer>);
                    }}
                    rows={3}
                    className="w-full rounded border border-slate-200 p-1.5 text-[11px]"
                  />
                  <SliderRow
                    label="Taille"
                    value={sel.size}
                    min={8}
                    max={400}
                    unit=" px"
                    onChange={(v) => {
                      pushSoon();
                      patchLayer(sel.id, { size: v } as Partial<Layer>);
                    }}
                  />
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Couleur</span>
                    <input
                      type="color"
                      value={sel.color}
                      onChange={(e) => {
                        pushSoon();
                        patchLayer(sel.id, { color: e.target.value } as Partial<Layer>);
                      }}
                      className="h-8 w-full cursor-pointer rounded border border-slate-200 bg-white p-0.5"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Police</span>
                    <select
                      value={sel.font}
                      onChange={(e) => {
                        pushSoon();
                        patchLayer(sel.id, { font: e.target.value } as Partial<Layer>);
                      }}
                      className="w-full rounded border border-slate-200 bg-white px-1.5 py-1 text-[11px]"
                    >
                      {FONTS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        pushSoon();
                        patchLayer(sel.id, { bold: !sel.bold } as Partial<Layer>);
                      }}
                      className={`flex-1 rounded border px-2 py-1 text-[11px] font-bold ${
                        sel.bold ? "border-fuchsia-500 bg-fuchsia-50 text-fuchsia-700" : "border-slate-200 text-slate-600"
                      }`}
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        pushSoon();
                        patchLayer(sel.id, { italic: !sel.italic } as Partial<Layer>);
                      }}
                      className={`flex-1 rounded border px-2 py-1 text-[11px] italic ${
                        sel.italic ? "border-fuchsia-500 bg-fuchsia-50 text-fuchsia-700" : "border-slate-200 text-slate-600"
                      }`}
                    >
                      I
                    </button>
                  </div>
                </PanelSection>
              )}

              {/* selected shape layer editor */}
              {sel?.kind === "shape" && (
                <PanelSection title={sel.shape === "line" ? "Ligne" : sel.shape === "rect" ? "Rectangle" : "Ellipse"}>
                  <SliderRow
                    label="Position X"
                    value={Math.round(sel.x)}
                    min={-Math.round(docW)}
                    max={Math.round(docW * 2)}
                    unit=" px"
                    onChange={(v) => {
                      pushSoon();
                      patchLayer(sel.id, { x: v } as Partial<Layer>);
                    }}
                  />
                  <SliderRow
                    label="Position Y"
                    value={Math.round(sel.y)}
                    min={-Math.round(docH)}
                    max={Math.round(docH * 2)}
                    unit=" px"
                    onChange={(v) => {
                      pushSoon();
                      patchLayer(sel.id, { y: v } as Partial<Layer>);
                    }}
                  />
                  <SliderRow
                    label="Largeur"
                    value={Math.round(sel.w)}
                    min={0}
                    max={Math.round(docW * 2)}
                    unit=" px"
                    onChange={(v) => {
                      pushSoon();
                      patchLayer(sel.id, { w: v } as Partial<Layer>);
                    }}
                  />
                  <SliderRow
                    label="Hauteur"
                    value={Math.round(sel.h)}
                    min={0}
                    max={Math.round(docH * 2)}
                    unit=" px"
                    onChange={(v) => {
                      pushSoon();
                      patchLayer(sel.id, { h: v } as Partial<Layer>);
                    }}
                  />
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Contour</span>
                    <input
                      type="color"
                      value={sel.stroke ?? "#0f172a"}
                      onChange={(e) => {
                        pushSoon();
                        patchLayer(sel.id, { stroke: e.target.value } as Partial<Layer>);
                      }}
                      className="h-8 w-full cursor-pointer rounded border border-slate-200 bg-white p-0.5"
                    />
                  </label>
                  <SliderRow
                    label="Épaisseur"
                    value={sel.strokeWidth}
                    min={0}
                    max={40}
                    unit=" px"
                    onChange={(v) => {
                      pushSoon();
                      patchLayer(sel.id, { strokeWidth: v } as Partial<Layer>);
                    }}
                  />
                  {sel.shape !== "line" && (
                    <>
                      <label className="block">
                        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Remplissage</span>
                        <input
                          type="color"
                          value={sel.fill ?? "#f43f5e"}
                          onChange={(e) => {
                            pushSoon();
                            patchLayer(sel.id, { fill: e.target.value } as Partial<Layer>);
                          }}
                          className="h-8 w-full cursor-pointer rounded border border-slate-200 bg-white p-0.5"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          pushSoon();
                          patchLayer(sel.id, { fill: sel.fill ? null : color } as Partial<Layer>);
                        }}
                        className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
                      >
                        {sel.fill ? "Sans remplissage" : "Avec remplissage"}
                      </button>
                    </>
                  )}
                </PanelSection>
              )}

              {/* filters of the selected layer */}
              {sel && (
                <PanelSection title={`Filtres — ${sel.name}`}>
                  <SliderRow label="Luminosité" value={sel.fx.brightness} min={0} max={200} unit="%" onChange={(v) => { pushSoon(); patchFx(sel.id, { brightness: v }); }} />
                  <SliderRow label="Contraste" value={sel.fx.contrast} min={0} max={200} unit="%" onChange={(v) => { pushSoon(); patchFx(sel.id, { contrast: v }); }} />
                  <SliderRow label="Saturation" value={sel.fx.saturate} min={0} max={200} unit="%" onChange={(v) => { pushSoon(); patchFx(sel.id, { saturate: v }); }} />
                  <SliderRow label="Teinte" value={sel.fx.hue} min={0} max={360} unit="°" onChange={(v) => { pushSoon(); patchFx(sel.id, { hue: v }); }} />
                  <SliderRow label="Flou" value={sel.fx.blur} min={0} max={40} unit=" px" onChange={(v) => { pushSoon(); patchFx(sel.id, { blur: v }); }} />
                  <SliderRow label="Noir et blanc" value={sel.fx.grayscale} min={0} max={100} unit="%" onChange={(v) => { pushSoon(); patchFx(sel.id, { grayscale: v }); }} />
                  <SliderRow label="Sépia" value={sel.fx.sepia} min={0} max={100} unit="%" onChange={(v) => { pushSoon(); patchFx(sel.id, { sepia: v }); }} />
                  <SliderRow label="Négatif" value={sel.fx.invert} min={0} max={100} unit="%" onChange={(v) => { pushSoon(); patchFx(sel.id, { invert: v }); }} />
                  <div className="h-px bg-slate-200" />
                  <SliderRow label="Pixelisation" value={sel.fx.pixelate} min={0} max={60} unit=" px" onChange={(v) => { pushSoon(); patchFx(sel.id, { pixelate: v }); }} />
                  <SliderRow label="Glitch RGB" value={sel.fx.glitch} min={0} max={50} unit=" px" onChange={(v) => { pushSoon(); patchFx(sel.id, { glitch: v }); }} />
                  <SliderRow label="Déformation (onde)" value={sel.fx.wave} min={0} max={60} unit=" px" onChange={(v) => { pushSoon(); patchFx(sel.id, { wave: v }); }} />
                  <div className="h-px bg-slate-200" />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Courbe (contraste tonal)</span>
                    <button
                      type="button"
                      onClick={() => {
                        pushSoon();
                        patchFx(sel.id, { curve: sel.fx.curve ? null : [0, 0.25, 0.5, 0.75, 1] });
                      }}
                      className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${
                        sel.fx.curve ? "border-fuchsia-500 bg-fuchsia-50 text-fuchsia-700" : "border-slate-200 text-slate-500"
                      }`}
                    >
                      {sel.fx.curve ? "ON" : "OFF"}
                    </button>
                  </div>
                  {sel.fx.curve && (
                    <CurveEditor
                      points={sel.fx.curve}
                      onChange={(p) => {
                        pushSoon();
                        patchFx(sel.id, { curve: p });
                      }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      pushHistory();
                      patchFx(sel.id, { ...DEFAULT_FX });
                    }}
                    className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Réinitialiser les filtres
                  </button>
                </PanelSection>
              )}
            </div>

            {/* layers panel */}
            <div className="max-h-[40%] shrink-0 overflow-y-auto border-t border-slate-200 bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <Layers className="size-3" /> Calques
                </h3>
                <div className="flex gap-1">
                  <button type="button" title="Nouveau calque de peinture" onClick={addLayer} className="rounded p-1 text-slate-500 hover:bg-slate-100">
                    <Plus className="size-3.5" />
                  </button>
                  <button type="button" title="Dupliquer" onClick={duplicateLayer} disabled={!selId} className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30">
                    <Copy className="size-3.5" />
                  </button>
                  <button type="button" title="Fusionner vers le bas" onClick={mergeDown} disabled={!selId} className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30">
                    <ArrowDownToLine className="size-3.5" />
                  </button>
                  <button type="button" title="Monter" onClick={() => moveLayer(1)} disabled={!selId} className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30">
                    <ArrowUp className="size-3.5" />
                  </button>
                  <button type="button" title="Descendre" onClick={() => moveLayer(-1)} disabled={!selId} className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30">
                    <ArrowDown className="size-3.5" />
                  </button>
                  <button type="button" title="Supprimer" onClick={deleteLayer} disabled={!selId || layers.length <= 1} className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                {[...layers].reverse().map((l) => (
                  <div
                    key={l.id}
                    onClick={() => setSelId(l.id)}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-[11px] transition ${
                      l.id === selId ? "border-fuchsia-400 bg-fuchsia-50" : "border-slate-100 hover:bg-slate-50"
                    }`}
                  >
                    <button
                      type="button"
                      title={l.visible ? "Masquer" : "Afficher"}
                      onClick={(e) => {
                        e.stopPropagation();
                        patchLayer(l.id, { visible: !l.visible } as Partial<Layer>);
                      }}
                      className="text-slate-500 hover:text-fuchsia-600"
                    >
                      {l.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                    </button>
                    <span className="flex-1 truncate font-medium text-slate-700">
                      {l.name}
                      <span className="ml-1 text-[9px] uppercase text-slate-400">
                        {l.kind === "raster" ? "pixels" : l.kind === "text" ? "texte" : "forme"}
                      </span>
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(l.opacity * 100)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => patchLayer(l.id, { opacity: Number(e.target.value) / 100 } as Partial<Layer>)}
                      className="w-12 accent-fuchsia-600"
                      title="Opacité"
                    />
                  </div>
                ))}
              </div>
            </div>
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
