import { useEditor, type SlideTransition } from "@/store/editor";
import { Plus, Copy, Trash2, Play, ChevronLeft, ChevronRight } from "lucide-react";
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
    setTransition,
    setPresenting,
  } = useEditor();
  const currentTransition: SlideTransition = pages[currentIndex]?.transition ?? "none";
  const ratio = canvasW / canvasH;
  const thumbW = ratio >= 1 ? 138 : 138 * ratio;
  const thumbH = ratio >= 1 ? 138 / ratio : 138;

  return (
    <div className="flex h-[116px] shrink-0 items-center gap-4 border-t border-slate-200 bg-white px-5 py-3 text-slate-700 shadow-[0_-2px_10px_rgba(15,23,42,0.06)]">
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Pages</span>
      <div className="flex min-w-0 flex-1 items-center gap-4 overflow-x-auto py-1">
        {pages.map((p, i) => {
          const active = i === currentIndex;
          return (
            <div key={p.id} className="group relative shrink-0">
              <button
                onClick={() => setCurrentPage(i)}
                className={`relative overflow-hidden rounded-xl border bg-white transition-all duration-200 ${
                  active
                    ? "border-slate-500 shadow-[0_2px_7px_rgba(15,23,42,0.2)]"
                    : "border-slate-200 hover:border-slate-400 hover:shadow-[0_2px_6px_rgba(15,23,42,0.12)]"
                }`}
                style={{ width: thumbW + 4, height: thumbH + 4 }}
              >
                <SlideThumbnail page={p} canvasW={canvasW} canvasH={canvasH} className="h-full w-full" />
                <span className="absolute bottom-1 left-1 rounded bg-white/85 px-1 font-mono text-[10px] text-slate-700">{i + 1}</span>
              </button>
              <div className="absolute -right-1 -top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                {i > 0 && <button onClick={() => movePage(i, i - 1)} title="Move page left" aria-label={`Move page ${i + 1} left`} className="grid h-5 w-5 place-items-center rounded-full bg-slate-700 text-white"><ChevronLeft className="h-3 w-3" /></button>}
                {i < pages.length - 1 && <button onClick={() => movePage(i, i + 1)} title="Move page right" aria-label={`Move page ${i + 1} right`} className="grid h-5 w-5 place-items-center rounded-full bg-slate-700 text-white"><ChevronRight className="h-3 w-3" /></button>}
                <button onClick={() => duplicatePage(i)} title="Duplicate" aria-label={`Duplicate page ${i + 1}`} className="grid h-5 w-5 place-items-center rounded-full bg-blue-600 text-white"><Copy className="h-3 w-3" /></button>
                {pages.length > 1 && <button onClick={() => removePage(i)} title="Delete" aria-label={`Delete page ${i + 1}`} className="grid h-5 w-5 place-items-center rounded-full bg-rose-500 text-white"><Trash2 className="h-3 w-3" /></button>}
              </div>
            </div>
          );
        })}
        <button onClick={addPage} className="flex shrink-0 items-center gap-2 rounded-xl border border-dashed border-slate-300 px-5 font-medium text-slate-600 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600" style={{ height: thumbH + 4 }}>
          <Plus className="h-4 w-4" /> Add page
        </button>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Transition</span>
        <select value={currentTransition} onChange={(e) => setTransition(e.target.value as SlideTransition)} className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-blue-400 focus:outline-none">
          <option value="none">None</option>
          <option value="fade">Fade</option>
          <option value="morph">Morph</option>
        </select>
        <span className="text-xs text-slate-400">{currentIndex + 1} / {pages.length}</span>
        <button onClick={() => setPresenting(true)} className="flex shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700">
          <Play className="h-4 w-4 fill-white" /> Present
        </button>
      </div>
    </div>
  );
}
