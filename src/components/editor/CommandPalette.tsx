import { useEffect, useMemo, useRef, useState } from "react";
import { useEditor, type AnyElement } from "@/store/editor";
import { usePlugins, allPlugins, instantiateWidget } from "@/lib/plugins";
import {
  Search,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  Square,
  Bug,
  Command,
  Sparkles,
  Globe,
  Scissors,
  Group,
  Ungroup,
  Copy,
  Trash2,
  Undo2,
  Redo2,
  Play,
  Plus,
  FileUp,
  Palette,
  MousePointerClick,
  TextCursorInput,
  History,
  Repeat2,
  Eraser,
  Presentation,
  Heading1,
  Frame,
  LineChart,
  Droplets,
  Box,
  Puzzle,
  Brush,
  History as HistoryIcon,
  Shuffle,
  Zap,
  Link2,
  MousePointerSquareDashed,
  ExternalLink,
  FolderGit2,
  BookOpen,
  Command as CommandIcon,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type CommandGroup = "Recent" | "Actions" | "Insert" | "Shortcuts" | "Features" | "Plugins" | "Links";

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

const GROUP_ICONS: Record<CommandGroup, React.ReactNode> = {
  Recent: <HistoryIcon className="size-2.5" />,
  Actions: <Zap className="size-2.5" />,
  Insert: <Plus className="size-2.5" />,
  Shortcuts: <Command className="size-2.5" />,
  Features: <Sparkles className="size-2.5" />,
  Plugins: <Puzzle className="size-2.5" />,
  Links: <Link2 className="size-2.5" />,
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

/** Wraps the fuzzy-matched characters of "label" in highlighted marks. */
function highlightLabel(label: string, query: string): React.ReactNode {
  const q = query.toLowerCase().trim();
  if (!q) return label;
  const lower = label.toLowerCase();
  const parts: React.ReactNode[] = [];
  let ti = 0;
  let li = 0;
  for (const ch of q) {
    const found = lower.indexOf(ch, ti);
    if (found === -1) return label; // not a subsequence of the label — no highlight
    if (found > li) parts.push(label.slice(li, found));
    parts.push(
      <mark key={found} className="rounded-sm bg-blue-100 px-0.5 text-blue-700">
        {label[found]}
      </mark>,
    );
    li = found + 1;
    ti = found + 1;
  }
  if (li < label.length) parts.push(label.slice(li));
  return parts;
}

/* ------------------ Recent commands (localStorage) ------------------ */

const RECENTS_KEY = "diapolab.palette.recents.v1";
const RECENTS_MAX = 6;

function loadRecents(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENTS_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function saveRecent(id: string) {
  try {
    const next = [id, ...loadRecents().filter((x) => x !== id)].slice(0, RECENTS_MAX);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    /* private mode — ignore */
  }
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
  const [recents, setRecents] = useState<string[]>([]);

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
        id: "group",
        label: "Group selection",
        group: "Actions",
        icon: <Group className="size-4" />,
        hint: store.selectedIds.length > 1 ? store.selectedIds.length + " elements selected" : "select 2+ elements first (shift+click)",
        keywords: "group bind block together move",
        run: () => store.groupSelected(),
      },
      {
        id: "ungroup",
        label: "Ungroup selection",
        group: "Actions",
        icon: <Ungroup className="size-4" />,
        hint: "removes the group link",
        keywords: "ungroup split detach separate",
        run: () => store.ungroupSelected(),
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
        icon: <Eraser className="size-4" />,
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
        icon: <Presentation className="size-4" />,
        keywords: "present play fullscreen slideshow",
        run: () => store.setPresenting(true),
      },
    ];

    const insert: Command[] = [
      {
        id: "insert-text",
        label: "Insert text",
        group: "Insert",
        icon: <Heading1 className="size-4" />,
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
        icon: <LineChart className="size-4" />,
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
        icon: <CommandIcon className="size-4" />,
        keywords: "command palette search menu",
        run: () => onOpenChange(!open),
      },
      {
        id: "sc-delete",
        label: "Delete selected element",
        group: "Shortcuts",
        shortcut: ["Del"],
        icon: <Trash2 className="size-4" />,
        keywords: "delete remove",
      },
      {
        id: "sc-duplicate",
        label: "Duplicate selected element",
        group: "Shortcuts",
        shortcut: ["Ctrl", "D"],
        icon: <Copy className="size-4" />,
        keywords: "duplicate copy",
      },
      {
        id: "sc-undo",
        label: "Undo last change",
        group: "Shortcuts",
        shortcut: ["Ctrl", "Z"],
        icon: <History className="size-4" />,
        keywords: "undo history",
      },
      {
        id: "sc-redo",
        label: "Redo",
        group: "Shortcuts",
        shortcut: ["Ctrl", "⇧", "Z"],
        icon: <Repeat2 className="size-4" />,
        keywords: "redo",
      },
      {
        id: "sc-shiftclick",
        label: "Add element to selection",
        group: "Shortcuts",
        shortcut: ["⇧", "Click"],
        icon: <MousePointerSquareDashed className="size-4" />,
        keywords: "multi select group",
      },
      {
        id: "sc-dblclick",
        label: "Edit text inline",
        group: "Shortcuts",
        shortcut: ["Double-click", "text"],
        icon: <TextCursorInput className="size-4" />,
        keywords: "edit text inline",
      },
      {
        id: "sc-present",
        label: "Play presentation",
        group: "Shortcuts",
        shortcut: ["Ctrl", "↵"],
        icon: <Play className="size-4" />,
        keywords: "present play",
      },
    ];

    const features: Command[] = [
      {
        id: "ft-brand",
        label: "Brand Kit — colors & fonts",
        group: "Features",
        icon: <Palette className="size-4" />,
        hint: "Left panel → Brand Kit",
        keywords: "brand kit palette fonts theme identity",
      },
      {
        id: "ft-masks",
        label: "Shape masks — text, shapes, images",
        group: "Features",
        icon: <Scissors className="size-4" />,
        hint: "Inspector → Shape Mask",
        keywords: "mask clip hexagon circle knockout silhouette",
      },
      {
        id: "ft-slidebg",
        label: "Slide-background knockout fill",
        group: "Features",
        icon: <Frame className="size-4" />,
        hint: "Inspector → Fill → Slide BG",
        keywords: "knockout background frosted window",
      },
      {
        id: "ft-glass",
        label: "Liquid Glass effect",
        group: "Features",
        icon: <Droplets className="size-4" />,
        hint: "Select a shape → Effect",
        keywords: "glass blur translucent liquid effect",
      },
      {
        id: "ft-3d",
        label: "3D transforms & interactive tilt",
        group: "Features",
        icon: <Box className="size-4" />,
        hint: "Inspector → 3D Transform",
        keywords: "3d perspective rotate tilt",
      },
      {
        id: "ft-morph",
        label: "Morph slide transition",
        group: "Features",
        icon: <Shuffle className="size-4" />,
        hint: "PagesBar → Transition → Morph",
        keywords: "transition morph tween animation",
      },
      {
        id: "ft-interaction",
        label: "Click interactions — jump to slide",
        group: "Features",
        icon: <MousePointerClick className="size-4" />,
        hint: "Inspector → Interaction",
        keywords: "interactive link navigation click jump",
      },
      {
        id: "ft-plugins",
        label: "Plugins — custom widget packs",
        group: "Features",
        icon: <Puzzle className="size-4" />,
        hint: "Left panel → Plugins",
        keywords: "plugins widgets importer packs code",
        run: () => store.setTool("plugins"),
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
        icon: <Bug className="size-4" />,
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
        id: "lk-wiki",
        label: "Wiki — help & documentation",
        group: "Links",
        icon: <BookOpen className="size-4" />,
        href: "/wiki",
        keywords: "wiki help docs documentation guide faq",
      },
    ];

    /* Plugin content — widgets become insertable, apps open their tool */
    // preinstalled plugins (Paint…) + user-imported ones
    const pluginList = allPlugins(usePlugins.getState().plugins);
    const pluginCmds: Command[] = pluginList
      .filter((p) => p.enabled)
      .flatMap((p) => [
        ...p.widgets.map((w, i) => ({
          id: `pw-${p.id}-${i}`,
          label: w.name,
          group: "Plugins" as CommandGroup,
          icon: <Puzzle className="size-4" />,
          hint: `widget · ${p.name}`,
          keywords: `plugin widget insert ${w.name} ${p.name}`,
          run: () => store.addGroup(instantiateWidget(w)),
        })),
        ...(p.apps ?? []).map((a, i) => ({
          id: `pa-${p.id}-${i}`,
          label: `Open ${a.name}`,
          group: "Plugins" as CommandGroup,
          icon: <Brush className="size-4" />,
          hint: `app · ${p.name}`,
          keywords: `plugin app ${a.type} ${a.name} ${p.name}`,
          run: () => {
            store.setTool("plugins");
            window.dispatchEvent(
              new CustomEvent("diapolab:open-app", { detail: { appName: a.name } }),
            );
          },
        })),
      ]);

    return [...actions, ...insert, ...shortcuts, ...features, ...pluginCmds, ...links];
  }, [store, open, onOpenChange]);

  /* ------------------ Filtering ------------------ */
  const filtered = useMemo(() => {
    if (!query.trim()) {
      // idle palette: recent commands first, then everything else
      const recentCmds = recents
        .map((id) => commands.find((c) => c.id === id))
        .filter((c): c is Command => !!c && !c.href);
      const recentIds = new Set(recentCmds.map((c) => c.id));
      return [...recentCmds, ...commands.filter((c) => !recentIds.has(c.id))];
    }
    return commands
      .map((c) => {
        const target = `${c.label} ${c.hint ?? ""} ${c.keywords ?? ""} ${(c.shortcut ?? []).join(" ")}`;
        return { c, score: fuzzyScore(query, target) };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.c);
  }, [query, commands, recents]);

  /* ------------------ Behavior ------------------ */
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setRecents(loadRecents());
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => setActiveIndex(0), [query]);

  useEffect(() => {
    listRef.current?.children[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!open) return null;

  const runCommand = (c: Command) => {
    if (c.href) window.open(c.href, c.href.startsWith("/") ? "_self" : "_blank", "noopener,noreferrer");
    else c.run?.();
    if (c.run) saveRecent(c.id);
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
      className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-950/40 p-4 pt-[10vh] backdrop-blur-md animate-in fade-in duration-150"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={onKeyDown}
        className="w-full max-w-[600px] overflow-hidden rounded-3xl border border-white/60 bg-white/95 shadow-[0_32px_90px_-20px_rgba(15,23,42,0.45),0_0_0_1px_rgba(15,23,42,0.04)] backdrop-blur-xl animate-in slide-in-from-top-4 zoom-in-95 duration-200"
      >
        {/* Brand + search bar */}
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-50 via-white to-blue-50/60 px-5">
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{ backgroundImage: "radial-gradient(circle at 92% 20%, rgba(37,99,235,0.16) 0%, transparent 60%)" }}
          />
          <div className="relative flex items-center gap-3 py-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-600 text-white shadow-[0_6px_16px_rgba(37,99,235,0.35)]">
              <Search className="size-4" />
            </span>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search commands, widgets, apps, features…"
              className="h-11 min-w-0 flex-1 bg-transparent text-[15px] font-medium text-slate-800 outline-none placeholder:text-slate-400"
            />
            <kbd className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[10px] font-semibold text-slate-400 shadow-sm">
              ESC
            </kbd>
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

        {/* Results */}
        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2.5">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14">
              <span className="grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-300">
                <Search className="size-5" />
              </span>
              <div className="text-center">
                <p className="text-xs font-semibold text-slate-500">No results for “{query}”</p>
                <p className="mt-1 text-[11px] text-slate-400">Try “insert”, “paint”, “plugin”, “present”…</p>
              </div>
            </div>
          ) : (
            filtered.map((c, i) => {
              const showHeader = c.group !== lastGroup;
              lastGroup = c.group;
              const active = i === activeIndex;
              return (
                <div key={c.id}>
                  {showHeader && (
                    <div className="flex items-center gap-1.5 px-3 pb-1.5 pt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      <span className="text-blue-400">{GROUP_ICONS[c.group]}</span>
                      {c.group}
                    </div>
                  )}
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => runCommand(c)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition-all duration-75 ${
                      active ? "bg-blue-50/80 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.18)]" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`grid size-9 shrink-0 place-items-center rounded-xl border transition-all ${
                        active
                          ? "border-blue-600 bg-blue-600 text-white shadow-[0_6px_14px_rgba(37,99,235,0.4)]"
                          : "border-slate-100 bg-slate-50 text-slate-500"
                      }`}
                    >
                      {c.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-slate-800">
                        {highlightLabel(c.label, query)}
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
                                : "border-slate-200 bg-slate-50/80 text-slate-500"
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
        <div className="flex items-center gap-4 border-t border-slate-100 bg-slate-50/70 px-4 py-2 text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <ArrowUp className="size-3" />
            <ArrowDown className="size-3" /> navigate
          </span>
          <span className="flex items-center gap-1">
            <CornerDownLeft className="size-3" /> run
          </span>
          <span className="ml-auto flex items-center gap-1">
            <kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-mono">
              Ctrl K
            </kbd>
            toggle
          </span>
        </div>
      </div>
    </div>
  );
}
