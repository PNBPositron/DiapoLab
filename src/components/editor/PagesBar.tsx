import { useEditor } from "@/store/editor";
import { Plus, Copy, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { SlideThumbnail } from "./SlideThumbnail";

export function PagesBar() {
  const {
    pages,
    currentIndex,
    setCurrentPage,
    addPage,
    duplicatePage,
    removePage,
    movePage,
    canvasW,
    canvasH,
  } = useEditor();

  const ratio = canvasW / canvasH;
  const thumbW = ratio >= 1 ? 116 : 116 * ratio;
  const thumbH = ratio >= 1 ? 116 / ratio : 116 * ratio;

  return (
    <div className="pages-bar flex shrink-0 flex-col border-t border-slate-200/70 bg-white/70 px-3 pt-2 pb-1 text-slate-700 shadow-[0_-1px_2px_rgba(15,23,42,0.03)] backdrop-blur-md">
      <div className="flex min-w-0 flex-1 items-center justify-center gap-3 overflow-x-auto py-1">
        {pages.map((p, i) => {
          const active = i === currentIndex;
          return (
            <div key={p.id} className="group relative shrink-0">
              <button
                onClick={() => setCurrentPage(i)}
                className={`relative overflow-hidden rounded-xl border bg-white/60 backdrop-blur-[1px] transition-all duration-200 ${
                  active
                    ? "border-blue-500 ring-2 ring-blue-500/20 shadow-[0_2px_10px_rgba(37,99,235,0.22)]"
                    : "border-slate-200/80 hover:border-blue-300 hover:shadow-[0_1px_4px_rgba(15,23,42,0.08)]"
                }`}
                style={{ width: thumbW + 4, height: thumbH + 4 }}
              >
                <SlideThumbnail
                  page={p}
                  canvasW={canvasW}
                  canvasH={canvasH}
                  className="h-full w-full"
                />
                <span className="absolute bottom-1 left-1 rounded bg-white/80 px-1 font-mono text-[9px] text-slate-700">
                  {i + 1}
                </span>
              </button>
              <div className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 gap-1 rounded-full bg-slate-900/85 p-1 opacity-0 shadow-[0_8px_20px_rgba(15,23,42,0.25)] backdrop-blur-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                {i > 0 && (
                  <button
                    onClick={() => movePage(i, i - 1)}
                    title="Move page left"
                    aria-label={`Move page ${i + 1} left`}
                    className="grid h-5 w-5 place-items-center rounded-full bg-slate-700 text-white"
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </button>
                )}
                {i < pages.length - 1 && (
                  <button
                    onClick={() => movePage(i, i + 1)}
                    title="Move page right"
                    aria-label={`Move page ${i + 1} right`}
                    className="grid h-5 w-5 place-items-center rounded-full bg-slate-700 text-white"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </button>
                )}
                <button
                  onClick={() => duplicatePage(i)}
                  title="Duplicate"
                  aria-label={`Duplicate page ${i + 1}`}
                  className="grid h-5 w-5 place-items-center rounded-full bg-blue-600 text-white"
                >
                  <Copy className="h-3 w-3" />
                </button>
                {pages.length > 1 && (
                  <button
                    onClick={() => removePage(i)}
                    title="Delete"
                    aria-label={`Delete page ${i + 1}`}
                    className="grid h-5 w-5 place-items-center rounded-full bg-rose-500 text-white"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <button
          onClick={addPage}
          className="flex shrink-0 items-center gap-2 rounded-xl border border-dashed border-slate-300/90 bg-white/40 px-4 text-[10px] font-medium tracking-[0.12em] text-slate-600 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
          style={{ height: thumbH + 4 }}
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>
      <div className="flex shrink-0 items-center justify-center pt-0.5">
        <span className="text-[10px] text-slate-400">
          {currentIndex + 1} / {pages.length}
        </span>
      </div>
    </div>
  );
}
