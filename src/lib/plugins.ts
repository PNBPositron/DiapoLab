import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AnyElement } from "@/store/editor";
// (widget-pack element groups below are plain AnyElement literals —
// ids are placeholders, replaced on insert by instantiateWidget)

/* ------------------------------------------------------------------ */
/* Plugin model                                                        */
/* ------------------------------------------------------------------ */

/** A widget is a named group of canvas elements the user can drop. */
export type PluginWidget = {
  name: string;
  description?: string;
  elements: AnyElement[] | (() => AnyElement[]);
};

/**
 * An APP is an interactive mini-tool shipped by a plugin. Apps run inside
 * the editor and produce canvas elements.
 * Supported types: "paint" (freehand drawing pad), "video" (upload, trim
 * & insert video clips on the slide).
 */
export type PluginApp = {
  id?: string;
  name: string;
  description?: string;
  type: "paint" | "video" | "image";
  config?: {
    /** swatches shown in the color picker (any CSS color) */
    colors?: string[];
    defaultColor?: string;
    /** brush sizes in px (palette on screen) */
    brushSizes?: number[];
    /** paint canvas background — "transparent" for none */
    bg?: string;
    /** export size in canvas pixels (slide is 1920x1080) */
    width?: number;
    height?: number;
  };
};

/** A plugin as stored on the device once imported. */
export type EditorPlugin = {
  id: string;
  name: string;
  author?: string;
  version?: string;
  description?: string;
  enabled: boolean;
  widgets: PluginWidget[];
  apps?: PluginApp[];
  importedAt: number;
};

type PluginMeta = Omit<EditorPlugin, "id" | "enabled" | "importedAt">;

/* ------------------------------------------------------------------ */
/* Plugin code evaluation                                              */
/* ------------------------------------------------------------------ */

const MAX_WIDGETS = 50;
const MAX_ELEMENTS = 200;

function normalizeWidgets(raw: unknown): PluginWidget[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("A plugin needs a non-empty \u201Cwidgets\u201D array.");
  }
  const widgets: PluginWidget[] = [];
  for (const w of raw.slice(0, MAX_WIDGETS)) {
    if (!w || typeof w !== "object") continue;
    const widget = w as Record<string, unknown>;
    const name = typeof widget.name === "string" && widget.name.trim() ? widget.name.trim() : null;
    const elements = widget.elements;
    const isValid =
      Array.isArray(elements)
        ? (elements as unknown[]).every((e) => e && typeof e === "object" && typeof (e as Record<string, unknown>).type === "string")
        : typeof elements === "function";
    if (!name || !isValid) continue;
    widgets.push({
      name,
      description: typeof widget.description === "string" ? widget.description : undefined,
      elements: elements as PluginWidget["elements"],
    });
  }
  if (widgets.length === 0) {
    throw new Error("No valid widgets found. Each widget needs a \u201Cname\u201D and an \u201Celements\u201D array.");
  }
  return widgets;
}

const MAX_APPS = 10;

function normalizeApps(raw: unknown): PluginApp[] {
  if (!Array.isArray(raw)) return [];
  const apps: PluginApp[] = [];
  for (const a of raw.slice(0, MAX_APPS)) {
    if (!a || typeof a !== "object") continue;
    const app = a as Record<string, unknown>;
    const name = typeof app.name === "string" && app.name.trim() ? app.name.trim() : null;
    const type = app.type === "paint" || app.type === "video" || app.type === "image" ? app.type : null;
    if (!name || !type) continue;
    const cfg = (app.config ?? {}) as Record<string, unknown>;
    apps.push({
      id: typeof app.id === "string" ? app.id : undefined,
      name,
      description: typeof app.description === "string" ? app.description : undefined,
      type,
      config: {
        colors: Array.isArray(cfg.colors) ? (cfg.colors as unknown[]).filter((x) => typeof x === "string").slice(0, 12) as string[] : undefined,
        defaultColor: typeof cfg.defaultColor === "string" ? cfg.defaultColor : undefined,
        brushSizes: Array.isArray(cfg.brushSizes) ? (cfg.brushSizes as unknown[]).filter((x) => typeof x === "number").slice(0, 6) as number[] : undefined,
        bg: typeof cfg.bg === "string" ? cfg.bg : undefined,
        width: typeof cfg.width === "number" ? Math.min(3840, Math.max(64, Math.round(cfg.width))) : undefined,
        height: typeof cfg.height === "number" ? Math.min(2160, Math.max(64, Math.round(cfg.height))) : undefined,
      },
    });
  }
  return apps;
}

