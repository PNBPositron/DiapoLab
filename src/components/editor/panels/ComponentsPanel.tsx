import { useState } from "react";
import {
  AlertTriangle,
  AppWindow,
  Bell,
  Blocks,
  Chrome,
  Command,
  CreditCard,
  FolderOpen,
  Gauge,
  Hash,
  LayoutPanelTop,
  ListChecks,
  LogIn,
  MessageSquare,
  MonitorCog,
  PanelBottom,
  PanelLeft,
  Quote,
  Rows3,
  Search,
  SlidersHorizontal,
  Smartphone,
  Square,
  Terminal,
  TerminalSquare,
  ToggleRight,
  TrendingUp,
  User,
  type LucideIcon,
} from "lucide-react";
import { newUi, UI_STYLE_THEMES, useEditor, type UiKind, type UiStyle } from "@/store/editor";
import { PanelHeader } from "./TextPanel";
import { UiRender } from "../UiRender";

const UI_KINDS: Array<{ kind: UiKind; label: string; Icon: LucideIcon }> = [
  { kind: "card", label: "Card", Icon: Square },
  { kind: "stat", label: "Stat", Icon: TrendingUp },
  { kind: "badge", label: "Badge", Icon: Hash },
  { kind: "progress", label: "Progress", Icon: Gauge },
  { kind: "alert", label: "Alert", Icon: AlertTriangle },
  { kind: "list", label: "List", Icon: ListChecks },
  { kind: "quote", label: "Quote", Icon: Quote },
  { kind: "profile", label: "Profile", Icon: User },
  { kind: "pricing", label: "Pricing", Icon: CreditCard },
  { kind: "kbd", label: "Key", Icon: Command },
];

const INTERFACES: Array<{ kind: UiKind; label: string; Icon: LucideIcon }> = [
  { kind: "window", label: "Window", Icon: AppWindow },
  { kind: "browser", label: "Browser", Icon: Chrome },
  { kind: "search", label: "Search bar", Icon: Search },
  { kind: "terminal", label: "Terminal", Icon: TerminalSquare },
  { kind: "phone", label: "Phone", Icon: Smartphone },
  { kind: "modal", label: "Modal", Icon: MessageSquare },
  { kind: "tabs", label: "Tabs", Icon: Rows3 },
  { kind: "toggle", label: "Toggles", Icon: ToggleRight },
  { kind: "login", label: "Login", Icon: LogIn },
  { kind: "notification", label: "Toast", Icon: Bell },
  { kind: "taskbar", label: "Taskbar", Icon: PanelBottom },
  { kind: "vtabs", label: "Vertical tabs", Icon: PanelLeft },
  { kind: "kdePanel", label: "Desktop panel", Icon: LayoutPanelTop },
  { kind: "kdeFiles", label: "File manager", Icon: FolderOpen },
  { kind: "kdeRunner", label: "Command runner", Icon: Terminal },
  { kind: "kdeSettings", label: "System settings", Icon: SlidersHorizontal },
];

const STYLES = Object.keys(UI_STYLE_THEMES) as UiStyle[];
type PresetSection = "interfaces" | "ui" | null;

export function ComponentsPanel() {
  const { add, selectedId, elements, update } = useEditor();
  const [style, setStyle] = useState<UiStyle>("cyber");
  const [section, setSection] = useState<PresetSection>(null);
  const selected = elements.find((element) => element.id === selectedId);

  const pickStyle = (nextStyle: UiStyle) => {
    setStyle(nextStyle);
    if (selected?.type === "ui") {
      update(selected.id, { uiStyle: nextStyle, accentColor: UI_STYLE_THEMES[nextStyle].accent });
    }
  };

  const presets = section === "interfaces" ? INTERFACES : section === "ui" ? UI_KINDS : [];

  return (
    <div className="space-y-4">
      <PanelHeader title="Presets" />
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setSection(section === "interfaces" ? null : "interfaces")} className={`brutal-border-2 brutal-press flex h-24 flex-col items-center justify-center gap-2 text-teal hover:border-teal ${section === "interfaces" ? "border-teal bg-blue-deep" : "bg-surface"}`}>
          <MonitorCog className="size-6" />
          <span className="font-display text-[10px] uppercase tracking-[0.12em]">Interfaces</span>
        </button>
        <button onClick={() => setSection(section === "ui" ? null : "ui")} className={`brutal-border-2 brutal-press flex h-24 flex-col items-center justify-center gap-2 text-teal hover:border-teal ${section === "ui" ? "border-teal bg-blue-deep" : "bg-surface"}`}>
          <Blocks className="size-6" />
          <span className="font-display text-[10px] uppercase tracking-[0.12em]">UI</span>
        </button>
      </div>

      {section && (
        <>
          <div className="grid grid-cols-4 gap-1.5">
            {STYLES.map((item) => {
              const theme = UI_STYLE_THEMES[item];
              return (
                <button key={item} onClick={() => pickStyle(item)} className={`brutal-press border px-1 py-2 font-display text-[8px] uppercase ${style === item ? "border-teal glow-teal" : "border-teal/30"}`} style={{ background: theme.bg.startsWith("#") || theme.bg.includes("gradient") ? theme.bg : "#2a3550", color: theme.fg }}>
                  {theme.label}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {presets.map(({ kind, label, Icon }) => (
              <button key={kind} onClick={() => add(newUi(kind, style))} className="brutal-border-2 brutal-press flex flex-col items-center gap-1.5 bg-surface p-2 text-teal hover:border-teal">
                <div className="pointer-events-none h-16 w-full overflow-hidden"><UiRender element={newUi(kind, style, { id: `preview-${kind}` })} preview /></div>
                <span className="flex items-center gap-1 font-display text-[9px] uppercase tracking-[0.12em]"><Icon className="size-3" />{label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
