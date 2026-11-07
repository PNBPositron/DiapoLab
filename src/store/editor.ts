import { create } from "zustand";
import { DEFAULT_PAGES } from "@/lib/default-deck";

/** One custom animation keyframe: the element state at time t (ms).
 *  Undefined fields inherit the first keyframe value at play time. */
/** Easing curve used for the segment ENDING at a keyframe. */
export type KeyframeEasing =
  | "linear"
  | "ease"
  | "ease-in"
  | "ease-out"
  | "ease-in-out"
  | "cubic-in"
  | "cubic-out"
  | "cubic-in-out"
  | "expo-out"
  | "back-out";

/** Catalog of keyframe easings — label for the UI, css for WAAPI. */
export const KEYFRAME_EASINGS: Array<{ value: KeyframeEasing; label: string; css: string }> = [
  { value: "linear", label: "Normal (linear)", css: "linear" },
  { value: "ease", label: "Ease", css: "ease" },
  { value: "ease-in", label: "Ease in", css: "ease-in" },
  { value: "ease-out", label: "Ease out", css: "ease-out" },
  { value: "ease-in-out", label: "Ease in-out", css: "ease-in-out" },
  { value: "cubic-in", label: "Cubic in", css: "cubic-bezier(0.32,0,0.67,0)" },
  { value: "cubic-out", label: "Cubic out", css: "cubic-bezier(0.33,1,0.68,1)" },
  { value: "cubic-in-out", label: "Cubic in-out", css: "cubic-bezier(0.65,0,0.35,1)" },
  { value: "expo-out", label: "Expo out", css: "cubic-bezier(0.16,1,0.3,1)" },
  { value: "back-out", label: "Back out (overshoot)", css: "cubic-bezier(0.34,1.56,0.64,1)" },
];

export type ElementKeyframe = {
  id: string;
  t: number; // ms from animation start
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  opacity?: number; // 0..1
  /** easing of the segment ENDING at this keyframe (motion INTO it) */
  easing?: KeyframeEasing;
  /** captured shadow (works for every object type) */
  shadow?: ElementShadow;
  /** captured image filters */
  filters?: ImageFilters;
  /** captured shape/quiz/chart visual effect */
  effect?: ShapeEffect;
  /** full JSON snapshot of the element at capture time — drives "Go to" */
  snapshot?: Record<string, unknown>;
};

export type ElementBase = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  rotateX?: number; // deg — CSS 3D tilt
  rotateY?: number; // deg — CSS 3D tilt
  perspective?: number; // px — 0/undefined = flat (2D), 400..1200 = typical 3D depth
  hoverTilt?: boolean; // tilt toward the cursor while presenting
  animation?: ElementAnimation;
  /** entrance-animation delay in ms while presenting (stagger objects) */
  animationDelay?: number;
  /** custom keyframe animation, played while presenting (see ElementKeyframe) */
  keyframes?: ElementKeyframe[];
  /** total keyframe timeline length in ms (defaults to the last keyframe t) */
  keyframeDuration?: number;
  interaction?: ElementInteraction;
  shadow?: ElementShadow;
  /** elements sharing a groupId are selected & moved together (plugin widgets) */
  groupId?: string;
  /** CSS mix-blend-mode — how the element composites onto the slide (undefined = normal) */
  blendMode?: string;
  /** locked elements can be selected & edited but never dragged or resized */
  locked?: boolean;
};

export type ElementAnimation =
  | "none"
  | "fade-up"
  | "pop"
  | "glitch"
  | "move-left"
  | "move-right"
  | "move-up"
  | "move-down"
  | "blur-in"
  | "spin-in"
  | "bounce-in"
  | "flip-in"
  | "swing-in"
  | "wobble-in"
  | "slingshot-in"
  | "flicker-in"
  | "stretch-in";
export type SlideTransition =
  | "none"
  | "fade"
  | "slide"
  | "zoom"
  | "flip"
  | "morph"
  | "tv"
  | "neon"
  | "cube"
  | "blur"
  | "parallax-left"
  | "parallax-up"
  | "parallax-depth"
  | "reveal"
  | "shutter"
  | "swirl"
  | "warp"
  | "prism"
  | "origami";
export type BgFit = "cover" | "contain";

export type TextElement = ElementBase & {
  type: "text";
  text: string;
  fontSize: number;
  color: string;
  fontWeight: number;
  fontFamily: string;
  align: "left" | "center" | "right";
  italic?: boolean;
  underline?: boolean;
  bullet?: boolean;
  href?: string;
  letterSpacing?: number; // em
  lineHeight?: number;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  opacity?: number; // 0..1
  shadow?: ElementShadow;
  gradient?: ShapeGradient;
  gradientOpacity?: number;
  imageOverlay?: string;
  interaction?: ElementInteraction;
    /** clip the element's silhouette by a shape (works like image masks) */
  maskShape?: ShapeKind;
  /** fill source: own color, or the slide's background (knockout) */
  fillSource?: "color" | "slide-bg";
};

export type HoverEffect = "none" | "glitch" | "color" | "gradient";
export type ElementInteraction = {
  hoverEffect?: HoverEffect;
  hoverColor?: string;
  hoverGradient?: ShapeGradient;
  moveToSlide?: number;
};

export type ShapeKind =
  | "rect"
  | "circle"
  | "holographic_grid"
  | "glitch"
  | "honeycomb"
  | "circuit"
  | "cyber_frame"
  | "data_shard"
  | "tech_chevron"
  | "scanner"
  | "ring"
  | "hex_ring"
  | "angular_frame"
  | "corner_bracket"
  | "triangle"
  | "star"
  | "arrow"
  | "heart"
  | "diamond"
  | "hexagon"
  | "pentagon"
  | "parallelogram"
  | "trapezoid"
  | "cross"
  | "lightning"
  | "cloud"
  | "speech"
  | "frame_cut"
  | "diagonal_stripes"
  | "dot_grid"
  | "dotted_triangle"
  | "accent_slash"
  | "octagon"
  | "capsule"
  | "semicircle"
  | "quarter_circle"
  | "chevron"
  | "starburst"
  | "flower"
  | "gear"
  | "shield"
  | "drop"
  | "pin"
  | "flag"
  | "ticket"
  | "bookmark"
  | "blob"
  | "moon"
  | "wave"
  | "leaf"
  | "ribbon";
export type ShapeEffect = "none" | "liquid_glass" | "neon" | "soft_shadow" | "inner_glow" | "holographic" | "glitch" | "honeycomb";
export type ElementShadow = {
  x: number;
  y: number;
  blur: number;
  color: string;
};
export type ShapeGradient = {
  from: string;
  to: string;
  angle: number; // degrees
  type?: "linear" | "radial";
};
export type ShapeElement = ElementBase & {
  type: "shape";
  shape: ShapeKind;
  fill: string;
  stroke: string;
  strokeWidth: number;
  effect?: ShapeEffect;
  shadow?: ElementShadow;
  gradient?: ShapeGradient;
  cornerRadius?: number; // px, used by rect
  opacity?: number; // 0..1
  imageOverlay?: string;
  strokeStyle?: "solid" | "dashed" | "dotted";
  /** soft-edge feather — blur the shape silhouette, 0 = crisp */
  feather?: number;
  /** clip the element's silhouette by a shape (works like image masks) */
  maskShape?: ShapeKind;
  /** fill source: own color, or the slide's background (knockout) */
  fillSource?: "color" | "slide-bg";
};

export type ImageFilters = {
  brightness: number; // %
  contrast: number; // %
  saturate: number; // %
  blur: number; // px
  grayscale: number; // %
  sepia: number; // %
  hueRotate: number; // deg
  invert: number; // %
  /** color grading — warm (+) / cool (−) shift, -100..100 */
  temperature?: number;
  /** color grading — tint washed over the image */
  tintColor?: string;
  /** tint strength, 0..100 */
  tintOpacity?: number;
  /** glitch intensity 0..100 — SVG turbulence displacement, live on the slide */
  glitch?: number;
  /** pixel size in px, 0 = off — SVG mosaic filter, live on the slide */
  pixelate?: number;
  /** posterize levels (2..16), 0 = off — SVG discrete transfer, live on the slide */
  posterize?: number;
};

export const DEFAULT_FILTERS: ImageFilters = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  blur: 0,
  grayscale: 0,
  sepia: 0,
  hueRotate: 0,
  invert: 0,
  temperature: 0,
  glitch: 0,
  pixelate: 0,
  posterize: 0,
};

