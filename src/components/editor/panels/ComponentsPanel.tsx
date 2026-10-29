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
  WandSparkles,
  Shuffle,
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
  saveCustomUiTheme,
  type UiTheme,
  type UiKind,
  type UiStyle,
} from "@/store/editor";
import { UiRender } from "../UiRender";
import { PanelHeader, SearchField, ChipGroup, SegmentedControl, OptionGrid } from "../ui/selectors";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ColorPicker } from "../ColorPicker";
import { FONTS } from "./TextPanel";
import { usePlugins, instantiateWidget } from "@/lib/plugins";
import {
  loadBlocks,
  saveBlock,
  deleteBlock,
  cloneBlockElements,
  describeBlock,
  type UserBlock,
} from "@/lib/user-blocks";

type PresetSection = "ui" | "blocks" | "charts";

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

// ---- Visual theme creator: build a custom style pack (glass, cyber…) ----
const CREATOR_FONT_STACK = (family: string) => "'" + family + "', system-ui, sans-serif";

/** Built-in packs offered as starting templates in the creator. */
const TEMPLATE_STYLES: UiStyle[] = [
  "glass",
  "cyber",
  "neobrutalist",
  "sketch",
  "xp",
  "aqua",
  "midnight",
  "pastel",
  "vapor",
  "material",
  "matrix",
  "swiss",
];

const SHADOW_PRESETS = [
  { value: "none", label: "None" },
  { value: "soft", label: "Soft" },
  { value: "depth", label: "Depth" },
  { value: "hard", label: "Hard offset" },
  { value: "neon", label: "Neon glow" },
];

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.split("").map((ch) => ch + ch).join("") : m;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const withAlpha = (hex: string, a: number) => {
  const [r, g, b] = hexToRgb(hex);
  return "rgba(" + r + "," + g + "," + b + "," + a + ")";
};
const relLuminance = (hex: string) => {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};

/** Extract a hex + alpha from any theme color (hex, rgba, or gradient stop). */
function parseThemeColor(str: string): { hex: string; alpha: number } {
  const rgbaMatch = /rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?\)/.exec(str);
  if (rgbaMatch) {
    const [r, g, b] = rgbaMatch.slice(1, 4).map(Number);
    const a = rgbaMatch[4] !== undefined ? Number(rgbaMatch[4]) : 1;
    const hex = "#" + [r, g, b]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
      .join("");
    return { hex, alpha: a };
  }
  const hexMatch = /#[0-9a-fA-F]{6}/.exec(str);
  if (hexMatch) return { hex: hexMatch[0], alpha: 1 };
  return { hex: "#ffffff", alpha: 1 };
}

const shadowPresetOf = (shadow: string): string => {
  if (shadow === "none") return "none";
  if (shadow === "0 12px 34px rgba(15,23,42,0.18)") return "soft";
  if (shadow === "0 18px 44px rgba(0,0,0,0.45)") return "depth";
  if (shadow === "10px 10px 0 0 rgba(10,10,10,0.85)") return "hard";
  if (shadow.includes("0 0 22px")) return "neon";
  return "soft";
};

const blurOf = (backdrop?: string): number => {
  const m = /blur\((\d+)px\)/.exec(backdrop ?? "");
  return m ? Number(m[1]) : 0;
};

/** Turn one of the built-in packs (glass, cyber…) into an editable draft. */
function themeToDraft(theme: UiTheme): CreatorDraft {
  const bg = parseThemeColor(theme.bg);
  return {
    bg: bg.hex,
    bgAlpha: Math.round(bg.alpha * 100),
    fg: parseThemeColor(theme.fg).hex,
    accent: parseThemeColor(theme.accent).hex,
    border: parseThemeColor(theme.border).hex,
    font: theme.font,
    radius: theme.radius,
    borderWidth: theme.borderWidth,
    shadow: shadowPresetOf(theme.shadow),
    blur: blurOf(theme.backdrop),
    uppercase: theme.uppercase,
    dark: !!theme.dark,
    spacing: parseFloat(theme.letterSpacing || "0") || 0,
  };
}

