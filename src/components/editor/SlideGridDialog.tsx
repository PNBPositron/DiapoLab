import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  FileText,
  LayoutGrid,
  Play,
  Plus,
  Trash2,
  WandSparkles,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEditor } from "@/store/editor";
import { useSettings } from "@/store/settings";
import { formatTransitionLabel } from "@/lib/motion-catalog";
import { SlideThumbnail } from "./SlideThumbnail";

export function SlideGridDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    pages,
    currentIndex,
    setCurrentPage,
    addPage,
    duplicatePage,
    removePage,
    movePage,
    togglePageHiddenInPresent,
    setNotes,
    setPresenting,
    canvasW,
    canvasH,
  } = useEditor();
  const editorDark = useSettings((s) => s.editorDark);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const activePage = pages[currentIndex];
  const notesText = activePage?.notes ?? "";
  const wordCount = notesText.trim() ? notesText.trim().split(/\s+/).length : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`flex max-h-[90vh] max-w-5xl flex-col overflow-hidden rounded-xl p-0 shadow-2xl sm:rounded-xl ${
          editorDark
            ? "border-slate-700/80 bg-slate-900 text-slate-100"
            : "border-slate-200 bg-white text-slate-900"
        }`}
      >
        <DialogHeader
          className={`shrink-0 border-b px-5 py-4 ${
            editorDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"
          }`}
        >
          <DialogTitle className="flex items-center justify-between gap-3 pr-8 text-sm font-semibold">
            <span className="flex items-center gap-2.5">
              <span
                className={`grid size-8 place-items-center rounded-lg border ${
                  editorDark
                    ? "border-slate-700 bg-slate-800 text-slate-200"
                    : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                <LayoutGrid className="size-4" />
              </span>
              <span>
                Slide Overview
                <span
                  className={`ml-2 font-mono text-xs font-normal tabular-nums ${
                    editorDark ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  {pages.length} {pages.length === 1 ? "slide" : "slides"} · Drag cards to reorder
                </span>
              </span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={addPage}
                className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                  editorDark
                    ? "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Plus className="size-3.5" />
                <span>Add slide</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  setPresenting(true);
                }}
                className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
              >
                <Play className="size-3.5 fill-current" />
                <span>Present from #{currentIndex + 1}</span>
              </button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pages.map((p, idx) => {
              const active = idx === currentIndex;
              const isDropTarget = dragOver === idx && dragFrom !== null && dragFrom !== idx;
              const hasNotes = Boolean(p.notes?.trim());
              const transLabel =
                p.transition && p.transition !== "none"
                  ? formatTransitionLabel(p.transition)
                  : null;

              return (
                <div
                  key={p.id}
                  draggable
                  onDragStart={(e) => {
                    setDragFrom(idx);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOver !== idx) setDragOver(idx);
                  }}
                  onDragLeave={() => {
                    if (dragOver === idx) setDragOver(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragFrom !== null && dragFrom !== idx) {
                      movePage(dragFrom, idx);
                    }
                    setDragFrom(null);
                    setDragOver(null);
                  }}
                  onDragEnd={() => {
                    setDragFrom(null);
                    setDragOver(null);
                  }}
                  className={`group relative flex flex-col overflow-hidden rounded-lg border p-2.5 transition-colors ${
                    active
                      ? editorDark
                        ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30"
                        : "border-blue-600 bg-blue-50/40 ring-2 ring-blue-500/20"
                      : isDropTarget
                        ? "border-dashed border-blue-500 bg-blue-500/10"
                        : editorDark
                          ? "border-slate-700/80 bg-slate-800/50 hover:border-slate-600"
                          : "border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setCurrentPage(idx)}
                    onDoubleClick={() => {
                      setCurrentPage(idx);
                      onOpenChange(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setCurrentPage(idx);
                      }
                    }}
                    className={`relative aspect-video w-full cursor-pointer overflow-hidden rounded-md border text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                      editorDark ? "border-slate-700 bg-slate-950" : "border-slate-200 bg-white"
                    }`}
                  >
                    <SlideThumbnail
                      page={p}
                      canvasW={canvasW}
                      canvasH={canvasH}
                      className={`h-full w-full ${p.hiddenInPresent ? "opacity-45" : ""}`}
                    />
                    <span
                      className={`absolute left-2 top-2 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums shadow-xs ${
                        active ? "bg-blue-600 text-white" : "bg-slate-900/75 text-white"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    {p.hiddenInPresent && (
                      <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-amber-600/95 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-xs">
                        <EyeOff className="size-2.5" />
                        Hidden in present
                      </span>
                    )}
                    {transLabel && (
                      <span className="absolute right-2 top-2 flex items-center gap-1 rounded bg-slate-900/75 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        <WandSparkles className="size-2.5 text-blue-300" />
                        {transLabel}
                      </span>
                    )}
                    {hasNotes && (
                      <span
                        title="Has speaker notes"
                        className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-amber-600/90 px-1.5 py-0.5 text-[10px] font-medium text-white shadow-xs"
                      >
                        <FileText className="size-2.5" />
                        Notes
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2 px-0.5">
                    <span
                      className={`truncate text-[11px] font-medium ${
                        editorDark ? "text-slate-300" : "text-slate-600"
                      }`}
                    >
                      {p.elements.length} {p.elements.length === 1 ? "layer" : "layers"}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => togglePageHiddenInPresent(idx)}
                        title={
                          p.hiddenInPresent
                            ? "Show slide in present mode"
                            : "Hide slide in present mode"
                        }
                        className={`grid size-6 place-items-center rounded-lg transition ${
                          p.hiddenInPresent
                            ? "bg-amber-500/20 text-amber-500"
                            : editorDark
                              ? "text-slate-300 hover:bg-slate-700"
                              : "text-slate-600 hover:bg-slate-200/80"
                        }`}
                      >
                        {p.hiddenInPresent ? (
                          <EyeOff className="size-3.5" />
                        ) : (
                          <Eye className="size-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => movePage(idx, idx - 1)}
                        title="Move slide earlier"
                        className={`grid size-6 place-items-center rounded-lg transition disabled:opacity-30 ${
                          editorDark
                            ? "text-slate-300 hover:bg-slate-700"
                            : "text-slate-600 hover:bg-slate-200/80"
                        }`}
                      >
                        <ChevronLeft className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === pages.length - 1}
                        onClick={() => movePage(idx, idx + 1)}
                        title="Move slide later"
                        className={`grid size-6 place-items-center rounded-lg transition disabled:opacity-30 ${
                          editorDark
                            ? "text-slate-300 hover:bg-slate-700"
                            : "text-slate-600 hover:bg-slate-200/80"
                        }`}
                      >
                        <ChevronRight className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => duplicatePage(idx)}
                        title="Duplicate slide"
                        className={`grid size-6 place-items-center rounded-lg transition ${
                          editorDark
                            ? "text-blue-300 hover:bg-blue-500/20"
                            : "text-blue-600 hover:bg-blue-50"
                        }`}
                      >
                        <Copy className="size-3.5" />
                      </button>
                      {pages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePage(idx)}
                          title="Delete slide"
                          className={`grid size-6 place-items-center rounded-lg transition ${
                            editorDark
                              ? "text-rose-300 hover:bg-rose-500/20"
                              : "text-rose-600 hover:bg-rose-50"
                          }`}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected slide quick speaker notes editor */}
        <div
          className={`shrink-0 border-t px-5 py-3.5 ${
            editorDark ? "border-slate-800 bg-slate-900/95" : "border-slate-200 bg-slate-50/80"
          }`}
        >
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label
              htmlFor="overview-speaker-notes"
              className={`flex items-center gap-1.5 text-xs font-semibold ${
                editorDark ? "text-slate-200" : "text-slate-700"
              }`}
            >
              <FileText className="size-3.5 text-blue-500" />
              <span>Speaker notes · Slide #{currentIndex + 1}</span>
            </label>
            <span
              className={`font-mono text-[10px] ${
                editorDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              {wordCount} {wordCount === 1 ? "word" : "words"}
              {wordCount > 0 ? ` · ~${Math.max(1, Math.round(wordCount / 2.2))}s read` : ""}
            </span>
          </div>
          <textarea
            id="overview-speaker-notes"
            rows={2}
            value={notesText}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Write talking points for presenter mode (press P while presenting to view)..."
            className={`w-full resize-none rounded-md border px-3 py-2 text-xs outline-none transition focus:ring-2 focus:ring-blue-500/25 ${
              editorDark
                ? "border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:border-blue-500"
                : "border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:border-blue-500"
            }`}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
