import { useRef, useState } from "react";
import { useEditor, type AnyElement, type VideoElement } from "@/store/editor";
import type { PluginApp } from "@/lib/plugins";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Clapperboard,
  Upload,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Repeat,
  ImageDown,
  Check,
  Scissors,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Video app — the built-in video editor shipped by the Video plugin. */
/* Upload a clip, preview it, trim the start/end window, choose the  */
/* playback options, then insert it as a video element on the slide.  */
/* ------------------------------------------------------------------ */

const fmt = (t: number) => {
  if (!Number.isFinite(t)) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return m + ":" + String(s).padStart(2, "0");
};

export function VideoAppDialog({
  app,
  open,
  onOpenChange,
}: {
  app: PluginApp;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const add = useEditor((s) => s.add);
  const canvasW = useEditor((s) => s.canvasW);
  const canvasH = useEditor((s) => s.canvasH);

  const [src, setSrc] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [loop, setLoop] = useState(true);
  const [fit, setFit] = useState<VideoElement["fit"]>("contain");
  const [poster, setPoster] = useState<string | undefined>(undefined);
  const [dims, setDims] = useState({ w: 16, h: 9 });

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (src) URL.revokeObjectURL(src);
    setSrc(URL.createObjectURL(f));
    setFileName(f.name);
    setPoster(undefined);
    setStart(0);
    setEnd(0);
  };

  const onLoaded = () => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration || 0);
    setEnd(v.duration || 0);
    if (v.videoWidth) setDims({ w: v.videoWidth, h: v.videoHeight });
    v.currentTime = 0;
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      if (v.currentTime < start || v.currentTime > end) v.currentTime = start;
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  // enforce the trim window while previewing
  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    if (end > start && v.currentTime >= end) {
      if (loop) {
        v.currentTime = start;
      } else {
        v.pause();
        setPlaying(false);
      }
    }
    if (v.currentTime < start - 0.5) v.currentTime = start;
  };

  const capturePoster = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    const w = 480;
    c.width = w;
    c.height = Math.round((w * v.videoHeight) / v.videoWidth);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, c.width, c.height);
    setPoster(c.toDataURL("image/jpeg", 0.8));
  };

  const insert = () => {
    if (!src) return;
    // size the element to the video aspect, capped to half the slide
    let w = Math.min(960, Math.round(canvasW * 0.5));
    let h = Math.round((w * dims.h) / dims.w);
    if (h > canvasH * 0.7) {
      h = Math.round(canvasH * 0.7);
      w = Math.round((h * dims.w) / dims.h);
    }
    add({
      type: "video",
      id: crypto.randomUUID(),
      x: Math.round((canvasW - w) / 2),
      y: Math.round((canvasH - h) / 2),
      width: w,
      height: h,
      rotation: 0,
      src,
      poster,
      fit,
      muted,
      loop,
      ...(start > 0.05 || (end > 0 && duration > 0 && end < duration - 0.05)
        ? { start, end }
        : {}),
    } as unknown as AnyElement);
    onOpenChange(false);
  };

  const trimmed = duration > 0 && (start > 0.05 || end < duration - 0.05);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-xl gap-0 overflow-y-auto p-0 sm:rounded-3xl">
        <DialogHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-indigo-50/50 px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-[0_6px_14px_rgba(79,70,229,0.35)]">
              <Clapperboard className="size-4" />
            </span>
            Video
            {app.description && (
              <span className="truncate text-[11px] font-medium text-slate-400">
                — {app.description}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 p-4">
          <input ref={fileRef} type="file" accept="video/*" onChange={onFile} className="hidden" />

          {!src ? (
            <button
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 py-12 text-center transition-all hover:border-indigo-400 hover:bg-indigo-50/40"
            >
              <span className="grid size-11 place-items-center rounded-xl bg-white text-indigo-600 shadow-sm">
                <Upload className="size-5" />
              </span>
              <span className="text-xs font-semibold text-slate-700">Upload a video</span>
              <span className="text-[10px] text-slate-400">MP4, WebM, MOV… — stays on your device</span>
            </button>
          ) : (
            <>
              {/* preview */}
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
                <video
                  ref={videoRef}
                  src={src}
                  muted={muted}
                  playsInline
                  onLoadedMetadata={onLoaded}
                  onTimeUpdate={onTimeUpdate}
                  onPause={() => setPlaying(false)}
                  onPlay={() => setPlaying(true)}
                  className="mx-auto max-h-56 w-auto"
                />
              </div>

              {/* play + name */}
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlay}
                  className="grid size-8 shrink-0 place-items-center rounded-lg bg-indigo-600 text-white shadow-[0_4px_10px_rgba(79,70,229,0.4)] transition-transform hover:-translate-y-0.5"
                  title={playing ? "Pause" : "Play"}
                >
                  {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
                </button>
                <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-slate-600" title={fileName}>
                  {fileName}
                </span>
                <span className="shrink-0 text-[10px] font-semibold tabular-nums text-slate-400">
                  {fmt(start)} – {fmt(end)} · {fmt(duration)}
                </span>
              </div>

              {/* trim */}
              <div className="rounded-xl border border-slate-200 p-2.5">
                <span className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  <Scissors className="size-3" /> Trim
                  {trimmed && (
                    <span className="rounded-md bg-indigo-100 px-1 py-px text-[9px] font-bold text-indigo-600">
                      cut to {fmt(start)}–{fmt(end)}
                    </span>
                  )}
                </span>
                <label className="flex items-center gap-2 text-[10px] font-medium text-slate-500">
                  start
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0.1, duration)}
                    step={0.1}
                    value={start}
                    onChange={(e) => {
                      const v = Math.min(Number(e.target.value), end - 0.1);
                      setStart(Math.max(0, v));
                      if (videoRef.current) videoRef.current.currentTime = Math.max(0, v);
                    }}
                    className="h-1 flex-1 cursor-pointer accent-indigo-600"
                  />
                  <span className="w-10 text-right tabular-nums">{fmt(start)}</span>
                </label>
                <label className="mt-1 flex items-center gap-2 text-[10px] font-medium text-slate-500">
                  end
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0.1, duration)}
                    step={0.1}
                    value={end}
                    onChange={(e) => {
                      const v = Math.max(Number(e.target.value), start + 0.1);
                      setEnd(Math.min(duration, v));
                    }}
                    className="h-1 flex-1 cursor-pointer accent-indigo-600"
                  />
                  <span className="w-10 text-right tabular-nums">{fmt(end)}</span>
                </label>
              </div>

              {/* options */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setMuted((m) => !m)}
                  title={muted ? "Muted" : "Sound on"}
                  className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-semibold transition-all ${
                    muted
                      ? "border-slate-200 bg-white text-slate-500"
                      : "border-indigo-600 bg-indigo-50 text-indigo-600"
                  }`}
                >
                  {muted ? <VolumeX className="size-3" /> : <Volume2 className="size-3" />}
                  {muted ? "Muted" : "Sound"}
                </button>
                <button
                  onClick={() => setLoop((l) => !l)}
                  title={loop ? "Loops" : "Plays once"}
                  className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-semibold transition-all ${
                    loop
                      ? "border-indigo-600 bg-indigo-50 text-indigo-600"
                      : "border-slate-200 bg-white text-slate-500"
                  }`}
                >
                  <Repeat className="size-3" />
                  {loop ? "Loop" : "Once"}
                </button>
                {(["contain", "cover", "fill"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFit(f)}
                    className={`rounded-lg border px-2 py-1.5 text-[10px] font-semibold capitalize transition-all ${
                      fit === f
                        ? "border-indigo-600 bg-indigo-50 text-indigo-600"
                        : "border-slate-200 bg-white text-slate-500"
                    }`}
                  >
                    {f}
                  </button>
                ))}
                <button
                  onClick={capturePoster}
                  title="Use the current frame as poster (shown before playback)"
                  className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-semibold transition-all ${
                    poster
                      ? "border-emerald-500 bg-emerald-50 text-emerald-600"
                      : "border-slate-200 bg-white text-slate-500 hover:border-indigo-300"
                  }`}
                >
                  <ImageDown className="size-3" />
                  {poster ? "Poster set" : "Poster"}
                </button>
              </div>

              <p className="text-[9px] leading-relaxed text-slate-400">
                The clip plays inside the selected window{trimmed ? " (trim applied)" : ""} while
                presenting. Videos are local to this browser session — export the deck or keep the
                tab open to keep them.
              </p>

              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-500 transition hover:border-indigo-300"
                >
                  Change video
                </button>
                <button
                  onClick={insert}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2 text-xs font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,0.35)] transition-transform hover:-translate-y-0.5"
                >
                  <Check className="size-3.5" />
                  Insert on slide
                </button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
