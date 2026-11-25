import { useMemo, useState } from "react";
import { Accessibility, CheckCircle2, ChevronDown, AlertTriangle } from "lucide-react";
import { useEditor } from "@/store/editor";

/** WCAG relative luminance + contrast ratio (hex colors only, best effort). */
const parseColor = (raw: string): [number, number, number] | null => {
  const m = raw.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let hex = m[1];
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
};
const firstColor = (raw?: string): [number, number, number] | null => {
  if (!raw) return null;
  const direct = parseColor(raw);
  if (direct) return direct;
  const inside = raw.match(/#[0-9a-f]{3,6}/i);
  return inside ? parseColor(inside[0]) : null;
};
const luminance = ([r, g, b]: [number, number, number]) => {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrast = (a?: string, b?: string): number | null => {
  const ca = firstColor(a);
  const cb = firstColor(b);
  if (!ca || !cb) return null;
  const la = luminance(ca);
  const lb = luminance(cb);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

type Issue = { key: string; label: string; detail: string; elementId: string | null };

/** Floating accessibility checker for the current slide (Settings > Accessibility). */
export function A11yPanel() {
  const pages = useEditor((s) => s.pages);
  const currentIndex = useEditor((s) => s.currentIndex);
  const canvasW = useEditor((s) => s.canvasW);
  const canvasH = useEditor((s) => s.canvasH);
  const select = useEditor((s) => s.select);
  const [open, setOpen] = useState(true);

  const page = pages[currentIndex];
  const issues = useMemo<Issue[]>(() => {
    if (!page) return [];
    const list: Issue[] = [];
    for (const el of page.elements) {
      if (el.hidden) continue;
      if (el.type === "text") {
        const ratio = contrast(el.color, page.bgColor);
        const large = el.fontSize >= 24 || (el.fontSize >= 18.66 && el.fontWeight >= 700);
        if (ratio !== null && ratio < (large ? 3 : 4.5)) {
          list.push({
            key: el.id + ":contrast",
            label: "Low contrast",
            detail: `${el.text.slice(0, 28) || "Text"} — ratio ${ratio.toFixed(1)}:1 vs slide background`,
            elementId: el.id,
          });
        }
        if (el.fontSize < 14) {
          list.push({
            key: el.id + ":small",
            label: "Small font",
            detail: `${el.fontSize}px is hard to read on a projector`,
            elementId: el.id,
          });
        }
      }
      if (el.type === "chart" || el.type === "table") {
        const ratio = contrast((el as { fgColor: string }).fgColor, (el as { bgColor: string }).bgColor);
        if (ratio !== null && ratio < 4.5) {
          list.push({
            key: el.id + ":contrast",
            label: "Low contrast",
            detail: `${el.type === "chart" ? "Chart" : "Table"} text — ratio ${ratio.toFixed(1)}:1`,
            elementId: el.id,
          });
        }
      }
      if (el.x < -2 || el.y < -2 || el.x + el.width > canvasW + 2 || el.y + el.height > canvasH + 2) {
        list.push({
          key: el.id + ":bounds",
          label: "Off-canvas",
          detail: "Element extends beyond the slide edges",
          elementId: el.id,
        });
      }
    }
    return list;
  }, [page, canvasW, canvasH]);

  return (
    <div className="a11y-panel fixed bottom-24 right-4 z-40 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left transition-colors hover:bg-slate-50"
        aria-expanded={open}
      >
        <Accessibility className="size-4 text-blue-600" />
        <span className="flex-1 text-xs font-semibold text-slate-800">Accessibility</span>
        <span
          className={`rounded px-1.5 py-px font-mono text-[10px] font-semibold tabular-nums ${
            issues.length === 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
          }`}
        >
          {issues.length}
        </span>
        <ChevronDown className={`size-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="max-h-64 overflow-y-auto border-t border-slate-100 p-2">
          {issues.length === 0 ? (
            <p className="flex items-center gap-2 px-1.5 py-2 text-[10px] leading-snug text-emerald-600">
              <CheckCircle2 className="size-3.5 shrink-0" />
              No issues on this slide.
            </p>
          ) : (
            <ul className="space-y-1">
              {issues.map((issue) => (
                <li key={issue.key}>
                  <button
                    onClick={() => issue.elementId && select(issue.elementId)}
                    disabled={!issue.elementId}
                    className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-slate-50 disabled:cursor-default disabled:hover:bg-transparent"
                  >
                    <AlertTriangle className="mt-px size-3.5 shrink-0 text-amber-500" />
                    <span className="min-w-0">
                      <span className="block text-[10px] font-semibold text-slate-700">{issue.label}</span>
                      <span className="block truncate text-[9px] text-slate-400">{issue.detail}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="px-1.5 pb-1 pt-1.5 text-[9px] leading-snug text-slate-400">
            Contrast is checked against the slide background (WCAG AA). Toggle in Settings.
          </p>
        </div>
      )}
    </div>
  );
}
