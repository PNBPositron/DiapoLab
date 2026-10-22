import { createFileRoute } from "@tanstack/react-router";

const tools = [
  { name: "get_public_template", description: "Read a published DiapoLab template by id.", inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
  { name: "health", description: "Check that the DiapoLab MCP server is reachable.", inputSchema: { type: "object", properties: {} } },
];

const listTools = () => new Response(JSON.stringify({ tools }), { headers: { "content-type": "application/json" } });

export const Route = createFileRoute("/.mcp/list-tools")({
  server: {
    handlers: { GET: listTools, POST: listTools },
  },
});