/**
 * Evaluates user-provided plugin code. Two formats are accepted:
 *   1. `diapolabPlugin({ name, widgets: [...] })` — the callback style
 *   2. a plain expression evaluating to the same object
 */
export function evaluatePluginCode(code: string): PluginMeta {
  const trimmed = code.trim();
  if (!trimmed) throw new Error("Paste some plugin code first.");

  // Strategy A — callback style: diapolabPlugin({...}) or function return
  let captured: unknown;
  let returned: unknown;
  try {
    const fn = new Function("diapolabPlugin", `"use strict";\n${trimmed}`);
    returned = fn((p: unknown) => {
      captured = p;
    });
  } catch {
    captured = undefined;
    returned = undefined;
  }

  // Strategy B — plain expression returning the plugin object
  let obj = captured ?? returned;
  if (!obj || typeof obj !== "object") {
    try {
      obj = new Function(`"use strict"; return (${trimmed})`)();
    } catch {
      obj = null;
    }
  }

  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    throw new Error('Could not read the plugin. Call diapolabPlugin({ name, widgets: [...] }) or return that object.');
  }
  const raw = obj as Record<string, unknown>;
  const name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : null;
  if (!name) throw new Error('The plugin object needs a "name" string.');
  return {
    name,
    author: typeof raw.author === "string" ? raw.author : undefined,
    version: typeof raw.version === "string" ? raw.version : undefined,
    description: typeof raw.description === "string" ? raw.description : undefined,
    widgets: normalizeWidgets(raw.widgets),
    apps: normalizeApps(raw.apps),
  };
}

/* ------------------------------------------------------------------ */
/* Dedicated import formats                                            */
/*   • App code  → diapolabApp({ name, author, apps: [...] })          */
/*   • Pack code → diapolabPack({ name, author, widgets: [...] })      */
/* The two formats are intentionally separate: apps and widget packs   */
/* each have their own code, samples and import path.                 */
/* ------------------------------------------------------------------ */

function evalObject(code: string, callbackName: string): Record<string, unknown> {
  const trimmed = code.trim();
  if (!trimmed) throw new Error("Paste some code first.");
  let captured: unknown;
  try {
    const fn = new Function(callbackName, `"use strict";\n${trimmed}`);
    fn((p: unknown) => {
      captured = p;
    });
  } catch {
    /* fall through to plain expression */
  }
  let obj = captured;
  if (!obj || typeof obj !== "object") {
    try {
      obj = new Function(`"use strict"; return (${trimmed})`)();
    } catch {
      obj = null;
    }
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    throw new Error(`Could not read the code. Call ${callbackName}({ ... }) or return that object.`);
  }
  return obj as Record<string, unknown>;
}

function readMeta(raw: Record<string, unknown>): Pick<PluginMeta, "name" | "author" | "version" | "description"> {
  const name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : null;
  if (!name) throw new Error('The object needs a "name" string.');
  return {
    name,
    author: typeof raw.author === "string" ? raw.author : undefined,
    version: typeof raw.version === "string" ? raw.version : undefined,
    description: typeof raw.description === "string" ? raw.description : undefined,
  };
}

/** App code: `diapolabApp({ name, author, apps: [...] })` — adds apps only. */
export function evaluateAppCode(code: string): PluginMeta {
  const raw = evalObject(code, "diapolabApp");
  const apps = normalizeApps(raw.apps);
  if (apps.length === 0) {
    throw new Error('App code needs a non-empty "apps" array (type "paint", "video" or "image").');
  }
  return { ...readMeta(raw), widgets: [], apps };
}

/** Pack code: `diapolabPack({ name, author, widgets: [...] })` — packs only. */
export function evaluatePackCode(code: string): PluginMeta {
  const raw = evalObject(code, "diapolabPack");
  return { ...readMeta(raw), widgets: normalizeWidgets(raw.widgets), apps: [] };
}

