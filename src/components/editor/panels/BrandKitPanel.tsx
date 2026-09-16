import { useSettings, DEFAULT_BRAND_KIT, type BrandKit } from "@/store/settings";
import { WandSparkles } from "lucide-react";
import { useEditor } from "@/store/editor";
import { PanelHeader } from "./TextPanel";
import { FONTS } from "./TextPanel";
import { useState } from "react";

const SWATCHES: Array<{ key: keyof BrandKit; label: string }> = [
  { key: "primary", label: "Primary" },
  { key: "secondary", label: "Secondary" },
  { key: "accent", label: "Accent" },
  { key: "bg", label: "Background" },
  { key: "text", label: "Text" },
];

export function BrandKitPanel() {
  const { brandKit, setBrandKit, resetBrandKit } = useSettings();
  const applyBrandKit = useEditor((s) => s.applyBrandKit);
  const [generating, setGenerating] = useState(false);
  const generateRandomKit = () => {
    setGenerating(true);
    const colors = Array.from({ length: 5 }, () => `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")}`);
    setBrandKit({ primary: colors[0], secondary: colors[1], accent: colors[2], bg: colors[4], text: colors[3] });
    window.setTimeout(() => setGenerating(false), 180);
  };

  return (
    <div className="space-y-3">
      <PanelHeader title="Brand Kit" />

      <button
        type="button"
        onClick={generateRandomKit}
        disabled={generating}
        className="brutal-border-2 brutal-press w-full bg-blue py-2 font-display text-[10px] uppercase tracking-[0.15em] text-ink disabled:opacity-60"
      >
        <WandSparkles className="mr-1 inline-block size-3.5" />
        {generating ? "Generating..." : "Generate random palette"}
      </button>

      <div className="grid grid-cols-1 gap-1.5">
        {SWATCHES.map((s) => (
          <label
            key={s.key}
            className="brutal-border-2 flex items-center gap-2 bg-surface px-2 py-1.5"
          >
            <input
              type="color"
              value={brandKit[s.key] as string}
              onChange={(e) => setBrandKit({ [s.key]: e.target.value } as Partial<BrandKit>)}
              className="h-6 w-8 shrink-0 cursor-pointer bg-transparent"
              aria-label={`${s.label} colour`}
            />
            <span className="min-w-0 flex-1 font-mono text-[10px] uppercase tracking-wider text-teal/70">
              {s.label}
            </span>
            <span className="shrink-0 font-mono text-[10px] text-teal/50">
              {brandKit[s.key] as string}
            </span>
          </label>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-teal/60">
            Heading
          </span>
          <select
            value={brandKit.headingFont}
            onChange={(e) => setBrandKit({ headingFont: e.target.value })}
            className="brutal-border-2 w-full bg-surface px-1.5 py-1.5 font-mono text-[10px] text-teal focus:border-teal focus:outline-none"
          >
            {FONTS.map((f) => (
              <option key={f.family} value={f.family}>{f.family}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-teal/60">
            Body
          </span>
          <select
            value={brandKit.bodyFont}
            onChange={(e) => setBrandKit({ bodyFont: e.target.value })}
            className="brutal-border-2 w-full bg-surface px-1.5 py-1.5 font-mono text-[10px] text-teal focus:border-teal focus:outline-none"
          >
            {FONTS.map((f) => (
              <option key={f.family} value={f.family}>{f.family}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => applyBrandKit(brandKit, "slide")}
          className="brutal-border-2 brutal-press bg-surface py-2 font-display text-[10px] uppercase tracking-[0.15em] text-teal hover:border-teal"
        >
          ▸ This slide
        </button>
        <button
          onClick={() => applyBrandKit(brandKit, "deck")}
          className="brutal-border brutal-press bg-blue py-2 font-display text-[10px] uppercase tracking-[0.15em] text-ink"
        >
          ▸ Whole deck
        </button>
      </div>
      <button
        onClick={resetBrandKit}
        className="w-full font-mono text-[10px] uppercase tracking-wider text-teal/50 hover:text-teal"
      >
        reset to default ({DEFAULT_BRAND_KIT.primary})
      </button>
    </div>
  );
}
