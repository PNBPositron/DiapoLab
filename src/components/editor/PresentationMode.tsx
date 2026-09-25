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
  Grid,
  Clock,
  Circle,
  Eraser,
  ExternalLink,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useEditor, type Page } from "@/store/editor";

interface PresentationModeProps {
  onExit?: () => void;
}

export function PresentationMode({ onExit }: PresentationModeProps) {
  const { pages, currentIndex, canvasW = 1920, canvasH = 1080 } = useEditor();
  const editor = useEditor() as any;

  // Slide navigation helper
  const goToSlide = useCallback(
    (index: number) => {
      const target = Math.max(0, Math.min(pages.length - 1, index));
      if (typeof editor.setCurrentIndex === "function") {
        editor.setCurrentIndex(target);
      } else if (typeof editor.selectPage === "function") {
        editor.selectPage(target);
      }
    },
    [editor, pages.length]
  );

  const activeIndex = Math.max(0, Math.min(pages.length - 1, currentIndex ?? 0));
  const activePage: Page | undefined = pages[activeIndex];

  // Viewport Auto-scaling
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateScale = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const padding = 24;
    const scaleX = (clientWidth - padding * 2) / canvasW;
    const scaleY = (clientHeight - padding * 2) / canvasH;
    setScale(Math.min(scaleX, scaleY, 1.25));
  }, [canvasW, canvasH]);

  useEffect(() => {
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [updateScale]);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Presenter Tools
  const [tool, setTool] = useState<"pointer" | "laser" | "pen">("pointer");
  const [penColor, setPenColor] = useState("#f43f5e");
  const [blankMode, setBlankMode] = useState<"none" | "black" | "white">("none");
  const [gridOpen, setGridOpen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);

  // Auto-hide toolbar on cursor idle
  const handleMouseMove = () => {
    setControlsVisible(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      if (tool === "pointer") setControlsVisible(false);
    }, 2800);
  };

  // Laser Pointer State
  const [laserPos, setLaserPos] = useState({ x: -100, y: -100 });
  const handleStageMouseMove = (e: React.MouseEvent) => {
    if (tool === "laser") {
      setLaserPos({ x: e.clientX, y: e.clientY });
    }
  };

  // Presentation Timer
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => setSecondsElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formattedTime = useMemo(() => {
    const mins = Math.floor(secondsElapsed / 60);
    const secs = secondsElapsed % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, [secondsElapsed]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
        case "m":
        case "M":
          setGridOpen((prev) => !prev);
          break;
        case "Escape":
          if (gridOpen) setGridOpen(false);
          else if (blankMode !== "none") setBlankMode("none");
          else onExit?.();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, pages.length, goToSlide, onExit, gridOpen, blankMode]);

  // Drawing Canvas Reference
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  const clearDrawings = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  // Clear pen marks automatically on slide transition
  useEffect(() => {
    clearDrawings();
  }, [activeIndex]);

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

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative flex h-screen w-screen select-none items-center justify-center overflow-hidden bg-slate-950 font-sans"
    >
      {/* Blackout / Whiteout Curtains */}
      {blankMode === "black" && (
        <div
          onClick={() => setBlankMode("none")}
          className="absolute inset-0 z-50 flex cursor-pointer items-center justify-center bg-black text-xs text-white/40"
        >
          Screen paused · Press B or click to resume
        </div>
      )}
      {blankMode === "white" && (
        <div
          onClick={() => setBlankMode("none")}
          className="absolute inset-0 z-50 flex cursor-pointer items-center justify-center bg-white text-xs text-slate-400"
        >
          Screen paused · Press W or click to resume
        </div>
      )}

      {/* Main Scaled Slide Viewport */}
      {activePage && (
        <div
          onMouseMove={handleStageMouseMove}
          style={{
            width: canvasW,
            height: canvasH,
            transform: `scale(${scale})`,
            transformOrigin: "center center",
            backgroundColor: activePage.bgColor || "#ffffff",
          }}
          className="relative shrink-0 overflow-hidden rounded-xl shadow-[0_25px_70px_rgba(0,0,0,0.65)] transition-transform duration-100 ease-out"
        >
          {/* Slide Interactive Elements Layer */}
          {activePage.elements.map((el) => (
            <InteractiveElementRenderer
              key={el.id}
              element={el}
              onNavigate={(targetSlide) => goToSlide(targetSlide)}
            />
          ))}

          {/* Interactive Annotation Pen Layer */}
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

      {/* Custom Virtual Laser Pointer */}
      {tool === "laser" && (
        <div
          style={{ left: laserPos.x, top: laserPos.y }}
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
        >
          <div className="size-3.5 rounded-full bg-rose-500 shadow-[0_0_14px_4px_rgba(244,63,94,0.95)]" />
          <div className="absolute inset-0 size-3.5 animate-ping rounded-full bg-rose-400 opacity-75" />
        </div>
      )}

      {/* Floating Presenter Control Dock */}
      <div
        className={`fixed bottom-6 left-1/2 z-40 -translate-x-1/2 transition-all duration-300 ${
          controlsVisible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"
        }`}
      >
        <div className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-slate-900/85 p-1.5 shadow-[0_20px_40px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          {/* Navigation Controls */}
          <button
            type="button"
            disabled={activeIndex <= 0}
            onClick={() => goToSlide(activeIndex - 1)}
            className="flex size-9 items-center justify-center rounded-xl text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
            title="Previous slide (Left arrow)"
          >
            <ChevronLeft className="size-4" />
          </button>

          {/* Slide Indicator & Grid Trigger */}
          <button
            type="button"
            onClick={() => setGridOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-xl px-2.5 font-mono text-xs font-medium text-slate-200 transition hover:bg-white/10"
            title="All slides (G)"
          >
            <span>{activeIndex + 1}</span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-400">{pages.length}</span>
            <Grid className="ml-1 size-3.5 text-slate-400" />
          </button>

          <button
            type="button"
            disabled={activeIndex >= pages.length - 1}
            onClick={() => goToSlide(activeIndex + 1)}
            className="flex size-9 items-center justify-center rounded-xl text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
            title="Next slide (Space / Right arrow)"
          >
            <ChevronRight className="size-4" />
          </button>

          <div className="mx-1 h-5 w-px bg-white/10" />

          {/* Presenter Tools: Laser & Pen */}
          <button
            type="button"
            onClick={() => setTool((prev) => (prev === "laser" ? "pointer" : "laser"))}
            className={`flex size-9 items-center justify-center rounded-xl transition ${
              tool === "laser"
                ? "bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/40"
                : "text-slate-400 hover:bg-white/10 hover:text-white"
            }`}
            title="Laser pointer (L)"
          >
            <Sparkles className="size-4" />
          </button>

          <button
            type="button"
            onClick={() => setTool((prev) => (prev === "pen" ? "pointer" : "pen"))}
            className={`flex size-9 items-center justify-center rounded-xl transition ${
              tool === "pen"
                ? "bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/40"
                : "text-slate-400 hover:bg-white/10 hover:text-white"
            }`}
            title="Annotation pen (P)"
          >
            <PenTool className="size-4" />
          </button>

          {/* Pen Color / Eraser Options (conditional) */}
          {tool === "pen" && (
            <div className="flex items-center gap-1 rounded-lg bg-white/5 px-1 py-0.5">
              {["#f43f5e", "#0ea5e9", "#eab308", "#10b981"].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setPenColor(c)}
                  className={`size-4 rounded-full transition-transform ${
                    penColor === c ? "scale-125 ring-2 ring-white" : "opacity-80"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <button
                type="button"
                onClick={clearDrawings}
                className="ml-1 rounded p-1 text-slate-400 hover:text-white"
                title="Clear annotations"
              >
                <Eraser className="size-3" />
              </button>
            </div>
          )}

          <div className="mx-1 h-5 w-px bg-white/10" />

          {/* Presentation Timer */}
          <div className="flex items-center gap-1.5 px-2 font-mono text-xs text-slate-300">
            <Clock className="size-3.5 text-slate-400" />
            <span>{formattedTime}</span>
            <button
              type="button"
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className="text-slate-400 hover:text-white"
              title={isTimerRunning ? "Pause timer" : "Resume timer"}
            >
              {isTimerRunning ? <Pause className="size-3" /> : <Play className="size-3" />}
            </button>
            <button
              type="button"
              onClick={() => setSecondsElapsed(0)}
              className="text-slate-400 hover:text-white"
              title="Reset timer"
            >
              <RotateCcw className="size-3" />
            </button>
          </div>

          <div className="mx-1 h-5 w-px bg-white/10" />

          {/* Fullscreen & Close */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="flex size-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/10 hover:text-white"
            title="Toggle fullscreen (F)"
          >
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>

          <button
            type="button"
            onClick={onExit}
            className="flex size-9 items-center justify-center rounded-xl text-rose-400 transition hover:bg-rose-500/20 hover:text-rose-300"
            title="Exit presentation (Esc)"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Grid Thumbnail Modal (Jump to any slide) */}
      {gridOpen && (
        <div
          onClick={() => setGridOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-8 backdrop-blur-md"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85vh] w-full max-w-5xl flex-col rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Grid className="size-4 text-sky-400" />
                <h3 className="text-sm font-semibold tracking-wide text-white uppercase">
                  Slide Matrix
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setGridOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="grid flex-1 grid-cols-2 gap-4 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
              {pages.map((p, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      goToSlide(idx);
                      setGridOpen(false);
                    }}
                    className={`group relative flex flex-col overflow-hidden rounded-xl border text-left transition ${
                      isActive
                        ? "border-sky-500 ring-2 ring-sky-500/40 shadow-lg shadow-sky-500/10"
                        : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    <div
                      className="aspect-video w-full transition-transform group-hover:scale-102"
                      style={{ backgroundColor: p.bgColor || "#ffffff" }}
                    />
                    <div className="flex items-center justify-between bg-slate-800/80 px-3 py-2 text-xs">
                      <span className="font-mono text-slate-300">Slide {idx + 1}</span>
                      {isActive && (
                        <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-sky-400">
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
    </div>
  );
}

// --- INTERACTIVE SLIDE ELEMENT COMPONENT ---

function InteractiveElementRenderer({
  element: el,
  onNavigate,
}: {
  element: any;
  onNavigate: (slideIndex: number) => void;
}) {
  const [quizSelection, setQuizSelection] = useState<string | null>(null);

  // Entrance Animation class mapping
  const animationClass = useMemo(() => {
    switch (el.animation) {
      case "fade-up":
        return "animate-in fade-in slide-in-from-bottom-6 duration-500 fill-mode-both";
      case "pop":
        return "animate-in zoom-in-75 duration-300 ease-out fill-mode-both";
      case "glitch":
        return "animate-pulse duration-200";
      default:
        return "";
    }
  }, [el.animation]);

  // Click handler for buttons and interactive items
  const handleClick = (e: React.MouseEvent) => {
    // Check slide target jump
    if (el.interaction?.moveToSlide) {
      e.stopPropagation();
      onNavigate(el.interaction.moveToSlide - 1);
      return;
    }

    // Button specific action triggers
    if (el.type === "button") {
      e.stopPropagation();
      switch (el.action) {
        case "next-slide":
          onNavigate(Number.MAX_SAFE_INTEGER); // handled upstream
          break;
        case "prev-slide":
          onNavigate(0);
          break;
        case "first-slide":
          onNavigate(0);
          break;
        case "link":
          if (el.href) window.open(el.href, "_blank", "noopener,noreferrer");
          break;
      }
      return;
    }

    // URL Hyperlinks
    if (el.href) {
      e.stopPropagation();
      window.open(el.href, "_blank", "noopener,noreferrer");
    }
  };

  const baseStyle: React.CSSProperties = {
    position: "absolute",
    left: `${el.x}px`,
    top: `${el.y}px`,
    width: `${el.width}px`,
    height: `${el.height}px`,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
    opacity: el.opacity ?? 1,
    zIndex: el.zIndex ?? 10,
  };

  // 1. TEXT ELEMENT
  if (el.type === "text") {
    return (
      <div
        style={{
          ...baseStyle,
          color: el.color || "#000000",
          fontFamily: el.fontFamily,
          fontSize: `${el.fontSize}px`,
          fontWeight: el.fontWeight,
          lineHeight: el.lineHeight,
          letterSpacing: `${el.letterSpacing}em`,
          textAlign: el.align || "left",
          fontStyle: el.italic ? "italic" : "normal",
          textDecoration: el.underline ? "underline" : "none",
          cursor: el.href || el.interaction?.moveToSlide ? "pointer" : "default",
        }}
        onClick={handleClick}
        className={`${animationClass} select-none leading-normal transition-all`}
      >
        {el.text}
      </div>
    );
  }

  // 2. SHAPE ELEMENT
  if (el.type === "shape") {
    return (
      <div
        style={{
          ...baseStyle,
          backgroundColor: el.fill || "#38bdf8",
          borderRadius: `${el.cornerRadius ?? 0}px`,
          borderWidth: `${el.strokeWidth ?? 0}px`,
          borderColor: el.stroke || "transparent",
          borderStyle: el.strokeStyle || "solid",
        }}
        onClick={handleClick}
        className={`${animationClass} transition-all`}
      />
    );
  }

  // 3. IMAGE ELEMENT
  if (el.type === "image") {
    return (
      <img
        src={el.src}
        alt=""
        style={{
          ...baseStyle,
          objectFit: el.fit || "cover",
          borderRadius: `${el.cornerRadius ?? 0}px`,
          transform: `${baseStyle.transform || ""} scaleX(${el.flipX ? -1 : 1}) scaleY(${
            el.flipY ? -1 : 1
          })`,
          filter: el.filters
            ? `brightness(${el.filters.brightness ?? 100}%) contrast(${
                el.filters.contrast ?? 100
              }%) saturate(${el.filters.saturate ?? 100}%) blur(${el.filters.blur ?? 0}px)`
            : undefined,
        }}
        onClick={handleClick}
        className={`${animationClass} select-none`}
      />
    );
  }

  // 4. ACTION BUTTON ELEMENT
  if (el.type === "button") {
    return (
      <button
        type="button"
        style={{
          ...baseStyle,
          backgroundColor: el.bgColor || "#0284c7",
          color: el.fgColor || "#ffffff",
          borderColor: el.borderColor || "transparent",
          borderWidth: `${el.borderWidth ?? 0}px`,
          borderRadius: `${el.cornerRadius ?? 8}px`,
          fontSize: `${el.fontSize ?? 14}px`,
          fontFamily: el.fontFamily,
        }}
        onClick={handleClick}
        className={`${animationClass} flex cursor-pointer items-center justify-center font-semibold shadow-md transition hover:scale-102 active:scale-98`}
      >
        <span>{el.text || "Click"}</span>
        {el.action === "link" && <ExternalLink className="ml-1.5 size-3.5 opacity-70" />}
      </button>
    );
  }

  // 5. INTERACTIVE QUIZ ELEMENT
  if (el.type === "quiz") {
    return (
      <div
        style={{
          ...baseStyle,
          backgroundColor: el.bgColor || "#ffffff",
          color: el.fgColor || "#0f172a",
        }}
        className={`${animationClass} flex flex-col justify-between rounded-2xl border border-slate-200/80 p-6 shadow-xl`}
      >
        <h4 className="text-base font-bold tracking-tight">{el.question}</h4>
        <div className="space-y-2">
          {el.options?.map((opt: any) => {
            const isChosen = quizSelection === opt.id;
            const isCorrect = opt.id === el.correctId;
            let optStyle = "border-slate-200 bg-slate-50 hover:border-slate-300";

            if (quizSelection !== null) {
              if (isCorrect) optStyle = "border-emerald-500 bg-emerald-50 text-emerald-900";
              else if (isChosen) optStyle = "border-rose-500 bg-rose-50 text-rose-900 animate-shake";
            }

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setQuizSelection(opt.id)}
                className={`flex w-full items-center justify-between rounded-xl border p-3 text-left text-xs font-medium transition ${optStyle}`}
              >
                <span>{opt.text}</span>
                {quizSelection !== null && isCorrect && (
                  <CheckCircle2 className="size-4 text-emerald-600" />
                )}
                {quizSelection !== null && isChosen && !isCorrect && (
                  <XCircle className="size-4 text-rose-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}
