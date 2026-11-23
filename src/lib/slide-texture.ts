import type { AnyElement, Page } from "@/store/editor";
import { EVENODD_SHAPES, pathFor, STROKE_ONLY_SHAPES } from "@/components/editor/ShapeRender";

const imageCache = new Map<string, HTMLImageElement>();
const pendingLoads = new Map<string, Promise<HTMLImageElement | null>>();

function isSafeImageSrc(src: string): boolean {
  if (!src) return false;
  if (src.startsWith("data:") || src.startsWith("blob:") || src.startsWith("/")) return true;
  try {
    const parsed = new URL(src, window.location.origin);
    return parsed.origin === window.location.origin;
  } catch {
    return false;
  }
}

function getCachedImage(src: string, onLoad?: () => void): HTMLImageElement | null {
  if (!isSafeImageSrc(src)) return null;
  const cached = imageCache.get(src);
  if (cached) return cached.complete && cached.naturalWidth > 0 ? cached : null;
  if (!pendingLoads.has(src)) {
    const promise = new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        imageCache.set(src, img);
        pendingLoads.delete(src);
        onLoad?.();
        resolve(img);
      };
      img.onerror = () => {
        pendingLoads.delete(src);
        resolve(null);
      };
      img.src = src;
    });
    pendingLoads.set(src, promise);
  }
  return null;
}

function extractColorStops(expr: string): string[] {
  const matches = expr.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)/g);
  return matches && matches.length > 0 ? matches : ["#ffffff", "#e2e8f0"];
}

function paintBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  bgColor?: string,
  bgImage?: string,
  bgFit?: string,
  onAsyncAsset?: () => void,
) {
  const bg = typeof bgColor === "string" && bgColor ? bgColor : "#ffffff";
  if (bg.includes("radial-gradient(")) {
    const stops = extractColorStops(bg);
    const grad = ctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.05, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
    stops.forEach((c, idx) => grad.addColorStop(stops.length === 1 ? 0 : idx / (stops.length - 1), c));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  } else if (bg.includes("gradient(")) {
    const angleMatch = bg.match(/(-?\d+(?:\.\d+)?)deg/);
    const deg = angleMatch ? parseFloat(angleMatch[1]) : 135;
    const rad = ((deg - 90) * Math.PI) / 180;
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.hypot(w, h) / 2;
    const grad = ctx.createLinearGradient(
      cx - Math.cos(rad) * r,
      cy - Math.sin(rad) * r,
      cx + Math.cos(rad) * r,
      cy + Math.sin(rad) * r,
    );
    const stops = extractColorStops(bg);
    stops.forEach((c, idx) => grad.addColorStop(stops.length === 1 ? 0 : idx / (stops.length - 1), c));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  } else {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
  }

  if (bgImage) {
    const img = getCachedImage(bgImage, onAsyncAsset);
    if (img) {
      const iw = img.naturalWidth || w;
      const ih = img.naturalHeight || h;
      const scale = bgFit === "contain" ? Math.min(w / iw, h / ih) : Math.max(w / iw, h / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    }
  }
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
) {
  const r = Math.max(0, Math.min(radius, Math.min(w, h) / 2));
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  w: number,
  h: number,
  fontSize: number,
  lineHeight: number,
  align: "left" | "center" | "right",
) {
  const paragraphs = (text || "").split("\n");
  const lines: string[] = [];
  for (const para of paragraphs) {
    const words = para.split(/\s+/);
    let current = "";
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width > w && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    lines.push(current);
  }
  const step = fontSize * lineHeight;
  let y = Math.max(fontSize * 0.9, (h - lines.length * step) * 0.5 + fontSize * 0.85);
  if (lines.length * step > h * 0.85) {
    y = fontSize * 0.9;
  }
  ctx.textAlign = align;
  const x = align === "center" ? w / 2 : align === "right" ? w : 0;
  for (const line of lines) {
    if (y > h + fontSize) break;
    ctx.fillText(line, x, y, w);
    y += step;
  }
}

function paintElement(
  ctx: CanvasRenderingContext2D,
  el: AnyElement,
  onAsyncAsset?: () => void,
) {
  if (el.hidden) return;
  ctx.save();
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  ctx.translate(cx, cy);
  if (el.rotation) ctx.rotate((el.rotation * Math.PI) / 180);
  ctx.translate(-el.width / 2, -el.height / 2);

  const opacity = "opacity" in el && typeof el.opacity === "number" ? el.opacity : 1;
  ctx.globalAlpha = Math.max(0, Math.min(1, opacity));

  if (el.type === "shape") {
    const fillStyle = el.gradient
      ? (() => {
          const rad = ((el.gradient.angle - 90) * Math.PI) / 180;
          const r = Math.hypot(el.width, el.height) / 2;
          const g = ctx.createLinearGradient(
            el.width / 2 - Math.cos(rad) * r,
            el.height / 2 - Math.sin(rad) * r,
            el.width / 2 + Math.cos(rad) * r,
            el.height / 2 + Math.sin(rad) * r,
          );
          g.addColorStop(0, el.gradient.from);
          g.addColorStop(1, el.gradient.to);
          return g;
        })()
      : el.fill || "#2563eb";

    const d = pathFor(el.shape);
    if (d && typeof Path2D !== "undefined") {
      const strokeOnly = STROKE_ONLY_SHAPES.includes(el.shape);
      const evenOdd = EVENODD_SHAPES.includes(el.shape);
      ctx.save();
      ctx.scale(el.width / 100, el.height / 100);
      const path = new Path2D(d);
      if (!strokeOnly && el.fill !== "transparent") {
        ctx.fillStyle = fillStyle;
        ctx.fill(path, evenOdd ? "evenodd" : "nonzero");
      }
      const effectiveStroke =
        strokeOnly && (!el.stroke || el.stroke === "transparent" || el.strokeWidth <= 0)
          ? fillStyle
          : el.stroke;
      const effectiveStrokeWidth =
        strokeOnly && (el.strokeWidth <= 0 || !el.stroke || el.stroke === "transparent")
          ? 8
          : el.strokeWidth;
      if (effectiveStrokeWidth > 0 && effectiveStroke && effectiveStroke !== "transparent") {
        ctx.strokeStyle = effectiveStroke;
        ctx.lineCap = strokeOnly ? "round" : "butt";
        ctx.lineJoin = strokeOnly ? "round" : "miter";
        ctx.lineWidth = effectiveStrokeWidth / Math.max(0.01, Math.min(el.width, el.height) / 100);
        ctx.stroke(path);
      }
      ctx.restore();
    } else if (el.shape === "circle") {
      ctx.beginPath();
      ctx.ellipse(el.width / 2, el.height / 2, el.width / 2, el.height / 2, 0, 0, Math.PI * 2);
      if (el.fill !== "transparent") {
        ctx.fillStyle = fillStyle;
        ctx.fill();
      }
      if (el.strokeWidth > 0 && el.stroke) {
        ctx.strokeStyle = el.stroke;
        ctx.lineWidth = el.strokeWidth;
        ctx.stroke();
      }
    } else {
      drawRoundedRectPath(ctx, 0, 0, el.width, el.height, el.cornerRadius ?? 0);
      if (el.fill !== "transparent") {
        ctx.fillStyle = fillStyle;
        ctx.fill();
      }
      if (el.strokeWidth > 0 && el.stroke) {
        ctx.strokeStyle = el.stroke;
        ctx.lineWidth = el.strokeWidth;
        ctx.stroke();
      }
    }
  } else if (el.type === "text") {
    const fontWeight = el.fontWeight || 500;
    const fontFamily = el.fontFamily || "Manrope, sans-serif";
    const fontSize = el.fontSize || 42;
    ctx.font = `${el.italic ? "italic " : ""}${fontWeight} ${fontSize}px ${fontFamily}`;
    if (el.gradient) {
      const grad = ctx.createLinearGradient(0, 0, el.width, el.height);
      grad.addColorStop(0, el.gradient.from);
      grad.addColorStop(1, el.gradient.to);
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = el.color || "#0f172a";
    }
    const text =
      el.textTransform === "uppercase"
        ? el.text.toUpperCase()
        : el.textTransform === "lowercase"
          ? el.text.toLowerCase()
          : el.text;
    drawWrappedText(ctx, text, el.width, el.height, fontSize, el.lineHeight ?? 1.2, el.align ?? "left");
  } else if (el.type === "image") {
    const img = getCachedImage(el.src, onAsyncAsset);
    drawRoundedRectPath(ctx, 0, 0, el.width, el.height, el.cornerRadius ?? 0);
    ctx.save();
    ctx.clip();
    if (img) {
      const iw = img.naturalWidth || el.width;
      const ih = img.naturalHeight || el.height;
      const fit = el.fit ?? "cover";
      if (fit === "fill") {
        ctx.drawImage(img, 0, 0, el.width, el.height);
      } else {
        const s = fit === "contain" ? Math.min(el.width / iw, el.height / ih) : Math.max(el.width / iw, el.height / ih);
        const dw = iw * s;
        const dh = ih * s;
        ctx.drawImage(img, (el.width - dw) / 2, (el.height - dh) / 2, dw, dh);
      }
    } else {
      ctx.fillStyle = "rgba(148, 163, 184, 0.25)";
      ctx.fillRect(0, 0, el.width, el.height);
    }
    ctx.restore();
  } else if (el.type === "button") {
    drawRoundedRectPath(ctx, 0, 0, el.width, el.height, el.cornerRadius ?? 14);
    ctx.fillStyle = el.bgColor || "#2563eb";
    ctx.fill();
    if (el.borderWidth > 0 && el.borderColor) {
      ctx.strokeStyle = el.borderColor;
      ctx.lineWidth = el.borderWidth;
      ctx.stroke();
    }
    ctx.fillStyle = el.fgColor || "#ffffff";
    ctx.font = `${el.fontWeight || 600} ${el.fontSize || 24}px ${el.fontFamily || "Manrope, sans-serif"}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(el.text || "Action", el.width / 2, el.height / 2, Math.max(20, el.width - 24));
  } else {
    drawRoundedRectPath(ctx, 0, 0, el.width, el.height, 18);
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.fill();
    ctx.strokeStyle = "rgba(148, 163, 184, 0.45)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#334155";
    ctx.font = `600 ${Math.max(18, Math.round(Math.min(el.width, el.height) * 0.14))}px Manrope, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(el.type.toUpperCase(), el.width / 2, el.height / 2);
  }

  ctx.restore();
}

export function renderSlideToCanvas(
  page: Page | undefined,
  canvasW: number,
  canvasH: number,
  targetW = 1024,
  targetH = Math.max(256, Math.round((targetW * canvasH) / Math.max(1, canvasW))),
  onAsyncAsset?: () => void,
  existingCanvas?: HTMLCanvasElement,
): HTMLCanvasElement {
  const canvas = existingCanvas ?? document.createElement("canvas");
  if (canvas.width !== targetW) canvas.width = targetW;
  if (canvas.height !== targetH) canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.save();
  ctx.clearRect(0, 0, targetW, targetH);
  const sx = targetW / Math.max(1, canvasW);
  const sy = targetH / Math.max(1, canvasH);
  ctx.scale(sx, sy);

  paintBackground(ctx, canvasW, canvasH, page?.bgColor, page?.bgImage, page?.bgFit, onAsyncAsset);
  if (page?.elements?.length) {
    for (const el of page.elements) {
      paintElement(ctx, el, onAsyncAsset);
    }
  }
  ctx.restore();
  return canvas;
}

export function renderMiniPreviewSlide(
  variant: "outgoing" | "incoming",
  targetW = 512,
  targetH = 288,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  if (variant === "outgoing") {
    const g = ctx.createLinearGradient(0, 0, targetW, targetH);
    g.addColorStop(0, "#f8fafc");
    g.addColorStop(1, "#e2e8f0");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, targetW, targetH);

    drawRoundedRectPath(ctx, 38, 42, 74, 74, 18);
    ctx.fillStyle = "#94a3b8";
    ctx.fill();

    drawRoundedRectPath(ctx, 38, 138, 280, 22, 11);
    ctx.fillStyle = "#64748b";
    ctx.fill();

    drawRoundedRectPath(ctx, 38, 178, 195, 16, 8);
    ctx.fillStyle = "#cbd5e1";
    ctx.fill();
  } else {
    const g = ctx.createLinearGradient(0, 0, targetW, targetH);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(1, "#eff6ff");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, targetW, targetH);

    drawRoundedRectPath(ctx, 38, 42, 76, 76, 18);
    ctx.fillStyle = "#2563eb";
    ctx.fill();

    drawRoundedRectPath(ctx, 38, 138, 310, 24, 12);
    ctx.fillStyle = "#0f172a";
    ctx.fill();

    drawRoundedRectPath(ctx, 38, 180, 210, 16, 8);
    ctx.fillStyle = "#93c5fd";
    ctx.fill();
  }
  return canvas;
}