export type ImageElement = ElementBase & {
  type: "image";
  src: string;
  /** clip the image with a vector shape (mask); undefined = no mask */
  maskShape?: ShapeKind;
  illustrationFormat?: "svg" | "png";
  assetKind?: "image" | "icon";
  tint?: string;
  filters?: ImageFilters;
  shadow?: ElementShadow;
  fit?: "cover" | "contain" | "fill";
  /** crop: zoom factor (1 = none) and focal point in % */
  cropZoom?: number;
  cropX?: number;
  cropY?: number;
  /** PowerPoint-style crop: source window edges cut away, as fractions of
   *  the source image (0..0.9). The window [l,1-r]x[t,1-b] is cover-fitted
   *  into the frame, so dragging crop handles keeps the image pixel-still. */
  cropRect?: { l: number; t: number; r: number; b: number };
  cornerRadius?: number;
  opacity?: number; // 0..1
  borderWidth?: number;
  borderColor?: string;
  flipX?: boolean;
  flipY?: boolean;
  gradient?: ShapeGradient; // optional color wash over the image
  gradientOpacity?: number; // 0..1
};

export type VideoElement = ElementBase & {
  type: "video";
  src: string;
  poster?: string;
  fit?: "cover" | "contain" | "fill";
  muted?: boolean;
  loop?: boolean;
  /** trim window in seconds — playback starts at "start" and loops/pauses at "end" */
  start?: number;
  end?: number;
  /** playback rate — 1 = normal speed */
  rate?: number;
};

export type IconElement = ElementBase & {
  type: "icon";
  name: string; // lucide icon name in PascalCase
  src?: string; // optional Lineicons SVG asset
  color: string;
  strokeWidth: number;
};

export type QuizOption = { id: string; text: string };
export type QuizElement = ElementBase & {
  type: "quiz";
  uiStyle?: UiStyle;
  effect?: ShapeEffect;
  question: string;
  options: QuizOption[];
  correctId: string;
  bgColor: string;
  fgColor: string;
  accentColor: string;
  /** "quiz" = right/wrong answer, "poll" = live audience vote with tallies */
  mode?: "quiz" | "poll";
  /** channel id used to sync live poll votes across open windows */
  liveKey?: string;
};

export type ChartKind = "bar" | "line" | "area" | "pie" | "donut";
export type ChartDataPoint = { label: string; value: number };
export type ChartElement = ElementBase & {
  type: "chart";
  effect?: ShapeEffect;
  chart: ChartKind;
  data: ChartDataPoint[];
  colors: string[];
  bgColor: string;
  fgColor: string;
  title?: string;
  showValues?: boolean;
  showAxes?: boolean;
  uiStyle?: UiStyle;
};

export type ButtonAction = "link" | "next-slide" | "prev-slide" | "first-slide" | "last-slide";
export type ButtonElement = ElementBase & {
  type: "button";
  text: string;
  bgColor: string;
  fgColor: string;
  borderColor: string;
  borderWidth: number;
  cornerRadius: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  action: ButtonAction;
  href?: string;
  shadow?: ElementShadow;
};

export type EmbedElement = ElementBase & {
  type: "embed";
  src: string; // fully-formed iframe URL
  title?: string;
  allow?: string;
};

export type TableElement = ElementBase & {
  type: "table";
  /** row-major cell texts, every row must have the same length */
  /** style pack driving borders, header treatment, grid lines and typography */
  tableStyle?: UiStyle;
  /** horizontal cell padding in px (default 12) */
  cellPadding?: number;
  /** inner grid line thickness in px (default 1, 0 = no lines) */
  gridWidth?: number;
  rows: string[][];
  /** style the first row as a colored header */
  headerRow: boolean;
  /** alternate row background for readability */
  zebra: boolean;
  /** render the first column bold */
  firstColBold: boolean;
  bgColor: string;
  fgColor: string;
  accentColor: string;
  fontSize: number;
};

// ---- UI components ----
export type UiStyle =
  | "cyber"
  | "glass"
  | "neobrutalist"
  | "sketch"
  | "xp"
  | "aqua"
  | "midnight"
  | "pastel"
  | "vapor"
  | "material"
  | "matrix"
  | "swiss"
  | "custom";
export type UiKind =
  | "card"
  | "stat"
  | "badge"
  | "progress"
  | "alert"
  | "list"
  | "quote"
  | "profile"
  | "pricing"
  | "kbd"
  | "window"
  | "browser"
  | "search"
  | "terminal"
  | "phone"
  | "modal"
  | "tabs"
  | "toggle"
  | "login"
  | "notification"
  | "taskbar"
  | "vtabs"
  | "kdePanel"
  | "kdeFiles"
  | "kdeRunner"
  | "kdeSettings"
  | "timeline"
  | "code";

export type UiElement = ElementBase & {
  type: "ui";
  kind: UiKind;
  uiStyle: UiStyle;
  title: string;
  body: string;
  value: number; // 0-100 (progress) or numeric stat
  items: string[];
  /** secondary editable labels — file names (kdeFiles), setting rows (kdeSettings), chrome captions (taskbar/vtabs/login) */
  files?: string[];
  accentColor: string;
  /** optional per-element overrides on top of the style pack */
  bgColor?: string;
  fgColor?: string;
  borderColorOverride?: string;
  fontFamily?: string;
  cornerRadius?: number;
  borderWidth?: number;
  textScale?: number; // 0.6 – 1.8
  padScale?: number; // 0.4 – 2
  shadowOff?: boolean;
  uppercase?: boolean;
  /** frame shape of the component */
  cornerShape?: "default" | "pill" | "cut" | "squircle" | "leaf";
  borderStyle?: "solid" | "dashed" | "dotted" | "double" | "none";
};

export type UiTheme = {
  label: string;
  bg: string;
  fg: string;
  muted: string;
  accent: string;
  border: string;
  borderWidth: number;
  radius: number;
  shadow: string;
  font: string;
  letterSpacing: string;
  uppercase: boolean;
  backdrop?: string;
  /** text color to place on top of the accent color */
  onAccent?: string;
  /** true when the surface is dark (drives inner fills / dividers) */
  dark?: boolean;
};

