import { useEffect, useState } from "react";
import { useEditor } from "@/store/editor";
import { useSettings, springEasing, type PanelId } from "@/store/settings";
import { useUi } from "@/store/ui";
import { CUSTOM_THEME_PREFIX, DEFAULT_THEME_TOKENS, themeCssVars } from "@/lib/themes";
import {
  LayoutTemplate,
  Type,
  Shapes,
  SlidersHorizontal,
  Blocks,
  Settings,
  Images,
} from "lucide-react";
import { TemplatesPanel } from "./panels/TemplatesPanel";
import { TextPanel } from "./panels/TextPanel";
import { ElementsPanel } from "./panels/ElementsPanel";
import { DesignPanel } from "./panels/DesignPanel";
import { ComponentsPanel } from "./panels/ComponentsPanel";
import { IllustrationsPanel } from "./panels/IllustrationsPanel";
import { SettingsDialog } from "./SettingsDialog";

const TOOLS = [
  { id: "home", label: "Home", icon: LayoutTemplate },
  { id: "text", label: "Text", icon: Type },
  { id: "elements", label: "Elements", icon: Shapes },
  { id: "illustrations", label: "Illus.", icon: Images },
  { id: "components", label: "Presets", icon: Blocks },
  { id: "design", label: "Design", icon: SlidersHorizontal },
] as const;

export function Sidebar() {
  const { tool, setTool, bgColor } = useEditor();
  const {
    panels,
    panelDurationMs,
    panelStiffness,
    reduceMotion,
    editorTheme,
    setEditorTheme,
  } = useSettings();
  const settingsOpen = useUi((s) => s.settingsOpen);
  const setSettingsOpen = useUi((s) => s.setSettingsOpen);
  const [hovering, setHovering] = useState(false);
  const panelOpen = hovering;
  const [systemReduced, setSystemReduced] = useState(false);

  const customThemes = useSettings((s) => s.customThemes);

  useEffect(() => {
    const root = document.documentElement;
    const custom = editorTheme.startsWith(CUSTOM_THEME_PREFIX)
      ? customThemes.find((t) => `${CUSTOM_THEME_PREFIX}${t.id}` === editorTheme)
      : undefined;
    root.dataset.editorTheme = custom ? "custom" : editorTheme;

    for (const key of Object.keys(themeCssVars(DEFAULT_THEME_TOKENS))) {
      root.style.removeProperty(key);
    }
    if (custom) {
      for (const [k, v] of Object.entries(themeCssVars(custom.tokens))) {
        root.style.setProperty(k, v);
      }
    }

    if (editorTheme !== "auto" && editorTheme !== "auto-light" && editorTheme !== "auto-dark") {
      root.style.removeProperty("--auto-slide-color");
      root.style.removeProperty("--auto-slide-ink");
      root.style.removeProperty("--auto-chrome");
      return;
    }

    const normalized = /^#[0-9a-f]{6}$/i.test(bgColor) ? bgColor : "#2563eb";
    const channels = [1, 3, 5].map(
      (index) => Number.parseInt(normalized.slice(index, index + 2), 16) / 255,
    );
    const linear = channels.map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );
    const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    const foreground = luminance > 0.55 ? "#0b1736" : "#ffffff";
    const autoTheme = luminance > 0.55 ? "auto-light" : "auto-dark";
    if (editorTheme !== autoTheme) setEditorTheme(autoTheme);
    const chrome =
      editorTheme === "auto-light"
        ? "#ffffff"
        : editorTheme === "auto-dark"
          ? "#0b1736"
          : luminance > 0.55
            ? "#ffffff"
            : "#0b1736";
    root.style.setProperty("--auto-slide-color", normalized);
    root.style.setProperty("--auto-slide-ink", foreground);
    root.style.setProperty("--auto-chrome", chrome);
  }, [editorTheme, bgColor, setEditorTheme, customThemes]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setSystemReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const noMotion = reduceMotion || systemReduced;
  const dur = noMotion ? 0 : panelDurationMs;
  const ease = springEasing(panelStiffness);
  const panelTransition = `transform ${dur}ms ${ease}, opacity ${Math.round(dur * 0.62)}ms ${ease}, filter ${Math.round(dur * 0.7)}ms ease-out`;

  const visible = TOOLS.filter((t) => panels[t.id as PanelId] !== false);

  const visibleKey = visible.map((t) => t.id).join(",");
  useEffect(() => {
    const ids = visibleKey.split(",").filter(Boolean);
    if (ids.length && !ids.includes(tool)) {
      setTool(ids[0] as typeof tool);
    }
  }, [visibleKey, tool, setTool]);

  return (
    <aside
      className="relative flex h-full"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <nav className="flex w-16 flex-col gap-1 border-r border-teal/30 bg-ink p-1.5">
        {visible.map((t) => {
          const Icon = t.icon;
          const active = tool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setTool(t.id);
                setHovering(true);
              }}
              className={`group relative flex flex-col items-center gap-0.5 px-0.5 py-2 text-[8px] font-bold uppercase tracking-[0.08em] transition-all ${
                active
                  ? "bg-blue-deep text-teal border border-teal glow-blue"
                  : "border border-teal/20 bg-surface text-teal/70 hover:text-teal hover:border-teal/60 hover:bg-surface-2"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-0 h-full w-[3px] bg-teal glow-teal" />
              )}
              <Icon className="h-4 w-4" strokeWidth={2} />
              {t.label}
            </button>
          );
        })}
        <button
          onClick={() => setSettingsOpen(true)}
          title="Settings"
          aria-label="Settings"
          className="mt-auto flex flex-col items-center gap-0.5 border border-teal/20 bg-surface px-0.5 py-2 text-[8px] font-bold uppercase tracking-[0.08em] text-teal/70 transition-colors duration-200 hover:border-teal/60 hover:bg-surface-2 hover:text-teal"
        >
          <Settings className="h-5 w-5" strokeWidth={2} />
          Settings
        </button>
      </nav>
      <div
        aria-hidden={!panelOpen}
        style={{ transition: panelTransition }}
        className={`absolute left-16 top-0 z-40 h-full w-64 origin-left overflow-y-auto border-r border-teal/30 bg-paper p-3 shadow-2xl will-change-[transform,opacity,filter] ${
          panelOpen
            ? `translate-x-0 opacity-100 ${noMotion ? "" : "scale-x-100 blur-0"}`
            : `pointer-events-none -translate-x-[106%] opacity-0 ${noMotion ? "" : "scale-x-[0.97] blur-[2px]"}`
        }`}
      >
        {tool === "home" && <TemplatesPanel />}
        {tool === "text" && <TextPanel />}
        {tool === "components" && <ComponentsPanel />}
        {tool === "elements" && <ElementsPanel />}
        {tool === "illustrations" && <IllustrationsPanel />}
        {tool === "design" && <DesignPanel />}
      </div>
      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
    </aside>
  );
}