const hslToHex = (h: number, s: number, l: number): string => {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const v = l - a * Math.max(-1, Math.min(Math.min(k - 3, 9 - k, 1), -1));
    return Math.round(255 * v).toString(16).padStart(2, "0");
  };
  return "#" + f(0) + f(8) + f(4);
};

/** Random draft — a curated dice roll that avoids unreadable combos. */
function randomDraft(): CreatorDraft {
  const hue = Math.floor(Math.random() * 360);
  const dark = Math.random() > 0.5;
  const accentHue = (hue + 150 + Math.floor(Math.random() * 60)) % 360;
  const font = FONTS[Math.floor(Math.random() * FONTS.length)];
  return {
    bg: dark ? hslToHex((hue + 180) % 360, 0.6, 0.12) : hslToHex(hue, 0.7, 0.92),
    bgAlpha: [15, 30, 45, 70, 100][Math.floor(Math.random() * 5)],
    fg: dark ? "#e8ecf4" : "#10131a",
    accent: hslToHex(accentHue, 0.85, 0.55),
    border: dark ? hslToHex((hue + 180) % 360, 0.6, 0.8) : "#ffffff",
    font: CREATOR_FONT_STACK(font.family),
    radius: [0, 4, 12, 20, 28, 36][Math.floor(Math.random() * 6)],
    borderWidth: [0, 1, 2, 4][Math.floor(Math.random() * 4)],
    shadow: SHADOW_PRESETS[Math.floor(Math.random() * SHADOW_PRESETS.length)].value,
    blur: [0, 0, 8, 12, 18][Math.floor(Math.random() * 5)],
    uppercase: Math.random() > 0.7,
    dark,
    spacing: [0, 0.01, 0.04, 0.08, 0.14][Math.floor(Math.random() * 5)],
  };
}

type CreatorDraft = {
  bg: string;
  bgAlpha: number;
  fg: string;
  accent: string;
  border: string;
  font: string;
  radius: number;
  borderWidth: number;
  shadow: string;
  blur: number;
  uppercase: boolean;
  dark: boolean;
  spacing: number;
};

const DEFAULT_DRAFT: CreatorDraft = {
  bg: "#7dd3fc",
  bgAlpha: 30,
  fg: "#0b1220",
  accent: "#2563eb",
  border: "#ffffff",
  font: CREATOR_FONT_STACK("Inter"),
  radius: 20,
  borderWidth: 1,
  shadow: "soft",
  blur: 12,
  uppercase: false,
  dark: false,
  spacing: 0.01,
};

const shadowFor = (preset: string, accentHex: string): string => {
  if (preset === "soft") return "0 12px 34px rgba(15,23,42,0.18)";
  if (preset === "depth") return "0 18px 44px rgba(0,0,0,0.45)";
  if (preset === "hard") return "10px 10px 0 0 rgba(10,10,10,0.85)";
  if (preset === "neon")
    return "0 0 22px " + withAlpha(accentHex, 0.55) + ", inset 0 0 24px " + withAlpha(accentHex, 0.18);
  return "none";
};

const buildCustomTheme = (d: CreatorDraft): UiTheme => ({
  label: "Custom",
  bg: withAlpha(d.bg, d.bgAlpha / 100),
  fg: d.fg,
  muted: withAlpha(d.fg, 0.65),
  accent: d.accent,
  border: d.border,
  borderWidth: d.borderWidth,
  radius: d.radius,
  shadow: shadowFor(d.shadow, d.accent),
  font: d.font,
  letterSpacing: d.spacing + "em",
  uppercase: d.uppercase,
  backdrop: d.blur > 0 ? "blur(" + d.blur + "px) saturate(160%)" : undefined,
  onAccent: relLuminance(d.accent) > 0.6 ? "#0a0a0a" : "#ffffff",
  dark: d.dark,
});

