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
  const thumbW = ratio >= 1 ? 96 : 96 * ratio;
  const thumbH = ratio >= 1 ? 96 / ratio : 96;

  return (
    <div className="flex items-center gap-2 border-t border-teal/30 bg-ink px-3 py-2">
      <span className="font-display text-[10px] tracking-[0.2em] text-teal/70">PAGES</span>
      <div className="flex flex-1 items-center gap-2 overflow-x-auto py-1">
        {pages.map((p, i) => {
          const active = i === currentIndex;
          return (
            <div key={p.id} className="group relative shrink-0">
              <button
                onClick={() => setCurrentPage(i)}
                className={`brutal-border-2 relative overflow-hidden transition-all ${
                  active ? "border-teal glow-teal" : "border-teal/30 hover:border-teal/70"
                }`}
                style={{ width: thumbW + 6, height: thumbH + 6 }}
              >
                <SlideThumbnail
                  page={p}
                  canvasW={canvasW}
                  canvasH={canvasH}
                  className="h-full w-full"
                />
                <span className="absolute bottom-0.5 left-1 font-mono text-[9px] text-ink mix-blend-difference">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </button>
              <div className="absolute -right-1 -top-1 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                {i > 0 && (
                  <button
                    onClick={() => movePage(i, i - 1)}
                    title="Move page left"
                    aria-label={`Move page ${i + 1} left`}
                    className="grid h-5 w-5 place-items-center bg-teal text-ink"
                  >
                    <ChevronLeft className="h-3 w-3" strokeWidth={3} />
                  </button>
                )}
                {i < pages.length - 1 && (
                  <button
                    onClick={() => movePage(i, i + 1)}
                    title="Move page right"
                    aria-label={`Move page ${i + 1} right`}
                    className="grid h-5 w-5 place-items-center bg-teal text-ink"
                  >
                    <ChevronRight className="h-3 w-3" strokeWidth={3} />
                  </button>
                )}
                <button
                  onClick={() => duplicatePage(i)}
                  title="Duplicate"
                  aria-label={`Duplicate page ${i + 1}`}
                  className="grid h-5 w-5 place-items-center bg-blue text-ink"
                >
                  <Copy className="h-3 w-3" strokeWidth={3} />
                </button>
                {pages.length > 1 && (
                  <button
                    onClick={() => removePage(i)}
                    title="Delete"
                    aria-label={`Delete page ${i + 1}`}
                    className="grid h-5 w-5 place-items-center bg-[#ff0080] text-ink"
                  >
                    <Trash2 className="h-3 w-3" strokeWidth={3} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <button
          onClick={addPage}
          className="brutal-border-2 brutal-press flex shrink-0 items-center gap-1 bg-surface px-3 font-display text-[10px] tracking-[0.2em] text-teal hover:bg-surface-2"
          style={{ height: thumbH + 6 }}
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={3} /> ADD
        </button>
      </div>
      <div className="flex items-center gap-1">
        <span className="font-mono text-[10px] text-teal/60">TRANS</span>
        <select
          value={currentTransition}
          onChange={(e) => setTransition(e.target.value as SlideTransition)}
          className="border border-teal/40 bg-surface px-1.5 py-1 font-mono text-[10px] text-teal focus:border-teal focus:outline-none"
        >
          <option value="none">none</option>
          <option value="fade">fade</option>
          <option value="slide">slide</option>
          <option value="zoom">zoom</option>
          <option value="flip">flip</option>
          <option value="glitch">glitch</option>
          <option value="morph">morph</option>
        </select>
      </div>
      <span className="font-mono text-[10px] text-teal/60">
        {currentIndex + 1}/{pages.length}
      </span>
      <button
        onClick={() => setPresenting(true)}
        className="brutal-border brutal-press flex shrink-0 items-center gap-2 bg-blue px-4 py-2 font-display text-xs tracking-[0.2em] text-ink"
      >
        <Play className="h-3.5 w-3.5 fill-ink" strokeWidth={3} />
        PRESENT
      </button>
    </div>
  );
}
