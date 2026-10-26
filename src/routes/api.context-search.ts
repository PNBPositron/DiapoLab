import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/context-search")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => null)) as { query?: unknown } | null;
        const query = typeof body?.query === "string" ? body.query.trim().slice(0, 500) : "";
        if (!query) return Response.json({ error: "Enter a search query." }, { status: 400 });
        const apiKey = process.env.API_KEY_2?.trim();
        if (!apiKey) return Response.json({ error: "Context search is not configured." }, { status: 503 });
        const response = await fetch("https://api.context.dev/v1/web/search", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ query, numResults: 8 }),
        });
        const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
        if (!response.ok) return Response.json({ error: typeof payload?.error === "string" ? payload.error : "Search failed." }, { status: 502 });
        return Response.json(payload ?? { results: [] });
      },
    },
  },
});
