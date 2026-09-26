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
          ? "flex min-h-full flex-col bg-slate-50"
          : "fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/30 p-3 backdrop-blur-sm sm:p-6"
      }
      onClick={onClose}
    >
      <div
        className={
          embedded
            ? "w-full overflow-hidden bg-white"
            : "relative my-3 flex max-h-[min(860px,calc(100vh-1.5rem))] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-slate-50/95 text-slate-800 shadow-[0_24px_80px_rgba(15,23,42,0.18)] sm:my-6"
        }
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-4 backdrop-blur-sm sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600 shadow-[0_1px_4px_rgba(15,23,42,0.04)]">
              <HardDriveDownload className="size-4.5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold uppercase tracking-[0.16em] text-slate-800">
                My Designs
              </h2>
              {items && (
                <p className="mt-0.5 text-sm text-slate-500">
                  {items.length} saved {items.length === 1 ? "design" : "designs"} · stored on this device
                </p>
              )}
            </div>
          </div>
          {!embedded && (
            <button
              onClick={onClose}
              aria-label="Close my designs"
              className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-800"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Contenu */}
        <div className={embedded ? "max-h-full overflow-y-auto p-3 sm:p-4" : "flex-1 overflow-y-auto p-4 sm:p-6"}>
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600">
              {error}
            </div>
          )}
          {!items && !error && (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400">
              <Loader2 className="size-6 animate-spin text-blue-500" />
              <span className="text-sm">Loading your designs…</span>
            </div>
          )}
          {items && items.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400 shadow-[0_1px_4px_rgba(15,23,42,0.04)]">
                <FilePlus2 className="size-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">No saved designs yet</p>
                <p className="mt-1 text-sm text-slate-400">
                  Hit SAVE in the editor to store your first design.
                </p>
              </div>
            </div>
          )}
          {items && items.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((d) => (
                <div
                  key={d.id}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_4px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-[0_12px_32px_rgba(37,99,235,0.12)]"
                >
                  <button
                    onClick={() => handleOpen(d)}
                    className="relative block w-full overflow-hidden text-left"
                  >
                    {d.pages?.[0] ? (
                      <SlideThumbnail
                        page={d.pages[0]}
                        canvasW={d.canvas_w}
                        canvasH={d.canvas_h}
                        className="aspect-[16/10] w-full bg-slate-100 object-cover"
                      />
                    ) : (
                      <div className="aspect-video w-full bg-slate-100" />
                    )}
                    {/* Voile bleu au hover */}
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/40 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100">
                      <span className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white shadow-lg">
                        <Layers className="size-3.5" /> Open design
                      </span>
                    </div>
                  </button>
                  <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-3 py-2.5">
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold text-slate-800" title={d.name}>
                        {d.name}
                      </div>
                      <div className="mt-0.5 text-[10px] text-slate-400">
                        {d.canvas_w}×{d.canvas_h} · {d.pages?.length ?? 0} page{(d.pages?.length ?? 0) === 1 ? "" : "s"}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(d.id, d.name)}
                      title="Delete"
                      aria-label={`Delete design ${d.name}`}
                      disabled={deletingId === d.id}
                      className={`grid size-7 shrink-0 place-items-center rounded-lg border transition-all ${
                        deletingId === d.id
                          ? "border-red-200 bg-red-50 text-red-500"
                          : "border-transparent text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500"
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
