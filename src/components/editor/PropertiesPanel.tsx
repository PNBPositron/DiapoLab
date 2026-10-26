import React, { useEffect, useState } from "react";
import {
  useEditor,
  DEFAULT_FILTERS,
  UI_STYLE_THEMES,
  chartStylePatch,
  quizStylePatch,
  type ImageFilters,
  type ElementShadow,
  type ShapeElement,
  type ShapeGradient,
  type HoverEffect,
  type QuizElement,
  type QuizOption,
  type ChartElement,
  type ButtonElement,
  type ChartKind,
  type ButtonAction,
  type UiStyle,
} from "@/store/editor";
import { prepareImage } from "@/lib/image-assets";
import { ELEMENT_ANIMATION_LABELS } from "@/lib/motion-catalog";
import { ColorPicker } from "./ColorPicker";
import { Dropdown } from "./ui/Dropdown";
import {
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  RotateCcw,
  Plus,
  Check,
  Upload,
  MoreHorizontal,
  Palette,
  WandSparkles,
  ChevronDown,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Italic,
  Underline,
  Bold,
  List,
  Sparkles,
  Link2,
  Sliders,
  Type,
  Maximize2,
  Eye,
  EyeOff,
  X,
  ChartColumn, ChartLine, ChartArea, ChartPie, Circle, FlipHorizontal, FlipVertical, MousePointer2, Hash, Crop, SlidersHorizontal,
} from "lucide-react";
import { FONTS } from "./panels/TextPanel";
import { OptionGrid, SegmentedControl, ToggleGrid, PanelHeader } from "./ui/selectors";
import { Button } from "@/components/ui/button";
import { pathFor } from "./ShapeRender";

const FONT_FAMILIES: string[] = Array.from(
  new Set(["Inter", "Orbitron", "JetBrains Mono", "Georgia", ...FONTS.map((f) => f.family)])
).sort();

const MASK_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "None" },
  { value: "circle", label: "Circle" },
  { value: "hexagon", label: "Hexagon" },
  { value: "pentagon", label: "Pentagon" },
  { value: "octagon", label: "Octagon" },
  { value: "triangle", label: "Triangle" },
  { value: "diamond", label: "Diamond" },
  { value: "star", label: "Star" },
  { value: "heart", label: "Heart" },
  { value: "blob", label: "Blob" },
  { value: "moon", label: "Moon" },
  { value: "leaf", label: "Leaf" },
  { value: "shield", label: "Shield" },
  { value: "capsule", label: "Capsule" },
  { value: "wave", label: "Wave" },
  { value: "cloud", label: "Cloud" },
];

