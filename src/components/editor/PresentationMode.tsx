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
          <AnimatePresence initial={false} mode="sync">
          <motion.div
            key={`slide-${currentIndex}`}
            initial={preset.initial}
            animate={preset.animate}
            transition={preset.transition}
            onClick={() => currentIndex < pages.length - 1 && setCurrentPage(currentIndex + 1)}
            className={`absolute left-0 top-0 cursor-pointer overflow-hidden border border-teal ${transition}`}
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
                "--fit": scale,
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
          </motion.div>
          </AnimatePresence>
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
      initial: { opacity: 0, scaleY: 0.015, scaleX: 1.04, filter: "brightness(2.8) saturate(1.8)" },
      animate: { opacity: [0, 1, 1, 1], scaleY: [0.015, 0.82, 1.04, 1], scaleX: [1.04, 1, 1.01, 1], filter: ["brightness(2.8) saturate(1.8)", "brightness(1.4) saturate(1.25)", "brightness(1)", "brightness(1)"], originY: 0.5 },
      transition: { duration: 0.78, times: [0, 0.28, 0.58, 1], ease },
    };
  }
  if (name === "neon") {
    return {
      initial: { opacity: 0, scale: 1.025, filter: "brightness(3) saturate(2.2) blur(14px)" },
      animate: { opacity: [0, 1, 1], scale: [1.025, 1.008, 1], filter: ["brightness(3) saturate(2.2) blur(14px)", "brightness(1.5) saturate(1.5) blur(1px)", "brightness(1) saturate(1) blur(0px)"], originX: 0.5, originY: 0.5 },
      transition: { duration: 0.86, times: [0, 0.52, 1], ease },
    };
  }
  if (name === "cube") {
    return {
      initial: { opacity: 0, rotateY: -32, x: "4%", scale: 0.94, transformPerspective: 1200 },
      animate: { opacity: [0, 1, 1], rotateY: [ -32, 5, 0 ], x: ["4%", "-1%", "0%"], scale: [0.94, 1.01, 1], transformPerspective: 1200, originX: 0.5, originY: 0.5 },
      transition: { duration: 0.86, times: [0, 0.72, 1], ease },
    };
  }
  return { initial: false, animate: { opacity: 1 }, transition: { duration: 0 } };
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
