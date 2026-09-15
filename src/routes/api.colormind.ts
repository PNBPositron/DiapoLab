import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/colormind")({
  server: {
    handlers: {
      POST: async () => {
        const response = await fetch("http://colormind.io/api/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: "default" }),
        });
        if (!response.ok) {
          return Response.json({ error: "Colormind is unavailable" }, { status: 502 });
        }
        return Response.json(await response.json());
      },
    },
  },
});
