import { useState } from "react";
import { useSettings, DEFAULT_BRAND_KIT, type BrandKit } from "@/store/settings";
import { WandSparkles, Check, Layers, Copy, RotateCcw } from "lucide-react";
import { useEditor } from "@/store/editor";
import { PanelHeader, FONTS } from "./TextPanel";
import { ColorPicker } from "../ColorPicker";

const SWATCHES: Array<{ key: keyof BrandKit; label: string; hint: string }> = [
  { key: "primary", label: "Primary", hint: "Main brand color — buttons, highlights" },
  { key: "secondary", label: "Secondary", hint: "Supporting color — accents, tags" },
  { key: "accent", label: "Accent", hint: "Pop color — emphasis, links" },
  { key: "bg", label: "Background", hint: "Slide background tint" },
  { key: "text", label: "Text", hint: "Default text color" },
];

export function BrandKitPanel() {
  const { brandKit, setBrandKit, resetBrandKit } = useSettings();
  const applyBrandKit = useEditor((s) => s.applyBrandKit);
  const [generating, setGenerating] = useState(false);
  const [openKey, setOpenKey] = useState<keyof BrandKit | null>(null);

  const generateRandomKit = () => {
    setGenerating(true);
    const colors = Array.from(
      { length: 5 },
      () => `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")}`
    );
    setBrandKit({ primary: colors[0], secondary: colors[1], accent: colors[2], bg: colors[4], text: colors[3] });
    window.setTimeout(() => setGenerating(false), 180);
  };

  return (
    <div className="space-y-4">
      <PanelHeader title="Brand Kit" />

      {/* Générateur */}
      <div className="px-4">
        <button
          type="button"
          onClick={generateRandomKit}
          disabled={generating}
          className="group flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.25)] transition-all hover:bg-blue-700 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
        >
          <WandSparkles className={`size-3.5 ${generating ? "animate-spin" : "transition-transform group-hover:rotate-12"}`} />
          {generating ? "Generating…" : "Generate random palette"}
        </button>
      </div>

      {/* Aperçu live du kit */}
      <div className="px-4">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_4px_rgba(15,23,42,0.04)]">
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
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Colors</div>
        {SWATCHES.map((s) => (
          <div key={s.key}>
            <button
              type="button"
              onClick={() => setOpenKey(openKey === s.key ? null : s.key)}
              className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition ${
                openKey === s.key
                  ? "border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/10"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span
                className="size-6 shrink-0 rounded-full border border-slate-200 shadow-2xs"
                style={{ backgroundColor: brandKit[s.key] as string }}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold text-slate-700">{s.label}</span>
                <span className="block font-mono text-[9px] uppercase text-slate-400">
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
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {key === "headingFont" ? "Heading font" : "Body font"}
            </span>
            <select
              value={brandKit[key]}
              onChange={(e) => setBrandKit({ [key]: e.target.value })}
              className="w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-700 outline-none transition hover:border-slate-300 focus:border-blue-500"
            >
              {FONTS.map((f) => (
                <option key={f.family} value={f.family}>
                  {f.family}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      {/* Application */}
      <div className="space-y-2 px-4">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Apply to</div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => applyBrandKit(brandKit, "slide")}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50"
          >
            <Check className="size-3.5 text-blue-600" /> This slide
          </button>
          <button
            onClick={() => applyBrandKit(brandKit, "deck")}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-[11px] font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.25)] transition hover:bg-blue-700 active:scale-[0.98]"
          >
            <Layers className="size-3.5" /> Whole deck
          </button>
        </div>
        <button
          onClick={resetBrandKit}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[10px] text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
        >
          <RotateCcw className="size-3" /> Reset to default ({DEFAULT_BRAND_KIT.primary})
        </button>
      </div>
    </div>
  );
}
