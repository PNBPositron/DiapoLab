import JSZip from "jszip";
import {
  useEditor,
  newText,
  newImage,
  newShape,
  newTable,
  newChart,
  type TableElement,
  type ChartKind,
  type ShapeKind,
  type ShapeGradient,
  type ElementShadow,
  type Page,
  type AnyElement,
  type ElementAnimation,
  type SlideTransition,
} from "@/store/editor";
import { useSettings } from "@/store/settings";
import type { ThemeTokens } from "@/lib/themes";

/* PPTX import: unzip the deck, resolve theme/master/layout inheritance, read
   slide XML + embedded media + native charts/tables, and map them onto DiapoLab
   pages. EMU (English Metric Units) → px: 1 inch = 914400 EMU = 96 px. */

const EMU_PER_PX = 9525;
const px = (emu: string | undefined | null): number =>
  Math.round(Number(emu ?? 0) / EMU_PER_PX) || 0;

const ptToPx = (pt: number): number => Math.max(8, Math.round(pt * (96 / 72)));
const uid = () => Math.random().toString(36).slice(2, 10);

function children(node: Element | Document, local: string): Element[] {
  const target = local.split(":").pop();
  const doc = node instanceof Document ? node : node.ownerDocument;
  if (!doc) return [];
  return Array.from(doc.getElementsByTagName("*")).filter(
    (el) => el.localName === target && (node instanceof Document ? true : isDescendant(node, el)),
  );
}

function directChildren(node: Element, local: string): Element[] {
  return Array.from(node.children).filter((el) => el.localName === local);
}

function directChild(node: Element, local: string): Element | null {
  return Array.from(node.children).find((el) => el.localName === local) ?? null;
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

function resolveRelPath(partPath: string, target: string): string {
  const cleanTarget = target.split("#")[0].trim();
  if (cleanTarget.startsWith("/")) return cleanTarget.slice(1);
  const baseParts = partPath.split("/").slice(0, -1);
  for (const seg of cleanTarget.split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") {
      if (baseParts.length > 0) baseParts.pop();
    } else {
      baseParts.push(seg);
    }
  }
  return baseParts.join("/");
}

