import { useEditor } from "@/store/editor";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalSpaceBetween,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalSpaceBetween,
  Bold,
  ChevronDown,
  ChevronUp,
  Copy,
  Group,
  Lock,
  Minus,
  Plus,
  Trash2,
  Ungroup,
  Unlock,
} from "lucide-react";

/** Grid presets: the selected elements are arranged over their bounding box. */
const GRID_PRESETS = [
  { label: "2×1", cols: 2, rows: 1, title: "Grid 2 columns × 1 row" },
  { label: "1×2", cols: 1, rows: 2, title: "Grid 1 column × 2 rows" },
  { label: "2×2", cols: 2, rows: 2, title: "Grid 2 × 2" },
  { label: "3×1", cols: 3, rows: 1, title: "Grid 3 columns × 1 row" },
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
    ungroupSelected,
    alignSelected,
    distributeSelected,
    bringForward,
    sendBackward,
  } = useEditor();

  if (presenting || !selectedId || selectedIds.length <= 1) return null;
  const el = elements.find((e) => e.id === selectedId);
  if (!el) return null;

  const selectedElements = elements.filter((e) => selectedIds.includes(e.id));
  const sharedGroupId = selectedElements[0]?.groupId;
  const isGrouped = Boolean(
    sharedGroupId && selectedElements.every((item) => item.groupId === sharedGroupId),
  );

  const isText = el.type === "text" || el.type === "button";
  const text = el as { fontSize?: number; fontWeight?: number };
  const btn = "grid size-7 place-items-center rounded-md transition";
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
    <div className="selection-toolbar studio-dock absolute left-1/2 top-4 z-30 flex max-w-[92vw] -translate-x-1/2 flex-wrap items-center gap-0.5 px-2 py-1">
      <span className="px-2 text-xs font-semibold tabular-nums text-slate-600">
        {selectedIds.length} selected
      </span>
      <span className="mx-1 h-4 w-px bg-slate-200" />
      {isText && (
        <>
          <button
            type="button"
            title="Bold"
            onClick={() =>
              update(el.id, { fontWeight: (text.fontWeight ?? 500) >= 700 ? 500 : 700 } as never)
            }
            className={`${btn} ${(text.fontWeight ?? 500) >= 700 ? "!bg-slate-900 !text-white" : ""}`}
          >
            <Bold className="size-3.5" />
          </button>
          <button
            type="button"
            title="Smaller text"
            onClick={() =>
              update(el.id, { fontSize: clampFont((text.fontSize ?? 16) - 2) } as never)
            }
            className={btn}
          >
            <Minus className="size-3.5" />
          </button>
          <span className="min-w-7 text-center font-mono text-[11px] font-semibold tabular-nums text-slate-600">
            {text.fontSize ?? 16}
          </span>
          <button
            type="button"
            title="Bigger text"
            onClick={() =>
              update(el.id, { fontSize: clampFont((text.fontSize ?? 16) + 2) } as never)
            }
            className={btn}
          >
            <Plus className="size-3.5" />
          </button>
          <span className="mx-1 h-4 w-px bg-slate-200" />
        </>
      )}
      {selectedIds.length > 1 && (
        <>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              title="Align left"
              onClick={() => alignSelected("left")}
              className={btn}
            >
              <AlignStartVertical className="size-3.5" />
            </button>
            <button
              type="button"
              title="Align center horizontally"
              onClick={() => alignSelected("center-h")}
              className={btn}
            >
              <AlignCenterVertical className="size-3.5" />
            </button>
            <button
              type="button"
              title="Align right"
              onClick={() => alignSelected("right")}
              className={btn}
            >
              <AlignEndVertical className="size-3.5" />
            </button>
            <button
              type="button"
              title="Align top"
              onClick={() => alignSelected("top")}
              className={btn}
            >
              <AlignStartHorizontal className="size-3.5" />
            </button>
            <button
              type="button"
              title="Align middle vertically"
              onClick={() => alignSelected("middle")}
              className={btn}
            >
              <AlignCenterHorizontal className="size-3.5" />
            </button>
            <button
              type="button"
              title="Align bottom"
              onClick={() => alignSelected("bottom")}
              className={btn}
            >
              <AlignEndHorizontal className="size-3.5" />
            </button>
          </div>
          {selectedIds.length >= 3 && (
            <>
              <span className="mx-1 h-4 w-px bg-slate-200" />
              <button
                type="button"
                title="Distribute horizontally"
                onClick={() => distributeSelected("h")}
                className={btn}
              >
                <AlignHorizontalSpaceBetween className="size-3.5" />
              </button>
              <button
                type="button"
                title="Distribute vertically"
                onClick={() => distributeSelected("v")}
                className={btn}
              >
                <AlignVerticalSpaceBetween className="size-3.5" />
              </button>
            </>
          )}
          <span className="mx-1 h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-0.5 rounded-md bg-slate-100 p-0.5">
            {GRID_PRESETS.map((g) => (
              <button
                key={g.label}
                type="button"
                title={g.title}
                onClick={() => applyGrid(g.cols, g.rows)}
                className="rounded px-2 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-white hover:text-slate-900"
              >
                {g.label}
              </button>
            ))}
          </div>
          <span className="mx-1 h-4 w-px bg-slate-200" />
          <button
            type="button"
            title={isGrouped ? "Ungroup selection" : "Group selection"}
            onClick={isGrouped ? ungroupSelected : groupSelected}
            className={`${btn} ${isGrouped ? "!bg-blue-50 !text-blue-600" : ""}`}
          >
            {isGrouped ? <Ungroup className="size-3.5" /> : <Group className="size-3.5" />}
          </button>
        </>
      )}
      <button
        type="button"
        title="Bring forward"
        onClick={() => bringForward(el.id)}
        className={btn}
      >
        <ChevronUp className="size-3.5" />
      </button>
      <button
        type="button"
        title="Send backward"
        onClick={() => sendBackward(el.id)}
        className={btn}
      >
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
        className="grid size-7 place-items-center rounded-md text-slate-600 transition hover:!bg-rose-50 hover:!text-rose-600"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}
