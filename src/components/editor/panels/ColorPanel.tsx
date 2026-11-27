import { useRef, useState } from "react";
import { useEditor } from "@/store/editor";
import { PanelHeader, SegmentedControl } from "../ui/selectors";
import { ColorPicker } from "../ColorPicker";
import { ImagePlus, X, Link2, Plus } from "lucide-react";
import { prepareImage } from "@/lib/image-assets";

type GradientStop = { color: string; pos: number };

const SLIDE_BG_PRESETS: Array<{ label: string; value: string }> = [
  { label: "Pure White", value: "#ffffff" },
  { label: "Warm Ivory", value: "#faf9f6" },
  { label: "Deep Navy", value: "#0b1120" },
  {
    label: "Midnight Tech",
    value: "linear-gradient(135deg, #0b132b 0%, #162447 55%, #1f4068 100%)",
  },
  { label: "Aurora Sky", value: "linear-gradient(135deg, #e0f2fe 0%, #ede9fe 52%, #fce7f3 100%)" },
  { label: "Emerald Dark", value: "linear-gradient(155deg, #041d17 0%, #093529 100%)" },
  {
    label: "Sunset Peach",
    value: "linear-gradient(135deg, #fff1e6 0%, #ffe0cc 55%, #ffd6e0 100%)",
  },
  { label: "Obsidian Noir", value: "linear-gradient(160deg, #09090b 0%, #18181b 100%)" },
  { label: "Cobalt Grid", value: "linear-gradient(160deg, #091d42 0%, #0e3168 100%)" },
  {
    label: "Vapor Violet",
    value: "linear-gradient(155deg, #1b103a 0%, #3a2376 55%, #7c3aed 100%)",
  },
];

export function ColorPanel() {
  const { bgColor, setBg, pages, currentIndex, setBgImage } = useEditor();
  const page = pages[currentIndex];
  const bgImage = page.bgImage;
  const bgFit = page.bgFit ?? "cover";
  const fileRef = useRef<HTMLInputElement>(null);
  const [stops, setStops] = useState<GradientStop[]>([
    { color: "#00d9ff", pos: 0 },
    { color: "#ff0080", pos: 100 },
  ]);
  const [gradientAngle, setGradientAngle] = useState(135);
  const [gradientType, setGradientType] = useState<"linear" | "radial">("linear");
  const [openPicker, setOpenPicker] = useState<number | "bg" | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const sortedStops = [...stops].sort((a, b) => a.pos - b.pos);
  const stopsCss = sortedStops.map((s) => `${s.color} ${s.pos}%`).join(", ");
  const customGradient =
    gradientType === "radial"
      ? `radial-gradient(circle at center, ${stopsCss})`
      : `linear-gradient(${gradientAngle}deg, ${stopsCss})`;

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
        <div className="text-[10px] font-semibold tracking-wide text-slate-500">
          Background image
        </div>

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
        {uploadError && (
          <p role="alert" className="text-xs text-destructive">
            {uploadError}
          </p>
        )}
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
          <SegmentedControl
            label="Background image fit"
            value={bgFit}
            onChange={(fit) => setBgImage(bgImage, fit)}
            options={[
              { value: "cover", label: "Cover" },
              { value: "contain", label: "Contain" },
            ]}
          />
        )}
      </div>

      {/* ------- Couleur de fond (palette) ------- */}
      <div className="space-y-2.5 px-4">
        <div className="text-[10px] font-semibold tracking-wide text-slate-500">
          Background color
        </div>
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
            <ColorPicker
              value={bgColor.startsWith("#") ? bgColor : "#0a0f1f"}
              onChange={(hex) => setBg(hex)}
            />
          </div>
        )}
      </div>

      {/* ------- Backdrop presets ------- */}
      <div className="space-y-2 px-4">
        <div className="text-[10px] font-semibold tracking-wide text-slate-500">
          Backdrop presets
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {SLIDE_BG_PRESETS.map((p) => {
            const active = bgColor === p.value && !bgImage;
            return (
              <button
                key={p.label}
                type="button"
                title={p.label}
                aria-label={p.label}
                onClick={() => {
                  setBgImage(undefined);
                  setBg(p.value);
                }}
                className={`h-8 rounded-lg border transition ${
                  active
                    ? "border-blue-600 ring-2 ring-blue-500/30"
                    : "border-slate-200 hover:border-slate-400"
                }`}
                style={{ background: p.value }}
              />
            );
          })}
        </div>
      </div>

      {/* ------- Dégradé custom ------- */}
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_1px_4px_rgba(15,23,42,0.04)] mx-4">
        <div className="text-[10px] font-semibold tracking-wide text-slate-500">
          Custom gradient
        </div>
        <button
          className="h-16 w-full rounded-xl border border-slate-200 transition-all duration-300 hover:border-blue-300 hover:shadow-[0_8px_20px_rgba(37,99,235,0.15)]"
          style={{ background: customGradient }}
          onClick={() => {
            setBgImage(undefined);
            setBg(customGradient);
          }}
          aria-label="Apply custom gradient"
        />
        <div className="space-y-1.5">
          {stops.map((stop, k) => (
            <div key={k} className="flex items-center gap-1.5">
              <button
                onClick={() => setOpenPicker(openPicker === k ? null : k)}
                title="Edit stop color"
                className={`grid size-7 shrink-0 place-items-center rounded-lg border transition ${
                  openPicker === k
                    ? "border-blue-500 ring-2 ring-blue-500/20"
                    : "border-slate-200 hover:border-blue-300"
                }`}
              >
                <span
                  className="size-4 rounded-full border border-slate-200"
                  style={{ background: stop.color }}
                />
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={stop.pos}
                onChange={(e) =>
                  setStops(stops.map((s, j) => (j === k ? { ...s, pos: +e.target.value } : s)))
                }
                className="h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-blue-600 [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:shadow"
                aria-label={`Stop ${k + 1} position`}
              />
              <span className="w-7 shrink-0 text-right font-mono text-[9px] text-slate-500">
                {stop.pos}%
              </span>
              <button
                onClick={() => {
                  if (stops.length > 2) setStops(stops.filter((_, j) => j !== k));
                }}
                disabled={stops.length <= 2}
                title="Remove stop"
                className="grid size-7 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-rose-300 hover:text-rose-500 disabled:pointer-events-none disabled:opacity-30"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
          {openPicker !== null && openPicker !== "bg" && stops[openPicker] && (
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
              <ColorPicker
                value={stops[openPicker].color}
                onChange={(hex) =>
                  setStops(stops.map((s, j) => (j === openPicker ? { ...s, color: hex } : s)))
                }
              />
            </div>
          )}
          <button
            onClick={() => setStops([...stops, { color: "#94a3b8", pos: 100 }])}
            disabled={stops.length >= 6}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-1.5 text-[10px] font-medium text-slate-500 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 disabled:pointer-events-none disabled:opacity-40"
          >
            <Plus className="size-3" /> Add color stop
          </button>
        </div>

        <SegmentedControl
          label="Gradient type"
          value={gradientType}
          onChange={setGradientType}
          options={[
            { value: "linear", label: "Linear" },
            { value: "radial", label: "Radial" },
          ]}
        />
        {gradientType === "linear" && (
          <label className="flex items-center gap-2 text-[10px] tracking-wide text-slate-500">
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
        <p className="text-[10px] text-slate-400">
          Click the preview above to apply it to this slide.
        </p>
      </div>
    </div>
  );
}
