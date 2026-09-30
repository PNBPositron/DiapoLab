import { useEffect, useRef, useState } from "react";
import { useEditor } from "@/store/editor";
import { CanvasElement } from "./CanvasElement";

export function Canvas() {
  const { elements, bgColor, select, guides, canvasW, canvasH, pages, currentIndex } = useEditor();
  const page = pages[currentIndex];
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const fit = () => {
      const el = wrapRef.current;
      if (!el) return;
      const padding = 80;
      const sx = (el.clientWidth - padding) / canvasW;
      const sy = (el.clientHeight - padding) / canvasH;
      setScale(Math.min(sx, sy, 1));
    };
    fit();
    const obs = new ResizeObserver(fit);
    if (wrapRef.current) obs.observe(wrapRef.current);
    return () => obs.disconnect();
  }, [canvasW, canvasH]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
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
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) select(null);
      }}
    >
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

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 brutal-border-2 bg-ink px-3 py-1.5 font-mono text-[10px] tracking-wider text-teal glow-teal">
        ◆ {Math.round(scale * 100)}% · {canvasW}×{canvasH}
      </div>
    </div>
  );
}
