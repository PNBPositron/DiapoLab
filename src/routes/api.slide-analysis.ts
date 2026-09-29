import { createFileRoute } from "@tanstack/react-router";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const SYSTEM_EDIT =
  "You are a presentation editor. Analyze the slide and return JSON only with keys text and edits. edits must be an array of safe operations using only {type:'update', id:string, patch:object}, {type:'delete', id:string}, or {type:'addText', text:string, x:number, y:number, width:number, height:number}. Only edit when explicitly requested. Preserve existing element IDs and never invent IDs.";
const SYSTEM_ANALYSIS =
  "You are a concise, practical presentation art director. Analyze the supplied slide JSON and give a short diagnosis followed by 3-5 actionable suggestions.";

export const Route = createFileRoute("/api/slide-analysis")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => null)) as { page?: unknown; slideshow?: unknown; canEdit?: boolean; question?: string } | null;
        if (!body?.page) return Response.json({ error: "A slide is required." }, { status: 400 });
        const question = body.question?.trim() || "Analyze this slide and suggest concrete improvements.";
        const wantsEdit = /\b(edit|change|update|move|resize|delete|remove|add|rewrite|modify)\b/i.test(question);

        const apiKey = process.env.GROQ_KEY;
        if (!apiKey) return Response.json({ error: "The slide assistant is not configured." }, { status: 503 });

        const messages: ChatMessage[] = [
          { role: "system", content: wantsEdit ? SYSTEM_EDIT : SYSTEM_ANALYSIS },
          {
            role: "user",
            content: `${question}\n\nEdit permission granted: ${body.canEdit === true}\n\nActive slide JSON:\n\n${JSON.stringify(body.page)}\n\nFull slideshow JSON:\n${JSON.stringify(body.slideshow ?? [body.page])}`,
          },
        ];

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: "openai/gpt-oss-120b",
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
        if (!response.ok) return Response.json({ error: payload?.error?.message || "The slide assistant could not respond." }, { status: 502 });
        const rawText = payload?.choices?.[0]?.message?.content;
        if (!rawText) return Response.json({ error: "The slide assistant returned an empty response." }, { status: 502 });

        if (wantsEdit) {
          try {
            const result = JSON.parse(rawText) as { text?: string; edits?: unknown[] };
            return Response.json({ text: result.text || "I prepared the requested slide changes.", edits: Array.isArray(result.edits) ? result.edits : [] });
          } catch {
            return Response.json({ text: rawText, edits: [] });
          }
        }
        return Response.json({ text: rawText });
      },
    },
  },
});
