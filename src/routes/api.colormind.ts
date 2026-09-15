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
                : body.mood === "sunset"
                  ? (rgb: number[]) => [Math.min(255, Math.round(rgb[0] * 1.14)), Math.round(rgb[1] * 0.72), Math.round(rgb[2] * 0.7)]
                  : body.mood === "ocean"
                    ? (rgb: number[]) => [Math.round(rgb[0] * 0.62), Math.round(rgb[1] * 0.88), Math.min(255, Math.round(rgb[2] * 1.14))]
                    : body.mood === "candy"
                      ? (rgb: number[]) => [Math.min(255, Math.round(rgb[0] * 1.08)), Math.round(rgb[1] * 0.78), Math.min(255, Math.round(rgb[2] * 1.12))]
                      : body.mood === "forest"
                        ? (rgb: number[]) => [Math.round(rgb[0] * 0.66), Math.min(255, Math.round(rgb[1] * 1.04)), Math.round(rgb[2] * 0.6)]
                        : body.mood === "editorial"
                          ? (rgb: number[]) => { const value = Math.round(rgb.reduce((sum, channel) => sum + channel, 0) / 3); return [Math.round(value * 0.78), Math.round(value * 0.82), Math.round(value * 0.88)]; }
                          : (rgb: number[]) => rgb;
        return Response.json({ ...payload, result: result.map(transform) });
      },
    },
  },
});
