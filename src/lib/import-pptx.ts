import JSZip from "jszip";
import {
  useEditor,
  newText,
  newImage,
  newShape,
  newTable,
  type TableElement,
  type Page,
  type AnyElement,
  type ElementAnimation,
  type SlideTransition,
} from "@/store/editor";
import { useSettings } from "@/store/settings";
import type { ThemeTokens } from "@/lib/themes";

/* PPTX import: unzip the deck, read slide XML + embedded media, and map
   them onto DiapoLab pages. Handles text boxes, pictures, basic shapes, groups (flattened), tables and speaker notes.
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

function parseTextBody(sp: Element): { text: string; fontSize: number; color: string; bold: boolean; italic: boolean; underline: boolean; align: "left" | "center" | "right"; } | null {
  const txBody = firstChildByLocal(sp, "txBody");
  if (!txBody) return null;
  const paragraphs = children(txBody, "p");
  const lines: string[] = [];
  let fontSize = 0;
  let color = "";
  let bold = false;
  let italic = false;
  let underline = false;
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
        if (rPr.getAttribute("i") === "1") italic = true;
        if (rPr.getAttribute("u") === "sng") underline = true;
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
    italic,
    underline,
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

/* ---- Groups (grpSp): flatten nested groups with a translate+scale ---- */

type GroupXf = { x: number; y: number; sx: number; sy: number };
const IDENTITY_XF: GroupXf = { x: 0, y: 0, sx: 1, sy: 1 };

/** A group maps its child coordinate space (chOff/chExt) onto the slide
 *  (off/ext) — return the translate+scale converting child px to slide px. */
function parseGroupXf(grp: Element): GroupXf {
  const xfrm = firstChildByLocal(grp, "xfrm");
  if (!xfrm) return IDENTITY_XF;
  const off = firstChildByLocal(xfrm, "off");
  const ext = firstChildByLocal(xfrm, "ext");
  const chOff = firstChildByLocal(xfrm, "chOff");
  const chExt = firstChildByLocal(xfrm, "chExt");
  const ox = px(off?.getAttribute("x"));
  const oy = px(off?.getAttribute("y"));
  const cw = px(ext?.getAttribute("cx")) || 1;
  const ch = px(ext?.getAttribute("cy")) || 1;
  const cox = px(chOff?.getAttribute("x"));
  const coy = px(chOff?.getAttribute("y"));
  const ccw = px(chExt?.getAttribute("cx")) || cw;
  const cch = px(chExt?.getAttribute("cy")) || ch;
  const sx = cw / ccw;
  const sy = ch / cch;
  return { x: ox - cox * sx, y: oy - coy * sy, sx, sy };
}

function composeXf(a: GroupXf, b: GroupXf): GroupXf {
  return { x: a.x + b.x * a.sx, y: a.y + b.y * a.sy, sx: a.sx * b.sx, sy: a.sy * b.sy };
}

/** Apply a group transform to a parsed shape box (px units). */
function applyXf(box: Partial<Xfrm>, xf: GroupXf): Partial<Xfrm> {
  const out: Partial<Xfrm> = {};
  if (box.x !== undefined) out.x = Math.round(xf.x + box.x * xf.sx);
  if (box.y !== undefined) out.y = Math.round(xf.y + box.y * xf.sy);
  if (box.width !== undefined) out.width = Math.max(1, Math.round(box.width * xf.sx));
  if (box.height !== undefined) out.height = Math.max(1, Math.round(box.height * xf.sy));
  if (box.rotation) out.rotation = box.rotation;
  return out;
}

/** Flatten the spTree: leaves are sp/pic/cxnSp/graphicFrame nodes, each
 *  carrying the accumulated transform of its enclosing groups. */
