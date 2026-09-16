import { createFileRoute } from "@tanstack/react-router";

const HEX_COLOR = /^#(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i;

function extractHexColors(value: unknown): string[] {
  if (typeof value === "string") return HEX_COLOR.test(value.trim()) ? [value.trim()] : [];
  if (Array.isArray(value)) return value.flatMap(extractHexColors);
  if (value && typeof value === "object") return Object.values(value).flatMap(extractHexColors);
  return [];
}

export const Route = createFileRoute("/api/colormind")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as { query?: string };
        const query = body.query?.trim();
        if (!query) return Response.json({ error: "Tell us a mood or color to search for." }, { status: 400 });
        const response = await fetch(`https://colormagic.app/api/palette/search?q=${encodeURIComponent(query)}`, {
          headers: { Accept: "application/json" },
        });
        if (!response.ok) return Response.json({ error: "ColorMagic is unavailable" }, { status: 502 });
        const payload = await response.json() as unknown;
        const result = extractHexColors(payload).slice(0, 5);
        if (result.length < 3) return Response.json({ error: "No palette found for that search." }, { status: 404 });
        return Response.json({ result });
      },
    },
  },
});
