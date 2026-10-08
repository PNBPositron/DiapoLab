import { useEffect, useMemo, useRef, useState } from "react";
import {
  useEditor,
  type AnyElement,
} from "@/store/editor";
import {
  Search,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  Type,
  Square,
  Image as ImageIcon,
  BarChart3,
  HelpCircle,
  Keyboard,
  Sparkles,
  Globe,
  Github,
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
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type CommandGroup = "Actions" | "Insert" | "Shortcuts" | "Features" | "Links";

type Command = {
  id: string;
  label: string;
  group: CommandGroup;
  /** what the command does — shown as hint */
  hint?: string;
  /** keyboard shortcut displayed (and matched by the search) */
  shortcut?: string[];
  icon: React.ReactNode;
  /** run the command (actions + insert) */
  run?: () => void;
  /** external URL (links) */
  href?: string;
  /** keywords for fuzzy search, in addition to label + hint */
  keywords?: string;
};

/* ------------------------------------------------------------------ */
/* Fuzzy match — simple substring scoring, good enough for a palette   */
/* ------------------------------------------------------------------ */

function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase();
  if (!q) return 1;
  if (t.includes(q)) return 3 - t.indexOf(q) * 0.01;
  // loose subsequence: all chars in order
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

  /* ------------------ Command registry ------------------ */
  const commands = useMemo<Command[]>(() => {
    const selected: AnyElement | undefined = store.elements.find(
      (e) => e.id === store.selectedId,
    );

    const actions: Command[] = [
      {
        id: "undo",
        label: "Undo",
        group: "Actions",
        shortcut: ["Ctrl", "Z"],
        icon: <Undo2 className="size-4" />,
        run: () => store.undo(),
      },
      {
        id: "redo",
        label: "Redo",
        group: "Actions",
        shortcut: ["Ctrl", "Shift", "Z"],
        icon: <Redo2 className="size-4" />,
        run: () => store.redo(),
      },
      {
        id: "duplicate",
        label: "Duplicate selection",
        group: "Actions",
        shortcut: ["Ctrl", "D"],
        icon: <Copy className="size-4" />,
        hint: selected ? `${selected.type} selected` : "select an element first",
        run: () => store.duplicateSelected(),
      },
      {
        id: "delete",
        label: "Delete selection",
        group: "Actions",
        shortcut: ["Del"],
        icon: <Trash2 className="size-4" />,
        run: () => store.removeSelected(),
      },
      {
        id: "clear-slide",
        label: "Clear current slide",
        group: "Actions",
        icon: <Trash2 className="size-4" />,
        run: () => {
          if (window.confirm("Remove all elements from this slide?")) store.clear();
        },
      },
      {
        id: "new-slide",
        label: "Add slide",
        group: "Actions",
        icon: <Plus className="size-4" />,
        run: () => store.addPage(),
      },
      {
        id: "present",
        label: "Start presentation",
        group: "Actions",
        shortcut: ["Ctrl", "Enter"],
        icon: <Play className="size-4" />,
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
            ...({} as AnyElement),
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
          } as AnyElement),
      },
      {
        id: "insert-shape",
        label: "Insert shape (rect)",
        group: "Insert",
        icon: <Square className="size-4" />,
        keywords: "add rectangle square box",
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
          } as AnyElement),
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
          } as AnyElement),
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
      },
      {
        id: "sc-duplicate",
        label: "Duplicate selected element",
        group: "Shortcuts",
        shortcut: ["Ctrl", "D"],
        icon: <Keyboard className="size-4" />,
      },
      {
        id: "sc-undo",
        label: "Undo last change",
        group: "Shortcuts",
        shortcut: ["Ctrl", "Z"],
        icon: <Keyboard className="size-4" />,
      },
      {
        id: "sc-redo",
        label: "Redo",
        group: "Shortcuts",
        shortcut: ["Ctrl", "Shift", "Z"],
        icon: <Keyboard className="size-4" />,
      },
      {
        id: "sc-shift-click",
        label: "Add element to selection",
        group: "Shortcuts",
        shortcut: ["Shift", "Click"],
        icon: <Keyboard className="size-4" />,
        keywords: "multi select group",
      },
      {
        id: "sc-dblclick",
        label: "Edit text inline",
        group: "Shortcuts",
        shortcut: ["Double-click", "text"],
        icon: <Keyboard className="size-4" />,
      },
      {
        id: "sc-present",
        label: "Play presentation",
        group: "Shortcuts",
        shortcut: ["Ctrl", "Enter"],
        icon: <Keyboard className="size-4" />,
      },
    ];

    const features: Command[] = [
      {
        id: "ft-brand",
        label: "Brand Kit — colors & fonts",
        group: "Features",
        icon: <WandSparkles className="size-4" />,
        hint: "Left panel → Brand Kit tab",
        keywords: "brand kit palette fonts theme identity",
      },
      {
        id: "ft-masks",
        label: "Shape masks on text, shapes & images",
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
        keywords: "knockout background window frosted text shape",
      },
      {
        id: "ft-glass",
        label: "Liquid Glass effect",
        group: "Features",
        icon: <Sparkles className="size-4" />,
        hint: "Select a shape → Inspector → Effect",
        keywords: "glass blur translucent effect liquid",
      },
      {
        id: "ft-3d",
        label: "3D transforms & interactive tilt",
        group: "Features",
        icon: <Layers className="size-4" />,
        hint: "Inspector → 3D Transform",
        keywords: "3d perspective rotate tilt hover presenting",
      },
      {
        id: "ft-morph",
        label: "Morph slide transition",
        group: "Features",
        icon: <Sparkles className="size-4" />,
        hint: "Slide settings → Transition → Morph",
        keywords: "transition morph tween animation between slides",
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
        hint: "Left panel → AI tab",
        keywords: "ai generate redesign magic assistant",
      },
      {
        id: "ft-publish",
        label: "Publish template to community",
        group: "Features",
        icon: <FileUp className="size-4" />,
        hint: "Toolbar → share icon",
        keywords: "publish share community marketplace template",
      },
    ];

    const links: Command[] = [
      {
        id: "lk-github",
        label: "DiapoLab on GitHub",
        group: "Links",
        icon: <Github className="size-4" />,
        href: "https://github.com/PNBPositron/DiapoLab",
        keywords: "github repo source code issues",
      },
      {
        id: "lk-issues",
        label: "Report a bug / feature request",
        group: "Links",
        icon: <Github className="size-4" />,
        href: "https://github.com/PNBPositron/DiapoLab/issues",
        keywords: "issue bug feedback report",
      },
      {
        id: "lk-live",
        label: "Live app",
        group: "Links",
        icon: <Globe className="size-4" />,
        href: window.location.origin,
        keywords: "app live deploy vercel",
      },
      {
        id: "lk-docs",
        label: "Help & documentation",
        group: "Links",
        icon: <HelpCircle className="size-4" />,
        href: "https://github.com/PNBPositron/DiapoLab#readme",
        keywords: "help docs documentation readme how to",
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

  /* ------------------ Keyboard nav ------------------ */
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      // focus input after mount
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const runCommand = (c: Command) => {
    if (c.href) {
      window.open(c.href, "_blank", "noopener,noreferrer");
    } else {
      c.run?.();
    }
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

  // scroll active item into view
  useEffect(() => {
    listRef.current?.children[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!open) return null;

  // group headers: show when the group changes
  let lastGroup: CommandGroup | null = null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-950/30 p-4 pt-[12vh] backdrop-blur-sm animate-in fade-in duration-150"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.25)] animate-in slide-in-from-top-2 duration-150"
        onKeyDown={onKeyDown}
      >
        {/* Input */}
        <div className="flex items-center gap-2.5 border-b border-slate-100 px-4">
          <Search className="size-4 shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands, shortcuts, features, links…"
            className="h-12 min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
          />
          <kbd className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-500">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-400">
              <Search className="size-6" />
              <p className="text-xs font-medium">No results for “{query}”</p>
            </div>
          ) : (
            filtered.map((c, i) => {
              const showHeader = c.group !== lastGroup;
              lastGroup = c.group;
              return (
                <div key={c.id}>
                  {showHeader && (
                    <div className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {c.group}
                    </div>
                  )}
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => runCommand(c)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                      i === activeIndex ? "bg-sky-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`grid size-8 shrink-0 place-items-center rounded-lg ${
                        i === activeIndex
                          ? "bg-sky-100 text-sky-600"
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
                    {c.href && <ExternalLink className="size-3.5 shrink-0 text-slate-300" />}
                    {c.shortcut && (
                      <span className="flex shrink-0 items-center gap-1">
                        {c.shortcut.map((k) => (
                          <kbd
                            key={k}
                            className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[9px] font-medium text-slate-500"
                          >
                            {k}
                          </kbd>
                        ))}
                      </span>
                    )}
                    {i === activeIndex && (
                      <CornerDownLeft className="size-3.5 shrink-0 text-sky-500" />
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 border-t border-slate-100 bg-slate-50/60 px-4 py-2 text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <ArrowUp className="size-3" />
            <ArrowDown className="size-3" /> navigate
          </span>
          <span className="flex items-center gap-1">
            <CornerDownLeft className="size-3" /> run
          </span>
          <span className="ml-auto flex items-center gap-1">
            <kbd className="rounded border border-slate-200 bg-white px-1 font-mono">⌘K</kbd>
            toggle
          </span>
        </div>
      </div>
    </div>
  );
}
