import { createFileRoute } from "@tanstack/react-router";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const SYSTEM_EDIT =
  "You are a presentation editor. Analyze the slide and return JSON only with keys text and edits. edits must be an array of safe operations using only {type:'update', id:string, patch:object}, {type:'delete', id:string}, or {type:'addText', text:string, x:number, y:number, width:number, height:number}. Only edit when explicitly requested. Preserve existing element IDs and never invent IDs.";
const SYSTEM_ANALYSIS =
  "You are a concise presentation coach. Reply in plain language with one short diagnosis and up to three practical suggestions. Keep it under 80 words. No markdown tables.";

type SlideLike = { id?: string; bgColor?: string; elements?: Array<Record<string, unknown>> };

function describeSlide(slide: unknown, limit = 4200) {
  const value = (slide && typeof slide === "object" ? slide : {}) as SlideLike;
  const elements = Array.isArray(value.elements) ? value.elements : [];
  const lines = elements.slice(0, 40).map((element, index) => {
    const item = element as Record<string, unknown>;
    const id = typeof item.id === "string" ? item.id : `element-${index}`;
    const type = typeof item.type === "string" ? item.type : "unknown";
    const text = typeof item.text === "string" ? ` text="${item.text.slice(0, 180)}"` : "";
    const geometry = ["x", "y", "width", "height"]
      .map((key) => `${key}=${item[key] ?? 0}`)
      .join(" ");
    const style =
      type === "text"
        ? ` fontSize=${item.fontSize ?? ""} color=${item.color ?? ""}`
        : ` fill=${item.fill ?? ""}`;
    return `${index + 1}. id=${id} type=${type} ${geometry}${style}${text}`;
  });
  return `background=${value.bgColor ?? "#ffffff"}; elements=${elements.length}\n${lines.join("\n")}`.slice(
    0,
    limit,
  );
}

function describeSlideshow(slideshow: unknown) {
  if (!Array.isArray(slideshow)) return describeSlide(slideshow);
  return slideshow
    .slice(0, 12)
    .map((page, index) => `Slide ${index + 1}:\n${describeSlide(page, 1800)}`)
    .join("\n\n")
    .slice(0, 9000);
}

export const Route = createFileRoute("/api/slide-analysis")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => null)) as {
          page?: unknown;
          slideshow?: unknown;
          canEdit?: boolean;
          question?: string;
        } | null;
        if (!body?.page) return Response.json({ error: "A slide is required." }, { status: 400 });
        const question =
          body.question?.trim() || "Analyze this slide and suggest concrete improvements.";
        const wantsEdit =
          /\b(edit|change|update|move|resize|delete|remove|add|rewrite|modify)\b/i.test(question);

        const apiKey = process.env.GROQ_KEY_2?.trim() || process.env.GROQ_KEY?.trim();
        if (!apiKey)
          return Response.json(
            { error: "The slide assistant is not configured." },
            { status: 503 },
          );

        const messages: ChatMessage[] = [
          { role: "system", content: wantsEdit ? SYSTEM_EDIT : SYSTEM_ANALYSIS },
          {
            role: "user",
            content: `${question}\n\nEdit permission granted: ${body.canEdit === true}\n\nActive slide outline (use element ids for edits):\n${describeSlide(body.page)}\n\nPresentation outline:\n${describeSlideshow(body.slideshow ?? [body.page])}`,
          },
        ];

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: "qwen/qwen3.8-27b",
            temperature: 0.35,
            max_completion_tokens: 900,
            response_format: wantsEdit ? { type: "json_object" } : undefined,
            messages,
          }),
        });

        const payload = (await response.json().catch(() => null)) as {
          choices?: Array<{ message?: { content?: string } }>;
          error?: { message?: string };
        } | null;
        if (!response.ok)
          return Response.json(
            { error: payload?.error?.message || "The slide assistant could not respond." },
            { status: 502 },
          );
        const rawText = payload?.choices?.[0]?.message?.content;
        if (!rawText)
          return Response.json(
            { error: "The slide assistant returned an empty response." },
            { status: 502 },
          );

        if (wantsEdit) {
          try {
            const result = JSON.parse(rawText) as { text?: string; edits?: unknown[] };
            return Response.json({
              text: result.text || "I prepared the requested slide changes.",
              edits: Array.isArray(result.edits) ? result.edits : [],
            });
          } catch {
            return Response.json({ text: rawText, edits: [] });
          }
        }
        return Response.json({ text: rawText });
      },
    },
  },
});
