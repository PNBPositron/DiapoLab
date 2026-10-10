import { useEffect, useMemo, useRef, useState } from "react";
import { useEditor, type AnyElement } from "@/store/editor";
import {
  Search,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  Type,
  Square,
  BarChart3,
  HelpCircle,
  Keyboard,
  Sparkles,
  Globe,
  Layers,
  Copy,
  Trash2,
  Undo2,
  Redo2,
  Play,
  Plus,
  FileUp,
  WandSparkles,
  ExternalLink,
  FolderGit2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type CommandGroup = "Actions" | "Insert" | "Shortcuts" | "Features" | "Links";

type Command = {
  id: string;
  label: string;
  group: CommandGroup;
  hint?: string;
  shortcut?: string[];
  icon: React.ReactNode;
  run?: () => void;
  href?: string;
  keywords?: string;
};

/* ------------------------------------------------------------------ */
/* Fuzzy match                                                         */
/* ------------------------------------------------------------------ */

function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase();
  if (!q) return 1;
  if (t.includes(q)) return 3 - t.indexOf(q) * 0.01;
  let ti = 0;
  let score = 0;
  for (const ch of q) {
    const found = t.indexOf(ch, ti);
    if (found === -1) return 0;
    score += found === ti ? 1 : 0.5;
    ti = found + 1;
  }
  return score * 0.8;
}

