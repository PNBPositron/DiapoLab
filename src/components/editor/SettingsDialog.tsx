import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Loader2, Pencil, Trash2, X } from "lucide-react";
import { useSettings, PANEL_LABELS, EDITOR_THEMES, springEasing, type PanelId } from "@/store/settings";
import { useAuth } from "@/hooks/use-auth";
import { useEditor } from "@/store/editor";
import { listMyPublicTemplates, renamePublicTemplate, deletePublicTemplate, type PublicTemplate } from "@/lib/designs";

const card = "mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_4px_rgba(15,23,42,0.04)]";
const title = "font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700";
const help = "mt-1 text-[10px] leading-relaxed text-slate-400";

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const { panels, togglePanel, resetPanels, panelDurationMs, setPanelDurationMs, panelStiffness, setPanelStiffness, reduceMotion, setReduceMotion, resetMotion, editorTheme, setEditorTheme } = useSettings();
  const { user } = useAuth();
  const { pages, loadPages } = useEditor();
  const [motionOpen, setMotionOpen] = useState(false);
  const [developerOpen, setDeveloperOpen] = useState(false);
  const [jsonDraft, setJsonDraft] = useState(() => JSON.stringify(pages, null, 2));
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
      const parsed = JSON.parse(jsonDraft);
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/30 p-3 backdrop-blur-sm sm:p-6" onClick={onClose}>
      <div className="relative my-3 max-h-[min(900px,calc(100vh-1.5rem))] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-200 bg-slate-50/95 p-4 text-slate-800 shadow-[0_24px_80px_rgba(15,23,42,0.18)] sm:my-6 sm:p-6" onClick={(event) => event.stopPropagation()}>
        <button onClick={onClose} aria-label="Close settings" className="absolute right-4 top-4 grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-800"><X className="size-4" /></button>
        <header className="mb-6 pr-12"><h2 className="font-display text-lg font-semibold uppercase tracking-[0.16em] text-slate-800">Settings</h2><p className="mt-1 text-sm text-slate-500">Preferences are stored on this device.</p></header>

        <section className={card}><div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5"><div><div className={title}>Developer mode</div><p className={help}>Inspect and edit the active slideshow JSON.</p></div><button onClick={() => { setJsonDraft(JSON.stringify(pages, null, 2)); setJsonStatus(null); setDeveloperOpen((open) => !open); }} className="rounded-lg bg-blue-600 px-3.5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white hover:bg-blue-700">{developerOpen ? "Close developer mode" : "Open developer mode"}</button></div></section>
        {developerOpen && <section className={`${card} bg-slate-900`}><div className="p-4 sm:p-5"><textarea value={jsonDraft} onChange={(event) => { setJsonDraft(event.target.value); setJsonStatus(null); }} spellCheck={false} className="h-72 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-200 outline-none focus:border-blue-500" /><div className="mt-3 flex items-center justify-between gap-3"><span className="font-mono text-[10px] text-slate-400">{jsonStatus ?? `${pages.length} slides loaded`}</span><button onClick={applyJson} className="rounded-lg bg-blue-600 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-white hover:bg-blue-700">Apply changes</button></div></div></section>}

        <section className={card}><div className="p-4 sm:p-5"><div className="mb-3 flex items-center justify-between"><div><div className={title}>Visible panels</div><p className={help}>Choose which tools appear in the editor sidebar.</p></div><button onClick={resetPanels} className="text-[10px] text-slate-400 underline hover:text-slate-700">Reset</button></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{(Object.keys(PANEL_LABELS) as PanelId[]).map((id) => { const on = panels[id]; return <button key={id} onClick={() => togglePanel(id)} className={`rounded-lg border px-3 py-2.5 text-left text-xs font-medium transition ${on ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-400 hover:bg-slate-50"}`}><span className={`mr-2 inline-block size-2 rounded-full ${on ? "bg-blue-500" : "bg-slate-300"}`} />{PANEL_LABELS[id]}</button>; })}</div></div></section>

        <section className={card}><div className="p-4 sm:p-5"><div className="flex items-center justify-between"><button onClick={() => setMotionOpen((open) => !open)} className="flex items-center gap-2"><ChevronRight className={`size-4 text-slate-400 transition-transform ${motionOpen ? "rotate-90" : ""}`} /><span className={title}>Panel motion</span></button><button onClick={resetMotion} className="text-[10px] text-slate-400 underline hover:text-slate-700">Reset</button></div>{motionOpen && <div className="mt-4 space-y-4 border-t border-slate-100 pt-4"><label className="block text-xs text-slate-600">Duration <span className="text-slate-400">{panelDurationMs}ms</span><input type="range" min={0} max={1200} step={20} value={panelDurationMs} disabled={reduceMotion} onChange={(event) => setPanelDurationMs(+event.target.value)} className="mt-2 w-full accent-blue-600 disabled:opacity-40" /></label><label className="block text-xs text-slate-600">Spring stiffness <span className="text-slate-400">{panelStiffness}</span><input type="range" min={0} max={100} value={panelStiffness} disabled={reduceMotion} onChange={(event) => setPanelStiffness(+event.target.value)} className="mt-2 w-full accent-blue-600 disabled:opacity-40" /></label><div className="h-8 overflow-hidden rounded-lg border border-slate-200 bg-slate-100"><div key={`${panelDurationMs}-${panelStiffness}-${reduceMotion}`} className="h-full w-1/3 bg-blue-500" style={{ animation: reduceMotion ? undefined : `panel-motion-demo ${panelDurationMs}ms ${springEasing(panelStiffness)} both` }} /></div><button onClick={() => setReduceMotion(!reduceMotion)} role="switch" aria-checked={reduceMotion} className={`w-full rounded-lg border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] ${reduceMotion ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600"}`}>Reduced motion {reduceMotion ? "on" : "off"}</button></div>}</div></section>

        <section className={card}><div className="p-4 sm:p-5"><div className={title}>Editor theme</div><p className={help}>Choose the visual style for the editor chrome.</p><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">{EDITOR_THEMES.map((theme) => { const on = editorTheme === theme.id; return <button key={theme.id} onClick={() => setEditorTheme(theme.id)} className={`rounded-xl border p-3 text-left transition ${on ? "border-blue-300 bg-blue-50 text-blue-700 shadow-sm" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}><div className="text-xs font-semibold">{theme.label}</div><div className="mt-1 text-[10px] text-slate-400">{theme.hint}</div></button>; })}</div></div></section>

        <section className={card}><div className="p-4 sm:p-5"><div className={title}>My published templates</div>{!user ? <p className={help}>Sign in to manage your templates.</p> : templates === null ? <div className="mt-3 flex items-center gap-2 text-xs text-slate-400"><Loader2 className="size-3 animate-spin" /> Loading…</div> : templates.length === 0 ? <p className={help}>You haven't published any templates yet.</p> : <ul className="mt-3 space-y-2">{templates.map((template) => <li key={template.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5"><div className="size-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">{template.thumbnail && <img src={template.thumbnail} alt="" className="h-full w-full object-cover" />}</div><div className="min-w-0 flex-1"><div className="truncate text-xs font-medium text-slate-700">{template.name}</div><div className="text-[10px] text-slate-400">{new Date(template.created_at).toLocaleDateString()} · {template.pages?.length ?? 0} slides</div></div><button onClick={() => rename(template)} disabled={busy === template.id} className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100" aria-label={`Rename ${template.name}`}><Pencil className="size-3.5" /></button><button onClick={() => remove(template)} disabled={busy === template.id} className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Unpublish ${template.name}`}>{busy === template.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}</button></li>)}</ul>}{error && <p className="mt-3 text-xs text-rose-600">{error}</p>}</div></section>
        <nav className="flex flex-wrap gap-4 border-t border-slate-200 pt-4 text-xs text-slate-400"><Link to="/marketplace" onClick={onClose} className="hover:text-slate-700">Marketplace</Link><Link to="/license" onClick={onClose} className="hover:text-slate-700">License</Link><Link to="/privacypolicy" onClick={onClose} className="hover:text-slate-700">Privacy policy</Link></nav>
      </div>
    </div>
  );
}
