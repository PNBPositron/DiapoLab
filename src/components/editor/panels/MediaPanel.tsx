import { useRef, useState } from "react";
import { LayoutGrid, Upload } from "lucide-react";
import { PanelHeader, SegmentedControl } from "../ui/selectors";
import { newAudio, newImage, newVideo, useEditor } from "@/store/editor";
import { prepareImage } from "@/lib/image-assets";

type MediaTab = "uploads" | "grids";

type GridCell = { x: number; y: number; w: number; h: number };
type GridLayout = { id: string; label: string; cols: number; rows: number; cells: GridCell[] };

/* Photo-grid presets: the whole grid is inserted as one grouped block of
 * placeholder cells. Pick a cell, then use "Replace image" in the inspector
 * to drop a photo in. */
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

  const importFiles = async (files: FileList | File[]) => {
    setError(null);
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        if (file.type.startsWith("image/")) {
          // GIFs are kept as-is: re-encoding would flatten the animation.
          const src =
            file.type === "image/gif" ? await readFileAsDataUrl(file) : await prepareImage(file);
          add(newImage(src, { x: 200, y: 200, width: 480, height: 480, fit: "cover" }));
        } else if (file.type.startsWith("video/")) {
          if (file.size > 25 * 1024 * 1024) throw new Error(file.name + " is too large (max 25 MB).");
          const src = await readFileAsDataUrl(file);
          add(newVideo(src, { muted: true, loop: true }));
        } else if (file.type.startsWith("audio/")) {
          if (file.size > 25 * 1024 * 1024) throw new Error(file.name + " is too large (max 25 MB).");
          const src = await readFileAsDataUrl(file);
          add(newAudio(src));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setBusy(false);
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
          {busy && <p className="text-center text-[10px] font-semibold text-slate-500">Importing…</p>}
          {error && <p className="text-[10px] font-medium text-rose-500">{error}</p>}
          <p className="text-[10px] leading-snug text-slate-400">
            Images and GIFs land on the slide right away. Videos loop while presenting; audio shows a compact player.
          </p>
        </div>
      ) : (
        <div className="space-y-3 px-4">
          <p className="text-[10px] leading-snug text-slate-400">
            Choose a layout: a grouped block of placeholder cells is inserted. Select a cell, then use
            "Replace image" in the inspector to add a photo.
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
