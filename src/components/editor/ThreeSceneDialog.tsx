import { useState } from "react";
import { Box, Check, Layers, Rotate3d, RotateCcw, Shuffle, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEditor } from "@/store/editor";
import { useSettings } from "@/store/settings";
import {
  formatTransitionLabel,
  isThreeTransition,
  THREE_TRANSITIONS,
  type ThreeSlideTransition,
} from "@/lib/motion-catalog";
import {
  CURATED_COLOR_HARMONIES,
  DEFAULT_THREE_SCENE,
  getPresetSceneConfig,
  resolveThreeScene,
  THREE_COLOR_SWATCHES,
  THREE_SCENE_PRESETS,
  type ThreeScenePreset,
} from "@/lib/three-scene";
import type { StageCameraPreset } from "@/lib/three-stage";
import { ThreeTransitionStage } from "./ThreeTransitionStage";
import { ColorPickerPopover } from "./ColorPicker";
import { playTransitionSound } from "@/lib/transition-sound";

export function ThreeSceneDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    pages,
    currentIndex,
    canvasW,
    canvasH,
    setTransition,
    setThreeScene,
    applyThreeSceneToDeck,
  } = useEditor();
  const editorDark = useSettings((s) => s.editorDark);

  const page = pages[currentIndex];
  const prevPage = pages.length > 1 ? pages[currentIndex > 0 ? currentIndex - 1 : 1] : undefined;
  const activeTransition: ThreeSlideTransition = isThreeTransition(page?.transition)
    ? page.transition
    : "3d-cube";
  const scene = resolveThreeScene(page?.threeScene);

  const [replayCount, setReplayCount] = useState(0);
  const [cameraPreset, setCameraPreset] = useState<StageCameraPreset>("front");
  const [cameraSignal, setCameraSignal] = useState(0);
  const [harmonyIdx, setHarmonyIdx] = useState(0);
  const [appliedDeckNotice, setAppliedDeckNotice] = useState(false);

  const applyPreset = (presetId: ThreeScenePreset) => {
    setThreeScene(getPresetSceneConfig(presetId));
  };

  const shufflePalette = () => {
    const nextIdx = (harmonyIdx + 1) % CURATED_COLOR_HARMONIES.length;
    setHarmonyIdx(nextIdx);
    setThreeScene(CURATED_COLOR_HARMONIES[nextIdx]);
  };

  const handleCameraPreset = (preset: StageCameraPreset) => {
    setCameraPreset(preset);
    setCameraSignal((n) => n + 1);
  };

  const handleApplyToDeck = () => {
    applyThreeSceneToDeck();
    setAppliedDeckNotice(true);
    window.setTimeout(() => setAppliedDeckNotice(false), 1800);
  };

  const surfaceClass = editorDark
    ? "border-slate-700/80 bg-slate-900 text-slate-100"
    : "border-slate-200 bg-white text-slate-900";
  const subSurfaceClass = editorDark
    ? "border-slate-700/70 bg-slate-800/70 text-slate-200"
    : "border-slate-200/90 bg-slate-50/80 text-slate-700";
  const mutedText = editorDark ? "text-slate-400" : "text-slate-500";
  const labelText = editorDark ? "text-slate-300" : "text-slate-700";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`max-w-4xl overflow-hidden rounded-3xl p-0 shadow-[0_24px_64px_-16px_rgba(15,23,42,0.28)] sm:rounded-3xl ${surfaceClass}`}
      >
        <DialogHeader
          className={`border-b px-5 py-4 ${
            editorDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"
          }`}
        >
          <DialogTitle className="flex items-center justify-between gap-3 text-sm font-semibold">
            <span className="flex items-center gap-2.5">
              <span
                className={`grid size-8 place-items-center rounded-xl border ${
                  editorDark
                    ? "border-blue-500/30 bg-blue-500/15 text-blue-400"
                    : "border-blue-100 bg-blue-50 text-blue-600"
                }`}
              >
                <Box className="size-4" />
              </span>
              <span>
                3D Scene &amp; Colors
                <span className={`ml-2 text-xs font-normal ${mutedText}`}>
                  {formatTransitionLabel(activeTransition)} ·{" "}
                  {THREE_SCENE_PRESETS.find((p) => p.id === scene.scenePreset)?.label ?? "Custom"}
                </span>
              </span>
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid max-h-[80vh] gap-5 overflow-y-auto p-5 md:grid-cols-[1.06fr_1fr]">
          {/* Left column: live interactive 3D preview & transition selector */}
          <div className="flex flex-col gap-3">
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-700/40 bg-slate-950 shadow-inner">
              <ThreeTransitionStage
                mode="mini"
                transition={activeTransition}
                outgoingPage={prevPage}
                incomingPage={page}
                canvasW={canvasW}
                canvasH={canvasH}
                playTrigger={replayCount}
                interactive
                cameraPreset={cameraPreset}
                cameraPresetSignal={cameraSignal}
                sceneConfig={scene}
                className="h-full w-full"
              />
              <div className="pointer-events-none absolute left-2.5 top-2.5 rounded-full bg-slate-950/75 px-2.5 py-1 text-[10px] font-medium text-white/80">
                Drag to orbit · Scroll to zoom · Double-click to reset
              </div>

              {/* Camera angle inspection pills */}
              <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-full bg-slate-950/80 p-1 backdrop-blur-none">
                {(
                  [
                    { id: "front", label: "Front" },
                    { id: "hero", label: "Hero" },
                    { id: "low", label: "Low" },
                  ] as const
                ).map((cam) => (
                  <button
                    key={cam.id}
                    type="button"
                    onClick={() => handleCameraPreset(cam.id)}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition ${
                      cameraPreset === cam.id
                        ? "bg-white/20 text-white"
                        : "text-white/70 hover:text-white"
                    }`}
                  >
                    {cam.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setReplayCount((n) => n + 1);
                  playTransitionSound({ isThreeD: true });
                }}
                className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1.5 rounded-full bg-slate-950/85 px-3 py-1.5 text-[11px] font-medium text-white shadow-md transition hover:bg-blue-600"
              >
                <Rotate3d className="size-3.5" />
                Replay
              </button>
            </div>

            {/* 3D Transition style quick switcher */}
            <div className={`rounded-2xl border p-3 ${subSurfaceClass}`}>
              <div className="mb-2 flex items-center justify-between">
                <span className={`text-[11px] font-semibold ${labelText}`}>3D Motion Style</span>
                <span className={`text-[10px] tabular-nums ${mutedText}`}>
                  {scene.duration.toFixed(2)}s
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {THREE_TRANSITIONS.map((kind) => {
                  const active = activeTransition === kind;
                  return (
                    <button
                      key={kind}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        setTransition(kind);
                        setReplayCount((n) => n + 1);
                        playTransitionSound({ isThreeD: true });
                      }}
                      className={`rounded-xl border px-1.5 py-1.5 text-[10px] font-medium capitalize transition ${
                        active
                          ? "border-blue-500 bg-blue-600 text-white shadow-xs"
                          : editorDark
                            ? "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-600"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {kind.replace("3d-", "")}
                    </button>
                  );
                })}
              </div>

              {/* Transition speed / smoothness duration slider */}
              <div className="mt-3 flex items-center gap-3">
                <span className={`shrink-0 text-[11px] font-medium ${labelText}`}>Duration</span>
                <input
                  type="range"
                  min={0.6}
                  max={2.2}
                  step={0.05}
                  value={scene.duration}
                  onChange={(e) => setThreeScene({ duration: Number(e.target.value) })}
                  aria-label="3D transition duration"
                  className="h-1.5 flex-1 cursor-pointer accent-blue-600"
                />
                <span className={`w-10 text-right font-mono text-[11px] tabular-nums ${mutedText}`}>
                  {scene.duration.toFixed(2)}s
                </span>
              </div>
            </div>

            {/* Stage element toggles */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                aria-pressed={scene.showFloor}
                onClick={() => setThreeScene({ showFloor: !scene.showFloor })}
                className={`flex items-center justify-between rounded-2xl border px-3 py-2.5 text-xs font-medium transition ${
                  scene.showFloor
                    ? editorDark
                      ? "border-blue-500/60 bg-blue-500/15 text-blue-300"
                      : "border-blue-500 bg-blue-50/80 text-blue-700"
                    : subSurfaceClass
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Layers className="size-3.5" />
                  Stage floor
                </span>
                <span className="text-[10px] opacity-80">{scene.showFloor ? "On" : "Off"}</span>
              </button>

              <button
                type="button"
                aria-pressed={scene.showParticles}
                onClick={() => setThreeScene({ showParticles: !scene.showParticles })}
                className={`flex items-center justify-between rounded-2xl border px-3 py-2.5 text-xs font-medium transition ${
                  scene.showParticles
                    ? editorDark
                      ? "border-blue-500/60 bg-blue-500/15 text-blue-300"
                      : "border-blue-500 bg-blue-50/80 text-blue-700"
                    : subSurfaceClass
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles className="size-3.5" />
                  Floating prisms
                </span>
                <span className="text-[10px] opacity-80">
                  {scene.showParticles ? "On" : "Off"}
                </span>
              </button>
            </div>
          </div>

          {/* Right column: 10 scene environments & color customization */}
          <div className="flex flex-col gap-3.5">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className={`text-[11px] font-semibold ${labelText}`}>
                  Scene environment ({THREE_SCENE_PRESETS.length})
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {THREE_SCENE_PRESETS.map((preset) => {
                  const active = scene.scenePreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => applyPreset(preset.id)}
                      className={`flex items-center gap-2 rounded-2xl border p-2 text-left transition ${
                        active
                          ? editorDark
                            ? "border-blue-500 bg-blue-500/15 ring-1 ring-blue-500/30"
                            : "border-blue-500 bg-blue-50/70 ring-1 ring-blue-500/20"
                          : editorDark
                            ? "border-slate-700/80 bg-slate-800/60 hover:border-slate-600"
                            : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <span
                        className="relative grid size-7 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/20 shadow-xs"
                        style={{
                          background: `linear-gradient(160deg, ${preset.config.bgColor} 55%, ${preset.config.floorColor} 100%)`,
                        }}
                        aria-hidden="true"
                      >
                        <span
                          className="size-2.5 rounded-full ring-2 ring-white/45"
                          style={{ background: preset.config.accentColor }}
                        />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[11px] font-semibold">
                          {preset.label}
                        </span>
                        <span className={`block truncate text-[9.5px] ${mutedText}`}>
                          {preset.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color controls */}
            <div className={`space-y-2.5 rounded-2xl border p-3.5 ${subSurfaceClass}`}>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-semibold ${labelText}`}>Scene colors</span>
                <button
                  type="button"
                  onClick={shufflePalette}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition ${
                    editorDark
                      ? "border-slate-600 bg-slate-800 text-slate-200 hover:border-blue-400"
                      : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600"
                  }`}
                >
                  <Shuffle className="size-3" />
                  Shuffle
                </button>
              </div>
              <ColorField
                label="Backdrop"
                value={scene.bgColor}
                swatches={THREE_COLOR_SWATCHES.bg}
                onChange={(bgColor) => setThreeScene({ bgColor })}
                editorDark={editorDark}
              />
              <ColorField
                label="Accent & glow"
                value={scene.accentColor}
                swatches={THREE_COLOR_SWATCHES.accent}
                onChange={(accentColor) => setThreeScene({ accentColor })}
                editorDark={editorDark}
              />
              <ColorField
                label="3D frame"
                value={scene.frameColor}
                swatches={THREE_COLOR_SWATCHES.frame}
                onChange={(frameColor) => setThreeScene({ frameColor })}
                editorDark={editorDark}
              />
              {scene.showFloor && (
                <ColorField
                  label="Stage floor"
                  value={scene.floorColor}
                  swatches={THREE_COLOR_SWATCHES.floor}
                  onChange={(floorColor) => setThreeScene({ floorColor })}
                  editorDark={editorDark}
                />
              )}
            </div>
          </div>
        </div>

        <div
          className={`flex flex-wrap items-center justify-between gap-2 border-t px-5 py-3.5 ${
            editorDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-slate-50/70"
          }`}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setThreeScene(DEFAULT_THREE_SCENE)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                editorDark
                  ? "border-slate-700 text-slate-300 hover:bg-slate-800"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              <RotateCcw className="size-3.5" />
              Reset default
            </button>
            {pages.length > 1 && (
              <button
                type="button"
                onClick={handleApplyToDeck}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  appliedDeckNotice
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-600"
                    : editorDark
                      ? "border-slate-700 text-slate-200 hover:bg-slate-800"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                {appliedDeckNotice && <Check className="size-3.5" />}
                <span>{appliedDeckNotice ? "Applied to all slides" : "Apply to all slides"}</span>
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full bg-blue-600 px-5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Done
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ColorField({
  label,
  value,
  swatches,
  onChange,
  editorDark,
}: {
  label: string;
  value: string;
  swatches: string[];
  onChange: (hex: string) => void;
  editorDark: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <span
          className={`block text-[11px] font-medium ${editorDark ? "text-slate-200" : "text-slate-700"}`}
        >
          {label}
        </span>
        <span className="font-mono text-[10px] uppercase text-slate-400">{value}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1">
          {swatches.map((hex) => {
            const active = hex.toLowerCase() === value.toLowerCase();
            return (
              <button
                key={hex}
                type="button"
                aria-label={`${label} color ${hex}`}
                title={hex}
                onClick={() => onChange(hex)}
                className={`size-4 rounded-full border transition ${
                  active
                    ? "scale-110 border-blue-500 ring-2 ring-blue-500/35"
                    : "border-slate-400/40 hover:scale-110"
                }`}
                style={{ backgroundColor: hex }}
              />
            );
          })}
        </div>
        <ColorPickerPopover
          value={value}
          onChange={onChange}
          swatches={swatches}
          dark={editorDark}
          align="end"
        >
          <button
            type="button"
            title={`Custom ${label.toLowerCase()} color`}
            aria-label={`Custom ${label} color`}
            className={`ml-1 grid size-6 cursor-pointer place-items-center rounded-full border transition hover:scale-105 ${
              editorDark ? "border-slate-600" : "border-slate-300"
            }`}
            style={{ backgroundColor: value }}
          />
        </ColorPickerPopover>
      </div>
    </div>
  );
}
