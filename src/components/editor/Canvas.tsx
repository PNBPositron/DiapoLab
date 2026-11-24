import { useEffect, useRef, useState } from "react";
import { useEditor, type ElementAnimation, type SlideTransition } from "@/store/editor";
import { CanvasElement } from "./CanvasElement";
import { ensureFontsForPages } from "@/lib/fontLoader";
import { Button } from "@/components/ui/button";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  BringToFront,
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  Copy,
  CopyPlus,
  Grid3x3,
  Group,
  History,
  Lock,
  Magnet,
  Minus,
  Monitor,
  MonitorOff,
  Palette,
  Plus,
  SendToBack,
  SlidersHorizontal,
  StickyNote,
  Trash2,
  Ungroup,
  Unlock,
  Volume2,
  VolumeX,
  WandSparkles,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { OptionGrid, PanelHeader } from "./ui/selectors";
import { VersionHistoryDialog } from "./VersionHistoryDialog";
import { ThreeSceneDialog } from "./ThreeSceneDialog";
import {
  TRANSITION_OPTIONS,
  TRANSITION_ICONS,
  ELEMENT_ANIMATION_OPTIONS,
  isThreeTransition,
  formatTransitionLabel,
} from "@/lib/motion-catalog";
import { resolveThreeScene } from "@/lib/three-scene";
import { ThreeTransitionStage } from "./ThreeTransitionStage";
import { useSettings } from "@/store/settings";
import { playTransitionSound } from "@/lib/transition-sound";

