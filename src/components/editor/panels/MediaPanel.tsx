import { useEffect, useRef, useState } from "react";
import { LayoutGrid, Monitor, Music, Upload, Video, X } from "lucide-react";
import { PanelHeader, SegmentedControl } from "../ui/selectors";
import { newAudio, newImage, newVideo, useEditor } from "@/store/editor";
import { prepareImage } from "@/lib/image-assets";
import { listMedia, removeMedia, saveMedia, type MediaLibraryItem } from "@/lib/media-library";

type MediaTab = "uploads" | "grids";

type GridCell = { x: number; y: number; w: number; h: number };
type GridLayout = { id: string; label: string; cols: number; rows: number; cells: GridCell[] };

/* Photo-grid presets: the whole grid is inserted as one grouped block of
 * placeholder cells. Pick a cell, then use "Replace image" in the inspector
 * to drop a photo or a video in (a video morphs the cell in place). */
const GRID_LAYOUTS: GridLayout[] = [
  { id: "two-cols", label: "Two columns", cols: 2, rows: 2, cells: [{ x: 0, y: 0, w: 1, h: 2 }, { x: 1, y: 0, w: 1, h: 2 }] },
  { id: "two-rows", label: "Two rows", cols: 2, rows: 2, cells: [{ x: 0, y: 0, w: 2, h: 1 }, { x: 0, y: 1, w: 2, h: 1 }] },
  { id: "three-cols", label: "Three columns", cols: 3, rows: 2, cells: [{ x: 0, y: 0, w: 1, h: 2 }, { x: 1, y: 0, w: 1, h: 2 }, { x: 2, y: 0, w: 1, h: 2 }] },
  { id: "feature-left", label: "Feature left", cols: 3, rows: 2, cells: [{ x: 0, y: 0, w: 1, h: 2 }, { x: 1, y: 0, w: 2, h: 1 }, { x: 1, y: 1, w: 2, h: 1 }] },
  { id: "four-squares", label: "Four squares", cols: 2, rows: 2, cells: [{ x: 0, y: 0, w: 1, h: 1 }, { x: 1, y: 0, w: 1, h: 1 }, { x: 0, y: 1, w: 1, h: 1 }, { x: 1, y: 1, w: 1, h: 1 }] },
  { id: "feature-top", label: "Feature top", cols: 3, rows: 2, cells: [{ x: 0, y: 0, w: 3, h: 1 }, { x: 0, y: 1, w: 1, h: 1 }, { x: 1, y: 1, w: 1, h: 1 }, { x: 2, y: 1, w: 1, h: 1 }] },
];

const PLACEHOLDER_SRC =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320"><rect width="100%" height="100%" fill="#e2e8f0"/><rect x="6" y="6" width="468" height="308" fill="none" stroke="#94a3b8" stroke-width="3" stroke-dasharray="14 10" rx="10"/><text x="50%" y="50%" font-family="Inter, sans-serif" font-size="20" fill="#64748b" text-anchor="middle" dominant-baseline="middle">Photo</text></svg>',
  );

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read this file."));
    reader.readAsDataURL(file);
  });

