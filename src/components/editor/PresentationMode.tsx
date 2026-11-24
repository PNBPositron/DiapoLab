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
import { THREE_SCENE_PRESETS, resolveThreeScene, type ThreeSceneConfig } from "@/lib/three-scene";
import { ColorPickerPopover } from "./ColorPicker";
import { useSettings } from "@/store/settings";
import {
  Box,
  ChevronLeft,
  ChevronRight,
  Eraser,
  Eye,
  EyeOff,
  FileText,
  LayoutGrid,
  MonitorOff,
  Palette,
  Pause,
  PenTool,
  Play,
  Pointer,
  Repeat,
  RotateCcw,
  Rotate3d,
  Trash2,
  X,
} from "lucide-react";

function nextVisibleSlideIndex(pages: Page[], from: number, wrap = false): number | null {
  for (let i = from + 1; i < pages.length; i++) {
    if (!pages[i]?.hiddenInPresent) return i;
  }
  if (wrap) {
    for (let i = 0; i < from; i++) {
      if (!pages[i]?.hiddenInPresent) return i;
    }
  }
  const hasAnyVisible = pages.some((p) => !p.hiddenInPresent);
  if (!hasAnyVisible) {
    if (from < pages.length - 1) return from + 1;
    if (wrap && pages.length > 1) return 0;
  }
  return null;
}

function prevVisibleSlideIndex(pages: Page[], from: number): number | null {
  for (let i = from - 1; i >= 0; i--) {
    if (!pages[i]?.hiddenInPresent) return i;
  }
  const hasAnyVisible = pages.some((p) => !p.hiddenInPresent);
  if (!hasAnyVisible && from > 0) return from - 1;
  return null;
}

