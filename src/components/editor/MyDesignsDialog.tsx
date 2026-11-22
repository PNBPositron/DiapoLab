import { useEffect, useMemo, useState } from "react";
import { X, Loader2, Trash2, Layers, FilePlus2, FolderOpen, Search } from "lucide-react";
import { listDesigns, deleteDesign, type SavedDesign } from "@/lib/designs";
import { useEditor } from "@/store/editor";
import { SlideThumbnail } from "./SlideThumbnail";
import { ensureFontsForPages } from "@/lib/fontLoader";

export function MyDesignsDialog({ onClose, embedded = false }: { onClose: () => void; embedded?: boolean }) {
  const { loadDesign } = useEditor();
  const [items, setItems] = useState<SavedDesign[] | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refresh = async () => {
    setError(null);
    try {
      const designs = await listDesigns();
      // Sort newest edits first in case the API or a fallback returns them unsorted.
      const sorted = [...designs].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      );
      // Preload every font family referenced by the saved designs so
      // thumbnails render with the correct fonts instead of fallbacks.
      sorted.forEach((d) => ensureFontsForPages(d.pages as never));
      setItems(sorted);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    if (!items) return null;
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((d) => d.name.toLowerCase().includes(q));
  }, [items, query]);

  const handleOpen = (d: SavedDesign) => {
    // Also ensure fonts before loading the design onto the canvas
    ensureFontsForPages(d.pages as never);
    loadDesign({
      id: d.id,
      name: d.name,
      pages: d.pages,
      canvasW: d.canvas_w,
      canvasH: d.canvas_h,
    });
    onClose();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This can't be undone.`)) return;
    setDeletingId(id);
    try {
      await deleteDesign(id);
      await refresh();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div
      className={
        embedded
          ? "flex min-h-full flex-col bg-white"
          : "fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/30 p-3 backdrop-blur-sm sm:p-6"
      }
      onClick={onClose}
    >
      <div
        className={
          embedded
            ? "w-full overflow-hidden bg-white"
            : "relative my-3 flex max-h-[min(860px,calc(100vh-1.5rem))] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-[0_24px_64px_-16px_rgba(15,23,42,0.18)] sm:my-6"
        }
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600">
              <FolderOpen className="size-4.5" />
            </div>
            <div>
              <h2 className="font-display text-base font-semibold tracking-tight text-slate-900">
                Projects
              </h2>
              {items && (
                <p className="mt-0.5 text-xs tabular-nums text-slate-500">
                  {items.length} saved {items.length === 1 ? "design" : "designs"} · newest edits first
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {items && items.length > 0 && !embedded && (
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/60 px-3.5 py-1.5 transition-colors focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/15">
                <Search className="size-3.5 shrink-0 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter projects…"
                  className="w-36 bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400 sm:w-48"
                />
              </div>
            )}
            {!embedded && (
              <button
                onClick={onClose}
                aria-label="Close projects"
                className="grid size-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className={embedded ? "max-h-full overflow-y-auto bg-white p-3 sm:p-4" : "flex-1 overflow-y-auto bg-white p-4 sm:p-6"}>
          {embedded && items && items.length > 0 && (
            <div className="mb-3 flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/60 px-3.5 py-1.5 transition-colors focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/15">
              <Search className="size-3.5 shrink-0 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter projects…"
                className="min-w-0 flex-1 bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400"
              />
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-600">
              {error}
            </div>
          )}

          {!items && !error && (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400">
              <Loader2 className="size-5 animate-spin text-blue-600" />
              <span className="text-xs font-medium text-slate-500">Loading your designs…</span>
            </div>
          )}

          {items && items.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400">
                <FilePlus2 className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">No saved designs yet</p>
                <p className="mt-1 text-xs text-slate-500">
                  Click Save in the editor toolbar to store your first design.
                </p>
              </div>
            </div>
          )}

          {filtered && items && items.length > 0 && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-14 text-center">
              <p className="text-sm font-semibold text-slate-700">No matching projects</p>
              <p className="text-xs text-slate-500">No saved design matches “{query}”.</p>
            </div>
          )}

          {filtered && filtered.length > 0 && (
            <div className={embedded ? "grid grid-cols-1 gap-3" : "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"}>
              {filtered.map((d) => (
                <div
                  key={d.id}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-200 hover:border-blue-400 hover:shadow-[0_12px_28px_-12px_rgba(37,99,235,0.22)]"
                >
                  <button
                    onClick={() => handleOpen(d)}
                    className="relative block w-full overflow-hidden bg-slate-50 text-left"
                  >
                    {d.pages?.[0] ? (
                      <SlideThumbnail
                        page={d.pages[0]}
                        canvasW={d.canvas_w}
                        canvasH={d.canvas_h}
                        className="aspect-[16/10] w-full bg-slate-50 object-cover"
                      />
                    ) : (
                      <div className="aspect-[16/10] w-full bg-slate-50" />
                    )}
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/25 opacity-0 backdrop-blur-[1px] transition-opacity duration-200 group-hover:opacity-100">
                      <span className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-900 shadow-sm">
                        <Layers className="size-3.5 text-blue-600" /> Open design
                      </span>
                    </div>
                  </button>
                  <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-white px-3.5 py-2.5">
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold text-slate-900" title={d.name}>
                        {d.name}
                      </div>
                      <div className="mt-0.5 text-[11px] tabular-nums text-slate-500">
                        {d.canvas_w}×{d.canvas_h} · {d.pages?.length ?? 0} page{(d.pages?.length ?? 0) === 1 ? "" : "s"}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(d.id, d.name)}
                      title="Delete design"
                      aria-label={`Delete design ${d.name}`}
                      disabled={deletingId === d.id}
                      className={`grid size-8 shrink-0 place-items-center rounded-full border transition-colors ${
                        deletingId === d.id
                          ? "border-rose-200 bg-rose-50 text-rose-500"
                          : "border-transparent text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                      }`}
                    >
                      {deletingId === d.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
