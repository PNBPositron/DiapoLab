import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, LayoutTemplate, Search, Sparkles, ArrowRight, ArrowUpRight, Calendar, Layers, BookOpen, Puzzle, Trash2, Check, Code2, Wand2, PackageOpen } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SlideThumbnail } from "@/components/editor/SlideThumbnail";
import { listPublicTemplates, type PublicTemplate } from "@/lib/designs";
import { useEditor, type Page } from "@/store/editor";
import { usePlugins, SAMPLE_PLUGIN_CODE, type EditorPlugin } from "@/lib/plugins";
import { profileLabel } from "@/lib/profiles";

export const Route = createFileRoute("/marketplace")({
  component: Marketplace,
  head: () => ({
    meta: [
      { title: "Marketplace — Templates & Plugins" },
      {
        name: "description",
        content:
          "Browse community presentation templates and import user-made plugins for DiapoLab, then load them straight into the editor.",
      },
      { property: "og:title", content: "Marketplace — Templates & Plugins" },
      {
        property: "og:description",
        content: "Browse community templates and import plugins for the DiapoLab editor.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://diapolab.lovable.app/marketplace" }],
  }),
});

type Tab = "templates" | "plugins";

function Marketplace() {
  const [tab, setTab] = useState<Tab>("templates");
  const [templates, setTemplates] = useState<PublicTemplate[] | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const plugins = usePlugins((s) => s.plugins);
  const removePlugin = usePlugins((s) => s.removePlugin);
  const togglePlugin = usePlugins((s) => s.togglePlugin);

  const [importOpen, setImportOpen] = useState(false);
  const [pluginCode, setPluginCode] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  useEffect(() => {
    listPublicTemplates()
      .then(setTemplates)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load templates"));
  }, []);

  const useTemplate = (t: PublicTemplate) => {
    useEditor.getState().loadPages(t.pages as Page[]);
    navigate({ to: "/" });
  };

  const tryImport = () => {
    setImportError(null);
    setImportSuccess(null);
    try {
      const plugin = usePlugins.getState().importPlugin(pluginCode);
      setImportSuccess(`✓ Imported "${plugin.name}" — ${plugin.widgets.length} widget${plugin.widgets.length === 1 ? "" : "s"}`);
      setPluginCode("");
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Import failed");
    }
  };

  const q = query.trim().toLowerCase();
  const filteredTemplates = (templates ?? []).filter(
    (t) => !q || t.name.toLowerCase().includes(q),
  );
  const filteredPlugins = plugins.filter(
    (p) => !q || p.name.toLowerCase().includes(q) || (p.author ?? "").toLowerCase().includes(q),
  );

  const counts: Record<Tab, number> = {
    templates: templates?.length ?? 0,
    plugins: plugins.length,
  };

  return (
    <div className="min-h-screen bg-slate-50/60">
      {/* Hero header */}
      <header className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-white via-blue-50/40 to-slate-100">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "radial-gradient(circle at 85% -10%, rgba(37,99,235,0.18) 0%, transparent 55%), radial-gradient(circle at 10% 110%, rgba(99,102,241,0.12) 0%, transparent 45%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-6 py-12">
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-slate-500 shadow-sm backdrop-blur transition hover:border-blue-300 hover:text-blue-600"
            >
              <ArrowLeft /> back to editor
            </Link>
            <Link
              to="/wiki"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-slate-500 shadow-sm backdrop-blur transition hover:border-blue-300 hover:text-blue-600"
            >
              <BookOpen className="size-3.5" /> wiki
            </Link>
          </div>
          <div className="mt-6 flex items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.35)]">
              <Sparkles className="size-5" />
            </span>
            <div>
              <p className="logo-wordmark text-[11px] text-blue-600">DiapoLab</p>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Marketplace</h1>
            </div>
          </div>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-500">
            Community templates and user-made plugins. Everything is free — load it,
            remix it, make it yours.
          </p>

          {/* Search console */}
          <div className="mt-6 max-w-2xl rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-[0_12px_32px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 transition focus-within:border-blue-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10">
            <Search className="size-4 shrink-0 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the marketplace…"
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="shrink-0 text-[10px] font-medium text-slate-400 transition hover:text-slate-600"
              >
                clear
              </button>
            )}
            </div>
            <div className="flex items-center gap-2 px-2 pt-2 text-[10px] text-slate-400"><span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">/</span><span>Search templates, plugins, authors</span><span className="ml-auto hidden sm:inline">{filteredTemplates.length + filteredPlugins.length} results</span></div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Tabs */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {(
            [
              ["templates", "Templates", LayoutTemplate],
              ["plugins", "Plugins", Puzzle],
            ] as Array<[Tab, string, typeof Puzzle]>
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-all ${
                tab === id
                  ? "border-blue-600 bg-blue-600 text-white shadow-[0_8px_20px_rgba(37,99,235,0.3)]"
                  : "border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:text-blue-600"
              }`}
            >
              <Icon className="size-3.5" /> {label}
              <span
                className={`rounded-full px-1.5 py-0.5 font-mono text-[9px] ${
                  tab === id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"
                }`}
              >
                {counts[id]}
              </span>
            </button>
          ))}
          {tab === "plugins" && (
            <button
              onClick={() => { setImportOpen(true); setImportError(null); setImportSuccess(null); }}
              className="ml-auto flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.35)] transition-all hover:brightness-110 active:scale-[0.97]"
            >
              <Code2 className="size-3.5" /> Import plugin code
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-600">
            ! {error}
          </div>
        )}

        {tab === "templates" ? (
          templates === null ? (
            <Loading />
          ) : filteredTemplates.length === 0 ? (
            <Empty
              icon={<LayoutTemplate className="size-5" />}
              title="No templates found"
              text={templates.length === 0 ? "Nothing published yet — be the first to share a deck from the editor toolbar." : `No template matches “${query}”.`}
            />
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => useTemplate(t)}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-[0_1px_3px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-[0_16px_40px_-12px_rgba(37,99,235,0.25)]"
                >
                  <div className="relative aspect-video w-full overflow-hidden border-b border-slate-100 bg-slate-100">
                    {t.pages?.[0] ? (
                      <SlideThumbnail
                        page={t.pages[0] as Page}
                        canvasW={t.canvas_w}
                        canvasH={t.canvas_h}
                        className="h-full w-full transition-transform duration-300 group-hover:scale-[1.04]"
                      />
                    ) : null}
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/0 opacity-0 transition-all duration-200 group-hover:bg-slate-950/30 group-hover:opacity-100">
                      <span className="flex translate-y-1 items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-800 shadow-lg transition-transform duration-200 group-hover:translate-y-0">
                        Use template <ArrowUpRight className="size-3 text-blue-600" />
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold text-slate-800" title={t.name}>
                        {t.name}
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                        <Layers className="size-2.5" /> {t.pages?.length ?? 0} slides
                        <span className="mx-1">·</span>
                        <Calendar className="size-2.5" /> {new Date(t.created_at).toLocaleDateString()}
                      </div>
                    </div>
                      {t.creator_profile?.username && <Link to="/profile/$username" params={{ username: t.creator_profile.username }} onClick={(event) => event.stopPropagation()} className="mt-2 flex min-w-0 items-center gap-1.5 text-[10px] font-semibold text-blue-600 hover:underline"><span className="grid size-5 shrink-0 place-items-center overflow-hidden rounded-full bg-blue-100 text-[8px] text-blue-600">{t.creator_profile.avatar_url ? <img src={t.creator_profile.avatar_url} alt="" className="size-full object-cover" /> : profileLabel(t.creator_profile).slice(0, 1).toUpperCase()}</span><span className="truncate">by {profileLabel(t.creator_profile as any)}</span></Link>}
                    <ArrowRight className="size-4 shrink-0 text-slate-200 transition-all group-hover:translate-x-0.5 group-hover:text-blue-500" />
                  </div>
                </button>
              ))}
            </div>
          )
        ) : filteredPlugins.length === 0 ? (
          <Empty
            icon={<PackageOpen className="size-5" />}
            title={plugins.length === 0 ? "No plugins yet" : "No plugin matches your search"}
            text={plugins.length === 0 ? "Import plugin code to add custom widget presets — they appear in the editor's Presets panel." : `No plugin matches “${query}”.`}
            action={
              <button
                onClick={() => { setImportOpen(true); setImportError(null); setImportSuccess(null); }}
                className="mt-1 flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-[11px] font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.25)] transition-all hover:bg-blue-700 active:scale-[0.97]"
              >
                <Code2 className="size-3.5" /> Import plugin code
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPlugins.map((p) => (
              <PluginCard
                key={p.id}
                plugin={p}
                onToggle={() => togglePlugin(p.id)}
                onRemove={() => removePlugin(p.id)}
              />
            ))}
          </div>
        )}

        {/* Footer nav */}
        <nav className="mt-14 flex flex-wrap gap-2 border-t border-slate-200 pt-6">
          {[
            { to: "/" as const, label: "Editor" },
            { to: "/wiki" as const, label: "Wiki" },
            { to: "/privacypolicy" as const, label: "Privacy policy" },
            { to: "/license" as const, label: "License" },
          ].map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-500 transition-all hover:border-blue-300 hover:text-blue-600"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </main>

      {/* Import dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl border-slate-200 bg-white p-0">
          <DialogHeader className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-800">
              <span className="grid size-7 place-items-center rounded-lg bg-blue-600 text-white">
                <Code2 className="size-3.5" />
              </span>
              Import plugin
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 p-5">
            <p className="text-xs leading-relaxed text-slate-500">
              Paste plugin code below. Call <code className="rounded bg-slate-100 px-1 font-mono text-[10px] text-blue-600">diapolabPlugin(&#123; name, widgets: [...] &#125;)</code>{" "}
              with an array of widgets — each widget is a named set of canvas elements
              that will appear in the editor's <strong>Presets → Blocks</strong> section.
            </p>
            <textarea
              value={pluginCode}
              onChange={(e) => { setPluginCode(e.target.value); setImportError(null); setImportSuccess(null); }}
              spellCheck={false}
              placeholder="// Paste your plugin code here…"
              className="h-56 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-200 outline-none transition-colors focus:border-blue-500"
            />
            {importError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-600">
                {importError}
              </div>
            )}
            {importSuccess && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-600">
                {importSuccess} <Link to="/" className="underline">Open the editor →</Link>
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => setPluginCode(SAMPLE_PLUGIN_CODE)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-500 transition hover:border-blue-300 hover:text-blue-600"
              >
                <Wand2 className="size-3.5" /> Load sample
              </button>
              <button
                onClick={tryImport}
                disabled={!pluginCode.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-[11px] font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.25)] transition-all hover:bg-blue-700 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
              >
                <Check className="size-3.5" /> Import plugin
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ArrowLeft() {
  return (
    <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

function PluginCard({
  plugin,
  onToggle,
  onRemove,
}: {
  plugin: EditorPlugin;
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-[0_16px_40px_-12px_rgba(37,99,235,0.25)]">
      {/* Preview */}
      <div className="flex h-28 items-center justify-center border-b border-slate-100 bg-gradient-to-br from-indigo-50 via-white to-blue-50/60">
        <span className="grid size-12 place-items-center rounded-2xl bg-indigo-600 text-white shadow-[0_8px_20px_rgba(79,70,229,0.35)]">
          <Puzzle className="size-5" />
        </span>
      </div>
      <div className="px-4 py-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-slate-800" title={plugin.name}>
              {plugin.name}
            </div>
            <div className="mt-1 truncate text-[10px] text-slate-400">
              {plugin.author ? `by ${plugin.author}` : "unknown author"}
              {plugin.version ? ` · v${plugin.version}` : ""} ·{" "}
              {new Date(plugin.importedAt).toLocaleDateString()}
            </div>
          </div>
          <button
            onClick={onRemove}
            title="Remove plugin"
            className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
        {plugin.description && (
          <p className="mt-2 line-clamp-2 text-[11px] leading-snug text-slate-500">{plugin.description}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-1">
          {plugin.widgets.slice(0, 4).map((w, i) => (
            <span key={i} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-semibold text-slate-500">
              {w.name}
            </span>
          ))}
          {plugin.widgets.length > 4 && (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-semibold text-slate-400">
              +{plugin.widgets.length - 4}
            </span>
          )}
        </div>
        <button
          onClick={onToggle}
          className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[11px] font-semibold transition-all active:scale-[0.98] ${
            plugin.enabled
              ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
        >
          {plugin.enabled ? (
            <>✓ Enabled — widgets in Presets</>
          ) : (
            <>Disabled</>
          )}
        </button>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="aspect-video w-full animate-pulse bg-gradient-to-br from-slate-100 to-slate-50" />
          <div className="space-y-2 px-4 py-3.5">
            <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
            <div className="h-2 w-1/3 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      ))}
      <div className="col-span-full flex items-center justify-center gap-2 py-4 text-xs text-slate-400">
        <Loader2 className="size-3.5 animate-spin text-blue-500" /> loading…
      </div>
    </div>
  );
}

function Empty({ icon, title, text, action }: { icon: React.ReactNode; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white/60 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-blue-50 text-blue-400">{icon}</span>
      <div>
        <p className="text-sm font-semibold text-slate-600">{title}</p>
        <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-400">{text}</p>
      </div>
      {action}
    </div>
  );
}