export const UI_STYLE_THEMES: Record<UiStyle, UiTheme> = {
  cyber: {
    label: "Cyber",
    bg: "linear-gradient(150deg,#0b1120 0%,#121c36 100%)",
    fg: "#d9f5ff",
    muted: "rgba(217,245,255,0.55)",
    accent: "#22d3ee",
    border: "rgba(34,211,238,0.45)",
    borderWidth: 1,
    radius: 14,
    shadow: "0 24px 48px -16px rgba(34,211,238,0.35), inset 0 0 24px rgba(34,211,238,0.07), inset 0 1px 0 rgba(255,255,255,0.06)",
    font: "'JetBrains Mono', 'Inter', monospace",
    letterSpacing: "0.05em",
    uppercase: true,
    onAccent: "#052530",
    dark: true,
  },
  glass: {
    label: "Glass",
    bg: "linear-gradient(135deg,rgba(255,255,255,0.5) 0%,rgba(255,255,255,0.22) 55%,rgba(255,255,255,0.36) 100%)",
    fg: "#0f172a",
    muted: "rgba(15,23,42,0.6)",
    accent: "#2563eb",
    border: "rgba(255,255,255,0.85)",
    borderWidth: 1,
    radius: 20,
    shadow: "0 20px 44px -18px rgba(15,23,42,0.35), inset 0 1px 1px rgba(255,255,255,0.8), inset 0 -1px 1px rgba(255,255,255,0.3)",
    font: "'Inter', system-ui, sans-serif",
    letterSpacing: "-0.01em",
    uppercase: false,
    backdrop: "blur(18px) saturate(180%)",
    onAccent: "#ffffff",
    dark: true,
  },
  neobrutalist: {
    label: "Neobrutal",
    bg: "#fff3d0",
    fg: "#0f0f0f",
    muted: "rgba(15,15,15,0.62)",
    accent: "#2b6bff",
    border: "#0f0f0f",
    borderWidth: 3,
    radius: 6,
    shadow: "8px 8px 0 0 #0f0f0f",
    font: "'Archivo Black', 'Inter', sans-serif",
    letterSpacing: "0.01em",
    uppercase: false,
    onAccent: "#ffffff",
  },
  sketch: {
    label: "Sketch",
    bg: "#fffcf3",
    fg: "#232323",
    muted: "rgba(35,35,35,0.58)",
    accent: "#2563eb",
    border: "#2b2b2b",
    borderWidth: 2,
    radius: 16,
    shadow: "4px 5px 0 rgba(43,43,43,0.18), 10px 12px 0 rgba(43,43,43,0.07)",
    font: "'Caveat', 'Inter', cursive",
    letterSpacing: "0.01em",
    uppercase: false,
    onAccent: "#ffffff",
  },
  xp: {
    label: "XP",
    bg: "#eef1f7",
    fg: "#16233f",
    muted: "#4c5670",
    accent: "#2f6df6",
    border: "#a9bcd8",
    borderWidth: 2,
    radius: 8,
    shadow: "inset -1px -1px 0 rgba(70,84,110,0.45), inset 1px 1px 0 #ffffff, 0 10px 24px -12px rgba(22,35,63,0.4)",
    font: "'Tahoma', 'Verdana', sans-serif",
    letterSpacing: "0em",
    uppercase: false,
    onAccent: "#ffffff",
  },
  aqua: {
    label: "Aqua",
    bg: "#ffffff",
    fg: "#0b1220",
    muted: "rgba(11,18,32,0.55)",
    accent: "#0a84ff",
    border: "rgba(11,18,32,0.08)",
    borderWidth: 1,
    radius: 18,
    shadow: "0 1px 2px rgba(11,18,32,0.04), 0 12px 32px -12px rgba(11,18,32,0.16)",
    font: "'Inter', -apple-system, system-ui, sans-serif",
    letterSpacing: "-0.015em",
    uppercase: false,
    onAccent: "#ffffff",
  },
  midnight: {
    label: "Midnight",
    bg: "linear-gradient(170deg,#151b2e 0%,#0c101c 60%,#121830 100%)",
    fg: "#eef2fb",
    muted: "rgba(238,242,251,0.5)",
    accent: "#818cf8",
    border: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    radius: 16,
    shadow: "0 24px 48px -20px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)",
    font: "'Inter', system-ui, sans-serif",
    letterSpacing: "-0.01em",
    uppercase: false,
    onAccent: "#14102e",
    dark: true,
  },
  pastel: {
    label: "Pastel",
    bg: "#fdf7fa",
    fg: "#453843",
    muted: "rgba(69,56,67,0.58)",
    accent: "#ef7bab",
    border: "#f4d7e0",
    borderWidth: 2,
    radius: 24,
    shadow: "0 18px 36px -14px rgba(232,121,166,0.3), 0 2px 6px rgba(213,180,195,0.12)",
    font: "'Quicksand', 'Nunito', sans-serif",
    letterSpacing: "0em",
    uppercase: false,
    onAccent: "#ffffff",
  },
  vapor: {
    label: "Vapor",
    bg: "linear-gradient(155deg,#241a4d 0%,#4c3a9e 55%,#a259d9 100%)",
    fg: "#f4ecff",
    muted: "rgba(244,236,255,0.68)",
    accent: "#ff6ac2",
    border: "rgba(255,106,194,0.4)",
    borderWidth: 1,
    radius: 14,
    shadow: "0 0 32px rgba(255,106,194,0.35), 0 24px 48px -16px rgba(36,26,77,0.8)",
    font: "'Orbitron', 'Inter', sans-serif",
    letterSpacing: "0.1em",
    uppercase: true,
    onAccent: "#241a4d",
    dark: true,
  },
  material: {
    label: "Material",
    bg: "#fef7ff",
    fg: "#1d1b20",
    muted: "rgba(29,27,32,0.6)",
    accent: "#6750a4",
    border: "rgba(29,27,32,0.08)",
    borderWidth: 1,
    radius: 24,
    shadow: "0 1px 3px rgba(0,0,0,0.08), 0 8px 20px -6px rgba(29,27,32,0.15)",
    font: "'Roboto', 'Inter', sans-serif",
    letterSpacing: "0em",
    uppercase: false,
    onAccent: "#ffffff",
  },
  matrix: {
    label: "Matrix",
    bg: "linear-gradient(170deg,#04140b 0%,#020a05 100%)",
    fg: "#4ade80",
    muted: "rgba(74,222,128,0.5)",
    accent: "#a3e635",
    border: "rgba(74,222,128,0.35)",
    borderWidth: 1,
    radius: 10,
    shadow: "0 0 24px rgba(74,222,128,0.25), 0 24px 48px -20px rgba(2,10,5,0.9), inset 0 0 32px rgba(74,222,128,0.06)",
    font: "'JetBrains Mono', monospace",
    letterSpacing: "0.05em",
    uppercase: false,
    onAccent: "#04140b",
    dark: true,
  },
  swiss: {
    label: "Swiss",
    bg: "#faf9f6",
    fg: "#141414",
    muted: "rgba(20,20,20,0.55)",
    accent: "#e2231a",
    border: "#141414",
    borderWidth: 1,
    radius: 0,
    shadow: "none",
    font: "'Helvetica Neue', 'Inter', Arial, sans-serif",
    letterSpacing: "-0.04em",
    uppercase: true,
    onAccent: "#ffffff",
  },
  custom: {
    label: "Custom",
    bg: "rgba(125,211,252,0.3)",
    fg: "#0b1220",
    muted: "rgba(11,18,32,0.65)",
    accent: "#2563eb",
    border: "#ffffff",
    borderWidth: 1,
    radius: 20,
    shadow: "0 12px 34px rgba(15,23,42,0.18)",
    font: "'Inter', system-ui, sans-serif",
    letterSpacing: "0.01em",
    uppercase: false,
    backdrop: "blur(12px) saturate(160%)",
    onAccent: "#ffffff",
  },
};

// ---- Custom visual theme (built in Presets -> Create, persisted locally) ----
const CUSTOM_THEME_KEY = "diapolab.custom-ui-theme";

/** Overwrite the "custom" style pack from the theme creator and persist it. */
export function saveCustomUiTheme(theme: UiTheme) {
  UI_STYLE_THEMES.custom = { ...theme, label: "Custom" };
  try {
    localStorage.setItem(CUSTOM_THEME_KEY, JSON.stringify(theme));
  } catch {
    /* storage unavailable — theme still applies for this session */
  }
}

