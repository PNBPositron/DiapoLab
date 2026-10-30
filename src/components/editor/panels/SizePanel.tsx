import { useState } from "react";
import { Wand2 } from "lucide-react";
import { useEditor, CANVAS_PRESETS } from "@/store/editor";
import { PanelHeader } from "./TextPanel";
import { OptionGrid } from "../ui/selectors";

export function SizePanel() {
  const { canvasW, canvasH, setCanvasSize, magicResize } = useEditor();
  const [w, setW] = useState(canvasW);
  const [h, setH] = useState(canvasH);
  const [magic, setMagic] = useState(true);
  const resize = (nw: number, nh: number) => (magic ? magicResize(nw, nh) : setCanvasSize(nw, nh));

  const apply = () => {
    const cw = Math.max(100, Math.min(8000, Math.round(w)));
    const ch = Math.max(100, Math.min(8000, Math.round(h)));
    resize(cw, ch);
  };

  return (
    <div className="space-y-4">
      <PanelHeader title="Canvas Size" />

      {/* Magic resize toggle */}
      <div className="px-4">
        <button
          type="button"
          onClick={() => setMagic((v) => !v)}
          className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
            magic
              ? "border-blue-500/60 bg-blue-50/60"
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}
        >
          <span
            className={`grid size-8 shrink-0 place-items-center rounded-lg transition ${
              magic ? "bg-blue-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)]" : "bg-slate-100 text-slate-400"
            }`}
          >
            <Wand2 className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className={`block text-[11px] font-semibold ${magic ? "text-blue-700" : "text-slate-700"}`}>
              Magic resize {magic ? "on" : "off"}
            </span>
            <span className="block text-[10px] text-slate-400">
              Reflow every slide into the new ratio
            </span>
          </span>
          {/* Switch */}
          <span
            className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
              magic ? "bg-blue-600" : "bg-slate-200"
            }`}
          >
            <span
              className={`absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-all ${
                magic ? "left-[1.125rem]" : "left-0.5"
              }`}
            />
          </span>
        </button>
      </div>

      {/* Presets — shared OptionGrid tiles, same component as every panel */}
      <div className="space-y-2 px-4">
        <div className="text-[10px] font-semibold tracking-wide text-slate-500">Presets</div>
        <OptionGrid
          label="Canvas format presets"
          value={CANVAS_PRESETS.find((p) => p.w === canvasW && p.h === canvasH)?.name}
          onChange={(name) => {
            const preset = CANVAS_PRESETS.find((p) => p.name === name);
            if (!preset) return;
            resize(preset.w, preset.h);
            setW(preset.w);
            setH(preset.h);
          }}
          options={CANVAS_PRESETS.map((p) => {
            const ratio = p.w / p.h;
            const max = 34;
            const tw = ratio >= 1 ? max : max * ratio;
            const th = ratio >= 1 ? max / ratio : max;
            const landscape = ratio >= 1;
            return {
              value: p.name,
              label: `${p.name} · ${p.w}×${p.h}`,
              title: `${p.name} — ${p.w}×${p.h}`,
              /* Mini slide mockup: title bar + text lines, scaled to the
                 real aspect ratio so each preset reads at a glance. */
              preview: (
                <span
                  className="relative flex flex-col justify-between overflow-hidden rounded-[3px] border border-slate-300 bg-gradient-to-br from-white to-slate-100 p-[3px] shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
                  style={{ width: tw, height: th }}
                >
                  <span
                    className={landscape ? "h-[3px] w-3/5 rounded-[1px] bg-blue-500/80" : "h-[2px] w-3/4 rounded-[1px] bg-blue-500/80"}
                  />
                  <span className="flex flex-col gap-[2px]">
                    <span className={landscape ? "h-[2px] w-full rounded-[1px] bg-slate-300" : "h-[2px] w-full rounded-[1px] bg-slate-300"} />
                    <span className="h-[2px] w-2/3 rounded-[1px] bg-slate-200" />
                  </span>
                </span>
              ),
            };
          })}
        />
      </div>
      {/* Custom */}
      <div className="space-y-2.5 px-4 pb-1">
        <div className="text-[10px] font-semibold tracking-wide text-slate-500">Custom</div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold tracking-wide text-slate-400">W</span>
            <input
              type="number"
              value={w}
              onChange={(e) => setW(+e.target.value)}
              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 font-mono text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </label>
          <span className="pb-2.5 font-mono text-xs text-slate-400">×</span>
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold tracking-wide text-slate-400">H</span>
            <input
              type="number"
              value={h}
              onChange={(e) => setH(+e.target.value)}
              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 font-mono text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </label>
        </div>
        <button
          onClick={apply}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.25)] transition-all hover:bg-blue-700 active:scale-[0.98]"
        >
          Apply size
        </button>
      </div>
    </div>
  );
}