function ThemeCreator({ onApply }: { onApply: (theme: UiTheme) => void }) {
  const [draft, setDraft] = useState<CreatorDraft>(DEFAULT_DRAFT);
  const theme = buildCustomTheme(draft);
  const set = <K extends keyof CreatorDraft>(key: K, value: CreatorDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const SWATCHES: Array<{ key: "bg" | "fg" | "accent" | "border"; label: string }> = [
    { key: "bg", label: "Background" },
    { key: "fg", label: "Text" },
    { key: "accent", label: "Accent" },
    { key: "border", label: "Border" },
  ];
  const [activeSwatch, setActiveSwatch] = useState<"bg" | "fg" | "accent" | "border">("bg");
  const isBg = activeSwatch === "bg";

  const slider = (
    label: string,
    key: "radius" | "borderWidth" | "blur" | "spacing",
    min: number,
    max: number,
    step: number,
    format: (v: number) => string,
  ) => (
    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-600">
      <span>{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={draft[key]}
          onChange={(e) => set(key, Number(e.target.value))}
          className="h-1.5 w-24 accent-blue-600"
        />
        <span className="w-9 text-right font-mono text-[10px] text-slate-500">{format(draft[key])}</span>
      </span>
    </div>
  );

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {SWATCHES.map((s) => (
            <button
              key={s.key}
              type="button"
              title={s.label + " color"}
              onClick={() => setActiveSwatch(s.key)}
              className={"h-6 w-6 rounded-lg border transition " + (activeSwatch === s.key ? "border-blue-500 ring-2 ring-blue-500/25" : "border-slate-200 hover:border-blue-300")}
              style={{ background: draft[s.key] }}
            />
          ))}
        </div>
        <span className="text-[10px] font-semibold tracking-wider text-slate-400">
          {SWATCHES.find((s) => s.key === activeSwatch)?.label}{isBg ? " + transparency" : ""}
        </span>
      </div>
      <ColorPicker
        value={draft[activeSwatch]}
        onChange={(hex) => set(activeSwatch, hex)}
        opacity={isBg ? draft.bgAlpha / 100 : undefined}
        onOpacityChange={isBg ? (v) => set("bgAlpha", Math.round(v * 100)) : undefined}
      />

      <label className="flex items-center justify-between gap-2 text-[11px] text-slate-600">
        <span>Font</span>
        <select
          value={draft.font}
          onChange={(e) => set("font", e.target.value)}
          className="max-w-[150px] rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-[11px] text-slate-700 outline-none focus:border-blue-400"
        >
          {!FONTS.some((f) => CREATOR_FONT_STACK(f.family) === draft.font) && (
            <option value={draft.font}>{draft.font}</option>
          )}
          {FONTS.map((f) => (
            <option key={f.family} value={CREATOR_FONT_STACK(f.family)}>{f.family}</option>
          ))}
        </select>
      </label>
      {slider("Corners", "radius", 0, 40, 1, (v) => v + "px")}
      {slider("Border width", "borderWidth", 0, 6, 1, (v) => v + "px")}
      <label className="flex items-center justify-between gap-2 text-[11px] text-slate-600">
        <span>Effect (shadow)</span>
        <select
          value={draft.shadow}
          onChange={(e) => set("shadow", e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-[11px] text-slate-700 outline-none focus:border-blue-400"
        >
          {SHADOW_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </label>
      {slider("Glass blur", "blur", 0, 24, 1, (v) => v + "px")}
      {slider("Letter spacing", "spacing", -0.02, 0.16, 0.01, (v) => v.toFixed(2))}
      <div className="flex items-center gap-4 text-[11px] text-slate-600">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={draft.uppercase} onChange={(e) => set("uppercase", e.target.checked)} className="accent-blue-600" />
          UPPERCASE
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={draft.dark} onChange={(e) => set("dark", e.target.checked)} className="accent-blue-600" />
          Dark surface
        </label>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold tracking-wider text-slate-400">Templates</span>
          <button
            type="button"
            title="Random theme"
            onClick={() => setDraft(randomDraft())}
            className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700 transition hover:bg-blue-100"
          >
            <Shuffle className="size-3" /> Random
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TEMPLATE_STYLES.map((value) => (
            <button
              key={value}
              type="button"
              title={"Start from " + UI_STYLE_THEMES[value].label}
              onClick={() => setDraft(themeToDraft(UI_STYLE_THEMES[value]))}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-600 transition hover:border-blue-300 hover:text-blue-700"
            >
              <span className="h-2.5 w-2.5 rounded-full border border-slate-300" style={{ background: UI_STYLE_THEMES[value].bg }} />
              {UI_STYLE_THEMES[value].label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl p-3" style={{ background: "linear-gradient(140deg,#c7d2fe,#fbcfe8,#fde68a)" }}>
        <div
          className="flex flex-col gap-1.5"
          style={{
            background: theme.bg,
            color: theme.fg,
            border: draft.borderWidth + "px solid " + theme.border,
            borderRadius: theme.radius,
            boxShadow: theme.shadow,
            backdropFilter: theme.backdrop,
            fontFamily: theme.font,
            letterSpacing: theme.letterSpacing,
            padding: 14,
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 14, textTransform: draft.uppercase ? "uppercase" : "none" }}>Custom card</div>
          <div style={{ fontSize: 10, color: theme.muted }}>Your colors, font, corners &amp; effects.</div>
          <div className="mt-1 flex items-center gap-1.5">
            <span style={{ background: theme.accent, color: theme.onAccent, borderRadius: 999, fontSize: 9, fontWeight: 700, padding: "3px 8px" }}>Action</span>
            <span style={{ background: theme.accent, width: 34, height: 5, borderRadius: 3 }} />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onApply(buildCustomTheme(draft))}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-500"
      >
        <WandSparkles className="size-3.5" /> Apply custom theme
      </button>
    </div>
  );
}


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
        { value: "charts", label: "Charts", icon: ChartColumn },
        { value: "blocks", label: "My blocks", icon: Bookmark },
      ]} />
      <SearchField value={search} onChange={setSearch} placeholder={`Search ${section === "ui" ? "components" : section === "charts" ? "charts" : "blocks"}...`} />
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-selector-subtle">Visual theme</span>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                title="Create your own visual theme"
                className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700 transition hover:bg-blue-100"
              >
                <WandSparkles className="size-3" /> Create
              </button>
            </PopoverTrigger>
            <PopoverContent side="left" align="start" className="selector-panel max-h-[min(72vh,640px)] w-[264px] space-y-3 overflow-y-auto rounded-xl p-3">
              <div className="selector-header"><h3>Theme creator</h3></div>
              <ThemeCreator
                onApply={(theme) => {
                  saveCustomUiTheme(theme);
                  pickStyle("custom");
                }}
              />
              <p className="text-[9px] leading-snug text-slate-400">
                The saved theme becomes the “Custom” chip above — components, charts and quizzes all follow it.
              </p>
            </PopoverContent>
          </Popover>
        </div>
        <ChipGroup value={style} onChange={pickStyle} label="Visual theme" options={STYLES.map(value => ({ value, label: UI_STYLE_THEMES[value].label }))} />
        {style === "custom" && (
          <p className="text-[10px] leading-snug text-slate-400">Custom theme active — tweak it any time with “Create”.</p>
        )}
      </div>

      {/* Charts & quiz presets live in the Charts tab */}

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

        </div>
      )}

      {/* Charts & quiz — dedicated Charts tab */}
      {section === "charts" && (
        <div className="flex flex-col gap-2 pb-6">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-indigo-500">
            <ChartColumn className="size-3" /> Charts &amp; quiz ({filteredElements.length})
          </span>
          <div className="grid grid-cols-2 gap-2">
            {filteredElements.map((e) => (
              <button
                key={e.label}
                type="button"
                onClick={() => add(e.create())}
                className="group flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 text-left shadow-2xs transition-all hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-sm"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                  <e.Icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-slate-700">{e.label}</span>
                  <span className="block truncate text-[10px] text-slate-400">{e.description}</span>
                </span>
              </button>
            ))}
          </div>
          {filteredElements.length === 0 && (
            <div className="py-6 text-center text-xs text-slate-400">No chart matches your search.</div>
          )}
          <p className="text-[9px] leading-snug text-slate-400">
            Charts and quizzes follow the visual theme selected above.
          </p>
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

