import { useMemo, useState, type ComponentType } from "react";
import {
  AppWindow,
  AudioLines,
  ChartColumn,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  Globe,
  Image as ImageIcon,
  Layers3,
  ListChecks,
  Lock,
  LockOpen,
  MonitorOff,
  Play,
  Shapes,
  Smile,
  Table,
  Trash2,
  Type,
} from "lucide-react";
import { useEditor, type AnyElement } from "@/store/editor";
import { PanelHeader, SearchField } from "../ui/selectors";

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

const TYPE_LABEL: Record<string, string> = {
  text: "Text",
  image: "Image",
  shape: "Shape",
  button: "Button",
  video: "Video",
  audio: "Audio",
  chart: "Chart",
  quiz: "Quiz",
  table: "Table",
  ui: "UI block",
  icon: "Icon",
  embed: "Embed",
};

const labelFor = (el: AnyElement): string => {
  const t = el as { text?: string; name?: string };
  if (t.text && t.text.trim()) return t.text.trim().slice(0, 32);
  if (t.name && t.name.trim()) return t.name.trim().slice(0, 32);
  return TYPE_LABEL[el.type] ?? el.type.charAt(0).toUpperCase() + el.type.slice(1);
};

/**
 * Layers side panel: current slide elements ordered top-to-bottom (frontmost first).
 * Click to select, Shift+click to multi-select, toggle visibility/lock, or reorder z-index.
 */
