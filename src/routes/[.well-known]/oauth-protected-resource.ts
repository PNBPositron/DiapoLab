import { createFileRoute } from "@tanstack/react-router";

const mcpUnavailable = () =>
  new Response(JSON.stringify({ error: "MCP is not available on this deployment" }), {
    status: 501,
    headers: { "content-type": "application/json" },
  });

export const Route = createFileRoute("/.well-known/oauth-protected-resource")({
  server: {
    handlers: { ANY: mcpUnavailable },
  },
});
