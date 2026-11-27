import { useEffect, useState } from "react";
import {
  Home,
  Type,
  Shapes,
  Layers,
  Layers3,
  Palette,
  Folder,
  Library,
  Image,
  Sun,
  Moon,
} from "lucide-react";
import { useEditor } from "@/store/editor";
import { useSettings, springEasing, type PanelId } from "@/store/settings";
import { CUSTOM_THEME_PREFIX, DEFAULT_THEME_TOKENS, themeCssVars } from "@/lib/themes";
import "@/editor-ui.css";
import { TemplatesPanel } from "./panels/TemplatesPanel";
import { TextPanel } from "./panels/TextPanel";
import { ElementsPanel } from "./panels/ElementsPanel";
import { LibraryPanel } from "./panels/LibraryPanel";
import { MediaPanel } from "./panels/MediaPanel";
import { DesignPanel } from "./panels/DesignPanel";
import { LayersPanel } from "./panels/LayersPanel";
import { ComponentsPanel } from "./panels/ComponentsPanel";
import { MyDesignsDialog } from "./MyDesignsDialog";

const TOOLS = [
  { id: "home", label: "Home", icon: Home },
  { id: "text", label: "Text", icon: Type },
  { id: "elements", label: "Elements", icon: Shapes },
  { id: "library", label: "Library", icon: Library },
  { id: "media", label: "Media", icon: Image },
  { id: "components", label: "Presets", icon: Layers },
  { id: "design", label: "Design", icon: Palette },
  { id: "layers", label: "Layers", icon: Layers3 },
  { id: "my-designs", label: "Projects", icon: Folder },
] as const;

export function Sidebar() {
  const { tool, setTool } = useEditor();
  const {
    panels,
    panelDurationMs,
    panelStiffness,
    reduceMotion,
    editorTheme,
    editorDark,
    setEditorDark,
  } = useSettings();
  const [hovering, setHovering] = useState(false);
  // Pinned panels stay open after the cursor leaves (Doory-style).
  const [pinned, setPinned] = useState(false);
  const [systemReduced, setSystemReduced] = useState(false);
  const panelOpen = hovering || pinned;
  const customThemes = useSettings((s) => s.customThemes);

  // Escape unpins the side panel; a click on the active rail tool toggles it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPinned(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--font-display", '"Plus Jakarta Sans", system-ui, sans-serif');
    root.style.setProperty("--font-mono", '"JetBrains Mono", ui-monospace, monospace');
    const custom = editorTheme.startsWith(CUSTOM_THEME_PREFIX)
      ? customThemes.find((t) => `${CUSTOM_THEME_PREFIX}${t.id}` === editorTheme)
      : undefined;
    root.dataset.editorTheme = custom ? "custom" : editorTheme;
    for (const key of Object.keys(themeCssVars(DEFAULT_THEME_TOKENS)))
      root.style.removeProperty(key);
    if (custom)
      for (const [k, v] of Object.entries(themeCssVars(custom.tokens)))
        root.style.setProperty(k, v);
  }, [editorTheme, customThemes]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setSystemReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const noMotion = reduceMotion || systemReduced;
  const dur = noMotion ? 0 : panelDurationMs;
  const panelTransition = `transform ${dur}ms ${springEasing(panelStiffness)}, opacity ${Math.round(dur * 0.62)}ms ease`;
  const visible = TOOLS.filter((t) => panels[t.id as PanelId] !== false);
  const primaryTools = visible.filter((t) => t.id !== "my-designs");
  const bottomTools = visible.filter((t) => t.id === "my-designs");
  const visibleKey = visible.map((t) => t.id).join(",");

  useEffect(() => {
    const ids = visibleKey.split(",").filter(Boolean);
    if (ids.length && !ids.includes(tool)) setTool(ids[0] as typeof tool);
  }, [visibleKey, tool, setTool]);

  const renderToolBtn = (t: (typeof TOOLS)[number]) => {
    const Icon = t.icon;
    const active = tool === t.id;
    return (
      <button
        key={t.id}
        onClick={() => {
          if (t.id === "my-designs") {
            setHovering(false);
            setTool(t.id);
            return;
          }
          setPinned(tool === t.id && pinned ? false : true);
          setTool(t.id);
          setHovering(true);
        }}
        title={t.label}
        className={`group relative flex w-full flex-col items-center gap-1 rounded-lg py-2 text-[11px] font-medium transition-colors ${
          active
            ? "bg-blue-50 text-blue-600"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        }`}
      >
        {active && (
          <span
            aria-hidden
            className="absolute left-0 top-1/2 h-5 w-[2.5px] -translate-y-1/2 rounded-r bg-blue-600"
          />
        )}
        <Icon className="h-[17px] w-[17px]" strokeWidth={active ? 2.1 : 1.75} />
        <span className="leading-none">{t.label}</span>
      </button>
    );
  };

  return (
    <aside
      className="editor-ui relative z-20 flex h-full shrink-0 py-2.5 pl-2.5"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <nav
        aria-label="Editor tools"
        className="editor-tool-rail flex h-full w-[68px] min-h-0 shrink-0 flex-col justify-between overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white px-1.5 py-2 shadow-[0_8px_24px_-6px_rgba(15,23,42,0.10)]"
      >
        <div className="flex flex-col gap-0.5">{primaryTools.map(renderToolBtn)}</div>
        <div className="mt-2 flex flex-col gap-2 border-t border-slate-200 pt-2">
          {bottomTools.map(renderToolBtn)}
          <div
            role="group"
            aria-label="Editor color mode"
            className="editor-theme-pill mx-auto flex items-center rounded-md border border-slate-200 bg-slate-100 p-0.5"
          >
            <button
              type="button"
              onClick={() => setEditorDark(false)}
              aria-pressed={!editorDark}
              title="Light mode"
              aria-label="Light mode"
              className={`editor-theme-btn flex h-6 w-6 items-center justify-center rounded-[5px] transition-colors ${
                !editorDark
                  ? "bg-white text-amber-500 shadow-xs"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Sun className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => setEditorDark(true)}
              aria-pressed={editorDark}
              title="Dark mode"
              aria-label="Dark mode"
              className={`editor-theme-btn flex h-6 w-6 items-center justify-center rounded-[5px] transition-colors ${
                editorDark
                  ? "bg-slate-800 text-blue-300 shadow-xs"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Moon className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
        </div>
      </nav>
      <div
        aria-hidden={!panelOpen}
        style={{ transition: panelTransition }}
        className={`editor-side-panel absolute left-[84px] top-2.5 z-40 h-[calc(100%-1.25rem)] w-[300px] origin-left overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 will-change-[transform,opacity] ${
          panelOpen
            ? "translate-x-0 opacity-100"
            : "pointer-events-none -translate-x-[104%] opacity-0"
        }`}
      >
        {tool === "home" && <TemplatesPanel />}
        {tool === "text" && <TextPanel />}
        {tool === "elements" && <ElementsPanel />}
        {tool === "library" && <LibraryPanel />}
        {tool === "media" && <MediaPanel />}
        {tool === "components" && <ComponentsPanel />}
        {tool === "design" && <DesignPanel />}
        {tool === "layers" && <LayersPanel />}
      </div>
      {tool === "my-designs" && <MyDesignsDialog onClose={() => setTool("home")} />}
    </aside>
  );
}
