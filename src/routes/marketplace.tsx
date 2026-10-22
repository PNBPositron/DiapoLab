import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Palette, LayoutTemplate, Search, Sparkles, ArrowRight, ArrowUpRight, Calendar, Layers, BookOpen, Sparkle } from "lucide-react";
import { SlideThumbnail } from "@/components/editor/SlideThumbnail";
import { listPublicTemplates, type PublicTemplate } from "@/lib/designs";
import { listPublicThemes, themeCssVars, CUSTOM_THEME_PREFIX, type PublicTheme } from "@/lib/themes";
import { useEditor, type Page } from "@/store/editor";
import { useSettings } from "@/store/settings";

export const Route = createFileRoute("/marketplace")({
  component: Marketplace,
  head: () => ({
    meta: [
      { title: "Marketplace — Community Themes & Templates" },
      {
        name: "description",
        content:
          "Browse community-made presentation templates and editor themes for DiapoLab, then load them straight into the editor.",
      },
      { property: "og:title", content: "Marketplace — Community Themes & Templates" },
      {
        property: "og:description",
        content: "Browse and install community presentation templates and editor themes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://diapolab.lovable.app/marketplace" }],
  }),
});

type Tab = "templates" | "themes";

function Marketplace() {
  const [tab, setTab] = useState<Tab>("templates");
  const [templates, setTemplates] = useState<PublicTemplate[] | null>(null);
  const [themes, setThemes] = useState<PublicTheme[] | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { addCustomTheme, setEditorTheme, editorTheme } = useSettings();

  useEffect(() => {
    listPublicTemplates()
      .then(setTemplates)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load templates"));
    listPublicThemes()
      .then(setThemes)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load themes"));
  }, []);

  const useTemplate = (t: PublicTemplate) => {
    useEditor.getState().loadPages(t.pages as Page[]);
    navigate({ to: "/" });
  };

  const useTheme = (t: PublicTheme) => {
    addCustomTheme({ id: t.id, name: t.name, tokens: t.tokens });
    setEditorTheme(`${CUSTOM_THEME_PREFIX}${t.id}`);
  };

  const q = query.trim().toLowerCase();
  const filteredTemplates = (templates ?? []).filter(
    (t) => !q || t.name.toLowerCase().includes(q),
  );
  const filteredThemes = (themes ?? []).filter(
    (t) => !q || t.name.toLowerCase().includes(q),
  );

  const counts: Record<Tab, number> = {
    templates: templates?.length ?? 0,
    themes: themes?.length ?? 0,
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
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">DiapoLab</p>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Marketplace</h1>
            </div>
          </div>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-500">
            Community-made templates and editor themes. Everything is free — load it,
            remix it, make it yours.
          </p>

          {/* Search */}
          <div className="mt-6 flex max-w-md items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10">
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
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Tabs */}
        <div className="mb-6 flex items-center gap-2">
          {(
            [
              ["templates", "Templates", LayoutTemplate],
              ["themes", "Themes", Palette],
            ] as Array<[Tab, string, typeof Palette]>
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
                    <ArrowRight className="size-4 shrink-0 text-slate-200 transition-all group-hover:translate-x-0.5 group-hover:text-blue-500" />
                  </div>
                </button>
              ))}
            </div>
          )
        ) : themes === null ? (
          <Loading />
        ) : filteredThemes.length === 0 ? (
          <Empty
            icon={<Palette className="size-5" />}
            title="No themes found"
            text={themes.length === 0 ? "No themes published yet — build one in settings and share it." : `No theme matches “${query}”.`}
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredThemes.map((t) => {
              const active = editorTheme === `${CUSTOM_THEME_PREFIX}${t.id}`;
              const vars = themeCssVars(t.tokens);
              return (
                <div
                  key={t.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-[0_16px_40px_-12px_rgba(37,99,235,0.25)]"
                >
                  {/* Preview */}
                  <div className="border-b border-slate-100 p-4" style={{ background: t.tokens.paper }}>
                    <div
                      className="flex h-24 flex-col justify-between rounded-xl p-3 shadow-md"
                      style={{ background: t.tokens.ink }}
                    >
                      <span
                        className="text-[11px] font-semibold uppercase tracking-[0.25em]"
                        style={{ color: t.tokens.teal }}
                      >
                        Aa DiapoLab
                      </span>
                      <div className="flex gap-1.5">
                        {Object.values(vars)
                          .slice(0, 6)
                          .map((c, i) => (
                            <span
                              key={i}
                              className="size-4 rounded-full border border-black/10 shadow-sm"
                              style={{ background: c }}
                            />
                          ))}
                      </div>
                    </div>
                  </div>
                  <div className="px-4 py-3.5">
                    <div className="truncate text-xs font-semibold text-slate-800" title={t.name}>
                      {t.name}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                      <Calendar className="size-2.5" /> {new Date(t.created_at).toLocaleDateString()}
                    </div>
                    <button
                      onClick={() => useTheme(t)}
                      className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[11px] font-semibold transition-all active:scale-[0.98] ${
                        active
                          ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200"
                          : "bg-blue-600 text-white shadow-[0_8px_20px_rgba(37,99,235,0.25)] hover:bg-blue-700"
                      }`}
                    >
                      {active ? (
                        <>✓ Active in editor</>
                      ) : (
                        <>
                          <Sparkle className="size-3.5" /> Use theme
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
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

function Empty({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white/60 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-blue-50 text-blue-400">{icon}</span>
      <div>
        <p className="text-sm font-semibold text-slate-600">{title}</p>
        <p className="mt-1 max-w-sm text-xs text-slate-400">{text}</p>
      </div>
    </div>
  );
}
