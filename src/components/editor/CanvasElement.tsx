import { useRef, useState, useEffect } from "react";
import {
  useEditor,
  UI_STYLE_THEMES,
  embedProvider,
  type AnyElement,
  type ShapeElement,
  type QuizElement,
  type ChartElement,
  type ButtonElement,
  type ElementShadow,
  DEFAULT_FILTERS,
  type ImageFilters,
  type ShapeGradient,
} from "@/store/editor";
import { ShapeRender } from "./ShapeRender";
import { pathFor } from "./ShapeRender";
import { UiRender } from "./UiRender";
import type { LucideProps } from "lucide-react";
import { LUCIDE_ICONS } from "@/lib/lucide-icons";
import { HelpCircle, Check, X as XIcon, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";

const svgFilterUrl = (inner: string) =>
  `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg"><filter id="f" x="0" y="0" width="100%" height="100%">${inner}</filter></svg>`,
  )}")`;

/** Advanced live effects as inline SVG filter primitives (order matters). */
const advancedEffects = (f?: ImageFilters): Array<{ key: string; inner: string }> => {
  const v = { ...DEFAULT_FILTERS, ...(f ?? {}) };
  const list: Array<{ key: string; inner: string }> = [];
  if ((v.posterize ?? 0) >= 2) {
    const n = Math.min(16, Math.round(v.posterize!));
    const steps = Array.from({ length: n }, (_, i) => (i / (n - 1)).toFixed(3)).join(" ");
    list.push({
      key: "posterize",
      inner: `<feComponentTransfer><feFuncR type="discrete" tableValues="${steps}"/><feFuncG type="discrete" tableValues="${steps}"/><feFuncB type="discrete" tableValues="${steps}"/></feComponentTransfer>`,
    });
  }
  if ((v.glitch ?? 0) > 0) {
    list.push({
      key: "glitch",
      inner: `<feTurbulence type="fractalNoise" baseFrequency="0.015 0.12" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${(v.glitch! * 0.9).toFixed(1)}" xChannelSelector="R" yChannelSelector="G"/>`,
    });
  }
  if ((v.pixelate ?? 0) >= 2) {
    const p = Math.min(40, Math.round(v.pixelate!));
    list.push({
      key: "pixelate",
      inner: `<feFlood x="${p / 2}" y="${p / 2}" height="${p}" width="${p}"/><feComposite width="${p * 2}" height="${p * 2}"/><feTile result="a"/><feComposite in="SourceGraphic" in2="a" operator="in"/><feMorphology operator="dilate" radius="${p / 2}"/>`,
    });
  }
  return list;
};

const filterCss = (f?: ImageFilters, advancedUrl?: (key: string, inner: string) => string) => {
  const v = { ...DEFAULT_FILTERS, ...(f ?? {}) };
  const temp = v.temperature ?? 0;
  const parts = [
    `brightness(${v.brightness}%) contrast(${v.contrast}%) saturate(${v.saturate}%) blur(${v.blur}px) grayscale(${v.grayscale}%) sepia(${v.sepia}%) hue-rotate(${v.hueRotate}deg) invert(${v.invert}%)`,
    // color grading: warm (+) / cool (−) temperature shift
    temp > 0 ? `sepia(${(temp * 0.35).toFixed(1)}%) saturate(106%)` : "",
    temp < 0 ? `hue-rotate(${(temp * 0.15).toFixed(1)}deg) saturate(110%)` : "",
  ];
  for (const e of advancedEffects(v)) {
    // Inline <filter> defs referenced by url(#id) are the reliable cross-browser
    // path; the data-URI form is only kept as fallback for callers without defs.
    parts.push(advancedUrl ? advancedUrl(e.key, e.inner) : svgFilterUrl(e.inner));
  }
  return parts.filter(Boolean).join(" ");
};

const shadowFilter = (s?: ElementShadow) =>
  s ? `drop-shadow(${s.x}px ${s.y}px ${s.blur}px ${s.color})` : "";

const maskClipPath = (kind?: string) => {
  const clips: Record<string, string> = {
    circle: "circle(50% at 50% 50%)",
    triangle: "polygon(50% 0%, 100% 100%, 0% 100%)",
    diamond: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
    hexagon: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
    pentagon: "polygon(50% 0%, 100% 35%, 80% 100%, 20% 100%, 0% 35%)",
    octagon: "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
    star: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 100%, 50% 73%, 21% 100%, 32% 57%, 2% 35%, 39% 35%)",
    // heart & blob intentionally omitted here: they fall through to the much
    // smoother vector paths from pathFor() (SVG clipPath fallback below).
  };
  return kind ? clips[kind] : undefined;
};

const gradientCss = (g: ShapeGradient) =>
  (g.type ?? "linear") === "radial"
    ? `radial-gradient(circle at 50% 50%, ${g.from}, ${g.to})`
    : `linear-gradient(${g.angle}deg, ${g.from}, ${g.to})`;

function shapeEffectStyle(el: ShapeElement): React.CSSProperties {
  const e = el.effect ?? "none";
  if (e === "liquid_glass") {
    return {
      backdropFilter: "blur(14px) saturate(160%)",
      WebkitBackdropFilter: "blur(14px) saturate(160%)",
      background:
        "linear-gradient(135deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.18) 100%)",
      boxShadow:
        "inset 1px 1px 1px rgba(255,255,255,0.55), inset -1px -1px 2px rgba(0,0,0,0.18), 0 18px 40px rgba(0,0,0,0.25)",
      borderRadius: el.shape === "circle" ? "50%" : 18,
      border: "1px solid rgba(255,255,255,0.45)",
    };
  }
  if (e === "neon") {
    return {
      filter: `drop-shadow(0 0 6px ${el.fill}) drop-shadow(0 0 18px ${el.fill}) drop-shadow(0 0 32px ${el.fill})`,
    };
  }
  if (e === "soft_shadow") {
    return { filter: "drop-shadow(0 18px 28px rgba(0,0,0,0.35))" };
  }
  if (e === "inner_glow") {
    return {
      boxShadow: `inset 0 0 40px ${el.fill}`,
      borderRadius: el.shape === "circle" ? "50%" : 12,
    };
  }
  return {};
}

type Handle = "nw" | "ne" | "sw" | "se";

/** PowerPoint-style crop rect: source-window edges cut away, as fractions of
 *  the source image (l/t/r/b, each 0..0.9). The window [l,1-r]x[t,1-b] is
 *  cover-fitted into the frame (like PPT srcRect), so dragging the crop
 *  handles changes the frame while the image content stays pixel-still. */
export type CropRect = { l: number; t: number; r: number; b: number };

/** Smart-crop ratio presets (Canva-style): refit the image frame to a fixed
 *  aspect ratio while keeping its center (the crop window cover-fits inside). */
const CROP_RATIOS: Array<{ label: string; r: number }> = [
  { label: "1:1", r: 1 },
  { label: "4:3", r: 4 / 3 },
  { label: "3:2", r: 3 / 2 },
  { label: "16:9", r: 16 / 9 },
  { label: "9:16", r: 9 / 16 },
];

/** Layout of the <img> when a cropRect is active. Returns the absolute
 *  width/height/left/top of the full-size image inside the frame. */
function cropRectLayout(
  el: {
    width: number;
    height: number;
    cropRect?: CropRect;
    cropZoom?: number;
    cropX?: number;
    cropY?: number;
    illustrationFormat?: string;
  },
  nat?: { w: number; h: number } | null,
) {
  const cr = el.cropRect;
  if (!nat || !cr) return null;
  if (!(cr.l > 0.0005 || cr.t > 0.0005 || cr.r > 0.0005 || cr.b > 0.0005)) return null;
  if (el.illustrationFormat === "svg") return null;
  const l = Math.max(0, Math.min(0.9, cr.l));
  const t = Math.max(0, Math.min(0.9, cr.t));
  const r = Math.max(0, Math.min(0.9 - l, cr.r));
  const b = Math.max(0, Math.min(0.9 - t, cr.b));
  const winW = Math.max(1e-6, nat.w * (1 - l - r));
  const winH = Math.max(1e-6, nat.h * (1 - t - b));
  const s = Math.max(el.width / winW, el.height / winH) * (el.cropZoom ?? 1);
  const imgW = nat.w * s;
  const imgH = nat.h * s;
  const wW = winW * s;
  const wH = winH * s;
  const offX = ((el.cropX ?? 50) / 100) * Math.max(0, wW - el.width);
  const offY = ((el.cropY ?? 50) / 100) * Math.max(0, wH - el.height);
  return { s, imgW, imgH, left: offX - l * imgW, top: offY - t * imgH };
}

/* ------------------------------------------------------------------ */
/* Present-mode entrance animations via the Web Animations API         */
/* ------------------------------------------------------------------ */

/** Convert a kebab-case CSS property to camelCase (WAAPI keyframe names). */
const camel = (prop: string) => prop.replace(/-(.)/g, (_, c: string) => c.toUpperCase());

