import { useEffect, useRef, useState } from "react";
import { useSettings, DEFAULT_BRAND_KIT, type BrandKit, type CustomFont } from "@/store/settings";
import { Check, Layers, Palette, RotateCcw, SlidersHorizontal, Upload, Trash2, Lock, LockOpen } from "lucide-react";
import { EDITOR_COLOR_PALETTE, useEditor } from "@/store/editor";
import { PanelHeader, FONTS } from "./TextPanel";
import { ColorPicker } from "../ColorPicker";
import { Dropdown } from "../ui/Dropdown";
import { ensureFontFamily, registerCustomFont, unregisterCustomFont } from "@/lib/fontLoader";

const SWATCHES: Array<{ key: keyof BrandKit; label: string; hint: string }> = [
  { key: "primary", label: "Primary", hint: "Main brand color — buttons, highlights" },
  { key: "secondary", label: "Secondary", hint: "Supporting color — accents, tags" },
  { key: "accent", label: "Accent", hint: "Pop color — emphasis, links" },
  { key: "bg", label: "Background", hint: "Slide background tint" },
  { key: "text", label: "Text", hint: "Default text color" },
];

const CURATED_BRAND_KITS: Array<{ name: string; kit: Omit<BrandKit, "locked"> }> = [
  {
    name: "Swiss Editorial",
    kit: { primary: "#e2231a", secondary: "#141414", accent: "#0057b7", bg: "#faf9f6", text: "#141414", headingFont: "Playfair Display", bodyFont: "Inter" },
  },
  {
    name: "Midnight Tech",
    kit: { primary: "#3b82f6", secondary: "#22d3ee", accent: "#818cf8", bg: "#0b1120", text: "#f8fafc", headingFont: "Space Grotesk", bodyFont: "Inter" },
  },
  {
    name: "Aurora SaaS",
    kit: { primary: "#6366f1", secondary: "#06b6d4", accent: "#ec4899", bg: "#f5f7ff", text: "#0f172a", headingFont: "Plus Jakarta Sans", bodyFont: "Inter" },
  },
  {
    name: "Botanical Sage",
    kit: { primary: "#10b981", secondary: "#34d399", accent: "#fbbf24", bg: "#06221b", text: "#ecfdf5", headingFont: "Plus Jakarta Sans", bodyFont: "Inter" },
  },
  {
    name: "Obsidian Gold",
    kit: { primary: "#f59e0b", secondary: "#fde68a", accent: "#fb923c", bg: "#09090b", text: "#fafaf9", headingFont: "Playfair Display", bodyFont: "Inter" },
  },
  {
    name: "Nordic Birch",
    kit: { primary: "#0f766e", secondary: "#0284c7", accent: "#d97706", bg: "#f4f6f8", text: "#1e293b", headingFont: "Inter", bodyFont: "Inter" },
  },
  {
    name: "Sunset Coral",
    kit: { primary: "#ea580c", secondary: "#fb7185", accent: "#f59e0b", bg: "#fff5ed", text: "#2a140d", headingFont: "Playfair Display", bodyFont: "Plus Jakarta Sans" },
  },
  {
    name: "Neo Brutal",
    kit: { primary: "#ff0080", secondary: "#2b6bff", accent: "#00c853", bg: "#fff3d0", text: "#0f0f0f", headingFont: "Archivo Black", bodyFont: "Inter" },
  },
  {
    name: "Cobalt Blueprint",
    kit: { primary: "#38bdf8", secondary: "#7dd3fc", accent: "#facc15", bg: "#0b2550", text: "#e0f2fe", headingFont: "JetBrains Mono", bodyFont: "Inter" },
  },
  {
    name: "Monochrome Ink",
    kit: { primary: "#fafafa", secondary: "#a1a1aa", accent: "#52525b", bg: "#18181b", text: "#fafafa", headingFont: "Inter", bodyFont: "Inter" },
  },
];

