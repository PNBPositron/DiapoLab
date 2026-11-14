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
    <div className="pages-bar flex shrink-0 items-center py-2 pl-3 pr-3 text-slate-700">
      <div ref={rowRef} className="flex min-w-0 flex-1 items-center justify-center gap-2.5 overflow-x-auto py-1">
        {pages.map((p, i) => {
          const active = i === currentIndex;
          return (
            <div key={p.id} className="group relative shrink-0">
              <button
                onClick={() => setCurrentPage(i)}
                className={`relative overflow-hidden rounded-[10px] border border-slate-900 transition-all duration-200 ${
                  active
                    ? "ring-2 ring-blue-500/70 shadow-[0_4px_14px_rgba(37,99,235,0.22)] scale-[1.04]"
                    : "opacity-75 hover:opacity-100"
                }`}
                style={{ width: thumbW + 4, height: thumbH + 4 }}
              >
                <SlideThumbnail
                  page={p}
                  canvasW={canvasW}
                  canvasH={canvasH}
                  className="h-full w-full"
                />
                <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/85 px-1.5 font-mono text-[9px] font-semibold text-white shadow-sm transition-opacity ${
                  active ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                }`}>
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
          title="Add page"
          aria-label="Add page"
          className="grid shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-900/5 hover:text-slate-700"
          style={{ height: thumbH + 4, width: thumbH + 4 }}
        >
          <Plus className="h-4 w-4" strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}
