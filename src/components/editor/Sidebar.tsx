import { useEffect, useState } from "react";
import { Home, Type, Shapes, Layers, Palette, Folder, Library, Image } from "lucide-react";
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
  { id: "my-designs", label: "Projects", icon: Folder },
] as const;

export function Sidebar() {
  const { tool, setTool } = useEditor();
  const { panels, panelDurationMs, panelStiffness, reduceMotion, editorTheme } = useSettings();
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
    root.style.setProperty("--font-display", '"Manrope", system-ui, sans-serif');
    root.style.setProperty("--font-mono", '"JetBrains Mono", ui-monospace, monospace');
    const custom = editorTheme.startsWith(CUSTOM_THEME_PREFIX)
      ? customThemes.find((t) => `${CUSTOM_THEME_PREFIX}${t.id}` === editorTheme)
      : undefined;
    root.dataset.editorTheme = custom ? "custom" : editorTheme;
    for (const key of Object.keys(themeCssVars(DEFAULT_THEME_TOKENS))) root.style.removeProperty(key);
    if (custom) for (const [k, v] of Object.entries(themeCssVars(custom.tokens))) root.style.setProperty(k, v);
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
          if (t.id === "my-designs") { setHovering(false); setTool(t.id); return; }
          setPinned(tool === t.id && pinned ? false : true);
          setTool(t.id);
          setHovering(true);
        }}
        title={t.label}
        className={`group relative flex w-full flex-col items-center gap-1.5 rounded-2xl py-2.5 text-[11px] font-medium transition-colors ${
          active
            ? "bg-blue-50 text-blue-700"
            : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
        }`}
      >
        {active && (
          <span aria-hidden className="absolute left-0.5 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-blue-600" />
        )}
        <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.2 : 1.9} />
        <span className="leading-none">{t.label}</span>
      </button>
    );
  };

  return (
    <aside className="editor-ui relative flex h-full" onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}>
      <nav
        className="editor-tool-rail flex h-full w-[5rem] min-h-0 shrink-0 flex-col justify-between overflow-y-auto overscroll-contain border-r border-slate-200 bg-white px-2 py-3"
      >
        <div className="flex flex-col gap-1.5">
          {primaryTools.map(renderToolBtn)}
        </div>
        {bottomTools.length > 0 && (
          <div className="mt-3 flex flex-col gap-1.5 border-t border-slate-100 pt-3">
            {bottomTools.map(renderToolBtn)}
          </div>
        )}
      </nav>
      <div aria-hidden={!panelOpen} style={{ transition: panelTransition }} className={`editor-side-panel absolute left-[5.375rem] top-2.5 z-40 h-[calc(100%-1.25rem)] w-[288px] origin-left overflow-y-auto rounded-[22px] border border-slate-200 bg-white p-3.5 shadow-[0_18px_44px_-12px_rgba(15,23,42,0.14)] will-change-[transform,opacity] ${panelOpen ? "translate-x-0 opacity-100" : "pointer-events-none -translate-x-[104%] opacity-0"}`}>
        {tool === "home" && <TemplatesPanel />}
        {tool === "text" && <TextPanel />}
        {tool === "elements" && <ElementsPanel />}
        {tool === "library" && <LibraryPanel />}
        {tool === "media" && <MediaPanel />}
        {tool === "components" && <ComponentsPanel />}
        {tool === "design" && <DesignPanel />}
      </div>
      {tool === "my-designs" && <MyDesignsDialog onClose={() => setTool("home")} />}
    </aside>
  );
}