export const SAMPLE_APP_CODE = `diapolabApp({
  name: "Sketch tools",
  author: "DiapoLab",
  version: "1.0.0",
  description: "A custom drawing pad with a pastel palette.",
  apps: [
    {
      name: "Pastel pad",
      description: "Soft pastel doodles, inserted as an image",
      type: "paint",
      config: {
        colors: ["#fbcfe8", "#ddd6fe", "#bfdbfe", "#bbf7d0", "#fde68a", "#0f172a"],
        defaultColor: "#0f172a",
        brushSizes: [4, 8, 16, 28],
        bg: "#fffbeb",
      },
    },
  ],
});`;

export const SAMPLE_PACK_CODE = `diapolabPack({
  name: "Micro layout",
  author: "DiapoLab",
  version: "1.0.0",
  description: "Two tiny layout presets.",
  widgets: [
    {
      name: "Callout",
      description: "Accent chip + line",
      elements: [
        { type: "shape", x: 120, y: 160, width: 120, height: 12, rotation: 0, shape: "rect", fill: "#0ea5e9", stroke: "transparent", strokeWidth: 0, cornerRadius: 6 },
        { type: "text", x: 120, y: 184, width: 700, height: 60, rotation: 0, text: "Key takeaway", fontSize: 44, color: "#0f172a", fontWeight: 800, fontFamily: "Inter", align: "left" }
      ]
    },
    {
      name: "Kicker",
      description: "Small uppercase label",
      elements: [
        { type: "text", x: 120, y: 140, width: 500, height: 40, rotation: 0, text: "SECTION 01", fontSize: 24, color: "#0ea5e9", fontWeight: 800, fontFamily: "Inter", align: "left", letterSpacing: 0.2 }
      ]
    }
  ]
});`;

/** Export an app plugin as portable app code. */
export function appToCode(plugin: EditorPlugin): string {
  return `diapolabApp(${JSON.stringify({ name: plugin.name, author: plugin.author, version: plugin.version, description: plugin.description, apps: plugin.apps }, null, 2)});`;
}

/** Export a widget-pack plugin as portable pack code. */
export function packToCode(plugin: EditorPlugin): string {
  const widgets = plugin.widgets.map((widget) => ({ ...widget, elements: typeof widget.elements === "function" ? widget.elements() : widget.elements }));
  return `diapolabPack(${JSON.stringify({ name: plugin.name, author: plugin.author, version: plugin.version, description: plugin.description, widgets }, null, 2)});`;
}

/* ------------------------------------------------------------------ */
/* Sample plugin                                                       */
/* ------------------------------------------------------------------ */

export const SAMPLE_PLUGIN_CODE = `diapolabPlugin({
  name: "Starter Kit",
  author: "DiapoLab",
  version: "1.0.0",
  description: "Two ready-to-drop widget presets.",
  apps: [
    {
      name: "Quick paint",
      description: "Doodle on a pad, insert it as an image",
      type: "paint",
      config: {
        colors: ["#2563eb", "#ff0080", "#ffd84a", "#059669", "#111827"],
        defaultColor: "#2563eb",
        bg: "#f8fafc",
      },
    },
  ],
  widgets: [
    {
      name: "Section header",
      description: "Accent bar + big title",
      elements: [
        { type: "shape", x: 120, y: 160, width: 160, height: 16, rotation: 0, shape: "rect", fill: "#2563eb", stroke: "transparent", strokeWidth: 0 },
        { type: "text", x: 120, y: 196, width: 900, height: 120, rotation: 0, text: "Section title", fontSize: 64, color: "#0f172a", fontWeight: 900, fontFamily: "Archivo Black", align: "left" }
      ]
    },
    {
      name: "Quote block",
      description: "Italic pull-quote",
      elements: [
        { type: "text", x: 160, y: 420, width: 800, height: 140, rotation: 0, text: "\u201CDesign is intelligence made visible.\u201D", fontSize: 40, color: "#1e293b", fontWeight: 600, fontFamily: "Georgia", align: "left", italic: true }
      ]
    }
  ]
});`;

/* ------------------------------------------------------------------ */
/* Preinstalled plugins                                                */
/* ------------------------------------------------------------------ */

