import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useEditor } from "@/store/editor";
import { CanvasElement } from "./CanvasElement";
import { SlideThumbnail } from "./SlideThumbnail";

import { matchMorphElements, type MorphGeometry } from "@/lib/morph";
import {
  THREE_TRANSITIONS,
  formatTransitionLabel,
  isThreeTransition,
  type ThreeSlideTransition,
} from "@/lib/motion-catalog";
import type { AnyElement, Page } from "@/store/editor";
import { backgroundStyle } from "@/lib/bg";
import { ThreeTransitionStage } from "./ThreeTransitionStage";
import { playTransitionSound } from "@/lib/transition-sound";
import { Box, ChevronLeft, ChevronRight, RotateCcw, Rotate3d, X } from "lucide-react";

export async function requestPresentationFullscreen(target: Element = document.documentElement) {
  if (document.fullscreenElement) return true;
  if (!target.requestFullscreen) return false;
  try {
    await target.requestFullscreen({ navigationUI: "hide" });
    return true;
  } catch {
    return false;
  }
}

export function PresentationMode() {
  const { presenting, setPresenting, pages, currentIndex, setCurrentPage, canvasW, canvasH } =
    useEditor();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [presenterOpen, setPresenterOpen] = useState(false);
  const [stage3dOpen, setStage3dOpen] = useState(false);
  const [stage3dKind, setStage3dKind] = useState<ThreeSlideTransition>("3d-cube");
  const [stage3dPlayTrigger, setStage3dPlayTrigger] = useState(0);
  const [stage3dResetSignal, setStage3dResetSignal] = useState(0);
  const [threeTransition, setThreeTransition] = useState<{
    transition: ThreeSlideTransition;
    outgoingPage?: Page;
    incomingPage: Page;
    playTrigger: number;
  } | null>(null);
  const [threeFadingOut, setThreeFadingOut] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  // bump to replay the current slide's entrance animations (key R)
  const [replayEpoch, setReplayEpoch] = useState(0);
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

    // Keep presentation inside the app overlay. Requesting fullscreen from an
    // effect is rejected by browsers because it is no longer user-initiated,
    // which can leave the preview on a blank/error document.
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
      if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        setPresenterOpen((o) => !o);
      }
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        setReplayEpoch((n) => n + 1);
        setStage3dPlayTrigger((n) => n + 1);
        const cur = useEditor.getState().pages[useEditor.getState().currentIndex];
        if (cur?.transition && cur.transition !== "none") {
          playTransitionSound({ isThreeD: isThreeTransition(cur.transition) });
        }
      }
      if (e.key === "3") {
        e.preventDefault();
        setStage3dOpen((o) => !o);
      }
      if (/^[1-9]$/.test(e.key)) {
        const n = parseInt(e.key, 10) - 1;
        if (n < useEditor.getState().pages.length) setCurrentPage(n);
      }
    };
    window.addEventListener("keydown", onKey);

    // Leaving browser fullscreen (Escape / F11) must also leave presentation —
    // the Escape keydown is consumed by the browser and never reaches the
    // page, so the overlay would otherwise keep playing as an in-window copy.
    const onFsChange = () => {
      if (!document.fullscreenElement && useEditor.getState().presenting) {
        setPresenting(false);
      }
    };
    document.addEventListener("fullscreenchange", onFsChange);

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      obs.disconnect();
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFsChange);
      document.body.style.overflow = prev;
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presenting, canvasW, canvasH]);
  // Presenter view: reset timer & panel when (re)entering presentation.
  useEffect(() => {
    if (presenting) {
      setElapsed(0);
      setPresenterOpen(false);
      setStage3dOpen(false);
      setThreeTransition(null);
      setThreeFadingOut(false);
    }
  }, [presenting]);

  useEffect(() => {
    if (!presenterOpen) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [presenterOpen]);

  // Explicit outgoing-slide backdrop + Three.js 3D transition handoff
  const [backdropIndex, setBackdropIndex] = useState<number | null>(null);
  const prevIndexRef = useRef(currentIndex);
  useEffect(() => {
    if (prevIndexRef.current === currentIndex) return;
    const prevIndex = prevIndexRef.current;
    prevIndexRef.current = currentIndex;
    const prev = pages[prevIndex];
    const incoming = pages[currentIndex];
    if (!incoming) {
      setBackdropIndex(null);
      setThreeTransition(null);
      return;
    }
    if (isThreeTransition(incoming.transition)) {
      setBackdropIndex(null);
      setStage3dKind(incoming.transition);
      setThreeFadingOut(false);
      playTransitionSound({ isThreeD: true });
      setThreeTransition({
        transition: incoming.transition,
        outgoingPage: prev,
        incomingPage: incoming,
        playTrigger: Date.now(),
      });
      return;
    }
    if (stage3dOpen) {
      setBackdropIndex(null);
      setThreeFadingOut(false);
      playTransitionSound({ isThreeD: true });
      setThreeTransition({
        transition: stage3dKind,
        outgoingPage: prev,
        incomingPage: incoming,
        playTrigger: Date.now(),
      });
      return;
    }
    setThreeTransition(null);
    if (!prev || incoming.transition === "morph" || incoming.transition === "none") {
      if (incoming.transition === "morph") {
        playTransitionSound({ isThreeD: false });
      }
      setBackdropIndex(null);
      return;
    }
    if (incoming.transition) {
      playTransitionSound({ isThreeD: incoming.transition === "cube" || incoming.transition === "flip" || incoming.transition === "origami" });
    }
    setBackdropIndex(prevIndex);
    const t = setTimeout(() => setBackdropIndex(null), 1000);
    return () => clearTimeout(t);
  }, [currentIndex, pages, stage3dOpen, stage3dKind]);

  useEffect(() => {
    if (!threeFadingOut) return;
    const t = setTimeout(() => {
      setThreeTransition(null);
      setThreeFadingOut(false);
    }, 300);
    return () => clearTimeout(t);
  }, [threeFadingOut]);

  const backdropPage = backdropIndex !== null ? pages[backdropIndex] : undefined;

  if (!presenting || !page) return null;

  // Shared and older designs may omit background fields. Presentation must
  // still render those pages instead of throwing while the overlay mounts.
  const pageBgColor = typeof page.bgColor === "string" ? page.bgColor : "#ffffff";
  const backdropBgColor = backdropPage && typeof backdropPage.bgColor === "string"
    ? backdropPage.bgColor
    : "#ffffff";
  const morphing = page.transition === "morph";
  const isThree = isThreeTransition(page.transition);
  const motionTransitionNames = new Set(["tv", "neon", "cube", "prism", "origami"]);
  const transition =
    page.transition &&
    page.transition !== "none" &&
    !morphing &&
    !isThree &&
    page.transition !== "zoom" &&
    !motionTransitionNames.has(page.transition)
      ? `slide-transition-${page.transition}`
      : "";
  const preset = transitionPreset(page.transition);
  const showThreeCanvas = !!threeTransition || stage3dOpen;
  const activeThreeKind: ThreeSlideTransition = stage3dOpen
    ? stage3dKind
    : threeTransition?.transition ?? (isThreeTransition(page.transition) ? page.transition : "3d-cube");
  const activeOutgoing =
    threeTransition?.outgoingPage ?? (currentIndex > 0 ? pages[currentIndex - 1] : pages[currentIndex + 1]);
  const activeIncoming = threeTransition?.incomingPage ?? page;
  const activeTrigger = stage3dOpen ? stage3dPlayTrigger : (threeTransition?.playTrigger ?? 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-ink scanlines">
      <div ref={wrapRef} className="relative flex h-full w-full items-center justify-center">
        <div
          className="brutal-shadow-lg relative shrink-0"
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
            {backdropPage && (
              <div
                key={`backdrop-${backdropIndex}`}
                aria-hidden="true"
                className="pointer-events-none absolute left-0 top-0 h-full w-full overflow-hidden"
                style={
                  {
                    width: canvasW,
                    height: canvasH,
                    ...backgroundStyle(backdropBgColor, backdropPage.bgImage, backdropPage.bgFit),
                  } as React.CSSProperties
                }
              >
                {backdropPage.elements.map((el) => (
                  <CanvasElement key={el.id} element={el} scale={scale} preview />
                ))}
              </div>
            )}
            <AnimatePresence initial mode="sync">
              <motion.div
                key={`slide-${currentIndex}-${page.transition ?? "none"}`}
                initial={preset.initial}
                animate={preset.animate}
                exit={{ opacity: 1, transition: { duration: 0 } }}
                transition={preset.transition as never}
                onClick={() => currentIndex < pages.length - 1 && setCurrentPage(currentIndex + 1)}
                className={`absolute left-0 top-0 h-full w-full cursor-pointer overflow-hidden ${transition}${
                  page.transition === "zoom" ? " slide-transition-zoom" : ""
                }`}
                style={
                  {
                    width: canvasW,
                    height: canvasH,
                    ...backgroundStyle(pageBgColor, page.bgImage, page.bgFit),
                    "--fit": scale,
                    transformStyle: "preserve-3d",
                    perspective: page.transition === "cube" ? 1200 : undefined,
                    transition: morphing ? "background-color 620ms ease" : undefined,
                  } as React.CSSProperties
                }
              >
                {page.elements.map((el) => {
                  const geom = morphing ? prevGeomRef.current.get(el.id) : undefined;
                  return geom ? (
                    <MorphItem key={el.id} element={el} prevGeom={geom}>
                      <CanvasElement element={el} scale={scale} morph />
                    </MorphItem>
                  ) : (
                    // Elements with no morph match (new on this slide) keep
                    // their entrance animation even during a morph transition.
                    <CanvasElement key={el.id} element={el} scale={scale} replayEpoch={replayEpoch} />
                  );
                })}
                <TransitionFx name={page.transition} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
      {showThreeCanvas && (
        <div
          className={`fixed inset-0 z-30 transition-opacity duration-300 ease-out ${
            threeFadingOut && !stage3dOpen ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          <ThreeTransitionStage
            mode="present"
            transition={activeThreeKind}
            outgoingPage={activeOutgoing}
            incomingPage={activeIncoming}
            canvasW={canvasW}
            canvasH={canvasH}
            playTrigger={activeTrigger}
            interactive={stage3dOpen}
            resetSignal={stage3dResetSignal}
            onTransitionComplete={() => {
              if (!stage3dOpen) setThreeFadingOut(true);
            }}
            className="h-full w-full"
          />
        </div>
      )}

      {/* Compact bottom HUD dock — never uses backdrop-blur over WebGL */}
      <div className="fixed bottom-4 right-4 z-[55] flex items-center gap-1.5">
        {stage3dOpen ? (
          <div className="flex flex-wrap items-center gap-1.5 rounded-full border border-white/15 bg-slate-950/90 px-2.5 py-1.5 text-white shadow-xl">
            <button
              type="button"
              onClick={() => currentIndex > 0 && setCurrentPage(currentIndex - 1)}
              disabled={currentIndex === 0}
              aria-label="Previous slide"
              className="grid size-7 place-items-center rounded-full text-white/80 transition hover:bg-white/10 disabled:opacity-35"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="px-1 font-mono text-[11px] tabular-nums text-white/75">
              {currentIndex + 1}/{pages.length}
            </span>
            <button
              type="button"
              onClick={() => currentIndex < pages.length - 1 && setCurrentPage(currentIndex + 1)}
              disabled={currentIndex >= pages.length - 1}
              aria-label="Next slide"
              className="grid size-7 place-items-center rounded-full text-white/80 transition hover:bg-white/10 disabled:opacity-35"
            >
              <ChevronRight className="size-4" />
            </button>
            <span className="mx-0.5 h-4 w-px bg-white/15" />
            {THREE_TRANSITIONS.map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => {
                  setStage3dKind(kind);
                  setStage3dPlayTrigger((n) => n + 1);
                  playTransitionSound({ isThreeD: true });
                }}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                  stage3dKind === kind
                    ? "bg-blue-600 text-white"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                {formatTransitionLabel(kind)}
              </button>
            ))}
            <span className="mx-0.5 h-4 w-px bg-white/15" />
            <button
              type="button"
              onClick={() => {
                setStage3dPlayTrigger((n) => n + 1);
                playTransitionSound({ isThreeD: true });
              }}
              title="Replay 3D transition (R)"
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-white/80 transition hover:bg-white/10"
            >
              <Rotate3d className="size-3.5" />
              Replay
            </button>
            <button
              type="button"
              onClick={() => setStage3dResetSignal((n) => n + 1)}
              title="Reset 3D camera"
              className="grid size-7 place-items-center rounded-full text-white/80 transition hover:bg-white/10"
            >
              <RotateCcw className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setStage3dOpen(false)}
              title="Exit 3D stage (3)"
              className="grid size-7 place-items-center rounded-full text-white/75 transition hover:bg-white/10"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (isThreeTransition(page.transition)) {
                setStage3dKind(page.transition);
              }
              setStage3dOpen(true);
              setStage3dPlayTrigger((n) => n + 1);
            }}
            title="Inspect & orbit slide in Three.js 3D Stage (Press 3)"
            className="flex h-8 items-center gap-1.5 rounded-full border border-white/15 bg-slate-950/90 px-3 text-[11px] font-medium text-white/85 shadow-lg transition hover:border-blue-400/50 hover:text-white"
          >
            <Box className="size-3.5 text-blue-400" />
            3D Stage
          </button>
        )}
      </div>

      <BgMusic page={page} />
      {presenterOpen && (
        <div
          className={`fixed bottom-4 left-4 z-[60] flex w-[380px] max-w-[92vw] flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/95 p-4 text-white shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)] ${
            showThreeCanvas ? "" : "backdrop-blur-md"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-300">Presenter · slide {currentIndex + 1}/{pages.length}</span>
            <span className="font-mono text-sm tabular-nums text-white/90">{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setReplayEpoch((n) => n + 1)} title="Replay object animations (R)" className="rounded-lg border border-white/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/70 transition hover:bg-white/10">Replay</button>
              <button onClick={() => setElapsed(0)} className="rounded-lg border border-white/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/70 transition hover:bg-white/10">Reset</button>
              <button onClick={() => setPresenterOpen(false)} className="rounded-lg border border-white/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/70 transition hover:bg-white/10">Close</button>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">Notes</span>
              <div className="mt-1 max-h-44 overflow-auto whitespace-pre-wrap text-[13px] leading-relaxed text-white/85">
                {page.notes?.trim() ? page.notes : <span className="italic text-white/35">No notes for this slide.</span>}
              </div>
            </div>
            {pages[currentIndex + 1] && <div className="w-40 shrink-0"><span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">Next</span><SlideThumbnail page={pages[currentIndex + 1]} canvasW={canvasW} canvasH={canvasH} className="mt-1 rounded-lg border border-white/15" /></div>}
          </div>
          <p className="text-[10px] text-white/35">Press P for notes · 3 for 3D Stage · arrows to navigate</p>
        </div>
      )}
    </div>
  );
}

function transitionPreset(name: string | undefined) {
  const ease = [0.16, 1, 0.3, 1] as const;
  if (name === "slide-left") return { initial: { x: "100%", opacity: 0 }, animate: { x: 0, opacity: 1 }, transition: { duration: 0.74, ease } };
  if (name === "slide-right") return { initial: { x: "-100%", opacity: 0 }, animate: { x: 0, opacity: 1 }, transition: { duration: 0.74, ease } };
  if (name === "slide-up") return { initial: { y: "100%", opacity: 0 }, animate: { y: 0, opacity: 1 }, transition: { duration: 0.74, ease } };
  if (name === "slide-down") return { initial: { y: "-100%", opacity: 0 }, animate: { y: 0, opacity: 1 }, transition: { duration: 0.74, ease } };
  if (name === "fade") return { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.56, ease } };
  if (name === "zoom") return { initial: { opacity: 0.15, scale: 0.88 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.76, ease } };
  if (name === "tv") {
    return {
      // A CRT powers on from a bright horizontal line without enlarging the slide.
      initial: { opacity: 0, clipPath: "inset(49.5% 0 49.5% 0)", filter: "brightness(3) saturate(1.8) contrast(1.25)" },
      animate: {
        opacity: [0, 1, 1, 1],
        clipPath: ["inset(49.5% 0 49.5% 0)", "inset(10% 0 10% 0)", "inset(0 0 0 0)", "inset(0 0 0 0)"],
        filter: ["brightness(3) saturate(1.8) contrast(1.25)", "brightness(1.6) saturate(1.35) contrast(1.1)", "brightness(1) saturate(1) contrast(1)", "brightness(1) saturate(1) contrast(1)"],
      },
      transition: { duration: 0.84, times: [0, 0.34, 0.72, 1], ease },
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
  if (name === "prism") {
    return {
      // Refraction lock: the slide snaps into focus like light through a prism.
      initial: { opacity: 0, filter: "blur(14px) hue-rotate(80deg) saturate(2) brightness(1.25)" },
      animate: {
        opacity: [0, 1],
        filter: [
          "blur(14px) hue-rotate(80deg) saturate(2) brightness(1.25)",
          "blur(0px) hue-rotate(0deg) saturate(1) brightness(1)",
        ],
      },
      transition: { duration: 0.78, ease },
    };
  }
  if (name === "origami") {
    return {
      // Paper fold: the sheet unfolds from its top edge.
      initial: { opacity: 0, rotateX: -48, originY: 0, transformPerspective: 1400 },
      animate: { opacity: [0, 1, 1], rotateX: [-48, 3, 0] },
      transition: { duration: 0.88, times: [0, 0.65, 1], ease },
    };
  }
  if (name === "cube") {
    return {
      initial: { opacity: 0, rotateY: -16, x: "2%", transformPerspective: 1400 },
      animate: { opacity: [0, 1, 1], rotateY: [-16, 1.5, 0], x: ["2%", "-0.25%", "0%"], transformPerspective: 1400, originX: 0.5, originY: 0.5 },
      transition: { duration: 0.9, times: [0, 0.68, 1], ease },
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

/** Background music for the presented slide. Starts when the slide enters
 *  (that instant is t=0 for every element audio cue) and stops on exit. */
function BgMusic({ page }: { page: Page }) {
  useEffect(() => {
    const music = page.bgMusic;
    if (!music?.src) return;
    const audio = new Audio(music.src);
    audio.loop = music.loop ?? true;
    audio.volume = Math.max(0, Math.min(1, music.volume ?? 0.6));
    void audio.play().catch(() => undefined);
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [page.id, page.bgMusic?.src]);
  return null;
}
