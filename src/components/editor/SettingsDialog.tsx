import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Loader2, Pencil, Trash2, X } from "lucide-react";
import { ThemeStudio } from "./ThemeStudio";
import { useSettings, PANEL_LABELS, EDITOR_THEMES, springEasing, type PanelId } from "@/store/settings";
import { useAuth } from "@/hooks/use-auth";
import { useEditor } from "@/store/editor";
import {
  listMyPublicTemplates,
  renamePublicTemplate,
  deletePublicTemplate,
  type PublicTemplate,
} from "@/lib/designs";

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const {
    panels, togglePanel, resetPanels,
    panelDurationMs, setPanelDurationMs, panelStiffness, setPanelStiffness,
    reduceMotion, setReduceMotion, resetMotion,
    editorTheme, setEditorTheme,
  } = useSettings();
  const { user } = useAuth();
  const [motionOpen, setMotionOpen] = useState(false);
  const [templates, setTemplates] = useState<PublicTemplate[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { pages, loadPages } = useEditor();
  const [developerOpen, setDeveloperOpen] = useState(false);
  const [jsonDraft, setJsonDraft] = useState(() => JSON.stringify(pages, null, 2));
  const [jsonStatus, setJsonStatus] = useState<string | null>(null);
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [assistantReply, setAssistantReply] = useState("");
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [assistantEdits, setAssistantEdits] = useState<Array<{ type: string; id?: string; patch?: Record<string, unknown>; text?: string; x?: number; y?: number; width?: number; height?: number }>>([]);

  useEffect(() => {
    if (!user) {
      setTemplates([]);
      return;
    }
    listMyPublicTemplates()
      .then(setTemplates)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load templates"));
  }, [user]);

  const rename = async (t: PublicTemplate) => {
    const name = window.prompt("Template name", t.name);
    if (!name || name === t.name) return;
    setBusy(t.id);
    try {
      await renamePublicTemplate(t.id, name);
      setTemplates((list) => (list ?? []).map((x) => (x.id === t.id ? { ...x, name } : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rename failed");
    } finally {
      setBusy(null);
    }
  };

  const openDeveloperMode = () => {
    setJsonDraft(JSON.stringify(pages, null, 2));
    setJsonStatus(null);
    setDeveloperOpen(true);
  };

  const applyJson = () => {
    try {
      const parsed = JSON.parse(jsonDraft);
      if (!Array.isArray(parsed) || parsed.some((page) => !page || !Array.isArray(page.elements))) throw new Error("Expected an array of slides with elements.");
      loadPages(parsed);
      setJsonStatus("Applied slideshow JSON");
    } catch (e) {
      setJsonStatus(e instanceof Error ? e.message : "Invalid slideshow JSON");
    }
  };

  const askDeveloperAssistant = async () => {
    if (!assistantPrompt.trim() || assistantBusy) return;
    setAssistantBusy(true);
    setAssistantReply("");
    setAssistantEdits([]);
    try {
      const response = await fetch("/api/slide-analysis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ page: pages[0], slideshow: pages, canEdit: true, question: assistantPrompt }) });
      const payload = await response.json() as { text?: string; error?: string; edits?: Array<{ type: string; id?: string; patch?: Record<string, unknown>; text?: string; x?: number; y?: number; width?: number; height?: number }> };
      if (!response.ok || !payload.text) throw new Error(payload.error || "Assistant unavailable");
      setAssistantEdits(payload.edits ?? []);
      setAssistantReply(payload.text);
    } catch (error) {
      setAssistantReply(error instanceof Error ? error.message : "Assistant unavailable");
    } finally {
      setAssistantBusy(false);
    }
  };

  const applyAssistantEdits = () => {
    if (!assistantEdits.length) return;
    const nextPages = pages.map((page) => ({
      ...page,
      elements: [
        ...page.elements.flatMap((element) => {
          const matching = assistantEdits.filter((edit) => edit.id === element.id);
          if (matching.some((edit) => edit.type === "delete")) return [];
          const update = matching.find((edit) => edit.type === "update");
          return update?.patch ? [{ ...element, ...update.patch }] : [element];
        }),
        ...assistantEdits.filter((edit) => edit.type === "addText" && edit.text).map((edit) => ({
          id: crypto.randomUUID(), type: "text" as const, text: edit.text!, x: edit.x ?? 80, y: edit.y ?? 80,
          width: edit.width ?? 500, height: edit.height ?? 80, rotation: 0, color: "#111827", fontSize: 32,
          fontWeight: 400, fontFamily: "Inter", align: "left" as const,
        })),
      ],
    }));
    loadPages(nextPages);
    setJsonDraft(JSON.stringify(nextPages, null, 2));
    setJsonStatus(`Applied ${assistantEdits.length} AI edit operation${assistantEdits.length === 1 ? "" : "s"}`);
    setAssistantEdits([]);
  };

  const remove = async (t: PublicTemplate) => {
    if (!window.confirm(`Unpublish "${t.name}"? This removes it from the community.`)) return;
    setBusy(t.id);
    try {
      await deletePublicTemplate(t.id);
      setTemplates((list) => (list ?? []).filter((x) => x.id !== t.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/35 p-4 backdrop-blur-md sm:p-6" onClick={onClose}>
      <div
        className="relative my-4 max-h-[min(860px,calc(100vh-2rem))] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white/80 bg-white/95 p-5 text-slate-800 shadow-[0_24px_80px_rgba(15,23,42,0.22)] backdrop-blur-xl sm:my-8 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close settings"
          className="absolute right-4 top-4 grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 className="mb-1 font-display text-lg tracking-[0.2em] text-teal">▸ SETTINGS</h2>
        <p className="mb-5 font-mono text-[11px] text-teal/60">
          preferences are stored on this device.
        </p>

        <section className="brutal-border-2 mb-4 bg-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <div><div className="font-display text-[12px] tracking-[0.2em] text-teal">DEVELOPER MODE</div><p className="mt-1 font-mono text-[10px] text-teal/60">Inspect and edit the active slideshow JSON. The Gemini assistant can use and modify this same document.</p></div>
            <button type="button" onClick={openDeveloperMode} className="brutal-border-2 brutal-press shrink-0 bg-blue-deep px-3 py-2 font-mono text-[10px] uppercase text-teal hover:border-teal">Open developer mode</button>
          </div>
        </section>

        {developerOpen && <section className="mb-4 rounded-2xl border border-slate-200 bg-slate-950 p-4 shadow-inner">
          <div className="mb-3 flex items-center justify-between"><div><h3 className="font-display text-[12px] tracking-[0.2em] text-teal">SLIDESHOW JSON</h3><p className="mt-1 font-mono text-[10px] text-teal/60">Changes apply to the current presentation.</p></div><button type="button" onClick={() => setDeveloperOpen(false)} className="text-teal/60 hover:text-teal" aria-label="Close developer mode"><X className="size-4" /></button></div>
          <textarea value={jsonDraft} onChange={(event) => { setJsonDraft(event.target.value); setJsonStatus(null); }} spellCheck={false} className="h-96 w-full resize-y border-2 border-teal/30 bg-black/30 p-3 font-mono text-[11px] leading-relaxed text-teal outline-none focus:border-teal" aria-label="Slideshow JSON editor" />
          <div className="mt-3 flex items-center justify-between gap-3"><span className="font-mono text-[10px] text-teal/60">{jsonStatus ?? `${pages.length} slides loaded`}</span><div className="flex gap-2"><button type="button" onClick={() => setJsonDraft(JSON.stringify(pages, null, 2))} className="brutal-border px-3 py-2 font-mono text-[10px] uppercase text-teal">Reset</button><button type="button" onClick={applyJson} className="brutal-border-2 brutal-press bg-teal px-3 py-2 font-mono text-[10px] uppercase text-ink">Apply JSON</button></div></div>
          <div className="mt-4 border-t border-teal/20 pt-4"><div className="mb-2 font-display text-[11px] tracking-[0.16em] text-teal">DEVELOPER ASSIST</div><textarea value={assistantPrompt} onChange={(event) => setAssistantPrompt(event.target.value)} placeholder="Ask Gemini to inspect or edit this JSON..." className="h-20 w-full resize-y border-2 border-teal/30 bg-black/30 p-2 font-mono text-[11px] text-teal outline-none focus:border-teal" /><div className="mt-2 flex gap-2"><button type="button" onClick={() => void askDeveloperAssistant()} disabled={assistantBusy || !assistantPrompt.trim()} className="brutal-border-2 brutal-press bg-teal px-3 py-2 font-mono text-[10px] uppercase text-ink disabled:opacity-40">{assistantBusy ? "Thinking..." : "Ask Gemini"}</button>{assistantEdits.length > 0 && <button type="button" onClick={applyAssistantEdits} className="brutal-border-2 brutal-press bg-blue-deep px-3 py-2 font-mono text-[10px] uppercase text-teal">Apply {assistantEdits.length} edit{assistantEdits.length === 1 ? "" : "s"}</button>}</div>{assistantReply && <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap border border-teal/20 bg-black/20 p-2 font-mono text-[11px] leading-relaxed text-teal">{assistantReply}</pre>}</div>
        </section>}

        {/* Panels */}
        <section className="brutal-border-2 mb-4 bg-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-display text-[12px] tracking-[0.2em] text-teal">VISIBLE PANELS</div>
            <button
              onClick={resetPanels}
              className="font-mono text-[10px] text-teal/60 underline hover:text-teal"
            >
              reset
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(Object.keys(PANEL_LABELS) as PanelId[]).map((id) => {
              const on = panels[id];
              const locked = false;
              return (
                <button
                  key={id}
                  onClick={() => togglePanel(id)}
                  className={`border px-2 py-2 text-left font-mono text-[11px] ${
                    on
                      ? "border-teal bg-blue-deep text-teal"
                      : "border-teal/30 bg-ink text-teal/45"
                  } disabled:opacity-50`}
                >
                  [{on && !locked ? "x" : " "}] {PANEL_LABELS[id]}
                </button>
              );
            })}
          </div>
        </section>

        {/* Panel motion */}
        <section className="brutal-border-2 mb-4 bg-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <button
              onClick={() => setMotionOpen((v) => !v)}
              aria-expanded={motionOpen}
              className="flex items-center gap-2 font-display text-[12px] tracking-[0.2em] text-teal"
            >
              {motionOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              PANEL MOTION
            </button>
            <button
              onClick={resetMotion}
              className="font-mono text-[10px] text-teal/60 underline hover:text-teal"
            >
              reset
            </button>
          </div>
          {motionOpen && (
            <>
          <p className="mb-3 font-mono text-[10px] text-teal/60">
            &gt; how the tool panel slides open and closed
          </p>
          <div className="space-y-3">
            <label className="block">
              <span className="font-mono text-[10px] text-teal/70">duration · {panelDurationMs}ms</span>
              <input
                type="range"
                min={0}
                max={1200}
                step={20}
                value={panelDurationMs}
                disabled={reduceMotion}
                onChange={(e) => setPanelDurationMs(+e.target.value)}
                className="w-full accent-teal disabled:opacity-40"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] text-teal/70">spring stiffness · {panelStiffness}</span>
              <input
                type="range"
                min={0}
                max={100}
                value={panelStiffness}
                disabled={reduceMotion}
                onChange={(e) => setPanelStiffness(+e.target.value)}
                className="w-full accent-teal disabled:opacity-40"
              />
            </label>
            <div
              className="h-8 border border-teal/30 bg-ink"
              aria-hidden
            >
              <div
                key={`${panelDurationMs}-${panelStiffness}-${reduceMotion}`}
                className="h-full w-1/3 bg-blue"
                style={{
                  animation: reduceMotion
                    ? undefined
                    : `panel-motion-demo ${panelDurationMs}ms ${springEasing(panelStiffness)} both`,
                }}
              />
            </div>
            <button
              onClick={() => setReduceMotion(!reduceMotion)}
              role="switch"
              aria-checked={reduceMotion}
              className={`brutal-border brutal-press w-full px-4 py-2 font-display text-[11px] tracking-[0.2em] ${
                reduceMotion ? "bg-blue text-ink" : "bg-surface-2 text-teal/70"
              }`}
            >
              REDUCED MOTION {reduceMotion ? "ON" : "OFF"}
            </button>
            <p className="font-mono text-[9px] text-teal/50">
              &gt; motion is also disabled automatically when your system prefers reduced motion.
            </p>
          </div>
            </>
          )}
        </section>

        {/* Editor theme */}
        <section className="brutal-border-2 mb-4 bg-surface p-4">
          <div className="mb-1 font-display text-[12px] tracking-[0.2em] text-teal">EDITOR THEME</div>
          <p className="mb-3 font-mono text-[10px] text-teal/60">
            &gt; skins the whole editor, same style packs as the components panel
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {EDITOR_THEMES.map((t) => {
              const on = editorTheme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setEditorTheme(t.id)}
                  className={`border px-2 py-2 text-left transition-colors duration-150 ${
                    on ? "border-teal bg-blue-deep text-teal" : "border-teal/30 bg-ink text-teal/60 hover:border-teal/60"
                  }`}
                >
                  <div className="font-display text-[11px] tracking-[0.15em]">
                    [{on ? "x" : " "}] {t.label}
                  </div>
                  <div className="font-mono text-[9px] opacity-70">{t.hint}</div>
                </button>
              );
            })}
          </div>
        </section>

        <ThemeStudio />

        {/* Published templates */}
        <section className="brutal-border-2 bg-surface p-4">
          <div className="mb-2 font-display text-[12px] tracking-[0.2em] text-teal">
            MY PUBLISHED TEMPLATES
          </div>
          {!user ? (
            <p className="font-mono text-[10px] text-teal/50">&gt; sign in to manage your templates</p>
          ) : templates === null ? (
            <div className="flex items-center gap-2 font-mono text-[10px] text-teal/60">
              <Loader2 className="h-3 w-3 animate-spin" /> loading…
            </div>
          ) : templates.length === 0 ? (
            <p className="font-mono text-[10px] text-teal/50">&gt; you haven't published any templates yet</p>
          ) : (
            <ul className="space-y-2">
              {templates.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-3 border border-teal/30 bg-ink p-2"
                >
                  {t.thumbnail ? (
                    <img src={t.thumbnail} alt="" className="h-10 w-16 border border-teal/30 object-cover" />
                  ) : (
                    <div className="h-10 w-16 border border-teal/20 bg-surface-2" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-display text-[11px] tracking-[0.15em] text-teal">
                      {t.name}
                    </div>
                    <div className="font-mono text-[9px] text-teal/50">
                      {new Date(t.created_at).toLocaleDateString()} · {t.pages?.length ?? 0} slides
                    </div>
                  </div>
                  <button
                    onClick={() => rename(t)}
                    disabled={busy === t.id}
                    aria-label={`Rename ${t.name}`}
                    className="grid h-8 w-8 place-items-center border border-teal/40 text-teal hover:border-teal disabled:opacity-50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => remove(t)}
                    disabled={busy === t.id}
                    aria-label={`Unpublish ${t.name}`}
                    className="grid h-8 w-8 place-items-center border border-teal/40 text-[#ff0080] hover:border-[#ff0080] disabled:opacity-50"
                  >
                    {busy === t.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {error && <p className="mt-2 font-mono text-[10px] text-[#ff0080]">! {error}</p>}
        </section>

        <nav className="mt-4 flex flex-wrap items-center gap-3 border-t border-teal/20 pt-3">
          <Link
            to="/marketplace"
            onClick={onClose}
            className="font-mono text-[10px] text-teal/70 underline hover:text-teal"
          >
            marketplace
          </Link>
          <Link
            to="/license"
            onClick={onClose}
            className="font-mono text-[10px] text-teal/70 underline hover:text-teal"
          >
            license
          </Link>
          <Link
            to="/privacypolicy"
            onClick={onClose}
            className="font-mono text-[10px] text-teal/70 underline hover:text-teal"
          >
            privacy policy
          </Link>
        </nav>
      </div>
    </div>
  );
}
