import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Camera,
  CircleAlert,
  FileText,
  Globe,
  LoaderCircle,
  Search,
  Sparkles,
  Timer,
  Type,
} from "lucide-react";
import { toPng } from "html-to-image";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { PluginApp } from "@/lib/plugins";
import { newImage, newText, useEditor } from "@/store/editor";

type Result = { title?: string; url?: string; snippet?: string; description?: string };
type Preview = { url: string; title: string; text: string; loading: boolean; error?: string };

const SUGGESTIONS = ["Mistral AI", "design trends 2027", "neobrutalism", "presentation tips"];

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
  const [preview, setPreview] = useState<Preview | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const articleRef = useRef<HTMLDivElement>(null);

  const flashNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2400);
  };

  const search = async (q?: string) => {
    const term = (q ?? query).trim();
    if (!term || loading) return;
    if (q) setQuery(q);
    setLoading(true); setError(null); setTookMs(null); setPreview(null);
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

  const openPreview = async (result: Result) => {
    if (!result.url) return;
    setSelectedText("");
    setPreview({ url: result.url, title: result.title || hostOf(result.url) || result.url, text: "", loading: true });
    try {
      const response = await fetch("/api/context-fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: result.url }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not load this page.");
      setPreview({ url: result.url, title: payload.title || result.title || result.url, text: payload.text || "", loading: false });
    } catch (e) {
      setPreview({
        url: result.url,
        title: result.title || result.url,
        text: "",
        loading: false,
        error: e instanceof Error ? e.message : "Could not load this page.",
      });
    }
  };

  const syncSelection = () => {
    const selection = window.getSelection()?.toString().trim() ?? "";
    setSelectedText(selection.length > 1 ? selection : "");
  };

  const insertSelectedText = () => {
    if (!selectedText) return;
    const { canvasW, canvasH, add } = useEditor.getState();
    const width = Math.min(760, Math.round(canvasW * 0.6));
    add(newText({
      x: Math.round((canvasW - width) / 2),
      y: Math.round((canvasH - 220) / 2),
      width,
      height: 220,
      text: selectedText,
      fontSize: 28,
      color: "#0f172a",
      fontWeight: 500,
      fontFamily: "Inter",
      align: "left",
    }));
    flashNotice("Selection added to the slide");
  };

  const capturePreview = async () => {
    const node = articleRef.current;
    if (!node || capturing) return;
    setCapturing(true);
    try {
      const dataUrl = await toPng(node, { pixelRatio: 2, backgroundColor: "#ffffff" });
      const { canvasW, canvasH, add } = useEditor.getState();
      const width = Math.min(900, Math.round(canvasW * 0.55));
      const height = Math.round(width * 0.75);
      add(newImage(dataUrl, {
        x: Math.round((canvasW - width) / 2),
        y: Math.round((canvasH - height) / 2),
        width,
        height,
      }));
      flashNotice("Capture added to the slide");
    } catch {
      flashNotice("Capture failed");
    } finally {
      setCapturing(false);
    }
  };

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-0 overflow-hidden border-slate-200/80 bg-white p-0 shadow-[0_40px_120px_-30px_rgba(8,145,178,0.35)] sm:rounded-3xl">
        {/* ---- Header ---- */}
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
            {notice && (
              <span className="ml-auto animate-in fade-in-50 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                {notice}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* ---- Preview popup ---- */}
        {preview ? (
          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-6 py-3">
              <button
                onClick={() => { setPreview(null); setSelectedText(""); }}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 transition hover:bg-slate-50"
              >
                <ArrowLeft className="size-3.5" /> Back
              </button>
              <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-800">{preview.title}</span>
              <a
                href={preview.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 transition hover:bg-slate-50"
              >
                <ArrowUpRight className="size-3.5" /> Open
              </a>
            </div>

            <div
              ref={articleRef}
              onMouseUp={syncSelection}
              onKeyUp={syncSelection}
              onTouchEnd={syncSelection}
              className="max-h-[52vh] select-text overflow-y-auto bg-white px-6 py-4"
            >
              {preview.loading ? (
                <div className="space-y-2.5 py-2">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-2.5 animate-pulse rounded-full bg-slate-100" style={{ width: `${65 + ((i * 13) % 35)}%` }} />
                  ))}
                </div>
              ) : preview.error ? (
                <p className="flex items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-600">
                  <CircleAlert className="size-4 shrink-0" /> {preview.error}
                </p>
              ) : (
                <article className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700">
                  {preview.text || "This page returned no readable text."}
                </article>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-3">
              <button
                onClick={insertSelectedText}
                disabled={!selectedText}
                title={selectedText ? "Add the selected text to the slide" : "Select some text in the preview first"}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 px-3.5 py-2 text-[11px] font-bold text-white shadow-md shadow-cyan-500/25 transition hover:brightness-110 active:scale-[0.97] disabled:opacity-40"
              >
                <Type className="size-3.5" />
                {selectedText ? "Insert selection" : "Select text to insert"}
              </button>
              <button
                onClick={capturePreview}
                disabled={preview.loading || !!preview.error || capturing}
                title="Snapshot the preview and add it to the slide as an image"
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[11px] font-bold text-slate-600 transition hover:bg-white hover:text-slate-900 disabled:opacity-40"
              >
                {capturing ? <LoaderCircle className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
                Capture → slide
              </button>
              <span className="ml-auto flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <FileText className="size-3" /> select text in the preview to insert it
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-4 p-6">
            {/* ---- Search bar ---- */}
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
                {loading ? <LoaderCircle className="size-4 animate-spin" /> : <>Search<ArrowUpRight className="size-3.5" /></>}
              </button>
            </form>

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

            {error && (
              <p className="flex items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-600">
                <CircleAlert className="size-4 shrink-0" /> {error}
              </p>
            )}

            {/* ---- Results: click opens the in-dialog preview ---- */}
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
                  <div
                    key={`${result.url}-${index}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => void openPreview(result)}
                    onKeyDown={(e) => { if (e.key === "Enter") void openPreview(result); }}
                    className="group block cursor-pointer rounded-2xl border border-slate-100 bg-white p-3.5 transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-[0_16px_40px_-18px_rgba(8,145,178,0.45)]"
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
                      <span className="ml-auto flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-cyan-500 opacity-0 transition group-hover:opacity-100">
                        Preview <ArrowUpRight className="size-3" />
                      </span>
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="Open in a new tab"
                        className="text-slate-300 transition hover:text-slate-500"
                      >
                        <ArrowUpRight className="size-3.5" />
                      </a>
                    </div>
                    <div className="mt-1.5 text-sm font-bold leading-snug text-slate-800 group-hover:text-cyan-700">
                      {result.title || result.url || "Result"}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                      {result.snippet || result.description || ""}
                    </p>
                  </div>
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
                  <p className="text-[11px] text-slate-400">
                    Click a result to read it here — then insert selected text or a capture into the slide.
                  </p>
                </div>
              )}
            </div>

            {searched && !loading && !error && (
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                <Timer className="size-3" />
                {tookMs != null ? `${results.length} results · ${tookMs} ms` : "done"}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
