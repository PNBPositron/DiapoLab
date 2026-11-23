import { useEffect, useRef, useState } from "react";
import { Check, Loader2, RotateCcw, Trash2, Upload } from "lucide-react";
import {
  DEFAULT_WORKSPACE_BG,
  useSettings,
  type WorkspaceBgId,
} from "@/store/settings";
import { prepareImage } from "@/lib/image-assets";

type PresetMeta = {
  id: Exclude<WorkspaceBgId, "custom-color" | "custom-image">;
  label: string;
};

const WORKSPACE_BG_PRESETS: PresetMeta[] = [
  { id: "clean", label: "Pure White" },
  { id: "aurora", label: "Aurora Sky" },
  { id: "warm-paper", label: "Warm Sand" },
  { id: "sage-mist", label: "Sage Mist" },
];

function PresetPreview({ id }: { id: PresetMeta["id"] }) {
  if (id === "clean") {
    return <div className="h-full w-full bg-white" />;
  }
  if (id === "aurora") {
    return (
      <div
        className="h-full w-full"
        style={{
          background:
            "radial-gradient(65% 60% at 88% 15%, rgba(196, 181, 253, 0.72), transparent 72%), radial-gradient(60% 60% at 14% 85%, rgba(147, 197, 253, 0.78), transparent 70%), linear-gradient(135deg, #eef4ff 0%, #f8faff 55%, #f3efff 100%)",
        }}
      />
    );
  }
  if (id === "warm-paper") {
    return (
      <div
        className="h-full w-full"
        style={{
          background:
            "radial-gradient(70% 70% at 80% 15%, rgba(253, 230, 196, 0.55), transparent 70%), linear-gradient(145deg, #fbf8f3 0%, #efe6d8 100%)",
        }}
      />
    );
  }
  return (
    <div
      className="h-full w-full"
      style={{
        background:
          "radial-gradient(65% 60% at 85% 15%, rgba(167, 243, 208, 0.52), transparent 70%), radial-gradient(60% 60% at 15% 85%, rgba(186, 230, 253, 0.62), transparent 70%), linear-gradient(135deg, #f2faf7 0%, #eef7fb 100%)",
      }}
    />
  );
}

/**
 * Fixed full-viewport backdrop rendered behind the editor chrome & canvas.
 * Defaults to pure white in light mode and deep slate in dark mode.
 */
export function WorkspaceBackgroundLayer() {
  const workspaceBg = useSettings((s) => s.workspaceBg);
  const workspaceBgColor = useSettings((s) => s.workspaceBgColor);
  const workspaceBgImage = useSettings((s) => s.workspaceBgImage);
  const editorDark = useSettings((s) => s.editorDark);
  const [imgFailed, setImgFailed] = useState(false);

  const imageSrc =
    workspaceBg === "custom-image" && workspaceBgImage ? workspaceBgImage : null;

  useEffect(() => {
    setImgFailed(false);
  }, [imageSrc]);

  return (
    <div
      aria-hidden="true"
      className="editor-ambient-backdrop pointer-events-none fixed inset-0 z-0 overflow-hidden transition-colors duration-300"
    >
      {imageSrc && !imgFailed ? (
        <>
          <img
            key={imageSrc}
            src={imageSrc}
            alt=""
            onError={() => setImgFailed(true)}
            className="h-full w-full scale-[1.03] object-cover transition-all duration-300"
            style={{
              filter: editorDark
                ? "brightness(0.45) saturate(0.92)"
                : "brightness(1.08) saturate(0.96)",
            }}
          />
          <div
            className="absolute inset-0 transition-all duration-300"
            style={{
              background: editorDark
                ? "rgba(9, 15, 30, 0.62)"
                : "rgba(255, 255, 255, 0.22)",
            }}
          />
        </>
      ) : workspaceBg === "aurora" ? (
        <>
          <div
            className="absolute inset-0"
            style={{
              background: editorDark
                ? "radial-gradient(62% 56% at 88% 12%, rgba(79, 139, 255, 0.16) 0%, transparent 70%), radial-gradient(54% 58% at 10% 88%, rgba(99, 102, 241, 0.14) 0%, transparent 68%), linear-gradient(180deg, #0b1220 0%, #0d1526 100%)"
                : "radial-gradient(62% 56% at 88% 12%, rgba(212, 205, 255, 0.58) 0%, rgba(212, 205, 255, 0) 70%), radial-gradient(54% 58% at 10% 88%, rgba(191, 219, 254, 0.72) 0%, rgba(191, 219, 254, 0) 68%), radial-gradient(48% 45% at 14% 12%, rgba(224, 238, 255, 0.85) 0%, rgba(224, 238, 255, 0) 65%), linear-gradient(135deg, #f3f7ff 0%, #f8faff 48%, #f2f5ff 100%)",
            }}
          />
          {!editorDark && (
            <svg
              className="absolute bottom-0 left-0 h-[44%] w-[52%] opacity-75"
              viewBox="0 0 720 420"
              fill="none"
              preserveAspectRatio="none"
            >
              <path
                d="M-40 240 C 120 190, 230 330, 420 360 C 560 382, 650 398, 720 420 L -40 420 Z"
                fill="url(#ed-wave-1)"
              />
              <path
                d="M-40 315 C 140 270, 260 365, 480 420 L -40 420 Z"
                fill="url(#ed-wave-2)"
              />
              <defs>
                <linearGradient id="ed-wave-1" x1="0" y1="210" x2="540" y2="420" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="#dbeafe" stopOpacity="0.82" />
                  <stop offset="1" stopColor="#eff6ff" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="ed-wave-2" x1="0" y1="290" x2="400" y2="420" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="#bfdbfe" stopOpacity="0.65" />
                  <stop offset="1" stopColor="#e0e7ff" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          )}
        </>
      ) : workspaceBg === "warm-paper" ? (
        <div
          className="absolute inset-0"
          style={{
            background: editorDark
              ? "linear-gradient(145deg, #141210 0%, #1c1815 100%)"
              : "radial-gradient(65% 60% at 85% 15%, rgba(253, 230, 196, 0.45), transparent 70%), linear-gradient(145deg, #fbf8f3 0%, #f1e9dc 100%)",
          }}
        />
      ) : workspaceBg === "sage-mist" ? (
        <div
          className="absolute inset-0"
          style={{
            background: editorDark
              ? "radial-gradient(65% 60% at 85% 15%, rgba(16, 185, 129, 0.12), transparent 70%), linear-gradient(135deg, #0b1615 0%, #0d1722 100%)"
              : "radial-gradient(65% 60% at 85% 15%, rgba(167, 243, 208, 0.42), transparent 70%), radial-gradient(60% 60% at 15% 85%, rgba(186, 230, 253, 0.55), transparent 70%), linear-gradient(135deg, #f3faf7 0%, #f2f8fc 100%)",
          }}
        />
      ) : workspaceBg === "custom-color" ? (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: workspaceBgColor,
            backgroundImage: editorDark
              ? "linear-gradient(180deg, rgba(7, 11, 22, 0.55), rgba(7, 11, 22, 0.65))"
              : "radial-gradient(65% 60% at 82% 14%, rgba(255, 255, 255, 0.35), transparent 70%)",
          }}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: editorDark ? "#0b1220" : "#ffffff",
          }}
        />
      )}
    </div>
  );
}

