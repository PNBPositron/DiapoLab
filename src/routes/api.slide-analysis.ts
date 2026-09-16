import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/slide-analysis")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => null) as { page?: unknown; question?: string } | null;
        if (!body?.page) return Response.json({ error: "A slide is required." }, { status: 400 });
        const question = body.question?.trim() || "Analyze this slide and suggest concrete improvements.";
        const apiKey = process.env.COHERE_API_KEY;
        if (!apiKey) return Response.json({ error: "The slide assistant is not configured." }, { status: 503 });
        const response = await fetch("https://api.cohere.com/v2/chat", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "command-r-08-2024",
            temperature: 0.35,
            max_tokens: 700,
            messages: [
              { role: "system", content: "You are a concise, practical presentation art director. Analyze the supplied slide JSON. Give specific suggestions about hierarchy, copy, layout, color, accessibility, and visual interest. Do not invent elements that are not present. Format your response with a short diagnosis followed by 3-5 actionable suggestions." },
              { role: "user", content: `${question}\n\nSlide JSON:\n${JSON.stringify(body.page)}` },
            ],
          }),
        });
        const payload = await response.json().catch(() => null) as { message?: { content?: Array<{ text?: string }> }; text?: string; error?: string } | null;
        if (!response.ok) return Response.json({ error: payload?.error || "The slide assistant could not respond." }, { status: 502 });
        const text = payload?.message?.content?.map((part) => part.text || "").join("\n") || payload?.text;
        if (!text) return Response.json({ error: "The slide assistant returned an empty response." }, { status: 502 });
        return Response.json({ text });
      },
    },
  },
});
