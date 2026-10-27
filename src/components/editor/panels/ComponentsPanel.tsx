import { useMemo, useState } from "react";
import {
  AlertTriangle,
  AppWindow,
  Bell,
  Blocks,
  Bookmark,
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
  PanelBottom,
  PanelLeft,
  Plus,
  Puzzle,
  Quote,
  Rows3,
  Save,
  Search,
  SlidersHorizontal,
  Smartphone,
  Square,
  Terminal,
  TerminalSquare,
  Trash2,
  ToggleRight,
  TrendingUp,
  ChartColumn, ChartLine, ChartArea, ChartPie, Circle,
  User,
  type LucideIcon,
} from "lucide-react";
import {
  newChart,
  newQuiz,
  newUi,
  UI_STYLE_THEMES,
  useEditor,
  chartStylePatch,
  quizStylePatch,
  type UiKind,
  type UiStyle,
} from "@/store/editor";
import { UiRender } from "../UiRender";
import { PanelHeader, SearchField, ChipGroup, SegmentedControl, OptionGrid } from "../ui/selectors";
import { usePlugins, instantiateWidget } from "@/lib/plugins";
import {
  loadBlocks,
  saveBlock,
  deleteBlock,
  cloneBlockElements,
  describeBlock,
  type UserBlock,
} from "@/lib/user-blocks";

type PresetSection = "ui" | "blocks";

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

const STYLES = Object.keys(UI_STYLE_THEMES) as UiStyle[];

