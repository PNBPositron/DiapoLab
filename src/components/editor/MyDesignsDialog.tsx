import { useEffect, useState } from "react";
import { X, Loader2, Trash2 } from "lucide-react";
import { listDesigns, deleteDesign, type SavedDesign } from "@/lib/designs";
import { useEditor } from "@/store/editor";
import { SlideThumbnail } from "./SlideThumbnail";

export function MyDesignsDialog({ onClose, embedded = false }: { onClose: () => void; embedded?: boolean }) {
  const { loadDesign } = useEditor();
  const [items, setItems] = useState<SavedDesign[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this design? This can't be undone.")) return;
    await deleteDesign(id);
    refresh();
  };

  return (
    <div
      className={embedded ? "flex min-h-full flex-col bg-paper" : "fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-6 scanlines"}
      onClick={onClose}
    >
      <div
        className={embedded ? "w-full overflow-hidden bg-surface" : "brutal-border-2 brutal-shadow-lg relative max-h-[80vh] w-full max-w-3xl overflow-hidden bg-surface"}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-teal/30 bg-ink px-4 py-3">
          <h2 className="font-display text-sm uppercase tracking-[0.25em] text-teal text-glow">
            // my_designs
          </h2>
          {!embedded && <button
            onClick={onClose}
            aria-label="Close my designs"
            className="brutal-border grid h-8 w-8 place-items-center bg-surface text-teal"
          >
            <X className="h-4 w-4" strokeWidth={3} />
          </button>}
        </div>

        <div className={embedded ? "max-h-full overflow-y-auto p-2" : "max-h-[70vh] overflow-y-auto p-4"}>
          {error && <p className="font-mono text-[11px] text-[#ff0080]">! {error}</p>}
          {!items && !error && (
            <div className="flex items-center justify-center gap-2 py-12 font-mono text-xs text-teal/60">
              <Loader2 className="h-4 w-4 animate-spin" /> loading…
            </div>
          )}
          {items && items.length === 0 && (
            <div className="py-12 text-center font-mono text-xs text-teal/60">
              &gt; no saved designs yet · hit SAVE to upload your first
            </div>
          )}
          {items && items.length > 0 && (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {items.map((d) => (
                <div key={d.id} className="brutal-border-2 group relative overflow-hidden bg-ink">
                  <button
                    onClick={() => handleOpen(d)}
                    className="block w-full text-left"
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
                    <div className="border-t border-teal/30 px-2 py-1.5">
                      <div className="truncate font-display text-[11px] tracking-[0.15em] text-teal">
                        {d.name}
                      </div>
                      <div className="font-mono text-[9px] text-teal/50">
                        {d.canvas_w}×{d.canvas_h} · {d.pages?.length ?? 0}p
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleDelete(d.id)}
                    title="Delete"
                    aria-label={`Delete design ${d.name}`}
                    className="absolute right-1 top-1 grid h-6 w-6 place-items-center bg-[#ff0080] text-ink opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" strokeWidth={3} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
