import { useState } from "react";
import { Wand2, Check } from "lucide-react";
import { useEditor, CANVAS_PRESETS } from "@/store/editor";
import { PanelHeader } from "./TextPanel";

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
              magic
                ? "bg-blue-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)]"
                : "bg-slate-100 text-slate-400"
            }`}
          >
            <Wand2 className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span
              className={`block text-[11px] font-semibold ${magic ? "text-blue-700" : "text-slate-700"}`}
            >
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

      {/* Presets */}
      <div className="space-y-2 px-4">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Presets
        </div>
        <div className="grid grid-cols-2 gap-2">
          {CANVAS_PRESETS.map((p) => {
            const active = canvasW === p.w && canvasH === p.h;
            const max = 44;
            const ratio = p.w / p.h;
            const tw = ratio >= 1 ? max : max * ratio;
            const th = ratio >= 1 ? max / ratio : max;
            return (
              <button
                key={p.name}
                onClick={() => {
                  resize(p.w, p.h);
                  setW(p.w);
                  setH(p.h);
                }}
                className={`relative flex flex-col items-center gap-1.5 rounded-xl border p-2.5 transition-all duration-200 ${
                  active
                    ? "border-blue-500 bg-blue-50/50 shadow-[0_0_0_3px_rgba(37,99,235,0.12)]"
                    : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                }`}
              >
                {active && (
                  <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-blue-600 text-white">
                    <Check className="size-2.5" strokeWidth={3} />
                  </span>
                )}
                <div className="grid h-12 w-full place-items-center">
                  <div
                    className={`rounded-[2px] border-2 ${
                      active ? "border-blue-500 bg-blue-100/40" : "border-slate-300 bg-slate-50"
                    }`}
                    style={{ width: tw, height: th }}
                  />
                </div>
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wide ${active ? "text-blue-700" : "text-slate-600"}`}
                >
                  {p.name}
                </span>
                <span className="font-mono text-[9px] text-slate-400">
                  {p.w}×{p.h}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom */}
      <div className="space-y-2.5 px-4 pb-1">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Custom
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              W
            </span>
            <input
              type="number"
              value={w}
              onChange={(e) => setW(+e.target.value)}
              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 font-mono text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </label>
          <span className="pb-2.5 font-mono text-xs text-slate-400">×</span>
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              H
            </span>
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
