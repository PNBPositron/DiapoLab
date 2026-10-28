import { useRef, useState } from "react";
import { useEditor, newVideo, type BlendMode, type SlideTransition } from "@/store/editor";
import {
  Plus,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Layers,
  WandSparkles,
  Film,
  Upload,
} from "lucide-react";
import { SlideThumbnail } from "./SlideThumbnail";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PanelHeader } from "./ui/selectors";

/** Curated effects offered when creating a transition slide. */
const TRANSITION_PRESETS: SlideTransition[] = [
  "fade",
  "slide",
  "zoom",
  "morph",
  "prism",
  "swirl",
  "reveal",
  "origami",
];
/** How an uploaded transition video composites over the next slide. */
const BLEND_MODES: BlendMode[] = ["normal", "screen", "overlay", "multiply", "color-dodge"];

export function PagesBar() {
  const {
    pages,
    currentIndex,
    setCurrentPage,
    duplicatePage,
    removePage,
    movePage,
    canvasW,
    canvasH,
    addPage,
    add,
    setTransition,
    setPageDuration,
    setPageAutoAdvance,
  } = useEditor();

  const [addOpen, setAddOpen] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoName, setVideoName] = useState("");
  const [blendMode, setBlendMode] = useState<BlendMode>("overlay");
  const [slideDuration, setSlideDuration] = useState(3);
  const fileRef = useRef<HTMLInputElement>(null);

  const ratio = canvasW / canvasH;
  const thumbW = ratio >= 1 ? 116 : 116 * ratio;
  const thumbH = ratio >= 1 ? 116 / ratio : 116 * ratio;

  const closeAdd = () => {
    setAddOpen(false);
    setVideoSrc(null);
    setVideoName("");
    setBlendMode("overlay");
    if (fileRef.current) fileRef.current.value = "";
  };

  const pickVideo = (file: File | undefined) => {
    if (!file) return;
    setVideoName(file.name);
    const reader = new FileReader();
    reader.onload = () => setVideoSrc(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  };

  const createClassicSlide = () => {
    addPage();
    closeAdd();
  };

  const createTransitionSlide = (effect: SlideTransition) => {
    const index = currentIndex + 1;
    addPage();
    setTransition(effect);
    setPageDuration(index, slideDuration);
    setPageAutoAdvance(index, true);
    closeAdd();
  };

  const createVideoTransition = () => {
    if (!videoSrc) return;
    const index = currentIndex + 1;
    addPage();
    add(
      newVideo(videoSrc, {
        x: 0,
        y: 0,
        width: canvasW,
        height: canvasH,
        fit: "cover",
        loop: true,
        muted: true,
        blendMode,
      }),
    );
    setPageDuration(index, slideDuration);
    setPageAutoAdvance(index, true);
    closeAdd();
  };

  return (
    <div className="pages-bar flex shrink-0 items-center border-t border-slate-200/70 bg-white/70 px-3 py-2 text-slate-700 shadow-[0_-1px_2px_rgba(15,23,42,0.03)] backdrop-blur-md">
      <div className="flex min-w-0 flex-1 items-center justify-center gap-3 overflow-x-auto py-1">
        {pages.map((p, i) => {
          const active = i === currentIndex;
          return (
            <div key={p.id} className="group relative shrink-0">
              <button
                onClick={() => setCurrentPage(i)}
                className={`relative overflow-hidden rounded-xl border bg-white/60 backdrop-blur-[1px] transition-all duration-200 ${
                  active
                    ? "border-blue-500 ring-2 ring-blue-500/20 shadow-[0_2px_10px_rgba(37,99,235,0.22)]"
                    : "border-slate-200/80 hover:border-blue-300 hover:shadow-[0_1px_4px_rgba(15,23,42,0.08)]"
                }`}
                style={{ width: thumbW + 4, height: thumbH + 4 }}
              >
                <SlideThumbnail
                  page={p}
                  canvasW={canvasW}
                  canvasH={canvasH}
                  className="h-full w-full"
                />
                <span className="absolute bottom-1 left-1 rounded bg-white/80 px-1 font-mono text-[9px] text-slate-700">
                  {i + 1}
                </span>
              </button>
              <div className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 gap-1 rounded-full bg-slate-900/85 p-1 opacity-0 shadow-[0_8px_20px_rgba(15,23,42,0.25)] backdrop-blur-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                {i > 0 && (
                  <button
                    onClick={() => movePage(i, i - 1)}
                    title="Move page left"
                    aria-label={`Move page ${i + 1} left`}
                    className="grid h-5 w-5 place-items-center rounded-full bg-slate-700 text-white"
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </button>
                )}
                {i < pages.length - 1 && (
                  <button
                    onClick={() => movePage(i, i + 1)}
                    title="Move page right"
                    aria-label={`Move page ${i + 1} right`}
                    className="grid h-5 w-5 place-items-center rounded-full bg-slate-700 text-white"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </button>
                )}
                <button
                  onClick={() => duplicatePage(i)}
                  title="Duplicate"
                  aria-label={`Duplicate page ${i + 1}`}
                  className="grid h-5 w-5 place-items-center rounded-full bg-blue-600 text-white"
                >
                  <Copy className="h-3 w-3" />
                </button>
                {pages.length > 1 && (
                  <button
                    onClick={() => removePage(i)}
                    title="Delete"
                    aria-label={`Delete page ${i + 1}`}
                    className="grid h-5 w-5 place-items-center rounded-full bg-rose-500 text-white"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <Popover open={addOpen} onOpenChange={(v) => (v ? setAddOpen(true) : closeAdd())}>
          <PopoverTrigger asChild>
            <button
              className="flex shrink-0 items-center gap-2 rounded-xl border border-dashed border-slate-300/90 bg-white/40 px-4 text-[10px] font-medium tracking-[0.12em] text-slate-600 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
              style={{ height: thumbH + 4 }}
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="center" className="selector-panel w-80 rounded-xl p-3">
            <PanelHeader title="Add a slide" />
            <div className="flex flex-col gap-2">
              {/* Classic slide */}
              <button
                onClick={createClassicSlide}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left transition hover:border-blue-300 hover:bg-blue-50/50"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600">
                  <Layers className="size-4" />
                </span>
                <span>
                  <span className="block text-[11px] font-semibold text-slate-800">Classic slide</span>
                  <span className="block text-[9px] text-slate-400">Empty slide, ready to compose</span>
                </span>
              </button>

              {/* Auto-advance duration — applies to both transition types */}
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2">
                <span className="text-[9px] font-semibold tracking-[0.12em] text-slate-500">
                  Auto-advance
                </span>
                <div className="flex flex-1 justify-end gap-1">
                  {[1, 2, 3, 5, 10].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSlideDuration(s)}
                      className={`rounded-full px-2 py-1 text-[9px] font-semibold transition ${
                        slideDuration === s
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {s}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Transition slide */}
              <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                <div className="mb-2 flex items-center gap-2">
                  <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600">
                    <WandSparkles className="size-3.5" />
                  </span>
                  <span className="text-[11px] font-semibold text-slate-800">Transition slide</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {TRANSITION_PRESETS.map((t) => (
                    <button
                      key={t}
                      onClick={() => createTransitionSlide(t)}
                      className="rounded-lg border border-slate-200 bg-slate-50/80 px-1 py-1.5 text-[9px] font-semibold capitalize text-slate-600 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
                    >
                      {t.replaceAll("-", " ")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Video transition */}
              <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                <div className="mb-2 flex items-center gap-2">
                  <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600">
                    <Film className="size-3.5" />
                  </span>
                  <span className="text-[11px] font-semibold text-slate-800">Video transition</span>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => pickVideo(e.target.files?.[0])}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-2 py-2 text-[10px] font-medium text-slate-600 transition hover:border-blue-300 hover:bg-blue-50/50"
                >
                  <Upload className="size-3.5" /> {videoName || "Upload a transition video"}
                </button>
                {videoSrc && (
                  <>
                    <p className="mt-2 text-[9px] font-semibold tracking-[0.12em] text-slate-500">Blend mode</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {BLEND_MODES.map((m) => (
                        <button
                          key={m}
                          onClick={() => setBlendMode(m)}
                          className={`rounded-full px-2 py-1 text-[9px] font-semibold capitalize transition ${
                            blendMode === m
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={createVideoTransition}
                      className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-2 py-2 text-[10px] font-bold text-white transition hover:bg-blue-700"
                    >
                      <Film className="size-3.5" /> Create transition slide
                    </button>
                  </>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
