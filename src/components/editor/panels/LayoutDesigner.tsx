import { useMemo, useState } from "react";
import { LayoutGrid, WandSparkles } from "lucide-react";
import { useEditor } from "@/store/editor";
import { suggestLayouts, type LayoutSuggestion } from "@/lib/layout-suggest";

const FILL: Record<string, string> = { title: "#2b6bff", body: "#cbd5e1", media: "#93c5fd" };

export function LayoutDesigner() {
  const { elements, update } = useEditor();
  const [open, setOpen] = useState(false);
  const [applied, setApplied] = useState<string | null>(null);
  const suggestions = useMemo(() => (open ? suggestLayouts(elements) : []), [open, elements]);

  if (elements.length === 0) {
    return (
      <p className="px-4 pb-4 text-xs text-slate-400">
        Add content to this slide first — Designer rearranges existing objects.
      </p>
    );
  }

  const apply = (s: LayoutSuggestion) => {
    s.patches.forEach((p) => update(p.id, { x: p.x, y: p.y, width: p.width, height: p.height }));
    setApplied(s.id);
  };

  return (
    <div className="space-y-3 px-4 pb-4">
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setApplied(null);
        }}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-500 active:scale-[0.98]"
      >
        <WandSparkles className="size-4" />
        {open ? "Regenerate layout ideas" : "Generate layout ideas"}
      </button>
      {open && (
        <div className="grid grid-cols-2 gap-2">
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => apply(s)}
              className={`group rounded-xl border p-2 text-left transition-all duration-200 hover:-translate-y-0.5 ${
                applied === s.id
                  ? "border-blue-400 bg-blue-50/70 shadow-[0_10px_24px_-10px_rgba(37,99,235,0.35)]"
                  : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-[0_10px_24px_-12px_rgba(37,99,235,0.25)]"
              }`}
            >
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-700">
                <LayoutGrid className="size-3 text-blue-500" />
                {s.label}
              </span>
              <svg viewBox="0 0 1920 1080" className="mt-1.5 w-full rounded-md bg-slate-50" aria-hidden="true">
                {s.preview.map((b, i) => (
                  <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx={24} fill={FILL[b.kind]} />
                ))}
              </svg>
              <span className="mt-1 block text-[9px] leading-snug text-slate-400">
                {applied === s.id ? "Applied — Ctrl+Z to undo" : s.description}
              </span>
            </button>
          ))}
        </div>
      )}
      <p className="text-[9px] text-slate-400">
        Suggestions move and resize existing objects only — text, colors and styles stay yours.
      </p>
    </div>
  );
}

export default LayoutDesigner;