async function parseXml(zip: JSZip, path: string): Promise<Document | null> {
  const entry = zip.file(path);
  if (!entry) return null;
  const xml = await entry.async("string");
  return new DOMParser().parseFromString(xml, "application/xml");
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

/* -------------------------------------------------------------------------- */
/* Color Resolution (clrScheme + clrMap + OOXML Color Transforms)             */
/* -------------------------------------------------------------------------- */

const DEFAULT_SCHEME_COLORS: Record<string, string> = {
  dk1: "#000000",
  lt1: "#ffffff",
  dk2: "#44546a",
  lt2: "#e7e6e6",
  accent1: "#4472c4",
  accent2: "#ed7d31",
  accent3: "#a5a5a5",
  accent4: "#ffc000",
  accent5: "#5b9bd5",
  accent6: "#70ad47",
  hlink: "#0563c1",
  folHlink: "#954f72",
};

const DEFAULT_CLR_MAP: Record<string, string> = {
  bg1: "lt1",
  tx1: "dk1",
  bg2: "lt2",
  tx2: "dk2",
  accent1: "accent1",
  accent2: "accent2",
  accent3: "accent3",
  accent4: "accent4",
  accent5: "accent5",
  accent6: "accent6",
  hlink: "hlink",
  folHlink: "folHlink",
};

const PRESET_COLORS: Record<string, string> = {
  black: "#000000",
  white: "#ffffff",
  red: "#ff0000",
  green: "#008000",
  blue: "#0000ff",
  yellow: "#ffff00",
  cyan: "#00ffff",
  magenta: "#ff00ff",
  gray: "#808080",
  grey: "#808080",
  dkGray: "#404040",
  darkGray: "#a9a9a9",
  ltGray: "#d3d3d3",
  lightGray: "#d3d3d3",
  silver: "#c0c0c0",
  navy: "#000080",
  teal: "#008080",
  orange: "#ffa500",
  purple: "#800080",
  pink: "#ffc0cb",
  brown: "#a52a2a",
  maroon: "#800000",
  olive: "#808000",
  lime: "#00ff00",
  aqua: "#00ffff",
  fuchsia: "#ff00ff",
};

type ColorContext = {
  scheme: Record<string, string>;
  clrMap: Record<string, string>;
  majorFont?: string;
  minorFont?: string;
};

type ResolvedColor = {
  hex: string; // #rrggbb
  css: string; // #rrggbb or rgba(...)
  alpha: number; // 0..1
};

function hexToRgbTuple(hex: string): [number, number, number] {
  const clean = hex.replace("#", "").padEnd(6, "0").slice(0, 6);
  const n = parseInt(clean, 16);
  if (Number.isNaN(n)) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbTupleToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return [h * 60, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sn = Math.max(0, Math.min(1, s));
  const ln = Math.max(0, Math.min(1, l));
  const hn = ((h % 360) + 360) % 360;
  if (sn === 0) {
    const v = Math.round(ln * 255);
    return [v, v, v];
  }
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1));
  const m = ln - c / 2;
  let rn = 0, gn = 0, bn = 0;
  if (hn < 60) [rn, gn, bn] = [c, x, 0];
  else if (hn < 120) [rn, gn, bn] = [x, c, 0];
  else if (hn < 180) [rn, gn, bn] = [0, c, x];
  else if (hn < 240) [rn, gn, bn] = [0, x, c];
  else if (hn < 300) [rn, gn, bn] = [x, 0, c];
  else [rn, gn, bn] = [c, 0, x];
  return [Math.round((rn + m) * 255), Math.round((gn + m) * 255), Math.round((bn + m) * 255)];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgbTuple(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function parsePctAttr(el: Element): number {
  const raw = el.getAttribute("val") ?? "0";
  const num = Number(raw);
  if (!Number.isFinite(num)) return 0;
  return raw.includes("%") ? parseFloat(raw) / 100 : num / 100000;
}

function applyColorTransforms(baseHex: string, colorEl: Element): ResolvedColor {
  let [r, g, b] = hexToRgbTuple(baseHex);
  let alpha = 1;

  for (const mod of Array.from(colorEl.children)) {
    const name = mod.localName;
    const pct = parsePctAttr(mod);
    if (name === "alpha") {
      alpha = Math.max(0, Math.min(1, pct));
    } else if (name === "alphaMod") {
      alpha = Math.max(0, Math.min(1, alpha * pct));
    } else if (name === "alphaOff") {
      alpha = Math.max(0, Math.min(1, alpha + pct));
    } else if (name === "tint") {
      r = Math.round(r * pct + 255 * (1 - pct));
      g = Math.round(g * pct + 255 * (1 - pct));
      b = Math.round(b * pct + 255 * (1 - pct));
    } else if (name === "shade") {
      r = Math.round(r * pct);
      g = Math.round(g * pct);
      b = Math.round(b * pct);
    } else if (name === "lumMod" || name === "lumOff" || name === "satMod") {
      const [h, s0, l0] = rgbToHsl(r, g, b);
      let s = s0;
      let l = l0;
      if (name === "lumMod") l = Math.max(0, Math.min(1, l * pct));
      if (name === "lumOff") l = Math.max(0, Math.min(1, l + pct));
      if (name === "satMod") s = Math.max(0, Math.min(1, s * pct));
      [r, g, b] = hslToRgb(h, s, l);
    }
  }

  const hex = rgbTupleToHex(r, g, b);
  const css = alpha < 0.995 ? `rgba(${r},${g},${b},${Number(alpha.toFixed(3))})` : hex;
  return { hex, css, alpha };
}

function resolveSchemeKey(key: string, ctx: ColorContext): string | undefined {
  const mapped = ctx.clrMap[key] ?? key;
  return ctx.scheme[mapped] ?? ctx.scheme[key] ?? DEFAULT_SCHEME_COLORS[mapped] ?? DEFAULT_SCHEME_COLORS[key];
}

function resolveColorNode(
  container: Element | null | undefined,
  ctx: ColorContext,
): ResolvedColor | undefined {
  if (!container) return undefined;
  const colorNodes = ["srgbClr", "schemeClr", "sysClr", "prstClr", "scrgbClr", "hslClr"];
  let colorEl: Element | null = null;
  for (const child of Array.from(container.children)) {
    if (colorNodes.includes(child.localName)) {
      colorEl = child;
      break;
    }
  }
  if (!colorEl) {
    colorEl = Array.from(container.getElementsByTagName("*")).find((e) =>
      colorNodes.includes(e.localName),
    ) ?? null;
  }
  if (!colorEl) return undefined;

  let baseHex: string | undefined;
  switch (colorEl.localName) {
    case "srgbClr": {
      const val = colorEl.getAttribute("val");
      if (val) baseHex = "#" + val.replace("#", "").slice(0, 6);
      break;
    }
    case "schemeClr": {
      const val = colorEl.getAttribute("val");
      if (val) baseHex = resolveSchemeKey(val, ctx);
      break;
    }
    case "sysClr": {
      const last = colorEl.getAttribute("lastClr");
      const val = colorEl.getAttribute("val");
      if (last) baseHex = "#" + last.replace("#", "").slice(0, 6);
      else if (val === "window") baseHex = "#ffffff";
      else if (val === "windowText") baseHex = "#000000";
      break;
    }
    case "prstClr": {
      const val = colorEl.getAttribute("val");
      if (val && PRESET_COLORS[val]) baseHex = PRESET_COLORS[val];
      break;
    }
    case "scrgbClr": {
      const r = Number(colorEl.getAttribute("r") ?? 0) / 100000;
      const g = Number(colorEl.getAttribute("g") ?? 0) / 100000;
      const b = Number(colorEl.getAttribute("b") ?? 0) / 100000;
      baseHex = rgbTupleToHex(r * 255, g * 255, b * 255);
      break;
    }
    case "hslClr": {
      const h = Number(colorEl.getAttribute("hue") ?? 0) / 60000;
      const s = Number(colorEl.getAttribute("sat") ?? 0) / 100000;
      const l = Number(colorEl.getAttribute("lum") ?? 0) / 100000;
      const [r, g, b] = hslToRgb(h, s, l);
      baseHex = rgbTupleToHex(r, g, b);
      break;
    }
  }
  if (!baseHex) return undefined;
  return applyColorTransforms(baseHex, colorEl);
}

function parseClrMapAttrs(el: Element | null, base: Record<string, string>): Record<string, string> {
  if (!el) return base;
  const next = { ...base };
  for (const key of Object.keys(DEFAULT_CLR_MAP)) {
    const v = el.getAttribute(key);
    if (v) next[key] = v;
  }
  return next;
}

/* -------------------------------------------------------------------------- */
/* Gradients & Shadows                                                        */
/* -------------------------------------------------------------------------- */

function parseGradFill(
  gradEl: Element,
  ctx: ColorContext,
): { shapeGradient: ShapeGradient; css: string; fallbackHex: string } | null {
  const gsLst = firstChildByLocal(gradEl, "gsLst");
  if (!gsLst) return null;
  const stops: Array<{ pos: number; color: ResolvedColor }> = [];
  for (const gs of directChildren(gsLst, "gs")) {
    const pos = Math.max(0, Math.min(100, Number(gs.getAttribute("pos") ?? 0) / 1000));
    const color = resolveColorNode(gs, ctx);
    if (color) stops.push({ pos, color });
  }
  if (stops.length === 0) return null;
  stops.sort((a, b) => a.pos - b.pos);

  const lin = firstChildByLocal(gradEl, "lin");
  const path = firstChildByLocal(gradEl, "path");
  const oxmlDeg = lin ? Number(lin.getAttribute("ang") ?? 0) / 60000 : 90;
  const cssAngle = Math.round((oxmlDeg + 90) % 360);
  const first = stops[0];
  const last = stops[stops.length - 1];
  const stopStr = stops.map((s) => `${s.color.css} ${Math.round(s.pos)}%`).join(", ");
  const isRadial = Boolean(path && !lin);
  const css = isRadial
    ? `radial-gradient(circle at 50% 50%, ${stopStr})`
    : `linear-gradient(${cssAngle}deg, ${stopStr})`;

  return {
    shapeGradient: {
      from: first.color.css,
      to: last.color.css,
      angle: cssAngle,
      type: isRadial ? "radial" : "linear",
    },
    css,
    fallbackHex: first.color.hex,
  };
}

function parseOuterShadow(spPr: Element | null, ctx: ColorContext): ElementShadow | undefined {
  if (!spPr) return undefined;
  const effectLst = directChild(spPr, "effectLst");
  if (!effectLst) return undefined;
  const outer = directChild(effectLst, "outerShdw");
  if (!outer) return undefined;
  const blur = Math.max(0, px(outer.getAttribute("blurRad") ?? "0"));
  const dist = px(outer.getAttribute("dist") ?? "0");
  const dirRad = ((Number(outer.getAttribute("dir") ?? 0) / 60000) * Math.PI) / 180;
  const x = Math.round(Math.cos(dirRad) * dist);
  const y = Math.round(Math.sin(dirRad) * dist);
  const resolved = resolveColorNode(outer, ctx);
  return {
    x,
    y,
    blur: blur || 8,
    color: resolved?.css ?? "rgba(15,23,42,0.22)",
  };
}

/* -------------------------------------------------------------------------- */
/* Transforms & Shapes                                                        */
/* -------------------------------------------------------------------------- */

type Xfrm = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  hasCoords: boolean;
};

function parseXfrm(sp: Element, allowZeroExt = false): Partial<Xfrm> {
  const spPr = directChild(sp, "spPr");
  const xfrm = (spPr ? directChild(spPr, "xfrm") : null) ?? firstChildByLocal(sp, "xfrm");
  if (!xfrm) return { hasCoords: false };
  const off = directChild(xfrm, "off");
  const ext = directChild(xfrm, "ext");
  const hasCoords = Boolean(off || ext);
  const x = px(off?.getAttribute("x"));
  const y = px(off?.getAttribute("y"));
  const width = px(ext?.getAttribute("cx"));
  const height = px(ext?.getAttribute("cy"));
  const rotation = Number(xfrm.getAttribute("rot") ?? 0) / 60000;
  const flipH = xfrm.getAttribute("flipH") === "1" || xfrm.getAttribute("flipH") === "true";
  const flipV = xfrm.getAttribute("flipV") === "1" || xfrm.getAttribute("flipV") === "true";
  return {
    x,
    y,
    width: allowZeroExt && ext ? width : (width || 200),
    height: allowZeroExt && ext ? height : (height || 60),
    rotation,
    flipH,
    flipV,
    hasCoords,
  };
}

const PRST_TO_KIND: Record<string, ShapeKind> = {
  rect: "rect",
  roundRect: "rounded_rect",
  round1Rect: "rounded_rect",
  round2SameRect: "rounded_rect",
  round2DiagRect: "rounded_rect",
  snip1Rect: "rect",
  snip2SameRect: "rect",
  snip2DiagRect: "rect",
  snipRoundRect: "rounded_rect",
  flowChartProcess: "rect",
  flowChartAlternateProcess: "rounded_rect",
  flowChartTerminator: "capsule",
  ellipse: "circle",
  pie: "circle",
  triangle: "triangle",
  rtTriangle: "right_triangle",
  diamond: "diamond",
  pentagon: "pentagon",
  hexagon: "hexagon",
  octagon: "octagon",
  star4: "burst4",
  star5: "star",
  star6: "star",
  star8: "starburst",
  star10: "starburst",
  star12: "starburst",
  star16: "starburst",
  star24: "starburst",
  star32: "starburst",
  trapezoid: "trapezoid",
  flowChartManualInput: "trapezoid",
  parallelogram: "parallelogram",
  chevron: "chevron",
  homePlate: "chevron",
  plus: "cross",
  mathPlus: "cross",
  flowChartDecision: "diamond",
  flowChartCollate: "diamond",
  heart: "heart",
  cloud: "cloud",
  cloudCallout: "cloud",
  lightningBolt: "lightning",
  moon: "moon",
  donut: "ring",
  blockArc: "ring",
  chord: "semicircle",
  arc: "semicircle",
  rightArrow: "arrow",
  leftArrow: "arrow_left",
  upArrow: "arrow_up",
  downArrow: "arrow_down",
  leftRightArrow: "double_arrow",
  upDownArrow: "double_arrow",
  wedgeRectCallout: "speech",
  wedgeRoundRectCallout: "speech",
  wedgeEllipseCallout: "thought_bubble",
  ribbon: "ribbon",
  ribbon2: "ribbon",
  gear6: "gear",
  gear9: "gear",
  teardrop: "drop",
  bracketPair: "curly_brace",
  bracePair: "curly_brace",
};

function parseShapeKind(sp: Element, flipH?: boolean, flipV?: boolean): { kind: ShapeKind; prst: string | null } {
  const geom = firstChildByLocal(sp, "prstGeom");
  const prst = geom?.getAttribute("prst") ?? null;
  let kind: ShapeKind = prst ? (PRST_TO_KIND[prst] ?? "rect") : "rect";
  if (flipH) {
    if (kind === "arrow") kind = "arrow_left";
    else if (kind === "arrow_left") kind = "arrow";
  }
  if (flipV) {
    if (kind === "arrow_up") kind = "arrow_down";
    else if (kind === "arrow_down") kind = "arrow_up";
  }
  return { kind, prst };
}

function roundRectRadius(sp: Element, box: Partial<Xfrm>): number | undefined {
  const geom = firstChildByLocal(sp, "prstGeom");
  const prst = geom?.getAttribute("prst");
  if (prst !== "roundRect" && prst !== "round1Rect" && prst !== "round2SameRect") return undefined;
  const gd = Array.from(geom!.getElementsByTagName("*")).find((e) => e.localName === "gd");
  const m = gd?.getAttribute("fmla")?.match(/val\s+(\d+)/);
  const pct = m ? Number(m[1]) / 100000 : 1 / 6;
  const min = Math.min(box.width ?? 100, box.height ?? 60);
  return Math.round(min * Math.min(pct, 0.5));
}

/* -------------------------------------------------------------------------- */
/* Placeholder & Text Style Inheritance (Layout / Master)                     */
/* -------------------------------------------------------------------------- */

type PlaceholderInfo = {
  xfrm?: Partial<Xfrm>;
  defFontSize?: number;
  defColor?: string;
  defBold?: boolean;
  defItalic?: boolean;
  defFontFamily?: string;
  defAlign?: "left" | "center" | "right";
};

type PartStyleIndex = {
  byKey: Map<string, PlaceholderInfo>;
  byType: Map<string, PlaceholderInfo>;
  titleStyle?: Partial<PlaceholderInfo>;
  bodyStyle?: Partial<PlaceholderInfo>;
  otherStyle?: Partial<PlaceholderInfo>;
};

function getPhKey(el: Element): { type?: string; idx?: string } | null {
  const ph = firstChildByLocal(el, "ph");
  if (!ph) return null;
  return {
    type: ph.getAttribute("type") ?? undefined,
    idx: ph.getAttribute("idx") ?? undefined,
  };
}

function resolveTypeface(raw: string | null | undefined, ctx: ColorContext): string | undefined {
  if (!raw || !raw.trim()) return undefined;
  const tf = raw.trim();
  if (tf.startsWith("+mj")) return ctx.majorFont;
  if (tf.startsWith("+mn")) return ctx.minorFont;
  return tf;
}

function parseRPrDefaults(rPr: Element | null | undefined, ctx: ColorContext): Partial<PlaceholderInfo> {
  if (!rPr) return {};
  const out: Partial<PlaceholderInfo> = {};
  const sz = Number(rPr.getAttribute("sz") ?? 0) / 100;
  if (sz > 0) out.defFontSize = ptToPx(sz);
  if (rPr.getAttribute("b") === "1") out.defBold = true;
  if (rPr.getAttribute("b") === "0") out.defBold = false;
  if (rPr.getAttribute("i") === "1") out.defItalic = true;
  const solid = directChild(rPr, "solidFill");
  const c = resolveColorNode(solid ?? rPr, ctx);
  if (c) out.defColor = c.css;
  const latin = firstChildByLocal(rPr, "latin");
  const font = resolveTypeface(latin?.getAttribute("typeface"), ctx);
  if (font) out.defFontFamily = font;
  return out;
}

function parsePPrStyle(pPr: Element | null | undefined, ctx: ColorContext): Partial<PlaceholderInfo> {
  if (!pPr) return {};
  const out = parseRPrDefaults(directChild(pPr, "defRPr"), ctx);
  const algn = pPr.getAttribute("algn");
  if (algn === "ctr") out.defAlign = "center";
  else if (algn === "r") out.defAlign = "right";
  else if (algn === "l" || algn === "just") out.defAlign = "left";
  return out;
}

function buildPartStyleIndex(doc: Document | null, ctx: ColorContext): PartStyleIndex {
  const idx: PartStyleIndex = { byKey: new Map(), byType: new Map() };
  if (!doc) return idx;

  const txStyles = Array.from(doc.getElementsByTagName("*")).find((e) => e.localName === "txStyles");
  if (txStyles) {
    const readTx = (name: string) => {
      const node = directChild(txStyles, name);
      if (!node) return undefined;
      return parsePPrStyle(directChild(node, "lvl1pPr"), ctx);
    };
    idx.titleStyle = readTx("titleStyle");
    idx.bodyStyle = readTx("bodyStyle");
    idx.otherStyle = readTx("otherStyle");
  }

  for (const sp of Array.from(doc.getElementsByTagName("*")).filter((e) => e.localName === "sp")) {
    const ph = getPhKey(sp);
    if (!ph) continue;
    const xfrm = parseXfrm(sp);
    const txBody = directChild(sp, "txBody");
    const lstStyle = txBody ? directChild(txBody, "lstStyle") : null;
    const lvl1 = lstStyle ? directChild(lstStyle, "lvl1pPr") : null;
    const p = txBody ? directChild(txBody, "p") : null;
    const pPr = p ? directChild(p, "pPr") : null;
    const merged: PlaceholderInfo = {
      ...(xfrm.hasCoords ? { xfrm } : {}),
      ...parsePPrStyle(lvl1, ctx),
      ...parsePPrStyle(pPr, ctx),
    };
    if (ph.type && ph.idx) idx.byKey.set(`${ph.type}:${ph.idx}`, merged);
    if (ph.type && !idx.byType.has(ph.type)) idx.byType.set(ph.type, merged);
    if (ph.idx && !idx.byKey.has(`:${ph.idx}`)) idx.byKey.set(`:${ph.idx}`, merged);
  }
  return idx;
}

function lookupPlaceholderDefaults(
  sp: Element,
  layoutIdx: PartStyleIndex | null,
  masterIdx: PartStyleIndex | null,
): PlaceholderInfo {
  const ph = getPhKey(sp);
  if (!ph) return {};
  const keys = [
    ph.type && ph.idx ? `${ph.type}:${ph.idx}` : "",
    ph.idx ? `:${ph.idx}` : "",
  ].filter(Boolean);

  const pickFrom = (src: PartStyleIndex | null): PlaceholderInfo => {
    if (!src) return {};
    for (const k of keys) {
      const hit = src.byKey.get(k);
      if (hit) return hit;
    }
    if (ph.type && src.byType.has(ph.type)) return src.byType.get(ph.type)!;
    if (ph.type === "title" || ph.type === "ctrTitle") return src.titleStyle ?? {};
    if (ph.type === "body" || ph.type === "subTitle" || ph.type === "obj") return src.bodyStyle ?? {};
    return src.otherStyle ?? {};
  };

  const m = pickFrom(masterIdx);
  const l = pickFrom(layoutIdx);
  return {
    ...m,
    ...l,
    xfrm: l.xfrm?.hasCoords ? l.xfrm : m.xfrm,
  };
}

/* -------------------------------------------------------------------------- */
/* Rich Text Body Parsing                                                     */
/* -------------------------------------------------------------------------- */

type ParsedTextBody = {
  text: string;
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: "left" | "center" | "right";
  fontFamily?: string;
  letterSpacing?: number;
  lineHeight?: number;
  textTransform?: "uppercase" | "none";
  bullet?: boolean;
  valign: "top" | "middle" | "bottom";
  insets: { l: number; t: number; r: number; b: number };
};

function parseTextBody(
  sp: Element,
  ctx: ColorContext,
  inherited: PlaceholderInfo,
  fontRefColor?: string,
): ParsedTextBody | null {
  const txBody = directChild(sp, "txBody") ?? firstChildByLocal(sp, "txBody");
  if (!txBody) return null;

  const bodyPr = directChild(txBody, "bodyPr");
  const anchorAttr = bodyPr?.getAttribute("anchor");
  const valign: "top" | "middle" | "bottom" =
    anchorAttr === "ctr" ? "middle" : anchorAttr === "b" ? "bottom" : "top";
  const insets = {
    l: bodyPr?.hasAttribute("lIns") ? px(bodyPr.getAttribute("lIns")) : 10,
    t: bodyPr?.hasAttribute("tIns") ? px(bodyPr.getAttribute("tIns")) : 6,
    r: bodyPr?.hasAttribute("rIns") ? px(bodyPr.getAttribute("rIns")) : 10,
    b: bodyPr?.hasAttribute("bIns") ? px(bodyPr.getAttribute("bIns")) : 6,
  };

  const lstStyle = directChild(txBody, "lstStyle");
  const lstLvl1 = lstStyle ? parsePPrStyle(directChild(lstStyle, "lvl1pPr"), ctx) : {};

  const paragraphs = directChildren(txBody, "p");
  if (paragraphs.length === 0) return null;

  let fontSizePt = 0;
  let color = "";
  let bold = inherited.defBold ?? false;
  let italic = inherited.defItalic ?? false;
  let underline = false;
  let align: "left" | "center" | "right" = lstLvl1.defAlign ?? inherited.defAlign ?? "left";
  let fontFamily = lstLvl1.defFontFamily ?? inherited.defFontFamily ?? ctx.minorFont;
  let letterSpacingEm: number | undefined;
  let lineHeight: number | undefined;
  let textTransform: "uppercase" | "none" | undefined;

  type ParaOut = { text: string; bulletKind: "none" | "dot" | "custom" | "num"; bulletChar?: string };
  const paraOuts: ParaOut[] = [];
  let autoIndex = 1;

  for (const p of paragraphs) {
    const pPr = directChild(p, "pPr");
    const pDefaults = parsePPrStyle(pPr, ctx);
    if (pDefaults.defAlign) align = pDefaults.defAlign;
    if (pDefaults.defFontSize && fontSizePt === 0) fontSizePt = Math.round(pDefaults.defFontSize * (72 / 96));
    if (pDefaults.defColor && !color) color = pDefaults.defColor;
    if (pDefaults.defFontFamily) fontFamily = pDefaults.defFontFamily;
    if (pDefaults.defBold !== undefined) bold = pDefaults.defBold;

    if (pPr) {
      const lnSpc = directChild(pPr, "lnSpc");
      const spcPct = lnSpc ? directChild(lnSpc, "spcPct") : null;
      if (spcPct) {
        const lh = Number(spcPct.getAttribute("val") ?? 0) / 100000;
        if (lh >= 0.8 && lh <= 3) lineHeight = Number(lh.toFixed(2));
      }
    }

    const lineParts: string[] = [];
    for (const child of Array.from(p.children)) {
      const ln = child.localName;
      if (ln === "r" || ln === "fld") {
        const rPr = directChild(child, "rPr");
        if (rPr) {
          const sz = Number(rPr.getAttribute("sz") ?? 0) / 100;
          if (sz > fontSizePt) fontSizePt = sz;
          if (rPr.getAttribute("b") === "1") bold = true;
          if (rPr.getAttribute("i") === "1") italic = true;
          const u = rPr.getAttribute("u");
          if (u && u !== "none") underline = true;
          if (rPr.getAttribute("cap") === "all") textTransform = "uppercase";
          const spc = Number(rPr.getAttribute("spc") ?? 0);
          if (spc !== 0 && fontSizePt > 0) {
            letterSpacingEm = Number(((spc / 100) / fontSizePt).toFixed(3));
          }
          const solid = directChild(rPr, "solidFill");
          const c = resolveColorNode(solid ?? rPr, ctx);
          if (c) color = c.css;
          const latin = directChild(rPr, "latin");
          const tf = resolveTypeface(latin?.getAttribute("typeface"), ctx);
          if (tf) fontFamily = tf;
        }
        for (const tEl of directChildren(child, "t")) {
          if (tEl.textContent) lineParts.push(tEl.textContent);
        }
      } else if (ln === "br") {
        lineParts.push("\n");
      }
    }

    const rawText = lineParts.join("");
    let bulletKind: ParaOut["bulletKind"] = "none";
    let bulletChar: string | undefined;
    if (pPr && rawText.trim().length > 0) {
      const hasBuNone = Boolean(directChild(pPr, "buNone"));
      const buChar = directChild(pPr, "buChar");
      const buAuto = directChild(pPr, "buAutoNum");
      if (!hasBuNone) {
        if (buAuto) {
          bulletKind = "num";
          bulletChar = `${autoIndex++}.`;
        } else if (buChar) {
          const ch = buChar.getAttribute("char") ?? "•";
          if (ch === "•" || ch === "▪" || ch === "◦") {
            bulletKind = "dot";
          } else {
            bulletKind = "custom";
            bulletChar = ch;
          }
        }
      }
    }
    paraOuts.push({ text: rawText, bulletKind, bulletChar });
  }

  const nonEmptyParas = paraOuts.filter((p) => p.text.trim().length > 0);
  if (nonEmptyParas.length === 0) return null;

  const allDotBullets = nonEmptyParas.length > 0 && nonEmptyParas.every((p) => p.bulletKind === "dot");
  const finalText = paraOuts
    .map((p) => {
      if (!p.text.trim()) return p.text;
      if (allDotBullets) return p.text;
      if (p.bulletKind === "dot") return `• ${p.text}`;
      if ((p.bulletKind === "num" || p.bulletKind === "custom") && p.bulletChar) {
        return `${p.bulletChar} ${p.text}`;
      }
      return p.text;
    })
    .join("\n")
    .trim();

  if (!finalText) return null;

  const finalFontSize =
    fontSizePt > 0
      ? ptToPx(fontSizePt)
      : lstLvl1.defFontSize ?? inherited.defFontSize ?? 24;

  const finalColor =
    color || lstLvl1.defColor || inherited.defColor || fontRefColor || "#0f172a";

  return {
    text: finalText,
    fontSize: finalFontSize,
    color: finalColor,
    bold,
    italic,
    underline,
    align,
    ...(fontFamily ? { fontFamily } : {}),
    ...(letterSpacingEm !== undefined ? { letterSpacing: letterSpacingEm } : {}),
    ...(lineHeight !== undefined ? { lineHeight } : {}),
    ...(textTransform ? { textTransform } : {}),
    ...(allDotBullets ? { bullet: true } : {}),
    valign,
    insets,
  };
}

/* -------------------------------------------------------------------------- */
/* Media Helpers & Group Flattening                                           */
/* -------------------------------------------------------------------------- */

async function mediaToDataUrl(
  zip: JSZip,
  relId: string,
  partPath: string,
  rels: Map<string, string>,
): Promise<string | null> {
  const target = rels.get(relId);
  if (!target) return null;
  const path = resolveRelPath(partPath, target);
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

type GroupXf = { x: number; y: number; sx: number; sy: number };
const IDENTITY_XF: GroupXf = { x: 0, y: 0, sx: 1, sy: 1 };

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

function applyXf(box: Partial<Xfrm>, xf: GroupXf): Partial<Xfrm> {
  const out: Partial<Xfrm> = { hasCoords: box.hasCoords };
  if (box.x !== undefined) out.x = Math.round(xf.x + box.x * xf.sx);
  if (box.y !== undefined) out.y = Math.round(xf.y + box.y * xf.sy);
  if (box.width !== undefined) out.width = Math.max(1, Math.round(box.width * xf.sx));
  if (box.height !== undefined) out.height = Math.max(1, Math.round(box.height * xf.sy));
  if (box.rotation) out.rotation = box.rotation;
  if (box.flipH) out.flipH = box.flipH;
  if (box.flipV) out.flipV = box.flipV;
  return out;
}

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

/* -------------------------------------------------------------------------- */
/* Tables & Native PowerPoint Charts                                          */
/* -------------------------------------------------------------------------- */

function tableToElement(frame: Element, box: Partial<Xfrm>, ctx: ColorContext): TableElement | null {
  const tbl = firstChildByLocal(frame, "tbl");
  if (!tbl) return null;
  const rows: string[][] = [];
  let fontSize = 0;
  let bodyBgHex: string | undefined;
  let bodyFgHex: string | undefined;
  let headerFillHex: string | undefined;

  const trs = directChildren(tbl, "tr");
  for (let ri = 0; ri < trs.length; ri++) {
    const tr = trs[ri];
    const row: string[] = [];
    for (const tc of directChildren(tr, "tc")) {
      const tcPr = directChild(tc, "tcPr");
      const tcFill = tcPr ? directChild(tcPr, "solidFill") : null;
      const cellFill = resolveColorNode(tcFill, ctx);
      if (cellFill) {
        if (ri === 0 && !headerFillHex) headerFillHex = cellFill.hex;
        else if (ri > 0 && !bodyBgHex) bodyBgHex = cellFill.hex;
      }

      const txBody = directChild(tc, "txBody");
      const text = txBody
        ? directChildren(txBody, "p")
            .map((p) =>
              Array.from(p.children)
                .map((c) => {
                  if (c.localName === "r" || c.localName === "fld") {
                    const rPr = directChild(c, "rPr");
                    if (rPr) {
                      const sz = Number(rPr.getAttribute("sz") ?? 0) / 100;
                      if (sz > fontSize) fontSize = sz;
                      if (ri > 0 && !bodyFgHex) {
                        const rc = resolveColorNode(directChild(rPr, "solidFill") ?? rPr, ctx);
                        if (rc) bodyFgHex = rc.hex;
                      }
                    }
                    return directChildren(c, "t").map((t) => t.textContent ?? "").join("");
                  }
                  if (c.localName === "br") return "\n";
                  return "";
                })
                .join(""),
            )
            .join("\n")
            .trim()
        : "";
      row.push(text);
    }
    if (row.length) rows.push(row);
  }
  if (rows.length === 0) return null;

  let headerRow = false;
  const firstTr = trs[0];
  if (firstTr) {
    for (const tc of directChildren(firstTr, "tc")) {
      const tcPr = directChild(tc, "tcPr");
      if (tcPr && directChild(tcPr, "solidFill")) headerRow = true;
      const txBody = directChild(tc, "txBody");
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
    ...(bodyBgHex ? { bgColor: bodyBgHex } : {}),
    ...(bodyFgHex ? { fgColor: bodyFgHex } : {}),
    accentColor: headerFillHex ?? ctx.scheme.accent1 ?? "#2563eb",
  });
}

async function chartToElement(
  zip: JSZip,
  frame: Element,
  box: Partial<Xfrm>,
  partPath: string,
  rels: Map<string, string>,
  ctx: ColorContext,
): Promise<AnyElement | null> {
  const chartRef = firstChildByLocal(frame, "chart");
  const rid = chartRef?.getAttribute("r:id");
  if (!rid) return null;
  const target = rels.get(rid);
  if (!target) return null;
  const chartPath = resolveRelPath(partPath, target);
  const chartDoc = await parseXml(zip, chartPath);
  if (!chartDoc) return null;

  const plotArea = firstChildByLocal(chartDoc.documentElement, "plotArea");
  if (!plotArea) return null;

  let kind: ChartKind = "bar";
  let chartNode: Element | null = null;
  const mapKind: Array<[string, ChartKind]> = [
    ["pieChart", "pie"],
    ["pie3DChart", "pie"],
    ["doughnutChart", "donut"],
    ["lineChart", "line"],
    ["line3DChart", "line"],
    ["areaChart", "area"],
    ["area3DChart", "area"],
    ["barChart", "bar"],
    ["bar3DChart", "bar"],
  ];
  for (const [tag, k] of mapKind) {
    const found = directChild(plotArea, tag);
    if (found) {
      kind = k;
      chartNode = found;
      break;
    }
  }
  if (!chartNode) return null;

  const titleEl = directChild(chartDoc.documentElement, "chart");
  const titleNode = titleEl ? directChild(titleEl, "title") : null;
  const title = titleNode
    ? Array.from(titleNode.getElementsByTagName("*"))
        .filter((e) => e.localName === "t")
        .map((e) => e.textContent ?? "")
        .join("")
        .trim()
    : "";

  const ser = directChildren(chartNode, "ser")[0];
  if (!ser) return null;

  const readCacheValues = (parent: Element | null): string[] => {
    if (!parent) return [];
    const pts = Array.from(parent.getElementsByTagName("*")).filter((e) => e.localName === "pt");
    const out: string[] = [];
    for (const pt of pts) {
      const idxAttr = Number(pt.getAttribute("idx") ?? out.length);
      const v = directChild(pt, "v")?.textContent ?? "";
      out[idxAttr] = v;
    }
    return out.filter((x) => x !== undefined);
  };

  const catLabels = readCacheValues(directChild(ser, "cat"));
  const valStrings = readCacheValues(directChild(ser, "val"));
  if (valStrings.length === 0) return null;

  const data = valStrings.map((raw, i) => ({
    label: catLabels[i] ?? `Item ${i + 1}`,
    value: Number(raw) || 0,
  }));

  // Collect explicit point/series fills, falling back to deck theme accents
  const colors: string[] = [];
  for (const dPt of directChildren(ser, "dPt")) {
    const spPr = directChild(dPt, "spPr");
    const c = resolveColorNode(spPr ? directChild(spPr, "solidFill") : null, ctx);
    if (c) colors.push(c.hex);
  }
  if (colors.length === 0) {
    for (const s of directChildren(chartNode, "ser")) {
      const spPr = directChild(s, "spPr");
      const c = resolveColorNode(spPr ? directChild(spPr, "solidFill") : null, ctx);
      if (c) colors.push(c.hex);
    }
  }
  if (colors.length === 0) {
    for (const key of ["accent1", "accent2", "accent3", "accent4", "accent5", "accent6"]) {
      const hex = ctx.scheme[key];
      if (hex) colors.push(hex);
    }
  }

  return newChart(kind, {
    x: box.x ?? 160,
    y: box.y ?? 160,
    width: box.width ?? 760,
    height: box.height ?? 480,
    title: title || "Chart",
    data,
    colors: colors.length > 0 ? colors : ["#2563eb", "#f97316", "#10b981", "#8b5cf6"],
    bgColor: "transparent",
    fgColor: resolveSchemeKey("tx1", ctx) ?? "#0f172a",
  });
}

/* -------------------------------------------------------------------------- */
/* Slide Notes & Backgrounds                                                  */
/* -------------------------------------------------------------------------- */

async function parseSlideNotes(
  zip: JSZip,
  slidePath: string,
  rels: Map<string, string>,
): Promise<string | undefined> {
  const target = Array.from(rels.values()).find((t) => /notesSlides\/notesSlide\d+\.xml$/.test(t));
  if (!target) return undefined;
  const path = resolveRelPath(slidePath, target);
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

type SlideBg = { color: string; image?: string };

async function parseBgElement(
  zip: JSZip,
  doc: Document,
  partPath: string,
  rels: Map<string, string>,
  ctx: ColorContext,
): Promise<SlideBg | null> {
  const bg = Array.from(doc.getElementsByTagName("*")).find((el) => el.localName === "bg");
  if (!bg) return null;

  const bgRef = directChild(bg, "bgRef");
  if (bgRef) {
    const c = resolveColorNode(bgRef, ctx);
    if (c) return { color: c.css };
  }

  const bgPr = directChild(bg, "bgPr") ?? bg;
  const solid = directChild(bgPr, "solidFill");
  if (solid) {
    const c = resolveColorNode(solid, ctx);
    if (c) return { color: c.css };
  }
  const grad = directChild(bgPr, "gradFill");
  if (grad) {
    const parsed = parseGradFill(grad, ctx);
    if (parsed) return { color: parsed.css };
  }
  const blipFill = directChild(bgPr, "blipFill");
  const blip = blipFill ? firstChildByLocal(blipFill, "blip") : null;
  const rid = blip?.getAttribute("r:embed");
  if (rid) {
    const image = await mediaToDataUrl(zip, rid, partPath, rels);
    if (image) return { color: resolveSchemeKey("bg1", ctx) ?? "#ffffff", image };
  }
  return null;
}

async function resolveSlideBg(
  zip: JSZip,
  slideDoc: Document,
  slidePath: string,
  slideRels: Map<string, string>,
  layoutDoc: Document | null,
  layoutPath: string | null,
  layoutRels: Map<string, string> | null,
  masterDoc: Document | null,
  masterPath: string | null,
  masterRels: Map<string, string> | null,
  ctx: ColorContext,
): Promise<SlideBg> {
  const own = await parseBgElement(zip, slideDoc, slidePath, slideRels, ctx);
  if (own) return own;

  if (layoutDoc && layoutPath && layoutRels) {
    const layoutBg = await parseBgElement(zip, layoutDoc, layoutPath, layoutRels, ctx);
    if (layoutBg) return layoutBg;
  }

  if (masterDoc && masterPath && masterRels) {
    const masterBg = await parseBgElement(zip, masterDoc, masterPath, masterRels, ctx);
    if (masterBg) return masterBg;
  }

  return { color: resolveSchemeKey("bg1", ctx) ?? "#ffffff" };
}

/* -------------------------------------------------------------------------- */
/* Transitions & Animations                                                   */
/* -------------------------------------------------------------------------- */

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

function parseEntranceTimings(
  doc: Document,
): Array<{ spid: string | null; animation: ElementAnimation; delay: number }> {
  const out: Array<{ spid: string | null; animation: ElementAnimation; delay: number }> = [];
  for (const el of Array.from(doc.getElementsByTagName("*"))) {
    if (el.localName !== "cTn" || el.getAttribute("presetClass") !== "entr") continue;
    const preset = Number(el.getAttribute("presetID") ?? 0);
    if (preset === 1) continue;
    const subtype = Number(el.getAttribute("presetSubtype") ?? 0);
    let animation: ElementAnimation = "fade-up";
    if (preset === 2) {
      animation =
        subtype === 4 ? "move-up" :
        subtype === 1 ? "move-down" :
        subtype === 2 ? "move-right" :
        subtype === 8 ? "move-left" : "fade-up";
    } else if (preset === 16) animation = "pop";
    else if (preset === 23) animation = "flip-in";
    else if (preset === 26) animation = "spin-in";
    let delay = 0;
    const st = directChild(el, "stCondLst");
    const cond = st ? directChild(st, "cond") : null;
    const rawDelay = Number(cond?.getAttribute("delay") ?? 0);
    if (Number.isFinite(rawDelay) && rawDelay > 0) delay = rawDelay;
    const spTgt = Array.from(el.getElementsByTagName("*")).find((e) => e.localName === "spTgt");
    const spid = spTgt?.getAttribute("spid") ?? null;
    if (spid) out.push({ spid, animation, delay });
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Theme Parsing                                                              */
/* -------------------------------------------------------------------------- */

type PptxTheme = {
  scheme: Record<string, string>;
  tokens: ThemeTokens;
  majorFont?: string;
  minorFont?: string;
};

function shade(hex: string, amount: number): string {
  const [r0, g0, b0] = hexToRgbTuple(hex);
  const mix = (channel: number) => {
    const target = amount < 0 ? 0 : 255;
    return Math.round(channel + (target - channel) * Math.abs(amount));
  };
  return rgbTupleToHex(mix(r0), mix(g0), mix(b0));
}

async function parseTheme(zip: JSZip, themePath = "ppt/theme/theme1.xml"): Promise<PptxTheme | null> {
  const doc = await parseXml(zip, themePath);
  if (!doc) return null;
  const all = Array.from(doc.getElementsByTagName("*"));
  const schemeEl = all.find((el) => el.localName === "clrScheme");
  if (!schemeEl) return null;
  const scheme: Record<string, string> = { ...DEFAULT_SCHEME_COLORS };
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
    if (hex) scheme[slot] = "#" + hex.replace("#", "").slice(0, 6);
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
    scheme,
    tokens,
    ...(majorFont ? { majorFont } : {}),
    ...(minorFont ? { minorFont } : {}),
  };
}

/* -------------------------------------------------------------------------- */
/* Leaf Node Conversion (Shapes, Text, Connectors, Pictures, Tables, Charts)  */
/* -------------------------------------------------------------------------- */

async function convertLeafNodes(params: {
  zip: JSZip;
  partPath: string;
  rels: Map<string, string>;
  leaves: Array<{ node: Element; xf: GroupXf }>;
  ctx: ColorContext;
  layoutIdx: PartStyleIndex | null;
  masterIdx: PartStyleIndex | null;
  isBackgroundLayer?: boolean;
  elements: AnyElement[];
  spidToElement: Map<string, AnyElement>;
}): Promise<void> {
  const {
    zip,
    partPath,
    rels,
    leaves,
    ctx,
    layoutIdx,
    masterIdx,
    isBackgroundLayer = false,
    elements,
    spidToElement,
  } = params;

  for (const { node, xf } of leaves) {
    if (isBackgroundLayer && getPhKey(node)) {
      // Never render placeholder template boxes from master/layout
      continue;
    }

    const cnvPr = Array.from(node.getElementsByTagName("*")).find((el) => el.localName === "cNvPr");
    const spid = cnvPr?.getAttribute("id") ?? null;
    const push = (el: AnyElement) => {
      if (spid && !isBackgroundLayer) spidToElement.set(spid, el);
      elements.push(el);
    };

    if (node.localName === "sp") {
      const inherited = isBackgroundLayer ? {} : lookupPlaceholderDefaults(node, layoutIdx, masterIdx);
      const rawBox = parseXfrm(node);
      const mergedBox = rawBox.hasCoords ? rawBox : (inherited.xfrm ?? rawBox);
      const box = applyXf(mergedBox, xf);

      const spPr = directChild(node, "spPr");
      const styleEl = directChild(node, "style");
      const fillRef = styleEl ? directChild(styleEl, "fillRef") : null;
      const lnRef = styleEl ? directChild(styleEl, "lnRef") : null;
      const fontRef = styleEl ? directChild(styleEl, "fontRef") : null;

      const noFill = spPr ? Boolean(directChild(spPr, "noFill")) : false;
      const solidFillEl = spPr ? directChild(spPr, "solidFill") : null;
      const gradFillEl = spPr ? directChild(spPr, "gradFill") : null;
      const blipFillEl = spPr ? directChild(spPr, "blipFill") : null;

      // Picture-filled shape (common for rounded photo frames / master badges)
      if (blipFillEl) {
        const blip = firstChildByLocal(blipFillEl, "blip");
        const rid = blip?.getAttribute("r:embed");
        if (rid && box) {
          const src = await mediaToDataUrl(zip, rid, partPath, rels);
          if (src) {
            const { kind } = parseShapeKind(node, box.flipH, box.flipV);
            const cornerRadius = roundRectRadius(node, box);
            push(
              newImage(src, {
                ...box,
                fit: "cover",
                ...(kind !== "rect" && kind !== "rounded_rect" ? { maskShape: kind } : {}),
                ...(cornerRadius ? { cornerRadius } : {}),
              }),
            );
            continue;
          }
        }
      }

      const solidColor = resolveColorNode(solidFillEl, ctx);
      const parsedGrad = gradFillEl ? parseGradFill(gradFillEl, ctx) : null;
      const fillRefIdx = Number(fillRef?.getAttribute("idx") ?? 0);
      const refFillColor = fillRef && fillRefIdx > 0 ? resolveColorNode(fillRef, ctx) : undefined;

      const ln = spPr ? directChild(spPr, "ln") : null;
      const lnNoFill = ln ? Boolean(directChild(ln, "noFill")) : false;
      const lnSolid = ln ? directChild(ln, "solidFill") : null;
      const explicitStrokeColor = resolveColorNode(lnSolid, ctx);
      const lnRefIdx = Number(lnRef?.getAttribute("idx") ?? 0);
      const refStrokeColor = lnRef && lnRefIdx > 0 ? resolveColorNode(lnRef, ctx) : undefined;
      const strokeColor = lnNoFill ? undefined : (explicitStrokeColor ?? (ln ? undefined : refStrokeColor));

      const lnWpt = ln ? Number(ln.getAttribute("w") ?? 0) / 12700 : 0;
      const strokeWidth = strokeColor
        ? Math.max(1, Math.round((lnWpt > 0 ? lnWpt : 1) * (96 / 72)))
        : 0;
      const prstDash = ln ? directChild(ln, "prstDash")?.getAttribute("val") : undefined;
      const strokeStyle: "solid" | "dashed" | "dotted" | undefined =
        prstDash && prstDash.toLowerCase().includes("dot") && !prstDash.toLowerCase().includes("dash")
          ? "dotted"
          : prstDash && prstDash !== "solid"
            ? "dashed"
            : undefined;

      const fillCss = noFill
        ? "transparent"
        : solidColor?.css ?? parsedGrad?.fallbackHex ?? refFillColor?.css ?? "transparent";
      const hasFill = !noFill && (Boolean(solidColor) || Boolean(parsedGrad) || Boolean(refFillColor));
      const { kind, prst } = parseShapeKind(node, box.flipH, box.flipV);
      const cornerRadius = roundRectRadius(node, box);
      const shadow = parseOuterShadow(spPr, ctx);

      const fontRefColor = resolveColorNode(fontRef, ctx)?.css;
      const body = isBackgroundLayer
        ? null
        : parseTextBody(node, ctx, inherited, fontRefColor);

      const isPlainBox = !prst || prst === "rect" || prst === "textBox";
      const hasVisibleShape = hasFill || strokeWidth > 0 || !isPlainBox;

      if (body && hasVisibleShape) {
        const groupId = uid();
        const fillForShape = hasFill ? fillCss : "#e2e8f0";
        push(
          newShape(kind, {
            ...box,
            groupId,
            fill: fillForShape,
            ...(parsedGrad ? { gradient: parsedGrad.shapeGradient } : {}),
            stroke: strokeColor?.css ?? "transparent",
            strokeWidth,
            ...(strokeStyle ? { strokeStyle } : {}),
            ...(cornerRadius ? { cornerRadius } : {}),
            ...(shadow ? { shadow } : {}),
          }),
        );

        // Contrast fallback if body color wasn't specified explicitly
        const textColor =
          body.color !== "#0f172a" || !hasFill
            ? body.color
            : relativeLuminance(solidColor?.hex ?? parsedGrad?.fallbackHex ?? refFillColor?.hex ?? "#ffffff") < 0.45
              ? "#ffffff"
              : "#0f172a";

        const bw = box.width ?? 200;
        const bh = box.height ?? 60;
        const padX = Math.min(Math.floor(bw * 0.25), Math.max(8, body.insets.l));
        const padY = Math.min(Math.floor(bh * 0.25), Math.max(4, body.insets.t));
        const textW = Math.max(24, bw - padX * 2);
        const lineCount = Math.max(1, body.text.split("\n").length);
        const estTextH = Math.min(bh - padY * 2, Math.round(lineCount * body.fontSize * (body.lineHeight ?? 1.15) + 10));
        let textY = (box.y ?? 0) + padY;
        let textH = Math.max(20, bh - padY * 2);
        if (body.valign === "middle" && estTextH < textH) {
          textY = (box.y ?? 0) + Math.round((bh - estTextH) / 2);
          textH = estTextH;
        } else if (body.valign === "bottom" && estTextH < textH) {
          textY = (box.y ?? 0) + bh - padY - estTextH;
          textH = estTextH;
        }

        push(
          newText({
            x: (box.x ?? 0) + padX,
            y: textY,
            width: textW,
            height: textH,
            rotation: box.rotation ?? 0,
            groupId,
            text: body.text,
            fontSize: body.fontSize,
            color: textColor,
            fontWeight: body.bold ? 800 : 500,
            ...(body.fontFamily ? { fontFamily: body.fontFamily } : {}),
            ...(body.italic ? { italic: true } : {}),
            ...(body.underline ? { underline: true } : {}),
            ...(body.letterSpacing !== undefined ? { letterSpacing: body.letterSpacing } : {}),
            ...(body.lineHeight !== undefined ? { lineHeight: body.lineHeight } : {}),
            ...(body.textTransform ? { textTransform: body.textTransform } : {}),
            ...(body.bullet ? { bullet: true } : {}),
            align: body.align,
          }),
        );
        continue;
      }

      if (body) {
        push(
          newText({
            x: box.x ?? 120,
            y: box.y ?? 120,
            width: box.width ?? 400,
            height: box.height ?? 80,
            rotation: box.rotation ?? 0,
            text: body.text,
            fontSize: body.fontSize,
            color: body.color,
            fontWeight: body.bold ? 800 : 500,
            ...(body.fontFamily ? { fontFamily: body.fontFamily } : {}),
            ...(body.italic ? { italic: true } : {}),
            ...(body.underline ? { underline: true } : {}),
            ...(body.letterSpacing !== undefined ? { letterSpacing: body.letterSpacing } : {}),
            ...(body.lineHeight !== undefined ? { lineHeight: body.lineHeight } : {}),
            ...(body.textTransform ? { textTransform: body.textTransform } : {}),
            ...(body.bullet ? { bullet: true } : {}),
            align: body.align,
          }),
        );
        continue;
      }

      if (hasVisibleShape && !isPlainBox) {
        push(
          newShape(kind, {
            ...box,
            fill: hasFill ? fillCss : "#e2e8f0",
            ...(parsedGrad ? { gradient: parsedGrad.shapeGradient } : {}),
            stroke: strokeColor?.css ?? "transparent",
            strokeWidth,
            ...(strokeStyle ? { strokeStyle } : {}),
            ...(cornerRadius ? { cornerRadius } : {}),
            ...(shadow ? { shadow } : {}),
          }),
        );
      } else if (hasFill || strokeWidth > 0) {
        push(
          newShape(kind, {
            ...box,
            fill: hasFill ? fillCss : "transparent",
            ...(parsedGrad ? { gradient: parsedGrad.shapeGradient } : {}),
            stroke: strokeColor?.css ?? "transparent",
            strokeWidth,
            ...(strokeStyle ? { strokeStyle } : {}),
            ...(cornerRadius ? { cornerRadius } : {}),
            ...(shadow ? { shadow } : {}),
          }),
        );
      }
      continue;
    }

    if (node.localName === "cxnSp") {
      const box = applyXf(parseXfrm(node, true), xf);
      if (box) {
        const spPr = directChild(node, "spPr");
        const ln = spPr ? directChild(spPr, "ln") : firstChildByLocal(node, "ln");
        const lnSolid = ln ? directChild(ln, "solidFill") : null;
        const styleEl = directChild(node, "style");
        const lnRef = styleEl ? directChild(styleEl, "lnRef") : null;
        const lnColor =
          resolveColorNode(lnSolid, ctx)?.css ??
          resolveColorNode(lnRef, ctx)?.css ??
          resolveSchemeKey("tx1", ctx) ??
          "#334155";
        const lnWpt = ln ? Number(ln.getAttribute("w") ?? 0) / 12700 : 2;
        const t = Math.max(2, Math.round((lnWpt || 2) * (96 / 72)));
        const w = box.width ?? 0;
        const h = box.height ?? 0;

        if (w > 6 && h > 6) {
          // Diagonal connector: rotate a crisp bar along the true segment angle
          const cx = (box.x ?? 0) + w / 2;
          const cy = (box.y ?? 0) + h / 2;
          const len = Math.max(4, Math.round(Math.hypot(w, h)));
          const slopeSign = (box.flipH ? -1 : 1) * (box.flipV ? -1 : 1);
          const angle = Math.round((Math.atan2(h * slopeSign, w) * 180) / Math.PI);
          push(
            newShape("rect", {
              x: Math.round(cx - len / 2),
              y: Math.round(cy - t / 2),
              width: len,
              height: t,
              rotation: angle,
              fill: lnColor,
              stroke: "transparent",
              strokeWidth: 0,
            }),
          );
        } else {
          const horizontal = w >= h;
          push(
            newShape("rect", {
              ...box,
              ...(horizontal ? { height: t } : { width: t }),
              fill: lnColor,
              stroke: "transparent",
              strokeWidth: 0,
            }),
          );
        }
      }
      continue;
    }

    if (node.localName === "pic") {
      const box = applyXf(parseXfrm(node), xf);
      const blip = Array.from(node.getElementsByTagName("*")).find((el) => el.localName === "blip");
      const rid = blip?.getAttribute("r:embed");
      if (!rid || !box) continue;
      const src = await mediaToDataUrl(zip, rid, partPath, rels);
      if (src) {
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
        const spPr = directChild(node, "spPr");
        const shadow = parseOuterShadow(spPr, ctx);
        const cornerRadius = roundRectRadius(node, box);
        const { kind } = parseShapeKind(node);
        push(
          newImage(src, {
            ...box,
            fit: cropped ? "cover" : "contain",
            ...(cropped ? { cropRect: cropped } : {}),
            ...(box.flipH ? { flipX: true } : {}),
            ...(box.flipV ? { flipY: true } : {}),
            ...(shadow ? { shadow } : {}),
            ...(cornerRadius ? { cornerRadius } : {}),
            ...(kind !== "rect" && kind !== "rounded_rect" ? { maskShape: kind } : {}),
          }),
        );
      }
      continue;
    }

    if (node.localName === "graphicFrame") {
      const box = applyXf(parseXfrm(node), xf);
      const tblEl = tableToElement(node, box, ctx);
      if (tblEl) {
        push(tblEl);
        continue;
      }
      const chartEl = await chartToElement(zip, node, box, partPath, rels, ctx);
      if (chartEl) push(chartEl);
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Main Importer                                                              */
/* -------------------------------------------------------------------------- */

export async function importPPTXFile(file: File): Promise<void> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const defaultTheme = await parseTheme(zip, "ppt/theme/theme1.xml");

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

  const presRels = await parseRels(zip, "ppt/presentation.xml");
  const slideIds = Array.from(presDoc.getElementsByTagName("*")).filter(
    (el) => el.localName === "sldId",
  );
  const slideFiles: string[] = [];
  for (const id of slideIds) {
    const rid = id.getAttribute("r:id");
    const target = rid ? presRels.get(rid) : null;
    if (target) slideFiles.push(resolveRelPath("ppt/presentation.xml", target));
  }
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

  type CachedPart = {
    doc: Document;
    rels: Map<string, string>;
    clrMap: Record<string, string>;
    styleIdx: PartStyleIndex;
    theme?: PptxTheme | null;
  };
  const partCache = new Map<string, CachedPart | null>();

  const loadMasterPart = async (masterPath: string): Promise<CachedPart | null> => {
    if (partCache.has(masterPath)) return partCache.get(masterPath) ?? null;
    const doc = await parseXml(zip, masterPath);
    if (!doc) {
      partCache.set(masterPath, null);
      return null;
    }
    const rels = await parseRels(zip, masterPath);
    const themeTarget = Array.from(rels.values()).find((t) => /theme\/[^/]+\.xml$/.test(t));
    const theme = themeTarget ? await parseTheme(zip, resolveRelPath(masterPath, themeTarget)) : defaultTheme;
    const clrMapEl = Array.from(doc.getElementsByTagName("*")).find((e) => e.localName === "clrMap");
    const clrMap = parseClrMapAttrs(clrMapEl ?? null, DEFAULT_CLR_MAP);
    const ctx: ColorContext = {
      scheme: theme?.scheme ?? DEFAULT_SCHEME_COLORS,
      clrMap,
      majorFont: theme?.majorFont,
      minorFont: theme?.minorFont,
    };
    const styleIdx = buildPartStyleIndex(doc, ctx);
    const entry: CachedPart = { doc, rels, clrMap, styleIdx, theme };
    partCache.set(masterPath, entry);
    return entry;
  };

  const loadLayoutPart = async (
    layoutPath: string,
  ): Promise<{ layout: CachedPart | null; master: CachedPart | null; masterPath: string | null }> => {
    const doc = await parseXml(zip, layoutPath);
    if (!doc) return { layout: null, master: null, masterPath: null };
    const rels = await parseRels(zip, layoutPath);
    const masterTarget = Array.from(rels.values()).find((t) => /slideMasters\/[^/]+\.xml$/.test(t));
    const masterPath = masterTarget ? resolveRelPath(layoutPath, masterTarget) : null;
    const master = masterPath ? await loadMasterPart(masterPath) : null;
    const baseClrMap = master?.clrMap ?? DEFAULT_CLR_MAP;
    const ovr = Array.from(doc.getElementsByTagName("*")).find((e) => e.localName === "overrideClrMapping");
    const clrMap = parseClrMapAttrs(ovr ?? null, baseClrMap);
    const activeTheme = master?.theme ?? defaultTheme;
    const ctx: ColorContext = {
      scheme: activeTheme?.scheme ?? DEFAULT_SCHEME_COLORS,
      clrMap,
      majorFont: activeTheme?.majorFont,
      minorFont: activeTheme?.minorFont,
    };
    const styleIdx = buildPartStyleIndex(doc, ctx);
    return {
      layout: { doc, rels, clrMap, styleIdx, theme: activeTheme },
      master,
      masterPath,
    };
  };

  const pages: Page[] = [];
  for (const slidePath of slideFiles) {
    const doc = await parseXml(zip, slidePath);
    if (!doc) continue;
    const rels = await parseRels(zip, slidePath);

    const layoutTarget = Array.from(rels.values()).find((t) => /slideLayouts\/[^/]+\.xml$/.test(t));
    const layoutPath = layoutTarget ? resolveRelPath(slidePath, layoutTarget) : null;
    const { layout, master, masterPath } = layoutPath
      ? await loadLayoutPart(layoutPath)
      : { layout: null, master: null, masterPath: null };

    const slideOvr = Array.from(doc.getElementsByTagName("*")).find(
      (e) => e.localName === "overrideClrMapping",
    );
    const activeTheme = master?.theme ?? defaultTheme;
    const clrMap = parseClrMapAttrs(slideOvr ?? null, layout?.clrMap ?? master?.clrMap ?? DEFAULT_CLR_MAP);
    const ctx: ColorContext = {
      scheme: activeTheme?.scheme ?? DEFAULT_SCHEME_COLORS,
      clrMap,
      majorFont: activeTheme?.majorFont,
      minorFont: activeTheme?.minorFont,
    };

    const elements: AnyElement[] = [];
    const spidToElement = new Map<string, AnyElement>();

    const slideShowMaster = doc.documentElement.getAttribute("showMasterSp") !== "0";
    const layoutShowMaster = layout?.doc.documentElement.getAttribute("showMasterSp") !== "0";

    if (slideShowMaster && layoutShowMaster && master && masterPath) {
      const mTree = Array.from(master.doc.getElementsByTagName("*")).find((e) => e.localName === "spTree");
      if (mTree) {
        await convertLeafNodes({
          zip,
          partPath: masterPath,
          rels: master.rels,
          leaves: collectLeafNodes(mTree),
          ctx,
          layoutIdx: null,
          masterIdx: null,
          isBackgroundLayer: true,
          elements,
          spidToElement,
        });
      }
    }

    if (slideShowMaster && layout && layoutPath) {
      const lTree = Array.from(layout.doc.getElementsByTagName("*")).find((e) => e.localName === "spTree");
      if (lTree) {
        await convertLeafNodes({
          zip,
          partPath: layoutPath,
          rels: layout.rels,
          leaves: collectLeafNodes(lTree),
          ctx,
          layoutIdx: null,
          masterIdx: null,
          isBackgroundLayer: true,
          elements,
          spidToElement,
        });
      }
    }

    const spTree = Array.from(doc.getElementsByTagName("*")).find((el) => el.localName === "spTree");
    if (spTree) {
      await convertLeafNodes({
        zip,
        partPath: slidePath,
        rels,
        leaves: collectLeafNodes(spTree),
        ctx,
        layoutIdx: layout?.styleIdx ?? null,
        masterIdx: master?.styleIdx ?? null,
        isBackgroundLayer: false,
        elements,
        spidToElement,
      });
    }

    const bg = await resolveSlideBg(
      zip,
      doc,
      slidePath,
      rels,
      layout?.doc ?? null,
      layoutPath,
      layout?.rels ?? null,
      master?.doc ?? null,
      masterPath,
      master?.rels ?? null,
      ctx,
    );

    const transition = parseSlideTransition(doc);
    for (const en of parseEntranceTimings(doc)) {
      const el = en.spid ? spidToElement.get(en.spid) : undefined;
      if (el) {
        el.animation = en.animation;
        el.animationDelay = Math.max(0, en.delay);
      }
    }

    const notes = await parseSlideNotes(zip, slidePath, rels);
    pages.push({
      id: uid(),
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

  if (defaultTheme) {
    const settings = useSettings.getState();
    const themeId = "pptx-" + Date.now().toString(36);
    settings.addCustomTheme({
      id: themeId,
      name: file.name.replace(/\.pptx$/i, "") + " theme",
      tokens: defaultTheme.tokens,
    });
    settings.setEditorTheme("custom:" + themeId);
    if (defaultTheme.majorFont) settings.setBrandKit({ headingFont: defaultTheme.majorFont });
    if (defaultTheme.minorFont) settings.setBrandKit({ bodyFont: defaultTheme.minorFont });
  }
}
