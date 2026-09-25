import { useState } from "react";
import {
  Loader2,
  Sparkles,
  Wand2,
  Layers,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  ShieldCheck,
  LayoutTemplate,
  RefreshCw,
} from "lucide-react";
import { generateAiTemplate, type AiStyle } from "@/lib/ai-templates.functions";
import { useEditor, type Page } from "@/store/editor";

const STYLES: Array<{ id: AiStyle; label: string; accent: string }> = [
  { id: "auto", label: "Auto Smart", accent: "from-sky-500 to-indigo-500" },
  { id: "minimal", label: "Minimal", accent: "from-slate-400 to-slate-600" },
  { id: "editorial", label: "Editorial", accent: "from-amber-600 to-stone-800" },
  { id: "liquid_glass", label: "Liquid Glass", accent: "from-cyan-400 to-blue-600" },
  { id: "cyberpunk", label: "Cyberpunk", accent: "from-pink-500 to-violet-600" },
  { id: "brutalist", label: "Brutalist", accent: "from-yellow-400 to-neutral-900" },
  { id: "organic", label: "Organic", accent: "from-emerald-400 to-teal-700" },
  { id: "y2k", label: "Y2K Chrome", accent: "from-fuchsia-400 to-indigo-400" },
];

const PROMPT_SUGGESTIONS = [
  "Seed pitch deck for an AI automation startup",
  "Quarterly business review for SaaS metrics",
  "Design portfolio showcase with minimal case studies",
  "Launch presentation for a minimalist mobile app",
];