/**
 * Reusable workspace background selector shared by the Toolbar popover and SettingsDialog.
 */
export function WorkspaceBackgroundPicker({ compact = false }: { compact?: boolean }) {
  const {
    workspaceBg,
    workspaceBgColor,
    workspaceBgImage,
    setWorkspaceBg,
    setWorkspaceBgColor,
    setWorkspaceBgImage,
    resetWorkspaceBg,
  } = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setUploadError(null);
    setUploading(true);
    try {
      const dataUrl = await prepareImage(file, 1600);
      setWorkspaceBgImage(dataUrl);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Could not load image");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className={`grid gap-2 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}>
        {WORKSPACE_BG_PRESETS.map((preset) => {
          const active = workspaceBg === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                setUploadError(null);
                setWorkspaceBg(preset.id);
              }}
              aria-pressed={active}
              className={`group relative overflow-hidden rounded-2xl border p-1.5 text-left transition-all ${
                active
                  ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-slate-200/80">
                <PresetPreview id={preset.id} />
                {active && (
                  <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-blue-600 text-white shadow">
                    <Check className="size-2.5" strokeWidth={3} />
                  </span>
                )}
              </div>
              <div className={`mt-1.5 truncate px-0.5 text-[11px] font-semibold ${active ? "text-blue-700" : "text-slate-700"}`}>
                {preset.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom color & custom image upload */}
      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        <label
          className={`flex h-9 cursor-pointer items-center gap-2 rounded-full border px-3 text-xs font-medium transition-colors ${
            workspaceBg === "custom-color"
              ? "border-blue-600 bg-blue-50/70 text-blue-700"
              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          <input
            type="color"
            value={workspaceBgColor}
            onChange={(e) => {
              setUploadError(null);
              setWorkspaceBgColor(e.target.value);
            }}
            aria-label="Custom workspace background color"
            className="h-4 w-4 cursor-pointer rounded-full border-0 bg-transparent p-0"
          />
          <span className="whitespace-nowrap">Color</span>
          <span className="font-mono text-[10px] uppercase text-slate-400">{workspaceBgColor}</span>
        </label>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className={`flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-xs font-medium transition-colors disabled:opacity-60 ${
            workspaceBg === "custom-image"
              ? "border-blue-600 bg-blue-50/70 text-blue-700"
              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
          <span>{workspaceBgImage ? "Replace image" : "Upload image"}</span>
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleUpload(f);
            e.target.value = "";
          }}
        />

        {workspaceBg !== DEFAULT_WORKSPACE_BG && (
          <button
            type="button"
            onClick={() => {
              setUploadError(null);
              resetWorkspaceBg();
            }}
            className="ml-auto flex h-9 items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          >
            <RotateCcw className="size-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {workspaceBgImage && (
        <div
          className={`flex items-center justify-between gap-2 rounded-2xl border p-2 ${
            workspaceBg === "custom-image" ? "border-blue-200 bg-blue-50/40" : "border-slate-200 bg-slate-50/70"
          }`}
        >
          <button
            type="button"
            onClick={() => setWorkspaceBg("custom-image")}
            className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
          >
            <img
              src={workspaceBgImage}
              alt="Custom background"
              className="h-9 w-14 shrink-0 rounded-xl border border-slate-200 object-cover"
            />
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold text-slate-800">Custom image</div>
              <div className="text-[10px] text-slate-500">
                {workspaceBg === "custom-image" ? "Active" : "Click to apply"}
              </div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setWorkspaceBgImage(null)}
            title="Remove custom image"
            aria-label="Remove custom image"
            className="grid size-7 shrink-0 place-items-center rounded-full text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      )}

      {uploadError && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700">
          {uploadError}
        </p>
      )}
    </div>
  );
}
