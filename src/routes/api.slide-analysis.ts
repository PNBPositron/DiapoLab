import { createFileRoute } from "@tanstack/react-router";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type AssistantResult = { text: string; edits?: unknown[] };

const SYSTEM_EDIT =
  "You are a presentation editor. Analyze the slide and return JSON only with keys text and edits. edits must be an array of safe operations using only {type:'update', id:string, patch:object}, {type:'delete', id:string}, or {type:'addText', text:string, x:number, y:number, width:number, height:number}. Only edit when explicitly requested. Preserve existing element IDs and never invent IDs.";
const SYSTEM_ANALYSIS =
  "You are a concise, practical presentation art director. Analyze the supplied slide JSON and give a short diagnosis followed by 3-5 actionable suggestions.";

async function callGemini(apiKey: string, messages: ChatMessage[], wantsEdit: boolean): Promise<AssistantResult | null> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        generationConfig: { temperature: 0.35, maxOutputTokens: 900, responseMimeType: wantsEdit ? "application/json" : "text/plain" },
        systemInstruction: { parts: [{ text: wantsEdit ? SYSTEM_EDIT : SYSTEM_ANALYSIS }] },
        contents: messages
          .filter((m) => m.role !== "system")
          .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
      }),
    },
  );
  if (!response.ok) return null;
  const payload = (await response.json().catch(() => null)) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  } | null;
  const rawText = payload?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("\n");
  if (!rawText) return null;
  return { text: rawText, edits: wantsEdit ? extractEdits(rawText) : undefined };
}

async function callGroq(apiKey: string, messages: ChatMessage[], wantsEdit: boolean): Promise<AssistantResult | null> {
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
  if (!response.ok) return null;
  const payload = (await response.json().catch(() => null)) as {
    choices?: Array<{ message?: { content?: string } }>;
  } | null;
  const rawText = payload?.choices?.[0]?.message?.content;
  if (!rawText) return null;
  return { text: rawText, edits: wantsEdit ? extractEdits(rawText) : undefined };
}

function extractEdits(rawText: string): unknown[] {
  try {
    const result = JSON.parse(rawText) as { text?: string; edits?: unknown[] };
    return Array.isArray(result.edits) ? result.edits : [];
  } catch {
    return [];
  }
}

export const Route = createFileRoute("/api/slide-analysis")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => null)) as { page?: unknown; slideshow?: unknown; canEdit?: boolean; question?: string } | null;
        if (!body?.page) return Response.json({ error: "A slide is required." }, { status: 400 });
        const question = body.question?.trim() || "Analyze this slide and suggest concrete improvements.";
        const wantsEdit = /\b(edit|change|update|move|resize|delete|remove|add|rewrite|modify)\b/i.test(question);
        const messages: ChatMessage[] = [
          { role: "system", content: wantsEdit ? SYSTEM_EDIT : SYSTEM_ANALYSIS },
          {
            role: "user",
            content: `${question}\n\nEdit permission granted: ${body.canEdit === true}\n\nActive slide JSON:\n\n${JSON.stringify(body.page)}\n\nFull slideshow JSON:\n${JSON.stringify(body.slideshow ?? [body.page])}`,
          },
        ];

        // Cascade: Gemini en primaire, Groq en fallback.
        const geminiKey = process.env.GEMINI_KEY;
        const groqKey = process.env.GROQ_KEY;
        const attempts: Array<() => Promise<AssistantResult | null>> = [];
        if (geminiKey) attempts.push(() => callGemini(geminiKey, messages, wantsEdit));
        if (groqKey) attempts.push(() => callGroq(groqKey, messages, wantsEdit));
        if (attempts.length === 0)
          return Response.json({ error: "The slide assistant is not configured." }, { status: 503 });

        let rawText: string | null = null;
        for (const attempt of attempts) {
          const result = await attempt();
          if (result?.text) {
            rawText = result.text;
            if (wantsEdit && result.edits) {
              const parsed = JSON.parse(rawText) as { text?: string };
              return Response.json({
                text: parsed.text || "I prepared the requested slide changes.",
                edits: result.edits,
              });
            }
            break;
          }
        }
        if (!rawText) return Response.json({ error: "The slide assistant could not respond." }, { status: 502 });

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