/** The built-in Paint app — shipped with the editor, always available. */
export const PAINT_APP: PluginApp = {
  id: "paint",
  name: "Paint",
  description: "Drawing studio — brush, shapes, arrows & more",
  type: "paint",
  config: {
    colors: ["#0a0f1f", "#2563eb", "#ff0080", "#ffd84a", "#059669", "#7c3aed", "#f97316", "#7df9ff"],
    defaultColor: "#2563eb",
    brushSizes: [4, 8, 16, 28, 48],
    bg: "#ffffff",
  },
};

/** The built-in Video app — upload, trim and insert video clips. */
export const VIDEO_APP: PluginApp = {
  id: "video",
  name: "Video",
  description: "Upload, trim & insert video clips",
  type: "video",
};

/** The built-in Image app — advanced image editor. */
export const IMAGE_APP: PluginApp = {
  id: "image",
  name: "Image",
  description: "Advanced image editor — filters, crop, rotate & flip",
  type: "image",
};

/* ------------------------------------------------------------------ */
/* Preinstalled widget packs — ready-to-drop element groups            */
/* (texts, shapes…) in five styles: glitch, terminal, digital, glass,  */
/* modern. Each widget lands as one grouped block on the canvas.       */
/* ------------------------------------------------------------------ */

/** Drop-in widget groups for the "Widget packs" preinstalled plugin. */
export const WIDGET_PACK_ELEMENTS: PluginWidget[] = [
  // ---- GLITCH ----------------------------------------------------------
  {
    name: "Glitch · Title",
    description: "RGB-split heading with scan slices",
    elements: [
      { id: "w", type: "text", x: 120, y: 200, width: 1100, height: 150, rotation: 0, text: "SYSTEM FAILURE", fontSize: 104, color: "#00ffff", fontWeight: 900, fontFamily: "Archivo Black", align: "left", letterSpacing: 0.06, opacity: 0.9 },
      { id: "w", type: "text", x: 112, y: 208, width: 1100, height: 150, rotation: 0, text: "SYSTEM FAILURE", fontSize: 104, color: "#ff0080", fontWeight: 900, fontFamily: "Archivo Black", align: "left", letterSpacing: 0.06, opacity: 0.9 },
      { id: "w", type: "text", x: 116, y: 204, width: 1100, height: 150, rotation: 0, text: "SYSTEM FAILURE", fontSize: 104, color: "#ffffff", fontWeight: 900, fontFamily: "Archivo Black", align: "left", letterSpacing: 0.06 },
      { id: "w", type: "shape", x: 118, y: 248, width: 420, height: 10, rotation: 0, shape: "rect", fill: "#7df9ff", stroke: "transparent", strokeWidth: 0, opacity: 0.9 },
      { id: "w", type: "shape", x: 240, y: 306, width: 300, height: 6, rotation: 0, shape: "rect", fill: "#ff0080", stroke: "transparent", strokeWidth: 0, opacity: 0.8 },
    ],
  },
  {
    name: "Glitch · Badge",
    description: "Dark plate + glitched monospace label",
    elements: [
      { id: "w", type: "shape", x: 140, y: 140, width: 460, height: 140, rotation: 0, shape: "rect", fill: "#0a0f1f", stroke: "#ff0080", strokeWidth: 3, effect: "glitch" },
      { id: "w", type: "text", x: 176, y: 176, width: 400, height: 70, rotation: 0, text: "ERROR_404", fontSize: 44, color: "#7df9ff", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", align: "left", letterSpacing: 0.08 },
      { id: "w", type: "text", x: 180, y: 180, width: 400, height: 70, rotation: 0, text: "ERROR_404", fontSize: 44, color: "#ff0080", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", align: "left", letterSpacing: 0.08, opacity: 0.7 },
    ],
  },
  // ---- TERMINAL --------------------------------------------------------
  {
    name: "Terminal · Window",
    description: "macOS-style terminal with prompt lines",
    elements: [
      { id: "w", type: "shape", x: 140, y: 140, width: 720, height: 420, rotation: 0, shape: "rect", fill: "#0a0f1f", stroke: "#1e293b", strokeWidth: 3, cornerRadius: 18 },
      { id: "w", type: "shape", x: 140, y: 140, width: 720, height: 56, rotation: 0, shape: "rect", fill: "#1e293b", stroke: "transparent", strokeWidth: 0 },
      { id: "w", type: "shape", x: 164, y: 162, width: 16, height: 16, rotation: 0, shape: "circle", fill: "#ff5f57", stroke: "transparent", strokeWidth: 0 },
      { id: "w", type: "shape", x: 190, y: 162, width: 16, height: 16, rotation: 0, shape: "circle", fill: "#febc2e", stroke: "transparent", strokeWidth: 0 },
      { id: "w", type: "shape", x: 216, y: 162, width: 16, height: 16, rotation: 0, shape: "circle", fill: "#28c840", stroke: "transparent", strokeWidth: 0 },
      { id: "w", type: "text", x: 260, y: 156, width: 400, height: 30, rotation: 0, text: "bash — 80×24", fontSize: 18, color: "#94a3b8", fontWeight: 500, fontFamily: "'JetBrains Mono', monospace", align: "left" },
      { id: "w", type: "text", x: 168, y: 220, width: 660, height: 36, rotation: 0, text: "$ npm run dev", fontSize: 22, color: "#4ade80", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", align: "left" },
      { id: "w", type: "text", x: 168, y: 258, width: 660, height: 36, rotation: 0, text: "✓ ready in 412ms", fontSize: 22, color: "#e2e8f0", fontWeight: 400, fontFamily: "'JetBrains Mono', monospace", align: "left" },
      { id: "w", type: "text", x: 168, y: 296, width: 660, height: 36, rotation: 0, text: "$ _", fontSize: 22, color: "#4ade80", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", align: "left" },
    ],
  },
  {
    name: "Terminal · Prompt",
    description: "Inline command line with cursor",
    elements: [
      { id: "w", type: "text", x: 140, y: 150, width: 700, height: 60, rotation: 0, text: "> type your command_", fontSize: 40, color: "#4ade80", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", align: "left", letterSpacing: 0.04 },
      { id: "w", type: "shape", x: 140, y: 216, width: 620, height: 4, rotation: 0, shape: "rect", fill: "#1e293b", stroke: "transparent", strokeWidth: 0 },
    ],
  },
  // ---- DIGITAL ---------------------------------------------------------
  {
    name: "Digital · Stat card",
    description: "Neon stat panel, Orbitron numerals",
    elements: [
      { id: "w", type: "shape", x: 140, y: 140, width: 560, height: 340, rotation: 0, shape: "rect", fill: "#0a0f1f", stroke: "#7df9ff", strokeWidth: 2, effect: "neon" },
      { id: "w", type: "text", x: 180, y: 190, width: 480, height: 130, rotation: 0, text: "98.6%", fontSize: 110, color: "#7df9ff", fontWeight: 900, fontFamily: "'Orbitron', sans-serif", align: "left", letterSpacing: 0.04 },
      { id: "w", type: "shape", x: 182, y: 340, width: 300, height: 5, rotation: 0, shape: "rect", fill: "#7df9ff", stroke: "transparent", strokeWidth: 0, opacity: 0.7 },
      { id: "w", type: "text", x: 180, y: 370, width: 480, height: 60, rotation: 0, text: "UPTIME — ALL SYSTEMS", fontSize: 26, color: "#7df9ff", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", align: "left", letterSpacing: 0.24 },
    ],
  },
  {
    name: "Digital · Badge",
    description: "Neon hexagon chip with status",
    elements: [
      { id: "w", type: "shape", x: 160, y: 140, width: 220, height: 220, rotation: 0, shape: "hexagon", fill: "#052e2b", stroke: "#7df9ff", strokeWidth: 4, effect: "neon" },
      { id: "w", type: "text", x: 140, y: 380, width: 260, height: 40, rotation: 0, text: "SYS ONLINE", fontSize: 24, color: "#7df9ff", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", align: "center", letterSpacing: 0.18 },
    ],
  },
  // ---- GLASS -----------------------------------------------------------
  {
    name: "Glass · Card",
    description: "Frosted translucent card + copy",
    elements: [
      { id: "w", type: "shape", x: 140, y: 140, width: 640, height: 380, rotation: 0, shape: "rect", fill: "rgba(255,255,255,0.18)", stroke: "rgba(255,255,255,0.6)", strokeWidth: 2, cornerRadius: 32, effect: "liquid_glass" },
      { id: "w", type: "text", x: 184, y: 190, width: 560, height: 70, rotation: 0, text: "Frosted headline", fontSize: 46, color: "#ffffff", fontWeight: 800, fontFamily: "Inter", align: "left" },
      { id: "w", type: "text", x: 184, y: 270, width: 560, height: 130, rotation: 0, text: "A translucent glass panel that floats over any background — the blur is applied by the liquid-glass effect.", fontSize: 22, color: "rgba(255,255,255,0.85)", fontWeight: 400, fontFamily: "Inter", align: "left", lineHeight: 1.5 },
    ],
  },
  {
    name: "Glass · Pill badge",
    description: "Capsule chip with centered label",
    elements: [
      { id: "w", type: "shape", x: 140, y: 150, width: 360, height: 110, rotation: 0, shape: "capsule", fill: "rgba(255,255,255,0.22)", stroke: "rgba(255,255,255,0.65)", strokeWidth: 2, effect: "liquid_glass" },
      { id: "w", type: "text", x: 140, y: 175, width: 360, height: 60, rotation: 0, text: "DROPLETS", fontSize: 32, color: "#ffffff", fontWeight: 800, fontFamily: "Inter", align: "center", letterSpacing: 0.12 },
    ],
  },
  // ---- MODERN ----------------------------------------------------------
  {
    name: "Modern · Section header",
    description: "Accent bar + title + subtitle",
    elements: [
      { id: "w", type: "shape", x: 140, y: 160, width: 160, height: 16, rotation: 0, shape: "rect", fill: "#2563eb", stroke: "transparent", strokeWidth: 0, cornerRadius: 8 },
      { id: "w", type: "text", x: 140, y: 196, width: 900, height: 120, rotation: 0, text: "Section title", fontSize: 72, color: "#0f172a", fontWeight: 900, fontFamily: "Archivo Black", align: "left" },
      { id: "w", type: "text", x: 144, y: 322, width: 760, height: 50, rotation: 0, text: "A short supporting sentence goes here.", fontSize: 26, color: "#64748b", fontWeight: 500, fontFamily: "Inter", align: "left" },
    ],
  },
  {
    name: "Modern · Stat",
    description: "White stat tile, big number + trend",
    elements: [
      { id: "w", type: "shape", x: 140, y: 140, width: 460, height: 300, rotation: 0, shape: "rect", fill: "#ffffff", stroke: "#e2e8f0", strokeWidth: 2, cornerRadius: 28, shadow: { x: 0, y: 18, blur: 40, color: "rgba(15,23,42,0.14)" } },
      { id: "w", type: "text", x: 184, y: 184, width: 380, height: 120, rotation: 0, text: "12.4k", fontSize: 88, color: "#0f172a", fontWeight: 900, fontFamily: "Archivo Black", align: "left" },
      { id: "w", type: "text", x: 188, y: 320, width: 380, height: 50, rotation: 0, text: "+18% this month", fontSize: 24, color: "#059669", fontWeight: 700, fontFamily: "Inter", align: "left" },
      { id: "w", type: "text", x: 188, y: 368, width: 380, height: 40, rotation: 0, text: "ACTIVE USERS", fontSize: 18, color: "#94a3b8", fontWeight: 700, fontFamily: "Inter", align: "left", letterSpacing: 0.14 },
    ],
  },
];

/** Plugins that ship with the editor. Never stored, never removable. */
export const PREINSTALLED_PLUGINS: EditorPlugin[] = [
  {
    id: "builtin-widget-packs",
    name: "Widget packs",
    author: "DiapoLab",
    version: "1.0.0",
    description: "Preinstalled packs — glitch, terminal, digital, glass & modern text/shape groups.",
    enabled: true,
    widgets: WIDGET_PACK_ELEMENTS,
    apps: [],
    importedAt: 0,
  },
  {
    id: "builtin-paint",
    name: "Paint",
    author: "DiapoLab",
    version: "1.0.0",
    description: "Built-in paint studio — draw on a pad, insert on the slide.",
    enabled: true,
    widgets: [],
    apps: [PAINT_APP],
    importedAt: 0,
  },
  {
    id: "builtin-video",
    name: "Video",
    author: "DiapoLab",
    version: "1.0.0",
    description: "Built-in video editor — upload a clip, trim it, insert it.",
    enabled: true,
    widgets: [],
    apps: [VIDEO_APP],
    importedAt: 0,
  },
  {
    id: "builtin-image",
    name: "Image",
    author: "DiapoLab",
    version: "1.0.0",
    description: "Built-in image editor — filters, crop, rotate & flip, insert on the slide.",
    enabled: true,
    widgets: [],
    apps: [IMAGE_APP],
    importedAt: 0,
  },
];

/** All usable plugins: preinstalled first, then user-imported ones. */
export function allPlugins(userPlugins: EditorPlugin[]): EditorPlugin[] {
  return [...PREINSTALLED_PLUGINS, ...userPlugins];
}

/** Export an installed plugin as portable code for publishing or sharing. */
export function pluginToCode(plugin: EditorPlugin): string {
  const widgets = plugin.widgets.map((widget) => ({ ...widget, elements: typeof widget.elements === "function" ? widget.elements() : widget.elements }));
  return `diapolabPlugin(${JSON.stringify({ name: plugin.name, author: plugin.author, version: plugin.version, description: plugin.description, apps: plugin.apps, widgets }, null, 2)});`;
}

/* ------------------------------------------------------------------ */
/* Store (persisted in localStorage)                                    */
/* ------------------------------------------------------------------ */

type PluginsState = {
  plugins: EditorPlugin[];
  importPlugin: (code: string) => EditorPlugin;
  importAppPlugin: (code: string) => EditorPlugin;
  importPackPlugin: (code: string) => EditorPlugin;
  removePlugin: (id: string) => void;
  togglePlugin: (id: string) => void;
};

export const usePlugins = create<PluginsState>()(
  persist(
    (set) => ({
      plugins: [],
      importPlugin: (code) => {
        const meta = evaluatePluginCode(code);
        const plugin: EditorPlugin = {
          ...meta,
          id: crypto.randomUUID(),
          enabled: true,
          importedAt: Date.now(),
        };
        set((s) => ({
          // Re-importing the same plugin name replaces it.
          plugins: [...s.plugins.filter((p) => p.name !== plugin.name), plugin],
        }));
        return plugin;
      },
      importAppPlugin: (code) => {
        const meta = evaluateAppCode(code);
        const plugin: EditorPlugin = { ...meta, id: crypto.randomUUID(), enabled: true, importedAt: Date.now() };
        set((s) => ({ plugins: [...s.plugins.filter((p) => p.name !== plugin.name), plugin] }));
        return plugin;
      },
      importPackPlugin: (code) => {
        const meta = evaluatePackCode(code);
        const plugin: EditorPlugin = { ...meta, id: crypto.randomUUID(), enabled: true, importedAt: Date.now() };
        set((s) => ({ plugins: [...s.plugins.filter((p) => p.name !== plugin.name), plugin] }));
        return plugin;
      },
      removePlugin: (id) => set((s) => ({ plugins: s.plugins.filter((p) => p.id !== id) })),
      togglePlugin: (id) =>
        set((s) => ({
          plugins: s.plugins.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)),
        })),
    }),
    { name: "diapolab.plugins.v1" },
  ),
);

/* ------------------------------------------------------------------ */
/* Instantiation                                                       */
/* ------------------------------------------------------------------ */

/** Materializes a widget's elements with fresh ids and a small offset.
 *  All elements of one widget share a groupId so they move as a single block. */
export function instantiateWidget(widget: PluginWidget, baseX = 140, baseY = 140): AnyElement[] {
  const raw = typeof widget.elements === "function" ? widget.elements() : widget.elements;
  const elements = Array.isArray(raw) ? raw.slice(0, MAX_ELEMENTS) : [];
  let minX = Infinity;
  let minY = Infinity;
  for (const el of elements) {
    minX = Math.min(minX, typeof el.x === "number" ? el.x : 0);
    minY = Math.min(minY, typeof el.y === "number" ? el.y : 0);
  }
  const dx = baseX - (minX === Infinity ? 0 : minX);
  const dy = baseY - (minY === Infinity ? 0 : minY);
  const groupId = crypto.randomUUID();
  return elements.map(
    (el) =>
      ({
        ...el,
        id: crypto.randomUUID(),
        groupId,
        x: (typeof el.x === "number" ? el.x : 0) + dx,
        y: (typeof el.y === "number" ? el.y : 0) + dy,
      }) as AnyElement,
  );
}