function collectLeafNodes(root: Element): Array<{ node: Element; xf: GroupXf }> {
  const out: Array<{ node: Element; xf: GroupXf }> = [];
  const walk = (parent: Element, xf: GroupXf) => {
    for (const child of Array.from(parent.children)) {
      const local = child.localName ?? "";
      if (local === "grpSp") {
        walk(child, composeXf(xf, parseGroupXf(child)));
      } else if (local === "sp" || local === "pic" || local === "cxnSp" || local === "graphicFrame") {
        out.push({ node: child, xf });
      }
    }
  };
  walk(root, IDENTITY_XF);
  return out;
}

/** Tables (graphicFrame + a:tbl): import as a real DiapoLab table
 *  element, keeping the cell grid, header row and font size from PowerPoint
 *  (round-trip with the native addTable export). */
function tableToElement(frame: Element, box: Partial<Xfrm>): TableElement | null {
  const tbl = firstChildByLocal(frame, "tbl");
  if (!tbl) return null;
  const rows: string[][] = [];
  let fontSize = 0;
  for (const tr of children(tbl, "tr")) {
    const row: string[] = [];
    for (const tc of children(tr, "tc")) {
      const txBody = firstChildByLocal(tc, "txBody");
      const text = txBody
        ? children(txBody, "p")
            .map((p) =>
              children(p, "r")
                .map((r) => firstChildByLocal(r, "t")?.textContent ?? "")
                .join(""),
            )
            .join("\n")
            .trim()
        : "";
      const rPr = txBody ? firstChildByLocal(txBody, "rPr") : null;
      const sz = rPr ? Number(rPr.getAttribute("sz") ?? 0) / 100 : 0;
      if (sz > fontSize) fontSize = sz;
      row.push(text);
    }
    if (row.length) rows.push(row);
  }
  if (rows.length === 0) return null;
  // Header row: explicit cell fill or bold text on the first PowerPoint row.
  let headerRow = false;
  const firstTr = children(tbl, "tr")[0];
  if (firstTr) {
    for (const tc of children(firstTr, "tc")) {
      const tcPr = firstChildByLocal(tc, "tcPr");
      if (tcPr && Array.from(tcPr.children).some((e) => e.localName === "solidFill")) headerRow = true;
      const txBody = firstChildByLocal(tc, "txBody");
      if (txBody && firstChildByLocal(txBody, "rPr")?.getAttribute("b") === "1") headerRow = true;
    }
  }
  return newTable({
    x: box.x ?? 160,
    y: box.y ?? 160,
    width: box.width ?? 760,
    height: box.height ?? 320,
    rows,
    headerRow,
    fontSize: fontSize > 0 ? ptToPx(fontSize) : 16,
  });
}

