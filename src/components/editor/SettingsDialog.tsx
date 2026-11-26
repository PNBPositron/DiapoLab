import { useEffect, useState, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Loader2, Pencil, Trash2, X, Settings as SettingsIcon, Code2, LayoutDashboard, SlidersHorizontal, Palette, Globe, Check, Link2, Copy, ExternalLink, Volume2, Wallpaper, MonitorOff } from "lucide-react";
import { useSettings, PANEL_LABELS, EDITOR_THEMES, springEasing, type PanelId, type TransitionSoundStyle } from "@/store/settings";
import { WorkspaceBackgroundPicker } from "./WorkspaceBackground";
import { useAuth } from "@/hooks/use-auth";
import { useEditor } from "@/store/editor";
import { listMyPublicTemplates, renamePublicTemplate, deletePublicTemplate, listMyShareLinks, deleteShareLink, type PublicTemplate, type ShareLink } from "@/lib/designs";
import { playTransitionSound } from "@/lib/transition-sound";
import { formatUtcDate } from "@/lib/date";
import { BAR_COLOR_PRESETS } from "@/lib/bar-appearance";

const title = "text-xs font-semibold text-slate-800";
const help = "mt-0.5 text-[11px] leading-relaxed text-slate-500";

/** Section card with icon + title + help text + optional trailing node. */
function Section({
  icon,
  label,
  desc,
  trailing,
  children,
  defaultOpen = true,
  collapsible = false,
}: {
  icon: React.ReactNode;
  label: string;
  desc?: string;
  trailing?: React.ReactNode;
  children?: React.ReactNode;
  defaultOpen?: boolean;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="mb-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-4 p-4">
        {collapsible ? (
          <button onClick={() => setOpen((o) => !o)} className="flex min-w-0 items-center gap-3 text-left">
            <span className="grid size-8 shrink-0 place-items-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
              {icon}
            </span>
            <span className="min-w-0">
              <span className={`flex items-center gap-1.5 ${title}`}>
                {label}
                <ChevronDown className={`size-3.5 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
              </span>
              {desc && <span className={help + " block"}>{desc}</span>}
            </span>
          </button>
        ) : (
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
              {icon}
            </span>
            <div className="min-w-0">
              <div className={title}>{label}</div>
              {desc && <p className={help}>{desc}</p>}
            </div>
          </div>
        )}
        {trailing}
      </div>
      {open && children && <div className="border-t border-slate-200/80 p-4">{children}</div>}
    </section>
  );
}

/** Modern switch — small pill with sliding knob. */
function Switch({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${on ? "bg-blue-600" : "bg-slate-200"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform duration-200 ${on ? "translate-x-4" : ""}`}
      />
    </button>
  );
}

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const {
    panels,
    togglePanel,
    resetPanels,
    panelDurationMs,
    setPanelDurationMs,
    panelStiffness,
    setPanelStiffness,
    reduceMotion,
    setReduceMotion,
    resetMotion,
    transitionSound,
    setTransitionSound,
    transitionSoundStyle,
    setTransitionSoundStyle,
    editorTheme,
    setEditorTheme,
    editorDark,
    setEditorDark,
    barColor,
    setBarColor,
    barLiquidGlass,
    setBarLiquidGlass,
    resetBarAppearance,
    a11yCheck,
    setA11yCheck,
    presentHideHud,
    setPresentHideHud,
    presentHide3dButton,
    setPresentHide3dButton,
    presentAutoHideHud,
    setPresentAutoHideHud,
    presentHideInk,
    setPresentHideInk,
    presentHideSlideCounter,
    setPresentHideSlideCounter,
  } = useSettings();
  const { user } = useAuth();
  const { pages, loadPages } = useEditor();
  const [motionOpen, setMotionOpen] = useState(false);
  const [developerOpen, setDeveloperOpen] = useState(false);
  // Embedded images are swapped for short placeholders so the JSON stays readable.
  const imageMap = useRef<Map<string, string>>(new Map());
  const toDraft = () => {
    const map = new Map<string, string>();
    const byValue = new Map<string, string>();
    const text = JSON.stringify(pages, (_k, v) => {
      if (typeof v === "string" && v.startsWith("data:")) {
        let key = byValue.get(v);
        if (!key) { key = `[embedded-image-${map.size + 1}]`; map.set(key, v); byValue.set(v, key); }
        return key;
      }
      return v;
    }, 2);
    imageMap.current = map;
    return text;
  };
  const [jsonDraft, setJsonDraft] = useState(toDraft);
  const [jsonStatus, setJsonStatus] = useState<string | null>(null);
  const [templates, setTemplates] = useState<PublicTemplate[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shareLinks, setShareLinks] = useState<ShareLink[] | null>(null);
  const [shareBusy, setShareBusy] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setTemplates([]); setShareLinks([]); return; }
    listMyPublicTemplates().then(setTemplates).catch((e) => setError(e instanceof Error ? e.message : "Failed to load templates"));
    listMyShareLinks().then(setShareLinks).catch((e) => setShareError(e instanceof Error ? e.message : "Failed to load share links"));
  }, [user]);

  const applyJson = () => {
    try {
      const parsed = JSON.parse(jsonDraft, (_k, v) => (typeof v === "string" && imageMap.current.has(v) ? imageMap.current.get(v) : v));
      if (!Array.isArray(parsed) || parsed.some((page) => !page || !Array.isArray(page.elements))) throw new Error("Expected an array of slides with elements.");
      loadPages(parsed); setJsonStatus("Slideshow updated");
    } catch (e) { setJsonStatus(e instanceof Error ? e.message : "Invalid slideshow JSON"); }
  };
  const rename = async (template: PublicTemplate) => {
    const name = window.prompt("Template name", template.name);
    if (!name || name === template.name) return;
    setBusy(template.id);
    try { await renamePublicTemplate(template.id, name); setTemplates((list) => (list ?? []).map((item) => item.id === template.id ? { ...item, name } : item)); }
    catch (e) { setError(e instanceof Error ? e.message : "Rename failed"); }
    finally { setBusy(null); }
  };
  const remove = async (template: PublicTemplate) => {
    if (!window.confirm(`Unpublish "${template.name}"? This removes it from the community.`)) return;
    setBusy(template.id);
    try { await deletePublicTemplate(template.id); setTemplates((list) => (list ?? []).filter((item) => item.id !== template.id)); }
    catch (e) { setError(e instanceof Error ? e.message : "Delete failed"); }
    finally { setBusy(null); }
  };
  const shareUrlFor = (link: ShareLink) => `${window.location.origin}/t/${link.design_id}?share=${link.token}`;
  const copyShare = async (link: ShareLink) => {
    try {
      await navigator.clipboard.writeText(shareUrlFor(link));
      setCopiedLinkId(link.id);
      setTimeout(() => setCopiedLinkId((cur) => (cur === link.id ? null : cur)), 1500);
    } catch {
      setShareError("Copy failed — clipboard unavailable");
    }
  };
  const removeShare = async (link: ShareLink) => {
    if (!window.confirm(`Revoke this private link?

"${link.design_name ?? "Deleted design"}" — anyone holding the link will lose access.`)) return;
    setShareBusy(link.id);
    try { await deleteShareLink(link.id); setShareLinks((list) => (list ?? []).filter((l) => l.id !== link.id)); }
    catch (e) { setShareError(e instanceof Error ? e.message : "Revoke failed"); }
    finally { setShareBusy(null); }
  };

  const visibleCount = (Object.keys(PANEL_LABELS) as PanelId[]).filter((id) => panels[id]).length;
  const totalPanels = Object.keys(PANEL_LABELS).length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/35 p-3 backdrop-blur-xs sm:p-6" onClick={onClose}>
      <div
        className="relative my-3 max-h-[min(900px,calc(100vh-1.5rem))] w-full max-w-4xl overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200 bg-white text-slate-800 shadow-2xl sm:my-6"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <header className="relative border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div className="relative flex items-center gap-2.5 pr-12">
            <SettingsIcon className="size-4 shrink-0 text-slate-500" />
            <div className="min-w-0">
              <h2 className="text-base font-semibold tracking-tight text-slate-900">
                Settings
              </h2>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                Preferences are stored on this device.
              </p>
            </div>
          </div>
        </header>
        <button
          onClick={onClose}
          aria-label="Close settings"
          className="absolute right-4 top-4 z-10 grid size-8 place-items-center rounded-md border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
        >
          <X className="size-4" />
        </button>

        <div className="p-4 sm:p-6">
          {/* Developer mode */}
          <Section
            icon={<Code2 className="size-4" />}
            label="Developer mode"
            desc="Inspect and edit the active slideshow JSON."
            trailing={
              <Switch
                on={developerOpen}
                label="Developer mode"
                onClick={() => { setJsonDraft(toDraft()); setJsonStatus(null); setDeveloperOpen((open) => !open); }}
              />
            }
          />
          {developerOpen && (
            <section className="mb-4 overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
              <div className="p-4">
                <textarea
                  value={jsonDraft}
                  onChange={(event) => { setJsonDraft(event.target.value); setJsonStatus(null); }}
                  spellCheck={false}
                  className="h-72 w-full resize-y rounded-md border border-slate-700 bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-200 outline-none transition-colors focus:border-blue-500"
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className={`font-mono text-[11px] ${jsonStatus?.includes("updated") ? "text-blue-400" : "text-slate-400"}`}>
                    {jsonStatus ?? `${pages.length} slides loaded`}
                  </span>
                  <button
                    onClick={applyJson}
                    className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    <Check className="size-3.5" /> Apply changes
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Visible panels */}
          <Section
            icon={<LayoutDashboard className="size-4" />}
            label="Visible panels"
            desc="Choose which tools appear in the editor sidebar."
            trailing={
              <button onClick={resetPanels} className="shrink-0 text-[10px] font-medium text-slate-400 underline transition-colors hover:text-slate-700">
                Reset
              </button>
            }
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(Object.keys(PANEL_LABELS) as PanelId[]).map((id) => {
                const on = panels[id];
                return (
                  <button
                    key={id}
                    onClick={() => togglePanel(id)}
                    className={`flex items-center gap-2.5 rounded-md border px-3 py-2 text-left text-xs font-medium transition-colors ${
                      on
                        ? "border-blue-300 bg-blue-50/70 text-blue-700"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`grid size-4 shrink-0 place-items-center rounded border transition-colors ${
                        on ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white"
                      }`}
                    >
                      {on && <Check className="size-2.5" strokeWidth={3} />}
                    </span>
                    {PANEL_LABELS[id]}
                  </button>
                );
              })}
            </div>
            <p className="mt-2.5 text-right font-mono text-[11px] tabular-nums text-slate-400">
              {visibleCount}/{totalPanels} visible
            </p>
          </Section>

          {/* Panel motion */}
          <Section
            icon={<SlidersHorizontal className="size-4" />}
            label="Panel motion"
            desc="Animation duration, spring stiffness and accessibility."
            collapsible
            defaultOpen={false}
            trailing={
              <button onClick={resetMotion} className="shrink-0 text-[11px] font-medium text-slate-500 underline transition-colors hover:text-slate-800">
                Reset
              </button>
            }
          >
            <div className="space-y-4">
              <label className="block text-xs text-slate-600">
                Duration <span className="font-mono tabular-nums text-slate-400">{panelDurationMs}ms</span>
                <input
                  type="range"
                  min={0}
                  max={1200}
                  step={20}
                  value={panelDurationMs}
                  disabled={reduceMotion}
                  onChange={(event) => setPanelDurationMs(+event.target.value)}
                  className="mt-2 w-full accent-blue-600 disabled:opacity-40"
                />
              </label>
              <label className="block text-xs text-slate-600">
                Spring stiffness <span className="font-mono tabular-nums text-slate-400">{panelStiffness}</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={panelStiffness}
                  disabled={reduceMotion}
                  onChange={(event) => setPanelStiffness(+event.target.value)}
                  className="mt-2 w-full accent-blue-600 disabled:opacity-40"
                />
              </label>
              <div className="h-7 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                <div
                  key={`${panelDurationMs}-${panelStiffness}-${reduceMotion}`}
                  className="h-full w-1/3 rounded-md bg-blue-600"
                  style={{ animation: reduceMotion ? undefined : `panel-motion-demo ${panelDurationMs}ms ${springEasing(panelStiffness)} both` }}
                />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50/70 px-3.5 py-2.5">
                <div>
                  <div className="text-xs font-medium text-slate-700">Reduced motion</div>
                  <p className="mt-0.5 text-[11px] text-slate-500">Disable panel animations.</p>
                </div>
                <Switch on={reduceMotion} label="Reduced motion" onClick={() => setReduceMotion(!reduceMotion)} />
              </div>
            </div>
          </Section>

          {/* Editor theme */}
          <Section
            icon={<Palette className="size-4" />}
            label="Editor theme"
            desc="Choose the visual style for the editor chrome."
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {EDITOR_THEMES.map((theme) => {
                const on = editorTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => setEditorTheme(theme.id)}
                    className={`relative rounded-md border p-3 text-left transition-colors ${
                      on
                        ? "border-blue-400 bg-blue-50/70"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {on && (
                      <span className="absolute right-2.5 top-2.5 grid size-4 place-items-center rounded bg-blue-600 text-white">
                        <Check className="size-2.5" strokeWidth={3} />
                      </span>
                    )}
                    <div className={`text-xs font-semibold ${on ? "text-blue-700" : "text-slate-700"}`}>{theme.label}</div>
                    <div className="mt-0.5 text-[11px] text-slate-500">{theme.hint}</div>
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Workspace background */}
          <Section
            icon={<Wallpaper className="size-4" />}
            label="Workspace background"
            desc="Choose a preset backdrop, solid tint, or upload your own image behind the canvas."
          >
            <WorkspaceBackgroundPicker />
          </Section>

          {/* Appearance & accessibility */}
          <Section
            icon={<Palette className="size-4" />}
            label="Appearance & accessibility"
            desc="Dark editor chrome, bar colors, liquid glass surfaces, and accessibility checks."
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50/70 px-3.5 py-2.5">
                <div>
                  <div className="text-xs font-medium text-slate-700">Dark editor</div>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Dark chrome around the slides. Slide content is untouched.
                  </p>
                </div>
                <Switch on={editorDark} label="Dark editor" onClick={() => setEditorDark(!editorDark)} />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50/70 px-3.5 py-2.5">
                <div>
                  <div className="text-xs font-medium text-slate-700">Liquid glass for bars</div>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Translucent frosted glass look with soft blur and specular highlights on toolbars, rails, and docks.
                  </p>
                </div>
                <Switch
                  on={barLiquidGlass}
                  label="Liquid glass for bars"
                  onClick={() => setBarLiquidGlass(!barLiquidGlass)}
                />
              </div>

              <div className="rounded-md border border-slate-200 bg-slate-50/70 px-3.5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-medium text-slate-700">Bar color</div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Customize the surface tint of top, side, and floating editor bars.
                    </p>
                  </div>
                  {(barColor !== null || barLiquidGlass) && (
                    <button
                      type="button"
                      onClick={resetBarAppearance}
                      className="text-[11px] font-medium text-slate-500 underline transition-colors hover:text-slate-800"
                    >
                      Reset bars
                    </button>
                  )}
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  {BAR_COLOR_PRESETS.map((preset) => {
                    const active = barColor === preset.value;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setBarColor(preset.value)}
                        title={preset.label}
                        aria-label={`Bar color: ${preset.label}`}
                        aria-pressed={active}
                        className={`flex h-7 items-center gap-1.5 rounded-md border px-2 text-[11px] font-medium transition-colors ${
                          active
                            ? "border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600/20"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        <span
                          className="size-3.5 shrink-0 rounded border border-slate-300"
                          style={{
                            background:
                              preset.value ??
                              (editorDark
                                ? "linear-gradient(135deg,#101a2e 50%,#ffffff 50%)"
                                : "linear-gradient(135deg,#ffffff 50%,#e2e8f0 50%)"),
                          }}
                        />
                        {preset.value === null && <span>Auto</span>}
                      </button>
                    );
                  })}
                  <label
                    className="flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-600 transition-colors hover:border-slate-300"
                    title="Pick custom bar color"
                  >
                    <input
                      type="color"
                      value={barColor ?? (editorDark ? "#101a2e" : "#ffffff")}
                      onChange={(e) => setBarColor(e.target.value)}
                      aria-label="Custom bar color"
                      className="size-4 cursor-pointer rounded border-0 bg-transparent p-0"
                    />
                    <span className="font-mono text-[10px] uppercase text-slate-500">
                      {barColor ?? "Custom"}
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50/70 px-3.5 py-2.5">
                <div>
                  <div className="text-xs font-medium text-slate-700">Accessibility checker</div>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Flags low-contrast text, small fonts and off-canvas elements on the current slide.
                  </p>
                </div>
                <Switch on={a11yCheck} label="Accessibility checker" onClick={() => setA11yCheck(!a11yCheck)} />
              </div>
            </div>
          </Section>

          {/* Present mode display */}
          <Section
            icon={<MonitorOff className="size-4" />}
            label="Present mode display"
            desc="Control which presenter overlays appear while presenting (or press H anytime for clean screen)."
          >
            <div className="space-y-2.5">
              {[
                {
                  title: "Hide presenter toolbar",
                  desc: "Hide the bottom-left presenter controls bar (press H or hover bottom-left to reveal).",
                  on: presentHideHud,
                  toggle: () => setPresentHideHud(!presentHideHud),
                },
                {
                  title: "Hide 3D Stage button",
                  desc: "Hide the bottom-right 3D Stage launcher (still accessible with key 3).",
                  on: presentHide3dButton,
                  toggle: () => setPresentHide3dButton(!presentHide3dButton),
                },
                {
                  title: "Hide slide number counter",
                  desc: "Hide the 1/N slide counter inside presentation controls.",
                  on: presentHideSlideCounter,
                  toggle: () => setPresentHideSlideCounter(!presentHideSlideCounter),
                },
                {
                  title: "Auto-hide controls when idle",
                  desc: "Fade out presenter controls and cursor after a short pause in movement.",
                  on: presentAutoHideHud,
                  toggle: () => setPresentAutoHideHud(!presentAutoHideHud),
                },
                {
                  title: "Hide ink annotations",
                  desc: "Temporarily hide live ink drawings on slides without erasing them.",
                  on: presentHideInk,
                  toggle: () => setPresentHideInk(!presentHideInk),
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50/70 px-3.5 py-2.5"
                >
                  <div>
                    <div className="text-xs font-medium text-slate-700">{item.title}</div>
                    <p className="mt-0.5 text-[11px] text-slate-500">{item.desc}</p>
                  </div>
                  <Switch on={item.on} label={item.title} onClick={item.toggle} />
                </div>
              ))}
            </div>
          </Section>

          {/* Transition audio feedback */}
          <Section
            icon={<Volume2 className="size-4" />}
            label="Slide sound effects"
            desc="Play a short, subtle audio cue whenever a slide transition begins."
            trailing={
              <Switch
                on={transitionSound}
                label="Slide sound effects"
                onClick={() => {
                  const next = !transitionSound;
                  setTransitionSound(next);
                  if (next) playTransitionSound({ force: true, style: transitionSoundStyle });
                }}
              />
            }
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {([
                  { id: "whoosh", label: "Soft whoosh" },
                  { id: "click", label: "Subtle click" },
                ] as Array<{ id: TransitionSoundStyle; label: string }>).map((opt) => {
                  const active = transitionSoundStyle === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={!transitionSound}
                      onClick={() => {
                        setTransitionSoundStyle(opt.id);
                        playTransitionSound({ force: true, style: opt.id });
                      }}
                      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-45 ${
                        active
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => playTransitionSound({ force: true, style: transitionSoundStyle })}
                className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
              >
                <Volume2 className="size-3.5" />
                Test sound
              </button>
            </div>
          </Section>

          {/* Private share links */}
          <Section
            icon={<Link2 className="size-4" />}
            label="Private share links"
            desc={!user ? "Sign in to manage your private links." : "Anyone holding a link can view the deck. Revoking deletes the link instantly."}
          >
            {!user ? null : shareLinks === null ? (
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                <Loader2 className="size-3 animate-spin" /> Loading…
              </div>
            ) : shareLinks.length === 0 ? (
              <p className={help}>No private links yet. Create one from the share menu of a saved design.</p>
            ) : (
              <ul className="space-y-2">
                {shareLinks.map((link) => {
                  const url = shareUrlFor(link);
                  return (
                    <li
                      key={link.id}
                      className="flex items-center gap-3 rounded-md border border-slate-200 bg-white p-2.5 transition-colors hover:border-slate-300"
                    >
                      <div className="grid size-10 shrink-0 place-items-center rounded bg-slate-100 text-slate-500">
                        <Link2 className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium text-slate-800">{link.design_name ?? "Deleted design"}</div>
                        <div className="truncate font-mono text-[10px] text-slate-400" title={url}>{url}</div>
                        <div className="text-[11px] tabular-nums text-slate-400">Created {formatUtcDate(link.created_at)}</div>
                      </div>
                      <button
                        onClick={() => copyShare(link)}
                        disabled={shareBusy === link.id}
                        className="grid size-8 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        aria-label={`Copy link for ${link.design_name ?? "deleted design"}`}
                        title="Copy link"
                      >
                        {copiedLinkId === link.id ? <Check className="size-3.5 text-blue-600" /> : <Copy className="size-3.5" />}
                      </button>
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="grid size-8 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        aria-label={`Open link for ${link.design_name ?? "deleted design"}`}
                        title="Open link"
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                      <button
                        onClick={() => removeShare(link)}
                        disabled={shareBusy === link.id}
                        className="grid size-8 place-items-center rounded-md text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                        aria-label={`Revoke link for ${link.design_name ?? "deleted design"}`}
                        title="Revoke link"
                      >
                        {shareBusy === link.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {shareError && <p className="mt-3 text-xs text-rose-600">{shareError}</p>}
          </Section>

          {/* My published templates */}
          <Section
            icon={<Globe className="size-4" />}
            label="My published templates"
            desc={!user ? "Sign in to manage your templates." : undefined}
          >
            {!user ? null : templates === null ? (
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                <Loader2 className="size-3 animate-spin" /> Loading…
              </div>
            ) : templates.length === 0 ? (
              <p className={help}>You haven't published any templates yet.</p>
            ) : (
              <ul className="space-y-2">
                {templates.map((template) => (
                  <li
                    key={template.id}
                    className="flex items-center gap-3 rounded-md border border-slate-200 bg-white p-2.5 transition-colors hover:border-slate-300"
                  >
                    <div className="size-10 shrink-0 overflow-hidden rounded bg-slate-100">
                      {template.thumbnail && <img src={template.thumbnail} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium text-slate-800">{template.name}</div>
                      <div className="text-[11px] tabular-nums text-slate-400">
                        {formatUtcDate(template.created_at)} · {template.pages?.length ?? 0} slides
                      </div>
                    </div>
                    <button
                      onClick={() => rename(template)}
                      disabled={busy === template.id}
                      className="grid size-8 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                      aria-label={`Rename ${template.name}`}
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      onClick={() => remove(template)}
                      disabled={busy === template.id}
                      className="grid size-8 place-items-center rounded-md text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                      aria-label={`Unpublish ${template.name}`}
                    >
                      {busy === template.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {error && <p className="mt-3 text-xs text-rose-600">{error}</p>}
          </Section>

          {/* Footer nav */}
          <nav className="flex flex-wrap gap-4 border-t border-slate-200 pt-4 text-xs">
            {[
              { to: "/marketplace" as const, label: "Marketplace" },
              { to: "/license" as const, label: "License" },
              { to: "/privacypolicy" as const, label: "Privacy policy" },
            ].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={onClose}
                className="font-medium text-slate-500 transition-colors hover:text-slate-900"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
