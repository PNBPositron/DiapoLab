import { useRef, useState } from "react";
import { useEditor } from "@/store/editor";
import { PanelHeader } from "./TextPanel";
import { ColorPicker } from "../ColorPicker";
import { ImagePlus, X, Link2 } from "lucide-react";
import { prepareImage } from "@/lib/image-assets";

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
      { name: "Midnight oil", value: "linear-gradient(135deg, #000000 0%, #0f172a 55%, #1e293b 100%)" },
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
      { name: "Deep circuit", value: "radial-gradient(circle at 25% 75%, #22d3ee 0%, #4338ca 50%, #020617 100%)" },
      { name: "Matrix rain", value: "linear-gradient(160deg, #010c09 0%, #064e3b 55%, #22c55e 100%)" },
    ],
  },
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
  const [openPicker, setOpenPicker] = useState<"from" | "to" | "bg" | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const customGradient = gradientType === "radial"
    ? `radial-gradient(circle at center, ${gradientFrom}, ${gradientTo})`
    : `linear-gradient(${gradientAngle}deg, ${gradientFrom}, ${gradientTo})`;

  const onPickImage = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      setBgImage(await prepareImage(file), bgFit);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <PanelHeader title="Background" />

      {/* ------- Image de fond ------- */}
      <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_1px_4px_rgba(15,23,42,0.04)] mx-4">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Background image</div>

        {bgImage ? (
          <div className="relative">
            <img
              src={bgImage}
              alt="Background image preview"
              className="h-20 w-full rounded-lg border border-slate-200 object-cover"
            />
            <button
              onClick={() => setBgImage(undefined)}
              className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-white/90 text-slate-500 shadow-sm backdrop-blur transition hover:bg-red-50 hover:text-red-500"
              title="Remove"
            >
              <X className="size-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-2 py-2.5 text-[11px] text-slate-500 transition hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-600"
          >
            <ImagePlus className="size-3.5" /> {uploading ? "Preparing image…" : "Upload image"}
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onPickImage(f);
            e.target.value = "";
          }}
        />
        {uploadError && <p role="alert" className="text-xs text-destructive">{uploadError}</p>}
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 transition focus-within:border-blue-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10">
          <Link2 className="size-3.5 shrink-0 text-slate-400" />
          <input
            type="url"
            placeholder="…or paste image URL"
            defaultValue={bgImage?.startsWith("http") ? bgImage : ""}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v) setBgImage(v, bgFit);
            }}
            className="min-w-0 flex-1 bg-transparent py-1.5 text-[11px] text-slate-800 outline-none placeholder:text-slate-400"
          />
        </div>
        {bgImage && (
          <div className="flex gap-1.5 rounded-lg bg-slate-100 p-1">
            {(["cover", "contain"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setBgImage(bgImage, f)}
                className={`flex-1 rounded-md py-1 text-[10px] font-semibold uppercase tracking-wide transition ${
                  bgFit === f ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ------- Couleur de fond (palette) ------- */}
      <div className="space-y-2.5 px-4">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Background color</div>
        <div className="flex gap-2">
          <button
            onClick={() => setOpenPicker(openPicker === "bg" ? null : "bg")}
            className={`grid size-11 shrink-0 place-items-center rounded-xl border transition ${
              openPicker === "bg"
                ? "border-blue-500 ring-4 ring-blue-500/10"
                : "border-slate-200 hover:border-blue-300"
            }`}
            style={{ background: bgColor.startsWith("#") ? bgColor : "#0a0f1f" }}
            title="Open color picker"
          />
          <input
            type="text"
            value={bgColor}
            onChange={(e) => setBg(e.target.value)}
            spellCheck={false}
            className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 font-mono text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
          />
        </div>
        {openPicker === "bg" && (
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
            <ColorPicker value={bgColor.startsWith("#") ? bgColor : "#0a0f1f"} onChange={(hex) => setBg(hex)} />
          </div>
        )}
      </div>

      {/* ------- Dégradés prédéfinis ------- */}
      <div className="space-y-3 px-4">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Gradient packs</div>
        {GRADIENT_PACKS.map((pack) => (
          <div key={pack.name} className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">{pack.name}</div>
            <div className="grid grid-cols-2 gap-2">
              {pack.gradients.map((wallpaper) => (
                <button
                  key={wallpaper.name}
                  onClick={() => { setBgImage(undefined); setBg(wallpaper.value); }}
                  className={`h-16 rounded-xl border transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[0_8px_20px_rgba(37,99,235,0.15)] ${
                    bgColor === wallpaper.value
                      ? "border-blue-500 ring-2 ring-blue-500/30"
                      : "border-slate-200"
                  }`}
                  style={{ background: wallpaper.value }}
                  aria-label={`Apply ${wallpaper.name} wallpaper`}
                  title={wallpaper.name}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ------- Dégradé custom ------- */}
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_1px_4px_rgba(15,23,42,0.04)] mx-4">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Custom gradient</div>
        <button
          className="h-16 w-full rounded-xl border border-slate-200 transition-all duration-300 hover:border-blue-300 hover:shadow-[0_8px_20px_rgba(37,99,235,0.15)]"
          style={{ background: customGradient }}
          onClick={() => { setBgImage(undefined); setBg(customGradient); }}
          aria-label="Apply custom gradient"
        />
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setOpenPicker(openPicker === "from" ? null : "from")}
            className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition ${
              openPicker === "from"
                ? "border-blue-500 bg-blue-50 text-blue-600"
                : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300"
            }`}
          >
            <span className="size-4 rounded-full border border-slate-200" style={{ background: gradientFrom }} />
            From
          </button>
          <button
            onClick={() => setOpenPicker(openPicker === "to" ? null : "to")}
            className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition ${
              openPicker === "to"
                ? "border-blue-500 bg-blue-50 text-blue-600"
                : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300"
            }`}
          >
            <span className="size-4 rounded-full border border-slate-200" style={{ background: gradientTo }} />
            To
          </button>
        </div>

        {openPicker === "from" && (
          <ColorPicker value={gradientFrom} onChange={setGradientFrom} />
        )}
        {openPicker === "to" && (
          <ColorPicker value={gradientTo} onChange={setGradientTo} />
        )}

        <div className="flex gap-1.5 rounded-lg bg-slate-100 p-1">
          {(["linear", "radial"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setGradientType(type)}
              className={`flex-1 rounded-md py-1 text-[10px] font-semibold uppercase tracking-wide transition ${
                gradientType === type ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
        {gradientType === "linear" && (
          <label className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-slate-500">
            Angle
            <input
              type="range"
              min={0}
              max={360}
              value={gradientAngle}
              onChange={(e) => setGradientAngle(+e.target.value)}
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-blue-600 [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:shadow"
            />
            <span className="w-8 text-right font-mono text-slate-600">{gradientAngle}°</span>
          </label>
        )}
        <p className="text-[10px] text-slate-400">Click the preview above to apply it to this slide.</p>
      </div>
    </div>
  );
}
