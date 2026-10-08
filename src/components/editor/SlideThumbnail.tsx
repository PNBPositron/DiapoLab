import { useEffect, useRef, useState } from "react";
import type { Page } from "@/store/editor";
import { CanvasElement } from "./CanvasElement";

// Renders a single slide (page) scaled to fit a container. Read-only.
export function SlideThumbnail({
  page,
  canvasW,
  canvasH,
  className,
}: {
  page: Page;
  canvasW: number;
  canvasH: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      const sx = el.clientWidth / canvasW;
      const sy = el.clientHeight / canvasH;
      setScale(Math.min(sx, sy) || 0.1);
    };
    fit();
    const obs = new ResizeObserver(fit);
    obs.observe(el);
    return () => obs.disconnect();
  }, [canvasW, canvasH]);

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden ${className ?? ""}`}
      style={{ aspectRatio: `${canvasW} / ${canvasH}` }}
    >
      <div
        className="absolute left-0 top-0 pointer-events-none"
        style={{
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
        }}
      >
        {page.elements.map((el) => (
          <CanvasElement key={el.id} element={el} scale={scale} />
        ))}
      </div>
    </div>
  );
}