/** Restore the last saved custom theme (runs once at module load). */
export function loadCustomUiTheme() {
  try {
    const raw = localStorage.getItem(CUSTOM_THEME_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<UiTheme>;
    UI_STYLE_THEMES.custom = { ...UI_STYLE_THEMES.custom, ...parsed, label: "Custom" };
  } catch {
    /* corrupted entry — keep the defaults */
  }
}
loadCustomUiTheme();

export type AnyElement =
  | TextElement
  | ShapeElement
  | ImageElement
  | VideoElement
  | IconElement
  | QuizElement
  | ChartElement
  | ButtonElement
  | EmbedElement
  | UiElement
  | TableElement;

export type Page = {
  id: string;
  elements: AnyElement[];
  bgColor: string;
  duration: number; // seconds
  bgImage?: string; // data URL or http URL
  bgFit?: BgFit;
  transition?: SlideTransition;
  transitionZoom?: number; // starting scale of the zoom transition (0.5–2)
  /** presenter notes — shown in presenter view, never on the slide */
  notes?: string;
};

export const DEFAULT_W = 1920;
export const DEFAULT_H = 1080;
const DEFAULT_BG = "#ffffff";
export const DEFAULT_PAGE_DURATION = 3;

export const CANVAS_PRESETS = [
  { name: "Square", w: 1080, h: 1080 },
  { name: "Story", w: 1080, h: 1920 },
  { name: "Post 4:5", w: 1080, h: 1350 },
  { name: "Landscape", w: 1920, h: 1080 },
  { name: "A4", w: 1240, h: 1754 },
  { name: "Slide 16:9", w: 1920, h: 1080 },
] as const;

type Tool = "home" | "text" | "elements" | "design" | "plugins" | "components" | "library" | "my-designs";

type HistorySnap = { pages: Page[]; currentIndex: number };
export type SlideVersion = { id: string; name: string; createdAt: number; pages: Page[]; currentIndex: number };

type State = {
  pages: Page[];
  currentIndex: number;
  // derived mirror of current page (kept in sync)
  elements: AnyElement[];
  bgColor: string;
  selectedId: string | null;
  selectedIds: string[];
  tool: Tool;
  canvasW: number;
  canvasH: number;
  history: HistorySnap[];
  future: HistorySnap[];
  versions: SlideVersion[];
  saveVersion: (name?: string) => void;
  restoreVersion: (id: string) => void;
  presenting: boolean;
  // cloud-saved design metadata
  designId: string | null;
  designName: string;
  // alignment guides shown while dragging
  guides: { v: number[]; h: number[] };
  // copy/paste clipboard (single element)
  clipboard: AnyElement | null;
  setTool: (t: Tool) => void;
  select: (id: string | null) => void;
  toggleSelect: (id: string) => void;
  removeSelected: () => void;
  duplicateSelected: () => void;
  /** arrow-key nudge on the current selection (skips locked, coalesced history) */
  nudgeSelected: (dx: number, dy: number) => void;
  /** insert several elements as one group (one history entry, all selected) */
  addGroup: (els: AnyElement[]) => void;
  /** group the current multi-selection so it moves as one block */
  groupSelected: () => void;
  /** strip the group link from the current selection */
  ungroupSelected: () => void;
  add: (el: AnyElement) => void;
  update: (id: string, patch: Partial<AnyElement>) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  setBg: (c: string) => void;
  setBgImage: (src: string | undefined, fit?: BgFit) => void;
  setTransition: (t: SlideTransition) => void;
  setTransitionZoom: (zoom: number) => void;
  setNotes: (notes: string) => void;
  setCanvasSize: (w: number, h: number) => void;
  magicResize: (w: number, h: number) => void;
  applyBrandKit: (
    kit: {
      primary: string;
      secondary: string;
      accent: string;
      bg: string;
      text: string;
      headingFont: string;
      bodyFont: string;
    },
    scope: "slide" | "deck",
  ) => void;
  setPresenting: (v: boolean) => void;
  setGuides: (g: { v: number[]; h: number[] }) => void;
  /** id of the image element currently in interactive crop mode (double-click) */
  croppingId: string | null;
  setCroppingId: (id: string | null) => void;
  copySelected: () => void;
  paste: () => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  loadTemplate: (els: AnyElement[], bg?: string) => void;
  loadPages: (pages: Page[]) => void;
  // pages
  addPage: () => void;
  removePage: (index: number) => void;
  duplicatePage: (index: number) => void;
  setCurrentPage: (index: number) => void;
  movePage: (from: number, to: number) => void;
  setPageDuration: (index: number, seconds: number) => void;
  /** find & replace across every text field of the whole deck (one undo step) */
  replaceAllText: (find: string, replaceWith: string, matchCase?: boolean) => number;
  // Master style: push the current page's look to the whole deck
  applyBackgroundToDeck: () => void;
  applyTransitionToDeck: () => void;
  // cloud
  setDesignMeta: (meta: { id: string | null; name: string }) => void;
  setDesignName: (name: string) => void;
  loadDesign: (input: {
    id: string;
    name: string;
    pages: Page[];
    canvasW: number;
    canvasH: number;
  }) => void;
  newDesign: () => void;
};

const uid = () => Math.random().toString(36).slice(2, 10);

export const newText = (overrides: Partial<TextElement> = {}): TextElement => ({
  id: uid(),
  type: "text",
  x: 120,
  y: 120,
  width: 520,
  height: 120,
  rotation: 0,
  text: "Edit me",
  fontSize: 72,
  color: "#0a0f1f",
  fontWeight: 900,
  fontFamily: "Archivo Black",
  align: "left",
  ...overrides,
});

export const newShape = (
  shape: ShapeKind,
  overrides: Partial<ShapeElement> = {},
): ShapeElement => ({
  id: uid(),
  type: "shape",
  x: 200,
  y: 200,
  width: 320,
  height: 320,
  rotation: 0,
  shape,
  fill: "#ffd84a",
  stroke: "#0a0f1f",
  strokeWidth: 6,
  ...overrides,
});

export const newImage = (src: string, overrides: Partial<ImageElement> = {}): ImageElement => ({
  id: uid(),
  type: "image",
  x: 200,
  y: 200,
  width: 480,
  height: 480,
  rotation: 0,
  src,
  ...overrides,
});

export const newVideo = (src: string, overrides: Partial<VideoElement> = {}): VideoElement => ({
  id: uid(),
  type: "video",
  x: 200,
  y: 200,
  width: 640,
  height: 360,
  rotation: 0,
  src,
  muted: true,
  loop: true,
  ...overrides,
});

export const newIcon = (name: string, overrides: Partial<IconElement> = {}): IconElement => ({
  id: uid(),
  type: "icon",
  x: 240,
  y: 240,
  width: 240,
  height: 240,
  rotation: 0,
  name,
  color: "#0a0f1f",
  strokeWidth: 2,
  ...overrides,
});

export const newQuiz = (overrides: Partial<QuizElement> = {}): QuizElement => {
  const a = uid(),
    b = uid(),
    c = uid(),
    d = uid();
  return {
    id: uid(),
    type: "quiz",
    x: 160,
    y: 160,
    width: 720,
    height: 520,
    rotation: 0,
    question: "What's your question?",
    options: [
      { id: a, text: "Option A" },
      { id: b, text: "Option B" },
      { id: c, text: "Option C" },
      { id: d, text: "Option D" },
    ],
    correctId: a,
    bgColor: "#0a0f1f",
    fgColor: "#ffffff",
    accentColor: "#7df9ff",
    ...overrides,
  };
};

export const newPoll = (overrides: Partial<QuizElement> = {}): QuizElement => {
  const a = uid(),
    b = uid(),
    c = uid();
  return {
    ...newQuiz({
      question: "Which one do you prefer?",
      options: [
        { id: a, text: "Option A" },
        { id: b, text: "Option B" },
        { id: c, text: "Option C" },
      ],
      correctId: a,
      ...overrides,
    }),
    mode: "poll",
    liveKey: uid(),
  };
};

export const newChart = (
  chart: ChartKind = "bar",
  overrides: Partial<ChartElement> = {},
): ChartElement => ({
  id: uid(),
  type: "chart",
  x: 160,
  y: 160,
  width: 720,
  height: 520,
  rotation: 0,
  chart,
  data: [
    { label: "Q1", value: 32 },
    { label: "Q2", value: 58 },
    { label: "Q3", value: 45 },
    { label: "Q4", value: 78 },
  ],
  colors: ["#7df9ff", "#ff0080", "#ffd84a", "#4d7cff", "#00ff88", "#b16bff"],
  bgColor: "#0a0f1f",
  fgColor: "#ffffff",
  title: "Quarterly results",
  showValues: true,
  showAxes: true,
  ...overrides,
});

export const newTable = (overrides: Partial<TableElement> = {}): TableElement => ({
  id: uid(),
  type: "table",
  x: 160,
  y: 160,
  width: 760,
  height: 320,
  rotation: 0,
  rows: [
    ["Feature", "Basic", "Pro", "Enterprise"],
    ["Slides", "10", "Unlimited", "Unlimited"],
    ["Collaborators", "1", "5", "50"],
    ["Support", "Community", "Email", "24/7"],
  ],
  headerRow: true,
  zebra: true,
  firstColBold: true,
  bgColor: "#ffffff",
  fgColor: "#0f172a",
  accentColor: "#2b6bff",
  fontSize: 15,
  ...overrides,
});

/** A guaranteed-opaque background for a style pack (charts, quizzes, buttons). */
export const solidThemeBg = (uiStyle: UiStyle): string => {
  const t = UI_STYLE_THEMES[uiStyle];
  if (t.bg.startsWith("#")) return t.bg;
  return t.dark ? "#1b2233" : "#ffffff";
};

// Map a UI style pack onto chart colors so charts match UI components.
export const EDITOR_COLOR_PALETTE = [
  "#2b6bff", "#7df9ff", "#ff0080", "#ffd84a", "#00c853", "#b16bff",
  "#0a0f1f", "#ffffff", "#1b2233", "#e2231a", "#f5f3ee", "#0d0d0d",
] as const;

export const chartStylePatch = (uiStyle: UiStyle): Partial<ChartElement> => {
  const t = UI_STYLE_THEMES[uiStyle];
  const palettes: Record<UiStyle, string[]> = {
    cyber: ["#7df9ff", "#ff0080", "#ffd84a", "#4d7cff", "#00ff88", "#b16bff"],
    glass: ["#7df9ff", "#ffffff", "#a5b4fc", "#fca5a5", "#86efac", "#fcd34d"],
    neobrutalist: ["#ff0080", "#0a0a0a", "#2b6bff", "#00c853", "#ff6d00", "#8e24aa"],
    sketch: ["#2b6cff", "#1b1b1b", "#e8534f", "#3aa76d", "#f2a33c", "#7b5ea7"],
    xp: ["#245edb", "#3ec53e", "#e8a33d", "#c0392b", "#7f9db9", "#8e44ad"],
    aqua: ["#0a84ff", "#30d158", "#ff9f0a", "#ff375f", "#5e5ce6", "#64d2ff"],
    midnight: ["#6366f1", "#22d3ee", "#f472b6", "#facc15", "#34d399", "#a78bfa"],
    pastel: ["#f48fb1", "#a5d8f3", "#c5e1a5", "#ffd59e", "#c8b6e2", "#f6a5a5"],
    vapor: ["#ff71ce", "#01cdfe", "#05ffa1", "#b967ff", "#fffb96", "#7597de"],
    material: ["#6750a4", "#00897b", "#ef6c00", "#c62828", "#1565c0", "#2e7d32"],
    matrix: ["#37ff7f", "#a6ff00", "#1c8c3f", "#7dffb0", "#00c853", "#d4ff4d"],
    swiss: ["#e2231a", "#111111", "#0057b7", "#f2b705", "#767676", "#3d8361"],
    custom: ["#2563eb", "#7dd3fc", "#f472b6", "#facc15", "#34d399", "#a78bfa"],
  };
  return { uiStyle, bgColor: t.bg, fgColor: t.fg, colors: palettes[uiStyle] };
};

export const quizStylePatch = (uiStyle: UiStyle): Partial<QuizElement> => {
  const t = UI_STYLE_THEMES[uiStyle];
  return {
    uiStyle,
    bgColor: solidThemeBg(uiStyle),
    fgColor: t.dark ? "#ffffff" : t.fg,
    accentColor: t.accent,
  };
};

/** Map a UI style pack onto table colors so tables match the rest of the deck.
 *  Header fill, zebra tint and text color all derive from the pack. */
export const tableStylePatch = (uiStyle: UiStyle): Partial<TableElement> => {
  const t = UI_STYLE_THEMES[uiStyle];
  return {
    tableStyle: uiStyle,
    bgColor: solidThemeBg(uiStyle),
    fgColor: t.dark ? "#ffffff" : t.fg,
    accentColor: t.accent,
  };
};

/* How a table "sounds" like each style pack — the recipe drives the render
 *  (header treatment, grid lines, zebra tint, glow, typography), the colors
 *  come from the pack and stay hand-editable. */
export type TableRecipe = {
  headerMode: "fill" | "underline" | "plain";
  zebraAlpha?: number;
  radius?: number;
  gridColor?: string;
  dashGrid?: boolean;
  rowLinesOnly?: boolean;
  glow?: boolean;
  flat?: boolean;
  headerUppercase?: boolean;
};
export const TABLE_STYLE_RECIPES: Record<UiStyle, TableRecipe> = {
  cyber: { headerMode: "fill", zebraAlpha: 0.05, glow: true },
  glass: { headerMode: "underline", zebraAlpha: 0.06 },
  neobrutalist: { headerMode: "fill", zebraAlpha: 0.06, gridColor: "#0f0f0f" },
  sketch: { headerMode: "underline", zebraAlpha: 0.05, dashGrid: true },
  xp: { headerMode: "fill", zebraAlpha: 0.08, radius: 0, gridColor: "rgba(15,23,42,0.3)" },
  aqua: { headerMode: "fill", zebraAlpha: 0.05, radius: 10 },
  midnight: { headerMode: "fill", zebraAlpha: 0.06 },
  pastel: { headerMode: "fill", zebraAlpha: 0.05 },
  vapor: { headerMode: "fill", zebraAlpha: 0.06, glow: true },
  material: { headerMode: "fill", zebraAlpha: 0.04, rowLinesOnly: true, radius: 4 },
  matrix: { headerMode: "plain", zebraAlpha: 0.07, glow: true },
  swiss: { headerMode: "underline", zebraAlpha: 0.04, rowLinesOnly: true, radius: 0, flat: true, headerUppercase: true },
  custom: { headerMode: "fill", zebraAlpha: 0.05 },
};

export const newButton = (overrides: Partial<ButtonElement> = {}): ButtonElement => ({
  id: uid(),
  type: "button",
  x: 240,
  y: 240,
  width: 320,
  height: 96,
  rotation: 0,
  text: "Click me",
  bgColor: "#7df9ff",
  fgColor: "#0a0f1f",
  borderColor: "#0a0f1f",
  borderWidth: 4,
  cornerRadius: 12,
  fontSize: 36,
  fontFamily: "Archivo Black",
  fontWeight: 900,
  action: "next-slide",
  ...overrides,
});

// Normalize a user-pasted URL into an embeddable iframe src.
// Supports YouTube watch/share, Vimeo, and passes through valid iframe URLs.
export function toEmbedSrc(raw: string): string {
  let s = (raw || "").trim();
  if (!s) return "";
  // Accept links pasted without a scheme ("youtube.com/watch?v=…"). Without
  // this the iframe would resolve the src relative to the app itself and
  // show DiapoLab's own 404 page.
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(s)) s = "https://" + s.replace(/^\/+/, "");
  try {
    const u = new URL(s);
    // Reject hostnames that can't point at a real site ("my video", "hello").
    if (!u.hostname.includes(".")) return "";
    const host = u.hostname.replace(/^www\./, "");
    // YouTube
    if (host === "youtube.com" || host === "m.youtube.com") {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      if (u.pathname.startsWith("/embed/")) return s;
      if (u.pathname.startsWith("/shorts/"))
        return `https://www.youtube.com/embed/${u.pathname.split("/")[2]}`;
    }
    if (host === "youtu.be") {
      const id = u.pathname.slice(1);
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    // Vimeo
    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }
    // Spotify — track/album/playlist/episode/show URLs → official embed player
    if (host === "open.spotify.com" || host === "play.spotify.com") {
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts.length >= 2) {
        const kind = parts[0] === "embed" ? parts[1] : parts[0];
        const id = parts[0] === "embed" ? parts[2] : parts[1];
        if (kind && id) return `https://open.spotify.com/embed/${kind}/${id}`;
      }
    }
    // SoundCloud — official player wrapping the track/playlist URL
    if (host === "soundcloud.com") {
      return `https://w.soundcloud.com/player/?url=${encodeURIComponent(s)}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&visual=true`;
    }
    // Google Maps — place/search URLs → classic embed (no API key needed)
    if (host === "maps.google.com" || ((host === "google.com" || host === "google.fr") && u.pathname.startsWith("/maps"))) {
      const q = u.searchParams.get("q") || u.searchParams.get("query") || decodeURIComponent(u.pathname.split("/maps/search/")[1] || "") || "";
      if (q) return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=14&output=embed`;
      if (u.pathname.startsWith("/maps/place/")) {
        const place = decodeURIComponent(u.pathname.split("/maps/place/")[1].split("/")[0] || "");
        if (place) return `https://maps.google.com/maps?q=${encodeURIComponent(place)}&z=14&output=embed`;
      }
    }
    // Figma — file/design/proto URLs → official Figma embed viewer
    if (host === "figma.com" || host === "www.figma.com") {
      if (u.pathname.startsWith("/embed")) return s;
      return `https://www.figma.com/embed?embed_host=diapolab&url=${encodeURIComponent(s)}`;
    }
    return s;
  } catch {
    return s;
  }
}

