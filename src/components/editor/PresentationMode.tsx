import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEditor } from "@/store/editor";
import { CanvasElement } from "./CanvasElement";

/**
 * TRUE MORPH (FLIP technique)
 * --------------------------
 * 1. BEFORE changing slide: record each morph-able element's bounding rect,
 *    indexed by its morph key (same matching logic as before).
 * 2. AFTER the new slide renders: for every element that has a recorded
 *    counterpart, apply an inverted transform (position/size delta), force
 *    a reflow, then transition the transform to none. Elements without a
 *    counterpart fade+scale in (new) or out (removed).
 * This produces real geometric tweening — size AND position — like
 * PowerPoint's Morph, for matching shapes/text/images.
 */

/** Compute stable morph keys for a page's elements:
 *  exact match first (image src / text content), then per-type index. */
function computeMorphKeys(elements: readonly any[]): string[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seen: Record<string, number> = {};
  const used = new Set<string>();
  return elements.map((el) => {
    const e =
      el.type === "image"
        ? `i:${el.src.slice(-60)}`
        : el.type === "text" && el.text.trim()
          ? `t:${el.text.trim().slice(0, 60)}`
          : null;
    if (e && !used.has(e)) {
      used.add(e);
      return e;
    }
    const n = (seen[el.type] = (seen[el.type] ?? 0) + 1);
    const key = `${el.type}#${n}`;
    used.add(key);
    return key;
  });
}