export function AiPanel() {
  const { canvasW, canvasH, loadPages, pages, currentIndex } = useEditor();
  const [activeTab, setActiveTab] = useState<"generate" | "copilot">("generate");
  const [redesigning, setRedesigning] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<AiStyle>("auto");
  const [slideCount, setSlideCount] = useState(3);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ type: "error" | "success"; message: string } | null>(null);

  const activePage = pages[currentIndex];

  const redesignSlide = async () => {
    if (!activePage || redesigning) return;
    setRedesigning(true);
    setStatus(null);
    try {
      const response = await fetch("/api/slide-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page: activePage,
          slideshow: pages,
          canEdit: true,
          question:
            "Redesign this slide to improve hierarchy, spacing, typography, and visual impact. Return safe edit operations.",
        }),
      });

      const payload = (await response.json()) as {
        text?: string;
        error?: string;
        edits?: Array<{
          type: string;
          id?: string;
          patch?: Record<string, unknown>;
          text?: string;
          x?: number;
          y?: number;
          width?: number;
          height?: number;
        }>;
      };

      if (!response.ok || !payload.text) {
        throw new Error(payload.error || "Could not redesign the slide");
      }

      if (payload.edits?.length) {
        const nextPages = pages.map((slide, index) =>
          index !== currentIndex
            ? slide
            : {
                ...slide,
                elements: slide.elements.flatMap((element) => {
                  const matching = payload.edits!.filter((edit) => edit.id === element.id);
                  if (matching.some((edit) => edit.type === "delete")) return [];
                  const update = matching.find((edit) => edit.type === "update");
                  return update?.patch ? [{ ...element, ...update.patch }] : [element];
                }),
              }
        );
        loadPages(nextPages);
        setStatus({
          type: "success",
          message: `Applied ${payload.edits.length} intelligent layout enhancements.`,
        });
      } else {
        setStatus({ type: "success", message: payload.text });
      }
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to redesign slide",
      });
    } finally {
      setRedesigning(false);
    }
  };

  const generate = async () => {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    setStatus(null);
    try {
      const deck = await generateAiTemplate({
        data: { prompt, style, slideCount, width: canvasW, height: canvasH },
      });
      const generatedPages = deck.pages.map((page, pageIndex) => ({
        id: `ai-page-${Date.now()}-${pageIndex}`,
        bgColor: page.bg,
        duration: 3,
        elements: page.elements.map((element, elementIndex) => ({
          ...element,
          id: `ai-element-${Date.now()}-${pageIndex}-${elementIndex}`,
        })) as Page["elements"],
      }));

      loadPages(generatedPages);
      setStatus({
        type: "success",
        message: `Generated ${generatedPages.length} custom slides successfully!`,
      });
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Could not generate the template",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 text-xs">
      {/* Header with Title and Mode Switcher */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-linear-to-tr from-sky-500 to-indigo-600 text-white shadow-xs">
              <Sparkles className="size-4" />
            </div>
            <div>
              <h2 className="text-xs font-semibold tracking-wide text-slate-900 uppercase">
                AI Studio
              </h2>
              <p className="text-[10px] text-slate-400">Powered by Gemini Vision & Layout</p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 rounded-xl border border-slate-200/80 bg-slate-100/80 p-0.5 shadow-2xs">
          <button
            type="button"
            onClick={() => {
              setActiveTab("generate");
              setStatus(null);
            }}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition ${
              activeTab === "generate"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <LayoutTemplate className="size-3.5" />
            Full Deck
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("copilot");
              setStatus(null);
            }}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition ${
              activeTab === "copilot"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Wand2 className="size-3.5" />
            Slide Copilot
          </button>
        </div>
      </div>

      {/* Status Banner */}
      {status && (
        <div
          role="alert"
          className={`flex items-start gap-2.5 rounded-xl border p-2.5 transition-all ${
            status.type === "error"
              ? "border-rose-200 bg-rose-50/80 text-rose-700"
              : "border-emerald-200 bg-emerald-50/80 text-emerald-800"
          }`}
        >
          {status.type === "error" ? (
            <AlertCircle className="size-4 shrink-0 text-rose-500" />
          ) : (
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
          )}
          <span className="text-[11px] leading-tight">{status.message}</span>
        </div>
      )}

      {/* TAB 1: FULL DECK GENERATOR */}
      {activeTab === "generate" && (
        <div className="space-y-4">
          {/* Prompt Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-slate-600">Prompt / Topic</label>
              <span className="text-[10px] text-slate-400">{prompt.length}/500</span>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="e.g. A high-converting pitch deck for an autonomous drone delivery platform, focusing on economics and safety..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />

            {/* Quick Inspiration Pills */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
                <Lightbulb className="size-3 text-amber-500" />
                <span>Try an example:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PROMPT_SUGGESTIONS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPrompt(item)}
                    className="rounded-lg border border-slate-200/80 bg-slate-50/70 px-2 py-1 text-left text-[10px] text-slate-600 transition hover:border-slate-300 hover:bg-white"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Style Selector */}
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-slate-600">Visual Aesthetic</label>
            <div className="grid grid-cols-2 gap-1.5">
              {STYLES.map((s) => {
                const isSelected = style === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStyle(s.id)}
                    className={`flex items-center gap-2 rounded-xl border p-2 text-left transition ${
                      isSelected
                        ? "border-sky-500 bg-sky-50/50 shadow-2xs ring-2 ring-sky-500/20"
                        : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className={`size-3 shrink-0 rounded-full bg-linear-to-tr ${s.accent}`}
                    />
                    <span
                      className={`truncate text-[11px] font-medium ${
                        isSelected ? "text-sky-900" : "text-slate-700"
                      }`}
                    >
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slide Count Control */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-3">
            <div>
              <span className="block text-xs font-medium text-slate-800">Slide Count</span>
              <span className="block text-[10px] text-slate-400">Total slides to generate</span>
            </div>
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 px-1 py-0.5">
              <button
                type="button"
                onClick={() => setSlideCount((prev) => Math.max(1, prev - 1))}
                className="grid size-7 place-items-center rounded-md text-slate-500 hover:bg-white hover:text-slate-800"
              >
                <Minus className="size-3.5" />
              </button>
              <span className="w-8 text-center font-mono text-xs font-semibold text-slate-800">
                {slideCount}
              </span>
              <button
                type="button"
                onClick={() => setSlideCount((prev) => Math.min(10, prev + 1))}
                className="grid size-7 place-items-center rounded-md text-slate-500 hover:bg-white hover:text-slate-800"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Action CTA */}
          <button
            type="button"
            onClick={generate}
            disabled={busy || !prompt.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-sky-600 via-indigo-600 to-sky-600 bg-[length:200%_auto] py-2.5 text-xs font-semibold text-white shadow-md shadow-sky-500/20 transition-all hover:bg-right hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Crafting deck...</span>
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                <span>Generate Presentation</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* TAB 2: SLIDE COPILOT / REDESIGN */}
      {activeTab === "copilot" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-slate-800 font-medium">
              <Layers className="size-4 text-sky-600" />
              <span>Current Slide {currentIndex + 1}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              The AI analyzes visual weight, contrast, typographical scale, and alignment, then
              re-organizes elements without overwriting your copy.
            </p>
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-medium text-slate-600">Enhancements included:</span>
            <ul className="space-y-1.5 text-[11px] text-slate-500">
              <li className="flex items-center gap-2">
                <div className="size-1.5 rounded-full bg-sky-500" />
                <span>Optimizes whitespace and spatial distribution</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="size-1.5 rounded-full bg-sky-500" />
                <span>Establishes clear heading and body hierarchy</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="size-1.5 rounded-full bg-sky-500" />
                <span>Harmonizes color contrast and element accents</span>
              </li>
            </ul>
          </div>

          <button
            type="button"
            onClick={redesignSlide}
            disabled={redesigning || busy || !activePage}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-800 shadow-2xs transition hover:bg-slate-50 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {redesigning ? (
              <>
                <Loader2 className="size-4 animate-spin text-sky-600" />
                <span>Analyzing and adjusting layout...</span>
              </>
            ) : (
              <>
                <RefreshCw className="size-4 text-sky-600" />
                <span>Redesign Current Slide</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Security & Privacy Footer */}
      <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
        <ShieldCheck className="size-3.5 text-slate-400" />
        <span>Processed via secure edge endpoints. Zero data persistence.</span>
      </div>
    </div>
  );
}
