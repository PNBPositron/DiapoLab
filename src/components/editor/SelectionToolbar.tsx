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
