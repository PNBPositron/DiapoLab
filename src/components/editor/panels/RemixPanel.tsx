import { useEffect, useState } from "react";
import { Loader2, Sparkles, WandSparkles, ArrowUpRight } from "lucide-react";
import { generateAiTemplate, type AiStyle } from "@/lib/ai-templates.functions";
import { listPublicTemplates, type PublicTemplate } from "@/lib/designs";
import { useEditor, type Page } from "@/store/editor";
import { PanelHeader } from "./TextPanel";

export function RemixPanel() {
  const { canvasW, canvasH, loadPages } = useEditor();
  const [templates, setTemplates] = useState<PublicTemplate[]>([]);
  const [selected, setSelected] = useState<PublicTemplate | null>(null);
  const [prompt, setPrompt] = useState("Make this deck feel more distinctive, polished, and presentation-ready");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    listPublicTemplates().then(setTemplates).catch(() => setTemplates([]));
  }, []);

  const remix = async () => {
    if (!selected || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const deck = await generateAiTemplate({
        data: {
          prompt: `${prompt}. Remix the public template “${selected.name}” while keeping its core story and visual direction. Use the supplied template JSON as the source deck: preserve useful content and structure, then apply the requested changes.`,
          style: "auto" as AiStyle,
          slideCount: Math.max(1, selected.pages.length),
          width: canvasW,
          height: canvasH,
          template: selected.pages,
        },
      });
      const stamp = Date.now();
      loadPages(deck.pages.map((page, pageIndex) => ({
        id: `remix-page-${stamp}-${pageIndex}`,
        bgColor: page.bg,
        duration: 3,
        elements: page.elements.map((element, elementIndex) => ({
          ...element,
          id: `remix-element-${stamp}-${pageIndex}-${elementIndex}`,
        })) as Page["elements"],
      })));
      setMessage("Remix applied to your canvas.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Remix failed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <PanelHeader kicker="Remix" title="Remix with AI" description="Pick a public template, describe a direction, get an editable remix." icon={WandSparkles} />
      <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-sky-50 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-600/20"><WandSparkles className="size-4" /></div>
          <div><p className="text-xs font-bold text-slate-900">Start from a public template</p><p className="mt-1 text-[10px] leading-relaxed text-slate-500">Choose a community deck, describe the direction, and get an editable remix.</p></div>
        </div>
        <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} className="mt-4 min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-[11px] leading-relaxed text-slate-700 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10" aria-label="Describe your remix" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Public templates</p><span className="text-[10px] text-slate-400">{templates.length} available</span></div>
        {templates.slice(0, 6).map((template) => (
          <button key={template.id} type="button" onClick={() => setSelected(template)} className={`group flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all ${selected?.id === template.id ? "border-violet-500 bg-violet-50 shadow-sm" : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md"}`}>
            <span className="min-w-0"><span className="block truncate text-xs font-semibold text-slate-800">{template.name}</span><span className="mt-1 block text-[10px] text-slate-400">{template.pages.length} slides · public</span></span><ArrowUpRight className="size-3.5 shrink-0 text-slate-300 transition group-hover:text-violet-500" />
          </button>
        ))}
        {templates.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-[11px] text-slate-400">No public templates yet.</p>}
      </div>
      <button type="button" disabled={!selected || busy} onClick={() => void remix()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40">{busy ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}{busy ? "Remixing canvas…" : selected ? `Remix “${selected.name}”` : "Select a template to remix"}</button>
      {message && <p role="status" className="rounded-lg bg-slate-100 px-3 py-2 text-[10px] text-slate-600">{message}</p>}
    </div>
  );
}
