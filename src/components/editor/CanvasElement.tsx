import { useRef, useState, useEffect } from "react";
import {
  useEditor,
  UI_STYLE_THEMES,
  type AnyElement,
  type ShapeElement,
  type QuizElement,
  type ChartElement,
  type ButtonElement,
  type ElementShadow,
  DEFAULT_FILTERS,
  type ImageFilters,
  type ShapeGradient,
} from "@/store/editor";
import { ShapeRender } from "./ShapeRender";
import { UiRender } from "./UiRender";
import * as LucideIcons from "lucide-react";
import { HelpCircle, Check, X as XIcon } from "lucide-react";

const filterCss = (f?: ImageFilters) => {
  const v = { ...DEFAULT_FILTERS, ...(f ?? {}) };
  return `brightness(${v.brightness}%) contrast(${v.contrast}%) saturate(${v.saturate}%) blur(${v.blur}px) grayscale(${v.grayscale}%) sepia(${v.sepia}%) hue-rotate(${v.hueRotate}deg) invert(${v.invert}%)`;
};

const shadowFilter = (s?: ElementShadow) =>
  s ? `drop-shadow(${s.x}px ${s.y}px ${s.blur}px ${s.color})` : "";

const gradientCss = (g: ShapeGradient) =>
  (g.type ?? "linear") === "radial"
    ? `radial-gradient(circle at 50% 50%, ${g.from}, ${g.to})`
    : `linear-gradient(${g.angle}deg, ${g.from}, ${g.to})`;

function shapeEffectStyle(el: ShapeElement): React.CSSProperties {
  const e = el.effect ?? "none";
  if (e === "liquid_glass") {
    return {
      backdropFilter: "blur(14px) saturate(160%)",
      WebkitBackdropFilter: "blur(14px) saturate(160%)",
      background:
        "linear-gradient(135deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.18) 100%)",
      boxShadow:
        "inset 1px 1px 1px rgba(255,255,255,0.55), inset -1px -1px 2px rgba(0,0,0,0.18), 0 18px 40px rgba(0,0,0,0.25)",
      borderRadius: el.shape === "circle" ? "50%" : 18,
      border: "1px solid rgba(255,255,255,0.45)",
    };
  }
  if (e === "neon") {
    return {
      filter: `drop-shadow(0 0 6px ${el.fill}) drop-shadow(0 0 18px ${el.fill}) drop-shadow(0 0 32px ${el.fill})`,
    };
  }
  if (e === "soft_shadow") {
    return { filter: "drop-shadow(0 18px 28px rgba(0,0,0,0.35))" };
  }
  if (e === "inner_glow") {
    return {
      boxShadow: `inset 0 0 40px ${el.fill}`,
      borderRadius: el.shape === "circle" ? "50%" : 12,
    };
  }
  return {};
}

type Handle = "nw" | "ne" | "sw" | "se";