/* ------------------------------------------------------------------ */
/* The palette                                                         */
/* ------------------------------------------------------------------ */

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const store = useEditor();
  const selected = store.elements.find((e) => e.id === store.selectedId);

  /* ------------------ Command registry ------------------ */
  const commands = useMemo<Command[]>(() => {
    const actions: Command[] = [
      {
        id: "undo",
        label: "Undo",
        group: "Actions",
        shortcut: ["Ctrl", "Z"],
        icon: <Undo2 className="size-4" />,
        keywords: "undo history revert",
        run: () => store.undo(),
      },
      {
        id: "redo",
        label: "Redo",
        group: "Actions",
        shortcut: ["Ctrl", "⇧", "Z"],
        icon: <Redo2 className="size-4" />,
        keywords: "redo history",
        run: () => store.redo(),
      },
      {
        id: "duplicate",
        label: "Duplicate selection",
        group: "Actions",
        shortcut: ["Ctrl", "D"],
        icon: <Copy className="size-4" />,
        hint: selected ? `selected: ${selected.type}` : "no selection",
        keywords: "duplicate copy clone",
        run: () => {
          if (store.selectedId) store.duplicate(store.selectedId);
        },
      },
      {
        id: "delete",
        label: "Delete selection",
        group: "Actions",
        shortcut: ["Del"],
        icon: <Trash2 className="size-4" />,
        hint: selected ? `selected: ${selected.type}` : "no selection",
        keywords: "delete remove trash",
        run: () => {
          if (store.selectedId) store.remove(store.selectedId);
        },
      },
      {
        id: "clear-slide",
        label: "Clear current slide",
        group: "Actions",
        icon: <Trash2 className="size-4" />,
        keywords: "clear empty reset slide",
        run: () => store.clear(),
      },
      {
        id: "new-slide",
        label: "Add slide",
        group: "Actions",
        icon: <Plus className="size-4" />,
        keywords: "new slide page add",
        run: () => store.addPage(),
      },
      {
        id: "present",
        label: "Start presentation",
        group: "Actions",
        shortcut: ["Ctrl", "↵"],
        icon: <Play className="size-4" />,
        keywords: "present play fullscreen slideshow",
        run: () => store.setPresenting(true),
      },
    ];

    const insert: Command[] = [
      {
        id: "insert-text",
        label: "Insert text",
        group: "Insert",
        icon: <Type className="size-4" />,
        keywords: "add text title heading paragraph",
        run: () =>
          store.add({
            type: "text",
            id: crypto.randomUUID(),
            x: 200,
            y: 200,
            width: 520,
            height: 120,
            rotation: 0,
            text: "Edit me",
            fontSize: 72,
            color: "#0a0f1f",
            fontWeight: 900,
            fontFamily: "Archivo Black",
            align: "left",
          } as unknown as AnyElement),
      },
      {
        id: "insert-shape",
        label: "Insert shape",
        group: "Insert",
        icon: <Square className="size-4" />,
        keywords: "add rectangle square rect box",
        run: () =>
          store.add({
            type: "shape",
            id: crypto.randomUUID(),
            x: 200,
            y: 200,
            width: 320,
            height: 320,
            rotation: 0,
            shape: "rect",
            fill: "#ffd84a",
            stroke: "#0a0f1f",
            strokeWidth: 6,
          } as unknown as AnyElement),
      },
      {
        id: "insert-chart",
        label: "Insert chart",
        group: "Insert",
        icon: <BarChart3 className="size-4" />,
        keywords: "add chart bar graph data",
        run: () =>
          store.add({
            type: "chart",
            id: crypto.randomUUID(),
            x: 160,
            y: 160,
            width: 720,
            height: 520,
            rotation: 0,
            chart: "bar",
            data: [
              { label: "Q1", value: 32 },
              { label: "Q2", value: 58 },
              { label: "Q3", value: 45 },
              { label: "Q4", value: 78 },
            ],
            colors: ["#7df9ff", "#ff0080", "#ffd84a", "#4d7cff", "#00ff88", "#b16bff"],
            bgColor: "#0a0f1f",
            fgColor: "#ffffff",
            title: "Quarterly results",
            showValues: true,
            showAxes: true,
          } as unknown as AnyElement),
      },
    ];

    const shortcuts: Command[] = [
      {
        id: "sc-palette",
        label: "Toggle command palette",
        group: "Shortcuts",
        shortcut: ["Ctrl", "K"],
        icon: <Keyboard className="size-4" />,
        keywords: "command palette search menu",
        run: () => onOpenChange(!open),
      },
      {
        id: "sc-delete",
        label: "Delete selected element",
        group: "Shortcuts",
        shortcut: ["Del"],
        icon: <Keyboard className="size-4" />,
        keywords: "delete remove",
      },
      {
        id: "sc-duplicate",
        label: "Duplicate selected element",
        group: "Shortcuts",
        shortcut: ["Ctrl", "D"],
        icon: <Keyboard className="size-4" />,
        keywords: "duplicate copy",
      },
      {
        id: "sc-undo",
        label: "Undo last change",
        group: "Shortcuts",
        shortcut: ["Ctrl", "Z"],
        icon: <Keyboard className="size-4" />,
        keywords: "undo history",
      },
      {
        id: "sc-redo",
        label: "Redo",
        group: "Shortcuts",
        shortcut: ["Ctrl", "⇧", "Z"],
        icon: <Keyboard className="size-4" />,
        keywords: "redo",
      },
      {
        id: "sc-shiftclick",
        label: "Add element to selection",
        group: "Shortcuts",
        shortcut: ["⇧", "Click"],
        icon: <Keyboard className="size-4" />,
        keywords: "multi select group",
      },
      {
        id: "sc-dblclick",
        label: "Edit text inline",
        group: "Shortcuts",
        shortcut: ["Double-click", "text"],
        icon: <Keyboard className="size-4" />,
        keywords: "edit text inline",
      },
      {
        id: "sc-present",
        label: "Play presentation",
        group: "Shortcuts",
        shortcut: ["Ctrl", "↵"],
        icon: <Keyboard className="size-4" />,
        keywords: "present play",
      },
    ];

    const features: Command[] = [
      {
        id: "ft-brand",
        label: "Brand Kit — colors & fonts",
        group: "Features",
        icon: <WandSparkles className="size-4" />,
        hint: "Left panel → Brand Kit",
        keywords: "brand kit palette fonts theme identity",
      },
      {
        id: "ft-masks",
        label: "Shape masks — text, shapes, images",
        group: "Features",
        icon: <Layers className="size-4" />,
        hint: "Inspector → Shape Mask",
        keywords: "mask clip hexagon circle knockout silhouette",
      },
      {
        id: "ft-slidebg",
        label: "Slide-background knockout fill",
        group: "Features",
        icon: <Layers className="size-4" />,
        hint: "Inspector → Fill → Slide BG",
        keywords: "knockout background frosted window",
      },
      {
        id: "ft-glass",
        label: "Liquid Glass effect",
        group: "Features",
        icon: <Sparkles className="size-4" />,
        hint: "Select a shape → Effect",
        keywords: "glass blur translucent liquid effect",
      },
      {
        id: "ft-3d",
        label: "3D transforms & interactive tilt",
        group: "Features",
        icon: <Layers className="size-4" />,
        hint: "Inspector → 3D Transform",
        keywords: "3d perspective rotate tilt",
      },
      {
        id: "ft-morph",
        label: "Morph slide transition",
        group: "Features",
        icon: <Sparkles className="size-4" />,
        hint: "PagesBar → Transition → Morph",
        keywords: "transition morph tween animation",
      },
      {
        id: "ft-interaction",
        label: "Click interactions — jump to slide",
        group: "Features",
        icon: <Play className="size-4" />,
        hint: "Inspector → Interaction",
        keywords: "interactive link navigation click jump",
      },
      {
        id: "ft-ai",
        label: "AI panel",
        group: "Features",
        icon: <Sparkles className="size-4" />,
        hint: "Left panel → AI",
        keywords: "ai generate redesign magic",
      },
      {
        id: "ft-publish",
        label: "Publish template to community",
        group: "Features",
        icon: <FileUp className="size-4" />,
        hint: "Toolbar → share",
        keywords: "publish share community template",
      },
    ];

    const links: Command[] = [
      {
        id: "lk-github",
        label: "DiapoLab on GitHub",
        group: "Links",
        icon: <FolderGit2 className="size-4" />,
        href: "https://github.com/PNBPositron/DiapoLab",
        keywords: "github repo source code",
      },
      {
        id: "lk-issues",
        label: "Report a bug / feature request",
        group: "Links",
        icon: <HelpCircle className="size-4" />,
        href: "https://github.com/PNBPositron/DiapoLab/issues",
        keywords: "issue bug feedback report",
      },
      {
        id: "lk-live",
        label: "Live app",
        group: "Links",
        icon: <Globe className="size-4" />,
        href: typeof window === "undefined" ? "/" : window.location.origin,
        keywords: "app live deploy site",
      },
      {
        id: "lk-docs",
        label: "Help & documentation",
        group: "Links",
        icon: <HelpCircle className="size-4" />,
        href: "https://github.com/PNBPositron/DiapoLab#readme",
        keywords: "help docs documentation readme",
      },
    ];

    return [...actions, ...insert, ...shortcuts, ...features, ...links];
  }, [store, open, onOpenChange]);

  /* ------------------ Filtering ------------------ */
  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    return commands
      .map((c) => {
        const target = `${c.label} ${c.hint ?? ""} ${c.keywords ?? ""} ${(c.shortcut ?? []).join(" ")}`;
        return { c, score: fuzzyScore(query, target) };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.c);
  }, [query, commands]);

  /* ------------------ Behavior ------------------ */
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => setActiveIndex(0), [query]);

  useEffect(() => {
    listRef.current?.children[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!open) return null;

  const runCommand = (c: Command) => {
    if (c.href) window.open(c.href, "_blank", "noopener,noreferrer");
    else c.run?.();
    onOpenChange(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const c = filtered[activeIndex];
      if (c) runCommand(c);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onOpenChange(false);
    }
  };

  let lastGroup: CommandGroup | null = null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-950/30 p-4 pt-[10vh] backdrop-blur-[4px] animate-in fade-in duration-150"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={onKeyDown}
        className="w-full max-w-[560px] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_24px_64px_-16px_rgba(15,23,42,0.3)] animate-in slide-in-from-top-3 zoom-in-95 duration-150"
      >
        {/* Search bar — clean, no border, blue search icon */}
        <div className="flex items-center gap-3 px-5">
          <Search className="size-4 shrink-0 text-blue-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands…"
            className="h-14 min-w-0 flex-1 bg-transparent text-[15px] text-slate-800 outline-none placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="grid size-6 shrink-0 place-items-center rounded-md text-slate-300 transition hover:bg-slate-100 hover:text-slate-500"
            title="Close (Esc)"
          >
            <kbd className="font-mono text-[10px] font-medium">ESC</kbd>
          </button>
        </div>

        {/* Thin divider under search */}
        <div className="h-px bg-slate-100" />

        {/* Results */}
        <div ref={listRef} className="max-h-[54vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-400">
              <Search className="size-6" />
              <p className="text-xs font-medium">No results for “{query}”</p>
            </div>
          ) : (
            filtered.map((c, i) => {
              const showHeader = c.group !== lastGroup;
              lastGroup = c.group;
              const active = i === activeIndex;
              return (
                <div key={c.id}>
                  {showHeader && (
                    <div className="px-3 pb-1.5 pt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      {c.group}
                    </div>
                  )}
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => runCommand(c)}
                    className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors duration-75 ${
                      active ? "bg-blue-50" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`grid size-8 shrink-0 place-items-center rounded-lg transition-colors ${
                        active
                          ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {c.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-slate-800">
                        {c.label}
                      </span>
                      {c.hint && (
                        <span className="block truncate text-[10px] text-slate-400">
                          {c.hint}
                        </span>
                      )}
                    </span>
                    {c.href && (
                      <ExternalLink
                        className={`size-3.5 shrink-0 ${active ? "text-blue-500" : "text-slate-300"}`}
                      />
                    )}
                    {c.shortcut && (
                      <span className="flex shrink-0 items-center gap-1">
                        {c.shortcut.map((k) => (
                          <kbd
                            key={k}
                            className={`rounded-md border px-1.5 py-0.5 font-mono text-[9px] font-medium ${
                              active
                                ? "border-blue-200 bg-blue-100/60 text-blue-700"
                                : "border-slate-200 bg-white text-slate-500"
                            }`}
                          >
                            {k}
                          </kbd>
                        ))}
                      </span>
                    )}
                    {active && (
                      <CornerDownLeft className="size-3.5 shrink-0 text-blue-500" />
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 border-t border-slate-100 px-4 py-2 text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <ArrowUp className="size-3" />
            <ArrowDown className="size-3" /> navigate
          </span>
          <span className="flex items-center gap-1">
            <CornerDownLeft className="size-3" /> run
          </span>
          <span className="ml-auto flex items-center gap-1">
            <kbd className="rounded border border-slate-200 bg-white px-1 font-mono">
              Ctrl K
            </kbd>
            toggle
          </span>
        </div>
      </div>
    </div>
  );
}
