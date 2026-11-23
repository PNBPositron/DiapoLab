import { useEffect, useRef, useState } from "react";
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

  const rowRef = useRef<HTMLDivElement>(null);
  const [rowWidth, setRowWidth] = useState(0);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const update = () => setRowWidth(el.clientWidth);
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Slightly larger previews by default; they shrink to fit the row instead
  // of overflowing once there are too many slides.
  const BASE_THUMB = 126;
  // Portrait formats (A4, Story…) would make the bar grow very tall if sized
  // from width alone — cap the thumbnail height so the bar stays slim. The
  // sidebar rail now runs alongside the pages bar (full workspace height),
  // so it can no longer cover the bottom Projects button.
  const MAX_THUMB_H = 84;
  const fit = Math.floor((rowWidth - 96 - 12) / Math.max(1, pages.length)) - 12;
  const size = rowWidth > 0 ? Math.max(48, Math.min(BASE_THUMB, fit)) : BASE_THUMB;
  const ratio = canvasW / canvasH;
  let thumbW: number;
  let thumbH: number;
  if (ratio >= 1) {
    thumbW = size;
    thumbH = size / ratio;
  } else {
    thumbH = Math.min(size, MAX_THUMB_H);
    thumbW = thumbH * ratio;
  }

  return (
    <div className="pages-bar flex shrink-0 items-center bg-transparent px-5 pb-3.5 pt-1 text-slate-700">
      <div ref={rowRef} className="flex min-w-0 flex-1 items-center justify-center gap-3 overflow-x-auto py-1">
        {pages.map((p, i) => {
          const active = i === currentIndex;
          return (
            <div key={p.id} className="group relative shrink-0">
              <button
                onClick={() => setCurrentPage(i)}
                className={`relative overflow-hidden rounded-[14px] bg-white transition-all duration-150 ${
                  active
                    ? "border-2 border-blue-600 ring-4 ring-blue-500/15 shadow-[0_12px_28px_-8px_rgba(37,99,235,0.34)]"
                    : "border border-slate-200/90 opacity-90 shadow-[0_8px_22px_-8px_rgba(15,23,42,0.12)] hover:-translate-y-0.5 hover:border-slate-300 hover:opacity-100"
                }`}
                style={{ width: thumbW + 2, height: thumbH + 2 }}
              >
                <SlideThumbnail
                  page={p}
                  canvasW={canvasW}
                  canvasH={canvasH}
                  className="h-full w-full"
                />
                <span className={`absolute bottom-1.5 right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 font-mono text-[10px] font-bold tabular-nums transition-opacity ${
                  active ? "bg-blue-600 text-white opacity-100 shadow-xs" : "bg-slate-900/75 text-white opacity-0 group-hover:opacity-100"
                }`}>
                  {i + 1}
                </span>
              </button>
              <div className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 gap-0.5 rounded-full border border-slate-200 bg-white/95 p-1 opacity-0 shadow-md backdrop-blur-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                {i > 0 && (
                  <button
                    onClick={() => movePage(i, i - 1)}
                    title="Move page left"
                    aria-label={`Move page ${i + 1} left`}
                    className="grid h-5 w-5 place-items-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </button>
                )}
                {i < pages.length - 1 && (
                  <button
                    onClick={() => movePage(i, i + 1)}
                    title="Move page right"
                    aria-label={`Move page ${i + 1} right`}
                    className="grid h-5 w-5 place-items-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </button>
                )}
                <button
                  onClick={() => duplicatePage(i)}
                  title="Duplicate"
                  aria-label={`Duplicate page ${i + 1}`}
                  className="grid h-5 w-5 place-items-center rounded-full text-blue-600 transition hover:bg-blue-50"
                >
                  <Copy className="h-3 w-3" />
                </button>
                {pages.length > 1 && (
                  <button
                    onClick={() => removePage(i)}
                    title="Delete"
                    aria-label={`Delete page ${i + 1}`}
                    className="grid h-5 w-5 place-items-center rounded-full text-rose-600 transition hover:bg-rose-50"
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
          title="Add page"
          aria-label="Add page"
          className="grid shrink-0 place-items-center rounded-[14px] border border-dashed border-slate-300/90 bg-white/60 text-slate-500 shadow-[0_6px_18px_-8px_rgba(15,23,42,0.10)] backdrop-blur-md transition-all hover:border-blue-400 hover:bg-white/90 hover:text-blue-600"
          style={{ height: thumbH + 2, width: Math.max(36, Math.round(thumbH * 0.72)) }}
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