export function BrandKitPanel() {
  const { brandKit, setBrandKit, resetBrandKit, customFonts, addCustomFont, removeCustomFont } = useSettings();
  const applyBrandKit = useEditor((s) => s.applyBrandKit);
  const currentPage = useEditor((s) => s.pages[s.currentIndex]);
  const adaptToSlide = () => {
    if (!currentPage) return;
    const colors = currentPage.elements.flatMap((element) => {
      const values = ["color", "fill", "stroke", "accentColor", "bgColor", "fgColor", "backgroundColor"] as const;
      return values.flatMap((key) => {
        const value = element[key as keyof typeof element];
        return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? [value] : [];
      });
    });
    const unique = [...new Set(colors)];
    const background = currentPage.bgColor || brandKit.bg;
    const text = unique.find((color) => color !== background) || brandKit.text;
    const next = {
      ...brandKit,
      primary: unique[0] || brandKit.primary,
      secondary: unique[1] || unique[0] || brandKit.secondary,
      accent: unique[2] || unique[1] || unique[0] || brandKit.accent,
      bg: background,
      text,
    };
    setBrandKit(next);
  };
  const [generating, setGenerating] = useState(false);
  const [openKey, setOpenKey] = useState<keyof BrandKit | null>(null);
  const locked = !!brandKit.locked;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFont, setUploadingFont] = useState(false);

  useEffect(() => {
    for (const f of customFonts) void registerCustomFont(f.name, f.dataUrl);
  }, [customFonts]);

  const onFontUpload = async (file: File) => {
    setUploadingFont(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const name =
        file.name.replace(/\.(ttf|otf|woff2?)$/i, "").replace(/[_-]+/g, " ").trim() ||
        "Custom font";
      await registerCustomFont(name, dataUrl);
      addCustomFont({ id: crypto.randomUUID(), name, dataUrl });
    } finally {
      setUploadingFont(false);
    }
  };

  const onFontDelete = (f: CustomFont) => {
    unregisterCustomFont(f.name);
    removeCustomFont(f.id);
  };

  const generateRandomKit = () => {
    setGenerating(true);
    const colors = [...EDITOR_COLOR_PALETTE].sort(() => Math.random() - 0.5).slice(0, 5);
    setBrandKit({ primary: colors[0], secondary: colors[1], accent: colors[2], bg: colors[4], text: colors[3] });
    window.setTimeout(() => setGenerating(false), 180);
  };

  return (
    <div className="space-y-4">
      <PanelHeader title="Brand Kit" />

      {/* Verrou : protège le kit contre les modifications accidentelles */}
      <div className="px-4">
        <button
          type="button"
          onClick={() => setBrandKit({ locked: !locked })}
          className={`flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-semibold transition ${
            locked
              ? "border-amber-300 bg-amber-50 text-amber-700"
              : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
          }`}
        >
          {locked ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}
          {locked ? "Brand kit locked - unlock to edit" : "Lock brand kit"}
        </button>
      </div>

      <div className={locked ? "pointer-events-none opacity-60" : ""}>
      {/* Générateur & curated palettes */}
      <div className="space-y-3 px-4">
        <button
          type="button"
          onClick={generateRandomKit}
          disabled={generating}
          className="group flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-60"
        >
          <Palette className="size-3.5" />
          {generating ? "Generating…" : "Generate random palette"}
        </button>

        <div>
          <div className="mb-1.5 text-[10px] font-semibold tracking-wide text-slate-500">
            Curated deck palettes
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {CURATED_BRAND_KITS.map((preset) => {
              const active =
                brandKit.primary === preset.kit.primary &&
                brandKit.bg === preset.kit.bg &&
                brandKit.headingFont === preset.kit.headingFont;
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => setBrandKit(preset.kit)}
                  className={`flex flex-col gap-1.5 rounded-lg border px-2.5 py-2 text-left transition ${
                    active
                      ? "border-blue-600 bg-blue-50/70 ring-1 ring-blue-600/20"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-1">
                    {[preset.kit.bg, preset.kit.primary, preset.kit.secondary, preset.kit.accent].map(
                      (c, i) => (
                        <span
                          key={i}
                          className="h-3 flex-1 rounded-sm border border-black/10"
                          style={{ background: c }}
                        />
                      ),
                    )}
                  </div>
                  <div className="truncate text-[10px] font-semibold text-slate-700">
                    {preset.name}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Aperçu live du kit */}
      <div className="px-4">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="relative">
            <div
              className="flex h-24 items-center justify-center px-4"
              style={{ backgroundColor: brandKit.bg }}
            >
              <span
                className="text-lg font-semibold"
                style={{ color: brandKit.text, fontFamily: brandKit.headingFont }}
              >
                Aa
              </span>
              <span
                className="ml-3 text-sm"
                style={{ color: brandKit.accent, fontFamily: brandKit.bodyFont }}
              >
                Brand preview
              </span>
            </div>
            <div className="flex h-4">
              <div className="flex-1" style={{ background: brandKit.primary }} />
              <div className="flex-1" style={{ background: brandKit.secondary }} />
              <div className="flex-1" style={{ background: brandKit.accent }} />
            </div>
          </div>
        </div>
      </div>

      {/* Couleurs */}
      <div className="space-y-2 px-4">
        <div className="text-[10px] font-semibold tracking-wide text-slate-500">Colors</div>
        {SWATCHES.map((s) => (
          <div key={s.key}>
            <button
              type="button"
              onClick={() => setOpenKey(openKey === s.key ? null : s.key)}
              className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition ${
                openKey === s.key
                  ? "border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/10"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span
                className="size-6 shrink-0 rounded-md border border-slate-200"
                style={{ backgroundColor: brandKit[s.key] as string }}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold text-slate-700">{s.label}</span>
                <span className="block font-mono text-[9px] text-slate-400">
                  {brandKit[s.key] as string}
                </span>
              </span>
            </button>
            {openKey === s.key && (
              <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                <ColorPicker
                  value={brandKit[s.key] as string}
                  onChange={(c) => setBrandKit({ [s.key]: c } as Partial<BrandKit>)}
                />
                <p className="mt-2 text-[10px] text-slate-400">{s.hint}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Polices */}
      <div className="grid grid-cols-2 gap-2 px-4">
        {(["headingFont", "bodyFont"] as const).map((key) => (
          <label key={key} className="block">
            <span className="mb-1 block text-[10px] font-semibold tracking-wide text-slate-400">
              {key === "headingFont" ? "Heading font" : "Body font"}
            </span>
            <Dropdown
              value={brandKit[key]}
              options={[...FONTS.map((f) => f.family), ...customFonts.map((f) => f.name)]}
              onChange={(v) => {
                void ensureFontFamily(v);
                setBrandKit({ [key]: v });
              }}
              className="text-[11px]"
            />
          </label>
        ))}
      </div>

      {/* Polices personnalisées (upload) */}
      <div className="space-y-2 px-4">
        <div className="text-[10px] font-semibold tracking-wide text-slate-500">Custom fonts</div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onFontUpload(file);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={uploadingFont}
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
        >
          <Upload className="size-3.5" /> {uploadingFont ? "Importing..." : "Upload a font (.ttf, .otf, .woff, .woff2)"}
        </button>
        {customFonts.map((f) => (
          <div key={f.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
            <span className="truncate text-[12px] text-slate-800" style={{ fontFamily: f.name }}>
              {f.name}
            </span>
            <button
              type="button"
              onClick={() => onFontDelete(f)}
              className="text-slate-400 transition hover:text-red-500"
              title={`Remove ${f.name}`}
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
      </div>

      {/* Application */}
      <div className="space-y-2 px-4">
        <button
          type="button"
          onClick={adaptToSlide}
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
        >
          <SlidersHorizontal className="size-3.5" /> Adapt presets to slide look
        </button>
        <div className="text-[10px] font-semibold tracking-wide text-slate-500">Apply brand kit</div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={adaptToSlide}
            className="flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
          >
            <SlidersHorizontal className="size-3.5" /> Adapt to slide
          </button>
          <button
            onClick={() => applyBrandKit(brandKit, "slide")}
            className="flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <Check className="size-3.5 text-blue-600" /> This slide
          </button>
          <button
            onClick={() => applyBrandKit(brandKit, "deck")}
            className="col-span-2 flex items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-[11px] font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <Layers className="size-3.5" /> Whole deck
          </button>
        </div>
        <button
          onClick={resetBrandKit}
          className="flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-2 text-[10px] text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
        >
          <RotateCcw className="size-3" /> Reset to default ({DEFAULT_BRAND_KIT.primary})
        </button>
      </div>
    </div>
  );
}

