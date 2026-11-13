import { useState } from "react";
import { useEditor } from "@/store/editor";
import { ChipGroup } from "../ui/selectors";

type BgPreset = { name: string; css: string };

const GRADIENTS: BgPreset[] = [
  { name: "Ocean", css: "linear-gradient(135deg,#0ea5e9,#2563eb)" },
  { name: "Sunset", css: "linear-gradient(135deg,#f97316,#ec4899)" },
  { name: "Grape", css: "linear-gradient(135deg,#8b5cf6,#d946ef)" },
  { name: "Forest", css: "linear-gradient(135deg,#059669,#84cc16)" },
  { name: "Peach", css: "linear-gradient(135deg,#fecaca,#fde68a)" },
  { name: "Slate", css: "linear-gradient(135deg,#0f172a,#334155)" },
  { name: "Ice", css: "linear-gradient(135deg,#e0f2fe,#c7d2fe)" },
  { name: "Gold", css: "linear-gradient(135deg,#f59e0b,#fbbf24)" },
  { name: "Candy", css: "linear-gradient(120deg,#f472b6,#a78bfa,#60a5fa)" },
];

const MESH: BgPreset[] = [
  { name: "Aurora", css: "radial-gradient(at 20% 20%,#22d3ee 0px,transparent 50%),radial-gradient(at 80% 10%,#a78bfa 0px,transparent 50%),radial-gradient(at 50% 90%,#34d399 0px,transparent 50%),#0f172a" },
  { name: "Blush", css: "radial-gradient(at 15% 25%,#fda4af 0px,transparent 55%),radial-gradient(at 85% 20%,#fcd34d 0px,transparent 50%),radial-gradient(at 70% 85%,#c4b5fd 0px,transparent 55%),#fff1f2" },
  { name: "Deep space", css: "radial-gradient(at 70% 30%,#4338ca 0px,transparent 55%),radial-gradient(at 20% 80%,#0ea5e9 0px,transparent 50%),radial-gradient(at 90% 90%,#db2777 0px,transparent 45%),#020617" },
  { name: "Mint", css: "radial-gradient(at 25% 20%,#6ee7b7 0px,transparent 55%),radial-gradient(at 80% 70%,#a7f3d0 0px,transparent 55%),#ecfeff" },
  { name: "Ember", css: "radial-gradient(at 20% 30%,#fb923c 0px,transparent 55%),radial-gradient(at 80% 60%,#ef4444 0px,transparent 50%),#1c1917" },
  { name: "Lavender", css: "radial-gradient(at 30% 20%,#c4b5fd 0px,transparent 55%),radial-gradient(at 75% 75%,#f5d0fe 0px,transparent 55%),#faf5ff" },
];

const PATTERNS: BgPreset[] = [
  { name: "Dots dark", css: "radial-gradient(circle,#ffffff 2px,transparent 2.5px) 0 0 / 28px 28px #1e293b" },
  { name: "Dots light", css: "radial-gradient(circle,#cbd5e1 2px,transparent 2.5px) 0 0 / 24px 24px #f8fafc" },
  { name: "Grid", css: "linear-gradient(#e2e8f0 1px,transparent 1px) 0 0 / 40px 40px,linear-gradient(90deg,#e2e8f0 1px,transparent 1px) 0 0 / 40px 40px #ffffff" },
  { name: "Blueprint", css: "repeating-linear-gradient(0deg,#dbeafe 0 2px,transparent 2px 26px),repeating-linear-gradient(90deg,#dbeafe 0 2px,transparent 2px 26px) #eff6ff" },
  { name: "Stripes dark", css: "repeating-linear-gradient(45deg,#0f172a 0 14px,#1e293b 14px 28px)" },
  { name: "Candy stripes", css: "repeating-linear-gradient(45deg,#f472b6 0 18px,#fbcfe8 18px 36px)" },
  { name: "Checker", css: "repeating-conic-gradient(#e2e8f0 0% 25%,#ffffff 0% 50%) 0 0 / 48px 48px" },
  { name: "Halftone", css: "radial-gradient(circle,#0f172a 3px,transparent 3.5px) 0 0 / 20px 20px,radial-gradient(circle,#0f172a 3px,transparent 3.5px) 10px 10px / 20px 20px #f1f5f9" },
];

const CATEGORIES = ["Gradients", "Mesh", "Patterns"] as const;

/**
 * One-click background presets for the current slide: linear gradients,
 * multi-radial mesh gradients and repeating patterns. Applied through
 * setBg, so they participate in undo and master-style push like any bg.
 */
export function BackgroundsPanel() {
  const { setBg, bgColor } = useEditor();
  const [cat, setCat] = useState<string>("Gradients");
  const presets = cat === "Mesh" ? MESH : cat === "Patterns" ? PATTERNS : GRADIENTS;
  const active = presets.find((p) => p.css === bgColor);

  return (
    <div className="space-y-3">
      <ChipGroup
        value={cat}
        options={CATEGORIES.map((c) => ({ value: c, label: c }))}
        onChange={setCat}
        label="Background categories"
      />
      <div className="grid grid-cols-3 gap-2">
        {presets.map((p) => {
          const isActive = active?.name === p.name;
          return (
            <button
              key={p.name}
              type="button"
              title={p.name}
              aria-label={"Background: " + p.name}
              aria-pressed={isActive}
              onClick={() => setBg(p.css)}
              className={
                "h-16 overflow-hidden rounded-xl border transition " +
                (isActive ? "border-blue-500 ring-2 ring-blue-500/30" : "border-slate-200 hover:border-slate-300")
              }
            >
              <span className="block size-full" style={{ background: p.css }} />
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-400">
        Click a swatch to apply it to the current slide. Undo works as usual, and Master style pushes it deck-wide.
      </p>
    </div>
  );
}
