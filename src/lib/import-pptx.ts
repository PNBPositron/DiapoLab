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

async function parseXml(zip: JSZip, path: string): Promise<Document | null> {
  const entry = zip.file(path);
  if (!entry) return null;
  const xml = await entry.async("string");
  return new DOMParser().parseFromString(xml, "application/xml");
}

function attrColor(el: Element | null): string | undefined {
  if (!el) return undefined;
  const srgb = firstChildByLocal(el, "srgbClr");
  const val = srgb?.getAttribute("val");
  return val ? `#${val}` : undefined;
}

type Xfrm = { x: number; y: number; width: number; height: number; rotation: number };

function parseXfrm(sp: Element): Partial<Xfrm> {
  const xfrm = firstChildByLocal(sp, "xfrm");
  if (!xfrm) return {};
  const off = firstChildByLocal(xfrm, "off");
  const ext = firstChildByLocal(xfrm, "ext");
  const x = px(off?.getAttribute("x"));
  const y = px(off?.getAttribute("y"));
  const width = px(ext?.getAttribute("cx"));
  const height = px(ext?.getAttribute("cy"));
  const rotation = Number(xfrm.getAttribute("rot") ?? 0) / 60000;
  return { x, y, width: width || 200, height: height || 60, rotation };
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

/* Map PowerPoint preset geometries (prstGeom) onto DiapoLab shape kinds.
   Unmapped presets fall back to a plain rect so no shape silently vanishes. */
const PRST_TO_KIND: Record<string, string> = {
  rect: "rect", roundRect: "rect", round1Rect: "rect", round2SameRect: "rect", round2DiagRect: "rect",
  snip1Rect: "rect", snip2SameRect: "rect", snip2DiagRect: "rect", snipRoundRect: "rect",
  flowChartProcess: "rect", flowChartAlternateProcess: "rect", flowChartTerminator: "rect",
  ellipse: "circle", pie: "circle", triangle: "triangle", rtTriangle: "triangle",
  diamond: "diamond", pentagon: "pentagon", hexagon: "hexagon", octagon: "octagon",
  star4: "star", star5: "star", star6: "star", star8: "star", star10: "star",
  star12: "star", star16: "star", star24: "star", star32: "star",
  trapezoid: "trapezoid", flowChartManualInput: "trapezoid",
  parallelogram: "parallelogram", chevron: "chevron",
  plus: "cross", flowChartDecision: "diamond", flowChartCollate: "diamond",
  heart: "heart", cloud: "cloud", lightningBolt: "lightning", moon: "moon",
  donut: "ring", blockArc: "ring", chord: "semicircle",
  rightArrow: "arrow", leftArrow: "arrow", upArrow: "arrow", downArrow: "arrow",
};

function parseShapeKind(sp: Element): string | null {
  const geom = firstChildByLocal(sp, "prstGeom");
  const prst = geom?.getAttribute("prst");
  if (!prst) return null;
  return PRST_TO_KIND[prst] ?? "rect";
}

/** cornerRadius (px) for a roundRect from its adjustment value. */
function roundRectRadius(sp: Element, box: Partial<Xfrm>): number | undefined {
  const geom = firstChildByLocal(sp, "prstGeom");
  if (geom?.getAttribute("prst") !== "roundRect") return undefined;
  const gd = Array.from(geom.getElementsByTagName("*")).find((e) => e.localName === "gd");
  const m = gd?.getAttribute("fmla")?.match(/val\s+(\d+)/);
  const pct = m ? Number(m[1]) / 100000 : 1 / 6;
  const min = Math.min(box.width ?? 100, box.height ?? 60);
  return Math.round(min * Math.min(pct, 0.5));
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

async function parseRels(zip: JSZip, partPath: string): Promise<Map<string, string>> {
  const slash = partPath.lastIndexOf("/");
  const relPath = partPath.slice(0, slash + 1) + "_rels/" + partPath.slice(slash + 1) + ".rels";
  const doc = await parseXml(zip, relPath);
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

/* Office theme scheme colors → sRGB fallbacks. */
const SCHEME_COLORS: Record<string, string> = {
  dk1: "#000000", lt1: "#ffffff", dk2: "#44546a", lt2: "#e7e6e6",
  tx1: "#000000", tx2: "#44546a", bg1: "#ffffff", bg2: "#e7e6e6",
  accent1: "#4472c4", accent2: "#ed7d31", accent3: "#a5a5a5",
  accent4: "#ffc000", accent5: "#5b9bd5", accent6: "#70ad47",
  hlink: "#0563c1", folHlink: "#954f72",
};

/** Read a color from a fill element (srgbClr or schemeClr), or undefined. */
function colorFrom(fill: Element | null | undefined): string | undefined {
  if (!fill) return undefined;
  for (const child of Array.from(fill.getElementsByTagName("*"))) {
    if (child.localName === "srgbClr") {
      const v = child.getAttribute("val");
      if (v) return "#" + v;
    }
    if (child.localName === "schemeClr") {
      const v = child.getAttribute("val");
      if (v && SCHEME_COLORS[v]) return SCHEME_COLORS[v];
    }
  }
  return undefined;
}

type SlideBg = { color: string; image?: string };

/** Parse a <p:bg> element: solidFill color or blipFill image relationship id. */
function parseBgElement(doc: Document): { color?: string; imageRid?: string } | null {
  const bg = Array.from(doc.getElementsByTagName("*")).find((el) => el.localName === "bg");
  if (!bg) return null;
  const bgPr = Array.from(bg.getElementsByTagName("*")).find((el) => el.localName === "bgPr");
  const root = bgPr ?? bg;
  const solid = Array.from(root.getElementsByTagName("*")).find((el) => el.localName === "solidFill");
  const color = colorFrom(solid ?? null);
  if (color) return { color };
  const blip = Array.from(root.getElementsByTagName("*")).find((el) => el.localName === "blip");
  const imageRid = blip?.getAttribute("r:embed") ?? undefined;
  if (imageRid) return { imageRid };
  return null;
}

/** Resolve a slide's background: slide → layout → slideMaster inheritance. */
async function resolveSlideBg(
  zip: JSZip,
  slideDoc: Document,
  rels: Map<string, string>,
  cache: Map<string, SlideBg>,
): Promise<SlideBg> {
  // 1) explicit slide background (solid or image)
  const own = parseBgElement(slideDoc);
  if (own?.color) return { color: own.color };
  if (own?.imageRid) {
    const image = await mediaToDataUrl(zip, own.imageRid, rels);
    if (image) return { color: "#ffffff", image };
  }
  // 2) inherited from the slide layout, then the slide master
  const layoutTarget = Array.from(rels.values()).find((t) => /slideLayouts\/[^/]+\.xml$/.test(t));
  if (!layoutTarget) return { color: "#ffffff" };
  const layoutPath = "ppt/" + layoutTarget.replace(/^(\.\.\/)+/, "").replace(/^\//, "");
  if (cache.has(layoutPath)) return cache.get(layoutPath)!;
  let resolved: SlideBg = { color: "#ffffff" };
  const layoutDoc = await parseXml(zip, layoutPath);
  const layoutBg = layoutDoc ? parseBgElement(layoutDoc) : null;
  if (layoutBg?.color) {
    resolved = { color: layoutBg.color };
  } else {
    const layoutRels = await parseRels(zip, layoutPath);
    const masterTarget = Array.from(layoutRels.values()).find((t) => /slideMasters\/[^/]+\.xml$/.test(t));
    if (masterTarget) {
      const masterPath = "ppt/" + masterTarget.replace(/^(\.\.\/)+/, "").replace(/^\//, "");
      const masterDoc = await parseXml(zip, masterPath);
      const masterBg = masterDoc ? parseBgElement(masterDoc) : null;
      if (masterBg?.color) resolved = { color: masterBg.color };
    }
  }
  cache.set(layoutPath, resolved);
  return resolved;
}

export async function importPPTXFile(file: File): Promise<void> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());

  // Slide size
  const presDoc = await parseXml(zip, "ppt/presentation.xml");
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
  const presRels = await parseRels(zip, "ppt/presentation.xml");
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
  const bgCache = new Map<string, SlideBg>();
  for (const slidePath of slideFiles) {
    const doc = await parseXml(zip, slidePath);
    if (!doc) continue;
    const rels = await parseRels(zip, slidePath);
    const elements: AnyElement[] = [];

    // spTree holds sp (text/shape) and pic (picture) nodes
    const spTree = Array.from(doc.getElementsByTagName("*")).find(
      (el) => el.localName === "spTree",
    );
    const nodes = spTree
      ? Array.from(spTree.getElementsByTagName("*")).filter(
          (el) => el.localName === "sp" || el.localName === "pic" || el.localName === "cxnSp" || el.localName === "graphicFrame",
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
          const spPr = firstChildByLocal(node, "spPr");
          // Direct children only, so a line-only solidFill is not mistaken for the fill.
          const solid = spPr ? Array.from(spPr.children).find((e) => e.localName === "solidFill") ?? null : null;
          const ln = spPr ? Array.from(spPr.children).find((e) => e.localName === "ln") ?? null : null;
          const lnSolid = ln ? Array.from(ln.children).find((e) => e.localName === "solidFill") ?? null : null;
          const lnWpt = ln ? Number(ln.getAttribute("w") ?? 0) / 12700 : 0;
          const cornerRadius = roundRectRadius(node, box);
          elements.push(
            newShape(kind as never, {
              ...box,
              fill: colorFrom(solid) ?? "#e2e8f0",
              stroke: colorFrom(lnSolid) ?? "transparent",
              strokeWidth: lnWpt > 0 ? Math.max(1, Math.round(lnWpt * (96 / 72))) : 0,
              ...(cornerRadius ? { cornerRadius } : {}),
            }),
          );
        }
        continue;
      }
      if (node.localName === "cxnSp") {
        // Connector/line: approximate with a thin rect using the line color.
        const box = parseXfrm(node);
        if (box) {
          const ln = firstChildByLocal(node, "ln");
          const lnSolid = ln ? Array.from(ln.children).find((e) => e.localName === "solidFill") ?? null : null;
          const lnWpt = ln ? Number(ln.getAttribute("w") ?? 0) / 12700 : 2;
          const t = Math.max(2, Math.round((lnWpt || 2) * (96 / 72)));
          const horizontal = (box.width ?? 0) >= (box.height ?? 0);
          elements.push(
            newShape("rect", {
              ...box,
              ...(horizontal ? { height: t } : { width: t }),
              fill: colorFrom(lnSolid) ?? "#334155",
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

    // Real slide background: slide → layout → master inheritance chain.
    const bg = await resolveSlideBg(zip, doc, rels, bgCache);
    pages.push({
      id: Math.random().toString(36).slice(2, 10),
      elements,
      bgColor: bg.color,
      ...(bg.image ? { bgImage: bg.image } : {}),
      duration: 3,
    });
  }

  if (pages.length === 0) throw new Error("Could not read any slide from this PPTX");

  const s = useEditor.getState();
  s.setCanvasSize(canvasW, canvasH);
  s.loadPages(pages);
  s.setDesignName(file.name.replace(/\.pptx$/i, ""));
}