export function LayersPanel() {
  const {
    elements,
    selectedId,
    selectedIds,
    select,
    toggleSelect,
    toggleHidden,
    toggleHideInPresent,
    bringForward,
    sendBackward,
    duplicate,
    remove,
    update,
  } = useEditor();
  const [query, setQuery] = useState("");

  // Top layer first: the elements array is bottom-to-top z-order.
  const layers = useMemo(() => [...elements].reverse(), [elements]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return layers;
    return layers.filter((el) => {
      const name = labelFor(el).toLowerCase();
      const kind = (TYPE_LABEL[el.type] ?? el.type).toLowerCase();
      return name.includes(q) || kind.includes(q);
    });
  }, [layers, query]);

  const activeEl = elements.find((e) => e.id === selectedId) ?? null;
  const isTopmost = activeEl ? elements[elements.length - 1]?.id === activeEl.id : false;
  const isBottommost = activeEl ? elements[0]?.id === activeEl.id : false;

  return (
    <div className="space-y-3.5">
      <PanelHeader
        kicker="Layers"
        title="Slide layers"
        description="Select, reorder, hide, or lock objects on this slide."
        icon={Layers3}
      >
        <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-slate-500">
          {elements.length}
        </span>
      </PanelHeader>

      {elements.length > 0 && (
        <div className="grid grid-cols-7 gap-1 rounded-lg border border-slate-200/90 bg-slate-50/70 p-1">
          <button
            type="button"
            disabled={!activeEl || isTopmost}
            onClick={() => activeEl && bringForward(activeEl.id)}
            title="Bring forward"
            aria-label="Bring selected layer forward"
            className="grid h-8 place-items-center rounded-md text-slate-600 transition hover:bg-white hover:text-slate-900 hover:shadow-2xs disabled:pointer-events-none disabled:opacity-35"
          >
            <ChevronUp className="size-4" />
          </button>
          <button
            type="button"
            disabled={!activeEl || isBottommost}
            onClick={() => activeEl && sendBackward(activeEl.id)}
            title="Send backward"
            aria-label="Send selected layer backward"
            className="grid h-8 place-items-center rounded-md text-slate-600 transition hover:bg-white hover:text-slate-900 hover:shadow-2xs disabled:pointer-events-none disabled:opacity-35"
          >
            <ChevronDown className="size-4" />
          </button>
          <button
            type="button"
            disabled={!activeEl}
            onClick={() => activeEl && toggleHidden(activeEl.id)}
            title={activeEl?.hidden ? "Show selected layer" : "Hide selected layer"}
            aria-label={activeEl?.hidden ? "Show selected layer" : "Hide selected layer"}
            className={`grid h-8 place-items-center rounded-md transition disabled:pointer-events-none disabled:opacity-35 ${
              activeEl?.hidden
                ? "bg-blue-50 text-blue-600"
                : "text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-2xs"
            }`}
          >
            {activeEl?.hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </button>
          <button
            type="button"
            disabled={!activeEl}
            onClick={() => activeEl && toggleHideInPresent(activeEl.id)}
            title={activeEl?.hideInPresent ? "Show in present mode" : "Hide in present mode"}
            aria-label={activeEl?.hideInPresent ? "Show in present mode" : "Hide in present mode"}
            className={`grid h-8 place-items-center rounded-md transition disabled:pointer-events-none disabled:opacity-35 ${
              activeEl?.hideInPresent
                ? "bg-amber-50 text-amber-600"
                : "text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-2xs"
            }`}
          >
            <MonitorOff className="size-3.5" />
          </button>
          <button
            type="button"
            disabled={!activeEl}
            onClick={() => activeEl && update(activeEl.id, { locked: !activeEl.locked } as never)}
            title={activeEl?.locked ? "Unlock selected layer" : "Lock selected layer"}
            aria-label={activeEl?.locked ? "Unlock selected layer" : "Lock selected layer"}
            className={`grid h-8 place-items-center rounded-md transition disabled:pointer-events-none disabled:opacity-35 ${
              activeEl?.locked
                ? "bg-amber-50 text-amber-600"
                : "text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-2xs"
            }`}
          >
            {activeEl?.locked ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}
          </button>
          <button
            type="button"
            disabled={!activeEl}
            onClick={() => activeEl && duplicate(activeEl.id)}
            title="Duplicate selected layer"
            aria-label="Duplicate selected layer"
            className="grid h-8 place-items-center rounded-md text-slate-600 transition hover:bg-white hover:text-slate-900 hover:shadow-2xs disabled:pointer-events-none disabled:opacity-35"
          >
            <Copy className="size-3.5" />
          </button>
          <button
            type="button"
            disabled={!activeEl}
            onClick={() => activeEl && remove(activeEl.id)}
            title="Delete selected layer"
            aria-label="Delete selected layer"
            className="grid h-8 place-items-center rounded-md text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 disabled:pointer-events-none disabled:opacity-35"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      )}

      {layers.length > 4 && (
        <SearchField value={query} onChange={setQuery} placeholder="Filter layers…" />
      )}

      <div className="space-y-1.5">
        {layers.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-200 px-4 py-10 text-center">
            <Layers3 className="mx-auto size-5 text-slate-300" />
            <p className="mt-2 text-xs font-medium text-slate-500">No objects on this slide yet</p>
            <p className="mt-1 text-[11px] text-slate-400">
              Add text, shapes, or media to manage their order here.
            </p>
          </div>
        )}

        {layers.length > 0 && filtered.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-xs text-slate-400">
            No layers match "{query}".
          </div>
        )}

        {filtered.map((el) => {
          const Icon = TYPE_ICON[el.type] ?? Shapes;
          const selected = selectedIds.includes(el.id) || selectedId === el.id;
          const hidden = !!el.hidden;
          const topmost = elements[elements.length - 1]?.id === el.id;
          const bottommost = elements[0]?.id === el.id;

          return (
            <div
              key={el.id}
              className={`group flex items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors ${
                selected
                  ? "border-blue-300 bg-blue-50/75 text-blue-900"
                  : "border-slate-200/80 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/70"
              }`}
            >
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                title={`Select ${labelFor(el)} (Shift+click for multi-select)`}
                onClick={(e) => {
                  if (e.shiftKey) toggleSelect(el.id);
                  else select(el.id);
                }}
              >
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-md border transition-colors ${
                    selected
                      ? "border-blue-200 bg-white text-blue-600"
                      : "border-slate-200/80 bg-slate-50 text-slate-500"
                  }`}
                >
                  <Icon className={`size-3.5 ${hidden ? "opacity-40" : ""}`} />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-xs font-medium ${
                      hidden ? "text-slate-400 line-through" : ""
                    }`}
                  >
                    {labelFor(el)}
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <span>{TYPE_LABEL[el.type] ?? el.type}</span>
                    {el.hideInPresent && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">
                        Present off
                      </span>
                    )}
                  </span>
                </span>
              </button>

              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  title={el.hideInPresent ? "Show in present mode" : "Hide in present mode"}
                  aria-label={el.hideInPresent ? "Show in present mode" : "Hide in present mode"}
                  onClick={() => toggleHideInPresent(el.id)}
                  className={`grid size-6 place-items-center rounded transition hover:bg-slate-100 ${
                    el.hideInPresent
                      ? "text-amber-600"
                      : "text-slate-400 opacity-0 group-hover:opacity-100 focus:opacity-100"
                  }`}
                >
                  <MonitorOff className="size-3.5" />
                </button>
                <button
                  type="button"
                  title={hidden ? "Show layer" : "Hide layer"}
                  aria-label={hidden ? "Show layer" : "Hide layer"}
                  onClick={() => toggleHidden(el.id)}
                  className={`grid size-6 place-items-center rounded transition hover:bg-slate-100 ${
                    hidden
                      ? "text-slate-500"
                      : "text-slate-400 opacity-0 group-hover:opacity-100 focus:opacity-100"
                  }`}
                >
                  {hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
                <button
                  type="button"
                  title={el.locked ? "Unlock layer" : "Lock layer"}
                  aria-label={el.locked ? "Unlock layer" : "Lock layer"}
                  onClick={() => update(el.id, { locked: !el.locked } as never)}
                  className={`grid size-6 place-items-center rounded transition hover:bg-slate-100 ${
                    el.locked
                      ? "text-amber-500"
                      : "text-slate-400 opacity-0 group-hover:opacity-100 focus:opacity-100"
                  }`}
                >
                  {el.locked ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}
                </button>
                <button
                  type="button"
                  title="Bring forward"
                  aria-label="Bring forward"
                  disabled={topmost}
                  onClick={() => bringForward(el.id)}
                  className="grid size-6 place-items-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:pointer-events-none disabled:opacity-25"
                >
                  <ChevronUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  title="Send backward"
                  aria-label="Send backward"
                  disabled={bottommost}
                  onClick={() => sendBackward(el.id)}
                  className="grid size-6 place-items-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:pointer-events-none disabled:opacity-25"
                >
                  <ChevronDown className="size-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {layers.length > 0 && (
        <p className="text-[10px] text-slate-400">
          Tip: hold <span className="font-medium text-slate-500">Shift</span> and click to
          multi-select layers.
        </p>
      )}
    </div>
  );
}
