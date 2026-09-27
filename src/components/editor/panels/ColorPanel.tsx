import { useRef, useState } from "react";
import { useEditor } from "@/store/editor";
import { PanelHeader } from "./TextPanel";
import { ColorPicker } from "../ColorPicker";
import { ImagePlus, X, Link2, Check } from "lucide-react";

const PALETTES: { name: string; colors: string[] }[] = [
  { name: "Cyber Ink", colors: ["#0a0f1f", "#101a2e", "#1a2742", "#0f3460", "#16213e", "#1b1b2f"] },
  { name: "Neon", colors: ["#7df9ff", "#00d9ff", "#0ea5e9", "#4d7cff", "#1f3fb8", "#a855f7"] },
  { name: "Hot", colors: ["#ff0080", "#ff4081", "#ff6b35", "#ffd84a", "#fbbf24", "#f97316"] },
  { name: "Acid", colors: ["#39ff14", "#84cc16", "#22c55e", "#10b981", "#06b6d4", "#14b8a6"] },
  { name: "Pastel", colors: ["#fef3c7", "#fce7f3", "#dbeafe", "#dcfce7", "#ede9fe", "#ffe4e6"] },
  { name: "Mono", colors: ["#000000", "#1f1f1f", "#404040", "#737373", "#d4d4d4", "#ffffff"] },
];

const GRADIENT_PACKS: { name: string; gradients: { name: string; value: string }[] }[] = [
  {
    name: "Neon pack",
    gradients: [
      { name: "Neon dusk", value: "linear-gradient(135deg, #050816 0%, #172554 48%, #2b6bff 100%)" },
      { name: "Electric tide", value: "linear-gradient(45deg, #07111f 0%, #123c6a 52%, #00d9ff 100%)" },
      { name: "Ultraviolet", value: "radial-gradient(circle at 75% 25%, #7df9ff 0%, #2b6bff 42%, #0a0f1f 88%)" },
      { name: "Aurora grid", value: "linear-gradient(160deg, #07111f 0%, #1e40af 50%, #38aff0 100%)" },
    ],
  },
  {
    name: "Heat pack",
    gradients: [
      { name: "Signal bloom", value: "radial-gradient(circle at 20% 20%, #ff0080, #0a0f1f 62%)" },
      { name: "Solar flare", value: "linear-gradient(30deg, #0a0f1f 5%, #ff0080 38%, #ff6b35 65%, #ffd84a 100%)" },
      { name: "Chrome heat", value: "linear-gradient(210deg, #111827 0%, #64748b 35%, #f8fafc 50%, #ff4081 72%, #1f2937 100%)" },
      { name: "Acid night", value: "linear-gradient(300deg, #0a0f1f 0%, #123c4a 50%, #39ff14 140%)" },
    ],
  },
  {
    name: "Aurora pack",
    gradients: [
      { name: "Arctic glow", value: "linear-gradient(135deg, #02111f 0%, #14532d 45%, #22d3ee 100%)" },
      { name: "Emerald wave", value: "linear-gradient(200deg, #052e2b 0%, #065f46 55%, #34d399 100%)" },
      { name: "Northern lights", value: "linear-gradient(160deg, #020617 0%, #312e81 45%, #0d9488 100%)" },
      { name: "Glacier", value: "radial-gradient(circle at 80% 15%, #a5f3fc 0%, #0891b2 40%, #083344 85%)" },
    ],
  },
  {
    name: "Sunset pack",
    gradients: [
      { name: "Golden hour", value: "linear-gradient(120deg, #1a0b2e 0%, #7c2d12 45%, #f59e0b 100%)" },
      { name: "Peach dusk", value: "linear-gradient(160deg, #fff7ed 0%, #fda4af 55%, #e11d48 100%)" },
      { name: "Mojito", value: "linear-gradient(200deg, #0a0f1f 0%, #b45309 55%, #fde047 100%)" },
      { name: "Blood moon", value: "radial-gradient(circle at 30% 30%, #fb7185 0%, #9f1239 55%, #1c0a14 100%)" },
    ],
  },
  {
    name: "Pastel pack",
    gradients: [
      { name: "Cotton candy", value: "linear-gradient(135deg, #fce7f3 0%, #e0e7ff 50%, #ccfbf1 100%)" },
      { name: "Lavender haze", value: "linear-gradient(200deg, #f5f3ff 0%, #ddd6fe 55%, #c4b5fd 100%)" },
      { name: "Mint cream", value: "linear-gradient(160deg, #ecfeff 0%, #a7f3d0 50%, #6ee7b7 100%)" },
      { name: "Peach fuzz", value: "radial-gradient(circle at 70% 20%, #fff1e6 0%, #ffd9c0 45%, #ff9e9e 100%)" },
    ],
  },
  {
    name: "Dark pack",
    gradients: [
      { vignette: undefined as never, name: "Midnight oil", value: "linear-gradient(135deg, #000000 0%, #0f172a 55%, #1e293b 100%)" } as any,
      { name: "Charcoal", value: "linear-gradient(160deg, #0a0a0a 0%, #262626 55%, #404040 100%)" },
      { name: "Ink veil", value: "radial-gradient(circle at 50% 0%, #1e293b 0%, #0f172a 60%, #000000 100%)" },
      { name: "Graphite", value: "linear-gradient(45deg, #111827 0%, #374151 50%, #6b7280 100%)" },
    ],
  },
  {
    name: "Mono pack",
    gradients: [
      { name: "Silver fox", value: "linear-gradient(135deg, #f8fafc 0%, #cbd5e1 55%, #64748b 100%)" },
      { name: "Paper", value: "linear-gradient(180deg, #ffffff 0%, #f1f5f9 60%, #e2e8f0 100%)" },
      { name: "Storm grey", value: "linear-gradient(200deg, #f8fafc 0%, #94a3b8 50%, #334155 100%)" },
      { name: "Fog", value: "radial-gradient(circle at 50% 50%, #e2e8f0 0%, #cbd5e1 55%, #94a3b8 100%)" },
    ],
  },
  {
    name: "Cyber pack",
    gradients: [
      { name: "Holo grid", value: "linear-gradient(135deg, #0f172a 0%, #312e81 45%, #ec4899 100%)" },
      { name: "Synthwave", value: "linear-gradient(180deg, #0f0a2e 0%, #7c3aed 55%, #f472b6 100%)" },
      { text: undefined as never, name: "Deep circuit", value: "radial-gradient(circle at 25% 75%, #22d3ee 0%, #4338ca 50%, #020617 100%)" } as any,
      { name: "Matrix rain", value: "linear-gradient(160deg, #010c09 0%, #064e3b 55%, #22c55e 100%)" },
    ],
  },
];
