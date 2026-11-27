import { useState } from "react";
import {
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignStartHorizontal,
  CheckCircle2,
  Columns3,
  LayoutGrid,
  MousePointerClick,
  Rows3,
  Shrink,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useEditor } from "@/store/editor";
import {
  countElementOverlaps,
  DEFAULT_ARRANGE_OPTIONS,
  type ArrangeAlign,
  type ArrangeAnchor,
  type ArrangeMode,
} from "@/lib/auto-arrange";
import { OptionGrid, SegmentedControl } from "../ui/selectors";

const MODE_OPTIONS: Array<{
  value: Exclude<ArrangeMode, "align-tidy">;
  label: string;
  title: string;
  preview: React.ReactNode;
}> = [
  {
    value: "smart",
    label: "Smart auto",
    title: "Automatically picks grid, row, column, or flow based on element sizes & positions",
    preview: (
      <span className="grid h-7 w-10 grid-cols-3 gap-1 rounded-md border border-slate-200 bg-slate-50 p-1">
        <span className="col-span-2 rounded-[2px] bg-blue-500/80" />
        <span className="rounded-[2px] bg-blue-400/55" />
        <span className="rounded-[2px] bg-blue-400/55" />
        <span className="col-span-2 rounded-[2px] bg-blue-500/65" />
      </span>
    ),
  },
  {
    value: "grid",
    label: "Balanced grid",
    title: "Distributes elements into uniform non-overlapping columns and rows",
    preview: (
      <span className="grid h-7 w-10 grid-cols-2 grid-rows-2 gap-1 rounded-md border border-slate-200 bg-slate-50 p-1">
        <span className="rounded-[2px] bg-blue-500/80" />
        <span className="rounded-[2px] bg-blue-500/65" />
        <span className="rounded-[2px] bg-blue-500/65" />
        <span className="rounded-[2px] bg-blue-500/80" />
      </span>
    ),
  },
  {
    value: "row",
    label: "Row flow",
    title: "Distributes horizontally left-to-right and wraps cleanly to avoid overlaps",
    preview: (
      <span className="flex h-7 w-10 items-center justify-center gap-1 rounded-md border border-slate-200 bg-slate-50 p-1">
        <span className="h-4 w-2 rounded-[2px] bg-blue-500/80" />
        <span className="h-3 w-2 rounded-[2px] bg-blue-500/60" />
        <span className="h-4 w-2 rounded-[2px] bg-blue-500/80" />
      </span>
    ),
  },
  {
    value: "column",
    label: "Column flow",
    title: "Distributes vertically top-to-bottom and wraps into columns if needed",
    preview: (
      <span className="flex h-7 w-10 flex-col items-center justify-center gap-0.5 rounded-md border border-slate-200 bg-slate-50 p-1">
        <span className="h-1.5 w-6 rounded-[2px] bg-blue-500/80" />
        <span className="h-1.5 w-4 rounded-[2px] bg-blue-500/60" />
        <span className="h-1.5 w-6 rounded-[2px] bg-blue-500/80" />
      </span>
    ),
  },
];

