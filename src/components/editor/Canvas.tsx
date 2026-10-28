import { useEffect, useRef, useState } from "react";
import { useEditor, type ElementAnimation, type SlideTransition } from "@/store/editor";
import { CanvasElement } from "./CanvasElement";
import { ensureFontsForPages } from "@/lib/fontLoader";
import { Button } from "@/components/ui/button";
import { Minus, Plus, History, WandSparkles, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { OptionGrid, PanelHeader } from "./ui/selectors";
import { VersionHistoryDialog } from "./VersionHistoryDialog";
import {
  TRANSITION_OPTIONS,
  TRANSITION_ICONS,
  ELEMENT_ANIMATION_OPTIONS,
} from "@/lib/motion-catalog";

export function Canvas() {
  const {
    elements,
    bgColor,
    select,
    guides,
    canvasW,
    canvasH,
    pages,
    currentIndex,
    selectedId,
    update,
    setTransition,
    setTransitionZoom,
  } = useEditor();
  const page = pages[currentIndex];
  const currentTransition: SlideTransition = page.transition ?? "none";
  const currentZoom = page.transitionZoom ?? 0.5;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(0.5);
  const [zoom, setZoom] = useState<number | null>(null);
  const [hoveredTransition, setHoveredTransition] = useState<SlideTransition | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const scale = zoom ?? fitScale;
  const changeZoom = (value: number) => setZoom(Math.max(0.1, Math.min(3, value)));

  useEffect(() => {
    void ensureFontsForPages(
      pages.map((page) => ({
        elements: page.elements.filter(
          (element): element is Extract<typeof element, { fontFamily?: string }> =>
            "fontFamily" in element,
        ),
      })),
    );
  }, [pages]);

  useEffect(() => {
    const fit = () => {
      const el = wrapRef.current;
      if (!el) return;
      const padding = 80;
      const sx = (el.clientWidth - padding) / canvasW;
      const sy = (el.clientHeight - padding) / canvasH;
      setFitScale(Math.max(0.1, Math.min(sx, sy, 1)));
    };
    fit();
    const obs = new ResizeObserver(fit);
    if (wrapRef.current) obs.observe(wrapRef.current);
    return () => obs.disconnect();
  }, [canvasW, canvasH]);

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      if ((event.target as HTMLElement).closest('[contenteditable="true"]')) return;
      event.preventDefault();
      const delta =
        event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? node.clientHeight : 1);
      setZoom((value) =>
        Math.max(0.1, Math.min(3, (value ?? fitScale) * Math.exp(-delta * 0.002))),
      );
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [fitScale]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (useEditor.getState().presenting) return;
      if (t?.tagName === "INPUT" || t?.tagName === "TEXTAREA" || t?.isContentEditable) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        const st = useEditor.getState();
        if (st.selectedIds.length > 0 || st.selectedId) {
          e.preventDefault();
          st.removeSelected();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) useEditor.getState().redo();
        else useEditor.getState().undo();
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "c" || e.key === "C")) {
        const st = useEditor.getState();
        if (st.selectedId) {
          e.preventDefault();
          st.copySelected();
        }
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "v" || e.key === "V")) {
        e.preventDefault();
        useEditor.getState().paste();
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "d" || e.key === "D")) {
        const st = useEditor.getState();
        if (st.selectedIds.length > 0 || st.selectedId) {
          e.preventDefault();
          st.duplicateSelected();
        }
      }
      // Nudge: arrows = 1px, Shift+arrows = 10px
      if (e.key.startsWith("Arrow") && !e.altKey) {
        const st = useEditor.getState();
        const ids = st.selectedIds.length ? st.selectedIds : st.selectedId ? [st.selectedId] : [];
        if (!ids.length) return;
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        for (const id of ids) {
          const el = st.elements.find((o) => o.id === id);
          if (el) st.update(id, { x: el.x + dx, y: el.y + dy });
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full overflow-hidden"
      aria-label="Slide preview"
      onMouseDown={(e) => {
        if (!(e.target as HTMLElement).closest("[data-canvas-element]")) select(null);
      }}
    >
      <div className="absolute inset-0 overflow-auto pb-16">
        <div className="flex min-h-full min-w-full w-max items-center justify-center p-10">
          <div
            className="brutal-shadow-lg relative shrink-0"
            style={{ width: canvasW * scale, height: canvasH * scale }}
            onMouseDown={(e) => {
              if (!(e.target as HTMLElement).closest("[data-canvas-element]")) select(null);
            }}
          >
            <div
              id="canvas-export"
              className="absolute left-0 top-0 overflow-hidden border-[3px] border-ink"
              style={{
                width: canvasW,
                height: canvasH,
                backgroundColor: page.bgImage
                  ? bgColor
                  : bgColor.includes("gradient(")
                    ? undefined
                    : bgColor,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            >
              {page.bgImage ? (
                <img
                  src={page.bgImage}
                  alt=""
                  aria-hidden="true"
                  crossOrigin="anonymous"
                  className="pointer-events-none absolute inset-0 z-0 size-full"
                  style={{ objectFit: page.bgFit ?? "cover", objectPosition: "center" }}
                />
              ) : bgColor.includes("gradient(") ? (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-0"
                  style={{ background: bgColor }}
                />
              ) : null}
              <div className="relative z-10 size-full">
                {elements.map((el) => (
                  <CanvasElement key={el.id} element={el} scale={scale} />
                ))}
              </div>
              {(guides.v.length > 0 || guides.h.length > 0) && (
                <div className="pointer-events-none absolute inset-0 z-50">
                  {guides.v.map((x, i) => (
                    <div
                      key={`v${i}-${x}`}
                      style={{
                        position: "absolute",
                        left: x,
                        top: 0,
                        width: 1 / scale,
                        height: canvasH,
                        background: "#ff0080",
                        boxShadow: `0 0 ${4 / scale}px #ff0080`,
                      }}
                    />
                  ))}
                  {guides.h.map((y, i) => (
                    <div
                      key={`h${i}-${y}`}
                      style={{
                        position: "absolute",
                        top: y,
                        left: 0,
                        height: 1 / scale,
                        width: canvasW,
                        background: "#ff0080",
                        boxShadow: `0 0 ${4 / scale}px #ff0080`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="zoom-dock absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-2xl border border-white/70 bg-white/90 p-1.5 text-slate-700 shadow-[0_14px_34px_-16px_rgba(15,23,42,0.38),0_2px_8px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="Zoom out"
          aria-label="Zoom out"
          disabled={scale <= 0.1}
          onClick={() => changeZoom(scale - 0.1)}
        >
          <Minus />
        </Button>
        <output aria-label="Preview zoom" className="min-w-12 text-center font-mono text-xs">
          {Math.round(scale * 100)}%
        </output>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="Zoom in"
          aria-label="Zoom in"
          disabled={scale >= 3}
          onClick={() => changeZoom(scale + 0.1)}
        >
          <Plus />
        </Button>
        <span className="hidden px-2 font-mono text-[10px] text-muted-foreground sm:inline">
          {canvasW}×{canvasH}
        </span>
        <span className="px-2 font-mono text-[10px] text-slate-500">
          {currentIndex + 1} / {pages.length}
        </span>
        <span className="mx-0.5 h-5 w-px bg-slate-200" aria-hidden="true" />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="Slide version history"
          aria-label="Slide version history"
          onClick={() => setHistoryOpen(true)}
        >
          <History className="size-4" />
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              aria-label="Slide transition"
              title="Slide transition & animations"
              className="h-7 gap-1.5 px-2 text-[11px] capitalize text-slate-600"
            >
              <WandSparkles className="size-3.5" aria-hidden="true" />
              {currentTransition.replaceAll("-", " ")}
              <ChevronDown className="size-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="end"
            className="selector-panel space-y-3 rounded-xl p-3"
          >
            <PanelHeader title="Slide transition" />
            {selectedId && (
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-2.5">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[10px] font-semibold tracking-[0.12em] text-slate-500">Selected object motion</span>
                  <span className="text-[9px] text-slate-400">{elements.find((element) => element.id === selectedId)?.type ?? "object"}</span>
                </div>
                <OptionGrid
                  columns={3}
                  label="Object animations"
                  value={elements.find((element) => element.id === selectedId)?.animation ?? "none"}
                  onChange={(animation) => update(selectedId, { animation: animation as ElementAnimation })}
                  options={ELEMENT_ANIMATION_OPTIONS.map(({ value, short, icon }) => ({ value, label: short, icon }))}
                />
              </div>
            )}
            <div
              className="transition-mini"
              role="img"
              aria-label={`${hoveredTransition ?? currentTransition} transition preview`}
            >
              <div
                key={hoveredTransition ?? currentTransition}
                className="transition-mini-stage"
                data-transition={hoveredTransition ?? currentTransition}
              >
                <span className="transition-mini-mark" />
                <span className="transition-mini-line" />
                <span className="transition-mini-line" />
              </div>
            </div>
            <OptionGrid
              columns={3}
              label="Slide transitions"
              value={currentTransition}
              onChange={setTransition}
              onPreview={setHoveredTransition}
              options={TRANSITION_OPTIONS.map((value) => ({
                value,
                label: value.replaceAll("-", " "),
                icon: TRANSITION_ICONS[value],
              }))}
            />
          </PopoverContent>
        </Popover>
        {currentTransition === "zoom" && (
          <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/70 px-2.5 py-1 shadow-inner shadow-blue-100/60">
            <span className="text-[9px] font-semibold tracking-[0.12em] text-slate-500">Zoom</span>
            <input
              aria-label="Transition zoom"
              type="range"
              min={50}
              max={200}
              step={5}
              value={Math.round(currentZoom * 100)}
              onChange={(event) => setTransitionZoom(Number(event.target.value) / 100)}
              className="h-1.5 w-16 accent-blue-600"
            />
            <span className="min-w-[2.5rem] text-center font-mono text-[10px] font-medium text-slate-700">
              {Math.round(currentZoom * 100)}%
            </span>
          </div>
        )}

      </div>

      <VersionHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} />
    </div>
  );
}