/** Visual grid picker for image/shape/text masks — real SVG previews per shape. */
function MaskPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-6 gap-1.5">
      {MASK_OPTIONS.map((opt) => {
        const active = value === opt.value;
        const d = opt.value ? pathFor(opt.value as never) : null;
        const fill = active ? "#0284c7" : "#475569";
        return (
          <button
            key={opt.label}
            type="button"
            title={opt.label}
            aria-label={"Shape mask: " + opt.label}
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={
              "grid aspect-square place-items-center rounded-lg border transition " +
              (active
                ? "border-sky-500 bg-sky-50/60 ring-2 ring-sky-500/20"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50")
            }
          >
            {!opt.value ? (
              <svg viewBox="0 0 100 100" className="size-5" aria-hidden="true">
                <rect x="10" y="10" width="80" height="80" rx="10" fill="none" stroke="#94a3b8" strokeWidth="7" strokeDasharray="12 10" />
              </svg>
            ) : d ? (
              <svg viewBox="0 0 100 100" className="size-5" aria-hidden="true">
                <path d={d} fill={fill} />
              </svg>
            ) : opt.value === "circle" ? (
              <svg viewBox="0 0 100 100" className="size-5" aria-hidden="true">
                <circle cx="50" cy="50" r="46" fill={fill} />
              </svg>
            ) : opt.value === "triangle" ? (
              <svg viewBox="0 0 100 100" className="size-5" aria-hidden="true">
                <polygon points="50,4 96,96 4,96" fill={fill} />
              </svg>
            ) : (
              <svg viewBox="0 0 100 100" className="size-5" aria-hidden="true">
                <polygon points="50,3 61,35 98,35 68,57 79,97 50,73 21,97 32,57 2,35 39,35" fill={fill} />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}

const SHAPE_EFFECTS: Array<{ value: ShapeElement["effect"]; label: string }> = [
  { value: "none", label: "None" },
  { value: "liquid_glass", label: "Liquid Glass" },
  { value: "neon", label: "Neon" },
  { value: "soft_shadow", label: "Soft Shadow" },
  { value: "inner_glow", label: "Inner Glow" },
];

const IMAGE_FILTER_PRESETS: Array<{
  name: string;
  description: string;
  filters: ImageFilters;
  preview: string;
}> = [
  { name: "Original", description: "Clean", filters: { ...DEFAULT_FILTERS }, preview: "none" },
  {
    name: "Noir",
    description: "High contrast",
    filters: { ...DEFAULT_FILTERS, grayscale: 100, contrast: 135, brightness: 92 },
    preview: "grayscale(1) contrast(1.35) brightness(.92)",
  },
  {
    name: "Vintage",
    description: "Warm film",
    filters: { ...DEFAULT_FILTERS, sepia: 42, contrast: 108, saturate: 82, brightness: 104 },
    preview: "sepia(.42) contrast(1.08) saturate(.82) brightness(1.04)",
  },
  {
    name: "Faded",
    description: "Soft light",
    filters: { ...DEFAULT_FILTERS, contrast: 82, saturate: 70, brightness: 116 },
    preview: "contrast(.82) saturate(.7) brightness(1.16)",
  },
  {
    name: "Crisp",
    description: "Punchy detail",
    filters: { ...DEFAULT_FILTERS, contrast: 132, saturate: 122, brightness: 98 },
    preview: "contrast(1.32) saturate(1.22) brightness(.98)",
  },
  {
    name: "Cool",
    description: "Blue mood",
    filters: { ...DEFAULT_FILTERS, hueRotate: 18, saturate: 112, contrast: 108 },
    preview: "hue-rotate(18deg) saturate(1.12) contrast(1.08)",
  },
  {
    name: "Sunset",
    description: "Warm glow",
    filters: { ...DEFAULT_FILTERS, sepia: 24, hueRotate: -12, saturate: 135, brightness: 106 },
    preview: "sepia(.24) hue-rotate(-12deg) saturate(1.35) brightness(1.06)",
  },
  {
    name: "Dream",
    description: "Soft blur",
    filters: { ...DEFAULT_FILTERS, blur: 0.7, contrast: 88, saturate: 118, brightness: 110 },
    preview: "blur(.7px) contrast(.88) saturate(1.18) brightness(1.1)",
  },
  { name: "Glitch", description: "RGB split & distort", filters: { ...DEFAULT_FILTERS, glitch: 55 }, preview: "none" },
  { name: "Pixelate", description: "8-bit mosaic", filters: { ...DEFAULT_FILTERS, pixelate: 10 }, preview: "none" },
  { name: "Posterize", description: "Flat color bands", filters: { ...DEFAULT_FILTERS, posterize: 5 }, preview: "none" },
  { name: "VHS", description: "Retro tape", filters: { ...DEFAULT_FILTERS, glitch: 35, saturate: 135, contrast: 112, hueRotate: -8 }, preview: "saturate(1.35) contrast(1.12) hue-rotate(-8deg)" },
  { name: "Gameboy", description: "Dotted handheld", filters: { ...DEFAULT_FILTERS, pixelate: 12, grayscale: 100, contrast: 145, brightness: 105 }, preview: "grayscale(1) contrast(1.45) brightness(1.05)" },
];

const SWATCHES = [
  "#000000",
  "#ffffff",
  "#0ea5e9",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#10b981",
  "#06b6d4",
  "#64748b",
];

// --- MODERN UI PRIMITIVES ---

function Section({
  title,
  defaultOpen = true,
  badge,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="inspector-section border-b border-selector-border pb-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-3.5 py-2.5 text-left transition hover:bg-slate-50/80"
      >
        <span className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-slate-700 uppercase">
          {title}
        </span>
        <div className="flex items-center gap-2">
          {badge}
          <ChevronDown
            className={`size-3.5 text-slate-400 transition-transform duration-200 ${
              open ? "rotate-180 text-slate-600" : ""
            }`}
          />
        </div>
      </button>
      {open && <div className="space-y-3.5 border-t border-slate-100 p-3.5">{children}</div>}
    </div>
  );
}

function Field({
  label,
  children,
  inline = false,
}: {
  label: string;
  children: React.ReactNode;
  inline?: boolean;
}) {
  if (inline) {
    return (
      <div className="flex items-center justify-between gap-3">
        <label className="text-[11px] font-medium text-slate-600">{label}</label>
        <div className="flex items-center">{children}</div>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium text-slate-600">{label}</label>
      <div>{children}</div>
    </div>
  );
}

function SliderWithInput({
  label,
  min,
  max,
  step = 1,
  value,
  unit = "",
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  unit?: string;
  onChange: (val: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-medium text-slate-600">{label}</span>
        <div className="flex items-center rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-700 shadow-2xs">
          <span>{value}</span>
          <span className="ml-0.5 text-slate-400">{unit}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(+e.target.value)}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-sky-600 transition hover:bg-slate-300"
        />
      </div>
    </div>
  );
}

function ModernColorPicker({
  value,
  onChange,
  label,
  opacity,
  onOpacityChange,
}: {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  opacity?: number;
  onOpacityChange?: (v: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasOpacity = opacity !== undefined && !!onOpacityChange;
  return (
    <div className="space-y-2">
      {label && <label className="text-[11px] font-medium text-slate-600">{label}</label>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`size-8 shrink-0 rounded-lg border shadow-2xs transition ${
            open ? "border-sky-500 ring-2 ring-sky-500/20" : "border-slate-200 hover:border-sky-400"
          }`}
          style={{ backgroundColor: value || "#000000", opacity: opacity ?? 1 }}
          title="Open color picker"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="h-8 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 font-mono text-xs text-slate-800 uppercase shadow-2xs focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
        />
        {hasOpacity && (
          <div className="flex items-center rounded-md border border-slate-200 bg-white px-1.5 py-1 font-mono text-[10px] text-slate-700 shadow-2xs">
            <input
              type="number"
              min={0}
              max={100}
              value={Math.round((opacity ?? 1) * 100)}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (Number.isFinite(val))
                  onOpacityChange!(Math.min(1, Math.max(0, val / 100)));
              }}
              className="w-9 border-0 bg-transparent text-center outline-none"
            />
            <span className="text-slate-400">%</span>
          </div>
        )}
      </div>
      {open && (
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
          <ColorPicker
            value={value}
            onChange={onChange}
            opacity={opacity}
            onOpacityChange={onOpacityChange}
          />
          <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2.5">
            {SWATCHES.map((swatch) => (
              <button
                key={swatch}
                type="button"
                onClick={() => onChange(swatch)}
                className={`size-5 rounded-full border border-slate-200/80 transition-transform hover:scale-115 ${
                  value.toLowerCase() === swatch.toLowerCase()
                    ? "scale-110 ring-2 ring-sky-500 ring-offset-1"
                    : ""
                }`}
                style={{ backgroundColor: swatch }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- MAIN PROPERTIES COMPONENT ---

export function PropertiesPanel() {
  const { elements, selectedId, update, remove, duplicate, bringForward, sendBackward } =
    useEditor();
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [colorPaletteOpen, setColorPaletteOpen] = useState(false);
  const [imageFilterOpen, setImageFilterOpen] = useState(false);
  const [jsonDraft, setJsonDraft] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [jsonDirty, setJsonDirty] = useState(false);

  const el = elements.find((e) => e.id === selectedId);

    // Reset popovers + JSON draft ONLY when the selection changes — not on
  // every property edit. Reading the element via getState() avoids putting
  // `el` in the deps (a new object reference on each update would re-run
  // this effect and collapse the inspector while editing).
  useEffect(() => {
    setAdvancedOpen(false);
    setColorPaletteOpen(false);
    setImageFilterOpen(false);
    setJsonError(null);
    const current = useEditor.getState().elements.find((e) => e.id === selectedId);
    setJsonDraft(current ? JSON.stringify(current, null, 2) : "");
    setJsonDirty(false);
  }, [selectedId]);

  // Keep the JSON draft in sync while the user is not editing it, so changes
  // made from the regular controls also show up in the JSON view.
  useEffect(() => {
    if (jsonDirty || !el) return;
    const next = JSON.stringify(el, null, 2);
    setJsonDraft((draft) => (draft === next ? draft : next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [el, jsonDirty]);
  
  if (!el) return null;

  // ---- Element JSON: explicit apply instead of per-keystroke updates ----
  const applyJson = () => {
    try {
      const parsed = JSON.parse(jsonDraft) as Record<string, unknown>;
      if (typeof parsed !== "object" || parsed === null) throw new Error("Expected a JSON object");
      if (parsed.id !== el.id || parsed.type !== el.type) throw new Error("id and type cannot be changed");
      const { id: _id, type: _type, ...patch } = parsed;
      update(el.id, patch as Partial<typeof el>);
      setJsonError(null);
      setJsonDirty(false);
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : "Invalid JSON");
    }
  };
  const formatJson = () => {
    try {
      setJsonDraft(JSON.stringify(JSON.parse(jsonDraft), null, 2));
      setJsonError(null);
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : "Invalid JSON");
    }
  };
  const resetJson = () => {
    setJsonDraft(JSON.stringify(el, null, 2));
    setJsonDirty(false);
    setJsonError(null);
  };

  // Quick Bar (floating, contextual & immediate)
  const floatingHUD = (
    <div className="pointer-events-none fixed left-1/2 top-4 z-40 -translate-x-1/2 animate-in slide-in-from-top-2 duration-200">
      <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-white/70 bg-white/85 p-1.5 shadow-[0_20px_50px_rgba(15,23,42,0.18),0_0_0_1px_rgba(15,23,42,0.06)] ring-1 ring-slate-900/5 backdrop-blur-2xl">
        {/* Type badge */}
        <div className="flex items-center gap-1.5 rounded-full bg-slate-900/95 px-3 py-1.5 shadow-sm">
          <span className="size-1.5 rounded-full bg-sky-400" />
          <span className="text-[10px] font-bold tracking-wider text-white uppercase">
            {el.type}
          </span>
        </div>

        {el.type === "text" && (
          <>
            {/* Color */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setColorPaletteOpen(!colorPaletteOpen)}
                className={`grid size-8 place-items-center rounded-lg transition hover:bg-slate-100 ${
                  colorPaletteOpen ? "bg-slate-100 ring-2 ring-sky-500/20" : ""
                }`}
                title="Text color"
              >
                <div
                  className="size-4 rounded-full border border-slate-300 shadow-xs"
                  style={{ backgroundColor: el.color, opacity: el.opacity ?? 1 }}
                />
              </button>
              {colorPaletteOpen && (
                <div className="absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl animate-in slide-in-from-top-2 duration-150">
                  <ModernColorPicker
                    value={el.color}
                    onChange={(c) => update(el.id, { color: c })}
                    opacity={el.opacity ?? 1}
                    onOpacityChange={(v) => update(el.id, { opacity: v })}
                  />
                </div>
              )}
            </div>

            {/* Bold / Italic */}
            <div className="flex h-8 items-center gap-0.5 rounded-lg bg-slate-100/80 p-0.5">
              <button
                type="button"
                onClick={() => update(el.id, { fontWeight: (el.fontWeight ?? 400) >= 700 ? 400 : 700 })}
                className={`grid size-7 place-items-center rounded-md text-slate-500 transition hover:text-slate-900 ${
                  (el.fontWeight ?? 400) >= 700 ? "bg-white text-slate-900 shadow-sm" : ""
                }`}
                title="Bold"
              >
                <Bold className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => update(el.id, { italic: !el.italic })}
                className={`grid size-7 place-items-center rounded-md text-slate-500 transition hover:text-slate-900 ${
                  el.italic ? "bg-white text-slate-900 shadow-sm" : ""
                }`}
                title="Italic"
              >
                <Italic className="size-3.5" />
              </button>
            </div>

            {/* Align */}
            <div className="flex h-8 items-center gap-0.5 rounded-lg bg-slate-100/80 p-0.5">
              <button
                type="button"
                onClick={() => update(el.id, { align: "left" })}
                className={`grid size-7 place-items-center rounded-md text-slate-500 transition hover:text-slate-900 ${
                  (el.align ?? "left") === "left" ? "bg-white text-slate-900 shadow-sm" : ""
                }`}
                title="Align left"
              >
                <AlignLeft className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => update(el.id, { align: "center" })}
                className={`grid size-7 place-items-center rounded-md text-slate-500 transition hover:text-slate-900 ${
                  (el.align ?? "left") === "center" ? "bg-white text-slate-900 shadow-sm" : ""
                }`}
                title="Align center"
              >
                <AlignCenter className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => update(el.id, { align: "right" })}
                className={`grid size-7 place-items-center rounded-md text-slate-500 transition hover:text-slate-900 ${
                  (el.align ?? "left") === "right" ? "bg-white text-slate-900 shadow-sm" : ""
                }`}
                title="Align right"
              >
                <AlignRight className="size-3.5" />
              </button>
            </div>

            {/* Font size stepper */}
            <div className="flex h-8 items-center rounded-lg bg-slate-100/80 p-0.5">
              <button
                type="button"
                onClick={() => update(el.id, { fontSize: Math.max(12, el.fontSize - 1) })}
                className="grid size-6 place-items-center rounded-md text-slate-500 hover:bg-white hover:text-slate-900"
              >
                <Minus className="size-3" />
              </button>
              <input
                type="number"
                min={12}
                max={240}
                value={el.fontSize}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (Number.isFinite(val)) update(el.id, { fontSize: Math.min(240, Math.max(12, val)) });
                }}
                className="w-9 appearance-none border-0 bg-transparent text-center font-mono text-xs font-semibold text-slate-800 outline-none"
              />
              <button
                type="button"
                onClick={() => update(el.id, { fontSize: Math.min(240, el.fontSize + 1) })}
                className="grid size-6 place-items-center rounded-md text-slate-500 hover:bg-white hover:text-slate-900"
              >
                <Plus className="size-3" />
              </button>
            </div>
          </>
        )}

        {el.type === "shape" && (
          <div className="relative">
            <button type="button" onClick={() => setColorPaletteOpen(!colorPaletteOpen)} className={`grid size-8 place-items-center rounded-lg transition hover:bg-slate-100 ${colorPaletteOpen ? "bg-slate-100 ring-2 ring-sky-500/20" : ""}`} title="Shape color">
              <div className="size-4 rounded-md border border-slate-300 shadow-xs" style={{ backgroundColor: el.fill ?? "#0ea5e9", opacity: el.opacity ?? 1 }} />
            </button>
            {colorPaletteOpen && <div className="absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl"><ModernColorPicker value={el.fill ?? "#0ea5e9"} onChange={(color) => update(el.id, { fill: color })} opacity={el.opacity ?? 1} onOpacityChange={(opacity) => update(el.id, { opacity })} /></div>}
          </div>
        )}

        {el.type === "image" && (
          <>
            <button type="button" onClick={() => update(el.id, { cropZoom: el.cropZoom && el.cropZoom > 1 ? 1 : 1.15 })} className="grid size-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" title="Crop image"><Crop className="size-3.5" /></button>
            <div className="relative">
              <button type="button" onClick={() => setImageFilterOpen(!imageFilterOpen)} className={`grid size-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 ${imageFilterOpen ? "bg-slate-100 ring-2 ring-sky-500/20" : ""}`} title="Image filter"><SlidersHorizontal className="size-3.5" /></button>
              {imageFilterOpen && <div className="absolute left-1/2 top-full z-50 mt-2 grid w-44 -translate-x-1/2 grid-cols-2 gap-1.5 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">{IMAGE_FILTER_PRESETS.map((preset) => <button key={preset.name} type="button" onClick={() => { update(el.id, { filters: { ...DEFAULT_FILTERS, ...preset.filters } }); setImageFilterOpen(false); }} className="rounded-lg border border-slate-100 px-2 py-1.5 text-left text-[10px] text-slate-600 hover:border-sky-300 hover:bg-sky-50">{preset.name}</button>)}</div>}
            </div>
          </>
        )}

        {/* Universal actions */}
        {/* Layer order */}
        <button
          onClick={() => bringForward(el.id)}
          className="grid size-8 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 active:scale-90"
          title="Bring forward"
        >
          <ArrowUp className="size-3.5" />
        </button>
        <button
          onClick={() => sendBackward(el.id)}
          className="grid size-8 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 active:scale-90"
          title="Send backward"
        >
          <ArrowDown className="size-3.5" />
        </button>

        <button
          onClick={() => duplicate(el.id)}
          className="grid size-8 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 active:scale-90"
          title="Duplicate"
        >
          <Copy className="size-3.5" />
        </button>

        <button
          onClick={() => update(el.id, { rotation: (el.rotation + 90) % 360 })}
          className="grid size-8 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 active:scale-90"
          title="Rotate 90°"
        >
          <RotateCcw className="size-3.5" />
        </button>

        <button
          onClick={() => remove(el.id)}
          className="grid size-8 place-items-center rounded-full text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 active:scale-90"
          title="Delete"
        >
          <Trash2 className="size-3.5" />
        </button>

        <div className="mx-0.5 h-5 w-px bg-slate-200/80" />

        <button
          onClick={() => setAdvancedOpen(!advancedOpen)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
            advancedOpen
              ? "bg-sky-600 text-white shadow-[0_6px_16px_rgba(14,165,233,0.4)]"
              : "bg-gradient-to-r from-blue-600 to-sky-600 text-white shadow-[0_6px_16px_rgba(37,99,235,0.4)] hover:brightness-110"
          }`}
        >
          <Sliders className="size-3.5" />
          <span>{advancedOpen ? "Hide" : "Inspector"}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {floatingHUD}

      {advancedOpen && (
        <aside className="editor-inspector fixed right-4 top-4 bottom-4 z-40 flex w-[280px] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 shadow-[0_20px_50px_rgba(15,23,42,0.14)] backdrop-blur-2xl transition-all duration-300">
          <div className="px-3 pt-3">
            <PanelHeader
              title={
                el.type === "ui"
                  ? "UI Properties"
                  : `${el.type.charAt(0).toUpperCase()}${el.type.slice(1)} Properties`
              }
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 text-selector-subtle"
                aria-label="Close inspector"
                title="Close inspector"
                onClick={() => setAdvancedOpen(false)}
              >
                <X />
              </Button>
            </PanelHeader>
          </div>

          {/* Body */}
          <div className="flex-1 space-y-3 overflow-y-auto p-3.5 text-xs text-slate-700">
            {/* UI ELEMENTS */}
            {el.type === "ui" && (
              <Section title="Appearance & Content">
                <Field label="Theme Presets">
                  <div className="grid grid-cols-3 gap-1.5">
                    {(Object.keys(UI_STYLE_THEMES) as UiStyle[]).map((s) => {
                      const t = UI_STYLE_THEMES[s];
                      const active = el.uiStyle === s;
                      return (
                        <button
                          key={s}
                          onClick={() => update(el.id, { uiStyle: s, accentColor: t.accent })}
                          className={`rounded-lg border px-2 py-2 text-[10px] font-semibold transition ${
                            active
                              ? "border-sky-500 bg-sky-50/50 text-sky-700 ring-2 ring-sky-500/20"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </Field>
                <Field label="Card Title">
                  <input
                    type="text"
                    value={el.title}
                    onChange={(e) => update(el.id, { title: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-sky-500 focus:outline-none"
                  />
                </Field>
                <Field label="Body Description">
                  <textarea
                    rows={2}
                    value={el.body}
                    onChange={(e) => update(el.id, { body: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-sky-500 focus:outline-none"
                  />
                </Field>
                {(el.kind === "progress" || el.kind === "stat") && (
                  <SliderWithInput
                    label={el.kind === "progress" ? "Progress Value" : "Statistic"}
                    min={0}
                    max={100}
                    value={el.value}
                    unit={el.kind === "progress" ? "%" : ""}
                    onChange={(val) => update(el.id, { value: val })}
                  />
                )}
                <ModernColorPicker
                  label="Accent Color"
                  value={el.accentColor ?? "#0ea5e9"}
                  onChange={(c) => update(el.id, { accentColor: c })}
                />
              </Section>
            )}

            {/* QUIZ ELEMENT */}
            {el.type === "quiz" && (() => {
              const q = el as QuizElement;
              const setOpts = (options: QuizElement["options"], correctId = q.correctId) =>
                update(q.id, { options, correctId } as never);
              return (
                <Section title="Quiz">
                  <Field label="Mode">
                    <SegmentedControl label="Quiz mode" value={q.mode ?? "quiz"} onChange={mode => update(q.id, { mode } as never)} options={[{ value: "quiz", label: "Quiz" }, { value: "poll", label: "Live poll" }]} />
                  </Field>
                  <Field label="Visual style">
                    <div className="grid grid-cols-3 gap-1.5">
                      {(Object.keys(UI_STYLE_THEMES) as UiStyle[]).map((style) => (
                        <button
                          key={style}
                          type="button"
                          onClick={() => update(q.id, { ...quizStylePatch(style) } as never)}
                          className={`rounded-lg border px-2 py-2 text-[10px] font-semibold transition ${q.uiStyle === style ? "border-sky-500 bg-sky-50 text-sky-700 ring-2 ring-sky-500/20" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
                        >
                          {UI_STYLE_THEMES[style].label}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Effect">
                    <select value={q.effect ?? "none"} onChange={(e) => update(q.id, { effect: e.target.value } as never)} className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs">
                      {SHAPE_EFFECTS.map((effect) => <option key={effect.value} value={effect.value}>{effect.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Question">
                    <textarea
                      rows={2}
                      aria-label="Quiz question"
                      value={q.question}
                      onChange={(e) => update(q.id, { question: e.target.value } as never)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-sky-500 focus:outline-none"
                    />
                  </Field>
                  <Field label={(q.mode ?? "quiz") === "quiz" ? "Answers (pick the correct one)" : "Options"}>
                    <div className="space-y-1.5">
                      {q.options.map((o, index) => (
                        <div key={o.id} className="flex items-center gap-1.5">
                          {(q.mode ?? "quiz") === "quiz" && (
                            <input
                              type="radio"
                              aria-label={`Correct answer ${index + 1}`}
                              checked={q.correctId === o.id}
                              onChange={() => update(q.id, { correctId: o.id } as never)}
                            />
                          )}
                          <input
                            type="text"
                            aria-label={`Answer ${index + 1}`}
                            value={o.text}
                            onChange={(e) =>
                              setOpts(q.options.map((x) => (x.id === o.id ? { ...x, text: e.target.value } : x)))
                            }
                            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none"
                          />
                          <button
                            aria-label="Remove option"
                            disabled={q.options.length <= 2}
                            onClick={() => {
                              const rest = q.options.filter((x) => x.id !== o.id);
                              setOpts(rest, q.correctId === o.id ? rest[0].id : q.correctId);
                            }}
                            className="rounded p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      ))}
                      {q.options.length < 6 && (
                        <button
                          onClick={() =>
                            setOpts([...q.options, { id: crypto.randomUUID(), text: `Option ${q.options.length + 1}` }])
                          }
                          className="w-full rounded-lg border border-dashed border-slate-300 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                        >
                          + Add option
                        </button>
                      )}
                    </div>
                  </Field>
                  <ModernColorPicker label="Background" value={q.bgColor} onChange={(c) => update(q.id, { bgColor: c } as never)} />
                  <ModernColorPicker label="Text" value={q.fgColor} onChange={(c) => update(q.id, { fgColor: c } as never)} />
                  <ModernColorPicker label="Accent" value={q.accentColor} onChange={(c) => update(q.id, { accentColor: c } as never)} />
                </Section>
              );
            })()}

            {/* TEXT ELEMENT */}
            {el.type === "text" && (
              <>
                <Section title="Typography">
                  <Field label="Content">
                    <textarea
                      rows={3}
                      value={el.text}
                      onChange={(e) => update(el.id, { text: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                  </Field>
                  <Field label="Font Family">
                    <Dropdown
                      value={el.fontFamily}
                      options={FONT_FAMILIES}
                      onChange={(v) => update(el.id, { fontFamily: v })}
                    />
                  </Field>
                  <SliderWithInput
                    label="Font Size"
                    min={12}
                    max={240}
                    value={el.fontSize}
                    unit="px"
                    onChange={(val) => update(el.id, { fontSize: val })}
                  />
                  <SliderWithInput
                    label="Font Weight"
                    min={100}
                    max={900}
                    step={100}
                    value={el.fontWeight}
                    onChange={(val) => update(el.id, { fontWeight: val })}
                  />
                  <SliderWithInput
                    label="Line Height"
                    min={80}
                    max={250}
                    value={Math.round((el.lineHeight ?? 1.15) * 100)}
                    unit="%"
                    onChange={(val) => update(el.id, { lineHeight: val / 100 })}
                  />
                  <SliderWithInput
                    label="Letter Spacing"
                    min={-10}
                    max={40}
                    value={Math.round((el.letterSpacing ?? -0.02) * 100)}
                    unit="em"
                    onChange={(val) => update(el.id, { letterSpacing: val / 100 })}
                  />
                </Section>

                <Section title="Style & Alignment">
                  <Field label="Text Alignment">
                    <SegmentedControl
                      value={el.align ?? "left"}
                      onChange={(align) => update(el.id, { align })}
                      options={[
                        { value: "left", label: <AlignLeft className="size-3.5" /> },
                        { value: "center", label: <AlignCenter className="size-3.5" /> },
                        { value: "right", label: <AlignRight className="size-3.5" /> },
                      ]}
                    />
                  </Field>
                  <Field label="Formatting">
                    <ToggleGrid columns={3} label="Text formatting" options={[
                      { id: "italic", label: "Italic", icon: Italic, checked: !!el.italic, onChange: () => update(el.id, { italic: !el.italic }) },
                      { id: "underline", label: "Underline", icon: Underline, checked: !!el.underline, onChange: () => update(el.id, { underline: !el.underline }) },
                      { id: "bullet", label: "Bullets", icon: List, checked: !!el.bullet, onChange: () => update(el.id, { bullet: !el.bullet }) },
                    ]} />
                  </Field>
                  <Field label="Fill">
                    <SegmentedControl
                      value={el.fillSource ?? "color"}
                      onChange={(fillSource) => update(el.id, { fillSource })}
                      options={[
                        { value: "color", label: "Solid" },
                        { value: "slide-bg", label: "Slide BG" },
                      ]}
                    />
                  </Field>
                  {(el.fillSource ?? "color") === "color" && (
                    <ModernColorPicker
                      label="Text Color"
                      value={el.color}
                      onChange={(c) => update(el.id, { color: c })}
                      opacity={el.opacity ?? 1}
                      onOpacityChange={(v) => update(el.id, { opacity: v })}
                    />
                  )}
                <Field label="Replace image">
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:bg-sky-50">
                    <Upload className="size-3.5" aria-hidden="true" />
                    Choose another image
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        event.currentTarget.value = "";
                        if (!file) return;
                        try {
                          const src = await prepareImage(file);
                          update(el.id, { src, illustrationFormat: undefined });
                        } catch (error) {
                          window.alert(error instanceof Error ? error.message : "Could not import this image.");
                        }
                      }}
                    />
                  </label>
                </Field>

                <Field label="Shape Mask">
                  <Dropdown
                      value={el.maskShape ?? ""}
                      options={MASK_OPTIONS}
                      onChange={(v) => update(el.id, { maskShape: (v || undefined) as typeof el.maskShape })}
                    />
                  </Field>
                  <Field label="Hyperlink URL">
                    <div className="flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20">
                      <Link2 className="mr-1.5 size-3.5 text-slate-400" />
                      <input
                        type="url"
                        placeholder="https://..."
                        value={el.href ?? ""}
                        onChange={(e) => update(el.id, { href: e.target.value })}
                        className="w-full text-xs text-slate-700 outline-none"
                      />
                    </div>
                  </Field>
                </Section>
              </>
            )}

            {/* SHAPES */}
            {el.type === "shape" && (
              <Section title="Shape Appearance">
                <Field label="Effect">
                  <Dropdown
                    value={el.effect ?? "none"}
                    options={SHAPE_EFFECTS.map((option) => ({ ...option, value: option.value ?? "none" }))}
                    onChange={(v) => update(el.id, { effect: v as ShapeElement["effect"] })}
                  />
                </Field>
                <Field label="Fill">
                  <SegmentedControl
                    value={el.fillSource ?? "color"}
                    onChange={(fillSource) => update(el.id, { fillSource })}
                    options={[
                      { value: "color", label: "Solid" },
                      { value: "slide-bg", label: "Slide BG" },
                    ]}
                  />
                </Field>
                {(el.fillSource ?? "color") === "color" && (
                  <>
                    <ModernColorPicker
                      label="Fill Color"
                      value={el.fill}
                      onChange={(c) => update(el.id, { fill: c })}
                      opacity={el.opacity ?? 1}
                      onOpacityChange={(v) => update(el.id, { opacity: v })}
                    />
                    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-slate-600">Gradient fill</span>
                        <button
                          type="button"
                          onClick={() => update(el.id, { gradient: el.gradient ? undefined : { from: el.fill, to: "#6366f1", angle: 90, type: "linear" } })}
                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 transition hover:border-sky-300 hover:text-sky-700"
                        >
                          {el.gradient ? "Remove" : "Add"}
                        </button>
                      </div>
                      {el.gradient && (
                        <>
                          <SegmentedControl
                            value={el.gradient.type ?? "linear"}
                            onChange={(type) => update(el.id, { gradient: { ...el.gradient!, type: type as ShapeGradient["type"] } })}
                            options={[{ value: "linear", label: "Linear" }, { value: "radial", label: "Radial" }]}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-1.5 text-[10px] text-slate-500">
                              <input type="color" value={el.gradient.from} onChange={(e) => update(el.id, { gradient: { ...el.gradient!, from: e.target.value } })} className="size-6 cursor-pointer border-0 bg-transparent p-0" aria-label="Gradient start color" />
                              Start
                            </label>
                            <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-1.5 text-[10px] text-slate-500">
                              <input type="color" value={el.gradient.to} onChange={(e) => update(el.id, { gradient: { ...el.gradient!, to: e.target.value } })} className="size-6 cursor-pointer border-0 bg-transparent p-0" aria-label="Gradient end color" />
                              End
                            </label>
                          </div>
                          {(el.gradient.type ?? "linear") === "linear" && (
                            <SliderWithInput label="Angle" min={0} max={360} value={el.gradient.angle} unit="°" onChange={(angle) => update(el.id, { gradient: { ...el.gradient!, angle } })} />
                          )}
                        </>
                      )}
                    </div>
                  </>
                )}
                <ModernColorPicker
                  label="Stroke Color"
                  value={el.stroke}
                  onChange={(c) => update(el.id, { stroke: c })}
                />
                <SliderWithInput
                  label="Stroke Width"
                  min={0}
                  max={24}
                  value={el.strokeWidth}
                  unit="px"
                  onChange={(val) => update(el.id, { strokeWidth: val })}
                />
                <Field label="Shape Mask">
                  <Dropdown
                    value={el.maskShape ?? ""}
                    options={MASK_OPTIONS}
                    onChange={(v) => update(el.id, { maskShape: (v || undefined) as typeof el.maskShape })}
                  />
                </Field>
                {el.shape === "rect" && (
                  <SliderWithInput
                    label="Corner Radius"
                    min={0}
                    max={Math.floor(Math.min(el.width, el.height) / 2)}
                    value={el.cornerRadius ?? 0}
                    unit="px"
                    onChange={(val) => update(el.id, { cornerRadius: val })}
                  />
                )}
              </Section>
            )}

            {/* ICON ELEMENT */}
            {el.type === "icon" && (
              <Section title="Icon styling">
                <ModernColorPicker
                  label="Icon Color"
                  value={el.color}
                  onChange={(color) => update(el.id, { color })}
                />
                <SliderWithInput
                  label="Stroke Width"
                  min={0.5}
                  max={6}
                  step={0.5}
                  value={el.strokeWidth}
                  unit="px"
                  onChange={(strokeWidth) => update(el.id, { strokeWidth })}
                />
              </Section>
            )}

            {/* IMAGE ELEMENT */}
            {el.type === "image" && (
              <Section title="Image Filters & Adjustments">
                <Field label="Shape Mask">
                  <MaskPicker
                    value={el.maskShape ?? ""}
                    onChange={(v) => update(el.id, { maskShape: (v || undefined) as typeof el.maskShape })}
                  />
                </Field>

                <Field label="Fit (containance)">
                  <SegmentedControl
                    value={el.fit ?? "cover"}
                    onChange={(fit) => update(el.id, { fit })}
                    options={[
                      { value: "cover", label: "Cover", title: "Remplit la zone, rogne l'excédent" },
                      { value: "contain", label: "Contain", title: "Image entière visible, letterbox" },
                      { value: "fill", label: "Fill", title: "Étirée pour remplir (peut déformer)" },
                    ]}
                  />
                </Field>

                <Field label="Crop">
                  <div className="space-y-2">
                    <SliderWithInput label="Zoom" min={100} max={400} step={5} unit="%" value={Math.round((el.cropZoom ?? 1) * 100)} onChange={(v) => update(el.id, { cropZoom: v / 100 })} />
                    <SliderWithInput label="Horizontal" min={0} max={100} unit="%" value={el.cropX ?? 50} onChange={(v) => update(el.id, { cropX: v })} />
                    <SliderWithInput label="Vertical" min={0} max={100} unit="%" value={el.cropY ?? 50} onChange={(v) => update(el.id, { cropY: v })} />
                    <button type="button" onClick={() => update(el.id, { cropZoom: undefined, cropX: undefined, cropY: undefined })} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50">Reset crop</button>
                  </div>
                </Field>

                <Field label="Transform">
                  <ToggleGrid label="Image transforms" options={[
                    { id: "flipX", label: "Flip H", icon: FlipHorizontal, checked: !!el.flipX, onChange: () => update(el.id, { flipX: !el.flipX }) },
                    { id: "flipY", label: "Flip V", icon: FlipVertical, checked: !!el.flipY, onChange: () => update(el.id, { flipY: !el.flipY }) },
                  ]} />
                </Field>

                <Field label="Presets">
                  <div className="grid grid-cols-4 gap-1.5">
                    {IMAGE_FILTER_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() =>
                          update(el.id, { filters: { ...DEFAULT_FILTERS, ...preset.filters } })
                        }
                        className="flex flex-col items-center rounded-lg border border-slate-200 p-1 transition hover:border-sky-500 hover:bg-slate-50"
                      >
                        <div
                          className="h-7 w-full rounded-sm bg-linear-to-tr from-sky-400 to-indigo-600"
                          style={{ filter: preset.preview }}
                        />
                        <span className="mt-1 text-[9px] font-medium text-slate-600">
                          {preset.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </Field>

                <SliderWithInput
                  label="Brightness"
                  min={0}
                  max={200}
                  value={el.filters?.brightness ?? 100}
                  unit="%"
                  onChange={(val) =>
                    update(el.id, { filters: { ...DEFAULT_FILTERS, ...el.filters, brightness: val } })
                  }
                />
                <SliderWithInput
                  label="Contrast"
                  min={0}
                  max={200}
                  value={el.filters?.contrast ?? 100}
                  unit="%"
                  onChange={(val) =>
                    update(el.id, { filters: { ...DEFAULT_FILTERS, ...el.filters, contrast: val } })
                  }
                />
                <SliderWithInput
                  label="Saturation"
                  min={0}
                  max={200}
                  value={el.filters?.saturate ?? 100}
                  unit="%"
                  onChange={(val) =>
                    update(el.id, { filters: { ...DEFAULT_FILTERS, ...el.filters, saturate: val } })
                  }
                />
                <SliderWithInput
                  label="Hue Rotate"
                  min={0}
                  max={360}
                  value={el.filters?.hueRotate ?? 0}
                  unit="°"
                  onChange={(val) =>
                    update(el.id, { filters: { ...DEFAULT_FILTERS, ...el.filters, hueRotate: val } })
                  }
                />
                <SliderWithInput
                  label="Blur"
                  min={0}
                  max={20}
                  step={0.5}
                  value={el.filters?.blur ?? 0}
                  unit="px"
                  onChange={(val) =>
                    update(el.id, { filters: { ...DEFAULT_FILTERS, ...el.filters, blur: val } })
                  }
                />
                <SliderWithInput
                  label="Grayscale"
                  min={0}
                  max={100}
                  value={el.filters?.grayscale ?? 0}
                  unit="%"
                  onChange={(val) =>
                    update(el.id, { filters: { ...DEFAULT_FILTERS, ...el.filters, grayscale: val } })
                  }
                />
                <SliderWithInput
                  label="Sepia"
                  min={0}
                  max={100}
                  value={el.filters?.sepia ?? 0}
                  unit="%"
                  onChange={(val) =>
                    update(el.id, { filters: { ...DEFAULT_FILTERS, ...el.filters, sepia: val } })
                  }
                />
                <SliderWithInput
                  label="Invert"
                  min={0}
                  max={100}
                  value={el.filters?.invert ?? 0}
                  unit="%"
                  onChange={(val) =>
                    update(el.id, { filters: { ...DEFAULT_FILTERS, ...el.filters, invert: val } })
                  }
                />
                <SliderWithInput
                  label="Glitch"
                  min={0}
                  max={100}
                  value={el.filters?.glitch ?? 0}
                  unit="%"
                  onChange={(val) =>
                    update(el.id, { filters: { ...DEFAULT_FILTERS, ...el.filters, glitch: val } })
                  }
                />
                <SliderWithInput
                  label="Pixelate"
                  min={0}
                  max={40}
                  value={el.filters?.pixelate ?? 0}
                  unit="px"
                  onChange={(val) =>
                    update(el.id, { filters: { ...DEFAULT_FILTERS, ...el.filters, pixelate: val } })
                  }
                />
                <SliderWithInput
                  label="Posterize"
                  min={0}
                  max={16}
                  value={el.filters?.posterize ?? 0}
                  unit=" lvl"
                  onChange={(val) =>
                    update(el.id, { filters: { ...DEFAULT_FILTERS, ...el.filters, posterize: val } })
                  }
                />
                <SliderWithInput
                  label="Corner Radius"
                  min={0}
                  max={Math.floor(Math.min(el.width, el.height) / 2)}
                  value={el.cornerRadius ?? 0}
                  unit="px"
                  onChange={(val) => update(el.id, { cornerRadius: val })}
                />

                <button
                  type="button"
                  onClick={() => update(el.id, { filters: { ...DEFAULT_FILTERS } })}
                  className="w-full rounded-lg border border-dashed border-slate-300 py-1 text-[10px] font-medium text-slate-500 hover:border-rose-400 hover:text-rose-600"
                >
                  Reset filters
                </button>
              </Section>
            )}

            {/* INTERACTION — HOVER & CLICK */}
            <Section title="Interaction (Hover & Click)">
              <Field label="Hover Effect">
                <Dropdown
                  value={el.interaction?.hoverEffect ?? "none"}
                  options={ELEMENT_ANIMATION_LABELS}
                  onChange={(v) => update(el.id, { animation: v as any })}
                />
              </Field>
              <SliderWithInput
                label="Rotation"
                min={-180}
                max={180}
                value={el.rotation}
                unit="°"
                onChange={(val) => update(el.id, { rotation: val })}
              />
            </Section>

            {/* SHADOW (all elements) */}
            <Section title="Shadow" defaultOpen={!!el.shadow}>
              <ToggleGrid label="Shadow" options={[{ id: "shadow", label: "Enable shadow", icon: Layers, checked: !!el.shadow, onChange: checked => update(el.id, { shadow: checked ? { x: 0, y: 12, blur: 24, color: "rgba(0,0,0,0.35)" } : undefined } as never) }]} />
              {el.shadow && (() => {
                const s = el.shadow as ElementShadow;
                const set = (p: Partial<ElementShadow>) => update(el.id, { shadow: { ...s, ...p } } as never);
                return (
                  <>
                    <SliderWithInput label="Offset X" min={-60} max={60} value={s.x} unit="px" onChange={(v) => set({ x: v })} />
                    <SliderWithInput label="Offset Y" min={-60} max={60} value={s.y} unit="px" onChange={(v) => set({ y: v })} />
                    <SliderWithInput label="Blur" min={0} max={100} value={s.blur} unit="px" onChange={(v) => set({ blur: v })} />
                    <ModernColorPicker label="Color" value={s.color.startsWith("#") ? s.color : "#000000"} onChange={(c) => set({ color: c })} />
                  </>
                );
              })()}
            </Section>

            <Section title="Element JSON" defaultOpen={false}>
              <p className="text-[10px] leading-relaxed text-slate-500">
                Edit the raw properties of the selected element. The id and type are
                locked. Apply with the button or ⌘/Ctrl + ↵.
              </p>
              <textarea
                value={jsonDraft}
                onChange={(event) => {
                  setJsonDraft(event.target.value);
                  setJsonDirty(true);
                  setJsonError(null);
                }}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                    event.preventDefault();
                    applyJson();
                  }
                }}
                spellCheck={false}
                aria-label="Selected element JSON"
                className="min-h-48 w-full resize-y rounded-lg border border-slate-200 bg-slate-950 p-3 font-mono text-[10px] leading-relaxed text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
              {jsonError && <p className="text-[10px] font-medium text-rose-500">{jsonError}</p>}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={applyJson}
                  disabled={!jsonDirty}
                  className="flex-1 rounded-lg bg-sky-600 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white transition hover:bg-sky-500 disabled:opacity-40"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={formatJson}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Format
                </button>
                <button
                  type="button"
                  onClick={resetJson}
                  disabled={!jsonDirty}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                >
                  Reset
                </button>
              </div>
            </Section>

            {/* LAYER ORDER ACTIONS */}
            <Section title="Layer Management">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => bringForward(el.id)}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50"
                >
                  <ArrowUp className="size-3.5" /> Forward
                </button>
                <button
                  type="button"
                  onClick={() => sendBackward(el.id)}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50"
                >
                  <ArrowDown className="size-3.5" /> Backward
                </button>
                <button
                  type="button"
                  onClick={() => duplicate(el.id)}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50"
                >
                  <Copy className="size-3.5" /> Duplicate
                </button>
                <button
                  type="button"
                  onClick={() => remove(el.id)}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 py-2 text-xs font-medium text-rose-600 shadow-2xs hover:bg-rose-100"
                >
                  <Trash2 className="size-3.5" /> Delete
                </button>
              </div>
            </Section>
          </div>
        </aside>
      )}
    </>
  );
}
