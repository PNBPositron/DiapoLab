import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/context-shot")({
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
        const toDataUrl = (bytes: ArrayBuffer, mime: string) =>
          `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;

        // 1) mshots render service: real browser screenshot of the page.
        const mshotsUrl = `https://s.wordpress.com/mshots/v1/${encodeURIComponent(
          target.toString(),
        )}?w=1280`;
        for (let attempt = 0; attempt < 3; attempt++) {
          if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 3000));
          try {
            const res = await fetch(mshotsUrl, {
              redirect: "follow",
              signal: AbortSignal.timeout(15000),
            });
            const mime = res.headers.get("content-type") ?? "image/jpeg";
            if (res.ok && mime.startsWith("image/")) {
              const bytes = await res.arrayBuffer();
              if (bytes.byteLength > 12000) {
                return Response.json({ dataUrl: toDataUrl(bytes, mime) });
              }
            }
          } catch {
            // try next strategy
          }
        }

        // 2) thum.io render service (keyless fallback).
        try {
          const res = await fetch(
            "https://image.thum.io/check/width/1280/" + target.toString(),
            { signal: AbortSignal.timeout(20000) },
          );
          const mime = res.headers.get("content-type") ?? "image/jpeg";
          if (res.ok && mime.startsWith("image/")) {
            const bytes = await res.arrayBuffer();
            if (bytes.byteLength > 12000) {
              return Response.json({ dataUrl: toDataUrl(bytes, mime) });
            }
          }
        } catch {
          // try next strategy
        }

        // 3) PageSpeed Insights rendered screenshot fallback.
        try {
          const res = await fetch(
            `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
              target.toString(),
            )}`,
            { signal: AbortSignal.timeout(45000) },
          );
          if (res.ok) {
            const payload = (await res.json()) as {
              lighthouseResult?: {
                audits?: Record<string, { details?: { data?: unknown } }>;
                fullPageScreenshot?: { screenshot?: { data?: unknown } };
              };
            };
            const base64 =
              (typeof payload.lighthouseResult?.fullPageScreenshot?.screenshot?.data === "string"
                ? payload.lighthouseResult.fullPageScreenshot.screenshot.data
                : undefined) ??
              (typeof payload.lighthouseResult?.audits?.["final-screenshot"]?.details?.data === "string"
                ? payload.lighthouseResult.audits["final-screenshot"].details?.data
                : undefined);
            if (base64 && base64.length > 1000) {
              return Response.json({ dataUrl: `data:image/jpeg;base64,${base64}` });
            }
          }
        } catch {
          // fall through to error
        }
        return Response.json({ error: "Could not capture this page." }, { status: 502 });
      },
    },
  },
});
