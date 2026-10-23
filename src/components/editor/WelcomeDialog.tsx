import { useEffect, useState } from "react";
import { Loader2, LayoutGrid, Type, Shapes, Camera, Image, Layers, Palette, Puzzle, Check, MonitorPlay } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useEditor, CANVAS_PRESETS, type Page } from "@/store/editor";
import { listPublicTemplates, type PublicTemplate } from "@/lib/designs";
import { SlideThumbnail } from "./SlideThumbnail";
import { ensureFontsForPages } from "@/lib/fontLoader";

const STORAGE_KEY = "diapolab.welcome.v1";

type Step = 0 | 1 | 2;

const PANEL_OPTIONS = [
  { id: "home", label: "Templates", icon: LayoutGrid, hint: "Browse community decks" },
  { id: "text", label: "Text", icon: Type, hint: "Add titles & paragraphs" },
  { id: "elements", label: "Elements", icon: Shapes, hint: "Shapes & icons" },
  { id: "unsplash", label: "Unsplash", icon: Camera, hint: "Free photos" },
  { id: "illustrations", label: "Illustrations", icon: Image, hint: "Vector art" },
  { id: "components", label: "Presets", icon: Layers, hint: "Ready-made widgets" },
  { id: "design", label: "Design", icon: Palette, hint: "Colors & master style" },
  { id: "plugins", label: "Plugins", icon: Puzzle, hint: "Import widget packs" }
] as const;