/**
 * Read `@keyframes <name>` from the live stylesheets and convert the rule
 * into WAAPI keyframes. Present-mode entrance animations run through WAAPI
 * (not the CSS `animation` property) because the global reduced-motion
 * rule in styles.css forces `animation-duration: 0.01ms !important` on *,
 * which would kill CSS entrance animations even while presenting — and the
 * presenter explicitly chose to run an animated deck. WAAPI ignores that
 * rule. Returns null when the keyframes rule cannot be found.
 */
function cssKeyframes(name: string): Keyframe[] | null {
  const scan = (rules: CSSRuleList | null): Keyframe[] | null => {
    if (!rules) return null;
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSKeyframesRule) {
        if (rule.name !== name) continue;
        const frames: Keyframe[] = [];
        for (const kr of Array.from(rule.cssRules)) {
          if (!(kr instanceof CSSKeyframeRule)) continue;
          const offsets = kr.keyText
            .split(",")
            .map((s) => parseFloat(s))
            .filter((v) => Number.isFinite(v))
            .map((v) => Math.min(1, Math.max(0, v / 100)));
          if (!offsets.length) continue;
          const props: Record<string, string> = {};
          for (let i = 0; i < kr.style.length; i++) {
            const prop = kr.style.item(i);
            props[camel(prop)] = kr.style.getPropertyValue(prop);
          }
          for (const offset of offsets) frames.push({ ...props, offset });
        }
        frames.sort((a, b) => (a.offset ?? 0) - (b.offset ?? 0));
        return frames.length ? frames : null;
      }
      if ("cssRules" in rule) {
        const nested = scan((rule as CSSMediaRule).cssRules);
        if (nested) return nested;
      }
    }
    return null;
  };
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList | null = null;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // cross-origin sheet
    }
    const frames = scan(rules);
    if (frames) return frames;
  }
  return null;
}

