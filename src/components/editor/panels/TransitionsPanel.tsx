import { MonitorPlay } from "lucide-react";
import { useEditor } from "@/store/editor";
import { TRANSITION_OPTIONS, TRANSITION_ICONS } from "@/lib/motion-catalog";
import { PanelHeader, OptionGrid } from "../ui/selectors";

const cap = (s: string) =>
  s.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

/**
 * TransitionsPanel — video-mode sidebar tool: pick how each scene flows
 * into the next. Uses the shared OptionGrid, like every other panel.
 */
export function TransitionsPanel() {
  const { pages, currentIndex, setTransition, setTransitionZoom, applyTransitionToDeck } = useEditor();
  const page = pages[currentIndex];
  const current = page?.transition ?? "none";
  const zoom = page?.transitionZoom ?? 0.5;

  return (
    <div className="space-y-4">
      <PanelHeader
        kicker="Video"
        title="Transitions"
        description="How each scene flows into the next — hit play in the timeline to preview."
        icon={MonitorPlay}
      />

      <div className="space-y-2 px-4">
        <div className="text-[10px] font-semibold tracking-wide text-slate-500">
          Scene {currentIndex + 1} transition
        </div>
        <OptionGrid
          label="Slide transition"
          columns={3}
          value={current}
          onChange={(t) => setTransition(t)}
          options={TRANSITION_OPTIONS.map((t) => ({
            value: t,
            label: cap(t),
            title: cap(t),
            icon: TRANSITION_ICONS[t],
          }))}
        />
      </div>

      {current === "zoom" && (
        <div className="space-y-2 px-4">
          <div className="text-[10px] font-semibold tracking-wide text-slate-500">Zoom start</div>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.05}
            value={zoom}
            onChange={(e) => setTransitionZoom(parseFloat(e.target.value))}
            className="w-full accent-blue-600"
          />
          <p className="font-mono text-[9px] text-slate-400">{zoom.toFixed(2)}×</p>
        </div>
      )}

      <div className="px-4">
        <button
          onClick={applyTransitionToDeck}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs font-semibold text-blue-700 transition-all hover:bg-blue-100 active:scale-[0.98]"
        >
          Apply to all scenes
        </button>
      </div>
    </div>
  );
}

export default TransitionsPanel;
