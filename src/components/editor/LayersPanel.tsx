import { useState, type ComponentType } from "react";
import {
  AppWindow,
  AudioLines,
  ChartColumn,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Globe,
  Image as ImageIcon,
  ListChecks,
  Lock,
  LockOpen,
  Play,
  Shapes,
  Smile,
  Table,
  Type,
} from "lucide-react";
import { useEditor, type AnyElement } from "@/store/editor";

const TYPE_ICON: Record<string, ComponentType<{ className?: string }>> = {
  text: Type,
  image: ImageIcon,
  shape: Shapes,
  button: Play,
  video: Play,
  audio: AudioLines,
  chart: ChartColumn,
  quiz: ListChecks,
  table: Table,
  ui: AppWindow,
  icon: Smile,
  embed: Globe,
};

const labelFor = (el: AnyElement): string => {
  const t = el as { text?: string; name?: string };
  if (t.text && t.text.trim()) return t.text.trim().slice(0, 28);
  if (t.name && t.name.trim()) return t.name.trim().slice(0, 28);
  return el.type.charAt(0).toUpperCase() + el.type.slice(1);
};

/**
 * Floating layers panel: current page elements, top layer first.
 * Click to select, Shift+click to multi-select, eye toggles visibility,
 * lock prevents dragging, chevrons reorder (z-order).
 */
export function LayersPanel() {
  const { elements, selectedId, selectedIds, select, toggleSelect, toggleHidden, bringForward, sendBackward, update } =
    useEditor();
  const [open, setOpen] = useState(false);
  // top layer first: the elements array is bottom-to-top z-order
  const layers = [...elements].reverse();

  return (
    <div className="absolute bottom-4 left-4 z-10 w-60 overflow-hidden rounded-2xl border border-white/70 bg-white/90 text-slate-700 shadow-[0_14px_34px_-16px_rgba(15,23,42,0.38),0_2px_8px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-semibold tracking-wide transition hover:bg-slate-50"
      >
        <span>
          Layers
          <span className="ml-1.5 font-mono text-[10px] font-normal text-slate-400">{elements.length}</span>
        </span>
        {open ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
      </button>
      {open && (
        <div className="max-h-64 overflow-y-auto border-t border-slate-100 p-1.5">
          {layers.length === 0 && (
            <p className="px-2 py-3 text-center text-[11px] text-slate-400">No objects on this slide yet</p>
          )}
          {layers.map((el) => {
            const Icon = TYPE_ICON[el.type] ?? Shapes;
            const selected = selectedIds.includes(el.id) || selectedId === el.id;
            const hidden = !!el.hidden;
            return (
              <div
                key={el.id}
                className={
                  "group flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-[11px] transition " +
                  (selected ? "bg-sky-50 text-sky-800 ring-1 ring-sky-200" : "hover:bg-slate-50")
                }
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                  title={"Select " + labelFor(el)}
                  onClick={(e) => {
                    if (e.shiftKey) toggleSelect(el.id);
                    else select(el.id);
                  }}
                >
                  <Icon className={"size-3.5 shrink-0 " + (hidden ? "text-slate-300" : "text-slate-500")} />
                  <span className={"truncate " + (hidden ? "text-slate-300 line-through" : "")}>{labelFor(el)}</span>
                </button>
                <button
                  type="button"
                  title={hidden ? "Show layer" : "Hide layer"}
                  aria-label={hidden ? "Show layer" : "Hide layer"}
                  onClick={() => toggleHidden(el.id)}
                  className={"shrink-0 rounded p-0.5 transition hover:bg-slate-100 " + (hidden ? "text-slate-400" : "text-slate-500 opacity-0 group-hover:opacity-100")}
                >
                  {hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
                <button
                  type="button"
                  title={el.locked ? "Unlock layer" : "Lock layer"}
                  aria-label={el.locked ? "Unlock layer" : "Lock layer"}
                  onClick={() => update(el.id, { locked: !el.locked } as never)}
                  className={"shrink-0 rounded p-0.5 transition hover:bg-slate-100 " + (el.locked ? "text-amber-500" : "text-slate-500 opacity-0 group-hover:opacity-100")}
                >
                  {el.locked ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}
                </button>
                <button
                  type="button"
                  title="Bring forward"
                  aria-label="Bring forward"
                  disabled={elements[elements.length - 1]?.id === el.id}
                  onClick={() => bringForward(el.id)}
                  className="shrink-0 rounded p-0.5 text-slate-500 transition hover:bg-slate-100 disabled:opacity-30"
                >
                  <ChevronUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  title="Send backward"
                  aria-label="Send backward"
                  disabled={elements[0]?.id === el.id}
                  onClick={() => sendBackward(el.id)}
                  className="shrink-0 rounded p-0.5 text-slate-500 transition hover:bg-slate-100 disabled:opacity-30"
                >
                  <ChevronDown className="size-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
