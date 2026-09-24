import { useMemo, useState } from "react";
import {
  AlertTriangle,
  AppWindow,
  Bell,
  Blocks,
  Check,
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
  Plus,
  Quote,
  Rows3,
  Search,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Square,
  Terminal,
  TerminalSquare,
  ToggleRight,
  TrendingUp,
  User,
  type LucideIcon,
} from "lucide-react";
import {
  newChart,
  newQuiz,
  newUi,
  UI_STYLE_THEMES,
  useEditor,
  type UiKind,
  type UiStyle,
} from "@/store/editor";
import { UiRender } from "../UiRender";

type PresetSection = "interfaces" | "ui" | "elements";

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

const UI_PRESETS: Array<{
  kind: UiKind;
  label: string;
  Icon: LucideIcon;
  overrides?: Partial<ReturnType<typeof newUi>>;
}> = [
  ...UI_KINDS,
  {
    kind: "card",
    label: "Feature card",
    Icon: Blocks,
    overrides: {
      title: "Featured project",
      body: "A polished content block for product highlights and case studies.",
    },
  },
  {
    kind: "stat",
    label: "Metric row",
    Icon: TrendingUp,
    overrides: {
      title: "Conversion rate",
      body: "+12.4% this month",
      value: 84,
    },
  },
  {
    kind: "alert",
    label: "Status banner",
    Icon: AlertTriangle,
    overrides: {
      title: "All systems operational",
      body: "Your workspace is running normally.",
    },
  },
  {
    kind: "list",
    label: "Checklist",
    Icon: ListChecks,
    overrides: {
      title: "Launch checklist",
      items: ["Review content", "Invite collaborators", "Publish presentation"],
    },
  },
  {
    kind: "profile",
    label: "Team member",
    Icon: User,
    overrides: { title: "Alex Morgan", body: "Product designer" },
  },
  {
    kind: "pricing",
    label: "Plan card",
    Icon: CreditCard,
    overrides: {
      title: "Pro plan",
      body: "$24 / month",
      items: ["Unlimited slides", "Custom themes", "Export to PDF"],
    },
  },
  {
    kind: "quote",
    label: "Testimonial",
    Icon: Quote,
    overrides: {
      title: "A sharper way to present ideas.",
      body: "Jordan Lee, Creative Director",
    },
  },
  {
    kind: "progress",
    label: "Completion",
    Icon: Gauge,
    overrides: { title: "Project progress", body: "Design system", value: 72 },
  },
];

const ELEMENT_PRESETS = [
  {
    label: "Bar Chart",
    description: "Categorical comparison",
    Icon: TrendingUp,
    create: () => newChart("bar"),
  },
  {
    label: "Line Graph",
    description: "Trend over time",
    Icon: TrendingUp,
    create: () => newChart("line"),
  },
  {
    label: "Interactive Quiz",
    description: "Engagement widget",
    Icon: ListChecks,
    create: () => newQuiz(),
  },
];

const STYLES = Object.keys(UI_STYLE_THEMES) as UiStyle[];

