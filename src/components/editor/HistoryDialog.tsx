import { useCallback, useEffect, useState } from "react";
import { History as HistoryIcon, Loader2, RotateCcw, Camera, X, Clock } from "lucide-react";
import { useEditor } from "@/store/editor";
import { listDesignVersions, saveDesignVersion, type DesignVersion } from "@/lib/designs";

function formatWhen(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return sameDay ? `Today ${time}` : `${d.toLocaleDateString([], { day: "numeric", month: "short" })} ${time}`;
}

export function HistoryDialog({ designId, onClose }: { designId: string | null; onClose: () => void }) {
  const [versions, setVersions] = useState<DesignVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setCanvasSize = useEditor((s) => s.setCanvasSize);
  const loadPages = useEditor((s) => s.loadPages);

  const refresh = useCallback(async () => {
    if (!designId) return;
    setLoading(true);
    setError(null);
    try {
      setVersions(await listDesignVersions(designId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load versions");
    } finally {
      setLoading(false);
    }
  }, [designId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const snapshot = async () => {
    if (!designId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { pages, canvasW, canvasH } = useEditor.getState();
      await saveDesignVersion({ designId, pages, canvas_w: canvasW, canvas_h: canvasH });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save snapshot");
    } finally {
      setBusy(false);
    }
  };

  const restore = (v: DesignVersion) => {
    setCanvasSize(v.canvas_w, v.canvas_h);
    loadPages(v.pages);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2.5 text-slate-800">
            <span className="grid size-8 place-items-center rounded-lg bg-slate-100"><HistoryIcon className="size-4" /></span>
            <div>
              <p className="font-display text-xs font-semibold uppercase tracking-wider">Version history</p>
              <p className="text-[10px] text-slate-400">Snapshots are saved automatically with each save</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="grid place-items-center py-10 text-slate-400"><Loader2 className="size-5 animate-spin" /></div>
          ) : versions.length === 0 ? (
            <div className="py-10 text-center">
              <Clock className="mx-auto size-8 text-slate-300" />
              <p className="mt-3 text-xs text-slate-500">No versions yet. Save your design to create the first snapshot.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {versions.map((v) => (
                <li key={v.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-2.5 transition-colors hover:border-blue-200 hover:bg-white">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-800">{formatWhen(v.created_at)}</span>
                    <span className="font-mono text-[10px] text-slate-400">{v.pages.length} slide{v.pages.length === 1 ? "" : "s"} · {v.canvas_w}×{v.canvas_h}</span>
                  </div>
                  <button
                    onClick={() => restore(v)}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-display text-[10px] font-semibold uppercase tracking-wider text-slate-700 shadow-sm transition-all hover:border-blue-300 hover:text-blue-700 active:scale-95"
                  >
                    <RotateCcw className="size-3.5" /> Restore
                  </button>
                </li>
              ))}
            </ul>
          )}
          {error && <p className="mt-3 text-xs text-rose-600">{error}</p>}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-5 py-3.5">
          <button
            onClick={snapshot}
            disabled={!designId || busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 font-display text-[11px] font-semibold uppercase tracking-wider text-white transition-all hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
            Save snapshot now
          </button>
        </div>
      </div>
    </div>
  );
}
