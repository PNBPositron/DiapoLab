import { useRef, useState } from "react";
import { useEditor } from "@/store/editor";
import { PanelHeader } from "./TextPanel";
import { ImagePlus, X } from "lucide-react";

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

const GRADIENT_WALLPAPERS = [
  { name: "Neon dusk", value: "linear-gradient(135deg, #050816 0%, #172554 48%, #ff0080 100%)" },
  { name: "Electric tide", value: "linear-gradient(120deg, #07111f 0%, #00d9ff 52%, #7c3aed 100%)" },
  { name: "Signal bloom", value: "radial-gradient(circle at 20% 20%, #ff0080, #0a0f1f 62%)" },
  { name: "Acid night", value: "linear-gradient(160deg, #0a0f1f 0%, #123c4a 50%, #39ff14 140%)" },
  { name: "Chrome heat", value: "linear-gradient(115deg, #111827 0%, #64748b 35%, #f8fafc 50%, #ff4081 72%, #1f2937 100%)" },
  { name: "Ultraviolet", value: "radial-gradient(circle at 75% 25%, #7df9ff 0%, #4d7cff 28%, #a855f7 55%, #0a0f1f 82%)" },
  { name: "Solar flare", value: "linear-gradient(145deg, #0a0f1f 5%, #ff0080 38%, #ff6b35 65%, #ffd84a 100%)" },
  { name: "Aurora grid", value: "linear-gradient(125deg, #07111f 0%, #14b8a6 34%, #4d7cff 68%, #ff6ec7 100%)" },
];

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

      <div className="brutal-border-2 space-y-2 bg-surface p-3">
        <div className="font-display text-[10px] uppercase tracking-[0.2em] text-teal/80">
          ▸ Background image
        </div>
        {bgImage ? (
          <div className="relative">
            <img src={bgImage} alt="Background image preview" className="h-20 w-full border border-teal/40 object-cover" />
            <button
              onClick={() => setBgImage(undefined)}
              className="absolute right-1 top-1 grid h-5 w-5 place-items-center bg-ink/90 text-teal hover:text-[#ff0080]"
              title="Remove"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 border border-dashed border-teal/40 bg-ink px-2 py-2 font-mono text-[10px] text-teal/70 hover:border-teal hover:text-teal"
          >
            <ImagePlus className="h-3.5 w-3.5" /> upload image
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
          className="w-full border border-teal/40 bg-ink px-2 py-1.5 font-mono text-[10px] text-teal placeholder:text-teal/30 focus:border-teal focus:outline-none"
        />
        {bgImage && (
          <div className="flex gap-1">
            {(["cover", "contain"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setBgImage(bgImage, f)}
                className={`brutal-border-2 flex-1 py-1 font-mono text-[10px] uppercase ${
                  bgFit === f ? "bg-blue text-ink border-teal" : "bg-surface text-teal hover:border-teal"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="mb-1.5 block font-display text-[10px] uppercase tracking-[0.2em] text-teal/80">▸ Gradient wallpapers</label>
        <div className="grid grid-cols-2 gap-2">
          {GRADIENT_WALLPAPERS.map((wallpaper) => (
            <button key={wallpaper.name} onClick={() => { setBgImage(undefined); setBg(wallpaper.value); }} className="brutal-border-2 h-16 hover:border-teal" style={{ background: wallpaper.value }} aria-label={`Apply ${wallpaper.name} wallpaper`} title={wallpaper.name} />
          ))}
        </div>
      </div>

      <div className="brutal-border-2 space-y-3 bg-surface p-3">
        <div className="font-display text-[10px] uppercase tracking-[0.2em] text-teal/80">▸ Custom gradient</div>
        <button className="brutal-border-2 h-16 w-full hover:border-teal" style={{ background: customGradient }} onClick={() => { setBgImage(undefined); setBg(customGradient); }} aria-label="Apply custom gradient" />
        <div className="grid grid-cols-2 gap-2 font-mono text-[10px] text-teal/80">
          <label className="flex items-center justify-between gap-2">From <input type="color" value={gradientFrom} onChange={(e) => setGradientFrom(e.target.value)} className="h-7 w-9 bg-transparent" /></label>
          <label className="flex items-center justify-between gap-2">To <input type="color" value={gradientTo} onChange={(e) => setGradientTo(e.target.value)} className="h-7 w-9 bg-transparent" /></label>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {(["linear", "radial"] as const).map((type) => (
            <button key={type} onClick={() => setGradientType(type)} className={`brutal-border-2 py-1 font-mono text-[10px] uppercase ${gradientType === type ? "border-teal bg-blue text-ink" : "bg-ink text-teal"}`}>{type}</button>
          ))}
        </div>
        {gradientType === "linear" && <label className="flex items-center gap-2 font-mono text-[10px] text-teal/80">Angle <input type="range" min={0} max={360} value={gradientAngle} onChange={(e) => setGradientAngle(+e.target.value)} className="w-full accent-teal" /><span className="w-8 text-right">{gradientAngle}°</span></label>}
        <p className="font-mono text-[9px] text-teal/50">click the preview above to apply it to this slide</p>
      </div>

      {PALETTES.map((p) => (
        <div key={p.name}>
          <label className="mb-1.5 block font-display text-[10px] uppercase tracking-[0.2em] text-teal/80">
            ▸ {p.name}
          </label>
          <div className="grid grid-cols-6 gap-1.5">
            {p.colors.map((c) => (
              <button
                key={c}
                onClick={() => setBg(c)}
                title={c}
                className={`brutal-border-2 h-9 transition-all ${
                  bgColor === c ? "border-teal scale-110 glow-teal" : "hover:border-teal"
                }`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
      ))}

      <div>
        <label className="mb-1.5 block font-display text-[10px] uppercase tracking-[0.2em] text-teal/80">
          ▸ Custom
        </label>
        <div className="flex gap-2">
          <input
            type="color"
            value={bgColor.startsWith("#") ? bgColor : "#0a0f1f"}
            onChange={(e) => setBg(e.target.value)}
            className="brutal-border-2 h-12 w-16 bg-surface"
          />
          <input
            type="text"
            value={bgColor}
            onChange={(e) => setBg(e.target.value)}
            className="brutal-border-2 h-12 flex-1 bg-surface px-2 font-mono text-xs text-teal focus:border-teal focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