export function ComponentsPanel() {
  const { add, addGroup, selectedId, selectedIds, elements, update } = useEditor();
  const [style, setStyle] = useState<UiStyle>("cyber");
  const [section, setSection] = useState<PresetSection>("ui");
  const [search, setSearch] = useState("");
  const [blocks, setBlocks] = useState<UserBlock[]>(() => loadBlocks());
  const [blockName, setBlockName] = useState("");
  const [blockSaved, setBlockSaved] = useState(false);

  const selected = elements.find((element) => element.id === selectedId);

  // ---- My blocks: reusable selections (headers, footers, FlowCraft groups) ----
  const selectedElements = elements.filter((e) => selectedIds.includes(e.id));
  const refreshBlocks = () => setBlocks(loadBlocks());
  const handleSaveBlock = () => {
    if (selectedElements.length === 0) return;
    saveBlock(blockName, selectedElements);
    setBlockName("");
    setBlockSaved(true);
    setTimeout(() => setBlockSaved(false), 1600);
    refreshBlocks();
  };
  const plugins = usePlugins((s) => s.plugins);
  const pluginWidgets = plugins
    .filter((p) => p.enabled)
    .flatMap((p) => p.widgets.map((w, i) => ({ key: `${p.id}:${i}`, pluginName: p.name, widget: w })));

  const ELEMENT_PRESETS = [
    {
      label: "Bar Chart",
      description: "Categorical comparison",
      Icon: ChartColumn,
      create: () => newChart("bar", chartStylePatch(style)),
    },
    {
      label: "Line Graph",
      description: "Trend over time",
      Icon: ChartLine,
      create: () => newChart("line", chartStylePatch(style)),
    },
    {
      label: "Area Chart",
      description: "Cumulative trend",
      Icon: ChartArea,
      create: () => newChart("area", chartStylePatch(style)),
    },
    {
      label: "Pie Chart",
      description: "Share of a whole",
      Icon: ChartPie,
      create: () => newChart("pie", chartStylePatch(style)),
    },
    {
      label: "Donut Chart",
      description: "Modern proportions",
      Icon: Circle,
      create: () => newChart("donut", chartStylePatch(style)),
    },
    {
      label: "Interactive Quiz",
      description: "Engagement widget",
      Icon: ListChecks,
      create: () => newQuiz(quizStylePatch(style)),
    },
  ];

  const pickStyle = (nextStyle: UiStyle) => {
    setStyle(nextStyle);
    if (selected?.type === "ui") {
      update(selected.id, {
        uiStyle: nextStyle,
        accentColor: UI_STYLE_THEMES[nextStyle].accent,
      });
    }
    if (selected?.type === "quiz") {
      update(selected.id, quizStylePatch(nextStyle));
    }
    if (selected?.type === "chart") {
      update(selected.id, chartStylePatch(nextStyle));
    }
  };

  const rawPresets = useMemo(() => {
    // Widgets + Frames merged into a single "UI" catalog.
    if (section === "ui") return [...UI_PRESETS, ...INTERFACES];
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

  const filteredElements = search.trim()
    ? ELEMENT_PRESETS.filter((e) => e.label.toLowerCase().includes(search.toLowerCase()))
    : ELEMENT_PRESETS;

  return (
    <div className="flex h-full w-full flex-col gap-4 p-4 text-slate-800">
      <PanelHeader kicker="Components" title="Presets & widgets" description="Drop ready-made UI mockups, widgets and charts onto the slide." icon={Blocks} />
      <SegmentedControl value={section} onChange={setSection} label="Component category" options={[
        { value: "ui", label: "UI", icon: Blocks },
        { value: "blocks", label: "My blocks", icon: Bookmark },
      ]} />
      <SearchField value={search} onChange={setSearch} placeholder={`Search ${section === "ui" ? "components" : "blocks"}...`} />
      <div className="space-y-2">
        <span className="text-xs text-selector-subtle">Visual theme</span>
        <ChipGroup value={style} onChange={pickStyle} label="Visual theme" options={STYLES.map(value => ({ value, label: UI_STYLE_THEMES[value].label }))} />
      </div>

      {/* Charts & quiz presets live in the My blocks tab */}

      {/* My blocks — save the current selection and reuse it everywhere.
          Widget packs (imported in Add-ons) are inserted from here too. */}
      {section === "blocks" && (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <div className="panel-section-label">Save selection as block</div>
            <div className="mt-2 flex items-center gap-2">
              <input
                value={blockName}
                onChange={(e) => setBlockName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveBlock()}
                placeholder={selectedElements.length ? "Name (e.g. Header)" : "Select elements on the slide first"}
                disabled={selectedElements.length === 0}
                className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-400"
              />
              <button
                type="button"
                onClick={handleSaveBlock}
                disabled={selectedElements.length === 0}
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:opacity-40"
              >
                {blockSaved ? <Check className="size-3.5" /> : <Save className="size-3.5" />}
                {blockSaved ? "Saved" : "Save"}
              </button>
            </div>
            <p className="mt-1.5 text-[10px] leading-snug text-slate-400">
              {selectedElements.length > 0
                ? `${selectedElements.length} selected element${selectedElements.length > 1 ? "s" : ""} — the block is inserted as one movable group.`
                : "Blocks are stored in this browser and available in every design."}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-slate-400">
              Saved blocks ({blocks.length})
            </span>
          </div>

          {blocks.length === 0 && (
            <div className="py-6 text-center text-xs text-slate-400">
              No saved blocks yet — select elements on the slide, then press Save.
            </div>
          )}

          <div className="flex flex-col gap-2 pb-6">
            {blocks.map((block) => (
              <div
                key={block.id}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs"
              >
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600">
                  <Bookmark className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-slate-700">{block.name}</div>
                  <div className="truncate text-[10px] text-slate-400">{describeBlock(block)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => addGroup(cloneBlockElements(block))}
                  className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-slate-700"
                >
                  <Plus className="size-3" /> Insert
                </button>
                <button
                  type="button"
                  title="Delete block"
                  onClick={() => {
                    deleteBlock(block.id);
                    refreshBlocks();
                  }}
                  className="grid size-7 shrink-0 place-items-center rounded-lg border border-rose-200 bg-rose-50 text-rose-500 transition hover:bg-rose-100"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
          {/* Widget packs — imported via Add-ons, inserted from My blocks */}
          {pluginWidgets.length > 0 && (
            <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-indigo-500">
                <Puzzle className="size-3" /> Widget packs ({pluginWidgets.length})
              </span>
              <OptionGrid
                label="Plugin widgets"
                options={pluginWidgets.map(({ key, pluginName, widget }) => ({
                  value: key,
                  label: widget.name,
                  icon: Puzzle,
                  title: widget.description || `from ${pluginName}`,
                }))}
                onChange={(key) => {
                  const entry = pluginWidgets.find((w) => w.key === key);
                  if (entry) addGroup(instantiateWidget(entry.widget));
                }}
              />
              <p className="text-[9px] leading-snug text-slate-400">
                Import more packs from the Add-ons panel — they appear here.
              </p>
            </div>
          )}

          {/* Charts & quiz — moved here from the UI tab */}
          <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-indigo-500">
              <ChartColumn className="size-3" /> Charts &amp; quiz ({filteredElements.length})
            </span>
            <OptionGrid
              label="Charts and quiz"
              options={filteredElements.map((e) => ({ value: e.label, label: e.label, icon: e.Icon, title: e.description }))}
              onChange={(label) => {
                const preset = filteredElements.find((e) => e.label === label);
                if (preset) add(preset.create());
              }}
            />
            <p className="text-[9px] leading-snug text-slate-400">
              Charts and quizzes follow the visual theme selected above.
            </p>
          </div>
        </div>
      )}

      {/* Grid of UI components — widgets & frames merged */}
      {section === "ui" && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-slate-400">
              Components ({filteredPresets.length})
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pb-6">
            {filteredPresets.map(({ kind, label, Icon }, index) => {
              const previewElement = newUi(kind, style, {
                id: `preview-${kind}-${index}`,
              });

              return (
                <button
                  key={`${kind}-${label}-${index}`}
                  onClick={() => add(newUi(kind, style))}
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