export function WelcomeDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>(0);

  // Step 1 — format
  const [format, setFormat] = useState<{ name: string; w: number; h: number }>(CANVAS_PRESETS.find((preset) => preset.name === "Slide 16:9") as { name: string; w: number; h: number });

  // Step 2 — template
  const [useTemplate, setUseTemplate] = useState(false);
  const [templates, setTemplates] = useState<PublicTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [pickedTemplate, setPickedTemplate] = useState<PublicTemplate | null>(null);

  // Step 3 — panel
  const [panel, setPanel] = useState<string>("home");

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      /* localStorage unavailable — still show */
    }
    const t = setTimeout(() => setOpen(true), 350);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!open || !useTemplate || templates.length > 0 || templatesLoading) return;
    setTemplatesLoading(true);
    listPublicTemplates()
      .then((tpls) => {
        setTemplates(tpls);
        tpls.forEach((t) => ensureFontsForPages(t.pages as never));
      })
      .catch(() => setTemplatesError("Couldn't load templates — you can start from a blank canvas."))
      .finally(() => setTemplatesLoading(false));
  }, [open, useTemplate, templates.length, templatesLoading]);

  const finish = () => {
    const st = useEditor.getState();
    if (useTemplate && pickedTemplate) {
      st.loadPages(pickedTemplate.pages as Page[]);
      st.setCanvasSize(pickedTemplate.canvas_w, pickedTemplate.canvas_h);
    } else {
      st.setCanvasSize(format.w, format.h);
    }
    st.setTool(panel as never);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  const skip = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  const nextDisabled =
    (step === 1 && useTemplate && templatesLoading) ||
    (step === 1 && useTemplate && !!templates.length && !pickedTemplate);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) skip(); }}>
      <DialogContent className="max-w-xl border-slate-200 bg-white p-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 rounded-t-2xl border-b border-slate-200 bg-gradient-to-br from-blue-50 to-white px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-slate-900 text-white shadow-md">
              <MonitorPlay className="size-5" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">Welcome to DiapoLab</p>
              <h2 className="text-base font-semibold text-slate-900">
                {step === 0 ? "What are you making today?" : step === 1 ? "Start from a template?" : "Where do you want to begin?"}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-5 bg-blue-600" : i < step ? "w-1.5 bg-blue-300" : "w-1.5 bg-slate-200"}`} />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="min-h-[260px] px-6 py-5">
          {step === 0 && (
            <>
              <p className="mb-3 text-xs text-slate-500">Pick a format for your canvas — you can resize anytime.</p>
              <div className="grid grid-cols-3 gap-2.5">
                {CANVAS_PRESETS.map((p) => {
                  const active = format.name === p.name;
                  return (
                    <button
                      key={p.name}
                      onClick={() => setFormat({ name: p.name, w: p.w, h: p.h })}
                      className={`relative flex flex-col items-center gap-2 rounded-xl border px-2 py-3.5 transition-all active:scale-[0.97] ${
                        active
                          ? "border-blue-600 bg-blue-50/70 shadow-[0_8px_20px_rgba(37,99,235,0.15)]"
                          : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40"
                      }`}
                    >
                      {active && (
                        <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-blue-600 text-white">
                          <Check className="size-2.5" strokeWidth={3} />
                        </span>
                      )}
                      <span
                        className={`block rounded-[3px] border-2 ${active ? "border-blue-400 bg-blue-100" : "border-slate-300 bg-slate-100"}`}
                        style={{ width: p.w >= p.h ? 34 : Math.round(34 * (p.w / p.h)), height: p.w >= p.h ? Math.round(26 * (p.h / p.w)) || 16 : 26 }}
                      />
                      <span className="text-[11px] font-semibold text-slate-800">{p.name}</span>
                      <span className="font-mono text-[9px] text-slate-400">{p.w}×{p.h}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => { setUseTemplate(false); setPickedTemplate(null); }}
                  className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-left transition ${
                    !useTemplate ? "border-blue-600 bg-blue-50/70 shadow-[0_8px_20px_rgba(37,99,235,0.15)]" : "border-slate-200 bg-white hover:border-blue-300"
                  }`}
                >
                  <span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg ${!useTemplate ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                    <LayoutGrid className="size-3.5" />
                  </span>
                  <span>
                    <span className="block text-xs font-semibold text-slate-800">Start from a blank canvas</span>
                    <span className="mt-0.5 block text-[10px] text-slate-400">Build it your way, from scratch.</span>
                  </span>
                </button>
                <button
                  onClick={() => setUseTemplate(true)}
                  className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-left transition ${
                    useTemplate ? "border-blue-600 bg-blue-50/70 shadow-[0_8px_20px_rgba(37,99,235,0.15)]" : "border-slate-200 bg-white hover:border-blue-300"
                  }`}
                >
                  <span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg ${useTemplate ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                    <Layers className="size-3.5" />
                  </span>
                  <span>
                    <span className="block text-xs font-semibold text-slate-800">Use a public template</span>
                    <span className="mt-0.5 block text-[10px] text-slate-400">Community & built-in decks.</span>
                  </span>
                </button>
              </div>

              {useTemplate && (
                <div className="mt-3.5">
                  {templatesLoading ? (
                    <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 py-10 text-[11px] text-slate-400">
                      <Loader2 className="size-3.5 animate-spin text-blue-500" /> Loading templates…
                    </div>
                  ) : templatesError ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-[11px] text-rose-600">{templatesError}</div>
                  ) : templates.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 px-3.5 py-8 text-center text-[11px] text-slate-400">
                      No public templates yet — start blank for now.
                    </div>
                  ) : (
                    <div className="grid max-h-[240px] grid-cols-3 gap-2.5 overflow-y-auto pr-1">
                      {templates.slice(0, 12).map((t) => {
                        const active = pickedTemplate?.id === t.id;
                        return (
                          <button
                            key={t.id}
                            onClick={() => setPickedTemplate(t)}
                            className={`group relative overflow-hidden rounded-xl border text-left transition-all ${
                              active ? "border-blue-600 ring-2 ring-blue-500/25" : "border-slate-200 hover:border-blue-300"
                            }`}
                          >
                            {t.pages?.[0] ? (
                              <SlideThumbnail page={t.pages[0] as Page} canvasW={t.canvas_w} canvasH={t.canvas_h} className="aspect-video w-full" />
                            ) : (
                              <div className="aspect-video w-full bg-slate-100" />
                            )}
                            <span className="block truncate border-t border-slate-100 bg-white px-2 py-1.5 text-[10px] font-semibold text-slate-700" title={t.name}>
                              {t.name}
                            </span>
                            {active && (
                              <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-blue-600 text-white shadow">
                                <Check className="size-2.5" strokeWidth={3} />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <p className="mb-3 text-xs text-slate-500">Which panel should open first in the sidebar?</p>
              <div className="grid grid-cols-2 gap-2.5">
                {PANEL_OPTIONS.map(({ id, label, icon: Icon, hint }) => {
                  const active = panel === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setPanel(id)}
                      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition ${
                        active ? "border-blue-600 bg-blue-50/70 shadow-[0_8px_20px_rgba(37,99,235,0.15)]" : "border-slate-200 bg-white hover:border-blue-300"
                      }`}
                    >
                      <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"}`}>
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold text-slate-800">{label}</span>
                        <span className="block truncate text-[10px] text-slate-400">{hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 rounded-b-2xl border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button onClick={skip} className="text-[11px] font-medium text-slate-400 transition hover:text-slate-600">
            Skip
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => (s - 1) as Step)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 active:scale-[0.97]"
              >
                Back
              </button>
            )}
            {step < 2 ? (
              <button
                onClick={() => setStep((s) => (s + 1) as Step)}
                disabled={nextDisabled}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.25)] transition-all hover:bg-blue-700 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={finish}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.25)] transition-all hover:bg-blue-700 active:scale-[0.97]"
              >
                Start creating →
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
