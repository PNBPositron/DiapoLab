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
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [mood, setMood] = useState("balanced");

  const moods = [
    { value: "balanced", label: "Balanced" },
    { value: "calm", label: "Calm / cool" },
    { value: "bold", label: "Bold / warm" },
    { value: "natural", label: "Natural / earthy" },
    { value: "mono", label: "Monochrome" },
    { value: "sunset", label: "Sunset / coral" },
    { value: "ocean", label: "Ocean / deep blue" },
    { value: "candy", label: "Candy / playful" },
    { value: "forest", label: "Forest / moss" },
    { value: "editorial", label: "Editorial / ink" },
  ];

  const generateRandomKit = async () => {
    setGenerating(true);
    setGenerationError(null);
    try {
      const response = await fetch("/api/colormind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood }),
      });
      const payload = (await response.json()) as { result?: number[][]; error?: string };
      if (!response.ok || !payload.result?.length) throw new Error(payload.error ?? "Could not generate colors");
      const colors = payload.result.map(([r, g, b]) => `#${[r, g, b].map((value) => Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0")).join("")}`);
      setBrandKit({ primary: colors[0], secondary: colors[1], accent: colors[2], bg: colors[4], text: colors[3] });
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : "Could not generate colors");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      <PanelHeader title="Brand Kit" />

      <label className="block">
        <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-teal/60">Color mood</span>
        <select value={mood} onChange={(event) => setMood(event.target.value)} className="brutal-border-2 w-full bg-surface px-2 py-2 font-mono text-[10px] uppercase text-teal focus:border-teal focus:outline-none">
          {moods.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <button
        type="button"
        onClick={generateRandomKit}
        disabled={generating}
        className="brutal-border-2 brutal-press w-full bg-blue py-2 font-display text-[10px] uppercase tracking-[0.15em] text-ink disabled:opacity-60"
      >
        <WandSparkles className="mr-1 inline-block size-3.5" />
        {generating ? "Generating palette..." : "Generate random color kit"}
      </button>
      {generationError && <p className="font-mono text-[9px] text-red-300">{generationError}</p>}

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
