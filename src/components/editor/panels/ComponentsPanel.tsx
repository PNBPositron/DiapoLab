import { useState } from "react";
import {
  AlertTriangle,
  AppWindow,
  Bell,
  Blocks,
  Image as ImageIcon,
  Columns3,
  PanelTop,
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
import { newImage, newUi, UI_STYLE_THEMES, useEditor, type UiKind, type UiStyle } from "@/store/editor";
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
type PresetSection = "interfaces" | "ui" | "containers" | null;

const CONTAINER_PRESETS = [
  { label: "Image frame", Icon: ImageIcon, src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='450' viewBox='0 0 800 450'%3E%3Crect width='800' height='450' fill='%23e5e7eb'/%3E%3Ccircle cx='400' cy='190' r='58' fill='%239ca3af'/%3E%3Cpath d='M170 390l150-150 100 100 65-65 145 115H170z' fill='%236b7280'/%3E%3C/svg%3E" },
  { label: "Split image", Icon: Columns3, src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='450'%3E%3Crect width='800' height='450' fill='%23dbeafe'/%3E%3Cpath d='M0 330l180-180 125 125 105-105 390 280H0z' fill='%2360a5fa'/%3E%3C/svg%3E" },
  { label: "Hero image", Icon: PanelTop, src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='450'%3E%3Crect width='800' height='450' fill='%230b1736'/%3E%3Ccircle cx='620' cy='120' r='180' fill='%232b6bff' opacity='.7'/%3E%3Ccircle cx='160' cy='400' r='230' fill='%23ff0080' opacity='.5'/%3E%3C/svg%3E" },
  { label: "Color block", Icon: Square, src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='450'%3E%3Crect width='800' height='450' fill='%232b6bff'/%3E%3C/svg%3E" },
];

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
  const addContainer = (src: string) => add(newImage(src, { width: 520, height: 292 }));

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
        <button onClick={() => setSection(section === "containers" ? null : "containers")} className={`brutal-border-2 brutal-press flex h-24 flex-col items-center justify-center gap-2 text-teal hover:border-teal ${section === "containers" ? "border-teal bg-blue-deep" : "bg-surface"}`}>
          <ImageIcon className="size-6" />
          <span className="font-display text-[10px] uppercase tracking-[0.12em]">Images</span>
        </button>
      </div>

      {section === "containers" && (
        <div className="grid grid-cols-2 gap-2">
          {CONTAINER_PRESETS.map(({ label, Icon, src }) => (
            <button key={label} onClick={() => addContainer(src)} className="brutal-border-2 brutal-press overflow-hidden bg-surface text-teal hover:border-teal">
              <img src={src} alt="" className="h-20 w-full object-cover" draggable={false} />
              <span className="flex items-center justify-center gap-1 p-2 font-display text-[9px] uppercase tracking-[0.1em]"><Icon className="size-3" />{label}</span>
            </button>
          ))}
        </div>
      )}
      {section && section !== "containers" && (
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
