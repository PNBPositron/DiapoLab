import { toJpeg, toPng } from "html-to-image";
import { useEditor, type Page } from "@/store/editor";
import { buildInteractiveHTML, buildPrintHTML } from "@/lib/export-html";

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

const JPEG_QUALITY = 0.96;
const EXPORT_PIXEL_RATIO = 2.5;

async function waitForExportReady() {
  if (document.fonts?.ready) await document.fonts.ready;
  const images = Array.from(document.querySelectorAll<HTMLImageElement>("#canvas-export img"));
  await Promise.all(images.map((image) => image.decode?.().catch(() => undefined)));
  await wait(80);
}

async function captureAllPages(format: "png" | "jpeg" = "png"): Promise<string[]> {
  const { pages, currentIndex, setCurrentPage, canvasW, canvasH, select } = useEditor.getState();
  select(null);
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
    const dataUrl =
      format === "jpeg"
        ? await toJpeg(node, { ...options, quality: JPEG_QUALITY, backgroundColor: "#ffffff" })
        : await toPng(node, options);
    delete node.dataset.exporting;
    shots.push(dataUrl);
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
  const dataUrl = await toJpeg(node, {
    width: canvasW,
    height: canvasH,
    pixelRatio: EXPORT_PIXEL_RATIO,
    cacheBust: true,
    quality: JPEG_QUALITY,
    backgroundColor: "#ffffff",
    style: { transform: "none", left: "0", top: "0", margin: "0", border: "0" },
  });
  delete node.dataset.exporting;
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
  const dataUrl = await toPng(node, {
    width: canvasW,
    height: canvasH,
    pixelRatio: EXPORT_PIXEL_RATIO,
    cacheBust: true,
    backgroundColor: "#ffffff00",
    style: { transform: "none", left: "0", top: "0", margin: "0", border: "0" },
  });
  delete node.dataset.exporting;
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

/**
 * Native print-to-PDF: renders all slides into a hidden iframe with print
 * CSS (@page size, one slide per page) and lets the browser compose the PDF.
 * Result: real vector text (selectable & searchable), real fonts, real CSS —
 * no rasterization. The user picks "Save as PDF" in the print dialog.
 */
export function exportPDFPrint(name: string) {
  const { pages, canvasW, canvasH } = useEditor.getState();
  if (pages.length === 0) return;
  const html = buildPrintHTML({ pages, canvasW, canvasH, name: name || "positron" });

  // Hidden iframe → let the browser compose the PDF natively.
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(iframe);

  const cleanup = () => setTimeout(() => iframe.remove(), 500);

  iframe.onload = async () => {
    const win = iframe.contentWindow;
    if (!win) return cleanup();
    // Give images and fonts a moment to load inside the iframe before printing.
    await new Promise((r) => setTimeout(r, 800));
    win.addEventListener("afterprint", () => {
      cleanup();
      document.body.style.overflow = "";
    });
    document.body.style.overflow = "hidden";
    win.focus();
    win.print();
  };

  const doc = iframe.contentDocument;
  if (!doc) return cleanup();
  doc.open();
  doc.write(html);
  doc.close();
}

export async function exportPPTX(name: string) {
  const { pages, canvasW, canvasH } = useEditor.getState();
  if (pages.length === 0) return;
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  const wIn = canvasW / 96;
  const hIn = canvasH / 96;
  const px = (value: number) => value / 96;
  pptx.defineLayout({ name: "POS", width: wIn, height: hIn });
  pptx.layout = "POS";
  for (const page of pages) {
    const slide = pptx.addSlide();
    slide.background = { color: page.bgColor?.replace("#", "") || "FFFFFF" };
    for (const element of page.elements) {
      const box = { x: px(element.x), y: px(element.y), w: px(element.width), h: px(element.height) };
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
          valign: "mid",
          rotate: element.rotation,
        });
      } else if (element.type === "shape") {
        slide.addShape(PptxGenJS.ShapeType.rect, {
          ...box,
          fill: { color: element.fill.replace("#", "") },
          line: { color: element.stroke.replace("#", ""), width: Math.max(0.5, element.strokeWidth / 2) },
          rotate: element.rotation,
        });
      } else if ((element.type === "image" || element.type === "video") && element.src) {
        // PPTX supports still images natively; videos are retained as a poster/frame when possible.
        slide.addImage({ data: element.src, ...box, transparency: 0, rotate: element.rotation });
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

export function exportHTML(name: string) {
  const { pages, canvasW, canvasH } = useEditor.getState();
  if (pages.length === 0) return;
  // Build a fully interactive, standalone HTML presentation from the
  // design data (real DOM elements, navigation, links, quizzes).
  const html = buildInteractiveHTML({ pages, canvasW, canvasH, name: name || "positron" });
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name || "positron"}-${Date.now()}.html`;
  a.click();
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
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    enc.writeFrame(index, W, H, { palette, delay: Math.max(200, Math.round((pages[i].duration || 3) * 1000)) });
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