/** Speaker notes attached to a slide via its notesSlide relationship. */
async function parseSlideNotes(zip: JSZip, rels: Map<string, string>): Promise<string | undefined> {
  const target = Array.from(rels.values()).find((t) => /notesSlides\/notesSlide\d+\.xml$/.test(t));
  if (!target) return undefined;
  const path = "ppt/" + target.replace(/^(\.\.\/)+/, "").replace(/^\//, "");
  const doc = await parseXml(zip, path);
  if (!doc) return undefined;
  const text = Array.from(doc.getElementsByTagName("*"))
    .filter((el) => el.localName === "t")
    .map((el) => el.textContent ?? "")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return text || undefined;
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

/* ---- Slide transitions & entrance animations (kept across imports) ---- */

/** OOXML transition element → DiapoLab transition. */
const OOXML_TO_TRANSITION: Record<string, SlideTransition> = {
  fade: "fade",
  push: "slide",
  cover: "slide",
  pull: "slide",
  zoom: "zoom",
  dissolve: "blur",
  wipe: "reveal",
  circle: "reveal",
  diamond: "reveal",
  newsflash: "tv",
  split: "shutter",
  comb: "shutter",
  blinds: "shutter",
  checker: "shutter",
  randomBar: "shutter",
  wedge: "swirl",
  wheel: "swirl",
  strips: "swirl",
  plus: "prism",
  flip: "flip",
  morph: "morph",
};

/** Read a slide's <p:transition> (also inside mc:AlternateContent) —
 *  null when the slide has none. */
function parseSlideTransition(doc: Document): SlideTransition | null {
  const tr = Array.from(doc.getElementsByTagName("*")).find((el) => el.localName === "transition");
  if (!tr) return null;
  for (const child of Array.from(tr.getElementsByTagName("*"))) {
    if (child.localName === "morph") return "morph";
    const mapped = OOXML_TO_TRANSITION[child.localName ?? ""];
    if (mapped) return mapped;
  }
  return "fade";
}

/** Entrance effects from the timing tree: shape id → animation + delay (ms).
 *  PowerPoint preset IDs are mapped onto the closest DiapoLab animation. */
function parseEntranceTimings(
  doc: Document,
): Array<{ spid: string | null; animation: ElementAnimation; delay: number }> {
  const out: Array<{ spid: string | null; animation: ElementAnimation; delay: number }> = [];
  for (const el of Array.from(doc.getElementsByTagName("*"))) {
    if (el.localName !== "cTn" || el.getAttribute("presetClass") !== "entr") continue;
    const preset = Number(el.getAttribute("presetID") ?? 0);
    if (preset === 1) continue; // "appear" — instant, nothing to replay
    const subtype = Number(el.getAttribute("presetSubtype") ?? 0);
    let animation: ElementAnimation = "fade-up";
    if (preset === 2) {
      // Fly In: subtype gives the origin edge
      animation =
        subtype === 4 ? "move-up" :
        subtype === 1 ? "move-down" :
        subtype === 2 ? "move-right" :
        subtype === 8 ? "move-left" : "fade-up";
    } else if (preset === 16) animation = "pop";
    else if (preset === 23) animation = "flip-in";
    else if (preset === 26) animation = "spin-in";
    // start delay of the effect inside its group
    let delay = 0;
    const st = Array.from(el.children).find((c) => c.localName === "stCondLst");
    const cond = st ? Array.from(st.children).find((c) => c.localName === "cond") : null;
    const rawDelay = Number(cond?.getAttribute("delay") ?? 0);
    if (Number.isFinite(rawDelay) && rawDelay > 0) delay = rawDelay;
    const spTgt = Array.from(el.getElementsByTagName("*")).find((e) => e.localName === "spTgt");
    const spid = spTgt?.getAttribute("spid") ?? null;
    if (spid) out.push({ spid, animation, delay });
  }
  return out;
}

/* ── PowerPoint native theme (ppt/theme/theme1.xml) → DiapoLab theme tokens ──
   Reads the deck clrScheme (colors) and fontScheme (major/minor fonts) and
   converts them to a DiapoLab editor theme + brand kit fonts. */

type PptxTheme = { tokens: ThemeTokens; majorFont?: string; minorFont?: string };

function shade(hex: string, amount: number): string {
  const raw = hex.replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw.slice(0, 6);
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return hex;
  const mix = (channel: number) => {
    const target = amount < 0 ? 0 : 255;
    return Math.round(channel + (target - channel) * Math.abs(amount));
  };
  const r = mix((num >> 16) & 255);
  const g = mix((num >> 8) & 255);
  const b = mix(num & 255);
  return "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");
}

async function parseTheme(zip: JSZip): Promise<PptxTheme | null> {
  const doc = await parseXml(zip, "ppt/theme/theme1.xml");
  if (!doc) return null;
  const all = Array.from(doc.getElementsByTagName("*"));
  const schemeEl = all.find((el) => el.localName === "clrScheme");
  if (!schemeEl) return null;
  const scheme: Record<string, string> = { ...SCHEME_COLORS };
  const slots = [
    "dk1", "lt1", "dk2", "lt2",
    "accent1", "accent2", "accent3", "accent4", "accent5", "accent6",
    "hlink", "folHlink",
  ];
  for (const slot of slots) {
    const node = Array.from(schemeEl.getElementsByTagName("*")).find((el) => el.localName === slot);
    if (!node) continue;
    const srgb = Array.from(node.getElementsByTagName("*")).find((el) => el.localName === "srgbClr");
    const sys = Array.from(node.getElementsByTagName("*")).find((el) => el.localName === "sysClr");
    const hex =
      srgb?.getAttribute("val") ??
      sys?.getAttribute("lastClr") ??
      (sys?.getAttribute("val") === "window" ? "ffffff" : sys?.getAttribute("val") === "windowText" ? "000000" : undefined);
    if (hex) scheme[slot] = "#" + hex.replace("#", "");
  }
  const fontScheme = all.find((el) => el.localName === "fontScheme");
  const latinTypeface = (scope: "majorFont" | "minorFont"): string | undefined => {
    if (!fontScheme) return undefined;
    const part = Array.from(fontScheme.getElementsByTagName("*")).find((el) => el.localName === scope);
    if (!part) return undefined;
    const latin = Array.from(part.getElementsByTagName("*")).find((el) => el.localName === "latin");
    const tf = latin?.getAttribute("typeface");
    return tf && tf.trim() ? tf : undefined;
  };
  const majorFont = latinTypeface("majorFont");
  const minorFont = latinTypeface("minorFont");
  const tokens: ThemeTokens = {
    ink: scheme.dk2,
    paper: scheme.lt2,
    surface: shade(scheme.lt2, -0.05),
    surface2: shade(scheme.lt2, -0.1),
    grid: shade(scheme.lt2, -0.18),
    teal: scheme.dk1,
    tealDeep: scheme.dk2,
    blue: scheme.accent1,
    blueDeep: shade(scheme.accent1, -0.25),
  };
  return {
    tokens,
    ...(majorFont ? { majorFont } : {}),
    ...(minorFont ? { minorFont } : {}),
  };
}
export async function importPPTXFile(file: File): Promise<void> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const pptxTheme = await parseTheme(zip);

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
    const spidToElement = new Map<string, AnyElement>();

    // spTree holds sp (text/shape) and pic (picture) nodes, possibly nested
    // inside groups (grpSp) — groups are flattened with their transform.
    const spTree = Array.from(doc.getElementsByTagName("*")).find(
      (el) => el.localName === "spTree",
    );
    const leaves = spTree ? collectLeafNodes(spTree) : [];

    for (const { node, xf } of leaves) {
      // PPTX shape id — used to re-attach entrance animations parsed later
      const cnvPr = Array.from(node.getElementsByTagName("*")).find((el) => el.localName === "cNvPr");
      const spid = cnvPr?.getAttribute("id") ?? null;
      const push = (el: AnyElement) => {
        if (spid) spidToElement.set(spid, el);
        elements.push(el);
      };
      if (node.localName === "sp") {
        const box = applyXf(parseXfrm(node), xf);
        const body = parseTextBody(node);
        if (body) {
          push(
            newText({
              ...(box ?? {}),
              text: body.text,
              fontSize: body.fontSize,
              color: body.color,
              fontWeight: body.bold ? 800 : 500,
              ...(body.italic ? { italic: true } : {}),
              ...(body.underline ? { underline: true } : {}),
              align: body.align,
            }),
          );
          continue;
        }
        const kind = parseShapeKind(node);
        if (kind && box) {
          const spPr = firstChildByLocal(node, "spPr");
          // Direct children only, so a line-only solidFill is not mistaken for the fill.
          // solidFill or the first gradient stop; noFill keeps the shape hollow.
          const fillEl = spPr ? Array.from(spPr.children).find((e) => e.localName === "solidFill" || e.localName === "gradFill") ?? null : null;
          const noFill = spPr ? Array.from(spPr.children).some((e) => e.localName === "noFill") : false;
          const ln = spPr ? Array.from(spPr.children).find((e) => e.localName === "ln") ?? null : null;
          const lnSolid = ln ? Array.from(ln.children).find((e) => e.localName === "solidFill") ?? null : null;
          const lnWpt = ln ? Number(ln.getAttribute("w") ?? 0) / 12700 : 0;
          const cornerRadius = roundRectRadius(node, box);
          push(
            newShape(kind as never, {
              ...box,
              fill: noFill ? "transparent" : (colorFrom(fillEl) ?? "#e2e8f0"),
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
        const box = applyXf(parseXfrm(node), xf);
        if (box) {
          const ln = firstChildByLocal(node, "ln");
          const lnSolid = ln ? Array.from(ln.children).find((e) => e.localName === "solidFill") ?? null : null;
          const lnWpt = ln ? Number(ln.getAttribute("w") ?? 0) / 12700 : 2;
          const t = Math.max(2, Math.round((lnWpt || 2) * (96 / 72)));
          const horizontal = (box.width ?? 0) >= (box.height ?? 0);
          push(
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
        const box = applyXf(parseXfrm(node), xf);
        const blip = Array.from(node.getElementsByTagName("*")).find((el) => el.localName === "blip");
        const rid = blip?.getAttribute("r:embed");
        if (!rid || !box) continue;
        const src = await mediaToDataUrl(zip, rid, rels);
        if (src) {
          // PowerPoint crop window (a:srcRect): source edges cut away,
          // stored in 1/1000 % -> convert to the cropRect fractions.
          const srcRect = Array.from(node.getElementsByTagName("*")).find(
            (el) => el.localName === "srcRect",
          );
          const frac = (v: string | null) =>
            v ? Math.min(0.9, Math.max(0, Number(v) / 100000)) : 0;
          const crop = srcRect
            ? {
                l: frac(srcRect.getAttribute("l")),
                t: frac(srcRect.getAttribute("t")),
                r: frac(srcRect.getAttribute("r")),
                b: frac(srcRect.getAttribute("b")),
              }
            : undefined;
          const cropped = crop && (crop.l || crop.t || crop.r || crop.b) ? crop : undefined;
          push(
            newImage(src, {
              ...box,
              fit: cropped ? "cover" : "contain",
              ...(cropped ? { cropRect: cropped } : {}),
            }),
          );
        }
      }
      if (node.localName === "graphicFrame") {
        // Tables import as a real DiapoLab table element.
        const tblEl = tableToElement(node, applyXf(parseXfrm(node), xf));
        if (tblEl) push(tblEl);
      }
    }

    // Real slide background: slide → layout → master inheritance chain.
    const bg = await resolveSlideBg(zip, doc, rels, bgCache);
    // Slide transition + entrance animations from the PPTX timing tree.
    const transition = parseSlideTransition(doc);
    for (const en of parseEntranceTimings(doc)) {
      const el = en.spid ? spidToElement.get(en.spid) : undefined;
      if (el) {
        el.animation = en.animation;
        el.animationDelay = Math.max(0, en.delay);
      }
    }
    const notes = await parseSlideNotes(zip, rels);
    pages.push({
      id: Math.random().toString(36).slice(2, 10),
      elements,
      bgColor: bg.color,
      ...(bg.image ? { bgImage: bg.image } : {}),
      ...(transition && transition !== "none" ? { transition } : {}),
      ...(notes ? { notes } : {}),
      duration: 3,
    });
  }

  if (pages.length === 0) throw new Error("Could not read any slide from this PPTX");

  const s = useEditor.getState();
  s.setCanvasSize(canvasW, canvasH);
  s.loadPages(pages);
  s.setDesignName(file.name.replace(/\.pptx$/i, ""));

  // Convert the deck native theme (colors + fonts) into a DiapoLab theme and
  // apply it right away, so the imported deck keeps its PowerPoint identity.
  if (pptxTheme) {
    const settings = useSettings.getState();
    const themeId = "pptx-" + Date.now().toString(36);
    settings.addCustomTheme({
      id: themeId,
      name: file.name.replace(/\.pptx$/i, "") + " theme",
      tokens: pptxTheme.tokens,
    });
    settings.setEditorTheme("custom:" + themeId);
    if (pptxTheme.majorFont) settings.setBrandKit({ headingFont: pptxTheme.majorFont });
    if (pptxTheme.minorFont) settings.setBrandKit({ bodyFont: pptxTheme.minorFont });
  }
}