export function CanvasElement({
  element,
  scale,
  morph = false,
  preview = false,
  replayEpoch = 0,
}: {
  element: AnyElement;
  scale: number;
  /** when true the node tweens position/size between slides (morph transition) */
  morph?: boolean;
  /** when true renders read-only (thumbnails): no selection outline or resize handles */
  preview?: boolean;
  /** bump to replay the entrance animation while presenting (key R) */
  replayEpoch?: number;
}) {
  const { selectedId, selectedIds, select, toggleSelect, update, setCurrentPage } = useEditor();
  const presenting = useEditor((s) => s.presenting);
  const page = useEditor((s) => s.pages[s.currentIndex]);
  const canvasW = useEditor((s) => s.canvasW);
  const canvasH = useEditor((s) => s.canvasH);
  const selected = !presenting && !preview && selectedIds.includes(element.id);
  // Interactive crop mode (double-click an image or press the Crop button).
  // The zustand hook MUST be called unconditionally — short-circuiting it with
  // && flips the hook count between renders (React error #311) as soon as
  // `presenting` or `preview` changes.
  const croppingId = useEditor((s) => s.croppingId);
  const cropping = !presenting && !preview && croppingId === element.id;
  // Natural size of the rendered image — needed to lay out PPT-style crop.
  const [natSize, setNatSize] = useState<{ w: number; h: number } | null>(null);
  const cropLayout = element.type === "image" ? cropRectLayout(element as never, natSize) : null;
  const ref = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [hovered, setHovered] = useState(false);

  // Live 3D tilt toward the cursor (presenting + hoverTilt enabled)
  const [tilt, setTilt] = useState<{ rx: number; ry: number } | null>(null);
  useEffect(() => {
    if (!element.hoverTilt || !presenting) return;
    const node = ref.current;
    if (!node) return;
    const onMove = (ev: MouseEvent) => {
      const r = node.getBoundingClientRect();
      const px = (ev.clientX - r.left) / r.width - 0.5; // -0.5..0.5
      const py = (ev.clientY - r.top) / r.height - 0.5;
      setTilt({ rx: -py * 24, ry: px * 24 }); // ±12deg max each way
    };
    const onLeave = () => setTilt(null);
    node.addEventListener("mousemove", onMove);
    node.addEventListener("mouseleave", onLeave);
    return () => {
      node.removeEventListener("mousemove", onMove);
      node.removeEventListener("mouseleave", onLeave);
    };
  }, [element.hoverTilt, presenting]);

  // Entrance animation (present mode). Two paths:
  //  • default: the inline CSS `animation` shorthand (applied in the style
  //    object below) — but that is clipped to 0.01ms by the global
  //    reduced-motion rule in styles.css.
  //  • reduced-motion presenters: the Web Animations API (cssKeyframes
  //    above) — WAAPI ignores the reduced-motion rule, so a deck the
  //    presenter chose to animate keeps playing.
  // Both paths replay on demand (press R / presenter Replay button).
  const entryShorthand =
    element.animation && element.animation !== "none"
      ? `el-${element.animation} 680ms cubic-bezier(0.22,1,0.36,1) ${Math.max(0, Math.min(10000, element.animationDelay ?? 0))}ms both`
      : undefined;
  const entryAnimRef = useRef<Animation | null>(null);
  const [useCssEntry, setUseCssEntry] = useState(
    () =>
      typeof window === "undefined" ||
      !window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches,
  );

  useEffect(() => {
    entryAnimRef.current?.cancel();
    entryAnimRef.current = null;
    if (!presenting || preview || morph) return;
    if (!entryShorthand) return;
    const node = ref.current;
    if (!node) return;
    const restartCss = () => {
      // Re-running a CSS animation requires a reflow between the two writes.
      if (!replayEpoch) return;
      node.style.animation = "none";
      void node.offsetWidth;
      node.style.animation = entryShorthand;
    };
    const reduced = !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (!reduced) {
      setUseCssEntry(true);
      restartCss();
      return;
    }
    const frames = cssKeyframes(`el-${element.animation}`);
    if (!frames) {
      // Keyframes unreadable — CSS fallback (clipped, but the element stays visible).
      setUseCssEntry(true);
      restartCss();
      return;
    }
    setUseCssEntry(false);
    entryAnimRef.current = node.animate(frames, {
      duration: 680,
      delay: Math.max(0, Math.min(10000, element.animationDelay ?? 0)),
      easing: "cubic-bezier(0.22,1,0.36,1)",
      fill: "both",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presenting, preview, morph, element.animation, replayEpoch]);

  const interaction = element.interaction;
  const activateInteraction = () => {
    if (!presenting || !interaction?.moveToSlide) return;
    setCurrentPage(Math.max(0, interaction.moveToSlide - 1));
  };

  const linkActive = element.type === "text" && !!element.href && presenting;

  // 3D transform chain: interactive tilt > static 3D angles > flat rotation.
  // Embeds (iframes) ignore 3D — tilting an iframe is unreliable across browsers.
  const allow3d = element.type !== "embed" && (element.perspective ?? 0) > 0;
  const transform = tilt
    ? `perspective(${element.perspective ?? 800}px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) rotate(${element.rotation}deg)`
    : allow3d
      ? `perspective(${element.perspective}px) rotateX(${element.rotateX ?? 0}deg) rotateY(${element.rotateY ?? 0}deg) rotate(${element.rotation}deg)`
      : `rotate(${element.rotation}deg)`;

  // Vector mask (clipped by a shape path, 0-100 viewBox scaled to the box).
  // Works for images (existing) and now text/shapes (clip on the root node).
  const maskPath = "maskShape" in element && element.maskShape ? pathFor(element.maskShape) : null;

  // Slide-background knockout fill — the element acts as a window on the page
  // background. backgroundPosition is offset by the element's own position so
  // the background "continues" the slide underneath (frosted-window effect).
  const useSlideBg = "fillSource" in element && element.fillSource === "slide-bg";
  const bgFill: React.CSSProperties | undefined = useSlideBg
    ? {
        backgroundImage: page.bgImage
          ? `url("${page.bgImage}")`
          : page.bgColor.includes("gradient(")
            ? page.bgColor
            : `linear-gradient(${page.bgColor}, ${page.bgColor})`,
        backgroundSize: `${canvasW}px ${canvasH}px`,
        backgroundPosition: `-${element.x}px -${element.y}px`,
        backgroundRepeat: "no-repeat",
      }
    : undefined;

  const onDragStart = (e: React.MouseEvent) => {
    if (editing) return;
    if (cropping) return; // in crop mode, dragging pans the image inside its frame
    if (presenting) return; // no selection/drag while presenting
    if (linkActive && !e.shiftKey) return; // let the <a> handle the click; shift+click selects
    e.stopPropagation();
    if (e.shiftKey) {
      toggleSelect(element.id);
      return;
    }
    if (!useEditor.getState().selectedIds.includes(element.id)) select(element.id);
    const startX = e.clientX;
    const startY = e.clientY;
    const ox = element.x;
    const oy = element.y;
    const st = useEditor.getState();
    const groupIds = st.selectedIds.includes(element.id) ? st.selectedIds : [element.id];
    const startPos = new Map(
      st.elements.filter((o) => groupIds.includes(o.id)).map((o) => [o.id, { x: o.x, y: o.y }]),
    );
    const W = st.canvasW;
    const H = st.canvasH;
    const w = element.width;
    const h = element.height;
    // collect snap targets from other elements + canvas
    const others = st.elements.filter((o) => o.id !== element.id);
    const vTargets: number[] = [0, W / 2, W];
    const hTargets: number[] = [0, H / 2, H];
    for (const o of others) {
      vTargets.push(o.x, o.x + o.width / 2, o.x + o.width);
      hTargets.push(o.y, o.y + o.height / 2, o.y + o.height);
    }
    const THRESH = 6 / scale;
    const snap = (val: number, targets: number[]): { v: number; hit: number | null } => {
      let best: { v: number; hit: number | null; d: number } = { v: val, hit: null, d: THRESH };
      for (const t of targets) {
        const d = Math.abs(val - t);
        if (d < best.d) best = { v: t, hit: t, d };
      }
      return { v: best.v, hit: best.hit };
    };
    const onMove = (m: MouseEvent) => {
      let nx = ox + (m.clientX - startX) / scale;
      let ny = oy + (m.clientY - startY) / scale;
      // try snap on each anchor: left, center, right (vertical lines) and top, mid, bottom (horizontal)
      const vHits = new Set<number>();
      const hHits = new Set<number>();
      const candidates: Array<{ anchor: number; kind: "v" | "h" }> = [
        { anchor: nx, kind: "v" },
        { anchor: nx + w / 2, kind: "v" },
        { anchor: nx + w, kind: "v" },
        { anchor: ny, kind: "h" },
        { anchor: ny + h / 2, kind: "h" },
        { anchor: ny + h, kind: "h" },
      ];
      // x snap
      let xShift = 0;
      let xDist = THRESH;
      for (const c of candidates.filter((c) => c.kind === "v")) {
        const s = snap(c.anchor, vTargets);
        if (s.hit !== null) {
          const d = Math.abs(s.v - c.anchor);
          if (d < xDist) {
            xDist = d;
            xShift = s.v - c.anchor;
          }
        }
      }
      nx += xShift;
      let yShift = 0;
      let yDist = THRESH;
      for (const c of candidates.filter((c) => c.kind === "h")) {
        const s = snap(c.anchor, hTargets);
        if (s.hit !== null) {
          const d = Math.abs(s.v - c.anchor);
          if (d < yDist) {
            yDist = d;
            yShift = s.v - c.anchor;
          }
        }
      }
      ny += yShift;
      // collect active guide lines for rendering
      const anchorsAfter = [
        { v: nx, k: "v" as const },
        { v: nx + w / 2, k: "v" as const },
        { v: nx + w, k: "v" as const },
        { v: ny, k: "h" as const },
        { v: ny + h / 2, k: "h" as const },
        { v: ny + h, k: "h" as const },
      ];
      for (const a of anchorsAfter) {
        const targets = a.k === "v" ? vTargets : hTargets;
        for (const t of targets) {
          if (Math.abs(a.v - t) < 0.5) {
            if (a.k === "v") vHits.add(t);
            else hHits.add(t);
          }
        }
      }
      useEditor.getState().setGuides({ v: [...vHits], h: [...hHits] });
      const dx = nx - ox;
      const dy = ny - oy;
      for (const [id, pos] of startPos) update(id, { x: pos.x + dx, y: pos.y + dy });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      useEditor.getState().setGuides({ v: [], h: [] });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const onResizeStart = (handle: Handle) => (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const { x, y, width, height } = element;
    // Smart-guide targets while resizing (same targets as dragging).
    const st = useEditor.getState();
    const others = st.elements.filter((o) => o.id !== element.id);
    const vTargets: number[] = [0, st.canvasW / 2, st.canvasW];
    const hTargets: number[] = [0, st.canvasH / 2, st.canvasH];
    for (const o of others) {
      vTargets.push(o.x, o.x + o.width / 2, o.x + o.width);
      hTargets.push(o.y, o.y + o.height / 2, o.y + o.height);
    }
    const THRESH = 6 / scale;
    const snapTo = (val: number, targets: number[]): { v: number; hit: number | null } => {
      let best: { v: number; hit: number | null; d: number } = { v: val, hit: null, d: THRESH };
      for (const t of targets) {
        const d = Math.abs(val - t);
        if (d < best.d) best = { v: t, hit: t, d };
      }
      return { v: best.v, hit: best.hit };
    };
    const onMove = (m: MouseEvent) => {
      const dx = (m.clientX - startX) / scale;
      const dy = (m.clientY - startY) / scale;
      let nx = x,
        ny = y,
        nw = width,
        nh = height;
      if (handle === "se") {
        nw = Math.max(20, width + dx);
        nh = Math.max(20, height + dy);
      }
      if (handle === "ne") {
        ny = y + dy;
        nh = Math.max(20, height - dy);
        nw = Math.max(20, width + dx);
      }
      if (handle === "sw") {
        nx = x + dx;
        nw = Math.max(20, width - dx);
        nh = Math.max(20, height + dy);
      }
      if (handle === "nw") {
        nx = x + dx;
        ny = y + dy;
        nw = Math.max(20, width - dx);
        nh = Math.max(20, height - dy);
      }
      // Snap the edges being resized onto nearby targets (other elements + canvas).
      const edgesV: Array<{ edge: "l" | "r"; pos: number }> = [];
      if (handle.includes("w")) edgesV.push({ edge: "l", pos: nx });
      if (handle.includes("e")) edgesV.push({ edge: "r", pos: nx + nw });
      const edgesH: Array<{ edge: "t" | "b"; pos: number }> = [];
      if (handle.includes("n")) edgesH.push({ edge: "t", pos: ny });
      if (handle.includes("s")) edgesH.push({ edge: "b", pos: ny + nh });
      const vHits = new Set<number>();
      const hHits = new Set<number>();
      let bestV: { edge: "l" | "r"; shift: number; hit: number } | null = null;
      for (const ed of edgesV) {
        const s = snapTo(ed.pos, vTargets);
        if (s.hit !== null && (bestV === null || Math.abs(s.v - ed.pos) < Math.abs(bestV.shift))) {
          bestV = { edge: ed.edge, shift: s.v - ed.pos, hit: s.hit };
        }
      }
      if (bestV) {
        if (bestV.edge === "l") {
          nx += bestV.shift;
          nw -= bestV.shift;
        } else {
          nw += bestV.shift;
        }
      }
      let bestH: { edge: "t" | "b"; shift: number; hit: number } | null = null;
      for (const ed of edgesH) {
        const s = snapTo(ed.pos, hTargets);
        if (s.hit !== null && (bestH === null || Math.abs(s.v - ed.pos) < Math.abs(bestH.shift))) {
          bestH = { edge: ed.edge, shift: s.v - ed.pos, hit: s.hit };
        }
      }
      if (bestH) {
        if (bestH.edge === "t") {
          ny += bestH.shift;
          nh -= bestH.shift;
        } else {
          nh += bestH.shift;
        }
      }
      nw = Math.max(20, nw);
      nh = Math.max(20, nh);
      if (bestV) vHits.add(bestV.hit);
      if (bestH) hHits.add(bestH.hit);
      useEditor.getState().setGuides({ v: [...vHits], h: [...hHits] });
      update(element.id, { x: nx, y: ny, width: nw, height: nh });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      useEditor.getState().setGuides({ v: [], h: [] });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  useEffect(() => {
    if (!selected) {
      setEditing(false);
      if (useEditor.getState().croppingId === element.id) useEditor.getState().setCroppingId(null);
    }
  }, [selected]);

  // Crop mode: Escape exits
  useEffect(() => {
    if (!cropping) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") useEditor.getState().setCroppingId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cropping]);

  // Crop mode: wheel zooms the image inside its frame (like other slide editors)
  useEffect(() => {
    if (!cropping) return;
    const node = ref.current;
    if (!node) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const el = useEditor.getState().elements.find((x) => x.id === element.id);
      if (!el || el.type !== "image") return;
      const next = Math.max(1, Math.min(4, (el.cropZoom ?? 1) * (1 - e.deltaY * 0.0015)));
      useEditor.getState().update(element.id, { cropZoom: Math.round(next * 100) / 100 });
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [cropping, element.id]);

  // Crop mode: drag pans the image inside its frame (focal point follows)
  const onCropPanStart = (e: React.MouseEvent) => {
    if (!cropping) return;
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const el0 = useEditor.getState().elements.find((x) => x.id === element.id);
    if (!el0 || el0.type !== "image") return;
    const zoom = el0.cropZoom ?? 1;
    const cx0 = el0.cropX ?? 50;
    const cy0 = el0.cropY ?? 50;
    const flipX = el0.flipX ? -1 : 1;
    const onMove = (m: MouseEvent) => {
      const dx = (m.clientX - startX) / scale;
      const dy = (m.clientY - startY) / scale;
      const px = (100 * flipX * dx) / Math.max(1, el0.width * zoom);
      const py = (100 * dy) / Math.max(1, el0.height * zoom);
      useEditor.getState().update(element.id, {
        cropX: Math.round(Math.max(0, Math.min(100, cx0 - px))),
        cropY: Math.round(Math.max(0, Math.min(100, cy0 - py))),
      });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // Crop mode: corner handles behave like PowerPoint — dragging them crops
  // the frame while the image content stays perfectly in place (srcRect math).
  const onCropHandleStart = (handle: Handle) => (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (element.type !== "image") return;
    const img = ref.current?.querySelector("img");
    const iw = img?.naturalWidth || natSize?.w || 0;
    const ih = img?.naturalHeight || natSize?.h || 0;
    if (!iw || !ih) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const x0 = element.x,
      y0 = element.y,
      W0 = element.width,
      H0 = element.height;
    const c0: CropRect = {
      l: element.cropRect?.l ?? 0,
      t: element.cropRect?.t ?? 0,
      r: element.cropRect?.r ?? 0,
      b: element.cropRect?.b ?? 0,
    };
    const winW = Math.max(1e-6, iw * (1 - c0.l - c0.r));
    const winH = Math.max(1e-6, ih * (1 - c0.t - c0.b));
    const s = Math.max(W0 / winW, H0 / winH) * (element.cropZoom ?? 1);
    const imgW = iw * s;
    const imgH = ih * s;
    const onMove = (m: MouseEvent) => {
      const dx = (m.clientX - startX) / scale;
      const dy = (m.clientY - startY) / scale;
      let nx = x0,
        ny = y0,
        nw = W0,
        nh = H0;
      const cr: CropRect = { ...c0 };
      if (handle.includes("w")) {
        // left edge: inward (dx > 0) crops more, outward restores (down to l = 0)
        const d = Math.max(-c0.l * imgW, Math.min(dx, W0 - 20));
        nx = x0 + d;
        nw = W0 - d;
        cr.l = Math.max(0, Math.min(0.9, c0.l + d / imgW));
      }
      if (handle.includes("e")) {
        const d = Math.max(-(W0 - 20), Math.min(dx, -c0.r * imgW));
        nw = W0 + d;
        cr.r = Math.max(0, Math.min(0.9, c0.r - d / imgW));
      }
      if (handle.includes("n")) {
        const d = Math.max(-c0.t * imgH, Math.min(dy, H0 - 20));
        ny = y0 + d;
        nh = H0 - d;
        cr.t = Math.max(0, Math.min(0.9, c0.t + d / imgH));
      }
      if (handle.includes("s")) {
        const d = Math.max(-(H0 - 20), Math.min(dy, -c0.b * imgH));
        nh = H0 + d;
        cr.b = Math.max(0, Math.min(0.9, c0.b - d / imgH));
      }
      update(element.id, { x: nx, y: ny, width: nw, height: nh, cropRect: cr } as never);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // Smart-crop: refit the frame to a fixed aspect ratio, keeping its center.
  const applyCropRatio = (r: number) => (e: React.MouseEvent) => {
    e.stopPropagation();
    const W = element.width;
    const H = element.height;
    const cur = W / H;
    let nw = W;
    let nh = H;
    if (r > cur) nh = Math.max(20, W / r);
    else nw = Math.max(20, H * r);
    update(element.id, {
      x: element.x + (W - nw) / 2,
      y: element.y + (H - nh) / 2,
      width: nw,
      height: nh,
    } as never);
  };

  return (
    <div
      ref={ref}
      data-canvas-element="true"
      onMouseDown={onDragStart}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(event) => {
        if (presenting && interaction?.moveToSlide) {
          event.stopPropagation();
          activateInteraction();
        }
      }}
      onDoubleClick={(e) => {
        if (element.type === "text") {
          e.stopPropagation();
          setEditing(true);
        }
        if (element.type === "image" && !presenting) {
          e.stopPropagation();
          useEditor.getState().setCroppingId(element.id);
        }
      }}
      className={
        [
          !morph && element.animation && element.animation !== "none"
            ? `el-anim-${element.animation}`
            : "",
          hovered && interaction?.hoverEffect === "glitch" ? "el-hover-glitch" : "",
        ]
          .filter(Boolean)
          .join(" ") || undefined
      }
      style={{
        position: "absolute",
        left: morph ? 0 : element.x,
        top: morph ? 0 : element.y,
        width: element.width,
        height: element.height,
        transform,
        transformStyle: allow3d || tilt ? "preserve-3d" : undefined,
        animation: useCssEntry && presenting && !preview && !morph ? entryShorthand : undefined,
        transition: morph
          ? undefined
          : element.hoverTilt && presenting
            ? tilt === null
              ? "transform 420ms cubic-bezier(0.22,1,0.36,1)"
              : "transform 60ms linear"
            : undefined,
        cursor: editing ? "text" : "move",
        mixBlendMode:
          element.blendMode && element.blendMode !== "normal"
            ? (element.blendMode as React.CSSProperties["mixBlendMode"])
            : undefined,
        outline: selected ? "3px solid #2b6cff" : "none",
        outlineOffset: "2px",
        filter:
          element.shadow && !["text", "shape", "button"].includes(element.type)
            ? shadowFilter(element.shadow)
            : undefined,
        // Text/shape masks clip the whole element box (images keep their own clip)
        clipPath:
          maskPath && element.type !== "image" ? `url("#el-mask-${element.id}")` : undefined,
      }}
    >
      {/* Shared SVG clip definition for text/shape masks */}
      {maskPath && element.type !== "image" && (
        <svg aria-hidden="true" width={0} height={0} style={{ position: "absolute" }}>
          <defs>
            <clipPath id={`el-mask-${element.id}`} clipPathUnits="objectBoundingBox">
              <path d={maskPath} transform="scale(0.01)" />
            </clipPath>
          </defs>
        </svg>
      )}
      {element.type === "text" &&
        (() => {
          const presenting = useEditor.getState().presenting;
          const display =
            element.bullet && !editing
              ? (element.text || "")
                  .split("\n")
                  .map((l) => (l.trim() ? `• ${l}` : l))
                  .join("\n")
              : element.text;
          const isLink = !!element.href && presenting;
          // Slide-bg knockout: text becomes a window on the page background.
          // Disabled while editing so the caret and typed text stay visible.
          const knockout = useSlideBg && !editing;
          const textStyle: React.CSSProperties = {
            width: "100%",
            height: "100%",
            fontSize: element.fontSize,
            color: knockout
              ? "transparent"
              : element.gradient ||
                  element.imageOverlay ||
                  (hovered && interaction?.hoverEffect === "gradient" && interaction.hoverGradient)
                ? "transparent"
                : hovered && interaction?.hoverEffect === "color"
                  ? (interaction.hoverColor ?? element.color)
                  : element.color,
            backgroundImage: knockout
              ? bgFill!.backgroundImage
              : element.imageOverlay
                ? `url("${element.imageOverlay}")`
                : element.gradient
                  ? gradientCss(element.gradient)
                  : hovered && interaction?.hoverEffect === "gradient" && interaction.hoverGradient
                    ? gradientCss(interaction.hoverGradient)
                    : undefined,
            backgroundSize: knockout
              ? bgFill!.backgroundSize
              : element.imageOverlay
                ? "cover"
                : undefined,
            backgroundPosition: knockout
              ? bgFill!.backgroundPosition
              : element.imageOverlay
                ? "center"
                : undefined,
            backgroundRepeat: knockout ? "no-repeat" : undefined,
            backgroundClip: knockout
              ? "text"
              : element.gradient ||
                  element.imageOverlay ||
                  (hovered && interaction?.hoverEffect === "gradient" && interaction.hoverGradient)
                ? "text"
                : undefined,
            WebkitBackgroundClip: knockout
              ? "text"
              : element.gradient ||
                  element.imageOverlay ||
                  (hovered && interaction?.hoverEffect === "gradient" && interaction.hoverGradient)
                ? "text"
                : undefined,
            WebkitTextFillColor: knockout
              ? "transparent"
              : element.gradient ||
                  element.imageOverlay ||
                  (hovered && interaction?.hoverEffect === "gradient" && interaction.hoverGradient)
                ? "transparent"
                : undefined,
            fontWeight: element.fontWeight,
            fontFamily: element.fontFamily,
            textAlign: element.align,
            fontStyle: element.italic ? "italic" : "normal",
            textDecoration: element.underline || isLink ? "underline" : "none",
            outline: "none",
            lineHeight: element.lineHeight ?? 1.15,
            letterSpacing: `${element.letterSpacing ?? -0.02}em`,
            textTransform: element.textTransform ?? "none",
            opacity: element.opacity ?? 1,
            textShadow: element.shadow
              ? `${element.shadow.x}px ${element.shadow.y}px ${element.shadow.blur}px ${element.shadow.color}`
              : undefined,
            wordBreak: "break-word",
            whiteSpace: "pre-wrap",
            transition: morph
              ? "font-size 620ms cubic-bezier(0.22,1,0.36,1), color 620ms ease, letter-spacing 620ms ease, opacity 320ms ease"
              : undefined,
          };
          const inner = (
            <div
              contentEditable={editing}
              suppressContentEditableWarning
              onBlur={(e) => {
                update(element.id, { text: e.currentTarget.innerText || "" });
                setEditing(false);
              }}
              style={textStyle}
            >
              {display}
            </div>
          );
          if (isLink) {
            return (
              <a
                href={element.href}
                target="_blank"
                rel="noopener noreferrer"
                onMouseDown={(e) => e.stopPropagation()}
                style={{ display: "block", width: "100%", height: "100%", color: "inherit" }}
              >
                {inner}
              </a>
            );
          }
          return inner;
        })()}
      {element.type === "shape" &&
        (() => {
          const fx = shapeEffectStyle(element);
          const sFilter = shadowFilter(element.shadow);
          const isOverlay = element.effect === "liquid_glass" || element.effect === "inner_glow";
          return (
            <div
              style={{
                position: "absolute",
                inset: 0,
                ...fx,
                filter: [
                  fx.filter,
                  sFilter,
                  element.feather ? `blur(${element.feather}px)` : "",
                ]
                  .filter(Boolean)
                  .join(" ") || undefined,
              }}
            >
              {/* Slide-bg knockout: an overlay clipped by the shape's own
                  silhouette, painted with the page background (aligned). */}
              {useSlideBg && (
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    inset: 0,
                    ...bgFill,
                    clipPath: `url("#shape-silhouette-${element.id}")`,
                  }}
                />
              )}
              {!isOverlay && (
                <ShapeRender
                  element={element}
                  fillOverride={useSlideBg ? "transparent" : undefined}
                />
              )}
            </div>
          );
        })()}
      {/* Silhouette clip for the slide-bg shape fill */}
      {element.type === "shape" && useSlideBg && (
        <svg aria-hidden="true" width={0} height={0} style={{ position: "absolute" }}>
          <defs>
            <clipPath id={`shape-silhouette-${element.id}`} clipPathUnits="objectBoundingBox">
              <path d={pathFor(element.shape) ?? undefined} transform="scale(0.01)" />
            </clipPath>
          </defs>
        </svg>
      )}
      {element.type === "video" && (
        <video
          src={element.src}
          poster={element.poster}
          muted={element.muted ?? true}
          loop={element.loop ?? true}
          autoPlay
          playbackRate={element.rate ?? 1}
          playsInline
          controls={useEditor.getState().presenting}
          onLoadedMetadata={(e) => {
            // trim window: start playback at "start"
            if (element.start !== undefined && e.currentTarget.currentTime < element.start) {
              e.currentTarget.currentTime = element.start;
            }
          }}
          onTimeUpdate={(e) => {
            // trim window: loop (or pause) when reaching "end"
            const v = e.currentTarget;
            const s = element.start ?? 0;
            const t = element.end;
            if (t !== undefined && t > s && v.currentTime >= t) {
              if (v.loop) v.currentTime = s;
              else v.pause();
            }
          }}
          style={{
            width: "100%",
            height: "100%",
            objectFit: element.fit ?? "cover",
            display: "block",
            borderRadius: 0,
          }}
        />
      )}
      {element.type === "image" && element.src.toLowerCase().startsWith("data:video/") && (
        <video
          src={element.src}
          autoPlay
          loop
          muted
          playsInline
          controls={useEditor.getState().presenting}
          style={{
            width: "100%",
            height: "100%",
            objectFit: element.fit ?? "cover",
            display: "block",
          }}
        />
      )}
      {element.type === "image" && !element.src.toLowerCase().startsWith("data:video/") && (
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            borderRadius: maskPath ? 0 : (element.cornerRadius ?? 0),
            overflow: "hidden",
            clipPath:
              maskClipPath(element.maskShape) ??
              (maskPath ? `url("#img-mask-${element.id}")` : undefined),
            border:
              !maskPath && element.borderWidth && element.borderWidth > 0
                ? `${element.borderWidth}px solid ${element.borderColor ?? "#000000"}`
                : undefined,
            boxSizing: "border-box",
            opacity: element.opacity ?? 1,
          }}
        >
          {/* SVG clip definition for the shape mask */}
          {maskPath && (
            <svg aria-hidden="true" width={0} height={0} style={{ position: "absolute" }}>
              <defs>
                <clipPath id={`img-mask-${element.id}`} clipPathUnits="objectBoundingBox">
                  <path d={maskPath} transform="scale(0.01)" />
                </clipPath>
              </defs>
            </svg>
          )}
          {/* Inline SVG filter defs for advanced effects (glitch, pixelate, posterize).
              Referenced as url(#img-fx-…) — far more reliable than data-URI filters. */}
          {advancedEffects(element.filters).length > 0 && (
            <svg aria-hidden="true" width={0} height={0} style={{ position: "absolute" }}>
              <defs>
                {advancedEffects(element.filters).map((e) => (
                  <filter
                    key={e.key}
                    id={`img-fx-${element.id}-${e.key}`}
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    dangerouslySetInnerHTML={{ __html: e.inner }}
                  />
                ))}
              </defs>
            </svg>
          )}
          {element.illustrationFormat === "svg" && element.tint ? (
            <div
              aria-hidden="true"
              style={{
                width: "100%",
                height: "100%",
                backgroundColor: element.tint,
                WebkitMaskImage: `url("${element.src}")`,
                maskImage: `url("${element.src}")`,
                WebkitMaskSize: element.fit === "contain" ? "contain" : "100% 100%",
                maskSize: element.fit === "contain" ? "contain" : "100% 100%",
                WebkitMaskPosition: "center",
                maskPosition: "center",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                transform: `scale(${element.flipX ? -1 : 1}, ${element.flipY ? -1 : 1})`,
                filter: [filterCss(element.filters, (key) => `url("#img-fx-${element.id}-${key}")`)]
                  .filter(Boolean)
                  .join(" "),
                opacity: element.opacity ?? 1,
              }}
            />
          ) : (
            <img
              src={element.src}
              alt=""
              onError={() => {
                if (element.illustrationFormat === "png" && element.src.endsWith(".png")) {
                  update(element.id, {
                    src: element.src.replace(/\.png$/i, ".svg"),
                    illustrationFormat: "svg",
                  });
                }
              }}
              draggable={false}
              onLoad={(e) => {
                const im = e.currentTarget;
                if (im.naturalWidth && im.naturalHeight) {
                  setNatSize({ w: im.naturalWidth, h: im.naturalHeight });
                }
              }}
              style={{
                ...(cropLayout
                  ? {
                      position: "absolute",
                      width: cropLayout.imgW,
                      height: cropLayout.imgH,
                      left: cropLayout.left,
                      top: cropLayout.top,
                      maxWidth: "none",
                      display: "block",
                      transformOrigin: "50% 50%",
                      transform: `scale(${element.flipX ? -1 : 1}, ${element.flipY ? -1 : 1})`,
                    }
                  : {
                      width: "100%",
                      height: "100%",
                      objectFit: element.fit ?? "cover",
                      objectPosition: `${element.cropX ?? 50}% ${element.cropY ?? 50}%`,
                      display: "block",
                      transformOrigin: `${element.cropX ?? 50}% ${element.cropY ?? 50}%`,
                      transform: `scale(${(element.flipX ? -1 : 1) * (element.cropZoom ?? 1)}, ${(element.flipY ? -1 : 1) * (element.cropZoom ?? 1)})`,
                    }),
                filter: [
                  element.assetKind === "icon" && element.tint
                    ? `brightness(0) drop-shadow(0 0 0 ${element.tint})`
                    : "",
                  filterCss(element.filters, (key) => `url("#img-fx-${element.id}-${key}")`),
                ]
                  .filter(Boolean)
                  .join(" "),
              }}
            />
          )}
          {/* color grading — tint wash (kept live on the slide) */}
          {element.filters?.tintColor && (element.filters.tintOpacity ?? 0) > 0 && (
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                background: element.filters.tintColor,
                opacity: (element.filters.tintOpacity ?? 0) / 100,
                mixBlendMode: "multiply",
              }}
            />
          )}
          {element.gradient && (
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                opacity: element.gradientOpacity ?? 0.5,
                background:
                  (element.gradient.type ?? "linear") === "radial"
                    ? `radial-gradient(circle at 50% 50%, ${element.gradient.from}, ${element.gradient.to})`
                    : `linear-gradient(${element.gradient.angle}deg, ${element.gradient.from}, ${element.gradient.to})`,
                // Clip the treatment to the source image alpha instead of tinting
                // the full rectangular image box.
                maskImage: `url("${element.src}")`,
                maskSize: "100% 100%",
                maskPosition: "center",
                maskRepeat: "no-repeat",
                WebkitMaskImage: `url("${element.src}")`,
                WebkitMaskSize: "100% 100%",
                WebkitMaskPosition: "center",
                WebkitMaskRepeat: "no-repeat",
                pointerEvents: "none",
              }}
            />
          )}
          {/* Interactive crop overlay — drag to pan, wheel to zoom,
              corner handles crop like PowerPoint (frame shrinks, image stays). */}
          {cropping && (
            <div
              onMouseDown={onCropPanStart}
              style={{
                position: "absolute",
                inset: 0,
                cursor: "grab",
                touchAction: "none",
                boxShadow: "inset 0 0 0 2px #ffd84a",
                outline: "1px solid rgba(255,216,74,0.35)",
                outlineOffset: "-1px",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: "33.333%",
                  top: 0,
                  bottom: 0,
                  width: 1,
                  background: "rgba(255,255,255,0.55)",
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: "66.667%",
                  top: 0,
                  bottom: 0,
                  width: 1,
                  background: "rgba(255,255,255,0.55)",
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: "33.333%",
                  left: 0,
                  right: 0,
                  height: 1,
                  background: "rgba(255,255,255,0.55)",
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: "66.667%",
                  left: 0,
                  right: 0,
                  height: 1,
                  background: "rgba(255,255,255,0.55)",
                  pointerEvents: "none",
                }}
              />
              <div
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  position: "absolute",
                  top: 10,
                  left: "50%",
                  transform: "translateX(-50%)",
                  display: "flex",
                  gap: 6,
                  whiteSpace: "nowrap",
                  zIndex: 2,
                }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    useEditor.getState().setCroppingId(null);
                  }}
                  style={{
                    border: "2px solid #0a0f1f",
                    background: "#ffd84a",
                    color: "#0a0f1f",
                    fontWeight: 800,
                    fontSize: 11,
                    padding: "5px 12px",
                    borderRadius: 8,
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
                  }}
                >
                  ✓ Terminé
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    useEditor
                      .getState()
                      .update(element.id, {
                        cropZoom: 1,
                        cropX: 50,
                        cropY: 50,
                        cropRect: undefined,
                      });
                  }}
                  style={{
                    border: "2px solid #0a0f1f",
                    background: "#ffffff",
                    color: "#0a0f1f",
                    fontWeight: 700,
                    fontSize: 11,
                    padding: "5px 12px",
                    borderRadius: 8,
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
                  }}
                >
                  Réinitialiser
                </button>
              </div>
              <div
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  position: "absolute",
                  top: 48,
                  left: "50%",
                  transform: "translateX(-50%)",
                  display: "flex",
                  gap: 4,
                  whiteSpace: "nowrap",
                  zIndex: 2,
                }}
              >
                {CROP_RATIOS.map((c) => {
                  const active = Math.abs(element.width / element.height - c.r) < 0.005;
                  return (
                    <button
                      key={c.label}
                      type="button"
                      onClick={applyCropRatio(c.r)}
                      style={{
                        border: "2px solid #0a0f1f",
                        background: active ? "#ffd84a" : "#ffffff",
                        color: "#0a0f1f",
                        fontWeight: active ? 800 : 700,
                        fontSize: 10,
                        padding: "4px 8px",
                        borderRadius: 7,
                        cursor: "pointer",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
                      }}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
      {element.type === "icon" &&
        (() => {
          if (element.src) {
            return (
              <div
                aria-hidden="true"
                style={{
                  width: "100%",
                  height: "100%",
                  display: "block",
                  backgroundColor: element.color,
                  maskImage: `url("${element.src}")`,
                  maskSize: "contain",
                  maskPosition: "center",
                  maskRepeat: "no-repeat",
                  WebkitMaskImage: `url("${element.src}")`,
                  WebkitMaskSize: "contain",
                  WebkitMaskPosition: "center",
                  WebkitMaskRepeat: "no-repeat",
                  opacity: 1,
                }}
              />
            );
          }
          const Comp =
            (LUCIDE_ICONS as unknown as Record<string, React.ComponentType<LucideProps>>)[
              element.name
            ] ?? HelpCircle;
          return (
            <Comp
              color={element.color}
              strokeWidth={element.strokeWidth}
              style={{ width: "100%", height: "100%", display: "block" }}
            />
          );
        })()}
      {element.type === "quiz" &&
        (() => {
          const presenting = useEditor.getState().presenting;
          return <QuizRender element={element} interactive={presenting} />;
        })()}

      {element.type === "chart" && <ChartRender element={element} />}
      {element.type === "ui" && <UiRender element={element} />}
      {element.type === "button" &&
        (() => {
          const presenting = useEditor.getState().presenting;
          return <ButtonRender element={element} interactive={presenting} />;
        })()}
      {element.type === "embed" &&
        (() => {
          const presenting = useEditor.getState().presenting;
          return (
            <div
              style={{ width: "100%", height: "100%", position: "relative", background: "#0a0f1f" }}
            >
              <iframe
                className="embed-live"
                src={element.src}
                title={element.title || "Embed"}
                allow={element.allow}
                allowFullScreen
                style={{
                  width: "100%",
                  height: "100%",
                  border: 0,
                  display: "block",
                  background: "#000",
                }}
              />
              {/* Static fallback card — hidden while editing/presenting, shown
                  during PNG/JPG/PDF/GIF capture because html-to-image cannot
                  rasterize cross-origin iframes. Driven purely by CSS
                  (#canvas-export[data-exporting]) so no React state is needed. */}
              <div
                className="embed-fallback"
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "none",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  padding: "6%",
                  boxSizing: "border-box",
                  background: "linear-gradient(150deg, #101828 0%, #1d2939 100%)",
                  border: "2px solid #344054",
                  borderRadius: 14,
                  color: "#ffffff",
                  fontFamily: "Inter, system-ui, sans-serif",
                  textAlign: "center",
                  overflow: "hidden",
                }}
              >
                <div style={{ fontSize: "min(72px, 22%)", lineHeight: 1 }}>
                  {embedProvider(element.src).emoji}
                </div>
                <div
                  style={{ fontSize: "max(18px, 7%)", fontWeight: 800, letterSpacing: "-0.01em" }}
                >
                  {element.title || embedProvider(element.src).label}
                </div>
                <div
                  style={{
                    fontSize: "max(12px, 3.5%)",
                    color: "#94a3b8",
                    wordBreak: "break-all",
                    lineHeight: 1.5,
                    maxWidth: "92%",
                  }}
                >
                  {element.src}
                </div>
                <div
                  style={{
                    marginTop: 6,
                    border: "2px solid #7df9ff",
                    borderRadius: 999,
                    padding: "6px 18px",
                    fontSize: "max(11px, 3.2%)",
                    fontWeight: 700,
                    color: "#7df9ff",
                    letterSpacing: "0.08em",
                  }}
                >
                  ▶ OPEN LINK
                </div>
              </div>
              {!presenting && (
                <div
                  // Overlay lets the editor select/drag; iframe still visible but not interactive.
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "transparent",
                    cursor: "move",
                  }}
                />
              )}
            </div>
          );
        })()}

      {selected && !editing && (
        <>
          {(["nw", "ne", "sw", "se"] as Handle[]).map((h) => (
            <div
              key={h}
              onMouseDown={
                cropping && element.type === "image" ? onCropHandleStart(h) : onResizeStart(h)
              }
              style={{
                position: "absolute",
                width: cropping ? 24 : 18,
                height: cropping ? 24 : 18,
                background: cropping ? "#0a0f1f" : "#ffd84a",
                border: cropping ? "3px solid #ffffff" : "3px solid #0a0f1f",
                ...(h.includes("n") ? { top: -10 } : { bottom: -10 }),
                ...(h.includes("w") ? { left: -10 } : { right: -10 }),
                cursor: `${h}-resize`,
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}

function QuizRender({ element, interactive }: { element: QuizElement; interactive: boolean }) {
  const [picked, setPicked] = useState<string | null>(null);
  const theme = element.uiStyle ? UI_STYLE_THEMES[element.uiStyle] : undefined;
  const isPoll = element.mode === "poll";
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [qrOpen, setQrOpen] = useState(false);
  const chanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const votesRef = useRef(votes);
  votesRef.current = votes;
  const elRef = useRef(element);
  elRef.current = element;
  const interactiveRef = useRef(interactive);
  interactiveRef.current = interactive;
  const pollUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/v/${element.liveKey ?? element.id}`
      : "";

  // Live poll sync over supabase realtime broadcast: editor/presenter windows
  // AND the /v/$key audience page share the same channel. The presenting window
  // answers "hello" with question + tally so late joiners catch up instantly.
  useEffect(() => {
    if (!isPoll) return;
    const chan = supabase.channel("poll-" + (element.liveKey ?? element.id));
    chanRef.current = chan;
    chan
      .on("broadcast", { event: "vote" }, ({ payload }: any) => {
        const optionId = payload?.optionId;
        if (optionId) setVotes((v) => ({ ...v, [optionId]: (v[optionId] ?? 0) + 1 }));
      })
      .on("broadcast", { event: "reset" }, () => setVotes({}))
      .on("broadcast", { event: "tally" }, ({ payload }: any) => {
        if (payload?.votes) setVotes(payload.votes);
      })
      .on("broadcast", { event: "hello" }, () => {
        if (!interactiveRef.current) return;
        const el = elRef.current;
        chan.send({
          type: "broadcast",
          event: "state",
          payload: {
            question: el.question,
            options: el.options.map((o) => ({ id: o.id, text: o.text })),
          },
        });
        chan.send({ type: "broadcast", event: "tally", payload: { votes: votesRef.current } });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(chan);
      chanRef.current = null;
    };
  }, [isPoll, element.liveKey, element.id]);

  useEffect(() => {
    if (!interactive) {
      setPicked(null);
      setVotes({});
    }
  }, [interactive, element.id]);

  const total = Object.values(votes).reduce((a, b) => a + b, 0);
  const castVote = (optionId: string) => {
    if (!interactive || picked) return;
    setPicked(optionId);
    setVotes((v) => ({ ...v, [optionId]: (v[optionId] ?? 0) + 1 }));
    chanRef.current?.send({ type: "broadcast", event: "vote", payload: { optionId } });
  };
  const resetPoll = () => {
    setPicked(null);
    setVotes({});
    chanRef.current?.send({ type: "broadcast", event: "reset", payload: {} });
  };

  const glassStyle =
    element.effect === "liquid_glass"
      ? {
          backdropFilter: "blur(14px) saturate(160%)",
          WebkitBackdropFilter: "blur(14px) saturate(160%)",
          background: "linear-gradient(135deg, rgba(255,255,255,0.32), rgba(255,255,255,0.08))",
          boxShadow: "inset 1px 1px 1px rgba(255,255,255,0.55), 0 18px 40px rgba(0,0,0,0.22)",
        }
      : {};

  // ---- Theme-driven styling: question + answer cards follow the UI style ----
  const accent = element.accentColor;
  const onAccent = theme?.onAccent ?? "#ffffff";
  const font = theme?.font ?? "Inter, system-ui, sans-serif";
  const uppercaseText = theme?.uppercase ? ("uppercase" as const) : ("none" as const);
  const tracking = theme?.letterSpacing ?? "0em";
  const optRadius = Math.max(4, Math.round((theme?.radius ?? 14) * 0.75));
  const optBg = theme
    ? theme.dark
      ? "rgba(255,255,255,0.07)"
      : "rgba(255,255,255,0.85)"
    : "rgba(255,255,255,0.06)";
  const optBorder = theme?.border ?? "rgba(255,255,255,0.18)";
  const optBorderWidth = theme ? Math.max(1, theme.borderWidth) : 2;
  // signature detail per UI style so each theme reads instantly on the answers
  const flair: Record<string, React.CSSProperties> = {
    neobrutalist: { boxShadow: "4px 4px 0 0 " + (theme?.border ?? "#0a0a0a") },
    cyber: { boxShadow: "0 0 12px " + accent + "44" },
    matrix: { boxShadow: "0 0 10px " + accent + "33" },
    vapor: { boxShadow: "0 0 16px " + accent + "55" },
    swiss: { borderLeft: "6px solid " + accent },
    xp: { boxShadow: "inset -1px -1px 0 #808080, inset 1px 1px 0 #ffffff" },
    glass: {
      backdropFilter: "blur(10px) saturate(150%)",
      WebkitBackdropFilter: "blur(10px) saturate(150%)",
    },
    aqua: { boxShadow: "0 4px 14px rgba(15,23,42,0.10)" },
    material: { boxShadow: "0 1px 2px rgba(0,0,0,0.30), 0 2px 8px rgba(0,0,0,0.12)" },
    midnight: { boxShadow: "0 6px 18px rgba(0,0,0,0.35)" },
    pastel: { boxShadow: "0 6px 14px rgba(244,143,177,0.28)" },
    sketch: { borderStyle: "dashed" },
  };
  const optFlair = element.uiStyle ? (flair[element.uiStyle] ?? {}) : {};

  // A/B/C/D letter chip, tinted by the current theme's accent.
  const LetterChip = ({ i, solid }: { i: number; solid: boolean }) => (
    <span
      aria-hidden="true"
      style={{
        display: "inline-grid",
        placeItems: "center",
        width: "1.9em",
        height: "1.9em",
        flexShrink: 0,
        borderRadius: Math.max(2, Math.round(optRadius * 0.6)),
        background: solid ? "rgba(0,0,0,0.22)" : accent,
        color: onAccent,
        fontSize: "0.72em",
        fontWeight: 800,
        letterSpacing: 0,
        fontFamily: font,
      }}
    >
      {String.fromCharCode(65 + i)}
    </span>
  );

  return (
    <div
      onMouseDown={(e) => interactive && e.stopPropagation()}
      onClick={(e) => interactive && e.stopPropagation()}
      style={{
        ...glassStyle,
        position: "relative",
        width: "100%",
        height: "100%",
        background:
          element.effect === "liquid_glass" && !theme
            ? "linear-gradient(135deg, rgba(255,255,255,0.28), rgba(255,255,255,0.08))"
            : element.bgColor,
        color: element.fgColor,
        padding: "5%",
        display: "flex",
        flexDirection: "column",
        gap: "4%",
        border: (theme?.borderWidth ?? 3) + "px solid " + (theme?.border ?? element.accentColor),
        borderRadius: theme?.radius ?? 18,
        boxShadow: theme?.shadow,
        fontFamily: font,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          fontSize: "max(20px, 5%)",
          fontWeight: 800,
          lineHeight: 1.2,
          fontFamily: font,
          letterSpacing: tracking,
          textTransform: uppercaseText,
          color: theme?.fg ?? element.fgColor,
          display: "flex",
          alignItems: "center",
          gap: "3%",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 6,
            alignSelf: "stretch",
            borderRadius: 3,
            background: accent,
            boxShadow: "0 0 10px " + accent + "66",
            flexShrink: 0,
          }}
        />
        {element.question}
      </div>
      {isPoll ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "3%", flex: 1 }}>
          {element.options.map((opt, i) => {
            const count = votes[opt.id] ?? 0;
            const pct = total ? Math.round((count / total) * 100) : 0;
            const mine = picked === opt.id;
            return (
              <button
                key={opt.id}
                disabled={!interactive || !!picked}
                onClick={() => castVote(opt.id)}
                style={{
                  position: "relative",
                  flex: 1,
                  overflow: "hidden",
                  background: mine ? accent : optBg,
                  color: mine ? onAccent : element.fgColor,
                  border: optBorderWidth + "px solid " + (mine ? accent : optBorder),
                  borderRadius: optRadius,
                  padding: "0 16px",
                  fontFamily: font,
                  letterSpacing: tracking,
                  textTransform: uppercaseText,
                  fontSize: "max(15px, 3%)",
                  fontWeight: 600,
                  textAlign: "left",
                  cursor: interactive && !picked ? "pointer" : "default",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  ...optFlair,
                }}
              >
                {!mine && (
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: pct + "%",
                      background: accent,
                      opacity: 0.28,
                      transition: "width 420ms cubic-bezier(0.16,1,0.3,1)",
                    }}
                  />
                )}
                <span
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    minWidth: 0,
                  }}
                >
                  <LetterChip i={i} solid={mine} />
                  <span>{opt.text}</span>
                </span>
                <span style={{ position: "relative", fontVariantNumeric: "tabular-nums" }}>
                  {pct}% · {count}
                </span>
              </button>
            );
          })}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "max(12px, 2.2%)",
              opacity: 0.7,
            }}
          >
            <span>
              {total} vote{total === 1 ? "" : "s"} · live
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {interactive && (
                <span
                  onClick={resetPoll}
                  style={{ cursor: "pointer", textDecoration: "underline" }}
                >
                  reset
                </span>
              )}
              {interactive && (
                <span
                  onClick={() => setQrOpen(true)}
                  style={{
                    cursor: "pointer",
                    textDecoration: "underline",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <QrCode size={14} /> join
                </span>
              )}
            </span>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "3%", flex: 1, gridTemplateColumns: "1fr 1fr" }}>
          {element.options.map((opt, i) => {
            const isPicked = picked === opt.id;
            const showResult = picked !== null;
            const isCorrect = showResult && opt.id === element.correctId;
            const marked = showResult && (isCorrect || isPicked);
            return (
              <button
                key={opt.id}
                disabled={!interactive || showResult}
                onClick={() => interactive && setPicked(opt.id)}
                style={{
                  background: isCorrect ? accent : isPicked ? "#dc2626" : optBg,
                  color: isCorrect ? onAccent : isPicked ? "#ffffff" : element.fgColor,
                  border:
                    optBorderWidth +
                    "px solid " +
                    (isCorrect ? accent : isPicked ? "#dc2626" : optBorder),
                  borderRadius: optRadius,
                  padding: "0 16px",
                  fontFamily: font,
                  letterSpacing: tracking,
                  textTransform: uppercaseText,
                  fontSize: "max(15px, 3.2%)",
                  fontWeight: 600,
                  textAlign: "left",
                  opacity: showResult && !marked ? 0.55 : 1,
                  cursor: interactive && !showResult ? "pointer" : "default",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  transition: "all 0.25s",
                  ...optFlair,
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <LetterChip i={i} solid={isCorrect} />
                  <span>{opt.text}</span>
                </span>
                {showResult && isCorrect && <Check size={20} strokeWidth={3} color={onAccent} />}
                {showResult && isPicked && !isCorrect && <XIcon size={20} strokeWidth={3} />}
              </button>
            );
          })}
        </div>
      )}
      {qrOpen && (
        <div
          onClick={() => setQrOpen(false)}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            background: "rgba(5,10,25,0.85)",
            display: "grid",
            placeItems: "center",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff",
              color: "#0a0f1f",
              borderRadius: 16,
              padding: "18px 22px",
              textAlign: "center",
              maxWidth: "82%",
              boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>Scan to vote</div>
            <QRCodeSVG value={pollUrl} size={170} />
            <div style={{ fontSize: 10, marginTop: 10, opacity: 0.6, wordBreak: "break-all" }}>
              {pollUrl}
            </div>
            <button
              onClick={() => setQrOpen(false)}
              style={{
                marginTop: 12,
                border: "2px solid #0a0f1f",
                background: "#ffd84a",
                fontWeight: 800,
                fontSize: 11,
                padding: "6px 14px",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ChartRender({ element }: { element: ChartElement }) {
  const { chart, data, colors, bgColor, fgColor, title, showValues, showAxes } = element;
  const theme = element.uiStyle ? UI_STYLE_THEMES[element.uiStyle] : null;
  const fontFamily = theme ? theme.font : "Inter, sans-serif";
  const W = 400,
    H = 300;
  const padL = 50,
    padR = 20,
    padT = title ? 40 : 20,
    padB = 40;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const maxV = Math.max(1, ...data.map((d) => d.value));
  const stroke = fgColor + "40";
  const c = (i: number) => colors[i % Math.max(1, colors.length)] || "#7df9ff";

  const renderBars = () => {
    const bw = (plotW / data.length) * 0.7;
    const gap = (plotW / data.length) * 0.3;
    return data.map((d, i) => {
      const h = (d.value / maxV) * plotH;
      const x = padL + i * (bw + gap) + gap / 2;
      const y = padT + plotH - h;
      return (
        <g key={i}>
          <rect x={x} y={y} width={bw} height={h} fill={c(i)} />
          {showValues && (
            <text
              x={x + bw / 2}
              y={y - 4}
              textAnchor="middle"
              fill={fgColor}
              fontSize="10"
              fontFamily={fontFamily}
              fontWeight={700}
            >
              {d.value}
            </text>
          )}
          <text
            x={x + bw / 2}
            y={padT + plotH + 14}
            textAnchor="middle"
            fill={fgColor}
            fontSize="10"
            fontFamily={fontFamily}
          >
            {d.label}
          </text>
        </g>
      );
    });
  };

  const renderLineOrArea = (filled: boolean) => {
    if (data.length < 2) return null;
    const stepX = plotW / (data.length - 1);
    const pts = data.map(
      (d, i) => [padL + i * stepX, padT + plotH - (d.value / maxV) * plotH] as const,
    );
    const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
    const area = filled
      ? `${path} L${pts[pts.length - 1][0]},${padT + plotH} L${pts[0][0]},${padT + plotH} Z`
      : null;
    return (
      <g>
        {area && <path d={area} fill={c(0)} fillOpacity={0.25} />}
        <path
          d={path}
          fill="none"
          stroke={c(0)}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p[0]} cy={p[1]} r={3.5} fill={c(0)} stroke={bgColor} strokeWidth={1.5} />
            {showValues && (
              <text
                x={p[0]}
                y={p[1] - 8}
                textAnchor="middle"
                fill={fgColor}
                fontSize="10"
                fontFamily={fontFamily}
                fontWeight={700}
              >
                {data[i].value}
              </text>
            )}
            <text
              x={p[0]}
              y={padT + plotH + 14}
              textAnchor="middle"
              fill={fgColor}
              fontSize="10"
              fontFamily={fontFamily}
            >
              {data[i].label}
            </text>
          </g>
        ))}
      </g>
    );
  };

  const renderPie = (donut: boolean) => {
    const cx = W / 2,
      cy = padT + plotH / 2;
    const r = Math.min(plotW, plotH) / 2 - 10;
    const inner = donut ? r * 0.55 : 0;
    const total = data.reduce((a, b) => a + b.value, 0) || 1;
    let acc = -Math.PI / 2;
    return data.map((d, i) => {
      const ang = (d.value / total) * Math.PI * 2;
      const a1 = acc,
        a2 = acc + ang;
      acc = a2;
      const large = ang > Math.PI ? 1 : 0;
      const x1 = cx + r * Math.cos(a1),
        y1 = cy + r * Math.sin(a1);
      const x2 = cx + r * Math.cos(a2),
        y2 = cy + r * Math.sin(a2);
      let path: string;
      if (donut) {
        const xi1 = cx + inner * Math.cos(a1),
          yi1 = cy + inner * Math.sin(a1);
        const xi2 = cx + inner * Math.cos(a2),
          yi2 = cy + inner * Math.sin(a2);
        path = `M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} L${xi2},${yi2} A${inner},${inner} 0 ${large} 0 ${xi1},${yi1} Z`;
      } else {
        path = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`;
      }
      const mid = (a1 + a2) / 2;
      const lx = cx + (r + 12) * Math.cos(mid);
      const ly = cy + (r + 12) * Math.sin(mid);
      return (
        <g key={i}>
          <path d={path} fill={c(i)} stroke={bgColor} strokeWidth={1.5} />
          <text
            x={lx}
            y={ly}
            textAnchor={Math.cos(mid) > 0 ? "start" : "end"}
            fill={fgColor}
            fontSize="9"
            fontFamily={fontFamily}
            fontWeight={600}
          >
            {d.label}
            {showValues ? ` · ${d.value}` : ""}
          </text>
        </g>
      );
    });
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background:
          element.effect === "liquid_glass"
            ? "linear-gradient(135deg, rgba(255,255,255,0.28), rgba(255,255,255,0.08))"
            : bgColor,
        borderRadius: theme ? theme.radius : 12,
        border:
          element.effect === "liquid_glass"
            ? "1px solid rgba(255,255,255,0.45)"
            : theme
              ? `${theme.borderWidth}px solid ${theme.border}`
              : "none",
        boxShadow:
          element.effect === "liquid_glass"
            ? "inset 1px 1px 1px rgba(255,255,255,0.55), inset -1px -1px 2px rgba(0,0,0,0.18), 0 18px 40px rgba(0,0,0,0.24)"
            : theme
              ? theme.shadow
              : "none",
        backdropFilter:
          element.effect === "liquid_glass" ? "blur(14px) saturate(160%)" : theme?.backdrop,
        WebkitBackdropFilter:
          element.effect === "liquid_glass" ? "blur(14px) saturate(160%)" : theme?.backdrop,
        overflow: "hidden",
        padding: "2%",
        boxSizing: "border-box",
      }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%">
        {title && (
          <text
            x={padL}
            y={22}
            fill={fgColor}
            fontSize="16"
            fontWeight={800}
            fontFamily={fontFamily}
          >
            {title}
          </text>
        )}
        {showAxes && chart !== "pie" && chart !== "donut" && (
          <g>
            <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke={stroke} strokeWidth={1} />
            <line
              x1={padL}
              y1={padT + plotH}
              x2={padL + plotW}
              y2={padT + plotH}
              stroke={stroke}
              strokeWidth={1}
            />
            {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
              <g key={i}>
                <line
                  x1={padL - 4}
                  y1={padT + plotH - t * plotH}
                  x2={padL}
                  y2={padT + plotH - t * plotH}
                  stroke={stroke}
                />
                <text
                  x={padL - 6}
                  y={padT + plotH - t * plotH + 3}
                  textAnchor="end"
                  fill={fgColor}
                  fontSize="9"
                  fontFamily={fontFamily}
                  opacity={0.7}
                >
                  {Math.round(maxV * t)}
                </text>
              </g>
            ))}
          </g>
        )}
        {chart === "bar" && renderBars()}
        {chart === "line" && renderLineOrArea(false)}
        {chart === "area" && renderLineOrArea(true)}
        {chart === "pie" && renderPie(false)}
        {chart === "donut" && renderPie(true)}
      </svg>
    </div>
  );
}

function ButtonRender({ element, interactive }: { element: ButtonElement; interactive: boolean }) {
  const { setCurrentPage, currentIndex, pages } = useEditor.getState();
  const onClick = () => {
    if (!interactive) return;
    switch (element.action) {
      case "next-slide":
        if (currentIndex < pages.length - 1) setCurrentPage(currentIndex + 1);
        break;
      case "prev-slide":
        if (currentIndex > 0) setCurrentPage(currentIndex - 1);
        break;
      case "first-slide":
        setCurrentPage(0);
        break;
      case "last-slide":
        setCurrentPage(pages.length - 1);
        break;
      case "link":
        if (element.href) window.open(element.href, "_blank", "noopener,noreferrer");
        break;
    }
  };
  return (
    <button
      onMouseDown={(e) => interactive && e.stopPropagation()}
      onClick={(event) => {
        if (interactive) event.stopPropagation();
        onClick();
      }}
      style={{
        width: "100%",
        height: "100%",
        background: element.bgColor,
        color: element.fgColor,
        border: `${element.borderWidth}px solid ${element.borderColor}`,
        borderRadius: element.cornerRadius,
        fontFamily: element.fontFamily,
        fontWeight: element.fontWeight,
        fontSize: element.fontSize,
        cursor: interactive ? "pointer" : "move",
        padding: 0,
        boxShadow: element.shadow
          ? `${element.shadow.x}px ${element.shadow.y}px ${element.shadow.blur}px ${element.shadow.color}`
          : undefined,
        transition: "transform 0.1s",
      }}
    >
      {element.text}
    </button>
  );
}