export function MediaPanel() {
  const [tab, setTab] = useState<MediaTab>("uploads");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { add, addGroup, canvasW, canvasH } = useEditor();
  const inputRef = useRef<HTMLInputElement>(null);
  // Media the user imported before, saved in this browser.
  const [library, setLibrary] = useState<MediaLibraryItem[]>([]);
  useEffect(() => {
    void listMedia().then(setLibrary);
  }, []);

  // ---- Screen & webcam recording (MediaRecorder → video element) ----
  const [rec, setRec] = useState<{
    mode: "screen" | "cam";
    stream: MediaStream;
    recorder: MediaRecorder;
    chunks: Blob[];
    url: string;
  } | null>(null);
  const recRef = useRef(rec);
  recRef.current = rec;
  // Stop capture if the panel unmounts mid-recording.
  useEffect(() => () => { recRef.current?.stream.getTracks().forEach((t) => t.stop()); }, []);

  const finishRec = async (
    mode: "screen" | "cam",
    recorder: MediaRecorder,
    chunks: Blob[],
    stream: MediaStream,
  ) => {
    stream.getTracks().forEach((t) => t.stop());
    setRec(null);
    setError(null);
    try {
      const blob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
      if (blob.size > 25 * 1024 * 1024) throw new Error("Recording too long (max 25 MB).");
      const file = new File([blob], mode === "screen" ? "screen-recording.webm" : "webcam-recording.webm", {
        type: blob.type || "video/webm",
      });
      const src = await readFileAsDataUrl(file);
      add(newVideo(src, { muted: false, loop: false }));
      // Keep a copy in the browser library when small enough (same rule as uploads).
      if (src.length <= 6_000_000) {
        try {
          const saved = await saveMedia({ name: file.name, kind: "video", src });
          setLibrary((l) => [saved, ...l.filter((m) => m.src !== saved.src)]);
        } catch {
          // Quota exceeded: the deck keeps working without the library.
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the recording.");
    }
  };

  const startRec = async (mode: "screen" | "cam") => {
    setError(null);
    try {
      const stream =
        mode === "screen"
          ? await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: true })
          : await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: true });
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      recorder.onstop = () => { void finishRec(mode, recorder, chunks, stream); };
      recorder.start(250);
      // The user can also stop screen sharing from the browser bar.
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        if (recorder.state !== "inactive") recorder.stop();
      });
      setRec({ mode, stream, recorder, chunks, url: URL.createObjectURL(stream) });
    } catch {
      setError("Recording cancelled or permission denied.");
    }
  };

  const stopRec = () => {
    if (rec && rec.recorder.state !== "inactive") rec.recorder.stop();
  };

  const importFiles = async (files: FileList | File[]) => {
    setError(null);
    setBusy(true);
    const toLibrary: Array<{ name: string; kind: "image" | "video" | "audio"; src: string }> = [];
    try {
      for (const file of Array.from(files)) {
        if (file.type.startsWith("image/")) {
          // GIFs are kept as-is: re-encoding would flatten the animation.
          const src =
            file.type === "image/gif" ? await readFileAsDataUrl(file) : await prepareImage(file);
          add(newImage(src, { x: 200, y: 200, width: 480, height: 480, fit: "cover" }));
          toLibrary.push({ name: file.name, kind: "image", src });
        } else if (file.type.startsWith("video/")) {
          if (file.size > 25 * 1024 * 1024) throw new Error(file.name + " is too large (max 25 MB).");
          const src = await readFileAsDataUrl(file);
          add(newVideo(src, { muted: true, loop: true }));
          toLibrary.push({ name: file.name, kind: "video", src });
        } else if (file.type.startsWith("audio/")) {
          if (file.size > 25 * 1024 * 1024) throw new Error(file.name + " is too large (max 25 MB).");
          const src = await readFileAsDataUrl(file);
          add(newAudio(src));
          toLibrary.push({ name: file.name, kind: "audio", src });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setBusy(false);
    }
    // Keep a copy of everything imported in this browser for later reuse.
    // Heavy files (long videos) are skipped to keep the library responsive.
    for (const item of toLibrary) {
      if (item.src.length > 6_000_000) continue;
      try {
        const saved = await saveMedia(item);
        setLibrary((l) => [saved, ...l.filter((m) => m.src !== saved.src)]);
      } catch {
        // Quota exceeded or private mode: the deck keeps working without the library.
      }
    }
  };

  const insertFromLibrary = (m: MediaLibraryItem) => {
    if (m.kind === "image") {
      add(newImage(m.src, { x: 200, y: 200, width: 480, height: 480, fit: "cover" }));
    } else if (m.kind === "video") {
      add(newVideo(m.src, { muted: true, loop: true }));
    } else {
      add(newAudio(m.src));
    }
  };

  const removeFromLibrary = async (id: string) => {
    setLibrary((l) => l.filter((m) => m.id !== id));
    try {
      await removeMedia(id);
    } catch {
      // Already gone from storage: nothing to do.
    }
  };

  const insertGrid = (layout: GridLayout) => {
    const W = 900;
    const H = 520;
    const gap = 10;
    const x0 = Math.round((canvasW - W) / 2);
    const y0 = Math.round((canvasH - H) / 2);
    const cw = (W - gap * (layout.cols - 1)) / layout.cols;
    const ch = (H - gap * (layout.rows - 1)) / layout.rows;
    const cells = layout.cells.map((c) =>
      newImage(PLACEHOLDER_SRC, {
        x: Math.round(x0 + c.x * (cw + gap)),
        y: Math.round(y0 + c.y * (ch + gap)),
        width: Math.round(c.w * cw + (c.w - 1) * gap),
        height: Math.round(c.h * ch + (c.h - 1) * gap),
        fit: "cover",
      }),
    );
    addGroup(cells);
  };

  return (
    <div className="space-y-4">
      <PanelHeader
        kicker="Media"
        title="Media uploads & grids"
        description="Import photos, GIFs, videos and audio, or start from a photo grid."
        icon={LayoutGrid}
      />

      <div className="px-4">
        <SegmentedControl
          label="Media content"
          value={tab}
          onChange={setTab}
          options={[
            { value: "uploads", label: "Uploads", icon: Upload, title: "Import images, GIFs, videos and audio" },
            { value: "grids", label: "Grids", icon: LayoutGrid, title: "Photo grid layouts" },
          ]}
        />
      </div>

      {tab === "uploads" ? (
        <div className="space-y-3 px-4">
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void importFiles(e.dataTransfer.files);
            }}
            className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 px-4 py-8 text-center transition hover:border-sky-400 hover:bg-sky-50/50"
          >
            <Upload className="size-6 text-slate-400" />
            <span className="text-xs font-semibold text-slate-700">Drop media here, or click to browse</span>
            <span className="text-[10px] leading-snug text-slate-400">
              Images, GIFs, videos and audio files. Max 25 MB per file.
            </span>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*"
              className="hidden"
              onChange={(e) => {
                void importFiles(e.target.files ?? []);
                e.target.value = "";
              }}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void startRec("screen")}
              disabled={!!rec}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-[11px] font-semibold text-slate-700 transition hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 disabled:opacity-40"
            >
              <Monitor className="size-4 text-slate-400" /> Record screen
            </button>
            <button
              type="button"
              onClick={() => void startRec("cam")}
              disabled={!!rec}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-[11px] font-semibold text-slate-700 transition hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 disabled:opacity-40"
            >
              <Video className="size-4 text-slate-400" /> Record webcam
            </button>
          </div>
          {rec && (
            <div className="space-y-2 rounded-2xl border border-rose-200 bg-rose-50/60 p-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-rose-600">
                <span className="size-2 animate-pulse rounded-full bg-rose-500" />
                Recording {rec.mode === "screen" ? "screen" : "webcam"}…
              </div>
              <video src={rec.url} muted autoPlay playsInline className="w-full rounded-lg border border-rose-200 bg-black" />
              <button
                type="button"
                onClick={stopRec}
                className="w-full rounded-lg bg-rose-600 py-2 text-[11px] font-bold tracking-wide text-white transition hover:bg-rose-500"
              >
                Stop & insert on slide
              </button>
            </div>
          )}
          {busy && <p className="text-center text-[10px] font-semibold text-slate-500">Importing…</p>}
          {error && <p className="text-[10px] font-medium text-rose-500">{error}</p>}
          <p className="text-[10px] leading-snug text-slate-400">
            Images and GIFs land on the slide right away. Videos loop while presenting; audio shows a compact player.
          </p>
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Your library</p>
            {library.length === 0 ? (
              <p className="text-[10px] leading-snug text-slate-400">
                Media you import is saved in this browser and shows up here, ready to reuse in any deck.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {library.map((m) => (
                  <div key={m.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => insertFromLibrary(m)}
                      title={"Insert " + m.name}
                      className="block w-full overflow-hidden rounded-lg border border-slate-200 bg-white transition hover:border-sky-400"
                    >
                      {m.kind === "image" ? (
                        <img src={m.src} alt="" className="aspect-square w-full object-cover" />
                      ) : m.kind === "video" ? (
                        <video src={m.src} muted playsInline preload="metadata" className="aspect-square w-full object-cover" />
                      ) : (
                        <span className="grid aspect-square w-full place-items-center bg-slate-100">
                          <Music className="size-4 text-slate-400" />
                        </span>
                      )}
                      <span className="block truncate px-1 py-0.5 text-[8px] font-medium text-slate-500">{m.name}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeFromLibrary(m.id)}
                      aria-label={"Remove " + m.name + " from library"}
                      className="absolute right-1 top-1 hidden rounded bg-slate-900/70 p-0.5 text-white transition hover:bg-slate-900 group-hover:block"
                    >
                      <X className="size-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3 px-4">
          <p className="text-[10px] leading-snug text-slate-400">
            Choose a layout: a grouped block of placeholder cells is inserted. Select a cell, then use
            "Replace image" in the inspector to drop in a photo or a video.
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {GRID_LAYOUTS.map((layout) => (
              <button
                key={layout.id}
                type="button"
                title={layout.label}
                onClick={() => insertGrid(layout)}
                className="group rounded-xl border border-slate-200 bg-white p-1.5 transition hover:border-sky-400 hover:bg-sky-50/50"
              >
                <div className="relative aspect-[16/10] w-full">
                  {layout.cells.map((c, i) => (
                    <div
                      key={i}
                      className="absolute rounded-[4px] bg-slate-300 transition group-hover:bg-sky-300/70"
                      style={{
                        left: "calc(" + (c.x / layout.cols) * 100 + "% + 2px)",
                        top: "calc(" + (c.y / layout.rows) * 100 + "% + 2px)",
                        width: "calc(" + (c.w / layout.cols) * 100 + "% - 4px)",
                        height: "calc(" + (c.h / layout.rows) * 100 + "% - 4px)",
                      }}
                    />
                  ))}
                </div>
                <span className="mt-1 block text-center text-[9px] font-semibold text-slate-500">
                  {layout.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default MediaPanel;
