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
  ExternalLink,
  CheckCircle2,
  XCircle,
  Code2,
  Copy,
  Check,
} from "lucide-react";
import { useEditor, type Page } from "@/store/editor";

export interface PresentationModeProps {
  isOpen?: boolean;
  onExit?: () => void;
  onClose?: () => void;
}

export function PresentationMode({ isOpen, onExit, onClose }: PresentationModeProps) {
  const editor = useEditor() as any;

  // Local override ensures Échap / Exit ALWAYS closes immediately
  const [hasExitedLocally, setHasExitedLocally] = useState(false);

  const pages: Page[] = useMemo(() => {
    return editor.pages || editor.slides || [];
  }, [editor.pages, editor.slides]);

  // Support multiple store index conventions
  const storeIndex: number =
    editor.currentIndex ??
    editor.activePageIndex ??
    editor.currentPageIndex ??
    editor.selectedPageIndex ??
    0;

  const [localIndex, setLocalIndex] = useState(storeIndex);

  useEffect(() => {
    setLocalIndex(storeIndex);
  }, [storeIndex]);

  const activeIndex = Math.max(0, Math.min(pages.length - 1, localIndex));
  const activePage: Page | undefined = pages[activeIndex];

  // Resolve presentation visibility
  const isPresenting = useMemo(() => {
    if (hasExitedLocally) return false;
    if (typeof isOpen === "boolean") return isOpen;
    return Boolean(
      editor.presentMode ||
      editor.isPresenting ||
      editor.isPresentationMode ||
      editor.presenting ||
      editor.mode === "present"
    );
  }, [hasExitedLocally, isOpen, editor.presentMode, editor.isPresenting, editor.isPresentationMode, editor.presenting, editor.mode]);

  // Reset local exit when presentation opens again
  useEffect(() => {
    if (isOpen || editor.presentMode || editor.isPresenting || editor.isPresentationMode) {
      setHasExitedLocally(false);
    }
  }, [isOpen, editor.presentMode, editor.isPresenting, editor.isPresentationMode]);

  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sync with browser native fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Bulletproof Exit Handler
  const handleExit = useCallback(() => {
    setHasExitedLocally(true);

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    if (onExit) onExit();
    if (onClose) onClose();

    if (typeof editor.setPresentMode === "function") editor.setPresentMode(false);
    if (typeof editor.setIsPresenting === "function") editor.setIsPresenting(false);
    if (typeof editor.setIsPresentationMode === "function") editor.setIsPresentationMode(false);
    if (typeof editor.setPresentationMode === "function") editor.setPresentationMode(false);
    if (typeof editor.exitPresentation === "function") editor.exitPresentation();
    if (typeof editor.closePresentation === "function") editor.closePresentation();
    if (typeof editor.setMode === "function") editor.setMode("edit");
  }, [onExit, onClose, editor]);

  // Slide navigation
  const goToSlide = useCallback(
    (index: number) => {
      const target = Math.max(0, Math.min(pages.length - 1, index));
      setLocalIndex(target);

      if (typeof editor.setCurrentIndex === "function") editor.setCurrentIndex(target);
      else if (typeof editor.setCurrentPageIndex === "function") editor.setCurrentPageIndex(target);
      else if (typeof editor.setActivePageIndex === "function") editor.setActivePageIndex(target);
      else if (typeof editor.setPageIndex === "function") editor.setPageIndex(target);
      else if (typeof editor.selectPage === "function") editor.selectPage(target);
      else if (typeof editor.goToSlide === "function") editor.goToSlide(target);
      else if (typeof editor.setCurrentPage === "function") editor.setCurrentPage(target);
    },
    [editor, pages.length]
  );

  const canvasW = editor.canvasW || editor.width || 1920;
  const canvasH = editor.canvasH || editor.height || 1080;

  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateScale = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const padding = 28;
    const scaleX = (clientWidth - padding * 2) / canvasW;
    const scaleY = (clientHeight - padding * 2) / canvasH;
    setScale(Math.min(scaleX, scaleY, 1.25));
  }, [canvasW, canvasH]);

  useEffect(() => {
    if (!isPresenting) return;
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [isPresenting, updateScale]);

  const [tool, setTool] = useState<"pointer" | "laser" | "pen">("pointer");
  const [penColor, setPenColor] = useState("#f43f5e");
  const [blankMode, setBlankMode] = useState<"none" | "black" | "white">("none");
  const [gridOpen, setGridOpen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [laserPos, setLaserPos] = useState({ x: -100, y: -100 });
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);
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
    if (tool === "laser") {
      setLaserPos({ x: e.clientX, y: e.clientY });
    }
  };

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

  // Keyboard Navigation & Escape Handler (capture phase guarantees it won't be swallowed)
  useEffect(() => {
    if (!isPresenting) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.code === "Escape") {
        e.preventDefault();
        e.stopPropagation();

        if (gridOpen) {
          setGridOpen(false);
        } else if (blankMode !== "none") {
          setBlankMode("none");
        } else {
          handleExit();
        }
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
        case "m":
        case "M":
          setGridOpen((prev) => !prev);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [isPresenting, activeIndex, pages.length, goToSlide, handleExit, gridOpen, blankMode]);

  if (!isPresenting) return null;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="fixed inset-0 z-50 flex select-none items-center justify-center overflow-hidden bg-slate-950/95 font-sans"
    >
      {/* Paused Screen Overlays */}
      {blankMode === "black" && (
        <div
          onClick={() => setBlankMode("none")}
          className="absolute inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/95 backdrop-blur-3xl text-sm text-white/50"
        >
          Screen paused · Press B, click or press Échap to resume
        </div>
      )}
      {blankMode === "white" && (
        <div
          onClick={() => setBlankMode("none")}
          className="absolute inset-0 z-50 flex cursor-pointer items-center justify-center bg-white/95 backdrop-blur-3xl text-sm text-slate-500"
        >
          Screen paused · Press W, click or press Échap to resume
        </div>
      )}

      {/* Slide Viewport with Hardware Acceleration */}
      {activePage && (
        <div
          key={activePage.id || activeIndex}
          onMouseMove={handleStageMouseMove}
          style={{
            width: canvasW,
            height: canvasH,
            transform: `scale(${scale}) translateZ(0)`,
            transformOrigin: "center center",
            backgroundColor: activePage.bgColor || "#0f172a",
            contain: "paint",
          }}
          className="relative shrink-0 overflow-hidden rounded-2xl shadow-[0_30px_90px_rgba(0,0,0,0.85)] transition-all duration-300 ease-out"
        >
          {/* Ambient Lighting Mesh for Liquid Glass Refraction */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-60">
            <div className="absolute -top-32 -left-32 size-[500px] rounded-full bg-sky-500/30 blur-[120px]" />
            <div className="absolute top-1/2 -right-32 size-[600px] rounded-full bg-rose-500/25 blur-[140px]" />
            <div className="absolute -bottom-32 left-1/3 size-[500px] rounded-full bg-indigo-500/25 blur-[130px]" />
          </div>

          {/* Slide Elements */}
          {activePage.elements?.map((el: any) => (
            <InteractiveElementRenderer
              key={`${activePage.id || activeIndex}-${el.id}`}
              element={el}
              currentSlideIndex={activeIndex}
              onNavigate={(targetSlide) => goToSlide(targetSlide)}
            />
          ))}

          {/* Drawing Canvas */}
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

      {/* Laser Pointer */}
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
          <div className="pointer-events-none absolute -inset-1 rounded-3xl bg-gradient-to-r from-sky-500/25 via-indigo-500/20 to-rose-500/25 blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-700" />

          <div className="relative flex items-center gap-1.5 rounded-2xl border border-white/20 bg-slate-900/40 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_1px_0_rgba(255,255,255,0.35),inset_0_-1px_1px_0_rgba(255,255,255,0.05)] backdrop-blur-2xl backdrop-saturate-200">
            <button
              type="button"
              disabled={activeIndex <= 0}
              onClick={() => goToSlide(activeIndex - 1)}
              className="flex size-9 items-center justify-center rounded-xl text-slate-300 transition-all hover:bg-white/15 hover:text-white active:scale-95 disabled:opacity-25"
              title="Slide précédente"
            >
              <ChevronLeft className="size-4" />
            </button>

            <button
              type="button"
              onClick={() => setGridOpen(true)}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-white/5 bg-white/5 px-3 font-mono text-xs font-semibold text-slate-200 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] transition-all hover:border-white/20 hover:bg-white/10 active:scale-95"
              title="Matrice des slides (G)"
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
              title="Slide suivante"
            >
              <ChevronRight className="size-4" />
            </button>

            <div className="mx-1 h-5 w-px bg-white/15" />

            <button
              type="button"
              onClick={() => setTool((prev) => (prev === "laser" ? "pointer" : "laser"))}
              className={`flex size-9 items-center justify-center rounded-xl transition-all active:scale-95 ${
                tool === "laser"
                  ? "bg-rose-500/30 text-rose-300 border border-rose-400/40 shadow-[0_0_12px_rgba(244,63,94,0.3)]"
                  : "text-slate-300 hover:bg-white/15 hover:text-white"
              }`}
              title="Pointeur laser (L)"
            >
              <Sparkles className="size-4" />
            </button>

            <button
              type="button"
              onClick={() => setTool((prev) => (prev === "pen" ? "pointer" : "pen"))}
              className={`flex size-9 items-center justify-center rounded-xl transition-all active:scale-95 ${
                tool === "pen"
                  ? "bg-sky-500/30 text-sky-300 border border-sky-400/40 shadow-[0_0_12px_rgba(14,165,233,0.3)]"
                  : "text-slate-300 hover:bg-white/15 hover:text-white"
              }`}
              title="Annotation (P)"
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
                      penColor === c ? "scale-125 ring-2 ring-white shadow-md" : "opacity-75 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <button
                  type="button"
                  onClick={clearDrawings}
                  className="ml-1 rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                  title="Effacer les dessins"
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
              title="Plein écran (F)"
            >
              {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>

            <button
              type="button"
              onClick={handleExit}
              className="flex size-9 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 transition-all hover:border-rose-500/40 hover:bg-rose-500/25 hover:text-rose-200 active:scale-95"
              title="Quitter (Échap)"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Slide Matrix Modal */}
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
                <h3 className="text-sm font-semibold tracking-wider text-white uppercase">
                  Matrice des Slides
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
                      style={{ backgroundColor: p.bgColor || "#ffffff" }}
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
    </div>
  );
}

// Glass style generator helper
function getLiquidGlassStyle(isDarkBackground = true): React.CSSProperties {
  return {
    background: isDarkBackground
      ? "linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.03) 100%)"
      : "linear-gradient(135deg, rgba(255, 255, 255, 0.70) 0%, rgba(255, 255, 255, 0.35) 100%)",
    backdropFilter: "blur(20px) saturate(190%) contrast(105%)",
    WebkitBackdropFilter: "blur(20px) saturate(190%) contrast(105%)",
    border: isDarkBackground
      ? "1px solid rgba(255, 255, 255, 0.2)"
      : "1px solid rgba(255, 255, 255, 0.6)",
    boxShadow: isDarkBackground
      ? "0 20px 40px -15px rgba(0, 0, 0, 0.5), inset 0 1px 1px 0 rgba(255, 255, 255, 0.4), inset 0 -1px 1px 0 rgba(255, 255, 255, 0.1)"
      : "0 20px 40px -15px rgba(0, 0, 0, 0.1), inset 0 1px 2px 0 rgba(255, 255, 255, 0.9), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.05)",
  };
}

// Subcomponent for interactive code editor (keeps hooks clean and valid)
function CodeElementRenderer({ element: el, baseStyle }: { element: any; baseStyle: React.CSSProperties }) {
  const [copied, setCopied] = useState(false);
  const [codeContent, setCodeContent] = useState(
    el.code || `// Sample Code\nexport default function App() {\n  return <h1>Hello Diapolab</h1>;\n}`
  );

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(codeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={baseStyle}
      onClick={(e) => e.stopPropagation()}
      className="flex flex-col overflow-hidden rounded-2xl border border-white/20 bg-slate-950/70 font-mono shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.2)] backdrop-blur-2xl backdrop-saturate-180"
    >
      <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="size-2.5 rounded-full bg-rose-500/80" />
            <div className="size-2.5 rounded-full bg-amber-500/80" />
            <div className="size-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <span className="ml-2 flex items-center gap-1.5 text-xs font-medium text-slate-300">
            <Code2 className="size-3.5 text-sky-400" />
            {el.fileName || "Component.tsx"}
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-300 transition-all hover:bg-white/15 hover:text-white active:scale-95"
          title="Copier le code"
        >
          {copied ? (
            <>
              <Check className="size-3 text-emerald-400" />
              <span className="text-emerald-400">Copié</span>
            </>
          ) : (
            <>
              <Copy className="size-3" />
              <span>Copier</span>
            </>
          )}
        </button>
      </div>

      <div className="relative flex-1 overflow-auto p-4 text-xs leading-relaxed text-slate-200">
        <textarea
          value={codeContent}
          onChange={(e) => setCodeContent(e.target.value)}
          spellCheck={false}
          className="size-full resize-none bg-transparent font-mono outline-none selection:bg-sky-500/30"
          style={{ tabSize: 2 }}
        />
      </div>
    </div>
  );
}

// Element Renderer
function InteractiveElementRenderer({
  element: el,
  currentSlideIndex,
  onNavigate,
}: {
  element: any;
  currentSlideIndex: number;
  onNavigate: (slideIndex: number) => void;
}) {
  const [quizSelection, setQuizSelection] = useState<string | null>(null);

  const handleClick = (e: React.MouseEvent) => {
    if (el.interaction?.moveToSlide != null) {
      e.stopPropagation();
      const target = Number(el.interaction.moveToSlide) - 1;
      onNavigate(isNaN(target) ? 0 : target);
      return;
    }

    if (el.type === "button") {
      e.stopPropagation();
      const action = String(el.action || "").toLowerCase().replace(/_/g, "-");

      switch (action) {
        case "next":
        case "next-slide":
        case "nextslide":
          onNavigate(currentSlideIndex + 1);
          return;

        case "prev":
        case "prev-slide":
        case "prevslide":
          onNavigate(currentSlideIndex - 1);
          return;

        case "first-slide":
        case "first":
          onNavigate(0);
          return;

        case "last-slide":
        case "last":
          onNavigate(Infinity);
          return;

        case "link":
          if (el.href) window.open(el.href, "_blank", "noopener,noreferrer");
          return;
      }
    }

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

  if (el.type === "code") {
    return <CodeElementRenderer element={el} baseStyle={baseStyle} />;
  }

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
        className="select-none leading-normal transition-all"
      >
        {el.text}
      </div>
    );
  }

  if (el.type === "shape" || el.type === "container" || el.type === "card") {
    const isGlass =
      el.isGlass ||
      el.glassEffect ||
      el.variant === "glass" ||
      el.fill === "glass" ||
      (typeof el.fill === "string" && el.fill.includes("rgba") && el.fill.endsWith(",0)"));

    const glassStyle = isGlass ? getLiquidGlassStyle(true) : {};

    return (
      <div
        style={{
          ...baseStyle,
          ...glassStyle,
          backgroundColor: isGlass ? undefined : el.fill || "#38bdf8",
          borderRadius: `${el.cornerRadius ?? 16}px`,
          borderWidth: isGlass ? undefined : `${el.strokeWidth ?? 0}px`,
          borderColor: isGlass ? undefined : el.stroke || "transparent",
          borderStyle: el.strokeStyle || "solid",
        }}
        onClick={handleClick}
        className="relative overflow-hidden transition-all duration-300"
      >
        {isGlass && (
          <div
            className="pointer-events-none absolute -inset-full bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-40 -rotate-45"
            aria-hidden="true"
          />
        )}
      </div>
    );
  }

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
        }}
        onClick={handleClick}
        className="select-none"
      />
    );
  }

  if (el.type === "button") {
    return (
      <button
        type="button"
        style={{
          ...baseStyle,
          borderRadius: `${el.cornerRadius ?? 12}px`,
          fontSize: `${el.fontSize ?? 14}px`,
          fontFamily: el.fontFamily,
        }}
        onClick={handleClick}
        className="flex cursor-pointer items-center justify-center font-semibold border border-white/20 bg-white/20 text-white shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_1px_rgba(255,255,255,0.4)] backdrop-blur-xl backdrop-saturate-150 transition-all hover:bg-white/30 hover:shadow-[0_12px_40px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.6)] active:scale-95"
      >
        <span>{el.text || "Click"}</span>
        {(el.action === "link" || el.href) && <ExternalLink className="ml-1.5 size-3.5 opacity-80" />}
      </button>
    );
  }

  if (el.type === "quiz") {
    return (
      <div
        style={baseStyle}
        className="flex flex-col justify-between rounded-3xl border border-white/25 bg-white/15 p-6 text-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.15),inset_0_1px_1px_rgba(255,255,255,0.5)] backdrop-blur-2xl backdrop-saturate-180"
      >
        <h4 className="text-base font-bold tracking-tight text-slate-900">{el.question}</h4>
        <div className="space-y-2.5">
          {el.options?.map((opt: any) => {
            const isChosen = quizSelection === opt.id;
            const isCorrect = opt.id === el.correctId;
            let optStyle =
              "border-white/25 bg-white/30 text-slate-800 hover:bg-white/45 hover:border-white/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)]";

            if (quizSelection !== null) {
              if (isCorrect)
                optStyle =
                  "border-emerald-400 bg-emerald-500/25 text-emerald-950 font-semibold shadow-[0_0_15px_rgba(16,185,129,0.3)]";
              else if (isChosen)
                optStyle =
                  "border-rose-400 bg-rose-500/25 text-rose-950 font-semibold shadow-[0_0_15px_rgba(244,63,94,0.3)]";
            }

            return (
              <button
                key={opt.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setQuizSelection(opt.id);
                }}
                className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left text-xs font-medium backdrop-blur-md transition-all active:scale-98 ${optStyle}`}
              >
                <span>{opt.text}</span>
                {quizSelection !== null && isCorrect && (
                  <CheckCircle2 className="size-4 text-emerald-600" />
                )}
                {quizSelection !== null && isChosen && !isCorrect && (
                  <XCircle className="size-4 text-rose-600" />
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

export default PresentationMode;
