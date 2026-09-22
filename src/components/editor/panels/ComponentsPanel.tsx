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
import { newChart, newQuiz, newUi, UI_STYLE_THEMES, useEditor, type UiKind, type UiStyle } from "@/store/editor";
import { UiRender } from "../UiRender";
import { PanelHeader } from "./TextPanel";

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
const ELEMENT_PRESETS = [
  { label: "Chart", Icon: TrendingUp, create: () => newChart("bar") },
  { label: "Graph", Icon: TrendingUp, create: () => newChart("line") },
  { label: "Quiz", Icon: ListChecks, create: () => newQuiz() },
];

const UI_PRESETS: Array<{ kind: UiKind; label: string; Icon: LucideIcon; overrides?: Partial<ReturnType<typeof newUi>> }> = [
  ...UI_KINDS,
  { kind: "card", label: "Feature card", Icon: Blocks, overrides: { title: "Featured project", body: "A polished content block for product highlights and case studies." } },
  { kind: "stat", label: "Metric row", Icon: TrendingUp, overrides: { title: "Conversion rate", body: "+12.4% this month", value: 84 } },
  { kind: "alert", label: "Status banner", Icon: AlertTriangle, overrides: { title: "All systems operational", body: "Your workspace is running normally." } },
  { kind: "list", label: "Checklist", Icon: ListChecks, overrides: { title: "Launch checklist", items: ["Review content", "Invite collaborators", "Publish presentation"] } },
  { kind: "profile", label: "Team member", Icon: User, overrides: { title: "Alex Morgan", body: "Product designer" } },
  { kind: "pricing", label: "Plan card", Icon: CreditCard, overrides: { title: "Pro plan", body: "$24 / month", items: ["Unlimited slides", "Custom themes", "Export to PDF"] } },
  { kind: "quote", label: "Testimonial", Icon: Quote, overrides: { title: "A sharper way to present ideas.", body: "Jordan Lee, Creative Director" } },
  { kind: "progress", label: "Completion", Icon: Gauge, overrides: { title: "Project progress", body: "Design system", value: 72 } },
];

type PresetSection = "interfaces" | "ui" | "elements" | null;

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

  const presets: Array<{ kind: UiKind; label: string; Icon: LucideIcon; overrides?: Partial<ReturnType<typeof newUi>> }> = section === "interfaces" ? INTERFACES : section === "ui" ? UI_PRESETS : [];

  return (
    <div className="panel-content">
      <PanelHeader title="Presets" />
      <div className="panel-intro">Build a polished starting point, then customize it on canvas.</div>
      <div className="panel-choice-grid">
        <button onClick={() => setSection(section === "interfaces" ? null : "interfaces")} className={`flex h-24 flex-col items-center justify-center gap-2 rounded-xl border text-slate-700 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition ${section === "interfaces" ? "border-sky-200 bg-sky-50" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}>
          <MonitorCog className="size-6" />
          <span className="font-display text-[10px] uppercase tracking-[0.12em]">Interfaces</span>
        </button>
        <button onClick={() => setSection(section === "ui" ? null : "ui")} className={`flex h-24 flex-col items-center justify-center gap-2 rounded-xl border text-slate-700 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition ${section === "ui" ? "border-sky-200 bg-sky-50" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}>
          <Blocks className="size-6" />
          <span className="font-display text-[10px] uppercase tracking-[0.12em]">UI</span>
        </button>
      </div>

      {section === "elements" && (
        <div className="grid grid-cols-3 gap-2">
          {ELEMENT_PRESETS.map(({ label, Icon, create }) => (
            <button key={label} onClick={() => add(create())} className="flex h-24 flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-slate-700 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition hover:border-slate-300 hover:bg-slate-50">
              <Icon className="size-7" />
              <span className="font-display text-[9px] uppercase tracking-[0.1em]">{label}</span>
            </button>
          ))}
        </div>
      )}

      {(section === "interfaces" || section === "ui") && (
        <>
          <div className="grid grid-cols-3 gap-2">
            {STYLES.map((item) => {
              const theme = UI_STYLE_THEMES[item];
              return (
                <button key={item} onClick={() => pickStyle(item)} className={`group flex h-14 flex-col justify-between rounded-xl border px-2 py-1.5 text-left font-display text-[9px] uppercase tracking-[0.08em] transition ${style === item ? "border-slate-900 bg-slate-50 text-slate-900 shadow-[0_2px_0_#0f172a]" : "border-slate-300 bg-white text-slate-900 hover:-translate-y-px hover:border-slate-500"}`}>
                  <span className="block h-2 w-full" style={{ background: theme.accent }} />
                  <span>{theme.label}</span>
                </button>
              );
            })}
          </div>
      <div className="panel-section-label">Browse library</div>
      <div className="grid grid-cols-2 gap-2">
            {presets.map(({ kind, label, Icon, overrides }, index) => (
              <button key={`${kind}-${label}`} onClick={() => add(newUi(kind, style, overrides))} className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition hover:border-slate-300 hover:bg-slate-50">
                <div className="pointer-events-none h-16 w-full overflow-hidden rounded-lg border border-slate-100 bg-slate-50"><UiRender element={newUi(kind, style, { ...overrides, id: `preview-${kind}-${index}` })} preview /></div>
                <span className="flex items-center gap-1 font-display text-[9px] uppercase tracking-[0.12em]"><Icon className="size-3" />{label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
