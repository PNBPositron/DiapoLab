import { useState } from "react";
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
import { Copy, Trash2, ArrowUp, ArrowDown, Layers, RotateCcw, Plus, Check, Upload } from "lucide-react";
import { FONTS } from "./panels/TextPanel";
import { uploadAccountImage } from "@/lib/image-assets";

const FONT_FAMILIES: string[] = Array.from(
  new Set(["Inter", "Orbitron", "JetBrains Mono", "Georgia", ...FONTS.map((f) => f.family)]),
).sort();

const IMAGE_FILTER_PRESETS: Array<{ name: string; description: string; filters: ImageFilters; preview: string }> = [
  { name: "Original", description: "Clean", filters: { ...DEFAULT_FILTERS }, preview: "none" },
  { name: "Noir", description: "High contrast", filters: { ...DEFAULT_FILTERS, grayscale: 100, contrast: 135, brightness: 92 }, preview: "grayscale(1) contrast(1.35) brightness(.92)" },
  { name: "Vintage", description: "Warm film", filters: { ...DEFAULT_FILTERS, sepia: 42, contrast: 108, saturate: 82, brightness: 104 }, preview: "sepia(.42) contrast(1.08) saturate(.82) brightness(1.04)" },
  { name: "Faded", description: "Soft light", filters: { ...DEFAULT_FILTERS, contrast: 82, saturate: 70, brightness: 116 }, preview: "contrast(.82) saturate(.7) brightness(1.16)" },
  { name: "Crisp", description: "Punchy detail", filters: { ...DEFAULT_FILTERS, contrast: 132, saturate: 122, brightness: 98 }, preview: "contrast(1.32) saturate(1.22) brightness(.98)" },
  { name: "Cool", description: "Blue mood", filters: { ...DEFAULT_FILTERS, hueRotate: 18, saturate: 112, contrast: 108 }, preview: "hue-rotate(18deg) saturate(1.12) contrast(1.08)" },
  { name: "Sunset", description: "Warm glow", filters: { ...DEFAULT_FILTERS, sepia: 24, hueRotate: -12, saturate: 135, brightness: 106 }, preview: "sepia(.24) hue-rotate(-12deg) saturate(1.35) brightness(1.06)" },
  { name: "Dream", description: "Soft color", filters: { ...DEFAULT_FILTERS, blur: 0.7, contrast: 88, saturate: 118, brightness: 110 }, preview: "blur(.7px) contrast(.88) saturate(1.18) brightness(1.1)" },
];

const SWATCHES = [
  "#7df9ff",
  "#00d9ff",
  "#0ea5e9",
  "#4d7cff",
  "#1f3fb8",
  "#0a0f1f",
  "#ffffff",
  "#ff0080",
  "#00ff88",
];

function PropertyGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <details className="group border border-teal/25 bg-surface/30" open={false}>
      <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 font-display text-[10px] uppercase tracking-[0.2em] text-teal marker:content-none hover:bg-surface/60 [&::-webkit-details-marker]:hidden">
        <span>{label}</span>
        <span className="font-mono text-teal/50 transition-transform group-open:rotate-90">›</span>
      </summary>
      <div className="flex flex-col gap-4 border-t border-teal/20 p-3">{children}</div>
    </details>
  );
}

