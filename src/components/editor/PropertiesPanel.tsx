import React, { useEffect, useState } from "react";
import {
  useEditor,
  DEFAULT_FILTERS,
  UI_STYLE_THEMES,
  chartStylePatch,
  type ImageFilters,
  type ElementShadow,
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
import { ColorPicker } from "./ColorPicker";
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
  List,
  Sparkles,
  Link2,
  Sliders,
  Type,
  Maximize2,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import { FONTS } from "./panels/TextPanel";

const FONT_FAMILIES: string[] = Array.from(
  new Set(["Inter", "Orbitron", "JetBrains Mono", "Georgia", ...FONTS.map((f) => f.family)])
).sort();

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
    <div className="rounded-xl border border-slate-200/80 bg-white/70 shadow-xs backdrop-blur-sm transition-all duration-200">
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

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: React.ReactNode; title?: string }>;
  onChange: (val: T) => void;
}) {
  return (
    <div className="grid w-full auto-cols-fr grid-flow-col gap-0.5 rounded-lg border border-slate-200/80 bg-slate-100/80 p-0.5 shadow-inner">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            title={opt.title}
            onClick={() => onChange(opt.value)}
            className={`flex items-center justify-center rounded-md py-1.5 text-xs font-medium transition-all ${
              active
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
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
}: {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}) {
  return (
    <div className="space-y-2">
      {label && <label className="text-[11px] font-medium text-slate-600">{label}</label>}
      <div className="flex items-center gap-2">
        <div className="relative size-8 shrink-0 overflow-hidden rounded-lg border border-slate-200 shadow-2xs">
          <input
            type="color"
            value={value || "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
          <div className="size-full" style={{ backgroundColor: value || "#000000" }} />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="h-8 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 font-mono text-xs text-slate-800 uppercase shadow-2xs focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
        />
      </div>
      <div className="flex flex-wrap gap-1.5 pt-0.5">
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

  const el = elements.find((e) => e.id === selectedId);

  useEffect(() => {
    setAdvancedOpen(false);
    setColorPaletteOpen(false);
  }, [selectedId]);

  if (!el) return null;

  // Floating Mini-HUD (Always clean, contextual & immediate)
  const floatingHUD = (
    <div className="pointer-events-none fixed left-1/2 top-4 z-40 -translate-x-1/2">
      <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-slate-200/90 bg-white/90 p-1.5 shadow-[0_16px_36px_rgba(15,23,42,0.12)] backdrop-blur-xl">
        <div className="flex items-center gap-1.5 border-r border-slate-200/70 px-2 py-1 pr-2.5">
          <Layers className="size-3.5 text-sky-600" />
          <span className="text-[10px] font-bold tracking-wider text-slate-700 uppercase">
            {el.type}
          </span>
        </div>

        {el.type === "text" && (
          <>
            <div className="relative">
              <button
                type="button"
                onClick={() => setColorPaletteOpen(!colorPaletteOpen)}
                className="flex items-center gap-1.5 rounded-lg p-1.5 text-slate-600 transition hover:bg-slate-100"
                title="Color"
              >
                <div
                  className="size-4 rounded-full border border-slate-300 shadow-xs"
                  style={{ backgroundColor: el.color }}
                />
              </button>
              {colorPaletteOpen && (
                <div className="absolute left-1/2 top-full z-50 mt-2 w-48 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                  <ModernColorPicker value={el.color} onChange={(c) => update(el.id, { color: c })} />
                </div>
              )}
            </div>

            <div className="flex h-8 items-center rounded-lg border border-slate-200 bg-slate-50 px-1">
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
                className="w-10 appearance-none border-0 bg-transparent text-center font-mono text-xs font-semibold text-slate-800 outline-none"
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

        <button
          onClick={() => duplicate(el.id)}
          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          title="Duplicate"
        >
          <Copy className="size-3.5" />
        </button>

        <button
          onClick={() => update(el.id, { rotation: (el.rotation + 90) % 360 })}
          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          title="Rotate 90°"
        >
          <RotateCcw className="size-3.5" />
        </button>

        <button
          onClick={() => remove(el.id)}
          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
          title="Delete"
        >
          <Trash2 className="size-3.5" />
        </button>

        <div className="mx-0.5 h-4 w-px bg-slate-200" />

        <button
          onClick={() => setAdvancedOpen(!advancedOpen)}
          className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition ${
            advancedOpen
              ? "bg-sky-600 text-white shadow-xs"
              : "bg-slate-900 text-white hover:bg-slate-800"
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
        <aside className="fixed right-4 top-4 bottom-4 z-40 flex w-80 flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 shadow-[0_20px_50px_rgba(15,23,42,0.14)] backdrop-blur-2xl transition-all duration-300">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                <Layers className="size-3.5" />
              </span>
              <div>
                <h3 className="text-xs font-semibold tracking-wide text-slate-900 uppercase">
                  {el.type} Properties
                </h3>
                <p className="text-[10px] text-slate-400">DiapoLab Inspector</p>
              </div>
            </div>
            <button
              onClick={() => setAdvancedOpen(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="size-4" />
            </button>
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
                    <select
                      value={el.fontFamily}
                      onChange={(e) => update(el.id, { fontFamily: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-sky-500 focus:outline-none"
                    >
                      {FONT_FAMILIES.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
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
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        type="button"
                        onClick={() => update(el.id, { italic: !el.italic })}
                        className={`flex items-center justify-center rounded-lg border py-1.5 transition ${
                          el.italic
                            ? "border-sky-500 bg-sky-50 text-sky-700"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <Italic className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => update(el.id, { underline: !el.underline })}
                        className={`flex items-center justify-center rounded-lg border py-1.5 transition ${
                          el.underline
                            ? "border-sky-500 bg-sky-50 text-sky-700"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <Underline className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => update(el.id, { bullet: !el.bullet })}
                        className={`flex items-center justify-center rounded-lg border py-1.5 transition ${
                          el.bullet
                            ? "border-sky-500 bg-sky-50 text-sky-700"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <List className="size-3.5" />
                      </button>
                    </div>
                  </Field>
                  <ModernColorPicker
                    label="Text Color"
                    value={el.color}
                    onChange={(c) => update(el.id, { color: c })}
                  />
                  <SliderWithInput
                    label="Opacity"
                    min={5}
                    max={100}
                    value={Math.round((el.opacity ?? 1) * 100)}
                    unit="%"
                    onChange={(val) => update(el.id, { opacity: val / 100 })}
                  />
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
                <ModernColorPicker
                  label="Fill Color"
                  value={el.fill}
                  onChange={(c) => update(el.id, { fill: c })}
                />
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
                <SliderWithInput
                  label="Opacity"
                  min={0}
                  max={100}
                  value={Math.round((el.opacity ?? 1) * 100)}
                  unit="%"
                  onChange={(val) => update(el.id, { opacity: val / 100 })}
                />
              </Section>
            )}

            {/* IMAGE ELEMENT */}
            {el.type === "image" && (
              <Section title="Image Filters & Adjustments">
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
              </Section>
            )}

            {/* PRESENTATION & TRANSITIONS */}
            <Section title="Animation & Interaction">
              <Field label="Entrance Animation">
                <select
                  value={el.animation ?? "none"}
                  onChange={(e) => update(el.id, { animation: e.target.value as any })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-sky-500 focus:outline-none"
                >
                  <option value="none">None</option>
                  <option value="fade-up">Fade Up</option>
                  <option value="pop">Pop Spring</option>
                  <option value="glitch">Digital Glitch</option>
                </select>
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
