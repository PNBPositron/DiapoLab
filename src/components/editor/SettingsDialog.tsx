import { useEffect, useState, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Loader2, Pencil, Trash2, X, Settings as SettingsIcon, Code2, LayoutDashboard, Sparkles, Palette, Globe, Check } from "lucide-react";
import { useSettings, PANEL_LABELS, EDITOR_THEMES, springEasing, type PanelId } from "@/store/settings";
import { useAuth } from "@/hooks/use-auth";
import { useEditor } from "@/store/editor";
import { listMyPublicTemplates, renamePublicTemplate, deletePublicTemplate, type PublicTemplate } from "@/lib/designs";

const title = "text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700";
const help = "mt-1 text-[10px] leading-relaxed text-slate-400";

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
    <section className="group mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all duration-200 hover:border-blue-200/80 hover:shadow-[0_8px_24px_rgba(37,99,235,0.07)]">
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
        {collapsible ? (
          <button onClick={() => setOpen((o) => !o)} className="flex min-w-0 items-center gap-3 text-left">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600">
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
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600">
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
      {open && children && <div className="border-t border-slate-100 p-4 sm:p-5">{children}</div>}
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
  const { panels, togglePanel, resetPanels, panelDurationMs, setPanelDurationMs, panelStiffness, setPanelStiffness, reduceMotion, setReduceMotion, resetMotion, editorTheme, setEditorTheme } = useSettings();
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

  useEffect(() => {
    if (!user) { setTemplates([]); return; }
    listMyPublicTemplates().then(setTemplates).catch((e) => setError(e instanceof Error ? e.message : "Failed to load templates"));
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

  const visibleCount = (Object.keys(PANEL_LABELS) as PanelId[]).filter((id) => panels[id]).length;
  const totalPanels = Object.keys(PANEL_LABELS).length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/30 p-3 backdrop-blur-sm sm:p-6" onClick={onClose}>
      <div
        className="relative my-3 max-h-[min(900px,calc(100vh-1.5rem))] w-full max-w-4xl overflow-y-auto overflow-x-hidden rounded-3xl border border-slate-200 bg-slate-50/95 text-slate-800 shadow-[0_24px_80px_rgba(15,23,42,0.18)] sm:my-6"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header — gradient + halo + icon */}
        <header className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50/50 px-4 pb-5 pt-4 sm:px-6">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(circle at 88% 10%, rgba(37,99,235,0.14) 0%, transparent 55%)",
            }}
          />
          <div className="relative flex items-center gap-3 pr-12">
            <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white shadow-[0_6px_16px_rgba(37,99,235,0.35)]">
              <SettingsIcon className="size-4.5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-semibold uppercase tracking-[0.16em] text-slate-800">
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
          className="absolute right-4 top-4 z-10 grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-800"
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
            <section className="mb-4 overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900 shadow-lg">
              <div className="p-4 sm:p-5">
                <textarea
                  value={jsonDraft}
                  onChange={(event) => { setJsonDraft(event.target.value); setJsonStatus(null); }}
                  spellCheck={false}
                  className="h-72 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-200 outline-none transition-colors focus:border-blue-500"
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className={`font-mono text-[10px] ${jsonStatus?.includes("updated") ? "text-emerald-400" : "text-slate-400"}`}>
                    {jsonStatus ?? `${pages.length} slides loaded`}
                  </span>
                  <button
                    onClick={applyJson}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-white transition-all hover:bg-blue-700 active:scale-95"
                  >
                    <Check className="size-3" /> Apply changes
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
                    className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-all duration-200 ${
                      on
                        ? "border-blue-200 bg-blue-50/70 text-blue-700 shadow-[0_2px_8px_rgba(37,99,235,0.08)]"
                        : "border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`grid size-4.5 shrink-0 place-items-center rounded-full border transition-colors ${
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
            <p className="mt-3 text-right font-mono text-[9px] text-slate-400">
              {visibleCount}/{totalPanels} visible
            </p>
          </Section>

          {/* Panel motion */}
          <Section
            icon={<Sparkles className="size-4" />}
            label="Panel motion"
            desc="Animation duration, spring stiffness and accessibility."
            collapsible
            defaultOpen={false}
            trailing={
              <button onClick={resetMotion} className="shrink-0 text-[10px] font-medium text-slate-400 underline transition-colors hover:text-slate-700">
                Reset
              </button>
            }
          >
            <div className="space-y-4">
              <label className="block text-xs text-slate-600">
                Duration <span className="text-slate-400">{panelDurationMs}ms</span>
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
                Spring stiffness <span className="text-slate-400">{panelStiffness}</span>
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
              <div className="h-8 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                <div
                  key={`${panelDurationMs}-${panelStiffness}-${reduceMotion}`}
                  className="h-full w-1/3 bg-blue-500"
                  style={{ animation: reduceMotion ? undefined : `panel-motion-demo ${panelDurationMs}ms ${springEasing(panelStiffness)} both` }}
                />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3">
                <div>
                  <div className="text-[11px] font-semibold text-slate-700">Reduced motion</div>
                  <p className="mt-0.5 text-[10px] text-slate-400">Disable panel animations.</p>
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
                    className={`relative rounded-xl border p-3 text-left transition-all duration-200 ${
                      on
                        ? "border-blue-400 bg-blue-50/70 shadow-[0_4px_16px_rgba(37,99,235,0.12)]"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {on && (
                      <span className="absolute right-2 top-2 grid size-4 place-items-center rounded-full bg-blue-600 text-white shadow">
                        <Check className="size-2.5" strokeWidth={3} />
                      </span>
                    )}
                    <div className={`text-xs font-semibold ${on ? "text-blue-700" : "text-slate-600"}`}>{theme.label}</div>
                    <div className="mt-1 text-[10px] text-slate-400">{theme.hint}</div>
                  </button>
                );
              })}
            </div>
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
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5 transition-colors hover:border-blue-200"
                  >
                    <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                      {template.thumbnail && <img src={template.thumbnail} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium text-slate-700">{template.name}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(template.created_at).toLocaleDateString()} · {template.pages?.length ?? 0} slides
                      </div>
                    </div>
                    <button
                      onClick={() => rename(template)}
                      disabled={busy === template.id}
                      className="grid size-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100"
                      aria-label={`Rename ${template.name}`}
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      onClick={() => remove(template)}
                      disabled={busy === template.id}
                      className="grid size-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
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

          {/* Footer nav — chips */}
          <nav className="flex flex-wrap gap-2 border-t border-slate-200 pt-4 text-xs text-slate-400">
            {[
              { to: "/marketplace" as const, label: "Marketplace" },
              { to: "/license" as const, label: "License" },
              { to: "/privacypolicy" as const, label: "Privacy policy" },
            ].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={onClose}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-500 transition-all hover:border-blue-300 hover:text-blue-600"
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
