import { create } from "zustand";

export type ElementBase = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  animation?: ElementAnimation;
  interaction?: ElementInteraction;
};

export type ElementAnimation = "none" | "fade-up" | "pop" | "glitch";
export type SlideTransition = "none" | "fade" | "slide" | "glitch" | "zoom" | "flip" | "morph";
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
  blendMode?: BlendMode;
  imageOverlay?: string;
  interaction?: ElementInteraction;
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
  | "accent_slash";
export type ShapeEffect = "none" | "liquid_glass" | "neon" | "soft_shadow" | "inner_glow" | "holographic" | "glitch" | "honeycomb";
export type BlendMode = "normal" | "screen" | "overlay" | "multiply" | "color-dodge";
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
  blendMode?: BlendMode;
  imageOverlay?: string;
  strokeStyle?: "solid" | "dashed" | "dotted";
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
};

export type ImageElement = ElementBase & {
  type: "image";
  src: string;
  illustrationFormat?: "svg" | "png";
  assetKind?: "image" | "icon";
  tint?: string;
  filters?: ImageFilters;
  shadow?: ElementShadow;
  fit?: "cover" | "contain" | "fill";
  cornerRadius?: number;
  opacity?: number; // 0..1
  borderWidth?: number;
  borderColor?: string;
  flipX?: boolean;
  flipY?: boolean;
  gradient?: ShapeGradient; // optional color wash over the image
  gradientOpacity?: number; // 0..1
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
  | "swiss";
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
  | "timeline";

export type UiElement = ElementBase & {
  type: "ui";
  kind: UiKind;
  uiStyle: UiStyle;
  title: string;
  body: string;
  value: number; // 0-100 (progress) or numeric stat
  items: string[];
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
    bg: "#0a0f1f",
    fg: "#7df9ff",
    muted: "rgba(125,249,255,0.6)",
    accent: "#ff0080",
    border: "#7df9ff",
    borderWidth: 1,
    radius: 0,
    shadow: "0 0 18px rgba(125,249,255,0.45)",
    font: "'Orbitron', 'JetBrains Mono', monospace",
    letterSpacing: "0.14em",
    uppercase: true,
    onAccent: "#ffffff",
    dark: true,
  },
  glass: {
    label: "Glass",
    bg: "rgba(255,255,255,0.24)",
    fg: "#ffffff",
    muted: "rgba(255,255,255,0.82)",
    accent: "#7df9ff",
    border: "rgba(255,255,255,0.62)",
    borderWidth: 1,
    radius: 22,
    shadow: "0 18px 40px rgba(0,0,0,0.25), inset 1px 1px 1px rgba(255,255,255,0.5)",
    font: "'Inter', system-ui, sans-serif",
    letterSpacing: "0.01em",
    uppercase: false,
    backdrop: "blur(16px) saturate(160%)",
    onAccent: "#0a0f1f",
    dark: true,
  },
  neobrutalist: {
    label: "Neobrutal",
    bg: "#ffd84a",
    fg: "#0a0a0a",
    muted: "rgba(10,10,10,0.7)",
    accent: "#ff0080",
    border: "#0a0a0a",
    borderWidth: 4,
    radius: 0,
    shadow: "10px 10px 0 0 #0a0a0a",
    font: "'Archivo Black', 'Inter', sans-serif",
    letterSpacing: "0.02em",
    uppercase: true,
    onAccent: "#ffffff",
  },
  sketch: {
    label: "Sketch",
    bg: "#fdfcf7",
    fg: "#1b1b1b",
    muted: "rgba(27,27,27,0.6)",
    accent: "#2b6cff",
    border: "#1b1b1b",
    borderWidth: 2,
    radius: 14,
    shadow: "2px 3px 0 rgba(27,27,27,0.35)",
    font: "'Caveat', 'Comic Sans MS', cursive",
    letterSpacing: "0.01em",
    uppercase: false,
    onAccent: "#ffffff",
  },
  xp: {
    label: "XP",
    bg: "#ece9d8",
    fg: "#0a246a",
    muted: "#4a4a4a",
    accent: "#245edb",
    border: "#7f9db9",
    borderWidth: 2,
    radius: 6,
    shadow: "inset -1px -1px 0 #808080, inset 1px 1px 0 #ffffff, 3px 3px 6px rgba(0,0,0,0.25)",
    font: "'Tahoma', 'Verdana', sans-serif",
    letterSpacing: "0em",
    uppercase: false,
    onAccent: "#ffffff",
  },
  aqua: {
    label: "Aqua",
    bg: "#f6f8fc",
    fg: "#10131a",
    muted: "rgba(16,19,26,0.55)",
    accent: "#0a84ff",
    border: "rgba(0,0,0,0.12)",
    borderWidth: 1,
    radius: 18,
    shadow: "0 12px 34px rgba(15,23,42,0.16)",
    font: "'Inter', -apple-system, system-ui, sans-serif",
    letterSpacing: "-0.01em",
    uppercase: false,
    onAccent: "#ffffff",
  },
  midnight: {
    label: "Midnight",
    bg: "#0b0d12",
    fg: "#e8ecf4",
    muted: "rgba(232,236,244,0.55)",
    accent: "#6366f1",
    border: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    radius: 14,
    shadow: "0 18px 44px rgba(0,0,0,0.55)",
    font: "'Inter', system-ui, sans-serif",
    letterSpacing: "-0.01em",
    uppercase: false,
    onAccent: "#ffffff",
    dark: true,
  },
  pastel: {
    label: "Pastel",
    bg: "#fff5f7",
    fg: "#4a3b47",
    muted: "rgba(74,59,71,0.6)",
    accent: "#f48fb1",
    border: "#f3d3dd",
    borderWidth: 2,
    radius: 26,
    shadow: "0 10px 24px rgba(244,143,177,0.25)",
    font: "'Quicksand', 'Nunito', sans-serif",
    letterSpacing: "0.01em",
    uppercase: false,
    onAccent: "#ffffff",
  },
  vapor: {
    label: "Vapor",
    bg: "linear-gradient(160deg,#2b1055 0%,#7597de 100%)",
    fg: "#ffe6ff",
    muted: "rgba(255,230,255,0.7)",
    accent: "#ff71ce",
    border: "#01cdfe",
    borderWidth: 2,
    radius: 8,
    shadow: "0 0 26px rgba(255,113,206,0.55), 0 0 60px rgba(1,205,254,0.35)",
    font: "'Orbitron', 'Inter', sans-serif",
    letterSpacing: "0.16em",
    uppercase: true,
    onAccent: "#2b1055",
    dark: true,
  },
  material: {
    label: "Material",
    bg: "#ffffff",
    fg: "#1c1b1f",
    muted: "rgba(28,27,31,0.6)",
    accent: "#6750a4",
    border: "rgba(28,27,31,0.12)",
    borderWidth: 1,
    radius: 16,
    shadow: "0 1px 2px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.15)",
    font: "'Roboto', 'Inter', sans-serif",
    letterSpacing: "0.005em",
    uppercase: false,
    onAccent: "#ffffff",
  },
  matrix: {
    label: "Matrix",
    bg: "#020a03",
    fg: "#37ff7f",
    muted: "rgba(55,255,127,0.55)",
    accent: "#a6ff00",
    border: "#1c8c3f",
    borderWidth: 1,
    radius: 0,
    shadow: "0 0 22px rgba(55,255,127,0.35), inset 0 0 40px rgba(0,255,120,0.08)",
    font: "'JetBrains Mono', monospace",
    letterSpacing: "0.08em",
    uppercase: false,
    onAccent: "#020a03",
    dark: true,
  },
  swiss: {
    label: "Swiss",
    bg: "#f4f2ed",
    fg: "#111111",
    muted: "rgba(17,17,17,0.55)",
    accent: "#e2231a",
    border: "#111111",
    borderWidth: 1,
    radius: 0,
    shadow: "none",
    font: "'Helvetica Neue', 'Inter', Arial, sans-serif",
    letterSpacing: "-0.02em",
    uppercase: true,
    onAccent: "#ffffff",
  },
};

