import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AnyElement } from "@/store/editor";

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
  type: "paint" | "video";
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
    const type = app.type === "paint" || app.type === "video" ? app.type : null;
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

/** Plugins that ship with the editor. Never stored, never removable. */
export const PREINSTALLED_PLUGINS: EditorPlugin[] = [
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
];

/** All usable plugins: preinstalled first, then user-imported ones. */
export function allPlugins(userPlugins: EditorPlugin[]): EditorPlugin[] {
  return [...PREINSTALLED_PLUGINS, ...userPlugins];
}

/* ------------------------------------------------------------------ */
/* Store (persisted in localStorage)                                    */
/* ------------------------------------------------------------------ */

type PluginsState = {
  plugins: EditorPlugin[];
  importPlugin: (code: string) => EditorPlugin;
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
