import { useEffect, useState } from "react";
import { Code2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  useEditor,
  newText,
  newShape,
  newImage,
  newUi,
  type AnyElement,
  type ShapeKind,
  type UiKind,
  type UiStyle,
} from "@/store/editor";
import type { PluginApp } from "@/lib/plugins";

/**
 * Runtime plugin app. Executes the app's `config.html` inside a sandboxed
 * iframe (allow-scripts only, opaque origin, CSP blocks network) and bridges
 * a tiny `diapolab` API to the editor:
 *
 *   diapolab.insert([{ type: "text", x, y, ... }, { type: "shape", ... }])
 *
 * Payloads are validated and mapped onto built-in element factories — the
 * guest code never touches the editor store, the DOM or Supabase directly.
 */

/* Bridge script appended after the app's own HTML. */
const BRIDGE = [
  "<scr" + "ipt>",
  "(function () {",
  '  "use strict";',
  "  function post(msg) {",
  '    try { parent.postMessage(Object.assign({ source: "diapolab-runtime" }, msg), "*"); } catch (e) {}',
  "  }",
  "  window.diapolab = {",
  "    insert: function (elements) { post({ type: \"insert\", elements: elements }); },",
  "  };",
  "  post({ type: \"ready\" });",
  "})();",
  "</scr" + "ipt>",
].join("\n");

const num = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback;
const str = (v: unknown, max: number, fallback: string) =>
  typeof v === "string" ? v.slice(0, max) : fallback;

/** Map one validated guest payload onto a built-in canvas element. */
function toCanvasElement(raw: unknown): AnyElement | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const x = num(r.x, 0, 7680, 200);
  const y = num(r.y, 0, 4320, 200);
  const width = num(r.width, 8, 7680, 320);
  const height = num(r.height, 8, 4320, 240);
  const rotation = num(r.rotation, -36000, 36000, 0);
  if (r.type === "text") {
    return newText({
      x, y, width, height, rotation,
      text: str(r.text, 1000, "Text"),
      fontSize: num(r.fontSize, 8, 400, 48),
      color: str(r.color, 64, "#0a0f1f"),
      fontFamily: str(r.fontFamily, 64, "Inter"),
      fontWeight: num(r.fontWeight, 100, 900, 700),
      align: r.align === "left" || r.align === "right" ? r.align : "center",
    });
  }
  if (r.type === "shape") {
    return newShape((typeof r.shape === "string" ? r.shape : "rect") as ShapeKind, {
      x, y, width, height, rotation,
      fill: str(r.fill, 64, "#ffd84a"),
      stroke: str(r.stroke, 64, "transparent"),
      strokeWidth: num(r.strokeWidth, 0, 200, 0),
    });
  }
  if (r.type === "image") {
    const src = str(r.src, 5000000, "");
    // data URLs & http(s) images only — the sandbox has no network anyway,
    // but this also stops relative-URL images resolving against the app.
    if (!/^(https?:\/\/|data:image\/)/i.test(src)) return null;
    return newImage(src, { x, y, width, height, rotation });
  }
  if (r.type === "ui") {
    return newUi(
      (typeof r.kind === "string" ? r.kind : "card") as UiKind,
      (typeof r.uiStyle === "string" ? r.uiStyle : "cyber") as UiStyle,
      {
        x, y, width, height, rotation,
        title: str(r.title, 300, "Runtime card"),
        body: str(r.body, 2000, ""),
        items: Array.isArray(r.items)
          ? ((r.items as unknown[]).filter((i) => typeof i === "string").slice(0, 12) as string[])
          : [],
        accentColor: str(r.accentColor, 64, "#2b6cff"),
      },
    );
  }
  return null;
}

export function RuntimeAppDialog({
  app,
  open,
  onOpenChange,
}: {
  app: PluginApp;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [inserted, setInserted] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onMessage = (ev: MessageEvent) => {
      const data = ev.data as Record<string, unknown> | null;
      if (!data || typeof data !== "object" || data.source !== "diapolab-runtime") return;
      if (data.type !== "insert" || !Array.isArray(data.elements)) return;
      const els = data.elements
        .slice(0, 40)
        .map(toCanvasElement)
        .filter((e): e is AnyElement => e !== null);
      if (els.length) {
        useEditor.getState().addGroup(els);
        setInserted((n) => n + els.length);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [open]);

  const srcDoc = [
    "<!doctype html><html><head><meta charset=\"utf-8\" />",
    "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:;\" />",
    "<style>html,body{margin:0;padding:10px;font:12px/1.4 system-ui,sans-serif;color:#0f172a;background:#fff}</style>",
    "</head><body>",
    app.config?.html ?? "",
    BRIDGE,
    "</body></html>",
  ].join("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl border-slate-200 bg-white p-0">
        <DialogHeader className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-800">
            <span className="grid size-7 place-items-center rounded-lg bg-indigo-600 text-white">
              <Code2 className="size-3.5" />
            </span>
            {app.name}
            <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-px text-[8px] font-bold uppercase tracking-wide text-slate-500">
              Runtime · sandboxed
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="p-3">
          <iframe
            title={app.name}
            sandbox="allow-scripts"
            srcDoc={srcDoc}
            className="h-[480px] w-full rounded-xl border border-slate-200 bg-white"
          />
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
            Runs in a sandboxed iframe — scripts only, opaque origin, network blocked by CSP.
            The app can insert elements onto the current slide with{" "}
            <code className="rounded bg-slate-100 px-1 font-mono text-[10px] text-blue-600">
              diapolab.insert([&#123; ... &#125;])
            </code>
            .
          </p>
          {inserted > 0 && (
            <p className="mt-1 text-[11px] font-medium text-emerald-600">
              ✓ {inserted} element{inserted > 1 ? "s" : ""} inserted on the current slide.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
