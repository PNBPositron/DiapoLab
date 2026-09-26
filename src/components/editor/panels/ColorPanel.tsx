import { useEffect, useRef, useState } from "react";
import { useEditor } from "@/store/editor";
import { PanelHeader } from "./TextPanel";
import { ImagePlus, X, Pipette, Check } from "lucide-react";

const PALETTES: { name: string; colors: string[] }[] = [
  {
    name: "Cyber Ink",
    colors: ["#0a0f1f", "#101a2e", "#1a2742", "#0f3460", "#16213e", "#1b1b2f"],
  },
  {
    name: "Neon",
    colors: ["#7df9ff", "#00d9ff", "#0ea5e9", "#4d7cff", "#1f3fb8", "#a855f7"],
  },
  {
    name: "Hot",
    colors: ["#ff0080", "#ff4081", "#ff6b35", "#ffd84a", "#fbbf24", "#f97316"],
  },
  {
    name: "Acid",
    colors: ["#39ff14", "#84cc16", "#22c55e", "#10b981", "#06b6d4", "#14b8a6"],
  },
  {
    name: "Pastel",
    colors: ["#fef3c7", "#fce7f3", "#dbeafe", "#dcfce7", "#ede9fe", "#ffe4e6"],
  },
  {
    name: "Mono",
    colors: ["#000000", "#1f1f1f", "#404040", "#737373", "#d4d4d4", "#ffffff"],
  },
];

const GRADIENT_PACKS = [
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
];

/* ---------------------------------------------------------------------------
   ColorPicker — remplace <input type="color"> natif.
   Zone saturation/valeur + slider de teinte + hex + pipette (EyeDropper API).
--------------------------------------------------------------------------- */

type RGB = { r: number; g: number; b: number };

