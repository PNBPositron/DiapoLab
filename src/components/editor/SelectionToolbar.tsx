import { useEditor } from "@/store/editor";
import {
  Bold,
  ChevronDown,
  ChevronUp,
  Copy,
  Lock,
  Minus,
  Plus,
  Trash2,
  Unlock,
} from "lucide-react";

/** Grid presets: the selected elements are arranged over their bounding box. */
const GRID_PRESETS = [
  { label: "2×1", cols: 2, rows: 1, title: "Grille 2 colonnes × 1 ligne" },
  { label: "1×2", cols: 1, rows: 2, title: "Grille 1 colonne × 2 lignes" },
  { label: "2×2", cols: 2, rows: 2, title: "Grille 2 × 2" },
  { label: "3×1", cols: 3, rows: 1, title: "Grille 3 colonnes × 1 ligne" },
];

/* Doory-style contextual bar: the most common actions for the current
 * selection float above the canvas, one click away. */
export function SelectionToolbar() {
  const {
    presenting,
    selectedId,
    selectedIds,
    elements,
    update,
    removeSelected,
    duplicateSelected,
    groupSelected,
    bringForward,
    sendBackward,
  } = useEditor();

  if (presenting || !selectedId || selectedIds.length === 0) return null;
  const el = elements.find((e) => e.id === selectedId);
  if (!el) return null;

  const isText = el.type === "text" || el.type === "button";
  const text = el as { fontSize?: number; fontWeight?: number };
  const btn =
    "grid size-7 place-items-center rounded-md text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 active:scale-95";
  const clampFont = (v: number) => Math.max(8, Math.min(400, Math.round(v)));

  // Arrange the multi-selection into a photo grid over its bounding box,
  // then group it so the whole grid can be moved as one block.
  const applyGrid = (cols: number, rows: number) => {
    const sel = elements.filter((e) => selectedIds.includes(e.id));
    if (sel.length < 2) return;
    const minX = Math.min(...sel.map((e) => e.x));
    const minY = Math.min(...sel.map((e) => e.y));
    const maxX = Math.max(...sel.map((e) => e.x + e.width));
    const maxY = Math.max(...sel.map((e) => e.y + e.height));
    const gap = 8;
    const cw = Math.max(10, Math.round((maxX - minX - gap * (cols - 1)) / cols));
    const ch = Math.max(10, Math.round((maxY - minY - gap * (rows - 1)) / rows));
    sel.forEach((e, i) => {
      const r = Math.floor(i / cols);
      const c = i % cols;
      update(e.id, { x: minX + c * (cw + gap), y: minY + r * (ch + gap), width: cw, height: ch });
    });
    groupSelected();
  };

  return (
    <div className="absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-slate-200 bg-white/95 px-1.5 py-1 shadow-[0_4px_20px_rgba(15,23,42,0.14)] backdrop-blur">
      {isText && (
        <>
          <button
            type="button"
            title="Bold"
            onClick={() =>
              update(el.id, { fontWeight: (text.fontWeight ?? 500) >= 700 ? 500 : 700 } as never)
            }
            className={`${btn} ${(text.fontWeight ?? 500) >= 700 ? "bg-slate-900 text-white hover:bg-slate-700 hover:text-white" : ""}`}
          >
            <Bold className="size-3.5" />
          </button>
          <button
            type="button"
            title="Smaller text"
            onClick={() => update(el.id, { fontSize: clampFont((text.fontSize ?? 16) - 2) } as never)}
            className={btn}
          >
            <Minus className="size-3.5" />
          </button>
          <span className="min-w-6 text-center text-[10px] font-semibold tabular-nums text-slate-500">
            {text.fontSize ?? 16}
          </span>
          <button
            type="button"
            title="Bigger text"
            onClick={() => update(el.id, { fontSize: clampFont((text.fontSize ?? 16) + 2) } as never)}
            className={btn}
          >
            <Plus className="size-3.5" />
          </button>
          <span className="mx-1 h-4 w-px bg-slate-200" />
        </>
      )}
      {selectedIds.length > 1 && (
        <>
          <div className="flex items-center gap-0.5 rounded-full bg-slate-100 p-0.5">
            {GRID_PRESETS.map((g) => (
              <button
                key={g.label}
                type="button"
                title={g.title}
                onClick={() => applyGrid(g.cols, g.rows)}
                className="rounded-full px-2 py-1 text-[10px] font-semibold text-slate-600 transition hover:bg-white hover:text-slate-900"
              >
                {g.label}
              </button>
            ))}
          </div>
          <span className="mx-1 h-4 w-px bg-slate-200" />
        </>
      )}
      <button type="button" title="Bring forward" onClick={() => bringForward(el.id)} className={btn}>
        <ChevronUp className="size-3.5" />
      </button>
      <button type="button" title="Send backward" onClick={() => sendBackward(el.id)} className={btn}>
        <ChevronDown className="size-3.5" />
      </button>
      <button type="button" title="Duplicate" onClick={duplicateSelected} className={btn}>
        <Copy className="size-3.5" />
      </button>
      <button
        type="button"
        title={el.locked ? "Unlock" : "Lock"}
        onClick={() => update(el.id, { locked: !el.locked } as never)}
        className={btn}
      >
        {el.locked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
      </button>
      <span className="mx-1 h-4 w-px bg-slate-200" />
      <button
        type="button"
        title="Delete"
        onClick={removeSelected}
        className="grid size-7 place-items-center rounded-md text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 active:scale-95"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}
