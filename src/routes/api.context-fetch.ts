import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/context-fetch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => null)) as { url?: unknown } | null;
        const raw = typeof body?.url === "string" ? body.url.trim() : "";
        let target: URL;
        try {
          target = new URL(raw);
        } catch {
          return Response.json({ error: "Invalid URL." }, { status: 400 });
        }
        if (target.protocol !== "http:" && target.protocol !== "https:") {
          return Response.json({ error: "Only http(s) URLs are supported." }, { status: 400 });
        }
        try {
          const response = await fetch(target.toString(), {
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; DiapoLab/1.0)",
              Accept: "text/html,application/xhtml+xml",
            },
            redirect: "follow",
            signal: AbortSignal.timeout(12000),
          });
          if (!response.ok) {
            return Response.json({ error: `The site responded ${response.status}.` }, { status: 502 });
          }
          const html = (await response.text()).slice(0, 800_000);
          const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "")
            .replace(/\s+/g, " ")
            .trim();
          const text = html
            .replace(/<script[\s\S]*?<\/script>/gi, " ")
            .replace(/<style[\s\S]*?<\/style>/gi, " ")
            .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
            .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
            .replace(/<!--[\s\S]*?-->/g, " ")
            .replace(/<\/(p|div|li|h[1-6]|tr|section|article|blockquote)>/gi, "\n")
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/gi, " ")
            .replace(/&amp;/gi, "&")
            .replace(/&lt;/gi, "<")
            .replace(/&gt;/gi, ">")
            .replace(/&#39;|&apos;/gi, "'")
            .replace(/&quot;/gi, '"')
            .replace(/[\t ]+/g, " ")
            .split("\n")
            .map((line) => line.trim())
            .filter((line, i, arr) => line.length > 1 && line !== arr[i - 1])
            .join("\n")
            .replace(/\n{3,}/g, "\n\n");
          return Response.json({ url: target.toString(), title, text: text.slice(0, 24000) });
        } catch {
          return Response.json({ error: "Could not load this page." }, { status: 502 });
        }
      },
    },
  },
});