/** Detect the embed provider from a (already normalized) embed src —
 *  used to label fallback cards in PDF/PPTX exports. */
export function embedProvider(src: string): { label: string; emoji: string } {
  const s = (src || "").toLowerCase();
  if (s.includes("youtube.com") || s.includes("youtu.be")) return { label: "YouTube", emoji: "▶" };
  if (s.includes("spotify.com")) return { label: "Spotify", emoji: "" };
  if (s.includes("soundcloud.com")) return { label: "SoundCloud", emoji: "" };
  if (s.includes("vimeo.com")) return { label: "Vimeo", emoji: " Vimeo" };
  if (s.includes("maps.google")) return { label: "Google Maps", emoji: "" };
  if (s.includes("figma.com")) return { label: "Figma", emoji: "" };
  return { label: "Web embed", emoji: "" };
}

export const newEmbed = (src: string, overrides: Partial<EmbedElement> = {}): EmbedElement => ({
  id: uid(),
  type: "embed",
  x: 200,
  y: 200,
  width: 720,
  height: 405,
  rotation: 0,
  src: toEmbedSrc(src),
  allow:
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
  ...overrides,
});

const UI_DEFAULTS: Record<
  UiKind,
  { w: number; h: number; title: string; body: string; value: number; items: string[]; files?: string[] }
