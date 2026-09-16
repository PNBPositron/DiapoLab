import { useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { generateAiTemplate, type AiStyle } from "@/lib/ai-templates.functions";
import { useEditor, type Page } from "@/store/editor";
import { PanelHeader } from "./TextPanel";

const styles: AiStyle[] = ["auto", "minimal", "editorial", "liquid_glass", "cyberpunk", "brutalist", "organic", "y2k"];

export function AiPanel() {
  const { canvasW, canvasH, loadPages, pages, currentIndex } = useEditor();
  const currentPage = pages[currentIndex];
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);
  const slideSummary = useMemo(() => `${currentPage?.elements.length ?? 0} elements · ${canvasW}×${canvasH}`, [currentPage, canvasW, canvasH]);
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

  const askAssistant = async (question = chatInput) => {
    if (!question.trim() || !currentPage) return;
    setChatBusy(true);
    setChatError(null);
    setMessages((current) => [...current, { role: "user", text: question.trim() }]);
    setChatInput("");
    try {
      const response = await fetch("/api/slide-analysis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ page: currentPage, question }) });
      const payload = await response.json() as { text?: string; error?: string };
      if (!response.ok || !payload.text) throw new Error(payload.error || "Could not analyze this slide.");
      setMessages((current) => [...current, { role: "assistant", text: payload.text! }]);
    } catch (analysisError) {
      setChatError(analysisError instanceof Error ? analysisError.message : "Could not analyze this slide.");
    } finally {
      setChatBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <PanelHeader title="AI studio" />
      <section className="brutal-border-2 border-teal/35 bg-surface/70 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-[11px] uppercase tracking-[0.15em] text-teal">Slide assistant</h3>
            <p className="font-mono text-[9px] text-teal/50">{slideSummary}</p>
          </div>
          <Sparkles className="size-4 text-teal" />
        </div>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {["Analyze this slide", "Improve hierarchy", "Make it more engaging"].map((question) => <button key={question} type="button" onClick={() => void askAssistant(question)} disabled={chatBusy} className="brutal-border bg-paper px-2 py-1 font-mono text-[9px] text-ink hover:border-teal disabled:opacity-50">{question}</button>)}
        </div>
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {messages.length === 0 && <p className="font-mono text-[10px] leading-relaxed text-teal/55">Ask for a critique, layout ideas, or a stronger visual direction for the current slide.</p>}
          {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`p-2 font-mono text-[10px] leading-relaxed ${message.role === "user" ? "ml-5 bg-teal/10 text-teal" : "mr-2 bg-paper text-ink"}`}><span className="mb-1 block font-display text-[8px] uppercase tracking-[0.12em] opacity-55">{message.role === "user" ? "You" : "Assistant"}</span>{message.text}</div>)}
        </div>
        {chatError && <p role="alert" className="mt-2 font-mono text-[10px] text-red-300">{chatError}</p>}
        <form onSubmit={(event) => { event.preventDefault(); void askAssistant(); }} className="mt-2 flex gap-2">
          <input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Ask about this slide..." className="brutal-border-2 min-w-0 flex-1 bg-paper px-2 py-2 font-mono text-[10px] text-ink outline-none placeholder:text-ink/45 focus:border-teal" />
          <button type="submit" disabled={chatBusy || !chatInput.trim()} className="brutal-border-2 brutal-press bg-teal px-3 font-display text-[9px] uppercase text-ink disabled:opacity-40">{chatBusy ? "..." : "Ask"}</button>
        </form>
      </section>
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
      <p className="font-mono text-[9px] leading-relaxed text-teal/45">AI generation uses the project&apos;s server-side configured model. Your API key never reaches the browser.</p>
    </div>
  );
}