export function Canvas() {
  const {
    elements,
    bgColor,
    select,
    selectAll,
    guides,
    canvasW,
    canvasH,
    pages,
    currentIndex,
    selectedId,
    selectedIds,
    clipboard,
    update,
    setTransition,
    setNotes,
    snapping,
    toggleSnapping,
    copySelected,
    paste,
    duplicateSelected,
    removeSelected,
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
    groupSelected,
    ungroupSelected,
    alignSelected,
    toggleHideInPresent,
  } = useEditor();
  const page = pages[currentIndex];
  const currentTransition: SlideTransition = page.transition ?? "none";
  const wrapRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(0.5);
  const [zoom, setZoom] = useState<number | null>(null);
  const [hoveredTransition, setHoveredTransition] = useState<SlideTransition | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sceneEditorOpen, setSceneEditorOpen] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; hasTarget: boolean } | null>(null);
  const transitionSound = useSettings((s) => s.transitionSound);
  const setTransitionSound = useSettings((s) => s.setTransitionSound);
  const canvasGrid = useSettings((s) => s.canvasGrid);
  const toggleCanvasGrid = useSettings((s) => s.toggleCanvasGrid);
  const editorDark = useSettings((s) => s.editorDark);
  const activePreviewTransition = hoveredTransition ?? currentTransition;
  const isThreeActive = isThreeTransition(currentTransition);
  const isThreePreview = isThreeTransition(activePreviewTransition);
  const currentThreeScene = resolveThreeScene(page.threeScene);
  const scale = zoom ?? fitScale;
  const changeZoom = (value: number) => setZoom(Math.max(0.1, Math.min(3, value)));
  const notesText = page.notes ?? "";
  const notesWords = notesText.trim() ? notesText.trim().split(/\s+/).length : 0;

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
      // plain wheel scrolls the canvas; zoom only with Ctrl/Cmd + wheel
      if (!(event.ctrlKey || event.metaKey)) return;
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
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
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
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        useEditor.getState().selectAll();
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
        st.nudgeSelected(dx, dy);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener("mousedown", close);
    window.addEventListener("blur", close);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("blur", close);
    };
  }, [ctxMenu]);

  const activeEl = selectedId ? elements.find((e) => e.id === selectedId) : undefined;
  const selectedEls = elements.filter((e) => selectedIds.includes(e.id));
  const sharedGroupId = selectedEls[0]?.groupId;
  const isSelGrouped = Boolean(
    selectedEls.length > 1 && sharedGroupId && selectedEls.every((e) => e.groupId === sharedGroupId),
  );

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full overflow-hidden"
      aria-label="Slide preview"
      onMouseDown={(e) => {
        if (!(e.target as HTMLElement).closest("[data-canvas-element]")) select(null);
      }}
      onContextMenu={(e) => {
        if ((e.target as HTMLElement).closest('[contenteditable="true"]')) return;
        const elNode = (e.target as HTMLElement).closest<HTMLElement>("[data-canvas-element]");
        const elId = elNode?.dataset.elementId;
        if (elId && !selectedIds.includes(elId)) {
          select(elId);
        }
        e.preventDefault();
        const menuW = 224;
        const menuH = elId || selectedId ? 330 : 190;
        const x = Math.min(e.clientX, window.innerWidth - menuW - 12);
        const y = Math.min(e.clientY, window.innerHeight - menuH - 12);
        setCtxMenu({ x: Math.max(12, x), y: Math.max(12, y), hasTarget: Boolean(elId || selectedId) });
      }}
    >
      <div className="absolute inset-0 overflow-auto pb-16">
        <div className="flex min-h-full min-w-full w-max items-center justify-center p-10">
          <div
            className="relative shrink-0"
            style={{
              width: canvasW * scale,
              height: canvasH * scale,
              transition: "width 120ms ease-out, height 120ms ease-out",
            }}
            onMouseDown={(e) => {
              if (!(e.target as HTMLElement).closest("[data-canvas-element]")) select(null);
            }}
          >
            <div
              id="canvas-export"
              className="absolute left-0 top-0 overflow-hidden rounded-[24px] ring-1 ring-slate-200/80 shadow-[0_26px_64px_-16px_rgba(37,99,235,0.13),0_10px_28px_-8px_rgba(15,23,42,0.10)]"
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
              ) : (
                <div
                  aria-hidden="true"
                  className="editor-slide-dots pointer-events-none absolute inset-0 z-0"
                  style={{
                    backgroundImage: "radial-gradient(rgba(148, 163, 184, 0.28) 1.5px, transparent 1.5px)",
                    backgroundSize: "28px 28px",
                  }}
                />
              )}
              <div className="relative z-10 size-full">
                {elements
                  .filter((el) => !el.hidden)
                  .map((el) => (
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
            {/* Editor-only alignment grid overlay — kept outside #canvas-export so exports stay clean */}
            {canvasGrid && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-0 top-0 overflow-hidden rounded-[24px]"
                style={{
                  width: canvasW,
                  height: canvasH,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                  backgroundImage:
                    "linear-gradient(to right, rgba(37,99,235,0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(37,99,235,0.14) 1px, transparent 1px), linear-gradient(to right, rgba(148,163,184,0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.16) 1px, transparent 1px)",
                  backgroundSize: "160px 160px, 160px 160px, 40px 40px, 40px 40px",
                }}
              />
            )}
          </div>
        </div>
      </div>

      <div className="zoom-dock absolute bottom-4 left-1/2 z-10 flex h-10 -translate-x-1/2 items-center gap-1 rounded-full border border-white/95 bg-white/92 px-3 text-slate-700 shadow-[0_14px_34px_-10px_rgba(15,23,42,0.15),0_2px_8px_rgba(37,99,235,0.06)] backdrop-blur-xl">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full"
          title="Zoom out"
          aria-label="Zoom out"
          disabled={scale <= 0.1}
          onClick={() => changeZoom(scale - 0.1)}
        >
          <Minus className="size-3.5" />
        </Button>
        <button
          type="button"
          onClick={() => setZoom(null)}
          title="Fit to screen"
          aria-label="Fit to screen"
          className="min-w-11 whitespace-nowrap rounded-full px-2 py-1 text-center font-mono text-xs font-semibold tabular-nums text-slate-800 transition hover:bg-slate-100"
        >
          {Math.round(scale * 100)}%
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full"
          title="Zoom in"
          aria-label="Zoom in"
          disabled={scale >= 3}
          onClick={() => changeZoom(scale + 0.1)}
        >
          <Plus className="size-3.5" />
        </Button>
        <span className="hidden whitespace-nowrap px-2.5 font-mono text-[11px] tabular-nums text-slate-400 sm:inline">
          {canvasW}×{canvasH}
        </span>
        <span className="whitespace-nowrap px-2.5 font-mono text-[11px] font-medium tabular-nums text-slate-600">
          {currentIndex + 1} / {pages.length}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full"
          title={snapping ? "Snapping on (Alt to bypass while dragging)" : "Snapping off"}
          aria-label="Toggle snapping"
          aria-pressed={snapping}
          onClick={toggleSnapping}
        >
          <Magnet className={"size-4 " + (snapping ? "text-blue-600" : "text-slate-400")} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full"
          title={canvasGrid ? "Hide alignment grid" : "Show alignment grid"}
          aria-label="Toggle alignment grid"
          aria-pressed={canvasGrid}
          onClick={toggleCanvasGrid}
        >
          <Grid3x3 className={"size-4 " + (canvasGrid ? "text-blue-600" : "text-slate-400")} />
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="relative h-7 w-7 rounded-full"
              title="Speaker notes for this slide"
              aria-label="Speaker notes"
            >
              <StickyNote className={"size-4 " + (notesText.trim() ? "text-amber-500" : "text-slate-500")} />
              {notesText.trim() && (
                <span className="absolute right-1 top-1 size-1.5 rounded-full bg-amber-500" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="center"
            className={`w-80 rounded-2xl border p-3.5 shadow-2xl ${
              editorDark
                ? "border-slate-700 bg-slate-900 text-slate-100"
                : "border-slate-200 bg-white text-slate-900"
            }`}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold">
                <StickyNote className="size-3.5 text-amber-500" />
                Speaker notes · Slide #{currentIndex + 1}
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                {notesWords} {notesWords === 1 ? "word" : "words"}
                {notesWords > 0 ? ` · ~${Math.max(1, Math.round(notesWords / 2.2))}s` : ""}
              </span>
            </div>
            <textarea
              rows={4}
              value={notesText}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Write talking points shown in Presenter View (press P while presenting)..."
              className={`w-full resize-y rounded-xl border px-3 py-2 text-xs leading-relaxed outline-none transition focus:ring-2 focus:ring-blue-500/25 ${
                editorDark
                  ? "border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:border-blue-500"
                  : "border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white"
              }`}
            />
          </PopoverContent>
        </Popover>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full"
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
              className="h-7 gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-medium text-slate-700"
            >
              <WandSparkles className="size-3.5" aria-hidden="true" />
              {formatTransitionLabel(currentTransition)}
              <ChevronDown className="size-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="end"
            className="selector-panel space-y-3 rounded-3xl p-3.5"
          >
            <PanelHeader title="Slide transition">
              <button
                type="button"
                onClick={() => {
                  const next = !transitionSound;
                  setTransitionSound(next);
                  if (next) playTransitionSound({ force: true, isThreeD: isThreePreview });
                }}
                aria-pressed={transitionSound}
                title={transitionSound ? "Transition sound effects on" : "Transition sound effects off"}
                className={`flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium transition ${
                  transitionSound
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
                }`}
              >
                {transitionSound ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
                <span>{transitionSound ? "Sound on" : "Muted"}</span>
              </button>
            </PanelHeader>
            {selectedId && (
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-2.5">
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
              aria-label={`${formatTransitionLabel(activePreviewTransition)} transition preview`}
            >
              {isThreePreview ? (
                <ThreeTransitionStage
                  mode="mini"
                  transition={activePreviewTransition}
                  outgoingPage={pages.length > 1 ? pages[currentIndex > 0 ? currentIndex - 1 : 1] : undefined}
                  incomingPage={pages.length > 1 ? page : undefined}
                  canvasW={canvasW}
                  canvasH={canvasH}
                  playTrigger={0}
                  interactive
                  sceneConfig={page.threeScene}
                  className="h-full w-full"
                />
              ) : (
                <div
                  key={activePreviewTransition}
                  className="transition-mini-stage"
                  data-transition={activePreviewTransition}
                >
                  <span className="transition-mini-mark" />
                  <span className="transition-mini-line" />
                  <span className="transition-mini-line" />
                </div>
              )}
            </div>
            {isThreeActive && (
              <button
                type="button"
                onClick={() => setSceneEditorOpen(true)}
                className="flex w-full items-center justify-between rounded-2xl border border-blue-200/80 bg-blue-50/75 px-3 py-2 text-xs font-medium text-blue-700 transition hover:bg-blue-100/80"
              >
                <span className="flex items-center gap-2">
                  <SlidersHorizontal className="size-3.5" aria-hidden="true" />
                  <span>Edit 3D scene &amp; colors</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-[10px] capitalize opacity-75">{currentThreeScene.scenePreset}</span>
                  <span
                    className="size-3 rounded-full border border-white/70 shadow-xs"
                    style={{ backgroundColor: currentThreeScene.bgColor }}
                  />
                  <span
                    className="size-3 rounded-full border border-white/70 shadow-xs"
                    style={{ backgroundColor: currentThreeScene.accentColor }}
                  />
                </span>
              </button>
            )}
            <OptionGrid
              columns={3}
              label="Slide transitions"
              value={currentTransition}
              onChange={(next) => {
                setTransition(next);
                if (next !== "none") {
                  playTransitionSound({ isThreeD: isThreeTransition(next) });
                }
              }}
              onPreview={setHoveredTransition}
              options={TRANSITION_OPTIONS.map((value) => ({
                value,
                label: formatTransitionLabel(value),
                icon: TRANSITION_ICONS[value],
              }))}
            />
          </PopoverContent>
        </Popover>
        {isThreeActive && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setSceneEditorOpen(true)}
            aria-label="Edit 3D scene and colors"
            title="Edit 3D scene & colors"
            className="h-7 gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-medium text-blue-700"
          >
            <Palette className="size-3.5 text-blue-600" aria-hidden="true" />
            <span>3D Scene</span>
            <span
              className="size-2.5 rounded-full border border-white/70 shadow-xs"
              style={{ backgroundColor: currentThreeScene.accentColor }}
              aria-hidden="true"
            />
          </Button>
        )}

      </div>

      {ctxMenu && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
          className={`fixed z-[80] w-56 rounded-2xl border p-1.5 text-xs shadow-2xl ${
            editorDark
              ? "border-slate-700 bg-slate-900 text-slate-100"
              : "border-slate-200 bg-white text-slate-800"
          }`}
        >
          {ctxMenu.hasTarget && activeEl ? (
            <>
              <button
                type="button"
                onClick={() => {
                  duplicateSelected();
                  setCtxMenu(null);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left transition ${
                  editorDark ? "hover:bg-slate-800" : "hover:bg-slate-100"
                }`}
              >
                <span className="flex items-center gap-2">
                  <CopyPlus className="size-3.5 text-slate-400" />
                  Duplicate
                </span>
                <span className="font-mono text-[10px] text-slate-400">Ctrl+D</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  copySelected();
                  setCtxMenu(null);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left transition ${
                  editorDark ? "hover:bg-slate-800" : "hover:bg-slate-100"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Copy className="size-3.5 text-slate-400" />
                  Copy
                </span>
                <span className="font-mono text-[10px] text-slate-400">Ctrl+C</span>
              </button>
              {clipboard && (
                <button
                  type="button"
                  onClick={() => {
                    paste();
                    setCtxMenu(null);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left transition ${
                    editorDark ? "hover:bg-slate-800" : "hover:bg-slate-100"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <ClipboardPaste className="size-3.5 text-slate-400" />
                    Paste
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">Ctrl+V</span>
                </button>
              )}
              <div className={`my-1 h-px ${editorDark ? "bg-slate-800" : "bg-slate-100"}`} />
              <div className="px-2 py-1">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Align
                </div>
                <div className="grid grid-cols-6 gap-1">
                  {[
                    { mode: "left" as const, title: "Align left", Icon: AlignStartVertical },
                    { mode: "center-h" as const, title: "Center horizontally", Icon: AlignCenterVertical },
                    { mode: "right" as const, title: "Align right", Icon: AlignEndVertical },
                    { mode: "top" as const, title: "Align top", Icon: AlignStartHorizontal },
                    { mode: "middle" as const, title: "Center vertically", Icon: AlignCenterHorizontal },
                    { mode: "bottom" as const, title: "Align bottom", Icon: AlignEndHorizontal },
                  ].map(({ mode, title, Icon }) => (
                    <button
                      key={mode}
                      type="button"
                      title={title}
                      onClick={() => {
                        alignSelected(mode);
                        setCtxMenu(null);
                      }}
                      className={`grid size-7 place-items-center rounded-lg transition ${
                        editorDark ? "hover:bg-slate-800" : "hover:bg-slate-100"
                      }`}
                    >
                      <Icon className="size-3.5" />
                    </button>
                  ))}
                </div>
              </div>
              <div className={`my-1 h-px ${editorDark ? "bg-slate-800" : "bg-slate-100"}`} />
              <button
                type="button"
                onClick={() => {
                  bringToFront(activeEl.id);
                  setCtxMenu(null);
                }}
                className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left transition ${
                  editorDark ? "hover:bg-slate-800" : "hover:bg-slate-100"
                }`}
              >
                <BringToFront className="size-3.5 text-slate-400" />
                Bring to front
              </button>
              <button
                type="button"
                onClick={() => {
                  bringForward(activeEl.id);
                  setCtxMenu(null);
                }}
                className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left transition ${
                  editorDark ? "hover:bg-slate-800" : "hover:bg-slate-100"
                }`}
              >
                <ChevronUp className="size-3.5 text-slate-400" />
                Bring forward
              </button>
              <button
                type="button"
                onClick={() => {
                  sendBackward(activeEl.id);
                  setCtxMenu(null);
                }}
                className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left transition ${
                  editorDark ? "hover:bg-slate-800" : "hover:bg-slate-100"
                }`}
              >
                <ChevronDown className="size-3.5 text-slate-400" />
                Send backward
              </button>
              <button
                type="button"
                onClick={() => {
                  sendToBack(activeEl.id);
                  setCtxMenu(null);
                }}
                className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left transition ${
                  editorDark ? "hover:bg-slate-800" : "hover:bg-slate-100"
                }`}
              >
                <SendToBack className="size-3.5 text-slate-400" />
                Send to back
              </button>
              {selectedIds.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    if (isSelGrouped) ungroupSelected();
                    else groupSelected();
                    setCtxMenu(null);
                  }}
                  className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left transition ${
                    editorDark ? "hover:bg-slate-800" : "hover:bg-slate-100"
                  }`}
                >
                  {isSelGrouped ? (
                    <>
                      <Ungroup className="size-3.5 text-slate-400" />
                      Ungroup
                    </>
                  ) : (
                    <>
                      <Group className="size-3.5 text-slate-400" />
                      Group selection
                    </>
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  update(activeEl.id, { locked: !activeEl.locked } as never);
                  setCtxMenu(null);
                }}
                className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left transition ${
                  editorDark ? "hover:bg-slate-800" : "hover:bg-slate-100"
                }`}
              >
                {activeEl.locked ? (
                  <>
                    <Unlock className="size-3.5 text-slate-400" />
                    Unlock element
                  </>
                ) : (
                  <>
                    <Lock className="size-3.5 text-slate-400" />
                    Lock element
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  toggleHideInPresent(activeEl.id);
                  setCtxMenu(null);
                }}
                className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left transition ${
                  editorDark ? "hover:bg-slate-800" : "hover:bg-slate-100"
                }`}
              >
                {activeEl.hideInPresent ? (
                  <>
                    <Monitor className="size-3.5 text-amber-500" />
                    Show in present mode
                  </>
                ) : (
                  <>
                    <MonitorOff className="size-3.5 text-slate-400" />
                    Hide in present mode
                  </>
                )}
              </button>
              <div className={`my-1 h-px ${editorDark ? "bg-slate-800" : "bg-slate-100"}`} />
              <button
                type="button"
                onClick={() => {
                  removeSelected();
                  setCtxMenu(null);
                }}
                className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-rose-500 transition hover:bg-rose-500/10"
              >
                <span className="flex items-center gap-2">
                  <Trash2 className="size-3.5" />
                  Delete
                </span>
                <span className="font-mono text-[10px] opacity-70">Del</span>
              </button>
            </>
          ) : (
            <>
              {clipboard && (
                <button
                  type="button"
                  onClick={() => {
                    paste();
                    setCtxMenu(null);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left transition ${
                    editorDark ? "hover:bg-slate-800" : "hover:bg-slate-100"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <ClipboardPaste className="size-3.5 text-slate-400" />
                    Paste
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">Ctrl+V</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  selectAll();
                  setCtxMenu(null);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left transition ${
                  editorDark ? "hover:bg-slate-800" : "hover:bg-slate-100"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Group className="size-3.5 text-slate-400" />
                  Select all
                </span>
                <span className="font-mono text-[10px] text-slate-400">Ctrl+A</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  toggleCanvasGrid();
                  setCtxMenu(null);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left transition ${
                  editorDark ? "hover:bg-slate-800" : "hover:bg-slate-100"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Grid3x3 className="size-3.5 text-slate-400" />
                  {canvasGrid ? "Hide alignment grid" : "Show alignment grid"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  toggleSnapping();
                  setCtxMenu(null);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left transition ${
                  editorDark ? "hover:bg-slate-800" : "hover:bg-slate-100"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Magnet className="size-3.5 text-slate-400" />
                  {snapping ? "Disable snapping" : "Enable snapping"}
                </span>
              </button>
            </>
          )}
        </div>
      )}

      <VersionHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} />
      <ThreeSceneDialog open={sceneEditorOpen} onOpenChange={setSceneEditorOpen} />
    </div>
  );
}