> = {
  card: {
    w: 560,
    h: 360,
    title: "Card title",
    body: "Supporting copy goes here. Double-click to edit in the properties panel.",
    value: 0,
    items: [],
  },
  stat: {
    w: 420,
    h: 260,
    title: "Active users",
    body: "+12.4% this month",
    value: 8420,
    items: [],
  },
  badge: { w: 280, h: 96, title: "NEW", body: "", value: 0, items: [] },
  progress: { w: 560, h: 160, title: "Progress", body: "Loading assets", value: 68, items: [] },
  timeline: { w: 640, h: 220, title: "Product launch", body: "Discovery → Build → Launch", value: 68, items: ["Discovery", "Prototype", "Launch"] },
  alert: {
    w: 620,
    h: 200,
    title: "Heads up",
    body: "This is an important message for your audience.",
    value: 0,
    items: [],
  },
  list: {
    w: 520,
    h: 380,
    title: "Checklist",
    body: "",
    value: 0,
    items: ["First item", "Second item", "Third item"],
  },
  quote: {
    w: 640,
    h: 300,
    title: "The best way to predict the future is to invent it.",
    body: "Alan Kay",
    value: 0,
    items: [],
  },
  profile: { w: 520, h: 200, title: "Ada Lovelace", body: "Lead engineer", value: 0, items: [] },
  pricing: {
    w: 460,
    h: 480,
    title: "Pro",
    body: "$29 / month",
    value: 0,
    items: ["Unlimited decks", "AI redesign", "Priority support"],
  },
  kbd: { w: 360, h: 120, title: "⌘ + K", body: "Command palette", value: 0, items: [] },
  window: {
    w: 720,
    h: 460,
    title: "My Document",
    body: "Window content area",
    value: 0,
    items: ["File", "Edit", "View", "Help"],
  },
  browser: {
    w: 800,
    h: 500,
    title: "DiapoLab",
    body: "https://diapolab.lovable.app",
    value: 0,
    items: ["Home", "Docs", "Pricing"],
  },
  search: { w: 640, h: 120, title: "Search anything…", body: "⌘K", value: 0, items: [] },
  terminal: {
    w: 720,
    h: 400,
    title: "bash — 80×24",
    body: "npm run build",
    value: 0,
    items: ["$ npm install", "added 214 packages", "$ npm run build", "built in 1.24s"],
  },
  code: {
    w: 720,
    h: 460,
    title: "main.ts",
    body: 'const greet = (name) => {\n  // say hello\n  const msg = "Hello, " + name + "!";\n  return msg;\n};\n\ngreet("World");',
    value: 0,
    items: [],
  },
  phone: {
    w: 340,
    h: 640,
    title: "Positron",
    body: "Mobile preview",
    value: 0,
    items: ["Inbox", "Today", "Settings"],
  },
  modal: {
    w: 620,
    h: 340,
    title: "Delete this slide?",
    body: "This action can't be undone.",
    value: 0,
    items: ["Cancel", "Delete"],
  },
  tabs: {
    w: 680,
    h: 300,
    title: "Overview",
    body: "Tab panel content goes here.",
    value: 0,
    items: ["Overview", "Activity", "Settings"],
  },
  toggle: {
    w: 560,
    h: 300,
    title: "Preferences",
    body: "",
    value: 0,
    items: ["Notifications", "Dark mode", "Auto-save"],
  },
  login: {
    w: 480,
    h: 480,
    title: "Sign in",
    body: "Continue to your workspace",
    value: 0,
    items: ["Email", "Password"],
  },
  notification: {
    w: 560,
    h: 160,
    title: "Deck published",
    body: "Your presentation is now live.",
    value: 0,
    items: [],
  },
  taskbar: {
    w: 900,
    h: 88,
    title: "Windows",
    body: "9:41 AM",
    value: 0,
    items: ["Explorer", "Edge", "Mail", "Store", "Photos"],
  },
  vtabs: {
    w: 860,
    h: 520,
    title: "DiapoLab",
    body: "https://diapolab.lovable.app",
    value: 0,
    items: ["Dashboard", "Editor", "Templates", "Settings"],
  },
  kdePanel: {
    w: 900,
    h: 88,
    title: "Plasma",
    body: "9:41",
    value: 0,
    items: ["Dolphin", "Konsole", "Firefox", "Kate", "Discover"],
  },
  kdeFiles: {
    w: 840,
    h: 520,
    title: "Documents — Dolphin",
    body: "/home/user/Documents",
    value: 0,
    items: ["Home", "Desktop", "Documents", "Downloads", "Pictures"],
    files: ["report.pdf", "notes.md", "photo.png", "budget.ods", "draft.txt", "archive.zip"],
  },
  kdeRunner: {
    w: 720,
    h: 320,
    title: "konsole",
    body: "KRunner",
    value: 0,
    items: ["Konsole — Terminal", "Konsolidate — App", "Console settings"],
  },
  kdeSettings: {
    w: 860,
    h: 520,
    title: "System Settings",
    body: "Appearance",
    value: 0,
    items: ["Appearance", "Workspace", "Networking", "Hardware"],
    files: ["Global Theme", "Plasma Style", "Colors", "Icons", "Cursors"],
  },
};

export const newUi = (
  kind: UiKind = "card",
  uiStyle: UiStyle = "cyber",
  overrides: Partial<UiElement> = {},
): UiElement => {
  const d = UI_DEFAULTS[kind];
  return {
    id: uid(),
    type: "ui",
    x: 200,
    y: 200,
    width: d.w,
    height: d.h,
    rotation: 0,
    kind,
    uiStyle,
    title: d.title,
    body: d.body,
    value: d.value,
    items: d.items,
    files: d.files,
    accentColor: UI_STYLE_THEMES[uiStyle].accent,
    ...overrides,
  };
};

const newPage = (overrides: Partial<Page> = {}): Page => ({
  id: uid(),
  elements: [],
  bgColor: DEFAULT_BG,
  duration: DEFAULT_PAGE_DURATION,
  ...overrides,
});

/** Fresh copy of the built-in starter deck — new designs open on it. */
const cloneDefaultPages = (): Page[] =>
  DEFAULT_PAGES.map((p) => ({ ...p, elements: p.elements.map((e) => ({ ...e })) }));
const initialPages = cloneDefaultPages();

