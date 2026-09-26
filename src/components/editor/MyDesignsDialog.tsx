import { useEffect, useState } from "react";
import { X, Loader2, Trash2, Layers, FilePlus2, HardDriveDownload } from "lucide-react";
import { listDesigns, deleteDesign, type SavedDesign } from "@/lib/designs";
import { useEditor } from "@/store/editor";
import { SlideThumbnail } from "./SlideThumbnail";

export function MyDesignsDialog({ onClose, embedded = false }: { onClose: () => void; embedded?: boolean }) {
  const { loadDesign } = useEditor();
  const [items, setItems] = useState<SavedDesign[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refresh = async () => {
    setError(null);
    try {
      setItems(await listDesigns());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleOpen = (d: SavedDesign) => {
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
          ? "flex min-h-full flex-col bg-paper"
          : "fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md sm:p-6 animate-in fade-in duration-300"
      }
      onClick={onClose}
    >
      <div
        className={
          embedded
            ? "w-full overflow-hidden bg-surface"
            : "relative flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-slate-900/70 shadow-[0_40px_120px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.18)] backdrop-blur-3xl backdrop-saturate-150 animate-in fade-in zoom-in-95 duration-300"
        }
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow décoratif */}
        {!embedded && (
          <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-2/3 -translate-x-1/2 rounded-full bg-sky-500/20 blur-3xl" />
        )}

        {/* Header */}
        <div className="relative flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-500/15 text-sky-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]">
              <HardDriveDownload className="size-4" />
            </div>
            <div>
              <h2 className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-white">
                My Designs
              </h2>
              {items && (
                <p className="mt-0.5 font-mono text-[10px] text-white/40">
                  {items.length} saved {items.length === 1 ? "design" : "designs"} · stored locally
                </p>
              )}
            </div>
          </div>
          {!embedded && (
            <button
              onClick={onClose}
              aria-label="Close my designs"
              className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition-all hover:border-white/25 hover:bg-white/15 hover:text-white active:scale-95"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Contenu */}
        <div className={embedded ? "max-h-full overflow-y-auto p-3" : "flex-1 overflow-y-auto p-5 sm:p-6"}>
          {error && (
            <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 font-mono text-xs text-rose-300">
              ! {error}
            </div>
          )}
          {!items && !error && (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400">
              <div className="relative">
                <Loader2 className="size-6 animate-spin text-sky-400" />
                <div className="absolute inset-0 animate-ping rounded-full bg-sky-500/20" />
              </div>
              <span className="font-mono text-xs tracking-wider text-slate-400">Loading your designs…</span>
            </div>
          )}
          {items && items.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-400">
                <FilePlus2 className="size-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-300">No saved designs yet</p>
                <p className="mt-1 font-mono text-[11px] text-slate-500">
                  &gt; hit SAVE in the editor to store your first design
                </p>
              </div>
            </div>
          )}
          {items && items.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((d) => (
                <div
                  key={d.id}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-all duration-300 hover:-translate-y-1 hover:border-sky-400/50 hover:bg-white/[0.06] hover:shadow-[0_16px_40px_rgba(0,0,0,0.5),0_0_24px_rgba(56,189,248,0.15)]"
                >
                  <button
                    onClick={() => handleOpen(d)}
                    className="relative block w-full text-left"
                  >
                    {d.pages?.[0] ? (
                      <SlideThumbnail
                        page={d.pages[0]}
                        canvasW={d.canvas_w}
                        canvasH={d.canvas_h}
                        className="aspect-[16/10] w-full bg-ink object-cover"
                      />
                    ) : (
                      <div className="aspect-video w-full bg-ink" />
                    )}
                    {/* Voile + hint au hover */}
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/60 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100">
                      <span className="flex items-center gap-1.5 rounded-lg border border-sky-400/40 bg-sky-500/20 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-sky-200 shadow-[0_0_16px_rgba(56,189,248,0.35)]">
                        <Layers className="size-3.5" /> Open design
                      </span>
                    </div>
                  </button>
                  <div className="flex items-center justify-between gap-2 border-t border-white/10 bg-slate-950/40 px-3 py-2.5 backdrop-blur-md">
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold text-slate-100" title={d.name}>
                        {d.name}
                      </div>
                      <div className="font-mono text-[9px] text-slate-500">
                        {d.canvas_w}×{d.canvas_h} · {d.pages?.length ?? 0}p
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(d.id, d.name)}
                      title="Delete"
                      aria-label={`Delete design ${d.name}`}
                      disabled={deletingId === d.id}
                      className={`flex size-7 shrink-0 items-center justify-center rounded-lg border transition-all active:scale-90 ${
                        deletingId === d.id
                          ? "border-rose-400/50 bg-rose-500/30 text-rose-200"
                          : "border-transparent text-slate-500 hover:border-rose-500/40 hover:bg-rose-500/20 hover:text-rose-300"
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
