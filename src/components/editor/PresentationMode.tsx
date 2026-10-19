import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useEditor } from "@/store/editor";
import { CanvasElement } from "./CanvasElement";

import { matchMorphElements, type MorphGeometry } from "@/lib/morph";
import type { AnyElement } from "@/store/editor";

export function PresentationMode() {
  const { presenting, setPresenting, pages, currentIndex, setCurrentPage, canvasW, canvasH } =
    useEditor();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  // key -> geometry of the element on the OUTGOING slide
  const prevGeomRef = useRef<Map<string, MorphGeometry>>(new Map());

  const page = pages[currentIndex];

  useEffect(() => useEditor.subscribe((next, previous) => {
    if (!next.presenting || !previous.presenting) {
      prevGeomRef.current = new Map();
      return;
    }
    if (next.currentIndex === previous.currentIndex) return;
    const outgoing = previous.pages[previous.currentIndex];
    const incoming = next.pages[next.currentIndex];
    prevGeomRef.current = outgoing && incoming?.transition === "morph"
      ? matchMorphElements(outgoing.elements, incoming.elements)
      : new Map();
  }), []);

  useEffect(() => {
    if (!presenting) return;
    const fit = () => {
      const el = wrapRef.current;
      if (!el) return;
      setScale(Math.min(el.clientWidth / canvasW, el.clientHeight / canvasH));
    };
    fit();
    const obs = new ResizeObserver(fit);
    if (wrapRef.current) obs.observe(wrapRef.current);

    const root = document.documentElement;
    if (root.requestFullscreen && !document.fullscreenElement) {
      root.requestFullscreen().catch(() => {});
    }
    const onFsChange = () => {
      if (!document.fullscreenElement) setPresenting(false);
    };
    document.addEventListener("fullscreenchange", onFsChange);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPresenting(false);
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        const { currentIndex: i, pages: ps } = useEditor.getState();
        if (i < ps.length - 1) setCurrentPage(i + 1);
      }
      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        const { currentIndex: i } = useEditor.getState();
        if (i > 0) setCurrentPage(i - 1);
      }
      if (/^[1-9]$/.test(e.key)) {
        const n = parseInt(e.key, 10) - 1;
        if (n < useEditor.getState().pages.length) setCurrentPage(n);
      }
    };
    window.addEventListener("keydown", onKey);

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      obs.disconnect();
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFsChange);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presenting, canvasW, canvasH]);

  if (!presenting || !page) return null;

  const morphing = page.transition === "morph";
  const motionTransitionNames = new Set(["tv", "neon", "cube"]);
  const transition =
    page.transition &&
    page.transition !== "none" &&
    !morphing &&
    page.transition !== "zoom" &&
    !motionTransitionNames.has(page.transition)
      ? `slide-transition-${page.transition}`
      : "";
  const preset = transitionPreset(page.transition);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-ink scanlines">
      <div ref={wrapRef} className="relative flex h-full w-full items-center justify-center">
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
            className="absolute left-0 top-0 overflow-hidden border border-teal"
            style={{ width: canvasW, height: canvasH, transform: `scale(${scale})`, transformOrigin: "top left" }}
          >
            <AnimatePresence initial={false} mode="sync">
              <motion.div
                key={`slide-${currentIndex}`}
                initial={preset.initial}
                animate={preset.animate}
                transition={preset.transition}
                onClick={() => currentIndex < pages.length - 1 && setCurrentPage(currentIndex + 1)}
                className={`absolute left-0 top-0 h-full w-full cursor-pointer overflow-hidden ${transition}`}
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
                    "--fit": scale,
                    transformStyle: "preserve-3d",
                    perspective: page.transition === "cube" ? 1200 : undefined,
                    transition: morphing ? "background-color 620ms ease" : undefined,
                  } as React.CSSProperties
                }
              >
                {page.elements.map((el) =>
                  morphing ? (
                    <MorphItem key={el.id} element={el} prevGeom={prevGeomRef.current.get(el.id)}>
                      <CanvasElement element={el} scale={scale} morph />
                    </MorphItem>
                  ) : (
                    <CanvasElement key={el.id} element={el} scale={scale} />
                  ),
                )}
                <TransitionFx name={page.transition} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function transitionPreset(name: string | undefined) {
  const ease = [0.22, 1, 0.36, 1] as const;
  if (name === "slide-left") return { initial: { x: "100%", opacity: 0 }, animate: { x: 0, opacity: 1 }, transition: { duration: 0.62, ease } };
  if (name === "slide-right") return { initial: { x: "-100%", opacity: 0 }, animate: { x: 0, opacity: 1 }, transition: { duration: 0.62, ease } };
  if (name === "slide-up") return { initial: { y: "100%", opacity: 0 }, animate: { y: 0, opacity: 1 }, transition: { duration: 0.62, ease } };
  if (name === "slide-down") return { initial: { y: "-100%", opacity: 0 }, animate: { y: 0, opacity: 1 }, transition: { duration: 0.62, ease } };
  if (name === "fade") return { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.48, ease } };
  if (name === "zoom") return { initial: { opacity: 0.2, scale: 0.86 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.68, ease } };
  if (name === "tv") {
    return {
      // A CRT powers on from a bright horizontal line without enlarging the slide.
      initial: { opacity: 0, clipPath: "inset(49.5% 0 49.5% 0)", filter: "brightness(3) saturate(1.8) contrast(1.25)" },
      animate: {
        opacity: [0, 1, 1, 1],
        clipPath: ["inset(49.5% 0 49.5% 0)", "inset(10% 0 10% 0)", "inset(0 0 0 0)", "inset(0 0 0 0)"],
        filter: ["brightness(3) saturate(1.8) contrast(1.25)", "brightness(1.6) saturate(1.35) contrast(1.1)", "brightness(1) saturate(1) contrast(1)", "brightness(1) saturate(1) contrast(1)"],
      },
      transition: { duration: 0.82, times: [0, 0.34, 0.72, 1], ease },
    };
  }
  if (name === "neon") {
    return {
      // Digital signal lock: RGB-like horizontal jitter and scanline flashes, no zoom.
      initial: { opacity: 0, x: 0, clipPath: "inset(0 0 100% 0)", filter: "brightness(2.4) saturate(2.8) contrast(1.5)" },
      animate: {
        opacity: [0, 1, 1, 1, 1],
        x: [0, -14, 11, -6, 0],
        clipPath: ["inset(0 0 100% 0)", "inset(0 0 58% 0)", "inset(18% 0 28% 0)", "inset(0 0 0 0)", "inset(0 0 0 0)"],
        filter: ["brightness(2.4) saturate(2.8) contrast(1.5)", "brightness(1.7) saturate(2.2) contrast(1.4)", "brightness(1.35) saturate(1.6) contrast(1.15)", "brightness(1) saturate(1) contrast(1)", "brightness(1) saturate(1) contrast(1)"],
      },
      transition: { duration: 0.78, times: [0, 0.2, 0.46, 0.75, 1], ease: "linear" },
    };
  }
  if (name === "cube") {
    return {
      initial: { opacity: 0, rotateY: -18, x: "2%", transformPerspective: 1200 },
      animate: { opacity: [0, 1, 1], rotateY: [-18, 3, 0], x: ["2%", "-0.5%", "0%"], transformPerspective: 1200, originX: 0.5, originY: 0.5 },
      transition: { duration: 0.86, times: [0, 0.72, 1], ease },
    };
  }
  return { initial: false, animate: { opacity: 1 }, transition: { duration: 0 } };
}