export const useEditor = create<State>((set, get) => {
  const snap = (): HistorySnap => ({
    pages: JSON.parse(JSON.stringify(get().pages)),
    currentIndex: get().currentIndex,
  });
  const pushHistory = () => {
    set({ history: [...get().history, snap()].slice(-50), future: [] });
  };
  const syncCurrent = (pages: Page[], currentIndex: number) => {
    const p = pages[currentIndex];
    return { pages, currentIndex, elements: p.elements, bgColor: p.bgColor };
  };
  const updateCurrentPage = (mut: (p: Page) => Page) => {
    const { pages, currentIndex } = get();
    const next = pages.map((p, i) => (i === currentIndex ? mut(p) : p));
    set(syncCurrent(next, currentIndex));
  };

  // Timestamp of the last arrow-key nudge: keydown auto-repeat fires
  // ~30x/s, so history entries are coalesced into one per burst.
  let lastNudgeAt = 0;

  return {
    pages: initialPages,
    currentIndex: 0,
    elements: initialPages[0].elements,
    bgColor: initialPages[0].bgColor,
    selectedId: null,
    selectedIds: [],
    tool: "home",
    canvasW: DEFAULT_W,
    canvasH: DEFAULT_H,
    history: [],
    future: [],
    versions: [],
    presenting: false,
    designId: null,
    designName: "untitled.design",
    guides: { v: [], h: [] },
    croppingId: null,
    clipboard: null,

    setTool: (tool) => set({ tool }),
    setCanvasSize: (canvasW, canvasH) => set({ canvasW, canvasH }),

    // Magic resize: reflow every slide into a new canvas ratio, keeping
    // relative composition (centres stay put, sizes/type scale uniformly).
    magicResize: (w, h) => {
      const { canvasW: ow, canvasH: oh, pages, currentIndex } = get();
      if (w === ow && h === oh) return;
      pushHistory();
      const sx = w / ow;
      const sy = h / oh;
      const s = Math.min(sx, sy);
      const next = pages.map((p) => ({
        ...p,
        elements: p.elements.map((e) => {
          const cx = (e.x + e.width / 2) * sx;
          const cy = (e.y + e.height / 2) * sy;
          const width = Math.max(8, e.width * s);
          const height = Math.max(8, e.height * s);
          const scaled: AnyElement = {
            ...e,
            width,
            height,
            x: Math.round(Math.max(0, Math.min(w - width, cx - width / 2))),
            y: Math.round(Math.max(0, Math.min(h - height, cy - height / 2))),
          } as AnyElement;
          // Scale the font size of every element type that has one
          // (text, table, quiz, ui shell) so the ratio survives the resize.
          const fs = (scaled as { fontSize?: unknown }).fontSize;
          if (typeof fs === "number") {
            return { ...scaled, fontSize: Math.max(8, Math.round(fs * s)) } as AnyElement;
          }
          return scaled;
        }),
      }));
      set({ ...syncCurrent(next, currentIndex), canvasW: w, canvasH: h, selectedId: null, selectedIds: [] });
    },

    applyBrandKit: (kit, scope) => {
      pushHistory();
      const { pages, currentIndex } = get();
      const paint = (p: Page): Page => ({
        ...p,
        bgColor: kit.bg,
        elements: p.elements.map((e): AnyElement => {
          if (e.type === "text") {
            const heading = e.fontSize >= 48;
            return {
              ...e,
              color: heading ? kit.text : kit.text,
              fontFamily: heading ? kit.headingFont : kit.bodyFont,
            };
          }
          if (e.type === "shape") {
            return { ...e, fill: e.fill === kit.primary ? kit.secondary : kit.primary };
          }
          if (e.type === "icon") return { ...e, color: kit.accent };
          if (e.type === "quiz") {
            return { ...e, accentColor: kit.accent, fgColor: kit.text, bgColor: kit.bg };
          }
          if (e.type === "button") {
            return { ...e, bgColor: kit.primary, fgColor: kit.text };
          }
          if (e.type === "ui") {
            return { ...e, accentColor: kit.accent, fontFamily: kit.bodyFont };
          }
          if (e.type === "chart") {
            return { ...e, colors: [kit.primary, kit.secondary, kit.accent], fgColor: kit.text };
          }
          return e;
        }),
      });
      const next =
        scope === "deck"
          ? pages.map(paint)
          : pages.map((p, i) => (i === currentIndex ? paint(p) : p));
      set({ ...syncCurrent(next, currentIndex), selectedId: null, selectedIds: [] });
    },
    saveVersion: (name) => {
      const { pages, currentIndex, versions } = get();
      const version: SlideVersion = {
        id: uid(),
        name: name?.trim() || `Version ${versions.length + 1}`,
        createdAt: Date.now(),
        pages: JSON.parse(JSON.stringify(pages)),
        currentIndex,
      };
      set({ versions: [version, ...versions].slice(0, 30) });
    },
    restoreVersion: (id) => {
      const version = get().versions.find((item) => item.id === id);
      if (!version) return;
      pushHistory();
      set({ ...syncCurrent(JSON.parse(JSON.stringify(version.pages)), version.currentIndex), selectedId: null, selectedIds: [] });
    },
    setPresenting: (presenting) => set({ presenting }),
    setGuides: (guides) => set({ guides }),
    setCroppingId: (croppingId) => set({ croppingId }),
    copySelected: () => {
      const { selectedId, elements } = get();
      if (!selectedId) return;
      const el = elements.find((e) => e.id === selectedId);
      if (el) set({ clipboard: JSON.parse(JSON.stringify(el)) as AnyElement });
    },
    paste: () => {
      const { clipboard } = get();
      if (!clipboard) return;
      pushHistory();
      const clone = {
        ...clipboard,
        id: uid(),
        x: clipboard.x + 30,
        y: clipboard.y + 30,
        // a pasted element never rejoins the group its source belonged to
        groupId: undefined,
      } as AnyElement;
      updateCurrentPage((p) => ({ ...p, elements: [...p.elements, clone] }));
      set({ selectedId: clone.id, selectedIds: [clone.id] });
    },
    select: (selectedId) => {
      if (!selectedId) {
        set({ selectedId: null, selectedIds: [] });
        return;
      }
      // Clicking one member of a group selects the whole group,
      // so drags, nudges, delete and duplicate apply to all of it.
      const el = get().elements.find((e) => e.id === selectedId);
      const gid = el?.groupId;
      const ids = gid
        ? get().elements.filter((e) => e.groupId === gid).map((e) => e.id)
        : [selectedId];
      set({ selectedId, selectedIds: ids });
    },
    toggleSelect: (id) => {
      const { selectedIds } = get();
      const next = selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id];
      set({ selectedIds: next, selectedId: next.length ? next[next.length - 1] : null });
    },
    removeSelected: () => {
      const { selectedIds, selectedId } = get();
      const ids = selectedIds.length ? selectedIds : selectedId ? [selectedId] : [];
      if (!ids.length) return;
      pushHistory();
      updateCurrentPage((p) => ({ ...p, elements: p.elements.filter((e) => !ids.includes(e.id)) }));
      set({ selectedId: null, selectedIds: [] });
    },
    duplicateSelected: () => {
      const { selectedIds, selectedId, elements } = get();
      const ids = selectedIds.length ? selectedIds : selectedId ? [selectedId] : [];
      if (!ids.length) return;
      pushHistory();
      // duplicated groups stay grouped, but as a NEW independent group
      const groupRemap = new Map<string, string>();
      const clones = elements
        .filter((e) => ids.includes(e.id))
        .map((e) => {
          const clone = {
            ...(JSON.parse(JSON.stringify(e)) as AnyElement),
            id: uid(),
            x: e.x + 30,
            y: e.y + 30,
          };
          if (e.groupId) {
            if (!groupRemap.has(e.groupId)) groupRemap.set(e.groupId, uid());
            clone.groupId = groupRemap.get(e.groupId);
          }
          return clone;
        });
      updateCurrentPage((p) => ({ ...p, elements: [...p.elements, ...clones] }));
      set({ selectedIds: clones.map((c) => c.id), selectedId: clones[clones.length - 1]?.id ?? null });
    },

    nudgeSelected: (dx, dy) => {
      const { selectedIds, selectedId } = get();
      const ids = selectedIds.length ? selectedIds : selectedId ? [selectedId] : [];
      if (!ids.length) return;
      const now = Date.now();
      if (now - lastNudgeAt > 600) pushHistory();
      lastNudgeAt = now;
      // Locked elements are never moved by the keyboard.
      updateCurrentPage((p) => ({
        ...p,
        elements: p.elements.map((e) =>
          ids.includes(e.id) && !e.locked
            ? ({ ...e, x: e.x + dx, y: e.y + dy } as AnyElement)
            : e,
        ),
      }));
    },

    addGroup: (els) => {
      if (!els.length) return;
      pushHistory();
      const gid = uid();
      const tagged = els.map(
        (el) => ({ ...el, id: uid(), groupId: gid }) as AnyElement,
      );
      updateCurrentPage((p) => ({ ...p, elements: [...p.elements, ...tagged] }));
      set({ selectedId: tagged[tagged.length - 1].id, selectedIds: tagged.map((e) => e.id) });
    },
    groupSelected: () => {
      const { selectedIds } = get();
      if (selectedIds.length < 2) return;
      pushHistory();
      const gid = uid();
      updateCurrentPage((p) => ({
        ...p,
        elements: p.elements.map((e) => (selectedIds.includes(e.id) ? ({ ...e, groupId: gid } as AnyElement) : e)),
      }));
    },
    ungroupSelected: () => {
      const { selectedIds } = get();
      if (!selectedIds.length) return;
      pushHistory();
      updateCurrentPage((p) => ({
        ...p,
        elements: p.elements.map((e) =>
          selectedIds.includes(e.id) ? ({ ...e, groupId: undefined } as AnyElement) : e,
        ),
      }));
    },
    add: (el) => {
      pushHistory();
      updateCurrentPage((p) => ({ ...p, elements: [...p.elements, el] }));
      set({ selectedId: el.id, selectedIds: [el.id] });
    },
    update: (id, patch) =>
      updateCurrentPage((p) => ({
        ...p,
        elements: p.elements.map((e) => (e.id === id ? ({ ...e, ...patch } as AnyElement) : e)),
      })),
    remove: (id) => {
      pushHistory();
      updateCurrentPage((p) => ({ ...p, elements: p.elements.filter((e) => e.id !== id) }));
      set({
        selectedId: get().selectedId === id ? null : get().selectedId,
        selectedIds: get().selectedIds.filter((x) => x !== id),
      });
    },
    duplicate: (id) => {
      const el = get().elements.find((e) => e.id === id);
      if (!el) return;
      pushHistory();
      const clone = {
        ...(JSON.parse(JSON.stringify(el)) as AnyElement),
        id: uid(),
        x: el.x + 30,
        y: el.y + 30,
      };
      // the clone keeps a group identity of its own, never the source's
      if (clone.groupId) clone.groupId = uid();
      updateCurrentPage((p) => ({ ...p, elements: [...p.elements, clone] }));
      set({ selectedId: clone.id, selectedIds: [clone.id] });
    },
    bringForward: (id) => {
      updateCurrentPage((p) => {
        const arr = [...p.elements];
        const i = arr.findIndex((e) => e.id === id);
        if (i < 0 || i === arr.length - 1) return p;
        [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
        return { ...p, elements: arr };
      });
    },
    sendBackward: (id) => {
      updateCurrentPage((p) => {
        const arr = [...p.elements];
        const i = arr.findIndex((e) => e.id === id);
        if (i <= 0) return p;
        [arr[i], arr[i - 1]] = [arr[i - 1], arr[i]];
        return { ...p, elements: arr };
      });
    },
    setBg: (bgColor) => {
      pushHistory();
      updateCurrentPage((p) => ({ ...p, bgColor }));
    },
    setBgImage: (src, fit) => {
      pushHistory();
      updateCurrentPage((p) => ({ ...p, bgImage: src, bgFit: fit ?? p.bgFit ?? "cover" }));
    },
    setTransition: (t) => {
      pushHistory();
      updateCurrentPage((p) => ({ ...p, transition: t, transitionZoom: t === "zoom" ? p.transitionZoom ?? 0.5 : p.transitionZoom }));
    },
    setTransitionZoom: (zoom) => {
      if (!Number.isFinite(zoom)) return;
      pushHistory();
      updateCurrentPage((p) => ({ ...p, transitionZoom: Math.max(0.5, Math.min(2, zoom)) }));
    },
    setNotes: (notes) => updateCurrentPage((p) => ({ ...p, notes })),
    undo: () => {
      const { history, future } = get();
      if (history.length === 0) return;
      const prev = history[history.length - 1];
      set({
        ...syncCurrent(prev.pages, Math.min(prev.currentIndex, prev.pages.length - 1)),
        history: history.slice(0, -1),
        future: [snap(), ...future].slice(0, 50),
        selectedId: null,
        selectedIds: [],
      });
    },
    redo: () => {
      const { future, history } = get();
      if (future.length === 0) return;
      const [next, ...rest] = future;
      set({
        ...syncCurrent(next.pages, Math.min(next.currentIndex, next.pages.length - 1)),
        future: rest,
        history: [...history, snap()].slice(-50),
        selectedId: null,
        selectedIds: [],
      });
    },
    clear: () => {
      pushHistory();
      updateCurrentPage((p) => ({ ...p, elements: [] }));
      set({ selectedId: null, selectedIds: [] });
    },
    loadTemplate: (els, bg) => {
      pushHistory();
      updateCurrentPage((p) => ({ ...p, elements: els, bgColor: bg ?? p.bgColor }));
      set({ selectedId: null, selectedIds: [] });
    },
    loadPages: (incoming) => {
      if (!incoming || incoming.length === 0) return;
      pushHistory();
      const safe = incoming.map((p) => ({
        ...p,
        id: p.id ?? uid(),
        duration: p.duration ?? DEFAULT_PAGE_DURATION,
        elements: p.elements.map((element) => element.type === "image" && element.assetKind === "icon" ? { ...element, type: "icon" as const, name: ("name" in element && typeof element.name === "string" ? element.name : element.src.split("/").pop()?.replace(/\.svg$/i, "") ?? "Icon"), color: element.tint ?? "#111827", strokeWidth: 2, src: element.src } : element),
      }));
      set({ ...syncCurrent(safe, 0), selectedId: null, selectedIds: [] });
    },

    addPage: () => {
      pushHistory();
      const { pages, currentIndex, bgColor } = get();
      const created = newPage({ bgColor });
      const next = [...pages.slice(0, currentIndex + 1), created, ...pages.slice(currentIndex + 1)];
      set({ ...syncCurrent(next, currentIndex + 1), selectedId: null, selectedIds: [] });
    },
    removePage: (index) => {
      const { pages, currentIndex } = get();
      if (pages.length <= 1) return;
      pushHistory();
      const next = pages.filter((_, i) => i !== index);
      const newIdx = Math.min(
        currentIndex > index ? currentIndex - 1 : currentIndex,
        next.length - 1,
      );
      set({ ...syncCurrent(next, newIdx), selectedId: null, selectedIds: [] });
    },
    duplicatePage: (index) => {
      pushHistory();
      const { pages } = get();
      const src = pages[index];
      const clone: Page = {
        id: uid(),
        bgColor: src.bgColor,
        duration: src.duration,
        notes: src.notes,
        elements: src.elements.map((e) => ({ ...e, id: uid() })),
      };
      const next = [...pages.slice(0, index + 1), clone, ...pages.slice(index + 1)];
      set({ ...syncCurrent(next, index + 1), selectedId: null, selectedIds: [] });
    },
    setCurrentPage: (index) => {
      const { pages } = get();
      if (index < 0 || index >= pages.length) return;
      set({ ...syncCurrent(pages, index), selectedId: null, selectedIds: [] });
    },
    movePage: (from, to) => {
      const { pages, currentIndex } = get();
      if (from === to || from < 0 || to < 0 || from >= pages.length || to >= pages.length) return;
      pushHistory();
      const arr = [...pages];
      const [m] = arr.splice(from, 1);
      arr.splice(to, 0, m);
      const newIdx = currentIndex === from ? to : currentIndex;
      set(syncCurrent(arr, newIdx));
    },
    setPageDuration: (index, seconds) => {
      const { pages, currentIndex } = get();
      if (index < 0 || index >= pages.length) return;
      const d = Math.max(0.2, Math.min(60, seconds));
      const next = pages.map((p, i) => (i === index ? { ...p, duration: d } : p));
      set(syncCurrent(next, currentIndex));
    },

    // ---- Find & replace: every element type that carries editable copy ----
    replaceAllText: (find, replaceWith, matchCase) => {
      if (!find) return 0;
      const { pages, currentIndex } = get();
      let count = 0;
      const rx = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), matchCase ? "g" : "gi");
      const sub = (s: string) => {
        if (!s) return s;
        const hits = s.match(rx);
        rx.lastIndex = 0;
        if (!hits) return s;
        count += hits.length;
        return s.replace(rx, replaceWith);
      };
      const next = pages.map((p) => ({
        ...p,
        elements: p.elements.map((e): AnyElement => {
          switch (e.type) {
            case "text":
            case "button":
              return { ...e, text: sub(e.text) };
            case "ui":
              return { ...e, title: sub(e.title), body: sub(e.body), items: e.items.map(sub), files: e.files?.map(sub) };
            case "table":
              return { ...e, rows: e.rows.map((r) => r.map(sub)) };
            case "quiz":
              return {
                ...e,
                question: sub(e.question),
                options: e.options.map((o) => ({ ...o, text: sub(o.text) })),
              };
            case "chart":
              return {
                ...e,
                title: e.title != null ? sub(e.title) : e.title,
                data: e.data.map((d) => ({ ...d, label: sub(d.label) })),
              };
            default:
              return e;
          }
        }),
      }));
      if (!count) return 0;
      pushHistory();
      set(syncCurrent(next, currentIndex));
      return count;
    },

    // ---- Master style: current page becomes the deck-wide template ----
    applyBackgroundToDeck: () => {
      pushHistory();
      const { pages, currentIndex } = get();
      const src = pages[currentIndex];
      const next = pages.map((p) => ({
        ...p,
        bgColor: src.bgColor,
        bgImage: src.bgImage,
        bgFit: src.bgFit,
      }));
      set(syncCurrent(next, currentIndex));
    },
    applyTransitionToDeck: () => {
      pushHistory();
      const { pages, currentIndex } = get();
      const src = pages[currentIndex];
      const next = pages.map((p) => ({
        ...p,
        transition: src.transition,
        transitionZoom: src.transitionZoom,
      }));
      set(syncCurrent(next, currentIndex));
    },

    setDesignMeta: ({ id, name }) => set({ designId: id, designName: name }),
    setDesignName: (designName) => set({ designName }),
    loadDesign: ({ id, name, pages, canvasW, canvasH }) => {
      const normalized = pages.map((p) => ({
        ...p,
        duration: p.duration ?? DEFAULT_PAGE_DURATION,
      }));
      const safePages = normalized.length > 0 ? normalized : [newPage()];
      set({
        ...syncCurrent(safePages, 0),
        canvasW,
        canvasH,
        designId: id,
        designName: name,
        history: [],
        future: [],
        selectedId: null,
        selectedIds: [],
      });
    },
    newDesign: () => {
      set({
        ...syncCurrent(cloneDefaultPages(), 0),
        canvasW: DEFAULT_W,
        canvasH: DEFAULT_H,
        designId: null,
        designName: "untitled.design",
        history: [],
        future: [],
        selectedId: null,
        selectedIds: [],
      });
    },
  };
});
