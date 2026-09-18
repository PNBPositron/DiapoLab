import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Palette, LayoutTemplate } from "lucide-react";
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
    links: [{ rel: "canonical", href: "https://positronstudio.lovable.app/marketplace" }],
  }),
});

type Tab = "templates" | "themes";

function Marketplace() {
  const [tab, setTab] = useState<Tab>("templates");
  const [templates, setTemplates] = useState<PublicTemplate[] | null>(null);
  const [themes, setThemes] = useState<PublicTheme[] | null>(null);
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

  return (
    <div className="min-h-screen bg-ink px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <Link to="/" className="font-mono text-[11px] text-teal/60 underline hover:text-teal">
          &lt; back to editor
        </Link>
        <h1 className="mt-4 font-display text-2xl tracking-[0.2em] text-teal">▸ MARKETPLACE</h1>
        <p className="mb-6 font-mono text-[11px] text-teal/50">
          &gt; community templates and editor themes · free to use and remix
        </p>

        <div className="mb-6 flex gap-2">
          {(
            [
              ["templates", "TEMPLATES", LayoutTemplate],
              ["themes", "THEMES", Palette],
            ] as Array<[Tab, string, typeof Palette]>
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`brutal-border brutal-press flex items-center gap-2 px-4 py-2 font-display text-[11px] tracking-[0.2em] ${
                tab === id ? "bg-blue text-ink" : "bg-surface text-teal/70"
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>

        {error && <p className="mb-4 font-mono text-[11px] text-[#ff0080]">! {error}</p>}

        {tab === "templates" ? (
          templates === null ? (
            <Loading />
          ) : templates.length === 0 ? (
            <Empty text="no templates published yet — be the first" />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => useTemplate(t)}
                  className="brutal-border-2 group bg-surface p-2 text-left transition-colors hover:border-blue"
                >
                  <div className="aspect-video w-full overflow-hidden border border-teal/25 bg-ink">
                    {t.pages?.[0] ? (
                      <SlideThumbnail
                        page={t.pages[0] as Page}
                        canvasW={t.canvas_w}
                        canvasH={t.canvas_h}
                        className="h-full w-full"
                      />
                    ) : null}
                  </div>
                  <div className="mt-2 font-display text-[11px] tracking-[0.15em] text-teal">
                    {t.name}
                  </div>
                  <div className="font-mono text-[9px] text-teal/50">
                    {t.pages?.length ?? 0} slides · {new Date(t.created_at).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          )
        ) : themes === null ? (
          <Loading />
        ) : themes.length === 0 ? (
          <Empty text="no themes published yet — build one in settings" />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {themes.map((t) => {
              const active = editorTheme === `${CUSTOM_THEME_PREFIX}${t.id}`;
              const vars = themeCssVars(t.tokens);
              return (
                <div key={t.id} className="brutal-border-2 bg-surface p-3">
                  <div
                    className="mb-3 h-24 border border-teal/25 p-2"
                    style={{ background: t.tokens.paper }}
                  >
                    <div
                      className="flex h-full flex-col justify-between p-2"
                      style={{ background: t.tokens.ink }}
                    >
                      <span
                        className="font-display text-[10px] tracking-[0.2em]"
                        style={{ color: t.tokens.teal }}
                      >
                        Aa DIAPOLAB
                      </span>
                      <div className="flex gap-1">
                        {Object.values(vars)
                          .slice(0, 6)
                          .map((c, i) => (
                            <span key={i} className="h-4 w-4 border border-black/20" style={{ background: c }} />
                          ))}
                      </div>
                    </div>
                  </div>
                  <div className="font-display text-[11px] tracking-[0.15em] text-teal">{t.name}</div>
                  <div className="mb-2 font-mono text-[9px] text-teal/50">
                    {new Date(t.created_at).toLocaleDateString()}
                  </div>
                  <button
                    onClick={() => useTheme(t)}
                    className={`brutal-border brutal-press w-full px-3 py-1.5 font-display text-[10px] tracking-[0.2em] ${
                      active ? "bg-blue text-ink" : "bg-surface-2 text-teal/80"
                    }`}
                  >
                    {active ? "ACTIVE" : "USE THEME"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <nav className="mt-12 flex gap-4 border-t border-teal/20 pt-6 font-mono text-[11px] text-teal/60">
          <Link to="/privacypolicy" className="underline hover:text-teal">
            privacy
          </Link>
          <Link to="/license" className="underline hover:text-teal">
            license
          </Link>
        </nav>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center gap-2 font-mono text-[11px] text-teal/60">
      <Loader2 className="h-3.5 w-3.5 animate-spin" /> loading…
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="font-mono text-[11px] text-teal/50">&gt; {text}</p>;
}
