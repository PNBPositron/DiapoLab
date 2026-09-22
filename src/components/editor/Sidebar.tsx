import { useEffect, useState } from "react";
import { useEditor } from "@/store/editor";
import { useSettings, springEasing, type PanelId } from "@/store/settings";
import { useUi } from "@/store/ui";
import { CUSTOM_THEME_PREFIX, DEFAULT_THEME_TOKENS, themeCssVars } from "@/lib/themes";
import { LayoutTemplate, Type, Shapes, SlidersHorizontal, Blocks, Settings, Images, Sparkles, FolderHeart } from "lucide-react";
import "@/editor-ui.css";
import { TemplatesPanel } from "./panels/TemplatesPanel";
import { TextPanel } from "./panels/TextPanel";
import { ElementsPanel } from "./panels/ElementsPanel";
import { DesignPanel } from "./panels/DesignPanel";
import { ComponentsPanel } from "./panels/ComponentsPanel";
import { IllustrationsPanel } from "./panels/IllustrationsPanel";
import { AiPanel } from "./panels/AiPanel";
import { SettingsDialog } from "./SettingsDialog";
import { MyDesignsDialog } from "./MyDesignsDialog";

const TOOLS = [
  { id: "home", label: "Home", icon: LayoutTemplate },
  { id: "text", label: "Text", icon: Type },
  { id: "elements", label: "Elements", icon: Shapes },
  { id: "illustrations", label: "Illus.", icon: Images },
  { id: "components", label: "Presets", icon: Blocks },
  { id: "design", label: "Design", icon: SlidersHorizontal },
  { id: "ai", label: "AI", icon: Sparkles },
  { id: "my-designs", label: "Designs", icon: FolderHeart },
] as const;

export function Sidebar() {
  const { tool, setTool } = useEditor();
  const { panels, panelDurationMs, panelStiffness, reduceMotion, editorTheme } = useSettings();
  const settingsOpen = useUi((s) => s.settingsOpen);
  const setSettingsOpen = useUi((s) => s.setSettingsOpen);
  const [hovering, setHovering] = useState(false);
  const [systemReduced, setSystemReduced] = useState(false);
  const panelOpen = hovering;
  const customThemes = useSettings((s) => s.customThemes);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--font-display", "Inter, system-ui, sans-serif");
    root.style.setProperty("--font-mono", "Inter, system-ui, sans-serif");
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
  const panelTransition = `transform ${dur}ms ${springEasing(panelStiffness)}, opacity ${Math.round(dur * 0.62)}ms ease, filter ${Math.round(dur * 0.7)}ms ease-out`;
  const visible = TOOLS.filter((t) => panels[t.id as PanelId] !== false);
  const visibleKey = visible.map((t) => t.id).join(",");

  useEffect(() => {
    const ids = visibleKey.split(",").filter(Boolean);
    if (ids.length && !ids.includes(tool)) setTool(ids[0] as typeof tool);
  }, [visibleKey, tool, setTool]);

  return (
    <aside className="editor-ui relative flex h-full" onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}>
      <nav className="flex w-[4.5rem] flex-col gap-1 border-r border-slate-200/80 bg-slate-50/85 p-2 backdrop-blur-xl">
        {visible.map((t) => {
          const Icon = t.icon;
          const active = tool === t.id;
          return <button key={t.id} onClick={() => { setTool(t.id); setHovering(true); }} className={`group relative flex flex-col items-center gap-1 rounded-xl border px-0.5 py-2.5 text-[8px] font-semibold uppercase tracking-[0.04em] transition-all duration-200 ${active && panelOpen ? "border-slate-300 bg-white text-slate-700 shadow-sm" : "border-transparent bg-transparent text-slate-500 hover:border-slate-200 hover:bg-white hover:text-slate-700"}`}><Icon className="h-4 w-4" strokeWidth={2.2} />{t.label}</button>;
        })}
        <button onClick={() => setSettingsOpen(true)} title="Settings" aria-label="Settings" className="mt-auto flex flex-col items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-1 py-3 text-[9px] font-semibold text-slate-600 shadow-sm hover:border-slate-300"><Settings className="h-5 w-5" strokeWidth={2.2} />Settings</button>
      </nav>
      <div aria-hidden={!panelOpen} style={{ transition: panelTransition }} className={`editor-side-panel absolute left-[4.5rem] top-2 z-40 h-[calc(100%-1rem)] w-72 origin-left overflow-y-auto rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)] will-change-[transform,opacity,filter] ${panelOpen ? `translate-x-0 opacity-100 ${noMotion ? "" : "scale-x-100 blur-0"}` : `pointer-events-none -translate-x-[106%] opacity-0 ${noMotion ? "" : "scale-x-[0.97] blur-[2px]"}`}`}>
        {tool === "home" && <TemplatesPanel />}{tool === "text" && <TextPanel />}{tool === "components" && <ComponentsPanel />}{tool === "elements" && <ElementsPanel />}{tool === "illustrations" && <IllustrationsPanel />}{tool === "design" && <DesignPanel />}{tool === "ai" && <AiPanel />}
      </div>
      {tool === "my-designs" && <MyDesignsDialog onClose={() => setTool("home")} />}{settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
    </aside>
  );
}
