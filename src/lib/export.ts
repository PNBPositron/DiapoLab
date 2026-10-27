import { toJpeg, toPng } from "html-to-image";
import { useEditor, type Page } from "@/store/editor";
import { ensureFontsForPages } from "@/lib/fontLoader";

export function exportJSON(name: string) {
  const { pages, canvasW, canvasH, designName } = useEditor.getState();
  const payload = {
    type: "positron.design",
    version: 1,
    name: designName,
    canvas_w: canvasW,
    canvas_h: canvasH,
    pages,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name || "positron"}-${Date.now()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function importJSONFile(file: File): Promise<void> {
  const txt = await file.text();
  const data = JSON.parse(txt) as {
    type?: string;
    name?: string;
    canvas_w?: number;
    canvas_h?: number;
    pages?: Page[];
  };
  if (!data || !Array.isArray(data.pages) || data.pages.length === 0) {
    throw new Error("Invalid design file");
  }
  const s = useEditor.getState();
  if (data.canvas_w && data.canvas_h) s.setCanvasSize(data.canvas_w, data.canvas_h);
  s.loadPages(data.pages);
  if (data.name) s.setDesignName(data.name);
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Extract the first & last color of a CSS gradient string (null if not a gradient). */
function gradientColors(css: string): [string, string] | null {
  if (!css.includes("gradient(")) return null;
  const colors = css.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\)/g);
  if (!colors || colors.length === 0) return null;
  return [colors[0], colors[colors.length - 1]];
}

/** Best solid color representing a page background (used as raster base). */
function solidFallback(bgColor: string | undefined): string {
  const bg = bgColor?.trim();
  if (!bg) return "#ffffff";
  return gradientColors(bg)?.[0] ?? bg;
}

/** Paint the page background under a captured slide image.
 *  html-to-image has known fidelity gaps (backgrounds/fonts can be dropped in
 *  the SVG foreignObject pass); compositing on a 2D canvas guarantees the
 *  background always renders in exported PNG/JPEG/PDF. */
async function compositeWithBackground(
  dataUrl: string,
  bgColor: string | undefined,
  width: number,
  height: number,
  pixelRatio: number,
  format: "png" | "jpeg",
  quality = JPEG_QUALITY,
): Promise<string> {
  try {
    const img = await loadImage(dataUrl);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    const bg = bgColor?.trim() ? bgColor : "#ffffff";
    const pair = gradientColors(bg);
    if (pair) {
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, pair[0]);
      grad.addColorStop(1, pair[1]);
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = bg;
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return format === "jpeg"
      ? canvas.toDataURL("image/jpeg", quality)
      : canvas.toDataURL("image/png");
  } catch {
    return dataUrl;
  }
}

/** Convert any CSS color to an RGB hex string (no leading #) for PPTX export. */
function cssColorToHex(color: string): string {
  const s = color.trim();
  if (/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(s)) return s.slice(1, 7);
  if (/^#[0-9a-fA-F]{3}$/.test(s)) {
    return s.slice(1).split("").map((ch) => ch + ch).join("");
  }
  try {
    const probe = document.createElement("i");
    probe.style.display = "none";
    probe.style.color = s;
    document.body.appendChild(probe);
    const computed = getComputedStyle(probe).color;
    probe.remove();
    const m = computed.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
    if (m) {
      return [1, 2, 3].map((i) => Number(m[i]).toString(16).padStart(2, "0")).join("");
    }
  } catch {
    /* ignore */
  }
  const hex = s.match(/#[0-9a-fA-F]{6}/);
  return hex ? hex[0].slice(1) : "FFFFFF";
}

const JPEG_QUALITY = 0.96;
const EXPORT_PIXEL_RATIO = 2.5;

async function waitForExportReady() {
  if (document.fonts?.ready) await document.fonts.ready;
  const images = Array.from(document.querySelectorAll<HTMLImageElement>("#canvas-export img"));
  await Promise.all(
    images.map(async (image) => {
      if (!image.complete) {
        await new Promise<void>((resolve) => {
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        });
      }
      await image.decode?.().catch(() => undefined);
    }),
  );
  await wait(80);
}

async function captureAllPages(format: "png" | "jpeg" = "png"): Promise<string[]> {
  const { pages, currentIndex, setCurrentPage, canvasW, canvasH, select } = useEditor.getState();
  select(null);
  await ensureFontsForPages(pages.map((page) => ({ elements: page.elements.filter((element): element is Extract<typeof element, { fontFamily?: string }> => "fontFamily" in element) })));
  const original = currentIndex;
  const shots: string[] = [];
  for (let i = 0; i < pages.length; i++) {
    setCurrentPage(i);
    // Wait for React paint, fonts, and remote image assets before capturing.
    await wait(120);
    await waitForExportReady();
    const node = document.getElementById("canvas-export");
    if (!node) continue;
    node.dataset.exporting = "true";
    const options = {
      width: canvasW,
      height: canvasH,
      pixelRatio: EXPORT_PIXEL_RATIO,
      style: { transform: "none", left: "0", top: "0", margin: "0" },
    };
    // JPEG has no alpha channel, so give it a white base for any transparent areas.
    const pageBg = pages[i].bgColor;
    const raw =
      format === "jpeg"
        ? await toJpeg(node, { ...options, quality: JPEG_QUALITY, backgroundColor: solidFallback(pageBg) })
        : await toPng(node, options);
    delete node.dataset.exporting;
    // Safety net: repaint the page background under the capture (solid or
    // gradient) so it can never be lost by the DOM capture.
    shots.push(await compositeWithBackground(raw, pageBg, canvasW, canvasH, EXPORT_PIXEL_RATIO, format));
  }
  setCurrentPage(original);
  return shots;
}

export async function exportJPG(name: string) {
  const { canvasW, canvasH } = useEditor.getState();
  useEditor.getState().select(null);
  await wait(120);
  await waitForExportReady();
  const node = document.getElementById("canvas-export");
  if (!node) return;
  node.dataset.exporting = "true";
  const st = useEditor.getState();
  const pageBg = st.pages[st.currentIndex]?.bgColor;
  const raw = await toJpeg(node, {
    width: canvasW,
    height: canvasH,
    pixelRatio: EXPORT_PIXEL_RATIO,
    cacheBust: true,
    quality: JPEG_QUALITY,
    backgroundColor: solidFallback(pageBg),
    style: { transform: "none", left: "0", top: "0", margin: "0", border: "0" },
  });
  delete node.dataset.exporting;
  const dataUrl = await compositeWithBackground(raw, pageBg, canvasW, canvasH, EXPORT_PIXEL_RATIO, "jpeg");
  const link = document.createElement("a");
  link.download = `${name || "positron"}-${Date.now()}.jpg`;
  link.href = dataUrl;
  link.click();
}

export async function exportPNG(name: string) {
  const { canvasW, canvasH } = useEditor.getState();
  useEditor.getState().select(null);
  await wait(80);
  await waitForExportReady();
  const node = document.getElementById("canvas-export");
  if (!node) return;
  node.dataset.exporting = "true";
  const st = useEditor.getState();
  const pageBg = st.pages[st.currentIndex]?.bgColor;
  const raw = await toPng(node, {
    width: canvasW,
    height: canvasH,
    pixelRatio: EXPORT_PIXEL_RATIO,
    cacheBust: true,
    backgroundColor: solidFallback(pageBg),
    style: { transform: "none", left: "0", top: "0", margin: "0", border: "0" },
  });
  delete node.dataset.exporting;
  const dataUrl = await compositeWithBackground(raw, pageBg, canvasW, canvasH, EXPORT_PIXEL_RATIO, "png");
  const link = document.createElement("a");
  link.download = `${name || "positron"}-${Date.now()}.png`;
  link.href = dataUrl;
  link.click();
}

export async function exportPDF(name: string) {
  const { canvasW, canvasH } = useEditor.getState();
  const shots = await captureAllPages("jpeg");
  if (shots.length === 0) return;
  const { jsPDF } = await import("jspdf");
  const orientation = canvasW >= canvasH ? "landscape" : "portrait";
  const pdf = new jsPDF({ orientation, unit: "px", format: [canvasW, canvasH] });
  shots.forEach((src, i) => {
    if (i > 0) pdf.addPage([canvasW, canvasH], orientation);
    pdf.addImage(src, "JPEG", 0, 0, canvasW, canvasH, undefined, "FAST");
  });
  pdf.save(`${name || "positron"}-${Date.now()}.pdf`);
}


export async function exportPPTX(name: string) {
  const { pages, canvasW, canvasH } = useEditor.getState();
  if (pages.length === 0) return;
  const pptxModule = await import("pptxgenjs");
  const PptxGenJS = pptxModule.default;
  const pptx = new PptxGenJS();
  // The browser bundle exposes shape types on the presentation instance.
  // Falling back to the documented string keeps exports compatible across versions.
  const rectangleShape =
    (pptx as { ShapeType?: { rect?: string } }).ShapeType?.rect ?? "rect";
  const wIn = canvasW / 96;
  const hIn = canvasH / 96;
  const px = (value: number) => value / 96;
  pptx.defineLayout({ name: "POS", width: wIn, height: hIn });
  pptx.layout = "POS";
  for (const page of pages) {
    const slide = pptx.addSlide();
    const bgBase = gradientColors(page.bgColor ?? "")?.[0] ?? page.bgColor ?? "";
    slide.background = { color: cssColorToHex(bgBase) || "FFFFFF" };
    for (const element of page.elements) {
      const box = {
        x: px(element.x),
        y: px(element.y),
        w: px(element.width),
        h: px(element.height),
      };
      if (element.type === "text") {
        slide.addText(element.text, {
          ...box,
          fontFace: element.fontFamily || "Arial",
          fontSize: Math.max(6, element.fontSize * 0.75),
          bold: element.fontWeight >= 600,
          italic: element.italic,
          color: element.color.replace("#", ""),
          align: element.align,
          breakLine: false,
          margin: 0,
          fit: "shrink",
          valign: "middle",
          rotate: element.rotation,
        });
      } else if (element.type === "shape") {
        slide.addShape(rectangleShape as never, {
          ...box,
          fill: { color: element.fill.replace("#", "") },
          line: {
            color: element.stroke.replace("#", ""),
            width: Math.max(0.5, element.strokeWidth / 2),
          },
          rotate: element.rotation,
        });
      } else if ((element.type === "image" || element.type === "video") && element.src) {
        // PPTX supports still images natively; videos are retained as a poster/frame when possible.
        slide.addImage({ data: element.src, ...box, transparency: 0, rotate: element.rotation });
      } else if (element.type === "embed" && element.src) {
        // iframes can't live inside PPTX — keep a clickable placeholder card.
        slide.addText(element.title || "Web embed", {
          ...box,
          align: "center",
          valign: "middle",
          fontSize: 16,
          bold: true,
          color: "FFFFFF",
          fill: { color: "1D2939" },
          line: { color: "94A3B8", width: 1 },
          hyperlink: { url: element.src, tooltip: element.src },
          rotate: element.rotation,
        });
      }
    }
  }
  await pptx.writeFile({ fileName: `${name || "positron"}-${Date.now()}.pptx` });
}

export function exportMarkdown(name: string) {
  const { pages, designName } = useEditor.getState();
  const lines = [`# ${designName || name || "DiapoLab presentation"}`, ""];
  pages.forEach((page, index) => {
    lines.push(`## Slide ${index + 1}`, "");
    page.elements.forEach((element) => {
      if (element.type === "text") lines.push(element.text, "");
    });
  });
  const blob = new Blob([lines.join("\\n")], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name || "positron"}-${Date.now()}.md`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function exportGIF(
  name: string,
  onProgress?: (msg: string) => void,
): Promise<{ ext: "gif" }> {
  const { GIFEncoder, quantize, applyPalette } = await import("gifenc");
  const state = useEditor.getState();
  const { pages, canvasW, canvasH } = state;
  if (pages.length === 0) throw new Error("No pages");

  onProgress?.("rendering pages…");
  const shots = await captureAllPages();
  if (shots.length === 0) throw new Error("Capture failed");

  onProgress?.("loading frames…");
  const images = await Promise.all(shots.map(loadImage));

  const MAX = 1280;
  const scale = Math.min(1, MAX / Math.max(canvasW, canvasH));
  const W = Math.round(canvasW * scale);
  const H = Math.round(canvasH * scale);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D unavailable");

  const enc = GIFEncoder();
  for (let i = 0; i < images.length; i++) {
    onProgress?.(`encoding ${i + 1}/${images.length}…`);
    ctx.fillStyle = pages[i].bgColor;
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(images[i], 0, 0, W, H);
    const { data } = ctx.getImageData(0, 0, W, H);
    const palette = quantize(data, 256, { format: "rgb565", oneBitAlpha: false });
    const index = applyPalette(data, palette, "rgb565");
    enc.writeFrame(index, W, H, {
      palette,
      delay: Math.max(200, Math.round((pages[i].duration || 3) * 1000)),
    });
    await new Promise((r) => setTimeout(r, 0));
  }
  enc.finish();

  onProgress?.("saving…");
  const bytes = enc.bytes();
  const buf = new Uint8Array(bytes.length);
  buf.set(bytes);
  const blob = new Blob([buf.buffer as ArrayBuffer], { type: "image/gif" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name || "positron"}-${Date.now()}.gif`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return { ext: "gif" };
}