function TransitionFx({ name }: { name?: string }) {
  if (name === "tv") {
    return (
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20"
        initial={{ opacity: 1, scaleY: 0.02, filter: "brightness(3)" }}
        animate={{ opacity: [1, 0.95, 0.7, 0], scaleY: [0.02, 0.18, 1, 1], filter: ["brightness(3)", "brightness(2)", "brightness(1.2)", "brightness(1)"] }}
        transition={{ duration: 0.82, times: [0, 0.24, 0.68, 1], ease: "easeOut" }}
        style={{ background: "repeating-linear-gradient(to bottom, rgba(255,255,255,.55) 0 2px, rgba(15,23,42,.18) 2px 6px)", mixBlendMode: "screen", transformOrigin: "center" }}
      />
    );
  }
  if (name === "neon") {
    return (
      <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 overflow-hidden" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.78, ease: "linear" }}>
        {["18%", "43%", "67%", "82%"].map((top, index) => (
          <motion.div key={top} className="absolute left-[-8%] h-[3px] w-[116%]" style={{ top, background: index % 2 ? "#22d3ee" : "#f0abfc", boxShadow: `0 0 18px ${index % 2 ? "#22d3ee" : "#f0abfc"}`, mixBlendMode: "screen" }} initial={{ x: "-8%", scaleX: 0.3 }} animate={{ x: ["-8%", "6%", "-3%", "0%"], scaleX: [0.3, 1.15, 0.65, 1] }} transition={{ duration: 0.62, delay: index * 0.035, ease: "linear" }} />
        ))}
        <motion.div className="absolute inset-0" style={{ background: "repeating-linear-gradient(0deg, transparent 0 5px, rgba(34,211,238,.14) 6px 7px)" }} animate={{ opacity: [1, 0.2, 1, 0] }} transition={{ duration: 0.7, ease: "linear" }} />
      </motion.div>
    );
  }
  if (name === "cube") {
    return (
      <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 border-[10px] border-amber-300/70" initial={{ opacity: 1, rotateY: -14, scale: 0.96 }} animate={{ opacity: 0, rotateY: 0, scale: 1 }} transition={{ duration: 0.86, ease: "easeOut" }} style={{ transformOrigin: "center", transformStyle: "preserve-3d", boxShadow: "inset 0 0 0 999px rgba(15,23,42,.08), 0 0 40px rgba(251,191,36,.38)" }} />
    );
  }
  return null;
}

/**
 * Geometry morph wrapper. The wrapper is laid out AT THE INCOMING element's
 * box (so measurement-free math is valid), and the FLIP transform tweens
 * from the outgoing element's box to identity.
 */
function MorphItem({
  element: el,
  prevGeom,
  children,
}: {
  element: AnyElement;
  prevGeom?: MorphGeometry;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const from = prevGeom
      ? `translate(${prevGeom.x - el.x}px, ${prevGeom.y - el.y}px) scale(${prevGeom.w / (el.width || 1)}, ${prevGeom.h / (el.height || 1)}) rotate(${prevGeom.rotation - el.rotation}deg)`
      : "scale(0.92)";
    const animation = node.animate([
      { transform: from, opacity: prevGeom ? 1 : 0 },
      { transform: "none", opacity: 1 },
    ], { duration: 620, easing: "cubic-bezier(0.22,1,0.36,1)", fill: "both" });
    return () => animation.cancel();
  }, [el.id, el.x, el.y, el.width, el.height, el.rotation, prevGeom]);

  return (
    <div
      ref={ref}
      data-morph-id={el.id}
      style={{
        position: "absolute",
        left: el.x,
        top: el.y,
        width: el.width,
        height: el.height,
        transformOrigin: "top left",
        willChange: "transform, opacity",
      }}
    >
      {children}
    </div>
  );
}
