import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/slide-analysis")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => null) as { page?: unknown; question?: string } | null;
        if (!body?.page) return Response.json({ error: "A slide is required." }, { status: 400 });
        const question = body.question?.trim() || "Analyze this slide and suggest concrete improvements.";
        const apiKey = process.env.GEMINI_KEY;
        if (!apiKey) return Response.json({ error: "The slide assistant is not configured." }, { status: 503 });
        const wantsEdit = /\b(edit|change|update|move|resize|delete|remove|add|rewrite|modify)\b/i.test(question);
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            generationConfig: { temperature: 0.35, maxOutputTokens: 900, responseMimeType: wantsEdit ? "application/json" : "text/plain" },
            systemInstruction: { parts: [{ text: wantsEdit ? "You are a presentation editor. Analyze the slide and return JSON only with keys text and edits. edits must be an array of safe operations using only {type:'update', id:string, patch:object}, {type:'delete', id:string}, or {type:'addText', text:string, x:number, y:number, width:number, height:number}. Only edit when explicitly requested. Preserve existing element IDs and never invent IDs." : "You are a concise, practical presentation art director. Analyze the supplied slide JSON and give a short diagnosis followed by 3-5 actionable suggestions." }] },
            contents: [{ role: "user", parts: [{ text: `${question}\n\nSlide JSON:\n${JSON.stringify(body.page)}` }] }],
          }),
        });
        const payload = await response.json().catch(() => null) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; error?: { message?: string } } | null;
        if (!response.ok) return Response.json({ error: payload?.error?.message || "The slide assistant could not respond." }, { status: 502 });
        const rawText = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n");
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
