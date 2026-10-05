import { useEffect, useRef, useState } from "react";
import { useEditor } from "@/store/editor";
import { CanvasElement } from "./CanvasElement";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Scan } from "lucide-react";

export function Canvas() {
  const { elements, bgColor, select, guides, canvasW, canvasH, pages, currentIndex } = useEditor();
  const page = pages[currentIndex];
  const wrapRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(0.5);
  const [zoom, setZoom] = useState<number | null>(null);
  const scale = zoom ?? fitScale;
  const changeZoom = (value: number) => setZoom(Math.max(0.1, Math.min(3, value)));

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
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? node.clientHeight : 1);
      setZoom((value) => Math.max(0.1, Math.min(3, (value ?? fitScale) * Math.exp(-delta * 0.002))));
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
        if (e.target === e.currentTarget) select(null);
      }}
    >
      <div className="absolute inset-0 overflow-auto pb-16">
      <div className="flex min-h-full min-w-full w-max items-center justify-center p-10">
      <div
        className="brutal-shadow-lg relative shrink-0"
        style={{ width: canvasW * scale, height: canvasH * scale }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) select(null);
        }}
      >
        <div
          id="canvas-export"
          className="absolute left-0 top-0 overflow-hidden border-[3px] border-ink"
          style={{
            width: canvasW,
            height: canvasH,
            backgroundColor: bgColor.includes("gradient(") ? "#0a0f1f" : bgColor,
            backgroundImage: page.bgImage
              ? `url(${page.bgImage})`
              : bgColor.includes("gradient(")
                ? bgColor
                : undefined,
            backgroundSize: page.bgImage ? (page.bgFit ?? "cover") : "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {elements.map((el) => (
            <CanvasElement key={el.id} element={el} scale={scale} />
          ))}
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

      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-border bg-card p-1 text-card-foreground shadow-sm">
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Zoom out" aria-label="Zoom out" disabled={scale <= 0.1} onClick={() => changeZoom(scale - 0.1)}><Minus /></Button>
        <output aria-label="Preview zoom" className="min-w-12 text-center font-mono text-xs">{Math.round(scale * 100)}%</output>
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Zoom in" aria-label="Zoom in" disabled={scale >= 3} onClick={() => changeZoom(scale + 0.1)}><Plus /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Fit slide" aria-label="Fit slide" onClick={() => setZoom(null)}><Scan /></Button>
        <span className="hidden px-2 font-mono text-[10px] text-muted-foreground sm:inline">{canvasW}×{canvasH}</span>
      </div>
    </div>
  );
}
