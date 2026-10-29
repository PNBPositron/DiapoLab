import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { useEditor, type AnyElement } from "@/store/editor";

/**
 * Deck-wide find & replace (Ctrl/Cmd+F, or the toolbar button).
 * Searches every editable text field: text & button labels, UI component
 * titles/bodies/items, quiz questions & options, chart titles & data labels.
 */

type Hit = { page: number; elementId: string; before: string; match: string; after: string };

/** All editable copy carried by one element. */
const fieldsOf = (e: AnyElement): string[] => {
  switch (e.type) {
    case "text":
    case "button":
      return [e.text];
    case "ui":
      return [e.title, e.body, ...e.items];
    case "quiz":
      return [e.question, ...e.options.map((o) => o.text)];
    case "chart":
      return [e.title ?? "", ...e.data.map((d) => d.label)];
    default:
      return [];
  }
};

const escapeRx = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function FindReplaceDialog() {
  const { pages } = useEditor();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Global shortcut: Ctrl/Cmd+F opens, Escape closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Toolbar button opens the dialog through a custom event.
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("diapolab:open-find", onOpen);
    return () => window.removeEventListener("diapolab:open-find", onOpen);
  }, []);

  useEffect(() => {
    if (open) requestAnimationFrame(() => searchRef.current?.focus());
    else setDone(null);
  }, [open]);

  const hits = useMemo<Hit[]>(() => {
    const q = query.trim();
    if (!q || !open) return [];
    const rx = new RegExp(escapeRx(q), matchCase ? "g" : "gi");
    const out: Hit[] = [];
    pages.forEach((p, pi) => {
      for (const el of p.elements) {
        for (const s of fieldsOf(el)) {
          if (!s) continue;
          rx.lastIndex = 0;
          const m = rx.exec(s);
          if (!m) continue;
          const at = m.index;
          out.push({
            page: pi,
            elementId: el.id,
            before: s.slice(Math.max(0, at - 26), at),
            match: m[0],
            after: s.slice(at + m[0].length, at + m[0].length + 34),
          });
          break; // one hit per element is enough to locate it
        }
      }
    });
    return out;
  }, [query, matchCase, pages, open]);

  const gotoHit = (h: Hit) => {
    const s = useEditor.getState();
    if (s.presenting) return;
    s.setCurrentPage(h.page);
    s.select(h.elementId);
  };

  const replaceAll = () => {
    const n = useEditor.getState().replaceAllText(query.trim(), replacement, matchCase);
    setDone(n);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/30">
            <Search className="size-4" />
          </span>
          <div className="flex flex-col">
            <h2 className="font-display text-sm font-semibold tracking-tight text-slate-800">Find &amp; replace</h2>
            <p className="text-[10px] font-medium tracking-[0.04em] text-slate-400">Searches every slide of the deck</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="ml-auto flex size-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-blue-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100">
            <Search className="size-3.5 shrink-0 text-slate-400" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setDone(null); }}
              placeholder="Find in deck…"
              className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />
            <button
              onClick={() => setMatchCase((v) => !v)}
              title={matchCase ? "Match case: on" : "Match case: off"}
              className={`shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold transition ${
                matchCase ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500 hover:bg-slate-300"
              }`}
            >
              Aa
            </button>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-blue-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100">
            <svg className="size-3.5 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2 13.2 9.8M15 2l-4 4 2 2"/><path d="m16 20 2 2 4-4"/><path d="M3 3l14 14"/></svg>
            <input
              value={replacement}
              onChange={(e) => { setReplacement(e.target.value); setDone(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") replaceAll(); }}
              placeholder="Replace with…"
              className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={replaceAll}
            disabled={!query.trim() || hits.length === 0}
            className="rounded-xl bg-blue-600 px-4 py-2 font-display text-[11px] font-semibold tracking-wider text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-40"
          >
            Replace all
          </button>
          <span className="text-[11px] font-medium text-slate-500">
            {query.trim()
              ? hits.length === 0
                ? "No matches in this deck"
                : `${hits.length} element${hits.length > 1 ? "s" : ""} match${hits.length > 1 ? "" : "es"}`
              : "Type to search"}
          </span>
          {done != null && (
            <span className="ml-auto flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 animate-in fade-in">
              <Check className="size-3" /> {done} replaced
            </span>
          )}
        </div>

        {hits.length > 0 && (
          <div className="mt-3 max-h-64 space-y-1 overflow-y-auto pr-1">
            {hits.map((h, i) => (
              <button
                key={h.elementId + i}
                onClick={() => gotoHit(h)}
                className="flex w-full items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2 text-left text-xs text-slate-600 transition hover:border-blue-200 hover:bg-blue-50/50"
              >
                <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-500">
                  Slide {h.page + 1}
                </span>
                <span className="truncate">
                  {h.before}
                  <mark className="rounded-sm bg-yellow-200/80 px-0.5 text-slate-900">{h.match}</mark>
                  {h.after}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