export type AnyElement =
  | TextElement
  | ShapeElement
  | ImageElement
  | IconElement
  | QuizElement
  | ChartElement
  | ButtonElement
  | EmbedElement
  | UiElement;

export type Page = {
  id: string;
  elements: AnyElement[];
  bgColor: string;
  duration: number; // seconds
  bgImage?: string; // data URL or http URL
  bgFit?: BgFit;
  transition?: SlideTransition;
};

export const DEFAULT_W = 1920;
export const DEFAULT_H = 1080;
const DEFAULT_BG = "#fafaf2";
export const DEFAULT_PAGE_DURATION = 3;

export const CANVAS_PRESETS = [
  { name: "Square", w: 1080, h: 1080 },
  { name: "Story", w: 1080, h: 1920 },
  { name: "Post 4:5", w: 1080, h: 1350 },
  { name: "Landscape", w: 1920, h: 1080 },
  { name: "A4", w: 1240, h: 1754 },
  { name: "Slide 16:9", w: 1920, h: 1080 },
] as const;

type Tool = "home" | "text" | "elements" | "design" | "ai" | "components" | "illustrations";

type HistorySnap = { pages: Page[]; currentIndex: number };

type State = {
  pages: Page[];
  currentIndex: number;
  // derived mirror of current page (kept in sync)
  elements: AnyElement[];
  bgColor: string;
  selectedId: string | null;
  tool: Tool;
  canvasW: number;
  canvasH: number;
  history: HistorySnap[];
  future: HistorySnap[];
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
  add: (el: AnyElement) => void;
  update: (id: string, patch: Partial<AnyElement>) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  setBg: (c: string) => void;
  setBgImage: (src: string | undefined, fit?: BgFit) => void;
  setTransition: (t: SlideTransition) => void;
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

// Map a UI style pack onto chart colors so charts match UI components.
/** A guaranteed-opaque background for a style pack (charts, quizzes, buttons). */
export const solidThemeBg = (uiStyle: UiStyle): string => {
  const t = UI_STYLE_THEMES[uiStyle];
  if (t.bg.startsWith("#")) return t.bg;
  return t.dark ? "#1b2233" : "#ffffff";
};

export const chartStylePatch = (uiStyle: UiStyle): Partial<ChartElement> => {
  const t = UI_STYLE_THEMES[uiStyle];
  const solidBg = solidThemeBg(uiStyle);
  const palettes: Record<UiStyle, string[]> = {
    cyber: ["#7df9ff", "#ff0080", "#ffd84a", "#4d7cff", "#00ff88", "#b16bff"],
    glass: ["#7df9ff", "#ffffff", "#a5b4fc", "#fca5a5", "#86efac", "#fcd34d"],
    neobrutalist: ["#ff0080", "#0a0a0a", "#2b6cff", "#00c853", "#ff6d00", "#8e24aa"],
    sketch: ["#2b6cff", "#1b1b1b", "#e8534f", "#3aa76d", "#f2a33c", "#7b5ea7"],
    xp: ["#245edb", "#3ec53e", "#e8a33d", "#c0392b", "#7f9db9", "#8e44ad"],
    aqua: ["#0a84ff", "#30d158", "#ff9f0a", "#ff375f", "#5e5ce6", "#64d2ff"],
    midnight: ["#6366f1", "#22d3ee", "#f472b6", "#facc15", "#34d399", "#a78bfa"],
    pastel: ["#f48fb1", "#a5d8f3", "#c5e1a5", "#ffd59e", "#c8b6e2", "#f6a5a5"],
    vapor: ["#ff71ce", "#01cdfe", "#05ffa1", "#b967ff", "#fffb96", "#7597de"],
    material: ["#6750a4", "#00897b", "#ef6c00", "#c62828", "#1565c0", "#2e7d32"],
    matrix: ["#37ff7f", "#a6ff00", "#1c8c3f", "#7dffb0", "#00c853", "#d4ff4d"],
    swiss: ["#e2231a", "#111111", "#0057b7", "#f2b705", "#767676", "#3d8361"],
  };
  return { uiStyle, bgColor: solidBg, fgColor: t.fg, colors: palettes[uiStyle] };
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
  const s = (raw || "").trim();
  if (!s) return "";
  try {
    const u = new URL(s);
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
    return s;
  } catch {
    return s;
  }
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
  { w: number; h: number; title: string; body: string; value: number; items: string[] }
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
    items: ["$ npm install", "added 214 packages", "$ npm run build", "✓ built in 1.24s"],
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

const initialPage = newPage();

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

  return {
    pages: [initialPage],
    currentIndex: 0,
    elements: initialPage.elements,
    bgColor: initialPage.bgColor,
    selectedId: null,
    tool: "home",
    canvasW: DEFAULT_W,
    canvasH: DEFAULT_H,
    history: [],
    future: [],
    presenting: false,
    designId: null,
    designName: "untitled.design",
    guides: { v: [], h: [] },
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
          if (scaled.type === "text") {
            return { ...scaled, fontSize: Math.max(8, Math.round(scaled.fontSize * s)) };
          }
          return scaled;
        }),
      }));
      set({ ...syncCurrent(next, currentIndex), canvasW: w, canvasH: h, selectedId: null });
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
      set({ ...syncCurrent(next, currentIndex), selectedId: null });
    },
    setPresenting: (presenting) => set({ presenting }),
    setGuides: (guides) => set({ guides }),
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
      } as AnyElement;
      updateCurrentPage((p) => ({ ...p, elements: [...p.elements, clone] }));
      set({ selectedId: clone.id });
    },
    select: (selectedId) => set({ selectedId }),

    add: (el) => {
      pushHistory();
      updateCurrentPage((p) => ({ ...p, elements: [...p.elements, el] }));
      set({ selectedId: el.id });
    },
    update: (id, patch) =>
      updateCurrentPage((p) => ({
        ...p,
        elements: p.elements.map((e) => (e.id === id ? ({ ...e, ...patch } as AnyElement) : e)),
      })),
    remove: (id) => {
      pushHistory();
      updateCurrentPage((p) => ({ ...p, elements: p.elements.filter((e) => e.id !== id) }));
      if (get().selectedId === id) set({ selectedId: null });
    },
    duplicate: (id) => {
      const el = get().elements.find((e) => e.id === id);
      if (!el) return;
      pushHistory();
      const clone = { ...el, id: uid(), x: el.x + 30, y: el.y + 30 } as AnyElement;
      updateCurrentPage((p) => ({ ...p, elements: [...p.elements, clone] }));
      set({ selectedId: clone.id });
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
      updateCurrentPage((p) => ({ ...p, transition: t }));
    },
    undo: () => {
      const { history, future } = get();
      if (history.length === 0) return;
      const prev = history[history.length - 1];
      set({
        ...syncCurrent(prev.pages, Math.min(prev.currentIndex, prev.pages.length - 1)),
        history: history.slice(0, -1),
        future: [snap(), ...future].slice(0, 50),
        selectedId: null,
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
      });
    },
    clear: () => {
      pushHistory();
      updateCurrentPage((p) => ({ ...p, elements: [] }));
      set({ selectedId: null });
    },
    loadTemplate: (els, bg) => {
      pushHistory();
      updateCurrentPage((p) => ({ ...p, elements: els, bgColor: bg ?? p.bgColor }));
      set({ selectedId: null });
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
      set({ ...syncCurrent(safe, 0), selectedId: null });
    },

    addPage: () => {
      pushHistory();
      const { pages, currentIndex, bgColor } = get();
      const created = newPage({ bgColor });
      const next = [...pages.slice(0, currentIndex + 1), created, ...pages.slice(currentIndex + 1)];
      set({ ...syncCurrent(next, currentIndex + 1), selectedId: null });
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
      set({ ...syncCurrent(next, newIdx), selectedId: null });
    },
    duplicatePage: (index) => {
      pushHistory();
      const { pages } = get();
      const src = pages[index];
      const clone: Page = {
        id: uid(),
        bgColor: src.bgColor,
        duration: src.duration,
        elements: src.elements.map((e) => ({ ...e, id: uid() })),
      };
      const next = [...pages.slice(0, index + 1), clone, ...pages.slice(index + 1)];
      set({ ...syncCurrent(next, index + 1), selectedId: null });
    },
    setCurrentPage: (index) => {
      const { pages } = get();
      if (index < 0 || index >= pages.length) return;
      set({ ...syncCurrent(pages, index), selectedId: null });
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
      });
    },
    newDesign: () => {
      const fresh = newPage();
      set({
        ...syncCurrent([fresh], 0),
        canvasW: DEFAULT_W,
        canvasH: DEFAULT_H,
        designId: null,
        designName: "untitled.design",
        history: [],
        future: [],
        selectedId: null,
      });
    },
  };
});
