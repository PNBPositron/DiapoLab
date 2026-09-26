import { useEffect, useRef, useState } from "react";
import { useEditor } from "@/store/editor";
import { CanvasElement } from "./CanvasElement";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export function PresentationMode() {
  const { presenting, setPresenting, pages, currentIndex, setCurrentPage, canvasW, canvasH } =
    useEditor();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const page = pages[currentIndex];
  const [strip, setStrip] = useState(true);
  const idleRef = useRef<number | null>(null);

  useEffect(() => {
    if (!presenting) return;
    const fit = () => {
      const el = wrapRef.current;
      if (!el) return;
      const sx = el.clientWidth / canvasW;
      const sy = el.clientHeight / canvasH;
      setScale(Math.min(sx, sy));
    };
    fit();
    const obs = new ResizeObserver(fit);
    if (wrapRef.current) obs.observe(wrapRef.current);

    // Enter native fullscreen so the slide truly fills the screen.
    const root = document.documentElement;
    if (root.requestFullscreen && !document.fullscreenElement) {
      root.requestFullscreen().catch(() => { /* user gesture missing — ignore */ });
    }
    const onFsChange = () => {
      if (!document.fullscreenElement) setPresenting(false);
    };
    document.addEventListener("fullscreenchange", onFsChange);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPresenting(false);
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        const { currentIndex: i, pages: ps, setCurrentPage: go } = useEditor.getState();
        if (i < ps.length - 1) go(i + 1);
      }
      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        const { currentIndex: i, setCurrentPage: go } = useEditor.getState();
        if (i > 0) go(i - 1);
      }
      // numeric jump 1-9
      if (/^[1-9]$/.test(e.key)) {
        const n = parseInt(e.key, 10) - 1;
        const st = useEditor.getState();
        if (n < st.pages.length) st.setCurrentPage(n);
      }
    };
    window.addEventListener("keydown", onKey);

    const onMove = () => {
      setStrip(true);
      if (idleRef.current) window.clearTimeout(idleRef.current);
      idleRef.current = window.setTimeout(() => setStrip(false), 2200);
    };
    window.addEventListener("mousemove", onMove);

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      obs.disconnect();
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("fullscreenchange", onFsChange);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => { /* noop */ });
      }
      if (idleRef.current) window.clearTimeout(idleRef.current);
      document.body.style.overflow = prev;
    };
  }, [presenting, canvasW, canvasH, setPresenting]);

  if (!presenting) return null;

  const morphing = page.transition === "morph";
  const transition = page.transition && page.transition !== "none" && !morphing
    ? `slide-transition-${page.transition}`
    : "";
  // Morph matches elements across slides so shared shapes/text tween instead of cutting.
  // Matching is exact first (same content = same object), then positional by type so the
  // Nth text/shape of the outgoing slide continues into the Nth of the incoming slide.
  const morphKeys = (() => {
    if (!morphing) return page.elements.map((el) => el.id);
    const seen: Record<string, number> = {};
    const exact = (el: (typeof page.elements)[number]): string | null => {
      if (el.type === "image") return `i:${el.src.slice(-60)}`;
      if (el.type === "text" && el.text.trim()) return `t:${el.text.trim().slice(0, 60)}`;
      return null;
    };
    const used = new Set<string>();
    return page.elements.map((el) => {
      const e = exact(el);
      if (e && !used.has(e)) {
        used.add(e);
        return e;
      }
      const n = (seen[el.type] = (seen[el.type] ?? 0) + 1);
      const key = `${el.type}#${n}`;
      used.add(key);
      return key;
    });
  })();
  const ratio = canvasW / canvasH;
  const tW = ratio >= 1 ? 96 : 96 * ratio;
  const tH = ratio >= 1 ? 96 / ratio : 96;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink scanlines">
      <div
        className={`absolute inset-x-0 top-0 z-30 flex items-center justify-between border-b border-teal/40 bg-ink/70 px-5 py-2 backdrop-blur transition-opacity ${
          strip ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-teal to-transparent" />
        <div className="font-display text-sm uppercase tracking-[0.25em] text-teal text-glow">
          ▶ presenting · <span className="font-mono text-xs text-teal/70">{canvasW}×{canvasH}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-teal/80">
            {currentIndex + 1} / {pages.length}
          </span>
          <button
            onClick={() => setPresenting(false)}
            className="brutal-border brutal-press flex items-center gap-2 bg-blue px-3 py-1.5 font-display text-xs uppercase tracking-[0.2em] text-ink"
          >
            <X className="h-4 w-4" strokeWidth={3} /> Exit · Esc
          </button>
        </div>
      </div>
      <div ref={wrapRef} className="relative flex flex-1 items-center justify-center overflow-hidden">
        <button
          onClick={() => setCurrentPage(currentIndex - 1)}
          disabled={currentIndex === 0}
          aria-label="Previous slide"
          className="brutal-border absolute left-4 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center bg-surface text-teal disabled:opacity-30"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={3} />
        </button>
        <button
          onClick={() => setCurrentPage(currentIndex + 1)}
          disabled={currentIndex === pages.length - 1}
          aria-label="Next slide"
          className="brutal-border absolute right-4 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center bg-surface text-teal disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" strokeWidth={3} />
        </button>
        <div
          style={{ width: canvasW * scale, height: canvasH * scale }}
          className="brutal-shadow-lg relative shrink-0"
        >
          <div
            key={morphing ? "slide-morph" : `slide-${currentIndex}`}
            className={`absolute left-0 top-0 overflow-hidden border border-teal ${transition}`}
            style={{
              width: canvasW,
              height: canvasH,
              backgroundColor: page.bgColor.includes("gradient(") ? "#0a0f1f" : page.bgColor,
              backgroundImage: page.bgImage
                ? `url(${page.bgImage})`
                : page.bgColor.includes("gradient(")
                  ? page.bgColor
                  : undefined,
              backgroundSize: page.bgFit ?? "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              transition: morphing ? "background-color 620ms ease" : undefined,
            }}
          >
            {page.elements.map((el, i) =>
              morphing ? (
                <div key={morphKeys[i]} className="morph-item">
                  <CanvasElement element={el} scale={scale} morph />
                </div>
              ) : (
                <CanvasElement key={el.id} element={el} scale={scale} />
              ),
            )}
          </div>
        </div>
      </div>

      {/* Jump-to-slide strip */}
      <div
        className={`pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 transition-opacity ${
          strip ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="brutal-border-2 pointer-events-auto flex max-w-[80vw] items-center gap-1.5 overflow-x-auto bg-ink/85 p-2 backdrop-blur">
          {pages.map((p, i) => {
            const active = i === currentIndex;
            return (
              <button
                key={p.id}
                onClick={() => setCurrentPage(i)}
                title={`Go to slide ${i + 1}`}
                className={`brutal-border-2 relative shrink-0 overflow-hidden transition-all ${
                  active ? "border-teal glow-teal" : "border-teal/30 hover:border-teal"
                }`}
                style={{
                  width: tW,
                  height: tH,
                  background: p.bgColor.includes("gradient(") ? "#0a0f1f" : p.bgColor,
                  backgroundImage: p.bgImage
                    ? `url(${p.bgImage})`
                    : p.bgColor.includes("gradient(")
                      ? p.bgColor
                      : undefined,
                  backgroundSize: p.bgFit ?? "cover",
                  backgroundPosition: "center",
                }}
              >
                <span className="absolute bottom-0.5 left-1 font-mono text-[9px] text-ink mix-blend-difference">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
