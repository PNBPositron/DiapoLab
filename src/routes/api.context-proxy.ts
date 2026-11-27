import { createFileRoute } from "@tanstack/react-router";
import { escapeHtmlAttr, safeServerFetch, validateExternalUrl } from "@/lib/url-safety";

export const Route = createFileRoute("/api/context-proxy")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const raw = new URL(request.url).searchParams.get("url") ?? "";
        const check = validateExternalUrl(raw);
        if (!check.url) {
          return new Response(check.error ?? "Invalid URL", { status: check.status ?? 400 });
        }
        try {
          const { response, finalUrl } = await safeServerFetch(check.url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; DiapoLab/1.0)",
              Accept: "text/html,application/xhtml+xml",
            },
            signal: AbortSignal.timeout(12000),
          });
          if (!response.ok) {
            return new Response(`Upstream ${response.status}`, { status: 502 });
          }
          let html = (await response.text()).slice(0, 1_500_000);
          // Read-only preview: strip scripts and upstream CSP so the page renders
          // stably inside the dialog while script execution stays blocked via CSP.
          html = html.replace(/<script[\s\S]*?<\/script>/gi, "");
          html = html.replace(/<meta[^>]+http-equiv=["']?content-security-policy["']?[^>]*>/gi, "");
          // Resolve relative assets against the final resolved page URL.
          const base = `<base href="${escapeHtmlAttr(finalUrl.toString())}">`;
          if (/<head[^>]*>/i.test(html)) {
            html = html.replace(/<head([^>]*)>/i, `<head$1>${base}`);
          } else {
            html = base + html;
          }
          return new Response(html, {
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "no-store",
              "Content-Security-Policy":
                "script-src 'none'; object-src 'none'; base-uri http: https:;",
              "X-Content-Type-Options": "nosniff",
            },
          });
        } catch {
          return new Response("Could not load this page", { status: 502 });
        }
      },
    },
  },
});
