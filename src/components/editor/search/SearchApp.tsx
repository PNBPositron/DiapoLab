import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, CircleAlert, Globe, LoaderCircle, Search, Sparkles, Timer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { PluginApp } from "@/lib/plugins";

type Result = { title?: string; url?: string; snippet?: string; description?: string };

const SUGGESTIONS = ["Mistral AI", "design trends 2027", "neobrutalism", "presentation tips"];

/** Extracts a readable host ("techcrunch.com") from a URL, for the source chip. */
const hostOf = (url?: string) => {
  if (!url) return null;
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
};

const faviconOf = (url?: string) =>
  url ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostOf(url) ?? "")}&sz=64` : "";

export function SearchAppDialog({ app, open, onOpenChange }: { app: PluginApp; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [tookMs, setTookMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = async (q?: string) => {
    const term = (q ?? query).trim();
    if (!term || loading) return;
    if (q) setQuery(q);
    setLoading(true); setError(null); setTookMs(null);
    const started = performance.now();
    try {
      const response = await fetch("/api/context-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: term }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Search failed.");
      setResults(Array.isArray(payload.results) ? payload.results : Array.isArray(payload.data) ? payload.data : []);
      setTookMs(Math.round(performance.now() - started));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed.");
      setResults([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  // Focus the input each time the dialog opens.
  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden border-slate-200/80 bg-white p-0 shadow-[0_40px_120px_-30px_rgba(8,145,178,0.35)] sm:rounded-3xl">
        {/* ---- Header: soft mesh gradient + brand chip ---- */}
        <DialogHeader className="relative border-b border-slate-100 px-6 py-5">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(18rem_10rem_at_15%_-40%,rgba(34,211,238,0.25),transparent),radial-gradient(16rem_9rem_at_95%_140%,rgba(129,140,248,0.22),transparent)]"
          />
          <DialogTitle className="relative flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-2xl bg-gradient-to-br from-cyan-500 to-sky-600 text-white shadow-lg shadow-cyan-500/30">
              <Sparkles className="size-4" />
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-extrabold tracking-tight text-slate-900">{app.name}</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Context web search
              </span>
            </span>
            <span className="ml-auto hidden items-center gap-1.5 rounded-full border border-slate-200 bg-white/70 px-2.5 py-1 text-[10px] font-semibold text-slate-500 sm:flex">
              <Globe className="size-3 text-cyan-500" /> {results.length > 0 && !loading ? `${results.length} results` : "live web"}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 p-6">
          {/* ---- Search bar: pill field + gradient button ---- */}
          <form
            onSubmit={(e) => { e.preventDefault(); void search(); }}
            className="group flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-1.5 transition focus-within:border-cyan-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-cyan-100"
          >
            <Search className="ml-2 size-4 shrink-0 text-slate-400 transition group-focus-within:text-cyan-500" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the web — mistral, trends, anything…"
              className="min-w-0 flex-1 bg-transparent py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />
            <kbd className="mr-1 hidden rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 sm:block">
              ↵
            </kbd>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-cyan-500/25 transition hover:brightness-110 active:scale-[0.97] disabled:opacity-40"
            >
              {loading
                ? <LoaderCircle className="size-4 animate-spin" />
                : <>Search<ArrowUpRight className="size-3.5" /></>}
            </button>
          </form>

          {/* ---- Suggestion chips (before first search) ---- */}
          {!searched && !loading && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Try</span>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => void search(s)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* ---- Error ---- */}
          {error && (
            <p className="flex items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-600">
              <CircleAlert className="size-4 shrink-0" /> {error}
            </p>
          )}

          {/* ---- Results ---- */}
          <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
            {loading && [0, 1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <div className="h-3.5 w-2/3 rounded-full bg-slate-200" />
                <div className="mt-2.5 h-2.5 w-full rounded-full bg-slate-100" />
                <div className="mt-1.5 h-2.5 w-1/2 rounded-full bg-slate-100" />
              </div>
            ))}

            {!loading && results.map((result, index) => {
              const host = hostOf(result.url);
              return (
                <a
                  key={`${result.url}-${index}`}
                  href={result.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group block rounded-2xl border border-slate-100 bg-white p-3.5 transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-[0_16px_40px_-18px_rgba(8,145,178,0.45)]"
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={faviconOf(result.url)}
                      alt=""
                      className="size-5 shrink-0 rounded-md bg-slate-100"
                      onError={(e) => { (e.target as HTMLImageElement).style.visibility = "hidden"; }}
                    />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {host ?? "web"}
                    </span>
                    <ArrowUpRight className="ml-auto size-3.5 shrink-0 text-slate-300 transition group-hover:text-cyan-500" />
                  </div>
                  <div className="mt-1.5 text-sm font-bold leading-snug text-slate-800 group-hover:text-cyan-700">
                    {result.title || result.url || "Result"}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                    {result.snippet || result.description || ""}
                  </p>
                </a>
              );
            })}

            {!loading && !error && searched && results.length === 0 && (
              <div className="grid place-items-center gap-2 py-10 text-center">
                <Search className="size-5 text-slate-300" />
                <p className="text-xs font-semibold text-slate-400">No results for “{query}”.</p>
                <p className="text-[11px] text-slate-400">Try a different or more specific query.</p>
              </div>
            )}

            {!loading && !error && !searched && (
              <div className="grid place-items-center gap-2 py-8 text-center">
                <span className="grid size-11 place-items-center rounded-2xl bg-cyan-50 text-cyan-500">
                  <Globe className="size-5" />
                </span>
                <p className="text-xs font-semibold text-slate-500">Search the web from your deck</p>
                <p className="text-[11px] text-slate-400">Results open in a new tab — nothing is added to the slide.</p>
              </div>
            )}
          </div>

          {/* ---- Footer meta ---- */}
          {searched && !loading && !error && (
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              <Timer className="size-3" />
              {tookMs != null ? `${results.length} results · ${tookMs} ms` : "done"}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
