import { Check, Clapperboard, Layers } from "lucide-react";
import { useEditor } from "@/store/editor";

export function MasterStylePanel() {
  const pageCount = useEditor((s) => s.pages.length);
  const applyBackgroundToDeck = useEditor((s) => s.applyBackgroundToDeck);
  const applyTransitionToDeck = useEditor((s) => s.applyTransitionToDeck);
  const bg = useEditor((s) => s.pages[s.currentIndex].bgColor);
  const bgImage = useEditor((s) => s.pages[s.currentIndex].bgImage);
  const transition = useEditor((s) => s.pages[s.currentIndex].transition ?? "none");

  const btn =
    "flex w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-[11px] font-semibold text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-all hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-700 active:scale-[0.98]";

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] leading-relaxed text-slate-500">
        Use the current slide as a master: push its background and transition to every slide in the deck ({pageCount} total). Undo works as usual (⌘Z).
      </p>
      <div className="flex flex-col gap-2">
        <button type="button" onClick={applyBackgroundToDeck} className={btn} title={bgImage ? "Push color + background image to all slides" : "Push background color to all slides"}>
          <Layers className="size-3.5 shrink-0 text-violet-600" />
          <span className="min-w-0 flex-1">Use this background on all slides</span>
          <span
            aria-hidden="true"
            className="size-3.5 shrink-0 rounded-full border border-slate-300"
            style={{ background: bg.includes("gradient(") ? bg : undefined, backgroundColor: bg.includes("gradient(") ? undefined : bg }}
          />
        </button>
        <button type="button" onClick={applyTransitionToDeck} className={btn} title={`Transition: ${transition}`}>
          <Clapperboard className="size-3.5 shrink-0 text-emerald-600" />
          <span className="min-w-0 flex-1">Use this transition on all slides</span>
          <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-slate-500">{transition}</span>
        </button>
      </div>
      <p className="flex items-center gap-1 text-[9px] text-slate-400">
        <Check className="size-3" /> Reversible — covered by the editor's undo history.
      </p>
    </div>
  );
}

export default MasterStylePanel;