export function ComponentsPanel() {
  const { add, selectedId, elements, update } = useEditor();
  const [style, setStyle] = useState<UiStyle>("cyber");
  const [section, setSection] = useState<PresetSection>("interfaces");
  const [search, setSearch] = useState("");

  const selected = elements.find((element) => element.id === selectedId);

  const pickStyle = (nextStyle: UiStyle) => {
    setStyle(nextStyle);
    if (selected?.type === "ui") {
      update(selected.id, {
        uiStyle: nextStyle,
        accentColor: UI_STYLE_THEMES[nextStyle].accent,
      });
    }
  };

  const rawPresets = useMemo(() => {
    if (section === "interfaces") return INTERFACES;
    if (section === "ui") return UI_PRESETS;
    return [];
  }, [section]);

  const filteredPresets = useMemo(() => {
    if (!search.trim()) return rawPresets;
    const query = search.toLowerCase();
    return rawPresets.filter(
      (p) =>
        p.label.toLowerCase().includes(query) ||
        p.kind.toLowerCase().includes(query)
    );
  }, [rawPresets, search]);

  const filteredElements = useMemo(() => {
    if (!search.trim()) return ELEMENT_PRESETS;
    const query = search.toLowerCase();
    return ELEMENT_PRESETS.filter((e) =>
      e.label.toLowerCase().includes(query)
    );
  }, [search]);

  return (
    <div className="flex h-full w-full flex-col gap-4 p-4 text-slate-800">
      {/* Segmented Section Switcher */}
      <div className="grid grid-cols-3 rounded-lg bg-slate-100 p-1 text-xs font-medium text-slate-600">
        <button
          onClick={() => setSection("interfaces")}
          className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 transition-all ${
            section === "interfaces"
              ? "bg-white text-slate-900 shadow-sm"
              : "hover:text-slate-900"
          }`}
        >
          <MonitorCog className="size-3.5" />
          <span>Frames</span>
        </button>
        <button
          onClick={() => setSection("ui")}
          className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 transition-all ${
            section === "ui"
              ? "bg-white text-slate-900 shadow-sm"
              : "hover:text-slate-900"
          }`}
        >
          <Blocks className="size-3.5" />
          <span>Widgets</span>
        </button>
        <button
          onClick={() => setSection("elements")}
          className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 transition-all ${
            section === "elements"
              ? "bg-white text-slate-900 shadow-sm"
              : "hover:text-slate-900"
          }`}
        >
          <Sparkles className="size-3.5" />
          <span>Blocks</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${section}...`}
          className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 shadow-xs transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* Style Palette (for interfaces and UI widgets) */}
      {section !== "elements" && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              Visual Theme
            </span>
            <span className="text-[10px] text-slate-400">
              {UI_STYLE_THEMES[style]?.label}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {STYLES.map((item) => {
              const theme = UI_STYLE_THEMES[item];
              const isSelected = style === item;
              return (
                <button
                  key={item}
                  onClick={() => pickStyle(item)}
                  className={`relative flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-left text-[11px] font-medium transition-all ${
                    isSelected
                      ? "border-slate-800 bg-slate-900 text-white shadow-xs"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className="size-2 rounded-full ring-1 ring-black/10 shrink-0"
                    style={{ background: theme.accent }}
                  />
                  <span className="truncate">{theme.label}</span>
                  {isSelected && <Check className="ml-auto size-3 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Elements Section */}
      {section === "elements" && (
        <div className="flex flex-col gap-2">
          {filteredElements.map(({ label, description, Icon, create }) => (
            <button
              key={label}
              onClick={() => add(create())}
              className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-left shadow-xs transition-all hover:border-indigo-200 hover:bg-indigo-50/30 hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition group-hover:bg-indigo-600 group-hover:text-white">
                  <Icon className="size-4" />
                </div>
                <div>
                  <h4 className="text-xs font-medium text-slate-800">{label}</h4>
                  <p className="text-[11px] text-slate-400">{description}</p>
                </div>
              </div>
              <Plus className="size-4 text-slate-400 opacity-0 transition group-hover:opacity-100" />
            </button>
          ))}
        </div>
      )}

      {/* Grid of UI Components / Interfaces */}
      {section !== "elements" && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              Components ({filteredPresets.length})
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pb-6">
            {filteredPresets.map(({ kind, label, Icon, overrides }, index) => {
              const previewElement = newUi(kind, style, {
                ...overrides,
                id: `preview-${kind}-${index}`,
              });

              return (
                <button
                  key={`${kind}-${label}-${index}`}
                  onClick={() => add(newUi(kind, style, overrides))}
                  className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-2 text-left shadow-2xs transition-all hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-sm"
                >
                  {/* Miniature live canvas render preview */}
                  <div className="relative mb-2 aspect-video w-full overflow-hidden rounded-md border border-slate-100 bg-slate-50/70 p-1">
                    <div className="pointer-events-none scale-75 origin-top-left w-[133%] h-[133%]">
                      <UiRender element={previewElement} preview />
                    </div>

                    {/* Quick hover badge */}
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/10 opacity-0 backdrop-blur-[1px] transition-opacity group-hover:opacity-100">
                      <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[10px] font-medium text-slate-800 shadow-sm">
                        <Plus className="size-2.5" /> Add
                      </span>
                    </div>
                  </div>

                  {/* Caption & Icon */}
                  <div className="flex items-center gap-1.5 px-0.5">
                    <Icon className="size-3 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                    <span className="truncate text-[11px] font-medium text-slate-700">
                      {label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {filteredPresets.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400">
              No components match &ldquo;{search}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