function firstVisibleSlideIndex(pages: Page[]): number {
  const idx = pages.findIndex((p) => !p.hiddenInPresent);
  return idx >= 0 ? idx : 0;
}

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
  const [stage3dSceneOverride, setStage3dSceneOverride] = useState<ThreeSceneConfig | null>(null);
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
  // Live presenter toolkit state
  const [laserOn, setLaserOn] = useState(false);
  const [laserTrail, setLaserTrail] = useState<Array<{ x: number; y: number; t: number }>>([]);
  const [drawOn, setDrawOn] = useState(false);
  const [inkColor, setInkColor] = useState("#ef4444");
  const [inkStrokes, setInkStrokes] = useState<
    Record<string, Array<{ color: string; points: Array<{ x: number; y: number }> }>>
  >({});
  const [activeStroke, setActiveStroke] = useState<{
    color: string;
    points: Array<{ x: number; y: number }>;
  } | null>(null);
  const drawingInkRef = useRef(false);
  const [curtain, setCurtain] = useState<"none" | "black" | "white">("none");
  const [gridOverviewOpen, setGridOverviewOpen] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [autoPlaySec, setAutoPlaySec] = useState(5);
  const [autoPlayLoop, setAutoPlayLoop] = useState(true);
  const [zenMode, setZenMode] = useState(false);
  const [displayMenuOpen, setDisplayMenuOpen] = useState(false);
  const [idleHidden, setIdleHidden] = useState(false);
  const idleTimerRef = useRef<number | null>(null);
  const {
    presentHideHud,
    setPresentHideHud,
    presentHide3dButton,
    setPresentHide3dButton,
    presentAutoHideHud,
    setPresentAutoHideHud,
    presentHideInk,
    setPresentHideInk,
    presentHideSlideCounter,
    setPresentHideSlideCounter,
  } = useSettings();
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
      setIdleHidden(false);
      if (e.key === "Escape") {
        if (curtain !== "none") {
          setCurtain("none");
          return;
        }
        if (displayMenuOpen) {
          setDisplayMenuOpen(false);
          return;
        }
        if (gridOverviewOpen) {
          setGridOverviewOpen(false);
          return;
        }
        if (zenMode) {
          setZenMode(false);
          return;
        }
        setPresenting(false);
      }
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        const { currentIndex: i, pages: ps } = useEditor.getState();
        const nextIdx = nextVisibleSlideIndex(ps, i, false);
        if (nextIdx !== null) setCurrentPage(nextIdx);
      }
      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        const { currentIndex: i, pages: ps } = useEditor.getState();
        const prevIdx = prevVisibleSlideIndex(ps, i);
        if (prevIdx !== null) setCurrentPage(prevIdx);
      }
      if (e.key === "h" || e.key === "H") {
        e.preventDefault();
        setDisplayMenuOpen(false);
        setZenMode((z) => !z);
      }
      if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        setPresenterOpen((o) => !o);
      }
      if (e.key === "l" || e.key === "L") {
        e.preventDefault();
        setLaserOn((v) => {
          if (!v) setDrawOn(false);
          return !v;
        });
      }
      if (e.key === "d" || e.key === "D") {
        e.preventDefault();
        setDrawOn((v) => {
          if (!v) setLaserOn(false);
          return !v;
        });
      }
      if (e.key === "c" || e.key === "C") {
        const st = useEditor.getState();
        const p = st.pages[st.currentIndex];
        if (p) {
          setInkStrokes((prev) => {
            const next = { ...prev };
            delete next[p.id];
            return next;
          });
        }
      }
      if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        setCurtain((c) => (c === "black" ? "none" : "black"));
      }
      if (e.key === "w" || e.key === "W") {
        e.preventDefault();
        setCurtain((c) => (c === "white" ? "none" : "white"));
      }
      if (e.key === "g" || e.key === "G") {
        e.preventDefault();
        setGridOverviewOpen((v) => !v);
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
  }, [presenting, canvasW, canvasH, curtain, gridOverviewOpen, displayMenuOpen, zenMode]);
  // Presenter view: reset timer & panel when (re)entering presentation.
  useEffect(() => {
    if (presenting) {
      setElapsed(0);
      setPresenterOpen(false);
      setStage3dOpen(false);
      setStage3dSceneOverride(null);
      setThreeTransition(null);
      setThreeFadingOut(false);
      setLaserOn(false);
      setLaserTrail([]);
      setDrawOn(false);
      setInkStrokes({});
      setActiveStroke(null);
      setCurtain("none");
      setGridOverviewOpen(false);
      setAutoPlay(false);
      setZenMode(false);
      setDisplayMenuOpen(false);
      setIdleHidden(false);
      const st = useEditor.getState();
      if (st.pages[st.currentIndex]?.hiddenInPresent) {
        const firstVis = firstVisibleSlideIndex(st.pages);
        if (firstVis !== st.currentIndex) st.setCurrentPage(firstVis);
      }
    }
  }, [presenting]);

  useEffect(() => {
    if (!presenterOpen) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [presenterOpen]);

  // Auto-hide presenter HUD & cursor after inactivity when enabled
  useEffect(() => {
    if (!presenting || !presentAutoHideHud || presenterOpen || gridOverviewOpen || displayMenuOpen || drawOn || stage3dOpen || curtain !== "none") {
      setIdleHidden(false);
      if (idleTimerRef.current !== null) {
        window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      return;
    }
    const arm = () => {
      if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = window.setTimeout(() => setIdleHidden(true), 2400);
    };
    arm();
    return () => {
      if (idleTimerRef.current !== null) {
        window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
  }, [presenting, presentAutoHideHud, presenterOpen, gridOverviewOpen, displayMenuOpen, drawOn, stage3dOpen, curtain]);

  // Prune old laser trail points
  useEffect(() => {
    if (!laserOn) {
      setLaserTrail([]);
      return;
    }
    const id = window.setInterval(() => {
      const cutoff = Date.now() - 340;
      setLaserTrail((prev) => prev.filter((pt) => pt.t >= cutoff));
    }, 32);
    return () => window.clearInterval(id);
  }, [laserOn]);

  // Auto-play slideshow advance (respects hidden slides)
  useEffect(() => {
    if (!presenting || !autoPlay || curtain !== "none" || gridOverviewOpen) return;
    const id = window.setInterval(() => {
      const { currentIndex: idx, pages: ps } = useEditor.getState();
      const nextIdx = nextVisibleSlideIndex(ps, idx, autoPlayLoop);
      if (nextIdx !== null) setCurrentPage(nextIdx);
      else setAutoPlay(false);
    }, autoPlaySec * 1000);
    return () => window.clearInterval(id);
  }, [presenting, autoPlay, autoPlaySec, autoPlayLoop, curtain, gridOverviewOpen, setCurrentPage]);

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
    }, 440);
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

  const prevSlideIdx = prevVisibleSlideIndex(pages, currentIndex);
  const nextSlideIdx = nextVisibleSlideIndex(pages, currentIndex, false);
  const hudHidden = presenterOpen || zenMode || presentHideHud || idleHidden;
  const stage3dHidden = !stage3dOpen && (zenMode || presentHide3dButton || idleHidden);
  const hiddenSlidesCount = pages.filter((p) => p.hiddenInPresent).length;
  const hiddenElsOnSlide = page.elements.filter((el) => el.hideInPresent).length;
  const anyHideOptionOn =
    zenMode || presentHideHud || presentHide3dButton || presentAutoHideHud || presentHideInk || presentHideSlideCounter;

  const wakeHud = () => {
    if (!presentAutoHideHud) return;
    if (idleHidden) setIdleHidden(false);
    if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current);
    if (!presenterOpen && !gridOverviewOpen && !displayMenuOpen && !drawOn && !stage3dOpen && curtain === "none") {
      idleTimerRef.current = window.setTimeout(() => setIdleHidden(true), 2400);
    }
  };

  return (
    <div
      onPointerMove={wakeHud}
      onPointerDown={wakeHud}
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-ink scanlines ${
        idleHidden && !laserOn && !drawOn ? "cursor-none" : ""
      }`}
    >
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
                {backdropPage.elements
                  .filter((el) => !el.hidden && !el.hideInPresent)
                  .map((el) => (
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
                onClick={() => {
                  if (drawOn || laserOn) return;
                  if (displayMenuOpen) {
                    setDisplayMenuOpen(false);
                    return;
                  }
                  if (nextSlideIdx !== null) setCurrentPage(nextSlideIdx);
                }}
                className={`absolute left-0 top-0 h-full w-full overflow-hidden ${
                  drawOn
                    ? "cursor-crosshair"
                    : laserOn || (idleHidden && !drawOn)
                      ? "cursor-none"
                      : "cursor-pointer"
                } ${transition}${page.transition === "zoom" ? " slide-transition-zoom" : ""}`}
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
                {page.elements
                  .filter((el) => !el.hidden && !el.hideInPresent)
                  .map((el) => {
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

          {/* Per-slide presenter ink annotations + drawing surface */}
          {(!presentHideInk || drawOn) && ((inkStrokes[page.id]?.length ?? 0) > 0 || activeStroke || drawOn) && (
            <svg
              viewBox={`0 0 ${canvasW} ${canvasH}`}
              onPointerDown={(e) => {
                if (!drawOn) return;
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * canvasW;
                const y = ((e.clientY - rect.top) / rect.height) * canvasH;
                drawingInkRef.current = true;
                e.currentTarget.setPointerCapture(e.pointerId);
                setActiveStroke({ color: inkColor, points: [{ x, y }] });
              }}
              onPointerMove={(e) => {
                if (!drawOn || !drawingInkRef.current) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * canvasW;
                const y = ((e.clientY - rect.top) / rect.height) * canvasH;
                setActiveStroke((prev) =>
                  prev ? { ...prev, points: [...prev.points, { x, y }] } : null,
                );
              }}
              onPointerUp={() => {
                if (!drawingInkRef.current) return;
                drawingInkRef.current = false;
                if (activeStroke && activeStroke.points.length > 0) {
                  setInkStrokes((prev) => ({
                    ...prev,
                    [page.id]: [...(prev[page.id] ?? []), activeStroke],
                  }));
                }
                setActiveStroke(null);
              }}
              className={`absolute left-0 top-0 z-20 size-full ${
                drawOn ? "pointer-events-auto cursor-crosshair touch-none" : "pointer-events-none"
              }`}
            >
              {[...(inkStrokes[page.id] ?? []), ...(activeStroke ? [activeStroke] : [])].map(
                (stroke, sIdx) => {
                  const d = stroke.points
                    .map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
                    .join(" ");
                  return (
                    <path
                      key={sIdx}
                      d={d}
                      fill="none"
                      stroke={stroke.color}
                      strokeWidth={Math.max(4, Math.round(canvasW * 0.004))}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  );
                },
              )}
            </svg>
          )}
        </div>
      </div>

      {/* Laser pointer tracking layer */}
      {laserOn && (
        <div
          onPointerMove={(e) => {
            setLaserTrail((prev) => [
              ...prev.slice(-18),
              { x: e.clientX, y: e.clientY, t: Date.now() },
            ]);
          }}
          className="fixed inset-0 z-[45] cursor-none"
        >
          <svg className="pointer-events-none size-full">
            {laserTrail.length > 1 && (
              <path
                d={laserTrail
                  .map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`)
                  .join(" ")}
                fill="none"
                stroke="rgba(239,68,68,0.45)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {laserTrail.length > 0 && (
              <>
                <circle
                  cx={laserTrail[laserTrail.length - 1].x}
                  cy={laserTrail[laserTrail.length - 1].y}
                  r="14"
                  fill="rgba(239,68,68,0.22)"
                />
                <circle
                  cx={laserTrail[laserTrail.length - 1].x}
                  cy={laserTrail[laserTrail.length - 1].y}
                  r="6"
                  fill="#ef4444"
                />
              </>
            )}
          </svg>
        </div>
      )}

      {showThreeCanvas && (
        <div
          className={`fixed inset-0 z-30 transition-opacity duration-[440ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
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
            sceneConfig={stage3dOpen && stage3dSceneOverride ? stage3dSceneOverride : activeIncoming.threeScene}
            onTransitionComplete={() => {
              if (!stage3dOpen) setThreeFadingOut(true);
            }}
            className="h-full w-full"
          />
        </div>
      )}

      {/* Screen blackout / whiteout curtain */}
      {curtain !== "none" && (
        <button
          type="button"
          onClick={() => setCurtain("none")}
          className={`fixed inset-0 z-[70] flex flex-col items-center justify-center gap-2 transition ${
            curtain === "black" ? "bg-black text-white/40" : "bg-white text-slate-400"
          }`}
        >
          <span className="text-xs font-medium tracking-wide">
            Click anywhere or press {curtain === "black" ? "B" : "W"} / Esc to resume
          </span>
        </button>
      )}

      {/* Slide Overview Grid inside Presentation */}
      {gridOverviewOpen && (
        <div
          onClick={() => setGridOverviewOpen(false)}
          className="fixed inset-0 z-[65] flex flex-col bg-slate-950/92 p-6 text-white"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="mx-auto flex w-full max-w-5xl flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900/95 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <LayoutGrid className="size-4 text-blue-400" />
                Jump to slide
                <span className="font-mono text-xs text-white/50">
                  ({pages.length} slides)
                </span>
              </span>
              <button
                type="button"
                onClick={() => setGridOverviewOpen(false)}
                className="grid size-8 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-4 overflow-y-auto p-5 sm:grid-cols-3 md:grid-cols-4">
              {pages.map((p, idx) => {
                const active = idx === currentIndex;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setCurrentPage(idx);
                      setGridOverviewOpen(false);
                    }}
                    className={`group relative overflow-hidden rounded-2xl border p-1.5 text-left transition ${
                      active
                        ? "border-blue-500 bg-blue-500/15 ring-2 ring-blue-500/40"
                        : "border-white/10 bg-white/5 hover:border-white/30"
                    }`}
                  >
                    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-white">
                      <SlideThumbnail
                        page={p}
                        canvasW={canvasW}
                        canvasH={canvasH}
                        className="h-full w-full"
                      />
                      <span
                        className={`absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${
                          active ? "bg-blue-600 text-white" : "bg-slate-900/80 text-white"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      {p.hiddenInPresent && (
                        <span className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow-xs">
                          <EyeOff className="size-2.5" />
                          Hidden
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Subtle bottom-left reveal button when presenter toolbar is hidden */}
      {!presenterOpen && hudHidden && (
        <button
          type="button"
          onClick={() => {
            setZenMode(false);
            if (presentHideHud) setPresentHideHud(false);
            setIdleHidden(false);
          }}
          title="Show presenter controls (H)"
          aria-label="Show presenter controls"
          className="fixed bottom-4 left-4 z-[55] flex h-8 items-center gap-1.5 rounded-full border border-white/15 bg-slate-950/85 px-3 text-[11px] font-medium text-white/85 opacity-0 shadow-lg transition hover:opacity-100 focus-visible:opacity-100"
        >
          <Eye className="size-3.5 text-blue-400" />
          <span>Show controls</span>
        </button>
      )}

      {/* Compact bottom-left presenter toolkit HUD */}
      {!hudHidden && (
        <div className="fixed bottom-4 left-4 z-[55] flex flex-wrap items-center gap-1 rounded-full border border-white/15 bg-slate-950/90 px-2.5 py-1.5 text-white shadow-xl">
          <button
            type="button"
            disabled={prevSlideIdx === null}
            onClick={() => prevSlideIdx !== null && setCurrentPage(prevSlideIdx)}
            title="Previous slide"
            className="grid size-7 place-items-center rounded-full text-white/80 transition hover:bg-white/10 disabled:opacity-35"
          >
            <ChevronLeft className="size-4" />
          </button>
          {!presentHideSlideCounter && (
            <span className="px-1 font-mono text-[11px] tabular-nums text-white/80">
              {currentIndex + 1}/{pages.length}
            </span>
          )}
          <button
            type="button"
            disabled={nextSlideIdx === null}
            onClick={() => nextSlideIdx !== null && setCurrentPage(nextSlideIdx)}
            title="Next slide"
            className="grid size-7 place-items-center rounded-full text-white/80 transition hover:bg-white/10 disabled:opacity-35"
          >
            <ChevronRight className="size-4" />
          </button>
          <span className="mx-0.5 h-4 w-px bg-white/15" />
          <button
            type="button"
            onClick={() => {
              setLaserOn((v) => !v);
              setDrawOn(false);
            }}
            title="Laser pointer (L)"
            className={`grid size-7 place-items-center rounded-full transition ${
              laserOn ? "bg-rose-500 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Pointer className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setDrawOn((v) => !v);
              setLaserOn(false);
            }}
            title="Draw ink on slide (D)"
            className={`grid size-7 place-items-center rounded-full transition ${
              drawOn ? "bg-blue-600 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"
            }`}
          >
            <PenTool className="size-3.5" />
          </button>
          {drawOn && (
            <>
              <ColorPickerPopover
                value={inkColor}
                onChange={setInkColor}
                swatches={["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#a855f7", "#ffffff", "#0f172a"]}
                dark
                side="top"
                align="center"
              >
                <button
                  type="button"
                  title="Pen color"
                  className="size-5 rounded-full border-2 border-white/80 transition hover:scale-110"
                  style={{ backgroundColor: inkColor }}
                />
              </ColorPickerPopover>
              <button
                type="button"
                onClick={() =>
                  setInkStrokes((prev) => ({
                    ...prev,
                    [page.id]: (prev[page.id] ?? []).slice(0, -1),
                  }))
                }
                title="Undo last stroke"
                className="grid size-7 place-items-center rounded-full text-white/75 transition hover:bg-white/10 hover:text-white"
              >
                <Eraser className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setInkStrokes((prev) => {
                    const next = { ...prev };
                    delete next[page.id];
                    return next;
                  })
                }
                title="Clear slide ink (C)"
                className="grid size-7 place-items-center rounded-full text-white/75 transition hover:bg-white/10 hover:text-rose-400"
              >
                <Trash2 className="size-3.5" />
              </button>
            </>
          )}
          <span className="mx-0.5 h-4 w-px bg-white/15" />
          <button
            type="button"
            onClick={() => setGridOverviewOpen(true)}
            title="Slide overview grid (G)"
            className="grid size-7 place-items-center rounded-full text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            <LayoutGrid className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setPresenterOpen(true)}
            title="Presenter notes & timer (P)"
            className="grid size-7 place-items-center rounded-full text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            <FileText className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setAutoPlay((v) => !v)}
            title={autoPlay ? "Pause auto-play" : "Start auto-play slideshow"}
            className={`flex h-7 items-center gap-1 rounded-full px-2 text-[11px] font-medium transition ${
              autoPlay ? "bg-emerald-600 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"
            }`}
          >
            {autoPlay ? <Pause className="size-3" /> : <Play className="size-3 fill-current" />}
            {autoPlay && <span className="font-mono text-[10px]">{autoPlaySec}s</span>}
          </button>
          {autoPlay && (
            <>
              <button
                type="button"
                onClick={() => {
                  const steps = [3, 5, 8, 12];
                  setAutoPlaySec(steps[(steps.indexOf(autoPlaySec) + 1) % steps.length]);
                }}
                title="Cycle auto-play interval"
                className="rounded-full px-1.5 py-0.5 font-mono text-[10px] text-white/75 transition hover:bg-white/10"
              >
                Pace
              </button>
              <button
                type="button"
                onClick={() => setAutoPlayLoop((v) => !v)}
                title={autoPlayLoop ? "Loop slideshow on" : "Loop slideshow off"}
                className={`grid size-7 place-items-center rounded-full transition ${
                  autoPlayLoop ? "text-emerald-300" : "text-white/45"
                }`}
              >
                <Repeat className="size-3.5" />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setCurtain((c) => (c === "black" ? "none" : "black"))}
            title="Blackout screen (B)"
            className="grid size-7 place-items-center rounded-full text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            <MonitorOff className="size-3.5" />
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setDisplayMenuOpen((o) => !o)}
              title="Display & hide options (H for clean screen)"
              aria-label="Display & hide options"
              aria-expanded={displayMenuOpen}
              className={`relative grid size-7 place-items-center rounded-full transition ${
                displayMenuOpen
                  ? "bg-blue-600 text-white"
                  : anyHideOptionOn
                    ? "bg-white/15 text-blue-300 hover:bg-white/20"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
              }`}
            >
              {anyHideOptionOn ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </button>
            {displayMenuOpen && (
              <div className="absolute bottom-full left-0 z-[65] mb-2.5 w-72 rounded-2xl border border-white/15 bg-slate-950/95 p-2 text-xs text-white shadow-2xl">
                <div className="flex items-center justify-between px-2.5 py-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
                    Hide in Present Mode
                  </span>
                  <span className="font-mono text-[10px] text-white/40">H = Clean UI</span>
                </div>
                <div className="my-1 h-px bg-white/10" />
                {[
                  {
                    label: "Clean screen (hide all UI)",
                    hint: "H",
                    checked: zenMode,
                    toggle: () => {
                      setDisplayMenuOpen(false);
                      setZenMode((z) => !z);
                    },
                  },
                  {
                    label: "Auto-hide controls when idle",
                    checked: presentAutoHideHud,
                    toggle: () => setPresentAutoHideHud(!presentAutoHideHud),
                  },
                  {
                    label: "Hide presenter toolbar",
                    checked: presentHideHud,
                    toggle: () => {
                      if (!presentHideHud) setDisplayMenuOpen(false);
                      setPresentHideHud(!presentHideHud);
                    },
                  },
                  {
                    label: "Hide 3D Stage button",
                    checked: presentHide3dButton,
                    toggle: () => setPresentHide3dButton(!presentHide3dButton),
                  },
                  {
                    label: "Hide slide number",
                    checked: presentHideSlideCounter,
                    toggle: () => setPresentHideSlideCounter(!presentHideSlideCounter),
                  },
                  {
                    label: "Hide ink annotations",
                    checked: presentHideInk,
                    toggle: () => setPresentHideInk(!presentHideInk),
                  },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    role="switch"
                    aria-checked={opt.checked}
                    onClick={opt.toggle}
                    className="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left transition hover:bg-white/10"
                  >
                    <span className="flex items-center gap-2 text-white/90">
                      <span>{opt.label}</span>
                      {opt.hint && (
                        <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[9px] text-white/60">
                          {opt.hint}
                        </span>
                      )}
                    </span>
                    <span
                      className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${
                        opt.checked ? "bg-blue-500" : "bg-white/20"
                      }`}
                    >
                      <span
                        className={`absolute left-0.5 top-0.5 size-3 rounded-full bg-white transition-transform ${
                          opt.checked ? "translate-x-3" : ""
                        }`}
                      />
                    </span>
                  </button>
                ))}
                {(hiddenSlidesCount > 0 || hiddenElsOnSlide > 0) && (
                  <>
                    <div className="my-1 h-px bg-white/10" />
                    <div className="px-2.5 py-1.5 text-[10px] text-amber-300/90">
                      Hidden from deck:{" "}
                      {[
                        hiddenSlidesCount > 0 ? `${hiddenSlidesCount} slide${hiddenSlidesCount > 1 ? "s" : ""}` : null,
                        hiddenElsOnSlide > 0 ? `${hiddenElsOnSlide} object${hiddenElsOnSlide > 1 ? "s" : ""} on slide` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          <span className="mx-0.5 h-4 w-px bg-white/15" />
          <button
            type="button"
            onClick={() => setPresenting(false)}
            title="Exit presentation (Esc)"
            className="grid size-7 place-items-center rounded-full text-white/75 transition hover:bg-rose-500/20 hover:text-rose-300"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Compact bottom HUD dock — never uses backdrop-blur over WebGL */}
      {!stage3dHidden && (
        <div className="fixed bottom-4 right-4 z-[55] flex items-center gap-1.5">
        {stage3dOpen ? (
          <div className="flex flex-wrap items-center gap-1.5 rounded-full border border-white/15 bg-slate-950/90 px-2.5 py-1.5 text-white shadow-xl">
            <button
              type="button"
              onClick={() => prevSlideIdx !== null && setCurrentPage(prevSlideIdx)}
              disabled={prevSlideIdx === null}
              aria-label="Previous slide"
              className="grid size-7 place-items-center rounded-full text-white/80 transition hover:bg-white/10 disabled:opacity-35"
            >
              <ChevronLeft className="size-4" />
            </button>
            {!presentHideSlideCounter && (
              <span className="px-1 font-mono text-[11px] tabular-nums text-white/75">
                {currentIndex + 1}/{pages.length}
              </span>
            )}
            <button
              type="button"
              onClick={() => nextSlideIdx !== null && setCurrentPage(nextSlideIdx)}
              disabled={nextSlideIdx === null}
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
                const current = resolveThreeScene(stage3dSceneOverride ?? activeIncoming.threeScene);
                const idx = THREE_SCENE_PRESETS.findIndex((p) => p.id === current.scenePreset);
                const nextPreset = THREE_SCENE_PRESETS[(idx + 1) % THREE_SCENE_PRESETS.length];
                setStage3dSceneOverride(nextPreset.config);
              }}
              title="Cycle 3D scene environment"
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium text-white/85 transition hover:bg-white/10"
            >
              <Palette className="size-3.5 text-blue-400" />
              <span>
                {THREE_SCENE_PRESETS.find(
                  (p) =>
                    p.id ===
                    resolveThreeScene(stage3dSceneOverride ?? activeIncoming.threeScene).scenePreset,
                )?.label ?? "Scene"}
              </span>
            </button>
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
      )}

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
            {nextSlideIdx !== null && pages[nextSlideIdx] && <div className="w-40 shrink-0"><span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">Next</span><SlideThumbnail page={pages[nextSlideIdx]} canvasW={canvasW} canvasH={canvasH} className="mt-1 rounded-lg border border-white/15" /></div>}
          </div>
          <p className="text-[10px] text-white/35">P notes · H hide UI · L laser · D draw · G grid · B blackout · 3 3D stage</p>
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