function hexToRgb(hex: string): RGB {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h || "000000", 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHex({ r, g, b }: RGB): string {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}
function rgbToHsv({ r, g, b }: RGB): { h: number; s: number; v: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}
function hsvToRgb(h: number, s: number, v: number): RGB {
  const c = v * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let rn = 0, gn = 0, bn = 0;
  if (hp < 1) [rn, gn, bn] = [c, x, 0];
  else if (hp < 2) [rn, gn, bn] = [x, c, 0];
  else if (hp < 3) [rn, gn, bn] = [0, c, x];
  else if (hp < 4) [rn, gn, bn] = [0, x, c];
  else if (hp < 5) [rn, gn, bn] = [x, 0, c];
  else [rn, gn, bn] = [c, 0, x];
  const m = v - c;
  return { r: (rn + m) * 255, g: (gn + m) * 255, b: (bn + m) * 255 };
}

export function ColorPicker({
  value,
  onChange,
  compact = false,
}: {
  value: string;
  onChange: (hex: string) => void;
  compact?: boolean;
}) {
  const safeHex = /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#0a0f1f";
  const [hsv, setHsv] = useState(() => rgbToHsv(hexToRgb(safeHex)));
  const [hexDraft, setHexDraft] = useState(safeHex);
  const svRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  // Sync quand la valeur change de l'extérieur
  useEffect(() => {
    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
      setHsv(rgbToHsv(hexToRgb(value)));
      setHexDraft(value);
    }
  }, [value]);

  const emit = (h: number, s: number, v: number) => {
    setHsv({ h, s, v });
    const hex = rgbToHex(hsvToRgb(h, s, v));
    setHexDraft(hex);
    onChange(hex);
  };

  const applyFromPointer = (clientX: number, clientY: number) => {
    const el = svRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const s = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const v = 1 - Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    emit(hsv.h, s, v);
  };

  const onSvDown = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    applyFromPointer(e.clientX, e.clientY);
  };
  const onSvMove = (e: React.PointerEvent) => {
    if (dragging.current) applyFromPointer(e.clientX, e.clientY);
  };
  const onSvUp = () => {
    dragging.current = false;
  };

  const pickWithEyedropper = async () => {
    const EyeDropper = (window as any).EyeDropper;
    if (!EyeDropper) return;
    try {
      const res = await new EyeDropper().open();
      if (res?.sRGBHex) onChange(res.sRGBHex);
    } catch {
      /* utilisateur a annulé */
    }
  };

  const hasEyedropper = typeof window !== "undefined" && "EyeDropper" in window;

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {/* Zone saturation / valeur */}
      <div
        ref={svRef}
        onPointerDown={onSvDown}
        onPointerMove={onSvMove}
        onPointerUp={onSvUp}
        onPointerCancel={onSvUp}
        className="relative h-28 w-full cursor-crosshair touch-none rounded-xl border border-slate-200"
        style={{
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h} 100% 50%))`,
        }}
      >
        <div
          className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_4px_rgba(0,0,0,0.4)]"
          style={{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            background: safeHex,
          }}
        />
      </div>

      {/* Slider de teinte */}
      <input
        type="range"
        min={0}
        max={360}
        value={Math.round(hsv.h)}
        onChange={(e) => emit(+e.target.value, hsv.s, hsv.v)}
        className="h-2.5 w-full cursor-pointer appearance-none rounded-full [&::-webkit-slider-thumb]\:size-4 [&::-webkit-slider-thumb]\:appearance-none [&::-webkit-slider-thumb]\:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]\:border-white [&::-webkit-slider-thumb]\:shadow-md"
        style={{
          background:
            "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
        }}
      />

      {/* Hex + pipette */}
      <div className="flex items-center gap-2">
        <div
          className="size-8 shrink-0 rounded-lg border border-slate-200"
          style={{ background: safeHex }}
        />
        <input
          value={hexDraft}
          onChange={(e) => {
            const v = e.target.value.startsWith("#") ? e.target.value : "#" + e.target.value;
            setHexDraft(v);
            if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v.toLowerCase());
          }}
          spellCheck={false}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-xs text-slate-800 outline-none transition focus\:border-blue-500 focus\:bg-white focus\:ring-4 focus:ring-blue-500/10"
        />
        {hasEyedropper && (
          <button
            onClick={pickWithEyedropper}
            title="Pick color from screen"
            className="grid size-8 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover\:border-blue-300 hover\:text-blue-600"
          >
            <Pipette className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------- */

export function ColorPanel() {
  const { bgColor, setBg, pages, currentIndex, setBgImage } = useEditor();
  const page = pages[currentIndex];
  const bgImage = page.bgImage;
  const bgFit = page.bgFit ?? "cover";
  const fileRef = useRef<HTMLInputElement>(null);
  const [gradientFrom, setGradientFrom] = useState("#00d9ff");
  const [gradientTo, setGradientTo] = useState("#ff0080");
  const [gradientAngle, setGradientAngle] = useState(135);
  const [gradientType, setGradientType] = useState<"linear" | "radial">("linear");
  const [openPicker, setOpenPicker] = useState<"from" | "to" | "bg" | null>(null);

  const customGradient = gradientType === "radial"
    ? `radial-gradient(circle at center, ${gradientFrom}, ${gradientTo})`
    : `linear-gradient(${gradientAngle}deg, ${gradientFrom}, ${gradientTo})`;

  const onPickImage = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert("Image too large (max 5MB)");
      return;
    }
    const r = new FileReader();
    r.onload = () => setBgImage(r.result as string, bgFit);
    r.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <PanelHeader title="Background" />

      {openPicker === "bg" && (
        <div className="mx-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_1px_4px_rgba(15,23,42,0.04)]">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Custom color</span>
            <button onClick={() => setOpenPicker(null)} className="grid size-6 place-items-center rounded-md text-slate-400 transition hover\:bg-slate-100 hover\:text-slate-700" title="Done">
              <Check className="size-3.5" />
            </button>
          </div>
          <ColorPicker value={bgColor.startsWith("#") ? bgColor : "#0a0f1f"} onChange={(hex) => setBg(hex)} />
        </div>
      )}

      {/* Image de fond */}
      <div className="mx-4 space-y-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_1px_4px_rgba(15,23,42,0.04)]">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Background image</div>
        {bgImage ? (
          <div className="relative">
            <img src={bgImage} alt="Background image preview" className="h-20 w-full rounded-lg border border-slate-200 object-cover" />
            <button
              onClick={() => setBgImage(undefined)}
              className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-white/90 text-slate-500 shadow-sm backdrop-blur transition hover\:bg-red-50 hover\:text-red-500"
              title="Remove"
            >
              <X className="size-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-2 py-2.5 text-[11px] text-slate-500 transition hover\:border-blue-400 hover\:bg-blue-50/50 hover\:text-blue-600"
          >
            <ImagePlus className="size-3.5" /> Upload image
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPickImage(f);
            e.target.value = "";
          }}
        />
        <input
          type="url"
          placeholder="…or paste image URL"
          defaultValue={bgImage?.startsWith("http") ? bgImage : ""}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v) setBgImage(v, bgFit);
          }}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-800 outline-none transition placeholder\:text-slate-400 focus\:border-blue-500 focus\:bg-white focus\:ring-4 focus\:ring-blue-500/10"
        />
        {bgImage && (
          <div className="flex gap-1.5 rounded-lg bg-slate-100 p-1">
            {(["cover", "contain"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setBgImage(bgImage, f)}
                className={`flex-1 rounded-md py-1 text-[10px] font-semibold uppercase tracking-wide transition ${
                  bgFit === f ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover\:text-slate-700"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Dégradés prédéfinis */}
      <div className="space-y-3 px-4">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Gradient packs</div>
        {GRADIENT_PACKS.map((pack) => (
          <div key={pack
