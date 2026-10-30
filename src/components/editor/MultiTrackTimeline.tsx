import { useEffect, useRef, useState } from "react";
import { Play, Pause, Music, Trash2, Lock, ZoomIn, ZoomOut } from "lucide-react";
import { useEditor, type VideoClip, type VideoTrack } from "@/store/editor";

const snap = (v: number) => Math.max(0, Math.round(v * 10) / 10);
const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;

const TRACK_STYLE: Record<string, string> = {
  scene: "bg-blue-100 border-blue-400 text-blue-800",
  object: "bg-indigo-100 border-indigo-400 text-indigo-800",
  audio: "bg-emerald-100 border-emerald-400 text-emerald-800",
};

const clipStyle = (c: VideoClip) =>
  c.kind === "scene" ? "bg-blue-500/90 text-white" : c.kind === "audio" ? "bg-emerald-500/90 text-white" : "bg-indigo-500/90 text-white";

export function MultiTrackTimeline() {
  const {
    pages,
    currentIndex,
    setCurrentPage,
    videoTracks,
    syncVideoScenes,
    addVideoClip,
    moveVideoClip,
    removeVideoClip,
    setClipTransition,
  } = useEditor();
  const [pps, setPps] = useState(36); // pixels per second
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(0);

  // Keep the scene track in sync with the deck pages.
  useEffect(() => { syncVideoScenes(); }, [pages, syncVideoScenes]);

  const total = videoTracks.reduce(
    (m, tr) => tr.clips.reduce((mm, c) => Math.max(mm, c.start + c.duration), m),
    0
  );

  // Playback: advance the playhead; cross into the matching scene.
  useEffect(() => {
    if (!playing || total <= 0) return;
    lastRef.current = performance.now();
    const tick = (now: number) => {
      const dt = (now - lastRef.current) / 1000;
      lastRef.current = now;
      setT((prev) => {
        const next = prev + dt;
        if (next >= total) { setPlaying(false); return total; }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [playing, total]);

  // Follow the playhead into the current scene page.
  useEffect(() => {
    const scene = videoTracks.find((tr) => tr.id === "scenes");
    const clip = scene?.clips.find((c) => t >= c.start && t < c.start + c.duration);
    if (clip?.pageId) {
      const idx = pages.findIndex((p) => p.id === clip.pageId);
      if (idx >= 0 && idx !== currentIndex) setCurrentPage(idx);
    }
  }, [t]);

  const timeAt = (e: React.DragEvent, el: HTMLElement) =>
    snap((e.clientX - el.getBoundingClientRect().left + el.scrollLeft) / pps);

  const onDropTrack = (track: VideoTrack, e: React.DragEvent) => {
    e.preventDefault();
    const lane = e.currentTarget as HTMLElement;
    const raw = e.dataTransfer.getData("text/plain");
    if (!raw) return;
    let payload: any;
    try { payload = JSON.parse(raw); } catch { return; }
    if (payload.type === "clip-move") {
      moveVideoClip(payload.clipId, track.id, timeAt(e, lane));
    } else if (payload.type === "new-clip") {
      addVideoClip(track.id, {
        id: `clip-${Date.now()}`,
        kind: track.kind === "audio" ? "audio" : "object",
        label: payload.label,
        start: timeAt(e, lane),
        duration: payload.duration ?? 5,
        elementId: payload.elementId,
        src: payload.src,
      });
    }
  };

  const onDropClip = (clip: VideoClip, e: React.DragEvent) => {
    const raw = e.dataTransfer.getData("text/plain");
    if (!raw) return;
    let payload: any;
    try { payload = JSON.parse(raw); } catch { return; }
    if (payload.type === "transition") {
      e.preventDefault();
      e.stopPropagation();
      setClipTransition(clip.id, payload.value);
    }
  };

  const importAudio = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const src = URL.createObjectURL(file);
    const audioTrack = videoTracks.find((tr) => tr.kind === "audio");
    if (!audioTrack) return;
    addVideoClip(audioTrack.id, {
      id: `clip-${Date.now()}`,
      kind: "audio",
      label: file.name.slice(0, 24),
      start: 0,
      duration: 10,
      src,
    });
    e.target.value = "";
  };

  const bin = pages[currentIndex]?.elements ?? [];

  return (
    <div className="timeline-bar flex flex-col gap-1.5 border-t border-teal/30 bg-transparent px-3 py-2">
      {/* toolbar row */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => { if (t >= total) setT(0); setPlaying((p) => !p); }}
          title={playing ? "Pause" : "Play"}
          className="brutal-border-2 brutal-press grid h-8 w-8 place-items-center bg-teal text-ink hover:bg-teal/90"
        >
          {playing ? <Pause className="h-4 w-4 fill-ink" strokeWidth={3} /> : <Play className="h-4 w-4 fill-ink" strokeWidth={3} />}
        </button>
        <span className="font-mono text-[10px] text-teal/70 tabular-nums w-14 text-right">{fmt(t)} / {fmt(total)}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setPps((p) => Math.max(12, p - 8))} title="Zoom out" className="brutal-border grid h-7 w-7 place-items-center bg-surface text-teal hover:bg-surface-2"><ZoomOut className="h-3 w-3" /></button>
          <button onClick={() => setPps((p) => Math.min(120, p + 8))} title="Zoom in" className="brutal-border grid h-7 w-7 place-items-center bg-surface text-teal hover:bg-surface-2"><ZoomIn className="h-3 w-3" /></button>
        </div>
        {/* media bin: drag the current scene objects onto the Overlay track */}
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
          <span className="shrink-0 font-mono text-[9px] tracking-[0.14em] text-teal/60">BIN ▸</span>
          {bin.map((el) => (
            <span
              key={el.id}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("text/plain", JSON.stringify({ type: "new-clip", kind: "object", elementId: el.id, label: el.type, duration: 3 }))}
              title="Drag onto the Overlay track"
              className="brutal-border shrink-0 cursor-grab bg-surface px-1.5 py-0.5 font-mono text-[9px] text-teal hover:bg-surface-2"
            >
              {el.type === "text" && "text" in el && typeof el.text === "string" ? el.text.slice(0, 12) || el.type : el.type}
            </span>
          ))}
          <label className="brutal-border flex shrink-0 cursor-pointer items-center gap-1 bg-surface px-1.5 py-0.5 font-mono text-[9px] text-teal hover:bg-surface-2" title="Import an audio file">
            <Music className="h-3 w-3" /> + audio
            <input type="file" accept="audio/*" onChange={importAudio} className="hidden" />
          </label>
        </div>
      </div>

      {/* ruler + tracks */}
      <div className="flex min-h-0 items-stretch gap-2">
        <div className="flex w-24 shrink-0 flex-col gap-1 pt-[14px]">
          {videoTracks.map((tr) => (
            <div key={tr.id} className="flex h-8 items-center gap-1 truncate font-mono text-[8px] text-teal/70">
              {tr.kind === "scene" && <Lock className="h-2.5 w-2.5" />}
              {tr.label}
            </div>
          ))}
        </div>
        <div className="min-w-0 flex-1 overflow-x-auto">
          {/* ruler */}
          <div className="relative h-3 border-b border-teal/20" style={{ width: Math.max(200, total * pps + 40) }}>
            {Array.from({ length: Math.ceil(total) + 1 }, (_, i) => (
              <span key={i} className="absolute top-0 h-full border-l border-teal/20 pl-0.5 font-mono text-[8px] text-teal/50" style={{ left: i * pps }}>
                {i}
              </span>
            ))}
          </div>
          {/* lanes */}
          {videoTracks.map((tr) => (
            <div
              key={tr.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDropTrack(tr, e)}
              className={`relative h-8 overflow-hidden rounded ${TRACK_STYLE[tr.kind]} ${tr.kind === "scene" ? "" : "timeline-lane"}`}
              style={{ width: Math.max(200, total * pps + 40) }}
            >
              {tr.clips.map((c) => (
                <div
                  key={c.id}
                  draggable={tr.kind !== "scene"}
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", JSON.stringify({ type: "clip-move", clipId: c.id }))}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => onDropClip(c, e)}
                  title={`${c.label} — ${c.duration.toFixed(1)}s${c.transition ? ` (transition: ${c.transition})` : ""}`}
                  className={`absolute top-0.5 bottom-0.5 flex cursor-grab items-center gap-1 overflow-hidden rounded border px-1 font-mono text-[8px] shadow-sm ${clipStyle(c)}`}
                  style={{ left: c.start * pps, width: Math.max(18, c.duration * pps - 2) }}
                >
                  {c.transition && <span className="shrink-0 font-bold" title={`Transition: ${c.transition}`}>✦</span>}
                  <span className="truncate">{c.label}</span>
                  {tr.kind !== "scene" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeVideoClip(c.id); }}
                      title="Remove clip"
                      className="ml-auto shrink-0 opacity-60 hover:opacity-100"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  ))}
                </div>
              ))}
            </div>
          ))}
          {/* playhead */}
          <div className="pointer-events-none absolute top-0 h-full w-[2px] bg-[#ff0080] shadow-[0_0_8px_#ff0080]" style={{ left: t * pps }} />
        </div>
      </div>
      <p className="font-mono text-[8px] text-teal/50">
        Drag bin items onto the Overlay track · drag clips to move them · drop a transition from the Transitions panel onto any clip
      </p>
    </div>
  );
}

export default MultiTrackTimeline;
