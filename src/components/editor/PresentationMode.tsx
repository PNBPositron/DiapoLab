import { useEffect, useRef, useState } from "react";
import { useEditor } from "@/store/editor";
import { CanvasElement } from "./CanvasElement";

/**
 * TRUE MORPH (geometry-based)
 * ---------------------------
 * No DOM measurement. Outgoing elements' geometry (x/y/w/h) is recorded
 * by morph key before the slide changes; each incoming element then starts
 * at its counterpart's geometry (translate + scale, transform-origin top
 * left) and CSS-transitions to its natural position. Deterministic FLIP
 * from design data — immune to wrapper/DOM layout quirks.
 */

function computeMorphKeys(elements: readonly any[]): string[] {
  const seen: Record<string, number> = {};
  const used = new Set<string>();
  return elements.map((el) => {
    const e =
      el.type === "image"
        ? `i:${el.src.slice(-60)}`
        : el.type === "text" && el.text.trim()
          ? `t:${el.text.trim().slice(0, 60)}`
          : null;
    if (e && !used.has(e)) {
      used.add(e);
      return e;
    }
    const n = (seen[el.type] = (seen[el.type] ?? 0) + 1);
    const key = `${el.type}#${n}`;
    used.add(key);
    return key;
  });
}

type Geom = { x: number; y: number; w: number; h: number };

export function PresentationMode() {
  const { presenting, setPresenting, pages, currentIndex, setCurrentPage, canvasW, canvasH } =
    useEditor();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  // key -> geometry of the element on the OUTGOING slide
  const prevGeomRef = useRef<Map<string, Geom>>(new Map());

  const page = pages[currentIndex];

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
        if (i < ps.length - 1) snapshotAndGo(i + 1);
      }
      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        const { currentIndex: i } = useEditor.getState();
        if (i > 0) snapshotAndGo(i - 1);
      }
      if (/^[1-9]$/.test(e.key)) {
        const n = parseInt(e.key, 10) - 1;
        if (n < useEditor.getState().pages.length) snapshotAndGo(n);
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

  if (!presenting) return null;

  /** Record outgoing geometry BY KEY (only needed when navigating INTO a morph slide). */
  function snapshotAndGo(next: number) {
    const st = useEditor.getState();
    const outgoing = st.pages[st.currentIndex];
    const incoming = st.pages[next];
    if (incoming && incoming.transition === "morph") {
      const keys = computeMorphKeys(outgoing.elements);
      const map = new Map<string, Geom>();
      outgoing.elements.forEach((el, i) => {
        map.set(keys[i], { x: el.x, y: el.y, w: el.width, h: el.height });
      });
      prevGeomRef.current = map;
    }
    setCurrentPage(next);
  }

  const morphing = page.transition === "morph";
  const transition =
    page.transition && page.transition !== "none" && !morphing && page.transition !== "zoom"
      ? `slide-transition-${page.transition}`
      : "";
  const morphKeys = morphing ? computeMorphKeys(page.elements) : null;

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
            key={`slide-${currentIndex}`}
            onClick={() => currentIndex < pages.length - 1 && snapshotAndGo(currentIndex + 1)}
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
            {page.elements.map((el, i) =>
              morphing ? (
                <MorphItem key={morphKeys[i]} element={el} prevGeom={prevGeomRef.current.get(morphKeys[i])}>
                  <CanvasElement element={el} scale={scale} morph />
                </MorphItem>
              ) : (
                <CanvasElement key={el.id} element={el} scale={scale} />
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
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
  element: any;
  prevGeom?: Geom;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.style.transition = "none";
    if (prevGeom) {
      // FLIP from the outgoing element's box → incoming natural position.
      const dx = prevGeom.x - el.x;
      const dy = prevGeom.y - el.y;
      const sx = prevGeom.w / (el.width || 1);
      const sy = prevGeom.h / (el.height || 1);
      node.style.transformOrigin = "top left";
      node.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
      node.style.opacity = "1";
      void node.offsetWidth; // reflow
      node.style.transition = "transform 620ms cubic-bezier(0.22,1,0.36,1)";
      node.style.transform = "translate(0px, 0px) scale(1, 1)";
    } else {
      // New element — fade/scale in.
      node.style.transformOrigin = "center";
      node.style.transform = "scale(0.7)";
      node.style.opacity = "0";
      void node.offsetWidth;
      node.style.transition =
        "transform 620ms cubic-bezier(0.22,1,0.36,1), opacity 400ms ease";
      node.style.transform = "none";
      node.style.opacity = "1";
    }
  }, [el.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
        willChange: "transform, opacity",
      }}
    >
      {children}
    </div>
  );
}
