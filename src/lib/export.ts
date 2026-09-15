import { toPng } from "html-to-image";
import { useEditor, type Page } from "@/store/editor";
import { stripEmbeddedImages } from "@/lib/image-assets";

export function exportJSON(name: string) {
  const { pages, canvasW, canvasH, designName } = useEditor.getState();
  const payload = {
    type: "positron.design",
    version: 1,
    name: designName,
    canvas_w: canvasW,
    canvas_h: canvasH,
    pages: stripEmbeddedImages(pages),
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

async function captureAllPages(): Promise<string[]> {
  const { pages, currentIndex, setCurrentPage, canvasW, canvasH, select } = useEditor.getState();
  select(null);
  const original = currentIndex;
  const shots: string[] = [];
  for (let i = 0; i < pages.length; i++) {
    setCurrentPage(i);
    // wait for React paint + scale fit
    await wait(120);
    const node = document.getElementById("canvas-export");
    if (!node) continue;
    node.dataset.exporting = "true";
    const dataUrl = await toPng(node, {

      width: canvasW,
      height: canvasH,
      pixelRatio: 2,
      style: { transform: "none", left: "0", top: "0", margin: "0" },
    });
    delete node.dataset.exporting;
    shots.push(dataUrl);
  }
  setCurrentPage(original);
  return shots;
}

export async function exportPNG(name: string) {
  const { canvasW, canvasH } = useEditor.getState();
  useEditor.getState().select(null);
  await wait(50);
  const node = document.getElementById("canvas-export");
  if (!node) return;
  node.dataset.exporting = "true";
  const dataUrl = await toPng(node, {
    width: canvasW,
    height: canvasH,
    pixelRatio: 2,
    style: { transform: "none", left: "0", top: "0", margin: "0" },
  });
  delete node.dataset.exporting;
  const link = document.createElement("a");
  link.download = `${name || "positron"}-${Date.now()}.png`;
  link.href = dataUrl;
  link.click();
}

export async function exportPDF(name: string) {
  const { canvasW, canvasH } = useEditor.getState();
  const shots = await captureAllPages();
  if (shots.length === 0) return;
  const { jsPDF } = await import("jspdf");
  const orientation = canvasW >= canvasH ? "landscape" : "portrait";
  const pdf = new jsPDF({ orientation, unit: "px", format: [canvasW, canvasH] });
  shots.forEach((src, i) => {
    if (i > 0) pdf.addPage([canvasW, canvasH], orientation);
    pdf.addImage(src, "PNG", 0, 0, canvasW, canvasH);
  });
  pdf.save(`${name || "positron"}-${Date.now()}.pdf`);
}

export async function exportPPTX(name: string) {
  const { canvasW, canvasH } = useEditor.getState();
  const shots = await captureAllPages();
  if (shots.length === 0) return;
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  // Slide size in inches at 96dpi
  const wIn = canvasW / 96;
  const hIn = canvasH / 96;
  pptx.defineLayout({ name: "POS", width: wIn, height: hIn });
  pptx.layout = "POS";
  shots.forEach((src) => {
    const slide = pptx.addSlide();
    slide.addImage({ data: src, x: 0, y: 0, w: wIn, h: hIn });
  });
  await pptx.writeFile({ fileName: `${name || "positron"}-${Date.now()}.pptx` });
}

export async function exportHTML(name: string) {
  const { pages, currentIndex, setCurrentPage, canvasW, canvasH, select } = useEditor.getState();
  select(null);
  const original = currentIndex;
  const sections: string[] = [];
  for (let i = 0; i < pages.length; i++) {
    setCurrentPage(i);
    await wait(140);
    const node = document.getElementById("canvas-export");
    if (!node) continue;
    const clone = node.cloneNode(true) as HTMLElement;
    // strip the editor scale transform so the export renders 1:1
    clone.style.transform = "none";
    clone.style.left = "0";
    clone.style.top = "0";
    clone.style.position = "relative";
    clone.style.margin = "0 auto";
    // remove selection outlines and resize handles (anything with cursor:move outline)
    clone.querySelectorAll<HTMLElement>("[style*='outline: rgb(43, 107, 255)']").forEach((el) => {
      el.style.outline = "none";
    });
    // Remove pink alignment guides if any captured
    clone.querySelectorAll<HTMLElement>(".pointer-events-none").forEach((el) => el.remove());
    sections.push(`<section class="page">${clone.outerHTML}</section>`);
  }
  setCurrentPage(original);
  if (sections.length === 0) return;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${(name || "positron").replace(/[<>&]/g, "")}</title>
<style>
  :root { color-scheme: light dark; }
  html, body { margin: 0; padding: 0; background: #111; font-family: system-ui, -apple-system, Segoe UI, sans-serif; }
  body { display: flex; flex-direction: column; align-items: center; gap: 32px; padding: 32px; }
  .page {
    width: ${canvasW}px;
    max-width: 100%;
    aspect-ratio: ${canvasW} / ${canvasH};
    box-shadow: 0 12px 40px rgba(0,0,0,0.45);
    background: #fff;
    overflow: hidden;
    position: relative;
  }
  .page > #canvas-export { width: 100% !important; height: 100% !important; }
  /* Responsive scale-down on small screens */
  @media (max-width: ${canvasW}px) {
    .page { width: 100%; }
    .page > #canvas-export {
      transform-origin: top left;
      transform: scale(calc(100vw / ${canvasW}));
      width: ${canvasW}px !important;
      height: ${canvasH}px !important;
    }
  }
</style>
</head>
<body>
${sections.join("\n")}
</body>
</html>`;

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