export function AutoArrangePanel() {
  const { elements, selectedId, selectedIds, selectMany, autoArrangeSelected } = useEditor();

  const [mode, setMode] = useState<ArrangeMode>(DEFAULT_ARRANGE_OPTIONS.mode);
  const [align, setAlign] = useState<ArrangeAlign>(DEFAULT_ARRANGE_OPTIONS.align);
  const [anchor, setAnchor] = useState<ArrangeAnchor>(DEFAULT_ARRANGE_OPTIONS.anchor);
  const [gap, setGap] = useState<number>(DEFAULT_ARRANGE_OPTIONS.gap);
  const [margin, setMargin] = useState<number>(DEFAULT_ARRANGE_OPTIONS.margin);
  const [allowResize, setAllowResize] = useState<boolean>(DEFAULT_ARRANGE_OPTIONS.allowResize);
  const [lastArranged, setLastArranged] = useState<number | null>(null);

  const activeIds = selectedIds.length ? selectedIds : selectedId ? [selectedId] : [];
  const selectedElements = elements.filter((e) => activeIds.includes(e.id));
  const selectedUnlocked = selectedElements.filter((e) => !e.locked);
  const lockedSelectedCount = selectedElements.length - selectedUnlocked.length;
  const slideUnlocked = elements.filter((e) => !e.locked && !e.hidden);

  const canArrangeSelected = selectedUnlocked.length >= 2;
  const overlapCount = canArrangeSelected ? countElementOverlaps(selectedUnlocked) : 0;

  const runArrange = (overrideMode?: ArrangeMode, scope: "selected" | "all" = "selected") => {
    const count = autoArrangeSelected({
      mode: overrideMode ?? mode,
      align,
      anchor,
      gap,
      margin,
      keepInBounds: true,
      allowResize,
      scope,
    });
    if (count > 0) setLastArranged(count);
  };

  return (
    <div className="space-y-4 px-1">
      {/* Selection & overlap status */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`grid size-7 shrink-0 place-items-center rounded-xl ${
                canArrangeSelected ? "bg-blue-600 text-white" : "bg-slate-200/80 text-slate-500"
              }`}
            >
              <MousePointerClick className="size-3.5" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-[11px] font-semibold text-slate-800">
                {canArrangeSelected
                  ? `${selectedUnlocked.length} elements selected`
                  : "Select 2+ elements"}
              </div>
              <div className="text-[10px] text-slate-500">
                {canArrangeSelected
                  ? overlapCount > 0
                    ? `${overlapCount} overlap${overlapCount === 1 ? "" : "s"} detected`
                    : "No bounding overlaps"
                  : lockedSelectedCount > 0
                    ? `${lockedSelectedCount} locked element skipped`
                    : "Shift+Click on canvas to multi-select"}
              </div>
            </div>
          </div>

          {!canArrangeSelected && slideUnlocked.length >= 2 && (
            <button
              type="button"
              onClick={() => {
                selectMany(slideUnlocked.map((e) => e.id));
                setLastArranged(null);
              }}
              className="shrink-0 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              Select all ({slideUnlocked.length})
            </button>
          )}
          {canArrangeSelected && overlapCount === 0 && lastArranged !== null && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              <CheckCircle2 className="size-3" /> Clean
            </span>
          )}
        </div>
      </div>

      {/* Layout heuristic */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] font-semibold tracking-wide text-slate-500">
          <span>Layout heuristic</span>
          <span className="font-normal text-slate-400">Zero overlap</span>
        </div>
        <OptionGrid
          label="Auto-arrange layout heuristic"
          value={mode === "align-tidy" ? undefined : mode}
          onChange={(next) => {
            setMode(next);
            setLastArranged(null);
          }}
          options={MODE_OPTIONS}
        />
        <button
          type="button"
          aria-pressed={mode === "align-tidy"}
          onClick={() => {
            setMode("align-tidy");
            setLastArranged(null);
          }}
          className={`flex w-full items-center gap-2.5 rounded-2xl border px-3 py-2 text-left transition ${
            mode === "align-tidy"
              ? "border-blue-500 bg-blue-50/70 text-blue-700"
              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
          }`}
        >
          <span
            className={`grid size-7 shrink-0 place-items-center rounded-xl ${
              mode === "align-tidy" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
            }`}
          >
            <Sparkles className="size-3.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold">Tidy &amp; de-overlap</span>
            <span className="block text-[10px] text-slate-400">
              Snap near-aligned tracks &amp; push apart collisions
            </span>
          </span>
        </button>
      </div>

      {/* Alignment & target region */}
      <div className="space-y-2.5">
        <div className="space-y-1.5">
          <div className="text-[10px] font-semibold tracking-wide text-slate-500">Alignment</div>
          <SegmentedControl
            label="Element alignment"
            value={align}
            onChange={setAlign}
            options={[
              { value: "start", label: "Start", icon: AlignStartHorizontal },
              { value: "center", label: "Center", icon: AlignCenterHorizontal },
              { value: "end", label: "End", icon: AlignEndHorizontal },
            ]}
          />
        </div>

        <div className="space-y-1.5">
          <div className="text-[10px] font-semibold tracking-wide text-slate-500">Target area</div>
          <SegmentedControl
            label="Target area"
            value={anchor}
            onChange={setAnchor}
            options={[
              { value: "canvas", label: "Full slide", icon: LayoutGrid },
              { value: "selection", label: "Selection bounds", icon: Columns3 },
            ]}
          />
        </div>
      </div>

      {/* Gap & margin sliders */}
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3">
        <label className="block space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium text-slate-700">Spacing gap</span>
            <span className="font-mono text-[11px] font-semibold tabular-nums text-slate-500">
              {gap}px
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={120}
            step={4}
            value={gap}
            onChange={(e) => setGap(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer accent-blue-600"
          />
        </label>

        <label className="block space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium text-slate-700">Slide margin</span>
            <span className="font-mono text-[11px] font-semibold tabular-nums text-slate-500">
              {margin}px
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={160}
            step={8}
            value={margin}
            onChange={(e) => setMargin(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer accent-blue-600"
          />
        </label>

        <button
          type="button"
          aria-pressed={allowResize}
          onClick={() => setAllowResize((v) => !v)}
          className={`flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition ${
            allowResize
              ? "border-blue-500/60 bg-blue-50/60"
              : "border-slate-200 bg-slate-50 hover:border-slate-300"
          }`}
        >
          <span
            className={`grid size-6 shrink-0 place-items-center rounded-lg ${
              allowResize ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"
            }`}
          >
            <Shrink className="size-3.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span
              className={`block text-[11px] font-semibold ${allowResize ? "text-blue-700" : "text-slate-700"}`}
            >
              Auto-fit oversized items
            </span>
            <span className="block text-[10px] text-slate-400">
              Scale down if needed to prevent overlap
            </span>
          </span>
          <span
            className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
              allowResize ? "bg-blue-600" : "bg-slate-200"
            }`}
          >
            <span
              className={`absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-all ${
                allowResize ? "left-[1.125rem]" : "left-0.5"
              }`}
            />
          </span>
        </button>
      </div>

      {/* Primary action */}
      <div className="space-y-2 pb-1">
        <button
          type="button"
          disabled={!canArrangeSelected}
          onClick={() => runArrange(mode, "selected")}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.25)] transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
        >
          <Wand2 className="size-3.5" />
          {canArrangeSelected
            ? `Auto-Arrange (${selectedUnlocked.length})`
            : "Auto-Arrange Selected"}
        </button>

        {!canArrangeSelected && slideUnlocked.length >= 2 && (
          <button
            type="button"
            onClick={() => runArrange(mode, "all")}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <Rows3 className="size-3.5 text-blue-600" />
            Auto-Arrange all on slide ({slideUnlocked.length})
          </button>
        )}

        {lastArranged !== null && (
          <p className="text-center text-[10px] text-slate-400">
            Arranged {lastArranged} elements without overlaps · Undo with ⌘Z
          </p>
        )}
      </div>
    </div>
  );
}
