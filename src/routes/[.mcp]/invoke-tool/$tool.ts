import { createFileRoute } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

const invokeTool = async ({ request, params }: { request: Request; params: { tool: string } }) => {
  const body = (await request.json().catch(() => ({}))) as { arguments?: { id?: string } };
  if (params.tool === "health") return Response.json({ content: [{ type: "text", text: "DiapoLab MCP is ready." }] });
  if (params.tool !== "get_public_template" || !body.arguments?.id) return Response.json({ error: "Unknown tool or missing id" }, { status: 400 });
  const { data, error } = await supabase.from("public_templates").select("id,name,canvas_w,canvas_h,pages").eq("id", body.arguments.id).maybeSingle();
  if (error || !data) return Response.json({ error: "Template not found" }, { status: 404 });
  return Response.json({ content: [{ type: "text", text: JSON.stringify(data) }] });
};

export const Route = createFileRoute("/.mcp/invoke-tool/$tool")({
  server: {
    handlers: { POST: invokeTool },
  },
});
