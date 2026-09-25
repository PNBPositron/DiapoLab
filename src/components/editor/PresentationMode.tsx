import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  X,
  Play,
  Pause,
  RotateCcw,
  PenTool,
  Sparkles,
  LayoutGrid,
  Clock,
  Eraser,
} from "lucide-react";
import { useEditor, type Page } from "@/store/editor";
import { CanvasElement } from "./CanvasElement";

export function PresentationMode() {
  const editor = useEditor() as any;
  const { pages, canvasW, canvasH } = editor;
  const [hasExitedLocally, setHasExitedLocally] = useState(false);

  // Store index (real store API: currentIndex + setCurrentPage)
  const storeIndex: number = editor.currentIndex ?? 0;
  const [localIndex, setLocalIndex] = useState(storeIndex);
  useEffect(() => setLocalIndex(storeIndex), [storeIndex]);

  const activeIndex = Math.max(0, Math.min(pages.length - 1, localIndex));
  const activePage: Page | undefined = pages[activeIndex];

  // Visibility: driven by the real store flag `presenting`, with a local exit override.
  const isPresenting = !hasExitedLocally && Boolean(editor.presenting);

  // Reset local exit when the user presents again
  useEffect(() => {
    if (editor.presenting) setHasExitedLocally(false);
  }, [editor.presenting]);

  const goToSlide = useCallback(
    (index: number) => {
      const target = Math.max(0, Math.min(pages.length - 1, index));
      setLocalIndex(target);
      if (typeof editor.setCurrentPage === "function") editor.setCurrentPage(target);
    },
    [editor, pages.length]
  );

  // Exit: sync the real store API + fullscreen cleanup.
  const handleExit = useCallback(() => {
    setHasExitedLocally(true);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    if (typeof editor.setPresenting === "function") editor.setPresenting(false);
  }, [editor]);

  // Fit-to-screen scale
  const [scale, setScale] = useState(1);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isPresenting) return;
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
    window.addEventListener("resize", fit);
    return () => {
      obs.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [isPresenting, canvasW, canvasH]);

  // Tools state
  const [tool, setTool] = useState<"pointer" | "laser" | "pen">("pointer");
  const [penColor, setPenColor] = useState("#f43f5e");
  const [blankMode, setBlankMode] = useState<"none" | "black" | "white">("none");
  const [gridOpen, setGridOpen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [laserPos, setLaserPos] = useState({ x: -100, y: -100 });
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  const handleMouseMove = () => {
    setControlsVisible(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      if (tool === "pointer") setControlsVisible(false);
    }, 2800);
  };

  const handleStageMouseMove = (e: React.MouseEvent) => {
    if (tool === "laser") setLaserPos({ x: e.clientX, y: e.clientY });
  };

  // Timer
  useEffect(() => {
    if (!isPresenting || !isTimerRunning) return;
    const interval = setInterval(() => setSecondsElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isPresenting, isTimerRunning]);

  const formattedTime = useMemo(() => {
    const mins = Math.floor(secondsElapsed / 60);
    const secs = secondsElapsed % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, [secondsElapsed]);

  // Drawing
  const clearDrawings = useCallback(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  }, []);

  useEffect(() => {
    clearDrawings();
  }, [activeIndex, clearDrawings]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool !== "pen" || !canvasRef.current) return;
    isDrawing.current = true;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    const rect = canvasRef.current.getBoundingClientRect();
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 3 / scale;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo((e.clientX - rect.left) / scale, (e.clientY - rect.top) / scale);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || tool !== "pen" || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    const rect = canvasRef.current.getBoundingClientRect();
    ctx.lineTo((e.clientX - rect.left) / scale, (e.clientY - rect.top) / scale);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawing.current = false;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
      if (!document.fullscreenElement && isPresenting) handleExit();
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, [isPresenting, handleExit]);

  // Keyboard navigation (capture phase)
  useEffect(() => {
    if (!isPresenting) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.code === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (gridOpen) setGridOpen(false);
        else if (blankMode !== "none") setBlankMode("none");
        else handleExit();
        return;
      }

      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case "ArrowRight":
        case "PageDown":
        case " ":
          e.preventDefault();
          goToSlide(activeIndex + 1);
          break;
        case "ArrowLeft":
        case "PageUp":
          e.preventDefault();
          goToSlide(activeIndex - 1);
          break;
        case "Home":
          goToSlide(0);
          break;
        case "End":
          goToSlide(pages.length - 1);
          break;
        case "f":
        case "F":
          toggleFullscreen();
          break;
        case "b":
        case "B":
          setBlankMode((prev) => (prev === "black" ? "none" : "black"));
          break;
        case "w":
        case "W":
          setBlankMode((prev) => (prev === "white" ? "none" : "white"));
          break;
        case "l":
        case "L":
          setTool((prev) => (prev === "laser" ? "pointer" : "laser"));
          break;
        case "p":
        case "P":
          setTool((prev) => (prev === "pen" ? "pointer" : "pen"));
          break;
        case "g":
        case "G":
          setGridOpen((prev) => !prev);
          break;
      }
      // Numeric jump 1-9
      if (/^[1-9]$/.test(e.key)) {
        const n = parseInt(e.key, 10) - 1;
        if (n < pages.length) goToSlide(n);
      }
    };

    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true } as any);
  }, [isPresenting, activeIndex, pages.length, goToSlide, handleExit, gridOpen, blankMode]);

  // Lock body scroll while presenting
  useEffect(() => {
    if (!isPresenting) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isPresenting]);

  if (!isPresenting) return null;

  const morphing = activePage?.transition === "morph";
  const transition =
    activePage?.transition && activePage.transition !== "none" && !morphing
      ? `slide-transition-${activePage.transition}`
      : "";
  const ratio = canvasW / canvasH;
  const tW = ratio >= 1 ? 96 : 96 * ratio;
  const tH = ratio >= 1 ? 96 / ratio : 96;

  return (
    <div
      ref={wrapRef}
      onMouseMove={handleMouseMove}
      className="fixed inset-0 z-50 flex select-none items-center justify-center overflow-hidden bg-slate-950/95 font-sans"
    >
      {/* Paused screen overlays */}
      {blankMode === "black" && (
        <div
          onClick={() => setBlankMode("none")}
          className="absolute inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/95 text-sm text-white/50"
        >
          Screen paused · Press B or click to resume
        </div>
      )}
      {blankMode === "white" && (
        <div
          onClick={() => setBlankMode("none")}
          className="absolute inset-0 z-50 flex cursor-pointer items-center justify-center bg-white/95 text-sm text-slate-500"
        >
          Screen paused · Press W or click to resume
        </div>
      )}

      {/* Slide — rendered with the editor's own CanvasElement (100% faithful) */}
      {activePage && (
        <div
          key={morphing ? "slide-morph" : `slide-${activeIndex}`}
          onMouseMove={handleStageMouseMove}
          className={`relative shrink-0 overflow-hidden rounded-2xl shadow-[0_30px_90px_rgba(0,0,0,0.85)] ${transition}`}
          style={{
            width: canvasW,
            height: canvasH,
            transform: `scale(${scale}) translateZ(0)`,
            transformOrigin: "center center",
            backgroundColor: activePage.bgColor?.includes("gradient(") ? "#0a0f1f" : activePage.bgColor,
            backgroundImage: activePage.bgImage
              ? `url(${activePage.bgImage})`
              : activePage.bgColor?.includes("gradient(")
                ? activePage.bgColor
                : undefined,
            backgroundSize: activePage.bgFit ?? "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            "--fit": scale,
            transition: morphing ? "background-color 620ms ease" : undefined,
          } as React.CSSProperties}
        >
          {activePage.elements?.map((el: any) => (
            <CanvasElement key={el.id} element={el} scale={scale} />
          ))}

          {/* Drawing canvas */}
          <canvas
            ref={canvasRef}
            width={canvasW}
            height={canvasH}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className={`absolute inset-0 z-30 size-full ${
              tool === "pen" ? "cursor-crosshair pointer-events-auto" : "pointer-events-none"
            }`}
          />
        </div>
      )}

      {/* Laser pointer */}
      {tool === "laser" && (
        <div
          style={{ left: laserPos.x, top: laserPos.y }}
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
        >
          <div className="size-3.5 rounded-full bg-rose-500 shadow-[0_0_16px_5px_rgba(244,63,94,0.95)]" />
          <div className="absolute inset-0 size-3.5 animate-ping rounded-full bg-rose-400 opacity-80" />
        </div>
      )}

      {/* LIQUID GLASS DOCK */}
      <div
        className={`fixed bottom-6 left-1/2 z-40 -translate-x-1/2 transition-all duration-500 ${
          controlsVisible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-8 opacity-0"
        }`}
      >
        <div className="relative group">
          <div className="pointer-events-none absolute -inset-1 rounded-3xl bg-gradient-to-r from-sky-500/25 via-indigo-500/20 to-rose-500/25 blur-xl opacity-70 transition-opacity duration-700 group-hover:opacity-100" />

          <div className="relative flex items-center gap-1.5 rounded-2xl border border-white/20 bg-slate-900/40 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_1px_0_rgba(255,255,255,0.35),inset_0_-1px_1px_0_rgba(255,255,255,0.05)] backdrop-blur-2xl backdrop-saturate-200">
            <button
              type="button"
              disabled={activeIndex <= 0}
              onClick={() => goToSlide(activeIndex - 1)}
              className="flex size-9 items-center justify-center rounded-xl text-slate-300 transition-all hover:bg-white/15 hover:text-white active:scale-95 disabled:opacity-25"
              title="Previous slide"
            >
              <ChevronLeft className="size-4" />
            </button>

            <button
              type="button"
              onClick={() => setGridOpen(true)}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-white/5 bg-white/5 px-3 font-mono text-xs font-semibold text-slate-200 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] transition-all hover:border-white/20 hover:bg-white/10 active:scale-95"
              title="Slide matrix (G)"
            >
              <span className="text-white">{activeIndex + 1}</span>
              <span className="text-white/40">/</span>
              <span className="text-white/60">{pages.length}</span>
              <LayoutGrid className="ml-1 size-3.5 text-sky-400" />
            </button>

            <button
              type="button"
              disabled={activeIndex >= pages.length - 1}
              onClick={() => goToSlide(activeIndex + 1)}
              className="flex size-9 items-center justify-center rounded-xl text-slate-300 transition-all hover:bg-white/15 hover:text-white active:scale-95 disabled:opacity-25"
              title="Next slide"
            >
              <ChevronRight className="size-4" />
            </button>

            <div className="mx-1 h-5 w-px bg-white/15" />

            <button
              type="button"
              onClick={() => setTool((prev) => (prev === "laser" ? "pointer" : "laser"))}
              className={`flex size-9 items-center justify-center rounded-xl transition-all active:scale-95 ${
                tool === "laser"
                  ? "border border-rose-400/40 bg-rose-500/30 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.3)]"
                  : "text-slate-300 hover:bg-white/15 hover:text-white"
              }`}
              title="Laser pointer (L)"
            >
              <Sparkles className="size-4" />
            </button>

            <button
              type="button"
              onClick={() => setTool((prev) => (prev === "pen" ? "pointer" : "pen"))}
              className={`flex size-9 items-center justify-center rounded-xl transition-all active:scale-95 ${
                tool === "pen"
                  ? "border border-sky-400/40 bg-sky-500/30 text-sky-300 shadow-[0_0_12px_rgba(14,165,233,0.3)]"
                  : "text-slate-300 hover:bg-white/15 hover:text-white"
              }`}
              title="Annotate (P)"
            >
              <PenTool className="size-4" />
            </button>

            {tool === "pen" && (
              <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-1.5 py-1 backdrop-blur-md">
                {["#f43f5e", "#0ea5e9", "#eab308", "#10b981"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setPenColor(c)}
                    className={`size-4 rounded-full transition-transform ${
                      penColor === c ? "scale-125 shadow-md ring-2 ring-white" : "opacity-75 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <button
                  type="button"
                  onClick={clearDrawings}
                  className="ml-1 rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                  title="Clear drawings"
                >
                  <Eraser className="size-3" />
                </button>
              </div>
            )}

            <div className="mx-1 h-5 w-px bg-white/15" />

            <div className="flex items-center gap-1.5 px-2 font-mono text-xs text-slate-200">
              <Clock className="size-3.5 text-sky-400" />
              <span>{formattedTime}</span>
              <button
                type="button"
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className="text-slate-400 transition hover:text-white active:scale-90"
              >
                {isTimerRunning ? <Pause className="size-3" /> : <Play className="size-3" />}
              </button>
              <button
                type="button"
                onClick={() => setSecondsElapsed(0)}
                className="text-slate-400 transition hover:text-white active:scale-90"
              >
                <RotateCcw className="size-3" />
              </button>
            </div>

            <div className="mx-1 h-5 w-px bg-white/15" />

            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex size-9 items-center justify-center rounded-xl text-slate-300 transition-all hover:bg-white/15 hover:text-white active:scale-95"
              title="Fullscreen (F)"
            >
              {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>

            <button
              type="button"
              onClick={handleExit}
              className="flex size-9 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 transition-all hover:border-rose-500/40 hover:bg-rose-500/25 hover:text-rose-200 active:scale-95"
              title="Exit (Esc)"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Slide matrix modal */}
      {gridOpen && (
        <div
          onClick={() => setGridOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-8 backdrop-blur-2xl animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85vh] w-full max-w-5xl flex-col rounded-3xl border border-white/20 bg-slate-900/50 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.25)] backdrop-blur-3xl backdrop-saturate-150"
          >
            <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/30">
                  <LayoutGrid className="size-4" />
                </div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
                  Slide Matrix
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setGridOpen(false)}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition-all hover:bg-white/15 hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="grid flex-1 grid-cols-2 gap-4 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
              {pages.map((p: any, idx: number) => {
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={p.id || idx}
                    type="button"
                    onClick={() => {
                      goToSlide(idx);
                      setGridOpen(false);
                    }}
                    className={`group relative flex flex-col overflow-hidden rounded-2xl border text-left transition-all active:scale-98 ${
                      isActive
                        ? "border-sky-400/80 bg-sky-500/10 shadow-[0_0_25px_rgba(56,189,248,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)]"
                        : "border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/10"
                    }`}
                  >
                    <div
                      className="aspect-video w-full transition-transform duration-300 group-hover:scale-102"
                      style={{
                        backgroundColor: p.bgColor?.includes("gradient(") ? "#0a0f1f" : p.bgColor,
                        backgroundImage: p.bgColor?.includes("gradient(") ? p.bgColor : undefined,
                      }}
                    />
                    <div className="flex items-center justify-between border-t border-white/10 bg-slate-900/60 px-3 py-2.5 text-xs backdrop-blur-md">
                      <span className="font-mono text-slate-200">Slide {idx + 1}</span>
                      {isActive && (
                        <span className="rounded-md border border-sky-400/30 bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300">
                          Active
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

      {/* Jump-to-slide strip (from the original version) */}
      <div
        className={`pointer-events-none absolute bottom-24 left-1/2 z-20 -translate-x-1/2 transition-opacity ${
          controlsVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="pointer-events-auto hidden items-center gap-1.5 overflow-x-auto rounded-2xl border border-white/15 bg-slate-900/50 p-2 backdrop-blur-xl">
          {pages.map((p: any, i: number) => {
            const active = i === activeIndex;
            return (
              <button
                key={p.id || i}
                onClick={() => goToSlide(i)}
                title={`Go to slide ${i + 1}`}
                className={`relative shrink-0 overflow-hidden rounded-lg border transition-all ${
                  active
                    ? "border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.4)]"
                    : "border-white/20 hover:border-white/50"
                }`}
                style={{
                  width: tW * 0.6,
                  height: tH * 0.6,
                  background: p.bgColor?.includes("gradient(") ? "#0a0f1f" : p.bgColor,
                  backgroundImage: p.bgColor?.includes("gradient(") ? p.bgColor : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <span className="absolute bottom-0.5 left-1 font-mono text-[9px] text-white mix-blend-difference">
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

export default PresentationMode;
