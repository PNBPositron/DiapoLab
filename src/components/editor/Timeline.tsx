import { useEffect, useRef, useState } from "react";
import { Play, Pause, SkipBack, RotateCcw } from "lucide-react";
import { useEditor } from "@/store/editor";

export function Timeline() {
  const { pages, currentIndex, setCurrentPage, setPageDuration } = useEditor();
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0); // elapsed seconds
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(0);

  const total = pages.reduce((s, p) => s + p.duration, 0);
  const offsets: number[] = [];
  pages.reduce((acc, p, i) => {
    offsets[i] = acc;
    return acc + p.duration;
  }, 0);

  // map elapsed -> page index
  const indexAt = (elapsed: number) => {
    let acc = 0;
    for (let i = 0; i < pages.length; i++) {
      acc += pages[i].duration;
      if (elapsed < acc) return i;
    }
    return pages.length - 1;
  };

  useEffect(() => {
    if (!playing) return;
    lastRef.current = performance.now();
    const tick = (now: number) => {
      const dt = (now - lastRef.current) / 1000;
      lastRef.current = now;
      setT((prev) => {
        const next = prev + dt;
        if (next >= total) {
          setPlaying(false);
          return total;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, total]);

  // sync current page to elapsed time
  useEffect(() => {
    const idx = indexAt(t);
    if (idx !== currentIndex) setCurrentPage(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  // when user clicks page in PagesBar, snap timeline cursor
  useEffect(() => {
    if (playing) return;
    setT(offsets[currentIndex] ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, pages.length]);

  const togglePlay = () => {
    if (t >= total) setT(0);
    setPlaying((p) => !p);
  };

  const onScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setT(ratio * total);
  };

  const fmt = (s: number) =>
    `${Math.floor(s).toString().padStart(2, "0")}:${Math.floor((s % 1) * 100)
      .toString()
      .padStart(2, "0")}`;

  return (
    <div className="flex items-center gap-3 border-t border-teal/30 bg-ink px-3 py-2">
      <span className="font-display text-[10px] tracking-[0.2em] text-teal/70">VIDEO</span>
      <div className="flex items-center gap-1">
        <IconBtn
          onClick={() => {
            setT(0);
            setCurrentPage(0);
          }}
          title="Restart"
        >
          <SkipBack className="h-3.5 w-3.5" strokeWidth={3} />
        </IconBtn>
        <button
          onClick={togglePlay}
          title={playing ? "Pause" : "Play"}
          className="brutal-border-2 brutal-press grid h-8 w-8 place-items-center bg-teal text-ink hover:bg-teal/90"
        >
          {playing ? (
            <Pause className="h-4 w-4 fill-ink" strokeWidth={3} />
          ) : (
            <Play className="h-4 w-4 fill-ink" strokeWidth={3} />
          )}
        </button>
        <IconBtn
          onClick={() => {
            setPlaying(false);
            setT(0);
            setCurrentPage(0);
          }}
          title="Stop"
        >
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={3} />
        </IconBtn>
      </div>

      <span className="font-mono text-[10px] text-teal/70 tabular-nums w-14 text-right">
        {fmt(t)}
      </span>

      {/* scrubber w/ segments */}
      <div className="relative flex-1 cursor-pointer select-none" onMouseDown={onScrub}>
        <div className="brutal-border-2 relative flex h-7 w-full overflow-hidden bg-surface">
          {pages.map((p, i) => (
            <div
              key={p.id}
              className={`relative flex h-full items-center justify-center border-r border-teal/30 last:border-r-0 ${
                i === currentIndex ? "bg-blue-deep" : "bg-surface"
              }`}
              style={{ width: `${(p.duration / total) * 100}%` }}
            >
              <span className="font-mono text-[9px] text-teal/80">
                {String(i + 1).padStart(2, "0")} · {p.duration.toFixed(1)}s
              </span>
            </div>
          ))}
        </div>
        {/* playhead */}
        <div
          className="pointer-events-none absolute top-0 h-7 w-[2px] bg-[#ff0080] shadow-[0_0_8px_#ff0080]"
          style={{ left: `${(t / total) * 100}%` }}
        />
      </div>

      <span className="font-mono text-[10px] text-teal/70 tabular-nums w-14">{fmt(total)}</span>

      {/* per-page duration */}
      <div className="flex items-center gap-1">
        <span className="font-mono text-[9px] text-teal/60">P{currentIndex + 1}</span>
        <input
          type="number"
          min={0.2}
          max={60}
          step={0.1}
          value={pages[currentIndex]?.duration ?? 3}
          onChange={(e) => setPageDuration(currentIndex, parseFloat(e.target.value) || 3)}
          className="brutal-border w-14 bg-surface px-2 py-0.5 font-mono text-[10px] text-teal focus:outline-none focus:border-teal"
        />
        <span className="font-mono text-[9px] text-teal/60">s</span>
      </div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="brutal-border-2 brutal-press grid h-8 w-8 place-items-center bg-surface text-teal hover:bg-surface-2"
    >
      {children}
    </button>
  );
}
