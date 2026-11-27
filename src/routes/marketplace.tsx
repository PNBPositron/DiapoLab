import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Loader2,
  LayoutTemplate,
  Search,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Layers,
  BookOpen,
  Puzzle,
  Trash2,
  Check,
  Code2,
  Wand2,
  PackageOpen,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SlideThumbnail } from "@/components/editor/SlideThumbnail";
import { listPublicTemplates, type PublicTemplate } from "@/lib/designs";
import { useEditor, type Page } from "@/store/editor";
import { usePlugins, SAMPLE_PLUGIN_CODE, type EditorPlugin } from "@/lib/plugins";
import { profileLabel } from "@/lib/profiles";
import { formatUtcDate } from "@/lib/date";
import { BUILTIN_TEMPLATES } from "@/lib/builtin-templates";
import { buildBreadcrumbJsonLd, buildPageHead, absoluteUrl } from "@/lib/seo";

export const Route = createFileRoute("/marketplace")({
  component: Marketplace,
  head: () =>
    buildPageHead({
      title: "DiapoLab Marketplace – Slide Templates & Add-ons",
      description:
        "Browse community presentation templates and user-made add-ons for DiapoLab. Preview slide decks and load them directly into the browser editor.",
      path: "/marketplace",
      jsonLd: [
        {
          "@type": "CollectionPage",
          name: "DiapoLab Marketplace – Slide Templates & Add-ons",
          description:
            "Browse community presentation templates and user-made add-ons for DiapoLab.",
          url: absoluteUrl("/marketplace"),
        },
        buildBreadcrumbJsonLd([
          { name: "DiapoLab", path: "/" },
          { name: "Marketplace", path: "/marketplace" },
        ]),
      ],
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
      .then((remote) => {
        setTemplates([
          ...BUILTIN_TEMPLATES,
          ...remote.filter((r) => !BUILTIN_TEMPLATES.some((b) => b.id === r.id)),
        ]);
      })
      .catch(() => setTemplates(BUILTIN_TEMPLATES));
  }, []);

  const applyTemplate = (t: PublicTemplate) => {
    useEditor.getState().loadPages(t.pages as Page[]);
    navigate({ to: "/" });
  };

  const tryImport = () => {
    setImportError(null);
    setImportSuccess(null);
    try {
      const plugin = usePlugins.getState().importPlugin(pluginCode);
      setImportSuccess(
        `✓ Imported "${plugin.name}" — ${plugin.widgets.length} widget${plugin.widgets.length === 1 ? "" : "s"}`,
      );
      setPluginCode("");
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Import failed");
    }
  };

  const q = query.trim().toLowerCase();
  const filteredTemplates = (templates ?? []).filter((t) => !q || t.name.toLowerCase().includes(q));
  const filteredPlugins = plugins.filter(
    (p) => !q || p.name.toLowerCase().includes(q) || (p.author ?? "").toLowerCase().includes(q),
  );

  const counts: Record<Tab, number> = {
    templates: templates?.length ?? 0,
    plugins: plugins.length,
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Top navigation */}
      <nav className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-900"
            >
              <img src="/favicon.ico" alt="DiapoLab" className="size-6 rounded-md object-contain" />
              <span>DiapoLab</span>
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-medium text-slate-500">Marketplace</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/wiki"
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <BookOpen className="size-3.5" /> Wiki
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
            >
              <ArrowLeft /> Back to editor
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-slate-500">Community &amp; extensions</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Marketplace
            </h1>
            <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
              Community templates and user-made add-ons. Everything is free — load it, remix it,
              make it yours.
            </p>
          </div>

          {/* Search bar */}
          <div className="mt-6 flex max-w-xl items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 transition-colors focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15">
            <Search className="size-4 shrink-0 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search templates, add-ons, authors…"
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="shrink-0 rounded px-2 py-0.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
              >
                Clear
              </button>
            )}
            <span className="hidden shrink-0 border-l border-slate-200 pl-3 font-mono text-[11px] tabular-nums text-slate-400 sm:inline">
              {filteredTemplates.length + filteredPlugins.length} results
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Tabs */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
            {(
              [
                ["templates", "Templates", LayoutTemplate],
                ["plugins", "Add-ons", Puzzle],
              ] as Array<[Tab, string, typeof Puzzle]>
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  tab === id
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Icon className={`size-3.5 ${tab === id ? "text-blue-600" : "text-slate-400"}`} />
                {label}
                <span className="font-mono text-[11px] tabular-nums text-slate-400">
                  {counts[id]}
                </span>
              </button>
            ))}
          </div>
          {tab === "plugins" && (
            <button
              onClick={() => {
                setImportOpen(true);
                setImportError(null);
                setImportSuccess(null);
              }}
              className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700"
            >
              <Code2 className="size-3.5" /> Import add-on code
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-600">
            {error}
          </div>
        )}

        {tab === "templates" ? (
          templates === null ? (
            <Loading />
          ) : filteredTemplates.length === 0 ? (
            <Empty
              icon={<LayoutTemplate className="size-5" />}
              title="No templates found"
              text={
                templates.length === 0
                  ? "Nothing published yet — be the first to share a deck from the editor toolbar."
                  : `No template matches “${query}”.`
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((t) => (
                <div
                  key={t.id}
                  className="group relative flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white transition-colors hover:border-slate-300"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => applyTemplate(t)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        applyTemplate(t);
                      }
                    }}
                    className="relative block aspect-video w-full cursor-pointer overflow-hidden border-b border-slate-200 bg-slate-50 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  >
                    {t.pages?.[0] ? (
                      <SlideThumbnail
                        page={t.pages[0] as Page}
                        canvasW={t.canvas_w}
                        canvasH={t.canvas_h}
                        className="h-full w-full"
                      />
                    ) : null}
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/0 opacity-0 transition-opacity duration-150 group-hover:bg-slate-950/20 group-hover:opacity-100">
                      <span className="flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-slate-900 shadow-sm">
                        Use template <ArrowUpRight className="size-3.5 text-blue-600" />
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-1 items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <button
                        onClick={() => applyTemplate(t)}
                        className="block max-w-full truncate text-left text-xs font-semibold text-slate-900 hover:text-blue-600"
                        title={t.name}
                      >
                        {t.name}
                      </button>
                      <div className="mt-1 flex items-center gap-1 text-[11px] tabular-nums text-slate-500">
                        <Layers className="size-3" /> {t.pages?.length ?? 0} slides
                        <span className="mx-1">·</span>
                        <Calendar className="size-3" /> {formatUtcDate(t.created_at)}
                      </div>
                      {t.creator_profile?.username && (
                        <Link
                          to="/profile/$username"
                          params={{ username: t.creator_profile.username }}
                          className="mt-2 inline-flex max-w-full items-center gap-1.5 text-[11px] font-medium text-blue-600 hover:underline"
                        >
                          <span className="grid size-4 shrink-0 place-items-center overflow-hidden rounded-full bg-blue-50 text-[8px] font-semibold text-blue-600">
                            {t.creator_profile.avatar_url ? (
                              <img
                                src={t.creator_profile.avatar_url}
                                alt=""
                                className="size-full object-cover"
                              />
                            ) : (
                              profileLabel(t.creator_profile).slice(0, 1).toUpperCase()
                            )}
                          </span>
                          <span className="truncate">by {profileLabel(t.creator_profile)}</span>
                        </Link>
                      )}
                    </div>
                    <button
                      onClick={() => applyTemplate(t)}
                      aria-label={`Use template ${t.name}`}
                      className="grid size-8 shrink-0 place-items-center rounded-md border border-slate-200 bg-white text-slate-400 transition-colors group-hover:border-slate-300 group-hover:text-blue-600"
                    >
                      <ArrowRight className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : filteredPlugins.length === 0 ? (
          <Empty
            icon={<PackageOpen className="size-5" />}
            title={plugins.length === 0 ? "No add-ons yet" : "No add-on matches your search"}
            text={
              plugins.length === 0
                ? "Import add-on code to add custom widget presets — they appear in the editor's Presets panel."
                : `No add-on matches “${query}”.`
            }
            action={
              <button
                onClick={() => {
                  setImportOpen(true);
                  setImportError(null);
                  setImportSuccess(null);
                }}
                className="mt-1 flex items-center gap-1.5 rounded-md bg-blue-600 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700"
              >
                <Code2 className="size-3.5" /> Import add-on code
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
        <nav className="mt-14 flex flex-wrap gap-5 border-t border-slate-200 pt-6 text-xs">
          {[
            { to: "/" as const, label: "Editor" },
            { to: "/wiki" as const, label: "Wiki" },
            { to: "/privacypolicy" as const, label: "Privacy policy" },
            { to: "/license" as const, label: "License" },
          ].map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="font-medium text-slate-500 transition-colors hover:text-slate-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </main>

      {/* Import dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl rounded-xl sm:rounded-xl border border-slate-200 bg-white p-0 shadow-2xl">
          <DialogHeader className="border-b border-slate-200 bg-white px-5 py-3.5">
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Code2 className="size-4 text-slate-500" />
              Import add-on
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 p-5">
            <p className="text-xs leading-relaxed text-slate-600">
              Paste add-on code below. Call{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-blue-700">
                diapolabPlugin(&#123; name, widgets: [...] &#125;)
              </code>{" "}
              with an array of widgets — each widget is a named set of canvas elements that will
              appear in the editor's <strong>Presets → Blocks</strong> section.
            </p>
            <textarea
              value={pluginCode}
              onChange={(e) => {
                setPluginCode(e.target.value);
                setImportError(null);
                setImportSuccess(null);
              }}
              spellCheck={false}
              placeholder="// Paste your add-on code here…"
              className="h-56 w-full resize-y rounded-lg border border-slate-200 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100 outline-none transition-colors focus:border-blue-500"
            />
            {importError && (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-600">
                {importError}
              </div>
            )}
            {importSuccess && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-700">
                {importSuccess}{" "}
                <Link to="/" className="font-semibold underline">
                  Open the editor →
                </Link>
              </div>
            )}
            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                onClick={() => setPluginCode(SAMPLE_PLUGIN_CODE)}
                className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
              >
                <Wand2 className="size-3.5" /> Load sample
              </button>
              <button
                onClick={tryImport}
                disabled={!pluginCode.trim()}
                className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-40"
              >
                <Check className="size-3.5" /> Import add-on
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
    <svg
      className="size-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
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
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white transition-colors hover:border-slate-300">
      {/* Preview */}
      <div className="flex h-24 items-center justify-center border-b border-slate-200 bg-slate-50/70">
        <span className="grid size-10 place-items-center rounded-md border border-slate-200 bg-white text-blue-600">
          <Puzzle className="size-4.5" />
        </span>
      </div>
      <div className="px-4 py-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-slate-900" title={plugin.name}>
              {plugin.name}
            </div>
            <div className="mt-1 truncate text-[11px] tabular-nums text-slate-500">
              {plugin.author ? `by ${plugin.author}` : "Unknown author"}
              {plugin.version ? ` · v${plugin.version}` : ""} · {formatUtcDate(plugin.importedAt)}
            </div>
          </div>
          <button
            onClick={onRemove}
            title="Remove add-on"
            className="grid size-7 shrink-0 place-items-center rounded-md text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
        {plugin.description && (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600">
            {plugin.description}
          </p>
        )}
        <p className="mt-2.5 truncate text-[11px] text-slate-500">
          {plugin.widgets
            .slice(0, 4)
            .map((w) => w.name)
            .join(" · ")}
          {plugin.widgets.length > 4 ? ` · +${plugin.widgets.length - 4} more` : ""}
        </p>
        <button
          onClick={onToggle}
          className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            plugin.enabled
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/70"
              : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
          }`}
        >
          {plugin.enabled ? <>✓ Enabled — widgets in Presets</> : <>Disabled</>}
        </button>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="aspect-video w-full animate-pulse bg-slate-100" />
          <div className="space-y-2 px-4 py-3.5">
            <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
            <div className="h-2.5 w-1/3 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      ))}
      <div className="col-span-full flex items-center justify-center gap-2 py-4 text-xs text-slate-500">
        <Loader2 className="size-3.5 animate-spin text-blue-600" /> Loading…
      </div>
    </div>
  );
}

function Empty({
  icon,
  title,
  text,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 py-14 text-center">
      <span className="grid size-10 place-items-center rounded-md border border-slate-200 bg-white text-slate-400">
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">{text}</p>
      </div>
      {action}
    </div>
  );
}