export function CanvasElement({
  element,
  scale,
  morph = false,
}: {
  element: AnyElement;
  scale: number;
  /** when true the node tweens position/size between slides (morph transition) */
  morph?: boolean;
}) {
  const { selectedId, select, update, setCurrentPage } = useEditor();
  const selected = selectedId === element.id;
  const ref = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [hovered, setHovered] = useState(false);
  const interaction = element.interaction;
  const presenting = useEditor.getState().presenting;
  const activateInteraction = () => {
    if (!presenting || !interaction?.moveToSlide) return;
    setCurrentPage(Math.max(0, interaction.moveToSlide - 1));
  };

  const linkActive = element.type === "text" && !!element.href && useEditor.getState().presenting;

  const onDragStart = (e: React.MouseEvent) => {
    if (editing) return;
    if (useEditor.getState().presenting) return; // no selection/drag while presenting
    if (linkActive && !e.shiftKey) return; // let the <a> handle the click; shift+click selects
    e.stopPropagation();
    select(element.id);
    const startX = e.clientX;
    const startY = e.clientY;
    const ox = element.x;
    const oy = element.y;
    const st = useEditor.getState();
    const W = st.canvasW;
    const H = st.canvasH;
    const w = element.width;
    const h = element.height;
    // collect snap targets from other elements + canvas
    const others = st.elements.filter((o) => o.id !== element.id);
    const vTargets: number[] = [0, W / 2, W];
    const hTargets: number[] = [0, H / 2, H];
    for (const o of others) {
      vTargets.push(o.x, o.x + o.width / 2, o.x + o.width);
      hTargets.push(o.y, o.y + o.height / 2, o.y + o.height);
    }
    const THRESH = 6 / scale;
    const snap = (val: number, targets: number[]): { v: number; hit: number | null } => {
      let best: { v: number; hit: number | null; d: number } = { v: val, hit: null, d: THRESH };
      for (const t of targets) {
        const d = Math.abs(val - t);
        if (d < best.d) best = { v: t, hit: t, d };
      }
      return { v: best.v, hit: best.hit };
    };
    const onMove = (m: MouseEvent) => {
      let nx = ox + (m.clientX - startX) / scale;
      let ny = oy + (m.clientY - startY) / scale;
      // try snap on each anchor: left, center, right (vertical lines) and top, mid, bottom (horizontal)
      const vHits = new Set<number>();
      const hHits = new Set<number>();
      const candidates: Array<{ anchor: number; kind: "v" | "h" }> = [
        { anchor: nx, kind: "v" },
        { anchor: nx + w / 2, kind: "v" },
        { anchor: nx + w, kind: "v" },
        { anchor: ny, kind: "h" },
        { anchor: ny + h / 2, kind: "h" },
        { anchor: ny + h, kind: "h" },
      ];
      // x snap
      let xShift = 0;
      let xDist = THRESH;
      for (const c of candidates.filter((c) => c.kind === "v")) {
        const s = snap(c.anchor, vTargets);
        if (s.hit !== null) {
          const d = Math.abs(s.v - c.anchor);
          if (d < xDist) {
            xDist = d;
            xShift = s.v - c.anchor;
          }
        }
      }
      nx += xShift;
      let yShift = 0;
      let yDist = THRESH;
      for (const c of candidates.filter((c) => c.kind === "h")) {
        const s = snap(c.anchor, hTargets);
        if (s.hit !== null) {
          const d = Math.abs(s.v - c.anchor);
          if (d < yDist) {
            yDist = d;
            yShift = s.v - c.anchor;
          }
        }
      }
      ny += yShift;
      // collect active guide lines for rendering
      const anchorsAfter = [
        { v: nx, k: "v" as const },
        { v: nx + w / 2, k: "v" as const },
        { v: nx + w, k: "v" as const },
        { v: ny, k: "h" as const },
        { v: ny + h / 2, k: "h" as const },
        { v: ny + h, k: "h" as const },
      ];
      for (const a of anchorsAfter) {
        const targets = a.k === "v" ? vTargets : hTargets;
        for (const t of targets) {
          if (Math.abs(a.v - t) < 0.5) {
            if (a.k === "v") vHits.add(t);
            else hHits.add(t);
          }
        }
      }
      useEditor.getState().setGuides({ v: [...vHits], h: [...hHits] });
      update(element.id, { x: nx, y: ny });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      useEditor.getState().setGuides({ v: [], h: [] });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const onResizeStart = (handle: Handle) => (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const { x, y, width, height } = element;
    const onMove = (m: MouseEvent) => {
      const dx = (m.clientX - startX) / scale;
      const dy = (m.clientY - startY) / scale;
      let nx = x,
        ny = y,
        nw = width,
        nh = height;
      if (handle === "se") {
        nw = Math.max(20, width + dx);
        nh = Math.max(20, height + dy);
      }
      if (handle === "ne") {
        ny = y + dy;
        nh = Math.max(20, height - dy);
        nw = Math.max(20, width + dx);
      }
      if (handle === "sw") {
        nx = x + dx;
        nw = Math.max(20, width - dx);
        nh = Math.max(20, height + dy);
      }
      if (handle === "nw") {
        nx = x + dx;
        ny = y + dy;
        nw = Math.max(20, width - dx);
        nh = Math.max(20, height - dy);
      }
      update(element.id, { x: nx, y: ny, width: nw, height: nh });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  useEffect(() => {
    if (!selected) setEditing(false);
  }, [selected]);

  return (
    <div
      ref={ref}
      onMouseDown={onDragStart}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={activateInteraction}
      onDoubleClick={(e) => {
        if (element.type === "text") {
          e.stopPropagation();
          setEditing(true);
        }
      }}
      className={
        [
          presenting && element.animation && element.animation !== "none"
            ? `el-anim-${element.animation}`
            : "",
          hovered && interaction?.hoverEffect === "glitch" ? "el-hover-glitch" : "",
        ]
          .filter(Boolean)
          .join(" ") || undefined
      }
      style={{
        position: "absolute",
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        transform: `rotate(${element.rotation}deg)`,
        transition: morph
          ? "left 620ms cubic-bezier(0.22,1,0.36,1), top 620ms cubic-bezier(0.22,1,0.36,1), width 620ms cubic-bezier(0.22,1,0.36,1), height 620ms cubic-bezier(0.22,1,0.36,1), transform 620ms cubic-bezier(0.22,1,0.36,1), opacity 320ms ease"
          : undefined,
        cursor: editing ? "text" : "move",
        outline: selected ? "3px solid #2b6bff" : "none",
        outlineOffset: "2px",
        mixBlendMode: "blendMode" in element ? (element.blendMode ?? "normal") : "normal",
      }}
    >
      {element.type === "text" &&
        (() => {
          const presenting = useEditor.getState().presenting;
          const display =
            element.bullet && !editing
              ? (element.text || "")
                  .split("\n")
                  .map((l) => (l.trim() ? `• ${l}` : l))
                  .join("\n")
              : element.text;
          const isLink = !!element.href && presenting;
          const textStyle: React.CSSProperties = {
            width: "100%",
            height: "100%",
            fontSize: element.fontSize,
            color:
              element.gradient ||
              element.imageOverlay ||
              (hovered && interaction?.hoverEffect === "gradient" && interaction.hoverGradient)
                ? "transparent"
                : hovered && interaction?.hoverEffect === "color"
                  ? (interaction.hoverColor ?? element.color)
                  : element.color,
            backgroundImage: element.imageOverlay
              ? `url("${element.imageOverlay}")`
              : element.gradient
                ? gradientCss(element.gradient)
                : hovered && interaction?.hoverEffect === "gradient" && interaction.hoverGradient
                  ? gradientCss(interaction.hoverGradient)
                  : undefined,
            backgroundSize: element.imageOverlay ? "cover" : undefined,
            backgroundPosition: element.imageOverlay ? "center" : undefined,
            backgroundClip:
              element.gradient ||
              element.imageOverlay ||
              (hovered && interaction?.hoverEffect === "gradient" && interaction.hoverGradient)
                ? "text"
                : undefined,
            WebkitBackgroundClip:
              element.gradient ||
              element.imageOverlay ||
              (hovered && interaction?.hoverEffect === "gradient" && interaction.hoverGradient)
                ? "text"
                : undefined,
            WebkitTextFillColor:
              element.gradient ||
              element.imageOverlay ||
              (hovered && interaction?.hoverEffect === "gradient" && interaction.hoverGradient)
                ? "transparent"
                : undefined,
            fontWeight: element.fontWeight,
            fontFamily: element.fontFamily,
            textAlign: element.align,
            fontStyle: element.italic ? "italic" : "normal",
            textDecoration: element.underline || isLink ? "underline" : "none",
            outline: "none",
            lineHeight: element.lineHeight ?? 1.15,
            letterSpacing: `${element.letterSpacing ?? -0.02}em`,
            textTransform: element.textTransform ?? "none",
            opacity: element.opacity ?? 1,
            textShadow: element.shadow
              ? `${element.shadow.x}px ${element.shadow.y}px ${element.shadow.blur}px ${element.shadow.color}`
              : undefined,
            wordBreak: "break-word",
            whiteSpace: "pre-wrap",
            transition: morph
              ? "font-size 620ms cubic-bezier(0.22,1,0.36,1), color 620ms ease, letter-spacing 620ms ease, opacity 320ms ease"
              : undefined,
          };
          const inner = (
            <div
              contentEditable={editing}
              suppressContentEditableWarning
              onBlur={(e) => {
                update(element.id, { text: e.currentTarget.innerText || "" });
                setEditing(false);
              }}
              style={textStyle}
            >
              {display}
            </div>
          );
          if (isLink) {
            return (
              <a
                href={element.href}
                target="_blank"
                rel="noopener noreferrer"
                onMouseDown={(e) => e.stopPropagation()}
                style={{ display: "block", width: "100%", height: "100%", color: "inherit" }}
              >
                {inner}
              </a>
            );
          }
          return inner;
        })()}
      {element.type === "shape" &&
        (() => {
          const fx = shapeEffectStyle(element);
          const sFilter = shadowFilter(element.shadow);
          const isOverlay = element.effect === "liquid_glass" || element.effect === "inner_glow";
          return (
            <div
              style={{
                position: "absolute",
                inset: 0,
                ...fx,
                filter: [fx.filter, sFilter].filter(Boolean).join(" ") || undefined,
              }}
            >
              {!isOverlay && <ShapeRender element={element} />}
            </div>
          );
        })()}
      {element.type === "image" && (
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            borderRadius: element.cornerRadius ?? 0,
            overflow: "hidden",
            border:
              element.borderWidth && element.borderWidth > 0
                ? `${element.borderWidth}px solid ${element.borderColor ?? "#000000"}`
                : undefined,
            boxSizing: "border-box",
            opacity: element.opacity ?? 1,
          }}
        >
          {element.illustrationFormat === "svg" && element.tint ? (
            <div
              aria-hidden="true"
              style={{
                width: "100%",
                height: "100%",
                backgroundColor: element.tint,
                WebkitMaskImage: `url("${element.src}")`,
                maskImage: `url("${element.src}")`,
                WebkitMaskSize: element.fit === "contain" ? "contain" : "100% 100%",
                maskSize: element.fit === "contain" ? "contain" : "100% 100%",
                WebkitMaskPosition: "center",
                maskPosition: "center",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                transform: `scale(${element.flipX ? -1 : 1}, ${element.flipY ? -1 : 1})`,
                filter: [filterCss(element.filters), shadowFilter(element.shadow)]
                  .filter(Boolean)
                  .join(" "),
                opacity: element.opacity ?? 1,
              }}
            />
          ) : (
            <img
              src={element.src}
              alt=""
              onError={() => {
                if (element.illustrationFormat === "png" && element.src.endsWith(".png")) {
                  update(element.id, {
                    src: element.src.replace(/\.png$/i, ".svg"),
                    illustrationFormat: "svg",
                  });
                }
              }}
              draggable={false}
              style={{
                width: "100%",
                height: "100%",
                objectFit: element.fit ?? "cover",
                display: "block",
                transform: `scale(${element.flipX ? -1 : 1}, ${element.flipY ? -1 : 1})`,
                filter: [
                  element.assetKind === "icon" && element.tint ? `brightness(0) drop-shadow(0 0 0 ${element.tint})` : "",
                  filterCss(element.filters),
                  shadowFilter(element.shadow),
                ]
                  .filter(Boolean)
                  .join(" "),
              }}
            />
          )}
          {element.gradient && (
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                opacity: element.gradientOpacity ?? 0.5,
                background:
                  (element.gradient.type ?? "linear") === "radial"
                    ? `radial-gradient(circle at 50% 50%, ${element.gradient.from}, ${element.gradient.to})`
                    : `linear-gradient(${element.gradient.angle}deg, ${element.gradient.from}, ${element.gradient.to})`,
                // Clip the treatment to the source image alpha instead of tinting
                // the full rectangular image box.
                maskImage: `url("${element.src}")`,
                maskSize: "100% 100%",
                maskPosition: "center",
                maskRepeat: "no-repeat",
                WebkitMaskImage: `url("${element.src}")`,
                WebkitMaskSize: "100% 100%",
                WebkitMaskPosition: "center",
                WebkitMaskRepeat: "no-repeat",
                pointerEvents: "none",
              }}
            />
          )}
        </div>
      )}
      {element.type === "icon" &&
        (() => {
          if (element.src) {
            return <div aria-hidden="true" style={{ width: "100%", height: "100%", display: "block", backgroundColor: element.color, maskImage: `url("${element.src}")`, maskSize: "contain", maskPosition: "center", maskRepeat: "no-repeat", WebkitMaskImage: `url("${element.src}")`, WebkitMaskSize: "contain", WebkitMaskPosition: "center", WebkitMaskRepeat: "no-repeat", opacity: 1 }} />;
          }
          const Comp =
            (
              LucideIcons as unknown as Record<string, React.ComponentType<LucideIcons.LucideProps>>
            )[element.name] ?? HelpCircle;
          return (
            <Comp
              color={element.color}
              strokeWidth={element.strokeWidth}
              style={{ width: "100%", height: "100%", display: "block" }}
            />
          );
        })()}
      {element.type === "quiz" &&
        (() => {
          const presenting = useEditor.getState().presenting;
          return <QuizRender element={element} interactive={presenting} />;
        })()}

      {element.type === "chart" && <ChartRender element={element} />}
      {element.type === "ui" && <UiRender element={element} />}
      {element.type === "button" &&
        (() => {
          const presenting = useEditor.getState().presenting;
          return <ButtonRender element={element} interactive={presenting} />;
        })()}
      {element.type === "embed" &&
        (() => {
          const presenting = useEditor.getState().presenting;
          return (
            <div
              style={{ width: "100%", height: "100%", position: "relative", background: "#0a0f1f" }}
            >
              <iframe
                src={element.src}
                title={element.title || "Embed"}
                allow={element.allow}
                allowFullScreen
                style={{
                  width: "100%",
                  height: "100%",
                  border: 0,
                  display: "block",
                  background: "#000",
                }}
              />
              {!presenting && (
                <div
                  // Overlay lets the editor select/drag; iframe still visible but not interactive.
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "transparent",
                    cursor: "move",
                  }}
                />
              )}
            </div>
          );
        })()}

      {selected && !editing && (
        <>
          {(["nw", "ne", "sw", "se"] as Handle[]).map((h) => (
            <div
              key={h}
              onMouseDown={onResizeStart(h)}
              style={{
                position: "absolute",
                width: 18,
                height: 18,
                background: "#ffd84a",
                border: "3px solid #0a0f1f",
                ...(h.includes("n") ? { top: -10 } : { bottom: -10 }),
                ...(h.includes("w") ? { left: -10 } : { right: -10 }),
                cursor: `${h}-resize`,
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}

function QuizRender({ element, interactive }: { element: QuizElement; interactive: boolean }) {
  const [picked, setPicked] = useState<string | null>(null);
  const isPoll = element.mode === "poll";
  const [votes, setVotes] = useState<Record<string, number>>({});
  const chanRef = useRef<BroadcastChannel | null>(null);

  // Live poll sync: every open window on the same channel shares the tally.
  useEffect(() => {
    if (!isPoll || typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel(`poll-${element.liveKey ?? element.id}`);
    chanRef.current = ch;
    ch.onmessage = (ev: MessageEvent) => {
      const d = ev.data as { type: string; optionId?: string };
      if (d?.type === "vote" && d.optionId) {
        setVotes((v) => ({ ...v, [d.optionId!]: (v[d.optionId!] ?? 0) + 1 }));
      }
      if (d?.type === "reset") setVotes({});
    };
    return () => {
      ch.close();
      chanRef.current = null;
    };
  }, [isPoll, element.liveKey, element.id]);

  useEffect(() => {
    if (!interactive) {
      setPicked(null);
      setVotes({});
    }
  }, [interactive, element.id]);

  const total = Object.values(votes).reduce((a, b) => a + b, 0);
  const castVote = (optionId: string) => {
    if (!interactive || picked) return;
    setPicked(optionId);
    setVotes((v) => ({ ...v, [optionId]: (v[optionId] ?? 0) + 1 }));
    chanRef.current?.postMessage({ type: "vote", optionId });
  };
  const resetPoll = () => {
    setPicked(null);
    setVotes({});
    chanRef.current?.postMessage({ type: "reset" });
  };

  const glassStyle = element.effect === "liquid_glass" ? {
    backdropFilter: "blur(14px) saturate(160%)",
    WebkitBackdropFilter: "blur(14px) saturate(160%)",
    background: "linear-gradient(135deg, rgba(255,255,255,0.32), rgba(255,255,255,0.08))",
    boxShadow: "inset 1px 1px 1px rgba(255,255,255,0.55), 0 18px 40px rgba(0,0,0,0.22)",
  } : {};

  return (
    <div
      onMouseDown={(e) => interactive && e.stopPropagation()}
      style={{
        ...glassStyle,
        width: "100%",
        height: "100%",
        background: element.bgColor,
        color: element.fgColor,
        padding: "5%",
        display: "flex",
        flexDirection: "column",
        gap: "4%",
        border: `3px solid ${element.accentColor}`,
        borderRadius: 18,
        fontFamily: "Inter, system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      <div style={{ fontSize: "max(20px, 5%)", fontWeight: 800, lineHeight: 1.2 }}>
        {element.question}
      </div>
      {isPoll ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "3%", flex: 1 }}>
          {element.options.map((opt) => {
            const count = votes[opt.id] ?? 0;
            const pct = total ? Math.round((count / total) * 100) : 0;
            const mine = picked === opt.id;
            return (
              <button
                key={opt.id}
                disabled={!interactive || !!picked}
                onClick={() => castVote(opt.id)}
                style={{
                  position: "relative",
                  flex: 1,
                  overflow: "hidden",
                  background: "rgba(255,255,255,0.06)",
                  color: element.fgColor,
                  border: `2px solid ${mine ? element.accentColor : "rgba(255,255,255,0.18)"}`,
                  borderRadius: 12,
                  padding: "0 16px",
                  fontSize: "max(15px, 3%)",
                  fontWeight: 600,
                  textAlign: "left",
                  cursor: interactive && !picked ? "pointer" : "default",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: `${pct}%`,
                    background: element.accentColor,
                    opacity: 0.28,
                    transition: "width 420ms cubic-bezier(0.16,1,0.3,1)",
                  }}
                />
                <span style={{ position: "relative" }}>{opt.text}</span>
                <span style={{ position: "relative", fontVariantNumeric: "tabular-nums" }}>
                  {pct}% · {count}
                </span>
              </button>
            );
          })}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "max(12px, 2.2%)",
              opacity: 0.7,
            }}
          >
            <span>
              {total} vote{total === 1 ? "" : "s"} · live
            </span>
            {interactive && (
              <span onClick={resetPoll} style={{ cursor: "pointer", textDecoration: "underline" }}>
                reset
              </span>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "3%", flex: 1, gridTemplateColumns: "1fr 1fr" }}>
          {element.options.map((opt) => {
            const isPicked = picked === opt.id;
            const isCorrect = opt.id === element.correctId;
            const showResult = picked !== null;
            const bg = !showResult
              ? "rgba(255,255,255,0.06)"
              : isCorrect
                ? "#16a34a"
                : isPicked
                  ? "#dc2626"
                  : "rgba(255,255,255,0.04)";
            return (
              <button
                key={opt.id}
                disabled={!interactive || showResult}
                onClick={() => interactive && setPicked(opt.id)}
                style={{
                  background: bg,
                  color: element.fgColor,
                  border: `2px solid ${isPicked || (showResult && isCorrect) ? element.accentColor : "rgba(255,255,255,0.18)"}`,
                  borderRadius: 12,
                  padding: "0 16px",
                  fontSize: "max(16px, 3.2%)",
                  fontWeight: 600,
                  textAlign: "left",
                  cursor: interactive && !showResult ? "pointer" : "default",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  transition: "all 0.2s",
                }}
              >
                <span>{opt.text}</span>
                {showResult && isCorrect && <Check size={20} strokeWidth={3} />}
                {showResult && isPicked && !isCorrect && <XIcon size={20} strokeWidth={3} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChartRender({ element }: { element: ChartElement }) {
  const { chart, data, colors, bgColor, fgColor, title, showValues, showAxes } = element;
  const theme = element.uiStyle ? UI_STYLE_THEMES[element.uiStyle] : null;
  const fontFamily = theme ? theme.font : "Inter, sans-serif";
  const W = 400,
    H = 300;
  const padL = 50,
    padR = 20,
    padT = title ? 40 : 20,
    padB = 40;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const maxV = Math.max(1, ...data.map((d) => d.value));
  const stroke = fgColor + "40";
  const c = (i: number) => colors[i % Math.max(1, colors.length)] || "#7df9ff";

  const renderBars = () => {
    const bw = (plotW / data.length) * 0.7;
    const gap = (plotW / data.length) * 0.3;
    return data.map((d, i) => {
      const h = (d.value / maxV) * plotH;
      const x = padL + i * (bw + gap) + gap / 2;
      const y = padT + plotH - h;
      return (
        <g key={i}>
          <rect x={x} y={y} width={bw} height={h} fill={c(i)} />
          {showValues && (
            <text
              x={x + bw / 2}
              y={y - 4}
              textAnchor="middle"
              fill={fgColor}
              fontSize="10"
              fontFamily={fontFamily}
              fontWeight={700}
            >
              {d.value}
            </text>
          )}
          <text
            x={x + bw / 2}
            y={padT + plotH + 14}
            textAnchor="middle"
            fill={fgColor}
            fontSize="10"
            fontFamily={fontFamily}
          >
            {d.label}
          </text>
        </g>
      );
    });
  };

  const renderLineOrArea = (filled: boolean) => {
    if (data.length < 2) return null;
    const stepX = plotW / (data.length - 1);
    const pts = data.map(
      (d, i) => [padL + i * stepX, padT + plotH - (d.value / maxV) * plotH] as const,
    );
    const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
    const area = filled
      ? `${path} L${pts[pts.length - 1][0]},${padT + plotH} L${pts[0][0]},${padT + plotH} Z`
      : null;
    return (
      <g>
        {area && <path d={area} fill={c(0)} fillOpacity={0.25} />}
        <path
          d={path}
          fill="none"
          stroke={c(0)}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p[0]} cy={p[1]} r={3.5} fill={c(0)} stroke={bgColor} strokeWidth={1.5} />
            {showValues && (
              <text
                x={p[0]}
                y={p[1] - 8}
                textAnchor="middle"
                fill={fgColor}
                fontSize="10"
                fontFamily={fontFamily}
                fontWeight={700}
              >
                {data[i].value}
              </text>
            )}
            <text
              x={p[0]}
              y={padT + plotH + 14}
              textAnchor="middle"
              fill={fgColor}
              fontSize="10"
              fontFamily={fontFamily}
            >
              {data[i].label}
            </text>
          </g>
        ))}
      </g>
    );
  };

  const renderPie = (donut: boolean) => {
    const cx = W / 2,
      cy = padT + plotH / 2;
    const r = Math.min(plotW, plotH) / 2 - 10;
    const inner = donut ? r * 0.55 : 0;
    const total = data.reduce((a, b) => a + b.value, 0) || 1;
    let acc = -Math.PI / 2;
    return data.map((d, i) => {
      const ang = (d.value / total) * Math.PI * 2;
      const a1 = acc,
        a2 = acc + ang;
      acc = a2;
      const large = ang > Math.PI ? 1 : 0;
      const x1 = cx + r * Math.cos(a1),
        y1 = cy + r * Math.sin(a1);
      const x2 = cx + r * Math.cos(a2),
        y2 = cy + r * Math.sin(a2);
      let path: string;
      if (donut) {
        const xi1 = cx + inner * Math.cos(a1),
          yi1 = cy + inner * Math.sin(a1);
        const xi2 = cx + inner * Math.cos(a2),
          yi2 = cy + inner * Math.sin(a2);
        path = `M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} L${xi2},${yi2} A${inner},${inner} 0 ${large} 0 ${xi1},${yi1} Z`;
      } else {
        path = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`;
      }
      const mid = (a1 + a2) / 2;
      const lx = cx + (r + 12) * Math.cos(mid);
      const ly = cy + (r + 12) * Math.sin(mid);
      return (
        <g key={i}>
          <path d={path} fill={c(i)} stroke={bgColor} strokeWidth={1.5} />
          <text
            x={lx}
            y={ly}
            textAnchor={Math.cos(mid) > 0 ? "start" : "end"}
            fill={fgColor}
            fontSize="9"
            fontFamily={fontFamily}
            fontWeight={600}
          >
            {d.label}
            {showValues ? ` · ${d.value}` : ""}
          </text>
        </g>
      );
    });
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: bgColor,
        borderRadius: theme ? theme.radius : 12,
        border: theme ? `${theme.borderWidth}px solid ${theme.border}` : "none",
        boxShadow: theme ? theme.shadow : "none",
        backdropFilter: theme?.backdrop,
        overflow: "hidden",
        padding: "2%",
        boxSizing: "border-box",
      }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%">
        {title && (
          <text
            x={padL}
            y={22}
            fill={fgColor}
            fontSize="16"
            fontWeight={800}
            fontFamily={fontFamily}
          >
            {title}
          </text>
        )}
        {showAxes && chart !== "pie" && chart !== "donut" && (
          <g>
            <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke={stroke} strokeWidth={1} />
            <line
              x1={padL}
              y1={padT + plotH}
              x2={padL + plotW}
              y2={padT + plotH}
              stroke={stroke}
              strokeWidth={1}
            />
            {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
              <g key={i}>
                <line
                  x1={padL - 4}
                  y1={padT + plotH - t * plotH}
                  x2={padL}
                  y2={padT + plotH - t * plotH}
                  stroke={stroke}
                />
                <text
                  x={padL - 6}
                  y={padT + plotH - t * plotH + 3}
                  textAnchor="end"
                  fill={fgColor}
                  fontSize="9"
                  fontFamily={fontFamily}
                  opacity={0.7}
                >
                  {Math.round(maxV * t)}
                </text>
              </g>
            ))}
          </g>
        )}
        {chart === "bar" && renderBars()}
        {chart === "line" && renderLineOrArea(false)}
        {chart === "area" && renderLineOrArea(true)}
        {chart === "pie" && renderPie(false)}
        {chart === "donut" && renderPie(true)}
      </svg>
    </div>
  );
}

function ButtonRender({ element, interactive }: { element: ButtonElement; interactive: boolean }) {
  const { setCurrentPage, currentIndex, pages } = useEditor.getState();
  const onClick = () => {
    if (!interactive) return;
    switch (element.action) {
      case "next-slide":
        if (currentIndex < pages.length - 1) setCurrentPage(currentIndex + 1);
        break;
      case "prev-slide":
        if (currentIndex > 0) setCurrentPage(currentIndex - 1);
        break;
      case "first-slide":
        setCurrentPage(0);
        break;
      case "last-slide":
        setCurrentPage(pages.length - 1);
        break;
      case "link":
        if (element.href) window.open(element.href, "_blank", "noopener,noreferrer");
        break;
    }
  };
  return (
    <button
      onMouseDown={(e) => interactive && e.stopPropagation()}
      onClick={onClick}
      style={{
        width: "100%",
        height: "100%",
        background: element.bgColor,
        color: element.fgColor,
        border: `${element.borderWidth}px solid ${element.borderColor}`,
        borderRadius: element.cornerRadius,
        fontFamily: element.fontFamily,
        fontWeight: element.fontWeight,
        fontSize: element.fontSize,
        cursor: interactive ? "pointer" : "move",
        padding: 0,
        boxShadow: element.shadow
          ? `${element.shadow.x}px ${element.shadow.y}px ${element.shadow.blur}px ${element.shadow.color}`
          : undefined,
        transition: "transform 0.1s",
      }}
    >
      {element.text}
    </button>
  );
}
