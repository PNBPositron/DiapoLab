import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/context-proxy")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const raw = new URL(request.url).searchParams.get("url") ?? "";
        let target: URL;
        try {
          target = new URL(raw);
        } catch {
          return new Response("Invalid URL", { status: 400 });
        }
        if (target.protocol !== "http:" && target.protocol !== "https:") {
          return new Response("Only http(s) URLs are supported.", { status: 400 });
        }
        const host = target.hostname;
        if (
          host === "localhost" ||
          host === "127.0.0.1" ||
          host === "0.0.0.0" ||
          host === "[::1]" ||
          /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(host)
        ) {
          return new Response("Blocked", { status: 403 });
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
            return new Response(`Upstream ${response.status}`, { status: 502 });
          }
          let html = (await response.text()).slice(0, 1_500_000);
          // Read-only preview: strip scripts and CSP so the page renders
          // stably inside the dialog without frame-busting or XSS risk.
          html = html.replace(/<script[\s\S]*?<\/script>/gi, "");
          html = html.replace(
            /<meta[^>]+http-equiv=["']?content-security-policy["']?[^>]*>/gi,
            "",
          );
          // Resolve relative assets against the original page.
          const base = `<base href="${target.toString()}">`;
          if (/<head[^>]*>/i.test(html)) {
            html = html.replace(/<head([^>]*)>/i, `<head$1>${base}`);
          } else {
            html = base + html;
          }
          return new Response(html, {
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "no-store",
            },
          });
        } catch {
          return new Response("Could not load this page", { status: 502 });
        }
      },
    },
  },
});
