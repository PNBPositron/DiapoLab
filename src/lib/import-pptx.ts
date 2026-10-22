import JSZip from "jszip";
import {
  useEditor,
  newText,
  newImage,
  newShape,
  type Page,
  type AnyElement,
} from "@/store/editor";

/* PPTX import: unzip the deck, read slide XML + embedded media, and map
   them onto DiapoLab pages. Handles text boxes, pictures, and basic shapes.
   EMU (English Metric Units) → px: 1 inch = 914400 EMU = 96 px. */

const EMU_PER_PX = 9525;
const px = (emu: string | undefined | null): number =>
  Math.round(Number(emu ?? 0) / EMU_PER_PX) || 0;

const ptToPx = (pt: number): number => Math.round(pt * (96 / 72));

const asXPath = (el: Element | Document, tag: string): string => {
  const prefix = el instanceof Element ? "" : "";
  return prefix + tag;
};

function children(node: Element | Document, local: string): Element[] {
  const doc = node instanceof Document ? node : node.ownerDocument;
  if (!doc) return [];
  return Array.from(
    doc.getElementsByTagName("*"),
  ).filter(
    (el) =>
      (el.localName === local.split(":").pop()) &&
      (node instanceof Document ? true : isDescendant(node, el)),
  );
}

function isDescendant(root: Element, el: Element): boolean {
  let cur: Node | null = el;
  while (cur) {
    if (cur === root) return true;
    cur = cur.parentNode;
  }
  return false;
}

function firstChildByLocal(root: Element, local: string): Element | null {
  for (const el of Array.from(root.getElementsByTagName("*"))) {
    if (el.localName === local) return el;
  }
  return null;
}

function parseXml(zip: JSZip, path: string): Document | null {
  const entry = zip.file(path);
  if (!entry) return null;
  const parser = new DOMParser();
  return parser.parseFromString(entry.async("string") as unknown as string, "application/xml");
}

function attrColor(el: Element | null): string | undefined {
  if (!el) return undefined;
  const srgb = firstChildByLocal(el, "srgbClr");
  const val = srgb?.getAttribute("val");
  return val ? `#${val}` : undefined;
}

type Xfrm = { x: number; y: number; width: number; height: number; rotation: number };

function parseXfrm(sp: Element): Xfrm | null {
  const xfrm = firstChildByLocal(sp, "xfrm");
  if (!xfrm) return null;
  const off = firstChildByLocal(xfrm, "off");
  const ext = firstChildByLocal(xfrm, "ext");
  const x = px(off?.getAttribute("x"));
  const y = px(off?.getAttribute("y"));
  const width = px(ext?.getAttribute("cx"));
  const height = px(ext?.getAttribute("cy"));
  if (!width && !height) return null;
  const rot = Number(xfrm.getAttribute("rot") ?? 0) / 60000;
  return { x, y, width: width || 200, height: height || 60, rotation: rot };
}

function parseTextBody(sp: Element): { text: string; fontSize: number; color: string; bold: boolean; align: "left" | "center" | "right"; } | null {
  const txBody = firstChildByLocal(sp, "txBody");
  if (!txBody) return null;
  const paragraphs = children(txBody, "p");
  const lines: string[] = [];
  let fontSize = 0;
  let color = "";
  let bold = false;
  let align: "left" | "center" | "right" = "left";
  for (const p of paragraphs) {
    const runs = children(p, "r");
    const lineParts: string[] = [];
    for (const r of runs) {
      const t = firstChildByLocal(r, "t");
      if (t?.textContent) lineParts.push(t.textContent);
      const rPr = firstChildByLocal(r, "rPr");
      if (rPr) {
        const sz = Number(rPr.getAttribute("sz") ?? 0) / 100;
        if (sz > fontSize) fontSize = sz;
        if (rPr.getAttribute("b") === "1") bold = true;
        const c = attrColor(rPr);
        if (c) color = c;
      }
    }
    lines.push(lineParts.join(""));
    const pPr = firstChildByLocal(p, "pPr");
    const algn = pPr?.getAttribute("algn");
    if (algn === "ctr") align = "center";
    else if (algn === "r") align = "right";
  }
  const text = lines.join("\n").trim();
  if (!text) return null;
  return {
    text,
    fontSize: fontSize > 0 ? ptToPx(fontSize) : 28,
    color: color || "#0f172a",
    bold,
    align,
  };
}

function parseShapeKind(sp: Element): "rect" | "circle" | null {
  const geom = firstChildByLocal(sp, "prstGeom");
  const prst = geom?.getAttribute("prst");
  if (!prst) return null;
  if (prst === "rect" || prst === "roundRect") return "rect";
  if (prst === "ellipse") return "circle";
  return null;
}

