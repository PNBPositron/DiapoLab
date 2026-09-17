import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { generateAiTemplate, type AiStyle } from "@/lib/ai-templates.functions";
import { useEditor, type Page } from "@/store/editor";
import { PanelHeader } from "./TextPanel";

const styles: AiStyle[] = ["auto", "minimal", "editorial", "liquid_glass", "cyberpunk", "brutalist", "organic", "y2k"];

export function AiPanel() {
  const { canvasW, canvasH, loadPages } = useEditor();
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<AiStyle>("auto");
  const [slideCount, setSlideCount] = useState(3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (!prompt.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const deck = await generateAiTemplate({ data: { prompt, style, slideCount, width: canvasW, height: canvasH } });
      const pages = deck.pages.map((page, pageIndex) => ({
        id: `ai-page-${Date.now()}-${pageIndex}`,
        bgColor: page.bg,
        duration: 3,
        elements: page.elements.map((element, elementIndex) => ({
          ...element,
          id: `ai-element-${Date.now()}-${pageIndex}-${elementIndex}`,
        })) as Page["elements"],
      }));
      loadPages(pages);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Could not generate the template");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <PanelHeader title="Gemini template generator" />
      <p className="font-mono text-[10px] leading-relaxed text-teal/60">Describe the presentation you want. The generator creates a complete editable deck.</p>
      <label className="flex flex-col gap-1">
        <span className="font-mono text-[10px] uppercase tracking-wider text-teal/70">Brief</span>
        <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={5} placeholder="A launch deck for a calm productivity app..." className="brutal-border-2 resize-none bg-surface p-2 font-mono text-xs text-teal outline-none placeholder:text-teal/30 focus:border-teal" />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-teal/70">Style</span>
          <select value={style} onChange={(event) => setStyle(event.target.value as AiStyle)} className="brutal-border-2 bg-surface px-2 py-2 font-mono text-[10px] uppercase text-teal outline-none">
            {styles.map((value) => <option key={value} value={value}>{value.replace("_", " ")}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-teal/70">Slides</span>
          <input type="number" min={1} max={10} value={slideCount} onChange={(event) => setSlideCount(Math.max(1, Math.min(10, Number(event.target.value) || 1)))} className="brutal-border-2 bg-surface px-2 py-2 font-mono text-xs text-teal outline-none" />
        </label>
      </div>
      {error && <p role="alert" className="border border-red-400/30 bg-red-400/10 p-2 font-mono text-[10px] text-red-300">{error}</p>}
      <button type="button" onClick={generate} disabled={busy || !prompt.trim()} className="brutal-border-2 brutal-press flex items-center justify-center gap-2 bg-teal px-3 py-3 font-display text-[10px] uppercase tracking-[0.14em] text-ink disabled:cursor-not-allowed disabled:opacity-40">
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        {busy ? "Generating..." : "Generate editable deck"}
      </button>
      <p className="font-mono text-[9px] leading-relaxed text-teal/45">Gemini generates the deck on the server. Your API key never reaches the browser.</p>
    </div>
  );
}