export function PresentationMode() {
  const { presenting, setPresenting, pages, currentIndex, setCurrentPage, canvasW, canvasH } =
    useEditor();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [strip, setStrip] = useState(false);
  const idleRef = useRef<number | null>(null);
  const prevPositionsRef = useRef<Map<string, { x: number; y: number; w: number; h: number }>>(
    new Map(),
  );
  const slideRef = useRef<HTMLDivElement>(null);

  const page = pages[currentIndex];

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
      root.requestFullscreen().catch(() => {
        /* user gesture missing — ignore */
      });
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
        document.exitFullscreen().catch(() => {
          /* noop */
        });
      }
      if (idleRef.current) window.clearTimeout(idleRef.current);
      document.body.style.overflow = prev;
    };
  }, [presenting, canvasW, canvasH, setPresenting]);

  // Intercept page changes to snapshot element rects BEFORE React swaps the DOM.
  const snapshotOutgoing = () => {
    const p = pages[currentIndex];
    if (!p || p.transition !== "morph") return;
    const container = slideRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();
    const map = new Map<string, { x: number; y: number; w: number; h: number }>();
    const nodes = container.querySelectorAll<HTMLElement>("[data-morph-key]");
    nodes.forEach((node) => {
      const key = node.dataset.morphKey!;
      const r = node.getBoundingClientRect();
      map.set(key, {
        x: (r.left - cRect.left) / scale,
        y: (r.top - cRect.top) / scale,
        w: r.width / scale,
        h: r.height / scale,
      });
    });
    prevPositionsRef.current = map;
  };

  const goTo = (n: number) => {
    snapshotOutgoing();
    setCurrentPage(n);
  };

  if (!presenting) return null;

  const morphing = page.transition === "morph";
  const transition =
    page.transition &&
    page.transition !== "none" &&
    !morphing &&
    page.transition !== "zoom"
      ? `slide-transition-${page.transition}`
      : "";

  const ratio = canvasW / canvasH;
  const tW = ratio >= 1 ? 96 : 96 * ratio;
  const tH = ratio >= 1 ? 96 / ratio : 96;

  const morphKeys = morphing ? computeMorphKeys(page.elements) : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink scanlines">
      {/* Discreet exit — appears with the strip, Échap also exits */}
      <button
        onClick={() => setPresenting(false)}
        aria-label="Exit presentation"
        className={`absolute right-4 top-4 z-30 grid h-10 w-10 place-items-center rounded-full bg-ink/70 text-teal/80 backdrop-blur transition-all hover:bg-ink hover:text-teal ${
          strip ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <X className="h-4.5 w-4.5" strokeWidth={2.5} />
      </button>

      <div ref={wrapRef} className="relative flex flex-1 items-center justify-center overflow-hidden">
        <button
          onClick={() => goTo(currentIndex - 1)}
          disabled={currentIndex === 0}
          aria-label="Previous slide"
          className="brutal-border absolute left-4 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center bg-surface text-teal disabled:opacity-30"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={3} />
        </button>
        <button
          onClick={() => goTo(currentIndex + 1)}
          disabled={currentIndex === pages.length - 1}
          aria-label="Next slide"
          className="brutal-border absolute right-4 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center bg-surface text-teal disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" strokeWidth={3} />
        </button>

        <div
          key={`frame-${currentIndex}`}
          className={`brutal-shadow-lg relative shrink-0 ${
            page.transition === "zoom" ? "slide-transition-zoom" : ""
          }`}
          style={
            {
              width: canvasW * scale,
              height: canvasH * scale,
              "--zoom-start": page.transitionZoom ?? 0.5,
            } as React.CSSProperties
          }
        >
          <div
            ref={slideRef}
            key={morphing ? "slide-morph" : `slide-${currentIndex}`}
            className={`absolute left-0 top-0 overflow-hidden border border-teal ${transition}`}
            style={
              {
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
                // Non-zoom transitions replace this transform during animation.
                "--fit": scale,
              } as React.CSSProperties
            }
          >
            {page.elements.map((el, i) => {
              if (!morphing) return <CanvasElement key={el.id} element={el} scale={scale} />;
              const mk = morphKeys![i];
              return (
                <MorphItem key={mk} morphKey={mk} prevPositions={prevPositionsRef} scale={scale}>
                  <CanvasElement element={el} scale={scale} morph />
                </MorphItem>
              );
            })}
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
          {pages.map((p, i) => (
            <button
              key={p.id}
              onClick={() => goTo(i)}
              title={`Go to slide ${i + 1}`}
              className={`brutal-border-2 relative shrink-0 overflow-hidden transition-all ${
                i === currentIndex ? "border-teal glow-teal" : "border-teal/30 hover:border-teal"
              }`}
              style={{
                width: tW,
                height: tH,
                background: p.bgColor.includes("gradient(") ? "#0aa0f1f" : p.bgColor,
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
          ))}
        </div>
      </div>
    </div>
  );
}

/** FLIP wrapper: reads the recorded source rect, inverts the delta,
 *  then transitions to identity. New elements fade in. */
function MorphItem({
  morphKey,
  prevPositions,
  scale,
  children,
}: {
  morphKey: string;
  prevPositions: React.RefObject<Map<string, { x: number; y: number; w: number; h: number }>>;
  scale: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    const prev = prevPositions.current?.get(morphKey);
    if (!node) return;
    if (prev) {
      // FLIP: move from previous rect to the new natural position.
      const parent = node.offsetParent as HTMLElement | null;
      if (!parent) return;
      const cRect = parent.getBoundingClientRect();
      const r = node.getBoundingClientRect();
      const dx = prev.x - (r.left - cRect.left) / scale;
      const dy = prev.y - (r.top - cRect.top) / scale;
      const sw = prev.w / (r.width / scale || 1);
      const sh = prev.h / (r.height / scale || 1);
      node.style.transition = "none";
      node.style.transformOrigin = "top left";
      node.style.transform = `translate(${dx * scale}px, ${dy * scale}px) scale(${sw}, ${sh})`;
      node.style.opacity = "1";
      // Force reflow then animate to identity.
      void node.offsetWidth;
      node.style.transition =
        "transform 620ms cubic-bezier(0.22, 1, 0.36, 1), opacity 620ms ease";
      node.style.transform = "none";
    } else {
      // No counterpart — fade/scale in like a new element.
      node.style.transformOrigin = "center";
      node.style.transition = "none";
      node.style.transform = "scale(0.6)";
      node.style.opacity = "0";
      void node.offsetWidth;
      requestAnimationFrame(() => {
        node.style.transition =
          "transform 620ms cubic-bezier(0.22, 1, 0.36, 1), opacity 620ms ease";
        node.style.transform = "none";
        node.style.opacity = "1";
      });
    }
  }, [morphKey, scale, prevPositions]);

  return (
    <div
      ref={ref}
      data-morph-key={morphKey}
      style={{ position: "absolute", willChange: "transform, opacity" }}
    >
      {children}
    </div>
  );
}