export function PropertiesPanel() {
  const { elements, selectedId, update, remove, duplicate, bringForward, sendBackward } =
    useEditor();
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const el = elements.find((e) => e.id === selectedId);
  if (!el) {
    return (
      <div className="hidden w-72 border-l border-teal/30 bg-paper p-4 lg:block">
        <div className="brutal-border bg-ink px-3 py-2.5">
          <div className="font-display text-xs uppercase tracking-[0.25em] text-teal/60">
            ▌ No selection
          </div>
        </div>
        <div className="mt-4 space-y-2 font-mono text-[11px] text-teal/50">
          <p>&gt; awaiting input...</p>
          <p>&gt; click a layer to inspect</p>
          <p className="text-teal/30">&gt; _</p>
        </div>
      </div>
    );
  }
  return (
    <div className="w-72 overflow-y-auto border-l border-teal/30 bg-paper">
      <div className="border-b border-teal/40 bg-blue-deep px-4 py-3 glow-blue">
        <div className="flex items-center gap-2 font-display text-xs uppercase tracking-[0.25em] text-teal">
          <Layers className="h-3.5 w-3.5" strokeWidth={2.5} />
          {el.type}_layer
        </div>
      </div>

      <div className="space-y-4 p-4">
        {el.type === "ui" && (
          <PropertyGroup label="Content & appearance">
            <Field label="Style">
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(UI_STYLE_THEMES) as UiStyle[]).map((s) => {
                  const t = UI_STYLE_THEMES[s];
                  const active = el.uiStyle === s;
                  return (
                    <button
                      key={s}
                      onClick={() => update(el.id, { uiStyle: s, accentColor: t.accent })}
                      className={`brutal-press border px-1 py-2 font-display text-[9px] uppercase tracking-[0.12em] ${active ? "border-teal glow-teal" : "border-teal/30"}`}
                      style={{
                        background: t.bg === "rgba(255,255,255,0.16)" ? "#2a3550" : t.bg,
                        color: t.fg,
                      }}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="Title">
              <input
                value={el.title}
                onChange={(e) => update(el.id, { title: e.target.value })}
                className="brutal-border-2 w-full bg-surface p-2 font-mono text-xs text-teal focus:outline-none"
              />
            </Field>
            <Field label="Body">
              <textarea
                value={el.body}
                onChange={(e) => update(el.id, { body: e.target.value })}
                rows={2}
                className="brutal-border-2 w-full bg-surface p-2 font-mono text-xs text-teal focus:outline-none"
              />
            </Field>
            {(el.kind === "progress" || el.kind === "stat") && (
              <Field label={el.kind === "progress" ? "Value (%)" : "Value"}>
                <input
                  type="number"
                  value={el.value}
                  onChange={(e) => update(el.id, { value: +e.target.value })}
                  className="brutal-border-2 w-full bg-surface p-2 font-mono text-xs text-teal focus:outline-none"
                />
              </Field>
            )}
            {el.items.length > 0 && (
              <Field label="Items (one per line)">
                <textarea
                  value={el.items.join("\n")}
                  onChange={(e) => update(el.id, { items: e.target.value.split("\n") })}
                  rows={4}
                  className="brutal-border-2 w-full bg-surface p-2 font-mono text-xs text-teal focus:outline-none"
                />
              </Field>
            )}
            <Field label="Accent">
              <div className="flex flex-wrap gap-1.5">
                {SWATCHES.map((c) => (
                  <button
                    key={c}
                    onClick={() => update(el.id, { accentColor: c })}
                    className="brutal-border-2 h-7 w-7"
                    style={{ background: c }}
                  />
                ))}
              </div>
            </Field>
            <Field label="Surface / text / border">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={el.bgColor ?? "#111827"}
                  onChange={(e) => update(el.id, { bgColor: e.target.value })}
                  className="brutal-border-2 h-8 w-full bg-surface"
                />
                <input
                  type="color"
                  value={el.fgColor ?? "#ffffff"}
                  onChange={(e) => update(el.id, { fgColor: e.target.value })}
                  className="brutal-border-2 h-8 w-full bg-surface"
                />
                <input
                  type="color"
                  value={el.borderColorOverride ?? "#7df9ff"}
                  onChange={(e) => update(el.id, { borderColorOverride: e.target.value })}
                  className="brutal-border-2 h-8 w-full bg-surface"
                />
              </div>
              <button
                onClick={() =>
                  update(el.id, {
                    bgColor: undefined,
                    fgColor: undefined,
                    borderColorOverride: undefined,
                  })
                }
                className="brutal-border-2 mt-1.5 w-full bg-surface py-1 font-mono text-[10px] uppercase tracking-wider text-teal hover:border-teal"
              >
                Reset to style pack
              </button>
            </Field>
            <Field label="Font">
              <select
                value={el.fontFamily ?? ""}
                onChange={(e) => update(el.id, { fontFamily: e.target.value || undefined })}
                className="brutal-border-2 w-full bg-surface p-2 font-mono text-xs text-teal focus:outline-none"
              >
                <option value="">Style default</option>
                {FONT_FAMILIES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={`Text scale ${(el.textScale ?? 1).toFixed(2)}×`}>
              <input
                type="range"
                min={0.6}
                max={1.8}
                step={0.05}
                value={el.textScale ?? 1}
                onChange={(e) => update(el.id, { textScale: +e.target.value })}
                className="w-full accent-teal"
              />
            </Field>
            <Field label={`Padding ${(el.padScale ?? 1).toFixed(2)}×`}>
              <input
                type="range"
                min={0.2}
                max={2}
                step={0.05}
                value={el.padScale ?? 1}
                onChange={(e) => update(el.id, { padScale: +e.target.value })}
                className="w-full accent-teal"
              />
            </Field>
            <Field label="Frame shape">
              <div className="grid grid-cols-5 gap-1">
                {(["default", "pill", "squircle", "cut", "leaf"] as const).map((sh) => {
                  const active = (el.cornerShape ?? "default") === sh;
                  return (
                    <button
                      key={sh}
                      onClick={() => update(el.id, { cornerShape: sh })}
                      className={`brutal-press border py-1.5 font-mono text-[9px] uppercase ${active ? "border-teal bg-blue-deep text-teal" : "border-teal/30 bg-surface text-teal/60"}`}
                    >
                      {sh === "default" ? "std" : sh.slice(0, 4)}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="Border style">
              <div className="grid grid-cols-5 gap-1">
                {(["solid", "dashed", "dotted", "double", "none"] as const).map((bs) => {
                  const active = (el.borderStyle ?? "solid") === bs;
                  return (
                    <button
                      key={bs}
                      onClick={() => update(el.id, { borderStyle: bs })}
                      className={`brutal-press border py-1.5 font-mono text-[9px] uppercase ${active ? "border-teal bg-blue-deep text-teal" : "border-teal/30 bg-surface text-teal/60"}`}
                    >
                      {bs.slice(0, 4)}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field
              label={`Corner radius ${el.cornerRadius ?? UI_STYLE_THEMES[el.uiStyle].radius}px`}
            >
              <input
                type="range"
                min={0}
                max={48}
                value={el.cornerRadius ?? UI_STYLE_THEMES[el.uiStyle].radius}
                onChange={(e) => update(el.id, { cornerRadius: +e.target.value })}
                className="w-full accent-teal"
              />
            </Field>
            <Field
              label={`Border width ${el.borderWidth ?? UI_STYLE_THEMES[el.uiStyle].borderWidth}px`}
            >
              <input
                type="range"
                min={0}
                max={10}
                value={el.borderWidth ?? UI_STYLE_THEMES[el.uiStyle].borderWidth}
                onChange={(e) => update(el.id, { borderWidth: +e.target.value })}
                className="w-full accent-teal"
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => update(el.id, { shadowOff: !el.shadowOff })}
                className={`brutal-border-2 py-2 font-mono text-[10px] uppercase tracking-wider ${el.shadowOff ? "bg-surface text-teal/50" : "bg-blue text-ink"}`}
              >
                Shadow
              </button>
              <button
                onClick={() =>
                  update(el.id, {
                    uppercase: !(el.uppercase ?? UI_STYLE_THEMES[el.uiStyle].uppercase),
                  })
                }
                className={`brutal-border-2 py-2 font-mono text-[10px] uppercase tracking-wider ${(el.uppercase ?? UI_STYLE_THEMES[el.uiStyle].uppercase) ? "bg-blue text-ink" : "bg-surface text-teal/50"}`}
              >
                Caps
              </button>
            </div>
          </PropertyGroup>
        )}
        {el.type === "text" && (
          <PropertyGroup label="Content & typography">
            <Field label="Text">
              <textarea
                value={el.text}
                onChange={(e) => update(el.id, { text: e.target.value })}
                rows={3}
                className="brutal-border-2 w-full bg-surface p-2 font-mono text-xs text-teal focus:outline-none focus:border-teal focus:bg-surface-2"
              />
            </Field>
            <Field label="Font size">
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={12}
                  max={240}
                  value={el.fontSize}
                  onChange={(e) => update(el.id, { fontSize: +e.target.value })}
                  className="w-full accent-teal"
                />
                <input
                  type="number"
                  min={12}
                  max={240}
                  step={1}
                  value={el.fontSize}
                  aria-label="Font size in pixels"
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    if (Number.isFinite(value)) update(el.id, { fontSize: Math.min(240, Math.max(12, value)) });
                  }}
                  className="brutal-border-2 w-16 bg-surface px-2 py-1.5 font-mono text-xs text-teal focus:outline-none"
                />
              </div>
              <div className="font-mono text-[11px] text-teal/70">{el.fontSize}px</div>
            </Field>
            <Field label="Font family">
              <select
                value={el.fontFamily}
                onChange={(e) => update(el.id, { fontFamily: e.target.value })}
                className="brutal-border-2 w-full bg-surface px-2 py-1.5 font-mono text-xs text-teal focus:outline-none focus:border-teal"
              >
                {FONT_FAMILIES.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </Field>
            <Field label="Font weight">
              <input
                type="range"
                min={100}
                max={900}
                step={100}
                value={el.fontWeight}
                onChange={(e) => update(el.id, { fontWeight: +e.target.value })}
                className="w-full accent-teal"
              />
              <div className="font-mono text-[11px] text-teal/70">{el.fontWeight}</div>
            </Field>
            <Field label="Letter spacing">
              <input
                type="range"
                min={-10}
                max={40}
                value={Math.round((el.letterSpacing ?? -0.02) * 100)}
                onChange={(e) => update(el.id, { letterSpacing: +e.target.value / 100 })}
                className="w-full accent-teal"
              />
              <div className="font-mono text-[11px] text-teal/70">
                {(el.letterSpacing ?? -0.02).toFixed(2)}em
              </div>
            </Field>
            <Field label="Line height">
              <input
                type="range"
                min={80}
                max={250}
                value={Math.round((el.lineHeight ?? 1.15) * 100)}
                onChange={(e) => update(el.id, { lineHeight: +e.target.value / 100 })}
                className="w-full accent-teal"
              />
              <div className="font-mono text-[11px] text-teal/70">
                {(el.lineHeight ?? 1.15).toFixed(2)}
              </div>
            </Field>
            <Field label="Opacity">
              <input
                type="range"
                min={5}
                max={100}
                value={Math.round((el.opacity ?? 1) * 100)}
                onChange={(e) => update(el.id, { opacity: +e.target.value / 100 })}
                className="w-full accent-teal"
              />
              <div className="font-mono text-[11px] text-teal/70">
                {Math.round((el.opacity ?? 1) * 100)}%
              </div>
            </Field>
            <Field label="Case">
              <div className="flex gap-1">
                {(["none", "uppercase", "lowercase", "capitalize"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => update(el.id, { textTransform: t })}
                    title={t}
                    className={`brutal-border-2 flex-1 py-1.5 font-mono text-[10px] ${
                      (el.textTransform ?? "none") === t
                        ? "bg-blue text-ink border-teal"
                        : "bg-surface text-teal hover:border-teal"
                    }`}
                  >
                    {t === "none"
                      ? "Aa−"
                      : t === "uppercase"
                        ? "AA"
                        : t === "lowercase"
                          ? "aa"
                          : "Aa"}
                  </button>
                ))}
              </div>
            </Field>
            <GradientEditor
              gradient={el.gradient}
              fill={el.color}
              onChange={(g) => update(el.id, { gradient: g })}
            />
            <Field label="Image fill">
              <div className="flex flex-col gap-2">
                <label className="brutal-border-2 brutal-press flex cursor-pointer items-center justify-center gap-2 bg-surface px-2 py-2 font-mono text-[10px] uppercase text-teal hover:border-teal">
                  <Upload className="h-3.5 w-3.5" /> Upload image
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploadingImage(true);
                        setImageUploadError(null);
                        uploadAccountImage(file)
                          .then((image) => update(el.id, { imageOverlay: image.url }))
                          .catch((error) => setImageUploadError(error instanceof Error ? error.message : "Image upload failed"))
                          .finally(() => setUploadingImage(false));
                      }
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
                {uploadingImage && <div className="font-mono text-[10px] text-teal/70">Compressing and storing image...</div>}
                {imageUploadError && <div role="alert" className="font-mono text-[10px] text-pink-300">{imageUploadError}</div>}
                <input
                  value={el.imageOverlay ?? ""}
                  onChange={(e) => update(el.id, { imageOverlay: e.target.value || undefined })}
                  placeholder="Paste image URL or upload"
                  className="brutal-border-2 w-full bg-surface px-2 py-1.5 font-mono text-[10px] text-teal"
                />
                {el.imageOverlay && <button type="button" onClick={() => update(el.id, { imageOverlay: undefined })} className="font-mono text-[10px] text-teal/60 underline">Clear image fill</button>}
              </div>
            </Field>
            <Field label="Blend mode">
              <select
                value={el.blendMode ?? "normal"}
                onChange={(e) => update(el.id, { blendMode: e.target.value as any })}
                className="brutal-border-2 w-full bg-surface px-2 py-1.5 font-mono text-xs text-teal"
              >
                <option value="normal">normal</option>
                <option value="screen">screen</option>
                <option value="overlay">overlay</option>
                <option value="color-dodge">color dodge</option>
              </select>
            </Field>
            <ShadowEditor shadow={el.shadow} onChange={(s) => update(el.id, { shadow: s })} />
            <Field label="Color">
              <ColorRow value={el.color} onChange={(c) => update(el.id, { color: c })} />
            </Field>
            <Field label="Align">
              <div className="flex gap-1">
                {(["left", "center", "right"] as const).map((a) => (
                  <button
                    key={a}
                    onClick={() => update(el.id, { align: a })}
                    className={`brutal-border-2 flex-1 py-1.5 font-mono text-[10px] uppercase tracking-wider ${
                      el.align === a
                        ? "bg-blue text-ink border-teal"
                        : "bg-surface text-teal hover:border-teal"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Style">
              <div className="flex gap-1">
                {(
                  [
                    ["I", "italic", el.italic],
                    ["U", "underline", el.underline],
                    ["•", "bullet", el.bullet],
                  ] as const
                ).map(([lbl, key, on]) => (
                  <button
                    key={key}
                    onClick={() => update(el.id, { [key]: !on } as Partial<typeof el>)}
                    className={`brutal-border-2 flex-1 py-1.5 font-mono text-[11px] ${
                      on ? "bg-blue text-ink border-teal" : "bg-surface text-teal hover:border-teal"
                    }`}
                    style={{
                      fontStyle: key === "italic" ? "italic" : undefined,
                      textDecoration: key === "underline" ? "underline" : undefined,
                    }}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Hyperlink">
              <input
                type="url"
                placeholder="https://example.com"
                value={el.href ?? ""}
                onChange={(e) => update(el.id, { href: e.target.value })}
                className="brutal-border-2 w-full bg-surface px-2 py-1.5 font-mono text-xs text-teal focus:outline-none focus:border-teal"
              />
              <div className="font-mono text-[10px] text-teal/50">
                &gt; click opens link · shift+click to select
              </div>
            </Field>
          </PropertyGroup>
        )}

        {el.type === "shape" && (
          <PropertyGroup label="Shape & appearance">
            <Field label="Fill">
              <ColorRow value={el.fill} onChange={(c) => update(el.id, { fill: c })} />
            </Field>
            <GradientEditor
              gradient={el.gradient}
              fill={el.fill}
              onChange={(g) => update(el.id, { gradient: g })}
            />
            <Field label="Image fill">
              <div className="flex flex-col gap-2">
                <label className="brutal-border-2 brutal-press flex cursor-pointer items-center justify-center gap-2 bg-surface px-2 py-2 font-mono text-[10px] uppercase text-teal hover:border-teal">
                  <Upload className="h-3.5 w-3.5" /> Upload image
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploadingImage(true);
                        setImageUploadError(null);
                        uploadAccountImage(file)
                          .then((image) => update(el.id, { imageOverlay: image.url }))
                          .catch((error) => setImageUploadError(error instanceof Error ? error.message : "Image upload failed"))
                          .finally(() => setUploadingImage(false));
                      }
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
                {uploadingImage && <div className="font-mono text-[10px] text-teal/70">Compressing and storing image...</div>}
                {imageUploadError && <div role="alert" className="font-mono text-[10px] text-pink-300">{imageUploadError}</div>}
                <input
                  value={el.imageOverlay ?? ""}
                  onChange={(e) => update(el.id, { imageOverlay: e.target.value || undefined })}
                  placeholder="Paste image URL or upload"
                  className="brutal-border-2 w-full bg-surface px-2 py-1.5 font-mono text-[10px] text-teal"
                />
                {el.imageOverlay && <button type="button" onClick={() => update(el.id, { imageOverlay: undefined })} className="font-mono text-[10px] text-teal/60 underline">Clear image fill</button>}
              </div>
            </Field>
            {el.shape === "rect" && (
              <Field label="Corner radius">
                <input
                  type="range"
                  min={0}
                  max={Math.floor(Math.min(el.width, el.height) / 2)}
                  value={el.cornerRadius ?? 0}
                  onChange={(e) => update(el.id, { cornerRadius: +e.target.value })}
                  className="w-full accent-teal"
                />
                <div className="font-mono text-[11px] text-teal/70">{el.cornerRadius ?? 0}px</div>
              </Field>
            )}
            <Field label="Stroke">
              <ColorRow value={el.stroke} onChange={(c) => update(el.id, { stroke: c })} />
            </Field>
            <Field label="Stroke width">
              <input
                type="range"
                min={0}
                max={32}
                value={el.strokeWidth}
                onChange={(e) => update(el.id, { strokeWidth: +e.target.value })}
                className="w-full accent-teal"
              />
            </Field>
            <Field label="Stroke style">
              <div className="grid grid-cols-3 gap-1.5">
                {(["solid", "dashed", "dotted"] as const).map((sst) => (
                  <button
                    key={sst}
                    onClick={() => update(el.id, { strokeStyle: sst })}
                    className={`brutal-border-2 py-1.5 font-mono text-[10px] uppercase ${
                      (el.strokeStyle ?? "solid") === sst
                        ? "bg-blue text-ink border-teal"
                        : "bg-surface text-teal hover:border-teal"
                    }`}
                  >
                    {sst}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Opacity">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={el.opacity ?? 1}
                onChange={(e) => update(el.id, { opacity: +e.target.value })}
                className="w-full accent-teal"
              />
              <div className="font-mono text-[11px] text-teal/70">
                {Math.round((el.opacity ?? 1) * 100)}%
              </div>
            </Field>
            <Field label="Effect">
              <select
                value={el.effect ?? "none"}
                onChange={(e) =>
                  update(el.id, { effect: e.target.value as NonNullable<typeof el.effect> })
                }
                className="brutal-border-2 w-full bg-surface px-2 py-1.5 font-mono text-xs text-teal focus:outline-none focus:border-teal"
              >
                <option value="none">none</option>
                <option value="liquid_glass">liquid glass</option>
                <option value="neon">neon glow</option>
                <option value="soft_shadow">soft shadow</option>
                <option value="inner_glow">inner glow</option>
              </select>
            </Field>
            <ShadowEditor shadow={el.shadow} onChange={(s) => update(el.id, { shadow: s })} />
          </PropertyGroup>
        )}

        {el.type === "quiz" && (
          <PropertyGroup label="Quiz content">
            <QuizEditor element={el} onChange={(patch) => update(el.id, patch)} />
          </PropertyGroup>
        )}

        {el.type === "chart" && (
          <PropertyGroup label="Chart data & style">
            <Field label="Style">
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(UI_STYLE_THEMES) as UiStyle[]).map((s) => {
                  const t = UI_STYLE_THEMES[s];
                  const active = el.uiStyle === s;
                  return (
                    <button
                      key={s}
                      onClick={() => update(el.id, chartStylePatch(s))}
                      className={`brutal-press border px-1 py-2 font-display text-[9px] uppercase tracking-[0.12em] ${active ? "border-teal glow-teal" : "border-teal/30"}`}
                      style={{
                        background: t.bg === "rgba(255,255,255,0.16)" ? "#2a3550" : t.bg,
                        color: t.fg,
                      }}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </Field>
            <ChartEditor element={el} onChange={(patch) => update(el.id, patch)} />
          </PropertyGroup>
        )}

        {el.type === "button" && (
          <PropertyGroup label="Button content & action">
            <ButtonEditor element={el} onChange={(patch) => update(el.id, patch)} />
          </PropertyGroup>
        )}

        {(el.type === "icon" || (el.type === "image" && el.assetKind === "icon")) && (
          <PropertyGroup label="Icon properties">
            {el.type === "icon" && <Field label="Icon name">
              <input value={el.name} onChange={(e) => update(el.id, { name: e.target.value })} className="brutal-border-2 w-full bg-surface px-2 py-1.5 font-mono text-xs text-teal focus:outline-none focus:border-teal" />
              <div className="font-mono text-[10px] text-teal/50">&gt; Lineicons SVG asset name</div>
            </Field>}
            <Field label="Color">
              <ColorRow value={el.type === "icon" ? el.color : el.tint ?? "#111827"} onChange={(c) => update(el.id, el.type === "icon" ? { color: c } : { tint: c })} />
            </Field>
            {el.type === "icon" && <Field label="Stroke">
              <input type="range" min={0.5} max={4} step={0.25} value={el.strokeWidth} onChange={(e) => update(el.id, { strokeWidth: +e.target.value })} className="w-full accent-teal" />
              <div className="font-mono text-[11px] text-teal/70">{el.strokeWidth}</div>
            </Field>}
            <Field label="Opacity">
              <input type="range" min={0} max={1} step={0.05} value={"opacity" in el ? el.opacity ?? 1 : 1} onChange={(e) => update(el.id, { opacity: +e.target.value })} className="w-full accent-teal" />
              <div className="font-mono text-[11px] text-teal/70">{Math.round((("opacity" in el ? el.opacity : 1) ?? 1) * 100)}%</div>
            </Field>
          </PropertyGroup>
        )}

        {el.type === "image" && el.assetKind !== "icon" &&
          (() => {
            const f: ImageFilters = { ...DEFAULT_FILTERS, ...(el.filters ?? {}) };
            const set = (patch: Partial<ImageFilters>) =>
              update(el.id, { filters: { ...f, ...patch } });
            const FX: Array<[keyof ImageFilters, string, number, number, number, string]> = [
              ["brightness", "Brightness", 0, 200, 1, "%"],
              ["contrast", "Contrast", 0, 200, 1, "%"],
              ["saturate", "Saturation", 0, 200, 1, "%"],
              ["blur", "Blur", 0, 30, 0.5, "px"],
              ["grayscale", "Grayscale", 0, 100, 1, "%"],
              ["sepia", "Sepia", 0, 100, 1, "%"],
              ["hueRotate", "Hue", -180, 180, 1, "°"],
              ["invert", "Invert", 0, 100, 1, "%"],
            ];
            return (
              <PropertyGroup label="Image appearance & effects">
                {el.src.startsWith("/illustrations/") && (
                  <Field label="Illustration icon tint">
                    <ColorRow
                      value={el.tint ?? "#111827"}
                      onChange={(tint) => update(el.id, { tint })}
                    />
                    <div className="mt-1 font-mono text-[9px] text-teal/50">
                      Treat this illustration like an icon and recolor its SVG artwork.
                    </div>
                  </Field>
                )}
                <div className="font-display text-[10px] uppercase tracking-[0.25em] text-teal/80">
                  ▸ Image effects
                </div>
                <Field label="Filter presets">
                  <div className="grid grid-cols-2 gap-1.5">
                    {IMAGE_FILTER_PRESETS.map((preset) => {
                      const active = Object.entries(preset.filters).every(([key, value]) => f[key as keyof ImageFilters] === value);
                      return (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => set(preset.filters)}
                          className={`brutal-border-2 brutal-press overflow-hidden text-left ${active ? "border-teal glow-teal" : "border-teal/25 hover:border-teal"}`}
                          title={preset.description}
                        >
                          <div className="h-12 bg-blue-deep" style={{ filter: preset.preview }} aria-hidden="true">
                            <div className="h-full w-full bg-[linear-gradient(135deg,#ff0080_0%,#7df9ff_48%,#172554_100%)]" />
                          </div>
                          <div className="bg-surface px-2 py-1.5">
                            <div className="font-display text-[9px] uppercase tracking-[0.12em] text-teal">{preset.name}</div>
                            <div className="font-mono text-[8px] text-teal/50">{preset.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </Field>
                <Field label="Fit">
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["cover", "contain", "fill"] as const).map((fit) => (
                      <button
                        key={fit}
                        onClick={() => update(el.id, { fit })}
                        className={`brutal-border-2 py-1.5 font-mono text-[10px] uppercase ${
                          (el.fit ?? "cover") === fit
                            ? "bg-blue text-ink border-teal"
                            : "bg-surface text-teal hover:border-teal"
                        }`}
                      >
                        {fit}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Corner radius">
                  <input
                    type="range"
                    min={0}
                    max={Math.floor(Math.min(el.width, el.height) / 2)}
                    value={el.cornerRadius ?? 0}
                    onChange={(e) => update(el.id, { cornerRadius: +e.target.value })}
                    className="w-full accent-teal"
                  />
                  <div className="font-mono text-[11px] text-teal/70">{el.cornerRadius ?? 0}px</div>
                </Field>
                <Field label="Opacity">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={el.opacity ?? 1}
                    onChange={(e) => update(el.id, { opacity: +e.target.value })}
                    className="w-full accent-teal"
                  />
                  <div className="font-mono text-[11px] text-teal/70">
{Math.round((("opacity" in el ? el.opacity : 1) ?? 1) * 100)}%
                  </div>
                </Field>
                <Field label="Border">
                  <input
                    type="range"
                    min={0}
                    max={24}
                    value={el.borderWidth ?? 0}
                    onChange={(e) => update(el.id, { borderWidth: +e.target.value })}
                    className="w-full accent-teal"
                  />
                  <ColorRow
                    value={el.borderColor ?? "#0a0f1f"}
                    onChange={(c) => update(el.id, { borderColor: c })}
                  />
                </Field>
                <Field label="Flip">
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => update(el.id, { flipX: !el.flipX })}
                      className={`brutal-border-2 py-1.5 font-mono text-[10px] uppercase ${el.flipX ? "bg-blue text-ink border-teal" : "bg-surface text-teal hover:border-teal"}`}
                    >
                      horizontal
                    </button>
                    <button
                      onClick={() => update(el.id, { flipY: !el.flipY })}
                      className={`brutal-border-2 py-1.5 font-mono text-[10px] uppercase ${el.flipY ? "bg-blue text-ink border-teal" : "bg-surface text-teal hover:border-teal"}`}
                    >
                      vertical
                    </button>
                  </div>
                </Field>
                <GradientEditor
                  gradient={el.gradient}
                  fill="#7df9ff"
                  onChange={(g) => update(el.id, { gradient: g })}
                />
                {el.gradient && (
                  <Field label="Gradient strength">
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={el.gradientOpacity ?? 0.5}
                      onChange={(e) => update(el.id, { gradientOpacity: +e.target.value })}
                      className="w-full accent-teal"
                    />
                    <div className="font-mono text-[11px] text-teal/70">
                      {Math.round((el.gradientOpacity ?? 0.5) * 100)}%
                    </div>
                  </Field>
                )}
                {FX.map(([key, label, min, max, step, unit]) => (
                  <Field key={key} label={label}>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      step={step}
                      value={f[key]}
                      onChange={(e) => set({ [key]: +e.target.value } as Partial<ImageFilters>)}
                      className="w-full accent-teal"
                    />
                    <div className="font-mono text-[11px] text-teal/70">
                      {f[key]}
                      {unit}
                    </div>
                  </Field>
                ))}
                <button
                  onClick={() => update(el.id, { filters: { ...DEFAULT_FILTERS } })}
                  className="brutal-border-2 brutal-press flex w-full items-center justify-center gap-1 bg-surface py-2 font-mono text-[10px] uppercase tracking-wider text-teal hover:border-teal"
                >
                  <RotateCcw className="h-3 w-3" strokeWidth={3} /> Reset effects
                </button>
                <ShadowEditor shadow={el.shadow} onChange={(s) => update(el.id, { shadow: s })} />
              </PropertyGroup>
            );
          })()}

        <PropertyGroup label="Interaction & layout">
          <InteractionEditor
            interaction={el.interaction}
            onChange={(interaction) => update(el.id, { interaction })}
          />

          <Field label="Rotation">
          <input
            type="range"
            min={-180}
            max={180}
            value={el.rotation}
            onChange={(e) => update(el.id, { rotation: +e.target.value })}
            className="w-full accent-teal"
          />
          <div className="font-mono text-[11px] text-teal/70">{el.rotation}°</div>
        </Field>

          <Field label="Entrance animation (present mode)">
          <select
            value={el.animation ?? "none"}
            onChange={(e) =>
              update(el.id, { animation: e.target.value as NonNullable<typeof el.animation> })
            }
            className="brutal-border-2 w-full bg-surface px-2 py-1.5 font-mono text-xs text-teal focus:outline-none focus:border-teal"
          >
            <option value="none">none</option>
            <option value="fade-up">fade up</option>
            <option value="pop">pop</option>
            <option value="glitch">glitch</option>
          </select>
          </Field>
        </PropertyGroup>

        <PropertyGroup label="Layer actions">
          <div className="grid grid-cols-2 gap-2">
          <ActionBtn
            onClick={() => bringForward(el.id)}
            icon={<ArrowUp className="h-3 w-3" strokeWidth={3} />}
          >
            Forward
          </ActionBtn>
          <ActionBtn
            onClick={() => sendBackward(el.id)}
            icon={<ArrowDown className="h-3 w-3" strokeWidth={3} />}
          >
            Backward
          </ActionBtn>
          <ActionBtn
            onClick={() => duplicate(el.id)}
            icon={<Copy className="h-3 w-3" strokeWidth={3} />}
          >
            Duplicate
          </ActionBtn>
          <ActionBtn
            onClick={() => remove(el.id)}
            icon={<Trash2 className="h-3 w-3" strokeWidth={3} />}
            danger
          >
            Delete
          </ActionBtn>
          </div>
        </PropertyGroup>
      </div>
    </div>
  );
}

function InteractionEditor({
  interaction,
  onChange,
}: {
  interaction?: { hoverEffect?: HoverEffect; hoverColor?: string; moveToSlide?: number };
  onChange: (value: {
    hoverEffect?: HoverEffect;
    hoverColor?: string;
    moveToSlide?: number;
  }) => void;
}) {
  const effect = interaction?.hoverEffect ?? "none";
  return (
    <Field label="Interactive on hover (present mode)">
      <select
        value={effect}
        onChange={(e) => onChange({ ...interaction, hoverEffect: e.target.value as HoverEffect })}
        className="brutal-border-2 w-full bg-surface px-2 py-1.5 font-mono text-xs text-teal focus:outline-none"
      >
        <option value="none">none</option>
        <option value="glitch">glitch</option>
        <option value="color">change color</option>
        <option value="gradient">gradient fill</option>
      </select>
      {(effect === "color" || effect === "gradient") && (
        <input
          type="color"
          value={interaction?.hoverColor ?? "#ff0080"}
          onChange={(e) =>
            onChange({ ...interaction, hoverEffect: effect, hoverColor: e.target.value })
          }
          className="brutal-border-2 h-8 w-full bg-surface"
          aria-label="Hover color"
        />
      )}
      <input
        type="number"
        min={1}
        placeholder="Move to slide (optional)"
        value={interaction?.moveToSlide ?? ""}
        onChange={(e) =>
          onChange({
            ...interaction,
            moveToSlide: e.target.value ? Math.max(1, +e.target.value) : undefined,
          })
        }
        className="brutal-border-2 w-full bg-surface px-2 py-1.5 font-mono text-xs text-teal focus:outline-none"
      />
    </Field>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block font-display text-[10px] uppercase tracking-[0.2em] text-teal/80">
        ▸ {label}
      </label>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function ColorRow({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1">
        {SWATCHES.map((s) => (
          <button
            key={s}
            onClick={() => onChange(s)}
            className={`brutal-border-2 h-7 w-7 transition-all ${
              value === s ? "border-teal scale-110 glow-teal" : "hover:border-teal"
            }`}
            style={{ background: s }}
          />
        ))}
      </div>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="brutal-border-2 h-9 w-full bg-surface"
      />
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  icon,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`brutal-border-2 brutal-press flex items-center justify-center gap-1 py-2 font-mono text-[10px] uppercase tracking-wider ${
        danger
          ? "bg-destructive text-white border-destructive hover:border-destructive"
          : "bg-surface text-teal hover:border-teal"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function ShadowEditor({
  shadow,
  onChange,
}: {
  shadow: ElementShadow | undefined;
  onChange: (s: ElementShadow | undefined) => void;
}) {
  const enabled = !!shadow;
  const s: ElementShadow = shadow ?? { x: 0, y: 12, blur: 24, color: "#000000" };
  return (
    <>
      <Field label="Drop shadow">
        <div className="flex gap-1">
          <button
            onClick={() => onChange(enabled ? undefined : s)}
            className={`brutal-border-2 flex-1 py-1.5 font-mono text-[10px] uppercase ${
              enabled ? "bg-blue text-ink border-teal" : "bg-surface text-teal hover:border-teal"
            }`}
          >
            {enabled ? "ON" : "OFF"}
          </button>
        </div>
      </Field>
      {enabled && (
        <>
          <Field label="Offset X">
            <input
              type="range"
              min={-60}
              max={60}
              value={s.x}
              onChange={(e) => onChange({ ...s, x: +e.target.value })}
              className="w-full accent-teal"
            />
            <div className="font-mono text-[11px] text-teal/70">{s.x}px</div>
          </Field>
          <Field label="Offset Y">
            <input
              type="range"
              min={-60}
              max={60}
              value={s.y}
              onChange={(e) => onChange({ ...s, y: +e.target.value })}
              className="w-full accent-teal"
            />
            <div className="font-mono text-[11px] text-teal/70">{s.y}px</div>
          </Field>
          <Field label="Blur">
            <input
              type="range"
              min={0}
              max={120}
              value={s.blur}
              onChange={(e) => onChange({ ...s, blur: +e.target.value })}
              className="w-full accent-teal"
            />
            <div className="font-mono text-[11px] text-teal/70">{s.blur}px</div>
          </Field>
          <Field label="Color">
            <input
              type="color"
              value={s.color}
              onChange={(e) => onChange({ ...s, color: e.target.value })}
              className="brutal-border-2 h-9 w-full bg-surface"
            />
          </Field>
        </>
      )}
    </>
  );
}

function GradientEditor({
  gradient,
  fill,
  onChange,
}: {
  gradient: ShapeGradient | undefined;
  fill: string;
  onChange: (g: ShapeGradient | undefined) => void;
}) {
  const enabled = !!gradient;
  const g: ShapeGradient = gradient ?? { from: fill, to: "#ff0080", angle: 45 };
  return (
    <>
      <Field label="Gradient fill">
        <button
          onClick={() => onChange(enabled ? undefined : g)}
          className={`brutal-border-2 w-full py-1.5 font-mono text-[10px] uppercase ${
            enabled ? "bg-blue text-ink border-teal" : "bg-surface text-teal hover:border-teal"
          }`}
        >
          {enabled ? "ON" : "OFF"}
        </button>
      </Field>
      {enabled && (
        <>
          <Field label="From">
            <input
              type="color"
              value={g.from}
              onChange={(e) => onChange({ ...g, from: e.target.value })}
              className="brutal-border-2 h-9 w-full bg-surface"
            />
          </Field>
          <Field label="To">
            <input
              type="color"
              value={g.to}
              onChange={(e) => onChange({ ...g, to: e.target.value })}
              className="brutal-border-2 h-9 w-full bg-surface"
            />
          </Field>
          <Field label="Angle">
            <input
              type="range"
              min={0}
              max={360}
              value={g.angle}
              onChange={(e) => onChange({ ...g, angle: +e.target.value })}
              className="w-full accent-teal"
            />
            <div className="font-mono text-[11px] text-teal/70">{g.angle}°</div>
          </Field>
          <Field label="Gradient type">
            <div className="grid grid-cols-2 gap-1.5">
              {(["linear", "radial"] as const).map((tp) => (
                <button
                  key={tp}
                  onClick={() => onChange({ ...g, type: tp })}
                  className={`brutal-border-2 py-1.5 font-mono text-[10px] uppercase ${
                    (g.type ?? "linear") === tp
                      ? "bg-blue text-ink border-teal"
                      : "bg-surface text-teal hover:border-teal"
                  }`}
                >
                  {tp}
                </button>
              ))}
            </div>
          </Field>
        </>
      )}
    </>
  );
}

function QuizEditor({
  element,
  onChange,
}: {
  element: QuizElement;
  onChange: (patch: Partial<QuizElement>) => void;
}) {
  const setOption = (id: string, text: string) =>
    onChange({ options: element.options.map((o) => (o.id === id ? { ...o, text } : o)) });
  const removeOption = (id: string) => {
    if (element.options.length <= 2) return;
    const next = element.options.filter((o) => o.id !== id);
    onChange({
      options: next,
      correctId: element.correctId === id ? next[0].id : element.correctId,
    });
  };
  const addOption = () => {
    const o: QuizOption = { id: Math.random().toString(36).slice(2, 10), text: "New option" };
    onChange({ options: [...element.options, o] });
  };
  return (
    <>
      <Field label="Question">
        <textarea
          value={element.question}
          onChange={(e) => onChange({ question: e.target.value })}
          rows={2}
          className="brutal-border-2 w-full bg-surface p-2 font-mono text-xs text-teal focus:outline-none focus:border-teal"
        />
      </Field>
      <Field label="Options · pick correct">
        <div className="space-y-1">
          {element.options.map((o) => {
            const correct = o.id === element.correctId;
            return (
              <div key={o.id} className="flex items-center gap-1">
                <button
                  onClick={() => onChange({ correctId: o.id })}
                  title="Mark correct"
                  className={`brutal-border-2 grid h-7 w-7 place-items-center ${
                    correct
                      ? "bg-blue text-ink border-teal"
                      : "bg-surface text-teal/60 hover:border-teal"
                  }`}
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                </button>
                <input
                  value={o.text}
                  onChange={(e) => setOption(o.id, e.target.value)}
                  className="brutal-border-2 flex-1 bg-surface px-2 py-1 font-mono text-xs text-teal focus:outline-none focus:border-teal"
                />
                <button
                  onClick={() => removeOption(o.id)}
                  disabled={element.options.length <= 2}
                  className="brutal-border-2 grid h-7 w-7 place-items-center bg-surface text-teal hover:border-teal disabled:opacity-30"
                >
                  <Trash2 className="h-3 w-3" strokeWidth={3} />
                </button>
              </div>
            );
          })}
          <button
            onClick={addOption}
            className="brutal-border-2 flex w-full items-center justify-center gap-1 bg-surface py-1.5 font-mono text-[10px] uppercase tracking-wider text-teal hover:border-teal"
          >
            <Plus className="h-3 w-3" strokeWidth={3} /> Add option
          </button>
        </div>
      </Field>
      <Field label="Background">
        <input
          type="color"
          value={element.bgColor}
          onChange={(e) => onChange({ bgColor: e.target.value })}
          className="brutal-border-2 h-9 w-full bg-surface"
        />
      </Field>
      <Field label="Text">
        <input
          type="color"
          value={element.fgColor}
          onChange={(e) => onChange({ fgColor: e.target.value })}
          className="brutal-border-2 h-9 w-full bg-surface"
        />
      </Field>
      <Field label="Accent">
        <input
          type="color"
          value={element.accentColor}
          onChange={(e) => onChange({ accentColor: e.target.value })}
          className="brutal-border-2 h-9 w-full bg-surface"
        />
      </Field>
      <div className="font-mono text-[10px] text-teal/50">
        &gt; click options in presentation mode to test
      </div>
    </>
  );
}

function ChartEditor({
  element,
  onChange,
}: {
  element: ChartElement;
  onChange: (patch: Partial<ChartElement>) => void;
}) {
  const setData = (i: number, patch: Partial<{ label: string; value: number }>) => {
    onChange({ data: element.data.map((d, idx) => (idx === i ? { ...d, ...patch } : d)) });
  };
  const addRow = () =>
    onChange({ data: [...element.data, { label: `Item ${element.data.length + 1}`, value: 0 }] });
  const removeRow = (i: number) => onChange({ data: element.data.filter((_, idx) => idx !== i) });
  return (
    <>
      <Field label="Chart type">
        <select
          value={element.chart}
          onChange={(e) => onChange({ chart: e.target.value as ChartKind })}
          className="brutal-border-2 w-full bg-surface px-2 py-1.5 font-mono text-xs text-teal focus:outline-none focus:border-teal"
        >
          <option value="bar">Bar</option>
          <option value="line">Line</option>
          <option value="area">Area</option>
          <option value="pie">Pie</option>
          <option value="donut">Donut</option>
        </select>
      </Field>
      <Field label="Title">
        <input
          value={element.title ?? ""}
          onChange={(e) => onChange({ title: e.target.value })}
          className="brutal-border-2 w-full bg-surface px-2 py-1.5 font-mono text-xs text-teal focus:outline-none focus:border-teal"
        />
      </Field>
      <Field label="Data">
        <div className="space-y-1">
          {element.data.map((row, i) => (
            <div key={i} className="flex items-center gap-1">
              <input
                value={row.label}
                onChange={(e) => setData(i, { label: e.target.value })}
                className="brutal-border-2 min-w-0 flex-1 bg-surface px-2 py-1 font-mono text-[11px] text-teal focus:outline-none focus:border-teal"
              />
              <input
                type="number"
                value={row.value}
                onChange={(e) => setData(i, { value: +e.target.value })}
                className="brutal-border-2 w-16 bg-surface px-2 py-1 font-mono text-[11px] text-teal focus:outline-none focus:border-teal"
              />
              <button
                onClick={() => removeRow(i)}
                className="brutal-border-2 grid h-7 w-7 place-items-center bg-surface text-teal hover:border-destructive"
              >
                <Trash2 className="h-3 w-3" strokeWidth={3} />
              </button>
            </div>
          ))}
          <button
            onClick={addRow}
            className="brutal-border-2 flex w-full items-center justify-center gap-1 bg-surface py-1.5 font-mono text-[10px] uppercase tracking-wider text-teal hover:border-teal"
          >
            <Plus className="h-3 w-3" strokeWidth={3} /> Add row
          </button>
        </div>
      </Field>
      <Field label="Palette">
        <div className="space-y-1">
          {element.colors.map((c, i) => (
            <div key={i} className="flex items-center gap-1">
              <input
                type="color"
                value={c}
                onChange={(e) =>
                  onChange({
                    colors: element.colors.map((col, idx) => (idx === i ? e.target.value : col)),
                  })
                }
                className="brutal-border-2 h-7 w-12 bg-surface"
              />
              <button
                onClick={() => onChange({ colors: element.colors.filter((_, idx) => idx !== i) })}
                className="brutal-border-2 grid h-7 w-7 place-items-center bg-surface text-teal hover:border-destructive"
              >
                <Trash2 className="h-3 w-3" strokeWidth={3} />
              </button>
            </div>
          ))}
          <button
            onClick={() => onChange({ colors: [...element.colors, "#7df9ff"] })}
            className="brutal-border-2 flex w-full items-center justify-center gap-1 bg-surface py-1.5 font-mono text-[10px] uppercase tracking-wider text-teal hover:border-teal"
          >
            <Plus className="h-3 w-3" strokeWidth={3} /> Add color
          </button>
        </div>
      </Field>
      <Field label="Background">
        <input
          type="color"
          value={element.bgColor}
          onChange={(e) => onChange({ bgColor: e.target.value })}
          className="brutal-border-2 h-9 w-full bg-surface"
        />
      </Field>
      <Field label="Foreground">
        <input
          type="color"
          value={element.fgColor}
          onChange={(e) => onChange({ fgColor: e.target.value })}
          className="brutal-border-2 h-9 w-full bg-surface"
        />
      </Field>
      <Field label="Display">
        <div className="flex gap-1">
          <button
            onClick={() => onChange({ showValues: !element.showValues })}
            className={`brutal-border-2 flex-1 py-1.5 font-mono text-[10px] uppercase ${element.showValues ? "bg-blue text-ink border-teal" : "bg-surface text-teal hover:border-teal"}`}
          >
            Values
          </button>
          <button
            onClick={() => onChange({ showAxes: !element.showAxes })}
            className={`brutal-border-2 flex-1 py-1.5 font-mono text-[10px] uppercase ${element.showAxes ? "bg-blue text-ink border-teal" : "bg-surface text-teal hover:border-teal"}`}
          >
            Axes
          </button>
        </div>
      </Field>
    </>
  );
}

function ButtonEditor({
  element,
  onChange,
}: {
  element: ButtonElement;
  onChange: (patch: Partial<ButtonElement>) => void;
}) {
  return (
    <>
      <Field label="Label">
        <input
          value={element.text}
          onChange={(e) => onChange({ text: e.target.value })}
          className="brutal-border-2 w-full bg-surface px-2 py-1.5 font-mono text-xs text-teal focus:outline-none focus:border-teal"
        />
      </Field>
      <Field label="Action">
        <select
          value={element.action}
          onChange={(e) => onChange({ action: e.target.value as ButtonAction })}
          className="brutal-border-2 w-full bg-surface px-2 py-1.5 font-mono text-xs text-teal focus:outline-none focus:border-teal"
        >
          <option value="next-slide">Next slide</option>
          <option value="prev-slide">Previous slide</option>
          <option value="first-slide">First slide</option>
          <option value="last-slide">Last slide</option>
          <option value="link">Open link</option>
        </select>
      </Field>
      {element.action === "link" && (
        <Field label="URL">
          <input
            type="url"
            placeholder="https://example.com"
            value={element.href ?? ""}
            onChange={(e) => onChange({ href: e.target.value })}
            className="brutal-border-2 w-full bg-surface px-2 py-1.5 font-mono text-xs text-teal focus:outline-none focus:border-teal"
          />
        </Field>
      )}
      <Field label="Background">
        <input
          type="color"
          value={element.bgColor}
          onChange={(e) => onChange({ bgColor: e.target.value })}
          className="brutal-border-2 h-9 w-full bg-surface"
        />
      </Field>
      <Field label="Text color">
        <input
          type="color"
          value={element.fgColor}
          onChange={(e) => onChange({ fgColor: e.target.value })}
          className="brutal-border-2 h-9 w-full bg-surface"
        />
      </Field>
      <Field label="Border color">
        <input
          type="color"
          value={element.borderColor}
          onChange={(e) => onChange({ borderColor: e.target.value })}
          className="brutal-border-2 h-9 w-full bg-surface"
        />
      </Field>
      <Field label="Border width">
        <input
          type="range"
          min={0}
          max={16}
          value={element.borderWidth}
          onChange={(e) => onChange({ borderWidth: +e.target.value })}
          className="w-full accent-teal"
        />
        <div className="font-mono text-[11px] text-teal/70">{element.borderWidth}px</div>
      </Field>
      <Field label="Corner radius">
        <input
          type="range"
          min={0}
          max={64}
          value={element.cornerRadius}
          onChange={(e) => onChange({ cornerRadius: +e.target.value })}
          className="w-full accent-teal"
        />
        <div className="font-mono text-[11px] text-teal/70">{element.cornerRadius}px</div>
      </Field>
      <Field label="Font size">
        <input
          type="range"
          min={12}
          max={120}
          value={element.fontSize}
          onChange={(e) => onChange({ fontSize: +e.target.value })}
          className="w-full accent-teal"
        />
        <div className="font-mono text-[11px] text-teal/70">{element.fontSize}px</div>
      </Field>
      <Field label="Font">
        <select
          value={element.fontFamily}
          onChange={(e) => onChange({ fontFamily: e.target.value })}
          className="brutal-border-2 w-full bg-surface px-2 py-1.5 font-mono text-xs text-teal focus:outline-none focus:border-teal"
        >
          {["Archivo Black", "Inter", "Orbitron", "JetBrains Mono", "Georgia"].map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
      </Field>
      <div className="font-mono text-[10px] text-teal/50">&gt; clickable in presentation mode</div>
    </>
  );
}
