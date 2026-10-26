import { useState } from "react";
import { ExternalLink, LoaderCircle, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { PluginApp } from "@/lib/plugins";

type Result = { title?: string; url?: string; snippet?: string; description?: string };

export function SearchAppDialog({ app, open, onOpenChange }: { app: PluginApp; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const search = async () => {
    if (!query.trim() || loading) return;
    setLoading(true); setError(null);
    try {
      const response = await fetch("/api/context-search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Search failed.");
      setResults(Array.isArray(payload.results) ? payload.results : Array.isArray(payload.data) ? payload.data : []);
    } catch (e) { setError(e instanceof Error ? e.message : "Search failed."); setResults([]); }
    finally { setLoading(false); }
  };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-2xl border-slate-200 bg-white p-0 sm:rounded-3xl"><DialogHeader className="border-b border-slate-100 bg-gradient-to-r from-cyan-50 via-white to-indigo-50 px-5 py-4"><DialogTitle className="flex items-center gap-2 text-sm font-bold text-slate-800"><span className="grid size-8 place-items-center rounded-xl bg-cyan-600 text-white"><Search className="size-4" /></span>{app.name}<span className="text-[11px] font-medium text-slate-400">— Context web search</span></DialogTitle></DialogHeader><div className="space-y-3 p-5"><form onSubmit={(e) => { e.preventDefault(); void search(); }} className="flex gap-2"><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the web…" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-500" /><button disabled={loading || !query.trim()} className="grid size-10 place-items-center rounded-xl bg-cyan-600 text-white disabled:opacity-40">{loading ? <LoaderCircle className="size-4 animate-spin" /> : <Search className="size-4" />}</button></form>{error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>}<div className="max-h-[55vh] space-y-2 overflow-y-auto">{results.map((result, index) => <a key={`${result.url}-${index}`} href={result.url} target="_blank" rel="noreferrer" className="block rounded-xl border border-slate-200 p-3 transition hover:border-cyan-300 hover:bg-cyan-50/40"><div className="flex items-start gap-2"><span className="min-w-0 flex-1 text-sm font-semibold text-slate-800">{result.title || result.url || "Result"}</span><ExternalLink className="size-3.5 shrink-0 text-slate-400" /></div><p className="mt-1 text-xs leading-relaxed text-slate-500">{result.snippet || result.description || ""}</p><span className="mt-1 block truncate text-[10px] text-cyan-600">{result.url}</span></a>)}{!loading && !error && results.length === 0 && <p className="py-10 text-center text-xs text-slate-400">Search results will appear here.</p>}</div></div></DialogContent></Dialog>;
}