async function mediaToDataUrl(zip: JSZip, relId: string, rels: Map<string, string>): Promise<string | null> {
  const target = rels.get(relId);
  if (!target) return null;
  const path = target.startsWith("/") ? target.slice(1) : `ppt/${target.replace(/^\.\.\//, "")}`;
  const entry = zip.file(path);
  if (!entry) return null;
  const base64 = await entry.async("base64");
  const ext = path.split(".").pop()?.toLowerCase() ?? "png";
  const mime =
    ext === "png" ? "image/png" :
    ext === "jpg" || ext === "jpeg" ? "image/jpeg" :
    ext === "gif" ? "image/gif" :
    ext === "svg" ? "image/svg+xml" :
    ext === "webp" ? "image/webp" : "image/png";
  return `data:${mime};base64,${base64}`;
}

function parseRels(zip: JSZip, slidePath: string): Map<string, string> {
  const relPath = slidePath.replace("slides/", "slides/_rels/") + ".rels";
  const doc = parseXml(zip, relPath);
  const map = new Map<string, string>();
  if (!doc) return map;
  for (const rel of Array.from(doc.getElementsByTagName("*"))) {
    if (rel.localName !== "Relationship") continue;
    const id = rel.getAttribute("Id");
    const target = rel.getAttribute("Target");
    if (id && target) map.set(id, target);
  }
  return map;
}

export async function importPPTXFile(file: File): Promise<void> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());

  // Slide size
  const presDoc = parseXml(zip, "ppt/presentation.xml");
  if (!presDoc) throw new Error("Invalid PPTX: missing presentation.xml");
  let canvasW = 1920;
  let canvasH = 1080;
  const sldSz = Array.from(presDoc.getElementsByTagName("*")).find(
    (el) => el.localName === "sldSz",
  );
  if (sldSz) {
    canvasW = px(sldSz.getAttribute("cx")) || 1920;
    canvasH = px(sldSz.getAttribute("cy")) || 1080;
  }

  // Slide order from sldIdLst + presentation rels
  const presRels = parseRels(zip, "ppt/presentation.xml");
  const slideIds = Array.from(presDoc.getElementsByTagName("*")).filter(
    (el) => el.localName === "sldId",
  );
  const slideFiles: string[] = [];
  for (const id of slideIds) {
    const rid = id.getAttribute("r:id");
    const target = rid ? presRels.get(rid) : null;
    if (target) slideFiles.push(target.startsWith("/") ? target.slice(1) : `ppt/${target}`);
  }
  // Fallback: natural file order
  if (slideFiles.length === 0) {
    const all = Object.keys(zip.files)
      .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
      .sort((a, b) => {
        const na = Number(a.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
        const nb = Number(b.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
        return na - nb;
      });
    slideFiles.push(...all);
  }
  if (slideFiles.length === 0) throw new Error("No slides found in this PPTX");

  const pages: Page[] = [];
  for (const slidePath of slideFiles) {
    const doc = parseXml(zip, slidePath);
    if (!doc) continue;
    const rels = parseRels(zip, slidePath);
    const elements: AnyElement[] = [];

    // spTree holds sp (text/shape) and pic (picture) nodes
    const spTree = Array.from(doc.getElementsByTagName("*")).find(
      (el) => el.localName === "spTree",
    );
    const nodes = spTree
      ? Array.from(spTree.getElementsByTagName("*")).filter(
          (el) => el.localName === "sp" || el.localName === "pic" || el.localName === "graphicFrame",
        )
      : [];

    for (const node of nodes) {
      if (node.localName === "sp") {
        const box = parseXfrm(node);
        const body = parseTextBody(node);
        if (body) {
          elements.push(
            newText({
              ...(box ?? {}),
              text: body.text,
              fontSize: body.fontSize,
              color: body.color,
              fontWeight: body.bold ? 800 : 500,
              align: body.align,
            }),
          );
          continue;
        }
        const kind = parseShapeKind(node);
        if (kind && box) {
          const fillEl = firstChildByLocal(node, "spPr");
          const solid = fillEl ? Array.from(fillEl.getElementsByTagName("*")).find((e) => e.localName === "solidFill") : null;
          elements.push(
            newShape(kind, {
              ...box,
              fill: attrColor(solid) ?? "#e2e8f0",
              stroke: "transparent",
              strokeWidth: 0,
            }),
          );
        }
        continue;
      }
      if (node.localName === "pic") {
        const box = parseXfrm(node);
        const blip = Array.from(node.getElementsByTagName("*")).find((el) => el.localName === "blip");
        const rid = blip?.getAttribute("r:embed");
        if (!rid || !box) continue;
        const src = await mediaToDataUrl(zip, rid, rels);
        if (src) {
          elements.push(newImage(src, { ...box, fit: "contain" }));
        }
      }
      // graphicFrame (tables, charts) — not yet supported, skipped.
    }

    pages.push({
      id: Math.random().toString(36).slice(2, 10),
      elements,
      bgColor: "#ffffff",
      duration: 3,
    });
  }

  if (pages.length === 0) throw new Error("Could not read any slide from this PPTX");

  const s = useEditor.getState();
  s.setCanvasSize(canvasW, canvasH);
  s.loadPages(pages);
  s.setDesignName(file.name.replace(/\.pptx$/i, ""));
}
