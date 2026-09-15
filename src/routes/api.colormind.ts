import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/colormind")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as { mood?: string };
        const response = await fetch("http://colormind.io/api/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: "default" }),
        });
        if (!response.ok) {
          return Response.json({ error: "Colormind is unavailable" }, { status: 502 });
        }
        const payload = (await response.json()) as { result?: number[][] };
        const result = payload.result ?? [];
        const transform = body.mood === "mono"
          ? (rgb: number[]) => { const value = Math.round(rgb.reduce((sum, channel) => sum + channel, 0) / 3); return [value, value, value]; }
          : body.mood === "calm"
            ? (rgb: number[]) => [Math.round(rgb[0] * 0.72), Math.round(rgb[1] * 0.9), Math.min(255, Math.round(rgb[2] * 1.08))]
            : body.mood === "bold"
              ? (rgb: number[]) => [Math.min(255, Math.round(rgb[0] * 1.12)), Math.round(rgb[1] * 0.78), Math.round(rgb[2] * 0.72)]
              : body.mood === "natural"
                ? (rgb: number[]) => [Math.round(rgb[0] * 0.9), Math.min(255, Math.round(rgb[1] * 1.05)), Math.round(rgb[2] * 0.78)]
                : (rgb: number[]) => rgb;
        return Response.json({ ...payload, result: result.map(transform) });
      },
    },
  },
});
